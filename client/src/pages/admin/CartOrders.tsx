import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import TrackingTimelineModal from "@/components/TrackingTimelineModal";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingCart, Search, RefreshCw, ChevronDown, ChevronUp,
  Package, Truck, CheckCircle, Clock, XCircle, User, MapPin,
  CreditCard, Calendar, FileText, ChevronLeft, ChevronRight,
  AlertCircle, SortAsc, SortDesc, Box, CheckSquare, Square,
  Download, Upload, FileSpreadsheet, Mail, AlertTriangle, ExternalLink,
  ArrowUpDown, X, Eye,
} from "lucide-react";

// ─── 상수 ────────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:             { label: "입금 대기", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock className="w-3 h-3" /> },
  paid:                { label: "결제 완료", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <CreditCard className="w-3 h-3" /> },
  confirmed:           { label: "주문 확인", color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: <CheckCircle className="w-3 h-3" /> },
  shipped:             { label: "배송 중", color: "bg-orange-100 text-orange-800 border-orange-200", icon: <Truck className="w-3 h-3" /> },
  delivered:           { label: "배송 완료", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="w-3 h-3" /> },
  completed:           { label: "주문 완료", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle className="w-3 h-3" /> },
  cancelled:           { label: "취소", color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="w-3 h-3" /> },
  partially_cancelled: { label: "부분 취소", color: "bg-pink-100 text-pink-800 border-pink-200", icon: <AlertCircle className="w-3 h-3" /> },
};

const PAYMENT_LABELS: Record<string, string> = {
  card: "카드", bank_transfer: "무통장입금", stripe: "카드(Stripe)", point: "포인트",
};

const CARRIER_OPTIONS = [
  { value: "", label: "택배사 선택" },
  { value: "yamato", label: "야마토운수 (クロネコヤマト)" },
  { value: "sagawa", label: "사가와 (佐川急便)" },
  { value: "japanpost", label: "일본우편 (日本郵便)" },
  { value: "fukuyama", label: "후쿠야마통운 (福山通運)" },
  { value: "seino", label: "세이노운수 (西濃運輸)" },
  { value: "nittsu", label: "닛쓰 (日通)" },
  { value: "dhl", label: "DHL" },
  { value: "fedex", label: "FedEx" },
  { value: "ups", label: "UPS" },
  { value: "ems", label: "EMS" },
  { value: "other", label: "기타" },
];

// 17track.net을 사용하여 송장번호만으로 자동 감지 배송조회
const get17TrackingUrl = (trackingNumber: string): string => {
  return `https://www.17track.net/en/track?nums=${trackingNumber}`;
};

// ─── 배송 추적 상태 상수 ──────────────────────────────────────────────────────
const SHIPMENT_STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string; progress: number }> = {
  pending:          { label: "배송 준비", color: "text-gray-600", bgColor: "bg-gray-100", progress: 10 },
  picked_up:        { label: "집하 완료", color: "text-blue-600", bgColor: "bg-blue-50", progress: 30 },
  in_transit:       { label: "운송 중", color: "text-indigo-700", bgColor: "bg-indigo-50", progress: 55 },
  out_for_delivery: { label: "배달 예정", color: "text-orange-600", bgColor: "bg-orange-50", progress: 80 },
  delivered:        { label: "배달 완료", color: "text-green-700", bgColor: "bg-green-50", progress: 100 },
  failed:           { label: "배달 실패", color: "text-red-600", bgColor: "bg-red-50", progress: 70 },
  returned:         { label: "반송 중", color: "text-pink-600", bgColor: "bg-pink-50", progress: 40 },
};

function getCarrierShortName(carrier: string): string {
  const c = (carrier || '').toLowerCase();
  if (c.includes('yamato') || c.includes('クロネコ') || c.includes('야마토')) return 'YMT';
  if (c.includes('sagawa') || c.includes('佐川') || c.includes('사가와')) return 'SGW';
  if (c.includes('japanpost') || c.includes('japan post') || c.includes('日本郵便') || c.includes('일본우편') || c === 'japan post') return 'JP';
  if (c.includes('fukuyama') || c.includes('福山') || c.includes('후쿠야마')) return 'FKY';
  if (c.includes('seino') || c.includes('西濃') || c.includes('세이노')) return 'SNO';
  if (c.includes('nittsu') || c.includes('日通') || c.includes('닛쓰')) return 'NTT';
  if (c.includes('dhl')) return 'DHL';
  if (c.includes('fedex')) return 'FDX';
  if (c.includes('ups')) return 'UPS';
  if (c.includes('ems')) return 'EMS';
  if (c) return c.slice(0, 3).toUpperCase();
  return 'JP';
}

function ShipmentStatusBadge({ status, carrier }: { status: string; carrier: string | null }) {
  const s = SHIPMENT_STATUS_LABELS[status] || { label: status, color: "text-gray-600", bgColor: "bg-gray-100", progress: 0 };
  const isDelivered = status === 'delivered';
  const isFailed = status === 'failed';
  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${s.bgColor} ${isDelivered ? 'border-green-200' : isFailed ? 'border-red-200' : 'border-indigo-100'} whitespace-nowrap`}>
      <Truck className={`w-2.5 h-2.5 flex-shrink-0 ${s.color}`} />
      <span className={`text-[9px] font-semibold ${s.color}`}>{s.label}</span>
      {carrier && <span className="text-[9px] text-gray-400 font-mono">{carrier}</span>}
    </div>
  );
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || { label: status, color: "bg-gray-100 text-gray-700 border-gray-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-medium border ${s.color}`} style={{fontSize: '10px'}}>
      {s.label}
    </span>
  );
}

