import React, { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { RefreshCw, Download, ChevronDown, ChevronRight, Search, X, Truck, Package, Clock, AlertTriangle, XCircle, Columns, Scissors, RotateCcw, CheckCircle, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import AdminSidebar from "@/components/AdminSidebar";
import { formatPrice } from "@/../../shared/utils/formatPrice";

// -- 상태 매핑 ------------------------------------------------------------------
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:              { label: "입금전",       color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  paid:                 { label: "결제완료",     color: "bg-green-100 text-green-800 border-green-300" },
  confirmed:            { label: "상품준비중",  color: "bg-blue-100 text-blue-800 border-blue-300" },
  shipped:              { label: "배송중",       color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  delivered:            { label: "배송완료",     color: "bg-gray-100 text-gray-700 border-gray-300" },
  cancelled:            { label: "취소",         color: "bg-red-100 text-red-800 border-red-300" },
  partially_cancelled:  { label: "일부취소",     color: "bg-orange-100 text-orange-800 border-orange-300" },
  completed:            { label: "주문완료",     color: "bg-teal-100 text-teal-800 border-teal-300" },
};

// -- 탭 정의 -------------------------------------------------------------------
const TABS = [
  { id: "all",        label: "전체",       statuses: "pending,paid,confirmed,shipped,delivered,cancelled" },
  { id: "pending",    label: "입금전",     statuses: "pending" },
  { id: "paid",       label: "결제완료",   statuses: "paid" },
  { id: "confirmed",  label: "상품준비중", statuses: "confirmed" },
  { id: "shipping",   label: "배송중",     statuses: "shipped" },
  { id: "delivered",  label: "배송완료",   statuses: "delivered" },
  { id: "cancelled",  label: "취소",       statuses: "cancelled" },
];

// UPG-01: 운송사별 추적 URL
const CARRIER_TRACKING_URLS: Record<string, (num: string) => string> = {
  "Japan Post": (num) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=ja`,
  "Yamato": (num) => `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${num}`,
  "Sagawa": (num) => `https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=${num}`,
  "DHL": (num) => `https://www.dhl.com/jp-ja/home/tracking.html?tracking-id=${num}`,
  "FedEx": (num) => `https://www.fedex.com/fedextrack/?trknbr=${num}`,
  "EMS": (num) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=ja`,
  "CJ대한통운": (num) => `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${num}`,
  "우체국택배": (num) => `https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?POST_CODE=${num}`,
};

// --- 상수 ---------------------------------------------------------------------
const COLUMNS = [
  { key: "status",       label: "배송상태",   defaultWidth: 100, sticky: true },
  { key: "orderNumber",  label: "주문번호",   defaultWidth: 140, sticky: true },
  { key: "cart",         label: "장바구니번호", defaultWidth: 120, sticky: false },
  { key: "carrier",      label: "택배사",     defaultWidth: 100, sticky: false },
  { key: "tracking",     label: "송장번호",   defaultWidth: 130, sticky: false },
  { key: "shippedAt",    label: "발송일",     defaultWidth: 100, sticky: false },
  { key: "estimatedAt",  label: "발송예정일", defaultWidth: 100, sticky: false },
  { key: "productName",  label: "상품명",     defaultWidth: 220, sticky: false },
  { key: "qty",          label: "수량",       defaultWidth: 60,  sticky: false },
  { key: "unitPrice",    label: "단가",       defaultWidth: 80,  sticky: false },
  { key: "subtotal",     label: "상품금액",   defaultWidth: 90,  sticky: false },
  { key: "optionInfo",   label: "옵션정보",   defaultWidth: 150, sticky: false },
  { key: "sellerOption", label: "판매자옵션코드", defaultWidth: 130, sticky: false },
  { key: "customer",     label: "수취인",     defaultWidth: 100, sticky: false },
  { key: "phone",        label: "연락처",     defaultWidth: 120, sticky: false },
  { key: "address",      label: "배송주소",   defaultWidth: 250, sticky: false },
  { key: "totalAmount",    label: "총금액",       defaultWidth: 90,  sticky: false },
  { key: "discountAmount", label: "할인금액",     defaultWidth: 80,  sticky: false },
  { key: "pointsUsed",    label: "포인트사용",   defaultWidth: 80,  sticky: false },
  { key: "finalAmount",   label: "최종결제금액", defaultWidth: 100, sticky: false },
  { key: "paymentMethod", label: "결제수단",   defaultWidth: 100, sticky: false },
  { key: "userEmail",    label: "주문자이메일", defaultWidth: 160, sticky: false },
  { key: "adminNote",   label: "관리자메모", defaultWidth: 180, sticky: false },
  { key: "deliveredAt", label: "배송완료일시", defaultWidth: 130, sticky: false, tabOnly: "delivered" },
  { key: "orderDate",    label: "주문일시",   defaultWidth: 130, sticky: false },
];

// -- 컬럼 리사이즈 훅 ----------------------------------------------------------
function useColumnResize(initialWidths: Record<string, number>) {
  const [widths, setWidths] = useState(initialWidths);
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const onMouseDown = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startWidth: widths[key] };

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const newWidth = Math.max(50, resizingRef.current.startWidth + delta);
      setWidths(prev => ({ ...prev, [resizingRef.current!.key]: newWidth }));
    };
    const onMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [widths]);

  return { widths, onMouseDown };
}

// -- 메인 컴포넌트 -------------------------------------------------------------
export default function AdminOrdersNew() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // 권한 체크
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  // 상태
  const [activeTab, setActiveTab] = useState("paid");
  // 상품별 행 선택: key = "orderId-itemIdx"
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  // 열 표시/숨기기 state (localStorage 저장)
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("adminOrdersHiddenColumns");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const toggleColumn = (key: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem("adminOrdersHiddenColumns", JSON.stringify(Array.from(next)));
      return next;
    });
  };
  // sticky 열은 숨길 수 없으므로 hideable 열만 필터
  // tabOnly가 있는 컬럼은 해당 탭에서만 자동 표시
  const visibleColumns = COLUMNS.filter(c => {
    if (hiddenColumns.has(c.key)) return false;
    if ((c as any).tabOnly && (c as any).tabOnly !== activeTab) return false;
    return true;
  });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  // UPG-04: 결제수단 필터
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  // 열 선택 (헤더 클릭 시 해당 열 하이라이트 + 클립보드 복사)
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  // 컬럼 너비
  const initialWidths = Object.fromEntries(COLUMNS.map(c => [c.key, c.defaultWidth]));
  const { widths, onMouseDown } = useColumnResize(initialWidths);

  // 현재 탭의 상태 필터
   const currentTab = TABS.find(t => t.id === activeTab)!;
  const tabStatus = filterStatus !== "all" ? filterStatus : currentTab.statuses;
  // UPG-02: 페이지네이션 state
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 100;
  // 탭/검색 변경 시 첫 페이지로 리셋
  const prevTabRef = React.useRef(activeTab);
  const prevSearchRef = React.useRef(search);
  React.useEffect(() => {
    if (prevTabRef.current !== activeTab || prevSearchRef.current !== search) {
      setCurrentPage(1);
      prevTabRef.current = activeTab;
      prevSearchRef.current = search;
    }
  }, [activeTab, search]);
  // 데이터 쿼리 - 페이지네이션 적용
  const { data, isLoading, refetch } = trpc.admin.orders.useQuery({
    page: currentPage,
    limit: PAGE_SIZE,
    status: tabStatus,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    paymentMethod: filterPaymentMethod !== "all" ? filterPaymentMethod : undefined,
  }, { enabled: !!user && user.role === "admin" });

  // 탭별 주문 수 단일 쿼리 (기존 5개 분리 쿼리 대체 → 502 에러 방지)
  const { data: tabCounts } = trpc.admin.orderTabCounts.useQuery(undefined, { enabled: !!user && user.role === "admin" });
  // 배송지연 탭
  const [showDelayedTab, setShowDelayedTab] = React.useState(false);
  const [selectedDelayedOrders, setSelectedDelayedOrders] = React.useState<Set<number>>(new Set());
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = React.useState(false);
  // 발송지연 자동 감지 쿼리
  const { data: shipmentDelayedData, refetch: refetchShipmentDelayed } = trpc.admin.shipmentDelayedOrders.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );
  // 발송지연 탭 표시 state
  const [showShipmentDelayedTab, setShowShipmentDelayedTab] = React.useState(false);
  // 발송지연 다이얼로그
  const [showShipmentDelayDialog, setShowShipmentDelayDialog] = React.useState(false);
  const [shipmentDelayOrderId, setShipmentDelayOrderId] = React.useState<number | null>(null);
  const [shipmentDelayReason, setShipmentDelayReason] = React.useState("");
  const [shipmentDelayOrderNumber, setShipmentDelayOrderNumber] = React.useState("");

  const sendDelayedEmailsMutation = trpc.admin.sendDelayedShipmentEmails.useMutation({
    onSuccess: (data) => {
      setSendEmailDialogOpen(false);
      setSelectedDelayedOrders(new Set());
      toast.success(`이메일 발송 완료: 성공 ${data.successCount}건${data.failCount > 0 ? `, 실패 ${data.failCount}건` : ''}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: delayedOrdersData, isLoading: delayedLoading, refetch: refetchDelayed } = trpc.admin.delayedOrders.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  const orders = data?.orders || [];
  const totalCount = data?.total || 0;

  // 관리자 메모 인라인 편집 state
  const [editingMemoOrderId, setEditingMemoOrderId] = useState<number | null>(null);
  const [editingMemoValue, setEditingMemoValue] = useState("");
  const updateAdminNotesMutation = trpc.admin.updateAdminNotes.useMutation({
    onMutate: async ({ orderId, notes }) => {
      // 낙관적 업데이트
      await utils.admin.orders.cancel();
      const prev = utils.admin.orders.getData({ page: currentPage, limit: PAGE_SIZE, status: tabStatus, search: search || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, paymentMethod: filterPaymentMethod !== "all" ? filterPaymentMethod : undefined });
      if (prev) {
        utils.admin.orders.setData({ page: currentPage, limit: PAGE_SIZE, status: tabStatus, search: search || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, paymentMethod: filterPaymentMethod !== "all" ? filterPaymentMethod : undefined }, {
          ...prev,
          orders: prev.orders.map((o: any) => o.id === orderId ? { ...o, adminNotes: notes } : o),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.admin.orders.setData({ page: currentPage, limit: PAGE_SIZE, status: tabStatus, search: search || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, paymentMethod: filterPaymentMethod !== "all" ? filterPaymentMethod : undefined }, ctx.prev);
      toast.error("메모 저장 실패");
    },
    onSuccess: () => {
      toast.success("메모가 저장되었습니다.");
      setEditingMemoOrderId(null);
    },
  });

  // 부분 취소 state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetOrderId, setCancelTargetOrderId] = useState<number | null>(null);
  const [cancelSelectedItems, setCancelSelectedItems] = useState<Set<number>>(new Set());
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const cancelItemsMutation = trpc.admin.cancelItems.useMutation({
    onSuccess: (data) => {
      toast.success(`부분 취소 완료. 주문 상태: ${STATUS_MAP[data.newStatus]?.label || data.newStatus}`);
      utils.admin.orders.invalidate();
      setCancelDialogOpen(false);
      setCancelSelectedItems(new Set());
      setCancelReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  const restoreItemMutation = trpc.admin.restoreItem.useMutation({
    onSuccess: () => {
      toast.success("상품 취소가 복원되었습니다.");
      utils.admin.orders.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // 일괄 송장번호 입력 state
  const [bulkTrackingOpen, setBulkTrackingOpen] = useState(false);
  const [bulkCarrier, setBulkCarrier] = useState("Japan Post");
  const [bulkTrackingNumber, setBulkTrackingNumber] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // 인라인 송장번호 편집 state: key = "orderId-orderItemId"
  const [editingTracking, setEditingTracking] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const utils = trpc.useUtils();
  // 상품별 송장번호 업데이트 뮤테이션
  const updateItemTrackingMutation = trpc.admin.updateItemTracking.useMutation({
    onSuccess: () => {
      toast.success("송장번호가 저장되었습니다.");
      utils.admin.orders.invalidate();
      setEditingTracking(null);
    },
    onError: (err) => toast.error(err.message),
  });
  // 일괄 상태 변경 state
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<string>("confirmed");
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);

  // 선택된 주문 ID 추출 (중복 제거)
  const getSelectedOrderIds = (): number[] => {
    const ids = new Set<number>();
    Array.from(selectedRows).forEach(key => {
      const orderId = parseInt(key.split("-")[0], 10);
      if (!isNaN(orderId)) ids.add(orderId);
    });
    return Array.from(ids);
  };

  // 일괄 상태 변경 mutation
  const bulkUpdateStatusMutation = trpc.admin.bulkUpdateStatus.useMutation({
    onSuccess: (result) => {
      const count = getSelectedOrderIds().length;
      toast.success(`${count}개 주문 상태가 ${STATUS_MAP[bulkTargetStatus]?.label || bulkTargetStatus}(으)로 변경되었습니다.`);
      utils.admin.orders.invalidate();
      utils.admin.orderTabCounts.invalidate();
      setBulkStatusDialogOpen(false);
      setSelectedRows(new Set());
    },
    onError: (err) => toast.error(err.message),
  });

  const handleBulkStatusChange = async () => {
    const orderIds = getSelectedOrderIds();
    if (orderIds.length === 0) { toast.warning("선택된 주문이 없습니다."); return; }
    setBulkStatusLoading(true);
    try {
      await bulkUpdateStatusMutation.mutateAsync({
        orderIds,
        status: bulkTargetStatus as any,
      });
    } finally {
      setBulkStatusLoading(false);
    }
  };

  // 결제완료 → 상품준비중 일괄 처리 state
  const [quickConfirmDialogOpen, setQuickConfirmDialogOpen] = useState(false);
  const [quickConfirmLoading, setQuickConfirmLoading] = useState(false);

  // BUG-04: 무통장 입금 확인 state
  const [bankConfirmDialogOpen, setBankConfirmDialogOpen] = useState(false);
  const [bankConfirmResults, setBankConfirmResults] = useState<{ success: number; skipped: number; results: { orderId: number; orderNumber: string; success: boolean; reason?: string }[] } | null>(null);

  // BUG-04: 무통장 입금 확인 mutation
  const bulkConfirmBankMutation = trpc.admin.bulkConfirmBankTransfer.useMutation({
    onSuccess: (result) => {
      setBankConfirmResults(result);
      setBankConfirmDialogOpen(true);
      if (result.success > 0) {
        toast.success(`${result.success}건 입금 확인 완료${result.skipped > 0 ? `, ${result.skipped}건 스킵` : ''}`);
        setSelectedRows(new Set());
        utils.admin.orders.invalidate();
        utils.admin.orderTabCounts.invalidate();
      } else {
        toast.warning(`처리된 건이 없습니다. (${result.skipped}건 스킵)`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // BUG-04: 무통장 미확인 주문 ID 추출
  const getUnconfirmedBankOrderIds = (): number[] => {
    const selectedIds = getSelectedOrderIds();
    if (selectedIds.length > 0) {
      return selectedIds.filter(id => {
        const order = orders.find((o: any) => o.id === id);
        return order?.paymentMethod === 'bank_transfer' && !order?.bankTransferConfirmedAt;
      });
    }
    return orders
      .filter((o: any) => o.paymentMethod === 'bank_transfer' && !o.bankTransferConfirmedAt)
      .map((o: any) => o.id);
  };

  // 결제완료 주문만 필터링 (paid 탭에서 전체 선택 또는 선택된 paid 주문)
  const getPaidOrderIds = (): number[] => {
    const selectedIds = getSelectedOrderIds();
    if (selectedIds.length > 0) {
      // 선택된 주문 중 paid 상태인 것만
      return selectedIds.filter(id => {
        const order = orders.find((o: any) => o.id === id);
        return order?.status === 'paid';
      });
    }
    // 선택 없으면 현재 탭의 모든 paid 주문
    return orders.filter((o: any) => o.status === 'paid').map((o: any) => o.id);
  };

  const handleQuickConfirm = async () => {
    const orderIds = getPaidOrderIds();
    if (orderIds.length === 0) { toast.warning("상품준비중으로 변경할 결제완료 주문이 없습니다."); return; }
    setQuickConfirmLoading(true);
    try {
      await bulkUpdateStatusMutation.mutateAsync({
        orderIds,
        status: 'confirmed',
      });
      setQuickConfirmDialogOpen(false);
      toast.success(`${orderIds.length}개 주문이 상품준비중으로 변경되었습니다.`);
    } finally {
      setQuickConfirmLoading(false);
    }
  };

  // 배송 상태 업데이트 뮤테이션
  const updateStatusMutation = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success("배송 상태가 업데이트되었습니다.");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // 전체 선택 (상품별 행 기준)
  const allItemKeys: string[] = orders.flatMap((o: any) => {
    const items = o.itemsWithImages?.length > 0 ? o.itemsWithImages : [null];
    return items.map((_: any, idx: number) => `${o.id}-${idx}`);
  });
  const allSelected = allItemKeys.length > 0 && selectedRows.size === allItemKeys.length;
  const toggleAll = () => {
    if (allSelected) setSelectedRows(new Set());
    else setSelectedRows(new Set(allItemKeys));
  };
  const toggleRow = (key: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  // 선택된 상품 행 데이터 추출 (일괄 처리용)
  const getSelectedItemData = () => {
    const result: Array<{ orderId: number; orderItemId: number; orderNumber: string }> = [];
    orders.forEach((o: any) => {
      const items = o.itemsWithImages?.length > 0 ? o.itemsWithImages : [null];
      items.forEach((item: any, idx: number) => {
        const key = `${o.id}-${idx}`;
        if (selectedRows.has(key)) {
          result.push({
            orderId: o.id,
            orderItemId: item?.id || item?.orderItemId || 0,
            orderNumber: o.orderNumber,
          });
        }
      });
    });
    return result;
  };
  // 일괄 송장번호 적용
  const handleBulkTracking = async () => {
    if (!bulkTrackingNumber.trim()) {
      toast.warning("송장번호를 입력해주세요.");
      return;
    }
    const items = getSelectedItemData();
    if (items.length === 0) {
      toast.warning("선택된 상품이 없습니다.");
      return;
    }
    setBulkLoading(true);
    let successCount = 0;
    let failCount = 0;
    for (const item of items) {
      try {
        await updateItemTrackingMutation.mutateAsync({
          orderId: item.orderId,
          orderItemId: item.orderItemId,
          trackingNumber: bulkTrackingNumber.trim(),
          carrier: bulkCarrier,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }
    setBulkLoading(false);
    setBulkTrackingOpen(false);
    setBulkTrackingNumber("");
    utils.admin.orders.invalidate();
    if (failCount === 0) {
      toast.success(`${successCount}개 상품에 송장번호가 적용되었습니다.`);
    } else {
      toast.warning(`${successCount}개 성공, ${failCount}개 실패`);
    }
  };

  // 엑셀 다운로드 (상품별 행 분리)
  const downloadExcel = (selectedOnly = false) => {
    // selectedOnly 시: 선택된 itemKey에서 orderId 추출 후 해당 주문만 필터
    const selectedOrderIds = new Set(
      Array.from(selectedRows).map(key => parseInt(key.split("-")[0], 10))
    );
    const target = selectedOnly
      ? orders.filter((o: any) => selectedOrderIds.has(o.id))
      : orders;

    const headers = [
      "배송상태", "주문번호", "장바구니번호", "택배사", "송장번호", "발송일", "발송예정일",
      "상품명", "수량", "단가", "상품금액", "옵션정보", "판매자옵션코드",
      "수취인", "연락처", "배송주소", "총금액", "할인금액", "포인트사용", "최종결제금액", "배송완료일시", "주문일시"
    ];

    // 각 주문의 상품 아이템별로 행 생성
    const rows: string[][] = [];
    target.forEach((o: any) => {
      const items = o.itemsWithImages?.length > 0 ? o.itemsWithImages : [null];
      items.forEach((item: any, itemIdx: number) => {
        rows.push([
          itemIdx === 0 ? (STATUS_MAP[o.status]?.label || o.status) : "",
          itemIdx === 0 ? o.orderNumber : "",
          itemIdx === 0 ? (o.cartGroupId || String(o.id)) : "",
          itemIdx === 0 ? (o.shipment?.carrier || "") : "",
          itemIdx === 0 ? (o.shipment?.trackingNumber || "") : "",
          itemIdx === 0 ? (o.shipment?.shippedAt ? new Date(o.shipment.shippedAt).toLocaleDateString("ko-KR") : "") : "",
          itemIdx === 0 ? (o.shipment?.estimatedDeliveryDate ? new Date(o.shipment.estimatedDeliveryDate).toLocaleDateString("ko-KR") : "") : "",
          item ? (item.productNameJa || item.productName || "") : (o.itemsSummary || ""),
          item ? String(item.quantity) : "",
          item ? (item.unitPrice ? Number(item.unitPrice).toLocaleString() : "") : "",
          item ? (item.subtotal ? Number(item.subtotal).toLocaleString() : "") : "",
          item ? (item.tierName || "") : "",
          item ? (item.sellerOptionCode || "") : "",
          itemIdx === 0 ? (o.shippingName || "") : "",
          itemIdx === 0 ? (o.shippingPhone || "") : "",
          itemIdx === 0 ? (o.shippingAddress || "") : "",
          // 총금액: 상품 소계 합계 (첫 행에만)
          itemIdx === 0 ? (o.itemsWithImages || []).reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0).toLocaleString() : "",
          // 할인금액: 상품할인 + 쿠폰할인 (첫 행에만)
          itemIdx === 0 ? (() => { const d = (o.itemsWithImages || []).reduce((s: number, i: any) => s + Number(i.discountAmount || 0), 0) + Number(o.couponDiscount || 0); return d > 0 ? d.toLocaleString() + (o.couponCode ? ` [${o.couponCode}]` : "") : "-"; })() : "",
          // 포인트사용 (첫 행에만)
          itemIdx === 0 ? Number(o.pointsUsed || 0).toLocaleString() : "",
          // 최종결제금액: DB에 저장된 order.totalAmount (첫 행에만)
          itemIdx === 0 ? Number(o.totalAmount || 0).toLocaleString() : "",
          itemIdx === 0 ? (o.deliveredAt ? new Date(o.deliveredAt).toLocaleString("ko-KR") : "") : "",
          itemIdx === 0 ? new Date(o.createdAt).toLocaleString("ko-KR") : "",
        ]);
      });
    });

    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("엑셀 다운로드가 완료되었습니다.");
  };

  // 열 클립보드 복사 함수
  const copyColumnToClipboard = (colKey: string, colLabel: string) => {
    if (!orders) return;
    const target = selectedRows.size > 0
      ? orders.filter((o: any) => {
          const items = o.itemsWithImages?.length > 0 ? o.itemsWithImages : [null];
          return items.some((_: any, idx: number) => selectedRows.has(`${o.id}-${idx}`));
        })
      : orders;

    const lines: string[] = [];
    target.forEach((o: any) => {
      const items = o.itemsWithImages?.length > 0 ? o.itemsWithImages : [null];
      items.forEach((item: any, itemIdx: number) => {
        let val = "";
        switch (colKey) {
          case "status":       val = itemIdx === 0 ? (STATUS_MAP[o.status]?.label || o.status) : ""; break;
          case "orderNumber":  val = itemIdx === 0 ? (o.orderNumber || "") : ""; break;
          case "cart":         val = itemIdx === 0 ? (o.cartGroupId || String(o.id)) : ""; break;
          case "carrier":      val = itemIdx === 0 ? (o.shipment?.carrier || "") : ""; break;
          case "tracking":     val = itemIdx === 0 ? (o.shipment?.trackingNumber || "") : ""; break;
          case "shippedAt":    val = itemIdx === 0 ? (o.shipment?.shippedAt ? new Date(o.shipment.shippedAt).toLocaleDateString("ko-KR") : "") : ""; break;
          case "estimatedAt":  val = itemIdx === 0 ? (o.shipment?.estimatedDeliveryDate ? new Date(o.shipment.estimatedDeliveryDate).toLocaleDateString("ko-KR") : "") : ""; break;
          case "productName":  val = item ? (item.productNameJa || item.productName || "") : (o.itemsSummary || ""); break;
          case "qty":          val = item ? String(item.quantity) : ""; break;
          case "unitPrice":    val = item ? (item.unitPrice ? Number(item.unitPrice).toLocaleString() : "") : ""; break;
          case "subtotal":     val = item ? (item.subtotal ? Number(item.subtotal).toLocaleString() : "") : ""; break;
          case "optionInfo":   val = item ? (item.tierName || "") : ""; break;
          case "sellerOption": val = item ? (item.sellerOptionCode || "") : ""; break;
          case "customer":     val = itemIdx === 0 ? (o.shippingName || "") : ""; break;
          case "phone":        val = itemIdx === 0 ? (o.shippingPhone || "") : ""; break;
          case "address":      val = itemIdx === 0 ? (o.shippingAddress || "") : ""; break;
          case "totalAmount":  val = itemIdx === 0 ? (o.itemsWithImages || []).reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0).toLocaleString() : ""; break;
          case "discountAmount": val = itemIdx === 0 ? (() => { const d = (o.itemsWithImages || []).reduce((s: number, i: any) => s + Number(i.discountAmount || 0), 0) + Number(o.couponDiscount || 0); return d > 0 ? d.toLocaleString() : "-"; })() : ""; break;
          case "pointsUsed":   val = itemIdx === 0 ? Number(o.pointsUsed || 0).toLocaleString() : ""; break;
          case "finalAmount":  val = itemIdx === 0 ? Number(o.totalAmount || 0).toLocaleString() : ""; break;
          case "paymentMethod": val = itemIdx === 0 ? (o.paymentMethod === 'stripe' ? '카드결제' : o.paymentMethod === 'bank_transfer' ? (!o.bankTransferConfirmedAt ? '무통장(미확인)' : '무통장(확인완료)') : o.paymentMethod === 'cookiepay' ? '쿠키페이' : o.paymentMethod === 'payoneer' ? 'Payoneer' : o.paymentMethod || '-') : ""; break;
          case "userEmail":    val = itemIdx === 0 ? (o.userEmail || '-') : ""; break;
          case "adminNote":    val = itemIdx === 0 ? (o.adminNotes || '') : ""; break;
          case "deliveredAt":  val = itemIdx === 0 ? (o.deliveredAt ? new Date(o.deliveredAt).toLocaleString("ko-KR") : "") : ""; break;
          case "orderDate":    val = itemIdx === 0 ? new Date(o.createdAt).toLocaleString("ko-KR") : ""; break;
          default: val = "";
        }
        lines.push(val);
      });
    });

    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      const rowCount = lines.filter(l => l !== "").length;
      toast.success(`"최종결제금액" 열 복사됨 (${rowCount}개 행)`.replace('"최종결제금액"', `"${colLabel}"`) );
      setSelectedColumn(colKey);
      setTimeout(() => setSelectedColumn(null), 3000);
    }).catch(() => {
      toast.error("클립보드 복사에 실패했습니다.");
    });
  };

  // 셀 렌더링 (상품별 행 분리 - item은 개별 상품 아이템)
  const renderCell = (order: any, colKey: string, item?: any, itemIdx?: number) => {
    switch (colKey) {
      case "status":
        return (
          <Select
            value={order.status}
            onValueChange={(v) => updateStatusMutation.mutate({ orderId: order.id, status: v as any })}
          >
            <SelectTrigger className="text-[11px] border-0 bg-transparent px-0 py-[3px] w-full min-h-0 h-auto leading-none">
              <span className={`px-1.5 py-0.5 rounded text-[10px] border font-medium leading-none ${STATUS_MAP[order.status]?.color || "bg-gray-100"}`}>
                {STATUS_MAP[order.status]?.label || order.status}
              </span>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "orderNumber":
        return (
          <button
            className="text-blue-600 hover:underline text-[11px] font-mono text-left leading-tight"
            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
          >
            {order.orderNumber}
          </button>
        );
      // 상품별 열
      case "cart":
        return <span className="text-[11px] text-gray-500 font-mono">{order.cartGroupId || `-`}</span>;
      case "carrier":
        return <span className="text-[11px]">{(item?.shipment || order.shipment)?.carrier || "-"}</span>;
      case "tracking": {
        const itemId = item?.id || item?.orderItemId || 0;
        const editKey = `${order.id}-${itemId}`;
        const isEditing = editingTracking === editKey;
        const itemShipment = item?.shipment || order.shipment;
        const currentTracking = itemShipment?.trackingNumber || "";
        if (isEditing) {
          return (
            <input
                autoFocus
                className="text-[11px] font-mono border border-blue-400 rounded px-1.5 py-[3px] w-full h-full outline-none box-border block"
                style={{ marginTop: '-0.5px' }}
                value={trackingInputs[editKey] ?? currentTracking}
                onChange={e => setTrackingInputs(prev => ({ ...prev, [editKey]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const val = (trackingInputs[editKey] ?? currentTracking).trim();
                    if (val) updateItemTrackingMutation.mutate({ orderId: order.id, orderItemId: itemId, trackingNumber: val, carrier: itemShipment?.carrier || "Japan Post" });
                    else setEditingTracking(null);
                  }
                  if (e.key === "Escape") setEditingTracking(null);
                }}
                onBlur={() => {
                  const val = (trackingInputs[editKey] ?? currentTracking).trim();
                  if (val && val !== currentTracking) updateItemTrackingMutation.mutate({ orderId: order.id, orderItemId: itemId, trackingNumber: val, carrier: itemShipment?.carrier || "Japan Post" });
                  else setEditingTracking(null);
                }}
            />
          );
        }
        const trackingUrl = currentTracking && (item?.shipment || order.shipment)?.carrier
          ? CARRIER_TRACKING_URLS[(item?.shipment || order.shipment)?.carrier ?? ""]?.(currentTracking)
          : null;
        return (
          <span className="flex items-center gap-0.5 w-full group">
            <span
              className="text-[11px] font-mono cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1.5 py-[3px] rounded flex-1 truncate"
              title="클릭하여 송장번호 편집"
              onClick={() => {
                setEditingTracking(editKey);
                setTrackingInputs(prev => ({ ...prev, [editKey]: currentTracking }));
              }}
            >
              {currentTracking || <span className="text-gray-300 italic">입력</span>}
            </span>
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="배송 추적 링크 열기"
                className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 flex-shrink-0 p-0.5 rounded hover:bg-blue-50 transition-opacity"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </span>
        );
      }
      case "shippedAt": {
        const sh = item?.shipment || order.shipment;
        return <span className="text-[11px]">{sh?.shippedAt ? new Date(sh.shippedAt).toLocaleDateString("ja-JP", {month:"2-digit",day:"2-digit"}) : "-"}</span>;
      }
      case "estimatedAt": {
        const sh = item?.shipment || order.shipment;
        return <span className="text-[11px]">{sh?.estimatedDeliveryDate ? new Date(sh.estimatedDeliveryDate).toLocaleDateString("ja-JP", {month:"2-digit",day:"2-digit"}) : "-"}</span>;
      }
      case "productName":
        return (
          <span className="text-[11px] truncate block leading-tight">
            {item ? (item.productNameJa || item.productName || "-") : (order.itemsSummary || "-")}
          </span>
        );
      case "qty":
        return <span className="text-[11px] text-center block">{item ? item.quantity : "-"}</span>;
      case "unitPrice":
        return <span className="text-[11px] text-right block">{item?.unitPrice ? Number(item.unitPrice).toLocaleString() : "-"}</span>;
      case "subtotal":
        return <span className="text-[11px] text-right block font-medium">{item?.subtotal ? Number(item.subtotal).toLocaleString() : "-"}</span>;
      case "optionInfo":
        return <span className="text-[11px] text-gray-500">{item?.tierName || "-"}</span>;
      case "sellerOption":
        return <span className="text-[11px] text-gray-400">{item?.sellerOptionCode || "-"}</span>;
      case "customer":
        return <span className="text-[11px]">{order.shippingName || order.userName || "-"}</span>;
      case "phone":
        return <span className="text-[11px]">{order.shippingPhone || "-"}</span>;
      case "address":
        return <span className="text-[11px] truncate block leading-tight">{order.shippingAddress || "-"}</span>;
      case "totalAmount":
        // 상품별 소계 표시
        return <span className="text-[11px] font-medium text-right block">{Number(item?.subtotal || 0).toLocaleString()}</span>;
      case "discountAmount": {
        // 상품별 할인금액 표시
        const itemDiscount = Number(item?.discountAmount || 0);
        const isFirstItem = itemIdx === 0;
        return (
          <div className="text-right">
            <span className="text-[11px] block">{itemDiscount > 0 ? itemDiscount.toLocaleString() : "-"}</span>
            {isFirstItem && order.couponCode && <span className="text-[10px] text-blue-500 font-mono bg-blue-50 px-1 rounded">{order.couponCode}</span>}
          </div>
        );
      }
      case "pointsUsed":
        if (itemIdx !== 0 && itemIdx !== undefined) return <span></span>;
        return <span className="text-[11px] text-right block">{Number(order.pointsUsed || 0).toLocaleString()}</span>;
      case "finalAmount": {
        // 최종결제금액 = DB에 저장된 order.totalAmount (= 상품소계 + 배송비 - 쿠폰할인 - 포인트사용)
        // 상품이 여러 개여도 주문 단위로 1개만 표시 (첫 행에만)
        if (itemIdx !== 0 && itemIdx !== undefined) return <span></span>;
        // 금액 불일치 검증: 상품소계 + 배송비 - 쿠폰할인 - 포인트사용 vs DB totalAmount
        const itemsSubtotal = (order.itemsWithImages || []).reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0);
        const expectedTotal = itemsSubtotal + Number(order.shippingFee || 0) - Number(order.couponDiscount || 0) - Number(order.pointsUsed || 0);
        const dbTotal = Number(order.totalAmount || 0);
        const hasAmountMismatch = Math.abs(expectedTotal - dbTotal) > 1 && order.status !== 'cancelled' && order.status !== 'partially_cancelled';
        return (
          <span className="flex items-center justify-end gap-0.5">
            <span className="text-[11px] font-bold text-blue-700">{dbTotal.toLocaleString()}</span>
            {hasAmountMismatch && (
              <span title={`금액 불일치: 계산값 ${expectedTotal.toLocaleString()} vs DB ${dbTotal.toLocaleString()}`} className="cursor-help">
                <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
              </span>
            )}
          </span>
        );
      }
      case "paymentMethod": {
        // 결제수단 배지 (첫 행에만)
        if (itemIdx !== 0 && itemIdx !== undefined) return <span></span>;
        const pm = order.paymentMethod;
        const isBankTransfer = pm === 'bank_transfer';
        const isUnconfirmed = isBankTransfer && !order.bankTransferConfirmedAt;
        return (
          <span className="flex flex-col gap-0.5 items-start">
            {pm === 'stripe' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                카드결제
              </span>
            )}
            {isBankTransfer && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                isUnconfirmed ? "bg-red-100 text-red-700 animate-pulse" : "bg-green-100 text-green-700"
              }`}>
                {isUnconfirmed ? "⚠️ 무통장미확인" : "✅ 무통장확인"}
              </span>
            )}
            {!pm && <span className="text-[10px] text-gray-400">-</span>}
          </span>
        );
      }
      case "userEmail":
        if (itemIdx !== 0 && itemIdx !== undefined) return <span></span>;
        return (
          <span className="text-[11px] text-gray-500 truncate max-w-[150px] block" title={(order as any).userEmail || ''}>
            {(order as any).userEmail || '-'}
          </span>
        );
      case "adminNote":
        if (itemIdx !== 0 && itemIdx !== undefined) return <span></span>;
        if (editingMemoOrderId === order.id) {
          return (
            <div className="flex flex-col gap-1 py-0.5" onClick={e => e.stopPropagation()}>
              <textarea
                autoFocus
                className="text-[11px] border border-amber-400 rounded px-1.5 py-1 w-full resize-none bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                rows={3}
                value={editingMemoValue}
                onChange={e => setEditingMemoValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape") { setEditingMemoOrderId(null); }
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    updateAdminNotesMutation.mutate({ orderId: order.id, notes: editingMemoValue });
                  }
                }}
                placeholder="메모 입력... (Ctrl+Enter 저장, Esc 취소)"
              />
              <div className="flex gap-1">
                <button
                  className="text-[10px] bg-amber-500 text-white rounded px-2 py-0.5 hover:bg-amber-600 disabled:opacity-50"
                  disabled={updateAdminNotesMutation.isPending}
                  onClick={() => updateAdminNotesMutation.mutate({ orderId: order.id, notes: editingMemoValue })}
                >
                  {updateAdminNotesMutation.isPending ? "저장중..." : "저장"}
                </button>
                <button
                  className="text-[10px] bg-gray-200 text-gray-600 rounded px-2 py-0.5 hover:bg-gray-300"
                  onClick={() => setEditingMemoOrderId(null)}
                >
                  취소
                </button>
              </div>
            </div>
          );
        }
        return (
          <span
            className="text-[11px] text-amber-700 truncate max-w-[170px] block cursor-pointer hover:bg-amber-50 rounded px-1 py-0.5 group"
            title={`클릭하여 메모 편집: ${(order as any).adminNotes || ''}`}
            onClick={e => {
              e.stopPropagation();
              setEditingMemoOrderId(order.id);
              setEditingMemoValue((order as any).adminNotes || '');
            }}
          >
            {(order as any).adminNotes ? (
              <span className="flex items-center gap-0.5">
                <span className="text-amber-500">📝</span>
                <span className="truncate">{(order as any).adminNotes}</span>
              </span>
            ) : (
              <span className="text-gray-300 italic group-hover:text-amber-400">메모 추가</span>
            )}
          </span>
        );
      case "deliveredAt":
        return <span className="text-[11px]">{order.deliveredAt ? new Date(order.deliveredAt).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}</span>;
      case "orderDate":
        return <span className="text-[11px]">{new Date(order.createdAt).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>;
      default:
        return null;
    }
  };

  // 고정 열 left offset 계산
  const getStickyLeft = (index: number) => {
    // checkbox col: 40px, then sticky cols
    let left = 40;
    for (let i = 0; i < index; i++) {
      if (COLUMNS[i].sticky) left += widths[COLUMNS[i].key];
    }
    return left;
  };

  return (
    <div className="flex h-[calc(100vh-32px)] bg-gray-100 min-w-[1280px] overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-col bg-gray-50 overflow-hidden flex-1 min-w-0">

      {/* -- 브레드크럼 -- */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-2 text-sm flex-shrink-0">
        <a href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">관리자</a>
        <span className="text-gray-300">/</span>
        <a href="/admin/orders" className="text-gray-400 hover:text-gray-600 transition-colors">주문 관리</a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">주문목록 대량</span>
      </div>
      {/* -- 요약 카운트 바 -- */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center gap-8 flex-shrink-0">
        {[
          { label: "입금전",     count: tabCounts?.pending || 0,    color: "text-yellow-700", icon: <Clock className="w-3 h-3" />,         status: "pending" },
          { label: "결제완료",   count: tabCounts?.paid || 0,       color: "text-green-700",  icon: <Package className="w-3 h-3" />,      status: "paid" },
          { label: "상품준비중", count: tabCounts?.confirmed || 0,  color: "text-blue-600",   icon: <Package className="w-3 h-3" />,      status: "confirmed" },
          { label: "배송중",     count: tabCounts?.shipped || 0,    color: "text-indigo-600",  icon: <Truck className="w-3 h-3" />,        status: "shipping" },
          { label: "배송완료",   count: tabCounts?.delivered || 0,  color: "text-gray-600",   icon: <CheckCircle className="w-3 h-3" />,   status: "delivered" },
          { label: "취소",       count: (tabCounts?.cancelled || 0) + (tabCounts?.partially_cancelled || 0),  color: "text-red-600",    icon: <XCircle className="w-3 h-3" />,      status: "cancelled", highlight2: true },
          { label: "발송지연",   count: shipmentDelayedData?.length || 0, color: "text-orange-600", icon: <AlertTriangle className="w-3 h-3" />, status: "shipment_delay", highlightOrange: true },
          { label: "배송완료지연", count: delayedOrdersData?.length || 0, color: "text-red-700", icon: <Truck className="w-3 h-3" />, status: "delivery_delay", highlightRed: true },
        ].map((item) => (
          <div key={item.status} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 whitespace-nowrap">{item.label}</span>
            <button
              className={`min-w-[32px] px-2 py-0.5 rounded text-sm font-bold border cursor-pointer ${
                (item as any).highlightRed ? "bg-red-100 text-red-700 border-red-300" :
                (item as any).highlightOrange ? "bg-orange-100 text-orange-700 border-orange-300" :
                item.highlight2 ? "bg-red-100 text-red-700 border-red-300" :
                "bg-white border-gray-300 " + item.color
              }`}
              onClick={() => {
                if (item.status === "shipment_delay") {
                  setShowShipmentDelayedTab(true);
                  setShowDelayedTab(false);
                } else if (item.status === "delivery_delay") {
                  setShowDelayedTab(true);
                  setShowShipmentDelayedTab(false);
                } else {
                  setActiveTab(item.status);
                  setFilterStatus("all");
                  setShowDelayedTab(false);
                  setShowShipmentDelayedTab(false);
                }
              }}
            >
              {item.count}
            </button>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3" /> 새로고침
          </Button>
        </div>
      </div>

      {/* -- 검색 바 -- */}
      <div className="bg-white border-b px-6 py-2 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 whitespace-nowrap">주문일</span>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-7 text-xs w-32" />
          <span className="text-xs">~</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-7 text-xs w-32" />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <Input
            placeholder="주문번호, 수취인, 연락처 검색"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setSearch(searchInput)}
            className="h-7 text-xs max-w-xs"
          />
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setSearch(searchInput)}>
            <Search className="w-3 h-3" /> 조회
          </Button>
          {(search || dateFrom || dateTo || filterStatus !== "all") && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
              setSearch(""); setSearchInput(""); setDateFrom(""); setDateTo(""); setFilterStatus("all");
            }}>
              <X className="w-3 h-3" /> 초기화
            </Button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-7 text-xs w-28">
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* UPG-04: 결제수단 필터 */}
          <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
            <SelectTrigger className="h-7 text-xs w-32">
              <SelectValue placeholder="결제수단" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">결제수단 전체</SelectItem>
              <SelectItem value="stripe">카드 (Stripe)</SelectItem>
              <SelectItem value="bank_transfer">무통장 입금</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => downloadExcel(false)}>
            <Download className="w-3 h-3" /> 전체주문 엑셀다운
          </Button>
          {/* 열 표시/숨기기 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Columns className="w-3 h-3" /> 열 설정
                {hiddenColumns.size > 0 && (
                  <span className="ml-0.5 bg-blue-500 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center">
                    {hiddenColumns.size}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-2">
              <div className="text-xs font-semibold text-gray-700 mb-2 pb-1 border-b">열 표시/숨기기</div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {COLUMNS.map(col => (
                  <label key={col.key} className={`flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-50 cursor-pointer ${
                    col.sticky ? "opacity-50 cursor-not-allowed" : ""
                  }`}>
                    <Checkbox
                      id={`col-${col.key}`}
                      checked={!hiddenColumns.has(col.key)}
                      onCheckedChange={() => { if (!col.sticky) toggleColumn(col.key); }}
                      disabled={col.sticky}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-xs text-gray-700">{col.label}</span>
                    {col.sticky && <span className="text-[9px] text-gray-400 ml-auto">고정</span>}
                  </label>
                ))}
              </div>
              {hiddenColumns.size > 0 && (
                <button
                  className="mt-2 w-full text-xs text-blue-600 hover:underline text-center"
                  onClick={() => {
                    setHiddenColumns(new Set());
                    localStorage.removeItem("adminOrdersHiddenColumns");
                  }}
                >
                  모든 열 표시
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>



      {/* -- 배송지연 탭 콘텐츠 -- */}
      {showDelayedTab && (
        <div className="flex-1 overflow-auto">
            <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold text-red-700">발송 후 14일 이상 경과한 배송중 주문</span>
              {delayedOrdersData && (
                <span className="text-xs text-red-500">{delayedOrdersData.length}건</span>
              )}
              {selectedDelayedOrders.size > 0 && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{selectedDelayedOrders.size}건 선택</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {delayedOrdersData && delayedOrdersData.length > 0 && (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => setSendEmailDialogOpen(true)}
                >
                  <Mail className="h-3 w-3 mr-1" />
                  {selectedDelayedOrders.size > 0 ? `${selectedDelayedOrders.size}건 이메일 발송` : '전체 이메일 발송'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchDelayed()}
                className="border-red-300 text-red-600 hover:bg-red-50 h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                새로고침
              </Button>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 w-8">
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
                <th className="px-3 py-2 text-left font-medium text-gray-600">주문번호</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">주문자</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">수취인</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">금액</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">발송일</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">지연 일수</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">송장번호</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">작업</th>
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
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
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
                    <td className="px-3 py-2 w-8" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded cursor-pointer"
                        checked={selectedDelayedOrders.has(order.id)}
                        onChange={(e) => {
                          const next = new Set(selectedDelayedOrders);
                          if (e.target.checked) next.add(order.id);
                          else next.delete(order.id);
                          setSelectedDelayedOrders(next);
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-mono text-gray-900">{order.orderNumber}</p>
                      <p className="text-gray-400">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('ko-KR') : '-'}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-gray-900">{order.userName || '-'}</p>
                      <p className="text-gray-400">{order.userEmail || ''}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-gray-900">{order.shippingName}</p>
                      <p className="text-gray-400">{order.shippingPhone || ''}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-gray-900">{formatPrice(parseFloat(order.totalAmount))}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-gray-600">
                        {order.shippedAt ? new Date(order.shippedAt).toLocaleDateString('ko-KR') : '-'}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded-full ${
                        order.daysDelayed >= 30 ? 'bg-red-100 text-red-700' :
                        order.daysDelayed >= 21 ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.daysDelayed}일 지연
                      </span>
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {order.shipment ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-gray-600">{order.shipment.trackingNumber}</span>
                          {order.shipment.carrier && CARRIER_TRACKING_URLS[order.shipment.carrier] && (
                            <a
                              href={CARRIER_TRACKING_URLS[order.shipment.carrier](order.shipment.trackingNumber)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700"
                              title="배송 추적"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 italic">미입력</span>
                      )}
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                        >
                          상세
                        </Button>
                        <Button
                          size="sm"
                          className="h-6 text-xs bg-red-500 hover:bg-red-600 text-white"
                          title="고객에게 배송완료지연 안내 이메일 발송"
                          onClick={() => {
                            setShipmentDelayOrderId(order.id);
                            setShipmentDelayOrderNumber(order.orderNumber);
                            setShipmentDelayReason(`発送後${order.daysDelayed}日が経過しましたが、まだ配達が完了していません。受取人不在・通関手続き等の理由が考えられます。ご不便をおかけし申し訳ございません。`);
                            setShowShipmentDelayDialog(true);
                          }}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          알림
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* -- 발송지연 탭 콘텐츠 -- */}
      {showShipmentDelayedTab && (
        <div className="flex-1 overflow-auto">
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-orange-700">상품준비중 상태로 기준일 이상 경과한 주문</span>
              {shipmentDelayedData && (
                <span className="text-xs text-orange-500">{shipmentDelayedData.length}건</span>
              )}
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setShowShipmentDelayedTab(false); refetchShipmentDelayed(); }}>
              <X className="w-3 h-3" /> 닫기
            </Button>
          </div>
          {!shipmentDelayedData || shipmentDelayedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Package className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm">발송지연 주문이 없습니다.</p>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="bg-orange-50 sticky top-0">
                <tr>
                  <th className="border border-orange-200 px-3 py-2 text-left">주문번호</th>
                  <th className="border border-orange-200 px-3 py-2 text-left">수취인</th>
                  <th className="border border-orange-200 px-3 py-2 text-left">주문금액</th>
                  <th className="border border-orange-200 px-3 py-2 text-left">경과일수</th>
                  <th className="border border-orange-200 px-3 py-2 text-left">주문일</th>
                  <th className="border border-orange-200 px-3 py-2 text-left">작업</th>
                </tr>
              </thead>
              <tbody>
                {shipmentDelayedData.map((order: any) => (
                  <tr key={order.id} className="hover:bg-orange-50/50">
                    <td className="border border-gray-200 px-3 py-2">
                      <a href={`/admin/orders/${order.id}`} className="text-blue-600 hover:underline font-mono">{order.orderNumber}</a>
                    </td>
                    <td className="border border-gray-200 px-3 py-2">{order.recipientName || order.shippingName || '-'}</td>
                    <td className="border border-gray-200 px-3 py-2">{formatPrice(Number(order.finalAmount || order.totalAmount || 0))}</td>
                    <td className="border border-gray-200 px-3 py-2">
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">{order.daysDelayed}일</span>
                    </td>
                    <td className="border border-gray-200 px-3 py-2">{new Date(order.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="border border-gray-200 px-3 py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs gap-1 text-orange-700 border-orange-300"
                        onClick={() => {
                          setShipmentDelayOrderId(order.id);
                          setShipmentDelayOrderNumber(order.orderNumber);
                          setShipmentDelayReason("");
                          setShowShipmentDelayDialog(true);
                        }}
                      >
                        <Mail className="w-3 h-3" /> 발송지연 안내
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* -- 스프레드시트 테이블 -- */}
      <div className={`flex-1 overflow-hidden flex flex-col ${showDelayedTab || showShipmentDelayedTab ? 'hidden' : ''}`}>
        {/* 테이블 컨테이너 - 가로+세로 스크롤 */}
        <div className="flex-1 overflow-auto relative" style={{ minHeight: 0 }}>
          <table className="border-collapse text-xs" style={{ tableLayout: "fixed", minWidth: visibleColumns.reduce((s, c) => s + widths[c.key], 0) + 40 }}>
            {/* 헤더 */}
            <thead className="sticky top-0 z-20 bg-gray-100">
              <tr>
                {/* 체크박스 열 */}
                <th
                  className="sticky left-0 z-30 bg-gray-100 border border-gray-300 px-0.5 py-1.5 text-center"
                  style={{ width: 40, minWidth: 40 }}
                >
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer" />
                </th>
                {visibleColumns.map((col, idx) => {
                  const stickyLeft = col.sticky ? getStickyLeft(idx) : undefined;
                  const isColSelected = selectedColumn === col.key;
                  return (
                    <th
                      key={col.key}
                      title={`"최종결제금액" 열 클릭 → 전체 복사`.replace('"최종결제금액"', `"${col.label}"`)}
                      className={`border border-gray-300 px-1 py-1.5 text-left font-medium select-none relative text-[11px] cursor-pointer transition-colors ${
                        isColSelected
                          ? "bg-blue-200 text-blue-900"
                          : col.sticky ? "sticky z-30 bg-gray-100 text-gray-700 hover:bg-blue-50" : col.key === "tracking" ? "bg-yellow-50 text-gray-700 hover:bg-yellow-100" : "bg-gray-100 text-gray-700 hover:bg-blue-50"
                      } ${col.sticky ? "sticky z-30" : ""}`}
                      style={{ width: widths[col.key], minWidth: widths[col.key], left: stickyLeft }}
                      onClick={() => copyColumnToClipboard(col.key, col.label)}
                    >
                      <span className="truncate block pr-3">{col.label}{isColSelected && <span className="ml-1 text-blue-600">✓</span>}</span>
                      {/* 리사이즈 핸들 */}
                      <div
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-300 flex items-center justify-center"
                        onMouseDown={(e) => { e.stopPropagation(); onMouseDown(col.key, e); }}
                      >
                        <div className="w-px h-4 bg-gray-400" />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* 바디 */}
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="text-center py-16 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="text-center py-16 text-gray-400">
                    표시할 행이 없습니다
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => {
                  const items = order.itemsWithImages?.length > 0 ? order.itemsWithImages : [null];
                  return (
                  <React.Fragment key={order.id}>
                    {items.map((item: any, itemIdx: number) => {
                      const itemKey = `${order.id}-${itemIdx}`;
                      const isItemSelected = selectedRows.has(itemKey);
                      return (
                    <tr
                      key={`${order.id}-item-${itemIdx}`}
                      className={`hover:bg-blue-50 transition-colors ${
                        isItemSelected ? "bg-blue-50" : itemIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                    >
                      {/* 체크박스 - 각 상품 행마다 표시 */}
                      <td
                        className={`sticky left-0 z-10 border border-gray-200 px-0.5 py-0 text-center ${
                          isItemSelected ? "bg-blue-50" : itemIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                        style={{ width: 40, minWidth: 40 }}
                      >
                        <input
                          type="checkbox"
                          checked={isItemSelected}
                          onChange={() => toggleRow(itemKey)}
                          className="cursor-pointer"
                        />
                      </td>
                      {visibleColumns.map((col, idx) => {
                        const stickyLeft = col.sticky ? getStickyLeft(idx) : undefined;
                        const isColHighlighted = selectedColumn === col.key;
                        return (
                          <td
                            key={col.key}
                            className={`border border-gray-200 px-0.5 py-0 overflow-hidden align-top transition-colors ${
                              isColHighlighted
                                ? "bg-blue-50 ring-1 ring-inset ring-blue-200"
                                : col.sticky
                                  ? `sticky z-10 ${
                                      selectedRows.has(order.id) ? "bg-blue-50" : itemIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                    }`
                                  : col.key === "tracking" ? "bg-yellow-50/80" : ""
                            }`}
                            style={{ width: widths[col.key], minWidth: widths[col.key], left: stickyLeft }}
                          >
                            {renderCell(order, col.key, item, itemIdx)}
                          </td>
                        );
                      })}
                    </tr>
                      );
                    })}
                    {/* 주문 상세 확장 패널 */}
                    {expandedOrder === order.id && (
                      <tr key={`detail-${order.id}`} className="bg-gray-50">
                        <td colSpan={visibleColumns.length + 1} className="border border-gray-200 p-4">
                          <div className="space-y-4">
                            {/* 상품별 부분 취소 섹션 */}
                            {(()=>{ const items=order.itemsWithImages||[]; const selectedForCancel=cancelTargetOrderId===order.id?cancelSelectedItems:new Set<number>(); const selectedRefund=items.filter((it:any)=>selectedForCancel.has(it.id)&&!it.cancelledAt).reduce((s:number,it:any)=>s+Number(it.subtotal||0)-Number(it.discountAmount||0),0); return (
                                <div className="border rounded-lg overflow-hidden">
                                  <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                                      <Scissors className="w-3.5 h-3.5 text-red-500" />
                                      상품별 부분 취소
                                    </h3>
                                    {selectedForCancel.size > 0 && (
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-600">
                                          선택 {selectedForCancel.size}개 · 환불 예상금액 <strong className="text-red-600">{selectedRefund.toLocaleString()}</strong>원
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="h-6 text-xs px-2 gap-1"
                                          onClick={() => setCancelDialogOpen(true)}
                                        >
                                          <Scissors className="w-3 h-3" /> 선택 상품 취소
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <table className="w-full text-xs">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="w-8 px-2 py-1.5 text-center">선택</th>
                                        <th className="px-3 py-1.5 text-left">상품명</th>
                                        <th className="px-2 py-1.5 text-right">단가</th>
                                        <th className="px-2 py-1.5 text-right">수량</th>
                                        <th className="px-2 py-1.5 text-right">상품금액</th>
                                        <th className="px-2 py-1.5 text-right">할인금액</th>
                                        <th className="px-2 py-1.5 text-right">환불금액</th>
                                        <th className="px-2 py-1.5 text-center">상태</th>
                                        <th className="px-2 py-1.5 text-center">복원</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {items.map((it: any) => {
                                        const isCancelled = !!it.cancelledAt;
                                        const isChecked = selectedForCancel.has(it.id);
                                        const refundAmt = Number(it.subtotal || 0) - Number(it.discountAmount || 0);
                                        return (
                                          <tr key={it.id} className={`border-t ${isCancelled ? "bg-red-50 opacity-60" : isChecked ? "bg-orange-50" : "bg-white"}` }>
                                            <td className="px-2 py-1.5 text-center">
                                              {!isCancelled && (
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={() => {
                                                    setCancelTargetOrderId(order.id);
                                                    setCancelSelectedItems(prev => {
                                                      const next = new Set(prev);
                                                      if (next.has(it.id)) next.delete(it.id); else next.add(it.id);
                                                      return next;
                                                    });
                                                  }}
                                                  className="cursor-pointer"
                                                />
                                              )}
                                            </td>
                                            <td className="px-3 py-1.5">
                                              <div className={`font-medium ${isCancelled ? "line-through text-gray-400" : ""}`}>{it.productName || "-"}</div>
                                              {it.optionInfo && <div className="text-gray-400 text-[10px]">{it.optionInfo}</div>}
                                            </td>
                                            <td className="px-2 py-1.5 text-right">{Number(it.unitPrice || 0).toLocaleString()}</td>
                                            <td className="px-2 py-1.5 text-right">{it.quantity}</td>
                                            <td className="px-2 py-1.5 text-right">{Number(it.subtotal || 0).toLocaleString()}</td>
                                            <td className="px-2 py-1.5 text-right text-red-600">{Number(it.discountAmount || 0) > 0 ? `-${Number(it.discountAmount).toLocaleString()}` : "-"}</td>
                                            <td className="px-2 py-1.5 text-right font-medium">{refundAmt.toLocaleString()}</td>
                                            <td className="px-2 py-1.5 text-center">
                                              {isCancelled ? (
                                                <Badge variant="destructive" className="text-[10px] px-1 py-0">취소됨</Badge>
                                              ) : (
                                                <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-700 border-green-300">정상</Badge>
                                              )}
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                              {isCancelled && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-5 text-[10px] px-1.5 gap-0.5"
                                                  onClick={() => restoreItemMutation.mutate({ orderId: order.id, itemId: it.id })}
                                                  disabled={restoreItemMutation.isPending}
                                                >
                                                  <RotateCcw className="w-2.5 h-2.5" /> 복원
                                                </Button>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t-2">
                                      <tr>
                                        <td colSpan={6} className="px-3 py-1.5 text-right font-medium text-gray-600">총 환불 가능 금액</td>
                                        <td className="px-2 py-1.5 text-right font-bold text-blue-700">
                                          {items.filter((it: any) => !it.cancelledAt).reduce((s: number, it: any) => s + Number(it.subtotal || 0) - Number(it.discountAmount || 0), 0).toLocaleString()}
                                        </td>
                                        <td colSpan={2} />
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              );
                            })()}

                            <div className="grid grid-cols-2 gap-8">
                            {/* 주문정보 */}
                            <div>
                              <h3 className="font-semibold text-sm mb-3 pb-1 border-b">주문정보</h3>
                              <table className="w-full text-xs">
                                <tbody>
                                  {[
                                    ["주문번호", order.orderNumber],
                                    ["배송상태", STATUS_MAP[order.status]?.label || order.status],
                                    ["수량", (order.itemsWithImages || []).reduce((s: number, i: any) => s + i.quantity, 0)],
                                    ["총금액", formatPrice((order.itemsWithImages || []).reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0))],
                                    ["상품할인", (() => { const d = (order.itemsWithImages || []).reduce((s: number, i: any) => s + Number(i.discountAmount || 0), 0); return d > 0 ? `-${formatPrice(d)}` : "-"; })()],
                                    ["쿠폰할인", (() => { const c = Number(order.couponDiscount || 0); return c > 0 ? `-${formatPrice(c)}${order.couponCode ? ` [${order.couponCode}]` : ""}` : "-"; })()],
                                    ["포인트사용", Number(order.pointsUsed || 0) > 0 ? `-${Number(order.pointsUsed || 0).toLocaleString()}P` : "-"],
                                    ["배송비", `+${formatPrice(Number(order.shippingFee || 0))}`],
                                    ["최종결제금액", formatPrice(Number(order.totalAmount || 0))],
["결제수단", order.paymentMethod === 'stripe' ? '카드결제' : order.paymentMethod === 'bank_transfer' ? (
                                       !order.bankTransferConfirmedAt ? '⚠️ 무통장 (미확인)' : '✅ 무통장 (확인완료)'
                                     ) : order.paymentMethod === 'cookiepay' ? '🍪 쿠키페이' : order.paymentMethod === 'payoneer' ? 'Payoneer' : order.paymentMethod || '-'],
                                    ["주문일시", new Date(order.createdAt).toLocaleString("ko-KR")],
                                    ["상품명", order.itemsSummary || "-"],
                                  ].map(([label, value]) => {
                                    const isFinalAmount = label === "최종결제금액";
                                    const isUnconfirmedBank = label === "결제수단" && typeof value === 'string' && (value as string).includes('⚠️');
                                    return (
                                      <tr key={String(label)} className={`border-b border-gray-100 ${
                                        isFinalAmount ? "bg-blue-50" : isUnconfirmedBank ? "bg-red-50" : ""
                                      }`}>
                                        <td className={`py-1.5 pr-4 w-28 font-medium ${
                                          isFinalAmount ? "text-blue-700" : isUnconfirmedBank ? "text-red-600" : "text-gray-500"
                                        }`}>{label}</td>
                                        <td className={`py-1.5 ${
                                          isFinalAmount ? "font-bold text-blue-700 text-sm" : isUnconfirmedBank ? "font-medium text-red-600" : ""
                                        }`}>{value}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            {/* 배송정보 */}
                            <div>
                              <h3 className="font-semibold text-sm mb-3 pb-1 border-b">배송정보</h3>
                              <table className="w-full text-xs">
                                <tbody>
                                  {[
                                    ["수취인/연락처", `${order.shippingName || "-"} / ${order.shippingPhone || "-"}`],
                                    ["배송주소", order.shippingAddress || "-"],
                                    ["우편번호", order.shippingPostalCode || "-"],
                                    ["택배사", order.shipment?.carrier || "-"],
                                    ["송장번호", order.shipment?.trackingNumber || "-"],
                                    ["발송예정일", order.shipment?.estimatedDeliveryDate ? new Date(order.shipment.estimatedDeliveryDate).toLocaleDateString("ko-KR") : "-"],
                                  ].map(([label, value]) => (
                                    <tr key={label} className="border-b border-gray-100">
                                      <td className="py-1.5 pr-4 text-gray-500 w-28 font-medium">{label}</td>
                                      <td className="py-1.5">{value}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* 취소 이력 섹션 */}
                          {(()=>{
                            const cancelledItems = (order.itemsWithImages || []).filter((it: any) => it.cancelledAt);
                            if (cancelledItems.length === 0) return null;
                            return (
                              <div className="border rounded-lg overflow-hidden">
                                <div className="bg-red-50 px-4 py-2 flex items-center gap-2 border-b border-red-100">
                                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                                  <h3 className="font-semibold text-sm text-red-700">취소 이력</h3>
                                  <span className="text-xs text-red-500">({cancelledItems.length}개 상품 취소)</span>
                                </div>
                                <div className="divide-y">
                                  {cancelledItems.map((it: any, idx: number) => (
                                    <div key={it.id} className="px-4 py-3 flex items-start gap-3">
                                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                                        <span className="text-red-600 text-[10px] font-bold">{idx + 1}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="text-xs font-medium text-gray-800 truncate">
                                            {it.productName || "-"}
                                            {it.optionInfo && <span className="text-gray-400 ml-1">({it.optionInfo})</span>}
                                          </div>
                                          <div className="text-xs font-semibold text-red-600 flex-shrink-0">
                                            -{(Number(it.subtotal || 0) - Number(it.discountAmount || 0)).toLocaleString()}원 환불
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                          <span className="text-[10px] text-gray-400">
                                            취소일시: {it.cancelledAt ? new Date(it.cancelledAt).toLocaleString("ko-KR") : "-"}
                                          </span>
                                          {it.cancelReason && (
                                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                              사유: {it.cancelReason}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* UPG-02: 페이지네이션 */}
        {totalCount > PAGE_SIZE && (
          <div className="bg-white border-t px-6 py-2 flex-shrink-0 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              전체 {totalCount.toLocaleString()}건 · {currentPage}페이지 / {Math.ceil(totalCount / PAGE_SIZE)}페이지
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm" className="h-7 px-2 text-xs"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                «
              </Button>
              <Button
                variant="outline" size="sm" className="h-7 px-2 text-xs"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ‹ 이전
              </Button>
              {/* 페이지 번호 버튼 */}
              {Array.from({ length: Math.min(7, Math.ceil(totalCount / PAGE_SIZE)) }, (_, i) => {
                const total = Math.ceil(totalCount / PAGE_SIZE);
                let start = Math.max(1, currentPage - 3);
                const end = Math.min(total, start + 6);
                if (end - start < 6) start = Math.max(1, end - 6);
                const page = start + i;
                if (page > total) return null;
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    className="h-7 w-7 p-0 text-xs"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline" size="sm" className="h-7 px-2 text-xs"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1))}
                disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
              >
                다음 ›
              </Button>
              <Button
                variant="outline" size="sm" className="h-7 px-2 text-xs"
                onClick={() => setCurrentPage(Math.ceil(totalCount / PAGE_SIZE))}
                disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
              >
                »
              </Button>
            </div>
          </div>
        )}
        {/* -- 하단 액션 바 -- */}
        <div className="bg-white border-t px-6 py-3 flex-shrink-0">
          <div className="space-y-2">
            {/* 1행: 자주 쓰는 버튼 */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  if (selectedRows.size === 0) { toast.warning("선택된 상품이 없습니다."); return; }
                  setBulkTrackingOpen(true);
                }}
              >
                <Truck className="w-3 h-3" /> 일괄 송장번호 입력
                {selectedRows.size > 0 && (
                  <span className="ml-0.5 bg-white text-blue-600 rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">
                    {selectedRows.size}
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                className={`h-7 text-xs gap-1 ${
                  activeTab === 'paid'
                    ? 'bg-orange-500 hover:bg-orange-600 text-white ring-2 ring-orange-300 ring-offset-1'
                    : 'bg-orange-400 hover:bg-orange-500 text-white'
                }`}
                onClick={() => {
                  const paidIds = getPaidOrderIds();
                  if (paidIds.length === 0) { toast.warning("상품준비중으로 변경할 결제완료 주문이 없습니다."); return; }
                  setQuickConfirmDialogOpen(true);
                }}
              >
                <Package className="w-3 h-3" /> 결제완료→상품준비중
                {getPaidOrderIds().length > 0 && (
                  <span className="ml-0.5 bg-white text-orange-600 rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">
                    {getPaidOrderIds().length}
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  const ids = getUnconfirmedBankOrderIds();
                  if (ids.length === 0) { toast.warning("확인할 무통장 미확인 주문이 없습니다."); return; }
                  bulkConfirmBankMutation.mutate({ orderIds: ids });
                }}
                disabled={bulkConfirmBankMutation.isPending}
              >
                <CheckCircle className="w-3 h-3" /> 일괄 입금확인
                {getUnconfirmedBankOrderIds().length > 0 && (
                  <span className="ml-0.5 bg-white text-green-600 rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">
                    {getUnconfirmedBankOrderIds().length}
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  if (selectedRows.size === 0) { toast.warning("선택된 주문이 없습니다."); return; }
                  setBulkStatusDialogOpen(true);
                }}
              >
                <RefreshCw className="w-3 h-3" /> 일괄 상태 변경
                {selectedRows.size > 0 && (
                  <span className="ml-0.5 bg-white text-emerald-600 rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">
                    {getSelectedOrderIds().length}
                  </span>
                )}
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                if (selectedRows.size === 0) { toast.warning("선택된 주문이 없습니다."); return; }
                toast.info("배송방식변경 기능은 준비 중입니다.");
              }}>
                배송방식변경
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.info("배송비조회 기능은 준비 중입니다.")}>
                배송비조회
              </Button>
              <div className="ml-auto text-xs text-gray-500">
                총 <strong>{totalCount}</strong>건 | 선택 <strong>{selectedRows.size}</strong>건
              </div>
            </div>
            {/* 2행: 나머지 버튼 */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => downloadExcel(false)}>
                <Download className="w-3 h-3" /> 전체주문 엑셀다운
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  if (selectedRows.size === 0) { toast.warning("선택된 주문이 없습니다."); return; }
                  downloadExcel(true);
                }}
              >
                <Download className="w-3 h-3" /> 선택주문 엑셀다운
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.info("주소 출력 기능은 준비 중입니다.")}>주소 출력</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.info("납품서출력 기능은 준비 중입니다.")}>납품서출력</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.info("발주서출력 기능은 준비 중입니다.")}>발주서출력</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.info("바코드 라벨출력 기능은 준비 중입니다.")}>바코드 라벨출력</Button>
            </div>
          </div>
        </div>
      </div>
      {/* 부분 취소 확인 다이얼로그 */}
      {cancelDialogOpen && cancelTargetOrderId && (() => {
        const targetOrder = orders.find((o: any) => o.id === cancelTargetOrderId);
        const items = targetOrder?.itemsWithImages || [];
        const selectedItemsList = items.filter((it: any) => cancelSelectedItems.has(it.id) && !it.cancelledAt);
        const refundAmount = selectedItemsList.reduce((s: number, it: any) => s + Number(it.subtotal || 0) - Number(it.discountAmount || 0), 0);
        const isAllItems = selectedItemsList.length === items.filter((it: any) => !it.cancelledAt).length;
        return (
          <Dialog open={cancelDialogOpen} onOpenChange={(open) => { if (!open) { setCancelDialogOpen(false); setCancelReason(""); } }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-red-500" />
                  상품 취소 확인
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  선택한 {selectedItemsList.length}개 상품을 취소합니다.
                  {isAllItems && " (전체 상품 취소 시 주문이 취소 상태로 변경됩니다.)"}
                </DialogDescription>
              </DialogHeader>
              <div className="py-3 space-y-4">
                {/* 취소 상품 목록 */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 border-b">취소 대상 상품</div>
                  <div className="divide-y max-h-48 overflow-y-auto">
                    {selectedItemsList.map((it: any) => (
                      <div key={it.id} className="px-3 py-2 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-medium">{it.productName || "-"}</div>
                          {it.optionInfo && <div className="text-gray-400">{it.optionInfo}</div>}
                          <div className="text-gray-500">수량: {it.quantity} × {Number(it.unitPrice || 0).toLocaleString()}원</div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-500 line-through text-[10px]">{Number(it.subtotal || 0).toLocaleString()}</div>
                          {Number(it.discountAmount || 0) > 0 && (
                            <div className="text-red-500 text-[10px]">-{Number(it.discountAmount).toLocaleString()}</div>
                          )}
                          <div className="font-semibold text-blue-700">{(Number(it.subtotal || 0) - Number(it.discountAmount || 0)).toLocaleString()}원</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 환불 금액 요약 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">예상 환불 금액</span>
                    <span className="text-lg font-bold text-blue-700">{refundAmount.toLocaleString()}원</span>
                  </div>
                  {targetOrder?.paymentMethod === 'stripe' && (
                    <div className="text-xs text-blue-600 mt-1">Stripe를 통해 자동 환불 처리됩니다.</div>
                  )}
                  {targetOrder?.paymentMethod === 'bank_transfer' && (
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
                <Button variant="outline" size="sm" onClick={() => { setCancelDialogOpen(false); setCancelReason(""); }}
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
                      orderId: cancelTargetOrderId!,
                      itemIds: selectedItemsList.map((it: any) => it.id),
                      cancelReason: cancelReason || undefined,
                      refundAmount: refundAmount > 0 ? refundAmount : undefined,
                    });
                  }}
                >
                  {cancelItemsMutation.isPending ? (
                    <><RefreshCw className="w-3 h-3 animate-spin" /> 처리 중...</>
                  ) : (
                    <><Scissors className="w-3 h-3" /> {selectedItemsList.length}개 상품 취소 확인</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* 일괄 송장번호 입력 다이얼로그 */}
      <Dialog open={bulkTrackingOpen} onOpenChange={(open) => { setBulkTrackingOpen(open); if (!open) setBulkTrackingNumber(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">일괄 송장번호 입력</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
              선택된 <strong>{selectedRows.size}개 상품</strong>에 동일한 송장번호를 일괄 적용합니다.
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-carrier" className="text-xs font-medium">택배사</Label>
              <Select value={bulkCarrier} onValueChange={setBulkCarrier}>
                <SelectTrigger id="bulk-carrier" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Japan Post">日本郵便 (Japan Post)</SelectItem>
                  <SelectItem value="Yamato">クロネコヤマト運輸 (Yamato)</SelectItem>
                  <SelectItem value="Sagawa">佐川急便 (Sagawa)</SelectItem>
                  <SelectItem value="Fukuyama">福山通運 (Fukuyama)</SelectItem>
                  <SelectItem value="Seino">西濃運輸 (Seino)</SelectItem>
                  <SelectItem value="EMS">EMS (国際郵便)</SelectItem>
                  <SelectItem value="Other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-tracking" className="text-xs font-medium">송장번호</Label>
              <Input
                id="bulk-tracking"
                placeholder="송장번호를 입력하세요"
                value={bulkTrackingNumber}
                onChange={e => setBulkTrackingNumber(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleBulkTracking(); }}
                className="h-8 text-sm font-mono"
                autoFocus
              />
            </div>
            {/* 선택된 상품 목록 미리보기 */}
            <div className="space-y-1">
              <div className="text-xs text-gray-500 font-medium mb-1">적용 대상 상품 ({Math.min(getSelectedItemData().length, 5)}/{getSelectedItemData().length})</div>
              <div className="max-h-32 overflow-y-auto border rounded-lg divide-y text-xs">
                {getSelectedItemData().slice(0, 5).map((item, i) => (
                  <div key={i} className="px-3 py-1.5 flex items-center gap-2">
                    <span className="text-gray-400 font-mono w-5 text-right">{i + 1}.</span>
                    <span className="text-blue-600 font-mono">{item.orderNumber}</span>
                    <span className="text-gray-400">주문 #{item.orderId}</span>
                  </div>
                ))}
                {getSelectedItemData().length > 5 && (
                  <div className="px-3 py-1.5 text-gray-400 text-center">
                    ... 외 {getSelectedItemData().length - 5}개 더
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setBulkTrackingOpen(false); setBulkTrackingNumber(""); }}>
              취소
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
              onClick={handleBulkTracking}
              disabled={bulkLoading || !bulkTrackingNumber.trim()}
            >
              {bulkLoading ? (
                <><RefreshCw className="w-3 h-3 animate-spin" /> 적용 중...</>
              ) : (
                <><Truck className="w-3 h-3" /> {selectedRows.size}개 상품에 적용</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 상태 변경 확인 다이얼로그 */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={(open) => { if (!open) setBulkStatusDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              일괄 주문 상태 변경
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              선택한 <strong>{getSelectedOrderIds().length}개 주문</strong>의 상태를 일괄 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 변경할 상태 선택 */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">변경할 상태</Label>
              <Select value={bulkTargetStatus} onValueChange={setBulkTargetStatus}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">입금전</SelectItem>
                  <SelectItem value="paid">결제완료</SelectItem>
                  <SelectItem value="confirmed">상품 준비중</SelectItem>
                  <SelectItem value="processing">배송준비중</SelectItem>
                  <SelectItem value="shipped">배송중</SelectItem>
                  <SelectItem value="delivered">배송완료</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* 선택된 주문 목록 미리보기 */}
            <div className="space-y-1">
              <div className="text-xs text-gray-500 font-medium mb-1">적용 대상 주문 ({Math.min(getSelectedOrderIds().length, 5)}/{getSelectedOrderIds().length})</div>
              <div className="max-h-40 overflow-y-auto border rounded-lg divide-y text-xs">
                {getSelectedOrderIds().slice(0, 5).map((orderId, i) => {
                  const order = orders.find((o: any) => o.id === orderId);
                  return (
                    <div key={orderId} className="px-3 py-1.5 flex items-center gap-2">
                      <span className="text-gray-400 font-mono w-5 text-right">{i + 1}.</span>
                      <span className="text-blue-600 font-mono text-[11px]">{order?.orderNumber || `#${orderId}`}</span>
                      {order && (
                        <>
                          <span className="text-gray-500">{order.userName || '-'}</span>
                          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border ${STATUS_MAP[order.status]?.color || ''}`}>
                            {STATUS_MAP[order.status]?.label || order.status}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
                {getSelectedOrderIds().length > 5 && (
                  <div className="px-3 py-1.5 text-gray-400 text-center">
                    ... 외 {getSelectedOrderIds().length - 5}개 더
                  </div>
                )}
              </div>
            </div>
            {/* 주의 메시지 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              <strong>⚠️ 주의:</strong> 상태 변경 시 각 주문의 고객에게 이메일 알림이 발송됩니다.
              {bulkTargetStatus === 'cancelled' && (
                <span className="block mt-1 text-red-600">취소 시 Stripe 자동 환불이 진행됩니다.</span>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkStatusDialogOpen(false)} disabled={bulkStatusLoading}>
              취소
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              onClick={handleBulkStatusChange}
              disabled={bulkStatusLoading}
            >
              {bulkStatusLoading ? (
                <><RefreshCw className="w-3 h-3 animate-spin" /> 변경 중...</>
              ) : (
                <><RefreshCw className="w-3 h-3" /> {getSelectedOrderIds().length}개 주문 상태 변경</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 결제완료 → 상품준비중 빠른 처리 다이얼로그 */}
      <Dialog open={quickConfirmDialogOpen} onOpenChange={(open) => { if (!open) setQuickConfirmDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-500" />
              결제완료 → 상품준비중 일괄 변경
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              결제완료 상태의 <strong>{getPaidOrderIds().length}개 주문</strong>을 상품준비중으로 일괄 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* 대상 주문 목록 미리보기 */}
            <div className="border rounded-lg divide-y text-xs max-h-48 overflow-y-auto">
              {getPaidOrderIds().slice(0, 10).map((orderId) => {
                const order = orders.find((o: any) => o.id === orderId);
                return (
                  <div key={orderId} className="px-3 py-1.5 flex items-center gap-2">
                    <span className="text-blue-600 font-mono text-[11px]">{order?.orderNumber || `#${orderId}`}</span>
                    <span className="text-gray-500">{order?.userName || '-'}</span>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded border bg-green-100 text-green-800 border-green-300">
                      결제완료
                    </span>
                  </div>
                );
              })}
              {getPaidOrderIds().length > 10 && (
                <div className="px-3 py-1.5 text-gray-400 text-center">
                  ... 외 {getPaidOrderIds().length - 10}개 더
                </div>
              )}
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
              <strong>처리 내용:</strong> 선택된 결제완료 주문을 모두 “상품준비중” 상태로 변경하고 고객에게 이메일 알림을 발송합니다.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickConfirmDialogOpen(false)} disabled={quickConfirmLoading}>
              취소
            </Button>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1"
              onClick={handleQuickConfirm}
              disabled={quickConfirmLoading}
            >
              {quickConfirmLoading ? (
                <><RefreshCw className="w-3 h-3 animate-spin" /> 변경 중...</>
              ) : (
                <><Package className="w-3 h-3" /> {getPaidOrderIds().length}개 주문 상품준비중으로 변경</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BUG-04: 무통장 입금 확인 결과 다이얼로그 */}
      <Dialog open={bankConfirmDialogOpen} onOpenChange={setBankConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              일괄 입금확인 결과
            </DialogTitle>
          </DialogHeader>
          {bankConfirmResults && (
            <div className="space-y-3 py-2">
              <div className="flex gap-4 text-sm">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{bankConfirmResults.success}</div>
                  <div className="text-xs text-green-600">확인 완료</div>
                </div>
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-500">{bankConfirmResults.skipped}</div>
                  <div className="text-xs text-gray-500">스킵 (이미 확인됨)</div>
                </div>
              </div>
              {bankConfirmResults.results.length > 0 && (
                <div className="border rounded-lg divide-y text-xs max-h-48 overflow-y-auto">
                  {bankConfirmResults.results.map((r) => (
                    <div key={r.orderId} className="px-3 py-1.5 flex items-center gap-2">
                      <span className={r.success ? 'text-green-600' : 'text-gray-400'}>
                        {r.success ? '✓' : '–'}
                      </span>
                      <span className="font-mono text-[11px] text-blue-600">{r.orderNumber}</span>
                      {r.reason && <span className="ml-auto text-gray-400">{r.reason}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button size="sm" onClick={() => setBankConfirmDialogOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 배송지연 이메일 발송 확인 다이얼로그 */}
      <Dialog open={sendEmailDialogOpen} onOpenChange={setSendEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-500" />
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
            <Button variant="outline" onClick={() => setSendEmailDialogOpen(false)}>취소</Button>
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
                <><Mail className="h-4 w-4 mr-1" /> 이메일 발송</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- 발송지연 안내 다이얼로그 -- */}
      <ShipmentDelayDialog
        open={showShipmentDelayDialog}
        onOpenChange={(open) => {
          setShowShipmentDelayDialog(open);
          if (!open) { setShipmentDelayOrderId(null); setShipmentDelayReason(""); setShipmentDelayOrderNumber(""); }
        }}
        orderId={shipmentDelayOrderId}
        orderNumber={shipmentDelayOrderNumber}
        reason={shipmentDelayReason}
        onReasonChange={setShipmentDelayReason}
        orders={orders}
      />
      </div>
    </div>
  );
}

// 발송지연 다이얼로그 컴포넌트
function ShipmentDelayDialog({
  open, onOpenChange, orderId, orderNumber, reason, onReasonChange, orders
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number | null;
  orderNumber: string;
  reason: string;
  onReasonChange: (v: string) => void;
  orders: any[];
}) {
  const [selectedOrderId, setSelectedOrderId] = React.useState<number | null>(orderId);
  const [selectedOrderNumber, setSelectedOrderNumber] = React.useState(orderNumber);
  React.useEffect(() => { setSelectedOrderId(orderId); setSelectedOrderNumber(orderNumber); }, [orderId, orderNumber]);

  const notifyMutation = trpc.admin.notifyShipmentDelay.useMutation({
    onSuccess: (data) => {
      toast.success(`발송지연 안내 완료${data.emailSent ? ' (이메일 발송됨)' : ' (이메일 발송 실패)'}`);
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const pendingOrders = orders.filter((o: any) => ['pending', 'paid', 'confirmed'].includes(o.status));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            발송지연 안내 발송
          </DialogTitle>
          <DialogDescription>
            주문을 선택하고 지연 사유를 입력하면 고객에게 알림과 이메일이 자동 발송됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!orderId && (
            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1 block">주문 선택</Label>
              <Select
                value={selectedOrderId ? String(selectedOrderId) : ""}
                onValueChange={(v) => {
                  const id = Number(v);
                  setSelectedOrderId(id);
                  const o = orders.find((x: any) => x.id === id);
                  setSelectedOrderNumber(o?.orderNumber || "");
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="주문을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {pendingOrders.map((o: any) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.orderNumber} - {o.recipientName || o.userName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {(selectedOrderId || orderId) && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-xs text-orange-800">
              대상 주문: <strong>{selectedOrderNumber || orderNumber}</strong>
            </div>
          )}
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 block">지연 사유 <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="예) 재고 부족으로 인해 발송이 지연되고 있습니다. 약 3-5일 내 발송 예정입니다."
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={4}
              className="text-sm resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/500</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800">
            <p className="font-medium mb-1">전송 내용:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>고객 이메일: 발송지연 안내 + 지연 사유 포함</li>
              <li>관리자 알림: 발송지연 안내 발송 확인</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => {
              const targetId = selectedOrderId || orderId;
              if (!targetId) { toast.error('주문을 선택해주세요.'); return; }
              if (!reason.trim()) { toast.error('지연 사유를 입력해주세요.'); return; }
              notifyMutation.mutate({ orderId: targetId, delayReason: reason });
            }}
            disabled={notifyMutation.isPending}
          >
            {notifyMutation.isPending ? (
              <><span className="animate-spin mr-1">⏳</span> 발송 중...</>
            ) : (
              <><Mail className="h-4 w-4 mr-1" /> 안내 발송</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
