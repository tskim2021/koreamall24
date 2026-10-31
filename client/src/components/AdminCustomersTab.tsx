import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/../../shared/utils/formatPrice";

export default function AdminCustomersTab() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  const { data: usersData, isLoading } = trpc.admin.users.useQuery({ 
    page, 
    limit: 10 
  });

  const users = (usersData as any)?.users ?? [];
  const total = (usersData as any)?.total || 0;

  const filteredUsers = users.filter((user: any) => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: total,
    admins: users.filter((u: any) => u.role === 'admin').length,
    regularUsers: users.filter((u: any) => u.role === 'user').length,
  };

  if (isLoading) {
    return <div className="p-4">로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">전체 고객수</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">관리자</p>
            <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">일반 사용자</p>
            <p className="text-2xl font-bold text-blue-600">{stats.regularUsers}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">이름 또는 이메일로 검색</label>
        <Input
          placeholder="고객명, 이메일로 검색..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        {filteredUsers && filteredUsers.length > 0 ? (
          filteredUsers.map((user: any) => (
            <CustomerRow 
              key={user.id} 
              user={user} 
              isExpanded={expandedUserId === user.id}
              onToggle={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
            />
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">고객이 없습니다</div>
        )}
      </div>

      {total > 10 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="flex items-center px-4">
            {page} / {Math.ceil(total / 10)}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(Math.ceil(total / 10), page + 1))}
            disabled={page === Math.ceil(total / 10)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}

function CustomerRow({ user, isExpanded, onToggle }: any) {
  const { data: statsData } = trpc.admin.customerStats.useQuery({ userId: user.id });
  const stats = statsData || { totalOrders: 0, totalSpent: 0 };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3">
            <span className="font-semibold">{user.name}</span>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                user.role === "admin" 
                  ? "bg-red-100 text-red-800" 
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {user.role === "admin" ? "관리자" : "사용자"}
            </span>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {user.email}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex gap-4">
            <span>가입일: {new Date(user.createdAt).toLocaleDateString("ko-KR")}</span>
            <span>주문: {stats.totalOrders}건</span>            <span>누적 구매: {formatPrice(stats.totalSpent as number)}</span>          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 border-t space-y-4">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">고객 정보</TabsTrigger>
              <TabsTrigger value="orders">주문 내역</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">이름</p>
                  <p className="text-sm">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">이메일</p>
                  <p className="text-sm">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">역할</p>
                  <p className="text-sm">{user.role === "admin" ? "관리자" : "사용자"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">가입일</p>
                  <p className="text-sm">{new Date(user.createdAt).toLocaleDateString("ko-KR")}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">활동 통계</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-gray-600">총 주문수</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalOrders}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-gray-600">총 구매액</p>
                    <p className="text-2xl font-bold text-green-600">{formatPrice(stats.totalSpent as number)}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-xs text-gray-600">마지막 주문</p>
                    <p className="text-sm font-bold text-purple-600">
                      없음
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              {false ? (
                <div className="space-y-2">
                  {[].map((order: any) => (
                    <div key={order.id} className="border rounded p-3 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">주문#{order.orderNumber}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatPrice(order.totalAmount)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'processing' ? 'bg-purple-100 text-purple-800' :
                            order.status === 'shipped' ? 'bg-orange-100 text-orange-800' :
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {order.status === 'pending' ? '보류중' :
                             order.status === 'confirmed' ? '확인됨' :
                             order.status === 'processing' ? '처리중' :
                             order.status === 'shipped' ? '발송됨' :
                             order.status === 'delivered' ? '배달완료' :
                             '취소'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">주문 내역이 없습니다</p>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onToggle()}
            >
              닫기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
