import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Mail, Users, ShoppingBag, MessageCircle, Gift, CalendarDays, Info,
  CheckCircle2, XCircle, SkipForward, RefreshCw, BarChart3, ChevronLeft, ChevronRight,
  TrendingUp, Calendar, Eye, Send, Settings,
} from "lucide-react";
import { Link } from "wouter";

// ─────────────────────────────────────────────
// 공통 상수
// ─────────────────────────────────────────────
const EMAIL_TYPE_LABELS: Record<string, string> = {
  order_confirmation: "주문 확인",
  order_shipped: "배송 출발",
  order_delivered: "배송 완료",
  order_cancelled: "주문 취소",
  order_cancellation: "주문 취소",
  refund_processed: "환불 처리",
  password_changed: "비밀번호 변경",
  registration_complete: "회원가입 완료",
  profile_updated: "프로필 수정",
  review_approved: "리뷰 승인",
  review_rejected: "리뷰 반려",
  review_reminder: "리뷰 요청",
  review_reminder_7days: "리뷰 요청 (7일)",
  review_reminder_30days: "리뷰 요청 (30일)",
  inquiry_reply: "문의 답변",
  inquiry_receipt: "문의 접수 확인",
  product_qa_reply: "상품 Q&A 답변",
  new_product_question: "상품 Q&A 알림",
  coupon_issued: "쿠폰 발급",
  coupon_expiry_warning: "쿠폰 만료 예정",
  birthday_coupon: "생일 쿠폰",
  point_earned: "포인트 적립",
  point_expiry_alert: "포인트 만료 알림",
  event_started: "이벤트 시작",
  event_ending_soon: "이벤트 종료 임박",
  first_purchase_coupon: "첫 구매 감사 쿠폰",
  restock_alert: "재입고 알림",
  price_drop: "가격 인하",
  announcement: "공지사항",
  newsletter: "뉴스레터",
  delivery_completion: "배송 완료",
  delayed_shipment: "배송 지연",
  retry_payment: "재결제 유도",
  test_email: "테스트 이메일",
  test_point_expiry: "테스트 - 포인트 만료",
  test_delivery: "테스트 - 배송 완료",
  test_review_reminder: "테스트 - 리뷰 요청",
};

// ─────────────────────────────────────────────
// 탭 1: 이메일 알림 설정
// ─────────────────────────────────────────────
interface EmailNotificationSetting {
  key: string;
  label: string;
  description: string;
  category: string;
  defaultEnabled: boolean;
  trigger: string;
}

