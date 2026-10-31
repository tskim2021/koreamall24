import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import CategoryStatsChart from "@/components/admin/CategoryStatsChart";
import CancellationStatsWidget from "@/components/admin/CancellationStatsWidget";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  MessageSquare,
  HelpCircle,
  AlertCircle,
} from "lucide-react";

export default function AdminDashboard() {
  const { user, loading } = useAuth();

  const { data: isAdmin, isLoading: checkingAdmin } = trpc.admin.isAdmin.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: stats, isLoading: loadingStats } = trpc.admin.stats.useQuery(undefined, {
    enabled: isAdmin === true,
  });

  const { data: dailyRevenueData, isLoading: loadingDailyRevenue } = trpc.admin.dailyRevenueChart.useQuery(undefined, {
    enabled: isAdmin === true,
  });

  const { data: topProductsData, isLoading: loadingTopProducts } = trpc.admin.topProducts.useQuery(undefined, {
    enabled: isAdmin === true,
  });

  const { data: recentOrdersData, isLoading: loadingRecentOrders } = trpc.admin.recentOrders.useQuery(undefined, {
    enabled: isAdmin === true,
  });

  const { data: badgeCounts, isLoading: loadingBadge } = trpc.admin.badgeCounts.useQuery(undefined, {
    enabled: isAdmin === true,
    refetchInterval: 2 * 60 * 1000,
  });

  if (loading || checkingAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!user || !isAdmin) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h1 className="text-xl font-bold text-gray-800 mb-2">접근 권한이 없습니다</h1>
          <Link href="/" className="text-pink-600 hover:underline text-sm">홈페이지로 돌아가기</Link>
        </div>
      </AdminLayout>
    );
  }

  const totalPending = (badgeCounts?.pendingOrders || 0) +
    (badgeCounts?.unansweredInquiries || 0) +
    (badgeCounts?.unansweredProductQuestions || 0);

  return (
    <AdminLayout>
      <div className="space-y-5">

        {/* 페이지 타이틀 */}
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-lg font-bold text-gray-800">대시보드</h1>
          <p className="text-xs text-gray-500 mt-0.5">쇼핑몰 현황을 한눈에 확인하세요</p>
        </div>

        {/* 핵심 지표 4개 */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "오늘의 주문", value: loadingStats ? "..." : (stats?.todayOrders || 0), icon: ShoppingCart, color: "text-pink-600" },
            { label: "오늘의 매출", value: loadingStats ? "..." : formatPrice(stats?.todayRevenue || 0), icon: DollarSign, color: "text-green-600" },
            { label: "이번 달 매출", value: loadingStats ? "..." : formatPrice(stats?.monthlyRevenue || 0), icon: TrendingUp, color: "text-blue-600" },
            { label: "신규 고객 (오늘)", value: loadingStats ? "..." : (stats?.todayNewCustomers || 0), icon: Users, color: "text-purple-600" },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{item.label}</p>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* 누적 통계 */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "총 주문 수", value: loadingStats ? "..." : (stats?.totalOrders || 0), icon: ShoppingCart },
            { label: "총 누적 매출", value: loadingStats ? "..." : formatPrice(stats?.totalRevenue || 0), icon: DollarSign },
            { label: "누적 고객 수", value: loadingStats ? "..." : `${stats?.totalCustomers || 0}명`, icon: Users },
            { label: "등록 상품 수", value: loadingStats ? "..." : `${stats?.totalProducts || 0}개`, icon: Package },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <item.icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-base font-bold text-gray-800">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 미처리 항목 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-gray-800">미처리 항목</h3>
            </div>
            {totalPending > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalPending}</span>
            )}
          </div>
          {loadingBadge ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
            </div>
          ) : totalPending === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">처리가 필요한 항목이 없습니다</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[
                { title: "미처리 주문", count: badgeCounts?.pendingOrders || 0, icon: ShoppingCart, href: "/admin/orders", color: "text-red-600" },
                { title: "미답변 문의", count: badgeCounts?.unansweredInquiries || 0, icon: MessageSquare, href: "/admin/inquiries", color: "text-blue-600" },
                { title: "미답변 상품 Q&A", count: badgeCounts?.unansweredProductQuestions || 0, icon: HelpCircle, href: "/admin/product-questions", color: "text-purple-600" },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-xs text-gray-700">{item.title}</span>
                    </div>
                    <span className={`text-sm font-bold ${item.color}`}>{item.count}건</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 매출 차트 + 상위 상품 (2열) */}
        <div className="grid grid-cols-2 gap-4">
          {/* 지난 7일 매출 추이 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">지난 7일 매출 추이</h3>
            {loadingDailyRevenue ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
              </div>
            ) : (
              <div className="flex gap-2 h-40 items-end">
                {dailyRevenueData && dailyRevenueData.length > 0 ? (
                  dailyRevenueData.map((item, idx) => {
                    const maxRevenue = Math.max(...dailyRevenueData.map(d => d.revenue));
                    const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <div className="w-full bg-pink-300 rounded-t" style={{ height: `${Math.max(height, 4)}%` }}></div>
                        <div className="text-[10px] text-gray-500 text-center">
                          {new Date(item.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                        </div>
                        <div className="text-[10px] font-bold text-pink-600">
                          {Math.round(item.revenue / 1000).toLocaleString()}k
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-400 text-xs w-full flex items-center justify-center">데이터 없음</div>
                )}
              </div>
            )}
          </div>

          {/* 상위 상품 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">상위 상품 (30일)</h3>
            {loadingTopProducts ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 text-xs font-semibold text-gray-500">순위</th>
                    <th className="text-left py-1.5 text-xs font-semibold text-gray-500">상품명</th>
                    <th className="text-right py-1.5 text-xs font-semibold text-gray-500">판매량</th>
                    <th className="text-right py-1.5 text-xs font-semibold text-gray-500">매출</th>
                  </tr>
                </thead>
                <tbody>
                  {topProductsData && topProductsData.length > 0 ? (
                    topProductsData.slice(0, 7).map((product, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 text-xs text-gray-500">{idx + 1}</td>
                        <td className="py-2 text-xs text-gray-800 max-w-[120px] truncate">{product.productName}</td>
                        <td className="py-2 text-xs text-right text-gray-600">{product.totalQuantity}</td>
                        <td className="py-2 text-xs text-right font-semibold text-pink-600">{formatPrice(Number(product.totalRevenue))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-gray-400">데이터 없음</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 최근 주문 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">최근 주문</h3>
          {loadingRecentOrders ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 text-xs font-semibold text-gray-500">주문번호</th>
                  <th className="text-left py-1.5 text-xs font-semibold text-gray-500">고객</th>
                  <th className="text-left py-1.5 text-xs font-semibold text-gray-500">상태</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-gray-500">금액</th>
                  <th className="text-left py-1.5 text-xs font-semibold text-gray-500">날짜</th>
                </tr>
              </thead>
              <tbody>
                {recentOrdersData && recentOrdersData.length > 0 ? (
                  recentOrdersData.map((order, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 text-xs text-gray-500">#{order.id}</td>
                      <td className="py-2 text-xs text-gray-800 max-w-[120px] truncate">{(order as any).customerEmail || order.customerName}</td>
                      <td className="py-2 text-xs">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-right font-semibold text-pink-600">{formatPrice(Number(order.totalAmount))}</td>
                      <td className="py-2 text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-gray-400">데이터 없음</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* 카테고리 통계 + 취소 통계 (2열) */}
        <div className="grid grid-cols-2 gap-4">
          <CategoryStatsChart />
          <CancellationStatsWidget />
        </div>

      </div>
    </AdminLayout>
  );
}
