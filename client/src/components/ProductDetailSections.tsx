// Card import removed - using plain div with border style instead
import { getOptimizedSrc } from "@/components/OptimizedImage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, TrendingUp, Package, Image as ImageIcon, Search, Truck, Save, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  parsePriceTiers,
  getLowestPrice,
  getBestDiscount,
  generateProductSeoTitle,
  generateProductSeoDescription,
} from "@/../../shared/utils/seoUtils";
import { toast } from "sonner";

// ============================================================
// 폼 검증 유틸리티
// ============================================================
interface ValidationError {
  field: string;
  message: string;
}

function validateNumber(value: string, field: string, label: string, opts?: { min?: number; max?: number; integer?: boolean }): ValidationError | null {
  if (!value && value !== "0") return null; // optional
  const num = Number(value);
  if (isNaN(num)) return { field, message: `${label}은(는) 숫자여야 합니다` };
  if (opts?.min !== undefined && num < opts.min) return { field, message: `${label}은(는) ${opts.min} 이상이어야 합니다` };
  if (opts?.max !== undefined && num > opts.max) return { field, message: `${label}은(는) ${opts.max} 이하여야 합니다` };
  if (opts?.integer && !Number.isInteger(num)) return { field, message: `${label}은(는) 정수여야 합니다` };
  return null;
}

function ErrorMessage({ errors, field }: { errors: ValidationError[]; field: string }) {
  const err = errors.find((e) => e.field === field);
  if (!err) return null;
  return <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XCircle className="w-3 h-3" />{err.message}</p>;
}

