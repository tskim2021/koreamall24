import { Link } from "wouter";
import { toProxyUrl } from "@/lib/imageProxy";

interface TimeSaleSideColumnProps {
  products: any[];
}

// Qoo10-style compact vertical "タイムセール" list, sitting beside the ranking row.
export default function TimeSaleSideColumn({ products }: TimeSaleSideColumnProps) {
  const items = products.slice(0, 3);
  if (items.length === 0) return null;

  return (
    <div className="hidden lg:flex flex-col w-[220px] shrink-0 bg-white border border-gray-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <h3 className="font-bold text-sm text-primary">タイムセール</h3>
        <Link href="/search?q=タイムセール&sort=discount" className="text-xs text-primary hover:underline">
          もっと見る
        </Link>
      </div>
      <div className="flex-1 divide-y divide-gray-100">
        {items.map((product) => {
          const discount = product.originalPrice && product.originalPrice > product.price
            ? Math.round((1 - product.price / product.originalPrice) * 100)
            : null;
          return (
            <Link key={product.id} href={`/product/${product.id}`} className="flex gap-2 p-2 hover:bg-gray-50 transition-colors">
              <img
                src={toProxyUrl(product.imageUrl, { width: 100 }) || ""}
                alt={product.nameJa || product.name}
                className="w-14 h-14 object-cover rounded shrink-0 bg-gray-50"
                loading="lazy"
              />
              <div className="min-w-0 flex flex-col justify-center">
                <p className="text-xs text-gray-700 line-clamp-2 leading-snug">{product.nameJa || product.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-sm font-bold text-red-600">¥{product.price?.toLocaleString()}</span>
                  {discount && <span className="text-[10px] font-bold text-white bg-red-500 rounded px-1">{discount}%</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
