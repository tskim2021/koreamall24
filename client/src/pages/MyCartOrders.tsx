import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getOptimizedSrc } from "@/lib/imageProxy";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MyPageSidebar from "@/components/MyPageSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  ShoppingCart, Package, Truck, CheckCircle, Clock, XCircle,
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
  MapPin, CreditCard, Calendar, AlertCircle, RefreshCw,
  Star, Box, Loader2, User, ChevronsLeft, ChevronsRight,
  FileText,
} from "lucide-react";

// ─── 状態マップ ────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:             { label: "入金待ち",   color: "bg-yellow-50 text-yellow-700 border border-yellow-200",  icon: <Clock className="w-3.5 h-3.5" /> },
  paid:                { label: "決済完了",   color: "bg-blue-50 text-blue-700 border border-blue-200",        icon: <CreditCard className="w-3.5 h-3.5" /> },
  confirmed:           { label: "注文確認",   color: "bg-indigo-50 text-indigo-700 border border-indigo-200",  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  shipped:             { label: "配送中",     color: "bg-orange-50 text-orange-700 border border-orange-200",  icon: <Truck className="w-3.5 h-3.5" /> },
  delivered:           { label: "配達完了",   color: "bg-green-50 text-green-700 border border-green-200",     icon: <CheckCircle className="w-3.5 h-3.5" /> },
  completed:           { label: "注文完了",   color: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled:           { label: "キャンセル", color: "bg-red-50 text-red-700 border border-red-200",           icon: <XCircle className="w-3.5 h-3.5" /> },
  partially_cancelled: { label: "一部取消",   color: "bg-pink-50 text-pink-700 border border-pink-200",        icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

const CARRIER_LABELS: Record<string, string> = {
  yamato:    "야마토운수 (ヤマト運輸)",
  sagawa:    "사가와 (佐川急便)",
  japanpost: "일본우편 (日本郵便)",
  fukuyama:  "후쿠야마통운 (福山通運)",
  seino:     "세이노운수 (西濃運輸)",
  nittsu:    "닛쓰 (日通)",
  dhl:       "DHL",
  fedex:     "FedEx",
  ups:       "UPS",
  ems:       "EMS",
  other:     "その他",
};

const PAYMENT_LABELS: Record<string, string> = {
  card:          "カード決済",
  bank_transfer: "銀行振込",
  stripe:        "Stripe",
  point:         "ポイント",
};

const STATUS_TABS = [
  { value: "all",      label: "すべて" },
  { value: "pending",  label: "入金待ち" },
  { value: "paid",     label: "決済完了" },
  { value: "confirmed",label: "注文確認" },
  { value: "shipped",  label: "配送中" },
  { value: "delivered",label: "配達完了" },
  { value: "completed",label: "完了" },
  { value: "cancelled",label: "キャンセル" },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, color: "bg-gray-100 text-gray-700 border border-gray-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
      {s.icon}{s.label}
    </span>
  );
}

// ─── 배송 진행 단계 바 ─────────────────────────────────────────────────────────
function DeliveryProgressBar({ status }: { status: string }) {
  const steps = [
    { key: "pending",   label: "入金待ち" },
    { key: "paid",      label: "決済完了" },
    { key: "confirmed", label: "準備中" },
    { key: "shipped",   label: "配送中" },
    { key: "delivered", label: "配達完了" },
    { key: "completed", label: "完了" },
  ];
  const ORDER = ["pending", "paid", "confirmed", "shipped", "delivered", "completed"];
  const currentIdx = ORDER.indexOf(status);
  const isCancelled = status === "cancelled" || status === "partially_cancelled";

  if (isCancelled) {
    return <span className="text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">キャンセル</span>;
  }

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const done = currentIdx >= idx;
        const current = currentIdx === idx;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all ${
                current ? "bg-primary text-white shadow-sm" :
                done ? "bg-primary/20 text-primary" : "bg-gray-100 text-gray-400"
              }`}>
                {done ? "✓" : idx + 1}
              </div>
              <span className={`text-[9px] mt-0.5 font-medium whitespace-nowrap ${
                current ? "text-primary" : done ? "text-primary/60" : "text-gray-300"
              }`}>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-3 h-0.5 mb-3 mx-0.5 ${currentIdx > idx ? "bg-primary/30" : "bg-gray-100"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── 상품 아이템 행 ───────────────────────────────────────────────────────────
function OrderItemRow({ item }: { item: any }) {
  const hasTracking = !!item.itemTrackingNumber;
  const carrierLabel = CARRIER_LABELS[item.itemCarrier] || item.itemCarrier;

  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${hasTracking ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
      {/* 상품 이미지 */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {item.imageUrl ? (
          <img src={getOptimizedSrc(item.imageUrl, 48, 80)} alt={item.productNameJa} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>

      {/* 상품 정보 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.productNameJa || item.productName}</p>
        {item.tierName && <p className="text-xs text-gray-500">{item.tierName}</p>}
        <p className="text-xs text-gray-500 mt-0.5">
          数量: {item.quantity}個 · 単価: ¥{Number(item.unitPrice).toLocaleString()} · 小計: <span className="font-semibold text-gray-700">¥{(Number(item.unitPrice) * Number(item.quantity)).toLocaleString()}</span>
        </p>
        {/* 배송 추적 */}
        {hasTracking && (
          <div className="mt-1.5 flex items-center gap-2 bg-green-100 rounded px-2 py-1">
            <Truck className="w-3 h-3 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-green-700 font-medium">{carrierLabel}</p>
              <p className="text-xs font-mono text-green-800">{item.itemTrackingNumber}</p>
            </div>
            <a
              href={`https://www.17track.net/en/track?nums=${item.itemTrackingNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-medium transition-colors"
            >
              배송추적
            </a>
          </div>
        )}
        {!hasTracking && item.cancelledAt && (
          <Badge variant="destructive" className="text-xs mt-1">キャンセル済み</Badge>
        )}
      </div>

      {/* 소계 */}
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-semibold text-gray-900">¥{Number(item.subtotal).toLocaleString()}</p>
      </div>
    </div>
  );
}

