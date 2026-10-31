import { Link } from "wouter";
import { Star, Heart } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import CompareButton from "./CompareButton";
import OptimizedImage from "./OptimizedImage";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import { parsePriceTiers, getLowestPrice } from "@/../../shared/utils/seoUtils";
import type { Product } from "@shared/types";
import { toProxyUrl } from "@/lib/imageProxy";

interface ProductCardProps {
  product: Product;
  rank?: number;
  categoryName?: string;
  badgeType?: "hit" | "new";
  showRecommendBadge?: boolean;
  showNewBadge?: boolean;
  rankNumber?: number;
}

export default function ProductCard({ product, rank, categoryName, badgeType, showRecommendBadge, showNewBadge, rankNumber }: ProductCardProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const { user } = useAuth();
  const addMutation = trpc.wishlist.add.useMutation();
  const removeMutation = trpc.wishlist.remove.useMutation();
  const checkQuery = trpc.wishlist.isInWishlist.useQuery(
    { productId: product.id },
    { enabled: !!user } // Only query when logged in
  );

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert('ログインしてください');
      return;
    }

    if (checkQuery.data) {
      removeMutation.mutate({ productId: product.id }, {
        onSuccess: () => setIsInWishlist(false),
      });
    } else {
      addMutation.mutate({ productId: product.id }, {
        onSuccess: () => setIsInWishlist(true),
      });
    }
  };

  // seoUtils 기반 최저가 계산
  const _priceTiers = parsePriceTiers((product as any).setPricing);
  const _lowestPrice = getLowestPrice(_priceTiers, product.price);
  const _hasTiers = _priceTiers.length > 1;

  // setPricing 옵션 중 최고 할인율 및 해당 최저 단가 계산
  const bestTier = (() => {
    if (!product.setPricing) return null;
    try {
      const options = typeof product.setPricing === 'string'
        ? JSON.parse(product.setPricing)
        : product.setPricing;
      if (!Array.isArray(options) || options.length === 0) return null;
      // discountPercent 가장 높은 옵션 선택
      return options.reduce((best: any, cur: any) => {
        const curDiscount = Number(cur.discountPercent ?? 0);
        const bestDiscount = Number(best?.discountPercent ?? 0);
        return curDiscount > bestDiscount ? cur : best;
      }, null);
    } catch {
      return null;
    }
  })();

  // 최고 할인율 옵션이 있으면 그 값 사용, 없으면 originalPrice 기반 계산
  const bestDiscount = bestTier && Number(bestTier.discountPercent) > 0
    ? Math.round(Number(bestTier.discountPercent))
    : (product.originalPrice
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0);

  // 최저 단가 (최고 할인율 옵션의 pricePerUnit)
  const bestUnitPrice = bestTier ? Number(bestTier.pricePerUnit) : product.price;

  // 표시용 할인 계산 (기존 변수명 유지)
  const discount = bestDiscount;

  const getRankClass = (rank: number) => {
    switch (rank) {
      case 1: return "jp-rank-1";
      case 2: return "jp-rank-2";
      case 3: return "jp-rank-3";
      default: return "jp-rank-default";
    }
  };

  // Parse hashtags from searchTags field
  // Supports: "#tag1 #tag2", "#tag1#tag2", "tag1,tag2" formats
  const hashtags: string[] = [];
  if ((product as any).searchTags) {
    const raw: string = (product as any).searchTags;
    // Split by whitespace, comma, or # (keeping # as separator)
    const parts = raw.split(/[\s,]+|(?=#)/).filter(Boolean);
    for (const part of parts) {
      const tag = part.startsWith("#") ? part : `#${part}`;
      if (tag.length > 1) hashtags.push(tag);
    }
  }

  return (
    <Link href={`/product/${product.id}`}>
      <div className="jp-card h-full flex flex-col group cursor-pointer hover:shadow-lg transition-shadow">
        {/* Image container - aspect-ratio 고정으로 레이아웃이 이미지 로드와 무관하게 즉시 확정 */}
        <div className="relative w-full bg-white rounded-t overflow-hidden" style={{aspectRatio: '1/1', marginBottom: '-13px'}}>
          <div className="absolute inset-0 flex items-center justify-center p-[10%]">
          <OptimizedImage
            src={toProxyUrl((product as any).imageUrl)}
            srcMedium={toProxyUrl((product as any).imageUrlMedium)}
            srcThumb={toProxyUrl((product as any).imageUrlThumb)}
            blurDataUrl={(product as any).blurDataUrl}
            alt={`${(product as any).brandJa ? (product as any).brandJa + ' ' : ''}${product.nameJa}${(product as any).volume ? ' ' + (product as any).volume : ''}`}
            size="medium"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
            containerClassName="w-full h-full"
          />
          </div>

          {/* Rank badge */}
          {rank && (
            <div className={`jp-rank ${getRankClass(rank)}`}>
              {rank}
            </div>
          )}

          {/* Wishlist & Compare buttons - top-right, horizontal */}
          <div className="absolute top-1.5 right-1.5 flex flex-row gap-1 z-10">
            <button
              onClick={handleWishlistClick}
              className="p-1 bg-white/90 rounded-full shadow-sm hover:shadow transition-shadow"
              title={checkQuery.data ? "ウィッシュリストから削除" : "ウィッシュリストに追加"}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  checkQuery.data ? "fill-red-500 text-red-500" : "text-gray-400"
                }`}
              />
            </button>
            <CompareButton product={product as any} size="sm" />
          </div>

          {/* おすすめ badge - inside image container so it's always on top */}
          {showRecommendBadge && (
            <div className="absolute top-2 left-2 z-30 bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm pointer-events-none">おすすめ</div>
          )}

          {/* NEW badge - inside image container, top-left, always on top */}
          {showNewBadge && (
            <div className="absolute top-2 left-2 z-30 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm pointer-events-none">NEW</div>
          )}

          {/* Rank number badge - inside image container, top-left, always on top */}
          {rankNumber !== undefined && (
            <div
              className="absolute top-2 left-2 z-30 flex items-center justify-center rounded-lg pointer-events-none"
              style={{
                width: '2rem', height: '2rem',
                fontSize: rankNumber <= 3 ? '0.875rem' : '0.75rem',
                fontWeight: rankNumber <= 3 ? 800 : 700,
                color: '#fff',
                boxShadow: rankNumber === 1 ? '0 2px 8px rgba(245,158,11,0.5)' : rankNumber === 2 ? '0 2px 8px rgba(156,163,175,0.5)' : rankNumber === 3 ? '0 2px 8px rgba(249,115,22,0.5)' : undefined,
                background: rankNumber === 1 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : rankNumber === 2 ? 'linear-gradient(135deg,#9ca3af,#6b7280)' : rankNumber === 3 ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'rgba(220,38,38,0.85)',
              }}
            >
              {rankNumber}
            </div>
          )}

          {/* HIT / NEW ribbon badge - top-left corner ribbon */}
          {badgeType === "hit" && (
            <div className="absolute top-0 left-0 z-20">
              <div className="relative w-16 h-16 overflow-hidden">
                <div className="absolute -top-1 -left-1 w-20 h-20">
                  <div
                    className="absolute top-3 -left-5 w-24 text-center text-white text-[11px] font-extrabold tracking-wider py-1 shadow-md"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", transform: "rotate(-45deg)" }}
                  >
                    HIT
                  </div>
                </div>
              </div>
            </div>
          )}
          {badgeType === "new" && (
            <div className="absolute top-0 left-0 z-20">
              <div className="relative w-16 h-16 overflow-hidden">
                <div className="absolute -top-1 -left-1 w-20 h-20">
                  <div
                    className="absolute top-3 -left-5 w-24 text-center text-white text-[11px] font-extrabold tracking-wider py-1 shadow-md"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", transform: "rotate(-45deg)" }}
                  >
                    NEW
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Sale badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {product.isTimeSale && (
              <span className="jp-badge jp-badge-sale text-[10px]">タイムセール</span>
            )}
            {product.isMonthlySale && (
              <span className="jp-badge bg-green-500 text-white text-[10px]">月間セール</span>
            )}
            {(product as any).couponExcluded && (
              <span className="bg-gray-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">クーポン対象外</span>
            )}
          </div>
        </div>

        {/* Product info */}
        <div className="flex-1 flex flex-col p-2 md:p-3 bg-white">

          {/* 1. Category name - small, muted */}
          {categoryName && (
            <p className="text-[10px] md:text-xs text-muted-foreground/70 mb-0.5 leading-tight">{categoryName}</p>
          )}

          {/* 2. Korean product name (title) - small, muted, 1 line max */}
          {product.name && (
            <p className="text-[10px] md:text-[11px] text-muted-foreground/80 line-clamp-1 mb-0.5 leading-snug">
              {product.name}
            </p>
          )}

          {/* 2.5. Brand name */}
          {(product as any).brandJa && (
            <p className="text-[10px] md:text-xs text-blue-600 font-medium mb-0.5 leading-tight">{(product as any).brandJa}</p>
          )}

          {/* 3. Japanese product name - 2 lines fixed height, bold */}
          <div className="h-[2.4em] md:h-[2.6em] mb-1 md:mb-1.5">
            <h3 className="text-[12px] md:text-[13px] font-semibold line-clamp-2 group-hover:text-primary transition-colors leading-snug">
              {product.nameJa}
            </h3>
          </div>

          {/* 3.5. Volume/quantity */}
          {(product as any).volume && (
            <p className="text-[10px] md:text-xs text-muted-foreground mb-1 leading-tight">{(product as any).volume}</p>
          )}

          {/* 4. Price section: right-aligned, best discount% / base price strikethrough / best unit price */}
          <div className="mb-1 md:mb-1.5 text-right">
            {discount > 0 ? (
              <div className="flex flex-col gap-0.5 md:gap-1 items-end">
                {/* Best discount % from options */}
                <span className="text-[11px] md:text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                  {discount}%OFF
                </span>
                {/* Lowest price with 〜 + strikethrough original */}
                <div className="flex items-baseline gap-1.5 md:gap-2 justify-end">
                  {product.originalPrice && (
                    <span className="text-[10px] md:text-[11px] line-through text-muted-foreground">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  <span className="text-[14px] md:text-base font-bold text-primary leading-tight">
                    {formatPrice(_lowestPrice)}{_hasTiers ? '〜' : ''}
                  </span>
                </div>
                {bestTier && (
                  <p className="text-[9px] md:text-[10px] text-muted-foreground">
                    {bestTier.quantity}箱まとめ購入で1箱あたり
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 md:gap-1 items-end">
                <span className="text-[14px] md:text-base font-bold text-primary leading-tight">
                  {formatPrice(_lowestPrice)}{_hasTiers ? '〜' : ''}
                </span>
              </div>
            )}
          </div>

          {/* 4.5. Product options (setPricing) - light blue background tags, 1 line, ellipsis */}
          {product.setPricing && (() => {
            try {
              const options = typeof product.setPricing === 'string' ? JSON.parse(product.setPricing) : product.setPricing;
              if (Array.isArray(options) && options.length > 0) {
                return (
                  <div className="mb-1 md:mb-1.5 overflow-hidden">
                    <div className="flex flex-nowrap gap-1 md:gap-1.5 overflow-hidden" style={{maxHeight:'1.6em'}}>
                      {options.map((option, i) => {
                        const label = option.quantity ? `${option.quantity}${option.unit || '箱'}` : option.label || String(option);
                        return (
                          <span
                            key={i}
                            className="text-[9px] md:text-[10px] text-blue-700 bg-blue-50 rounded-full px-2 py-0.5 md:px-2.5 md:py-1 leading-tight whitespace-nowrap"
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            } catch (e) {
              // Silent fail
            }
            return null;
          })()}

          {/* 5. Rating - 별 5개 + 점수 + 리뷰 수 */}
          {product.reviewCount && product.reviewCount > 0 ? (
            <div className="flex items-center gap-1 mb-1 md:mb-1.5">
              {/* 별 5개 */}
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((star) => {
                  const ratingVal = parseFloat(product.rating || '0');
                  const filled = ratingVal >= star;
                  const half = !filled && ratingVal >= star - 0.5;
                  return (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        filled ? 'fill-yellow-400 text-yellow-400' :
                        half ? 'fill-yellow-200 text-yellow-400' :
                        'fill-gray-200 text-gray-300'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] md:text-xs font-semibold text-yellow-600">
                {parseFloat(product.rating || '0').toFixed(1)}
              </span>
              <span className="text-[10px] md:text-xs text-muted-foreground">
                ({product.reviewCount})
              </span>
            </div>
          ) : null}

          {/* 6. Description (2-3 lines) - Fallback 로직으로 description, descriptionJa, usageMethodJa, activeIngredientJa 순서 확인 */}
          {(() => {
            const raw = (product as any).descriptionJa || (product as any).description;
            if (!raw) return null;
            const plain = String(raw)
              .replace(/<[^>]*>/g, "")
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .trim();
            return plain ? (
              <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-2 mb-1 md:mb-1.5 leading-snug">
                {plain.length > 100 ? plain.slice(0, 100) + "..." : plain}
              </p>
            ) : null;
          })()}

          {/* 7. Hashtags - max 3 badges */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 md:gap-1 pt-0.5">
              {hashtags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="text-[9px] md:text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-1.5 py-0.5 leading-tight whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
              {hashtags.length > 3 && (
                <span className="text-[9px] md:text-[10px] text-gray-400 leading-tight self-center">+{hashtags.length - 3}</span>
              )}
            </div>
          )}

          {/* Spacer to push content to top */}
          <div className="mt-auto" />
        </div>
      </div>
    </Link>
  );
}
