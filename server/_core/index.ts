import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import multer from "multer";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerStripeWebhook } from "../stripeWebhook";
import { registerCookiePayWebhook } from "../cookiePayWebhook";
import { handleImageUpload } from "./uploadHandler";
import { getAllProducts, getAllCategories, getSiteSetting } from "../db";
import { getCachedSitemapXml, getSitemapLastGeneratedAt, startSitemapScheduler } from "../sitemapScheduler";
import { startShipmentStatusSync } from "./shipmentStatusSync";
import { startWishlistSaleAlerts } from "./wishlistSaleAlert";
import { startShipmentTrackingScheduler } from './shipmentTrackingScheduler';
import { startCheckoutSessionCleanup } from './checkoutSessionCleanup';
import { startReviewReminderScheduler } from '../reviewReminderScheduler';
import { startBankTransferAutoCancelScheduler } from '../bankTransferAutoCancel';
import { startPointExpiryScheduler } from './pointExpiryScheduler';
import { startNotificationScheduler } from './notificationScheduler';
import { startCartAbandonmentScheduler } from './cartAbandonmentScheduler';
import { initSentry, Sentry } from "./sentry";
import { registerScheduledRoutes } from "../scheduledRoutes";
import { registerStorageProxy } from "./storageProxy";
import { registerGmailOAuthRoutes } from "../gmailOAuthRoutes";

