import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sparkles, TrendingUp, Heart } from "lucide-react";
import { useState, useRef } from "react";
import SharedProductCard from "@/components/ProductCard";
import { Link } from "wouter";
import { toast } from "sonner";
import { toProxyUrl } from "@/lib/imageProxy";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import { parsePriceTiers, getLowestPrice } from "@/../../shared/utils/seoUtils";
import type { Product } from "@shared/types";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

const REC_COLS = 6;
const REC_PAGES = 3;
const REC_TOTAL = REC_COLS * REC_PAGES; // 18

// 슬림 카드 - 이미지 + 상품명 + 가격만 표시
function SlimProductCard({ product }: { product: any }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: isWished } = trpc.wishlist.isInWishlist.useQuery(
    { productId: product.id },
    { enabled: !!user }
  );
  const addWishlist = trpc.wishlist.add.useMutation({
    onSuccess: () => {
      utils.wishlist.isInWishlist.invalidate({ productId: product.id });
      toast.success("お気に入りに追加しました");
    },
  });
  const removeWishlist = trpc.wishlist.remove.useMutation({
    onSuccess: () => {
      utils.wishlist.isInWishlist.invalidate({ productId: product.id });
      toast.success("お気に入りから削除しました");
    },
  });

  const priceTiers = parsePriceTiers(product.setPricing);
  const lowestPrice = getLowestPrice(priceTiers, product.price);
  const hasTiers = priceTiers.length > 1;
  const originalPrice = product.originalPrice ?? null;
  const discountPercent =
    originalPrice && originalPrice > product.price
      ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
      : 0;

  return (
    <div className="group relative bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* 위시리스트 버튼 */}
      {user && (
        <button
          onClick={(e) => {
            e.preventDefault();
            if (isWished) {
              removeWishlist.mutate({ productId: product.id });
            } else {
              addWishlist.mutate({ productId: product.id });
            }
          }}
          className="absolute top-1.5 right-1.5 z-10 p-1 bg-white/80 hover:bg-white rounded-full shadow-sm transition-colors"
        >
          <Heart
            className={`w-3.5 h-3.5 ${isWished ? "fill-red-500 text-red-500" : "text-gray-400"}`}
          />
        </button>
      )}

      {/* 할인율 뱃지 */}
      {discountPercent > 0 && (
        <span className="absolute top-1.5 left-1.5 z-10 text-[10px] bg-orange-500 text-white font-bold px-1.5 py-0.5 rounded">
          {discountPercent}%OFF
        </span>
      )}

      <Link href={`/product/${product.id}`}>
        {/* 이미지 */}
        <div className="aspect-square bg-white flex items-center justify-center overflow-hidden p-2">
          {product.imageUrl ? (
            <img
              src={toProxyUrl(product.imageUrl) as string}
              alt={product.nameJa}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
              No Image
            </div>
          )}
        </div>

        {/* 상품명 + 가격 */}
        <div className="px-2 pb-2.5 pt-1">
          <p className="text-[11px] text-gray-700 font-medium line-clamp-2 leading-snug mb-1 min-h-[2.4em]">
            {product.nameJa}
          </p>
          <div className="flex items-baseline gap-1 flex-wrap">
            {originalPrice && originalPrice > product.price && (
              <span className="text-[10px] text-gray-400 line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="text-xs font-bold text-red-600">
              {formatPrice(lowestPrice)}{hasTiers ? "〜" : ""}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

// Personalized recommendations for logged-in users
export function PersonalizedRecommendations() {
  const { user } = useAuth();
  const { data: products = [], isLoading } = trpc.recommendation.getForUser.useQuery(
    { limit: REC_TOTAL },
    { enabled: !!user }
  );

  if (!user || isLoading || products.length === 0) return null;

  // 6개씩 그룹화
  const groups: any[][] = [];
  for (let i = 0; i < Math.min(products.length, REC_TOTAL); i += REC_COLS) {
    groups.push(products.slice(i, i + REC_COLS));
  }

  return (
    <section className="py-6">
      <div className="container">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">{user.name}様へのおすすめ</h2>
          <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">
            AIおすすめ
          </span>
        </div>

        {/* Swiper 드래그 슬라이더 */}
        <div className="relative rec-swiper-wrapper">
          <Swiper
            modules={[Pagination]}
            pagination={{
              el: ".rec-swiper-pagination",
              clickable: true,
              type: "bullets",
            }}
            slidesPerView={1}
            spaceBetween={0}
            loop={groups.length > 1}
            grabCursor={true}
            className="rec-swiper"
          >
            {groups.map((group, groupIndex) => (
              <SwiperSlide key={groupIndex}>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pb-2">
                  {group.map((product: any) => (
                    <SlimProductCard key={product.id} product={product} />
                  ))}
                  {/* 마지막 페이지 빈 칸 채우기 */}
                  {Array.from({ length: REC_COLS - group.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="invisible" />
                  ))}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* 커스텀 도트 페이지네이션 */}
          <div className="rec-swiper-pagination flex justify-center gap-2 mt-4" />
        </div>
      </div>
    </section>
  );
}

// "Customers also bought" for product detail page
export function AlsoBoughtProducts({ productId }: { productId: number }) {
  const { data: products = [], isLoading } = trpc.recommendation.getAlsoBought.useQuery(
    { productId, limit: 6 },
    { enabled: !!productId }
  );

  if (isLoading || products.length === 0) return null;

  return (
    <section className="py-6 border-t">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-bold">この商品を買った人はこんな商品も買っています</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {products.map((product: any) => (
          <SharedProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

// Smart related products for product detail page
export function SmartRelatedProducts({
  productId,
  categoryId,
}: {
  productId: number;
  categoryId: number;
}) {
  const { data: products = [], isLoading } = trpc.recommendation.getForProduct.useQuery(
    { productId, categoryId, limit: 6 },
    { enabled: !!productId && !!categoryId }
  );

  if (isLoading || products.length === 0) return null;

  return (
    <section className="py-6 border-t">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">あなたへのおすすめ関連商品</h2>
        <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">
          AIおすすめ
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {products.map((product: any) => (
          <SharedProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
