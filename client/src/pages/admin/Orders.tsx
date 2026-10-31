import { useAuth } from"@/_core/hooks/useAuth";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Link, useLocation } from"wouter";
import { useState, useMemo } from"react";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
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
 DialogDescription,
 DialogTitle,
 DialogFooter,
} from"@/components/ui/dialog";
import { toast } from"sonner";
import {
 Search,
 Eye,
 Edit,
 ChevronLeft,
 ChevronRight,
 CheckSquare,
 Square,
 Filter,
 X,
 ArrowUpDown,
 Truck,
 Package,
 Upload,
 Download,
 FileSpreadsheet,
 CheckCircle,
 XCircle,
 Clock,
 MapPin,
 ExternalLink,
 Mail,
 AlertTriangle,
 Scissors,
 RotateCcw,
 Copy,
 ShoppingCart,
} from"lucide-react";
import { Badge } from"@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from"@/components/ui/tooltip";
import { formatPrice } from"@/../../shared/utils/formatPrice";
import TrackingTimelineModal from"@/components/TrackingTimelineModal";

const shipmentStatusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
 pending: { label:"준비 중", color:"bg-gray-100 text-gray-600", icon: <Clock className="h-3 w-3"/> },
 picked_up: { label:"집하 완료", color:"bg-blue-100 text-blue-700", icon: <Package className="h-3 w-3"/> },
 in_transit: { label:"운송 중", color:"bg-indigo-100 text-indigo-700", icon: <Truck className="h-3 w-3"/> },
 out_for_delivery: { label:"배달 중", color:"bg-orange-100 text-orange-700", icon: <Truck className="h-3 w-3"/> },
 delivered: { label:"배달 완료", color:"bg-green-100 text-green-700", icon: <CheckCircle className="h-3 w-3"/> },
};