// ─── 장바구니 그룹 행 (관리자 CartGroupRow 스타일) ────────────────────────────
function CartGroupRow({ group }: { group: any }) {
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();
  const allItems = group.orders.flatMap((o: any) => o.items || []);
  const shippedCount = allItems.filter((i: any) => i.itemTrackingNumber).length;
  const firstOrderId = group.orders?.[0]?.id;

  return (
    <div className={`border rounded-xl overflow-hidden hover:shadow-md transition-shadow ${expanded ? "border-primary/40 bg-primary/5" : "border-gray-200 bg-white"}`}>
      {/* 그룹 헤더 행 */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 카트번호 + 주문일시 */}
        <div className="w-[130px] flex-shrink-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <p className="font-bold text-primary font-mono" style={{ fontSize: "14px" }}>
            #{group.cartGroupId.replace(/#/g, "").slice(-8).toUpperCase()}
          </p>
          <p className="text-gray-400" style={{ fontSize: "11px", marginTop: "-2px" }}>
            {new Date(group.createdAt).toLocaleString("ko-KR", {
              year: "2-digit", month: "2-digit", day: "2-digit",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>

        <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

        {/* 상품 썸네일 */}
        <div className="w-[148px] flex-shrink-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-1">
            {allItems.slice(0, 3).map((item: any, idx: number) => (
              <div key={item.id || idx} className="w-8 h-8 rounded border border-gray-200 overflow-hidden bg-gray-100 flex-shrink-0">
                {item.imageUrl
                  ? <img src={getOptimizedSrc(item.imageUrl, 32, 75)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Package className="w-3 h-3 text-gray-400" /></div>
                }
              </div>
            ))}
            {allItems.length > 3 && (
              <div className="w-8 h-8 rounded border border-gray-200 bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] text-gray-500">+{allItems.length - 3}</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{allItems.length}点</p>
        </div>

        {/* 결제 금액 */}
        <div className="w-[100px] flex-shrink-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <p className="text-sm font-bold text-primary">¥{group.totalAmount.toLocaleString()}</p>
          {group.paymentMethod && (
            <p className="text-gray-500" style={{ fontSize: "10px" }}>
              {PAYMENT_LABELS[group.paymentMethod] || group.paymentMethod}
            </p>
          )}
        </div>

        {/* 배송 진행 단계 */}
        <div className="flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <DeliveryProgressBar status={group.status} />
          {shippedCount > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${(shippedCount / allItems.length) * 100}%` }} />
              </div>
              <span className="text-[10px] text-gray-500">送状 {shippedCount}/{allItems.length}</span>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {firstOrderId && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 flex items-center justify-center"
              onClick={() => navigate(`/mypage/order/${firstOrderId}`)}
              title="詳細を見る"
            >
              <FileText className="w-4 h-4" />
            </Button>
          )}
          <button className="p-1 rounded hover:bg-gray-100 transition-colors" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </button>
        </div>
      </div>

      {/* 펼쳐진 상품 목록 */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
          {/* 주문별 상품 목록 */}
          <div className="space-y-4">
            {group.orders.map((order: any) => (
              <div key={order.id}>
                {order.items && order.items.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[11px] font-semibold text-gray-500">注文番号:</span>
                      <span className="text-[11px] font-mono text-primary font-bold">
                        #{order.orderNumber || order.id}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="space-y-2">
                      {order.items.map((item: any) => (
                        <OrderItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 결제 금액 요약 */}
          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">お支払い金額</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>商品合計</span>
                <span>¥{Number(group.totalAmount).toLocaleString()}</span>
              </div>
              {group.couponUsage && Number(group.couponUsage.discountAmount) > 0 && (
                <div className="flex justify-between text-xs text-orange-600">
                  <span>クーポン割引</span>
                  <span className="font-bold">-¥{Number(group.couponUsage.discountAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                <span>最終お支払い</span>
                <span className="text-primary">
                  ¥{(Number(group.totalAmount) - Number(group.couponUsage?.discountAmount || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* 배송지 정보 */}
          {group.orders[0]?.shippingAddress && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />お届け先
              </p>
              <p className="text-sm text-gray-800">{group.orders[0].shippingName}</p>
              <p className="text-sm text-gray-600">{group.orders[0].shippingAddress}</p>
            </div>
          )}

          {/* 리뷰 버튼 (배송완료/주문완료) */}
          {(group.status === "delivered" || group.status === "completed") && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => navigate(`/mypage/reviews/write?cartGroupId=${group.cartGroupId}`)}
              >
                <Star className="w-4 h-4 mr-1.5" />レビューを書く
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── メインコンポーネント ────────────────────────────────────────────────────────
export default function MyCartOrders() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  const queryInput = useMemo(() => ({
    page,
    limit: LIMIT,
    status: statusFilter !== "all" ? statusFilter : undefined,
  }), [page, statusFilter]);

  const { data, isLoading, refetch } = trpc.order.getMyCartGroups.useQuery(queryInput, {
    enabled: isAuthenticated,
  });

  const groups = data?.groups || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;

  // << < 1 2 3 > >> 페이지 번호 계산
  const getPageNumbers = () => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <User className="w-16 h-16 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-700">ログインが必要です</h2>
          <p className="text-gray-500 text-center">注文履歴を確認するにはログインしてください。</p>
          <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => window.location.href = getLoginUrl()}>
            ログイン
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-1">
        <div className="container py-6 md:py-8">
          {/* パンくずリスト */}
          <p className="text-sm text-gray-500 mb-4">
            <Link href="/mypage" className="hover:text-gray-700 cursor-pointer">マイページ</Link>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="text-gray-800 font-medium">注文履歴</span>
          </p>

          <div className="flex gap-6 lg:gap-8 items-start">
            {/* サイドバー */}
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>

            {/* メインコンテンツ */}
            <div className="flex-1 min-w-0">
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* ページヘッダー */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      注文履歴
                    </h1>
                    <p className="text-xs text-primary font-medium mt-0.5">カート単位で注文内容を確認できます</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {total > 0 && (
                      <span className="text-sm text-gray-500">全{total}件</span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
                      <RefreshCw className="w-4 h-4 text-gray-400" />
                    </Button>
                  </div>
                </div>

                {/* 상태 필터 탭 */}
                <div className="px-6 py-3 border-b border-gray-100 flex gap-1.5 flex-wrap">
                  {STATUS_TABS.map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        statusFilter === tab.value
                          ? "bg-primary text-white shadow-sm"
                          : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-primary/40 hover:text-primary"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* 테이블 헤더 */}
                {!isLoading && groups.length > 0 && (
                  <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
                    <div className="w-[130px] flex-shrink-0">カート番号 / 日付</div>
                    <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
                    <div className="w-[148px] flex-shrink-0">商品</div>
                    <div className="w-[100px] flex-shrink-0">金額</div>
                    <div className="flex-1">配送状況</div>
                    <div className="w-[60px] flex-shrink-0 text-right">操作</div>
                  </div>
                )}

                {/* 주문 목록 */}
                <div className="p-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : groups.length === 0 ? (
                    <div className="py-16 text-center">
                      <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">注文履歴がありません</p>
                      <p className="text-gray-400 text-sm mt-1">ショッピングを始めましょう！</p>
                      <Button
                        className="mt-4 bg-primary hover:bg-primary/90 text-white"
                        onClick={() => navigate("/")}
                      >
                        ショッピングへ
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groups.map((group: any) => (
                        <CartGroupRow key={group.cartGroupId} group={group} />
                      ))}
                    </div>
                  )}

                  {/* << < 1 2 3 > >> 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 mt-6">
                      {/* << 첫 페이지 */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={page <= 1}
                        onClick={() => setPage(1)}
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                      {/* < 이전 */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {/* 페이지 번호 */}
                      {getPageNumbers().map(pageNum => (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          className={`h-8 w-8 p-0 ${page === pageNum ? "bg-primary hover:bg-primary/90 text-white" : ""}`}
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      ))}
                      {/* > 다음 */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      {/* >> 마지막 페이지 */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={page >= totalPages}
                        onClick={() => setPage(totalPages)}
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
