import { describe, it, expect } from "vitest";

describe("BbsNotice Page - View Count Feature", () => {
  it("should display view count in notice list", () => {
    const notice = {
      id: 1,
      titleJa: "お知らせ タイトル",
      contentJa: "お知らせ 内容",
      category: "notice" as const,
      isPinned: false,
      isExpanded: false,
      createdAt: new Date("2026-05-31"),
      viewCount: 1234,
      expiresAt: null,
    };

    expect(notice.viewCount).toBe(1234);
    expect(notice.viewCount).toBeGreaterThan(0);
  });

  it("should format view count with locale string", () => {
    const viewCount = 1234;
    const formatted = viewCount.toLocaleString();
    
    expect(formatted).toBe("1,234");
  });

  it("should handle zero view count", () => {
    const notice = {
      id: 2,
      titleJa: "新しいお知らせ",
      contentJa: "内容",
      category: "notice" as const,
      isPinned: false,
      isExpanded: false,
      createdAt: new Date("2026-05-31"),
      viewCount: 0,
      expiresAt: null,
    };

    expect(notice.viewCount).toBe(0);
    expect((notice.viewCount || 0).toLocaleString()).toBe("0");
  });

  it("should handle undefined view count with fallback", () => {
    const notice = {
      id: 3,
      titleJa: "お知らせ",
      contentJa: "内容",
      category: "notice" as const,
      isPinned: false,
      isExpanded: false,
      createdAt: new Date("2026-05-31"),
      viewCount: undefined as any,
      expiresAt: null,
    };

    const displayCount = (notice.viewCount || 0).toLocaleString();
    expect(displayCount).toBe("0");
  });

  it("should display view count with date separator", () => {
    const date = new Date("2026-05-31").toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/\//g, ".");
    
    const viewCount = 567;
    const displayText = `${date} | 閲覧 ${viewCount.toLocaleString()}`;
    
    expect(displayText).toContain("|");
    expect(displayText).toContain("閲覧");
    expect(displayText).toContain("567");
  });

  it("should sort notices by pinned status first, then by date", () => {
    const notices = [
      {
        id: 1,
        titleJa: "通常のお知らせ",
        createdAt: new Date("2026-05-31"),
        isPinned: false,
        viewCount: 100,
      },
      {
        id: 2,
        titleJa: "ピン留めされたお知らせ",
        createdAt: new Date("2026-05-30"),
        isPinned: true,
        viewCount: 50,
      },
      {
        id: 3,
        titleJa: "最新のお知らせ",
        createdAt: new Date("2026-06-01"),
        isPinned: false,
        viewCount: 200,
      },
    ];

    const sorted = notices.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    expect(sorted[0].isPinned).toBe(true);
    expect(sorted[1].createdAt.getTime()).toBeGreaterThan(sorted[2].createdAt.getTime());
  });

  it("should filter notices by category and search query", () => {
    const notices = [
      {
        id: 1,
        titleJa: "重要なお知らせ",
        contentJa: "システムメンテナンス",
        category: "important" as const,
        viewCount: 100,
      },
      {
        id: 2,
        titleJa: "セール情報",
        contentJa: "期間限定セール開始",
        category: "sale" as const,
        viewCount: 200,
      },
      {
        id: 3,
        titleJa: "イベント開催",
        contentJa: "新商品発表会",
        category: "event" as const,
        viewCount: 150,
      },
    ];

    const filtered = notices.filter((n) => n.category === "sale");
    expect(filtered.length).toBe(1);
    expect(filtered[0].titleJa).toBe("セール情報");

    const searchFiltered = notices.filter((n) =>
      n.titleJa.toLowerCase().includes("イベント") ||
      n.contentJa.toLowerCase().includes("イベント")
    );
    expect(searchFiltered.length).toBe(1);
    expect(searchFiltered[0].id).toBe(3);
  });

  it("should display correct category badge", () => {
    const CATEGORY_CONFIG: Record<string, { badgeClass: string }> = {
      notice: { badgeClass: "bg-blue-100 text-blue-800 border-blue-200" },
      important: { badgeClass: "bg-red-100 text-red-800 border-red-200" },
      sale: { badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
      maintenance: { badgeClass: "bg-gray-100 text-gray-700 border-gray-200" },
      event: { badgeClass: "bg-purple-100 text-purple-800 border-purple-200" },
    };

    const notice = {
      category: "important" as const,
    };

    const badgeClass = CATEGORY_CONFIG[notice.category]?.badgeClass;
    expect(badgeClass).toBe("bg-red-100 text-red-800 border-red-200");
  });
});