// Initialize Sentry
initSentry();

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Stripe webhook (must be before express.json() for raw body)
  registerStripeWebhook(app);
  
  // CookiePay webhook
  registerCookiePayWebhook(app);
  
  // www → non-www 301 리다이렉트 (SEO 중복 콘텐츠 방지)
  app.use((req, res, next) => {
    const host = req.headers.host || '';
    if (host.startsWith('www.')) {
      const nonWwwHost = host.slice(4);
      return res.redirect(301, `https://${nonWwwHost}${req.originalUrl}`);
    }
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Storage proxy for /manus-storage/* paths
  registerStorageProxy(app);

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Gmail OAuth2 callback
  registerGmailOAuthRoutes(app);

  // Scheduled task endpoints
  registerScheduledRoutes(app);
  
  // Image upload endpoint
  const upload = multer({ storage: multer.memoryStorage() });
  app.post("/api/upload", upload.single("file"), handleImageUpload);
  
  // Image proxy endpoint with WebP conversion + resizing + caching
  // In-memory LRU-style cache: max 500 entries, 24h TTL
  const _imgCache = new Map<string, { buf: Buffer; ct: string; ts: number }>();
  const IMG_CACHE_TTL = 24 * 60 * 60 * 1000;
  const IMG_CACHE_MAX = 500;
  app.get("/api/image-proxy", async (req, res) => {
    const url = req.query.url as string;
    const w = parseInt(req.query.w as string) || 0;   // target width (0 = original)
    const q = Math.min(Math.max(parseInt(req.query.q as string) || 80, 10), 100); // quality 10-100
    const fmt = (req.query.fmt as string) || "webp";  // output format: webp | jpeg | original

    if (!url || !url.startsWith("https://")) {
      return res.status(400).send("Invalid URL");
    }

    // Cache key includes transform params
    const cacheKey = `${url}|w=${w}|q=${q}|fmt=${fmt}`;

    // Serve from cache if available
    const cached = _imgCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < IMG_CACHE_TTL) {
      res.set("Content-Type", cached.ct);
      res.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
      res.set("X-Cache", "HIT");
      return res.send(cached.buf);
    }

    try {
      const response = await fetch(url, {
        headers: {
          "Referer": new URL(url).origin + "/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        return res.status(response.status).send("Image fetch failed");
      }

      const srcBuffer = Buffer.from(await response.arrayBuffer());
      const srcContentType = response.headers.get("content-type") || "image/jpeg";

      // Skip SVG / GIF (don't process animated GIFs)
      const isSkip = srcContentType.includes("svg") || srcContentType.includes("gif");

      let outBuffer: Buffer;
      let outContentType: string;

      if (!isSkip && fmt !== "original") {
        try {
          // Dynamic import to avoid bundling issues in production
          const sharp = (await import("sharp")).default;
          let pipeline = sharp(srcBuffer);
          if (w > 0) {
            pipeline = pipeline.resize(w, null, { withoutEnlargement: true, fit: "inside" });
          }
          if (fmt === "webp") {
            pipeline = pipeline.webp({ quality: q });
            outContentType = "image/webp";
          } else {
            pipeline = pipeline.jpeg({ quality: q, progressive: true });
            outContentType = "image/jpeg";
          }
          outBuffer = await pipeline.toBuffer();
        } catch {
          // sharp failed — fall back to original
          outBuffer = srcBuffer;
          outContentType = srcContentType;
        }
      } else {
        outBuffer = srcBuffer;
        outContentType = srcContentType;
      }

      // Store in cache (evict oldest if full)
      if (_imgCache.size >= IMG_CACHE_MAX) {
        const firstKey = _imgCache.keys().next().value;
        if (firstKey) _imgCache.delete(firstKey);
      }
      _imgCache.set(cacheKey, { buf: outBuffer, ct: outContentType, ts: Date.now() });

      res.set("Content-Type", outContentType);
      res.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
      res.set("Access-Control-Allow-Origin", "*");
      res.set("X-Cache", "MISS");
      return res.send(outBuffer);
    } catch (e) {
      return res.status(500).send("Proxy error");
    }
  });

  // Sitemap XML (캐시 기반, 매일 새벽 2시 JST 자동 갱신)
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const xml = await getCachedSitemapXml();
      const lastGen = getSitemapLastGeneratedAt();
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=1800");
      if (lastGen) {
        res.set("X-Sitemap-Generated", lastGen.toISOString());
      }
      return res.send(xml);
    } catch (e) {
      console.error("[Sitemap] Error serving sitemap:", e);
      return res.status(500).send("Error generating sitemap");
    }
  });

  // robots.txt (DB에 저장된 커스텀 내용 반환, 없으면 기본값)
  app.get("/robots.txt", async (_req, res) => {
    try {
      const customRobots = await getSiteSetting("ROBOTS_TXT_CONTENT");
      const defaultContent =
`User-agent: *
Allow: /

# 관리자/인증/주문 영역 - 크롤링 차단
Disallow: /admin/
Disallow: /api/
Disallow: /mypage/
Disallow: /checkout/
Disallow: /cart
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password

# 중복 콘텐츠 방지 (정렬 파라미터만 차단, 페이지네이션은 허용)
Disallow: /*?*sort=

# 크롤링 허용 영역 명시
Allow: /product/
Allow: /category/
Allow: /products
Allow: /ranking
Allow: /sale
Allow: /new
Allow: /bbs/

Sitemap: https://koreamall24.com/sitemap.xml
Sitemap: https://www.koreamall24.com/sitemap.xml`;
      // DB 커스텀 값이 있어도 Sitemap 지시어는 항상 포함
      let content = customRobots?.value || defaultContent;
      const sitemapLine = 'Sitemap: https://koreamall24.com/sitemap.xml';
      if (!content.includes(sitemapLine)) {
        content = content.trimEnd() + '\n\n' + sitemapLine + '\nSitemap: https://www.koreamall24.com/sitemap.xml';
      }
      res.set("Content-Type", "text/plain; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      return res.send(content);
    } catch (e) {
      console.error("[Robots] Error serving robots.txt:", e);
      return res.status(500).send("Error generating robots.txt");
    }
  });

  // SSE 실시간 알림 엔드포인트
  app.get("/api/notifications/stream", async (req, res) => {
    try {
      const { sdk } = await import('./sdk');
      const { COOKIE_NAME } = await import('../../shared/const');
      const cookieHeader = req.headers.cookie || '';
      const cookieMap: Record<string, string> = {};
      cookieHeader.split(';').forEach(c => {
        const [k, ...v] = c.trim().split('=');
        if (k) cookieMap[k.trim()] = v.join('=');
      });
      const sessionCookie = cookieMap[COOKIE_NAME];
      const session = await sdk.verifySession(sessionCookie);
      if (!session?.openId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      // openId로 DB에서 userId 조회
      const { getUserByOpenId } = await import('../db');
      const user = await getUserByOpenId(session.openId);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const userId = user.id;

      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();
      res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

      const { addSSEClient, removeSSEClient } = await import('./sseManager');
      addSSEClient(userId, res);

      const heartbeat = setInterval(() => {
        try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
      }, 30000);

      req.on('close', () => {
        clearInterval(heartbeat);
        removeSSEClient(userId, res);
      });
    } catch (err) {
      console.error('[SSE] Stream error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Pre-warm cache so first user requests are instant (non-blocking)
    import('../cache').then(({ warmupCache }) => warmupCache()).catch(() => {});
    // Start shipment status sync scheduler
    startShipmentStatusSync();
    // Start wishlist sale alert scheduler (every 6 hours)
    startWishlistSaleAlerts();
    // Start shipment tracking scheduler (9 AM and 6 PM daily)
    startShipmentTrackingScheduler();
    // Start checkout session cleanup scheduler (midnight daily)
    startCheckoutSessionCleanup();
    // Start review reminder scheduler (daily at 10:00 AM JST)
    startReviewReminderScheduler();
    // Start bank transfer auto-cancel scheduler (daily at midnight JST)
    startBankTransferAutoCancelScheduler();
    // Start point expiry alert scheduler (daily at midnight JST)
    startPointExpiryScheduler();
    // Start notification schedule processor (every 60 seconds)
    startNotificationScheduler();
  startCartAbandonmentScheduler();
    // Start sitemap auto-refresh scheduler (daily at 2:00 AM JST)
    startSitemapScheduler();
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
