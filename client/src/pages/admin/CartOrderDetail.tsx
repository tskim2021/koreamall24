import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import TrackingTimelineModal from "@/components/TrackingTimelineModal";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, ShoppingCart, Package, Truck, CheckCircle, Clock,
  XCircle, User, MapPin, CreditCard, Calendar, AlertCircle,
  Save, Edit2, Phone, Mail, RefreshCw, MessageSquare, ChevronRight,
  Hash, BoxIcon, Gift, Tag, Star, Banknote, Search, X, ExternalLink,
  ChevronDown, ChevronUp, CheckCircle2, Circle, AlertTriangle
} from "lucide-react";

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:             { label: "입금 대기",  color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   icon: <Clock className="w-3.5 h-3.5" /> },
  paid:                { label: "결제 완료",  color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     icon: <CreditCard className="w-3.5 h-3.5" /> },
  confirmed:           { label: "주문 확인",  color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  shipped:             { label: "배송 중",    color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: <Truck className="w-3.5 h-3.5" /> },
  delivered:           { label: "배송 완료",  color: "text-green-700",  bg: "bg-green-50 border-green-200",   icon: <CheckCircle className="w-3.5 h-3.5" /> },
  completed:           { label: "주문 완료",  color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200",icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled:           { label: "취소",       color: "text-red-700",    bg: "bg-red-50 border-red-200",       icon: <XCircle className="w-3.5 h-3.5" /> },
  partially_cancelled: { label: "부분 취소",  color: "text-pink-700",   bg: "bg-pink-50 border-pink-200",     icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

const STATUS_OPTIONS = [
  { value: "pending",   label: "입금 대기" },
  { value: "paid",      label: "결제 완료" },
  { value: "confirmed", label: "주문 확인" },
  { value: "shipped",   label: "배송 중" },
  { value: "delivered", label: "배송 완료" },
  { value: "completed", label: "주문 완료" },
  { value: "cancelled", label: "취소" },
];

const CARRIER_OPTIONS = [
  { value: "",          label: "택배사 선택" },
  { value: "yamato",    label: "야마토운수 (クロネコヤマト)" },
  { value: "sagawa",    label: "사가와 (佐川急便)" },
  { value: "japanpost", label: "일본우편 (日本郵便)" },
  { value: "fukuyama",  label: "후쿠야마통운 (福山通運)" },
  { value: "seino",     label: "세이노운수 (西濃運輸)" },
  { value: "nittsu",    label: "닛쓰 (日通)" },
  { value: "dhl",       label: "DHL" },
  { value: "fedex",     label: "FedEx" },
  { value: "ups",       label: "UPS" },
  { value: "ems",       label: "EMS" },
  { value: "other",     label: "기타" },
];

const CARRIER_TRACKING_URLS: Record<string, (n: string) => string> = {
  japanpost: (n) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${n}&locale=ja`,
  yamato:    (n) => `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${n}`,
  sagawa:    (n) => `https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=${n}`,
  ems:       (n) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${n}&locale=ja`,
  dhl:       (n) => `https://www.dhl.com/jp-ja/home/tracking.html?tracking-id=${n}`,
  fedex:     (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  ups:       (n) => `https://www.ups.com/track?tracknum=${n}`,
};

const PAYMENT_LABELS: Record<string, string> = {
  card: "카드 결제", bank_transfer: "무통장입금", stripe: "Stripe",
  point: "포인트 결제", paypal: "PayPal", cod: "착불",
};

// 전화번호 포맷: 000-0000-0000
function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 11) return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  return phone;
}

// 날짜/시간 포맷 (분까지)
function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── 배송 추적 팝업 (TrackingTimelineModal로 대체됨) ─────────────────────────────
// Legacy TrackingPopup removed - now using shared TrackingTimelineModal
function _TrackingPopup_UNUSED({ item, onClose }: { item: any; onClose: () => void }) {
  const carrier = item.itemCarrier || "";
  const trackingNumber = item.itemTrackingNumber || "";
  const trackingUrl = CARRIER_TRACKING_URLS[carrier]?.(trackingNumber);
  const carrierLabel = CARRIER_OPTIONS.find(c => c.value === carrier)?.label || carrier;

  // 배송 단계
  const steps = [
    { key: "ordered",   label: "주문 접수",  done: true },
    { key: "paid",      label: "결제 완료",  done: !!item.orderStatus && item.orderStatus !== "pending" },
    { key: "confirmed", label: "상품 준비",  done: ["confirmed","shipped","delivered","completed"].includes(item.orderStatus) },
    { key: "shipped",   label: "배송 출발",  done: !!item.itemShippedAt || ["shipped","delivered","completed"].includes(item.orderStatus) },
    { key: "delivered", label: "배송 완료",  done: !!item.itemDeliveredAt || ["delivered","completed"].includes(item.orderStatus) },
  ];
  const currentStep = steps.filter(s => s.done).length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 팝업 헤더 */}
        <div className="bg-gradient-to-r from-pink-600 to-pink-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-white" />
            <div>
              <h3 className="text-white font-bold text-base">배송 추적</h3>
              <p className="text-pink-100 text-xs mt-0.5">{item.productNameJa || item.productName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 송장 정보 */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">택배사</span>
              <span className="text-sm font-semibold text-gray-900">{carrierLabel || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">송장번호</span>
              <span className="text-sm font-mono font-bold text-gray-900 tracking-wider">{trackingNumber || "-"}</span>
            </div>
            {item.itemShippedAt && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">발송일시</span>
                <span className="text-sm text-gray-700">{formatDateTime(item.itemShippedAt)}</span>
              </div>
            )}
            {item.itemDeliveredAt && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">배송완료</span>
                <span className="text-sm text-gray-700">{formatDateTime(item.itemDeliveredAt)}</span>
              </div>
            )}
          </div>

          {/* 배송 단계 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">배송 진행 상태</p>
            <div className="relative">
              {/* 연결선 */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />
              <div
                className="absolute left-4 top-4 w-0.5 bg-pink-500 transition-all duration-500"
                style={{ height: `${Math.min(currentStep / (steps.length - 1), 1) * 100}%` }}
              />
              <div className="space-y-4">
                {steps.map((step, idx) => (
                  <div key={step.key} className="flex items-center gap-4 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-all ${
                      step.done
                        ? idx === currentStep
                          ? "bg-pink-600 border-pink-600 shadow-lg shadow-pink-200"
                          : "bg-pink-100 border-pink-400"
                        : "bg-white border-gray-300"
                    }`}>
                      {step.done
                        ? <CheckCircle2 className={`w-4 h-4 ${idx === currentStep ? "text-white" : "text-pink-500"}`} />
                        : <Circle className="w-4 h-4 text-gray-300" />
                      }
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${step.done ? "text-gray-900" : "text-gray-400"}`}>
                        {step.label}
                        {idx === currentStep && (
                          <span className="ml-2 text-xs text-pink-600 font-semibold">● 현재</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 외부 추적 링크 */}
          {trackingUrl && trackingNumber && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-medium text-sm transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {carrierLabel} 공식 사이트에서 추적
            </a>
          )}
          {!trackingNumber && (
            <div className="text-center py-2 text-sm text-gray-400">
              <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-gray-300" />
              아직 송장번호가 입력되지 않았습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 상품별 송장번호 입력 카드 ────────────────────────────────────────────────
function ItemTrackingCard({ item, orderNumber, orderStatus, onSaved, onTrackingClick }: {
  item: any;
  orderNumber: string;
  orderStatus: string;
  onSaved: () => void;
  onTrackingClick: (item: any) => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState(item.itemTrackingNumber || "");
  const [carrier, setCarrier] = useState(item.itemCarrier || "");
  const [editing, setEditing] = useState(!item.itemTrackingNumber);
  const [selectedStatus, setSelectedStatus] = useState(orderStatus);

  const updateMutation = trpc.admin.updateItemTracking.useMutation({
    onSuccess: () => {
      toast.success("송장번호가 저장되었습니다.");
      setEditing(false);
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const statusMutation = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success(`주문 #${orderNumber} 상태가 변경되었습니다.`);
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

    const hasTracking = !!item.itemTrackingNumber;
  const isCancelled = !!item.cancelledAt;
  const carrierLabel = CARRIER_OPTIONS.find(c => c.value === (carrier || item.itemCarrier))?.label || carrier || item.itemCarrier || "";
  const s = STATUS_LABELS[orderStatus] || STATUS_LABELS["pending"];
  const isCustomsAlert = item.trackingHasAlert && item.trackingAlertType === 'customs';
  const hasAnyAlert = item.trackingHasAlert;
  return (
    <div className={`rounded-xl border transition-all ${
      isCancelled
        ? "bg-gray-50 border-gray-200 opacity-60"
        : isCustomsAlert
          ? "bg-amber-50 border-amber-300"
          : hasTracking && !editing
            ? "bg-green-50 border-green-200"
            : "bg-white border-gray-200"
    }`}>
      {/* 주문번호 행 - 맨 위 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-mono text-gray-700 font-semibold">
            주문번호 {orderNumber}
          </span>
          {isCustomsAlert && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
              <AlertTriangle className="w-3 h-3" />
              세관 조회 중
            </span>
          )}
          {hasAnyAlert && !isCustomsAlert && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
              <AlertTriangle className="w-3 h-3" />
              배송 문제
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isCancelled && <Badge variant="destructive" className="text-xs">취소됨</Badge>}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium border ${s.bg} ${s.color}`} style={{fontSize: '11px'}}>
            {s.icon}{s.label}
          </span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex gap-4">
          {/* 상품 이미지 */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
            {item.productImageUrl ? (
              <img src={item.productImageUrl} alt={item.productNameJa} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* 상품 정보 */}
          <div className="flex-1 min-w-0">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-snug">{item.productNameJa || item.productName}</p>
              {item.productName && item.productName !== item.productNameJa && (
                <p className="text-xs text-gray-400 mt-0.5">{item.productName}</p>
              )}
              {item.tierName && (
                <span className="inline-block text-xs text-pink-600 bg-pink-50 border border-pink-200 px-1.5 py-0.5 rounded mt-1">
                  {item.tierName}
                </span>
              )}
            </div>

            {/* 수량 / 금액 / 할인 */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-full font-medium">
                수량 {item.quantity}개
              </span>
              <span className="text-xs text-gray-500">
                단가 ¥{Number(item.unitPrice).toLocaleString()}
              </span>
              <span className="text-sm font-bold text-gray-900">
                소계 ¥{Number(item.subtotal).toLocaleString()}
              </span>
              {Number(item.discountAmount) > 0 && (
                <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                  할인 -¥{Number(item.discountAmount).toLocaleString()}
                </span>
              )}
            </div>

            {/* 송장번호 영역 */}
            {!isCancelled && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                {editing ? (
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent min-w-[180px]"
                    >
                      {CARRIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <Input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="송장번호 입력"
                      className="w-44 h-9 text-sm font-mono"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateMutation.mutate({ orderId: item.orderId, orderItemId: item.id, trackingNumber: trackingNumber || "", carrier: carrier || "Japan Post" });
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="bg-pink-600 hover:bg-pink-700 h-9 px-4"
                      onClick={() => updateMutation.mutate({ orderId: item.orderId, orderItemId: item.id, trackingNumber: trackingNumber || "", carrier: carrier || "Japan Post" })}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      {updateMutation.isPending ? "저장 중..." : "저장"}
                    </Button>
                    {hasTracking && (
                      <Button size="sm" variant="outline" className="h-9" onClick={() => {
                        setEditing(false);
                        setTrackingNumber(item.itemTrackingNumber || "");
                        setCarrier(item.itemCarrier || "");
                      }}>취소</Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 송장번호 표시 */}
                    <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 min-w-0" style={{backgroundColor: '#ffffff'}}>
                      <Truck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      <span className="text-xs text-green-700 font-medium truncate max-w-[80px]" title={carrierLabel}>{carrierLabel}</span>
                      <span className="text-xs font-mono text-green-800 tracking-wide" style={{fontWeight: '600', color: '#000000'}}>{item.itemTrackingNumber}</span>
                    </div>
                    {/* 수정 버튼 */}
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1 h-7 px-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" style={{color: '#000000', backgroundColor: '#ffffff'}}
                    >
                      <Edit2 className="w-3 h-3" />수정
                    </button>
                    {/* 배송 추적 버튼 */}
                    <button
                      onClick={() => onTrackingClick({ ...item, orderStatus })}
                      className="flex items-center gap-1 h-7 px-2.5 text-xs text-blue-600 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors font-medium"
                    >
                      <Search className="w-3 h-3" />추적
                    </button>
                    {/* 상태 변경 */}
                    <div className="flex items-center gap-1 ml-auto">
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400 h-7"
                      >
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button
                        className={`h-7 px-2.5 text-xs rounded-lg font-medium transition-colors ${
                          selectedStatus === orderStatus || statusMutation.isPending
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-pink-500 hover:bg-pink-600 text-white"
                        }`}
                        disabled={selectedStatus === orderStatus || statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ orderId: item.orderId, status: selectedStatus as any })}
                      >
                        변경
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 주문 상태 변경 행 ────────────────────────────────────────────────────────
function OrderStatusRow({ order, onChanged }: { order: any; onChanged: () => void }) {
  const [status, setStatus] = useState(order.status);
  const s = STATUS_LABELS[order.status] || STATUS_LABELS["pending"];

  const updateMutation = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success(`주문 #${order.orderNumber} 상태가 변경되었습니다.`);
      onChanged();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-3">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded flex-shrink-0">
          #{order.orderNumber}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${s.bg} ${s.color}`}>
          {s.icon}{s.label}
        </span>
        <span className="text-sm font-semibold text-gray-700 flex-shrink-0">¥{Number(order.totalAmount).toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Button
          size="sm"
          className="bg-pink-600 hover:bg-pink-700 h-8 text-xs px-3"
          disabled={status === order.status || updateMutation.isPending}
          onClick={() => updateMutation.mutate({ orderId: order.id, status: status as any })}
        >
          변경
        </Button>
      </div>
    </div>
  );
}

// ─── 정보 행 컴포넌트 ─────────────────────────────────────────────────────────
function InfoRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0 gap-3">
      <span className="text-xs text-gray-500 font-medium flex-shrink-0">{label}</span>
      <span className={`text-sm text-right ${highlight ? "font-bold text-pink-600" : "text-gray-900"}`}>{value}</span>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function CartOrderDetail() {
  const [, params] = useRoute("/admin/cart-orders/:cartGroupId");
  const [, navigate] = useLocation();
  const rawId = params?.cartGroupId || "";
  const cartGroupId = rawId.startsWith("#") ? rawId : (rawId ? `#${rawId}` : "");
  const utils = trpc.useUtils();

  const [timelineModal, setTimelineModal] = useState<{ open: boolean; orderId: number; trackingNumber: string; carrier: string; status: string; productName: string; shippingName: string } | null>(null);

  const handleTrackingClick = (item: any) => {
    setTimelineModal({
      open: true,
      orderId: item.orderId,
      trackingNumber: item.itemTrackingNumber || "",
      carrier: item.itemCarrier || "japanpost",
      status: item.orderStatus || "",
      productName: item.productNameJa || item.productName || "",
      shippingName: item.shippingName || "",
    });
  };

  const { data, isLoading, refetch } = trpc.admin.getCartGroupDetail.useQuery(
    { cartGroupId },
    { enabled: !!cartGroupId }
  );

  const handleRefresh = () => {
    refetch();
    utils.admin.getCartGroups.invalidate();
  };

  // 모든 상품을 하나의 플랫 배열로 통합
  const allItems = useMemo(() => {
    if (!data) return [];
    return data.orders.flatMap((order: any) =>
      (order.items || []).map((item: any) => ({
        ...item,
        orderNumber: order.orderNumber,
        orderId: order.id,
        orderStatus: order.status,
        orderCreatedAt: order.createdAt,
        orderPaymentMethod: order.paymentMethod,
        orderBankTransferConfirmedAt: order.bankTransferConfirmedAt,
        orderBankTransferConfirmedBy: order.bankTransferConfirmedBy,
        orderPointsEarned: order.pointsEarned,
        orderPointsUsed: order.pointsUsed,
        orderPointsAdded: order.pointsAdded,
        orderMembershipDiscount: order.membershipDiscount,
        orderMembershipTierName: order.membershipTierName,
        orderCouponDiscount: order.couponDiscount,
        orderCouponInfo: order.couponInfo,
      }))
    );
  }, [data]);

  const shippedCount = allItems.filter((i: any) => i.itemTrackingNumber && !i.cancelledAt).length;
  const activeItems = allItems.filter((i: any) => !i.cancelledAt);
  const progressPct = activeItems.length > 0 ? Math.round((shippedCount / activeItems.length) * 100) : 0;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
          <span className="ml-3 text-gray-500">주문 정보를 불러오는 중...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">주문을 찾을 수 없습니다.</p>
          <p className="text-sm text-gray-400 mt-1">장바구니 번호: {cartGroupId}</p>
          <Button className="mt-4 bg-pink-600 hover:bg-pink-700" onClick={() => navigate("/admin/cart-orders")}>
            <ArrowLeft className="w-4 h-4 mr-1" />목록으로
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const firstOrder = data.orders[0];
  const user = data.user;
  const totalAmount = data.totalAmount;
  const displayCartId = cartGroupId.replace("#", "").toUpperCase();

  // 할인 정보 집계
  const totalCouponDiscount = data.orders.reduce((s: number, o: any) => s + Number(o.couponDiscount || 0), 0);
  const totalMembershipDiscount = data.orders.reduce((s: number, o: any) => s + Number(o.membershipDiscount || 0), 0);
  const totalPointsUsed = data.orders.reduce((s: number, o: any) => s + Number(o.pointsUsed || 0), 0);
  const totalPointsEarned = data.orders.reduce((s: number, o: any) => s + Number(o.pointsEarned || 0), 0);
  const purchasePointsPercent = data.purchasePointsPercent ?? 1;
  const estimatedPoints = Math.floor(Number(totalAmount) * (purchasePointsPercent / 100));
  const displayPoints = (firstOrder?.pointsAdded && totalPointsEarned > 0) ? totalPointsEarned : estimatedPoints;
  const totalShippingFee = data.orders.reduce((s: number, o: any) => s + Number(o.shippingFee || 0), 0);
  const subtotalBeforeDiscount = totalAmount + totalCouponDiscount + totalMembershipDiscount + totalPointsUsed;

  // 입금확인 정보 (무통장)
  const isBankTransfer = firstOrder?.paymentMethod === "bank_transfer";
  const bankConfirmedAt = firstOrder?.bankTransferConfirmedAt;

  // 쿠폰 정보
  const couponInfoList = data.orders
    .filter((o: any) => o.couponInfo)
    .map((o: any) => o.couponInfo);

  // 전체 주문 상태 (가장 많이 등장하는 상태 또는 첫 주문 상태)
  const overallStatus = firstOrder?.status || "pending";
  const overallStatusInfo = STATUS_LABELS[overallStatus] || STATUS_LABELS["pending"];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">

        {/* ── 헤더 (심플) ── */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/cart-orders")}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />목록으로
            </button>
            <span className="text-gray-300">|</span>
            <h1 className="text-base font-bold text-gray-900">주문목록 상세</h1>
          </div>
        </div>

        {/* ── 본문 ── */}
        <div className="px-6 py-5 space-y-4">

          {/* ── 장바구니 요약 박스 ── */}
          <div className="bg-white border border-gray-200 rounded-xl px-6 py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-6 flex-wrap">
              {/* 장바구니 ID + 상태 */}
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-pink-500" />
                <span className="font-mono font-bold text-pink-700 text-sm" style={{fontSize: '14px', fontWeight: '600'}}>#{displayCartId}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${overallStatusInfo.bg} ${overallStatusInfo.color}`} style={{fontSize: '11px'}}>
                  {overallStatusInfo.icon}{overallStatusInfo.label}
                </span>
              </div>

              <div className="h-4 w-px bg-gray-200" />

              {/* 주문 일시 */}
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-400 text-xs">주문일시</span>
                <span className="font-medium">{formatDateTime(firstOrder?.createdAt)}</span>
              </div>

              <div className="h-4 w-px bg-gray-200" />

              {/* 결제수단 */}
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <span className="text-gray-400 text-xs">결제</span>
                <span className="font-medium">{firstOrder?.paymentMethod === "bank_transfer" ? "무통장입금" : firstOrder?.paymentMethod === "stripe" ? "카드결제" : firstOrder?.paymentMethod || "-"}</span>
              </div>

              <div className="h-4 w-px bg-gray-200" />

              {/* 총 결제금액 */}
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-gray-400 text-xs">총금액</span>
                <span className="font-bold text-gray-900">¥{Number(totalAmount).toLocaleString()}</span>
              </div>
              </div>{/* end flex items-center gap-6 */}
              {/* 오른쪽: 세관 조회 경고 배지 */}
              {(() => {
                const customsItems = allItems.filter((i: any) => i.trackingHasAlert && i.trackingAlertType === 'customs');
                const alertItems = allItems.filter((i: any) => i.trackingHasAlert && i.trackingAlertType !== 'customs');
                if (customsItems.length === 0 && alertItems.length === 0) return null;
                return (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {customsItems.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        세관 조회 중 ({customsItems.length}건)
                      </span>
                    )}
                    {alertItems.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        배송 문제 ({alertItems.length}건)
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── 그리드 레이아웃 ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* ── 왼쪽: 상품 목록 + 결제 내역 ── */}
          <div className="xl:col-span-2 space-y-4">

            {/* 상품 목록 */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <BoxIcon className="w-4 h-4 text-pink-600" />
                  구매 상품 목록
                  <span className="text-sm font-normal text-gray-400">({allItems.length}개)</span>
                </h2>
                <div className="flex items-center gap-3">
                  {/* 송장 진행률 상태바 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400" style={{fontSize: '12px'}}>송장입력</span>
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-700" style={{fontSize: '12px', fontWeight: '500'}}>{shippedCount}/{activeItems.length}</span>
                  </div>
                  {progressPct === 100 ? (
                    <span className="text-xs text-green-700 bg-green-100 border border-green-200 px-2.5 py-1 rounded-full font-medium flex items-center gap-1" style={{fontSize: '11px'}}>
                      <CheckCircle className="w-3 h-3" />전체 송장 입력 완료
                    </span>
                  ) : (
                    <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full font-medium">
                      {activeItems.length - shippedCount}개 미입력
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4 space-y-3">
                {allItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">상품 정보가 없습니다.</p>
                  </div>
                ) : (
                  allItems.map((item: any) => (
                    <ItemTrackingCard
                      key={item.id}
                      item={item}
                      orderNumber={item.orderNumber}
                      orderStatus={item.orderStatus}
                      onSaved={handleRefresh}
                      onTrackingClick={handleTrackingClick}
                    />
                  ))
                )}
              </div>
            </div>

            {/* 결제 내역 상세 */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-pink-600" />
                  결제 내역 상세
                </h2>
              </div>
              <div className="p-5">
                {/* 주문별 금액 */}
                <div className="space-y-2 mb-4">
                  {data.orders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">#{order.orderNumber}</span>
                        <span className="text-xs text-gray-500">{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</span>
                        {order.couponInfo && (
                          <span className="text-xs text-pink-600 bg-pink-50 border border-pink-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Tag className="w-3 h-3" />쿠폰 -{Number(order.couponInfo.discountAmount).toLocaleString()}
                          </span>
                        )}
                        {Number(order.membershipDiscount) > 0 && (
                          <span className="text-xs text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Star className="w-3 h-3" />등급할인 -{Number(order.membershipDiscount).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">¥{Number(order.totalAmount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* 금액 요약 */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">상품 소계</span>
                    <span className="text-gray-900">¥{subtotalBeforeDiscount.toLocaleString()}</span>
                  </div>
                  {totalShippingFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">배송비</span>
                      <span className="text-gray-900">+¥{totalShippingFee.toLocaleString()}</span>
                    </div>
                  )}
                  {totalCouponDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-pink-600 flex items-center gap-1"><Tag className="w-3.5 h-3.5" />쿠폰 할인</span>
                      <span className="text-pink-600 font-medium">-¥{totalCouponDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {totalMembershipDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-600 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" />
                        등급 할인
                        {firstOrder?.membershipTierName && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{firstOrder.membershipTierName}</span>
                        )}
                      </span>
                      <span className="text-purple-600 font-medium">-¥{totalMembershipDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {totalPointsUsed > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600 flex items-center gap-1"><Gift className="w-3.5 h-3.5" />포인트 사용</span>
                      <span className="text-blue-600 font-medium">-{totalPointsUsed.toLocaleString()}P</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                    <span className="font-bold text-gray-900">최종 결제 금액</span>
                    <span className="text-xl font-bold text-pink-600">¥{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* 할인 방법 요약 */}
                {(totalCouponDiscount > 0 || totalMembershipDiscount > 0 || totalPointsUsed > 0) && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" />적용된 할인 방법
                    </p>
                    <div className="space-y-1">
                      {couponInfoList.map((c: any, i: number) => (
                        <p key={i} className="text-xs text-blue-600">
                          쿠폰: {c.nameJa || c.code} ({c.code}) — -¥{Number(c.discountAmount).toLocaleString()}
                        </p>
                      ))}
                      {totalMembershipDiscount > 0 && (
                        <p className="text-xs text-purple-600">
                          회원 등급 할인 ({firstOrder?.membershipTierName || "등급"}) — -¥{totalMembershipDiscount.toLocaleString()}
                        </p>
                      )}
                      {totalPointsUsed > 0 && (
                        <p className="text-xs text-blue-600">
                          포인트 사용 — -{totalPointsUsed.toLocaleString()}P
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 포인트 적립 예정 */}
                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700">주문 완료 후 적립 예정 포인트</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {firstOrder?.pointsAdded
                          ? "이미 적립 완료"
                          : "주문 완료(completed) 상태 전환 시 자동 적립"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${firstOrder?.pointsAdded ? "text-green-600" : "text-amber-600"}`}>
                      +{displayPoints.toLocaleString()}P
                    </span>
                    {firstOrder?.pointsAdded ? (
                      <p className="text-xs text-green-600 font-medium">적립 완료</p>
                    ) : (
                      <p className="text-xs text-amber-500">예상 ({purchasePointsPercent}%)</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 오른쪽: 고객/주문/배송지 정보 ── */}
          <div className="space-y-4">

            {/* 주문 정보 */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-pink-600" />
                  주문 정보
                </h2>
              </div>
              <div className="px-5 py-2">
                <InfoRow label="장바구니 번호" value={<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">#{displayCartId}</span>} />
                <InfoRow label="주문 일시" value={formatDateTime(firstOrder?.createdAt)} />
                <InfoRow label="결제 수단" value={PAYMENT_LABELS[firstOrder?.paymentMethod ?? ''] || firstOrder?.paymentMethod || "-"} />
                <InfoRow label="주문 건수" value={`${data.orders.length}건`} />
                <InfoRow label="총 상품 수" value={`${allItems.length}개`} />

                {/* 입금 확인 정보 (무통장) */}
                {isBankTransfer && (
                  <>
                    <div className="py-2.5 border-b border-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">입금 확인</span>
                        {bankConfirmedAt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle className="w-3 h-3" />확인 완료
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            <Clock className="w-3 h-3" />미확인
                          </span>
                        )}
                      </div>
                      {bankConfirmedAt && (
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-gray-400">확인 일시</span>
                          <span className="text-xs text-gray-700 font-medium">{formatDateTime(bankConfirmedAt)}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 주문자 정보 */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-pink-600" />
                  주문자 정보
                </h2>
              </div>
              <div className="p-4 space-y-2.5">
                {/* 이메일(아이디) */}
                {user?.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-600 break-all">{user.email}</span>
                  </div>
                )}
                {/* 주문자 이름 */}
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-900">
                    {firstOrder?.shippingName || user?.nameKanji || user?.name || "-"}
                  </span>
                </div>
                {/* 전화번호 000-0000-0000 포맷 */}
                {firstOrder?.shippingPhone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{formatPhone(firstOrder.shippingPhone)}</span>
                  </div>
                )}
                {user && (
                  <Button variant="outline" size="sm" className="w-full mt-1 text-xs border-gray-300"
                    onClick={() => navigate(`/admin/users/${user.id}`)}>
                    <User className="w-3 h-3 mr-1" />회원 정보 보기
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </Button>
                )}
              </div>
            </div>

            {/* 배송지 정보 */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-pink-600" />
                  배송지 정보
                </h2>
              </div>
              <div className="p-4 space-y-1.5">
                <p className="text-sm font-semibold text-gray-900">{firstOrder?.shippingName}</p>
                {firstOrder?.shippingPhone && (
                  <p className="text-sm text-gray-600">{formatPhone(firstOrder.shippingPhone)}</p>
                )}
                {firstOrder?.shippingPostalCode && (
                  <p className="text-xs text-gray-500">〒 {firstOrder.shippingPostalCode}</p>
                )}
                <p className="text-sm text-gray-700 leading-relaxed">{firstOrder?.shippingAddress}</p>
              </div>
            </div>

            {/* 관리자 메모 */}
            {firstOrder?.adminNotes && (
              <div className="bg-yellow-50 rounded-xl border border-yellow-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-yellow-100">
                  <h2 className="font-semibold text-yellow-800 flex items-center gap-2 text-sm">
                    <MessageSquare className="w-4 h-4" />
                    관리자 메모
                  </h2>
                </div>
                <div className="p-4">
                  <p className="text-sm text-yellow-700 leading-relaxed">{firstOrder.adminNotes}</p>
                </div>
              </div>
            )}
          </div>
          </div>{/* grid end */}
        </div>
      </div>

      {/* ── 배송 추적 팝업 (TrackingTimelineModal) ── */}
      {timelineModal && (
        <TrackingTimelineModal
          open={timelineModal.open}
          onClose={() => setTimelineModal(null)}
          trackingNumber={timelineModal.trackingNumber}
          orderStatus={timelineModal.status}
          productName={timelineModal.productName}
          orderId={timelineModal.orderId}
          carrier={timelineModal.carrier}
          shippingName={timelineModal.shippingName}
        />
      )}
    </AdminLayout>
  );
}
