import { useState, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  Sparkles,
  Star,
  ArrowUp,
  ArrowDown,
  Calculator,
  Loader2,
  AlertTriangle,
  Package,
  Percent,
} from "lucide-react";

interface PriceTier {
  id?: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  discountPercent: number;
  stock: number;
  noStockTracking: boolean;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface PriceTierSectionProps {
  productId: number;
  basePrice: number; // 기본 단가 (1개 가격)
  onDataChange?: () => void;
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

// 기본 수량 프리셋 (일본 의약품 쇼핑몰 기준)
const DEFAULT_QUANTITIES = [1, 2, 3, 5, 7, 10];

// 수량별 추천 할인율 (수량이 많을수록 할인율 증가)
function getRecommendedDiscount(quantity: number): number {
  if (quantity <= 1) return 0;
  if (quantity === 2) return 15;
  if (quantity === 3) return 25;
  if (quantity === 5) return 35;
  if (quantity === 7) return 45;
  if (quantity >= 10) return 55;
  // 기타 수량에 대한 보간
  return Math.min(Math.round(quantity * 5.5), 70);
}

function calculateTierPrices(
  basePrice: number,
  quantity: number,
  discountPercent: number
): { unitPrice: string; totalPrice: string } {
  const discountedUnit = Math.round(basePrice * (1 - discountPercent / 100));
  const total = discountedUnit * quantity;
  return {
    unitPrice: discountedUnit.toFixed(2),
    totalPrice: total.toFixed(2),
  };
}

export function PriceTierSection({
  productId,
  basePrice,
  onDataChange,
  onSaveRef,
}: PriceTierSectionProps) {
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newQuantity, setNewQuantity] = useState("");

  // Fetch existing tiers
  const { data: existingTiers, isLoading, refetch } = trpc.admin.getPriceTiers.useQuery(
    { productId },
    { enabled: productId > 0 }
  );

  const upsertMutation = trpc.admin.upsertPriceTiers.useMutation();

  // Initialize tiers from server data
  useEffect(() => {
    if (existingTiers && existingTiers.length > 0) {
      setTiers(
        existingTiers.map((t: any) => ({
          id: t.id,
          quantity: t.quantity,
          unitPrice: t.unitPrice,
          totalPrice: t.totalPrice,
          discountPercent: t.discountPercent,
          stock: t.stock || 0,
          noStockTracking: t.noStockTracking ?? false,
          isPopular: t.isPopular,
          isActive: t.isActive,
          sortOrder: t.sortOrder,
        }))
      );
    }
  }, [existingTiers]);

  // Auto-generate default tiers
  const handleAutoGenerate = useCallback(() => {
    if (basePrice <= 0) {
      toast.error("기본 가격이 설정되어 있지 않습니다.");
      return;
    }

    const newTiers: PriceTier[] = DEFAULT_QUANTITIES.map((qty, index) => {
      const discount = getRecommendedDiscount(qty);
      const { unitPrice, totalPrice } = calculateTierPrices(basePrice, qty, discount);
      return {
        quantity: qty,
        unitPrice,
        totalPrice,
        discountPercent: discount,
        stock: 100, // 기본 재고
        noStockTracking: false,
        isPopular: qty === 10, // 10개가 人気
        isActive: true,
        sortOrder: index,
      };
    });

    setTiers(newTiers);
    setHasChanges(true);
    onDataChange?.();
    toast.success("추천 가격 티어가 자동 생성되었습니다.");
  }, [basePrice, onDataChange]);

  // Add a new tier
  const handleAddTier = useCallback(() => {
    const qty = parseInt(newQuantity);
    if (isNaN(qty) || qty < 1) {
      toast.error("유효한 수량을 입력해주세요.");
      return;
    }

    if (tiers.some((t) => t.quantity === qty)) {
      toast.error(`수량 ${qty}의 티어가 이미 존재합니다.`);
      return;
    }

    const discount = getRecommendedDiscount(qty);
    const { unitPrice, totalPrice } = calculateTierPrices(basePrice, qty, discount);

    const newTier: PriceTier = {
      quantity: qty,
      unitPrice,
      totalPrice,
      discountPercent: discount,
      stock: 100, // 기본 재고
      noStockTracking: false,
      isPopular: false,
      isActive: true,
      sortOrder: tiers.length,
    };

    const updated = [...tiers, newTier].sort((a, b) => a.quantity - b.quantity);
    updated.forEach((t, i) => (t.sortOrder = i));
    setTiers(updated);
    setNewQuantity("");
    setHasChanges(true);
    onDataChange?.();
  }, [newQuantity, tiers, basePrice, onDataChange]);

  // Remove a tier
  const handleRemoveTier = useCallback(
    (index: number) => {
      const updated = tiers.filter((_, i) => i !== index);
      updated.forEach((t, i) => (t.sortOrder = i));
      setTiers(updated);
      setHasChanges(true);
      onDataChange?.();
    },
    [tiers, onDataChange]
  );

  // Update a tier field
  const updateTier = useCallback(
    (index: number, field: keyof PriceTier, value: any) => {
      setTiers((prev) => {
        const updated = [...prev];
        const tier = { ...updated[index] };

        if (field === "discountPercent") {
          const discount = Math.max(0, Math.min(100, Number(value) || 0));
          tier.discountPercent = discount;
          const { unitPrice, totalPrice } = calculateTierPrices(
            basePrice,
            tier.quantity,
            discount
          );
          tier.unitPrice = unitPrice;
          tier.totalPrice = totalPrice;
        } else if (field === "unitPrice") {
          const unit = Math.max(0, Number(value) || 0);
          tier.unitPrice = unit.toFixed(2);
          tier.totalPrice = (unit * tier.quantity).toFixed(2);
          // Recalculate discount percent
          if (basePrice > 0) {
            tier.discountPercent = Math.round(
              ((basePrice - unit) / basePrice) * 100
            );
          }
        } else if (field === "totalPrice") {
          const total = Math.max(0, Number(value) || 0);
          tier.totalPrice = total.toFixed(2);
          const unit = tier.quantity > 0 ? total / tier.quantity : 0;
          tier.unitPrice = unit.toFixed(2);
          if (basePrice > 0) {
            tier.discountPercent = Math.round(
              ((basePrice - unit) / basePrice) * 100
            );
          }
        } else if (field === "quantity") {
          const qty = Math.max(1, Number(value) || 1);
          tier.quantity = qty;
          const { unitPrice, totalPrice } = calculateTierPrices(
            basePrice,
            qty,
            tier.discountPercent
          );
          tier.unitPrice = unitPrice;
          tier.totalPrice = totalPrice;
        } else if (field === "stock") {
          tier.stock = Math.max(0, Number(value) || 0);
        } else {
          (tier as any)[field] = value;
        }

        updated[index] = tier;
        return updated;
      });
      setHasChanges(true);
      onDataChange?.();
    },
    [basePrice, onDataChange]
  );

  // Toggle popular badge
  const togglePopular = useCallback(
    (index: number) => {
      setTiers((prev) => {
        const updated = prev.map((t, i) => ({
          ...t,
          isPopular: i === index ? !t.isPopular : false, // Only one can be popular
        }));
        return updated;
      });
      setHasChanges(true);
      onDataChange?.();
    },
    [onDataChange]
  );

  // Move tier up/down
  const moveTier = useCallback(
    (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= tiers.length) return;

      setTiers((prev) => {
        const updated = [...prev];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        updated.forEach((t, i) => (t.sortOrder = i));
        return updated;
      });
      setHasChanges(true);
      onDataChange?.();
    },
    [tiers.length, onDataChange]
  );

