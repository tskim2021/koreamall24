import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Clock, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import MyPageSidebar from "@/components/MyPageSidebar";

export default function RecentlyViewed() {
  const { data: products = [], isLoading } = trpc.product.getRecentlyViewed.useQuery({ limit: 50 });
  const addToCartMutation = trpc.cart.add.useMutation({
    onSuccess: () => toast.success("カートに追加しました"),
    onError: () => toast.error("カートへの追加に失敗しました"),
  });
  const addToWishlistMutation = trpc.wishlist?.add?.useMutation?.({
    onSuccess: () => toast.success("お気に入りに追加しました"),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-6">
        <div className="flex gap-6">
          <MyPageSidebar />
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-bold text-gray-900">閲覧履歴</h1>
                {products.length > 0 && (
                  <span className="text-sm text-gray-500">({products.length}件)</span>
                )}
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 rounded-lg aspect-square mb-2" />
                      <div className="h-3 bg-gray-200 rounded mb-1" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-16">
                  <Clock className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-500 text-sm">閲覧履歴がありません</p>
                  <Link href="/">
                    <Button variant="outline" className="mt-4 text-sm">商品を探す</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {products.map((product: any) => {
                    const imageUrl = product.imageUrls?.[0] || product.imageUrl;
                    const price = product.discountedPrice ?? product.price ?? 0;
                    const originalPrice = product.price ?? 0;
                    const hasDiscount = product.discountedPrice && product.discountedPrice < originalPrice;
                    const discountRate = hasDiscount
                      ? Math.round((1 - product.discountedPrice / originalPrice) * 100)
                      : 0;

                    return (
                      <div key={product.id} className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                        <Link href={`/product/${product.id}`}>
                          <div className="aspect-square bg-gray-50 overflow-hidden">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.nameJa || product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingCart className="w-8 h-8 text-gray-200" />
                              </div>
                            )}
                          </div>
                          {hasDiscount && (
                            <Badge className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5">
                              -{discountRate}%
                            </Badge>
                          )}
                        </Link>

                        <div className="p-3">
                          <Link href={`/product/${product.id}`}>
                            <p className="text-xs text-gray-800 line-clamp-2 leading-snug mb-1.5 hover:text-primary transition-colors">
                              {product.nameJa || product.name}
                            </p>
                          </Link>
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-sm font-bold text-primary">¥{price.toLocaleString()}</span>
                            {hasDiscount && (
                              <span className="text-[10px] text-gray-400 line-through">¥{originalPrice.toLocaleString()}</span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="w-full h-7 text-[11px]"
                            onClick={() => addToCartMutation.mutate({ productId: product.id, quantity: 1 })}
                            disabled={addToCartMutation.isPending}
                          >
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            カートへ
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
