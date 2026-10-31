import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, HelpCircle, MessageCircle } from "lucide-react";
import { Link } from "wouter";

// カテゴリ定義
const CATEGORIES = [
  { value: "all", label: "すべて", labelKo: "すべて" },
  { value: "product", label: "商品について", labelKo: "商品" },
  { value: "order_shipping", label: "注文・配送", labelKo: "注文/配送" },
  { value: "payment", label: "お支払い", labelKo: "決済" },
  { value: "member_points", label: "会員・ポイント", labelKo: "会員/ポイント" },
  { value: "other", label: "その他", labelKo: "その他" },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState<CategoryValue>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: faqs, isLoading } = trpc.chatbot.getActiveFaqs.useQuery();

  // カテゴリ別件数
  const categoryCounts = useMemo(() => {
    if (!faqs) return {} as Record<string, number>;
    const counts: Record<string, number> = { all: faqs.length };
    for (const faq of faqs) {
      counts[faq.category] = (counts[faq.category] || 0) + 1;
    }
    return counts;
  }, [faqs]);

  // FAQPage Schema.org JSON-LD 동적 삽입
  useEffect(() => {
    if (!faqs || faqs.length === 0) return;

    const faqJsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs
        .filter((f) => f.questionJa && f.answerJa)
        .map((faq) => ({
          "@type": "Question",
          "name": faq.questionJa || faq.questionKo || "",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answerJa || faq.answerKo || "",
          },
        })),
    };

    const scriptId = "faq-page-jsonld";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(faqJsonLd);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [faqs]);

  // フィルタリング
  const filteredFaqs = useMemo(() => {
    if (!faqs) return [];
    let result = faqs;

    // カテゴリフィルタ
    if (activeCategory !== "all") {
      result = result.filter((f) => f.category === activeCategory);
    }

    // 検索フィルタ
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          (f.questionJa && f.questionJa.toLowerCase().includes(q)) ||
          (f.questionKo && f.questionKo.toLowerCase().includes(q)) ||
          (f.answerJa && f.answerJa.toLowerCase().includes(q)) ||
          (f.answerKo && f.answerKo.toLowerCase().includes(q))
      );
    }

    // sortOrder 순서대로 정렬
    return [...result].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [faqs, activeCategory, searchQuery]);

  return (
    <>
      <SEOHead
        title="よくある質問（FAQ）"
        description="ご注文・配送・お支払い・会員・商品に関するよくある質問をまとめました。"
        keywords="FAQ,よくある質問,注文,配送,お支払い,会員,ポイント"
      />
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* ヒーローセクション */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border">
          <div className="container py-10 md:py-14 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <HelpCircle className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              よくある質問
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
              お客様からよくいただくご質問をまとめました。
              解決しない場合は、お気軽にお問い合わせください。
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

          {/* FAQ リスト */}
          {isLoading ? (
            <div className="space-y-3 max-w-3xl mx-auto">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-white rounded-lg border border-border animate-pulse" />
              ))}
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {searchQuery
                  ? `「${searchQuery}」に一致する質問が見つかりませんでした。`
                  : "このカテゴリにはまだ質問がありません。"}
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
                {filteredFaqs.length}件の質問
              </p>

              <Accordion type="multiple" className="space-y-2">
                {filteredFaqs.map((faq) => {
                  const catInfo = CATEGORIES.find((c) => c.value === faq.category);
                  const question = faq.questionJa || faq.questionKo || "";
                  const answer = faq.answerJa || faq.answerKo || "";

                  return (
                    <AccordionItem
                      key={faq.id}
                      value={`faq-${faq.id}`}
                      className="bg-white border border-border rounded-lg px-4 hover:border-primary/40 data-[state=open]:border-primary/40 transition-all"
                    >
                      <AccordionTrigger className="hover:no-underline py-4 text-left gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                            Q
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm md:text-base font-medium text-foreground leading-snug">
                              {question}
                            </p>
                            {activeCategory === "all" && catInfo && catInfo.value !== "all" && (
                              <Badge variant="secondary" className="mt-1.5 text-xs font-normal">
                                {catInfo.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="flex gap-3 pt-1">
                          <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mt-0.5">
                            A
                          </span>
                          <div className="flex-1 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {answer}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          )}

          {/* お問い合わせへの誘導 */}
          <div className="max-w-3xl mx-auto mt-12">
            <div className="bg-white border border-border rounded-xl p-6 text-center">
              <MessageCircle className="w-8 h-8 text-primary mx-auto mb-3" />
              <h2 className="font-bold text-base md:text-lg mb-1">
                解決しない場合は
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                AIチャットボットまたはお問い合わせフォームからお気軽にご連絡ください。
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/mypage/inquiries">
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    お問い合わせフォーム
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