  // Recalculate all tiers based on current base price
  const handleRecalculateAll = useCallback(() => {
    if (basePrice <= 0) {
      toast.error("기본 가격이 설정되어 있지 않습니다.");
      return;
    }

    setTiers((prev) =>
      prev.map((tier) => {
        const { unitPrice, totalPrice } = calculateTierPrices(
          basePrice,
          tier.quantity,
          tier.discountPercent
        );
        return { ...tier, unitPrice, totalPrice };
      })
    );
    setHasChanges(true);
    onDataChange?.();
    toast.success("기본가 기준으로 모든 가격이 재계산되었습니다.");
  }, [basePrice, onDataChange]);

  // Save all tiers
  const handleSave = useCallback(async () => {
    // 변경사항이 없으면 저장 건너뜀 (빈 배열로 전체 삭제 방지)
    if (!hasChanges) {
      return;
    }
    // 데이터 로딩 중에는 저장 방지
    if (isLoading) {
      console.warn('[PriceTierSection] Skipping save: data still loading');
      return;
    }
    setIsSaving(true);
    try {
      await upsertMutation.mutateAsync({
        productId,
        tiers: tiers.map((t) => ({
          id: t.id,
          quantity: t.quantity,
          unitPrice: t.unitPrice,
          totalPrice: t.totalPrice,
          discountPercent: t.discountPercent,
          stock: t.stock || 0,
          isPopular: t.isPopular,
          isActive: t.isActive,
          sortOrder: t.sortOrder,
        })),
      });
      await refetch();
      setHasChanges(false);
      toast.success("가격 티어가 저장되었습니다.");
    } catch (error) {
      toast.error("저장에 실패했습니다.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [productId, tiers, upsertMutation, refetch]);

  // Register save function to parent ref for unified save
  useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = handleSave;
    }
    return () => {
      if (onSaveRef) {
        onSaveRef.current = null;
      }
    };
  }, [onSaveRef, handleSave]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">로딩 중...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── 상단 2열: 왼쪽(설정 폼) | 오른쪽(미리보기) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* ── 왼쪽: まとめ買い割引設定 ── */}
        <Card>
          <CardHeader className="pb-3 py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  まとめ買い割引設定
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  (대량구매 할인)
                </span>
              </div>
              {hasChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  미저장
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoGenerate}
                className="gap-1 h-7 text-xs"
              >
                <Sparkles className="w-3 h-3" />
                추천 티어 자동생성
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculateAll}
                className="gap-1 h-7 text-xs"
                disabled={tiers.length === 0}
              >
                <Calculator className="w-3 h-3" />
                전체 재계산
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="gap-1 h-7 text-xs ml-auto"
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                저장
              </Button>
            </div>

            {/* Base price info */}
            <div className="bg-muted/50 rounded-lg p-2.5 mb-3 flex items-center gap-3">
              <div className="text-xs">
                <span className="text-muted-foreground">기본 단가 (1개):</span>{" "}
                <span className="font-bold">{formatPrice(basePrice)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                할인율은 기본 단가 기준
              </div>
            </div>

            {/* Add new tier */}
            <div className="p-2.5 border border-dashed rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  수량 추가:
                </span>
                <Input
                  type="number"
                  min="1"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="예: 15"
                  className="w-20 h-7 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleAddTier()}
                />
                <span className="text-xs text-muted-foreground">개</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddTier}
                  disabled={!newQuantity}
                  className="gap-1 h-7 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  추가
                </Button>
              </div>
              {/* Quick-add preset buttons */}
              <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 5, 7, 10, 15, 20].map((qty) => (
                  <Button
                    key={qty}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={tiers.some((t) => t.quantity === qty)}
                    onClick={() => {
                      const discount = getRecommendedDiscount(qty);
                      const { unitPrice, totalPrice } = calculateTierPrices(
                        basePrice,
                        qty,
                        discount
                      );
                      const newTier: PriceTier = {
                        quantity: qty,
                        unitPrice,
                        totalPrice,
                        discountPercent: discount,
                        stock: 0,
                        noStockTracking: false,
                        isPopular: false,
                        isActive: true,
                        sortOrder: tiers.length,
                      };
                      const updated = [...tiers, newTier].sort(
                        (a, b) => a.quantity - b.quantity
                      );
                      updated.forEach((t, i) => (t.sortOrder = i));
                      setTiers(updated);
                      setHasChanges(true);
                      onDataChange?.();
                    }}
                  >
                    {qty}箱
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 오른쪽: 고객 페이지 미리보기 ── */}
        <Card>
          <CardHeader className="pb-3 py-3 px-4">
            <CardTitle className="text-sm font-semibold">
              고객페이지 미리보기
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {tiers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Package className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs">티어를 추가하면 미리보기가 표시됩니다</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* Preview header */}
                <div className="bg-gradient-to-r from-pink-50 to-red-50 p-3 text-center">
                  <h3 className="text-sm font-bold text-gray-800">
                    まとめ買いが経済的!
                  </h3>
                </div>

                {/* Preview table header */}
                <div className="grid grid-cols-4 gap-1 px-3 py-1.5 bg-yellow-50/50 text-xs font-medium text-gray-600 border-b">
                  <div>セット数</div>
                  <div className="text-center">一箱あたり</div>
                  <div className="text-center">販売価格</div>
                  <div className="text-center">選択</div>
                </div>

                {/* Preview tier rows */}
                {tiers
                  .filter((t) => t.isActive)
                  .sort((a, b) => b.quantity - a.quantity)
                  .map((tier) => (
                    <div
                      key={`preview-${tier.quantity}`}
                      className={`grid grid-cols-4 gap-1 px-3 py-2 items-center border-b last:border-b-0 ${
                        tier.isPopular ? "bg-pink-50/30" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {tier.isPopular && (
                          <span className="bg-amber-400 text-white text-xs font-bold px-1 py-0.5 rounded">
                            人気
                          </span>
                        )}
                        <span className="text-xs font-medium">{tier.quantity}箱</span>
                      </div>
                      <div className="text-center text-xs text-gray-600">
                        {formatPrice(tier.unitPrice)}
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-bold text-red-600">
                          {formatPrice(tier.totalPrice)}
                        </span>
                        {tier.discountPercent > 0 && (
                          <div className="text-xs text-red-500">
                            ({tier.discountPercent}%お得)
                          </div>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 하단 전체폭: 가격 티어 목록 ── */}
      {tiers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Package className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm font-medium mb-1">가격 티어가 없습니다</p>
            <p className="text-xs">
              "추천 티어 자동생성" 버튼을 클릭하거나 수동으로 추가하세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2 py-3 px-4">
            <CardTitle className="text-sm font-semibold">
              가격 티어 목록 ({tiers.length}개)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {/* Table header */}
            <div className="grid grid-cols-[50px_70px_90px_90px_90px_70px_70px_70px_50px_70px] gap-2 mb-1.5 px-2 text-xs font-medium text-muted-foreground">
              <div>순서</div>
              <div>세트 수</div>
              <div>개당 단가</div>
              <div>총 판매가</div>
              <div>할인율</div>
              <div>재고</div>
              <div>人気</div>
              <div>활성</div>
              <div></div>
              <div></div>
            </div>

            {/* Tier rows */}
            <div className="space-y-1.5">
              {tiers.map((tier, index) => (
                <div
                  key={`tier-${tier.quantity}-${index}`}
                  className={`grid grid-cols-[50px_70px_90px_90px_90px_70px_70px_70px_50px_70px] gap-2 items-center p-2 rounded-lg border ${
                    tier.isPopular
                      ? "border-amber-300 bg-amber-50/50"
                      : tier.isActive
                      ? "border-border"
                      : "border-border bg-muted/30 opacity-60"
                  }`}
                >
                  {/* Sort order buttons */}
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => moveTier(index, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => moveTier(index, "down")}
                      disabled={index === tiers.length - 1}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="1"
                      value={tier.quantity}
                      onChange={(e) =>
                        updateTier(index, "quantity", e.target.value)
                      }
                      className="h-7 text-center text-xs"
                    />
                    <span className="text-xs text-muted-foreground">箱</span>
                  </div>

                  {/* Unit price */}
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      value={Math.round(parseFloat(tier.unitPrice))}
                      onChange={(e) =>
                        updateTier(index, "unitPrice", e.target.value)
                      }
                      className="h-7 pr-6 text-xs"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      円
                    </span>
                  </div>

                  {/* Total price */}
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      value={Math.round(parseFloat(tier.totalPrice))}
                      onChange={(e) =>
                        updateTier(index, "totalPrice", e.target.value)
                      }
                      className="h-7 pr-6 text-xs font-medium text-red-600"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      円
                    </span>
                  </div>

                  {/* Discount percent */}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={tier.discountPercent}
                      onChange={(e) =>
                        updateTier(index, "discountPercent", e.target.value)
                      }
                      className="h-7 text-center text-xs"
                    />
                    <Percent className="w-3 h-3 text-muted-foreground" />
                  </div>

                  {/* Stock */}
                  <div>
                    <Input
                      type="number"
                      min="0"
                      value={tier.stock}
                      onChange={(e) =>
                        updateTier(index, "stock", e.target.value)
                      }
                      className="h-7 text-center text-xs"
                      placeholder="0"
                    />
                  </div>

                  {/* Popular badge */}
                  <div className="flex justify-center">
                    <Button
                      variant={tier.isPopular ? "default" : "ghost"}
                      size="sm"
                      className={`h-6 px-1.5 text-xs gap-1 ${
                        tier.isPopular
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : ""
                      }`}
                      onClick={() => togglePopular(index)}
                    >
                      <Star
                        className={`w-3 h-3 ${
                          tier.isPopular ? "fill-white" : ""
                        }`}
                      />
                      {tier.isPopular ? "人気" : ""}
                    </Button>
                  </div>

                  {/* Active toggle */}
                  <div className="flex justify-center">
                    <Switch
                      checked={tier.isActive}
                      onCheckedChange={(checked) =>
                        updateTier(index, "isActive", checked)
                      }
                    />
                  </div>

                  {/* Discount display */}
                  <div className="text-center">
                    {tier.discountPercent > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-xs text-green-700 bg-green-50 px-1"
                      >
                        {tier.discountPercent}%
                      </Badge>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveTier(index)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
