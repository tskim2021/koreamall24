import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  BarChart3,
  Download,
  RefreshCw,
} from "lucide-react";

type Period = "daily" | "weekly" | "monthly";
type DateRange = "7d" | "30d" | "90d";

export default function SalesStats() {
  const { user } = useAuth();
  const { data: isAdmin } = trpc.admin.isAdmin.useQuery(undefined, { enabled: !!user });
  const [period, setPeriod] = useState<Period>("daily");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const utils = trpc.useUtils();

  const { data: orderStats, isLoading: orderStatsLoading } = trpc.admin.orderStatistics.useQuery(
    { period },
    { enabled: isAdmin === true }
  );

  const { data: analytics, isLoading: analyticsLoading } = trpc.analytics.getDashboard.useQuery(
    { dateRange },
    { enabled: isAdmin === true }
  );

  const handleExportCSV = async (dataType: "revenue" | "topProducts" | "orderStatus") => {
    try {
      const result = await utils.analytics.exportCSV.fetch({ dateRange, dataType });
      const blob = new Blob([result.csvData], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const fileNames = { revenue: "매출데이터", topProducts: "베스트셀러상품", orderStatus: "주문상태" };
      link.href = url;
      link.download = `${fileNames[dataType]}_${dateRange}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV 파일을 다운로드했습니다");
    } catch {
      toast.error("CSV 내보내기에 실패했습니다");
    }
  };

  const isLoading = orderStatsLoading || analyticsLoading;

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
          <h1 className="text-xl font-bold text-gray-800 mb-2">접근 권한이 없습니다</h1>
        </div>
      </AdminLayout>
    );
  }

  const totalOrders = orderStats?.statusDistribution.reduce((sum, s) => sum + Number(s.count), 0) ?? 0;
  const totalRevenue = orderStats?.chartData.reduce((sum, d) => sum + Number(d.revenue), 0) ?? 0;
  const avgOrderAmount = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const statusLabels: Record<string, { label: string; icon: typeof Clock; color: string }> = {
    pending:    { label: "주문 접수", icon: Clock,        color: "text-yellow-600" },
    confirmed:  { label: "주문 확인", icon: CheckCircle,  color: "text-blue-600"   },
    processing: { label: "처리 중",   icon: Package,      color: "text-purple-600" },
    shipped:    { label: "발송 완료", icon: Truck,        color: "text-indigo-600" },
    delivered:  { label: "배달 완료", icon: CheckCircle,  color: "text-green-600"  },
    cancelled:  { label: "취소",      icon: XCircle,      color: "text-red-600"    },
  };

  const statusBarColors: Record<string, string> = {
    pending: "bg-yellow-400", confirmed: "bg-blue-400", processing: "bg-purple-400",
    shipped: "bg-indigo-400", delivered: "bg-green-400", cancelled: "bg-red-400",
  };

  const periodLabels: Record<Period, string> = { daily: "일별", weekly: "주별", monthly: "월별" };
  const dateRangeLabels: Record<DateRange, string> = { "7d": "7일", "30d": "30일", "90d": "90일" };

  return (
    <AdminLayout>
      <div className="space-y-5">

        {/* 헤더 */}
        <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">매출·주문 통계</h1>
            <p className="text-xs text-gray-500 mt-0.5">매출 현황과 주문 상태를 한눈에 확인하세요</p>
          </div>
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleExportCSV(e.target.value as "revenue" | "topProducts" | "orderStatus");
                  e.target.value = "";
                }
              }}
              className="pl-3 pr-9 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:border-gray-300 cursor-pointer appearance-none"
            >
              <option value="">CSV 내보내기</option>
              <option value="revenue">매출 데이터</option>
              <option value="topProducts">베스트셀러 상품</option>
              <option value="orderStatus">주문 상태</option>
            </select>
            <Download className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* KPI 카드 4개 */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "총 매출", value: analytics ? formatPrice(analytics.totalRevenue) : formatPrice(totalRevenue), icon: DollarSign, color: "text-pink-600" },
            { label: "총 주문 건수", value: `${analytics ? analytics.totalOrders.toLocaleString() : totalOrders}건`, icon: ShoppingCart, color: "text-blue-600" },
            { label: "총 고객 수", value: `${analytics ? analytics.totalCustomers.toLocaleString() : "-"}명`, icon: Users, color: "text-purple-600" },
            { label: "평균 주문 금액", value: analytics ? formatPrice(analytics.averageOrderValue) : formatPrice(avgOrderAmount), icon: TrendingUp, color: "text-green-600" },
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

        {/* 매출 추이 차트 */}
        {analytics && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-pink-500" />
                매출 추이
              </h3>
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
            <div className="h-44 flex items-end gap-1">
              {analytics.revenueByDay.map((day, index) => {
                const maxRevenue = Math.max(...analytics.revenueByDay.map((d) => d.revenue));
                const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-pink-300 hover:bg-pink-400 rounded-t transition-colors relative group cursor-pointer"
                      style={{ height: `${height}%`, minHeight: day.revenue > 0 ? "4px" : "0" }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                        {formatPrice(day.revenue)}
                      </div>
                    </div>
                    {analytics.revenueByDay.length <= 14 && (
                      <span className="text-[10px] text-gray-400">{day.date.slice(-5)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 주문 상태 현황 + 재구매율 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 상태별 주문 현황 */}
          {orderStats && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  상태별 주문 현황
                </h3>
                <div className="flex gap-1">
                  {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        period === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {periodLabels[p]}
                    </button>
                  ))}
                </div>
              </div>
              {/* 아이콘 그리드 */}
              <div className="grid grid-cols-6 gap-2 mb-3">
                {orderStats.statusDistribution.map((item) => {
                  const info = statusLabels[item.status] || { label: item.status, icon: Package, color: "text-gray-600" };
                  const Icon = info.icon;
                  const count = Number(item.count);
                  const percentage = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                  return (
                    <div key={item.status} className="text-center">
                      <div className="border border-gray-100 rounded-lg p-2 mb-1">
                        <Icon className={`h-3.5 w-3.5 mx-auto ${info.color}`} />
                        <p className="text-sm font-bold mt-0.5 text-gray-800">{count}</p>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight">{info.label}</p>
                      <p className="text-[10px] font-medium text-gray-600">{percentage}%</p>
                    </div>
                  );
                })}
              </div>
              {/* 프로그레스 바 */}
              <div className="space-y-1.5">
                {orderStats.statusDistribution.map((item) => {
                  const info = statusLabels[item.status] || { label: item.status };
                  const count = Number(item.count);
                  const percentage = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                  const barColor = statusBarColors[item.status] || "bg-gray-400";
                  return (
                    <div key={item.status} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-14 text-right shrink-0">{info.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`${barColor} h-full rounded-full flex items-center justify-end pr-1 transition-all duration-500`}
                          style={{ width: `${Math.max(percentage, 2)}%` }}
                        >
                          {percentage >= 12 && (
                            <span className="text-[9px] text-white font-medium">{count}건</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-gray-600 w-7 shrink-0">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 재구매율 + 평균 배송 소요일 */}
          <div className="space-y-4">
            {analytics && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
                  <RefreshCw className="h-4 w-4 text-pink-500" />
                  재구매율
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-pink-600">{analytics.repeatCustomerRate.toFixed(1)}%</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">기간 내 2회 이상 구매 고객 비율</p>
                    <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-pink-500 h-full rounded-full transition-all duration-700"
                        style={{ width: `${analytics.repeatCustomerRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 h-16 relative shrink-0">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#f3f4f6" strokeWidth="7" />
                      <circle
                        cx="32" cy="32" r="26" fill="none" stroke="#ec4899" strokeWidth="7"
                        strokeDasharray={`${(analytics.repeatCustomerRate / 100) * 163} 163`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-800">{analytics.repeatCustomerRate.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {orderStats && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">평균 배송 소요일</p>
                  <p className="text-2xl font-bold text-gray-800 mt-0.5">
                    {Number(orderStats.avgDeliveryDays).toFixed(1)}
                    <span className="text-sm font-normal text-gray-500 ml-1">일</span>
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-full flex items-center justify-center">
                  <Truck className="h-5 w-5 text-orange-500" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 운송사별 현황 */}
        {orderStats?.carrierStats && orderStats.carrierStats.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
              <Truck className="h-4 w-4 text-indigo-500" />
              운송사별 현황
            </h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-1.5 text-left text-xs font-semibold text-gray-500">운송사</th>
                  <th className="py-1.5 text-right text-xs font-semibold text-gray-500">총 배송</th>
                  <th className="py-1.5 text-right text-xs font-semibold text-gray-500">배달 완료</th>
                  <th className="py-1.5 text-right text-xs font-semibold text-gray-500">성공률</th>
                </tr>
              </thead>
              <tbody>
                {orderStats.carrierStats.map((carrier) => {
                  const total = Number(carrier.count);
                  const delivered = Number(carrier.delivered);
                  const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;
                  return (
                    <tr key={carrier.carrier} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 text-xs font-medium text-gray-800">{carrier.carrier}</td>
                      <td className="py-2 text-xs text-right text-gray-600">{total}건</td>
                      <td className="py-2 text-xs text-right text-green-600 font-medium">{delivered}건</td>
                      <td className="py-2 text-xs text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          rate >= 90 ? "bg-green-50 text-green-700 border border-green-100" :
                          rate >= 70 ? "bg-yellow-50 text-yellow-700 border border-yellow-100" :
                          "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 기간별 매출 데이터 테이블 */}
        {orderStats?.chartData && orderStats.chartData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
              <BarChart3 className="h-4 w-4 text-green-500" />
              기간별 매출 데이터
            </h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-1.5 text-left text-xs font-semibold text-gray-500">기간</th>
                  <th className="py-1.5 text-right text-xs font-semibold text-gray-500">주문 건수</th>
                  <th className="py-1.5 text-right text-xs font-semibold text-gray-500">매출</th>
                </tr>
              </thead>
              <tbody>
                {orderStats.chartData.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 text-xs text-gray-700">{row.period}</td>
                    <td className="py-2 text-xs text-right text-gray-600">{Number(row.count)}건</td>
                    <td className="py-2 text-xs text-right font-semibold text-gray-800">{formatPrice(Number(row.revenue))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
