import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import {
  Package,
  TrendingUp,
  Eye,
  MousePointer,
  Percent,
  Star,
  BarChart3,
} from "lucide-react";

type DateRange = "7d" | "30d" | "90d";

export default function ProductAnalysis() {
  const { user } = useAuth();
  const { data: isAdmin } = trpc.admin.isAdmin.useQuery(undefined, { enabled: !!user });
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const { data: analytics, isLoading: analyticsLoading } = trpc.analytics.getDashboard.useQuery(
    { dateRange },
    { enabled: isAdmin === true }
  );

  const { data: recStats, isLoading: recStatsLoading } = trpc.recommendations.getStats.useQuery(
    undefined,
    { enabled: isAdmin === true }
  );

  const { data: tagBasedProducts } = trpc.recommendations.getTopProducts.useQuery(
    { recommendationType: "tag_based", limit: 10 },
    { enabled: isAdmin === true }
  );
  const { data: collaborativeProducts } = trpc.recommendations.getTopProducts.useQuery(
    { recommendationType: "collaborative", limit: 10 },
    { enabled: isAdmin === true }
  );
  const { data: categoryProducts } = trpc.recommendations.getTopProducts.useQuery(
    { recommendationType: "category_based", limit: 10 },
    { enabled: isAdmin === true }
  );
  const { data: afterReviewProducts } = trpc.recommendations.getTopProducts.useQuery(
    { recommendationType: "after_review", limit: 10 },
    { enabled: isAdmin === true }
  );

  const isLoading = analyticsLoading || recStatsLoading;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h1 className="text-xl font-bold text-gray-800">접근 권한이 없습니다</h1>
        </div>
      </AdminLayout>
    );
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "tag_based": return "태그 기반";
      case "collaborative": return "협업 필터링";
      case "category_based": return "카테고리 기반";
      case "after_review": return "리뷰 후 추천";
      default: return type;
    }
  };

  const getTypeDot = (type: string) => {
    switch (type) {
      case "tag_based": return "bg-blue-500";
      case "collaborative": return "bg-green-500";
      case "category_based": return "bg-purple-500";
      default: return "bg-gray-400";
    }
  };

  const renderProductList = (products: typeof tagBasedProducts | undefined) => {
    if (!products || products.length === 0) {
      return (
        <div className="text-center py-10 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-xs">데이터가 없습니다</p>
        </div>
      );
    }
    return (
      <div className="space-y-1.5">
        {products.map((item, index) => (
          <div
            key={item.product.id}
            className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-50 text-pink-600 font-bold text-xs shrink-0">
                {index + 1}
              </div>
              {item.product.imageUrl ? (
                <img
                  src={item.product.imageUrl}
                  alt={item.product.nameJa}
                  className="w-8 h-8 object-contain rounded border border-gray-100"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                  <Package className="w-4 h-4 text-gray-400" />
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-800 line-clamp-1">{item.product.nameJa}</p>
                <p className="text-[10px] text-gray-400">{formatPrice(item.product.price)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs shrink-0">
              <div className="text-center hidden sm:block">
                <p className="text-[10px] text-gray-400">노출</p>
                <p className="text-xs font-bold text-gray-700">{item.impressions.toLocaleString()}</p>
              </div>
              <div className="text-center hidden sm:block">
                <p className="text-[10px] text-gray-400">클릭</p>
                <p className="text-xs font-bold text-gray-700">{item.clicks.toLocaleString()}</p>
              </div>
              <Badge
                variant={item.ctr > 5 ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                CTR {item.ctr.toFixed(1)}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const dateRangeLabels: Record<DateRange, string> = { "7d": "7일", "30d": "30일", "90d": "90일" };

  return (
    <AdminLayout>
      <div className="space-y-5">

        {/* 헤더 */}
        <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">상품·추천 분석</h1>
            <p className="text-xs text-gray-500 mt-0.5">베스트셀러 상품과 추천 엔진 성과를 분석하세요</p>
          </div>
          <div className="flex gap-1">
            {(["7d", "30d", "90d"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                  dateRange === r ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {dateRangeLabels[r]}
              </button>
            ))}
          </div>
        </div>

        {/* 추천 엔진 KPI */}
        {recStats && recStats.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-pink-500" />
              추천 엔진 성과 요약
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {recStats.map((stat) => (
                <div key={stat.recommendationType} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-700">{getTypeLabel(stat.recommendationType)}</span>
                    <div className={`w-2 h-2 rounded-full ${getTypeDot(stat.recommendationType)}`} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Eye className="w-3 h-3" />
                        <span>노출</span>
                      </div>
                      <span className="text-sm font-bold text-gray-800">{stat.impressions.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <MousePointer className="w-3 h-3" />
                        <span>클릭</span>
                      </div>
                      <span className="text-sm font-bold text-gray-800">{stat.clicks.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Percent className="w-3 h-3" />
                        <span>CTR</span>
                      </div>
                      <Badge
                        variant={stat.ctr > 5 ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {stat.ctr.toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 베스트셀러 + 추천 타입별 상위 상품 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 베스트셀러 TOP 10 */}
          {analytics && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-500" />
                  베스트셀러 TOP 10
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">{dateRangeLabels[dateRange]} 기준 판매량 상위 상품</p>
              </div>
              <div className="space-y-2">
                {analytics.topProducts.map((product, index) => (
                  <div key={product.productId} className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      index === 0 ? "bg-amber-100 text-amber-600" :
                      index === 1 ? "bg-gray-100 text-gray-600" :
                      index === 2 ? "bg-orange-100 text-orange-600" :
                      "bg-pink-50 text-pink-500"
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{product.productName}</p>
                      <p className="text-[10px] text-gray-400">
                        {product.totalQuantity}개 · {formatPrice(product.totalRevenue)}
                      </p>
                    </div>
                    <div className="w-14 bg-gray-100 rounded-full h-1.5 overflow-hidden shrink-0">
                      <div
                        className="bg-pink-400 h-full rounded-full"
                        style={{
                          width: `${Math.min((product.totalQuantity / (analytics.topProducts[0]?.totalQuantity || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 추천 타입별 상위 상품 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                추천 타입별 상위 상품
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">추천 엔진 타입별 클릭 상위 상품</p>
            </div>
            <Tabs defaultValue="tag_based">
              <TabsList className="w-full mb-3 h-7">
                <TabsTrigger value="tag_based" className="flex-1 text-[10px]">태그 기반</TabsTrigger>
                <TabsTrigger value="collaborative" className="flex-1 text-[10px]">협업 필터링</TabsTrigger>
                <TabsTrigger value="category_based" className="flex-1 text-[10px]">카테고리</TabsTrigger>
                <TabsTrigger value="after_review" className="flex-1 text-[10px]">리뷰 후</TabsTrigger>
              </TabsList>
              <TabsContent value="tag_based">
                {renderProductList(tagBasedProducts)}
              </TabsContent>
              <TabsContent value="collaborative">
                {renderProductList(collaborativeProducts)}
              </TabsContent>
              <TabsContent value="category_based">
                {renderProductList(categoryProducts)}
              </TabsContent>
              <TabsContent value="after_review">
                <div className="mb-2 p-2.5 bg-pink-50 rounded-lg border border-pink-100">
                  <p className="text-[10px] text-pink-700 font-medium">리뷰 제출 직후 표시되는 "이런 상품은 어때세요?" 섹션에서 클릭된 상품입니다.</p>
                  <p className="text-[10px] text-pink-500 mt-0.5">높은 CTR = 리뷰 후 구매 전환율이 높은 상품</p>
                </div>
                {renderProductList(afterReviewProducts)}
              </TabsContent>
            </Tabs>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
