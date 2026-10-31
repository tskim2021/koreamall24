import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Star, ChevronLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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

export default function ReviewDetailPage() {
  const [, paramsReviews] = useRoute("/reviews/:id");
  const [, paramsReview] = useRoute("/review/:id");
  const params = paramsReviews || paramsReview;
  const reviewId = Number(params?.id);

  const { data: review, isLoading } = trpc.review.getById.useQuery(
    { id: reviewId },
    { enabled: !!reviewId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 bg-gray-50">
          <div className="container py-10 max-w-2xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-32" />
              <div className="bg-white rounded-xl p-6 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-4">レビューが見つかりません</p>
            <Link href="/reviews">
              <Button variant="outline">レビュー一覧へ戻る</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 画像: レビュー画像 → 商品画像 → なし
  const reviewImages = Array.isArray((review as any).images)
    ? (review as any).images
    : (() => { try { return JSON.parse((review as any).images || "[]"); } catch { return []; } })();
  const displayImage = reviewImages.length > 0
    ? reviewImages[0]
    : (review as any).productImageUrl || null;

  const displayName = (review as any).productNameJa || (review as any).productName || `商品 #${review.productId}`;
  const maskedUser = maskEmail((review as any).userEmail, review.userName);
  const initial = maskedUser.charAt(0).toUpperCase();
  const avatarColor = getAvatarColor((review as any).userEmail || review.userName || "A");
  const userPoints = (review as any).userPoints ?? 0;
  const productPrice = (review as any).productPrice ?? 5000;
  const tier = getTierLabel(userPoints);
  const tierDiscount = getTierDiscount(userPoints, productPrice);

  const createdAt = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("ja-JP", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 bg-gray-50 py-10">
        <div className="container max-w-2xl mx-auto">
          {/* 戻るリンク */}
          <Link href="/reviews">
            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
              <ChevronLeft size={16} />
              レビュー一覧へ戻る
            </button>
          </Link>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* 商品情報バナー */}
            <div className="flex items-center gap-4 p-5 border-b border-gray-100 bg-gray-50">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag size={24} className="text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">対象商品</p>
                <Link href={`/products/${review.productId}`}>
                  <p className="text-sm font-semibold text-gray-800 hover:text-red-500 transition-colors line-clamp-2 cursor-pointer">
                    {displayName}
                  </p>
                </Link>
              </div>
            </div>

            {/* レビュー本文 */}
            <div className="p-6">
              {/* ユーザー情報 */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-sm font-bold">{initial}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{maskedUser}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${tier.bg} ${tier.color}`}>
                      {tier.label}
                    </span>
                    <span className="text-xs text-gray-400">{createdAt}</span>
                  </div>
                </div>
              </div>

              {/* 星評価 */}
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= review.rating
                        ? "fill-red-500 text-red-500"
                        : "fill-gray-200 text-gray-200"
                    }`}
                  />
                ))}
                <span className="text-base font-bold text-gray-700 ml-1">{review.rating}</span>
              </div>

              {/* タイトル */}
              {review.title && (
                <h2 className="text-xl font-bold text-gray-900 mb-3">{review.title}</h2>
              )}

              {/* 本文 */}
              {review.content && (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-5">
                  {review.content}
                </p>
              )}

              {/* レビュー画像 (複数) */}
              {reviewImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {reviewImages.map((img: string, idx: number) => (
                    <div key={idx} className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={img}
                        alt={`レビュー画像 ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 会員割引バナー */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${tier.bg} mt-2`}>
                <span className={`text-xs font-bold ${tier.color}`}>
                  ● {tier.label} 会員割引 ¥{tierDiscount} お得！
                </span>
              </div>
            </div>
          </div>

          {/* 商品ページへのリンク */}
          <div className="mt-6 text-center">
            <Link href={`/products/${review.productId}`}>
              <Button className="bg-red-500 hover:bg-red-600 text-white">
                この商品を見る
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
