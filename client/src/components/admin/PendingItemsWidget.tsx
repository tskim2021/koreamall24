import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { ShoppingCart, MessageSquare, HelpCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PendingItemsWidget() {
  const { data: badgeCounts, isLoading } = trpc.admin.badgeCounts.useQuery(undefined, {
    refetchInterval: 2 * 60 * 1000, // 30초마다 자동 갱신
  });

  if (isLoading) {
    return (
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertCircle className="w-5 h-5" />
            미처리 항목 현황
          </CardTitle>
          <CardDescription>처리가 필요한 항목을 확인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPending = (badgeCounts?.pendingOrders || 0) + 
                       (badgeCounts?.unansweredInquiries || 0) + 
                       (badgeCounts?.unansweredProductQuestions || 0);

  const items = [
    {
      title: "미처리 주문",
      count: badgeCounts?.pendingOrders || 0,
      icon: ShoppingCart,
      href: "/admin/orders",
      color: "text-red-600",
      bgColor: "bg-red-50",
      iconBgColor: "bg-red-100",
      description: "결제 대기 중인 주문",
    },
    {
      title: "미답변 문의",
      count: badgeCounts?.unansweredInquiries || 0,
      icon: MessageSquare,
      href: "/admin/inquiries",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      iconBgColor: "bg-blue-100",
      description: "답변이 필요한 고객 문의",
    },
    {
      title: "미답변 상품 Q&A",
      count: badgeCounts?.unansweredProductQuestions || 0,
      icon: HelpCircle,
      href: "/admin/product-questions",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      iconBgColor: "bg-purple-100",
      description: "답변이 필요한 상품 질문",
    },
  ];

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="w-5 h-5" />
              미처리 항목 현황
            </CardTitle>
            <CardDescription>처리가 필요한 항목을 확인하세요</CardDescription>
          </div>
          {totalPending > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {totalPending}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {totalPending === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-700">모든 항목이 처리되었습니다</p>
            <p className="text-sm text-gray-500 mt-1">현재 처리가 필요한 항목이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {items.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={`${item.bgColor} rounded-lg p-4 hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-gray-200`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${item.iconBgColor} p-2 rounded-lg`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    {item.count > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {item.count}
                      </Badge>
                    )}
                  </div>
                  <h4 className={`font-semibold ${item.color} mb-1`}>{item.title}</h4>
                  <p className="text-xs text-gray-600">{item.description}</p>
                  {item.count > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        <span className={`font-bold ${item.color}`}>{item.count}건</span>의 처리가 필요합니다
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
