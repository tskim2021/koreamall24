import { useAuth } from"@/_core/hooks/useAuth";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Link } from"wouter";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { useState } from"react";
import { formatPrice } from"@/../../shared/utils/formatPrice";
import {
 DollarSign,
 ShoppingCart,
 TrendingUp,
 Package,
 Truck,
 CheckCircle,
 Clock,
 XCircle,
 ArrowLeft,
 BarChart3,
 Calendar,
} from"lucide-react";

type Period ="daily"|"weekly"|"monthly";

export default function AdminOrderStats() {
 const { user, loading } = useAuth();
 const { data: isAdmin } = trpc.admin.isAdmin.useQuery(undefined, { enabled: !!user });
 const [period, setPeriod] = useState<Period>("daily");

 const { data: stats, isLoading } = trpc.admin.orderStatistics.useQuery(
 { period },
 { enabled: isAdmin === true }
 );

 if (loading || isLoading) {
 return (
 <AdminLayout>
 <div className="flex items-center justify-center h-96">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
 </div>
 </AdminLayout>
 );
 }

 if (!user || !isAdmin) {
 return (
 <AdminLayout>
 <div className="text-center py-12">
 <h1 className="text-2xl font-bold text-gray-800 mb-4">접근 권한이 없습니다</h1>
 <Link href="/"className="text-pink-600 hover:underline">홈페이지로 돌아가기</Link>
 </div>
 </AdminLayout>
 );
 }

 if (!stats) {
 return (
 <AdminLayout>
 <div className="text-center py-12 text-gray-400">통계 데이터를 불러올 수 없습니다.</div>
 </AdminLayout>
 );
 }

 // Compute totals from statusDistribution
 const totalOrders = stats.statusDistribution.reduce((sum, s) => sum + Number(s.count), 0);
 const totalRevenue = stats.chartData.reduce((sum, d) => sum + Number(d.revenue), 0);
 const avgOrderAmount = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

 // Status map for display
 const statusLabels: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
 pending: { label:"주문 접수", icon: Clock, color:"text-yellow-700", bg:"bg-yellow-100"},
 confirmed: { label:"주문 확인", icon: CheckCircle, color:"text-blue-700", bg:"bg-blue-100"},
 processing: { label:"처리 중", icon: Package, color:"text-purple-700", bg:"bg-purple-100"},
 shipped: { label:"발송 완료", icon: Truck, color:"text-indigo-700", bg:"bg-indigo-100"},
 delivered: { label:"배달 완료", icon: CheckCircle, color:"text-green-700", bg:"bg-green-100"},
 cancelled: { label:"취소", icon: XCircle, color:"text-red-700", bg:"bg-red-100"},
 };

 const statusBarColors: Record<string, string> = {
 pending:"bg-yellow-500",
 confirmed:"bg-blue-500",
 processing:"bg-purple-500",
 shipped:"bg-indigo-500",
 delivered:"bg-green-500",
 cancelled:"bg-red-500",
 };

 const periodLabels: Record<Period, string> = {
 daily:"일별",
 weekly:"주별",
 monthly:"월별",
 };

 return (
 <AdminLayout>
 <div className="space-y-6 max-w-6xl">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <Link href="/admin/orders">
 <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
 <ArrowLeft className="h-4 w-4"/>
 주문 목록
 </button>
 </Link>
 <h2 className="text-2xl font-bold text-gray-900">주문 통계</h2>
 </div>
 <div className="flex gap-2">
 {(["daily","weekly","monthly"] as Period[]).map((p) => (
 <Button
 key={p}
 variant={period === p ?"default":"outline"}
 size="sm"
 onClick={() => setPeriod(p)}
 >
 {periodLabels[p]}
 </Button>
 ))}
 </div>
 </div>

 {/* Revenue Summary */}
 <div className="grid grid-cols-4 gap-4">
 <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white">
 <CardContent className="p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-pink-100 text-sm">총 매출</p>
 <p className="text-2xl font-bold mt-1">{formatPrice(totalRevenue)}</p>
 </div>
 <DollarSign className="h-8 w-8 text-pink-200"/>
 </div>
 </CardContent>
 </Card>
 <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
 <CardContent className="p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-blue-100 text-sm">평균 주문 금액</p>
 <p className="text-2xl font-bold mt-1">{formatPrice(avgOrderAmount)}</p>
 </div>
 <TrendingUp className="h-8 w-8 text-blue-200"/>
 </div>
 </CardContent>
 </Card>
 <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
 <CardContent className="p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-green-100 text-sm">총 주문 건수</p>
 <p className="text-2xl font-bold mt-1">{totalOrders}건</p>
 </div>
 <ShoppingCart className="h-8 w-8 text-green-200"/>
 </div>
 </CardContent>
 </Card>
 <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white">
 <CardContent className="p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-orange-100 text-sm">평균 배송 소요일</p>
 <p className="text-2xl font-bold mt-1">{Number(stats.avgDeliveryDays).toFixed(1)}일</p>
 </div>
 <Truck className="h-8 w-8 text-orange-200"/>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Status Distribution */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <BarChart3 className="h-5 w-5"/>
 상태별 주문 현황
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-6 gap-4 mb-6">
 {stats.statusDistribution.map((item) => {
 const info = statusLabels[item.status] || { label: item.status, icon: Package, color:"text-gray-700", bg:"bg-gray-100"};
 const Icon = info.icon;
 const count = Number(item.count);
 const percentage = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
 return (
 <div key={item.status} className="text-center">
 <div className={`${info.bg} rounded-lg p-4 mb-2`}>
 <Icon className={`h-6 w-6 mx-auto ${info.color}`} />
 <p className="text-2xl font-bold mt-2">{count}</p>
 </div>
 <p className="text-xs text-gray-500">{info.label}</p>
 <p className="text-xs font-medium text-gray-700">{percentage}%</p>
 </div>
 );
 })}
 </div>

 {/* Progress bars */}
 <div className="space-y-3">
 {stats.statusDistribution.map((item) => {
 const info = statusLabels[item.status] || { label: item.status };
 const count = Number(item.count);
 const percentage = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
 const barColor = statusBarColors[item.status] ||"bg-gray-500";
 return (
 <div key={item.status} className="flex items-center gap-4">
 <span className="text-sm text-gray-600 w-20 text-right">{info.label}</span>
 <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
 <div
 className={`${barColor} h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
 style={{ width: `${Math.max(percentage, 2)}%` }}
 >
 {percentage >= 10 && (
 <span className="text-xs text-white font-medium">{count}건</span>
 )}
 </div>
 </div>
 <span className="text-sm font-medium text-gray-700 w-12">{percentage}%</span>
 </div>
 );
 })}
 </div>
 </CardContent>
 </Card>

 {/* Carrier Stats */}
 {stats.carrierStats && stats.carrierStats.length > 0 && (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Truck className="h-5 w-5"/>
 운송사별 현황
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-4 py-3 text-left font-medium text-gray-500">운송사</th>
 <th className="px-4 py-3 text-right font-medium text-gray-500">총 배송</th>
 <th className="px-4 py-3 text-right font-medium text-gray-500">배달 완료</th>
 <th className="px-4 py-3 text-right font-medium text-gray-500">배달 성공률</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {stats.carrierStats.map((carrier) => {
 const total = Number(carrier.count);
 const delivered = Number(carrier.delivered);
 const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;
 return (
 <tr key={carrier.carrier} className="hover:bg-gray-50">
 <td className="px-4 py-3 font-medium">{carrier.carrier}</td>
 <td className="px-4 py-3 text-right">{total}건</td>
 <td className="px-4 py-3 text-right text-green-600 font-medium">{delivered}건</td>
 <td className="px-4 py-3 text-right">
 <span className={`px-2 py-0.5 rounded text-xs font-medium ${
 rate >= 90 ?"bg-green-100 text-green-700":
 rate >= 70 ?"bg-yellow-100 text-yellow-700":
"bg-red-100 text-red-700"
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
 </CardContent>
 </Card>
 )}

 {/* Period Chart Data */}
 {stats.chartData && stats.chartData.length > 0 && (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Calendar className="h-5 w-5"/>
 {periodLabels[period]} 주문 추이
 </CardTitle>
 </CardHeader>
 <CardContent>
 {/* Simple bar chart using CSS */}
 <div className="space-y-2 mb-6">
 {stats.chartData.slice(-14).map((day) => {
 const maxRevenue = Math.max(...stats.chartData.slice(-14).map(d => Number(d.revenue)));
 const revenueWidth = maxRevenue > 0 ? (Number(day.revenue) / maxRevenue) * 100 : 0;
 return (
 <div key={day.period} className="flex items-center gap-3">
 <span className="text-xs text-gray-500 w-24 text-right font-mono">{day.period}</span>
 <div className="flex-1 bg-gray-100 rounded h-6 overflow-hidden">
 <div
 className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded flex items-center justify-end pr-2 transition-all duration-300"
 style={{ width: `${Math.max(revenueWidth, 1)}%` }}
 >
 {revenueWidth >= 15 && (
 <span className="text-xs text-white font-medium">{formatPrice(Number(day.revenue))}</span>
 )}
 </div>
 </div>
 <span className="text-xs text-gray-600 w-16 text-right">{Number(day.count)}건</span>
 </div>
 );
 })}
 </div>

 {/* Data table */}
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-4 py-3 text-left font-medium text-gray-500">기간</th>
 <th className="px-4 py-3 text-right font-medium text-gray-500">주문 수</th>
 <th className="px-4 py-3 text-right font-medium text-gray-500">매출</th>
 <th className="px-4 py-3 text-right font-medium text-gray-500">평균 금액</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {stats.chartData.slice(-14).map((day) => {
 const count = Number(day.count);
 const revenue = Number(day.revenue);
 return (
 <tr key={day.period} className="hover:bg-gray-50">
 <td className="px-4 py-3 font-medium font-mono">{day.period}</td>
 <td className="px-4 py-3 text-right">{count}건</td>
 <td className="px-4 py-3 text-right font-semibold">{formatPrice(revenue)}</td>
 <td className="px-4 py-3 text-right text-gray-600">
 {count > 0 ? formatPrice(Math.round(revenue / count)) : '0원'}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 </AdminLayout>
 );
}
