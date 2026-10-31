import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import HomeSidebar from "@/components/HomeSidebar";
import { Trophy } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useImagePrefetch } from "@/hooks/useImagePrefetch";

// 서버에서 주입된 초기 데이터 활용
const serverData = (window as any).__INITIAL_DATA__;
const serverRankingProducts = serverData?.rankingProducts;

export default function RankingTop100() {
  const { data: products = [], isLoading } = trpc.product.popular.useQuery(
    { limit: 100 },
    { initialData: serverRankingProducts?.length ? serverRankingProducts : undefined }
  );

  // 서버 데이터가 있으면 스켈레톤 표시 안 함
  const showSkeleton = isLoading && !serverRankingProducts?.length;

  // 랭킹 상품 이미지 프리페치 - 유휴 시간에 브라우저 캐시에 미리 로드
  useImagePrefetch(products);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEOHead
        title="売れ筋ランキングTOP100"
        description="koreamall24で最も人気の高い医薬品・健康商品TOP100をご紹介します。お客様に選ばれた定番商品をランキング形式でご確認ください。"
        keywords="売れ筋ランキング, 人気商品, TOP100, 日本医薬品, 健康商品"
        ogType="website"
      />
      <Header />
      <main className="flex-1">
        {/* ページヘッダー */}
        <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white py-8">
          <div className="container">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">売れ筋ランキングTOP100</h1>
                <p className="text-white/80 text-sm mt-1">お客様に最も選ばれた人気商品をランキング形式でご紹介します</p>
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
                    {products.map((product, index) => (
                      <div key={product.id}>
                        <ProductCard
                          product={product}
                          rankNumber={index < 10 ? index + 1 : undefined}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16">
                  <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">ランキングデータがありません</p>
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
