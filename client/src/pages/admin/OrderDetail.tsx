import { useAuth } from"@/_core/hooks/useAuth";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Link, useParams, useLocation } from"wouter";
import { useState, useEffect } from"react";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from"@/components/ui/select";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from"@/components/ui/dialog";
import { toast } from"sonner";
import {
 ArrowLeft,
 Package,
 Truck,
 User,
 MapPin,
 Phone,
 Mail,
 CreditCard,
 Clock,
 FileText,
 Plus,
 Save,
 Edit,
 CheckCircle2,
 Circle,
 AlertCircle,
 XCircle,
 ExternalLink,
 RefreshCw,
 Globe,
 Navigation,
 Loader2,
 Scissors,
 RotateCcw,
 AlertTriangle,
} from"lucide-react";
import { Label } from"@/components/ui/label";import { Badge } from"@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { formatPrice } from"@/../../shared/utils/formatPrice";

const statusLabels: Record<string, string> = {
 pending:"입금전",
 paid:"결제완료",
 confirmed:"상품준비중",
 shipped:"배송중",
 delivered:"배송완료",
 completed:"주문완료",
 cancelled:"취소",
 partially_cancelled:"일부취소",
};

const statusColors: Record<string, string> = {
 pending:"bg-yellow-100 text-yellow-800 border-yellow-300",
 paid:"bg-green-100 text-green-800 border-green-300",
 confirmed:"bg-blue-100 text-blue-800 border-blue-300",
 shipped:"bg-indigo-100 text-indigo-800 border-indigo-300",
 delivered:"bg-gray-100 text-gray-700 border-gray-300",
 completed:"bg-teal-100 text-teal-800 border-teal-300",
 cancelled:"bg-red-100 text-red-800 border-red-300",
 partially_cancelled:"bg-orange-100 text-orange-800 border-orange-300",
};

const eventTypeLabels: Record<string, string> = {
 order_placed:"주문 접수",
 payment_confirmed:"결제 확인",
 processing:"처리 중",
 picked_up:"집하 완료",
 departed:"발송 완료",
 in_transit:"배송 중",
 out_for_delivery:"배달 예정",
 delivered:"배달 완료",
 failed:"배달 실패",
 returned:"반송 중",
};

const eventTypeIcons: Record<string, React.ReactNode> = {
 order_placed: <Circle className="h-4 w-4"/>,
 payment_confirmed: <CheckCircle2 className="h-4 w-4"/>,
 processing: <Clock className="h-4 w-4"/>,
 picked_up: <Package className="h-4 w-4"/>,
 departed: <Truck className="h-4 w-4"/>,
 in_transit: <Truck className="h-4 w-4"/>,
 out_for_delivery: <Truck className="h-4 w-4"/>,
 delivered: <CheckCircle2 className="h-4 w-4"/>,
 failed: <XCircle className="h-4 w-4"/>,
 returned: <AlertCircle className="h-4 w-4"/>,
};

