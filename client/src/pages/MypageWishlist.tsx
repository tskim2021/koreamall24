import { trpc } from "@/lib/trpc";
import { toProxyUrl } from "@/lib/imageProxy";
import { useAuth } from "@/_core/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Heart, ShoppingCart, ChevronRight, User, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import MyPageSidebar from "@/components/MyPageSidebar";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import { toast } from "sonner";

export default function MypageWishlist() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-4">ログインが必要です</h1>
            <p className="text-gray-600 mb-6">マイページを表示するにはログインしてください。</p>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setLocation("/login")}>
              ログインページへ
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { data: wishlist, isLoading } = trpc.wishlist.getAll.useQuery(undefined, {
    enabled: !!user,
  });

  const removeMutation = trpc.wishlist.remove.useMutation({
    onSuccess: () => {
      utils.wishlist.getAll.invalidate();
      toast.success("ウィッシュリストから削除しました");
    },
    onError: () => {
      toast.error("削除に失敗しました");
    },
  });

  const addToCartMutation = trpc.cart.add.useMutation({
    onSuccess: () => {
      utils.cart.list.invalidate();
      toast.success("カートに追加しました");
    },
    onError: () => {
      toast.error("カートへの追加に失敗しました");
    },
  });

  const handleRemove = (productId: number) => {
    removeMutation.mutate({ productId });
  };

  const handleAddToCart = (productId: number) => {
    addToCartMutation.mutate({ productId, quantity: 1 });
  };

  const wishlistCount = wishlist?.length ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/mypage" className="flex items-center gap-1 text-primary hover:underline font-medium">
            <ChevronRight className="w-4 h-4 rotate-180" />
            マイページに戻る
          </Link>
        </div>

        <div className="flex gap-6 lg:gap-8 items-start">
          {/* Sidebar */}
          <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <MyPageSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Header Banner */}
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-5 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  ウィッシュリスト
                </h1>
                <p className="text-sm text-amber-700 mt-0.5">お気に入りの商品を管理してください</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">登録商品数</p>
                <p className="text-2xl font-bold text-primary">{isLoading ? "—" : wishlistCount}</p>
              </div>
            </div>

            {/* Wishlist Content */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {isLoading ? (
                <div className="p-5 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 p-4 border border-gray-100 rounded-xl animate-pulse">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                        <div className="h-5 bg-gray-100 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : wishlist && wishlist.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {wishlist.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 hover:bg-gray-50 transition-colors">
                      {/* Product Image */}
                      <Link href={`/product/${item.product.id}`} className="shrink-0">
                        {item.product.imageUrl ? (
                          <img
                            src={toProxyUrl(item.product.imageUrl) as string}
                            alt={item.product.nameJa}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-100"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </Link>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/product/${item.product.id}`} className="hover:text-primary transition-colors">
                          <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2 leading-snug">
                            {item.product.nameJa}
                          </h3>
                        </Link>
                        {item.product.descriptionJa && (
                          <p className="text-xs text-gray-400 mb-2 line-clamp-1">
                            {item.product.descriptionJa}
                          </p>
                        )}
                        <div className="flex items-baseline gap-2 flex-wrap">
                          {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                            <span className="text-xs line-through text-gray-400">
                              {formatPrice(item.product.originalPrice)}
                            </span>
                          )}
                          <span className="text-base font-bold text-primary">
                            {formatPrice(item.product.price)}
                          </span>
                          {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                            <span className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                              {Math.round((1 - item.product.price / item.product.originalPrice) * 100)}%OFF
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 justify-center shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(item.product.id)}
                          disabled={addToCartMutation.isPending}
                          className="gap-1.5 text-xs"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          カートへ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemove(item.product.id)}
                          disabled={removeMutation.isPending}
                          className="gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          削除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-6">
                  <Heart className="w-14 h-14 mx-auto text-gray-200 mb-4" />
                  <h2 className="text-lg font-bold text-gray-700 mb-2">ウィッシュリストが空です</h2>
                  <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
                    気になる商品を見つけたら、ハートアイコンをクリックして保存しましょう
                  </p>
                  <Link href="/">
                    <Button className="gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      ショッピングを続ける
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Bottom action bar (if items exist) */}
            {wishlist && wishlist.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-800">{wishlistCount}件</span> の商品が登録されています
                </p>
                <Link href="/">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    ショッピングを続ける
                  </Button>
                </Link>
              </div>
            )}

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
