import { useState, useEffect } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Switch } from"@/components/ui/switch";
import { Badge } from"@/components/ui/badge";
import { Button } from"@/components/ui/button";
import { toast } from"sonner";
import { Mail, Users, ShoppingBag, MessageCircle, Gift, CalendarDays, Info } from"lucide-react";

// 이메일 알림 설정 타입
interface EmailNotificationSetting {
 key: string;
 label: string;
 description: string;
 category: string;
 defaultEnabled: boolean;
 trigger: string;
}

const EMAIL_SETTINGS: EmailNotificationSetting[] = [
 // 1. 회원 관리
 {
 key:"EMAIL_REGISTER_COMPLETE",
 label:"회원가입 완료 안내",
 description:"새 회원이 가입하면 환영 이메일을 발송합니다.",
 category:"회원 관리",
 defaultEnabled: true,
 trigger:"회원가입 완료 시",
 },
 {
 key:"EMAIL_PASSWORD_CHANGED",
 label:"비밀번호 변경 완료 안내",
 description:"비밀번호가 변경되면 보안 알림 이메일을 발송합니다.",
 category:"회원 관리",
 defaultEnabled: true,
 trigger:"비밀번호 변경 시",
 },
 {
 key:"EMAIL_PROFILE_UPDATED",
 label:"프로필 수정 확인 안내",
 description:"회원 정보가 변경되면 확인 이메일을 발송합니다.",
 category:"회원 관리",
 defaultEnabled: true,
 trigger:"프로필 수정 시",
 },
 {
 key:"EMAIL_TIER_UPGRADE",
 label:"회원 등급 업그레이드 안내",
 description:"회원 등급이 상승하면 혜택 안내 이메일을 발송합니다.",
 category:"회원 관리",
 defaultEnabled: true,
 trigger:"등급 변경 시",
 },
 {
 key:"EMAIL_DORMANT_ACCOUNT",
 label:"휴면 계정 전환 예고 안내",
 description:"장기 미접속 회원에게 휴면 전환 예고 이메일을 발송합니다.",
 category:"회원 관리",
 defaultEnabled: true,
 trigger:"마지막 로그인 후 11개월",
 },
 {
 key:"EMAIL_WITHDRAWAL_COMPLETE",
 label:"회원 탈퇴 완료 안내",
 description:"회원 탈퇴 시 탈퇴 완료 이메일을 발송합니다.",
 category:"회원 관리",
 defaultEnabled: true,
 trigger:"회원 탈퇴 시",
 },
 // 2. 주문/배송/결제
 {
 key:"EMAIL_ORDER_CONFIRMED",
 label:"주문 접수 확인 안내",
 description:"주문이 접수되면 주문 상세 정보를 이메일로 발송합니다.",
 category:"주문/배송/결제",
 defaultEnabled: true,
 trigger:"결제 완료 시",
 },
 {
 key:"EMAIL_ORDER_SHIPPED",
 label:"배송 시작 안내",
 description:"상품이 발송되면 운송장 번호와 함께 이메일을 발송합니다.",
 category:"주문/배송/결제",
 defaultEnabled: true,
 trigger:"배송 시작 시",
 },
 {
 key:"EMAIL_ORDER_DELIVERED",
 label:"배송 완료 및 리뷰 요청",
 description:"배송 완료 후 리뷰 작성 요청 이메일을 발송합니다.",
 category:"주문/배송/결제",
 defaultEnabled: true,
 trigger:"배송 완료 시",
 },
 {
 key:"EMAIL_ORDER_CANCELLED",
 label:"주문 취소 안내",
 description:"주문이 취소되면 취소 확인 이메일을 발송합니다.",
 category:"주문/배송/결제",
 defaultEnabled: true,
 trigger:"주문 취소 시",
 },
 {
 key:"EMAIL_REFUND_COMPLETE",
 label:"환불 완료 안내",
 description:"환불이 처리되면 환불 금액과 함께 이메일을 발송합니다.",
 category:"주문/배송/결제",
 defaultEnabled: true,
 trigger:"환불 처리 시",
 },
 {
 key:"EMAIL_BANK_TRANSFER_REMINDER",
 label:"은행송금 기한 경고",
 description:"은행송금 결제 기한이 임박하면 알림 이메일을 발송합니다.",
 category:"주문/배송/결제",
 defaultEnabled: true,
 trigger:"결제 기한 24시간 전",
 },
 {
 key:"EMAIL_ADMIN_NEW_ORDER",
 label:"관리자 신규 주문 알림",
 description:"새 주문이 접수되면 관리자에게 알림 이메일을 발송합니다.",
 category:"주문/배송/결제",
 defaultEnabled: true,
 trigger:"신규 주문 접수 시",
 },
 // 3. 문의/리뷰
 {
 key:"EMAIL_INQUIRY_REPLIED",
 label:"1:1 문의 답변 안내",
 description:"문의에 답변이 등록되면 이메일로 알려드립니다.",
 category:"문의/리뷰",
 defaultEnabled: true,
 trigger:"문의 답변 등록 시",
 },
 {
 key:"EMAIL_QA_ANSWERED",
 label:"상품 Q&A 답변 안내",
 description:"상품 Q&A에 답변이 등록되면 이메일로 알려드립니다.",
 category:"문의/리뷰",
 defaultEnabled: true,
 trigger:"Q&A 답변 등록 시",
 },
 {
 key:"EMAIL_REVIEW_APPROVED",
 label:"리뷰 승인 안내",
 description:"작성한 리뷰가 승인되면 이메일로 알려드립니다.",
 category:"문의/리뷰",
 defaultEnabled: true,
 trigger:"리뷰 승인 시",
 },
 {
 key:"EMAIL_REVIEW_REJECTED",
 label:"리뷰 반려 안내",
 description:"작성한 리뷰가 반려되면 사유와 함께 이메일을 발송합니다.",
 category:"문의/리뷰",
 defaultEnabled: true,
 trigger:"리뷰 반려 시",
 },
 {
 key:"EMAIL_REVIEW_POINTS",
 label:"리뷰 포인트 적립 안내",
 description:"리뷰 작성 후 포인트가 적립되면 이메일로 알려드립니다.",
 category:"문의/리뷰",
 defaultEnabled: true,
 trigger:"리뷰 포인트 적립 시",
 },
 // 4. 쿠폰/포인트
 {
 key:"EMAIL_COUPON_ISSUED",
 label:"쿠폰 발급 안내",
 description:"새 쿠폰이 발급되면 쿠폰 코드와 함께 이메일을 발송합니다.",
 category:"쿠폰/포인트",
 defaultEnabled: true,
 trigger:"쿠폰 발급 시",
 },
 {
 key:"EMAIL_COUPON_EXPIRING",
 label:"쿠폰 만료 예정 안내",
 description:"쿠폰 만료 3일 전에 사용 촉진 이메일을 발송합니다.",
 category:"쿠폰/포인트",
 defaultEnabled: true,
 trigger:"쿠폰 만료 3일 전",
 },
 {
 key:"EMAIL_BIRTHDAY_COUPON",
 label:"생일 축하 쿠폰 발송",
 description:"생일 당일에 축하 메시지와 쿠폰을 이메일로 발송합니다.",
 category:"쿠폰/포인트",
 defaultEnabled: true,
 trigger:"생일 당일",
 },
 {
 key:"EMAIL_FIRST_PURCHASE_COUPON",
 label:"첫 구매 감사 쿠폰 발송",
 description:"첫 구매 완료 후 감사 쿠폰을 이메일로 발송합니다.",
 category:"쿠폰/포인트",
 defaultEnabled: true,
 trigger:"첫 구매 배송 완료 시",
 },
 {
 key:"EMAIL_POINTS_EARNED",
 label:"포인트 적립 안내",
 description:"포인트가 적립되면 잔여 포인트와 함께 이메일을 발송합니다.",
 category:"쿠폰/포인트",
 defaultEnabled: true,
 trigger:"포인트 적립 시",
 },
 {
 key:"EMAIL_POINTS_EXPIRING",
 label:"포인트 만료 예정 안내",
 description:"포인트 만료 7일 전에 사용 촉진 이메일을 발송합니다.",
 category:"쿠폰/포인트",
 defaultEnabled: false,
 trigger:"포인트 만료 7일 전",
 },
 // 5. 이벤트
 {
 key:"EMAIL_EVENT_STARTED",
 label:"이벤트 시작 안내",
 description:"새 이벤트가 시작되면 전체 회원에게 이메일을 발송합니다.",
 category:"이벤트",
 defaultEnabled: true,
 trigger:"이벤트 등록 시",
 },
 {
 key:"EMAIL_EVENT_ENDING_SOON",
 label:"이벤트 종료 임박 안내",
 description:"이벤트 종료 24시간 전에 참여 촉진 이메일을 발송합니다.",
 category:"이벤트",
 defaultEnabled: true,
 trigger:"이벤트 종료 24시간 전",
 },
 {
 key:"EMAIL_EVENT_WINNER",
 label:"이벤트 당첨 안내",
 description:"이벤트 당첨자에게 당첨 축하 이메일을 발송합니다.",
 category:"이벤트",
 defaultEnabled: true,
 trigger:"당첨자 선정 시",
 },
 {
 key:"EMAIL_NEW_PRODUCT",
 label:"신상품 입고 안내",
 description:"새 상품이 등록되면 관심 고객에게 이메일을 발송합니다.",
 category:"이벤트",
 defaultEnabled: false,
 trigger:"신상품 등록 시",
 },
 {
 key:"EMAIL_PRICE_DROP",
 label:"가격 인하 알림",
 description:"관심 상품의 가격이 인하되면 이메일로 알려드립니다.",
 category:"이벤트",
 defaultEnabled: false,
 trigger:"가격 변경 시",
 },
 {
 key:"EMAIL_RESTOCK",
 label:"재입고 알림",
 description:"품절 상품이 재입고되면 대기 고객에게 이메일을 발송합니다.",
 category:"이벤트",
 defaultEnabled: true,
 trigger:"재입고 시",
 },
 {
 key:"EMAIL_NEWSLETTER",
 label:"뉴스레터",
 description:"정기 뉴스레터를 구독 회원에게 발송합니다.",
 category:"이벤트",
 defaultEnabled: false,
 trigger:"수동 발송",
 },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
"회원 관리": <Users className="w-4 h-4"/>,
"주문/배송/결제": <ShoppingBag className="w-4 h-4"/>,
"문의/리뷰": <MessageCircle className="w-4 h-4"/>,
"쿠폰/포인트": <Gift className="w-4 h-4"/>,
"이벤트": <CalendarDays className="w-4 h-4"/>,
};