const EMAIL_SETTINGS_DATA: EmailNotificationSetting[] = [
  { key: "EMAIL_REGISTER_COMPLETE", label: "회원가입 완료 안내", description: "새 회원이 가입하면 환영 이메일을 발송합니다.", category: "회원 관리", defaultEnabled: true, trigger: "회원가입 완료 시" },
  { key: "EMAIL_PASSWORD_CHANGED", label: "비밀번호 변경 완료 안내", description: "비밀번호가 변경되면 보안 알림 이메일을 발송합니다.", category: "회원 관리", defaultEnabled: true, trigger: "비밀번호 변경 시" },
  { key: "EMAIL_PROFILE_UPDATED", label: "프로필 수정 확인 안내", description: "회원 정보가 변경되면 확인 이메일을 발송합니다.", category: "회원 관리", defaultEnabled: true, trigger: "프로필 수정 시" },
  { key: "EMAIL_TIER_UPGRADE", label: "회원 등급 업그레이드 안내", description: "회원 등급이 상승하면 혜택 안내 이메일을 발송합니다.", category: "회원 관리", defaultEnabled: true, trigger: "등급 변경 시" },
  { key: "EMAIL_DORMANT_ACCOUNT", label: "휴면 계정 전환 예고 안내", description: "장기 미접속 회원에게 휴면 전환 예고 이메일을 발송합니다.", category: "회원 관리", defaultEnabled: true, trigger: "마지막 로그인 후 11개월" },
  { key: "EMAIL_WITHDRAWAL_COMPLETE", label: "회원 탈퇴 완료 안내", description: "회원 탈퇴 시 탈퇴 완료 이메일을 발송합니다.", category: "회원 관리", defaultEnabled: true, trigger: "회원 탈퇴 시" },
  { key: "EMAIL_ORDER_CONFIRMED", label: "주문 접수 확인 안내", description: "주문이 접수되면 주문 상세 정보를 이메일로 발송합니다.", category: "주문/배송/결제", defaultEnabled: true, trigger: "결제 완료 시" },
  { key: "EMAIL_ORDER_SHIPPED", label: "배송 시작 안내", description: "상품이 발송되면 운송장 번호와 함께 이메일을 발송합니다.", category: "주문/배송/결제", defaultEnabled: true, trigger: "배송 시작 시" },
  { key: "EMAIL_ORDER_DELIVERED", label: "배송 완료 및 리뷰 요청", description: "배송 완료 후 리뷰 작성 요청 이메일을 발송합니다.", category: "주문/배송/결제", defaultEnabled: true, trigger: "배송 완료 시" },
  { key: "EMAIL_ORDER_CANCELLED", label: "주문 취소 안내", description: "주문이 취소되면 취소 확인 이메일을 발송합니다.", category: "주문/배송/결제", defaultEnabled: true, trigger: "주문 취소 시" },
  { key: "EMAIL_REFUND_COMPLETE", label: "환불 완료 안내", description: "환불이 처리되면 환불 금액과 함께 이메일을 발송합니다.", category: "주문/배송/결제", defaultEnabled: true, trigger: "환불 처리 시" },
  { key: "EMAIL_BANK_TRANSFER_REMINDER", label: "은행송금 기한 경고", description: "은행송금 결제 기한이 임박하면 알림 이메일을 발송합니다.", category: "주문/배송/결제", defaultEnabled: true, trigger: "결제 기한 24시간 전" },
  { key: "EMAIL_ADMIN_NEW_ORDER", label: "관리자 신규 주문 알림", description: "새 주문이 접수되면 관리자에게 알림 이메일을 발송합니다.", category: "주문/배송/결제", defaultEnabled: true, trigger: "신규 주문 접수 시" },
  { key: "EMAIL_INQUIRY_REPLIED", label: "1:1 문의 답변 안내", description: "문의에 답변이 등록되면 이메일로 알려드립니다.", category: "문의/리뷰", defaultEnabled: true, trigger: "문의 답변 등록 시" },
  { key: "EMAIL_QA_ANSWERED", label: "상품 Q&A 답변 안내", description: "상품 Q&A에 답변이 등록되면 이메일로 알려드립니다.", category: "문의/리뷰", defaultEnabled: true, trigger: "Q&A 답변 등록 시" },
  { key: "EMAIL_REVIEW_APPROVED", label: "리뷰 승인 안내", description: "작성한 리뷰가 승인되면 이메일로 알려드립니다.", category: "문의/리뷰", defaultEnabled: true, trigger: "리뷰 승인 시" },
  { key: "EMAIL_REVIEW_REJECTED", label: "리뷰 반려 안내", description: "작성한 리뷰가 반려되면 사유와 함께 이메일을 발송합니다.", category: "문의/리뷰", defaultEnabled: true, trigger: "리뷰 반려 시" },
  { key: "EMAIL_REVIEW_POINTS", label: "리뷰 포인트 적립 안내", description: "리뷰 작성 후 포인트가 적립되면 이메일로 알려드립니다.", category: "문의/리뷰", defaultEnabled: true, trigger: "리뷰 포인트 적립 시" },
  { key: "EMAIL_COUPON_ISSUED", label: "쿠폰 발급 안내", description: "새 쿠폰이 발급되면 쿠폰 코드와 함께 이메일을 발송합니다.", category: "쿠폰/포인트", defaultEnabled: true, trigger: "쿠폰 발급 시" },
  { key: "EMAIL_COUPON_EXPIRING", label: "쿠폰 만료 예정 안내", description: "쿠폰 만료 3일 전에 사용 촉진 이메일을 발송합니다.", category: "쿠폰/포인트", defaultEnabled: true, trigger: "쿠폰 만료 3일 전" },
  { key: "EMAIL_BIRTHDAY_COUPON", label: "생일 축하 쿠폰 발송", description: "생일 당일에 축하 메시지와 쿠폰을 이메일로 발송합니다.", category: "쿠폰/포인트", defaultEnabled: true, trigger: "생일 당일" },
  { key: "EMAIL_FIRST_PURCHASE_COUPON", label: "첫 구매 감사 쿠폰 발송", description: "첫 구매 완료 후 감사 쿠폰을 이메일로 발송합니다.", category: "쿠폰/포인트", defaultEnabled: true, trigger: "첫 구매 배송 완료 시" },
  { key: "EMAIL_POINTS_EARNED", label: "포인트 적립 안내", description: "포인트가 적립되면 잔여 포인트와 함께 이메일을 발송합니다.", category: "쿠폰/포인트", defaultEnabled: true, trigger: "포인트 적립 시" },
  { key: "EMAIL_POINTS_EXPIRING", label: "포인트 만료 예정 안내", description: "포인트 만료 7일 전에 사용 촉진 이메일을 발송합니다.", category: "쿠폰/포인트", defaultEnabled: false, trigger: "포인트 만료 7일 전" },
  { key: "EMAIL_EVENT_STARTED", label: "이벤트 시작 안내", description: "새 이벤트가 시작되면 전체 회원에게 이메일을 발송합니다.", category: "이벤트", defaultEnabled: true, trigger: "이벤트 등록 시" },
  { key: "EMAIL_EVENT_ENDING_SOON", label: "이벤트 종료 임박 안내", description: "이벤트 종료 24시간 전에 참여 촉진 이메일을 발송합니다.", category: "이벤트", defaultEnabled: true, trigger: "이벤트 종료 24시간 전" },
  { key: "EMAIL_EVENT_WINNER", label: "이벤트 당첨 안내", description: "이벤트 당첨자에게 당첨 축하 이메일을 발송합니다.", category: "이벤트", defaultEnabled: true, trigger: "당첨자 선정 시" },
  { key: "EMAIL_NEW_PRODUCT", label: "신상품 입고 안내", description: "새 상품이 등록되면 관심 고객에게 이메일을 발송합니다.", category: "이벤트", defaultEnabled: false, trigger: "신상품 등록 시" },
  { key: "EMAIL_PRICE_DROP", label: "가격 인하 알림", description: "관심 상품의 가격이 인하되면 이메일로 알려드립니다.", category: "이벤트", defaultEnabled: false, trigger: "가격 변경 시" },
  { key: "EMAIL_RESTOCK", label: "재입고 알림", description: "품절 상품이 재입고되면 대기 고객에게 이메일을 발송합니다.", category: "이벤트", defaultEnabled: true, trigger: "재입고 시" },
  { key: "EMAIL_NEWSLETTER", label: "뉴스레터", description: "정기 뉴스레터를 구독 회원에게 발송합니다.", category: "이벤트", defaultEnabled: false, trigger: "수동 발송" },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "회원 관리": <Users className="w-4 h-4" />,
  "주문/배송/결제": <ShoppingBag className="w-4 h-4" />,
  "문의/리뷰": <MessageCircle className="w-4 h-4" />,
  "쿠폰/포인트": <Gift className="w-4 h-4" />,
  "이벤트": <CalendarDays className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  "회원 관리": "bg-blue-50 border-blue-200",
  "주문/배송/결제": "bg-green-50 border-green-200",
  "문의/리뷰": "bg-purple-50 border-purple-200",
  "쿠폰/포인트": "bg-orange-50 border-orange-200",
  "이벤트": "bg-pink-50 border-pink-200",
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  "회원 관리": "bg-blue-100 text-blue-700",
  "주문/배송/결제": "bg-green-100 text-green-700",
  "문의/리뷰": "bg-purple-100 text-purple-700",
  "쿠폰/포인트": "bg-orange-100 text-orange-700",
  "이벤트": "bg-pink-100 text-pink-700",
};