const carrierTrackingUrls: Record<string, (num: string) => string> = {
"Japan Post": (num) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=ja`,
"Yamato": (num) => `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${num}`,
"Sagawa": (num) => `https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=${num}`,
"DHL": (num) => `https://www.dhl.com/jp-ja/home/tracking.html?tracking-id=${num}`,
"FedEx": (num) => `https://www.fedex.com/fedextrack/?trknbr=${num}`,
"EMS": (num) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=ja`,
};

const carrierLabels: Record<string, string> = {
"Japan Post":"일본 우편",
"Yamato":"야마토 운수",
"Sagawa":"사가와 급편",
"DHL":"DHL",
"FedEx":"FedEx",
"EMS":"EMS",
};

const shipmentStatusLabels: Record<string, { label: string; color: string }> = {
 pending: { label:"준비 중", color:"bg-gray-100 text-gray-700"},
 picked_up: { label:"집하 완료", color:"bg-blue-100 text-blue-700"},
 in_transit: { label:"운송 중", color:"bg-indigo-100 text-indigo-700"},
 out_for_delivery: { label:"배달 중", color:"bg-orange-100 text-orange-700"},
 delivered: { label:"배달 완료", color:"bg-green-100 text-green-700"},
};

const trackingSteps = [
 { key:"pending", label:"준비 중"},
 { key:"picked_up", label:"집하"},
 { key:"in_transit", label:"운송 중"},
 { key:"out_for_delivery", label:"배달 중"},
 { key:"delivered", label:"완료"},
];

export default function AdminOrderDetail() {
 const { user, loading } = useAuth();
 const params = useParams<{ id: string }>();
 const [, navigate] = useLocation();
 const orderId = parseInt(params.id ||"0");

 // State for editing
 const [editingShipment, setEditingShipment] = useState(false);
 const [shipmentForm, setShipmentForm] = useState({
 carrier:"",
 trackingNumber:"",
 estimatedDelivery:"",
 currentLocation:"",
 notes:"",
 });
 const [adminNotes, setAdminNotes] = useState("");
 const [editingNotes, setEditingNotes] = useState(false);
 const [showEventDialog, setShowEventDialog] = useState(false);
 const [newEvent, setNewEvent] = useState({ status:"", location:"", description:""});
 const [showStatusDialog, setShowStatusDialog] = useState(false);
 const [newStatus, setNewStatus] = useState("");

 const { data: isAdmin } = trpc.admin.isAdmin.useQuery(undefined, { enabled: !!user });

 const { data: order, isLoading, refetch } = trpc.admin.orderById.useQuery(
 { orderId },
 { enabled: isAdmin === true && orderId > 0 }
 );

 // Real-time Japan Post tracking
 const trackingNumber = order?.shipment?.trackingNumber || order?.trackingNumber;
 const carrier = order?.shipment?.carrier ||"Japan Post";
 const isJapanPost = carrier ==="Japan Post"|| carrier ==="EMS";

 const { data: liveTracking, isLoading: trackingLoading, refetch: refetchTracking } = trpc.japanPost.getTracking.useQuery(
 { trackingNumber: trackingNumber ||""},
 {
 enabled: isAdmin === true && !!trackingNumber && isJapanPost,
 staleTime: 5 * 60 * 1000,
 refetchOnWindowFocus: false,
 }
 );

 // Sync shipment mutation
 const syncMutation = trpc.japanPost.syncShipment.useMutation({
 onSuccess: (result) => {
 if (result.updated) {
 toast.success(`배송 정보가 동기화되었습니다: ${result.previousStatus} → ${result.currentStatus}`);
 } else {
 toast.info("배송 정보에 변경사항이 없습니다");
 }
 refetch();
 refetchTracking();
 },
 onError: (e) => {
 toast.error(`동기화 실패: ${e.message}`);
 },
 });

 const handleSync = async () => {
 if (!order?.id) return;
 syncMutation.mutate({ orderId: order.id });
 };

 const utils = trpc.useUtils();

 // Redirect to cart-orders detail if cartGroupId exists
 useEffect(() => {
 if (order && (order as any).cartGroupId) {
 const cgId = (order as any).cartGroupId as string;
 // Remove leading '#' for URL param, CartOrderDetail will add it back
 const urlParam = cgId.startsWith('#') ? cgId.slice(1) : cgId;
 navigate(`/admin/cart-orders/${urlParam}`, { replace: true });
 }
 }, [order, navigate]);

 // Initialize form values when order loads
 useEffect(() => {
 if (order) {
 setAdminNotes(order.adminNotes ||"");
 if (order.shipment) {
 setShipmentForm({
 carrier: order.shipment.carrier ||"Japan Post",
 trackingNumber: order.shipment.trackingNumber ||"",
 estimatedDelivery: order.shipment.estimatedDeliveryDate
 ? new Date(order.shipment.estimatedDeliveryDate).toISOString().split("T")[0]
 :"",
 currentLocation: order.shipment.currentLocation ||"",
 notes: order.shipment.notes ||"",
 });
 }
 }
 }, [order]);

 const updateStatusMutation = trpc.admin.updateOrderStatus.useMutation({
 onSuccess: () => {
 toast.success("주문 상태가 업데이트되었습니다");
 setShowStatusDialog(false);
 refetch();
 },
 onError: (e) => toast.error(e.message),
 });

 const updateNotesMutation = trpc.admin.updateAdminNotes.useMutation({
 onSuccess: () => {
 toast.success("관리자 메모가 저장되었습니다");
 setEditingNotes(false);
 refetch();
 },
 onError: (e) => toast.error(e.message),
 });

 const updateShipmentMutation = trpc.admin.updateShipmentInfo.useMutation({
 onSuccess: () => {
 toast.success("배송 정보가 업데이트되었습니다");
 setEditingShipment(false);
 refetch();
 },
 onError: (e) => toast.error(e.message),
 });

 const addEventMutation = trpc.admin.addShipmentEvent.useMutation({
 onSuccess: () => {
 toast.success("배송 이벤트가 추가되었습니다");
 setShowEventDialog(false);
 setNewEvent({ status:"", location:"", description:""});
 refetch();
 },
 onError: (e) => toast.error(e.message),
 });

 // ===== 부분 취소 state =====
 const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
 const [cancelSelectedItems, setCancelSelectedItems] = useState<Set<number>>(new Set());
 const [cancelReason, setCancelReason] = useState("");

 const cancelItemsMutation = trpc.admin.cancelItems.useMutation({
 onSuccess: (data) => {
 toast.success(`부분 취소 완료. 주문 상태: ${statusLabels[data.newStatus] || data.newStatus}`);
 utils.admin.orderById.invalidate({ orderId });
 refetch();
 setCancelDialogOpen(false);
 setCancelSelectedItems(new Set());
 setCancelReason("");
 },
 onError: (err) => toast.error(err.message),
 });

 const restoreItemMutation = trpc.admin.restoreItem.useMutation({
 onSuccess: () => {
 toast.success("상품 취소가 복원되었습니다.");
 utils.admin.orderById.invalidate({ orderId });
 refetch();
 },
 onError: (err) => toast.error(err.message),
 });

 const confirmBankTransferMutation = trpc.paymentSettings.confirmBankTransfer.useMutation({
 onSuccess: () => {
 toast.success("입금이 확인되었습니다. 주문 상태가 '주문 확정'으로 변경되었습니다.");
 refetch();
 },
 onError: (e) => toast.error(e.message),
 });

 const cancelBankTransferMutation = trpc.paymentSettings.cancelBankTransferConfirmation.useMutation({
 onSuccess: () => {
 toast.success("입금 확인이 취소되었습니다.");
 refetch();
 },
 onError: (e) => toast.error(e.message),
 });

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

 if (!order) {
 return (
 <AdminLayout>
 <div className="text-center py-12">
 <h1 className="text-2xl font-bold text-gray-800 mb-4">주문을 찾을 수 없습니다</h1>
 <Link href="/admin/orders"className="text-pink-600 hover:underline">주문 목록으로 돌아가기</Link>
 </div>
 </AdminLayout>
 );
 }

 const statusSteps = ["pending","paid","confirmed","shipped","delivered"];
 const currentStepIndex = statusSteps.indexOf(order.status);

 // Determine shipment tracking step
 const shipmentStatus = order.shipment?.status ||"pending";
 const trackingStepIndex = trackingSteps.findIndex(s => s.key === shipmentStatus);

 // Merge DB events + live tracking events into unified timeline
 const mergedTimeline: { time: number; label: string; location?: string; description?: string; source:"db"|"live"; icon: React.ReactNode }[] = [];

 // DB events
 if (order.shipmentEvents) {
 order.shipmentEvents.forEach((evt: any) => {
 mergedTimeline.push({
 time: new Date(evt.timestamp).getTime(),
 label: eventTypeLabels[evt.eventType] || evt.eventType,
 location: evt.location,
 description: evt.description,
 source:"db",
 icon: eventTypeIcons[evt.eventType] || <Circle className="h-4 w-4"/>,
 });
 });
 }

 // Live tracking events
 if (liveTracking?.events) {
 liveTracking.events.forEach((evt: any) => {
 mergedTimeline.push({
 time: new Date(evt.date).getTime(),
 label: evt.status,
 location: evt.location,
 description: evt.detail,
 source:"live",
 icon: <Globe className="h-4 w-4"/>,
 });
 });
 }

 // Sort by time descending (newest first)
 mergedTimeline.sort((a, b) => b.time - a.time);

 return (
 <AdminLayout>
 <div className="space-y-4 max-w-6xl">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Button variant="outline"size="sm"className="h-8 text-xs"onClick={() => navigate("/admin/orders")}>
 <ArrowLeft className="h-3.5 w-3.5 mr-1"/>
 주문 목록
 </Button>
 <div>
 <h2 className="text-xl font-bold text-gray-900">주문 #{order.orderNumber}</h2>
 <div className="flex items-center gap-2 mt-0.5">
 {(order as any).cartGroupId && (
 <button
 className="text-xs text-pink-600 font-medium bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200 hover:bg-pink-100 cursor-pointer transition-colors"
 title="이 장바구니의 다른 주문 보기"
 onClick={() => navigate(`/admin/orders?search=${encodeURIComponent((order as any).cartGroupId)}`)}
 >
 장바구니 {(order as any).cartGroupId}
 </button>
 )}
 <p className="text-xs text-gray-500">
 {new Date(order.createdAt).toLocaleString("ko-KR")}
 </p>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[order.status]}`}>
 {statusLabels[order.status]}
 </span>
 <Button
 size="sm"
 className="h-8 text-xs bg-pink-600 hover:bg-pink-700"
 onClick={() => {
 setNewStatus(order.status);
 setShowStatusDialog(true);
 }}
 >
 <Edit className="h-3.5 w-3.5 mr-1"/>
 상태 변경
 </Button>
 </div>
 </div>

 {/* Order Progress Bar */}
 {order.status !=="cancelled"&& (
 <Card>
 <CardContent className="pt-5 pb-5">
 <h3 className="text-xs font-semibold text-gray-700 mb-4">주문 진행 상태</h3>
 <div className="flex items-center justify-between">
 {statusSteps.map((step, index) => (
 <div key={step} className="flex items-center flex-1">
 <div className="flex flex-col items-center">
 <div
 className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
 index <= currentStepIndex
 ?"bg-pink-600 text-white"
 :"bg-gray-200 text-gray-500"
 }`}
 >
 {index + 1}
 </div>
 <span className={`text-[10px] mt-1 ${index <= currentStepIndex ?"text-pink-600 font-medium":"text-gray-400"}`}>
 {statusLabels[step]}
 </span>
 </div>
 {index < statusSteps.length - 1 && (
 <div className={`flex-1 h-0.5 mx-2 ${index < currentStepIndex ?"bg-pink-600":"bg-gray-200"}`} />
 )}
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 )}

 {/* ===== REAL-TIME TRACKING PANEL ===== */}
 {trackingNumber && (order.status ==="shipped"|| order.status ==="delivered") && (
 <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
 <div className="p-4 border-b border-blue-200 flex items-center justify-between">
 <h3 className="font-semibold text-blue-900 flex items-center gap-2">
 <Navigation className="h-5 w-5 text-blue-600"/>
 실시간 배송 추적
 {isJapanPost && (
 <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
 {carrierLabels[carrier] || carrier}
 </span>
 )}
 </h3>
 <div className="flex items-center gap-2">
 {/* External tracking link */}
 {carrierTrackingUrls[carrier] && (
 <Button
 variant="outline"
 size="sm"
 className="border-blue-300 text-blue-700 hover:bg-blue-100"
 onClick={() => window.open(carrierTrackingUrls[carrier](trackingNumber),"_blank")}
 >
 <ExternalLink className="h-4 w-4 mr-1"/>
 추적 사이트
 </Button>
 )}
 {/* Manual sync button */}
 {isJapanPost && order.shipment && (
 <Button
 variant="outline"
 size="sm"
 className="border-blue-300 text-blue-700 hover:bg-blue-100"
 onClick={handleSync}
 disabled={trackingLoading}
 >
 {trackingLoading ? (
 <Loader2 className="h-4 w-4 mr-1 animate-spin"/>
 ) : (
 <RefreshCw className="h-4 w-4 mr-1"/>
 )}
 수동 동기화
 </Button>
 )}
 </div>
 </div>
 <div className="p-5">
 {/* Tracking Progress Steps */}
 <div className="flex items-center justify-between mb-6">
 {trackingSteps.map((step, index) => (
 <div key={step.key} className="flex items-center flex-1">
 <div className="flex flex-col items-center">
 <div
 className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
 index <= trackingStepIndex
 ? shipmentStatus ==="delivered"
 ?"bg-green-500 text-white shadow-green-200"
 :"bg-blue-600 text-white shadow-blue-200"
 :"bg-gray-200 text-gray-400"
 }`}
 >
 {index <= trackingStepIndex ? (
 <CheckCircle2 className="h-4 w-4"/>
 ) : (
 <span>{index + 1}</span>
 )}
 </div>
 <span className={`text-xs mt-1.5 font-medium ${
 index <= trackingStepIndex
 ? shipmentStatus ==="delivered"?"text-green-600":"text-blue-600"
 :"text-gray-400"
 }`}>
 {step.label}
 </span>
 </div>
 {index < trackingSteps.length - 1 && (
 <div className={`flex-1 h-1 mx-1.5 rounded-full ${
 index < trackingStepIndex
 ? shipmentStatus ==="delivered"?"bg-green-400":"bg-blue-400"
 :"bg-gray-200"
 }`} />
 )}
 </div>
 ))}
 </div>

 {/* Tracking Info Cards */}
 <div className="grid grid-cols-4 gap-3 mb-4">
 <div className="bg-white rounded-lg p-3 border border-blue-100">
 <p className="text-xs text-gray-500 mb-1">추적번호</p>
 <p className="font-mono text-sm font-medium text-gray-900 break-all">{trackingNumber}</p>
 </div>
 <div className="bg-white rounded-lg p-3 border border-blue-100">
 <p className="text-xs text-gray-500 mb-1">배송 상태</p>
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
 (shipmentStatusLabels[shipmentStatus] || shipmentStatusLabels.pending).color
 }`}>
 {(shipmentStatusLabels[shipmentStatus] || shipmentStatusLabels.pending).label}
 </span>
 </div>
 <div className="bg-white rounded-lg p-3 border border-blue-100">
 <p className="text-xs text-gray-500 mb-1">현재 위치</p>
 <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
 <MapPin className="h-3 w-3 text-blue-500"/>
 {order.shipment?.currentLocation || liveTracking?.events?.[0]?.location ||"정보 없음"}
 </p>
 </div>
 <div className="bg-white rounded-lg p-3 border border-blue-100">
 <p className="text-xs text-gray-500 mb-1">예상 배달일</p>
 <p className="text-sm font-medium text-gray-900">
 {order.shipment?.estimatedDeliveryDate
 ? new Date(order.shipment.estimatedDeliveryDate).toLocaleDateString("ja-JP")
 :"미정"}
 </p>
 </div>
 </div>

 {/* Live tracking loading */}
 {trackingLoading && isJapanPost && (
 <div className="flex items-center justify-center py-4 text-blue-600">
 <Loader2 className="h-5 w-5 animate-spin mr-2"/>
 <span className="text-sm">일본우체국에서 실시간 정보를 가져오는 중...</span>
 </div>
 )}

 {/* Live tracking error */}
 {!trackingLoading && isJapanPost && !liveTracking && trackingNumber && (
 <div className="text-center py-3 text-gray-500 text-sm">
 <AlertCircle className="h-5 w-5 mx-auto mb-1 text-yellow-500"/>
 실시간 추적 정보를 가져올 수 없습니다. 외부 추적 사이트에서 직접 확인해주세요.
 </div>
 )}
 </div>
 </div>
 )}

 <div className="grid grid-cols-3 gap-4">
 {/* Left Column - Order Info */}
 <div className="col-span-2 space-y-4">
 {/* Order Items */}
 <Card>
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="text-sm flex items-center gap-1.5">
 <Package className="h-4 w-4 text-pink-600"/>
 주문 상품
 {order.status === 'partially_cancelled' && (
 <Badge variant="outline"className="text-xs text-orange-600 border-orange-300 bg-orange-50">
 일부 취소
 </Badge>
 )}
 </CardTitle>
 {order.status !== 'cancelled' && cancelSelectedItems.size > 0 && (
 <Button
 size="sm"
 variant="destructive"
 className="h-7 text-xs gap-1"
 onClick={() => setCancelDialogOpen(true)}
 >
 <Scissors className="w-3 h-3"/> {cancelSelectedItems.size}개 상품 취소
 </Button>
 )}
 </div>
 </CardHeader>
 <CardContent className="p-0">
 <div className="divide-y divide-gray-100">
 {order.items?.map((item: any) => {
 const isCancelled = !!item.cancelledAt;
 const isChecked = cancelSelectedItems.has(item.id);
 return (
 <div key={item.id} className={`p-4 flex items-center gap-3 ${isCancelled ? 'bg-red-50 opacity-70' : isChecked ? 'bg-orange-50' : ''}`}>
 {/* 체크박스 (취소되지 않은 상품만) */}
 {order.status !== 'cancelled' && (
 <div className="flex-shrink-0">
 {isCancelled ? (
 <button
 title="취소 복원"
 className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-green-600 transition-colors"
 onClick={() => restoreItemMutation.mutate({ orderId, itemId: item.id })}
 disabled={restoreItemMutation.isPending}
 >
 <RotateCcw className="w-4 h-4"/>
 </button>
 ) : (
 <input
 type="checkbox"
 checked={isChecked}
 onChange={() => {
 setCancelSelectedItems(prev => {
 const next = new Set(prev);
 if (next.has(item.id)) next.delete(item.id);
 else next.add(item.id);
 return next;
 });
 }}
 className="w-4 h-4 cursor-pointer accent-red-500"
 />
 )}
 </div>
 )}
 <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
 {(item.productImageUrl || item.imageUrl) ? (
 <img
 src={item.productImageUrl || item.imageUrl}
 alt={item.productName}
 className="w-full h-full object-cover"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-gray-400">
 <Package className="h-6 w-6"/>
 </div>
 )}
 </div>
 <div className="flex-1 min-w-0">
 <p className={`font-medium text-gray-900 truncate ${isCancelled ? 'line-through text-gray-400' : ''}`}>{item.productNameJa || item.productName}</p>
 <p className="text-sm text-gray-500">{item.productName}</p>
 {item.tierName && (
 <p className="text-xs text-blue-600 font-medium mt-0.5">
 옵션: {item.tierName}
 </p>
 )}
 <p className="text-sm text-gray-500">수량: {item.quantity}개 × {formatPrice(parseFloat(item.unitPrice))}</p>
 {isCancelled && (
 <div className="mt-1 flex items-center gap-1.5">
 <Badge variant="destructive"className="text-[10px] px-1.5 py-0">취소됨</Badge>
 {item.cancelledAt && (
 <span className="text-[10px] text-gray-400">{new Date(item.cancelledAt).toLocaleDateString('ko-KR')}</span>
 )}
 {item.cancelReason && (
 <span className="text-[10px] text-gray-500 italic">{item.cancelReason}</span>
 )}
 </div>
 )}
 </div>
 <div className="text-right">
 {isCancelled ? (
 <p className="text-sm text-gray-400 line-through">{formatPrice(parseFloat(item.subtotal))}</p>
 ) : (
 <p className="font-semibold text-gray-900">{formatPrice(parseFloat(item.subtotal))}</p>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </CardContent>
 <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
 {(() => {
 const itemsTotal = order.items?.reduce((sum: number, item: any) => sum + parseFloat(item.subtotal || '0'), 0) || 0;
 const shippingFee = order.shippingFee ? parseFloat(order.shippingFee) : 0;
 // 상품별 discountAmount 합산 (order_items에 저장된 값 우선, 없으면 couponDiscount 폴백)
 const itemDiscountTotal = order.items?.reduce((sum: number, item: any) => sum + parseFloat(item.discountAmount || '0'), 0) || 0;
 const couponDiscountAmt = itemDiscountTotal > 0 ? itemDiscountTotal : (order.couponDiscount ? parseFloat(order.couponDiscount) : (order.couponUsage?.discountAmount ? parseFloat(order.couponUsage.discountAmount) : 0));
 const pointsUsedAmt = order.pointsUsed || 0;
 const finalAmount = itemsTotal + shippingFee - couponDiscountAmt - pointsUsedAmt;
 return (
 <>
 <div className="flex justify-between text-sm text-gray-600 mb-1">
 <span>상품 합계</span>
 <span>{formatPrice(itemsTotal)}</span>
 </div>
 <div className="flex justify-between text-sm text-gray-600 mb-1">
 <span>배송비</span>
 <span>{formatPrice(shippingFee)}</span>
 </div>
 {couponDiscountAmt > 0 && (
 <div className="flex justify-between text-sm text-gray-600 mb-1">
 <span className="flex items-center gap-1">
 할인쿠폰
 {order.couponUsage?.couponCode && (
 <span className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-mono">{order.couponUsage.couponCode}</span>
 )}
 </span>
 <span className="text-red-600">-{formatPrice(couponDiscountAmt)}</span>
 </div>
 )}
 {pointsUsedAmt > 0 && (
 <div className="flex justify-between text-sm text-gray-600 mb-1">
 <span>포인트 사용</span>
 <span className="text-red-600">-{formatPrice(pointsUsedAmt)}</span>
 </div>
 )}
 <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-300">
 <span>총 결제 금액</span>
 <span className="text-pink-600">{formatPrice(finalAmount)}</span>
 </div>
 </>
 );
 })()}
 </div>
 </Card>

 {/* Shipping Info */}
 <Card>
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="text-sm flex items-center gap-1.5">
 <Truck className="h-4 w-4 text-pink-600"/>
 배송 정보
 </CardTitle>
 <Button
 variant="outline"
 size="sm"
 className="h-7 text-xs"
 onClick={() => setEditingShipment(!editingShipment)}
 >
 <Edit className="h-3.5 w-3.5 mr-1"/>
 {editingShipment ?"취소":"편집"}
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 {editingShipment ? (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">운송사</label>
 <Select
 value={shipmentForm.carrier}
 onValueChange={(v) => setShipmentForm({ ...shipmentForm, carrier: v })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Japan Post">Japan Post (일본 우편)</SelectItem>
 <SelectItem value="Yamato">야마토 운수</SelectItem>
 <SelectItem value="Sagawa">사가와 급편</SelectItem>
 <SelectItem value="DHL">DHL</SelectItem>
 <SelectItem value="FedEx">FedEx</SelectItem>
 <SelectItem value="EMS">EMS</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">추적번호</label>
 <Input
 value={shipmentForm.trackingNumber}
 onChange={(e) => setShipmentForm({ ...shipmentForm, trackingNumber: e.target.value })}
 placeholder="추적번호 입력"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">예상 배달일</label>
 <Input
 type="date"
 value={shipmentForm.estimatedDelivery}
 onChange={(e) => setShipmentForm({ ...shipmentForm, estimatedDelivery: e.target.value })}
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">현재 위치</label>
 <Input
 value={shipmentForm.currentLocation}
 onChange={(e) => setShipmentForm({ ...shipmentForm, currentLocation: e.target.value })}
 placeholder="예: 서울중앙우체국"
 />
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">배송 메모</label>
 <Textarea
 value={shipmentForm.notes}
 onChange={(e) => setShipmentForm({ ...shipmentForm, notes: e.target.value })}
 placeholder="배송 관련 메모..."
 rows={2}
 />
 </div>
 <Button
 className="bg-pink-600 hover:bg-pink-700"
 onClick={() => {
 updateShipmentMutation.mutate({
 orderId,
 ...shipmentForm,
 estimatedDelivery: shipmentForm.estimatedDelivery || null,
 currentLocation: shipmentForm.currentLocation || null,
 notes: shipmentForm.notes || null,
 });
 }}
 disabled={updateShipmentMutation.isPending}
 >
 <Save className="h-4 w-4 mr-1"/>
 {updateShipmentMutation.isPending ?"저장 중...":"배송 정보 저장"}
 </Button>
 </div>
 ) : (
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm text-gray-500">운송사</p>
 <p className="font-medium">{carrierLabels[order.shipment?.carrier ||""] || order.shipment?.carrier ||"미지정"}</p>
 </div>
 <div>
 <p className="text-sm text-gray-500">추적번호</p>
 <div className="flex items-center gap-1.5">
 <p className="font-medium font-mono">{order.shipment?.trackingNumber || order.trackingNumber ||"미입력"}</p>
 {trackingNumber && carrierTrackingUrls[carrier] && (
 <button
 onClick={() => window.open(carrierTrackingUrls[carrier](trackingNumber),"_blank")}
 className="text-blue-500 hover:text-blue-700"
 title="추적 사이트에서 확인"
 >
 <ExternalLink className="h-3.5 w-3.5"/>
 </button>
 )}
 </div>
 </div>
 <div>
 <p className="text-sm text-gray-500">예상 배달일</p>
 <p className="font-medium">
 {order.shipment?.estimatedDeliveryDate
 ? new Date(order.shipment.estimatedDeliveryDate).toLocaleDateString("ko-KR")
 :"미정"}
 </p>
 </div>
 <div>
 <p className="text-sm text-gray-500">현재 위치</p>
 <p className="font-medium">{order.shipment?.currentLocation ||"정보 없음"}</p>
 </div>
 {order.shipment?.notes && (
 <div className="col-span-2">
 <p className="text-sm text-gray-500">배송 메모</p>
 <p className="font-medium">{order.shipment.notes}</p>
 </div>
 )}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Unified Shipment Events Timeline (DB + Live) */}
 <Card>
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="text-sm flex items-center gap-1.5">
 <Clock className="h-4 w-4 text-pink-600"/>
 통합 배송 타임라인
 {mergedTimeline.length > 0 && (
 <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
 {mergedTimeline.length}건
 </span>
 )}
 </CardTitle>
 <div className="flex items-center gap-2">
 <span className="flex items-center gap-1 text-[10px] text-gray-400">
 <span className="w-2 h-2 rounded-full bg-pink-400 inline-block"/> DB
 <span className="w-2 h-2 rounded-full bg-blue-400 inline-block ml-2"/> 실시간
 </span>
 {order.shipment && (
 <Button
 variant="outline"
 size="sm"
 className="h-7 text-xs"
 onClick={() => setShowEventDialog(true)}
 >
 <Plus className="h-3.5 w-3.5 mr-1"/>
 이벤트 추가
 </Button>
 )}
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {mergedTimeline.length > 0 ? (
 <div className="space-y-0">
 {mergedTimeline.map((evt, index) => (
 <div key={`${evt.source}-${index}`} className="flex gap-4">
 <div className="flex flex-col items-center">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
 index === 0
 ? evt.source ==="live"?"bg-blue-100 text-blue-600":"bg-pink-100 text-pink-600"
 :"bg-gray-100 text-gray-500"
 }`}>
 {evt.icon}
 </div>
 {index < mergedTimeline.length - 1 && (
 <div className={`w-0.5 h-12 ${evt.source ==="live"?"bg-blue-200":"bg-gray-200"}`} />
 )}
 </div>
 <div className="pb-6 flex-1">
 <div className="flex items-center gap-2">
 <p className="font-medium text-gray-900">{evt.label}</p>
 <span className={`text-[10px] px-1.5 py-0.5 rounded ${
 evt.source ==="live"?"bg-blue-50 text-blue-600":"bg-pink-50 text-pink-600"
 }`}>
 {evt.source ==="live"?"실시간":"DB"}
 </span>
 </div>
 {evt.description && (
 <p className="text-sm text-gray-600">{evt.description}</p>
 )}
 {evt.location && (
 <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
 <MapPin className="h-3 w-3"/> {evt.location}
 </p>
 )}
 <p className="text-xs text-gray-400 mt-0.5">
 {new Date(evt.time).toLocaleString("ko-KR")}
 </p>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-8 text-gray-400">
 <Clock className="h-8 w-8 mx-auto mb-2"/>
 <p>배송 이벤트가 없습니다</p>
 {!order.shipment && (
 <p className="text-sm mt-1">배송 정보를 먼저 등록해주세요</p>
 )}
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Cancel History Section - 취소 이력 (취소된 상품이 있을 때만 표시) */}
 {order.items?.some((item: any) => item.cancelledAt) && (
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-sm flex items-center gap-1.5">
 <XCircle className="h-4 w-4 text-red-500"/>
 취소 이력
 <Badge variant="secondary"className="text-xs ml-1">{order.items.filter((item: any) => item.cancelledAt).length}건</Badge>
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 <div className="divide-y divide-gray-100">
 {[...order.items]
 .filter((item: any) => item.cancelledAt)
 .sort((a: any, b: any) => new Date(b.cancelledAt).getTime() - new Date(a.cancelledAt).getTime())
 .map((item: any) => {
 const refundAmt = Math.max(0, parseFloat(item.subtotal || '0') - parseFloat(item.discountAmount || '0'));
 return (
 <div key={item.id} className="p-4 hover:bg-red-50/30 transition-colors">
 <div className="flex items-start gap-3">
 {/* 상품 이미지 */}
 {item.productImageUrl ? (
 <img
 src={item.productImageUrl}
 alt={item.productNameJa || item.productName}
 className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0"
 />
 ) : (
 <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center flex-shrink-0">
 <Package className="h-4 w-4 text-gray-400"/>
 </div>
 )}
 <div className="flex-1 min-w-0">
 {/* 상품명 */}
 <p className="text-sm font-medium text-gray-800 truncate">
 {item.productNameJa || item.productName}
 </p>
 {item.productNameJa && item.productName && item.productNameJa !== item.productName && (
 <p className="text-xs text-gray-500 truncate">{item.productName}</p>
 )}
 <p className="text-xs text-gray-500 mt-0.5">수량: {item.quantity}개</p>
 {/* 취소 메타 정보 */}
 <div className="mt-2 space-y-1">
 <div className="flex items-center gap-1.5 text-xs text-gray-500">
 <Clock className="h-3 w-3 flex-shrink-0"/>
 <span className="font-medium text-gray-600">취소 일시:</span>
 <span>
 {new Date(item.cancelledAt).toLocaleString('ko-KR', {
 year: 'numeric', month: '2-digit', day: '2-digit',
 hour: '2-digit', minute: '2-digit'
 })}
 </span>
 </div>
 {item.cancelReason && (
 <div className="flex items-start gap-1.5 text-xs text-gray-500">
 <FileText className="h-3 w-3 flex-shrink-0 mt-0.5"/>
 <span className="font-medium text-gray-600">취소 사유:</span>
 <span className="text-gray-700">{item.cancelReason}</span>
 </div>
 )}
 </div>
 </div>
 {/* 환불 금액 */}
 <div className="text-right flex-shrink-0">
 <p className="text-xs text-gray-400 line-through">{formatPrice(parseFloat(item.subtotal || '0'))}</p>
 <p className="text-sm font-semibold text-red-600">-{formatPrice(refundAmt)}</p>
 <p className="text-[10px] text-gray-400 mt-0.5">환불 금액</p>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 {/* 취소 합계 */}
 {(() => {
 const cancelledItems = order.items.filter((item: any) => item.cancelledAt);
 const totalRefund = cancelledItems.reduce((sum: number, item: any) => {
 return sum + Math.max(0, parseFloat(item.subtotal || '0') - parseFloat(item.discountAmount || '0'));
 }, 0);
 const totalCancelledSubtotal = cancelledItems.reduce(
 (sum: number, item: any) => sum + parseFloat(item.subtotal || '0'), 0
 );
 return (
 <div className="p-4 border-t border-red-100 bg-red-50/50 rounded-b-lg">
 <div className="flex justify-between text-sm text-gray-500 mb-1">
 <span>취소 상품 원가 합계</span>
 <span className="line-through">{formatPrice(totalCancelledSubtotal)}</span>
 </div>
 <div className="flex justify-between font-bold text-base">
 <span className="text-gray-800">총 환불 금액</span>
 <span className="text-red-600">-{formatPrice(totalRefund)}</span>
 </div>
 </div>
 );
 })()}
 </CardContent>
 </Card>
 )}

 {/* Right Column - Customer & Meta */}
 <div className="space-y-4">
 {/* Customer Info */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-sm flex items-center gap-1.5">
 <User className="h-4 w-4 text-pink-600"/>
 주문자 정보
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {order.customer ? (
 <>
 <div className="flex items-center gap-2">
 <User className="h-4 w-4 text-gray-400"/>
 <span className="text-sm">{order.customer.name}</span>
 </div>
 <div className="flex items-center gap-2">
 <Mail className="h-4 w-4 text-gray-400"/>
 <span className="text-sm">{order.customer.email}</span>
 </div>
 {order.customer.phone && (
 <div className="flex items-center gap-2">
 <Phone className="h-4 w-4 text-gray-400"/>
 <span className="text-sm">{order.customer.phone}</span>
 </div>
 )}
 <div className="flex items-center gap-2">
 <span className="text-xs text-gray-400">ID: {order.customer.id}</span>
 </div>
 </>
 ) : (
 <p className="text-sm text-gray-400">주문자 정보 없음</p>
 )}
 </CardContent>
 </Card>

 {/* Shipping Address */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-sm flex items-center gap-1.5">
 <MapPin className="h-4 w-4 text-pink-600"/>
 배송지 정보
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-2">
 <div>
 <p className="text-sm text-gray-500">수취인</p>
 <p className="font-medium">{order.shippingName}</p>
 </div>
 <div>
 <p className="text-sm text-gray-500">전화번호</p>
 <p className="font-medium">{order.shippingPhone ||"미입력"}</p>
 </div>
 <div>
 <p className="text-sm text-gray-500">우편번호</p>
 <p className="font-medium">{order.shippingPostalCode ||"미입력"}</p>
 </div>
 <div>
 <p className="text-sm text-gray-500">주소</p>
 <p className="font-medium">{order.shippingAddress}</p>
 </div>
 </CardContent>
 </Card>

 {/* Payment Info */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-sm flex items-center gap-1.5">
 <CreditCard className="h-4 w-4 text-pink-600"/>
 결제 정보
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-2">
 <div>
 <p className="text-sm text-gray-500">결제 방식</p>
 <p className="font-medium">
 {order.paymentMethod ==="bank_transfer"?"무통장 송금": order.paymentMethod ||"Stripe"}
 </p>
 </div>
 <div>
 <p className="text-sm text-gray-500">결제 상태</p>
 <div className="flex items-center gap-2">
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
 order.paymentStatus ==="paid"?"bg-green-100 text-green-800":
 order.paymentStatus ==="pending"?"bg-yellow-100 text-yellow-800":
 order.paymentStatus ==="failed"?"bg-red-100 text-red-800":
"bg-gray-100 text-gray-800"
 }`}>
 {order.paymentStatus ==="paid"?"✓ 결제 완료":
 order.paymentStatus ==="pending"?"⏳ 입금 대기":
 order.paymentStatus ==="failed"?"✕ 결제 실패":
 order.paymentStatus ||"완료"}
 </span>
 </div>
 </div>

 {/* Bank Transfer Confirmation UI */}
 {order.paymentMethod ==="bank_transfer"&& (
 <div className="mt-3 pt-3 border-t border-gray-100">
 {order.bankTransferConfirmedAt ? (
 <div className="space-y-2">
 <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
 <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0"/>
 <div className="flex-1">
 <p className="text-xs font-semibold text-green-800">입금 확인 완료</p>
 <p className="text-xs text-green-600">
 {new Date(order.bankTransferConfirmedAt).toLocaleString("ko-KR")}
 </p>
 </div>
 </div>
 <Button
 variant="outline"
 size="sm"
 className="w-full text-red-600 border-red-200 hover:bg-red-50"
 onClick={() => {
 if (confirm("입금 확인을 취소하시겠습니까? 주문 상태가 '주문 접수'로 돌아갑니다."))
 cancelBankTransferMutation.mutate({ orderId: order.id });
 }}
 disabled={cancelBankTransferMutation.isPending}
 >
 {cancelBankTransferMutation.isPending ? (
 <Loader2 className="h-4 w-4 animate-spin"/>
 ) : (
 <XCircle className="h-4 w-4"/>
 )}
 입금 확인 취소
 </Button>
 </div>
 ) : (
 <div className="space-y-2">
 <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
 <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0"/>
 <p className="text-xs text-amber-700">입금 확인 대기 중. 입금 확인 후 아래 버튼을 클릭하세요.</p>
 </div>
 <Button
 size="sm"
 className="w-full bg-green-600 hover:bg-green-700 text-white"
 onClick={() => {
 if (confirm("입금을 확인하시겠습니까? 주문 상태가 '주문 확정'으로 변경됩니다."))
 confirmBankTransferMutation.mutate({ orderId: order.id });
 }}
 disabled={confirmBankTransferMutation.isPending}
 >
 {confirmBankTransferMutation.isPending ? (
 <Loader2 className="h-4 w-4 animate-spin"/>
 ) : (
 <CheckCircle2 className="h-4 w-4"/>
 )}
 입금 확인 완료
 </Button>
 </div>
 )}
 </div>
 )}

 {order.stripePaymentId && (
 <div>
 <p className="text-sm text-gray-500">Stripe ID</p>
 <p className="font-medium font-mono text-xs break-all">{order.stripePaymentId}</p>
 </div>
 )}
 {order.couponUsage && (
 <div>
 <p className="text-sm text-gray-500">할인쿠폰</p>
 <div className="flex items-center gap-2">
 <span className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-mono">{order.couponUsage.couponCode}</span>
 <span className="text-sm text-gray-600">{order.couponUsage.couponNameJa}</span>
 </div>
 <p className="font-medium text-red-600 mt-0.5">-{formatPrice(parseFloat(order.couponUsage.discountAmount))}</p>
 </div>
 )}
 {!order.couponUsage && parseFloat(order.couponDiscount || '0') > 0 && (
 <div>
 <p className="text-sm text-gray-500">할인쿠폰</p>
 <p className="font-medium text-red-600">-{formatPrice(parseFloat(order.couponDiscount))}</p>
 </div>
 )}
 <div>
 <p className="text-sm text-gray-500">포인트 사용</p>
 <p className="font-medium">{order.pointsUsed || 0}P {order.pointsUsed > 0 && <span className="text-red-600 text-sm">(-{formatPrice((order.pointsUsed || 0))})</span>}</p>
 </div>
 <div>
 <p className="text-sm text-gray-500">포인트 적립</p>
 <p className="font-medium text-green-600">+{order.pointsEarned || 0}P</p>
 </div>
 </CardContent>
 </Card>

 {/* Admin Notes */}
 <Card>
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="text-sm flex items-center gap-1.5">
 <FileText className="h-4 w-4 text-pink-600"/>
 관리자 메모
 </CardTitle>
 {editingNotes ? (
 <div className="flex gap-1">
 <Button
 size="sm"
 className="bg-pink-600 hover:bg-pink-700 h-7 px-2 text-xs"
 onClick={() => updateNotesMutation.mutate({ orderId, notes: adminNotes })}
 disabled={updateNotesMutation.isPending}
 >
 <Save className="h-3 w-3 mr-1"/>
 저장
 </Button>
 <Button
 size="sm"
 variant="outline"
 className="h-7 px-2 text-xs"
 onClick={() => {
 setEditingNotes(false);
 setAdminNotes(order.adminNotes ||"");
 }}
 >
 취소
 </Button>
 </div>
 ) : (
 <Button
 variant="ghost"
 size="sm"
 className="h-7 px-2 text-xs text-gray-500 hover:text-pink-600"
 onClick={() => setEditingNotes(true)}
 >
 <Edit className="h-3 w-3 mr-1"/>
 편집
 </Button>
 )}
 </div>
 </CardHeader>
 <CardContent>
 {editingNotes ? (
 <div className="space-y-2">
 <Textarea
 value={adminNotes}
 onChange={(e) => setAdminNotes(e.target.value)}
 onKeyDown={(e) => {
 if (e.key ==="Enter"&& e.ctrlKey) {
 e.preventDefault();
 updateNotesMutation.mutate({ orderId, notes: adminNotes });
 }
 if (e.key ==="Escape") {
 setEditingNotes(false);
 setAdminNotes(order.adminNotes ||"");
 }
 }}
 placeholder="관리자 메모를 입력하세요... (Ctrl+Enter 저장, Esc 취소)"
 rows={4}
 autoFocus
 className="resize-none focus:ring-2 focus:ring-pink-300"
 />
 <p className="text-xs text-gray-400">Ctrl+Enter로 저장 · Esc로 취소</p>
 </div>
 ) : (
 <div
 className="group cursor-pointer rounded-md p-2 -m-2 hover:bg-pink-50 transition-colors"
 onClick={() => setEditingNotes(true)}
 title="클릭하여 메모 편집"
 >
 {order.adminNotes ? (
 <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.adminNotes}</p>
 ) : (
 <p className="text-sm text-gray-400 italic flex items-center gap-1">
 <Edit className="h-3 w-3"/>
 클릭하여 메모 추가...
 </p>
 )}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 </div>

 {/* Status Change Dialog */}
 <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>주문 상태 변경</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">새 상태</label>
 <Select value={newStatus} onValueChange={setNewStatus}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="pending">입금전</SelectItem>
 <SelectItem value="paid">결제완료</SelectItem>
 <SelectItem value="confirmed">상품준비중</SelectItem>
 <SelectItem value="shipped">배송중</SelectItem>
 <SelectItem value="delivered">배송완료</SelectItem>
 <SelectItem value="cancelled">취소</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline"onClick={() => setShowStatusDialog(false)}>취소</Button>
 <Button
 className="bg-pink-600 hover:bg-pink-700"
 onClick={() => updateStatusMutation.mutate({ orderId, status: newStatus as any })}
 disabled={updateStatusMutation.isPending}
 >
 {updateStatusMutation.isPending ?"변경 중...":"상태 변경"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Add Event Dialog */}
 <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>배송 이벤트 추가</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">이벤트 유형</label>
 <Select value={newEvent.status} onValueChange={(v) => setNewEvent({ ...newEvent, status: v })}>
 <SelectTrigger>
 <SelectValue placeholder="이벤트 유형 선택"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="order_placed">주문 접수</SelectItem>
 <SelectItem value="payment_confirmed">결제 확인</SelectItem>
 <SelectItem value="processing">처리 중</SelectItem>
 <SelectItem value="picked_up">집하 완료</SelectItem>
 <SelectItem value="departed">발송 완료</SelectItem>
 <SelectItem value="in_transit">배송 중</SelectItem>
 <SelectItem value="out_for_delivery">배달 예정</SelectItem>
 <SelectItem value="delivered">배달 완료</SelectItem>
 <SelectItem value="failed">배달 실패</SelectItem>
 <SelectItem value="returned">반송 중</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">위치 (선택)</label>
 <Input
 value={newEvent.location}
 onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
 placeholder="예: 서울중앙우체국"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
 <Input
 value={newEvent.description}
 onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
 placeholder="이벤트 설명 입력"
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline"onClick={() => setShowEventDialog(false)}>취소</Button>
 <Button
 className="bg-pink-600 hover:bg-pink-700"
 onClick={() => {
 if (!newEvent.status || !newEvent.description) {
 toast.error("이벤트 유형과 설명을 입력해주세요");
 return;
 }
 addEventMutation.mutate({
 orderId,
 status: newEvent.status,
 location: newEvent.location || null,
 description: newEvent.description,
 });
 }}
 disabled={addEventMutation.isPending}
 >
 {addEventMutation.isPending ?"추가 중...":"이벤트 추가"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 {/* 부분 취소 확인 다이얼로그 */}
 {(() => {
 const selectedItemsList = (order.items || []).filter((it: any) => cancelSelectedItems.has(it.id));
 const refundAmount = selectedItemsList.reduce((s: number, it: any) => s + Number(it.subtotal || 0) - Number(it.discountAmount || 0), 0);
 const isAllItems = selectedItemsList.length === (order.items || []).filter((it: any) => !it.cancelledAt).length;
 return (
 <Dialog open={cancelDialogOpen} onOpenChange={(open) => { if (!open) { setCancelDialogOpen(false); setCancelReason(""); } }}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle className="text-base flex items-center gap-2">
 <Scissors className="w-4 h-4 text-red-500"/>
 상품 취소 확인
 </DialogTitle>
 </DialogHeader>
 <div className="py-3 space-y-4">
 {/* 취소 상품 목록 */}
 <div className="border rounded-lg overflow-hidden">
 <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 border-b">취소 대상 상품 ({selectedItemsList.length}개)</div>
 <div className="divide-y max-h-48 overflow-y-auto">
 {selectedItemsList.map((it: any) => (
 <div key={it.id} className="px-3 py-2 flex items-center justify-between text-xs">
 <div>
 <div className="font-medium">{it.productName ||"-"}</div>
 {it.tierName && <div className="text-gray-400">{it.tierName}</div>}
 <div className="text-gray-500">수량: {it.quantity} × {formatPrice(Number(it.unitPrice || 0))}</div>
 </div>
 <div className="text-right">
 <div className="text-gray-500 line-through text-[10px]">{formatPrice(Number(it.subtotal || 0))}</div>
 {Number(it.discountAmount || 0) > 0 && (
 <div className="text-red-500 text-[10px]">-{formatPrice(Number(it.discountAmount))}</div>
 )}
 <div className="font-semibold text-blue-700">{formatPrice((Number(it.subtotal || 0) - Number(it.discountAmount || 0)))}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 {/* 환불 금액 요약 */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-blue-800">예상 환불 금액</span>
 <span className="text-lg font-bold text-blue-700">{formatPrice(refundAmount)}</span>
 </div>
 {isAllItems && (
 <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
 <AlertTriangle className="w-3 h-3"/>
 전체 상품 취소 시 주문이 취소 상태로 변경됩니다.
 </div>
 )}
 {order.paymentMethod === 'stripe' && (
 <div className="text-xs text-blue-600 mt-1">Stripe를 통해 자동 환불 처리됩니다.</div>
 )}
 {order.paymentMethod === 'bank_transfer' && (
 <div className="text-xs text-blue-600 mt-1">무통장 입금 주문은 수동 환불이 필요합니다.</div>
 )}
 </div>
 {/* 취소 사유 */}
 <div className="space-y-1.5">
 <Label className="text-xs font-medium">취소 사유 (선택)</Label>
 <Textarea
 placeholder="취소 사유를 입력하세요..."
 value={cancelReason}
 onChange={e => setCancelReason(e.target.value)}
 className="text-sm h-20 resize-none"
 />
 </div>
 </div>
 <DialogFooter className="gap-2">
 <Button variant="outline"size="sm"onClick={() => { setCancelDialogOpen(false); setCancelReason(""); }}
 disabled={cancelItemsMutation.isPending}>
 닫기
 </Button>
 <Button
 size="sm"
 variant="destructive"
 className="gap-1"
 disabled={cancelItemsMutation.isPending || selectedItemsList.length === 0}
 onClick={() => {
 cancelItemsMutation.mutate({
 orderId,
 itemIds: selectedItemsList.map((it: any) => it.id),
 cancelReason: cancelReason || undefined,
 refundAmount: refundAmount > 0 ? refundAmount : undefined,
 });
 }}
 >
 {cancelItemsMutation.isPending ? (
 <><RefreshCw className="w-3 h-3 animate-spin"/> 처리 중...</>
 ) : (
 <><Scissors className="w-3 h-3"/> {selectedItemsList.length}개 상품 취소 확인</>
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
 })()}
 </AdminLayout>
 );
}
