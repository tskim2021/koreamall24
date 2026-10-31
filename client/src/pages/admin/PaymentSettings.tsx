import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Eye, EyeOff, CreditCard, Building2, CheckCircle2, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";

// PayPal 로고 SVG
const PayPalIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" fill="#003087"/>
    <path d="M20.307 6.917c-.16-.045-.325-.085-.497-.12a10.87 10.87 0 0 0-1.717-.13h-5.203a.918.918 0 0 0-.917.785L10.8 15.39l-.03.19a1.053 1.053 0 0 1 1.04-.9h2.19c4.298 0 7.664-1.747 8.647-6.797.03-.149.054-.294.077-.437a5.67 5.67 0 0 0-.87-.43l-.547-.1z" fill="#0070E0"/>
    <path d="M12.073 7.452a.918.918 0 0 1 .917-.785h5.203c.617 0 1.193.04 1.717.13.15.025.297.054.44.087.127.03.25.063.37.1l.547.1c.31.08.6.183.87.43-.983-5.05-4.349-6.797-8.647-6.797H5.998c-.524 0-.972.382-1.054.9L1.837 20.597a.641.641 0 0 0 .633.74h4.606l1.158-7.337 1.839-6.548z" fill="#001C64"/>
  </svg>
);

type ProviderState = {
  name: string;
  enabled: boolean;
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  mode: string;
};

