import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Edit, Trash2, Package, CheckCircle, XCircle,
  ShoppingBag, AlertTriangle, GripVertical,
  Flame, Star, Sparkles, TrendingUp, Tag, ArrowUpDown,
} from "lucide-react";
import { formatPrice } from "@/../../shared/utils/formatPrice";

const BADGES = [
  { key: "isHit",         label: "히트",   color: "bg-red-100 text-red-700 border-red-200",       icon: <Flame    className="h-2.5 w-2.5" /> },
  { key: "isRecommended", label: "추천",   color: "bg-blue-100 text-blue-700 border-blue-200",     icon: <Star     className="h-2.5 w-2.5" /> },
  { key: "isNew",         label: "신상품", color: "bg-green-100 text-green-700 border-green-200",  icon: <Sparkles className="h-2.5 w-2.5" /> },
  { key: "isPopular",     label: "인기",   color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <TrendingUp className="h-2.5 w-2.5" /> },
  { key: "isDiscount",    label: "할인",   color: "bg-orange-100 text-orange-700 border-orange-200", icon: <Tag    className="h-2.5 w-2.5" /> },
] as const;

type BadgeKey = typeof BADGES[number]["key"];

const STAT_CARDS = [
  { key: "all",          label: "전체",    colorNum: "text-gray-800",   colorRing: "ring-gray-400",   colorBg: "bg-white" },
  { key: "isHit",        label: "히트",    colorNum: "text-red-600",    colorRing: "ring-red-400",    colorBg: "bg-white" },
  { key: "isRecommended",label: "추천",    colorNum: "text-blue-600",   colorRing: "ring-blue-400",   colorBg: "bg-white" },
  { key: "isNew",        label: "신상품",  colorNum: "text-green-600",  colorRing: "ring-green-400",  colorBg: "bg-white" },
  { key: "isPopular",    label: "인기",    colorNum: "text-yellow-600", colorRing: "ring-yellow-400", colorBg: "bg-white" },
  { key: "isDiscount",   label: "할인",    colorNum: "text-orange-600", colorRing: "ring-orange-400", colorBg: "bg-white" },
  { key: "lowStock",     label: "재고부족", colorNum: "text-rose-600",  colorRing: "ring-rose-400",   colorBg: "bg-white" },
];

