import { useState } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from"@/components/ui/dialog";
import { Switch } from"@/components/ui/switch";
import { Mail, Eye, Send, Settings, CheckCircle2, RefreshCw, ExternalLink } from"lucide-react";
import { toast } from"sonner";

// 이메일 타입 목록 (카테고리별)
const EMAIL_CATEGORIES = [
 {
 label:"회원 관리",
 icon:"👤",
 types: [
 { key:"registration_complete", label:"회원가입 완료", desc:"신규 회원 가입 시 발송"},
 { key:"password_changed", label:"비밀번호 변경 완료", desc:"비밀번호 변경 시 발송"},
 { key:"profile_updated", label:"프로필 수정 확인", desc:"프로필 정보 변경 시 발송"},
 ]
 },
 {
 label:"주문 / 배송",
 icon:"📦",
 types: [
 { key:"order_confirmation", label:"주문 확인", desc:"주문 완료 시 발송"},
 { key:"order_shipped", label:"배송 출발", desc:"배송 시작 시 발송"},
 { key:"delivery_completion", label:"배송 완료", desc:"배송 완료 시 발송"},
 { key:"order_cancellation", label:"주문 취소", desc:"주문 취소 시 발송"},
 { key:"delayed_shipment", label:"배송 지연", desc:"배송 지연 시 발송"},
 { key:"retry_payment", label:"재결제 유도", desc:"결제 실패 후 발송"},
 ]
 },
 {
 label:"문의 / 리뷰",
 icon:"💬",
 types: [
 { key:"inquiry_receipt", label:"문의 접수 확인", desc:"1:1 문의 접수 시 발송"},
 { key:"inquiry_reply", label:"문의 답변", desc:"1:1 문의 답변 시 발송"},
 { key:"new_product_question", label:"상품 Q&A 알림", desc:"상품 Q&A 등록 시 발송"},
 { key:"review_approved", label:"리뷰 승인", desc:"리뷰 승인 시 발송"},
 { key:"review_rejected", label:"리뷰 반려", desc:"리뷰 반려 시 발송"},
 { key:"review_reminder_7days", label:"리뷰 요청 (7일)", desc:"구매 7일 후 발송"},
 { key:"review_reminder_30days", label:"리뷰 요청 (30일)", desc:"구매 30일 후 발송"},
 ]
 },
 {
 label:"쿠폰 / 포인트",
 icon:"🎁",
 types: [
 { key:"coupon_issued", label:"쿠폰 발급", desc:"쿠폰 발급 시 발송"},
 { key:"coupon_expiry_warning", label:"쿠폰 만료 예정", desc:"쿠폰 만료 3일 전 발송"},
 { key:"birthday_coupon", label:"생일 쿠폰", desc:"생일 당일 발송"},
 { key:"first_purchase_coupon", label:"첫 구매 감사 쿠폰", desc:"첫 구매 완료 시 발송"},
 { key:"point_earned", label:"포인트 적립", desc:"포인트 적립 시 발송"},
 { key:"point_expiry_alert", label:"포인트 만료 알림", desc:"포인트 만료 30일 전 발송"},
 ]
 },
 {
 label:"이벤트 / 알림",
 icon:"🎉",
 types: [
 { key:"event_started", label:"이벤트 시작", desc:"이벤트 시작 시 발송"},
 { key:"event_ending_soon", label:"이벤트 종료 임박", desc:"이벤트 종료 1일 전 발송"},
 { key:"restock_alert", label:"재입고 알림", desc:"재입고 시 발송"},
 { key:"price_drop", label:"가격 인하", desc:"가격 인하 시 발송"},
 { key:"announcement", label:"공지사항", desc:"공지사항 등록 시 발송"},
 ]
 },
 {
 label:"테스트",
 icon:"🧪",
 types: [
 { key:"test_email", label:"테스트 이메일", desc:"이메일 시스템 테스트용"},
 { key:"test_delivery", label:"테스트 - 배송 완료", desc:"배송 완료 이메일 테스트"},
 { key:"test_point_expiry", label:"테스트 - 포인트 만료", desc:"포인트 만료 이메일 테스트"},
 { key:"test_review_reminder", label:"테스트 - 리뷰 요청", desc:"리뷰 요청 이메일 테스트"},
 ]
 }
];