function EmailSettingsTab() {
  const [settings, setSettings] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    EMAIL_SETTINGS_DATA.forEach((s) => { initial[s.key] = s.defaultEnabled; });
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const { data: dbSettings } = trpc.admin.getEmailSettings.useQuery();
  useEffect(() => {
    if (dbSettings && dbSettings.length > 0) {
      const loaded: Record<string, boolean> = {};
      EMAIL_SETTINGS_DATA.forEach((s) => { loaded[s.key] = s.defaultEnabled; });
      dbSettings.forEach((s) => { loaded[s.key] = s.value === "true"; });
      setSettings(loaded);
    }
  }, [dbSettings]);

  const updateSettingMutation = trpc.admin.updateEmailSetting.useMutation();

  const handleToggle = async (key: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    try {
      await updateSettingMutation.mutateAsync({ key, value: value ? "true" : "false" });
      toast.success("이메일 설정이 저장되었습니다.");
    } catch {
      setSettings((prev) => ({ ...prev, [key]: !value }));
      toast.error("설정 저장에 실패했습니다.");
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(settings).map(([key, value]) =>
          updateSettingMutation.mutateAsync({ key, value: value ? "true" : "false" })
        )
      );
      toast.success("모든 이메일 설정이 저장되었습니다.");
    } catch {
      toast.error("설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleEnableAll = () => {
    const all: Record<string, boolean> = {};
    EMAIL_SETTINGS_DATA.forEach((s) => { all[s.key] = true; });
    setSettings(all);
  };

  const handleDisableAll = () => {
    const all: Record<string, boolean> = {};
    EMAIL_SETTINGS_DATA.forEach((s) => { all[s.key] = false; });
    setSettings(all);
  };

  const categories = Array.from(new Set(EMAIL_SETTINGS_DATA.map((s) => s.category)));
  const enabledCount = Object.values(settings).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">각 이벤트별 이메일 발송 여부를 설정합니다. 변경 시 즉시 저장됩니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2 py-0.5">
            {enabledCount} / {EMAIL_SETTINGS_DATA.length} 활성화
          </Badge>
          <Button variant="outline" size="sm" onClick={handleEnableAll}>전체 활성화</Button>
          <Button variant="outline" size="sm" onClick={handleDisableAll}>전체 비활성화</Button>
          <Button size="sm" onClick={handleSaveAll} disabled={saving} className="bg-pink-600 hover:bg-pink-700 text-white">
            {saving ? "저장 중..." : "전체 저장"}
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <strong>이메일 발송 안내</strong>
          <p className="mt-1 text-blue-700">
            이메일 발송은 Resend API를 통해 이루어집니다. 발송 이력은 <strong>발송 이력</strong> 탭에서 확인할 수 있습니다.
            스케줄 발송(쿠폰 만료, 생일 쿠폰 등)은 별도 스케줄러 설정이 필요합니다.
          </p>
        </div>
      </div>

      {categories.map((category) => {
        const items = EMAIL_SETTINGS_DATA.filter((s) => s.category === category);
        const categoryEnabled = items.filter((s) => settings[s.key]).length;
        return (
          <Card key={category} className={`border ${CATEGORY_COLORS[category] || "bg-gray-50 border-gray-200"}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className={`p-1.5 rounded-md ${CATEGORY_BADGE_COLORS[category]}`}>
                  {CATEGORY_ICONS[category]}
                </span>
                {category}
                <Badge variant="outline" className="ml-auto text-xs">
                  {categoryEnabled} / {items.length} 활성
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{item.label}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-gray-100 text-gray-500">
                        {item.trigger}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  </div>
                  <Switch
                    checked={settings[item.key] ?? item.defaultEnabled}
                    onCheckedChange={(checked) => handleToggle(item.key, checked)}
                    className="flex-shrink-0"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// 탭 2: 발송 이력
// ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "sent") return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />발송 완료</Badge>;
  if (status === "failed") return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />발송 실패</Badge>;
  if (status === "skipped") return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><SkipForward className="w-3 h-3 mr-1" />건너뜀</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function EmailLogsTab() {
  const [emailType, setEmailType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const limit = 20;

  const { data, isLoading, refetch } = trpc.emailLogs.getAll.useQuery({
    emailType: emailType !== "all" ? emailType : undefined,
    status: status !== "all" ? (status as "sent" | "failed" | "skipped") : undefined,
    limit,
    offset: page * limit,
  });

  const { data: stats } = trpc.emailLogs.getStats.useQuery();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const sentCount = stats?.filter(s => s.status === "sent").reduce((acc, s) => acc + (s.count as number), 0) ?? 0;
  const failedCount = stats?.filter(s => s.status === "failed").reduce((acc, s) => acc + (s.count as number), 0) ?? 0;
  const skippedCount = stats?.filter(s => s.status === "skipped").reduce((acc, s) => acc + (s.count as number), 0) ?? 0;
  const totalCount = sentCount + failedCount + skippedCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">시스템에서 발송된 모든 이메일 내역을 조회합니다.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />새로고침
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "전체 발송", value: totalCount, icon: <Mail className="w-4 h-4 text-blue-600" />, bg: "bg-blue-100", color: "" },
          { label: "발송 완료", value: sentCount, icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, bg: "bg-green-100", color: "text-green-600" },
          { label: "발송 실패", value: failedCount, icon: <XCircle className="w-4 h-4 text-red-600" />, bg: "bg-red-100", color: "text-red-600" },
          { label: "건너뜀", value: skippedCount, icon: <SkipForward className="w-4 h-4 text-yellow-600" />, bg: "bg-yellow-100", color: "text-yellow-600" },
        ].map((item) => (
          <Card key={item.label} className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>{item.icon}</div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{item.value.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 유형별 통계 */}
      {stats && stats.length > 0 && (
        <Card className="border-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5"><BarChart3 className="w-4 h-4" />유형별 발송 현황</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(
                stats.reduce((acc: Record<string, { sent: number; failed: number; skipped: number }>, s) => {
                  const key = s.emailType;
                  if (!acc[key]) acc[key] = { sent: 0, failed: 0, skipped: 0 };
                  acc[key][s.status as "sent" | "failed" | "skipped"] = s.count as number;
                  return acc;
                }, {})
              ).map(([type, counts]) => (
                <div key={type} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="font-medium text-gray-700">{EMAIL_TYPE_LABELS[type] ?? type}</span>
                  {counts.sent > 0 && <span className="text-green-600">✓{counts.sent}</span>}
                  {counts.failed > 0 && <span className="text-red-600">✗{counts.failed}</span>}
                  {counts.skipped > 0 && <span className="text-yellow-600">⊘{counts.skipped}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 필터 */}
      <Card className="border-0">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Select value={emailType} onValueChange={v => { setEmailType(v); setPage(0); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="이메일 유형" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 유형</SelectItem>
                  {Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={status} onValueChange={v => { setStatus(v); setPage(0); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="발송 상태" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="sent">발송 완료</SelectItem>
                  <SelectItem value="failed">발송 실패</SelectItem>
                  <SelectItem value="skipped">건너뜀</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground flex items-center">총 {total.toLocaleString()}건</div>
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card className="border-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs px-3 py-2 w-[160px]">발송 일시</TableHead>
                <TableHead className="text-xs px-3 py-2 w-[140px]">이메일 유형</TableHead>
                <TableHead className="text-xs px-3 py-2">수신자</TableHead>
                <TableHead className="text-xs px-3 py-2">제목</TableHead>
                <TableHead className="text-xs px-3 py-2 w-[100px]">상태</TableHead>
                <TableHead className="text-xs px-3 py-2 w-[60px]">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">로딩 중...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    <Mail className="w-8 h-8 mx-auto mb-2 text-gray-300" />발송 이력이 없습니다.
                  </TableCell>
                </TableRow>
              ) : rows.map((row: any) => (
                <TableRow key={row.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLog(row)}>
                  <TableCell className="text-xs px-3 py-2 text-muted-foreground">
                    {new Date(row.sentAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-xs px-3 py-2">
                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px]">
                      {EMAIL_TYPE_LABELS[row.emailType] ?? row.emailType}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs px-3 py-2 font-mono">{row.to}</TableCell>
                  <TableCell className="text-xs px-3 py-2 max-w-[200px] truncate">{row.subject}</TableCell>
                  <TableCell className="text-xs px-3 py-2"><StatusBadge status={row.status} /></TableCell>
                  <TableCell className="text-xs px-3 py-2">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">보기</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 px-2">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 px-2">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* 상세 다이얼로그 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-sm">이메일 발송 상세</DialogTitle></DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground mb-0.5">발송 일시</p>
                  <p className="font-medium">{new Date(selectedLog.sentAt).toLocaleString("ko-KR")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">상태</p>
                  <StatusBadge status={selectedLog.status} />
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">이메일 유형</p>
                  <p className="font-medium">{EMAIL_TYPE_LABELS[selectedLog.emailType] ?? selectedLog.emailType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">수신자</p>
                  <p className="font-mono">{selectedLog.to}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">제목</p>
                <p className="font-medium">{selectedLog.subject}</p>
              </div>
              {selectedLog.errorMessage && (
                <div>
                  <p className="text-muted-foreground mb-0.5">오류 메시지</p>
                  <p className="text-red-600 bg-red-50 rounded p-2 font-mono">{selectedLog.errorMessage}</p>
                </div>
              )}
              {selectedLog.metadata && (
                <div>
                  <p className="text-muted-foreground mb-0.5">메타데이터</p>
                  <pre className="bg-gray-50 rounded p-2 text-[11px] overflow-auto max-h-32">
                    {JSON.stringify(JSON.parse(selectedLog.metadata), null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.resendId && (
                <div>
                  <p className="text-muted-foreground mb-0.5">Resend ID</p>
                  <p className="font-mono text-[11px] text-blue-600">{selectedLog.resendId}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// 탭 3: 통계 대시보드
// ─────────────────────────────────────────────
function EmailStatsTab() {
  const { data: stats, isLoading: statsLoading, refetch } = trpc.emailLogs.getStats.useQuery();
  const { data: statsByDate, isLoading: dateLoading } = trpc.emailLogs.getStatsByDate.useQuery();
  const { data: statsByType, isLoading: typeLoading } = trpc.emailLogs.getStatsByType.useQuery();

  const sentCount = stats?.filter(s => s.status === "sent").reduce((acc, s) => acc + (s.count as number), 0) ?? 0;
  const failedCount = stats?.filter(s => s.status === "failed").reduce((acc, s) => acc + (s.count as number), 0) ?? 0;
  const skippedCount = stats?.filter(s => s.status === "skipped").reduce((acc, s) => acc + (s.count as number), 0) ?? 0;
  const totalCount = sentCount + failedCount + skippedCount;
  const successRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  const last7Days = statsByDate?.slice(-7) ?? [];
  const last7Total = last7Days.reduce((acc, d) => acc + d.total, 0);
  const last7Sent = last7Days.reduce((acc, d) => acc + d.sent, 0);
  const maxDayTotal = Math.max(...(statsByDate?.map(d => d.total) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">전체 이메일 발송 현황 및 성공률을 확인합니다.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />새로고침
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Mail className="w-5 h-5 text-blue-600" /><span className="text-sm font-medium text-blue-700">전체 발송</span></div>
            <p className="text-3xl font-bold text-blue-900">{totalCount.toLocaleString()}</p>
            <p className="text-xs text-blue-600 mt-1">누적 이메일 수</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-green-700">발송 성공</span></div>
            <p className="text-3xl font-bold text-green-900">{sentCount.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">성공률 {successRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><XCircle className="w-5 h-5 text-red-600" /><span className="text-sm font-medium text-red-700">발송 실패</span></div>
            <p className="text-3xl font-bold text-red-900">{failedCount.toLocaleString()}</p>
            <p className="text-xs text-red-600 mt-1">실패율 {totalCount > 0 ? Math.round((failedCount / totalCount) * 100) : 0}%</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-amber-600" /><span className="text-sm font-medium text-amber-700">최근 7일</span></div>
            <p className="text-3xl font-bold text-amber-900">{last7Total.toLocaleString()}</p>
            <p className="text-xs text-amber-600 mt-1">성공 {last7Sent}건</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />전체 발송 성공률
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-green-700 font-medium">발송 성공</span>
              <span className="text-green-700 font-bold">{successRate}%</span>
            </div>
            <Progress value={successRate} className="h-3 bg-gray-100" />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="text-center p-2 bg-green-50 rounded-lg"><p className="text-lg font-bold text-green-700">{sentCount.toLocaleString()}</p><p className="text-xs text-green-600">성공</p></div>
            <div className="text-center p-2 bg-red-50 rounded-lg"><p className="text-lg font-bold text-red-700">{failedCount.toLocaleString()}</p><p className="text-xs text-red-600">실패</p></div>
            <div className="text-center p-2 bg-amber-50 rounded-lg"><p className="text-lg font-bold text-amber-700">{skippedCount.toLocaleString()}</p><p className="text-xs text-amber-600">건너뜀</p></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />최근 30일 발송 추이
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dateLoading ? (
            <div className="h-32 bg-gray-100 rounded animate-pulse" />
          ) : statsByDate && statsByDate.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-end gap-1 h-32">
                {statsByDate.map((d, i) => {
                  const heightPct = maxDayTotal > 0 ? (d.total / maxDayTotal) * 100 : 0;
                  const sentPct = d.total > 0 ? (d.sent / d.total) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${d.date}: 총 ${d.total}건 (성공 ${d.sent}, 실패 ${d.failed})`}>
                      <div className="w-full rounded-t overflow-hidden" style={{ height: `${Math.max(heightPct, 4)}%` }}>
                        <div className="w-full bg-green-400 rounded-t" style={{ height: `${sentPct}%` }} />
                        {d.failed > 0 && <div className="w-full bg-red-400" style={{ height: `${100 - sentPct}%` }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{statsByDate[0]?.date?.slice(5)}</span>
                <span>{statsByDate[statsByDate.length - 1]?.date?.slice(5)}</span>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" />성공</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" />실패</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Calendar className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">최근 30일 발송 데이터가 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" />이메일 타입별 발송 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          {typeLoading ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : statsByType && statsByType.length > 0 ? (
            <div className="space-y-2">
              {statsByType.map((row) => {
                const rate = row.total > 0 ? Math.round((row.sent / row.total) * 100) : 0;
                return (
                  <div key={row.emailType} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-40 shrink-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{EMAIL_TYPE_LABELS[row.emailType] ?? row.emailType}</p>
                      <p className="text-xs text-gray-400">{row.emailType}</p>
                    </div>
                    <div className="flex-1"><Progress value={rate} className="h-2" /></div>
                    <div className="flex items-center gap-2 shrink-0 text-xs">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[11px]">성공 {row.sent}</Badge>
                      {row.failed > 0 && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[11px]">실패 {row.failed}</Badge>}
                      <span className="text-gray-500 w-10 text-right">{rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Mail className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">이메일 발송 데이터가 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// 탭 4: 이메일 미리보기
// ─────────────────────────────────────────────
const EMAIL_CATEGORIES_PREVIEW = [
  {
    label: "회원 관리", icon: "👤",
    types: [
      { key: "registration_complete", label: "회원가입 완료", desc: "신규 회원 가입 시 발송" },
      { key: "password_changed", label: "비밀번호 변경 완료", desc: "비밀번호 변경 시 발송" },
      { key: "profile_updated", label: "프로필 수정 확인", desc: "프로필 정보 변경 시 발송" },
    ]
  },
  {
    label: "주문 / 배송", icon: "📦",
    types: [
      { key: "order_confirmation", label: "주문 확인", desc: "주문 완료 시 발송" },
      { key: "order_shipped", label: "배송 출발", desc: "배송 시작 시 발송" },
      { key: "delivery_completion", label: "배송 완료", desc: "배송 완료 시 발송" },
      { key: "order_cancellation", label: "주문 취소", desc: "주문 취소 시 발송" },
      { key: "delayed_shipment", label: "배송 지연", desc: "배송 지연 시 발송" },
      { key: "retry_payment", label: "재결제 유도", desc: "결제 실패 후 발송" },
    ]
  },
  {
    label: "문의 / 리뷰", icon: "💬",
    types: [
      { key: "inquiry_receipt", label: "문의 접수 확인", desc: "1:1 문의 접수 시 발송" },
      { key: "inquiry_reply", label: "문의 답변", desc: "1:1 문의 답변 시 발송" },
      { key: "new_product_question", label: "상품 Q&A 알림", desc: "상품 Q&A 등록 시 발송" },
      { key: "review_approved", label: "리뷰 승인", desc: "리뷰 승인 시 발송" },
      { key: "review_rejected", label: "리뷰 반려", desc: "리뷰 반려 시 발송" },
      { key: "review_reminder_7days", label: "리뷰 요청 (7일)", desc: "구매 7일 후 발송" },
      { key: "review_reminder_30days", label: "리뷰 요청 (30일)", desc: "구매 30일 후 발송" },
    ]
  },
  {
    label: "쿠폰 / 포인트", icon: "🎁",
    types: [
      { key: "coupon_issued", label: "쿠폰 발급", desc: "쿠폰 발급 시 발송" },
      { key: "coupon_expiry_warning", label: "쿠폰 만료 예정", desc: "쿠폰 만료 3일 전 발송" },
      { key: "birthday_coupon", label: "생일 쿠폰", desc: "생일 당일 발송" },
      { key: "first_purchase_coupon", label: "첫 구매 감사 쿠폰", desc: "첫 구매 완료 시 발송" },
      { key: "point_earned", label: "포인트 적립", desc: "포인트 적립 시 발송" },
      { key: "point_expiry_alert", label: "포인트 만료 알림", desc: "포인트 만료 30일 전 발송" },
    ]
  },
  {
    label: "이벤트 / 알림", icon: "🎉",
    types: [
      { key: "event_started", label: "이벤트 시작", desc: "이벤트 시작 시 발송" },
      { key: "event_ending_soon", label: "이벤트 종료 임박", desc: "이벤트 종료 1일 전 발송" },
      { key: "restock_alert", label: "재입고 알림", desc: "재입고 시 발송" },
      { key: "price_drop", label: "가격 인하", desc: "가격 인하 시 발송" },
      { key: "announcement", label: "공지사항", desc: "공지사항 등록 시 발송" },
    ]
  },
  {
    label: "테스트", icon: "🧪",
    types: [
      { key: "test_email", label: "테스트 이메일", desc: "이메일 시스템 테스트용" },
      { key: "test_delivery", label: "테스트 - 배송 완료", desc: "배송 완료 이메일 테스트" },
      { key: "test_point_expiry", label: "테스트 - 포인트 만료", desc: "포인트 만료 이메일 테스트" },
      { key: "test_review_reminder", label: "테스트 - 리뷰 요청", desc: "리뷰 요청 이메일 테스트" },
    ]
  }
];

const ALL_EMAIL_TYPES_PREVIEW = EMAIL_CATEGORIES_PREVIEW.flatMap(c => c.types);

function EmailPreviewTab() {
  const [selectedType, setSelectedType] = useState<string>("order_confirmation");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const { data: previewData, isLoading: previewLoading, refetch: refetchPreview } = trpc.emailLogs.getPreviewHtml.useQuery(
    { emailType: selectedType },
    { enabled: previewOpen }
  );

  const { data: emailSettings, refetch: refetchSettings } = trpc.admin.getEmailSettings.useQuery();

  const updateSettingMutation = trpc.admin.updateEmailSetting.useMutation({
    onSuccess: () => { toast.success("설정이 저장되었습니다."); refetchSettings(); },
    onError: (err) => toast.error(err.message || "저장에 실패했습니다."),
  });

  const sendTestMutation = trpc.emailLogs.sendTestDelivery.useMutation({
    onSuccess: () => { toast.success(`테스트 이메일이 ${testEmail}로 발송되었습니다.`); setSendingTest(false); },
    onError: (err) => { toast.error(err.message || "테스트 발송에 실패했습니다."); setSendingTest(false); },
  });

  const handleSendTest = () => {
    if (!testEmail) { toast.error("이메일 주소를 입력하세요."); return; }
    setSendingTest(true);
    sendTestMutation.mutate({ to: testEmail });
  };

  const handleToggle = (emailType: string, currentEnabled: boolean) => {
    updateSettingMutation.mutate({ key: `email_enabled_${emailType}`, value: (!currentEnabled).toString() });
  };

  const isEnabled = (emailType: string) => {
    if (!emailSettings) return true;
    const setting = (emailSettings as Array<{ key: string; value: string }>).find(s => s.key === `email_enabled_${emailType}`);
    return setting ? setting.value !== "false" : true;
  };

  const selectedLabel = ALL_EMAIL_TYPES_PREVIEW.find(t => t.key === selectedType)?.label || selectedType;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 테스트 발송 + 미리보기 선택 */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />테스트 이메일 발송
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600">수신 이메일 주소</Label>
                <Input type="email" placeholder="test@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
              <Button size="sm" className="w-full gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={handleSendTest} disabled={sendingTest || !testEmail}>
                <Send className="w-3.5 h-3.5" />{sendingTest ? "발송 중..." : "테스트 발송"}
              </Button>
              <p className="text-xs text-gray-400">배송 완료 이메일 템플릿으로 테스트 발송됩니다.</p>
            </CardContent>
          </Card>

          <Card className="border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-600" />미리보기 이메일 선택
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="이메일 타입 선택" /></SelectTrigger>
                <SelectContent>
                  {EMAIL_CATEGORIES_PREVIEW.map(cat => (
                    <div key={cat.label}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">{cat.icon} {cat.label}</div>
                      {cat.types.map(t => (
                        <SelectItem key={t.key} value={t.key} className="text-sm pl-4">{t.label}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="w-full mt-2 gap-1.5" onClick={() => setPreviewOpen(true)}>
                <Eye className="w-3.5 h-3.5" />{selectedLabel} 미리보기
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽: 이메일 활성화 설정 */}
        <div className="lg:col-span-2">
          <Card className="border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-600" />이메일 발송 활성화 설정
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {EMAIL_CATEGORIES_PREVIEW.map(cat => (
                  <div key={cat.label}>
                    <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg mb-1 mt-3 first:mt-0">
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-sm font-semibold text-gray-700">{cat.label}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">{cat.types.length}개</Badge>
                    </div>
                    {cat.types.map(t => {
                      const enabled = isEnabled(t.key);
                      return (
                        <div
                          key={t.key}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50 ${selectedType === t.key ? "border-blue-200 bg-blue-50" : "border-transparent"}`}
                          onClick={() => setSelectedType(t.key)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${enabled ? "bg-green-500" : "bg-gray-300"}`} />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{t.label}</p>
                              <p className="text-xs text-gray-400">{t.desc}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                              onClick={(e) => { e.stopPropagation(); setSelectedType(t.key); setPreviewOpen(true); }} title="미리보기">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Switch checked={enabled} onCheckedChange={() => handleToggle(t.key, enabled)} onClick={(e) => e.stopPropagation()} className="data-[state=checked]:bg-green-500" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 미리보기 다이얼로그 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />이메일 미리보기: {selectedLabel}
              <Badge variant="outline" className="ml-2 text-xs">{selectedType}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => refetchPreview()}>
              <RefreshCw className="w-3.5 h-3.5" />새로고침
            </Button>
          </div>
          <div className="flex-1 overflow-auto border rounded-lg bg-gray-50">
            {previewLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : previewData?.html ? (
              <iframe srcDoc={previewData.html} className="w-full h-full min-h-[500px] border-0" title="이메일 미리보기" sandbox="allow-same-origin" />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Mail className="w-10 h-10 mb-3 opacity-30" />
                <p>이 이메일 타입의 미리보기를 불러올 수 없습니다.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function EmailManagement() {
  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 헤더 */}
        <div>
          <h2 className="text-xl font-bold">이메일 관리</h2>
          <p className="text-xs text-muted-foreground mt-0.5">이메일 알림 설정, 발송 이력, 통계, 미리보기를 한 곳에서 관리합니다.</p>
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="settings" className="flex items-center gap-1.5">
              <Settings className="w-4 h-4" />알림 설정
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1.5">
              <Mail className="w-4 h-4" />발송 이력
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />통계
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />미리보기
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-4">
            <EmailSettingsTab />
          </TabsContent>
          <TabsContent value="logs" className="mt-4">
            <EmailLogsTab />
          </TabsContent>
          <TabsContent value="stats" className="mt-4">
            <EmailStatsTab />
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <EmailPreviewTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
