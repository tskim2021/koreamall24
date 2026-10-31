import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Package, ChevronRight, ShoppingBag } from "lucide-react";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "処理中", color: "bg-yellow-100 text-yellow-800" },
  paid: { label: "支払い完了", color: "bg-green-100 text-green-800" },
  bank_transfer_pending: { label: "振込待ち", color: "bg-orange-100 text-orange-800" },
  processing: { label: "準備中", color: "bg-blue-100 text-blue-800" },
  shipped: { label: "発送済み", color: "bg-purple-100 text-purple-800" },
  delivered: { label: "配達完了", color: "bg-green-100 text-green-800" },
  cancelled: { label: "キャンセル", color: "bg-red-100 text-red-800" },
  refunded: { label: "返金済み", color: "bg-gray-100 text-gray-800" },
};

export default function Orders() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = trpc.order.list.useQuery(
    { page, limit: 10, sort: "newest" },
    { enabled: isAuthenticated }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <ShoppingBag className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-700">ログインが必要です</h2>
        <p className="text-gray-500 text-center">注文履歴を確認するにはログインしてください。</p>
        <Button
          onClick={() => setLocation("/")}
          className="bg-pink-600 hover:bg-pink-700 text-white"
        >
          ホームに戻る
        </Button>
      </div>
    );
  }

  const orders = data?.orders || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => setLocation("/")}
            className="text-sm text-gray-500 hover:text-pink-600 mb-2 flex items-center gap-1"
          >
            ← ホームに戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">注文履歴</h1>
          {total > 0 && (
            <p className="text-sm text-gray-500 mt-1">全{total}件</p>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700">{error.message}</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && orders.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-2">注文履歴がありません</h2>
            <p className="text-gray-500 mb-6">まだ注文がありません。ショッピングを始めましょう！</p>
            <Button
              onClick={() => setLocation("/")}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              商品を探す
            </Button>
          </div>
        )}

        {/* Order List */}
        {!isLoading && !error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order: any) => {
              const statusInfo = statusLabels[order.status] || { label: order.status, color: "bg-gray-100 text-gray-800" };
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setLocation(`/orders/${order.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">注文番号</p>
                      <p className="font-semibold text-gray-900 text-sm">{order.orderNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span className="font-bold text-pink-600">
                      ¥{Number(order.totalAmount).toLocaleString("ja-JP")}
                    </span>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        {order.items.slice(0, 2).map((item: any) => item.productNameJa || item.productName).join("、")}
                        {order.items.length > 2 && ` 他${order.items.length - 2}点`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  前へ
                </Button>
                <span className="flex items-center text-sm text-gray-600 px-3">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  次へ
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
