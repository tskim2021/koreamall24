import { useState } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Card } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { toast } from"sonner";
import { formatPrice } from"@/../../shared/utils/formatPrice";
import {
 TrendingUp,
 DollarSign,
 ShoppingCart,
 Users,
 Package,
 ArrowUp,
 ArrowDown,
 Download,
} from"lucide-react";

export default function Analytics() {
 const [dateRange, setDateRange] = useState<"7d"|"30d"|"90d">("30d");
 const utils = trpc.useUtils();

 // Fetch analytics data
 const { data: analytics, isLoading } = trpc.analytics.getDashboard.useQuery({
 dateRange,
 });

 // CSV export handler
 const handleExportCSV = async (dataType:"revenue"|"topProducts"|"orderStatus") => {
 try {
 const result = await utils.analytics.exportCSV.fetch({ dateRange, dataType });
 
 // Create blob and download
 const blob = new Blob([result.csvData], { type:"text/csv;charset=utf-8;"});
 const link = document.createElement("a");
 const url = URL.createObjectURL(blob);
 
 const fileNames = {
 revenue:"매출 데이터",
 topProducts:"베스트셀러상품",
 orderStatus:"주문상태",
 };
 
 link.href = url;
 link.download = `${fileNames[dataType]}_${dateRange}.csv`;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 URL.revokeObjectURL(url);
 
 toast.success("CSV 파일을 다운로드했습니다");
 } catch (error) {
 toast.error("CSV 내보내기에 실패했습니다");
 }
 };

 if (isLoading) {
 return (
 <div className="p-6">
 <div className="flex justify-center items-center py-20">
 <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
 </div>
 </div>
 );
 }

 if (!analytics) {
 return (
 <div className="p-6">
 <div className="text-center py-20 text-gray-500">
 데이터를 불러올 수 없습니다
 </div>
 </div>
 );
 }

 const {
 totalRevenue,
 totalOrders,
 totalCustomers,
 averageOrderValue,
 topProducts,
 revenueByDay,
 ordersByStatus,
 repeatCustomerRate,
 } = analytics;

 return (
 <AdminLayout>
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h1 className="text-xl font-bold text-gray-800">판매 분석 대시보드</h1>
 <div className="flex gap-4">
 {/* CSV Export Dropdown */}
 <div className="relative">
 <select
 onChange={(e) => {
 if (e.target.value) {
 handleExportCSV(e.target.value as"revenue"|"topProducts"|"orderStatus");
 e.target.value ="";
 }
 }}
 className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 cursor-pointer appearance-none pr-10"
 >
 <option value="">데이터 내보내기 (CSV)</option>
 <option value="revenue">매출 데이터</option>
 <option value="topProducts">베스트셀러상품</option>
 <option value="orderStatus">주문상태</option>
 </select>
 <Download className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white pointer-events-none"/>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => setDateRange("7d")}
 className={`px-4 py-2 rounded-md text-sm font-medium ${
 dateRange ==="7d"
 ?"bg-pink-600 text-white"
 :"bg-gray-100 text-gray-700 hover:bg-gray-200"
 }`}
 >
 7일간
 </button>
 <button
 onClick={() => setDateRange("30d")}
 className={`px-4 py-2 rounded-md text-sm font-medium ${
 dateRange ==="30d"
 ?"bg-pink-600 text-white"
 :"bg-gray-100 text-gray-700 hover:bg-gray-200"
 }`}
 >
 30일간
 </button>
 <button
 onClick={() => setDateRange("90d")}
 className={`px-4 py-2 rounded-md text-sm font-medium ${
 dateRange ==="90d"
 ?"bg-pink-600 text-white"
 :"bg-gray-100 text-gray-700 hover:bg-gray-200"
 }`}
 >
 90일간
 </button>
 </div>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-4 gap-4">
 <Card className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs text-gray-600">총 매출</p>
 <p className="text-lg font-bold text-gray-800 mt-1">
 {formatPrice(totalRevenue)}
 </p>
 </div>
 <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
 <DollarSign className="w-6 h-6 text-green-600"/>
 </div>
 </div>
 </Card>

 <Card className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs text-gray-600">주문 수</p>
 <p className="text-lg font-bold text-gray-800 mt-1">
 {totalOrders.toLocaleString()}
 </p>
 </div>
 <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
 <ShoppingCart className="w-6 h-6 text-blue-600"/>
 </div>
 </div>
 </Card>

 <Card className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs text-gray-600">고객 수</p>
 <p className="text-lg font-bold text-gray-800 mt-1">
 {totalCustomers.toLocaleString()}
 </p>
 </div>
 <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
 <Users className="w-6 h-6 text-purple-600"/>
 </div>
 </div>
 </Card>

 <Card className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs text-gray-600">평균 주문 금액</p>
 <p className="text-lg font-bold text-gray-800 mt-1">
 {formatPrice(averageOrderValue)}
 </p>
 </div>
 <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
 <TrendingUp className="w-6 h-6 text-orange-600"/>
 </div>
 </div>
 </Card>
 </div>

 {/* Revenue Chart */}
 <Card className="p-6">
 <h2 className="text-lg font-bold text-gray-800 mb-4">매출 추이</h2>
 <div className="h-64 flex items-end gap-2">
 {revenueByDay.map((day, index) => {
 const maxRevenue = Math.max(...revenueByDay.map((d) => d.revenue));
 const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
 return (
 <div key={index} className="flex-1 flex flex-col items-center gap-2">
 <div
 className="w-full bg-pink-500 rounded-t hover:bg-pink-600 transition-colors relative group"
 style={{ height: `${height}%`, minHeight: day.revenue > 0 ?"4px":"0"}}
 >
 <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
 {formatPrice(day.revenue)}
 </div>
 </div>
 <span className="text-xs text-gray-500">{day.date}</span>
 </div>
 );
 })}
 </div>
 </Card>

 <div className="grid grid-cols-2 gap-6">
 {/* Top Products */}
 <Card className="p-4">
 <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
 <Package className="w-5 h-5 text-pink-600"/>
 인기 상품 TOP 10
 </h2>
 <div className="space-y-3">
 {topProducts.map((product, index) => (
 <div key={product.productId} className="flex items-center gap-3">
 <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
 <span className="text-sm font-bold text-pink-600">{index + 1}</span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-gray-800 truncate">
 {product.productName}
 </p>
 <p className="text-xs text-gray-500">
 {product.totalQuantity}개 판매 · {formatPrice(product.totalRevenue)}
 </p>
 </div>
 </div>
 ))}
 </div>
 </Card>

 {/* Order Status Distribution */}
 <Card className="p-4">
 <h2 className="text-lg font-bold text-gray-800 mb-4">주문상태</h2>
 <div className="space-y-4">
 {ordersByStatus.map((status) => {
 const statusLabels: Record<string, string> = {
 pending:"보류 중",
 processing:"처리 중",
 shipped:"발송 완료",
 delivered:"배달 완료",
 cancelled:"취소",
 };
 const statusColors: Record<string, string> = {
 pending:"bg-yellow-500",
 processing:"bg-blue-500",
 shipped:"bg-purple-500",
 delivered:"bg-green-500",
 cancelled:"bg-red-500",
 };
 const totalOrders = ordersByStatus.reduce((sum, s) => sum + s.count, 0);
 const percentage = totalOrders > 0 ? (status.count / totalOrders) * 100 : 0;

 return (
 <div key={status.status}>
 <div className="flex justify-between text-sm mb-1">
 <span className="text-gray-700">{statusLabels[status.status] || status.status}</span>
 <span className="font-medium text-gray-800">{status.count}건</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div
 className={`${statusColors[status.status] ||"bg-gray-500"} h-2 rounded-full`}
 style={{ width: `${percentage}%` }}
 />
 </div>
 </div>
 );
 })}
 </div>
 </Card>
 </div>

 {/* Repeat Customer Rate */}
 <Card className="p-6">
 <h2 className="text-lg font-bold text-gray-800 mb-4">재구매 고객률</h2>
 <div className="flex items-center gap-4">
 <div className="flex-1">
 <div className="flex items-baseline gap-2">
 <span className="text-4xl font-bold text-pink-600">
 {repeatCustomerRate.toFixed(1)}%
 </span>
 <span className="text-sm text-gray-500">의 고객이 재구매</span>
 </div>
 <p className="text-sm text-gray-600 mt-2">
 기간 내 2회 이상 구매한 고객의 비율
 </p>
 </div>
 <div className="w-32 h-32 relative">
 <svg className="w-full h-full transform -rotate-90">
 <circle
 cx="64"
 cy="64"
 r="56"
 fill="none"
 stroke="#f3f4f6"
 strokeWidth="12"
 />
 <circle
 cx="64"
 cy="64"
 r="56"
 fill="none"
 stroke="#ec4899"
 strokeWidth="12"
 strokeDasharray={`${(repeatCustomerRate / 100) * 352} 352`}
 strokeLinecap="round"
 />
 </svg>
 <div className="absolute inset-0 flex items-center justify-center">
 <span className="text-2xl font-bold text-gray-800">
 {repeatCustomerRate.toFixed(0)}%
 </span>
 </div>
 </div>
 </div>
 </Card>
 </div>
 </AdminLayout>
 );
}
