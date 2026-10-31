import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShoppingCart, Users, DollarSign } from "lucide-react";
import { formatPrice } from "@/../../shared/utils/formatPrice";

export default function AdminDashboardMain() {
  const { data: ordersData } = trpc.admin.orders.useQuery({ page: 1, limit: 100 });
  const { data: productsData } = trpc.admin.products.list.useQuery({ page: 1, limit: 100 });
  const { data: usersData } = trpc.admin.users.useQuery({ page: 1, limit: 100 });

  // 통계 계산
  const orders = (ordersData as any)?.orders || ordersData || [];
  const products = productsData?.products || [];
  const users = (usersData as any)?.users ?? [];
  const totalOrders = orders.length || 0;
  const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0) || 0;
  const totalProducts = products.length || 0;
  const totalCustomers = users.length || 0;

  const stats = [
    {
      title: "총 매출",
      value: formatPrice(totalRevenue),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "주문 수",
      value: totalOrders.toString(),
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "고객 수",
      value: totalCustomers.toString(),
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "상품 수",
      value: totalProducts.toString(),
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 통계카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`${stat.color} w-6 h-6`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 최근 주문 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 주문</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">주문ID</th>
                  <th className="px-4 py-2 text-left font-semibold">고객</th>
                  <th className="px-4 py-2 text-left font-semibold">금액</th>
                  <th className="px-4 py-2 text-left font-semibold">상태</th>
                  <th className="px-4 py-2 text-left font-semibold">날짜</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order: any) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">#{order.id}</td>
                    <td className="px-4 py-3">{order.customerName || "알 수 없음"}</td>
                    <td className="px-4 py-3 font-semibold">{formatPrice(order.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : order.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {order.status === "completed" ? "완료" : order.status === "pending" ? "보류 중" : "취소"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
