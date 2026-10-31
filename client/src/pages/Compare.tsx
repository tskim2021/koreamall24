import { useCompare } from "@/contexts/CompareContext";
import { useLocation, Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/OptimizedImage";
import { toProxyUrl } from "@/lib/imageProxy";
import { Button } from "@/components/ui/button";
import { GitCompare, X, ShoppingCart, Star, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { formatPrice } from "@/../../shared/utils/formatPrice";

export default function Compare() {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast.success("カートに追加しました");
      utils.cart.count.invalidate();
      utils.cart.list.invalidate();
    },
    onError: () => toast.error("カートへの追加に失敗しました"),
  });

  if (compareItems.length < 2) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12 text-center">
          <GitCompare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">比較する商品を選択してください</h1>
          <p className="text-muted-foreground mb-6">
            2つ以上の商品を比較リストに追加してください
          </p>
          <Button onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            商品を探す
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const comparisonRows = [
    {
      label: "画像",
      render: (item: typeof compareItems[0]) => (
        <Link href={`/product/${item.id}`}>
          <div className="w-32 h-32 mx-auto bg-secondary/30 rounded-lg overflow-hidden">
            <OptimizedImage
              src={toProxyUrl(item.imageUrl)}
              srcThumb={toProxyUrl((item as any).imageUrlThumb)}
              blurDataUrl={(item as any).blurDataUrl}
              alt={item.nameJa}
              size="medium"
              className="w-full h-full object-cover"
              containerClassName="w-full h-full"
            />
          </div>
        </Link>
      ),
    },
    {
      label: "商品名",
      render: (item: typeof compareItems[0]) => (
        <Link href={`/product/${item.id}`} className="font-medium hover:text-pink-600 transition-colors text-sm">
          {item.nameJa}
        </Link>
      ),
    },
    {
      label: "価格",
      render: (item: typeof compareItems[0]) => (
        <div>
          <span className="text-lg font-bold text-pink-600">
            {formatPrice(Math.round(parseFloat(item.price)))}
          </span>
          {item.originalPrice && parseFloat(item.originalPrice) > parseFloat(item.price) && (
            <span className="text-sm text-muted-foreground line-through ml-2">
              {formatPrice(Math.round(parseFloat(item.originalPrice)))}
            </span>
          )}
        </div>
      ),
    },
    {
      label: "評価",
      render: (item: typeof compareItems[0]) => (
        <div className="flex items-center justify-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="font-medium">{item.rating || "0.0"}</span>
          <span className="text-xs text-muted-foreground">({item.reviewCount || 0}件)</span>
        </div>
      ),
    },
    {
      label: "ブランド",
      render: (item: typeof compareItems[0]) => (
        <span className="text-sm">{item.brandJa || item.brand || "-"}</span>
      ),
    },
    {
      label: "有効成分",
      render: (item: typeof compareItems[0]) => (
        <span className="text-sm">{item.activeIngredientJa || item.activeIngredient || "-"}</span>
      ),
    },
    {
      label: "内容量",
      render: (item: typeof compareItems[0]) => (
        <span className="text-sm">{item.volume || "-"}</span>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <GitCompare className="w-7 h-7 text-pink-600" />
            <h1 className="text-2xl font-bold">商品比較</h1>
            <span className="text-sm text-muted-foreground">({compareItems.length}件)</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearCompare}>
              リストをクリア
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-32 p-3 text-left text-sm font-medium text-gray-500 bg-gray-50 border-b sticky left-0 z-10">
                  項目
                </th>
                {compareItems.map((item) => (
                  <th key={item.id} className="p-3 min-w-[200px] border-b bg-gray-50">
                    <button
                      onClick={() => removeFromCompare(item.id)}
                      className="float-right text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, idx) => (
                <tr key={row.label} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="p-3 text-sm font-medium text-gray-600 border-b sticky left-0 z-10 bg-inherit">
                    {row.label}
                  </td>
                  {compareItems.map((item) => (
                    <td key={item.id} className="p-3 text-center border-b">
                      {row.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Add to Cart row */}
              <tr>
                <td className="p-3 text-sm font-medium text-gray-600 border-b sticky left-0 z-10 bg-white">
                  操作
                </td>
                {compareItems.map((item) => (
                  <td key={item.id} className="p-3 text-center border-b">
                    <div className="flex flex-col gap-2 items-center">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!isAuthenticated) {
                            toast.error("ログインが必要です");
                            return;
                          }
                          addToCart.mutate({ productId: item.id, quantity: 1 });
                        }}
                        className="bg-pink-600 hover:bg-pink-700 text-white"
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        カートに追加
                      </Button>
                      <Link href={`/product/${item.id}`}>
                        <Button variant="outline" size="sm">
                          詳細を見る
                        </Button>
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </div>
  );
}
