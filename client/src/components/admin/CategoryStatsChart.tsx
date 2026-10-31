import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { TrendingUp, Package, DollarSign, ShoppingCart } from "lucide-react";
import { Chart, registerables } from 'chart.js';
import { formatPrice } from "@/../../shared/utils/formatPrice";

Chart.register(...registerables);

type Period = 'today' | '7days' | '30days' | 'all';

export default function CategoryStatsChart() {
  const [period, setPeriod] = useState<Period>('30days');
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const { data: categoryStats, isLoading } = trpc.admin.categoryStats.useQuery(
    { period },
    { refetchInterval: 2 * 60 * 1000 }
  );

  useEffect(() => {
    if (!categoryStats || !chartRef.current || categoryStats.length === 0) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    const labels = categoryStats.map(cat => cat.categoryNameJa || cat.categoryName);
    const revenueData = categoryStats.map(cat => cat.totalRevenue);
    const salesData = categoryStats.map(cat => cat.totalSales);
    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '매출 (원)',
            data: revenueData,
            backgroundColor: 'rgba(233, 30, 99, 0.6)',
            borderColor: 'rgba(233, 30, 99, 1)',
            borderWidth: 1,
            yAxisID: 'y',
          },
          {
            label: '판매량',
            data: salesData,
            backgroundColor: 'rgba(255, 107, 53, 0.6)',
            borderColor: 'rgba(255, 107, 53, 1)',
            borderWidth: 1,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { type: 'linear', display: true, position: 'left', title: { display: true, text: '매출 (원)' } },
          y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: '판매량' }, grid: { drawOnChartArea: false } },
        },
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                  label += context.datasetIndex === 0
                    ? context.parsed.y.toLocaleString() + '원'
                    : context.parsed.y.toLocaleString() + '개';
                }
                return label;
              }
            }
          }
        },
      },
    });
    return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
  }, [categoryStats]);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="h-5 bg-gray-100 rounded w-32 mb-4" />
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
        </div>
      </div>
    );
  }

  if (!categoryStats || categoryStats.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-3">카테고리별 판매 통계</h3>
        <div className="text-center py-8 text-gray-400 text-xs">판매 데이터가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800">카테고리별 판매 통계</h3>
        <div className="flex gap-1">
          {(['today', '7days', '30days', 'all'] as Period[]).map((p, i) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setPeriod(p)}
            >
              {['오늘', '7일', '30일', '전체'][i]}
            </Button>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <div className="h-52 mb-4">
        <canvas ref={chartRef}></canvas>
      </div>

      {/* 카테고리 상세 */}
      <div className="space-y-2">
        {categoryStats.map((cat) => (
          <div key={cat.categoryId} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-800">
                {cat.categoryNameJa || cat.categoryName}
              </h4>
              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-0.5">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span className="font-semibold">{formatPrice(cat.totalRevenue)}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Package className="h-3 w-3 text-blue-600" />
                  <span className="font-semibold">{cat.totalSales}개</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <ShoppingCart className="h-3 w-3 text-purple-600" />
                  <span className="font-semibold">{cat.orderCount}건</span>
                </div>
              </div>
            </div>

            {cat.topProducts.length > 0 && (
              <div className="bg-gray-50 rounded p-2">
                <h5 className="text-[10px] font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  인기 상품 TOP {cat.topProducts.length}
                </h5>
                <div className="space-y-1">
                  {cat.topProducts.map((product, index) => (
                    <div key={product.productId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-pink-600">{index + 1}.</span>
                        <span className="text-gray-700 truncate max-w-[160px]">{product.productNameJa || product.productName}</span>
                      </div>
                      <div className="flex gap-2 text-[10px] text-gray-500">
                        <span>{formatPrice(product.revenue)}</span>
                        <span>{product.sales}개</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