const carrierTrackingUrls: Record<string, (num: string) => string> = {
"Japan Post": (num) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=ja`,
"Yamato": (num) => `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${num}`,
"Sagawa": (num) => `https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=${num}`,
"DHL": (num) => `https://www.dhl.com/jp-ja/home/tracking.html?tracking-id=${num}`,
"FedEx": (num) => `https://www.fedex.com/fedextrack/?trknbr=${num}`,
"EMS": (num) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=ja`,
};

const carrierShortNames: Record<string, string> = {
"Japan Post":"JP",
"Yamato":"야마토",
"Sagawa":"사가와",
"DHL":"DHL",
"FedEx":"FedEx",
"EMS":"EMS",
};

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
 pending:"bg-yellow-100 text-yellow-800",
 paid:"bg-green-100 text-green-800",
 confirmed:"bg-blue-100 text-blue-800",
 shipped:"bg-indigo-100 text-indigo-800",
 delivered:"bg-gray-100 text-gray-700",
 completed:"bg-teal-100 text-teal-800",
 cancelled:"bg-red-100 text-red-800",
 partially_cancelled:"bg-orange-100 text-orange-800",
};

export default function AdminOrders() {
 const { user, loading } = useAuth();
 const [location, navigate] = useLocation();
 // URL search param auto-fill
 const urlSearch = typeof window !=="undefined"? new URLSearchParams(window.location.search).get("search") ||"":"";
 // Search & Filter state
 const [page, setPage] = useState(1);
 const [limit] = useState(20);
 const [statusFilter, setStatusFilter] = useState<string[]>(["paid"]);
 const [showAll, setShowAll] = useState(false);
 const [searchText, setSearchText] = useState(() => urlSearch);
 const [searchInput, setSearchInput] = useState(() => urlSearch);
 const [dateFrom, setDateFrom] = useState("");
 const [dateTo, setDateTo] = useState("");
 const [sortBy, setSortBy] = useState<string>("date");
 const [sortOrder, setSortOrder] = useState<"asc"|"desc">("desc");
 const [bankTransferPending, setBankTransferPending] = useState(false);
 // UPG-04: 결제수단 필터
 const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
 // 배송지연 탭 모드
 const [showDelayedTab, setShowDelayedTab] = useState(false);
 // 장바구니 탭 모드
 const [showCartTab, setShowCartTab] = useState(false);
 const [cartSearch, setCartSearch] = useState('');
 const [cartPage, setCartPage] = useState(1);
 const [cartDetailUserId, setCartDetailUserId] = useState<number | null>(null);
 const [selectedDelayedOrders, setSelectedDelayedOrders] = useState<Set<number>>(new Set());
 const [sendEmailDialog, setSendEmailDialog] = useState(false);
 const [sendCustomsEmailDialog, setSendCustomsEmailDialog] = useState(false);
 const [customsEmailMessage, setCustomsEmailMessage] = useState('');
 // 필터는 항상 노온되므로 showFilters 상태 제거

 // Bulk action state
 const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
 const [showBulkDialog, setShowBulkDialog] = useState(false);
 const [bulkStatus, setBulkStatus] = useState("");
 const [showBankConfirmDialog, setShowBankConfirmDialog] = useState(false);
 const [bankConfirmResults, setBankConfirmResults] = useState<{ success: number; skipped: number; results: { orderId: number; orderNumber: string; success: boolean; reason?: string }[] } | null>(null);

 // 타임라인 팝업 상태
 const [timelineModal, setTimelineModal] = useState<{ open: boolean; orderId: number; trackingNumber: string; carrier: string; status: string; productName: string; shippingName: string } | null>(null);

 // CSV upload state
 const [showCsvDialog, setShowCsvDialog] = useState(false);
 const [csvEntries, setCsvEntries] = useState<{ orderNumber: string; trackingNumber: string; carrier: string }[]>([]);
 const [csvResults, setCsvResults] = useState<{ orderNumber: string; success: boolean; message: string }[] | null>(null);
 const [csvFileName, setCsvFileName] = useState("");

 const { data: isAdmin, isLoading: checkingAdmin } = trpc.admin.isAdmin.useQuery(undefined, {
 enabled: !!user,
 });

 // 세관조회 이메일 발송 mutation
 const sendCustomsEmailsMutation = trpc.admin.sendCustomsInquiryEmails.useMutation({
 onSuccess: (data) => {
 setSendCustomsEmailDialog(false);
 setCustomsEmailMessage('');
 toast.success(`세관조회 안내 이메일 발송 완료: 성공 ${data.successCount}건${data.failCount > 0 ? `, 실패 ${data.failCount}건` : ''}`);
 },
 onError: (e) => toast.error(e.message),
 });

 // 배송 지연 이메일 발송 mutation
 const sendDelayedEmailsMutation = trpc.admin.sendDelayedShipmentEmails.useMutation({
 onSuccess: (data) => {
 setSendEmailDialog(false);
 setSelectedDelayedOrders(new Set());
 toast.success(`이메일 발송 완료: 성공 ${data.successCount}건${data.failCount > 0 ? `, 실패 ${data.failCount}건` : ''}`);
 },
 onError: (e) => toast.error(e.message),
 });

 // 배송 지연 주문 쿼리 (shipped 상태에서 14일 이상 경과) - 항상 실행하여 탭 버튼에 건수 표시
 const { data: delayedOrdersData, isLoading: delayedLoading, refetch: refetchDelayed } = trpc.admin.delayedOrders.useQuery(
 undefined,
 { enabled: isAdmin === true, staleTime: 1000 * 60 * 5 }
 );

 // 장바구니 목록 쿼리
 const { data: cartListData, isLoading: cartListLoading } = trpc.admin.cartList.useQuery(
 { page: cartPage, limit: 30, search: cartSearch },
 { enabled: isAdmin === true && showCartTab }
 );
 const { data: cartDetailData, isLoading: cartDetailLoading } = trpc.admin.cartDetail.useQuery(
 { userId: cartDetailUserId! },
 { enabled: isAdmin === true && cartDetailUserId !== null }
 );

 // 마지막 배송 자동 업데이트 시간
 const { data: lastSyncData } = trpc.admin.lastTrackingSyncTime.useQuery(undefined, {
 enabled: isAdmin === true,
 staleTime: 1000 * 60 * 5,
 });

 // Stabilize query input
 const queryInput = useMemo(() => ({
 page,
 limit,
 status: bankTransferPending ? undefined : (statusFilter.length === 0 || statusFilter.includes("all") ? undefined : statusFilter.join(",")),
 search: searchText || undefined,
 dateFrom: dateFrom || undefined,
 dateTo: dateTo || undefined,
 sortBy: sortBy ==="date"? undefined : sortBy,
 sortOrder,
 bankTransferPending: bankTransferPending || undefined,
 paymentMethod: paymentMethodFilter !=="all"? paymentMethodFilter : undefined,
 }), [page, limit, statusFilter, searchText, dateFrom, dateTo, sortBy, sortOrder, bankTransferPending, paymentMethodFilter]);

 const { data: statusCounts, refetch: refetchStatusCounts } = trpc.admin.orderStatusCounts.useQuery(undefined, {
 enabled: isAdmin === true,
 });

 const { data, isLoading, refetch } = trpc.admin.orders.useQuery(
 queryInput,
 { enabled: isAdmin === true }
 );

 const quickUpdateMutation = trpc.admin.updateOrderStatus.useMutation({
 onSuccess: () => {
 toast.success("주문 상태가 변경되었습니다");
 refetch();
 refetchStatusCounts();
 },
 onError: (e) => toast.error(e.message),
 });

 const bulkUpdateMutation = trpc.admin.bulkUpdateStatus.useMutation({
 onSuccess: (result) => {
 // BUG-05 fix: 안전한 기본값 처리
 const successCount = result?.success ?? 0;
 const failedCount = result?.failed ?? 0;
 toast.success(`${successCount}건 상태 변경 완료${failedCount > 0 ? `, ${failedCount}건 실패` :""}`);
 setSelectedOrders(new Set());
 setShowBulkDialog(false);
 setBulkStatus("");
 refetch();
 refetchStatusCounts();
 },
 onError: (e) => toast.error(e.message),
 });

 const bulkConfirmBankMutation = trpc.admin.bulkConfirmBankTransfer.useMutation({
 onSuccess: (result) => {
 setBankConfirmResults(result);
 setShowBankConfirmDialog(true);
 if (result.success > 0) {
 toast.success(`${result.success}건 입금 확인 완료${result.skipped > 0 ? `, ${result.skipped}건 스킵` : ''}`);
 setSelectedOrders(new Set());
 refetch();
 refetchStatusCounts();
 } else {
 toast.warning(`처리된 건이 없습니다. (${result.skipped}건 스킵)`);
 }
 },
 onError: (e) => toast.error(e.message),
 });

 // 인라인 송장 입력 state (orderId -> {trackingNumber, carrier})
 const [trackingInputs, setTrackingInputs] = useState<Record<number, { trackingNumber: string; carrier: string }>>({});
 const [savingBulkTracking, setSavingBulkTracking] = useState(false);
 // 하위 호환용 (기존 단일 편집 state - 배송지연 탭에서 사용)
 const [editingOrderTracking, setEditingOrderTracking] = useState<number | null>(null);
 const [trackingInputVal, setTrackingInputVal] = useState("");
 const [trackingCarrierVal, setTrackingCarrierVal] = useState("Japan Post");

 // UPG-03: 인라인 송장번호 저장 mutation
 const inlineTrackingMutation = trpc.admin.updateItemTracking.useMutation({
 onSuccess: () => {
 toast.success("송장번호가 저장되었습니다.");
 setEditingOrderTracking(null);
 refetch();
 },
 onError: (e) => toast.error(e.message),
 });

 // 송장 일괄 저장 핸들러
 const handleBulkSaveTracking = async () => {
 const entries = Object.entries(trackingInputs).filter(([, v]) => v.trackingNumber.trim());
 if (entries.length === 0) { toast.info("입력된 송장번호가 없습니다."); return; }
 setSavingBulkTracking(true);
 let successCount = 0;
 let failCount = 0;
 for (const [orderIdStr, val] of entries) {
 const orderId = Number(orderIdStr);
 const order = orders.find((o: any) => o.id === orderId);
 if (!order) continue;
 const firstItemId = (order as any).itemsWithImages?.[0]?.id || (order as any).itemsWithImages?.[0]?.id || (order as any).items?.[0]?.id || (order as any).items?.[0]?.orderItemId || 0;
 try {
 await inlineTrackingMutation.mutateAsync({
 orderId,
 orderItemId: firstItemId,
 trackingNumber: val.trackingNumber.trim(),
 carrier: val.carrier,
 });
 successCount++;
 } catch {
 failCount++;
 }
 }
 setSavingBulkTracking(false);
 setTrackingInputs({});
 toast.success(`송장 저장 완료: 성공 ${successCount}건${failCount > 0 ? `, 실패 ${failCount}건` :""}`);
 refetch();
 };

 const exportMutation = trpc.admin.exportOrders.useMutation({
 onSuccess: (result) => {
 if (result.count === 0) {
 toast.info("내보낼 주문이 없습니다.");
 return;
 }
 // Generate CSV
 const headers = [
 '주문번호', '상태', '주문일시', '고객명', '이메일', '전화번호',
 '총액', '배송비', '포인트사용', '포인트적립',
 '배송성명', '우편번호', '배송주소', '배송전화',
 '추적번호', '운송사', '결제방법', '상품내역', '상품수', '관리자메모'
 ];
 const rows = result.data.map((o: any) => [
 o.orderNumber,
 statusLabels[o.status] || o.status,
 o.createdAt ? new Date(o.createdAt).toLocaleString('ko-KR') : '',
 o.userName, o.userEmail, o.userPhone,
 o.totalAmount, o.shippingFee, o.pointsUsed, o.pointsEarned,
 o.shippingName, o.shippingPostalCode, o.shippingAddress, o.shippingPhone,
 o.trackingNumber, o.carrier, o.paymentMethod, o.itemSummary, o.itemCount, o.adminNotes
 ]);
 const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map((c: any) => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 const now = new Date().toISOString().slice(0, 10);
 a.download = `orders_export_${now}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 toast.success(`${result.count}건 주문 데이터를 내보냈습니다.`);
 },
 onError: (e) => toast.error(e.message),
 });

 const handleExport = () => {
 exportMutation.mutate({
 status: statusFilter.length === 0 ? undefined : statusFilter.join(","),
 search: searchText || undefined,
 dateFrom: dateFrom || undefined,
 dateTo: dateTo || undefined,
 format: 'csv',
 });
 };

 const bulkTrackingMutation = trpc.admin.bulkUpdateTracking.useMutation({
 onSuccess: (result) => {
 setCsvResults(result.results);
 toast.success(`${result.success}건 성공, ${result.failed}건 실패`);
 refetch();
 },
 onError: (e) => toast.error(e.message),
 });

 const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 setCsvFileName(file.name);
 setCsvResults(null);
 const reader = new FileReader();
 reader.onload = (ev) => {
 const text = ev.target?.result as string;
 const lines = text.split("\n").filter((l) => l.trim());
 const entries: { orderNumber: string; trackingNumber: string; carrier: string }[] = [];
 // Skip header row
 for (let i = 1; i < lines.length; i++) {
 const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g,""));
 if (cols.length >= 2 && cols[0] && cols[1]) {
 entries.push({
 orderNumber: cols[0],
 trackingNumber: cols[1],
 carrier: cols[2] ||"Japan Post",
 });
 }
 }
 setCsvEntries(entries);
 };
 reader.readAsText(file);
 // Reset file input
 e.target.value ="";
 };

 const downloadCsvTemplate = () => {
 const header ="orderNumber,trackingNumber,carrier";
 const example ="ORD-20260101-XXXXX,JP1234567890,Japan Post";
 const blob = new Blob([header +"\n"+ example +"\n"], { type:"text/csv"});
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download ="tracking_template.csv";
 a.click();
 URL.revokeObjectURL(url);
 };

 // BUG-01 fix: delayedOrdersData 미정의 변수 제거
 const orders = data?.orders || [];
 const total = data?.total || 0;
 const totalPages = Math.ceil(total / limit) || 1;

 // 장바구니 번호별 그룹핑 토글
 const [groupByCart, setGroupByCart] = useState(true);

 type OrderRow =
 | { type: 'group-header'; cartGroupId: string; groupOrders: typeof orders }
 | { type: 'order'; order: (typeof orders)[0]; inGroup: boolean };

 const groupedOrderRows = useMemo((): OrderRow[] | null => {
 if (!groupByCart) return null;
 const groups = new Map<string, typeof orders>();
 const ungrouped: typeof orders = [];
 for (const order of orders) {
 const gid = (order as any).cartGroupId as string | undefined;
 if (gid) {
 if (!groups.has(gid)) groups.set(gid, []);
 groups.get(gid)!.push(order);
 } else {
 ungrouped.push(order);
 }
 }
 const result: OrderRow[] = [];
 for (const [gid, gOrders] of Array.from(groups)) {
 if (gOrders.length <= 1) {
 ungrouped.push(...gOrders);
 } else {
 result.push({ type: 'group-header', cartGroupId: gid, groupOrders: gOrders });
 for (const o of gOrders) result.push({ type: 'order', order: o, inGroup: true });
 }
 }
 for (const o of ungrouped) result.push({ type: 'order', order: o, inGroup: false });
 return result;
 }, [orders, groupByCart]);

 const handleSearch = () => {
 setSearchText(searchInput);
 setPage(1);
 };

 const handleClearFilters = () => {
 setSearchInput("");
 setShowAll(false);
 setBankTransferPending(false); // BUG-07 fix: bankTransferPending 명시적 리셋
 setSearchText("");
 setStatusFilter(["paid"]); // BUG-07 fix: paid 기본값으로 리셋
 setDateFrom("");
 setDateTo("");
 setSortBy("date");
 setSortOrder("desc");
 setPage(1);
 };

 const toggleSelect = (id: number) => {
 setSelectedOrders((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 };

 const toggleSelectAll = () => {
 if (selectedOrders.size === orders.length) {
 setSelectedOrders(new Set());
 } else {
 setSelectedOrders(new Set(orders.map((o: any) => o.id)));
 }
 };

 const toggleSort = (field: string) => {
 if (sortBy === field) {
 setSortOrder((prev) => (prev ==="asc"?"desc":"asc"));
 } else {
 setSortBy(field);
 setSortOrder("desc");
 }
 setPage(1);
 };

 if (loading || checkingAdmin) {
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

 return (
 <AdminLayout>
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <h2 className="text-xl font-bold text-gray-900">주문 관리</h2>
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={handleExport}
 disabled={exportMutation.isPending}
 className="border-blue-300 text-blue-700 hover:bg-blue-50"
 >
 <Download className="h-4 w-4 mr-1"/>
 {exportMutation.isPending ? '내보내는 중...' : '주문 내보내기'}
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => { setShowCsvDialog(true); setCsvEntries([]); setCsvResults(null); setCsvFileName(""); }}
 className="border-green-300 text-green-700 hover:bg-green-50"
 >
 <Upload className="h-4 w-4 mr-1"/>
 CSV 일괄 등록
 </Button>
 <span className="text-sm text-gray-500">총 {total}건</span>
 {selectedOrders.size > 0 && (
 <span className="text-sm text-pink-600 font-medium">({selectedOrders.size}건 선택)</span>
 )}
 </div>
 </div>

 {/* 마지막 배송 자동 업데이트 시간 배너 */}
 {lastSyncData && (
 <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
 <Truck className="h-4 w-4 flex-shrink-0" />
 <span>
 배송 정보 마지막 자동 업데이트: 
 {lastSyncData.lastSyncAt
 ? new Date(lastSyncData.lastSyncAt).toLocaleString('ko-KR', {
 timeZone: 'Asia/Seoul',
 year: 'numeric',
 month: '2-digit',
 day: '2-digit',
 hour: '2-digit',
 minute: '2-digit',
 })
 : '업데이트 이력 없음'}
 </span>
 <span className="text-blue-400 text-xs">(매일 한국시간 자정 자동 실행)</span>
 </div>
 )}

 {/* Search & Filter Panel */}
 <div className="bg-white rounded-lg border border-border">
 {/* 검색어 행 - 기존 유지 */}
 <div className="px-4 pt-4 pb-3 border-b border-gray-100">
 <div className="flex items-center gap-3">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
 <Input
 value={searchInput}
 onChange={(e) => setSearchInput(e.target.value)}
 onKeyDown={(e) => e.key ==="Enter"&& handleSearch()}
 placeholder="주문번호, 장바구니번호(#0000000), 수취인명, 전화번호 검색..."
 className="pl-10"
 />
 </div>
 <Button onClick={handleSearch} className="bg-pink-600 hover:bg-pink-700">
 <Search className="h-4 w-4 mr-1"/>
 검색
 </Button>
 </div>
 </div>

 {/* 필터 행들 */}
 <div className="divide-y divide-gray-100">
 {/* 주문일자 행 */}
 <div className="flex items-center px-4 py-3 gap-4">
 <span className="w-24 shrink-0 text-sm font-medium text-gray-600">주문일자</span>
 <div className="flex items-center gap-2">
 <Input
 type="date"
 value={dateFrom}
 onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
 className="h-8 text-sm w-36"
 />
 <span className="text-gray-400 text-sm">~</span>
 <Input
 type="date"
 value={dateTo}
 onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
 className="h-8 text-sm w-36"
 />
 {[
 { label:"오늘", days: 0 },
 { label:"7일", days: 7 },
 { label:"14일", days: 14 },
 { label:"1개월", days: 30 },
 { label:"3개월", days: 90 },
 { label:"전체", days: -1 },
 ].map(({ label, days }) => (
 <button
 key={label}
 onClick={() => {
 const today = new Date();
 const toStr = today.toISOString().slice(0, 10);
 if (days === -1) { setDateFrom(""); setDateTo(""); }
 else if (days === 0) { setDateFrom(toStr); setDateTo(toStr); }
 else {
 const from = new Date(today);
 from.setDate(today.getDate() - days);
 setDateFrom(from.toISOString().slice(0, 10));
 setDateTo(toStr);
 }
 setPage(1);
 }}
 className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 text-gray-600 whitespace-nowrap"
 >
 {label}
 </button>
 ))}
 </div>
 </div>

 {/* 입금/주문상태 행 */}
 <div className="flex items-center px-4 py-3 gap-4">
 <span className="w-24 shrink-0 text-sm font-medium text-gray-600">입금/주문상태</span>
 <div className="flex items-center gap-4 flex-wrap">
 {/* 전체 라디오 */}
 <label className="flex items-center gap-1.5 cursor-pointer">
 <input
 type="radio"
 name="orderStatus"
 value="all"
 checked={showAll && !bankTransferPending}
 onChange={() => {
 setShowAll(true);
 setBankTransferPending(false);
 setStatusFilter([]);
 setPage(1);
 }}
 className="accent-pink-600"
 />
 <span className="text-sm text-gray-700">전체</span>
 {statusCounts && <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{statusCounts['all'] ?? 0}</span>}
 </label>
 {[
 { value:"pending", label:"입금전"},
 { value:"paid", label:"결제완료"},
 { value:"confirmed", label:"상품준비중"},
 { value:"shipped", label:"배송중"},
 { value:"delivered", label:"배송완료"},
 { value:"cancelled", label:"전체취소"},
 ].map((status) => (
 <label key={status.value} className="flex items-center gap-1.5 cursor-pointer">
 <input
 type="radio"
 name="orderStatus"
 value={status.value}
 checked={!showAll && !bankTransferPending && !showDelayedTab && statusFilter.length === 1 && statusFilter[0] === status.value}
 onChange={(e) => {
 const val = e.target.value;
 setShowAll(false);
 setBankTransferPending(false);
 setShowDelayedTab(false);
 setStatusFilter([val]);
 setPage(1);
 }}
 className="accent-pink-600"
 />
 <span className="text-sm text-gray-700">{status.label}</span>
 {statusCounts && (
 <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
 ((statusCounts as Record<string, number>)[status.value] ?? 0) > 0
 ? 'bg-pink-100 text-pink-700'
 : 'bg-gray-100 text-gray-400'
 }`}>{(statusCounts as Record<string, number>)[status.value] ?? 0}</span>
 )}
 </label>
 ))}
 {/* 배송지연 필터 버튼 */}
 <button
 onClick={() => {
 setShowDelayedTab(true);
 setShowAll(false);
 setBankTransferPending(false);
 setPage(1);
 }}
 className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
 showDelayedTab
 ? 'bg-red-100 text-red-700 border-red-300'
 : 'bg-white text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
 }`}
 >
 <Truck className="w-3 h-3" />
 배송지연
 {delayedOrdersData && delayedOrdersData.length > 0 && (
 <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[9px] font-bold bg-red-500 text-white rounded-full">
 {delayedOrdersData.length}
 </span>
 )}
 </button>
 </div>
 </div>
 {/* 결제수단 행 */}
 <div className="flex items-center px-4 py-3 gap-4">
 <span className="w-24 shrink-0 text-sm font-medium text-gray-600">결제수단</span>
 <div className="flex items-center gap-4">
 {[
 { value:"all", label:"전체"},
 { value:"stripe", label:"카드결제"},
 { value:"bank_transfer", label:"무통장 입금"},
 ].map(({ value, label }) => (
 <label key={value} className="flex items-center gap-1.5 cursor-pointer">
 <input
 type="radio"
 name="paymentMethod"
 checked={paymentMethodFilter === value}
 onChange={() => { setPaymentMethodFilter(value); setPage(1); }}
 className="accent-pink-600"
 />
 <span className="text-sm text-gray-700">{label}</span>
 </label>
 ))}
 </div>
 </div>

 {/* 정렬 + 검색 버튼 행 */}
 <div className="flex items-center justify-between px-4 py-3">
 <div className="flex items-center gap-4">
 <span className="w-24 shrink-0 text-sm font-medium text-gray-600">정렬</span>
 <div className="flex items-center gap-3">
 {[
 { value:"date", label:"주문일"},
 { value:"amount", label:"금액"},
 { value:"status", label:"상태"},
 ].map(({ value, label }) => (
 <label key={value} className="flex items-center gap-1.5 cursor-pointer">
 <input
 type="radio"
 name="sortBy"
 checked={sortBy === value}
 onChange={() => { setSortBy(value); setPage(1); }}
 className="accent-pink-600"
 />
 <span className="text-sm text-gray-700">{label}</span>
 </label>
 ))}
 <label className="flex items-center gap-1.5 cursor-pointer">
 <input
 type="checkbox"
 checked={sortOrder ==="asc"}
 onChange={(e) => { setSortOrder(e.target.checked ?"asc":"desc"); setPage(1); }}
 className="accent-pink-600"
 />
 <span className="text-sm text-gray-700">오름차순</span>
 </label>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 px-8">
 <Search className="h-4 w-4 mr-1"/>
 검색
 </Button>
 {(searchText || !showAll || dateFrom || dateTo || paymentMethodFilter !=="all") && (
 <Button variant="outline"size="sm"onClick={handleClearFilters}>
 <X className="h-4 w-4 mr-1"/>
 초기화
 </Button>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* 배송지연 탭 토글 버튼 */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <button
 onClick={() => { setShowDelayedTab(false); setShowCartTab(false); }}
 className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
 !showDelayedTab && !showCartTab
 ? 'border-pink-600 text-pink-700 bg-pink-50'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
 }`}
 >
 전체 주문
 </button>
 <button
 onClick={() => { setShowDelayedTab(true); setShowCartTab(false); }}
 className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
 showDelayedTab
 ? 'border-red-500 text-red-700 bg-red-50'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
 }`}
 >
 <Truck className="h-4 w-4"/>
 배송 지연
 {delayedOrdersData && delayedOrdersData.length > 0 && (
 <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
 {delayedOrdersData.length}
 </span>
 )}
 </button>
 <button
 onClick={() => { setShowCartTab(true); setShowDelayedTab(false); }}
 className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
 showCartTab
 ? 'border-blue-500 text-blue-700 bg-blue-50'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
 }`}
 >
 <ShoppingCart className="h-4 w-4"/>
 장바구니
 {cartListData && cartListData.total > 0 && (
 <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-blue-500 text-white rounded-full">
 {cartListData.total}
 </span>
 )}
 </button>
 </div>
 {!showDelayedTab && !showCartTab && (
 <button
 onClick={() => setGroupByCart(prev => !prev)}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
 groupByCart
 ? 'border-pink-400 text-pink-700 bg-pink-50 hover:bg-pink-100'
 : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
 }`}
 >
 <Package className="h-3.5 w-3.5"/>
 {
 groupByCart ? '장바구니 묶음 ON' : '장바구니 묶음 OFF'
 }
 </button>
 )}
 </div>

 {/* 배송지연 탭 콘텐츠 */}
 {showDelayedTab && (
 <>
 <div className="bg-white rounded-lg border border-border overflow-hidden">
 <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Truck className="h-4 w-4 text-red-500"/>
 <span className="text-sm font-semibold text-red-700">배송 지연 주문 (발송 후 14일 이상 경과)</span>
 {delayedOrdersData && (
 <span className="text-xs text-red-500">{delayedOrdersData.length}건</span>
 )}
 {selectedDelayedOrders.size > 0 && (
 <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{selectedDelayedOrders.size}건 선택</span>
 )}
 </div>
 <div className="flex items-center gap-2">
 {delayedOrdersData && delayedOrdersData.length > 0 && (
 <>
 {/* 세관조회 건이 있을 때만 세관조회 이메일 버튼 표시 */}
 {delayedOrdersData.some((o: any) => o.trackingHasAlert && o.trackingAlertType === 'customs') && (
 <Button
 size="sm"
 className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white"
 onClick={() => setSendCustomsEmailDialog(true)}
 >
 <AlertTriangle className="h-3 w-3 mr-1"/>
 {selectedDelayedOrders.size > 0 && delayedOrdersData.filter((o: any) => selectedDelayedOrders.has(o.id) && o.trackingHasAlert).length > 0
 ? `세관조회 ${delayedOrdersData.filter((o: any) => selectedDelayedOrders.has(o.id) && o.trackingHasAlert).length}건 안내`
 : `세관조회 안내 이메일`
 }
 </Button>
 )}
 <Button
 size="sm"
 className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white"
 onClick={() => setSendEmailDialog(true)}
 >
 <Mail className="h-3 w-3 mr-1"/>
 {selectedDelayedOrders.size > 0 ? `${selectedDelayedOrders.size}건 이메일 발송` : '전체 이메일 발송'}
 </Button>
 </>
 )}
 <Button
 variant="outline"
 size="sm"
 onClick={() => refetchDelayed()}
 className="border-red-300 text-red-600 hover:bg-red-50 h-7 text-xs"
 >
 새로고침
 </Button>
 </div>
 </div>
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-3 py-3 w-8">
 <input
 type="checkbox"
 className="rounded cursor-pointer"
 checked={delayedOrdersData ? selectedDelayedOrders.size === delayedOrdersData.length && delayedOrdersData.length > 0 : false}
 onChange={(e) => {
 if (e.target.checked && delayedOrdersData) {
 setSelectedDelayedOrders(new Set(delayedOrdersData.map((o: any) => o.id)));
 } else {
 setSelectedDelayedOrders(new Set());
 }
 }}
 />
 </th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">주문번호</th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">수취인 / 연락처</th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">주문 상품</th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">주문금액</th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase" style={{width: '160px'}}>송장입력</th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {delayedLoading ? (
 <tr>
 <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2"></div>
 로딩 중...
 </td>
 </tr>
 ) : !delayedOrdersData || delayedOrdersData.length === 0 ? (
 <tr>
 <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
 <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400"/>
 <p className="text-sm">배송 지연 주문이 없습니다.</p>
 <p className="text-xs text-gray-300 mt-1">발송 후 14일 이내 배송 중인 주문만 있습니다.</p>
 </td>
 </tr>
 ) : (
 delayedOrdersData.map((order: any) => (
 <tr
 key={order.id}
 className={`hover:bg-red-50 cursor-pointer ${selectedDelayedOrders.has(order.id) ? 'bg-orange-50' : ''}`}
 onClick={() => navigate(`/admin/orders/${order.id}`)}
 >
 <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
 <button onClick={() => { const next = new Set(selectedDelayedOrders); if (next.has(order.id)) next.delete(order.id); else next.add(order.id); setSelectedDelayedOrders(next); }} className="text-gray-400 hover:text-gray-600">
 {selectedDelayedOrders.has(order.id) ? (
 <CheckSquare className="h-4 w-4 text-gray-500"/>
 ) : (
 <Square className="h-4 w-4"/>
 )}
 </button>
 </td>
 <td className="px-2 py-1.5">
 <div className="flex items-center gap-2">
 <div>
 <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
 {order.cartGroupId && (
 <p className="text-[10px]" style={{color: '#c07777'}}>{order.cartGroupId}</p>
 )}
 <p className="text-xs text-gray-400" style={{fontSize: '11px'}}>{new Date(order.createdAt).toLocaleString('ko-KR')}</p>
 </div>
 {order.daysDelayed > 0 && (
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger>
 <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
 {order.daysDelayed}일 경과
 </Badge>
 </TooltipTrigger>
 <TooltipContent>
 <p>발송 후 {order.daysDelayed}일이 경과했습니다</p>
 </TooltipContent>
 </Tooltip>
 </TooltipProvider>
 )}
 </div>
 </td>
 <td className="px-2 py-1.5" style={{minWidth:'110px'}}>
 <p className="text-sm text-gray-900 whitespace-nowrap">{order.shippingName}</p>
 <p className="text-xs text-gray-400 whitespace-nowrap" style={{fontSize: '11px'}}>{order.shippingPhone ? order.shippingPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : ''}</p>
 </td>
 <td className="px-2 py-1.5">
 {order.itemsWithImages && order.itemsWithImages.length > 0 ? (
 <div className="flex items-center gap-2">
 {(() => {
 const item = order.itemsWithImages[0];
 return (
 <div
 className="w-10 h-10 rounded border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0"
 title={`${item.productName} x${item.quantity}`}
 >
 {item.imageUrl ? (
 <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
 ) : (
 <Package className="h-4 w-4 text-gray-300"/>
 )}
 </div>
 );
 })()}
 <div className="flex-1 min-w-0">
 <p className="text-xs text-gray-800 font-medium line-clamp-2">
 {order.itemsWithImages[0]?.productName || order.itemsSummary || '-'}
 </p>
 {order.itemsWithImages[0] && (
 <p className="text-[10px] text-gray-400 whitespace-nowrap" style={{fontSize: '11px'}}>
 수량: {order.itemsWithImages[0].quantity}개
 {(order.itemsWithImages[0] as any).unitPrice && (
 <>{' · '}단가: ¥{Number((order.itemsWithImages[0] as any).unitPrice).toLocaleString()}</>
 )}
 {(order.itemsWithImages[0] as any).subtotal && (
 <>{' · '}소계: <strong>¥{Number((order.itemsWithImages[0] as any).subtotal).toLocaleString()}</strong></>
 )}
 </p>
 )}
 </div>
 </div>
 ) : (
 <p className="text-xs text-gray-600">{order.itemsSummary || '-'}</p>
 )}
 </td>
 <td className="px-2 py-1.5">
 <div className="space-y-0.5 text-right">
 <div className="flex items-center justify-end gap-1 h-4">
 {(Number(order.couponDiscount || 0) + Number(order.pointsUsed || 0)) > 0 && (
 <span className="text-xs text-purple-600 whitespace-nowrap" style={{fontSize: '12px'}}>-{(Number(order.couponDiscount || 0) + Number(order.pointsUsed || 0)).toLocaleString()}</span>
 )}
 </div>
 <div className="flex items-center justify-end gap-1">
 <span className="text-sm text-gray-900 whitespace-nowrap" style={{fontSize: '12px', fontWeight: '600'}}>{Number(order.totalAmount || 0).toLocaleString()}</span>
 </div>
 </div>
 </td>
 <td className="px-2 py-1.5">
 <div className="flex flex-col gap-0.5">
 {order.trackingHasAlert && (
 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap" style={{fontSize: '11px', fontWeight: '500'}}>
 <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
 {order.trackingAlertType === 'customs' ? '세관조회' : '배송문제'}
 </span>
 )}
 <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[order.status]}`} style={{fontSize: '11px'}}>
 {statusLabels[order.status]}
 </span>
 </div>
 </td>
 <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()} style={{width: '160px'}}>
 <div className="flex flex-col gap-1">
 <div className="flex items-center gap-1">
 <input
 className="text-[10px] font-mono border border-gray-200 rounded px-1 py-0.5 placeholder-gray-300 focus:border-blue-400 focus:outline-none bg-gray-50"
 style={{width: '120px', minWidth: 0}}
 placeholder="송장번호"
 value={trackingInputs[order.id]?.trackingNumber ?? (order.shipment?.trackingNumber || '')}
 maxLength={30}
 onChange={(e) => setTrackingInputs(prev => ({
 ...prev,
 [order.id]: { carrier: prev[order.id]?.carrier || order.shipment?.carrier || 'Japan Post', trackingNumber: e.target.value.slice(0, 30) }
 }))}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 const val = trackingInputs[order.id];
 const trackNum = val?.trackingNumber?.trim() || order.shipment?.trackingNumber?.trim();
 if (trackNum) {
 const firstItemId = (order as any).itemsWithImages?.[0]?.id || (order as any).items?.[0]?.id || 0;
 inlineTrackingMutation.mutate({ orderId: order.id, orderItemId: firstItemId, trackingNumber: trackNum, carrier: val?.carrier || order.shipment?.carrier || 'Japan Post' });
 setTrackingInputs(prev => { const n = {...prev}; delete n[order.id]; return n; });
 }
 }
 }}
 onClick={(e) => {
 if (order.shipment?.trackingNumber && !trackingInputs[order.id]?.trackingNumber) {
 (e.target as HTMLInputElement).select();
 }
 }}
 />
 {order.shipment?.trackingNumber && (
 <button
 className="flex-shrink-0 p-0.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
 title="배송 타임라인 보기"
 onClick={(e) => {
 e.stopPropagation();
 setTimelineModal({
 open: true,
 orderId: order.id,
 trackingNumber: order.shipment!.trackingNumber || '',
 carrier: order.shipment!.carrier || 'Japan Post',
 status: order.status,
 productName: (order as any).itemsWithImages?.[0]?.productName || (order as any).itemsSummary || '',
 shippingName: order.shippingName || '',
 });
 }}
 >
 <Truck className="h-3 w-3" style={{width: '15px', height: '15px'}}/>
 </button>
 )}
 </div>
 {order.shipment && (
 <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full transition-all ${
 order.shipment.status === 'delivered' ? 'bg-green-500' : 'bg-blue-500'
 }`}
 style={{ width: `${
 order.shipment.status === 'delivered' ? 100 :
 order.shipment.status === 'out_for_delivery' ? 80 :
 order.shipment.status === 'in_transit' ? 60 :
 order.shipment.status === 'picked_up' ? 40 : 20
 }%` }}
 />
 </div>
 )}
 </div>
 </td>
 <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
 <button
 className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
 title="상세 보기"
 onClick={(e) => { e.stopPropagation(); navigate(`/admin/orders/${order.id}`); }}
 >
 <Eye className="h-4 w-4"/>
 </button>
 </td>
 </tr>
 ))
         )}
 </tbody>
 </table>
 </div>
 </>
 )}
 {/* 장바구니 탭 콘텐츠 */}
 {showCartTab && (
 <div className="bg-white rounded-lg border border-border overflow-hidden">
 <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
 <ShoppingCart className="h-4 w-4 text-blue-500"/>
 <span className="text-sm font-semibold text-blue-700">장바구니 목록</span>
 {cartListData && <span className="text-xs text-blue-500">전체 {cartListData.total}명</span>}
 </div>
 {/* 검색 */}
 <div className="px-4 py-3 border-b border-border">
 <div className="flex items-center gap-2">
 <Input
 placeholder="회원명/이메일/연락처 검색"
 value={cartSearch}
 onChange={e => { setCartSearch(e.target.value); setCartPage(1); }}
 className="max-w-xs h-8 text-sm"
 />
 </div>
 </div>
 {/* 목록 */}
 {cartListLoading ? (
 <div className="flex items-center justify-center py-12">
 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"/>
 </div>
 ) : !cartListData || cartListData.items.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-12 text-gray-400">
 <ShoppingCart className="h-8 w-8 mb-2"/>
 <p className="text-sm">장바구니에 상품을 담은 회원이 없습니다.</p>
 </div>
 ) : (
 <table className="w-full text-sm">
 <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
 <tr>
 <th className="px-4 py-2 text-left">회원</th>
 <th className="px-4 py-2 text-left">이메일</th>
 <th className="px-4 py-2 text-center">상품 종류</th>
 <th className="px-4 py-2 text-center">수량 합계</th>
 <th className="px-4 py-2 text-left">마지막 업데이트</th>
 <th className="px-4 py-2 text-center">상세</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {cartListData.items.map((row: typeof cartListData.items[0]) => (
 <tr key={row.userId} className="hover:bg-gray-50">
 <td className="px-4 py-3 font-medium text-gray-900">{row.name || '-'}</td>
 <td className="px-4 py-3 text-gray-600">{row.email || '-'}</td>
 <td className="px-4 py-3 text-center">
 <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
 {row.itemCount}
 </span>
 </td>
 <td className="px-4 py-3 text-center text-gray-700">{row.totalQuantity}</td>
 <td className="px-4 py-3 text-gray-500 text-xs">
 {row.lastUpdated ? new Date(row.lastUpdated).toLocaleString('ko-KR') : '-'}
 </td>
 <td className="px-4 py-3 text-center">
 <button
 onClick={() => setCartDetailUserId(row.userId === cartDetailUserId ? null : row.userId)}
 className="text-xs text-blue-600 hover:underline"
 >
 {cartDetailUserId === row.userId ? '닫기' : '보기'}
 </button>
 </td>
 </tr>
 ))}
 {/* 상세 행 */}
 {cartListData.items.map((row: typeof cartListData.items[0]) =>
 cartDetailUserId === row.userId ? (
 <tr key={`detail-${row.userId}`}>
 <td colSpan={6} className="bg-blue-50 px-4 py-3">
 {cartDetailLoading ? (
 <div className="flex items-center gap-2 text-xs text-blue-500">
 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"/>
 로딩 중...
 </div>
 ) : cartDetailData && cartDetailData.items.length > 0 ? (
 <div className="space-y-2">
 <p className="text-xs font-semibold text-blue-700 mb-2">장바구니 상품 목록</p>
 <div className="grid grid-cols-1 gap-2">
 {cartDetailData.items.map((item: typeof cartDetailData.items[0]) => (
 <div key={item.id} className="flex items-center gap-3 bg-white rounded p-2 border border-blue-100">
 {item.productImage && (
 <img src={item.productImage} alt={item.productName || ''} className="w-10 h-10 object-cover rounded"/>
 )}
 <div className="flex-1 min-w-0">
 <p className="text-xs font-medium text-gray-900 truncate">{item.productName || item.productNameKo || '-'}</p>
 <p className="text-xs text-gray-500">수량: {item.quantity} | 가격: {item.productPrice ? item.productPrice.toLocaleString() + '円' : '-'}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 ) : (
 <p className="text-xs text-gray-400">상세 정보가 없습니다.</p>
 )}
 </td>
 </tr>
 ) : null
 )}
 </tbody>
 </table>
 )}
 {/* 페이지네이션 */}
 {cartListData && cartListData.total > 30 && (
 <div className="flex items-center justify-between px-4 py-3 border-t border-border">
 <span className="text-xs text-gray-500">전체 {cartListData.total}명</span>
 <div className="flex items-center gap-1">
 <button
 onClick={() => setCartPage(p => Math.max(1, p - 1))}
 disabled={cartPage === 1}
 className="px-2 py-1 text-xs border rounded disabled:opacity-40"
 >←</button>
 <span className="text-xs px-2">{cartPage} / {Math.ceil(cartListData.total / 30)}</span>
 <button
 onClick={() => setCartPage(p => Math.min(Math.ceil(cartListData.total / 30), p + 1))}
 disabled={cartPage >= Math.ceil(cartListData.total / 30)}
 className="px-2 py-1 text-xs border rounded disabled:opacity-40"
 >→</button>
 </div>
 </div>
 )}
 </div>
 )}
 {!showDelayedTab && !showCartTab && (
 <>
 {/* Bulk Actions */}
 {selectedOrders.size > 0 && (
 <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 flex items-center justify-between">
 <span className="text-sm text-pink-700 font-medium">
 {selectedOrders.size}건 선택됨
 </span>
 <div className="flex items-center gap-2">
 <Button
 size="sm"
 variant="outline"
 className="border-green-400 text-green-700 hover:bg-green-50 font-medium"
 onClick={() => {
 bulkConfirmBankMutation.mutate({
 orderIds: Array.from(selectedOrders),
 });
 }}
 disabled={bulkConfirmBankMutation.isPending}
 >
 {bulkConfirmBankMutation.isPending ? '처리 중...' : '일괄 입금확인'}
 </Button>
 <Button
 size="sm"
 variant="outline"
 className="border-blue-300 text-blue-700 hover:bg-blue-50"
 onClick={() => {
 bulkUpdateMutation.mutate({
 orderIds: Array.from(selectedOrders),
 status:"confirmed",
 });
 }}
 disabled={bulkUpdateMutation.isPending}
 >
 선택 항목 일괄 확인
 </Button>

 <Button
 size="sm"
 variant="outline"
 className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
 onClick={() => {
 bulkUpdateMutation.mutate({
 orderIds: Array.from(selectedOrders),
 status:"shipped",
 });
 }}
 disabled={bulkUpdateMutation.isPending}
 >
 선택 항목 일괄 발송
 </Button>
 <Button
 size="sm"
 variant="outline"
 className="border-pink-300 text-pink-600 hover:bg-pink-100"
 onClick={() => setShowBulkDialog(true)}
 >
 기타 상태 변경
 </Button>
 <Button
 size="sm"
 variant="ghost"
 onClick={() => setSelectedOrders(new Set())}
 >
 선택 해제
 </Button>
 </div>
 </div>
 )}

 {/* 송장 일괄 저장 배너 */}
 {Object.values(trackingInputs).some(v => v.trackingNumber.trim()) && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
 <span className="text-sm text-blue-700 font-medium">
 {Object.values(trackingInputs).filter(v => v.trackingNumber.trim()).length}건의 송장번호가 입력되었습니다. 일괄 저장하시겠습니까?
 </span>
 <div className="flex items-center gap-2">
 <Button
 size="sm"
 className="bg-blue-600 hover:bg-blue-700 text-white"
 onClick={handleBulkSaveTracking}
 disabled={savingBulkTracking}
 >
 {savingBulkTracking ? '저장 중...' : '송장 일괄 저장'}
 </Button>
 <Button
 size="sm"
 variant="ghost"
 onClick={() => setTrackingInputs({})}
 >
 입력 취소
 </Button>
 </div>
 </div>
 )}

 {/* Orders Table */}
 <div className="bg-white rounded-lg border border-border overflow-hidden">
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-3 py-3 text-left w-10">
 <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
 {selectedOrders.size === orders.length && orders.length > 0 ? (
 <CheckSquare className="h-4 w-4"/>
 ) : (
 <Square className="h-4 w-4"/>
 )}
 </button>
 </th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
 <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-gray-700">
 주문번호
 <ArrowUpDown className="h-3 w-3"/>
 </button>
 </th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{minWidth:'110px'}}>수취인 / 연락처</th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">주문 상품</th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[130px]">
 <button onClick={() => toggleSort("amount")} className="flex items-center gap-1 hover:text-gray-700">
 주문금액
 <ArrowUpDown className="h-3 w-3"/>
 </button>
 </th>

 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{width:'60px',minWidth:'60px'}}>
 <button onClick={() => toggleSort("status")} className="flex items-center gap-1 hover:text-gray-700">
 상태
 <ArrowUpDown className="h-3 w-3"/>
 </button>
 </th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase" style={{width: '160px'}}>송장입력</th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {isLoading ? (
 <tr>
 <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-2"></div>
 로딩 중...
 </td>
 </tr>
 ) : orders.length === 0 ? (
 <tr>
 <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
 <Package className="h-8 w-8 mx-auto mb-2"/>
 주문이 없습니다
 </td>
 </tr>
 ) : groupedOrderRows !== null ? (
 groupedOrderRows.map((row) => {
 if (row.type === 'group-header') {
 const groupTotal = row.groupOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);
 return (
 <tr key={`group-${row.cartGroupId}`} className="border-t border-pink-100" style={{backgroundColor: '#fff7f9'}}>
 <td className="px-2 py-2" style={{backgroundColor: '#fff7f9'}} onClick={(e) => e.stopPropagation()}>
 <button
 onClick={() => {
 const ids = row.groupOrders.map((o: any) => o.id);
 setSelectedOrders(prev => {
 const next = new Set(prev);
 const allSelected = ids.every((id: number) => next.has(id));
 if (allSelected) ids.forEach((id: number) => next.delete(id));
 else ids.forEach((id: number) => next.add(id));
 return next;
 });
 }}
 className="text-gray-400 hover:text-gray-600"
 >
 {row.groupOrders.every((o: any) => selectedOrders.has(o.id))
 ? <CheckSquare className="h-4 w-4 text-gray-500"/>
 : <Square className="h-4 w-4"/>}
 </button>
 </td>
 <td colSpan={10} className="px-2 py-2" style={{backgroundColor: '#fff7f9'}}>
                 <div className="flex items-center justify-between gap-2">
                   {/* 왼쪽: 묶음 기본 정보 */}
                   <div className="flex items-center gap-3 flex-wrap">
                     <span className="inline-flex items-center gap-1 text-[11px] text-gray-700 font-semibold">
                       <Package className="h-3 w-3"/>
                       {row.cartGroupId}
                     </span>
                     <span className="text-[11px] text-gray-500">
                       {row.groupOrders.length}개 묶음
                     </span>
                     <span className="text-[11px] text-gray-700 font-medium">
                       합계금액: ¥{groupTotal.toLocaleString()}
                     </span>
                     {/* 입금전(pending) 상태일 때만 입금확인 버튼 표시 */}
                     {row.groupOrders.every((o: any) => o.status === 'pending') && (
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           if (!window.confirm(`이 묶음 주문(${row.groupOrders.length}건)을 입금확인 처리하시겠습니까?`)) return;
                           row.groupOrders.forEach((o: any) => {
                             quickUpdateMutation.mutate({ orderId: o.id, status: 'paid' });
                           });
                         }}
                         disabled={quickUpdateMutation.isPending}
                         className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded border border-green-500 text-green-700 bg-green-50 hover:bg-green-100 active:bg-green-200 transition-colors disabled:opacity-50 whitespace-nowrap" style={{fontSize: '11px'}}
                       >
                         ✓ 입금확인
                       </button>
                     )}
                   </div>
                   {/* 오른쪽: 이메일 / 주문자명 / 우편번호 / 주소 */}
                   <div className="flex items-center gap-2 flex-shrink-0 text-[11px] text-gray-500">
                     {(row.groupOrders[0] as any).userEmail && (
                       <span style={{fontWeight: '400', color: 'oklch(0.551 0.027 264.364)'}}>{(row.groupOrders[0] as any).userEmail}</span>
                     )}
                     {(row.groupOrders[0] as any).userName && (
                       <>
                         <span className="text-gray-300">|</span>
                         <span>{(row.groupOrders[0] as any).userName}</span>
                       </>
                     )}
                     {(row.groupOrders[0] as any).shippingPostalCode && (
                       <>
                         <span className="text-gray-300">|</span>
                         <span>〒{(row.groupOrders[0] as any).shippingPostalCode}</span>
                       </>
                     )}
                     {(row.groupOrders[0] as any).shippingAddress && (
                       <>
                         <span className="text-gray-300">|</span>
                         <span className="max-w-xs truncate">{(row.groupOrders[0] as any).shippingAddress}</span>
                       </>
                     )}
                   </div>
                 </div>
               </td>
 </tr>
 );
 }
 const order = row.order;
 return (
 <tr
 key={order.id}
 className={`hover:bg-gray-50 cursor-pointer ${row.inGroup ? 'border-l-2 border-gray-200' : ''}`}
 onClick={() => navigate(`/admin/orders/${order.id}`)}
 >
 <td className="px-2 py-1.5"onClick={(e) => e.stopPropagation()}>
 <button onClick={() => toggleSelect(order.id)} className="text-gray-400 hover:text-gray-600">
 {selectedOrders.has(order.id) ? (
<CheckSquare className="h-4 w-4 text-gray-500"/>
               ) : (
                <Square className="h-4 w-4"/>
               )}
              </button>
             </td>
             <td className="px-2 py-1.5">
              <div className="flex items-center gap-2">
               <div>
                <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                {(order as any).cartGroupId && (
                <p className="text-[10px] text-gray-300" style={{color: '#c07777'}}>{(order as any).cartGroupId}</p>
 )}
 <p className="text-xs text-gray-400" style={{fontSize: '11px'}}>{new Date(order.createdAt).toLocaleString("ko-KR")}</p>
 </div>
 {(order as any).daysDelayed && (order as any).daysDelayed > 14 && (
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger>
 <Badge variant="destructive"className="text-[10px] px-1.5 py-0.5">
 {(order as any).daysDelayed}일 경과
 </Badge>
 </TooltipTrigger>
 <TooltipContent>
 <p>발송 후 {(order as any).daysDelayed}일이 경과했습니다</p>
 </TooltipContent>
 </Tooltip>
 </TooltipProvider>
 )}
 </div>
 </td>
 <td className="px-2 py-1.5" style={{minWidth:'110px'}}>
 <p className="text-sm text-gray-900 whitespace-nowrap">{order.shippingName}</p>
 <p className="text-xs text-gray-400 whitespace-nowrap" style={{fontSize: '11px'}}>{order.shippingPhone ? order.shippingPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : ''}</p>
 </td>
 <td className="px-2 py-1.5">
 {order.itemsWithImages && order.itemsWithImages.length > 0 ? (
 <div className="flex items-center gap-2">
 {/* 상품별 주문: 단일 상품 썸네일 */}
 {(() => {
 const item = order.itemsWithImages[0];
 return (
 <div
 className="w-10 h-10 rounded border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0"
 title={`${item.productName} x${item.quantity}`}
 >
 {item.imageUrl ? (
 <img
 src={item.imageUrl}
 alt={item.productName}
 className="w-full h-full object-cover"
 />
 ) : (
 <Package className="h-4 w-4 text-gray-300"/>
 )}
 </div>
 );
 })()}
 {/* 상품 정보 텍스트 */}
 <div className="flex-1 min-w-0">
 <p className="text-xs text-gray-800 font-medium line-clamp-2"title={order.itemsWithImages[0]?.productName ||""}>
 {order.itemsWithImages[0]?.productName || order.itemsSummary ||"-"}
 </p>
 {order.itemsWithImages[0] && (
 <p className="text-[10px] text-gray-400 whitespace-nowrap" style={{fontSize: '11px'}}>
 수량: {order.itemsWithImages[0].quantity}개
 {(order.itemsWithImages[0] as any).unitPrice && (
                 <>
                 {' · '}단가: ¥{Number((order.itemsWithImages[0] as any).unitPrice).toLocaleString()}
                 </>
                 )}
{(order.itemsWithImages[0] as any).subtotal && (
                 <>
                 {' · '}소계: <strong>¥{Number((order.itemsWithImages[0] as any).subtotal).toLocaleString()}</strong>
                 </>
                 )}
 </p>
 )}
 </div>
 </div>
 ) : (
 <p className="text-xs text-gray-600">
 {order.itemsSummary ||"-"}
 </p>
 )}
 </td>
 <td className="px-2 py-1.5">
 {(() => {
 const itemsSubtotal = (order.itemsWithImages || []).reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0);
 const shippingFee = Number(order.shippingFee || 0);
 const couponDiscount = Number(order.couponDiscount || 0);
 const pointsUsed = Number(order.pointsUsed || 0);
 const grossTotal = itemsSubtotal > 0 ? itemsSubtotal + shippingFee : Number(order.totalAmount || 0);
 const finalTotal = Number(order.totalAmount || 0);
 const expectedFinal = Math.max(0, grossTotal - couponDiscount - pointsUsed);
 const hasAmountMismatch = itemsSubtotal > 0 && Math.abs(expectedFinal - finalTotal) > 1 && order.status !== 'cancelled' && order.status !== 'partially_cancelled';
 const totalDiscount = couponDiscount + pointsUsed;
 return (
 <div className="space-y-0.5 text-right">
 {/* 위 줄: 할인금액 (없으면 빈 줄) */}
 <div className="flex items-center justify-end gap-1 h-4">
 {totalDiscount > 0 && (
 <span className="text-xs text-purple-600 whitespace-nowrap" style={{fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif', fontSize: '12px'}}>-{totalDiscount.toLocaleString()}</span>
 )}
 </div>
 {/* 아래 줄: 최종결제금액 */}
 <div className="flex items-center justify-end gap-1">
 <span className="text-sm text-gray-900 whitespace-nowrap" style={{fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif', fontSize: '12px', fontWeight: '600'}}>{finalTotal.toLocaleString()}</span>
 {hasAmountMismatch && (
 <span title={`금액 불일치: 계산값 ${expectedFinal.toLocaleString()} vs DB ${finalTotal.toLocaleString()}`} className="cursor-help flex-shrink-0">
 <AlertTriangle className="w-3 h-3 text-amber-500"/>
 </span>
 )}
 </div>
 </div>
 );
 })()}
 </td>

 <td className="px-2 py-1.5">
 <div className="flex flex-col gap-0.5">
 {(order as any).trackingHasAlert && (
 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap" style={{fontSize: '11px', fontWeight: '500'}}>
 <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
 {(order as any).trackingAlertType === 'customs' ? '세관조회' : '배송문제'}
 </span>
 )}
 <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[order.status]}`} style={{fontSize: '11px'}}>
 {statusLabels[order.status]}
 </span>
 </div>
 </td>
 {/* 통합 송장입력 열: 복사가능 텍스트박스 + 진행률 바 + 타임라인 아이콘 */}
 <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()} style={{width: '160px'}}>
 <div className="flex flex-col gap-1">
 {/* 송장번호 텍스트박스 + 타임라인 아이콘 */}
 <div className="flex items-center gap-1">
 <input
 className="text-[10px] font-mono border border-gray-200 rounded px-1 py-0.5 placeholder-gray-300 focus:border-blue-400 focus:outline-none bg-gray-50"
 style={{width: '120px', minWidth: 0}}
 placeholder="송장번호"
 value={trackingInputs[order.id]?.trackingNumber ?? (order.shipment?.trackingNumber || "")}
 maxLength={30}
 onChange={(e) => setTrackingInputs(prev => ({
 ...prev,
 [order.id]: { carrier: prev[order.id]?.carrier || order.shipment?.carrier || "Japan Post", trackingNumber: e.target.value.slice(0, 30) }
 }))}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 const val = trackingInputs[order.id];
 const trackNum = val?.trackingNumber?.trim() || order.shipment?.trackingNumber?.trim();
 if (trackNum) {
 const firstItemId = (order as any).itemsWithImages?.[0]?.id || (order as any).items?.[0]?.id || (order as any).items?.[0]?.orderItemId || 0;
 inlineTrackingMutation.mutate({ orderId: order.id, orderItemId: firstItemId, trackingNumber: trackNum, carrier: val?.carrier || order.shipment?.carrier || "Japan Post" });
 setTrackingInputs(prev => { const n = {...prev}; delete n[order.id]; return n; });
 }
 }
 }}
 onClick={(e) => {
 // 송장번호가 있으면 클릭 시 전체 선택 (복사 편의)
 if (order.shipment?.trackingNumber && !trackingInputs[order.id]?.trackingNumber) {
 (e.target as HTMLInputElement).select();
 }
 }}
 />
 {/* 타임라인 아이콘 - 송장번호가 있을 때만 표시 */}
 {order.shipment?.trackingNumber && (
 <button
 className="flex-shrink-0 p-0.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
 title="배송 타임라인 보기"
 onClick={(e) => {
 e.stopPropagation();
 setTimelineModal({
 open: true,
 orderId: order.id,
 trackingNumber: order.shipment!.trackingNumber || "",
 carrier: order.shipment!.carrier || "Japan Post",
 status: order.status,
 productName: (order as any).itemsWithImages?.[0]?.productName || (order as any).itemsSummary || "",
 shippingName: order.shippingName || "",
 });
 }}
 >
 <Truck className="h-3 w-3" style={{width: '15px', height: '15px'}}/>
 </button>
 )}
 </div>
 {/* 진행률 바 */}
 {order.shipment && (
 <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full transition-all ${
 order.shipment.status === 'delivered' ? 'bg-green-500' : 'bg-blue-500'
 }`}
 style={{ width: `${
 order.shipment.status === 'delivered' ? 100 :
 order.shipment.status === 'out_for_delivery' ? 80 :
 order.shipment.status === 'in_transit' ? 60 :
 order.shipment.status === 'picked_up' ? 40 : 20
 }%` }}
 />
 </div>
 )}
 </div>
 </td>
 <td className="px-2 py-1.5"onClick={(e) => e.stopPropagation()}>
 <button
 className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
 title="상세 보기"
 onClick={(e) => { e.stopPropagation(); navigate(`/admin/orders/${order.id}`); }}
 >
 <Eye className="h-4 w-4"/>
 </button>
 </td>
 </tr>
 );
 })
 ) : (
         orders.map((order: any) => {
         return (
 <tr
 key={order.id}
 className={`hover:bg-gray-50 cursor-pointer `}
 onClick={() => navigate(`/admin/orders/${order.id}`)}
 >
 <td className="px-2 py-1.5"onClick={(e) => e.stopPropagation()}>
 <button onClick={() => toggleSelect(order.id)} className="text-gray-400 hover:text-gray-600">
 {selectedOrders.has(order.id) ? (
<CheckSquare className="h-4 w-4 text-gray-500"/>
               ) : (
                <Square className="h-4 w-4"/>
               )}
              </button>
             </td>
             <td className="px-2 py-1.5">
              <div className="flex items-center gap-2">
               <div>
                <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                {(order as any).cartGroupId && (
                <p className="text-[10px] text-gray-300" style={{color: '#c07777'}}>{(order as any).cartGroupId}</p>
 )}
 <p className="text-xs text-gray-400" style={{fontSize: '11px'}}>{new Date(order.createdAt).toLocaleString("ko-KR")}</p>
 </div>
 {(order as any).daysDelayed && (order as any).daysDelayed > 14 && (
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger>
 <Badge variant="destructive"className="text-[10px] px-1.5 py-0.5">
 {(order as any).daysDelayed}일 경과
 </Badge>
 </TooltipTrigger>
 <TooltipContent>
 <p>발송 후 {(order as any).daysDelayed}일이 경과했습니다</p>
 </TooltipContent>
 </Tooltip>
 </TooltipProvider>
 )}
 </div>
 </td>
 <td className="px-2 py-1.5" style={{minWidth:'110px'}}>
 <p className="text-sm text-gray-900 whitespace-nowrap">{order.shippingName}</p>
 <p className="text-xs text-gray-400 whitespace-nowrap" style={{fontSize: '11px'}}>{order.shippingPhone ? order.shippingPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : ''}</p>
 </td>
 <td className="px-2 py-1.5">
 {order.itemsWithImages && order.itemsWithImages.length > 0 ? (
 <div className="flex items-center gap-2">
 {/* 상품별 주문: 단일 상품 썸네일 */}
 {(() => {
 const item = order.itemsWithImages[0];
 return (
 <div
 className="w-10 h-10 rounded border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0"
 title={`${item.productName} x${item.quantity}`}
 >
 {item.imageUrl ? (
 <img
 src={item.imageUrl}
 alt={item.productName}
 className="w-full h-full object-cover"
 />
 ) : (
 <Package className="h-4 w-4 text-gray-300"/>
 )}
 </div>
 );
 })()}
 {/* 상품 정보 텍스트 */}
 <div className="flex-1 min-w-0">
 <p className="text-xs text-gray-800 font-medium line-clamp-2"title={order.itemsWithImages[0]?.productName ||""}>
 {order.itemsWithImages[0]?.productName || order.itemsSummary ||"-"}
 </p>
 {order.itemsWithImages[0] && (
 <p className="text-[10px] text-gray-400 whitespace-nowrap" style={{fontSize: '11px'}}>
 수량: {order.itemsWithImages[0].quantity}개
 {(order.itemsWithImages[0] as any).unitPrice && (
                 <>
                 {' · '}단가: ¥{Number((order.itemsWithImages[0] as any).unitPrice).toLocaleString()}
                 </>
                 )}
{(order.itemsWithImages[0] as any).subtotal && (
                 <>
                 {' · '}소계: <strong>¥{Number((order.itemsWithImages[0] as any).subtotal).toLocaleString()}</strong>
                 </>
                 )}
 </p>
 )}
 </div>
 </div>
 ) : (
 <p className="text-xs text-gray-600">
 {order.itemsSummary ||"-"}
 </p>
 )}
 </td>
 <td className="px-2 py-1.5">
 {(() => {
 const itemsSubtotal = (order.itemsWithImages || []).reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0);
 const shippingFee = Number(order.shippingFee || 0);
 const couponDiscount = Number(order.couponDiscount || 0);
 const pointsUsed = Number(order.pointsUsed || 0);
 const grossTotal = itemsSubtotal > 0 ? itemsSubtotal + shippingFee : Number(order.totalAmount || 0);
 const finalTotal = Number(order.totalAmount || 0);
 const expectedFinal = Math.max(0, grossTotal - couponDiscount - pointsUsed);
 const hasAmountMismatch = itemsSubtotal > 0 && Math.abs(expectedFinal - finalTotal) > 1 && order.status !== 'cancelled' && order.status !== 'partially_cancelled';
 const totalDiscount = couponDiscount + pointsUsed;
 return (
 <div className="space-y-0.5 text-right">
 {/* 위 줄: 할인금액 (없으면 빈 줄) */}
 <div className="flex items-center justify-end gap-1 h-4">
 {totalDiscount > 0 && (
 <span className="text-xs text-purple-600 whitespace-nowrap" style={{fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif', fontSize: '12px'}}>-{totalDiscount.toLocaleString()}</span>
 )}
 </div>
 {/* 아래 줄: 최종결제금액 */}
 <div className="flex items-center justify-end gap-1">
 <span className="text-sm text-gray-900 whitespace-nowrap" style={{fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif', fontSize: '12px', fontWeight: '600'}}>{finalTotal.toLocaleString()}</span>
 {hasAmountMismatch && (
 <span title={`금액 불일치: 계산값 ${expectedFinal.toLocaleString()} vs DB ${finalTotal.toLocaleString()}`} className="cursor-help flex-shrink-0">
 <AlertTriangle className="w-3 h-3 text-amber-500"/>
 </span>
 )}
 </div>
 </div>
 );
 })()}
 </td>

 <td className="px-2 py-1.5">
 <div className="flex flex-col gap-0.5">
 {(order as any).trackingHasAlert && (
 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap" style={{fontSize: '11px', fontWeight: '500'}}>
 <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
 {(order as any).trackingAlertType === 'customs' ? '세관조회' : '배송문제'}
 </span>
 )}
 <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[order.status]}`} style={{fontSize: '11px'}}>
 {statusLabels[order.status]}
 </span>
 </div>
 </td>
 {/* 통합 송장입력 열: 복사가능 텍스트박스 + 진행률 바 + 타임라인 아이콘 */}
 <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()} style={{width: '160px'}}>
 <div className="flex flex-col gap-1">
 {/* 송장번호 텍스트박스 + 타임라인 아이콘 */}
 <div className="flex items-center gap-1">
 <input
 className="text-[10px] font-mono border border-gray-200 rounded px-1 py-0.5 placeholder-gray-300 focus:border-blue-400 focus:outline-none bg-gray-50"
 style={{width: '120px', minWidth: 0}}
 placeholder="송장번호"
 value={trackingInputs[order.id]?.trackingNumber ?? (order.shipment?.trackingNumber || "")}
 maxLength={30}
 onChange={(e) => setTrackingInputs(prev => ({
 ...prev,
 [order.id]: { carrier: prev[order.id]?.carrier || order.shipment?.carrier || "Japan Post", trackingNumber: e.target.value.slice(0, 30) }
 }))}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 const val = trackingInputs[order.id];
 const trackNum = val?.trackingNumber?.trim() || order.shipment?.trackingNumber?.trim();
 if (trackNum) {
 const firstItemId = (order as any).itemsWithImages?.[0]?.id || (order as any).items?.[0]?.id || (order as any).items?.[0]?.orderItemId || 0;
 inlineTrackingMutation.mutate({ orderId: order.id, orderItemId: firstItemId, trackingNumber: trackNum, carrier: val?.carrier || order.shipment?.carrier || "Japan Post" });
 setTrackingInputs(prev => { const n = {...prev}; delete n[order.id]; return n; });
 }
 }
 }}
 onClick={(e) => {
 // 송장번호가 있으면 클릭 시 전체 선택 (복사 편의)
 if (order.shipment?.trackingNumber && !trackingInputs[order.id]?.trackingNumber) {
 (e.target as HTMLInputElement).select();
 }
 }}
 />
 {/* 타임라인 아이콘 - 송장번호가 있을 때만 표시 */}
 {order.shipment?.trackingNumber && (
 <button
 className="flex-shrink-0 p-0.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
 title="배송 타임라인 보기"
 onClick={(e) => {
 e.stopPropagation();
 setTimelineModal({
 open: true,
 orderId: order.id,
 trackingNumber: order.shipment!.trackingNumber || "",
 carrier: order.shipment!.carrier || "Japan Post",
 status: order.status,
 productName: (order as any).itemsWithImages?.[0]?.productName || (order as any).itemsSummary || "",
 shippingName: order.shippingName || "",
 });
 }}
 >
 <Truck className="h-3 w-3" style={{width: '15px', height: '15px'}}/>
 </button>
 )}
 </div>
 {/* 진행률 바 */}
 {order.shipment && (
 <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full transition-all ${
 order.shipment.status === 'delivered' ? 'bg-green-500' : 'bg-blue-500'
 }`}
 style={{ width: `${
 order.shipment.status === 'delivered' ? 100 :
 order.shipment.status === 'out_for_delivery' ? 80 :
 order.shipment.status === 'in_transit' ? 60 :
 order.shipment.status === 'picked_up' ? 40 : 20
 }%` }}
 />
 </div>
 )}
 </div>
 </td>
 <td className="px-2 py-1.5"onClick={(e) => e.stopPropagation()}>
 <button
 className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
 title="상세 보기"
 onClick={(e) => { e.stopPropagation(); navigate(`/admin/orders/${order.id}`); }}
 >
 <Eye className="h-4 w-4"/>
 </button>
 </td>
 </tr>
 );
         })
         )
         }
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 <div className="flex items-center justify-between">
 <p className="text-sm text-gray-500">
 {total > 0 ? `${(page - 1) * limit + 1}-${Math.min(page * limit, total)} / ${total}건` :"0건"}
 </p>
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setPage((p) => Math.max(1, p - 1))}
 disabled={page === 1}
 >
 <ChevronLeft className="h-4 w-4"/>
 이전
 </Button>
 <span className="text-sm text-gray-600 px-2">
 {page} / {totalPages}
 </span>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
 disabled={page >= totalPages}
 >
 다음
 <ChevronRight className="h-4 w-4"/>
 </Button>
    </div>
    </div>
    </>
    )}
    </div>

 {/* CSV Upload Dialog */}
 <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
 <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <FileSpreadsheet className="h-5 w-5 text-green-600"/>
 CSV 일괄 추적번호 등록
 </DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <p className="text-sm text-gray-600">
 CSV 파일을 업로드하여 여러 주문의 추적번호를 한 번에 등록합니다.
 주문 상태가 입금전/결제완료/상품준비중인 경우 자동으로"배송중"으로 변경됩니다.
 </p>

 <div className="flex items-center gap-3">
 <label className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
 <Upload className="h-4 w-4 text-green-600"/>
 <span className="text-sm font-medium text-green-700">CSV 파일 선택</span>
 <input type="file"accept=".csv"onChange={handleCsvUpload} className="hidden"/>
 </label>
 <Button variant="outline"size="sm"onClick={downloadCsvTemplate}>
 <Download className="h-4 w-4 mr-1"/>
 템플릿 다운로드
 </Button>
 {csvFileName && (
 <span className="text-sm text-gray-500">{csvFileName}</span>
 )}
 </div>

 <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg font-mono">
 <p className="font-semibold text-gray-600 mb-1">CSV 형식:</p>
 <p>orderNumber,trackingNumber,carrier</p>
 <p>ORD-20260101-XXXXX,JP1234567890,Japan Post</p>
 </div>

 {csvEntries.length > 0 && !csvResults && (
 <div className="border rounded-lg overflow-hidden">
 <div className="bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
 미리보기 ({csvEntries.length}건)
 </div>
 <div className="max-h-48 overflow-y-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 sticky top-0">
 <tr>
 <th className="px-3 py-1.5 text-left text-xs text-gray-500">주문번호</th>
 <th className="px-3 py-1.5 text-left text-xs text-gray-500">추적번호</th>
 <th className="px-3 py-1.5 text-left text-xs text-gray-500">운송사</th>
 </tr>
 </thead>
 <tbody className="divide-y">
 {csvEntries.map((entry, i) => (
 <tr key={i}>
 <td className="px-3 py-1.5 font-mono text-xs">{entry.orderNumber}</td>
 <td className="px-3 py-1.5 font-mono text-xs">{entry.trackingNumber}</td>
 <td className="px-3 py-1.5 text-xs">{entry.carrier}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {csvResults && (
 <div className="border rounded-lg overflow-hidden">
 <div className="bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 flex items-center justify-between">
 <span>처리 결과</span>
 <span className="text-xs">
 <span className="text-green-600">{csvResults.filter(r => r.success).length}건 성공</span>
 {csvResults.filter(r => !r.success).length > 0 && (
 <span className="text-red-600 ml-2">{csvResults.filter(r => !r.success).length}건 실패</span>
 )}
 </span>
 </div>
 <div className="max-h-48 overflow-y-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 sticky top-0">
 <tr>
 <th className="px-3 py-1.5 text-left text-xs text-gray-500">주문번호</th>
 <th className="px-3 py-1.5 text-left text-xs text-gray-500">결과</th>
 <th className="px-3 py-1.5 text-left text-xs text-gray-500">메시지</th>
 </tr>
 </thead>
 <tbody className="divide-y">
 {csvResults.map((result, i) => (
 <tr key={i} className={result.success ?"":"bg-red-50"}>
 <td className="px-3 py-1.5 font-mono text-xs">{result.orderNumber}</td>
 <td className="px-3 py-1.5">
 {result.success ? (
 <CheckCircle className="h-4 w-4 text-green-500"/>
 ) : (
 <XCircle className="h-4 w-4 text-red-500"/>
 )}
 </td>
 <td className="px-3 py-1.5 text-xs text-gray-600">{result.message}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 <DialogFooter>
 <Button variant="outline"onClick={() => setShowCsvDialog(false)}>
 {csvResults ?"닫기":"취소"}
 </Button>
 {csvEntries.length > 0 && !csvResults && (
 <Button
 className="bg-green-600 hover:bg-green-700"
 onClick={() => bulkTrackingMutation.mutate({ entries: csvEntries })}
 disabled={bulkTrackingMutation.isPending}
 >
 {bulkTrackingMutation.isPending ?"처리 중...": `${csvEntries.length}건 일괄 등록`}
 </Button>
 )}
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Bulk Status Change Dialog */}
 <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>일괄 상태 변경 ({selectedOrders.size}건)</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <p className="text-sm text-gray-600">
 선택한 {selectedOrders.size}건의 주문 상태를 일괄 변경합니다.
 </p>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">새 상태</label>
 <Select value={bulkStatus} onValueChange={setBulkStatus}>
 <SelectTrigger>
 <SelectValue placeholder="상태 선택"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="pending">입금전</SelectItem>
 <SelectItem value="confirmed">상품 준비중</SelectItem>
 <SelectItem value="shipped">배송중</SelectItem>
 <SelectItem value="delivered">배송완료</SelectItem>
 <SelectItem value="cancelled">취소</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline"onClick={() => setShowBulkDialog(false)}>취소</Button>
 <Button
 className="bg-pink-600 hover:bg-pink-700"
 onClick={() => {
 if (!bulkStatus) {
 toast.error("상태를 선택해주세요");
 return;
 }
 bulkUpdateMutation.mutate({
 orderIds: Array.from(selectedOrders),
 status: bulkStatus as any,
 });
 }}
 disabled={bulkUpdateMutation.isPending || !bulkStatus}
 >
 {bulkUpdateMutation.isPending ?"변경 중...":"일괄 변경"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* 배송지연 이메일 발송 확인 다이얼로그 */}
 <Dialog open={sendEmailDialog} onOpenChange={setSendEmailDialog}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Mail className="h-5 w-5 text-orange-500"/>
 배송지연 안내 이메일 발송
 </DialogTitle>
 <DialogDescription>
 {selectedDelayedOrders.size > 0
 ? `선택한 ${selectedDelayedOrders.size}건의 주문에 배송지연 안내 이메일을 발송합니다.`
 : `배송지연 주문 전체 ${delayedOrdersData?.length || 0}건에 안내 이메일을 발송합니다.`
 }
 </DialogDescription>
 </DialogHeader>
 <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-800">
 <p className="font-medium mb-1">이메일 내용:</p>
 <ul className="list-disc list-inside space-y-1 text-xs">
 <li>배송 지연 안내 및 양해 메시지</li>
 <li>주문번호, 발송일, 지연일수 포함</li>
 <li>송장번호 및 추적 링크 (송장번호 있는 경우)</li>
 </ul>
 </div>
 <DialogFooter>
 <Button variant="outline"onClick={() => setSendEmailDialog(false)}>취소</Button>
 <Button
 className="bg-orange-500 hover:bg-orange-600 text-white"
 onClick={() => {
 const targetIds = selectedDelayedOrders.size > 0
 ? Array.from(selectedDelayedOrders)
 : (delayedOrdersData?.map((o: any) => o.id) || []);
 sendDelayedEmailsMutation.mutate({ orderIds: targetIds });
 }}
 disabled={sendDelayedEmailsMutation.isPending}
 >
 {sendDelayedEmailsMutation.isPending ? (
 <><span className="animate-spin mr-1">⏳</span> 발송 중...</>
 ) : (
 <><Mail className="h-4 w-4 mr-1"/> 이메일 발송</>
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* 세관조회 안내 이메일 발송 다이얼로그 */}
 <Dialog open={sendCustomsEmailDialog} onOpenChange={setSendCustomsEmailDialog}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <AlertTriangle className="h-5 w-5 text-amber-500"/>
 세관조회 안내 이메일 발송
 </DialogTitle>
 <DialogDescription>
 {(() => {
 const customsOrders = delayedOrdersData?.filter((o: any) => o.trackingHasAlert) || [];
 const selected = selectedDelayedOrders.size > 0
 ? customsOrders.filter((o: any) => selectedDelayedOrders.has(o.id))
 : customsOrders;
 return `세관조회 문제 발생 주문 ${selected.length}건에 고객 안내 이메일을 발송합니다.`;
 })()}
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-3">
 <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
 <p className="font-medium mb-1">이메일 내용 (일본어):</p>
 <ul className="list-disc list-inside space-y-1 text-xs">
 <li>세관조회(税関照会) 발생 안내</li>
 <li>세관조회 의미 및 고객 대응 방법 안내</li>
 <li>주문번호, 송장번호, 추적 링크 포함</li>
 <li>고객센터 연락처 안내</li>
 </ul>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 관리자 추가 메시지 (선택사항)
 </label>
 <textarea
 className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
 rows={3}
 placeholder="고객에게 전달할 추가 메시지를 입력하세요. (예: 현재 세관에서 연락이 올 것으로 예상됩니다.)"
 value={customsEmailMessage}
 onChange={(e) => setCustomsEmailMessage(e.target.value)}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setSendCustomsEmailDialog(false)}>취소</Button>
 <Button
 className="bg-amber-500 hover:bg-amber-600 text-white"
 onClick={() => {
 const customsOrders = delayedOrdersData?.filter((o: any) => o.trackingHasAlert) || [];
 const targetIds = selectedDelayedOrders.size > 0
 ? customsOrders.filter((o: any) => selectedDelayedOrders.has(o.id)).map((o: any) => o.id)
 : customsOrders.map((o: any) => o.id);
 if (targetIds.length === 0) {
 toast.error('세관조회 문제 발생 주문이 없습니다.');
 return;
 }
 sendCustomsEmailsMutation.mutate({
 orderIds: targetIds,
 customMessage: customsEmailMessage || undefined,
 });
 }}
 disabled={sendCustomsEmailsMutation.isPending}
 >
 {sendCustomsEmailsMutation.isPending ? (
 <><span className="animate-spin mr-1">⏳</span> 발송 중...</>
 ) : (
 <><AlertTriangle className="h-4 w-4 mr-1"/> 세관조회 안내 이메일 발송</>
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* 일괄 입금확인 결과 다이얼로그 */}
 <Dialog open={showBankConfirmDialog} onOpenChange={setShowBankConfirmDialog}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <span className="text-green-600">✓</span> 일괄 입금확인 결과
 </DialogTitle>
 <DialogDescription>
 {bankConfirmResults && (
 <span>
 성공 <strong className="text-green-600">{bankConfirmResults.success}건</strong>
 {bankConfirmResults.skipped > 0 && (
 <>, 스킵 <strong className="text-yellow-600">{bankConfirmResults.skipped}건</strong></>
 )}
 </span>
 )}
 </DialogDescription>
 </DialogHeader>
 {bankConfirmResults && bankConfirmResults.results.length > 0 && (
 <div className="max-h-64 overflow-y-auto border rounded-md">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 sticky top-0">
 <tr>
 <th className="text-left px-3 py-2 font-medium">주문번호</th>
 <th className="text-center px-3 py-2 font-medium">결과</th>
 <th className="text-left px-3 py-2 font-medium">사유</th>
 </tr>
 </thead>
 <tbody>
 {bankConfirmResults.results.map((r) => (
 <tr key={r.orderId} className="border-t">
 <td className="px-3 py-2 font-mono text-xs">{r.orderNumber}</td>
 <td className="px-3 py-2 text-center">
 {r.success
 ? <span className="text-green-600 font-medium">확인 완료</span>
 : <span className="text-yellow-600 font-medium">스킵</span>}
 </td>
 <td className="px-3 py-2 text-gray-500 text-xs">{r.reason || '-'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 <DialogFooter>
 <Button onClick={() => setShowBankConfirmDialog(false)}>닫기</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* 배송 타임라인 팝업 */}
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
