import { useCompare } from "@/contexts/CompareContext";
import { GitCompare, Check } from "lucide-react";
import { toast } from "sonner";

interface CompareButtonProps {
  product: {
    id: number;
    name: string;
    nameJa: string;
    price: string;
    originalPrice?: string | null;
    imageUrl?: string | null;
    rating?: string | null;
    reviewCount?: number;
    brand?: string | null;
    brandJa?: string | null;
    activeIngredient?: string | null;
    activeIngredientJa?: string | null;
    volume?: string | null;
    categoryId?: number;
  };
  size?: "sm" | "md";
}

export default function CompareButton({ product, size = "sm" }: CompareButtonProps) {
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const inCompare = isInCompare(product.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCompare) {
      removeFromCompare(product.id);
      toast.info("比較リストから削除しました");
    } else {
      const success = addToCompare(product);
      if (success) {
        toast.success("比較リストに追加しました");
      } else {
        toast.error("比較リストは最大4件までです");
      }
    }
  };

  // size="md" is used in detail pages - keep text label for those
  if (size === "md") {
    return (
      <button
        onClick={handleClick}
        className={`px-3 py-1.5 text-sm rounded-md border transition-colors flex items-center gap-1 ${
          inCompare
            ? "bg-pink-50 border-pink-300 text-pink-600"
            : "bg-white/80 border-gray-200 text-gray-500 hover:border-pink-300 hover:text-pink-600"
        }`}
        title={inCompare ? "比較リストから削除" : "比較リストに追加"}
      >
        {inCompare ? <Check className="w-3.5 h-3.5" /> : <GitCompare className="w-3.5 h-3.5" />}
        {inCompare ? "比較中" : "比較"}
      </button>
    );
  }

  // size="sm" (card mode) - icon-only rounded circle matching wishlist button
  return (
    <button
      onClick={handleClick}
      className={`p-1 rounded-full shadow-sm transition-shadow flex items-center justify-center ${
        inCompare
          ? "bg-pink-50 text-pink-600 hover:shadow"
          : "bg-white/90 text-gray-400 hover:shadow hover:text-pink-500"
      }`}
      title={inCompare ? "比較リストから削除" : "比較リストに追加"}
    >
      {inCompare ? <Check className="w-3.5 h-3.5" /> : <GitCompare className="w-3.5 h-3.5" />}
    </button>
  );
}
