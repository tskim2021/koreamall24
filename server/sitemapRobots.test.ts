/**
 * 사이트맵 자동 갱신 스케줄러 및 robots.txt 기능 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── sitemapScheduler 모듈 모킹 ──────────────────────────────────────────────
vi.mock("./db", () => ({
  getAllProducts: vi.fn().mockResolvedValue([
    { id: 1, updatedAt: new Date("2025-01-01") },
    { id: 2, updatedAt: new Date("2025-06-01") },
    { id: 3, updatedAt: null },
  ]),
  getAllCategories: vi.fn().mockResolvedValue([
    { id: 10 },
    { id: 20 },
  ]),
  getAllAnnouncements: vi.fn().mockResolvedValue([
    { id: 100, updatedAt: new Date("2025-03-01") },
  ]),
  getAllEvents: vi.fn().mockResolvedValue([
    { id: 200, updatedAt: new Date("2025-04-01") },
  ]),
  getSiteSetting: vi.fn().mockResolvedValue(null),
  upsertSiteSetting: vi.fn().mockResolvedValue(undefined),
  getAllSiteSettings: vi.fn().mockResolvedValue([]),
}));

describe("generateSitemapXml", () => {
  it("유효한 XML을 생성해야 한다", async () => {
    const { generateSitemapXml } = await import("./sitemapScheduler");
    const xml = await generateSitemapXml();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("</urlset>");
  });

  it("홈페이지 URL이 포함되어야 한다", async () => {
    const { generateSitemapXml } = await import("./sitemapScheduler");
    const xml = await generateSitemapXml();
    expect(xml).toContain("https://cocokusuri.com/</loc>");
    expect(xml).toContain("<priority>1.0</priority>");
  });

  it("상품 상세 페이지 URL이 포함되어야 한다", async () => {
    const { generateSitemapXml } = await import("./sitemapScheduler");
    const xml = await generateSitemapXml();
    expect(xml).toContain("/product/1</loc>");
    expect(xml).toContain("/product/2</loc>");
    expect(xml).toContain("/product/3</loc>");
  });

  it("카테고리 페이지 URL이 포함되어야 한다", async () => {
    const { generateSitemapXml } = await import("./sitemapScheduler");
    const xml = await generateSitemapXml();
    expect(xml).toContain("?category=10");
    expect(xml).toContain("?category=20");
  });

  it("공지사항 URL이 포함되어야 한다", async () => {
    const { generateSitemapXml } = await import("./sitemapScheduler");
    const xml = await generateSitemapXml();
    expect(xml).toContain("/bbs/notice/100");
  });

  it("이벤트 URL이 포함되어야 한다", async () => {
    const { generateSitemapXml } = await import("./sitemapScheduler");
    const xml = await generateSitemapXml();
    expect(xml).toContain("/bbs/event/200");
  });

  it("정적 페이지들이 포함되어야 한다", async () => {
    const { generateSitemapXml } = await import("./sitemapScheduler");
    const xml = await generateSitemapXml();
    expect(xml).toContain("/products</loc>");
    expect(xml).toContain("/sale</loc>");
    expect(xml).toContain("/ranking</loc>");
    expect(xml).toContain("/new</loc>");
  });

  it("상품 updatedAt이 있으면 lastmod에 반영되어야 한다", async () => {
    const { generateSitemapXml } = await import("./sitemapScheduler");
    const xml = await generateSitemapXml();
    expect(xml).toContain("<lastmod>2025-01-01</lastmod>");
    expect(xml).toContain("<lastmod>2025-06-01</lastmod>");
  });
});

describe("refreshSitemapCache / getCachedSitemapXml", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("캐시 갱신 후 getCachedSitemapXml이 XML을 반환해야 한다", async () => {
    const { refreshSitemapCache, getCachedSitemapXml } = await import("./sitemapScheduler");
    await refreshSitemapCache();
    const xml = await getCachedSitemapXml();
    expect(xml).toContain("urlset");
  });

  it("캐시 갱신 후 getSitemapLastGeneratedAt이 Date를 반환해야 한다", async () => {
    const { refreshSitemapCache, getSitemapLastGeneratedAt } = await import("./sitemapScheduler");
    await refreshSitemapCache();
    const lastGen = getSitemapLastGeneratedAt();
    expect(lastGen).toBeInstanceOf(Date);
    expect(lastGen!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("캐시가 없을 때 getCachedSitemapXml 호출 시 자동 생성해야 한다", async () => {
    const { getCachedSitemapXml } = await import("./sitemapScheduler");
    const xml = await getCachedSitemapXml();
    expect(xml.length).toBeGreaterThan(100);
  });
});

describe("robots.txt 기본값 검증", () => {
  it("기본 robots.txt에 User-agent 지시어가 있어야 한다", () => {
    const defaultContent = `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /mypage/\nDisallow: /checkout/\nDisallow: /cart\n\nSitemap: https://cocokusuri.com/sitemap.xml`;
    expect(defaultContent).toContain("User-agent: *");
    expect(defaultContent).toContain("Allow: /");
    expect(defaultContent).toContain("Disallow: /admin/");
    expect(defaultContent).toContain("Disallow: /api/");
    expect(defaultContent).toContain("Disallow: /mypage/");
    expect(defaultContent).toContain("Sitemap: https://cocokusuri.com/sitemap.xml");
  });

  it("민감한 경로들이 Disallow 처리되어야 한다", () => {
    const sensitiveRoutes = ["/admin/", "/api/", "/mypage/", "/checkout/", "/cart"];
    const defaultContent = `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /mypage/\nDisallow: /checkout/\nDisallow: /cart\n\nSitemap: https://cocokusuri.com/sitemap.xml`;
    for (const route of sensitiveRoutes) {
      expect(defaultContent).toContain(`Disallow: ${route}`);
    }
  });
});

describe("사이트맵 XML 구조 검증", () => {
  it("각 URL 엔트리가 올바른 형식이어야 한다", async () => {
    const { generateSitemapXml } = await import("./sitemapScheduler");
    const xml = await generateSitemapXml();
    // URL 엔트리 파싱
    const urlMatches = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
    expect(urlMatches.length).toBeGreaterThan(5);
    // 각 URL에 loc, changefreq, priority, lastmod가 있어야 함
    for (const urlEntry of urlMatches.slice(0, 3)) {
      expect(urlEntry).toContain("<loc>");
      expect(urlEntry).toContain("<changefreq>");
      expect(urlEntry).toContain("<priority>");
      expect(urlEntry).toContain("<lastmod>");
    }
  });

  it("priority 값이 0~1 범위여야 한다", async () => {
    const { generateSitemapXml } = await import("./sitemapScheduler");
    const xml = await generateSitemapXml();
    const priorities = xml.match(/<priority>([\d.]+)<\/priority>/g) || [];
    for (const p of priorities) {
      const val = parseFloat(p.replace(/<\/?priority>/g, ""));
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it("cocokusuri.com 도메인만 포함되어야 한다", async () => {
    const { generateSitemapXml } = await import("./sitemapScheduler");
    const xml = await generateSitemapXml();
    const locs = xml.match(/<loc>(.*?)<\/loc>/g) || [];
    for (const loc of locs) {
      expect(loc).toContain("cocokusuri.com");
    }
  });
});