export default function AdminProducts() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterBadge, setFilterBadge] = useState<Record<BadgeKey, boolean>>({
    isHit: false, isRecommended: false, isNew: false, isPopular: false, isDiscount: false,
  });
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [localStatus, setLocalStatus] = useState<Record<number, { isActive?: boolean; isSoldOut?: boolean; isVisible?: boolean }>>({});
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<number[] | null>(null);
  const [localSortInputs, setLocalSortInputs] = useState<Record<number, number>>({});

  const [formData, setFormData] = useState({
    name: "", nameJa: "", categoryId: 1, price: "", originalPrice: "",
    description: "", descriptionJa: "", imageUrl: "",
    isTimeSale: false, isMonthlySale: false, inStock: true,
  });

  const { data: isAdmin, isLoading: checkingAdmin } = trpc.admin.isAdmin.useQuery(undefined, { enabled: !!user });
  const { data: productStats, refetch: refetchStats } = trpc.admin.productStats.useQuery(undefined, { enabled: isAdmin === true });

  const { data, isLoading, refetch } = trpc.admin.products.list.useQuery(
    {
      page, limit: 100,
      search: searchQuery || undefined,
      categoryId: filterCategory,
      priceMin: filterPriceMin !== "" ? parseFloat(filterPriceMin) : undefined,
      priceMax: filterPriceMax !== "" ? parseFloat(filterPriceMax) : undefined,
      isHit: filterBadge.isHit || undefined,
      isRecommended: filterBadge.isRecommended || undefined,
      isNew: filterBadge.isNew || undefined,
      isPopular: filterBadge.isPopular || undefined,
      isDiscount: filterBadge.isDiscount || undefined,
      isLowStock: filterLowStock || undefined,
    },
    { enabled: isAdmin === true }
  );

  const { data: categories } = trpc.category.list.useQuery();

  const createMutation = trpc.admin.createProduct.useMutation({
    onSuccess: () => { toast.success("상품이 생성되었습니다"); setShowDialog(false); resetForm(); refetch(); refetchStats(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.admin.updateProduct.useMutation({
    onSuccess: () => { toast.success("상품이 업데이트되었습니다"); setShowDialog(false); setEditingProduct(null); resetForm(); refetch(); refetchStats(); },
    onError: (e) => toast.error(e.message),
  });
  const quickUpdateMutation = trpc.admin.updateProduct.useMutation({
    onSuccess: () => { refetch(); refetchStats(); },
    onError: (e) => { toast.error(`저장 실패: ${e.message}`); setLocalStatus({}); refetch(); },
  });
  const bulkStatusMutation = trpc.admin.bulkUpdateProductStatus.useMutation({
    onSuccess: (result) => { toast.success(`${result.count}개 상품이 업데이트되었습니다`); refetch(); refetchStats(); setSelectedProducts(new Set()); setLocalStatus({}); },
    onError: (e) => toast.error(e.message),
  });
  const sortOrderMutation = trpc.admin.updateProductSortOrders.useMutation({
    onSuccess: () => { toast.success("순서가 저장되었습니다"); refetch(); setLocalOrder(null); },
    onError: (e) => toast.error(`순서 저장 실패: ${e.message}`),
  });
  const deleteMutation = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => { toast.success("상품이 삭제되었습니다"); refetch(); refetchStats(); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => setFormData({ name: "", nameJa: "", categoryId: 1, price: "", originalPrice: "", description: "", descriptionJa: "", imageUrl: "", isTimeSale: false, isMonthlySale: false, inStock: true });

  const handleSubmit = () => {
    if (!formData.name || !formData.nameJa || !formData.price) { toast.error("필수 항목을 입력해주세요"); return; }
    const payload = { ...formData, price: parseFloat(formData.price) || 0, originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined };
    if (editingProduct) updateMutation.mutate({ id: editingProduct.id, ...payload });
    else createMutation.mutate(payload);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({ name: product.name, nameJa: product.nameJa, categoryId: product.categoryId, price: product.price, originalPrice: product.originalPrice || "", description: product.description || "", descriptionJa: product.descriptionJa || "", imageUrl: product.imageUrl || "", isTimeSale: product.isTimeSale, isMonthlySale: product.isMonthlySale, inStock: product.stock > 0 });
    setShowDialog(true);
  };

  const handleDelete = (productId: number) => {
    if (confirm("이 상품을 삭제하시겠습니까?")) deleteMutation.mutate({ id: productId });
  };

  const handleQuickStatusUpdate = (productId: number, field: 'isActive' | 'isSoldOut' | 'isVisible', value: boolean) => {
    setLocalStatus(prev => ({ ...prev, [productId]: { ...prev[productId], [field]: value } }));
    if (field === 'isActive') quickUpdateMutation.mutate({ id: productId, isActive: value });
    else if (field === 'isSoldOut') quickUpdateMutation.mutate({ id: productId, stock: value ? 0 : 9999 });
    else quickUpdateMutation.mutate({ id: productId, isVisible: value });
  };

  const handleBadgeToggle = (productId: number, badgeKey: BadgeKey, currentValue: boolean) => {
    quickUpdateMutation.mutate({ id: productId, [badgeKey]: !currentValue });
  };

  const handleBulkBadge = (badgeKey: BadgeKey, value: boolean) => {
    if (selectedProducts.size === 0) { toast.error("변경할 상품을 선택해주세요"); return; }
    bulkStatusMutation.mutate({ ids: Array.from(selectedProducts), [badgeKey]: value });
  };

  const handleBulkStatus = (isActive?: boolean, isSoldOut?: boolean) => {
    if (selectedProducts.size === 0) { toast.error("변경할 상품을 선택해주세요"); return; }
    bulkStatusMutation.mutate({ ids: Array.from(selectedProducts), isActive, isSoldOut });
  };

  const handleBulkDelete = () => {
    if (selectedProducts.size === 0) { toast.error("삭제할 상품을 선택해주세요"); return; }
    if (confirm(`${selectedProducts.size}개의 상품을 삭제하시겠습니까?`)) {
      selectedProducts.forEach(id => deleteMutation.mutate({ id }));
      setSelectedProducts(new Set());
    }
  };

  const handleBulkCategoryChange = (categoryId: number) => {
    if (selectedProducts.size === 0) { toast.error("변경할 상품을 선택해주세요"); return; }
    selectedProducts.forEach(id => updateMutation.mutate({ id, categoryId }));
    setSelectedProducts(new Set());
    toast.success("카테고리가 변경되었습니다");
  };

  const toggleProductSelection = (productId: number) => {
    const s = new Set(selectedProducts);
    s.has(productId) ? s.delete(productId) : s.add(productId);
    setSelectedProducts(s);
  };

  const toggleAllSelection = () => {
    if (selectedProducts.size === displayedProducts.length) setSelectedProducts(new Set());
    else setSelectedProducts(new Set(displayedProducts.map((p: any) => p.id)));
  };

  const serverProducts = (data?.products || []).slice().sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const displayedProducts = localOrder
    ? localOrder.map(id => serverProducts.find((p: any) => p.id === id)).filter(Boolean)
    : serverProducts;

  const handleDragStart = (e: React.DragEvent, productId: number) => { setDraggedId(productId); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e: React.DragEvent, productId: number) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverId(productId); };
  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return; }
    const currentOrder = localOrder || serverProducts.map((p: any) => p.id);
    const fromIdx = currentOrder.indexOf(draggedId);
    const toIdx = currentOrder.indexOf(targetId);
    const newOrder = [...currentOrder];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedId);
    setLocalOrder(newOrder);
    setDraggedId(null);
    setDragOverId(null);
  };
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };

  const saveSortOrder = () => {
    if (!localOrder) return;
    sortOrderMutation.mutate({ orders: localOrder.map((id, idx) => ({ id, sortOrder: idx })) });
  };

  const handleSortOrderInput = (productId: number, value: string) => {
    const sortOrder = parseInt(value);
    if (!isNaN(sortOrder)) setLocalSortInputs(prev => ({ ...prev, [productId]: sortOrder }));
  };

  const handleBulkSortSave = () => {
    const selectedIds = Array.from(selectedProducts);
    const orders = selectedIds
      .filter(id => localSortInputs[id] !== undefined)
      .map(id => ({ id, sortOrder: localSortInputs[id] }));
    if (orders.length === 0) { toast.error("선택한 상품의 순위를 입력해주세요"); return; }
    sortOrderMutation.mutate({ orders }, {
      onSuccess: () => {
        setLocalSortInputs({});
        setSelectedProducts(new Set());
      }
    });
  };

  const handleStatCardClick = (filterType: string) => {
    setFilterBadge({ isHit: false, isRecommended: false, isNew: false, isPopular: false, isDiscount: false });
    setFilterLowStock(false);
    setPage(1);
    if (filterType === "lowStock") setFilterLowStock(true);
    else if (filterType !== "all") setFilterBadge(prev => ({ ...prev, [filterType]: true }));
  };

  const stats = {
    all:           productStats?.total ?? 0,
    isHit:         productStats?.hit ?? 0,
    isRecommended: productStats?.recommended ?? 0,
    isNew:         productStats?.newProducts ?? 0,
    isPopular:     productStats?.popular ?? 0,
    isDiscount:    productStats?.discount ?? 0,
    lowStock:      productStats?.lowStock ?? 0,
  };

  const isActiveFilter = (key: string) => {
    if (key === "all") return !filterBadge.isHit && !filterBadge.isRecommended && !filterBadge.isNew && !filterBadge.isPopular && !filterBadge.isDiscount && !filterLowStock;
    if (key === "lowStock") return filterLowStock;
    return filterBadge[key as BadgeKey];
  };

  if (loading || checkingAdmin) return (
    <AdminLayout><div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600" /></div></AdminLayout>
  );
  if (!user || !isAdmin) return (
    <AdminLayout><div className="text-center py-12"><h1 className="text-xl font-bold text-gray-800">접근 권한이 없습니다</h1><Link href="/" className="text-pink-600 hover:underline">홈페이지로 돌아가기</Link></div></AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-4">

        {/* 헤더 */}
        <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">상품 관리</h1>
            <p className="text-xs text-gray-500 mt-0.5">상품 등록·수정·순서 변경 및 뱃지를 관리하세요</p>
          </div>
          <Button
            onClick={() => navigate("/admin/products/new")}
            className="bg-pink-600 hover:bg-pink-700 h-8 text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> 상품 등록
          </Button>
        </div>

        {/* 통계 카드 - 7개 */}
        <div className="grid grid-cols-7 gap-2">
          {STAT_CARDS.map(card => {
            const active = isActiveFilter(card.key);
            return (
              <button
                key={card.key}
                onClick={() => handleStatCardClick(card.key)}
                className={`bg-white border rounded-lg px-3 py-3 text-center transition-all select-none ${
                  active ? `border-pink-400 ring-1 ring-pink-300` : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`text-xl font-bold ${card.colorNum}`}>{stats[card.key as keyof typeof stats]}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{card.label}</div>
              </button>
            );
          })}
        </div>

        {/* 상품 목록 박스 */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

          {/* 필터 바 */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap bg-gray-50">
            <Input
              placeholder="상품명으로 검색..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="h-7 text-xs w-44"
            />
            <Select value={filterCategory?.toString() || "all"} onValueChange={(v) => { setFilterCategory(v === "all" ? null : parseInt(v) || null); setPage(1); }}>
              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="카테고리" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 카테고리</SelectItem>
                {categories?.map((cat: any) => <SelectItem key={cat.id} value={cat.id.toString()}>{cat.nameJa}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input placeholder="최소가" type="number" value={filterPriceMin} onChange={(e) => { setFilterPriceMin(e.target.value); setPage(1); }} className="h-7 w-20 text-xs" />
              <span className="text-gray-400 text-xs">~</span>
              <Input placeholder="최대가" type="number" value={filterPriceMax} onChange={(e) => { setFilterPriceMax(e.target.value); setPage(1); }} className="h-7 w-20 text-xs" />
            </div>
            <div className="flex items-center gap-2 ml-1">
              {BADGES.map(badge => (
                <label key={badge.key} className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={filterBadge[badge.key]} onChange={(e) => { setFilterBadge(prev => ({ ...prev, [badge.key]: e.target.checked })); setPage(1); }} className="rounded w-3 h-3" />
                  <span className="text-[10px] text-gray-600">{badge.label}</span>
                </label>
              ))}
              <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={filterLowStock} onChange={(e) => { setFilterLowStock(e.target.checked); setPage(1); }} className="rounded w-3 h-3" />
                <span className="text-[10px] text-gray-600">재고부족</span>
              </label>
            </div>
          </div>

          {/* 순서 변경 저장 알림 */}
          {localOrder && (
            <div className="px-4 py-2 border-b border-yellow-200 bg-yellow-50 flex items-center gap-2">
              <span className="text-xs text-yellow-700">순서가 변경되었습니다.</span>
              <Button size="sm" className="h-6 text-[10px] bg-yellow-500 hover:bg-yellow-600 px-2" onClick={saveSortOrder} disabled={sortOrderMutation.isPending}>
                {sortOrderMutation.isPending ? "저장 중..." : "순서 저장"}
              </Button>
              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setLocalOrder(null)}>취소</Button>
            </div>
          )}

          {/* 일괄 액션 */}
          {selectedProducts.size > 0 && (
            <div className="px-4 py-2 border-b border-blue-100 bg-blue-50 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-blue-700">{selectedProducts.size}개 선택</span>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => handleBulkStatus(true, undefined)} disabled={bulkStatusMutation.isPending} className="h-6 text-[10px] px-2 bg-green-50 border-green-300 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-0.5" />판매 활성
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatus(false, undefined)} disabled={bulkStatusMutation.isPending} className="h-6 text-[10px] px-2 bg-gray-50 border-gray-300 text-gray-700">
                  <XCircle className="h-3 w-3 mr-0.5" />판매 비활성
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatus(undefined, false)} disabled={bulkStatusMutation.isPending} className="h-6 text-[10px] px-2 bg-blue-50 border-blue-300 text-blue-700">
                  <ShoppingBag className="h-3 w-3 mr-0.5" />재고있음
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatus(undefined, true)} disabled={bulkStatusMutation.isPending} className="h-6 text-[10px] px-2 bg-orange-50 border-orange-300 text-orange-700">
                  <AlertTriangle className="h-3 w-3 mr-0.5" />품절
                </Button>
                {BADGES.map(badge => (
                  <Button key={badge.key} size="sm" variant="outline" onClick={() => handleBulkBadge(badge.key, true)} disabled={bulkStatusMutation.isPending} className={`h-6 text-[10px] px-2 border ${badge.color}`}>
                    {badge.label} ON
                  </Button>
                ))}
                <Select onValueChange={(v) => handleBulkCategoryChange(parseInt(v) || 0)}>
                  <SelectTrigger className="h-6 w-28 text-[10px]"><SelectValue placeholder="카테고리 변경" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat: any) => <SelectItem key={cat.id} value={cat.id.toString()}>{cat.nameJa}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-6 text-[10px] px-2">일괄 삭제</Button>
                <Button size="sm" variant="outline" onClick={handleBulkSortSave} disabled={sortOrderMutation.isPending} className="h-6 text-[10px] px-2 bg-purple-50 border-purple-300 text-purple-700">
                  <ArrowUpDown className="h-3 w-3 mr-0.5" />{sortOrderMutation.isPending ? "저장 중..." : "선택 상품 순위 저장"}
                </Button>
              </div>
            </div>
          )}

          {/* 테이블 */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-6 px-2 py-2.5"></th>
                <th className="w-8 px-2 py-2.5">
                  <input type="checkbox" checked={selectedProducts.size === displayedProducts.length && displayedProducts.length > 0} onChange={toggleAllSelection} className="rounded w-3.5 h-3.5" />
                </th>
                <th className="w-10 px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">상품명</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">카테고리</th>
                <th className="w-28 px-3 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide">가격</th>
                <th className="w-10 px-2 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">재고</th>
                <th className="w-14 px-2 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">판매</th>
                <th className="w-14 px-2 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">품절</th>
                <th className="w-14 px-2 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">노출</th>
                <th className="w-36 px-2 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">뱃지</th>
                <th className="w-14 px-3 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide">순서</th>
                <th className="w-16 px-3 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={12} className="px-3 py-8 text-center text-xs text-gray-400">로딩 중...</td></tr>
              ) : displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-12 text-center">
                    <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs text-gray-400">상품이 없습니다</p>
                  </td>
                </tr>
              ) : (
                displayedProducts.map((product: any) => {
                  const local = localStatus[product.id] || {};
                  const isActive = local.isActive !== undefined ? local.isActive : (product.isActive !== false);
                  const isSoldOut = local.isSoldOut !== undefined ? local.isSoldOut : (product.stock === 0);
                  const isVisible = local.isVisible !== undefined ? local.isVisible : (product.isVisible !== false);
                  const isLowStock = product.trackInventory && product.minTierStock != null && product.minTierStock <= 5;
                  const isDragging = draggedId === product.id;
                  const isDragOver = dragOverId === product.id;

                  return (
                    <tr
                      key={product.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, product.id)}
                      onDragOver={(e) => handleDragOver(e, product.id)}
                      onDrop={(e) => handleDrop(e, product.id)}
                      onDragEnd={handleDragEnd}
                      className={`hover:bg-gray-50 transition-colors ${isLowStock ? "bg-rose-50/50" : ""} ${isDragging ? "opacity-40" : ""} ${isDragOver ? "border-t-2 border-blue-400" : ""}`}
                    >
                      {/* 드래그 핸들 */}
                      <td className="px-2 py-2.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                        <GripVertical className="h-3.5 w-3.5" />
                      </td>
                      {/* 체크박스 */}
                      <td className="px-2 py-2.5">
                        <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => toggleProductSelection(product.id)} className="rounded w-3.5 h-3.5" />
                      </td>
                      {/* ID */}
                      <td className="px-3 py-2.5 text-[10px] text-gray-400 font-mono">{product.id}</td>
                      {/* 상품명 */}
                      <td className="px-3 py-2.5 max-w-0 w-full">
                        <div className="flex items-center gap-2.5">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.nameJa} className="w-9 h-9 object-cover rounded border border-gray-100 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 bg-gray-100 rounded border border-gray-100 flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-gray-800 truncate">{product.nameJa}</p>
                            <p className="text-[9px] text-gray-400 truncate">{product.name}</p>
                          </div>
                        </div>
                      </td>
                      {/* 카테고리 */}
                      <td className="px-3 py-2.5">
                        {(() => {
                          let allCatIds: number[] = [];
                          try { const extra = product.categoryIds ? JSON.parse(product.categoryIds) : []; allCatIds = Array.from(new Set([product.categoryId, ...extra].filter(Boolean))); }
                          catch { allCatIds = [product.categoryId].filter(Boolean); }
                          const matched = allCatIds.map((id: number) => categories?.find((c: any) => c.id === id)).filter(Boolean);
                          return matched.length > 0 ? (
<div className="flex flex-col gap-0.5 items-start">
                              {matched.map((cat: any, i: number) => (
                                <span key={cat.id} style={{ fontSize: "10px" }} className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium border whitespace-nowrap w-fit ${i === 0 ? "bg-pink-50 text-pink-700 border-pink-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                                  {cat.nameJa || cat.name}
                                </span>
                              ))}
                            </div>
                          ) : <span className="text-[10px] text-gray-300">-</span>;
                        })()}
                      </td>
                      {/* 가격 */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <span className="text-[11px] font-semibold text-gray-800">{formatPrice(isNaN(parseFloat(product.price)) ? 0 : parseFloat(product.price))}</span>
                        {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                          <p className="text-[9px] text-gray-400 line-through">{formatPrice(parseFloat(product.originalPrice))}</p>
                        )}
                      </td>
                      {/* 재고 */}
                      <td className="px-2 py-2.5 text-center">
                        {isLowStock ? (
                          <span style={{ fontSize: "10px" }} className="inline-block px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-medium whitespace-nowrap">부족</span>
                        ) : (
                          <span className="text-[10px] text-gray-300">-</span>
                        )}
                      </td>
                      {/* 판매 토글 */}
                      <td className="px-2 py-2.5 text-center">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleQuickStatusUpdate(product.id, 'isActive', !isActive)}
                            className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${isActive ? "bg-green-500" : "bg-gray-200"}`}
                            title={isActive ? "판매 중" : "판매 중지"}
                          >
                            <span style={{ width: '12px', height: '12px', top: '2px', left: isActive ? '18px' : '2px', position: 'absolute', backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                          </button>
                        </div>
                      </td>
                      {/* 품절 토글 */}
                      <td className="px-2 py-2.5 text-center">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleQuickStatusUpdate(product.id, 'isSoldOut', !isSoldOut)}
                            className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${isSoldOut ? "bg-orange-500" : "bg-gray-200"}`}
                            title={isSoldOut ? "품절" : "재고있음"}
                          >
                            <span style={{ width: '12px', height: '12px', top: '2px', left: isSoldOut ? '18px' : '2px', position: 'absolute', backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                          </button>
                        </div>
                      </td>
                      {/* 노출 토글 */}
                      <td className="px-2 py-2.5 text-center">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleQuickStatusUpdate(product.id, 'isVisible', !isVisible)}
                            className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${isVisible ? "bg-blue-500" : "bg-gray-200"}`}
                            title={isVisible ? "노출 중" : "비노출"}
                          >
                            <span style={{ width: '12px', height: '12px', top: '2px', left: isVisible ? '18px' : '2px', position: 'absolute', backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                          </button>
                        </div>
                      </td>
                      {/* 는지 */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-row gap-0.5 flex-nowrap">
                          {BADGES.map(badge => {
                            const isOn = product[badge.key];
                            return (
                              <button
                                key={badge.key}
                                onClick={() => handleBadgeToggle(product.id, badge.key, isOn)}
                                style={{ fontSize: "10px" }} className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium border transition-all whitespace-nowrap ${isOn ? badge.color : "bg-gray-50 text-gray-300 border-gray-200 hover:bg-gray-100"}`}
                                title={`${badge.label} ${isOn ? "OFF" : "ON"}`}
                              >
                                {badge.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      {/* 순서 */}
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="number"
                          defaultValue={localSortInputs[product.id] !== undefined ? localSortInputs[product.id] : (product.sortOrder ?? 0)}
                          key={`sort-${product.id}-${product.sortOrder}`}
                          onChange={(e) => handleSortOrderInput(product.id, e.target.value)}
                          className={`w-14 text-[10px] text-center border rounded px-1 py-0.5 focus:outline-none transition-colors ${
                            localSortInputs[product.id] !== undefined && selectedProducts.has(product.id)
                              ? 'border-purple-400 bg-purple-50 text-purple-700'
                              : 'border-gray-200 focus:border-pink-400'
                          }`}
                          title="숫자 입력 후 체크박스 선택 → 선택 상품 순위 저장"
                        />
                      </td>
                      {/* 작업 */}
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/admin/products/${product.id}`)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                            title="수정"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* 페이지네이션 */}
          {data && (data.total || 0) > 100 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>이전</Button>
              <span className="text-xs text-gray-500">{page} / {Math.ceil((data?.total || 0) / 100) || 1}</span>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil((data?.total || 0) / 100)}>다음</Button>
            </div>
          )}
        </div>

        {/* 상품 등록/수정 다이얼로그 */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">{editingProduct ? "상품 수정" : "새로운 상품 등록"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">상품명 (영어) *</label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Product Name" className="h-8 text-xs" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">상품명 (일본어) *</label><Input value={formData.nameJa} onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })} placeholder="商品名" className="h-8 text-xs" /></div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">카테고리 *</label>
                <Select value={formData.categoryId ? formData.categoryId.toString() : "1"} onValueChange={(v) => setFormData({ ...formData, categoryId: parseInt(v) || 1 })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories?.map((cat: any) => <SelectItem key={cat.id} value={cat.id.toString()}>{cat.nameJa}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">가격 *</label><Input value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="1000" type="number" className="h-8 text-xs" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">원가격 (할인 전)</label><Input value={formData.originalPrice} onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })} placeholder="1500" type="number" className="h-8 text-xs" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">이미지 URL</label><Input value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://..." className="h-8 text-xs" /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">설명 (영어)</label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Product description..." rows={2} className="text-xs" /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">설명 (일본어)</label><Textarea value={formData.descriptionJa} onChange={(e) => setFormData({ ...formData, descriptionJa: e.target.value })} placeholder="商品の説明..." rows={2} className="text-xs" /></div>
              <div className="col-span-2 flex gap-4 flex-wrap">
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isTimeSale} onChange={(e) => setFormData({ ...formData, isTimeSale: e.target.checked })} className="rounded" /><span className="text-xs">타임세일</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isMonthlySale} onChange={(e) => setFormData({ ...formData, isMonthlySale: e.target.checked })} className="rounded" /><span className="text-xs">월간세일</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.inStock} onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })} className="rounded" /><span className="text-xs">재고 있음</span></label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)} className="h-8 text-xs">취소</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-pink-600 hover:bg-pink-700 h-8 text-xs">
                {createMutation.isPending || updateMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}
