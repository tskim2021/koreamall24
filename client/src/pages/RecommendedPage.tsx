import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import HomeSidebar from "@/components/HomeSidebar";
import { ShoppingBag } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useImagePrefetch } from "@/hooks/useImagePrefetch";

// 서버에서 주입된 초기 데이터 활용
const serverData = (window as any).__INITIAL_DATA__;
const serverRecommended = serverData?.recommendedProducts;

export default function RecommendedPage() {
  const { data: products = [], isLoading } = trpc.product.recommendedProducts.useQuery(
    { limit: 30 },
    { initialData: serverRecommended?.length ? serverRecommended : undefined }
  );

  // 서버 데이터가 있으면 스켈레톤 표시 안 함
  const showSkeleton = isLoading && !serverRecommended?.length;

  // 추천 상품 이미지 프리페치
  useImagePrefetch(products);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEOHead
        title="おすすめ商品"
        description="koreamall24スタッフが厳選したおすすめの医薬品・健康商品をご紹介します。品質と効果にこだわった商品を揃えました。"
        keywords="おすすめ商品, スタッフ厳選, 日本医薬品, 健康商品"
        ogType="website"
      />
      <Header />
      <main className="flex-1">
        {/* ページヘッダー */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white py-8">
          <div className="container">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">おすすめ商品</h1>
                <p className="text-white/80 text-sm mt-1">スタッフが厳選したおすすめ商品をご紹介します</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-6">
          <div className="flex gap-6 items-start">
            <HomeSidebar compact />

            <div className="flex-1 min-w-0">
              {showSkeleton ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 animate-pulse">
                      <div className="aspect-square bg-gray-200 rounded mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : products.length > 0 ? (
                <>
                  <p className="text-sm text-gray-500 mb-4">{products.length}件の商品</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {products.map((product) => (
                      <div key={product.id}>
                        <ProductCard product={product} showRecommendBadge={true} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16">
                  <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">おすすめ商品はありません</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
