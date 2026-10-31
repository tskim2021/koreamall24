import { useState, useEffect } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Switch } from"@/components/ui/switch";
import { Badge } from"@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Textarea } from"@/components/ui/textarea";
import { toast } from"sonner";
import {
 CreditCard,
 Globe,
 Hash,
 DollarSign,
 Building2,
 Eye,
 EyeOff,
 Save,
 RefreshCw,
 CheckCircle2,
 XCircle,
 AlertCircle,
 Info,
} from"lucide-react";

// ─── Provider metadata ─────────────────────────────────────────────────────────

type ProviderKey ="stripe"|"airwallex"|"2checkout"|"payoneer"|"paypal"|"bank_transfer"|"cookiepay";

interface FieldDef {
 key: string;
 extraKey?: string;
 label: string;
 placeholder?: string;
 required?: boolean;
 secret?: boolean;
 multiline?: boolean;
}

interface ProviderMeta {
 name: string;
 nameKo: string;
 description: string;
 icon: React.ReactNode;
 color: string;
 fields: FieldDef[];
 defaultCurrencies: string[];
 isManual?: boolean;
 docsUrl?: string;
}

const PROVIDERS: Record<ProviderKey, ProviderMeta> = {
 paypal: {
 name:"PayPal",
 nameKo:"페이팔",
 description:"PayPal 계정 / 신용카드 결제 (글로벌). Sandbox 테스트 지원.",
 icon: (
 <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
 <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788l.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
 </svg>
 ),
 color:"text-[#003087] bg-blue-50 border-blue-200",
 fields: [
 { key:"publicKey", label:"Client ID", placeholder:"AXxxxxxx...", required: true },
 { key:"secretKey", label:"Client Secret", placeholder:"Client Secret", required: true, secret: true },
 ],
 defaultCurrencies: ["USD","EUR","JPY","KRW"],
 docsUrl:"https://developer.paypal.com/dashboard/applications",
 },
 cookiepay: {
 name:"CookiePay (Pay2Pay Global)",
 nameKo:"쿠키페이",
 description:"한국 PG 결제. 카드, 가상계좌, 휴대폰 소액 결제 지원. (Pay2Pay Global)",
 icon: <span className="text-base">🍪</span>,
 color:"text-yellow-700 bg-yellow-50 border-yellow-300",
 isManual: false,
 fields: [
 { key:"publicKey", label:"연동 ID (API ID)", placeholder:"쿠키페이 관리자에서 발급된 API ID", required: true },
 { key:"secretKey", label:"시크릿 키 (Secret Key)", placeholder:"쿠키페이 관리자에서 발급된 시크릿 키", required: true, secret: true },
 ],
 defaultCurrencies: ["KRW"],
 docsUrl:"https://www.cookiepayments.com/docs/manual",
 },
 stripe: {
 name:"Stripe",
 nameKo:"스트라이프",
 description:"글로벌 카드 결제 플랫폼. Visa, Mastercard, JCB 등 지원.",
 icon: <CreditCard className="w-5 h-5"/>,
 color:"text-indigo-600 bg-indigo-50 border-indigo-200",
 fields: [
 { key:"publicKey", label:"Publishable Key (공개 키)", placeholder:"pk_test_...", required: true },
 { key:"secretKey", label:"Secret Key (비밀 키)", placeholder:"sk_test_...", required: true, secret: true },
 { key:"webhookSecret", label:"Webhook Secret", placeholder:"whsec_...", secret: true },
 ],
 defaultCurrencies: ["KRW","JPY","USD","EUR"],
 docsUrl:"https://dashboard.stripe.com/apikeys",
 },
 airwallex: {
 name:"Airwallex",
 nameKo:"에어월렉스",
 description:"크로스보더 결제 플랫폼. 다국가 통화 지원.",
 icon: <Globe className="w-5 h-5"/>,
 color:"text-blue-600 bg-blue-50 border-blue-200",
 fields: [
 { key:"publicKey", label:"Client ID", required: true },
 { key:"secretKey", label:"API Key", required: true, secret: true },
 { key:"webhookSecret", label:"Webhook Secret", secret: true },
 ],
 defaultCurrencies: ["KRW","JPY","USD","EUR","CNY"],
 docsUrl:"https://www.airwallex.com/docs/api",
 },
"2checkout": {
 name:"2Checkout (Verifone)",
 nameKo:"2체크아웃",
 description:"디지털 커머스 결제 플랫폼.",
 icon: <Hash className="w-5 h-5"/>,
 color:"text-orange-600 bg-orange-50 border-orange-200",
 fields: [
 { key:"publicKey", label:"Merchant Code (머천트 코드)", required: true },
 { key:"secretKey", label:"Secret Key (비밀 키)", required: true, secret: true },
 { key:"webhookSecret", label:"IPN Secret", secret: true },
 { key:"extraConfig", extraKey:"sellerId", label:"Seller ID", required: true },
 ],
 defaultCurrencies: ["USD","EUR","JPY"],
 docsUrl:"https://knowledgecenter.2checkout.com",
 },
 payoneer: {
 name:"Payoneer",
 nameKo:"페이오니아",
 description:"글로벌 송금 서비스. 수동 결제 확인 방식.",
 icon: <DollarSign className="w-5 h-5"/>,
 color:"text-red-600 bg-red-50 border-red-200",
 isManual: true,
 fields: [
 { key:"extraConfig", extraKey:"payoneerEmail", label:"Payoneer 이메일", placeholder:"your@payoneer.com", required: true },
 { key:"extraConfig", extraKey:"accountName", label:"계정 이름"},
 { key:"extraConfig", extraKey:"instructions", label:"결제 안내 메시지", multiline: true, placeholder:"고객에게 표시될 결제 안내 메시지를 입력하세요."},
 ],
 defaultCurrencies: ["USD","EUR","KRW","JPY"],
 },
 bank_transfer: {
 name:"Bank Transfer",
 nameKo:"무통장 송금",
 description:"계좌이체 / 무통장 입금. 수동 결제 확인 방식.",
 icon: <Building2 className="w-5 h-5"/>,
 color:"text-green-600 bg-green-50 border-green-200",
 isManual: true,
 fields: [
 { key:"extraConfig", extraKey:"bankName", label:"은행명", placeholder:"예: 신한은행", required: true },
 { key:"extraConfig", extraKey:"accountNumber", label:"계좌번호", placeholder:"예: 110-123-456789", required: true },
 { key:"extraConfig", extraKey:"accountHolder", label:"예금주", placeholder:"예: 주식회사 야쿠리", required: true },
 { key:"extraConfig", extraKey:"branchName", label:"지점명", placeholder:"예: 강남지점"},
 { key:"extraConfig", extraKey:"swiftCode", label:"SWIFT 코드 (해외 송금용)", placeholder:"예: SHBKKRSE"},
 { key:"extraConfig", extraKey:"paymentDeadlineDays", label:"입금 기한 (일수)", placeholder:"예: 3 (주문 후 3일 이내 입금 요망)"},
 { key:"extraConfig", extraKey:"instructions", label:"입금 안내 메시지", multiline: true, placeholder:"고객에게 표시될 입금 안내 메시지를 입력하세요."},
 ],
 defaultCurrencies: ["KRW","JPY"],
 },
};