function DeliveryProgressBar({ status, shippedCount, totalCount }: { status: string; shippedCount: number; totalCount: number }) {
  const steps = [
    { key: "pending", label: "입금대기" },
    { key: "paid", label: "결제완료" },
    { key: "confirmed", label: "준비중" },
    { key: "shipped", label: "배송중" },
    { key: "delivered", label: "배송완료" },
    { key: "completed", label: "완료" },
  ];
  const ORDER = ["pending", "paid", "confirmed", "shipped", "delivered", "completed"];
  const currentIdx = ORDER.indexOf(status);
  const isCancelled = status === "cancelled" || status === "partially_cancelled";

  if (isCancelled) {
    return <span className="text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">취소됨</span>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const done = currentIdx >= idx;
          const current = currentIdx === idx;
          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all ${
                  current ? "bg-pink-600 text-white shadow-sm" :
                  done ? "bg-pink-200 text-pink-700" : "bg-gray-100 text-gray-400"
                }`}>
                  {done ? "✓" : idx + 1}
                </div>
                <span className={`text-[9px] mt-0.5 font-medium whitespace-nowrap ${
                  current ? "text-pink-600" : done ? "text-pink-400" : "text-gray-300"
                }`}>{step.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-4 h-0.5 mb-3 mx-0.5 ${currentIdx > idx ? "bg-pink-300" : "bg-gray-100"}`} />
              )}
            </div>
          );
        })}
      </div>
      {totalCount > 0 && shippedCount > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(shippedCount / totalCount) * 100}%` }} />
          </div>
          <span className="text-[10px] text-gray-500">송장 {shippedCount}/{totalCount}</span>
        </div>
      )}
    </div>
  );
}

function ItemTrackingRow({ item, orderId, orderStatus, shippingName }: { item: any; orderId: number; orderStatus?: string; shippingName?: string }) {
  const utils = trpc.useUtils();
  const [trackingNumber, setTrackingNumber] = useState(item.itemTrackingNumber || "");
  const [carrier, setCarrier] = useState(item.itemCarrier || "");
  const [editing, setEditing] = useState(!item.itemTrackingNumber); // 미입력 시 항상 활성화
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);

  const updateMutation = trpc.admin.updateItemTracking.useMutation({
    onSuccess: () => {
      toast.success(`${item.productNameJa || item.productName}의 송장번호가 저장되었습니다.`);
      utils.admin.getCartGroups.invalidate();
      setEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const hasTracking = item.itemTrackingNumber;

  return (
    <>
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${hasTracking ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.productNameJa} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.productNameJa || item.productName}</p>
          {item.tierName && <p className="text-xs text-gray-500">{item.tierName}</p>}
          <p className="text-xs text-gray-500">수량: {item.quantity}개 · 단가: ¥{Number(item.unitPrice).toLocaleString()} · 소계: <span className="font-semibold text-gray-700">¥{(Number(item.unitPrice) * Number(item.quantity)).toLocaleString()}</span></p>
        </div>
        {editing ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="송장번호 입력" className="w-40 h-7 text-xs" />
            <Button size="sm" className="h-7 text-xs bg-pink-600 hover:bg-pink-700" onClick={() => updateMutation.mutate({ orderId, orderItemId: item.id, trackingNumber: trackingNumber || "", carrier: carrier || "Japan Post" })} disabled={updateMutation.isPending}>저장</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditing(false); setTrackingNumber(item.itemTrackingNumber || ""); }}>취소</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasTracking ? (
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-green-600 font-mono">{item.itemTrackingNumber}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setTrackingModalOpen(true); }}
                    className="inline-flex items-center gap-0.5 text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-medium transition-colors"
                    title="배송 타임라인 보기"
                  >
                    <Truck className="w-2.5 h-2.5" />
                    배송추적
                  </button>
                </div>
                <Button size="sm" variant="outline" className="h-6 text-xs mt-1" onClick={() => setEditing(true)}>수정</Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {hasTracking && (
        <TrackingTimelineModal
          open={trackingModalOpen}
          onClose={() => setTrackingModalOpen(false)}
          trackingNumber={item.itemTrackingNumber}
          orderStatus={orderStatus || "shipped"}
          productName={item.productNameJa || item.productName}
          orderId={orderId}
          carrier={item.itemCarrier}
          shippingName={shippingName}
        />
      )}
    </>
  );
}

// ─── 장바구니 그룹 행 ─────────────────────────────────────────────────────────
function CartGroupRow({
  group,
  onViewDetail,
  selected,
  onToggleSelect,
  onConfirmBank,
  trackingNumber,
  onTrackingChange,
}: {
  group: any;
  onViewDetail: (id: string) => void;
  selected: boolean;
  onToggleSelect: (cartGroupId: string, orderIds: number[]) => void;
  onConfirmBank?: (orderIds: number[]) => void;
  trackingNumber: string;
  onTrackingChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();
  const allItems = group.orders.flatMap((o: any) => o.itemsWithImages || []);
  const shippedCount = allItems.filter((i: any) => i.itemTrackingNumber).length;
  const allOrderIds = group.orders.map((o: any) => o.id);
  const utils = trpc.useUtils();

  // 저장된 송장번호가 있으면 초기값으로 설정
  const displayTrackingNumber = trackingNumber || group.groupTrackingNumber || "";

  return (
    <div className={`border rounded-xl overflow-hidden hover:shadow-md transition-shadow ${selected ? "border-pink-400 bg-pink-50/30" : "border-gray-200 bg-white"}`}>
      {/* 그룹 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3" style={{paddingTop: '10px', paddingBottom: '10px'}}>
        {/* 체크박스 */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(group.cartGroupId, allOrderIds); }}
          className="flex-shrink-0 text-gray-400 hover:text-pink-600"
        >
          {selected ? <CheckSquare className="w-5 h-5 text-pink-600" /> : <Square className="w-5 h-5" />}
        </button>

        {/* 장바구니 번호 + 주문일시 */}
        <div className="w-[130px] flex-shrink-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div>
            <p className="font-bold text-pink-700 font-mono" style={{fontSize: '14px'}}>#{group.cartGroupId.slice(-8).toUpperCase()}</p>
            <p className="text-gray-400" style={{fontSize: '11px', marginTop: '-5px'}}>{new Date(group.createdAt).toLocaleString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>

        <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

        {/* 주문자 */}
        <div className="w-[120px] flex-shrink-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <p className="text-sm text-gray-900" style={{fontWeight: '400'}}>{group.shippingName || group.userName || "-"}</p>
          {group.userEmail && <p className="text-xs text-gray-400 truncate max-w-[120px]">{group.userEmail}</p>}
        </div>



        {/* 상품/주문 수 + 썸네일 */}
        <div className="w-[148px] flex-shrink-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-1">
            {allItems.slice(0, 3).map((item: any, idx: number) => (
              <div key={item.id || idx} className="w-8 h-8 rounded border border-gray-200 overflow-hidden bg-gray-100 flex-shrink-0">
                {item.imageUrl
                  ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
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
        </div>

        {/* 결제 금액 (최종 할인 후 결제 금액) */}
        <div className="w-[110px] flex-shrink-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>

          <p className="text-sm font-bold text-pink-700">¥{group.totalAmount.toLocaleString()}</p>
          {group.paymentMethod && <p className="text-gray-500" style={{fontSize: '10px'}}>{PAYMENT_LABELS[group.paymentMethod] || group.paymentMethod}</p>}
        </div>

        {/* 현재 상태 배지 + 입금확인 버튼 */}
        <div className="w-[90px] flex-shrink-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          {group.daysDelayed && group.daysDelayed > 0 && (
            <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold mb-0.5 ${
              group.daysDelayed >= 30 ? 'bg-red-100 text-red-700' :
              group.daysDelayed >= 21 ? 'bg-orange-100 text-orange-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              <Truck className="w-2.5 h-2.5" />
              {group.daysDelayed}일 지연
            </div>
          )}
          <StatusBadge status={group.status} />
          {group.status === "pending" && group.paymentMethod === "bank_transfer" && onConfirmBank && (
            <button
              className="mt-1 text-[9px] bg-pink-200 hover:bg-pink-300 text-purple-800 px-2 py-0.5 rounded-full font-medium transition-colors border border-purple-700"
              onClick={(e) => { e.stopPropagation(); onConfirmBank(allOrderIds); }} style={{fontSize: '10px'}}
            >
              입금확인
            </button>
          )}
        </div>

        {/* 송장번호 + 배송 상태 (나란히) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* 송장번호 입력 필드 */}
          <Input
            value={displayTrackingNumber}
            onChange={(e) => onTrackingChange(e.target.value)}
            placeholder="송장번호 입력"
            className="h-7 text-xs"
            style={{width: '120px'}}
          />
          {/* 배송 추적 상태 배지 (송장번호 있을 때만 표시) */}
          {group.groupShipmentStatus && group.groupShipmentStatus !== 'pending' && displayTrackingNumber && (
            <ShipmentStatusBadge
              status={group.groupShipmentStatus}
              carrier={getCarrierShortName(group.groupCarrier || '')}
            />
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); onViewDetail(group.cartGroupId); }}
            title="상세보기"
          >
            <FileText className="w-4 h-4" />
          </Button>
          <button className="p-1 rounded hover:bg-gray-100 transition-colors" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </button>
        </div>
      </div>

      {/* 펼쳐진 상품 목록 */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-2" style={{fontSize: '12px', fontWeight: '500', marginBottom: '0px'}}>💡 팁: 위의 "송장번호" 버튼에서 한 번에 모든 상품에 같은 송장번호를 적용할 수 있습니다. 상품별로 다른 송장번호가 필요한 경우 아래에서 개별 수정하세요.</p>
          </div>
          <div className="mb-3 flex items-center gap-2">
            <Box className="w-4 h-4 text-pink-600" />
            <span className="text-sm font-semibold text-gray-700">상품별 송장번호 관리</span>
            <span className="text-xs text-gray-500">({shippedCount}/{group.itemCount} 입력 완료)</span>
          </div>
          <div className="space-y-2">
            {group.orders.map((order: any) => (
              <div key={order.id}>
                {order.itemsWithImages && order.itemsWithImages.length > 0 && (
                  <div className="space-y-2">
                    {/* 주문번호 헤더 */}
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-[11px] font-semibold text-gray-500">주문번호:</span>
                      <button
                        className="text-[11px] font-mono text-pink-700 font-bold hover:text-pink-500 hover:underline cursor-pointer transition-colors"
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/cart-orders/${group.cartGroupId.replace(/^#/, '')}`); }}
                        title="주문 상세 페이지로 이동"
                      >
                        #{order.orderNumber || order.id}
                      </button>
                    </div>
                    {order.itemsWithImages.slice(0, 3).map((item: any) => (
                      <ItemTrackingRow key={item.id} item={item} orderId={order.id} orderStatus={group.status} shippingName={group.shippingName} />
                    ))}
                    {order.itemsWithImages.length > 3 && (
                      <div className="text-xs text-gray-500 px-3 py-2 bg-white rounded border border-gray-200">+{order.itemsWithImages.length - 3}개 상품</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* 결제 금액 요약 */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">결제 금액 요약</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>총 결제금액</span>
                <span>¥{Number(group.totalAmount).toLocaleString()}</span>
              </div>
              {group.couponDiscount > 0 && (
                <div className="flex justify-between text-xs text-orange-600">
                  <span>쿠폰 할인</span>
                  <span className="font-bold">-¥{Number(group.couponDiscount).toLocaleString()}</span>
                </div>
              )}
              {group.pointsUsed > 0 && (
                <div className="flex justify-between text-xs text-blue-600">
                  <span>포인트 할인</span>
                  <span className="font-bold">-¥{Number(group.pointsUsed).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-bold text-gray-900 border-t border-gray-300 pt-1 mt-1">
                <span>최종 결제금액</span>
                <span className="text-pink-700">¥{(Number(group.totalAmount) - Number(group.couponDiscount || 0) - Number(group.pointsUsed || 0)).toLocaleString()}</span>
              </div>
            </div>
          </div>
          {/* 할인 정보 (쿠폰/포인트 있을 때만) */}
          {(group.couponDiscount > 0 || group.pointsUsed > 0) && (
            <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs font-semibold text-yellow-700 mb-1">할인 정보</p>
              {group.couponDiscount > 0 && (
                <p className="text-xs text-yellow-800">구매 쿠폰 할인: <span className="font-bold">-¥{Number(group.couponDiscount).toLocaleString()}</span></p>
              )}
              {group.pointsUsed > 0 && (
                <p className="text-xs text-yellow-800">포인트 사용: <span className="font-bold">-¥{Number(group.pointsUsed).toLocaleString()}</span></p>
              )}
            </div>
          )}
          {/* 배송지 정보 */}
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" />배송지 정보
            </p>
            <p className="text-sm text-gray-800">{group.shippingName} · {group.shippingPhone ? group.shippingPhone.replace(/^(\d{2,4})(\d{3,4})(\d{4})$/, '$1-$2-$3') : '-'}</p>
            <p className="text-sm text-gray-600">{group.shippingPostalCode ? `〒${group.shippingPostalCode} ` : ''}{group.shippingAddress}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 배송지연 탭 ──────────────────────────────────────────────────────────────
function DelayedOrdersTab() {
  const [, navigate] = useLocation();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const { data: delayedData, isLoading, refetch } = trpc.admin.delayedOrders.useQuery();

  const sendEmailMutation = trpc.admin.sendDelayedShipmentEmails.useMutation({
    onSuccess: (data) => {
      setShowEmailDialog(false);
      setSelectedIds(new Set());
      toast.success(`이메일 발송 완료: 성공 ${data.successCount}건${data.failCount > 0 ? `, 실패 ${data.failCount}건` : ""}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const orders = delayedData || [];

  return (
    <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
      <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-red-700">배송 지연 주문 (발송 후 14일 이상 경과)</span>
          {orders.length > 0 && <span className="text-xs text-red-500">{orders.length}건</span>}
          {selectedIds.size > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{selectedIds.size}건 선택</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {orders.length > 0 && (
            <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600" onClick={() => setShowEmailDialog(true)}>
              <Mail className="w-3 h-3 mr-1" />
              {selectedIds.size > 0 ? `${selectedIds.size}건 이메일 발송` : "전체 이메일 발송"}
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50" onClick={() => refetch()}>새로고침</Button>
        </div>
      </div>

      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 w-8">
              <input type="checkbox" className="rounded cursor-pointer"
                checked={orders.length > 0 && selectedIds.size === orders.length}
                onChange={(e) => setSelectedIds(e.target.checked ? new Set(orders.map((o: any) => o.id)) : new Set())}
              />
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">주문번호</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">주문자</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">수취인</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">금액</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">발송일</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">지연 일수</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">송장번호</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <tr><td colSpan={9} className="py-12 text-center text-gray-400"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2" />로딩 중...</td></tr>
          ) : orders.length === 0 ? (
            <tr><td colSpan={9} className="py-12 text-center text-gray-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm">배송 지연 주문이 없습니다.</p>
            </td></tr>
          ) : orders.map((order: any) => (
            <tr key={order.id} className={`hover:bg-red-50 cursor-pointer ${selectedIds.has(order.id) ? "bg-orange-50" : ""}`}
              onClick={() => navigate(`/admin/cart-orders/${order.cartGroupId || order.id}`)}>
              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" className="rounded cursor-pointer"
                  checked={selectedIds.has(order.id)}
                  onChange={(e) => {
                    const next = new Set(selectedIds);
                    if (e.target.checked) next.add(order.id); else next.delete(order.id);
                    setSelectedIds(next);
                  }}
                />
              </td>
              <td className="px-2 py-2">
                <p className="text-sm font-mono text-gray-900">{order.orderNumber}</p>
                {order.cartGroupId && <p className="text-xs text-pink-600 font-medium">{order.cartGroupId}</p>}
                <p className="text-xs text-gray-400">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("ko-KR") : "-"}</p>
              </td>
              <td className="px-2 py-2"><p className="text-sm text-gray-900">{order.userName || "-"}</p><p className="text-xs text-gray-400">{order.userEmail || ""}</p></td>
              <td className="px-2 py-2"><p className="text-sm text-gray-900">{order.shippingName}</p><p className="text-xs text-gray-400">{order.shippingPhone || ""}</p></td>
              <td className="px-2 py-2"><p className="text-sm font-semibold text-gray-900">¥{Number(order.totalAmount).toLocaleString()}</p></td>
              <td className="px-2 py-2"><p className="text-sm text-gray-600">{order.shippedAt ? new Date(order.shippedAt).toLocaleDateString("ko-KR") : "-"}</p></td>
              <td className="px-2 py-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full ${
                  order.daysDelayed >= 30 ? "bg-red-100 text-red-700" :
                  order.daysDelayed >= 21 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"
                }`}>{order.daysDelayed}일 지연</span>
              </td>
              <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                {order.shipment ? (
                   <div className="flex items-center gap-1">
                     <span className="text-xs text-gray-600 font-mono">{order.shipment.trackingNumber}</span>
                     <a href={get17TrackingUrl(order.shipment.trackingNumber)} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="17track에서 배송 추적">
                       <ExternalLink className="w-3 h-3" />
                     </a>
                   </div>
                ) : <span className="text-xs text-gray-300 italic">미입력</span>}
              </td>
              <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/admin/cart-orders/${order.cartGroupId || order.id}`)}>
                  <Eye className="w-3 h-3 mr-1" />상세
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 이메일 발송 확인 다이얼로그 */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-orange-500" />배송 지연 이메일 발송</DialogTitle>
            <DialogDescription>
              {selectedIds.size > 0 ? `선택한 ${selectedIds.size}건` : `전체 ${orders.length}건`}의 배송 지연 고객에게 안내 이메일을 발송합니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>취소</Button>
            <Button className="bg-orange-500 hover:bg-orange-600"
              disabled={sendEmailMutation.isPending}
              onClick={() => sendEmailMutation.mutate({
                orderIds: selectedIds.size > 0 ? Array.from(selectedIds) : orders.map((o: any) => o.id),
              })}>
              {sendEmailMutation.isPending ? "발송 중..." : "이메일 발송"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────────────────────────────
export default function CartOrders() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"orders" | "delayed">("orders");

  // 필터 상태
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // 선택된 장바구니 그룹
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());

  // 송장번호 입력 상태 관리 (cartGroupId -> trackingNumber)
  const [trackingNumbers, setTrackingNumbers] = useState<Record<string, string>>({});

  // 일괄 상태 변경 다이얼로그
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");

  // CSV 다이얼로그
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [csvEntries, setCsvEntries] = useState<{ orderNumber: string; trackingNumber: string; carrier: string }[]>([]);
  const [csvResults, setCsvResults] = useState<{ orderNumber: string; success: boolean; message: string }[] | null>(null);
  const [csvFileName, setCsvFileName] = useState("");

  // 입금확인 결과 다이얼로그
  const [showBankConfirmDialog, setShowBankConfirmDialog] = useState(false);
  const [bankConfirmResults, setBankConfirmResults] = useState<any>(null);

  const queryParams = useMemo(() => ({
    page,
    limit: LIMIT,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    paymentMethod: paymentMethodFilter !== "all" ? paymentMethodFilter : undefined,
    sortOrder,
  }), [page, statusFilter, search, dateFrom, dateTo, paymentMethodFilter, sortOrder]);

  const { data, isLoading, refetch } = trpc.admin.getCartGroups.useQuery(queryParams);
  const groups = data?.groups || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);

  const { data: statusCounts } = trpc.admin.orderStatusCounts.useQuery();

  // Mutations
  const bulkUpdateMutation = trpc.admin.bulkUpdateStatus.useMutation({
    onSuccess: (result) => {
      toast.success(`${result?.success ?? 0}건 상태 변경 완료${(result?.failed ?? 0) > 0 ? `, ${result.failed}건 실패` : ""}`);
      setSelectedGroups(new Set());
      setSelectedOrderIds(new Set());
      setShowBulkDialog(false);
      setBulkStatus("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkConfirmBankMutation = trpc.admin.bulkConfirmBankTransfer.useMutation({
    onSuccess: (result) => {
      setBankConfirmResults(result);
      setShowBankConfirmDialog(true);
      if (result.success > 0) {
        toast.success(`${result.success}건 입금 확인 완료${result.skipped > 0 ? `, ${result.skipped}건 스킵` : ""}`);
        setSelectedGroups(new Set());
        setSelectedOrderIds(new Set());
        refetch();
      } else {
        toast.warning(`처리된 건이 없습니다. (${result.skipped}건 스킵)`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const exportMutation = trpc.admin.exportOrders.useMutation({
    onSuccess: (result) => {
      if (result.count === 0) { toast.info("내보낼 주문이 없습니다."); return; }
      const headers = ["주문번호", "상태", "주문일시", "고객명", "이메일", "전화번호", "총액", "배송비", "포인트사용", "배송성명", "우편번호", "배송주소", "배송전화", "추적번호", "운송사", "결제방법", "상품내역", "관리자메모"];
      const rows = result.data.map((o: any) => [
        o.orderNumber, o.status, o.createdAt ? new Date(o.createdAt).toLocaleString("ko-KR") : "",
        o.userName, o.userEmail, o.userPhone, o.totalAmount, o.shippingFee, o.pointsUsed,
        o.shippingName, o.shippingZip, o.shippingAddress, o.shippingPhone,
        o.trackingNumber, o.carrier, o.paymentMethod, o.itemsSummary, o.adminMemo,
      ]);
      const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${result.count}건 내보내기 완료`);
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkTrackingMutation = trpc.admin.bulkUpdateTracking.useMutation({
    onSuccess: (result) => {
      setCsvResults(result.results);
      toast.success(`${result.success}건 성공, ${result.failed}건 실패`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // 선택된 장바구니들의 송장번호 일괄 저장
  const bulkSaveTrackingMutation = trpc.admin.bulkSaveCartGroupTracking.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.success}건 송장번호 저장 완료${result.failed > 0 ? `, ${result.failed}건 실패` : ""}`);
      // trackingNumbers 상태를 초기화하지 않음 - refetch 후 group.groupTrackingNumber로 표시됨
      setSelectedGroups(new Set());
      setSelectedOrderIds(new Set());
      utils.admin.getCartGroups.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // 핸들러
  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleReset = () => {
    setSearchInput(""); setSearch(""); setStatusFilter("all"); setPaymentMethodFilter("all");
    setDateFrom(""); setDateTo(""); setSortOrder("desc"); setPage(1);
    setSelectedGroups(new Set()); setSelectedOrderIds(new Set());
  };

  const setDateRange = (days: number) => {
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    if (days === -1) { setDateFrom(""); setDateTo(""); }
    else if (days === 0) { setDateFrom(toStr); setDateTo(toStr); }
    else {
      const from = new Date(today); from.setDate(today.getDate() - days);
      setDateFrom(from.toISOString().slice(0, 10)); setDateTo(toStr);
    }
    setPage(1);
  };

  const handleToggleSelect = (cartGroupId: string, orderIds: number[]) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(cartGroupId)) {
        next.delete(cartGroupId);
        setSelectedOrderIds(prev2 => { const n2 = new Set(prev2); orderIds.forEach(id => n2.delete(id)); return n2; });
      } else {
        next.add(cartGroupId);
        setSelectedOrderIds(prev2 => { const n2 = new Set(prev2); orderIds.forEach(id => n2.add(id)); return n2; });
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedGroups.size === groups.length) {
      setSelectedGroups(new Set());
      setSelectedOrderIds(new Set());
    } else {
      const allGroupIds = new Set(groups.map((g: any) => g.cartGroupId));
      const allOrderIds = new Set(groups.flatMap((g: any) => g.orders.map((o: any) => o.id)));
      setSelectedGroups(allGroupIds);
      setSelectedOrderIds(allOrderIds);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvResults(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const entries: { orderNumber: string; trackingNumber: string; carrier: string }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        if (cols.length >= 2 && cols[0] && cols[1]) {
          entries.push({ orderNumber: cols[0], trackingNumber: cols[1], carrier: cols[2] || "japanpost" });
        }
      }
      setCsvEntries(entries);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadCsvTemplate = () => {
    const csv = "orderNumber,trackingNumber,carrier\nORD-20260101-XXXXX,JP1234567890,japanpost\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "tracking_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const STATUS_TABS = [
    { key: "all", label: "전체", count: statusCounts?.all },
    { key: "pending", label: "입금대기", count: statusCounts?.pending },
    { key: "paid", label: "결제완료", count: statusCounts?.paid },
    { key: "confirmed", label: "주문확인", count: statusCounts?.confirmed },
    { key: "shipped", label: "배송중", count: statusCounts?.shipped },
    { key: "delivered", label: "배송완료", count: statusCounts?.delivered },
    { key: "completed", label: "완료", count: (statusCounts as any)?.completed },
    { key: "cancelled", label: "취소", count: statusCounts?.cancelled },
  ];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-pink-600 to-pink-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />장바구니 주문 관리
              </h1>
              <p className="text-pink-100 text-sm mt-1">장바구니 단위로 주문을 통합 관리합니다</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
                <p className="text-pink-100 text-xs">전체 장바구니</p>
                <p className="text-white text-xl font-bold">{total.toLocaleString()}</p>
              </div>
              <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => exportMutation.mutate({ status: statusFilter !== "all" ? statusFilter : undefined, search: search || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })}
                disabled={exportMutation.isPending}>
                <Download className="w-4 h-4 mr-1" />{exportMutation.isPending ? "내보내는 중..." : "CSV 내보내기"}
              </Button>
              <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => { setShowCsvDialog(true); setCsvEntries([]); setCsvResults(null); setCsvFileName(""); }}>
                <Upload className="w-4 h-4 mr-1" />CSV 송장 등록
              </Button>
              <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-1" />새로고침
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* 탭 */}
          <div className="flex items-center gap-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "orders" ? "border-pink-600 text-pink-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >전체 주문</button>
            <button
              onClick={() => setActiveTab("delayed")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "delayed" ? "border-red-500 text-red-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              <Truck className="w-4 h-4" />배송 지연
            </button>
          </div>

          {activeTab === "delayed" ? (
            <DelayedOrdersTab />
          ) : (
            <>
              {/* 상태 탭 */}
              <div className="flex gap-1 flex-wrap">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      statusFilter === tab.key
                        ? "bg-pink-600 text-white shadow-sm"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-pink-300 hover:text-pink-600"
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`rounded-full px-1.5 py-0.5 text-xs ${statusFilter === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* 검색/필터 패널 */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* 검색어 */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="주문번호, 장바구니번호, 수취인명, 전화번호 검색..."
                        className="pl-9 h-9"
                      />
                    </div>
                    <Button size="sm" className="h-9 bg-pink-600 hover:bg-pink-700" onClick={handleSearch}>
                      <Search className="w-4 h-4 mr-1" />검색
                    </Button>
                    <Button variant="outline" size="sm" className="h-9" onClick={handleReset}>
                      <X className="w-4 h-4 mr-1" />초기화
                    </Button>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {/* 주문일자 */}
                  <div className="flex items-center px-4 py-3 gap-4 flex-wrap">
                    <span className="w-20 shrink-0 text-sm font-medium text-gray-600">주문일자</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />
                      <span className="text-gray-400 text-sm">~</span>
                      <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />
                      {[{ label: "오늘", days: 0 }, { label: "7일", days: 7 }, { label: "14일", days: 14 }, { label: "1개월", days: 30 }, { label: "3개월", days: 90 }, { label: "전체", days: -1 }].map(({ label, days }) => (
                        <button key={label} onClick={() => setDateRange(days)}
                          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 text-gray-600 whitespace-nowrap">
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 결제수단 */}
                  <div className="flex items-center px-4 py-3 gap-4">
                    <span className="w-20 shrink-0 text-sm font-medium text-gray-600">결제수단</span>
                    <div className="flex items-center gap-4">
                      {[{ value: "all", label: "전체" }, { value: "stripe", label: "카드결제" }, { value: "bank_transfer", label: "무통장 입금" }].map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="paymentMethod" checked={paymentMethodFilter === value}
                            onChange={() => { setPaymentMethodFilter(value); setPage(1); }} className="accent-pink-600" />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 정렬 */}
                  <div className="flex items-center px-4 py-3 gap-4">
                    <span className="w-20 shrink-0 text-sm font-medium text-gray-600">정렬</span>
                    <Button variant="outline" size="sm" className="h-8"
                      onClick={() => { setSortOrder(sortOrder === "desc" ? "asc" : "desc"); setPage(1); }}>
                      {sortOrder === "desc" ? <SortDesc className="w-4 h-4 mr-1" /> : <SortAsc className="w-4 h-4 mr-1" />}
                      {sortOrder === "desc" ? "최신순" : "오래된순"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 일괄 처리 바 */}
              {selectedGroups.size > 0 && (
                <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-pink-700 font-medium">{selectedGroups.size}개 장바구니 선택 ({selectedOrderIds.size}건 주문)</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="border-orange-400 text-orange-700 hover:bg-orange-50 h-8"
                      onClick={() => {
                        const entries = Array.from(selectedGroups).map(cartGroupId => ({
                          cartGroupId,
                          trackingNumber: trackingNumbers[cartGroupId] || ""
                        })).filter(e => e.trackingNumber.trim());
                        if (entries.length === 0) {
                          toast.warning("송장번호를 입력해주세요.");
                          return;
                        }
                        bulkSaveTrackingMutation.mutate({ entries });
                      }}
                      disabled={bulkSaveTrackingMutation.isPending}>
                      {bulkSaveTrackingMutation.isPending ? "저장 중..." : "송장번호 일괄 저장"}
                    </Button>
                    <Button size="sm" variant="outline" className="border-green-400 text-green-700 hover:bg-green-50 h-8"
                      onClick={() => bulkConfirmBankMutation.mutate({ orderIds: Array.from(selectedOrderIds) })}
                      disabled={bulkConfirmBankMutation.isPending}>
                      {bulkConfirmBankMutation.isPending ? "처리 중..." : "일괄 입금확인"}
                    </Button>
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 h-8"
                      onClick={() => bulkUpdateMutation.mutate({ orderIds: Array.from(selectedOrderIds), status: "confirmed" })}
                      disabled={bulkUpdateMutation.isPending}>
                      일괄 주문확인
                    </Button>
                    <Button size="sm" variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 h-8"
                      onClick={() => bulkUpdateMutation.mutate({ orderIds: Array.from(selectedOrderIds), status: "shipped" })}
                      disabled={bulkUpdateMutation.isPending}>
                      일괄 발송처리
                    </Button>
                    <Button size="sm" variant="outline" className="border-pink-300 text-pink-600 hover:bg-pink-100 h-8"
                      onClick={() => setShowBulkDialog(true)}>
                      기타 상태 변경
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8"
                      onClick={() => { setSelectedGroups(new Set()); setSelectedOrderIds(new Set()); }}>
                      선택 해제
                    </Button>
                  </div>
                </div>
              )}

              {/* 목록 헤더 */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <button onClick={handleSelectAll} className="text-gray-400 hover:text-pink-600 transition-colors">
                    {selectedGroups.size === groups.length && groups.length > 0
                      ? <CheckSquare className="w-5 h-5 text-pink-600" />
                      : <Square className="w-5 h-5" />}
                  </button>
                  <span className="text-sm text-gray-500">총 {total}건</span>
                  {selectedGroups.size > 0 && <span className="text-sm text-pink-600 font-medium">({selectedGroups.size}개 선택)</span>}
                </div>
              </div>

              {/* 장바구니 그룹 목록 */}
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">주문이 없습니다</p>
                  <p className="text-gray-400 text-sm mt-1">검색 조건을 변경해보세요</p>
                </div>
              ) : (
                <div>
                  {/* 테이블 헤더 */}
                  <div className="hidden md:flex items-center gap-3 px-4 py-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-200">
                    <div className="w-5 flex-shrink-0" />
                    <div className="w-[130px] flex-shrink-0">장바구니 / 일시</div>
                    <div className="w-px" />
                    <div className="w-[120px] flex-shrink-0">주문자</div>
                    <div className="w-[148px] flex-shrink-0">상품</div>
                    <div className="w-[110px] flex-shrink-0">결제금액</div>
                    <div className="w-[90px] flex-shrink-0">상태</div>
                    <div className="ml-auto w-[72px] flex-shrink-0 text-right">액션</div>
                  </div>
                  <div className="space-y-1">
                  {groups.map((group: any) => (
                    <CartGroupRow
                      key={group.cartGroupId}
                      group={group}
                      onViewDetail={(id) => navigate(`/admin/cart-orders/${id.replace(/^#/, "")}`)}
                      selected={selectedGroups.has(group.cartGroupId)}
                      onToggleSelect={handleToggleSelect}
                      onConfirmBank={(orderIds) => bulkConfirmBankMutation.mutate({ orderIds })}
                      trackingNumber={trackingNumbers[group.cartGroupId] || ""}
                      onTrackingChange={(value) => setTrackingNumbers(prev => ({ ...prev, [group.cartGroupId]: value }))}
                    />
                  ))}
                  </div>
                </div>
              )}

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) pageNum = i + 1;
                    else if (page <= 4) pageNum = i + 1;
                    else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
                    else pageNum = page - 3 + i;
                    return (
                      <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm"
                        className={page === pageNum ? "bg-pink-600 hover:bg-pink-700" : ""}
                        onClick={() => setPage(pageNum)}>
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-500 ml-2">{page} / {totalPages} 페이지 (총 {total}건)</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 일괄 상태 변경 다이얼로그 */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일괄 상태 변경</DialogTitle>
            <DialogDescription>{selectedGroups.size}개 장바구니({selectedOrderIds.size}건 주문)의 상태를 변경합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {["pending", "paid", "confirmed", "shipped", "delivered", "cancelled"].map(s => (
              <label key={s} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                <input type="radio" name="bulkStatus" value={s} checked={bulkStatus === s} onChange={() => setBulkStatus(s)} className="accent-pink-600" />
                <StatusBadge status={s} />
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>취소</Button>
            <Button className="bg-pink-600 hover:bg-pink-700" disabled={!bulkStatus || bulkUpdateMutation.isPending}
              onClick={() => bulkUpdateMutation.mutate({ orderIds: Array.from(selectedOrderIds), status: bulkStatus as any })}>
              {bulkUpdateMutation.isPending ? "처리 중..." : "변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 입금확인 결과 다이얼로그 */}
      <Dialog open={showBankConfirmDialog} onOpenChange={setShowBankConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>입금 확인 결과</DialogTitle>
          </DialogHeader>
          {bankConfirmResults && (
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{bankConfirmResults.success}</p>
                  <p className="text-xs text-green-600">성공</p>
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-500">{bankConfirmResults.skipped}</p>
                  <p className="text-xs text-gray-400">스킵</p>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {bankConfirmResults.results?.map((r: any) => (
                  <div key={r.orderId} className={`flex items-center justify-between px-3 py-1.5 rounded text-xs ${r.success ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>
                    <span className="font-mono">{r.orderNumber}</span>
                    <span>{r.success ? "✓ 완료" : r.reason || "스킵"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowBankConfirmDialog(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV 일괄 송장 등록 다이얼로그 */}
      <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-green-600" />CSV 일괄 송장 등록</DialogTitle>
            <DialogDescription>CSV 파일로 여러 주문의 송장번호를 한 번에 등록합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                <Download className="w-4 h-4 mr-1" />템플릿 다운로드
              </Button>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span><Upload className="w-4 h-4 mr-1" />CSV 파일 선택</span>
                </Button>
                <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              </label>
              {csvFileName && <span className="text-sm text-gray-600">{csvFileName}</span>}
            </div>
            {csvEntries.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{csvEntries.length}건 파싱됨</p>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500">주문번호</th>
                        <th className="px-3 py-2 text-left text-gray-500">송장번호</th>
                        <th className="px-3 py-2 text-left text-gray-500">택배사</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvEntries.map((e, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 font-mono">{e.orderNumber}</td>
                          <td className="px-3 py-1.5">{e.trackingNumber}</td>
                          <td className="px-3 py-1.5">{e.carrier}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {csvResults && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">처리 결과</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {csvResults.map((r, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded text-xs ${r.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      <span className="font-mono">{r.orderNumber}</span>
                      <span>{r.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCsvDialog(false)}>닫기</Button>
            {csvEntries.length > 0 && !csvResults && (
              <Button className="bg-green-600 hover:bg-green-700"
                disabled={bulkTrackingMutation.isPending}
                onClick={() => bulkTrackingMutation.mutate({ entries: csvEntries })}>
                {bulkTrackingMutation.isPending ? "처리 중..." : `${csvEntries.length}건 일괄 등록`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
