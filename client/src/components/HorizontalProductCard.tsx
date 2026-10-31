import { Link } from "wouter";
import { Star } from "lucide-react";
import OptimizedImage from "./OptimizedImage";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import { parsePriceTiers, getLowestPrice } from "@/../../shared/utils/seoUtils";
import type { Product } from "@shared/types";
import { toProxyUrl } from "@/lib/imageProxy";

interface HorizontalProductCardProps {
  product: Product;
  rank?: number;
}

export default function HorizontalProductCard({ product, rank }: HorizontalProductCardProps) {
  // 최저가 계산
  const priceTiers = parsePriceTiers((product as any).setPricing);
  const lowestPrice = getLowestPrice(priceTiers, product.price);
  const hasTiers = priceTiers.length > 1;

  // 최고 할인율 계산
  const bestDiscount = (() => {
    if (!product.setPricing) {
      return product.originalPrice
        ? Math.round((1 - product.price / product.originalPrice) * 100)
        : 0;
    }
    try {
      const options = typeof product.setPricing === "string"
        ? JSON.parse(product.setPricing)
        : product.setPricing;
      if (!Array.isArray(options) || options.length === 0) {
        return product.originalPrice
          ? Math.round((1 - product.price / product.originalPrice) * 100)
          : 0;
      }
      const best = options.reduce((b: any, c: any) =>
        Number(c.discountPercent ?? 0) > Number(b?.discountPercent ?? 0) ? c : b, null);
      return best && Number(best.discountPercent) > 0
        ? Math.round(Number(best.discountPercent))
        : product.originalPrice
          ? Math.round((1 - product.price / product.originalPrice) * 100)
          : 0;
    } catch {
      return 0;
    }
  })();

  return (
    <Link href={`/product/${product.id}`}>
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
        {/* Rank number */}
        {rank && (
          <span className="text-xs font-bold text-muted-foreground/60 w-4 text-center flex-shrink-0">
            {rank}
          </span>
        )}

        {/* Thumbnail */}
        <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden flex items-center justify-center border border-gray-100">
          <OptimizedImage
            src={toProxyUrl((product as any).imageUrlThumb || (product as any).imageUrl)}
            srcMedium={toProxyUrl((product as any).imageUrlMedium)}
            srcThumb={toProxyUrl((product as any).imageUrlThumb)}
            blurDataUrl={(product as any).blurDataUrl}
            alt={product.nameJa}
            size="thumb"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
            containerClassName="w-full h-full"
          />
        </div>

        {/* Product info */}
        <div className="flex-1 min-w-0">
          {/* Brand */}
          {(product as any).brandJa && (
            <p className="text-[10px] text-blue-600 font-medium leading-tight mb-0.5 truncate">
              {(product as any).brandJa}
            </p>
          )}
          {/* Japanese product name */}
          <h3 className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors mb-1">
            {product.nameJa}
          </h3>
          {/* Rating */}
          {product.rating && parseFloat(product.rating) > 0 && (
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-yellow-600 leading-none">
                {parseFloat(product.rating).toFixed(1)}
              </span>
              {product.reviewCount && product.reviewCount > 0 && (
                <span className="text-[10px] text-muted-foreground leading-none">
                  ({product.reviewCount})
                </span>
              )}
            </div>
          )}
          {/* Price */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            {bestDiscount > 0 && (
              <span className="text-[10px] font-bold text-red-500">{bestDiscount}%OFF</span>
            )}
            <span className="text-sm font-bold text-primary leading-tight">
              {formatPrice(lowestPrice)}{hasTiers ? "〜" : ""}
            </span>
            {product.originalPrice && bestDiscount > 0 && (
              <span className="text-[10px] line-through text-muted-foreground">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
