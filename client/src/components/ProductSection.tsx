import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";
import type { Product } from "@shared/types";

function ProductSkeleton({ columns = 6 }: { columns?: number }) {
  const gridClass = {
    4: "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6",
  }[columns] || "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6";
  return (
    <div className={`grid ${gridClass} gap-2`}>
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="rounded-lg overflow-hidden animate-pulse">
          <div className="bg-gray-200 aspect-square w-full" />
          <div className="p-2 space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  isLoading?: boolean;
  showRank?: boolean;
  moreLink?: string;
  bgColor?: string;
  columns?: number;
  badgeType?: "hit" | "new";
}

export default function ProductSection({
  title,
  subtitle,
  products,
  isLoading = false,
  showRank = false,
  moreLink,
  bgColor,
  columns = 6,
  badgeType,
}: ProductSectionProps) {
  const gridClass = {
    4: "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6",
  }[columns] || "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6";

  return (
    <section className={`py-3 ${bgColor || ""}`}>
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="jp-section-title">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground -mt-2 ml-4">{subtitle}</p>
            )}
          </div>
          {moreLink && (
            <Link
              href={moreLink}
              className="flex items-center text-sm text-primary hover:underline"
            >
              もっと見る
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Products grid or skeleton */}
        {isLoading ? (
          <ProductSkeleton columns={columns} />
        ) : (
          <div className={`grid ${gridClass} gap-2`}>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                rank={showRank ? index + 1 : undefined}
                badgeType={badgeType}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
