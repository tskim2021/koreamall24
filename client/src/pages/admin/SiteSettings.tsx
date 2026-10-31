import { useState, useEffect, useRef } from"react";
import { trpc } from"@/lib/trpc";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Alert, AlertDescription } from"@/components/ui/alert";
import { Badge } from"@/components/ui/badge";
import { toast } from"sonner";
import { ExternalLink, Info, Sparkles, Loader2, Upload, ImageIcon, X, Monitor, Smartphone, Globe } from"lucide-react";
import EmailSettingsForm from"@/components/admin/EmailSettingsForm";
import AdminLayout from"@/components/AdminLayout";
import { useState as _useState } from"react";

// ─── 배송지연 설정 폼 컴포넌트 ──────────────────────────────────────────────────
function DeliveryDelaySettingsForm({
 siteSettings,
 onSave,
 isSaving,
}: {
 siteSettings: Array<{ key: string; value: string | null }>;
 onSave: (key: string, value: string | null) => void;
 isSaving: boolean;
}) {
 const [shipmentDelayDays, setShipmentDelayDays] = _useState<string>(
 siteSettings.find(s => s.key ==="SHIPMENT_DELAY_DAYS")?.value ||"3"
 );
 const [deliveryDelayDays, setDeliveryDelayDays] = _useState<string>(
 siteSettings.find(s => s.key ==="DELIVERY_DELAY_DAYS")?.value ||"7"
 );
 const [deliveryDelayTemplate, setDeliveryDelayTemplate] = _useState<string>(
 siteSettings.find(s => s.key ==="DELIVERY_DELAY_EMAIL_TEMPLATE")?.value ||
"お客様のご注文商品の配送が遅延しております。\n\n理由：{reason}\n\nご不便をおかけして誠に申し訳ございません。\n解決次第、改めてご連絡いたします。"
 );

 return (
 <div className="space-y-6">
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Info className="w-5 h-5"/>발송지연 자동 감지 설정
 </CardTitle>
 <CardDescription>상품준비중 상태로 지정 일수 이상 경과한 주문을 자동으로 발송지연 탭에 표시합니다.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <Label htmlFor="shipment-delay-days">발송지연 기준 일수</Label>
 <p className="text-xs text-muted-foreground mb-2">상품준비중 상태로 이 일수 이상 경과하면 발송지연 탭에 자동 표시됩니다.</p>
 <div className="flex items-center gap-2">
 <Input
 id="shipment-delay-days"
 type="number"
 min={1}
 max={30}
 className="w-32"
 value={shipmentDelayDays}
 onChange={(e) => setShipmentDelayDays(e.target.value)}
 />
 <span className="text-sm text-muted-foreground">일 이상</span>
 </div>
 </div>
 <Button
 onClick={() => onSave("SHIPMENT_DELAY_DAYS", shipmentDelayDays)}
 disabled={isSaving}
 >
 {isSaving ?"저장 중...":"발송지연 기준 저장"}
 </Button>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Info className="w-5 h-5"/>배송완료지연 감지 설정
 </CardTitle>
 <CardDescription>배송중 상태로 지정 일수 이상 경과한 주문을 배송완료지연 탭에 자동 표시합니다.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <Label htmlFor="delivery-delay-days">배송완료지연 기준 일수</Label>
 <p className="text-xs text-muted-foreground mb-2">배송중 상태로 이 일수 이상 경과하면 배송완료지연 탭에 자동 표시됩니다.</p>
 <div className="flex items-center gap-2">
 <Input
 id="delivery-delay-days"
 type="number"
 min={1}
 max={60}
 className="w-32"
 value={deliveryDelayDays}
 onChange={(e) => setDeliveryDelayDays(e.target.value)}
 />
 <span className="text-sm text-muted-foreground">일 이상</span>
 </div>
 </div>
 <Button
 onClick={() => onSave("DELIVERY_DELAY_DAYS", deliveryDelayDays)}
 disabled={isSaving}
 >
 {isSaving ?"저장 중...":"배송완료지연 기준 저장"}
 </Button>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Info className="w-5 h-5"/>배송완료지연 고객 알림 이메일 템플릿
 </CardTitle>
 <CardDescription>배송완료지연 탭에서 고객 알림 발송 시 사용되는 이메일 본문 템플릿입니다. {'{reason}'}은 입력한 사유로 자동 대체됩니다.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <Label htmlFor="delivery-delay-template">이메일 본문 템플릿</Label>
 <Textarea
 id="delivery-delay-template"
 rows={8}
 value={deliveryDelayTemplate}
 onChange={(e) => setDeliveryDelayTemplate(e.target.value)}
 placeholder="{reason} 자리표시자를 사용하면 입력한 사유로 자동 대체됩니다."
 />
 </div>
 <Button
 onClick={() => onSave("DELIVERY_DELAY_EMAIL_TEMPLATE", deliveryDelayTemplate)}
 disabled={isSaving}
 >
 {isSaving ?"저장 중...":"템플릿 저장"}
 </Button>
 </CardContent>
 </Card>
 </div>
 );
}

