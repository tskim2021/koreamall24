import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Star, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const REVIEWS_PER_PAGE = 16;

// アバター背景色
function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
    "bg-green-500", "bg-teal-500", "bg-blue-500", "bg-indigo-500",
    "bg-purple-500", "bg-pink-500",
  ];
  const code = (name || "A").charCodeAt(0);
  return colors[code % colors.length];
}

// メールアドレスマスキング: 先頭5文字 + *
function maskEmail(email: string | null | undefined, fallbackName?: string | null): string {
  if (email && email.includes("@")) {
    const local = email.split("@")[0];
    const prefix = local.slice(0, 5);
    return prefix + "*";
  }
  if (fallbackName) {
    const name = fallbackName.trim();
    if (name.length <= 2) return name + "*";
    return name.slice(0, 5) + "*";
  }
  return "匿名*";
}

// ランク計算
function getTierLabel(points: number): { label: string; color: string; bg: string } {
  if (points >= 100000) return { label: "VIP", color: "text-purple-700", bg: "bg-purple-100" };
  if (points >= 50000) return { label: "GOLD", color: "text-yellow-700", bg: "bg-yellow-100" };
  if (points >= 10000) return { label: "SILVER", color: "text-gray-600", bg: "bg-gray-100" };
  return { label: "BRONZE", color: "text-orange-700", bg: "bg-orange-100" };
}

function getTierDiscount(points: number, price: number): string {
  const rate = points >= 100000 ? 0.15 : points >= 50000 ? 0.1 : points >= 10000 ? 0.07 : 0.05;
  const discount = Math.round(price * rate);
  return discount > 0 ? discount.toLocaleString() : "0";
}

const STAR_FILTERS = [0, 5, 4, 3, 2, 1] as const;

export default function ReviewsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [starFilter, setStarFilter] = useState<number>(0); // 0 = 全て

  const offset = (currentPage - 1) * REVIEWS_PER_PAGE;

  // 서버에서 주입된 초기 데이터 활용 (첫 페이지만)
  const serverData = (window as any).__INITIAL_DATA__;
  const serverReviews = currentPage === 1 ? serverData?.reviews : undefined;

  const { data: reviews = [], isLoading } = trpc.review.all.useQuery(
    { limit: REVIEWS_PER_PAGE, offset },
    { initialData: serverReviews?.length ? serverReviews : undefined }
  );

  // 서버 데이터가 있으면 스켈레톤 표시 안 함
  const showSkeleton = isLoading && !serverReviews?.length;

  const handleSearch = () => {
    setSearchQuery(inputValue);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setInputValue("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // クライアント側フィルタリング
  const filteredReviews = reviews.filter((r: any) => {
    const matchStar = starFilter === 0 || r.rating === starFilter;
    const matchSearch = !searchQuery ||
      (r.productNameJa || r.productName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.content || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchStar && matchSearch;
  });

  const hasMore = reviews.length === REVIEWS_PER_PAGE;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="container py-10">
          {/* ページヘッダー */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">レビュー</h1>
            <p className="text-sm text-gray-500">実際にご購入いただいたお客様のレビューをご覧ください</p>
          </div>

          {/* 検索バー + 星フィルター */}
          <div className="mb-6 flex flex-col sm:flex-row gap-3">
            {/* 検索 */}
            <div className="flex gap-2 flex-1 max-w-md">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="商品名やキーワードで検索..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 pr-10 text-sm"
                />
                {inputValue && (
                  <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <Button onClick={handleSearch} size="sm">検索</Button>
            </div>

            {/* 星フィルター */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {STAR_FILTERS.map((star) => (
                <button
                  key={star}
                  onClick={() => { setStarFilter(star); setCurrentPage(1); }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    starFilter === star
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-red-300"
                  }`}
                >
                  {star === 0 ? (
                    "全て"
                  ) : (
                    <>
                      <Star className="w-3 h-3 fill-current" />
                      {star}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* レビュー一覧 */}
          {showSkeleton ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 animate-pulse bg-white">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                    <div className="h-3 bg-gray-200 rounded w-16" />
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredReviews.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {filteredReviews.map((review: any) => {
                  // 画像: レビュー画像 → 商品画像 → なし
                  const reviewImages = Array.isArray(review.images)
                    ? review.images
                    : (() => { try { return JSON.parse(review.images || "[]"); } catch { return []; } })();
                  const displayImage = reviewImages.length > 0
                    ? reviewImages[0]
                    : review.productImageUrl || null;

                  const displayName = review.productNameJa || review.productName || `商品 #${review.productId}`;
                  // メールアドレス先頭5文字 + ***
                  const maskedUser = maskEmail(review.userEmail, review.userName);
                  const initial = maskedUser.charAt(0).toUpperCase();
                  const avatarColor = getAvatarColor(review.userEmail || review.userName || "A");
                  const userPoints = review.userPoints || 0;
                  const tier = getTierLabel(userPoints);
                  const productPrice = review.productPrice || 5000;
                  const tierDiscount = getTierDiscount(userPoints, productPrice);

                  return (
                    <Link key={review.id} href={`/reviews/${review.id}`}>
                      <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col bg-white">
                        {/* 上部: ユーザー情報 + 商品画像 */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white text-xs font-bold">{initial}</span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800 leading-tight">{maskedUser}</p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tier.bg} ${tier.color}`}>
                                {tier.label}
                              </span>
                            </div>
                          </div>
                          {/* 商品画像 */}
                          <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                            {displayImage ? (
                              <img
                                src={displayImage}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400">
                                No img
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 星評価 */}
                        <div className="flex items-center gap-1 mb-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= review.rating
                                  ? "fill-red-500 text-red-500"
                                  : "fill-gray-200 text-gray-200"
                              }`}
                            />
                          ))}
                          <span className="text-xs font-bold text-gray-700 ml-0.5">{review.rating}</span>
                        </div>

                        {/* 商品名 */}
                        <p className="text-[11px] text-gray-400 truncate mb-1.5">
                          {displayName.length > 18 ? displayName.slice(0, 18) + "..." : displayName}
                        </p>

                        {/* レビュータイトル */}
                        {review.title && (
                          <p className="text-sm font-bold text-gray-900 line-clamp-2 mb-1.5 leading-snug">
                            {review.title}
                          </p>
                        )}

                        {/* レビュー内容 */}
                        {review.content && (
                          <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed flex-1 mb-3">
                            {review.content}
                          </p>
                        )}

                        {/* 会員割引バナー */}
                        <div className={`mt-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${tier.bg}`}>
                          <span className={`text-[10px] font-bold ${tier.color}`}>
                            ● {tier.label} 会員割引 ¥{tierDiscount} お得！
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* ページネーション */}
              <div className="flex justify-center items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  前へ
                </Button>
                <span className="text-sm text-gray-600 px-2">{currentPage} ページ</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasMore}
                  className="flex items-center gap-1"
                >
                  次へ
                  <ChevronRight size={16} />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400 text-sm">
                {searchQuery || starFilter > 0
                  ? "条件に一致するレビューが見つかりません"
                  : "レビューがまだありません"}
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
