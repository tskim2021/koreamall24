/**
 * 사이트맵 캐시 및 자동 갱신 스케줄러
 * - 서버 메모리에 사이트맵 XML을 캐시
 * - 매일 새벽 2시(JST)에 자동 갱신
 * - /sitemap.xml 엔드포인트에서 캐시된 XML 반환
 */

import { getAllProducts, getAllCategories, getAllAnnouncements, getAllEvents } from "./db";

const BASE_URL = "https://koreamall24.com";

// 인메모리 캐시
let cachedSitemapXml: string | null = null;
let lastGeneratedAt: Date | null = null;

/**
 * 사이트맵 XML 생성 함수
 */
export async function generateSitemapXml(): Promise<string> {
  const [allProducts, allCategories, announcements, events] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
    getAllAnnouncements().catch(() => []),
    getAllEvents().catch(() => []),
  ]);

  const now = new Date().toISOString().split("T")[0];
  const urlEntries: string[] = [];

  // ── 정적 페이지 ──────────────────────────────────────────────────────────
  const staticPages = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/products", changefreq: "daily", priority: "0.9" },
    { path: "/sale", changefreq: "daily", priority: "0.8" },
    { path: "/ranking", changefreq: "daily", priority: "0.8" },
    { path: "/new", changefreq: "daily", priority: "0.8" },
    { path: "/bbs/notice", changefreq: "weekly", priority: "0.6" },
    { path: "/bbs/event", changefreq: "weekly", priority: "0.6" },
    { path: "/first-time-customer", changefreq: "monthly", priority: "0.5" },
    { path: "/terms-of-service", changefreq: "monthly", priority: "0.3" },
    { path: "/privacy-policy", changefreq: "monthly", priority: "0.3" },
    { path: "/legal-notice", changefreq: "monthly", priority: "0.3" },
  ];
  for (const page of staticPages) {
    urlEntries.push(
      `<url><loc>${BASE_URL}${page.path}</loc><changefreq>${page.changefreq}</changefreq><priority>${page.priority}</priority><lastmod>${now}</lastmod></url>`
    );
  }

  // ── 카테고리 페이지 ───────────────────────────────────────────────────────
  for (const cat of allCategories) {
    // slug가 있으면 /category/slug, 없으면 /products?category=id 사용
    const catPath = cat.slug ? `/category/${cat.slug}` : `/products?category=${cat.id}`;
    urlEntries.push(
      `<url><loc>${BASE_URL}${catPath}</loc><changefreq>weekly</changefreq><priority>0.8</priority><lastmod>${now}</lastmod></url>`
    );
  }

  // ── 상품 상세 페이지 ──────────────────────────────────────────────────────
  for (const product of allProducts) {
    const lastmod = product.updatedAt
      ? new Date(product.updatedAt).toISOString().split("T")[0]
      : now;
    // 히트/추천/인기 상품은 우선순위 높게 설정
    const priority = (product as any).isHit || (product as any).isRecommended
      ? "0.9"
      : (product as any).isPopular
        ? "0.8"
        : "0.7";
    const imageUrl = (product as any).imageUrl || '';
    const imageTag = imageUrl
      ? `<image:image><image:loc>${imageUrl}</image:loc><image:title>${(product.nameJa || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</image:title></image:image>`
      : '';
    urlEntries.push(
      `<url><loc>${BASE_URL}/product/${product.id}</loc>${imageTag}<changefreq>weekly</changefreq><priority>${priority}</priority><lastmod>${lastmod}</lastmod></url>`
    );
  }

  // ── 공지사항 상세 페이지 ──────────────────────────────────────────────────
  for (const ann of announcements) {
    const lastmod = ann.updatedAt
      ? new Date(ann.updatedAt).toISOString().split("T")[0]
      : now;
    urlEntries.push(
      `<url><loc>${BASE_URL}/bbs/notice/${ann.id}</loc><changefreq>monthly</changefreq><priority>0.5</priority><lastmod>${lastmod}</lastmod></url>`
    );
  }

  // ── 이벤트 상세 페이지 ────────────────────────────────────────────────────
  for (const ev of events) {
    const lastmod = ev.updatedAt
      ? new Date(ev.updatedAt).toISOString().split("T")[0]
      : now;
    urlEntries.push(
      `<url><loc>${BASE_URL}/bbs/event/${ev.id}</loc><changefreq>monthly</changefreq><priority>0.5</priority><lastmod>${lastmod}</lastmod></url>`
    );
  }

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...urlEntries,
    `</urlset>`,
  ].join("\n");

  return xml;
}

/**
 * 캐시 갱신 함수 (스케줄러 및 수동 갱신에서 호출)
 */
export async function refreshSitemapCache(): Promise<void> {
  try {
    console.log("[Sitemap] Generating sitemap cache...");
    const xml = await generateSitemapXml();
    cachedSitemapXml = xml;
    lastGeneratedAt = new Date();
    console.log(`[Sitemap] Cache refreshed at ${lastGeneratedAt.toISOString()} (${xml.length} bytes)`);
  } catch (e) {
    console.error("[Sitemap] Failed to refresh cache:", e);
  }
}

/**
 * 캐시된 사이트맵 XML 반환 (없으면 즉시 생성)
 */
export async function getCachedSitemapXml(): Promise<string> {
  if (!cachedSitemapXml) {
    await refreshSitemapCache();
  }
  return cachedSitemapXml!;
}

/**
 * 마지막 갱신 시각 반환
 */
export function getSitemapLastGeneratedAt(): Date | null {
  return lastGeneratedAt;
}

/**
 * 사이트맵 자동 갱신 스케줄러 시작 (매일 새벽 2시 JST = 17:00 UTC)
 */
export function startSitemapScheduler(): void {
  // 서버 시작 시 즉시 초기 캐시 생성
  refreshSitemapCache();

  // 6시간마다 자동 갱신 (상품 추가/수정 반영 빠르게)
  const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6시간

  // 첫 번째 실행: 1분 후 (서버 완전 기동 후)
  const delay = 60 * 1000;
  console.log(`[Sitemap] Scheduler: first refresh in 1 minute, then every 6 hours`);

  setTimeout(function scheduleNext() {
    refreshSitemapCache();
    // 이후 6시간마다 반복
    setInterval(() => {
      refreshSitemapCache();
    }, INTERVAL_MS);
  }, delay);
}
