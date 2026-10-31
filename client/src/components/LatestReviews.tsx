import { Link, useLocation } from "wouter";
import { Star, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
    "bg-green-500", "bg-teal-500", "bg-blue-500", "bg-indigo-500",
    "bg-purple-500", "bg-pink-500",
  ];
  const code = (name || "A").charCodeAt(0);
  return colors[code % colors.length];
}

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

export default function LatestReviews() {
  const [, setLocation] = useLocation();
  const _reviewsInitial = typeof window !== "undefined" ? (window as any).__INITIAL_DATA__?.reviews : undefined;
  const { data: reviews, isLoading } = trpc.review.latest.useQuery(
    { limit: 8 },
    { staleTime: 10 * 60 * 1000, gcTime: 15 * 60 * 1000, ...(_reviewsInitial ? { initialData: _reviewsInitial } : {}) }
  );

  if (isLoading) {
    return (
      <section className="py-10 bg-white">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">お客様の声</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 animate-pulse">
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
        </div>
      </section>
    );
  }

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-10 bg-white">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-primary transition-colors"
            onClick={() => setLocation("/reviews")}
          >
            お客様の声
          </h2>
          <Link
            href="/reviews"
            className="flex items-center text-sm text-primary hover:underline font-medium"
          >
            もっと見る
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* /reviews 페이지와 동일한 4열 2행 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {reviews.slice(0, 8).map((review: any) => {
            const reviewImages = Array.isArray(review.images)
              ? review.images
              : review.images
              ? (() => { try { return JSON.parse(review.images); } catch { return []; } })()
              : [];
            const displayImage = reviewImages.length > 0
              ? reviewImages[0]
              : review.productImageUrl || null;

            const displayName = review.productNameJa || review.productName || `商品 #${review.productId}`;
            const maskedUser = maskEmail(review.userEmail, review.userName);
            const initial = maskedUser.charAt(0).toUpperCase();
            const avatarColor = getAvatarColor(review.userEmail || review.userName || "A");
            const userPoints = review.userPoints ?? 0;
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
                    {/* 商品画像 (리뷰 이미지 or 상품 기본이미지) */}
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
      </div>
    </section>
  );
}
