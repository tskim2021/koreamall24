import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
  XCircle,
  TrendingDown,
  DollarSign,
  Package,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Period = "7days" | "30days" | "90days" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  "7days": "7일",
  "30days": "30일",
  "90days": "90일",
  all: "전체",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: "카드결제",
  bank_transfer: "무통장입금",
  cod: "착불",
  unknown: "기타",
};

const REASON_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
  "#06b6d4", "#6366f1", "#8b5cf6", "#ec4899", "#94a3b8",
];

export default function CancellationStatsWidget() {
  const [period, setPeriod] = useState<Period>("30days");

  const { data: stats, isLoading } = trpc.admin.cancellationStats.useQuery(
    { period },
    { refetchInterval: 2 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-24 mb-4" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    );
  }

  const monthlyData = (stats?.monthlyTrend || []).map((d) => ({
    ...d,
    monthLabel: d.month ? `${d.month.slice(5)}월` : "",
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* 헤더 + 기간 선택 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-bold text-gray-800">취소 통계</h3>
        </div>
        <div className="flex gap-1">
          {(["7days", "30days", "90days", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 text-xs rounded-full font-medium transition-colors ${
                period === p
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          {
            label: "취소 주문",
            value: (stats?.totalCancelledOrders || 0).toLocaleString(),
            unit: "건",
            icon: XCircle,
            color: "text-red-600",
            border: "border-red-100",
          },
          {
            label: "취소 상품",
            value: (stats?.totalCancelledItems || 0).toLocaleString(),
            unit: "개",
            icon: Package,
            color: "text-orange-600",
            border: "border-orange-100",
          },
          {
            label: "환불 금액",
            value: formatPrice(stats?.totalRefundAmount || 0),
            unit: "합계",
            icon: DollarSign,
            color: "text-yellow-600",
            border: "border-yellow-100",
          },
          {
            label: "취소율",
            value: `${stats?.cancellationRate ?? 0}%`,
            unit: "전체 대비",
            icon: TrendingDown,
            color: "text-purple-600",
            border: "border-purple-100",
          },
        ].map((item) => (
          <div key={item.label} className={`border ${item.border} rounded-lg p-3`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 font-medium">{item.label}</span>
              <item.icon className={`w-3 h-3 ${item.color}`} />
            </div>
            <div className={`text-base font-bold ${item.color}`}>{item.value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{item.unit}</div>
          </div>
        ))}
      </div>

      {/* 월별 취소 추이 차트 */}
      {monthlyData.length > 0 && (
        <div className="border border-gray-100 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <BarChart3 className="w-3 h-3 text-red-500" />
            월별 취소 추이 (최근 6개월)
          </h4>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === "cancelledOrders" ? `${value}건` : formatPrice(value),
                  name === "cancelledOrders" ? "취소 주문" : "환불 금액",
                ]}
              />
              <Bar dataKey="cancelledOrders" fill="#ef4444" radius={[3, 3, 0, 0]} name="cancelledOrders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 취소 사유별 통계 */}
        <div className="border border-gray-100 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-orange-500" />
            취소 사유 TOP 10
          </h4>
          {!stats?.reasonStats?.length ? (
            <div className="text-center py-4 text-gray-400 text-xs">취소 데이터 없음</div>
          ) : (
            <div className="space-y-2">
              {stats.reasonStats.map((r, idx) => {
                const maxCount = stats.reasonStats[0]?.count || 1;
                const pct = Math.round((r.count / maxCount) * 100);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: REASON_COLORS[idx % REASON_COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-gray-700 truncate max-w-[120px]">{r.reason}</span>
                        <span className="text-[10px] font-semibold text-gray-600 ml-1">{r.count}건</span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: REASON_COLORS[idx % REASON_COLORS.length] }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 w-14 text-right flex-shrink-0">
                      {formatPrice(r.refundAmount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 결제 수단별 취소 통계 */}
        <div className="border border-gray-100 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-blue-500" />
            결제 수단별 취소
          </h4>
          {!stats?.paymentMethodStats?.length ? (
            <div className="text-center py-4 text-gray-400 text-xs">취소 데이터 없음</div>
          ) : (
            <div className="space-y-2">
              {stats.paymentMethodStats.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                    style={{ borderColor: REASON_COLORS[idx], color: REASON_COLORS[idx] }}
                  >
                    {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                  </Badge>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-gray-800">{p.count}건</div>
                    <div className="text-[10px] text-gray-400">{formatPrice(p.refundAmount)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
