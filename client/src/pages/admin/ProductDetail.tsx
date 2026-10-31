import { useRoute, useLocation } from"wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import {
 SalesInfoSection,
 StockManagementSection,
 ImageManagementSection,
 SeoMetadataSection,
} from"@/components/ProductDetailSections";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { useState, useEffect, useRef, useCallback } from"react";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
// Card import removed - using plain div with border style instead
import { X, Upload, ChevronLeft, ChevronRight, Eye, ExternalLink, Sparkles, Search, Plus, Trash2, Bot } from"lucide-react";
import { toast } from"sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { useUnsavedChanges } from"@/hooks/useUnsavedChanges";
import { UnsavedChangesDialog } from"@/components/UnsavedChangesDialog";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from"@/components/ui/alert-dialog";
import { ProductPreview } from"@/components/ProductPreview";
import { PriceTierSection } from"@/components/PriceTierSection";
import { RichTextEditor } from"@/components/RichTextEditor";
import { formatPrice } from"@/../../shared/utils/formatPrice";

/** HTML 태그를 제거하고 순수 텍스트만 반환 */
function stripHtml(html: string): string {
 if (!html) return"";
 return html
 .replace(/<[^>]*>/g,"") // 태그 제거
 .replace(/&nbsp;/g,"")
 .replace(/&amp;/g,"&")
 .replace(/&lt;/g,"<")
 .replace(/&gt;/g,">")
 .replace(/&quot;/g, '"')
 .replace(/&#39;/g,"'")
 .replace(/\s+/g,"")
 .trim();
}

export default function AdminProductDetail() {
 const [, params] = useRoute("/admin/products/:id");
 const [, navigate] = useLocation();
 const productId = params?.id ? parseInt(params.id) : null;
 const trpcUtils = trpc.useUtils();

 // 미저장 변경사항 추적
 const {
 hasUnsavedChanges,
 showLeaveDialog,
 markDirty,
 markClean,
 markAllClean,
 isTabDirty,
 getDirtyTabs,
 confirmTabChange,
 confirmNavigation,
 handleConfirmLeave,
 handleCancelLeave,
 } = useUnsavedChanges();

 const [activeTab, setActiveTab] = useState("sales");
 const initialFormDataRef = useRef<any>(null);
 const isInitialLoadRef = useRef(true);

 const [formData, setFormData] = useState({
 name:"",
 nameJa:"",
 description:"",
 descriptionJa:"",
 price:"",
 originalPrice:"",
 stock:"",
 trackInventory: false,
 imageUrl:"",
 categoryId: 0,
 categoryIds: [] as number[], // 최대 3개 카테고리
 usageMethod:"",
 sideEffects:"",
 precautions:"",
 searchTags:"",
 productContent:"",
 isHit: false,
 isRecommended: false,
 isNew: false,
 isPopular: false,
 isDiscount: false,
 couponExcluded: false,
 sortOrder: 0,
 });

 // PriceTierSection ref for unified save
 const priceTierSaveRef = useRef<(() => Promise<void>) | null>(null);

 // 이미지 순서 조회
 const { data: imageOrderData, refetch: refetchImageOrder } = trpc.admin.getProductImageOrder.useQuery(
 { productId: productId || 0 },
 { enabled: !!productId }
 );

 // 이미지 업로드 뮤테이션
 const uploadImageMutation = trpc.admin.uploadProductImage.useMutation();

 // 이미지 순서 업데이트 뮤테이션
 const updateImageOrderMutation = trpc.admin.updateProductImageOrder.useMutation();

 // 이미지 삭제 뮤테이션
 const deleteImageMutation = trpc.admin.deleteProductImage.useMutation();

 // 이미지 업로드 핸들러
 const handleUploadImage = async (file: File): Promise<string | null> => {
 if (!productId) return null;
 try {
 const reader = new FileReader();
 const base64 = await new Promise<string>((resolve, reject) => {
 reader.onload = () => {
 const result = reader.result as string;
 const base64Data = result.split(',')[1];
 resolve(base64Data);
 };
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });

 const result = await uploadImageMutation.mutateAsync({
 productId,
 fileName: file.name,
 fileData: base64,
 contentType: file.type,
 });

 if (result.success && result.url) {
 return result.url;
 }
 return null;
 } catch (error) {
 console.error("Image upload failed:", error);
 toast.error("이미지 업로드에 실패했습니다");
 return null;
 }
 };

 // 이미지 삭제 핸들러
 const handleDeleteImage = async (imageUrl: string) => {
 if (!productId) return;
 try {
 await deleteImageMutation.mutateAsync({
 productId,
 imageUrl,
 });
 } catch (error) {
 console.error("Image delete failed:", error);
 toast.error("이미지 삭제에 실패했습니다");
 }
 };

 // 이미지 순서 저장 핸들러 (새 인터페이스)
 const handleSaveImageOrder = async (images: Array<{ imageUrl: string; sortOrder: number; isThumbnail: boolean }>) => {
 if (!productId) return;
 try {
 await updateImageOrderMutation.mutateAsync({
 productId,
 images,
 });
 // 대표 이미지 변경 시 product 쿼리 및 SEO fields 쿼리 즉시 갱신
 const hasThumbnailChange = images.some(img => img.isThumbnail);
 if (hasThumbnailChange) {
 await Promise.all([
 trpcUtils.product.getById.invalidate({ id: productId }),
 trpcUtils.admin.getProductSeoFields.invalidate({ productId }),
 ]);
 }
 } catch (error) {
 console.error("Image order update failed:", error);
 toast.error("이미지 순서 저장에 실패했습니다");
 }
 };

 // 상품 데이터 조회
 const { data: selectedProduct, isLoading } = trpc.product.getById.useQuery(
 { id: productId || 0 },
 { enabled: !!productId }
 );

 // 카테고리 목록 조회
 const { data: categories } = trpc.category.list.useQuery();

 // 같은 카테고리 상품 조회
 const { data: relatedProducts, isLoading: isLoadingRelated } = trpc.product.getByCategory.useQuery(
 { categoryId: formData.categoryId, limit: 12 },
 { enabled: !!formData.categoryId }
 );

 // 상품 업데이트 뮤테이션
 const updateProductMutation = trpc.admin.updateProduct.useMutation({
 onSuccess: () => {
 toast.success("상품이 저장되었습니다");
 markAllClean();
 // 캐시 무효화 - 최신 데이터 다시 로드
 trpcUtils.product.getById.invalidate({ id: productId || 0 });
 trpcUtils.admin.getProductSeoFields.invalidate({ productId: productId || 0 });
 },
 onError: (error) => {
 toast.error(`저장 실패: ${error.message}`);
 },
 });

 const generateTagsMutation = trpc.admin.generateSearchTags.useMutation();
 const generateContentMutation = trpc.admin.generateProductContent.useMutation();
 const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);

 const doGenerateContent = async () => {
 try {
 const result = await generateContentMutation.mutateAsync({
 name: formData.name,
 nameJa: formData.nameJa,
 description: formData.description,
 descriptionJa: formData.descriptionJa,
 });
 if (result.success && result.html) {
 setFormData(prev => ({ ...prev, productContent: result.html }));
 markDirty("productContent");
 toast.success("AI가 상품 설명을 자동 작성했습니다. 내용을 확인 후 저장해주세요.");
 }
 } catch (err: any) {
 toast.error(`AI 생성 실패: ${err.message}`);
 }
 };

 const handleGenerateContent = () => {
 const existingContent = formData.productContent?.trim();
 const isEmpty = !existingContent || existingContent ==="<p></p>"|| existingContent ==="<p><br></p>";
 if (!isEmpty) {
 setShowOverwriteDialog(true);
 } else {
 doGenerateContent();
 }
 };

 // 상품 데이터 로드 시 formData 초기화화
 useEffect(() => {
 if (selectedProduct) {
 const newFormData = {
 name: selectedProduct.name ||"",
 nameJa: selectedProduct.nameJa ||"",
 description: stripHtml(selectedProduct.description ||""),
 descriptionJa: stripHtml(selectedProduct.descriptionJa ||""),
 price: selectedProduct.price?.toString() ||"",
 originalPrice: selectedProduct.originalPrice?.toString() ||"",
 stock: selectedProduct.stock?.toString() ||"",
 trackInventory: (selectedProduct as any).trackInventory ?? false,
 imageUrl: selectedProduct.imageUrl ||"",
 categoryId: selectedProduct.categoryId || 0,
 categoryIds: (() => { const raw = (selectedProduct as any).categoryIds; if (!raw) return []; if (Array.isArray(raw)) return raw; try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })(),
 usageMethod: selectedProduct.usageMethod ||"",
 sideEffects: selectedProduct.sideEffects ||"",
 precautions: selectedProduct.precautions ||"",
 searchTags: (selectedProduct as any).searchTags ||"",
 productContent: (selectedProduct as any).productContent ||"",
 isHit: (selectedProduct as any).isHit ?? false,
 isRecommended: (selectedProduct as any).isRecommended ?? false,
 isNew: (selectedProduct as any).isNew ?? false,
 isPopular: (selectedProduct as any).isPopular ?? false,
 isDiscount: (selectedProduct as any).isDiscount ?? false,
 couponExcluded: (selectedProduct as any).couponExcluded ?? false,
 sortOrder: (selectedProduct as any).sortOrder ?? 0,
 };
 setFormData(newFormData);
 initialFormDataRef.current = newFormData;
 // 초기 로드 플래그 설정 (다음 틱에 false로 변경)
 isInitialLoadRef.current = true;
 setTimeout(() => {
 isInitialLoadRef.current = false;
 }, 100);
 }
 }, [selectedProduct]);

 // 탭 변경 핸들러
 const handleTabChange = (newTab: string) => {
 if (hasUnsavedChanges) {
 const canSwitch = confirmTabChange(activeTab, newTab, () => {
 setActiveTab(newTab);
 });
 if (canSwitch) {
 // 현재 탭이 dirty하지 않으면 바로 이동
 setActiveTab(newTab);
 }
 } else {
 setActiveTab(newTab);
 }
 };

 // 통합 저장 핸들러 - 모든 섹션의 변경사항을 한 번에 저장
 const handleSave = async () => {
 if (!productId) return;

 try {
 // 1. 상품 기본 정보 저장
 await updateProductMutation.mutateAsync({
 id: productId,
 name: formData.name,
 nameJa: formData.nameJa,
 description: formData.description,
 descriptionJa: formData.descriptionJa,
 price: parseFloat(formData.price) || 0,
 originalPrice: parseFloat(formData.originalPrice) || 0,
 stock: parseInt(formData.stock) || 0,
 trackInventory: formData.trackInventory,
 imageUrl: formData.imageUrl,
 categoryId: formData.categoryId,
 categoryIds: formData.categoryIds,
 usageMethod: formData.usageMethod,
 sideEffects: formData.sideEffects,
 precautions: formData.precautions,
 searchTags: formData.searchTags,
 productContent: formData.productContent,
 isHit: formData.isHit,
 isRecommended: formData.isRecommended,
 isNew: formData.isNew,
 isPopular: formData.isPopular,
 isDiscount: formData.isDiscount,
 couponExcluded: formData.couponExcluded,
 sortOrder: formData.sortOrder,
 });

 // 2. 가격 티어도 함께 저장 (변경사항이 있는 경우)
 if (priceTierSaveRef.current) {
 await priceTierSaveRef.current();
 }

 toast.success("모든 변경사항이 저장되었습니다");
 } catch (error) {
 console.error("Save failed:", error);
 }
 };

 // 취소 핸들러
 const handleCancel = () => {
 if (initialFormDataRef.current) {
 setFormData(initialFormDataRef.current);
 markAllClean();
 toast.info("변경사항이 취소되었습니다");
 }
 };

 // 섹션별 데이터 변경 핸들러
 const handleSalesDataChange = (data: any) => {
 setFormData((prev) => ({ ...prev, ...data }));
 markDirty("sales");
 };

 const handleStockDataChange = (data: any) => {
 setFormData((prev) => ({ ...prev, ...data }));
 markDirty("stock");
 };

 const handleSeoDataChange = (data: any) => {
 setFormData((prev) => ({ ...prev, ...data }));
 markDirty("seo");
 };

 const handleShippingDataChange = (data: any) => {
 markDirty("shipping");
 };

 const handlePriceTierDataChange = () => {
 markDirty("priceTier");
 };

 // 뒤로가기 핸들러
 const handleBack = () => {
 if (hasUnsavedChanges) {
 confirmNavigation(() => {
 navigate("/admin/products");
 });
 } else {
 navigate("/admin/products");
 }
 };

 if (isLoading) {
 return (
 <AdminLayout>
 <div className="flex items-center justify-center h-96">
 <p className="text-gray-500">로딩 중...</p>
 </div>
 </AdminLayout>
 );
 }

 if (!selectedProduct) {
 return (
 <AdminLayout>
 <div className="flex items-center justify-center h-96">
 <p className="text-gray-500">상품을 찾을 수 없습니다</p>
 </div>
 </AdminLayout>
 );
 }

 return (
 <AdminLayout>
 <div className="space-y-6">
 {/* 헤더 */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <Button variant="ghost"size="sm"onClick={handleBack}>
 ← 목록으로
 </Button>
 <h1 className="text-xl font-bold">상품 편집</h1>
 </div>
 <div className="flex items-center gap-2">
 {hasUnsavedChanges && (
 <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
 <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"/>
 <p className="text-xs text-amber-700 mt-0.5">
 변경된 섹션:{""}
 {getDirtyTabs()
 .map((tab) => {
 const labels: Record<string, string> = {
 sales:"판매정보",
 stock:"재고",
 images:"이미지",
 seo:"SEO",
 shipping:"배송/프로모션",
 priceTier:"가격옵션",
 productDescription:"상품 설명",
 usageMethod:"사용 방법",
 sideEffects:"부작용",
 precautions:"주의 사항",
 };
 return labels[tab] || tab;
 })
 .join(",")}
 </p>
 </div>
 )}
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 if (productId) {
 window.open(`/products/${productId}`, '_blank');
 }
 }}
 >
 <ExternalLink className="h-4 w-4 mr-1.5"/>
 상품페이지
 </Button>
 <Button variant="outline"onClick={handleCancel} disabled={!hasUnsavedChanges}>
 취소
 </Button>
 <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
 저장
 </Button>
 </div>
 </div>

 <UnsavedChangesDialog
 open={showLeaveDialog}
 dirtyTabs={getDirtyTabs()}
 onConfirm={handleConfirmLeave}
 onCancel={handleCancelLeave}
 />

 {/* AI 상품 설명 덮어쓰기 확인 다이얼로그 */}
 <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>기존 내용을 덮어쓰시겠습니까?</AlertDialogTitle>
 <AlertDialogDescription>
 현재 [상품 설명]에 작성된 내용이 있습니다. AI가 자동 작성한 내용으로 덮어쓰면 기존 내용은 사라집니다.
 계속 진행하시겠습니까?
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel onClick={() => setShowOverwriteDialog(false)}>취소</AlertDialogCancel>
 <AlertDialogAction
 onClick={() => {
 setShowOverwriteDialog(false);
 doGenerateContent();
 }}
 className="bg-purple-600 hover:bg-purple-700 text-white"
 >
 덮어쓰기
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>


 {/* 기본 정보 섹션 - 2열 반응형 레이아웃 */}
 <div className="mb-8 bg-white border border-gray-200 rounded-lg">
 <div className="py-3 px-4 border-b border-gray-200">
 <h3 className="text-sm font-semibold">기본 정보</h3>
 </div>
 <div className="px-6 pb-6 space-y-4 pt-4">

 {/* ── 소섹션 1: 카테고리 ── */}
 <div className="rounded-xl border px-6 py-5">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">카테고리</p>
 <div className="flex gap-3">
 {/* 기본 카테고리 */}
 <Select
 value={formData.categoryId?.toString() ||""}
 onValueChange={(value) => {
 const newValue = parseInt(value);
 if (newValue !== formData.categoryId) {
 setFormData({ ...formData, categoryId: newValue });
 markDirty("basic");
 }
 }}
 >
 <SelectTrigger className="flex-1 h-8 text-xs">
 <SelectValue placeholder="기본 카테고리 (필수)"/>
 </SelectTrigger>
 <SelectContent>
 {categories?.map((category: any) => (
 <SelectItem key={category.id} value={category.id.toString()}>
 {category.nameJa} ({category.name})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {/* 추가 카테고리 1 */}
 <Select
 value={(
 Array.isArray(formData.categoryIds) ? formData.categoryIds[0] : undefined
 )?.toString() ||"none"}
 onValueChange={(value) => {
 const newIds = Array.isArray(formData.categoryIds) ? [...formData.categoryIds] : [];
 if (value ==="none") {
 newIds[0] = undefined as any;
 } else {
 newIds[0] = parseInt(value);
 }
 const filtered = newIds.filter((id): id is number => id != null && !isNaN(id));
 setFormData({ ...formData, categoryIds: filtered });
 markDirty("basic");
 }}
 >
 <SelectTrigger className="flex-1 h-8 text-xs">
 <SelectValue placeholder="추가 카테고리 1"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">— 없음 —</SelectItem>
 {categories?.filter((c: any) => c.id !== formData.categoryId).map((category: any) => (
 <SelectItem key={category.id} value={category.id.toString()}>
 {category.nameJa} ({category.name})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {/* 추가 카테고리 2 */}
 <Select
 value={(
 Array.isArray(formData.categoryIds) ? formData.categoryIds[1] : undefined
 )?.toString() ||"none"}
 onValueChange={(value) => {
 const newIds = Array.isArray(formData.categoryIds) ? [...formData.categoryIds] : [];
 if (value ==="none") {
 if (newIds.length > 1) newIds[1] = undefined as any;
 } else {
 if (newIds.length === 0) newIds.push(0 as any);
 newIds[1] = parseInt(value);
 }
 const filtered = newIds.filter((id): id is number => id != null && !isNaN(id));
 setFormData({ ...formData, categoryIds: filtered });
 markDirty("basic");
 }}
 >
 <SelectTrigger className="flex-1 h-8 text-xs">
 <SelectValue placeholder="추가 카테고리 2"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">— 없음 —</SelectItem>
 {categories?.filter((c: any) =>
 c.id !== formData.categoryId &&
 c.id !== (Array.isArray(formData.categoryIds) ? formData.categoryIds[0] : undefined)
 ).map((category: any) => (
 <SelectItem key={category.id} value={category.id.toString()}>
 {category.nameJa} ({category.name})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <p className="text-[11px] text-muted-foreground mt-1.5">기본 카테고리 1개 필수 · 추가 최대 2개</p>
 </div>

 {/* ── 소섹션 2+3: 2열 (왼쪽: 상품명/간단설명/가격/재고 | 오른쪽: 상품이미지) ── */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

 {/* 소섹션 2: 상품명 / 간단설명 / 가격 / 재고 */}
 <div className="rounded-xl border px-6 py-5 space-y-5">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">상품명 · 가격 · 재고</p>

 {/* 상품명 */}
 <div className="space-y-1.5">
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground">상품명 (일본어)</label>
 <Input
 value={formData.nameJa}
 onChange={(e) => {
 const newValue = e.target.value;
 if (newValue !== formData.nameJa) {
 setFormData({ ...formData, nameJa: newValue });
 markDirty("basic");
 }
 }}
 placeholder="商品名を入力してください"
 className="h-8 text-xs"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground">상품명 (영어 · 관리용)</label>
 <Input
 value={formData.name}
 onChange={(e) => {
 const newValue = e.target.value;
 if (newValue !== formData.name) {
 setFormData({ ...formData, name: newValue });
 markDirty("basic");
 }
 }}
 placeholder="Product name (admin use)"
 className="h-8 text-xs"
 />
 </div>
 </div>

 {/* 간단설명 */}
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground">간단설명 <span className="text-[10px] text-muted-foreground/70">(상품명 아래쪽 표시)</span></label>
 <Textarea
 value={formData.descriptionJa}
 onChange={(e) => {
 const newValue = e.target.value;
 if (newValue !== formData.descriptionJa) {
 setFormData({ ...formData, descriptionJa: newValue });
 markDirty("basic");
 }
 }}
 placeholder="간단 설명을 입력하세요"
 rows={2}
 className="resize-none text-xs"
 />
 </div>

 {/* 가격 */}
 <div className="space-y-1.5">
 <label className="text-xs text-muted-foreground">가격</label>
 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <label className="text-[10px] text-muted-foreground/70">정가 (¥) · 원래가격</label>
 <Input
 type="number"
 value={formData.originalPrice}
 onChange={(e) => {
 const newValue = e.target.value;
 if (newValue !== formData.originalPrice) {
 setFormData({ ...formData, originalPrice: newValue });
 markDirty("basic");
 }
 }}
 placeholder="0"
 className="h-8 text-xs"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-muted-foreground/70">할인가 (¥) · 판매가</label>
 <Input
 type="number"
 value={formData.price}
 onChange={(e) => {
 const newValue = e.target.value;
 if (newValue !== formData.price) {
 setFormData({ ...formData, price: newValue });
 markDirty("basic");
 }
 }}
 placeholder="0"
 className="h-8 text-xs"
 />
 </div>
 </div>
 {formData.originalPrice && formData.price && parseFloat(formData.originalPrice) > parseFloat(formData.price) && (
 <p className="text-xs text-red-500 font-medium">
 할인율: {Math.round((1 - parseFloat(formData.price) / parseFloat(formData.originalPrice)) * 100)}% OFF
 </p>
 )}
 </div>

 {/* 재고 추적 */}
 <div className="flex items-center gap-2 pt-1">
 <input
 type="checkbox"
 id="trackInventory"
 checked={formData.trackInventory}
 onChange={(e) => {
 setFormData({ ...formData, trackInventory: e.target.checked });
 markDirty("basic");
 }}
 className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
 />
 <label htmlFor="trackInventory"className="text-xs text-muted-foreground cursor-pointer select-none">
 재고 추적 사용
 </label>
 {formData.trackInventory && (
 <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
 재고 관리 활성
 </span>
 )}
 </div>

 {/* 상품 뱃지 */}
 <div className="mt-3 pt-3 border-t border-dashed">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">상품 뱃지</p>
 <div className="flex flex-wrap gap-2">
 {([
 { key:"isHit", label:"히트", color:"bg-red-50 text-red-600 border-red-200"},
 { key:"isRecommended", label:"추천", color:"bg-green-50 text-green-600 border-green-200"},
 { key:"isNew", label:"신상품", color:"bg-blue-50 text-blue-600 border-blue-200"},
 { key:"isPopular", label:"인기", color:"bg-yellow-50 text-yellow-600 border-yellow-200"},
 { key:"isDiscount", label:"할인", color:"bg-pink-50 text-pink-600 border-pink-200"},
 { key:"couponExcluded", label:"쿠폰제외", color:"bg-gray-100 text-gray-700 border-gray-400"},
 ] as { key: keyof typeof formData; label: string; color: string }[]).map(({ key, label, color }) => (
 <label key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer select-none text-xs font-medium transition-all ${
 formData[key] ? color +"ring-1 ring-offset-1":"bg-muted/30 text-muted-foreground border-border"
 }`}>
 <input
 type="checkbox"
 checked={!!formData[key]}
 onChange={(e) => {
 setFormData({ ...formData, [key]: e.target.checked });
 markDirty("basic");
 }}
 className="w-3 h-3 cursor-pointer"
 />
 {label}
 </label>
 ))}
 </div>
 </div>

 {/* 노출 순서 */}
 <div className="mt-3 pt-3 border-t border-dashed flex items-center gap-2">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">노출 순서</p>
 <Input
 type="number"
 value={formData.sortOrder}
 onChange={(e) => {
 setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 });
 markDirty("basic");
 }}
 className="h-7 text-xs w-24"
 placeholder="0"
 />
 <span className="text-[10px] text-muted-foreground">0이 기본, 양수(10, 100...)일수록 하위 노출</span>
 </div>

 </div>{/* end 소섹션 2 */}

 {/* 소섹션 3: 상품 이미지 */}
 <div className="rounded-xl border px-6 py-5">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">상품 이미지</p>
 <ImageManagementSection
 productId={productId || 0}
 imageOrderData={imageOrderData}
 refetchImageOrder={refetchImageOrder}
 onUploadImage={handleUploadImage}
 onSaveImageOrder={handleSaveImageOrder}
 onDeleteImage={handleDeleteImage}
 />
 </div>

 </div>{/* end 2열 grid */}

 {/* ── 소섹션 4: 관리자 상품메모 ── */}
 <div className="rounded-xl border px-6 py-5">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">관리자 상품메모</p>
 <Textarea
 value={formData.description}
 onChange={(e) => {
 const newValue = e.target.value;
 if (newValue !== formData.description) {
 setFormData({ ...formData, description: newValue });
 markDirty("basic");
 }
 }}
 placeholder="외부에 공개되지 않는 내부 메모를 입력하세요"
 rows={2}
 className="resize-none text-xs"
 />
 </div>

 </div>
 </div>

 {/* 가격옵션 섹션 */}
 <div className="mb-8 bg-white border border-gray-200 rounded-lg">
 <div className="py-3 px-4 border-b border-gray-200">
 <h3 className="text-sm font-semibold flex items-center gap-2">
 가격옵션
 {isTabDirty("priceTier") && (
 <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"/>
 )}
 </h3>
 </div>
 <div className="p-4">
 <PriceTierSection
 productId={productId || 0}
 basePrice={parseFloat(formData.price) || 0}
 onDataChange={handlePriceTierDataChange}
 onSaveRef={priceTierSaveRef}
 />
 </div>
 </div>

 {/* 해시태그 섹션 */}
 <div className="mb-8 bg-white border border-gray-200 rounded-lg">
 <div className="py-3 px-4 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold flex items-center gap-2">
 해시태그 (검색 태그)
 {isTabDirty("searchTags") && (
 <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"/>
 )}
 </h3>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="flex items-center gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
 onClick={async () => {
 if (!formData.name && !formData.nameJa) {
 toast.error("상품명을 먼저 입력해주세요.");
 return;
 }
 try {
 const result = await generateTagsMutation.mutateAsync({
 name: formData.name ||"",
 nameJa: formData.nameJa ||"",
 description: formData.description ||"",
 descriptionJa: formData.descriptionJa ||"",
 currentTags: formData.searchTags ||"",
 count: 10,
 });
 if (result.success && result.tags.length > 0) {
 // 태그를 공백으로 구분하여 단어 단위로 표시
 const newTags = result.tags.join(" ");
 const merged = formData.searchTags
 ? `${formData.searchTags} ${newTags}`
 : newTags;
 setFormData({ ...formData, searchTags: merged });
 markDirty("searchTags");
 toast.success(`AI가 태그 ${result.tags.length}개를 생성했습니다.`);
 }
 } catch (e: any) {
 toast.error(e.message ||"AI 태그 생성에 실패했습니다.");
 }
 }}
 disabled={generateTagsMutation.isPending}
 >
 {generateTagsMutation.isPending ? (
 <>
 <span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"/>
 AI 생성 중...
 </>
 ) : (
 <>
 <Sparkles className="w-3.5 h-3.5"/>
 AI 태그 자동 생성
 </>
 )}
 </Button>
 </div>
 </div>
 <div className="p-4 space-y-3">
 <p className="text-xs text-gray-500">
 상품 카드에 표시되는 해시태그입니다. 공백 또는 쉼표로 구분하여 입력하세요.<br />
 예: <code className="bg-gray-100 px-1 rounded">#당놨 #다이어트 #SGLT2</code> 또는 <code className="bg-gray-100 px-1 rounded">당놨,다이어트,SGLT2</code>
 </p>
 <Input
 value={formData.searchTags}
 onChange={(e) => {
 const newValue = e.target.value;
 if (newValue !== formData.searchTags) {
 setFormData({ ...formData, searchTags: newValue });
 markDirty("searchTags");
 }
 }}
 placeholder="#태그1 #태그2 #태그3"
 />
 {/* 미리보기 */}
 {formData.searchTags && (
 <div className="flex flex-wrap gap-1.5 pt-1">
 {formData.searchTags
 .split(/[\s,]+/)
 .filter(Boolean)
 .map((tag, i) => (
 <span
 key={i}
 className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1"
 >
 {tag.startsWith("#") ? tag : `#${tag}`}
 </span>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* 상품 설명 섹션 - productContent 필드와 연동 (사용자 페이지 商品説明 섹션) */}
 <div className="mb-8 bg-white border border-gray-200 rounded-lg">
 <div className="py-3 px-4 border-b border-gray-200">
 <div className="flex items-center justify-between w-full">
 <h3 className="text-sm font-semibold flex items-center gap-2">
 상품 설명
 <span className="text-xs font-normal text-blue-500 bg-blue-50 px-2 py-0.5 rounded">사용자 페이지 商品説明 연동</span>
 {isTabDirty("productContent") && (
 <span className="w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-background"/>
 )}
 </h3>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleGenerateContent}
 disabled={generateContentMutation.isPending}
 className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
 >
 {generateContentMutation.isPending ? (
 <><span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin inline-block"/> AI 작성 중...</>
 ) : (
 <><Sparkles className="w-3.5 h-3.5"/> AI 자동 작성</>
 )}
 </Button>
 </div>
 </div>
 <div className="p-4">
 <RichTextEditor
 value={formData.productContent}
 onChange={(value) => {
 if (value !== formData.productContent && !isInitialLoadRef.current) {
 setFormData({ ...formData, productContent: value });
 markDirty("productContent");
 }
 }}
 placeholder="상품의 상세한 설명을 입력해주세요 (사용자 페이지 商品説明에 표시됩니다)..."
 />
 </div>
 </div>


 {/* 판매정보 섹션 */}
 <div className="mb-8">
 <SalesInfoSection productId={productId || 0} onDataChange={handleSalesDataChange} />
 </div>

 {/* SEO 섹션 */}
 <div className="mb-8">
 <SeoMetadataSection productId={productId || 0} productName={selectedProduct?.nameJa || selectedProduct?.name} product={selectedProduct} onDataChange={handleSeoDataChange} />
 </div>

 {/* 관련상품 섹션 */}
 {productId && <RelatedProductsSection productId={productId} />}

 {/* 수정 이력 섹션 */}
 {productId && <ProductAuditLogSection productId={productId} />}
 </div>
 </AdminLayout>
 );
}

/** ─── 관련상품 섹션 컴포넌트 ─────────────────────────────────────────── */
function RelatedProductsSection({ productId }: { productId: number }) {
 const [searchQuery, setSearchQuery] = useState("");
 const [isAiLoading, setIsAiLoading] = useState(false);

 const { data: relatedList, refetch: refetchRelated } = trpc.admin.getManualRelatedProducts.useQuery({ productId });
 const { data: searchResults } = trpc.chatbot.searchProducts.useQuery(
 { query: searchQuery, limit: 10 },
 { enabled: searchQuery.length >= 1 }
 );

 const aiSuggest = trpc.admin.aiSuggestRelatedProducts.useMutation({
 onSuccess: (data) => {
 toast.success(`AI가 ${data.count}개의 관련 상품을 추천했습니다.`);
 refetchRelated();
 setIsAiLoading(false);
 },
 onError: () => {
 toast.error("AI 추천 중 오류가 발생했습니다.");
 setIsAiLoading(false);
 },
 });

 const addRelated = trpc.admin.addRelatedProduct.useMutation({
 onSuccess: () => {
 toast.success("관련 상품이 추가되었습니다.");
 refetchRelated();
 setSearchQuery("");
 },
 onError: () => toast.error("추가 중 오류가 발생했습니다."),
 });

 const removeRelated = trpc.admin.removeRelatedProduct.useMutation({
 onSuccess: () => {
 toast.success("관련 상품이 삭제되었습니다.");
 refetchRelated();
 },
 onError: () => toast.error("삭제 중 오류가 발생했습니다."),
 });

 const relatedIds = new Set((relatedList || []).map((p: any) => p.id));

 return (
 <div className="mb-8 bg-white border border-gray-200 rounded-lg">
 <div className="py-3 px-4 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold flex items-center gap-2">
 관련 상품
 <span className="text-xs font-normal text-gray-400">
 ({(relatedList || []).length}개)
 </span>
 </h3>
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setIsAiLoading(true);
 aiSuggest.mutate({ productId });
 }}
 disabled={isAiLoading}
 className="gap-1.5 text-xs"
 >
 <Bot className="w-3.5 h-3.5"/>
 {isAiLoading ?"AI 분석 중...":"AI 자동 추천"}
 </Button>
 </div>
 </div>
 <div className="p-4 space-y-4">
 {/* 현재 관련상품 목록 */}
 {relatedList && relatedList.length > 0 ? (
 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
 {relatedList.map((product: any) => (
 <div key={product.id} className="relative group border rounded-lg p-2 bg-muted/30">
 <button
 className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
 onClick={() => removeRelated.mutate({ productId, relatedProductId: product.id })}
 >
 <X className="w-3 h-3"/>
 </button>
 <div className="aspect-square mb-1.5 bg-white rounded overflow-hidden">
 {product.imageUrl ? (
 <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover"/>
 ) : (
 <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">없음</div>
 )}
 </div>
 <p className="text-xs line-clamp-2 leading-tight text-foreground">{product.nameJa || product.name}</p>
 <p className="text-xs text-primary font-medium mt-0.5">{formatPrice(product.price ?? 0)}</p>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-sm text-muted-foreground text-center py-4">
 등록된 관련 상품이 없습니다. AI 자동 추천 또는 직접 추가해주세요.
 </p>
 )}

 {/* 수동 검색 추가 */}
 <div className="border-t pt-3">
 <p className="text-xs font-medium text-muted-foreground mb-2">수동으로 상품 추가</p>
 <div className="relative">
 <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground"/>
 <Input
 placeholder="상품명으로 검색..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-8 text-sm h-9"
 />
 </div>
 {searchQuery.length >= 1 && searchResults && searchResults.length > 0 && (
 <div className="mt-1 border rounded-md bg-popover max-h-48 overflow-y-auto">
 {searchResults.map((product: any) => (
 <div
 key={product.id}
 className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer text-sm"
 onClick={() => {
 if (!relatedIds.has(product.id)) {
 addRelated.mutate({ productId, relatedProductId: product.id });
 } else {
 toast.info("이미 등록된 관련 상품입니다.");
 }
 }}
 >
 {product.imageUrl && (
 <img src={product.imageUrl} alt=""className="w-8 h-8 rounded object-cover flex-shrink-0"/>
 )}
 <div className="flex-1 min-w-0">
 <p className="truncate text-xs font-medium">{product.nameJa || product.name}</p>
 <p className="text-xs text-muted-foreground">{formatPrice(product.price ?? 0)}</p>
 </div>
 {relatedIds.has(product.id) ? (
 <span className="text-xs text-muted-foreground">등록됨</span>
 ) : (
 <Plus className="w-4 h-4 text-primary flex-shrink-0"/>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

/** ─── 상품 수정 이력 섹션 컴포넌트 ─────────────────────────────────────── */
function ProductAuditLogSection({ productId }: { productId: number }) {
  const [page, setPage] = useState(0);
  const limit = 10;

  const { data, isLoading, refetch } = trpc.analytics.getProductAuditLogs.useQuery({
    productId,
    limit,
    offset: page * limit,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const fieldLabelMap: Record<string, string> = {
    name: "상품명(KR)",
    nameJa: "상품명(JP)",
    price: "가격",
    originalPrice: "정가",
    description: "설명(KR)",
    descriptionJa: "설명(JP)",
    stock: "재고",
    isActive: "활성화",
    isHit: "인기",
    isRecommended: "추천",
    isNew: "신상품",
    isPopular: "인기상품",
    isDiscount: "할인",
    couponExcluded: "쿠폰제외",
    imageUrl: "대표이미지",
    categoryId: "카테고리",
    searchTags: "검색태그",
    productContent: "상품설명(HTML)",
    sortOrder: "정렬순서",
    usageMethod: "사용방법",
    sideEffects: "부작용",
    precautions: "주의사항",
  };

  return (
    <div className="mb-8 bg-white border border-gray-200 rounded-lg">
      <div className="py-3 px-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold">수정 이력</h3>
        <span className="text-xs text-gray-400">총 {total}건</span>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-gray-400">불러오는 중...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">수정 이력이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log: any) => (
              <div key={log.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{log.adminName}</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px]">{log.action === 'update' ? '수정' : log.action}</span>
                  </div>
                  <span className="text-gray-400">{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
                </div>
                {log.changedFields && Array.isArray(log.changedFields) && log.changedFields.length > 0 && (
                  <div className="space-y-1">
                    {log.changedFields.map((field: string) => {
                      const oldVal = log.oldValues?.[field];
                      const newVal = log.newValues?.[field];
                      const label = fieldLabelMap[field] || field;
                      const isLong = (String(oldVal || '').length > 30 || String(newVal || '').length > 30);
                      return (
                        <div key={field} className={`flex ${isLong ? 'flex-col gap-0.5' : 'items-center gap-2'}`}>
                          <span className="text-gray-500 min-w-[70px] shrink-0">{label}</span>
                          {isLong ? (
                            <div className="flex flex-col gap-0.5 pl-2">
                              <span className="text-red-500 line-through truncate max-w-xs">{String(oldVal ?? '—')}</span>
                              <span className="text-green-600 truncate max-w-xs">{String(newVal ?? '—')}</span>
                            </div>
                          ) : (
                            <>
                              <span className="text-red-500 line-through">{String(oldVal ?? '—')}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-600">{String(newVal ?? '—')}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              className="px-2 py-1 text-xs border rounded disabled:opacity-40"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >이전</button>
            <span className="text-xs text-gray-500">{page + 1} / {totalPages}</span>
            <button
              className="px-2 py-1 text-xs border rounded disabled:opacity-40"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >다음</button>
          </div>
        )}
      </div>
    </div>
  );
}