export default function AdminPaymentSettings() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // 카드 결제 providers
  const [cardProviders, setCardProviders] = useState<Record<string, ProviderState>>({
    stripe: { name: "Stripe", enabled: false, publicKey: "", secretKey: "", webhookSecret: "", mode: "test" },
    airwallex: { name: "Airwallex", enabled: false, publicKey: "", secretKey: "", webhookSecret: "", mode: "test" },
    eximbay: { name: "Eximbay", enabled: false, publicKey: "", secretKey: "", webhookSecret: "", mode: "test" },
  });

  // PayPal
  const [paypal, setPaypal] = useState({
    enabled: false,
    clientId: "",
    clientSecret: "",
    mode: "sandbox" as "sandbox" | "live",
  });

  // 은행 이체
  const [bankTransfer, setBankTransfer] = useState({
    enabled: false,
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    bankCode: "",
  });

  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: isAdmin } = trpc.admin.isAdmin.useQuery();
  const upsertPaymentSetting = trpc.admin.paymentSettings.upsert.useMutation();
  const { data: paymentSettings, refetch: refetchPaymentSettings } = trpc.admin.paymentSettings.getAll.useQuery();

  // 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) setLocation("/login");
    if (!authLoading && isAdmin === false) setLocation("/");
  }, [authLoading, user, isAdmin, setLocation]);

  // DB에서 기존 설정값 로드
  useEffect(() => {
    if (!paymentSettings) return;
    (paymentSettings as any[]).forEach((setting) => {
      if (setting.provider === "paypal") {
        setPaypal({
          enabled: !!setting.isActive,
          clientId: setting.publicKey || "",
          clientSecret: setting.secretKey || "",
          mode: setting.mode === "live" ? "live" : "sandbox",
        });
      } else if (setting.provider === "bank_transfer") {
        try {
          const meta = setting.extraConfig || (setting.metadata ? JSON.parse(setting.metadata) : {});
          setBankTransfer({
            enabled: !!setting.isActive,
            bankName: meta.bankName || "",
            accountHolder: meta.accountHolder || "",
            accountNumber: meta.accountNumber || "",
            bankCode: meta.bankCode || "",
          });
        } catch {}
      } else if (["stripe", "airwallex", "eximbay"].includes(setting.provider)) {
        setCardProviders((prev) => ({
          ...prev,
          [setting.provider]: {
            ...prev[setting.provider],
            enabled: !!setting.isActive,
            publicKey: setting.publicKey || "",
            secretKey: setting.secretKey || "",
            webhookSecret: setting.webhookSecret || "",
            mode: setting.mode || "test",
          },
        }));
      }
    });
  }, [paymentSettings]);

  const handleCardProviderChange = (provider: string, field: string, value: any) => {
    setCardProviders((prev) => ({ ...prev, [provider]: { ...prev[provider], [field]: value } }));
  };

  const handleSaveCardProvider = (provider: string) => {
    const data = cardProviders[provider];
    if (data.enabled && (!data.publicKey || !data.secretKey)) {
      toast.error("활성화하려면 공개 키와 비밀 키를 모두 입력해주세요.");
      return;
    }
    setSaving(provider);
    upsertPaymentSetting.mutate(
      {
        provider: provider as any,
        isActive: data.enabled,
        displayName: data.name,
        publicKey: data.publicKey,
        secretKey: data.secretKey,
        webhookSecret: data.webhookSecret,
        mode: data.mode as any,
      },
      {
        onSuccess: () => {
          toast.success(`${data.name} 설정이 저장되었습니다.`);
          refetchPaymentSettings();
          setSaving(null);
        },
        onError: () => {
          toast.error(`${data.name} 설정 저장 실패`);
          setSaving(null);
        },
      }
    );
  };

  const handleSavePayPal = () => {
    if (paypal.enabled && (!paypal.clientId || !paypal.clientSecret)) {
      toast.error("활성화하려면 Client ID와 Client Secret을 모두 입력해주세요.");
      return;
    }
    setSaving("paypal");
    upsertPaymentSetting.mutate(
      {
        provider: "paypal",
        displayName: "PayPal",
        isActive: paypal.enabled,
        publicKey: paypal.clientId,
        secretKey: paypal.clientSecret,
        mode: paypal.mode === "live" ? "live" : "test",
      },
      {
        onSuccess: () => {
          toast.success("PayPal 설정이 저장되었습니다.");
          refetchPaymentSettings();
          setSaving(null);
        },
        onError: () => {
          toast.error("PayPal 설정 저장 실패");
          setSaving(null);
        },
      }
    );
  };

  const handleSaveBankTransfer = () => {
    if (bankTransfer.enabled && (!bankTransfer.bankName || !bankTransfer.accountHolder || !bankTransfer.accountNumber)) {
      toast.error("활성화하려면 은행명, 예금주, 계좌번호를 입력해주세요.");
      return;
    }
    setSaving("bank_transfer");
      upsertPaymentSetting.mutate(
      {
        provider: "bank_transfer",
        displayName: "銀行振込（無通帳送金）",
        isActive: bankTransfer.enabled,
        mode: "live",
        extraConfig: {
          bankName: bankTransfer.bankName,
          accountHolder: bankTransfer.accountHolder,
          accountNumber: bankTransfer.accountNumber,
          bankCode: bankTransfer.bankCode,
        },
      },
      {
        onSuccess: () => {
          toast.success("은행송금 설정이 저장되었습니다.");
          refetchPaymentSettings();
          setSaving(null);
        },
        onError: () => {
          toast.error("은행송금 설정 저장 실패");
          setSaving(null);
        },
      }
    );
  };

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      </AdminLayout>
    );
  }

  // 결제수단 카드 공통 헤더 컴포넌트
  const ProviderHeader = ({
    icon,
    title,
    description,
    enabled,
    onToggle,
    hasKeys,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    enabled: boolean;
    onToggle: (v: boolean) => void;
    hasKeys: boolean;
  }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            {title}
            {enabled ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-medium">활성화</Badge>
            ) : (
              <Badge variant="outline" className="text-gray-400 text-xs font-medium">비활성화</Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!hasKeys && !enabled && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">키 미입력</span>
        )}
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={!hasKeys && !enabled}
        />
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-xl font-bold">결제 수단 설정</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            각 결제 수단의 API 키를 입력하고 저장한 후 활성화 토글을 켜세요.
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            키를 입력하고 <strong>저장</strong>한 후 활성화 스위치를 켜야 결제 페이지에 표시됩니다.
            활성화된 결제 수단만 고객에게 노출됩니다.
          </AlertDescription>
        </Alert>

        {/* ── Stripe ── */}
        <Card>
          <CardHeader>
            <ProviderHeader
              icon={<CreditCard className="w-5 h-5 text-indigo-600" />}
              title="Stripe"
              description="신용카드 / 체크카드 결제 (Visa, Mastercard 등)"
              enabled={cardProviders.stripe.enabled}
              hasKeys={!!(cardProviders.stripe.publicKey && cardProviders.stripe.secretKey)}
              onToggle={(v) => handleCardProviderChange("stripe", "enabled", v)}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">모드</Label>
                <Select
                  value={cardProviders.stripe.mode}
                  onValueChange={(v) => handleCardProviderChange("stripe", "mode", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">테스트 (Sandbox)</SelectItem>
                    <SelectItem value="live">라이브 (실결제)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">공개 키 (Publishable Key)</Label>
              <Input
                placeholder="pk_test_..."
                className="h-8 text-xs"
                value={cardProviders.stripe.publicKey}
                onChange={(e) => handleCardProviderChange("stripe", "publicKey", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">비밀 키 (Secret Key)</Label>
              <div className="flex gap-2">
                <Input
                  type={showSecrets.stripe ? "text" : "password"}
                  placeholder="sk_test_..."
                  className="h-8 text-xs"
                  value={cardProviders.stripe.secretKey}
                  onChange={(e) => handleCardProviderChange("stripe", "secretKey", e.target.value)}
                />
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setShowSecrets((p) => ({ ...p, stripe: !p.stripe }))}>
                  {showSecrets.stripe ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Webhook Secret</Label>
              <div className="flex gap-2">
                <Input
                  type={showSecrets.stripe_wh ? "text" : "password"}
                  placeholder="whsec_..."
                  className="h-8 text-xs"
                  value={cardProviders.stripe.webhookSecret}
                  onChange={(e) => handleCardProviderChange("stripe", "webhookSecret", e.target.value)}
                />
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setShowSecrets((p) => ({ ...p, stripe_wh: !p.stripe_wh }))}>
                  {showSecrets.stripe_wh ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            <Button
              onClick={() => handleSaveCardProvider("stripe")}
              disabled={saving === "stripe"}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              size="sm"
            >
              {saving === "stripe" ? "저장 중..." : "Stripe 설정 저장"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Airwallex ── */}
        <Card>
          <CardHeader>
            <ProviderHeader
              icon={<CreditCard className="w-5 h-5 text-blue-500" />}
              title="Airwallex"
              description="글로벌 카드 결제 (아시아 최적화)"
              enabled={cardProviders.airwallex.enabled}
              hasKeys={!!(cardProviders.airwallex.publicKey && cardProviders.airwallex.secretKey)}
              onToggle={(v) => handleCardProviderChange("airwallex", "enabled", v)}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">모드</Label>
                <Select
                  value={cardProviders.airwallex.mode}
                  onValueChange={(v) => handleCardProviderChange("airwallex", "mode", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">테스트 (Demo)</SelectItem>
                    <SelectItem value="live">라이브 (실결제)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">API Key (Client ID)</Label>
              <Input
                placeholder="API Key"
                className="h-8 text-xs"
                value={cardProviders.airwallex.publicKey}
                onChange={(e) => handleCardProviderChange("airwallex", "publicKey", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">API Secret</Label>
              <div className="flex gap-2">
                <Input
                  type={showSecrets.airwallex ? "text" : "password"}
                  placeholder="API Secret"
                  className="h-8 text-xs"
                  value={cardProviders.airwallex.secretKey}
                  onChange={(e) => handleCardProviderChange("airwallex", "secretKey", e.target.value)}
                />
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setShowSecrets((p) => ({ ...p, airwallex: !p.airwallex }))}>
                  {showSecrets.airwallex ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            <Button
              onClick={() => handleSaveCardProvider("airwallex")}
              disabled={saving === "airwallex"}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              {saving === "airwallex" ? "저장 중..." : "Airwallex 설정 저장"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Eximbay ── */}
        <Card>
          <CardHeader>
            <ProviderHeader
              icon={<CreditCard className="w-5 h-5 text-teal-600" />}
              title="Eximbay"
              description="한국 / 일본 특화 카드 결제"
              enabled={cardProviders.eximbay.enabled}
              hasKeys={!!(cardProviders.eximbay.publicKey && cardProviders.eximbay.secretKey)}
              onToggle={(v) => handleCardProviderChange("eximbay", "enabled", v)}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">모드</Label>
                <Select
                  value={cardProviders.eximbay.mode}
                  onValueChange={(v) => handleCardProviderChange("eximbay", "mode", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">테스트</SelectItem>
                    <SelectItem value="live">라이브 (실결제)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Merchant ID</Label>
              <Input
                placeholder="Merchant ID"
                className="h-8 text-xs"
                value={cardProviders.eximbay.publicKey}
                onChange={(e) => handleCardProviderChange("eximbay", "publicKey", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">API Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showSecrets.eximbay ? "text" : "password"}
                  placeholder="API Key"
                  className="h-8 text-xs"
                  value={cardProviders.eximbay.secretKey}
                  onChange={(e) => handleCardProviderChange("eximbay", "secretKey", e.target.value)}
                />
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setShowSecrets((p) => ({ ...p, eximbay: !p.eximbay }))}>
                  {showSecrets.eximbay ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            <Button
              onClick={() => handleSaveCardProvider("eximbay")}
              disabled={saving === "eximbay"}
              className="w-full bg-teal-600 hover:bg-teal-700"
              size="sm"
            >
              {saving === "eximbay" ? "저장 중..." : "Eximbay 설정 저장"}
            </Button>
          </CardContent>
        </Card>

        {/* ── PayPal ── */}
        <Card className="border-blue-200">
          <CardHeader>
            <ProviderHeader
              icon={<PayPalIcon />}
              title="PayPal"
              description="PayPal 계정 / 신용카드 결제 (글로벌)"
              enabled={paypal.enabled}
              hasKeys={!!(paypal.clientId && paypal.clientSecret)}
              onToggle={(v) => setPaypal((p) => ({ ...p, enabled: v }))}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200 py-2">
              <AlertDescription className="text-xs text-blue-700">
                PayPal Developer 계정에서 앱을 생성하여 Client ID와 Secret을 발급받으세요.{" "}
                <a
                  href="https://developer.paypal.com/dashboard/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium inline-flex items-center gap-0.5"
                >
                  PayPal 개발자 대시보드 <ExternalLink className="w-3 h-3" />
                </a>
              </AlertDescription>
            </Alert>
            <div>
              <Label className="text-xs">모드</Label>
              <Select
                value={paypal.mode}
                onValueChange={(v) => setPaypal((p) => ({ ...p, mode: v as "sandbox" | "live" }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">샌드박스 (테스트)</SelectItem>
                  <SelectItem value="live">라이브 (실결제)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Client ID</Label>
              <Input
                placeholder="AXxxxxxx..."
                className="h-8 text-xs"
                value={paypal.clientId}
                onChange={(e) => setPaypal((p) => ({ ...p, clientId: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Client Secret</Label>
              <div className="flex gap-2">
                <Input
                  type={showSecrets.paypal ? "text" : "password"}
                  placeholder="Client Secret"
                  className="h-8 text-xs"
                  value={paypal.clientSecret}
                  onChange={(e) => setPaypal((p) => ({ ...p, clientSecret: e.target.value }))}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setShowSecrets((p) => ({ ...p, paypal: !p.paypal }))}
                >
                  {showSecrets.paypal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSavePayPal}
              disabled={saving === "paypal"}
              className="w-full bg-[#003087] hover:bg-[#001C64]"
              size="sm"
            >
              {saving === "paypal" ? "저장 중..." : "PayPal 설정 저장"}
            </Button>
          </CardContent>
        </Card>

        {/* ── 은행 이체 ── */}
        <Card>
          <CardHeader>
            <ProviderHeader
              icon={<Building2 className="w-5 h-5 text-gray-600" />}
              title="銀行振込（無通帳送金）"
              description="일본 은행 계좌 이체 결제"
              enabled={bankTransfer.enabled}
              hasKeys={!!(bankTransfer.bankName && bankTransfer.accountHolder && bankTransfer.accountNumber)}
              onToggle={(v) => setBankTransfer((p) => ({ ...p, enabled: v }))}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">은행명 (銀行名)</Label>
              <Input
                placeholder="예: 三菱UFJ銀行"
                className="h-8 text-xs"
                value={bankTransfer.bankName}
                onChange={(e) => setBankTransfer((p) => ({ ...p, bankName: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">예금주명 (口座名義)</Label>
              <Input
                placeholder="예: 株式会社ここくすり"
                className="h-8 text-xs"
                value={bankTransfer.accountHolder}
                onChange={(e) => setBankTransfer((p) => ({ ...p, accountHolder: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">계좌번호 (口座番号)</Label>
              <Input
                placeholder="예: 普通 1234567"
                className="h-8 text-xs"
                value={bankTransfer.accountNumber}
                onChange={(e) => setBankTransfer((p) => ({ ...p, accountNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">은행 코드 (金融機関コード, 선택)</Label>
              <Input
                placeholder="예: 0005"
                className="h-8 text-xs"
                value={bankTransfer.bankCode}
                onChange={(e) => setBankTransfer((p) => ({ ...p, bankCode: e.target.value }))}
              />
            </div>
            <Button
              onClick={handleSaveBankTransfer}
              disabled={saving === "bank_transfer"}
              className="w-full"
              size="sm"
            >
              {saving === "bank_transfer" ? "저장 중..." : "은행송금 설정 저장"}
            </Button>
          </CardContent>
        </Card>

        {/* 현재 활성화된 결제 수단 요약 */}
        <Card className="bg-gray-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              현재 활성화된 결제 수단
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {paymentSettings && (paymentSettings as any[]).filter((s) => s.isActive).length > 0 ? (
                (paymentSettings as any[])
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <Badge key={s.provider} className="bg-green-100 text-green-800 border-green-200">
                      {s.displayName || s.provider}
                    </Badge>
                  ))
              ) : (
                <span className="text-xs text-muted-foreground">활성화된 결제 수단이 없습니다.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