const PROVIDER_ORDER: ProviderKey[] = ["stripe","airwallex","2checkout","payoneer","paypal","bank_transfer","cookiepay"];

// ─── Form state type ───────────────────────────────────────────────────────────

interface FormState {
 publicKey: string;
 secretKey: string;
 webhookSecret: string;
 mode:"test"|"live";
 displayName: string;
 extraConfig: Record<string, string>;
}

const emptyForm = (): FormState => ({
 publicKey:"",
 secretKey:"",
 webhookSecret:"",
 mode:"test",
 displayName:"",
 extraConfig: {},
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPaymentSettings() {
 const [activeTab, setActiveTab] = useState<ProviderKey>("stripe");
 const [forms, setForms] = useState<Record<ProviderKey, FormState>>({
 stripe: emptyForm(),
 airwallex: emptyForm(),
"2checkout": emptyForm(),
 payoneer: emptyForm(),
 paypal: emptyForm(),
 bank_transfer: emptyForm(),
 cookiepay: emptyForm(),
 });
 const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
 const [savingProvider, setSavingProvider] = useState<ProviderKey | null>(null);

 // Fetch settings
 const { data: settings, isLoading, refetch } = trpc.paymentSettings.adminList.useQuery();

 // Mutations
 const saveMutation = trpc.paymentSettings.adminSave.useMutation({
 onSuccess: () => {
 toast.success("결제 설정이 저장되었습니다.");
 refetch();
 setSavingProvider(null);
 },
 onError: (err) => {
 toast.error(err.message ||"저장에 실패했습니다.");
 setSavingProvider(null);
 },
 });

 const toggleMutation = trpc.paymentSettings.adminToggle.useMutation({
 onSuccess: (_, vars) => {
 toast.success(`${PROVIDERS[vars.provider].nameKo} 결제 수단이 ${vars.isActive ?"활성화":"비활성화"}되었습니다.`);
 refetch();
 },
 onError: (err) => {
 toast.error(err.message ||"오류가 발생했습니다.");
 },
 });

 // Populate forms from fetched settings
 useEffect(() => {
 if (!settings) return;
 const updated = { ...forms };
 settings.forEach((s) => {
 const provider = s.provider as ProviderKey;
 const extra = (s.extraConfig as Record<string, string>) || {};
 updated[provider] = {
 publicKey: s.publicKey ||"",
 secretKey: s.secretKey ||"",
 webhookSecret: s.webhookSecret ||"",
 mode: s.mode as"test"|"live",
 displayName: s.displayName ||"",
 extraConfig: extra,
 };
 });
 setForms(updated);
 }, [settings]);

 const getProviderSetting = (provider: ProviderKey) =>
 settings?.find((s) => s.provider === provider);

 const handleFieldChange = (
 provider: ProviderKey,
 field: keyof FormState,
 value: string
 ) => {
 setForms((prev) => ({
 ...prev,
 [provider]: { ...prev[provider], [field]: value },
 }));
 };

 const handleExtraChange = (provider: ProviderKey, key: string, value: string) => {
 setForms((prev) => ({
 ...prev,
 [provider]: {
 ...prev[provider],
 extraConfig: { ...prev[provider].extraConfig, [key]: value },
 },
 }));
 };

 const handleSave = (provider: ProviderKey) => {
 const form = forms[provider];
 setSavingProvider(provider);
 saveMutation.mutate({
 provider,
 displayName: form.displayName || undefined,
 publicKey: form.publicKey || undefined,
 secretKey: form.secretKey || undefined,
 webhookSecret: form.webhookSecret || undefined,
 extraConfig: Object.keys(form.extraConfig).length > 0 ? form.extraConfig : undefined,
 mode: form.mode,
 });
 };

 const handleToggle = (provider: ProviderKey, isActive: boolean) => {
 toggleMutation.mutate({ provider, isActive });
 };

 const toggleSecretVisibility = (key: string) => {
 setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
 };

 if (isLoading) {
 return (
 <AdminLayout>
 <div className="flex items-center justify-center h-96">
 <RefreshCw className="w-6 h-6 animate-spin text-gray-400"/>
 </div>
 </AdminLayout>
 );
 }

 return (
 <AdminLayout>
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-xl font-bold flex items-center gap-2">
 <CreditCard className="w-5 h-5 text-pink-600"/>
 결제 수단 설정
 </h2>
 <p className="text-xs text-gray-500 mt-0.5">
 결제 수단을 활성화하고 API 키를 설정하세요. 활성화된 수단만 결제 페이지에 표시됩니다.
 </p>
 </div>
 </div>

 {/* Provider status overview */}
 <div className="grid grid-cols-6 gap-3 mb-6">
 {PROVIDER_ORDER.map((provider) => {
 const setting = getProviderSetting(provider);
 const meta = PROVIDERS[provider];
 const isActive = setting?.isActive === 1;
 return (
 <button
 key={provider}
 onClick={() => setActiveTab(provider)}
 className={`p-3 rounded-xl border-2 text-left transition-all ${
 activeTab === provider
 ?"border-pink-400 bg-pink-50"
 :"border-gray-200 bg-white hover:border-gray-300"
 }`}
 >
 <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${meta.color}`}>
 {meta.icon}
 </div>
 <div className="text-xs font-semibold text-gray-800 truncate">{meta.nameKo}</div>
 <div className="flex items-center gap-1 mt-1">
 {isActive ? (
 <CheckCircle2 className="w-3 h-3 text-green-500"/>
 ) : (
 <XCircle className="w-3 h-3 text-gray-300"/>
 )}
 <span className={`text-[10px] ${isActive ?"text-green-600":"text-gray-400"}`}>
 {isActive ?"활성":"비활성"}
 </span>
 {meta.isManual && (
 <span className="text-[10px] text-amber-500 ml-1">수동</span>
 )}
 </div>
 </button>
 );
 })}
 </div>

 {/* Provider configuration tabs */}
 <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProviderKey)}>
 <TabsList className="mb-4 hidden">
 {PROVIDER_ORDER.map((p) => (
 <TabsTrigger key={p} value={p}>{PROVIDERS[p].nameKo}</TabsTrigger>
 ))}
 </TabsList>

 {PROVIDER_ORDER.map((provider) => {
 const meta = PROVIDERS[provider];
 const setting = getProviderSetting(provider);
 const form = forms[provider];
 const isActive = setting?.isActive === 1;
 const isSaving = savingProvider === provider;

 return (
 <TabsContent key={provider} value={provider}>
 <Card>
 <CardHeader className="pb-4">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${meta.color}`}>
 {meta.icon}
 </div>
 <div>
 <CardTitle className="text-lg">{meta.name}</CardTitle>
 <CardDescription>{meta.description}</CardDescription>
 </div>
 </div>
 <div className="flex items-center gap-3">
 {meta.isManual && (
 <Badge variant="outline"className="text-amber-600 border-amber-300 bg-amber-50">
 수동 결제
 </Badge>
 )}
 <div className="flex items-center gap-2">
 <span className="text-sm text-gray-600">
 {isActive ?"활성화됨":"비활성화됨"}
 </span>
 <Switch
 checked={isActive}
 onCheckedChange={(checked) => handleToggle(provider, checked)}
 disabled={toggleMutation.isPending}
 />
 </div>
 </div>
 </div>
 </CardHeader>

 <CardContent className="space-y-5">
 {/* Mode selector (not for manual providers) */}
 {!meta.isManual && (
 <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
 <div className="flex-1">
 <Label className="text-sm font-medium">운영 모드</Label>
 <p className="text-xs text-gray-500 mt-0.5">
 테스트 모드에서는 실제 결제가 이루어지지 않습니다.
 </p>
 </div>
 <Select
 value={form.mode}
 onValueChange={(v) => handleFieldChange(provider,"mode", v as"test"|"live")}
 >
 <SelectTrigger className="w-32">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="test">
 <span className="flex items-center gap-1.5">
 <AlertCircle className="w-3.5 h-3.5 text-amber-500"/>
 테스트
 </span>
 </SelectItem>
 <SelectItem value="live">
 <span className="flex items-center gap-1.5">
 <CheckCircle2 className="w-3.5 h-3.5 text-green-500"/>
 라이브
 </span>
 </SelectItem>
 </SelectContent>
 </Select>
 </div>
 )}

 {/* Display name */}
 <div className="space-y-1.5">
 <Label htmlFor={`${provider}-displayName`} className="text-sm font-medium">
 표시 이름 <span className="text-gray-400 font-normal">(선택)</span>
 </Label>
 <Input
 id={`${provider}-displayName`}
 value={form.displayName}
 onChange={(e) => handleFieldChange(provider,"displayName", e.target.value)}
 placeholder={`예: ${meta.nameKo}`}
 className="max-w-sm"
 />
 <p className="text-xs text-gray-400">결제 페이지에 표시될 이름입니다.</p>
 </div>

 {/* Provider-specific fields */}
 <div className="space-y-4">
 <div className="border-t pt-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
 <Info className="w-4 h-4 text-gray-400"/>
 API 설정
 {meta.docsUrl && (
 <a
 href={meta.docsUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs text-blue-500 hover:underline ml-1"
 >
 (공식 문서)
 </a>
 )}
 </h3>
 <div className="grid gap-4">
 {meta.fields.map((field) => {
 const fieldKey = `${provider}-${field.key}-${field.extraKey ||""}`;
 const isSecret = field.secret;
 const showSecret = showSecrets[fieldKey];
 const value =
 field.key ==="extraConfig"&& field.extraKey
 ? form.extraConfig[field.extraKey] ||""
 : (form[field.key as keyof FormState] as string) ||"";

 return (
 <div key={fieldKey} className="space-y-1.5">
 <Label htmlFor={fieldKey} className="text-sm font-medium">
 {field.label}
 {field.required && (
 <span className="text-red-500 ml-1">*</span>
 )}
 </Label>
 {field.multiline ? (
 <Textarea
 id={fieldKey}
 value={value}
 onChange={(e) => {
 if (field.key ==="extraConfig"&& field.extraKey) {
 handleExtraChange(provider, field.extraKey, e.target.value);
 } else {
 handleFieldChange(provider, field.key as keyof FormState, e.target.value);
 }
 }}
 placeholder={field.placeholder}
 rows={3}
 className="resize-none"
 />
 ) : (
 <div className="relative">
 <Input
 id={fieldKey}
 type={isSecret && !showSecret ?"password":"text"}
 value={value}
 onChange={(e) => {
 if (field.key ==="extraConfig"&& field.extraKey) {
 handleExtraChange(provider, field.extraKey, e.target.value);
 } else {
 handleFieldChange(provider, field.key as keyof FormState, e.target.value);
 }
 }}
 placeholder={field.placeholder}
 className={isSecret ?"pr-10 font-mono text-sm":"font-mono text-sm"}
 />
 {isSecret && (
 <button
 type="button"
 onClick={() => toggleSecretVisibility(fieldKey)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
 >
 {showSecret ? (
 <EyeOff className="w-4 h-4"/>
 ) : (
 <Eye className="w-4 h-4"/>
 )}
 </button>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* Save button */}
 <div className="flex items-center justify-between pt-4 border-t">
 <div className="text-xs text-gray-400">
 {setting?.updatedAt
 ? `마지막 수정: ${new Date(setting.updatedAt).toLocaleString("ko-KR")}`
 :"아직 저장된 설정이 없습니다."}
 </div>
 <Button
 onClick={() => handleSave(provider)}
 disabled={isSaving}
 className="bg-pink-600 hover:bg-pink-700 text-white"
 >
 {isSaving ? (
 <>
 <RefreshCw className="w-4 h-4 mr-2 animate-spin"/>
 저장 중...
 </>
 ) : (
 <>
 <Save className="w-4 h-4 mr-2"/>
 설정 저장
 </>
 )}
 </Button>
 </div>
 </CardContent>
 </Card>
 </TabsContent>
 );
 })}
 </Tabs>

 {/* CookiePay 가입 안내 */}
 {activeTab ==="cookiepay"&& (
 <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex gap-3">
 <span className="text-xl flex-shrink-0">🍪</span>
 <div className="text-sm text-yellow-800">
 <p className="font-semibold mb-2">쿠키페이 (Pay2Pay Global) 연동 방법</p>
 <ol className="space-y-1.5 text-xs list-decimal list-inside">
 <li>
 <a href="https://www.pay2payglobal.com"target="_blank"rel="noopener noreferrer"className="text-blue-600 hover:underline font-medium">
 pay2payglobal.com
 </a> 에서 회원가입 후 상점 신청을 완료하세요.
 </li>
 <li>승인 후 관리자 페이지 → 연동관리 메뉴에서 <strong>API ID</strong>와 <strong>Secret Key</strong>를 발급받으세요.</li>
 <li>위에서 발급받은 API ID와 Secret Key를 입력하고 저장하세요.</li>
 <li>연동 테스트 후 활성화 토글을 켜세요.</li>
 </ol>
 <div className="mt-2 flex gap-2">
 <a
 href="https://www.cookiepayments.com/docs/manual"
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
 >
 📖 공식 연동 메뉴얼 보기
 </a>
 <span className="text-gray-300">│</span>
 <a
 href="https://www.pay2payglobal.com/info/api"
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
 >
 🔗 API 안내 페이지
 </a>
 </div>
 </div>
 </div>
 )}

 {/* Info box */}
 <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
 <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"/>
 <div className="text-sm text-blue-700">
 <p className="font-semibold mb-1">결제 설정 안내</p>
 <ul className="space-y-1 text-xs">
 <li>• 활성화된 결제 수단만 결제 페이지에 표시됩니다.</li>
 <li>• 비밀 키(Secret Key)는 저장 후 마지막 4자리만 표시됩니다.</li>
 <li>• 무통장 송금 / Payoneer는 수동 결제 확인이 필요합니다.</li>
 <li>• 라이브 모드로 전환하기 전에 테스트 모드에서 충분히 테스트하세요.</li>
 <li>• 쿠키페이는 한국 PG사로 신용카드, 직불카드, 휴대폰 소액 결제를 지원합니다.</li>
 </ul>
 </div>
 </div>
 </div>
 </AdminLayout>
 );
}