const CATEGORY_COLORS: Record<string, string> = {
"회원 관리":"bg-blue-50 border-blue-200",
"주문/배송/결제":"bg-green-50 border-green-200",
"문의/리뷰":"bg-purple-50 border-purple-200",
"쿠폰/포인트":"bg-orange-50 border-orange-200",
"이벤트":"bg-pink-50 border-pink-200",
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
"회원 관리":"bg-blue-100 text-blue-700",
"주문/배송/결제":"bg-green-100 text-green-700",
"문의/리뷰":"bg-purple-100 text-purple-700",
"쿠폰/포인트":"bg-orange-100 text-orange-700",
"이벤트":"bg-pink-100 text-pink-700",
};

export default function AdminEmailSettings() {
 // Initialize settings from defaults
 const [settings, setSettings] = useState<Record<string, boolean>>(() => {
 const initial: Record<string, boolean> = {};
 EMAIL_SETTINGS.forEach((s) => {
 initial[s.key] = s.defaultEnabled;
 });
 return initial;
 });
 const [saving, setSaving] = useState(false);

 // Load settings from DB
 const { data: dbSettings, isLoading } = trpc.admin.getEmailSettings.useQuery();

 useEffect(() => {
 if (dbSettings && dbSettings.length > 0) {
 const loaded: Record<string, boolean> = {};
 EMAIL_SETTINGS.forEach((s) => { loaded[s.key] = s.defaultEnabled; });
 dbSettings.forEach((s) => {
 loaded[s.key] = s.value ==="true";
 });
 setSettings(loaded);
 }
 }, [dbSettings]);

 const updateSettingMutation = trpc.admin.updateEmailSetting.useMutation();

 const handleToggle = async (key: string, value: boolean) => {
 setSettings((prev) => ({ ...prev, [key]: value }));
 try {
 await updateSettingMutation.mutateAsync({ key, value: value ?"true":"false"});
 toast.success(`이메일 설정이 저장되었습니다.`);
 } catch (err) {
 setSettings((prev) => ({ ...prev, [key]: !value }));
 toast.error("설정 저장에 실패했습니다.");
 }
 };

 const handleSaveAll = async () => {
 setSaving(true);
 try {
 await Promise.all(
 Object.entries(settings).map(([key, value]) =>
 updateSettingMutation.mutateAsync({ key, value: value ?"true":"false"})
 )
 );
 toast.success("모든 이메일 설정이 저장되었습니다.");
 } catch (err) {
 toast.error("설정 저장에 실패했습니다.");
 } finally {
 setSaving(false);
 }
 };

 const handleEnableAll = () => {
 const all: Record<string, boolean> = {};
 EMAIL_SETTINGS.forEach((s) => { all[s.key] = true; });
 setSettings(all);
 };

 const handleDisableAll = () => {
 const all: Record<string, boolean> = {};
 EMAIL_SETTINGS.forEach((s) => { all[s.key] = false; });
 setSettings(all);
 };

 // Group by category
 const categories = Array.from(new Set(EMAIL_SETTINGS.map((s) => s.category)));
 const enabledCount = Object.values(settings).filter(Boolean).length;

 return (
 <AdminLayout>
 <div className="space-y-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-xl font-bold">이메일 알림 설정</h2>
 <p className="text-xs text-muted-foreground mt-0.5">각 이벤트별 이메일 발송 여부를 설정합니다. 변경 시 즉시 저장됩니다.</p>
 </div>
 <div className="flex items-center gap-2">
 <Badge variant="outline"className="text-xs px-2 py-0.5">
 {enabledCount} / {EMAIL_SETTINGS.length} 활성화
 </Badge>
 <Button variant="outline"size="sm"onClick={handleEnableAll}>전체 활성화</Button>
 <Button variant="outline"size="sm"onClick={handleDisableAll}>전체 비활성화</Button>
 <Button size="sm"onClick={handleSaveAll} disabled={saving} className="bg-pink-600 hover:bg-pink-700 text-white">
 {saving ?"저장 중...":"전체 저장"}
 </Button>
 </div>
 </div>

 {/* Info Banner */}
 <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
 <Info className="w-4 h-4 mt-0.5 flex-shrink-0"/>
 <div>
 <strong>이메일 발송 안내</strong>
 <p className="mt-1 text-blue-700">
 이메일 발송은 Resend API를 통해 이루어집니다. 발송 이력은 <strong>이메일 발송 이력</strong> 페이지에서 확인할 수 있습니다.
 스케줄 발송(쿠폰 만료, 생일 쿠폰 등)은 별도 스케줄러 설정이 필요합니다.
 </p>
 </div>
 </div>

 {/* Category Sections */}
 {categories.map((category) => {
 const items = EMAIL_SETTINGS.filter((s) => s.category === category);
 const categoryEnabled = items.filter((s) => settings[s.key]).length;
 return (
 <Card key={category} className={`border ${CATEGORY_COLORS[category] ||"bg-gray-50 border-gray-200"}`}>
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-base">
 <span className={`p-1.5 rounded-md ${CATEGORY_BADGE_COLORS[category]}`}>
 {CATEGORY_ICONS[category]}
 </span>
 {category}
 <Badge variant="outline"className="ml-auto text-xs">
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
 <Badge variant="secondary"className="text-[10px] px-1.5 py-0 h-4 bg-gray-100 text-gray-500">
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
 </AdminLayout>
 );
}