const ALL_EMAIL_TYPES = EMAIL_CATEGORIES.flatMap(c => c.types);

export default function EmailPreview() {
 const [selectedType, setSelectedType] = useState<string>("order_confirmation");
 const [previewOpen, setPreviewOpen] = useState(false);
 const [testEmail, setTestEmail] = useState("");
 const [sendingTest, setSendingTest] = useState(false);

 // 이메일 미리보기 HTML 가져오기
 const { data: previewData, isLoading: previewLoading, refetch: refetchPreview } = trpc.emailLogs.getPreviewHtml.useQuery(
 { emailType: selectedType },
 { enabled: previewOpen }
 );

 // 이메일 설정 가져오기
 const { data: emailSettings, refetch: refetchSettings } = trpc.admin.getEmailSettings.useQuery();

 // 이메일 설정 업데이트
 const updateSettingMutation = trpc.admin.updateEmailSetting.useMutation({
 onSuccess: () => {
 toast.success("설정이 저장되었습니다.");
 refetchSettings();
 },
 onError: (err) => toast.error(err.message ||"저장에 실패했습니다."),
 });

 // 테스트 이메일 발송
 const sendTestMutation = trpc.emailLogs.sendTestDelivery.useMutation({
 onSuccess: () => {
 toast.success(`테스트 이메일이 ${testEmail}로 발송되었습니다.`);
 setSendingTest(false);
 },
 onError: (err) => {
 toast.error(err.message ||"테스트 발송에 실패했습니다.");
 setSendingTest(false);
 },
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
 return setting ? setting.value !=="false": true;
 };

 const selectedLabel = ALL_EMAIL_TYPES.find(t => t.key === selectedType)?.label || selectedType;

 return (
 <AdminLayout>
 <div className="space-y-6">
 {/* 헤더 */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-xl font-bold text-gray-900">이메일 미리보기 및 설정</h2>
 <p className="text-sm text-gray-500 mt-1">이메일 템플릿을 미리보고 각 이메일의 발송 여부를 설정합니다.</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* 왼쪽: 이메일 타입 목록 + 설정 */}
 <div className="lg:col-span-1 space-y-4">
 {/* 테스트 발송 카드 */}
 <Card className="border-0">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <Send className="w-4 h-4 text-blue-600"/>
 테스트 이메일 발송
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 <div>
 <Label className="text-xs text-gray-600">수신 이메일 주소</Label>
 <Input
 type="email"
 placeholder="test@example.com"
 value={testEmail}
 onChange={e => setTestEmail(e.target.value)}
 className="mt-1 h-8 text-sm"
 />
 </div>
 <Button
 size="sm"
 className="w-full gap-1.5 bg-blue-600 hover:bg-blue-700"
 onClick={handleSendTest}
 disabled={sendingTest || !testEmail}
 >
 <Send className="w-3.5 h-3.5"/>
 {sendingTest ?"발송 중...":"테스트 발송"}
 </Button>
 <p className="text-xs text-gray-400">배송 완료 이메일 템플릿으로 테스트 발송됩니다.</p>
 </CardContent>
 </Card>

 {/* 이메일 타입 선택 */}
 <Card className="border-0">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <Eye className="w-4 h-4 text-purple-600"/>
 미리보기 이메일 선택
 </CardTitle>
 </CardHeader>
 <CardContent>
 <Select value={selectedType} onValueChange={setSelectedType}>
 <SelectTrigger className="h-8 text-sm">
 <SelectValue placeholder="이메일 타입 선택"/>
 </SelectTrigger>
 <SelectContent>
 {EMAIL_CATEGORIES.map(cat => (
 <div key={cat.label}>
 <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
 {cat.icon} {cat.label}
 </div>
 {cat.types.map(t => (
 <SelectItem key={t.key} value={t.key} className="text-sm pl-4">
 {t.label}
 </SelectItem>
 ))}
 </div>
 ))}
 </SelectContent>
 </Select>
 <Button
 size="sm"
 variant="outline"
 className="w-full mt-2 gap-1.5"
 onClick={() => setPreviewOpen(true)}
 >
 <Eye className="w-3.5 h-3.5"/>
 {selectedLabel} 미리보기
 </Button>
 </CardContent>
 </Card>
 </div>

 {/* 오른쪽: 이메일 활성화 설정 */}
 <div className="lg:col-span-2">
 <Card className="border-0">
 <CardHeader className="pb-3">
 <CardTitle className="text-base font-semibold flex items-center gap-2">
 <Settings className="w-4 h-4 text-gray-600"/>
 이메일 발송 활성화 설정
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-1">
 {EMAIL_CATEGORIES.map(cat => (
 <div key={cat.label}>
 <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg mb-1 mt-3 first:mt-0">
 <span className="text-base">{cat.icon}</span>
 <span className="text-sm font-semibold text-gray-700">{cat.label}</span>
 <Badge variant="outline"className="text-[10px] ml-auto">{cat.types.length}개</Badge>
 </div>
 {cat.types.map(t => {
 const enabled = isEnabled(t.key);
 return (
 <div
 key={t.key}
 className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50 ${
 selectedType === t.key ?"border-blue-200 bg-blue-50":"border-transparent"
 }`}
 onClick={() => setSelectedType(t.key)}
 >
 <div className="flex items-center gap-3">
 <div className={`w-2 h-2 rounded-full ${enabled ?"bg-green-500":"bg-gray-300"}`} />
 <div>
 <p className="text-sm font-medium text-gray-800">{t.label}</p>
 <p className="text-xs text-gray-400">{t.desc}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button
 size="sm"
 variant="ghost"
 className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
 onClick={(e) => { e.stopPropagation(); setSelectedType(t.key); setPreviewOpen(true); }}
 title="미리보기"
 >
 <Eye className="w-3.5 h-3.5"/>
 </Button>
 <Switch
 checked={enabled}
 onCheckedChange={() => handleToggle(t.key, enabled)}
 onClick={(e) => e.stopPropagation()}
 className="data-[state=checked]:bg-green-500"
 />
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
 </div>

 {/* 이메일 미리보기 다이얼로그 */}
 <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
 <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Mail className="w-5 h-5 text-blue-600"/>
 이메일 미리보기: {selectedLabel}
 <Badge variant="outline"className="ml-2 text-xs">{selectedType}</Badge>
 </DialogTitle>
 </DialogHeader>
 <div className="flex gap-2 mb-2">
 <Button size="sm"variant="outline"className="gap-1.5"onClick={() => refetchPreview()}>
 <RefreshCw className="w-3.5 h-3.5"/>새로고침
 </Button>
 </div>
 <div className="flex-1 overflow-auto border rounded-lg bg-gray-50">
 {previewLoading ? (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
 </div>
 ) : previewData?.html ? (
 <iframe
 srcDoc={previewData.html}
 className="w-full h-full min-h-[500px] border-0"
 title="이메일 미리보기"
 sandbox="allow-same-origin"
 />
 ) : (
 <div className="flex flex-col items-center justify-center h-64 text-gray-400">
 <Mail className="w-10 h-10 mb-3 opacity-30"/>
 <p>이 이메일 타입의 미리보기를 불러올 수 없습니다.</p>
 </div>
 )}
 </div>
 </DialogContent>
 </Dialog>
 </AdminLayout>
 );
}
