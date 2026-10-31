import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import HomeSidebar from "@/components/HomeSidebar";
import { Tag } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useImagePrefetch } from "@/hooks/useImagePrefetch";

// 서버에서 주입된 초기 데이터 활용
const serverData = (window as any).__INITIAL_DATA__;
const serverTimeSale = serverData?.timeSaleProducts;
const serverMonthlySale = serverData?.monthlySaleProducts;
const hasServerData = serverTimeSale?.length || serverMonthlySale?.length;

export default function SalePage() {
  const { data: timeSaleProducts = [], isLoading: loadingTimeSale } = trpc.product.timeSale.useQuery(
    { limit: 50 },
    { initialData: serverTimeSale?.length ? serverTimeSale : undefined }
  );
  const { data: monthlySaleProducts = [], isLoading: loadingMonthlySale } = trpc.product.monthlySale.useQuery(
    { limit: 50 },
    { initialData: serverMonthlySale?.length ? serverMonthlySale : undefined }
  );

  const isLoading = loadingTimeSale || loadingMonthlySale;
  // 서버 데이터가 있으면 스켈레톤 표시 안 함
  const showSkeleton = isLoading && !hasServerData;

  // 세일 상품 이미지 프리페치
  useImagePrefetch([...timeSaleProducts, ...monthlySaleProducts]);

  // 중복 제거 후 합치기
  const allProducts = [
    ...timeSaleProducts,
    ...monthlySaleProducts.filter(mp => !timeSaleProducts.find(tp => tp.id === mp.id))
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEOHead
        title="セール商品"
        description="koreamall24のセール商品をご紹介します。タイムセール・月間セールなどお得な商品が盛りだくさん。"
        keywords="セール商品, タイムセール, 月間セール, 割引, 日本医薬品"
        ogType="website"
      />
      <Header />
      <main className="flex-1">
        {/* ページヘッダー */}
        <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white py-8">
          <div className="container">
            <div className="flex items-center gap-3">
              <Tag className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">セール商品</h1>
                <p className="text-white/80 text-sm mt-1">期間限定のお得なセール商品をご確認ください</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-6">
          <div className="flex gap-6 items-start">
            <HomeSidebar compact />

            <div className="flex-1 min-w-0">
              {/* タイムセール */}
              {timeSaleProducts.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">タイムセール</span>
                    <h2 className="text-lg font-bold">期間限定特価</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {timeSaleProducts.map((product) => (
                      <div key={product.id} className="relative">
                        <div className="absolute top-2 right-2 z-10 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">SALE</div>
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 月間セール */}
              {monthlySaleProducts.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">月間セール</span>
                    <h2 className="text-lg font-bold">今月のお得商品</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {monthlySaleProducts.map((product) => (
                      <div key={product.id} className="relative">
                        <div className="absolute top-2 right-2 z-10 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">月間</div>
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showSkeleton && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 animate-pulse">
                      <div className="aspect-square bg-gray-200 rounded mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && allProducts.length === 0 && (
                <div className="text-center py-16">
                  <Tag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">現在セール中の商品はありません</p>
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
