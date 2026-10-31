import { trpc } from "@/lib/trpc";
import { getOptimizedSrc } from "@/lib/imageProxy";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Loader2, Package, Truck, CheckCircle, XCircle, Clock, ChevronRight,
  ChevronLeft, User, ShoppingBag, Star, MessageSquare, MapPin, Search,
  X, Tag, Gift, CreditCard, Calendar, ShoppingCart, BoxIcon, AlertCircle,
  ExternalLink, Copy, ChevronDown, ChevronUp, CheckCircle2, Circle, Phone,
  Banknote
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import MyPageSidebar from "@/components/MyPageSidebar";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TrackingTimelineModal from "@/components/TrackingTimelineModal";

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; labelJa: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:             { label: "입금 대기",  labelJa: "入金待ち",   color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",    icon: <Clock className="w-3.5 h-3.5" /> },
  paid:                { label: "결제 완료",  labelJa: "決済完了",   color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",      icon: <CreditCard className="w-3.5 h-3.5" /> },
  confirmed:           { label: "주문 확인",  labelJa: "注文確認",   color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-200",  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  shipped:             { label: "배송 중",    labelJa: "発送済み",   color: "text-orange-700",  bg: "bg-orange-50 border-orange-200",  icon: <Truck className="w-3.5 h-3.5" /> },
  delivered:           { label: "배송 완료",  labelJa: "配達完了",   color: "text-green-700",   bg: "bg-green-50 border-green-200",    icon: <CheckCircle className="w-3.5 h-3.5" /> },
  completed:           { label: "주문 완료",  labelJa: "注文完了",   color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled:           { label: "취소",       labelJa: "キャンセル", color: "text-red-700",     bg: "bg-red-50 border-red-200",        icon: <XCircle className="w-3.5 h-3.5" /> },
  partially_cancelled: { label: "부분 취소",  labelJa: "一部取消",   color: "text-pink-700",    bg: "bg-pink-50 border-pink-200",      icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

const CARRIER_OPTIONS: Record<string, { name: string; nameJa: string }> = {
  yamato:    { name: "야마토운수",  nameJa: "クロネコヤマト" },
  sagawa:    { name: "사가와",      nameJa: "佐川急便" },
  japanpost: { name: "일본우편",    nameJa: "日本郵便" },
  fukuyama:  { name: "후쿠야마통운",nameJa: "福山通運" },
  seino:     { name: "세이노운수",  nameJa: "西濃運輸" },
  nittsu:    { name: "닛쓰",        nameJa: "日通" },
  ems:       { name: "EMS",         nameJa: "EMS" },
  other:     { name: "기타",        nameJa: "その他" },
};

const CARRIER_TRACKING_URLS: Record<string, (n: string) => string> = {
  japanpost: (n) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${n}&locale=ja`,
  yamato:    (n) => `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${n}`,
  sagawa:    (n) => `https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=${n}`,
  ems:       (n) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${n}&locale=ja`,
};

const PAYMENT_LABELS: Record<string, string> = {
  card: "카드 결제", bank_transfer: "무통장입금", stripe: "카드결제(Stripe)",
  point: "포인트 결제", paypal: "PayPal", cod: "착불",
};

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 11) return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  return phone;
}

// ─── 상품 아이템 카드 ─────────────────────────────────────────────────────────
function ItemCard({ item, orderStatus, onTrackingClick }: {
  item: any;
  orderStatus: string;
  onTrackingClick: (item: any) => void;
}) {
  const hasTracking = !!item.itemTrackingNumber;
  const isCancelled = !!item.cancelledAt;
  const carrier = item.itemCarrier || "";
  const carrierInfo = CARRIER_OPTIONS[carrier];
  const carrierLabel = carrierInfo ? `${carrierInfo.name} (${carrierInfo.nameJa})` : carrier;
  const s = STATUS_LABELS[orderStatus] || STATUS_LABELS["pending"];

  return (
    <div className={`rounded-xl border transition-all ${
      isCancelled
        ? "bg-gray-50 border-gray-200 opacity-60"
        : hasTracking
          ? "bg-green-50 border-green-200"
          : "bg-white border-gray-200"
    }`}>
      {/* 주문번호 행 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-mono text-gray-700 font-semibold">
          注文番号 {item.orderNumber}
        </span>
        <div className="flex items-center gap-1.5">
          {isCancelled && (
            <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">取消</span>
          )}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium border ${s.bg} ${s.color}`} style={{fontSize: '11px'}}>
            {s.icon}{s.label}
          </span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex gap-4">
          {/* 상품 이미지 */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
            {item.imageUrl ? (
              <img src={getOptimizedSrc(item.imageUrl, 64, 80)} alt={item.productNameJa} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* 상품 정보 */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-snug">{item.productNameJa || item.productName}</p>
            {item.productName && item.productName !== item.productNameJa && (
              <p className="text-xs text-gray-400 mt-0.5">{item.productName}</p>
            )}
            {item.tierName && (
              <span className="inline-block text-xs text-pink-600 bg-pink-50 border border-pink-200 px-1.5 py-0.5 rounded mt-1">
                {item.tierName}
              </span>
            )}

            {/* 수량 / 금액 */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-full font-medium">
                数量 {item.quantity}個
              </span>
              <span className="text-xs text-gray-500">単価 ¥{Number(item.unitPrice).toLocaleString()}</span>
              <span className="text-sm font-bold text-gray-900">小計 ¥{Number(item.subtotal).toLocaleString()}</span>
            </div>

            {/* 배송 추적 정보 */}
            {!isCancelled && hasTracking && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-white border border-green-200 rounded-lg px-2.5 py-1.5">
                    <Truck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    <span className="text-xs text-green-700 font-medium">{carrierLabel || carrier}</span>
                    <span className="text-xs font-mono text-gray-800 font-semibold">{item.itemTrackingNumber}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.itemTrackingNumber);
                        toast.success("追跡番号をコピーしました");
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => onTrackingClick({ ...item, orderStatus })}
                    className="flex items-center gap-1 h-7 px-2.5 text-xs text-blue-600 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors font-medium"
                  >
                    <Search className="w-3 h-3" />배송 추적
                  </button>
                  {CARRIER_TRACKING_URLS[carrier] && (
                    <a
                      href={CARRIER_TRACKING_URLS[carrier](item.itemTrackingNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 h-7 px-2.5 text-xs text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />공식 사이트
                    </a>
                  )}
                </div>
              </div>
            )}
            {!isCancelled && !hasTracking && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">まだ追跡番号が入力されていません</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 주문 그룹 카드 ───────────────────────────────────────────────────────────
function OrderGroupCard({ group, onComplete, isCompleting, pointSettings, tierData }: {
  group: any;
  onComplete: (orderId: number) => void;
  isCompleting: boolean;
  pointSettings: any;
  tierData: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const [, setLocation] = useLocation();
  const [timelineModal, setTimelineModal] = useState<any | null>(null);

  const s = STATUS_LABELS[group.status] || STATUS_LABELS["pending"];
  const displayCartId = (group.cartGroupId || "").replace("#", "").toUpperCase();

  // 모든 주문의 아이템 플랫 배열
  const allItems = useMemo(() => {
    return (group.orders || []).flatMap((order: any) =>
      (order.items || []).map((item: any) => ({
        ...item,
        orderNumber: order.orderNumber,
        orderId: order.id,
        orderStatus: order.status,
        orderPaymentMethod: order.paymentMethod,
        orderPointsEarned: order.pointsEarned,
        orderPointsUsed: order.pointsUsed,
        orderPointsAdded: order.pointsAdded,
        orderMembershipDiscount: order.membershipDiscount,
        orderMembershipTierName: order.membershipTierName,
        orderCouponDiscount: order.couponDiscount,
        orderShippingFee: order.shippingFee,
        orderBankTransferConfirmedAt: order.bankTransferConfirmedAt,
      }))
    );
  }, [group]);

  const firstOrder = group.orders?.[0];
  const totalAmount = group.totalAmount;

  // 할인/포인트 집계
  const totalCouponDiscount = (group.orders || []).reduce((s: number, o: any) => s + Number(o.couponDiscount || 0), 0);
  const totalMembershipDiscount = (group.orders || []).reduce((s: number, o: any) => s + Number(o.membershipDiscount || 0), 0);
  const totalPointsUsed = (group.orders || []).reduce((s: number, o: any) => s + Number(o.pointsUsed || 0), 0);
  const totalPointsEarned = (group.orders || []).reduce((s: number, o: any) => s + Number(o.pointsEarned || 0), 0);
  const totalShippingFee = (group.orders || []).reduce((s: number, o: any) => s + Number(o.shippingFee || 0), 0);
  const subtotalBeforeDiscount = totalAmount + totalCouponDiscount + totalMembershipDiscount + totalPointsUsed;

  const purchasePercent = parseFloat(pointSettings?.PURCHASE_POINTS_PERCENT || '1');
  const pointRate = parseFloat(tierData?.tier?.pointRate || '1');
  const estimatedPoints = Math.floor(totalAmount * (purchasePercent / 100) * pointRate);
  const displayPoints = (firstOrder?.pointsAdded && totalPointsEarned > 0) ? totalPointsEarned : estimatedPoints;

  const isBankTransfer = firstOrder?.paymentMethod === "bank_transfer";
  const bankConfirmedAt = firstOrder?.bankTransferConfirmedAt;

  const isDelivered = group.status === "delivered";
  const isCompleted = group.status === "completed";

  const handleTrackingClick = (item: any) => {
    setTimelineModal({
      open: true,
      orderId: item.orderId,
      trackingNumber: item.itemTrackingNumber || "",
      carrier: item.itemCarrier || "japanpost",
      orderStatus: item.orderStatus || "",
      productName: item.productNameJa || item.productName || "",
      shippingName: firstOrder?.shippingName || "",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ── 요약 헤더 ── */}
      <div
        className="px-5 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 장바구니 ID + 상태 */}
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-pink-500" />
              <span className="font-mono font-bold text-pink-700 text-sm">#{displayCartId}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.bg} ${s.color}`}>
                {s.icon}{s.label}
              </span>
              <span className="text-xs text-gray-400">{s.labelJa}</span>
            </div>

            <div className="h-4 w-px bg-gray-200 hidden sm:block" />

            {/* 주문 일시 */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">{formatDateTime(group.createdAt)}</span>
            </div>

            <div className="h-4 w-px bg-gray-200 hidden sm:block" />

            {/* 결제수단 */}
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-600">{PAYMENT_LABELS[group.paymentMethod] || group.paymentMethod || "-"}</span>
            </div>

            <div className="h-4 w-px bg-gray-200 hidden sm:block" />

            {/* 총금액 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">합계</span>
              <span className="font-bold text-gray-900 text-sm">¥{Number(totalAmount).toLocaleString()}</span>
            </div>
          </div>

          {/* 펼침/접힘 토글 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{allItems.length}개 상품</span>
            {expanded
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </div>
        </div>

        {/* 상품 썸네일 미리보기 (접힌 상태) */}
        {!expanded && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex gap-1">
              {allItems.slice(0, 4).map((item: any, idx: number) => (
                <div key={idx} className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={getOptimizedSrc(item.imageUrl, 64, 80)} alt={item.productNameJa} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
              {allItems.length > 4 && (
                <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-500 font-medium flex-shrink-0">
                  +{allItems.length - 4}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 font-medium line-clamp-1">
                {allItems[0]?.productNameJa}
                {allItems.length > 1 && <span className="text-xs text-gray-400 ml-1">他{allItems.length - 1}点</span>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 펼침 상세 ── */}
      {expanded && (
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

            {/* ── 왼쪽: 상품 목록 + 결제 내역 ── */}
            <div className="xl:col-span-2 space-y-4">

              {/* 상품 목록 */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <BoxIcon className="w-4 h-4 text-pink-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">購入商品リスト</h3>
                  <span className="text-xs text-gray-400">({allItems.length}個)</span>
                </div>
                <div className="p-3 space-y-3">
                  {allItems.map((item: any) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      orderStatus={item.orderStatus}
                      onTrackingClick={handleTrackingClick}
                    />
                  ))}
                </div>
              </div>

              {/* 결제 내역 상세 */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-pink-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">お支払い明細</h3>
                </div>
                <div className="p-4">
                  {/* 주문별 금액 */}
                  <div className="space-y-2 mb-4">
                    {(group.orders || []).map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded">#{order.orderNumber}</span>
                          <span className="text-xs text-gray-500">{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</span>
                          {Number(order.couponDiscount) > 0 && (
                            <span className="text-xs text-pink-600 bg-pink-50 border border-pink-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Tag className="w-3 h-3" />クーポン -{Number(order.couponDiscount).toLocaleString()}
                            </span>
                          )}
                          {Number(order.membershipDiscount) > 0 && (
                            <span className="text-xs text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Star className="w-3 h-3" />等級割引 -{Number(order.membershipDiscount).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">¥{Number(order.totalAmount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* 금액 요약 */}
                  <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">商品小計</span>
                      <span className="text-gray-900">¥{subtotalBeforeDiscount.toLocaleString()}</span>
                    </div>
                    {totalShippingFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">送料</span>
                        <span className="text-gray-900">+¥{totalShippingFee.toLocaleString()}</span>
                      </div>
                    )}
                    {totalCouponDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-pink-600 flex items-center gap-1"><Tag className="w-3.5 h-3.5" />クーポン割引</span>
                        <span className="text-pink-600 font-medium">-¥{totalCouponDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    {totalMembershipDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-600 flex items-center gap-1"><Star className="w-3.5 h-3.5" />等級割引</span>
                        <span className="text-purple-600 font-medium">-¥{totalMembershipDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    {totalPointsUsed > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600 flex items-center gap-1"><Gift className="w-3.5 h-3.5" />ポイント使用</span>
                        <span className="text-blue-600 font-medium">-{totalPointsUsed.toLocaleString()}P</span>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                      <span className="font-bold text-gray-900">最終お支払い金額</span>
                      <span className="text-xl font-bold text-pink-600">¥{Number(totalAmount).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* 포인트 적립 */}
                  {displayPoints > 0 && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-xs font-semibold text-amber-700">
                            {firstOrder?.pointsAdded ? "ポイント積立完了" : "注文完了後の予定積立ポイント"}
                          </p>
                          {!firstOrder?.pointsAdded && (
                            <p className="text-xs text-amber-500 mt-0.5">注文完了(completed)時に自動積立</p>
                          )}
                        </div>
                      </div>
                      <span className={`text-lg font-bold ${firstOrder?.pointsAdded ? "text-green-600" : "text-amber-600"}`}>
                        +{displayPoints.toLocaleString()}P
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 오른쪽: 주문 정보 + 배송지 ── */}
            <div className="space-y-4">

              {/* 주문 정보 */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">注文情報</h3>
                </div>
                <div className="px-4 py-2 space-y-0">
                  {[
                    { label: "カートID", value: <span className="font-mono text-xs bg-white border border-gray-200 px-2 py-0.5 rounded">#{displayCartId}</span> },
                    { label: "注文日時", value: formatDateTime(group.createdAt) },
                    { label: "決済手段", value: PAYMENT_LABELS[group.paymentMethod] || group.paymentMethod || "-" },
                    { label: "注文件数", value: `${(group.orders || []).length}件` },
                    { label: "商品数", value: `${allItems.length}個` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0 gap-3">
                      <span className="text-xs text-gray-500 font-medium flex-shrink-0">{label}</span>
                      <span className="text-sm text-right text-gray-900">{value}</span>
                    </div>
                  ))}

                  {/* 입금 확인 (무통장) */}
                  {isBankTransfer && (
                    <div className="py-2.5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">入金確認</span>
                        {bankConfirmedAt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle className="w-3 h-3" />確認済み
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            <Clock className="w-3 h-3" />未確認
                          </span>
                        )}
                      </div>
                      {bankConfirmedAt && (
                        <p className="text-xs text-gray-500 mt-1 text-right">{formatDateTime(bankConfirmedAt)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 배송지 정보 */}
              {firstOrder?.shippingAddress && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-pink-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">お届け先</h3>
                  </div>
                  <div className="p-4 space-y-1.5">
                    <p className="text-sm font-semibold text-gray-900">{firstOrder.shippingName}</p>
                    {firstOrder.shippingPhone && (
                      <p className="text-sm text-gray-600">{formatPhone(firstOrder.shippingPhone)}</p>
                    )}
                    {firstOrder.shippingPostalCode && (
                      <p className="text-xs text-gray-500">〒 {firstOrder.shippingPostalCode}</p>
                    )}
                    <p className="text-sm text-gray-700 leading-relaxed">{firstOrder.shippingAddress}</p>
                  </div>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="space-y-2">
                {isDelivered && (
                  <Button
                    size="sm"
                    className="w-full text-xs h-9 bg-teal-600 hover:bg-teal-700 text-white"
                    disabled={isCompleting}
                    onClick={() => {
                      if (confirm('商品を受け取りましたか？注文完了にするとポイントが積立されます。')) {
                        onComplete(firstOrder?.id);
                      }
                    }}
                  >
                    {isCompleting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                    受取完了・ポイント積立
                  </Button>
                )}
                {(isDelivered || isCompleted) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-9"
                    onClick={() => setLocation(`/mypage/reviews?orderId=${firstOrder?.id}`)}
                  >
                    <Star className="w-3.5 h-3.5 mr-1.5" />レビューを書く
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-9"
                  onClick={() => setLocation(`/mypage/inquiries?orderId=${firstOrder?.id}`)}
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />お問い合わせ
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 배송 추적 모달 */}
      {timelineModal?.open && (
        <TrackingTimelineModal
          open={timelineModal.open}
          orderId={timelineModal.orderId}
          trackingNumber={timelineModal.trackingNumber}
          carrier={timelineModal.carrier}
          orderStatus={timelineModal.orderStatus}
          productName={timelineModal.productName}
          shippingName={timelineModal.shippingName}
          onClose={() => setTimelineModal(null)}
        />
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function MyOrder() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [completingOrderId, setCompletingOrderId] = useState<number | null>(null);
  const pageSize = 10;

  const queryInput = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
    status: statusFilter !== "all" ? statusFilter : undefined,
  }), [currentPage, statusFilter]);

  const { data: cartGroupsData, isLoading } = trpc.order.getMyCartGroups.useQuery(queryInput, {
    enabled: isAuthenticated,
  });
  const { data: tierData } = trpc.membership.myTier.useQuery(undefined, { enabled: isAuthenticated });
  const { data: pointSettingsData } = trpc.pointSettings.getAll.useQuery(undefined, { enabled: isAuthenticated });

  const utils = trpc.useUtils();
  const completeOrder = trpc.order.complete.useMutation({
    onSuccess: (data) => {
      toast.success(`注文が完了しました！${data.pointsEarned > 0 ? ` ${data.pointsEarned}Pが積立されました。` : ''}`);
      utils.order.getMyCartGroups.invalidate();
      setCompletingOrderId(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setCompletingOrderId(null);
    },
  });

  const groups = cartGroupsData?.groups || [];
  const totalPages = cartGroupsData?.totalPages || 1;
  const total = cartGroupsData?.total || 0;

  const statusTabs = [
    { value: "all", label: "全て" },
    { value: "pending", label: "入金待ち" },
    { value: "paid", label: "決済完了" },
    { value: "confirmed", label: "注文確認" },
    { value: "shipped", label: "発送済み" },
    { value: "delivered", label: "配達完了" },
    { value: "completed", label: "注文完了" },
    { value: "cancelled", label: "取消" },
  ];

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-4">ログインが必須です</h1>
            <p className="text-gray-600 mb-6">マイページを表示するにはログインしてください。</p>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => window.location.href = getLoginUrl()}>
              ログインページへ
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-8">
          <div className="flex gap-6 lg:gap-8 items-start">
            {/* 사이드바 */}
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>

            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* 헤더 배너 */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="p-4 sm:p-5" style={{backgroundColor: '#fffbeb'}}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">注文履歴</h1>
                      <p className="text-xs text-primary font-medium mt-0.5">ご注文状況をご確認ください</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-600">全注文数</div>
                      <div className="text-2xl font-bold text-primary">{total}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 상태 필터 탭 */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">ステータス</p>
                <div className="flex flex-wrap gap-2">
                  {statusTabs.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => { setStatusFilter(tab.value); setCurrentPage(1); }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        statusFilter === tab.value
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 주문 목록 */}
              {isLoading ? (
                <div className="rounded-xl border border-gray-200 bg-white p-12 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : groups.length > 0 ? (
                <div className="space-y-3">
                  {groups.map((group: any) => (
                    <OrderGroupCard
                      key={group.cartGroupId}
                      group={group}
                      onComplete={(orderId) => {
                        setCompletingOrderId(orderId);
                        completeOrder.mutate({ orderId });
                      }}
                      isCompleting={completeOrder.isPending && completingOrderId === group.orders?.[0]?.id}
                      pointSettings={pointSettingsData}
                      tierData={tierData}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                  <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">注文がありません</p>
                </div>
              )}

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    size="sm" variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="text-xs h-8"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page} size="sm"
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      className="text-xs h-8 w-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    size="sm" variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="text-xs h-8"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
