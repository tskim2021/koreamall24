import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/../../shared/utils/formatPrice";

export default function AdminOrdersTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [trackingNumber, setTrackingNumber] = useState<Record<number, string>>({});

  const { data: ordersRaw, isLoading } = trpc.admin.orders.useQuery({
    page,
    limit: 10,
    status: statusFilter,
  });
  const ordersData = (ordersRaw as any)?.orders || ordersRaw || [];

  // Initialize tracking numbers from shipment data
  useEffect(() => {
    if (ordersData && ordersData.length > 0) {
      const initialTrackingNumbers: Record<number, string> = {};
      ordersData.forEach((order: any) => {
        if (order.shipment?.trackingNumber) {
          initialTrackingNumbers[order.id] = order.shipment.trackingNumber;
        }
      });
      setTrackingNumber(initialTrackingNumbers);
    }
  }, [ordersData]);

  const updateOrderStatus = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success("주문 상태가 업데이트되었습니다");
      setUpdatingOrderId(null);
    },
    onError: (error) => {
      toast.error(error.message || "업데이트 실패");
    },
  });

  const updateTrackingNumber = trpc.admin.updateTrackingNumber.useMutation({
    onSuccess: () => {
      toast.success("추적번호가 저장되었습니다");
    },
    onError: (error) => {
      toast.error(error.message || "저장 실패");
    },
  });

  const handleStatusChange = (orderId: number, newStatus: string) => {
    setUpdatingOrderId(orderId);
    updateOrderStatus.mutate({
      orderId,
      status: newStatus as any,
      trackingNumber: trackingNumber[orderId],
    });
  };

  const handleTrackingNumberChange = (orderId: number, value: string) => {
    setTrackingNumber(prev => ({
      ...prev,
      [orderId]: value
    }));
    
    // Auto-save tracking number with debounce
    if (value.trim().length > 0) {
      // Clear previous timeout if exists
      const timeoutId = setTimeout(() => {
        updateTrackingNumber.mutate({
          orderId,
          trackingNumber: value.trim(),
          carrier: "Japan Post",
        });
      }, 1000); // Save after 1 second of inactivity
      
      return () => clearTimeout(timeoutId);
    }
  };

  const statusLabels: Record<string, string> = {
    pending: "보류중",
    confirmed: "확인됨",
    processing: "처리중",
    shipped: "발송됨",
    delivered: "배달완료",
    cancelled: "취소",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    shipped: "bg-orange-100 text-orange-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  if (isLoading) {
    return <div className="p-4">로딩 중...</div>;
  }

  // Calculate statistics
  const stats = {
    total: ordersData?.length || 0,
    pending: ordersData?.filter((o: any) => o.status === 'pending').length || 0,
    processing: ordersData?.filter((o: any) => o.status === 'processing').length || 0,
    shipped: ordersData?.filter((o: any) => o.status === 'shipped').length || 0,
    delivered: ordersData?.filter((o: any) => o.status === 'delivered').length || 0,
    totalRevenue: ordersData?.reduce((sum: number, o: any) => sum + parseFloat(o.totalAmount || 0), 0) || 0,
  };

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">전체 주문 수</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">보류 중</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">처리 중</p>
            <p className="text-2xl font-bold text-purple-600">{stats.processing}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">발송 완료</p>
            <p className="text-2xl font-bold text-orange-600">{stats.shipped}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">배달 완료</p>
            <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">주문번호 또는 고객명으로 검색</label>
          <Input
            placeholder="주문번호, 고객명, 이메일 주소로 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full"
          />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">상태로 필터</label>
          <Select value={statusFilter || "all"} onValueChange={(v) => {
            setStatusFilter(v === "all" ? undefined : v);
            setPage(1);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="모든 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="pending">보류 중</SelectItem>
              <SelectItem value="confirmed">확인됨</SelectItem>
              <SelectItem value="processing">처리 중</SelectItem>
              <SelectItem value="shipped">발송 완료</SelectItem>
              <SelectItem value="delivered">배달 완료</SelectItem>
              <SelectItem value="cancelled">취소</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {ordersData && ordersData.length > 0 ? (
          ordersData.map((order: any) => (
            <div key={order.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                }
                className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
              >
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">주문#{order.orderNumber}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        statusColors[order.status] || "bg-gray-100"
                      }`}
                    >
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    고객: {order.customerName} | 금액: {formatPrice(order.totalAmount)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    주문일: {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                  </div>
                </div>
                {expandedOrderId === order.id ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>

              {expandedOrderId === order.id && (
                <div className="p-4 border-t space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">주문번호</p>
                      <p className="text-sm">{order.orderNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">고객명</p>
                      <p className="text-sm">{order.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">이메일 주소</p>
                      <p className="text-sm">{order.customerEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">전화번호</p>
                      <p className="text-sm">{order.customerPhone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-600">배송지주소</p>
                      <p className="text-sm">
                        {order.shippingPostalCode} {order.shippingPrefecture} {order.shippingCity} {order.shippingAddress}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">주문상품</p>
                    <div className="space-y-2">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.productName} x {item.quantity}</span>
                            <span>{formatPrice(item.price)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">상품 정보가 없습니다</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">상태 변경</p>
                    <div className="flex gap-2 flex-wrap">
                      {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map((status) => (
                        <Button
                          key={status}
                          variant={order.status === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStatusChange(order.id, status)}
                          disabled={updatingOrderId === order.id}
                        >
                          {statusLabels[status]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {order.status === "shipped" && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">운송장 번호</p>
                      <Input
                        placeholder="추적번호 입력"
                        value={trackingNumber[order.id] || ""}
                        onChange={(e) => handleTrackingNumberChange(order.id, e.target.value)}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">발송 완료 시 운송장 번호를 입력해주세요</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">주문 금액 상세</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">소계</span>
                        <span>{formatPrice(parseFloat(order.totalAmount) - parseFloat(order.shippingFee || "0"))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">배송료</span>
                        <span>{formatPrice(parseFloat(order.shippingFee || "0"))}</span>
                      </div>
                      {order.pointsUsed > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>포인트 사용</span>
                          <span>-{formatPrice(order.pointsUsed)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>합계</span>
                        <span className="text-pink-600">{formatPrice(order.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setExpandedOrderId(null)}
                    >
                      닫기
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">주문이 없습니다</div>
        )}
      </div>

      {ordersData && Math.ceil((ordersData?.length || 0) / 10) > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="flex items-center px-4">
            {page} / {Math.ceil((ordersData?.length || 0) / 10)}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(Math.ceil((ordersData?.length || 0) / 10), page + 1))}
            disabled={page === Math.ceil((ordersData?.length || 0) / 10)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