function SaveStatusBadge({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  if (status === "saving") return <span className="inline-flex items-center gap-1 text-xs text-blue-600"><Loader2 className="w-3 h-3 animate-spin" />저장 중...</span>;
  if (status === "saved") return <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" />저장됨</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1 text-xs text-red-600"><XCircle className="w-3 h-3" />저장 실패</span>;
  return null;
}

// ============================================================
// 1. 판매 정보 관리 섹션
// ============================================================
interface SalesInfoSectionProps {
  productId: number;
  productPrice?: number;
  onDataChange?: (data: any) => void;
}

export function SalesInfoSection({ productId, productPrice = 0, onDataChange }: SalesInfoSectionProps) {
  const [salesInfo, setSalesInfo] = useState({
    cost: "",
    marginPercent: "",
    timeSaleStartAt: "",
    timeSaleEndAt: "",
    timeSaleDiscountPercent: 0,
    monthlySaleDiscountPercent: 0,
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // 프로모션 상태
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState("");
  const [promoMaxUses, setPromoMaxUses] = useState("");
  const [promoExpiry, setPromoExpiry] = useState("");
  const [promoSaveStatus, setPromoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [promoErrors, setPromoErrors] = useState<ValidationError[]>([]);

  // tRPC 쿼리 - 판매 정보 조회
  const { data: salesData } = trpc.admin.getProductSalesInfo.useQuery(
    { productId },
    { enabled: productId > 0 }
  );
  const { data: promoCodes, refetch: refetchPromos } = trpc.admin.getProductPromotionCodes.useQuery(
    { productId },
    { enabled: productId > 0 }
  );

  // tRPC 뮤테이션 - 판매 정보 저장
  const updateSalesMutation = trpc.admin.updateSalesInfo.useMutation({
    onSuccess: () => {
      setSaveStatus("saved");
      toast.success("판매 정보가 저장되었습니다");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: (err) => {
      setSaveStatus("error");
      toast.error(`저장 실패: ${err.message}`);
    },
  });

  const addPromoMutation = trpc.admin.addPromotionCode.useMutation({
    onSuccess: () => {
      setPromoSaveStatus("saved");
      toast.success("프로모션 코드가 추가되었습니다");
      setPromoCode("");
      setPromoDiscount("");
      setPromoMaxUses("");
      setPromoExpiry("");
      refetchPromos();
      setTimeout(() => setPromoSaveStatus("idle"), 2000);
    },
    onError: (err) => {
      setPromoSaveStatus("error");
      toast.error(`추가 실패: ${err.message}`);
    },
  });

  // 데이터 로드
  useEffect(() => {
    if (salesData) {
      setSalesInfo({
        cost: salesData.cost !== null && salesData.cost !== undefined ? String(salesData.cost) : "",
        marginPercent: salesData.marginPercent !== null && salesData.marginPercent !== undefined ? String(salesData.marginPercent) : "",
        timeSaleStartAt: salesData.timeSaleStartAt ? new Date(salesData.timeSaleStartAt).toISOString().slice(0, 16) : "",
        timeSaleEndAt: salesData.timeSaleEndAt ? new Date(salesData.timeSaleEndAt).toISOString().slice(0, 16) : "",
        timeSaleDiscountPercent: salesData.timeSaleDiscountPercent || 0,
        monthlySaleDiscountPercent: salesData.monthlySaleDiscountPercent || 0,
      });
    }
  }, [salesData]);

  const handleChange = (field: string, value: any) => {
    const updated = { ...salesInfo, [field]: value };
    setSalesInfo(updated);
    onDataChange?.(updated);
    setErrors((prev) => prev.filter((e) => e.field !== field));
  };

  const calculateMargin = () => {
    const cost = parseFloat(salesInfo.cost);
    if (cost > 0 && productPrice > 0) {
      const margin = (((productPrice - cost) / cost) * 100).toFixed(2);
      handleChange("marginPercent", margin);
    } else {
      toast.error("원가와 상품 가격이 필요합니다");
    }
  };

  const validate = (): boolean => {
    const newErrors: ValidationError[] = [];
    const e1 = validateNumber(salesInfo.cost, "cost", "원가", { min: 0 });
    if (e1) newErrors.push(e1);
    const e2 = validateNumber(String(salesInfo.timeSaleDiscountPercent), "timeSaleDiscountPercent", "타임세일 할인율", { min: 0, max: 100 });
    if (e2) newErrors.push(e2);
    const e3 = validateNumber(String(salesInfo.monthlySaleDiscountPercent), "monthlySaleDiscountPercent", "월간세일 할인율", { min: 0, max: 100 });
    if (e3) newErrors.push(e3);
    if (salesInfo.timeSaleStartAt && salesInfo.timeSaleEndAt && new Date(salesInfo.timeSaleStartAt) >= new Date(salesInfo.timeSaleEndAt)) {
      newErrors.push({ field: "timeSaleEndAt", message: "종료 시간은 시작 시간 이후여야 합니다" });
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaveStatus("saving");
    await updateSalesMutation.mutateAsync({
      productId,
      cost: salesInfo.cost || null,
      marginPercent: salesInfo.marginPercent || null,
      timeSaleStartAt: salesInfo.timeSaleStartAt ? new Date(salesInfo.timeSaleStartAt) : null,
      timeSaleEndAt: salesInfo.timeSaleEndAt ? new Date(salesInfo.timeSaleEndAt) : null,
      timeSaleDiscountPercent: salesInfo.timeSaleDiscountPercent || 0,
      monthlySaleDiscountPercent: salesInfo.monthlySaleDiscountPercent || 0,
    });
  };

  const validatePromo = (): boolean => {
    const newErrors: ValidationError[] = [];
    if (!promoCode.trim()) newErrors.push({ field: "promoCode", message: "프로모션 코드를 입력하세요" });
    const e = validateNumber(promoDiscount, "promoDiscount", "할인율", { min: 0, max: 100 });
    if (e) newErrors.push(e);
    if (!promoDiscount) newErrors.push({ field: "promoDiscount", message: "할인율을 입력하세요" });
    setPromoErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleAddPromotion = async () => {
    if (!validatePromo()) return;
    setPromoSaveStatus("saving");
    await addPromoMutation.mutateAsync({
      productId,
      code: promoCode.trim(),
      discountPercent: parseFloat(promoDiscount),
      maxUses: promoMaxUses ? parseInt(promoMaxUses) : undefined,
      expiresAt: promoExpiry || undefined,
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="py-3 px-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold">판매 정보 관리</h3>
        </div>
      </div>
      <div className="px-6 pb-6 pt-4">
        <div className="grid lg:grid-cols-2 gap-4">
          {/* ── 왼쪽: 판매 정보 ── */}
          <div className="rounded-xl border px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">판매 정보</p>
              <SaveStatusBadge status={saveStatus} />
            </div>

            {/* 원가 및 마진율 */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">원가 및 마진율</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">원가 (원)</label>
                  <div className="flex gap-1.5">
                    <Input type="number" placeholder="원가 입력" value={salesInfo.cost} onChange={(e) => handleChange("cost", e.target.value)} className={`h-8 text-xs ${errors.find((e) => e.field === "cost") ? "border-red-500" : ""}`} />
                    <Button size="sm" variant="outline" onClick={calculateMargin} className="whitespace-nowrap h-8 text-xs px-2">계산</Button>
                  </div>
                  <ErrorMessage errors={errors} field="cost" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">마진율 (%)</label>
                  <Input type="number" placeholder="자동 계산" value={salesInfo.marginPercent} disabled className="h-8 text-xs bg-gray-50" />
                </div>
              </div>
            </div>

            {/* 타임세일 */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">타임세일 설정</p>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">시작 시간</label>
                    <Input type="datetime-local" value={salesInfo.timeSaleStartAt} onChange={(e) => handleChange("timeSaleStartAt", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">종료 시간</label>
                    <Input type="datetime-local" value={salesInfo.timeSaleEndAt} onChange={(e) => handleChange("timeSaleEndAt", e.target.value)} className={`h-8 text-xs ${errors.find((e) => e.field === "timeSaleEndAt") ? "border-red-500" : ""}`} />
                    <ErrorMessage errors={errors} field="timeSaleEndAt" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">타임세일 할인율 (%)</label>
                  <Input type="number" min="0" max="100" placeholder="0" value={salesInfo.timeSaleDiscountPercent} onChange={(e) => handleChange("timeSaleDiscountPercent", parseInt(e.target.value) || 0)} className={`h-8 text-xs ${errors.find((e) => e.field === "timeSaleDiscountPercent") ? "border-red-500" : ""}`} />
                  <ErrorMessage errors={errors} field="timeSaleDiscountPercent" />
                </div>
              </div>
            </div>

            {/* 월간세일 */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">월간세일 설정</p>
              <label className="block text-xs font-medium text-gray-600 mb-1">할인율 (%)</label>
              <Input type="number" min="0" max="100" placeholder="0" value={salesInfo.monthlySaleDiscountPercent} onChange={(e) => handleChange("monthlySaleDiscountPercent", parseInt(e.target.value) || 0)} className={`h-8 text-xs ${errors.find((e) => e.field === "monthlySaleDiscountPercent") ? "border-red-500" : ""}`} />
              <ErrorMessage errors={errors} field="monthlySaleDiscountPercent" />
            </div>

            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={handleSave} disabled={updateSalesMutation.isPending} className="gap-2">
                {updateSalesMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                판매 정보 저장
              </Button>
            </div>
          </div>

          {/* ── 오른쪽: 프로모션 코드 ── */}
          <div className="rounded-xl border px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">프로모션 코드</p>
              <SaveStatusBadge status={promoSaveStatus} />
            </div>

            {/* 기존 코드 목록 */}
            {promoCodes && promoCodes.length > 0 && (
              <div className="space-y-1.5">
                {promoCodes.map((promo: any) => (
                  <div key={promo.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                    <div>
                      <span className="font-mono font-bold text-primary">{promo.code}</span>
                      <span className="ml-2 text-gray-600">{promo.discountPercent}% 할인</span>
                    </div>
                    <div className="text-gray-500">
                      {promo.currentUses || 0}/{promo.maxUses || "∞"} 사용
                      {promo.isActive ? (
                        <span className="ml-2 text-green-600">활성</span>
                      ) : (
                        <span className="ml-2 text-red-600">비활성</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 코드 추가 폼 */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">코드</label>
                  <Input placeholder="PROMO2024" value={promoCode} onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoErrors((prev) => prev.filter((err) => err.field !== "promoCode")); }} className={`h-8 text-xs ${promoErrors.find((e) => e.field === "promoCode") ? "border-red-500" : ""}`} />
                  <ErrorMessage errors={promoErrors} field="promoCode" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">할인율 (%)</label>
                  <Input type="number" min="0" max="100" placeholder="0" value={promoDiscount} onChange={(e) => { setPromoDiscount(e.target.value); setPromoErrors((prev) => prev.filter((err) => err.field !== "promoDiscount")); }} className={`h-8 text-xs ${promoErrors.find((e) => e.field === "promoDiscount") ? "border-red-500" : ""}`} />
                  <ErrorMessage errors={promoErrors} field="promoDiscount" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">최대 사용 횟수 (선택)</label>
                  <Input type="number" min="1" placeholder="무제한" value={promoMaxUses} onChange={(e) => setPromoMaxUses(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">만료일 (선택)</label>
                  <Input type="datetime-local" value={promoExpiry} onChange={(e) => setPromoExpiry(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <Button size="sm" onClick={handleAddPromotion} disabled={addPromoMutation.isPending} className="w-full gap-2">
                {addPromoMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                프로모션 코드 추가
              </Button>
            </div>
          </div>
        </div>{/* end grid */}
      </div>
    </div>
  );
}

// ============================================================
// 2. 재고 관리 섹션
// ============================================================
interface StockManagementSectionProps {
  productId: number;
  currentStock: number;
  onDataChange?: (data: any) => void;
}

export function StockManagementSection({ productId, currentStock, onDataChange }: StockManagementSectionProps) {
  const [newStock, setNewStock] = useState("");
  const [reason, setReason] = useState("입고");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // tRPC 쿼리 - 재고 이력 조회
  const { data: stockHistory, refetch: refetchHistory } = trpc.admin.getStockHistory.useQuery(
    { productId, limit: 20 },
    { enabled: productId > 0 }
  );

  // tRPC 뮤테이션 - 재고 조정
  const adjustStockMutation = trpc.admin.adjustStock.useMutation({
    onSuccess: (data) => {
      setSaveStatus("saved");
      toast.success(`재고가 ${data.previousStock} → ${data.newStock}으로 변경되었습니다`);
      setNewStock("");
      setNotes("");
      refetchHistory();
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: (err) => {
      setSaveStatus("error");
      toast.error(`재고 조정 실패: ${err.message}`);
    },
  });

  const validate = (): boolean => {
    const newErrors: ValidationError[] = [];
    if (!newStock) {
      newErrors.push({ field: "newStock", message: "새 재고 수량을 입력하세요" });
    } else {
      const e = validateNumber(newStock, "newStock", "재고 수량", { min: 0, integer: true });
      if (e) newErrors.push(e);
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleAdjustStock = async () => {
    if (!validate()) return;
    setSaveStatus("saving");
    onDataChange?.({ newStock: parseInt(newStock), reason });
    await adjustStockMutation.mutateAsync({
      productId,
      newStock: parseInt(newStock),
      reason,
      notes: notes || undefined,
    });
  };

  const isLowStock = currentStock <= 10;

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="py-3 px-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold">재고 관리</h3>
          </div>
          <SaveStatusBadge status={saveStatus} />
        </div>
      </div>
      <div className="p-4 space-y-6">
        {/* 재고 부족 경고 */}
        {isLowStock && (
          <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">재고 부족 경고</p>
              <p className="text-xs text-red-700">현재 재고가 10개 이하입니다. 빠른 입고가 필요합니다.</p>
            </div>
          </div>
        )}

        {/* 현재 재고 표시 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">현재 재고</p>
          <p className={`text-3xl font-bold ${isLowStock ? "text-red-600" : "text-gray-900"}`}>{currentStock}</p>
        </div>

        {/* 재고 조정 */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">재고 조정</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">새 재고 수량</label>
              <Input
                type="number"
                min="0"
                placeholder="새 재고 수량 입력"
                value={newStock}
                onChange={(e) => {
                  setNewStock(e.target.value);
                  setErrors((prev) => prev.filter((err) => err.field !== "newStock"));
                }}
                className={errors.find((e) => e.field === "newStock") ? "border-red-500" : ""}
              />
              <ErrorMessage errors={errors} field="newStock" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">사유</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="입고">입고</option>
                <option value="반품">반품</option>
                <option value="교환">교환</option>
                <option value="조정">수량 조정</option>
                <option value="파손">파손/폐기</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">메모 (선택)</label>
              <Input
                placeholder="변경 사유 메모"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button onClick={handleAdjustStock} disabled={adjustStockMutation.isPending} className="w-full gap-2">
              {adjustStockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              재고 조정
            </Button>
          </div>
        </div>

        {/* 재고 이력 */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">재고 이력</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {!stockHistory || stockHistory.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">재고 이력이 없습니다</p>
            ) : (
              stockHistory.map((entry: any, idx: number) => (
                <div key={entry.id || idx} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-gray-900">{entry.changeReason}</p>
                    <p className="text-gray-500">{new Date(entry.createdAt).toLocaleString("ko-KR")}</p>
                    {entry.notes && <p className="text-gray-400 mt-0.5">{entry.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {entry.previousStock} → {entry.newStock}
                    </p>
                    <p className={`${entry.newStock > entry.previousStock ? "text-green-600" : "text-red-600"}`}>
                      {entry.newStock > entry.previousStock ? "+" : ""}{entry.newStock - entry.previousStock}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 3. 이미지 관리 섹션 (개선 - Single Source of Truth + 자동 저장)
// ============================================================
interface ImageItem {
  url: string;
  isThumbnail: boolean;
}

interface ImageManagementSectionProps {
  productId: number;
  imageOrderData?: Array<{ imageUrl: string; isThumbnail: boolean; sortOrder: number }>;
  refetchImageOrder: () => Promise<any>;
  onUploadImage?: (file: File) => Promise<string | null>;
  onSaveImageOrder?: (images: Array<{ imageUrl: string; sortOrder: number; isThumbnail: boolean }>) => Promise<void>;
  onDeleteImage?: (url: string) => Promise<void>;
}

export function ImageManagementSection({
  productId,
  imageOrderData,
  refetchImageOrder,
  onUploadImage,
  onSaveImageOrder,
  onDeleteImage,
}: ImageManagementSectionProps) {
  const [imageList, setImageList] = useState<ImageItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [fileProgresses, setFileProgresses] = useState<{ name: string; percent: number; done: boolean }[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state from server data (Single Source of Truth)
  useEffect(() => {
    if (imageOrderData) {
      const sorted = [...imageOrderData].sort((a, b) => a.sortOrder - b.sortOrder);
      setImageList(sorted.map(img => ({
        url: img.imageUrl,
        isThumbnail: img.isThumbnail,
      })));
    } else {
      setImageList([]);
    }
  }, [imageOrderData]);

  const thumbnailImage = imageList.find((img) => img.isThumbnail);

  // Auto-save helper
  const autoSaveOrder = useCallback(async (newList: ImageItem[], showToast = true) => {
    if (!onSaveImageOrder || newList.length === 0) return;
    setSavingOrder(true);
    try {
      await onSaveImageOrder(
        newList.map((img, idx) => ({
          imageUrl: img.url,
          sortOrder: idx,
          isThumbnail: img.isThumbnail,
        }))
      );
      await refetchImageOrder();
      if (showToast) {
        toast.success("순서가 저장되었습니다", {
          description: `${newList.length}개 이미지 순서 자동 저장 완료`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Auto-save order failed:", error);
      toast.error("자동 저장에 실패했습니다");
    } finally {
      setSavingOrder(false);
    }
  }, [onSaveImageOrder, refetchImageOrder]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFiles = async (files: FileList) => {
    if (!onUploadImage) return;
    setUploading(true);
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("image/")) {
        validFiles.push(files[i]);
      } else {
        toast.error(`${files[i].name}: 이미지 파일만 업로드 가능합니다`);
      }
    }
    if (validFiles.length === 0) { setUploading(false); return; }
    // 개별 파일 진행률 초기화
    setFileProgresses(validFiles.map(f => ({ name: f.name, percent: 0, done: false })));
    setUploadProgress({ current: 0, total: validFiles.length });
    let successCount = 0;
    try {
      for (let i = 0; i < validFiles.length; i++) {
        setUploadProgress({ current: i + 1, total: validFiles.length });
        // 업로드 시작 - 진행 중 표시
        setFileProgresses(prev => prev.map((p, idx) => idx === i ? { ...p, percent: 30 } : p));
        const url = await onUploadImage(validFiles[i]);
        // 업로드 완료 표시
        setFileProgresses(prev => prev.map((p, idx) => idx === i ? { ...p, percent: 100, done: !!url } : p));
        if (url) successCount++;
      }
      await refetchImageOrder();
      if (successCount > 0) {
        toast.success(`${successCount}개의 이미지가 업로드되었습니다`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("이미지 업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setTimeout(() => setFileProgresses([]), 1500);
    }
  };

  const handleCopyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      toast.success("이미지 URL이 복사되었습니다");
      setTimeout(() => setCopiedUrl(null), 2000);
    }).catch(() => {
      toast.error("URL 복사에 실패했습니다");
    });
  }, []);

  const handleImageDragStart = (e: React.DragEvent, idx: number) => {
    setDragSourceIndex(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const handleImageDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };

  const handleImageDragEnd = () => {
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };

  const handleImageDrop = async (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragSourceIndex === null || dragSourceIndex === targetIdx) {
      setDragSourceIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newList = [...imageList];
    const [moved] = newList.splice(dragSourceIndex, 1);
    newList.splice(targetIdx, 0, moved);
    setImageList(newList);
    setDragSourceIndex(null);
    setDragOverIndex(null);
    await autoSaveOrder(newList);
  };

  const handleSetThumbnail = useCallback(async (idx: number) => {
    const newList = imageList.map((img, i) => ({ ...img, isThumbnail: i === idx }));
    setImageList(newList);
    await autoSaveOrder(newList);
  }, [imageList, autoSaveOrder]);

  const handleRemoveImage = useCallback(async (idx: number) => {
    const image = imageList[idx];
    if (!image || !onDeleteImage) return;
    setDeleting(true);
    try {
      await onDeleteImage(image.url);
      await refetchImageOrder();
      toast.success("이미지가 삭제되었습니다");
    } catch (error) {
      console.error("Image delete failed:", error);
      toast.error("이미지 삭제에 실패했습니다");
    } finally {
      setDeleting(false);
      setDeleteConfirmIdx(null);
    }
  }, [imageList, onDeleteImage, refetchImageOrder]);

  return (
    <div>
      {/* 헤더: 제목 + 안내문구 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">상품 이미지 ({imageList.length}개)</span>
          {savingOrder && (
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              저장 중...
            </span>
          )}
        </div>
        {imageList.length > 0 && (
          <span className="text-xs text-muted-foreground">드래그하여 순서 변경 | 첫 번째 이미지가 대표 이미지</span>
        )}
      </div>

      {/* 이미지 그리드 */}
      {imageList.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {imageList.map((image, idx) => (
            <div
              key={image.url}
              className={`relative w-[90px] h-[90px] rounded-lg border-2 overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-150 group ${
                idx === 0
                  ? 'border-[#7a5c3a]'
                  : dragOverIndex === idx
                  ? 'border-primary border-dashed'
                  : dragSourceIndex === idx
                  ? 'opacity-40 border-gray-300'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              draggable
              onDragStart={(e) => handleImageDragStart(e, idx)}
              onDragOver={(e) => handleImageDragOver(e, idx)}
              onDragEnd={handleImageDragEnd}
              onDrop={(e) => handleImageDrop(e, idx)}
            >
              {/* 이미지 */}
              <img
                src={getOptimizedSrc(image.url, 200, 80)}
                alt={`이미지 ${idx + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain bg-white"
                onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90"><rect fill="%23f3f4f6" width="90" height="90"/></svg>'; }}
              />
              {/* 첫 번째 = 대표 배지 */}
              {idx === 0 && (
                <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 bg-[#7a5c3a] text-white rounded">대표</span>
              )}
              {/* 호버 오버레이: 미리보기 + 삭제 */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setPreviewUrl(image.url); }}
                  className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center hover:bg-white"
                  title="미리보기"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                </button>
                {deleteConfirmIdx === idx ? (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                      disabled={deleting}
                      className="px-2 py-1 bg-red-500 text-white rounded text-[10px] font-medium hover:bg-red-600"
                    >
                      {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "삭제"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmIdx(null); }}
                      className="px-2 py-1 bg-white/90 rounded text-[10px] hover:bg-white"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmIdx(idx); }}
                    className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center hover:bg-white"
                    title="삭제"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 대표 이미지 URL 복사 */}
      {imageList.length > 0 && imageList[0]?.url && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-muted/40 rounded-lg border">
          <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">대표 URL</span>
          <span className="flex-1 text-[10px] text-muted-foreground truncate font-mono">{imageList[0].url}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(imageList[0].url).then(() => {
                setCopiedUrl(imageList[0].url);
                setTimeout(() => setCopiedUrl(null), 2000);
              });
            }}
            className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              copiedUrl === imageList[0].url
                ? 'bg-green-100 text-green-700'
                : 'bg-background border hover:bg-muted text-muted-foreground'
            }`}
          >
            {copiedUrl === imageList[0].url ? (
              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>복사됨</>
            ) : (
              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>복사</>
            )}
          </button>
        </div>
      )}

      {/* 업로드 영역 */}
      <div
        className={`border-2 border-dashed rounded-xl py-8 px-6 text-center transition-all duration-200 cursor-pointer ${
          dragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleFileDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
        {uploading ? (
          <div className="space-y-2">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto" />
            <p className="text-sm text-gray-500">업로드 중 {uploadProgress && `(${uploadProgress.current}/${uploadProgress.total})`}</p>
            {fileProgresses.length > 0 && (
              <div className="space-y-1 max-w-xs mx-auto">
                {fileProgresses.map((fp, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 truncate w-28 text-left">{fp.name.slice(-16)}</span>
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${fp.done ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${fp.percent}%` }} />
                    </div>
                    <span className="text-[10px] w-7 text-right text-gray-400">{fp.percent}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
              <line x1="12" y1="8" x2="12" y2="14" />
              <line x1="9" y1="11" x2="15" y2="11" />
            </svg>
            <p className="text-sm text-gray-600">클릭 또는 드래그하여 이미지 추가 (여러 장 선택 가능)</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP (5MB 이하)</p>
          </div>
        )}
      </div>

      {/* 이미지 큰 미리보기 모달 */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewUrl(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 z-10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <img src={previewUrl} alt="이미지 미리보기" className="w-full h-full object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 4. SEO 메타데이터 섹션
// ============================================================
interface SeoMetadataSectionProps {
  productId: number;
  productName?: string;
  product?: any;
  onDataChange?: (data: any) => void;
}
export function SeoMetadataSection({ productId, productName, product, onDataChange }: SeoMetadataSectionProps) {
  const [seoData, setSeoData] = useState({
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    urlSlug: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: "",
  });
  // Direct SEO fields on products table
  const [seoFields, setSeoFields] = useState({ seoTitle: "", seoDescription: "", seoImage: "" });
  const [seoFieldsSaveStatus, setSeoFieldsSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // tRPC queries
  const { data: seoResult } = trpc.admin.getProductSeoMetadata.useQuery({ productId }, { enabled: productId > 0 });
  const { data: seoFieldsResult } = trpc.admin.getProductSeoFields.useQuery({ productId }, { enabled: productId > 0 });

  // tRPC mutations
  const updateSeoMutation = trpc.admin.updateSeoMetadata.useMutation({
    onSuccess: () => { setSaveStatus("saved"); toast.success("SEO 메타데이터가 저장되었습니다"); setTimeout(() => setSaveStatus("idle"), 2000); },
    onError: (err) => { setSaveStatus("error"); toast.error(`저장 실패: ${err.message}`); },
  });
  const updateSeoFieldsMutation = trpc.admin.updateProductSeoFields.useMutation({
    onSuccess: () => { setSeoFieldsSaveStatus("saved"); toast.success("SEO 설정이 저장되었습니다"); setTimeout(() => setSeoFieldsSaveStatus("idle"), 2000); },
    onError: (err) => { setSeoFieldsSaveStatus("error"); toast.error(`저장 실패: ${err.message}`); },
  });

  // Helper: compute auto values from product
  const _computeAutoValues = (prod: any) => {
    if (!prod) return { autoDesc: "", autoKeywords: "", autoOgTitle: "", autoOgImage: "" };
    const tiers = parsePriceTiers(prod.setPricing);
    const lowestPrice = getLowestPrice(tiers, prod.price);
    const hasTiers = tiers.length > 1;
    const bestDiscount = getBestDiscount(tiers, prod.price, prod.originalPrice);
    const autoDesc = generateProductSeoDescription({ nameJa: prod.nameJa, lowestPrice, hasTiers, bestDiscount, descriptionJa: prod.descriptionJa, brandJa: prod.brandJa });
    const rawTags: string = prod.searchTags || "";
    const autoKeywords = rawTags.split(/[\s,]+|(?=#)/).map((t: string) => t.replace(/^#/, "").trim()).filter(Boolean).slice(0, 10).join(", ");
    const autoOgTitle = generateProductSeoTitle({ nameJa: prod.nameJa, lowestPrice, hasTiers, bestDiscount });
    const rawImageUrl = prod.seoImage || prod.imageUrl || "";
    const autoOgImage = rawImageUrl
      ? rawImageUrl.startsWith("http")
        ? rawImageUrl
        : `${window.location.origin}${rawImageUrl.startsWith("/") ? "" : "/"}${rawImageUrl}`
      : "";
    return { autoDesc, autoKeywords, autoOgTitle, autoOgImage };
  };

  // Load data - auto-fill empty fields from product
  useEffect(() => {
    if (seoResult) {
      const { autoDesc, autoKeywords, autoOgTitle, autoOgImage } = _computeAutoValues(product);
      setSeoData({
        metaTitle: "",
        metaDescription: seoResult.metaDescription || autoDesc,
        keywords: seoResult.keywords || autoKeywords,
        urlSlug: seoResult.urlSlug || "",
        ogTitle: seoResult.ogTitle || autoOgTitle,
        ogDescription: seoResult.ogDescription || autoDesc,
        ogImageUrl: (seoResult.ogImage && seoResult.ogImage.trim()) || autoOgImage,
      });
    }
  }, [seoResult, product]);  // eslint-disable-line react-hooks/exhaustive-deps
  // When product loads, auto-fill ogImageUrl if empty
  useEffect(() => {
    if (product) {
      const { autoOgImage } = _computeAutoValues(product);
      if (autoOgImage) {
        setSeoData(prev => ({
          ...prev,
          ogImageUrl: prev.ogImageUrl || autoOgImage,
        }));
      }
    }
  }, [product]);  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (seoFieldsResult) {
      // seoImage 기본값: DB 저장값 → 상품 대표 이미지 순서로 fallback
      const autoSeoImage = seoFieldsResult.seoImage || product?.imageUrl || product?.imageUrlMedium || "";
      setSeoFields({ seoTitle: seoFieldsResult.seoTitle || "", seoDescription: seoFieldsResult.seoDescription || "", seoImage: autoSeoImage });
    }
  }, [seoFieldsResult, product?.imageUrl]);  // eslint-disable-line react-hooks/exhaustive-deps

  const autoGenerateSeoFields = () => {
    if (!product) return;
    const tiers = parsePriceTiers(product.setPricing);
    const lowestPrice = getLowestPrice(tiers, product.price);
    const hasTiers = tiers.length > 1;
    const bestDiscount = getBestDiscount(tiers, product.price, product.originalPrice);
    setSeoFields(prev => ({
      ...prev,
      seoTitle: generateProductSeoTitle({ nameJa: product.nameJa, lowestPrice, hasTiers, bestDiscount }),
      seoDescription: generateProductSeoDescription({ nameJa: product.nameJa, lowestPrice, hasTiers, bestDiscount, descriptionJa: product.descriptionJa, brandJa: product.brandJa }),
    }));
    toast.success("자동 생성 완료 (저장 버튼을 눌러 적용하세요)");
  };

  const handleChange = (field: string, value: string) => {
    const updated = { ...seoData, [field]: value };
    setSeoData(updated);
    onDataChange?.(updated);
    setErrors((prev) => prev.filter((e) => e.field !== field));
  };
  const generateSlug = () => {
    if (productName) {
      const slug = productName.toLowerCase().replace(/[^a-z0-9가-힣]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      handleChange("urlSlug", slug);
    }
  };
  // AI auto-generate: meta description, keywords, OG fields
  const autoGenerateMetaFields = () => {
    if (!product) return;
    const { autoDesc, autoKeywords, autoOgTitle, autoOgImage } = _computeAutoValues(product);
    setSeoData((prev) => ({
      ...prev,
      metaDescription: autoDesc,
      keywords: autoKeywords,
      ogTitle: autoOgTitle,
      ogDescription: autoDesc,
      ogImageUrl: prev.ogImageUrl || autoOgImage,
    }));
    toast.success("자동 생성 완료 (저장 버튼을 눌러 적용하세요)");
  };
  const autoFillOG = () => {
    const { autoDesc, autoOgTitle, autoOgImage } = _computeAutoValues(product);
    setSeoData((prev) => ({
      ...prev,
      ogTitle: prev.ogTitle || autoOgTitle,
      ogDescription: prev.ogDescription || autoDesc,
      ogImageUrl: prev.ogImageUrl || autoOgImage,
    }));
    onDataChange?.({ action: "autoFillOG" });
  };
  const handleSave = async () => {
    setSaveStatus("saving");
    await updateSeoMutation.mutateAsync({
      productId,
      metaTitle: seoData.metaTitle || null,
      metaDescription: seoData.metaDescription || null,
      keywords: seoData.keywords || null,
      urlSlug: seoData.urlSlug || null,
      ogTitle: seoData.ogTitle || null,
      ogDescription: seoData.ogDescription || null,
      ogImageUrl: seoData.ogImageUrl || null,
    });
  };
  const handleSeoFieldsSave = async () => {
    setSeoFieldsSaveStatus("saving");
    await updateSeoFieldsMutation.mutateAsync({ productId, seoTitle: seoFields.seoTitle || null, seoDescription: seoFields.seoDescription || null, seoImage: seoFields.seoImage || null });
  };

  // Google preview computed values
  const _getAutoTitle = () => {
    if (!product) return productName || "商品タイトル";
    const tiers = parsePriceTiers(product.setPricing);
    const lowestPrice = getLowestPrice(tiers, product.price);
    const hasTiers = tiers.length > 1;
    const bestDiscount = getBestDiscount(tiers, product.price, product.originalPrice);
    return generateProductSeoTitle({ nameJa: product.nameJa, lowestPrice, hasTiers, bestDiscount });
  };
  const _getAutoDesc = () => {
    if (!product) return "商品説明がここに表示されます。";
    const tiers = parsePriceTiers(product.setPricing);
    const lowestPrice = getLowestPrice(tiers, product.price);
    const hasTiers = tiers.length > 1;
    const bestDiscount = getBestDiscount(tiers, product.price, product.originalPrice);
    return generateProductSeoDescription({ nameJa: product.nameJa, lowestPrice, hasTiers, bestDiscount, descriptionJa: product.descriptionJa, brandJa: product.brandJa });
  };
  const previewTitle = seoFields.seoTitle || _getAutoTitle();
  const previewDesc = seoFields.seoDescription || _getAutoDesc();
  const previewUrl = typeof window !== "undefined" ? `${window.location.origin}/product/${productId}` : `/product/${productId}`;
  const titleLen = previewTitle.length;
  const descLen = previewDesc.length;
  // 미리보기 이미지: seoImage 입력값 → 상품 대표 이미지 순서로 fallback
  const previewImage = seoFields.seoImage || (product?.imageUrl) || (product?.imageUrlMedium) || null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="py-3 px-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold">SEO / Open Graph</h3>
        </div>
      </div>
      <div className="px-6 pb-6 pt-4">
        <div className="grid lg:grid-cols-2 gap-4">
          {/* ── 왼쪽: SEO 설정 + 메타데이터/OG ── */}
          <div className="space-y-4">
            {/* 소섹션: SEO 설정 */}
            <div className="rounded-xl border px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">SEO 설정</p>
                  <p className="text-xs text-gray-400 mt-0.5">비워두면 상품명·최저가·할인율로 자동 생성됩니다.</p>
                </div>
                <div className="flex items-center gap-2">
                  <SaveStatusBadge status={seoFieldsSaveStatus} />
                  {product && (
                    <Button size="sm" variant="outline" onClick={autoGenerateSeoFields} className="text-xs gap-1">
                      자동 생성
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">SEO Title <span className="text-gray-400 font-normal">(30~60자 권장)</span></label>
                  <Input
                    placeholder="예: リベルサス 3mg 10錠 最安値 7,760円〜｜14%OFF"
                    value={seoFields.seoTitle}
                    onChange={(e) => setSeoFields(prev => ({ ...prev, seoTitle: e.target.value }))}
                    className="h-8 text-xs"
                  />
                  <p className={`text-xs mt-1 ${seoFields.seoTitle.length > 60 ? "text-red-500" : "text-gray-400"}`}>
                    {seoFields.seoTitle.length}자 {seoFields.seoTitle.length === 0 ? "(비어있으면 자동 생성)" : seoFields.seoTitle.length > 60 ? "⚠ 너무 김" : "✓"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">SEO Description <span className="text-gray-400 font-normal">(70~160자 권장)</span></label>
                  <Textarea
                    placeholder="예: リベルサス3mg 10錠を7,760円〜で販売中。14%OFF、まとめ買い対応。"
                    value={seoFields.seoDescription}
                    onChange={(e) => setSeoFields(prev => ({ ...prev, seoDescription: e.target.value }))}
                    className="min-h-16 text-xs"
                  />
                  <p className={`text-xs mt-1 ${seoFields.seoDescription.length > 160 ? "text-red-500" : "text-gray-400"}`}>
                    {seoFields.seoDescription.length}자 {seoFields.seoDescription.length === 0 ? "(비어있으면 자동 생성)" : seoFields.seoDescription.length > 160 ? "⚠ 너무 김" : "✓"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">SEO Image URL <span className="text-gray-400 font-normal">(OG/SNS 공유 이미지)</span></label>
                  <Input
                    placeholder="https://example.com/product-image.jpg"
                    value={seoFields.seoImage}
                    onChange={(e) => setSeoFields(prev => ({ ...prev, seoImage: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSeoFieldsSave} disabled={updateSeoFieldsMutation.isPending} className="gap-2">
                    {updateSeoFieldsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    SEO 저장
                  </Button>
                </div>
              </div>
            </div>

            {/* 소섹션: 추가 메타데이터 / OG */}
            <div className="rounded-xl border px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">추가 메타데이터 / Open Graph</p>
                <div className="flex items-center gap-2">
                  <SaveStatusBadge status={saveStatus} />
                  <Button size="sm" variant="outline" onClick={autoGenerateMetaFields} className="text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5">
                    <span>✨</span> AI 자동 생성
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">메타 설명 (보조)</label>
                  <Textarea placeholder="검색 엔진에 표시될 설명 (50-160자 권장)" value={seoData.metaDescription} onChange={(e) => handleChange("metaDescription", e.target.value)} className="min-h-16 text-xs" />
                  <p className={`text-xs mt-1 ${seoData.metaDescription.length > 160 ? "text-red-500" : "text-gray-400"}`}>{seoData.metaDescription.length}/160자</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">키워드</label>
                  <Input placeholder="키워드를 쉼표로 구분 (예: 비타민, 건강, 영양)" value={seoData.keywords} onChange={(e) => handleChange("keywords", e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="border-t pt-3">
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-foreground">Open Graph 태그 (SNS 공유)</p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">OG 제목</label>
                      <Input placeholder="소셜 미디어에 표시될 제목" value={seoData.ogTitle} onChange={(e) => handleChange("ogTitle", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">OG 설명</label>
                      <Textarea placeholder="소셜 미디어에 표시될 설명" value={seoData.ogDescription} onChange={(e) => handleChange("ogDescription", e.target.value)} className="min-h-14 text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">OG 이미지 URL</label>
                      <Input placeholder="https://example.com/image.jpg" value={seoData.ogImageUrl} onChange={(e) => handleChange("ogImageUrl", e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button size="sm" onClick={handleSave} disabled={updateSeoMutation.isPending} className="gap-2">
                    {updateSeoMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    메타데이터 저장
                  </Button>
                </div>
              </div>
            </div>
          </div>{/* end 왼쪽 */}

          {/* ── 오른쪽: 미리보기 ── */}
          <div className="space-y-4">
            {/* 소섹션: Google 검색결과 미리보기 */}
            <div className="rounded-xl border border-rose-200 px-5 py-4 bg-rose-50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-widest">Google 검색결과 미리보기</p>
                <span className="text-[10px] text-rose-400">실시간 반영</span>
              </div>
              {/* Google 검색결과 실제 스타일 모방 */}
              <div className="bg-white rounded-lg border border-rose-100 p-4 font-sans">
                <div className="flex gap-3 items-start">
                  <div className="flex-1 min-w-0">
                    {/* 사이트 정보 행 */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center text-[8px] font-bold text-rose-500">G</div>
                      <div>
                        <div className="text-[10px] text-gray-700 font-medium leading-none">koreamall24.com</div>
                        <div className="text-[9px] text-gray-400 leading-none mt-0.5 truncate max-w-[220px]">{previewUrl}</div>
                      </div>
                    </div>
                    {/* 제목 */}
                    <div className={`text-base font-normal leading-snug mb-1 cursor-pointer hover:underline ${titleLen > 60 ? "text-red-600" : "text-[#1a0dab]"}`}>
                      {previewTitle.length > 70 ? previewTitle.slice(0, 70) + "…" : previewTitle}
                    </div>
                    {/* 설명 */}
                    <div className={`text-xs leading-relaxed ${descLen > 160 ? "text-red-500" : "text-[#4d5156]"}`}>
                      {previewDesc.length > 160 ? previewDesc.slice(0, 160) + "…" : previewDesc}
                    </div>
                  </div>
                  {/* 썸네일 이미지 */}
                  {previewImage ? (
                    <div className="flex-shrink-0">
                      <img
                        src={getOptimizedSrc(previewImage, 80, 80)}
                        alt="상품 썸네일"
                        loading="lazy"
                        decoding="async"
                        className="w-20 h-20 object-cover rounded-lg border border-rose-100"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-20 h-20 rounded-lg border border-dashed border-rose-200 flex flex-col items-center justify-center gap-1 bg-rose-50">
                      <span className="text-lg">🖼️</span>
                      <span className="text-[9px] text-rose-300 text-center leading-tight">이미지<br/>없음</span>
                    </div>
                  )}
                </div>
              </div>
              {/* 글자수 가이드 */}
              <div className="flex gap-4 mt-2 text-xs">
                <span className={titleLen > 60 ? "text-red-500 font-semibold" : titleLen < 30 ? "text-amber-500" : "text-green-600"}>
                  제목: {titleLen}자 {titleLen < 30 ? "⚠ 너무 짧음 (30자 이상)" : titleLen > 60 ? "⚠ 너무 김 (60자 이하)" : "✓ 적정 (30~60자)"}
                </span>
              </div>
              <div className="flex gap-4 mt-1 text-xs">
                <span className={descLen > 160 ? "text-red-500 font-semibold" : descLen < 70 ? "text-amber-500" : "text-green-600"}>
                  설명: {descLen}자 {descLen < 70 ? "⚠ 너무 짧음 (70자 이상)" : descLen > 160 ? "⚠ 너무 김 (160자 이하)" : "✓ 적정 (70~160자)"}
                </span>
              </div>
              {/* 가격 일치 안내 */}
              <div className="mt-2 text-[10px] text-rose-400 border-t border-rose-100 pt-2">
                ※ SEO 가격 = 화면 가격 = JSON-LD 가격이 일치해야 Google 리치결과에 노출됩니다.
              </div>
            </div>

            {/* 소섹션: SNS 공유 미리보기 */}
            <div className="rounded-xl border px-5 py-4 bg-sky-50/60">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">SNS 공유 미리보기 (OG)</p>
              {/* Facebook/LinkedIn 스타일 */}
              <p className="text-xs text-gray-400 mb-1">Facebook / LinkedIn</p>
              <div className="rounded-lg overflow-hidden border border-gray-200 mb-3">
                {(seoData.ogImageUrl || previewImage) ? (
                  <img src={seoData.ogImageUrl || previewImage || ''} alt="OG 이미지" className="w-full h-32 object-cover bg-gray-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">이미지 없음</span>
                  </div>
                )}
                <div className="px-3 py-2 bg-gray-50 border-t">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{typeof window !== "undefined" ? window.location.hostname : "koreamall24.com"}</p>
                  <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{seoData.ogTitle || previewTitle}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{seoData.ogDescription || previewDesc}</p>
                </div>
              </div>
              {/* Twitter/X 스타일 */}
              <p className="text-xs text-gray-400 mb-1">Twitter / X</p>
              <div className="rounded-2xl overflow-hidden border border-gray-200">
                {(seoData.ogImageUrl || previewImage) ? (
                  <img src={seoData.ogImageUrl || previewImage || ''} alt="Twitter 카드 이미지" className="w-full h-28 object-cover bg-gray-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-28 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">이미지 없음</span>
                  </div>
                )}
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">{seoData.ogTitle || previewTitle}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{seoData.ogDescription || previewDesc}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{typeof window !== "undefined" ? window.location.hostname : "koreamall24.com"}</p>
                </div>
              </div>
            </div>
          </div>{/* end 오른쪽 */}
        </div>{/* end grid */}
      </div>
    </div>
  );
}
// ============================================================
// 5. 배송 정보 및 프로모션 섹션
// ============================================================
interface ShippingPromotionSectionProps {
  productId: number;
  onDataChange?: (data: any) => void;
}

export function ShippingPromotionSection({ productId, onDataChange }: ShippingPromotionSectionProps) {
  const [shippingData, setShippingData] = useState({
    weight: "",
    width: "",
    height: "",
    depth: "",
    shippingFee: "",
    freeShippingThreshold: "",
    supplierName: "",
    supplierContact: "",
  });
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState("");
  const [promoMaxUses, setPromoMaxUses] = useState("");
  const [promoExpiry, setPromoExpiry] = useState("");
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [shippingSaveStatus, setShippingSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [promoSaveStatus, setPromoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // tRPC 쿼리
  const { data: shippingResult } = trpc.admin.getProductShippingInfo.useQuery(
    { productId },
    { enabled: productId > 0 }
  );
  const { data: promoCodes, refetch: refetchPromos } = trpc.admin.getProductPromotionCodes.useQuery(
    { productId },
    { enabled: productId > 0 }
  );

  // tRPC 뮤테이션
  const updateShippingMutation = trpc.admin.updateShippingInfo.useMutation({
    onSuccess: () => {
      setShippingSaveStatus("saved");
      toast.success("배송 정보가 저장되었습니다");
      setTimeout(() => setShippingSaveStatus("idle"), 2000);
    },
    onError: (err) => {
      setShippingSaveStatus("error");
      toast.error(`저장 실패: ${err.message}`);
    },
  });

  const addPromoMutation = trpc.admin.addPromotionCode.useMutation({
    onSuccess: () => {
      setPromoSaveStatus("saved");
      toast.success("프로모션 코드가 추가되었습니다");
      setPromoCode("");
      setPromoDiscount("");
      setPromoMaxUses("");
      setPromoExpiry("");
      refetchPromos();
      setTimeout(() => setPromoSaveStatus("idle"), 2000);
    },
    onError: (err) => {
      setPromoSaveStatus("error");
      toast.error(`추가 실패: ${err.message}`);
    },
  });

  // 데이터 로드
  useEffect(() => {
    if (shippingResult) {
      setShippingData({
        weight: shippingResult.weight || "",
        width: shippingResult.width || "",
        height: shippingResult.height || "",
        depth: shippingResult.depth || "",
        shippingFee: shippingResult.shippingCost || "",
        freeShippingThreshold: "",
        supplierName: "",
        supplierContact: "",
      });
    }
  }, [shippingResult]);

  const handleShippingChange = (field: string, value: string) => {
    const updated = { ...shippingData, [field]: value };
    setShippingData(updated);
    onDataChange?.({ shipping: updated });
    setErrors((prev) => prev.filter((e) => e.field !== field));
  };

  const validateShipping = (): boolean => {
    const newErrors: ValidationError[] = [];
    const fields = [
      { key: "weight", label: "무게" },
      { key: "width", label: "가로" },
      { key: "height", label: "세로" },
      { key: "depth", label: "높이" },
      { key: "shippingFee", label: "배송료" },
      { key: "freeShippingThreshold", label: "무료배송 기준" },
    ];
    for (const f of fields) {
      const e = validateNumber(shippingData[f.key as keyof typeof shippingData], f.key, f.label, { min: 0 });
      if (e) newErrors.push(e);
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSaveShipping = async () => {
    if (!validateShipping()) return;
    setShippingSaveStatus("saving");
    await updateShippingMutation.mutateAsync({
      productId,
      weight: shippingData.weight || null,
      width: shippingData.width || null,
      height: shippingData.height || null,
      depth: shippingData.depth || null,
      shippingFee: shippingData.shippingFee || null,
      freeShippingThreshold: shippingData.freeShippingThreshold || null,
      supplierName: shippingData.supplierName || null,
      supplierContact: shippingData.supplierContact || null,
    });
  };

  const validatePromo = (): boolean => {
    const newErrors: ValidationError[] = [];
    if (!promoCode.trim()) newErrors.push({ field: "promoCode", message: "프로모션 코드를 입력하세요" });
    const e = validateNumber(promoDiscount, "promoDiscount", "할인율", { min: 0, max: 100 });
    if (e) newErrors.push(e);
    if (!promoDiscount) newErrors.push({ field: "promoDiscount", message: "할인율을 입력하세요" });
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleAddPromotion = async () => {
    if (!validatePromo()) return;
    setPromoSaveStatus("saving");
    await addPromoMutation.mutateAsync({
      productId,
      code: promoCode.trim(),
      discountPercent: parseFloat(promoDiscount),
      maxUses: promoMaxUses ? parseInt(promoMaxUses) : undefined,
      expiresAt: promoExpiry || undefined,
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="py-3 px-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold">프로모션</h3>
        </div>
      </div>
      <div className="p-4 space-y-6">
        {/* 프로모션 코드 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">프로모션 코드</h3>
            <SaveStatusBadge status={promoSaveStatus} />
          </div>

          {/* 기존 프로모션 코드 목록 */}
          {promoCodes && promoCodes.length > 0 && (
            <div className="mb-4 space-y-2">
              {promoCodes.map((promo: any) => (
                <div key={promo.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                  <div>
                    <span className="font-mono font-bold text-primary">{promo.code}</span>
                    <span className="ml-2 text-gray-600">{promo.discountPercent}% 할인</span>
                  </div>
                  <div className="text-gray-500">
                    {promo.currentUses || 0}/{promo.maxUses || "∞"} 사용
                    {promo.isActive ? (
                      <span className="ml-2 text-green-600">활성</span>
                    ) : (
                      <span className="ml-2 text-red-600">비활성</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">코드</label>
                <Input placeholder="PROMO2024" value={promoCode} onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setErrors((prev) => prev.filter((err) => err.field !== "promoCode")); }} className={errors.find((e) => e.field === "promoCode") ? "border-red-500" : ""} />
                <ErrorMessage errors={errors} field="promoCode" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">할인율 (%)</label>
                <Input type="number" min="0" max="100" placeholder="0" value={promoDiscount} onChange={(e) => { setPromoDiscount(e.target.value); setErrors((prev) => prev.filter((err) => err.field !== "promoDiscount")); }} className={errors.find((e) => e.field === "promoDiscount") ? "border-red-500" : ""} />
                <ErrorMessage errors={errors} field="promoDiscount" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">최대 사용 횟수 (선택)</label>
                <Input type="number" min="1" placeholder="무제한" value={promoMaxUses} onChange={(e) => setPromoMaxUses(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">만료일 (선택)</label>
                <Input type="datetime-local" value={promoExpiry} onChange={(e) => setPromoExpiry(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAddPromotion} disabled={addPromoMutation.isPending} className="w-full gap-2">
              {addPromoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              프로모션 코드 추가
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