// ─── Image Upload Helper Component ───────────────────────────────────────────
function ImageUploadBox({
 label,
 description,
 value,
 onUpload,
 isUploading,
 aspectHint,
 icon: Icon = ImageIcon,
}: {
 label: string;
 description?: string;
 value: string | null;
 onUpload: (file: File) => void;
 isUploading: boolean;
 aspectHint?: string;
 icon?: React.ElementType;
}) {
 const [isDragging, setIsDragging] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [preview, setPreview] = useState<string | null>(value);

 useEffect(() => { setPreview(value); }, [value]);

 const handleFile = (file: File) => {
 if (!file.type.startsWith("image/")) { toast.error("이미지 파일만 업로드할 수 있습니다."); return; }
 if (file.size > 5 * 1024 * 1024) { toast.error("파일 크기는 5MB 이하여야 합니다."); return; }
 const reader = new FileReader();
 reader.onload = (e) => setPreview(e.target?.result as string);
 reader.readAsDataURL(file);
 onUpload(file);
 };

 return (
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <Icon className="w-4 h-4 text-muted-foreground"/>
 <Label className="font-semibold">{label}</Label>
 {aspectHint && <span className="text-xs text-muted-foreground">({aspectHint})</span>}
 </div>
 {description && <p className="text-xs text-muted-foreground">{description}</p>}

 {preview ? (
 <div className="relative rounded-lg border bg-muted/30 p-2 flex items-center justify-center"style={{ minHeight: 80 }}>
 <img src={preview} alt={label} className="max-h-20 max-w-full object-contain rounded"/>
 <button
 onClick={() => { setPreview(null); if (fileInputRef.current) fileInputRef.current.value =""; }}
 className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition-colors"
 >
 <X className="w-3 h-3"/>
 </button>
 {isUploading && (
 <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
 <Loader2 className="w-6 h-6 text-white animate-spin"/>
 </div>
 )}
 </div>
 ) : (
 <div
 className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDragging ?"border-primary bg-primary/5":"border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"}`}
 onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
 onDragLeave={() => setIsDragging(false)}
 onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
 onClick={() => fileInputRef.current?.click()}
 >
 {isUploading ? (
 <div className="flex flex-col items-center gap-1">
 <Loader2 className="w-6 h-6 text-primary animate-spin"/>
 <p className="text-xs text-muted-foreground">업로드 중...</p>
 </div>
 ) : (
 <div className="flex flex-col items-center gap-1">
 <Upload className="w-5 h-5 text-muted-foreground/50"/>
 <p className="text-xs text-muted-foreground">클릭 또는 드래그하여 업로드</p>
 </div>
 )}
 </div>
 )}
 <input ref={fileInputRef} type="file"accept="image/*"className="hidden"onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
 </div>
 );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SiteSettings() {
 const { data: siteSettings, isLoading: loadingSiteSettings, refetch: refetchSiteSettings } = trpc.admin.siteSettings.getAll.useQuery();
 const { data: seoSettings, isLoading: loadingSeoSettings, refetch: refetchSeoSettings } = trpc.admin.seoSettings.getAll.useQuery();
 const { data: brandSettings, refetch: refetchBrandSettings } = trpc.admin.siteSettings.getBrandSettings.useQuery();

 const updateSiteSetting = trpc.admin.siteSettings.update.useMutation({
 onSuccess: () => { toast.success("설정이 저장되었습니다."); refetchSiteSettings(); refetchBrandSettings(); },
 onError: (e) => toast.error(`저장 실패: ${e.message}`),
 });

 const uploadBrandImage = trpc.admin.siteSettings.uploadBrandImage.useMutation({
 onSuccess: (data, variables) => {
 toast.success(`${variables.type} 이미지가 업로드되었습니다.`);
 refetchBrandSettings();
 },
 onError: (e) => toast.error(`업로드 실패: ${e.message}`),
 });

 const updateSeoSetting = trpc.admin.seoSettings.update.useMutation({
 onSuccess: () => { toast.success("SEO 설정이 저장되었습니다."); refetchSeoSettings(); },
 onError: (e) => toast.error(`저장 실패: ${e.message}`),
 });

 const aiGenerateSeo = trpc.admin.seoSettings.aiGenerate.useMutation({
 onSuccess: (data) => {
 setSeoTitle(data.title); setSeoDescription(data.description); setSeoKeywords(data.keywords);
 toast.success("AI SEO 자동 생성 완료! 내용을 확인 후 저장하세요.");
 },
 onError: (e) => toast.error(`AI 생성 실패: ${e.message}`),
 });

 const uploadOgImage = trpc.admin.seoSettings.uploadOgImage.useMutation({
 onSuccess: (data) => { setSeoOgImage(data.url); toast.success("OG 이미지가 업로드되었습니다."); },
 onError: (e) => toast.error(`업로드 실패: ${e.message}`),
 });

 // Site settings state
 const [sentryFrontend, setSentryFrontend] = useState("");
 const [sentryBackend, setSentryBackend] = useState("");
 const [ga4Id, setGa4Id] = useState("");

 // Brand settings state
 const [ogDefaultTitle, setOgDefaultTitle] = useState("");
 const [ogDefaultDescription, setOgDefaultDescription] = useState("");

 // SEO settings state
 const [selectedPage, setSelectedPage] = useState("home");
 const [seoTitle, setSeoTitle] = useState("");
 const [seoDescription, setSeoDescription] = useState("");
 const [seoKeywords, setSeoKeywords] = useState("");
 const [seoOgImage, setSeoOgImage] = useState("");
 const ogImageFileInputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 if (siteSettings) {
 setSentryFrontend(siteSettings.find(s => s.key ==="SENTRY_DSN_FRONTEND")?.value ||"");
 setSentryBackend(siteSettings.find(s => s.key ==="SENTRY_DSN_BACKEND")?.value ||"");
 setGa4Id(siteSettings.find(s => s.key ==="GA4_MEASUREMENT_ID")?.value ||"");
 }
 }, [siteSettings]);

 useEffect(() => {
 if (brandSettings) {
 setOgDefaultTitle(brandSettings.ogDefaultTitle ||"");
 setOgDefaultDescription(brandSettings.ogDefaultDescription ||"");
 }
 }, [brandSettings]);

 useEffect(() => {
 if (seoSettings) {
 const p = seoSettings.find(s => s.page === selectedPage);
 setSeoTitle(p?.title ||""); setSeoDescription(p?.description ||"");
 setSeoKeywords(p?.keywords ||""); setSeoOgImage(p?.ogImage ||"");
 }
 }, [seoSettings, selectedPage]);

 const handleUploadBrandImage = (type:"headerLogoPC"|"headerLogoMobile"|"footerLogoPC"|"footerLogoMobile"|"favicon"|"ogDefaultImage") => (file: File) => {
 const reader = new FileReader();
 reader.onload = (e) => {
 uploadBrandImage.mutate({ file: e.target?.result as string, fileName: file.name, contentType: file.type, type });
 };
 reader.readAsDataURL(file);
 };

 const handleSaveSentry = () => {
 updateSiteSetting.mutate({ key:"SENTRY_DSN_FRONTEND", value: sentryFrontend || null });
 updateSiteSetting.mutate({ key:"SENTRY_DSN_BACKEND", value: sentryBackend || null });
 };

 const handleSaveGA4 = () => {
 updateSiteSetting.mutate({ key:"GA4_MEASUREMENT_ID", value: ga4Id || null });
 };

 const handleSaveSNS = () => {
 updateSiteSetting.mutate({ key:"ogDefaultTitle", value: ogDefaultTitle || null });
 updateSiteSetting.mutate({ key:"ogDefaultDescription", value: ogDefaultDescription || null });
 };

 const handleSaveSEO = () => {
 updateSeoSetting.mutate({ page: selectedPage, title: seoTitle || null, description: seoDescription || null, keywords: seoKeywords || null, ogImage: seoOgImage || null });
 };

 const pageOptions = [
 { value:"home", label:"홈페이지"},
 { value:"products", label:"상품 목록"},
 { value:"category", label:"카테고리"},
 { value:"search", label:"검색 결과"},
 { value:"notice", label:"공지사항"},
 { value:"inquiry", label:"문의"},
 ];

 const titleLen = seoTitle.length;
 const descLen = seoDescription.length;

 if (loadingSiteSettings || loadingSeoSettings) {
 return <AdminLayout><div className="space-y-6"><div><h2 className="text-xl font-bold">사이트 설정</h2></div><div>로딩 중...</div></div></AdminLayout>;
 }

 return (
 <AdminLayout>
 <div className="space-y-6">
 <div>
 <h2 className="text-xl font-bold">사이트 설정</h2>
 <p className="text-xs text-muted-foreground mt-0.5">로고, 파비콘, SNS 공유, SEO, 분석 도구를 관리합니다.</p>
 </div>

 <Tabs defaultValue="brand"className="w-full">
 <TabsList className="grid w-full grid-cols-6">
 <TabsTrigger value="brand">브랜드 설정</TabsTrigger>
 <TabsTrigger value="seo">SEO 설정</TabsTrigger>
 <TabsTrigger value="sentry">Sentry</TabsTrigger>
 <TabsTrigger value="ga4">Google Analytics</TabsTrigger>
 <TabsTrigger value="email">이메일</TabsTrigger>
 <TabsTrigger value="delay">배송지연</TabsTrigger>
 </TabsList>

 {/* ── 브랜드 설정 탭 ─────────────────────────────────────────── */}
 <TabsContent value="brand">
 <div className="space-y-6">

 {/* 헤더 로고 */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-base flex items-center gap-2">
 <Monitor className="w-4 h-4"/> 헤더 로고
 </CardTitle>
 <CardDescription>사이트 상단 네비게이션에 표시되는 로고입니다.</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <ImageUploadBox
 label="PC 로고"
 description="데스크탑 헤더에 표시 (권장: 200×60px, PNG/SVG)"
 value={brandSettings?.headerLogoPC ?? null}
 onUpload={handleUploadBrandImage("headerLogoPC")}
 isUploading={uploadBrandImage.isPending && uploadBrandImage.variables?.type ==="headerLogoPC"}
 aspectHint="200×60px"
 icon={Monitor}
 />
 <ImageUploadBox
 label="모바일 로고"
 description="모바일 헤더에 표시 (권장: 120×40px, PNG/SVG)"
 value={brandSettings?.headerLogoMobile ?? null}
 onUpload={handleUploadBrandImage("headerLogoMobile")}
 isUploading={uploadBrandImage.isPending && uploadBrandImage.variables?.type ==="headerLogoMobile"}
 aspectHint="120×40px"
 icon={Smartphone}
 />
 </div>
 <Alert className="mt-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
 <Info className="w-4 h-4 text-blue-500"/>
 <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
 로고를 업로드하면 텍스트 로고(ococくすり)가 이미지 로고로 자동 교체됩니다. 투명 배경 PNG 또는 SVG를 권장합니다.
 </AlertDescription>
 </Alert>
 </CardContent>
 </Card>

 {/* 푸터 로고 */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-base flex items-center gap-2">
 <Globe className="w-4 h-4"/> 푸터 로고
 </CardTitle>
 <CardDescription>사이트 하단 푸터에 표시되는 로고입니다.</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <ImageUploadBox
 label="PC 로고"
 description="데스크탑 푸터에 표시 (권장: 160×50px)"
 value={brandSettings?.footerLogoPC ?? null}
 onUpload={handleUploadBrandImage("footerLogoPC")}
 isUploading={uploadBrandImage.isPending && uploadBrandImage.variables?.type ==="footerLogoPC"}
 aspectHint="160×50px"
 icon={Monitor}
 />
 <ImageUploadBox
 label="모바일 로고"
 description="모바일 푸터에 표시 (권장: 120×40px)"
 value={brandSettings?.footerLogoMobile ?? null}
 onUpload={handleUploadBrandImage("footerLogoMobile")}
 isUploading={uploadBrandImage.isPending && uploadBrandImage.variables?.type ==="footerLogoMobile"}
 aspectHint="120×40px"
 icon={Smartphone}
 />
 </div>
 </CardContent>
 </Card>

 {/* 파비콘 */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-base flex items-center gap-2">
 <Globe className="w-4 h-4"/> 파비콘 (Favicon)
 </CardTitle>
 <CardDescription>브라우저 탭과 북마크에 표시되는 아이콘입니다.</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="max-w-xs">
 <ImageUploadBox
 label="파비콘"
 description="권장: 32×32px 또는 64×64px ICO/PNG"
 value={brandSettings?.favicon ?? null}
 onUpload={handleUploadBrandImage("favicon")}
 isUploading={uploadBrandImage.isPending && uploadBrandImage.variables?.type ==="favicon"}
 aspectHint="32×32px"
 icon={Globe}
 />
 </div>
 <Alert className="mt-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
 <Info className="w-4 h-4 text-amber-500"/>
 <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
 파비콘은 브라우저 캐시로 인해 즉시 반영되지 않을 수 있습니다. 브라우저 강력 새로고침(Ctrl+Shift+R)으로 확인하세요.
 </AlertDescription>
 </Alert>
 </CardContent>
 </Card>

 {/* SNS/카카오/라인 공유 설정 */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-base flex items-center gap-2">
 <Globe className="w-4 h-4"/> SNS 공유 설정 (카카오톡 · 라인 · 트위터)
 <Badge variant="secondary"className="text-xs">OG 태그</Badge>
 </CardTitle>
 <CardDescription>
 카카오톡, 라인, 트위터 등 SNS에서 링크를 공유할 때 표시되는 이미지와 텍스트를 설정합니다.
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-5">

 {/* OG 이미지 */}
 <div>
 <Label className="font-semibold mb-1 block">공유 썸네일 이미지</Label>
 <p className="text-xs text-muted-foreground mb-2">SNS 공유 시 표시되는 대표 이미지입니다. (권장: 1200×630px, 최대 5MB)</p>

 {/* 미리보기 카드 - 카카오톡 스타일 */}
 {brandSettings?.ogDefaultImage && (
 <div className="mb-4 max-w-xs border rounded-xl overflow-hidden bg-white">
 <img src={brandSettings.ogDefaultImage} alt="OG Preview"className="w-full aspect-[1200/630] object-cover"/>
 <div className="p-3">
 <p className="text-xs font-bold text-gray-900 line-clamp-2">{ogDefaultTitle ||"사이트 제목"}</p>
 <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ogDefaultDescription ||"사이트 설명"}</p>
 <p className="text-xs text-blue-500 mt-1">cocokusuri.com</p>
 </div>
 </div>
 )}

 <ImageUploadBox
 label="공유 이미지 업로드"
 description="카카오톡/라인/트위터 공유 시 표시 (1200×630px)"
 value={brandSettings?.ogDefaultImage ?? null}
 onUpload={handleUploadBrandImage("ogDefaultImage")}
 isUploading={uploadBrandImage.isPending && uploadBrandImage.variables?.type ==="ogDefaultImage"}
 aspectHint="1200×630px"
 icon={ImageIcon}
 />
 </div>

 {/* 공유 제목 */}
 <div>
 <div className="flex items-center justify-between mb-1">
 <Label htmlFor="og-title"className="font-semibold">공유 제목</Label>
 <span className={`text-xs ${ogDefaultTitle.length >= 20 && ogDefaultTitle.length <= 60 ?"text-green-600":"text-muted-foreground"}`}>
 {ogDefaultTitle.length}자
 </span>
 </div>
 <Input
 id="og-title"
 placeholder="日本医薬品・健康商品の個人輸入 | 正規品保証・送料無料"
 value={ogDefaultTitle}
 onChange={(e) => setOgDefaultTitle(e.target.value)}
 />
 <p className="text-xs text-muted-foreground mt-1">카카오/라인/트위터 공유 시 표시되는 제목 (20~60자 권장)</p>
 </div>

 {/* 공유 설명 */}
 <div>
 <div className="flex items-center justify-between mb-1">
 <Label htmlFor="og-desc"className="font-semibold">공유 설명</Label>
 <span className={`text-xs ${ogDefaultDescription.length >= 50 && ogDefaultDescription.length <= 160 ?"text-green-600":"text-muted-foreground"}`}>
 {ogDefaultDescription.length}자
 </span>
 </div>
 <Textarea
 id="og-desc"
 placeholder="日本医薬品・健康商品の個人輸入代行サービス。正規品保証、24時間対応、送料無料。"
 value={ogDefaultDescription}
 onChange={(e) => setOgDefaultDescription(e.target.value)}
 rows={3}
 />
 <p className="text-xs text-muted-foreground mt-1">카카오/라인/트위터 공유 시 표시되는 설명 (50~160자 권장)</p>
 </div>

 <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
 <Info className="w-4 h-4 text-green-500"/>
 <AlertDescription className="text-xs text-green-700 dark:text-green-300">
 <strong>적용 범위:</strong> 여기서 설정한 이미지/제목/설명은 상품 상세 페이지를 제외한 모든 페이지의 기본 공유 정보로 사용됩니다. 상품 페이지는 각 상품의 이미지와 이름이 자동으로 사용됩니다.
 </AlertDescription>
 </Alert>

 <Button onClick={handleSaveSNS} disabled={updateSiteSetting.isPending}>
 {updateSiteSetting.isPending ?"저장 중...":"SNS 공유 설정 저장"}
 </Button>
 </CardContent>
 </Card>
 </div>
 </TabsContent>

 {/* ── SEO 설정 탭 ─────────────────────────────────────────────── */}
 <TabsContent value="seo">
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Info className="w-5 h-5"/>
 SEO 설정
 <Badge variant="secondary"className="ml-1 text-xs">AI 자동 생성 지원</Badge>
 </CardTitle>
 <CardDescription>
 검색 엔진 최적화를 위한 메타 태그를 페이지별로 설정합니다. AI 자동 생성 버튼으로 일본어 최적화 SEO 문구를 즉시 생성할 수 있습니다.
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-6">
 <div className="flex items-end gap-3">
 <div className="flex-1">
 <Label htmlFor="page-select">페이지 선택</Label>
 <select
 id="page-select"
 className="w-full mt-1 p-2 border rounded-md bg-background text-sm"
 value={selectedPage}
 onChange={(e) => setSelectedPage(e.target.value)}
 >
 {pageOptions.map(opt => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </select>
 </div>
 <Button
 onClick={() => aiGenerateSeo.mutate({ page: selectedPage as"home"|"products"|"category"|"search"|"notice"|"inquiry"})}
 disabled={aiGenerateSeo.isPending}
 className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white gap-2 shrink-0"
 >
 {aiGenerateSeo.isPending ? <><Loader2 className="w-4 h-4 animate-spin"/>AI 생성 중...</> : <><Sparkles className="w-4 h-4"/>AI 자동 생성 (日本語)</>}
 </Button>
 </div>

 <div>
 <div className="flex items-center justify-between mb-1">
 <Label htmlFor="seo-title">페이지 제목 (Title)</Label>
 <span className={`text-xs ${titleLen >= 30 && titleLen <= 60 ?"text-green-600": titleLen > 60 ?"text-red-500":"text-muted-foreground"}`}>
 {titleLen}자 {titleLen >= 30 && titleLen <= 60 ?"✓": titleLen > 0 ?"(30~60자 권장)":""}
 </span>
 </div>
 <Input id="seo-title"placeholder="例: 日本の医薬品・健康食品を個人輸入 | 正規品保証・送料無料"value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
 </div>

 <div>
 <div className="flex items-center justify-between mb-1">
 <Label htmlFor="seo-description">페이지 설명 (Description)</Label>
 <span className={`text-xs ${descLen >= 70 && descLen <= 160 ?"text-green-600": descLen > 160 ?"text-red-500":"text-muted-foreground"}`}>
 {descLen}자 {descLen >= 70 && descLen <= 160 ?"✓": descLen > 0 ?"(70~160자 권장)":""}
 </span>
 </div>
 <Textarea id="seo-description"placeholder="例: 日本の医薬品・健康食品・化粧品を安心して個人輸入。"value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} />
 </div>

 <div>
 <Label htmlFor="seo-keywords">키워드 (Keywords)</Label>
 <Input id="seo-keywords"placeholder="例: 日本医薬品, 健康食品, 個人輸入"value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} />
 </div>

 <div>
 <Label>페이지 OG 이미지 URL</Label>
 <div className="flex gap-2 mt-1">
 <Input placeholder="https://..."value={seoOgImage} onChange={(e) => setSeoOgImage(e.target.value)} />
 <Button variant="outline"size="sm"className="shrink-0 gap-1"onClick={() => ogImageFileInputRef.current?.click()} disabled={uploadOgImage.isPending}>
 {uploadOgImage.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
 업로드
 </Button>
 </div>
 <input ref={ogImageFileInputRef} type="file"accept="image/*"className="hidden"onChange={(e) => {
 const file = e.target.files?.[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = (ev) => uploadOgImage.mutate({ file: ev.target?.result as string, fileName: file.name, contentType: file.type });
 reader.readAsDataURL(file);
 }} />
 </div>

 <div className="flex gap-3 pt-2">
 <Button onClick={handleSaveSEO} disabled={updateSeoSetting.isPending}>
 {updateSeoSetting.isPending ?"저장 중...":"SEO 저장"}
 </Button>
 </div>
 </CardContent>
 </Card>
 </TabsContent>

 {/* ── Sentry 탭 ─────────────────────────────────────────────── */}
 <TabsContent value="sentry">
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2"><Info className="w-5 h-5"/>Sentry 에러 추적</CardTitle>
 <CardDescription>실시간 에러 모니터링을 위한 Sentry DSN을 설정합니다.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <Alert>
 <AlertDescription>
 <p className="font-semibold mb-1">가입 방법</p>
 <ol className="list-decimal list-inside space-y-1 text-sm">
 <li><a href="https://sentry.io"target="_blank"rel="noopener noreferrer"className="text-primary hover:underline inline-flex items-center gap-1">Sentry 웹사이트 <ExternalLink className="w-3 h-3"/></a>에서 무료 계정 생성</li>
 <li>새 프로젝트 생성 (React, Node.js 선택)</li>
 <li>프로젝트 설정에서 DSN 복사 후 아래 입력</li>
 </ol>
 </AlertDescription>
 </Alert>
 <div>
 <Label htmlFor="sentry-frontend">프론트엔드 Sentry DSN</Label>
 <Input id="sentry-frontend"placeholder="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"value={sentryFrontend} onChange={(e) => setSentryFrontend(e.target.value)} />
 </div>
 <div>
 <Label htmlFor="sentry-backend">백엔드 Sentry DSN</Label>
 <Input id="sentry-backend"placeholder="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"value={sentryBackend} onChange={(e) => setSentryBackend(e.target.value)} />
 </div>
 <Button onClick={handleSaveSentry} disabled={updateSiteSetting.isPending}>
 {updateSiteSetting.isPending ?"저장 중...":"Sentry 설정 저장"}
 </Button>
 </CardContent>
 </Card>
 </TabsContent>

 {/* ── GA4 탭 ─────────────────────────────────────────────────── */}
 <TabsContent value="ga4">
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2"><Info className="w-5 h-5"/>Google Analytics 4</CardTitle>
 <CardDescription>웹사이트 방문자 분석을 위한 GA4 측정 ID를 설정합니다.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <Alert>
 <AlertDescription>
 <p className="font-semibold mb-1">설정 방법</p>
 <ol className="list-decimal list-inside space-y-1 text-sm">
 <li><a href="https://analytics.google.com"target="_blank"rel="noopener noreferrer"className="text-primary hover:underline inline-flex items-center gap-1">Google Analytics <ExternalLink className="w-3 h-3"/></a>에서 속성 생성</li>
 <li>데이터 스트림 추가 (웹 선택)</li>
 <li>측정 ID 복사 (G-XXXXXXXXXX 형식)</li>
 </ol>
 </AlertDescription>
 </Alert>
 <div>
 <Label htmlFor="ga4-id">GA4 측정 ID</Label>
 <Input id="ga4-id"placeholder="G-XXXXXXXXXX"value={ga4Id} onChange={(e) => setGa4Id(e.target.value)} />
 </div>
 <Button onClick={handleSaveGA4} disabled={updateSiteSetting.isPending}>
 {updateSiteSetting.isPending ?"저장 중...":"GA4 설정 저장"}
 </Button>
 </CardContent>
 </Card>
 </TabsContent>
 {/* ── Email 탭 ──────────────────────────────────────────────────────────────── */}
 <TabsContent value="email">
 <EmailSettingsForm />
 </TabsContent>

 {/* ── 배송지연 설정 탭 ──────────────────────────────────────────────────────────────── */}
 <TabsContent value="delay">
 <DeliveryDelaySettingsForm
 siteSettings={siteSettings || []}
 onSave={(key, value) => updateSiteSetting.mutate({ key, value })}
 isSaving={updateSiteSetting.isPending}
 />
 </TabsContent>
 </Tabs>
 </div>
 </AdminLayout>
 );
}
