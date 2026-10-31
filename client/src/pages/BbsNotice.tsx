import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Megaphone, Pin, ChevronDown, ChevronUp } from "lucide-react";

type AnnouncementCategory = "notice" | "important" | "sale" | "maintenance" | "event";

const CATEGORIES = [
  { value: "all",         label: "すべて" },
  { value: "notice",      label: "お知らせ" },
  { value: "important",   label: "重要" },
  { value: "sale",        label: "期間限定" },
  { value: "maintenance", label: "メンテナンス" },
  { value: "event",       label: "イベント" },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

const CATEGORY_CONFIG: Record<string, { badgeClass: string }> = {
  notice:      { badgeClass: "bg-blue-100 text-blue-800 border-blue-200" },
  important:   { badgeClass: "bg-red-100 text-red-800 border-red-200" },
  sale:        { badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  maintenance: { badgeClass: "bg-gray-100 text-gray-700 border-gray-200" },
  event:       { badgeClass: "bg-purple-100 text-purple-800 border-purple-200" },
};

export default function BbsNotice() {
  const [activeCategory, setActiveCategory] = useState<CategoryValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const { data: announcementsData, isLoading } = trpc.announcements.getAll.useQuery();

  const now = new Date();

  const notices = useMemo(() => {
    const raw = (announcementsData ?? [])
      .filter((ann: any) => {
        if (!ann.isActive) return false;
        if (ann.expiresAt && new Date(ann.expiresAt) < now) return false;
        return true;
      })
      .map((ann: any) => ({
        id: ann.id,
        titleJa: ann.titleJa || ann.title || "",
        contentJa: ann.contentJa || ann.content || "",
        isPinned: ann.isPinned ?? false,
        isExpanded: ann.isExpanded ?? false,
        category: (ann.category ?? "notice") as AnnouncementCategory,
        expiresAt: ann.expiresAt ? new Date(ann.expiresAt) : null,
        createdAt: new Date(ann.createdAt),
        viewCount: ann.viewCount ?? 0,
      }))
      .sort((a: any, b: any) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

    // 초기 펼침 상태 설정
    const expandedIds = raw.filter((n: any) => n.isExpanded).map((n: any) => n.id);
    if (expandedIds.length > 0 && openIds.size === 0) {
      setOpenIds(new Set(expandedIds));
    }

    return raw;
  }, [announcementsData]);

  // 카테고리별 건수
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notices.length };
    for (const n of notices) {
      counts[n.category] = (counts[n.category] || 0) + 1;
    }
    return counts;
  }, [notices]);

  // 필터링
  const filteredNotices = useMemo(() => {
    let result = notices;
    if (activeCategory !== "all") {
      result = result.filter((n) => n.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.titleJa.toLowerCase().includes(q) ||
          n.contentJa.toLowerCase().includes(q)
      );
    }
    return result;
  }, [notices, activeCategory, searchQuery]);

  const toggleOpen = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <>
      <SEOHead
        title="お知らせ"
        description="ココくすりの最新のお知らせをご確認ください。"
        keywords="お知らせ, ニュース, 日本医薬品, ココくすり"
      />
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* ヒーローセクション */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border">
          <div className="container py-10 md:py-14 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <Megaphone className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              お知らせ
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
              ココくすりからの最新情報をご確認ください。
            </p>

            {/* 検索ボックス */}
            <div className="relative mt-6 max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="キーワードで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="container py-8 md:py-12">
          {/* カテゴリタブ */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.value] || 0;
              const isActive = activeCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`
                    inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
                    transition-all duration-200 border
                    ${isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-foreground border-border hover:border-primary hover:text-primary"
                    }
                  `}
                >
                  {cat.label}
                  {count > 0 && (
                    <span
                      className={`
                        text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center
                        ${isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}
                      `}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* お知らせリスト */}
          {isLoading ? (
            <div className="space-y-3 max-w-3xl mx-auto">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-white rounded-lg border border-border animate-pulse" />
              ))}
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {searchQuery
                  ? `「${searchQuery}」に一致するお知らせが見つかりませんでした。`
                  : "このカテゴリにはまだお知らせがありません。"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-sm text-primary underline"
                >
                  検索をクリア
                </button>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {/* 件数表示 */}
              <p className="text-sm text-muted-foreground mb-4 text-right">
                {filteredNotices.length}件のお知らせ
              </p>

              <div className="space-y-2">
                {filteredNotices.map((notice) => {
                  const isOpen = openIds.has(notice.id);
                  const catCfg = CATEGORY_CONFIG[notice.category] ?? CATEGORY_CONFIG.notice;

                  return (
                    <div
                      key={notice.id}
                      className="bg-white border border-border rounded-lg hover:border-primary/40 data-[open=true]:border-primary/40 transition-all"
                      data-open={isOpen}
                    >
                      {/* ヘッダー */}
                      <button
                        onClick={() => toggleOpen(notice.id)}
                        className="w-full flex items-start justify-between gap-3 px-4 py-4 text-left hover:no-underline"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* カテゴリバッジ */}
                          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border mt-0.5 ${catCfg.badgeClass}`}>
                            {notice.isPinned && <Pin className="w-2.5 h-2.5 mr-1" />}
                            {CATEGORIES.find((c) => c.value === notice.category)?.label || "お知らせ"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-2">
                              <span>
                                {notice.createdAt.toLocaleDateString("ja-JP", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                }).replace(/\//g, ".")}
                              </span>
                              <span className="text-gray-300">|</span>
                              <span>閲覧 {(notice.viewCount || 0).toLocaleString()}</span>
                            </p>
                            <p className="text-sm md:text-base font-medium text-foreground leading-snug">
                              {notice.titleJa}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 mt-1">
                          {isOpen
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          }
                        </div>
                      </button>

                      {/* コンテンツ */}
                      {isOpen && (
                        <div className="border-t border-border bg-gray-50/50 px-4 py-5">
                          <div
                            className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: notice.contentJa }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
