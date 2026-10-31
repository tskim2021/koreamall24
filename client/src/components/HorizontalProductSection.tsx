import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import HorizontalProductCard from "./HorizontalProductCard";
import type { Product } from "@shared/types";

interface HorizontalProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  moreLink?: string;
  bgColor?: string;
  /** Number of columns in the grid (default: 3) */
  columns?: 2 | 3;
  showRank?: boolean;
}

export default function HorizontalProductSection({
  title,
  subtitle,
  products,
  moreLink,
  bgColor,
  columns = 3,
  showRank = false,
}: HorizontalProductSectionProps) {
  const gridClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

  return (
    <section className={`py-6 ${bgColor || ""}`}>
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
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

        {/* Products grid */}
        <div className={`grid ${gridClass} gap-2`}>
          {products.map((product, index) => (
            <HorizontalProductCard
              key={product.id}
              product={product}
              rank={showRank ? index + 1 : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
