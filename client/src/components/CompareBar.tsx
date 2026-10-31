import { useCompare } from "@/contexts/CompareContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { X, GitCompare, Trash2 } from "lucide-react";

export default function CompareBar() {
  const { compareItems, removeFromCompare, clearCompare, compareCount } = useCompare();
  const [, setLocation] = useLocation();

  if (compareCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-pink-500 shadow-lg">
      <div className="container py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Compare items preview */}
          <div className="flex items-center gap-3 flex-1 overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <GitCompare className="w-5 h-5 text-pink-600" />
              <span className="text-sm font-medium text-gray-700">
                比較リスト ({compareCount}/4)
              </span>
            </div>
            <div className="flex gap-2">
              {compareItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 shrink-0"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.nameJa}
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <span className="text-xs max-w-[120px] truncate">{item.nameJa}</span>
                  <button
                    onClick={() => removeFromCompare(item.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={clearCompare}
              className="text-gray-500"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              クリア
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation("/compare")}
              disabled={compareCount < 2}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              <GitCompare className="w-4 h-4 mr-1" />
              比較する ({compareCount})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
