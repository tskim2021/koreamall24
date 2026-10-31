import { useState } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { Badge } from"@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from"@/components/ui/dialog";
import { toast } from"sonner";
import {
 Mail,
 Send,
 Plus,
 Trash2,
 Eye,
 RefreshCw,
 Users,
 CheckCircle,
 XCircle,
 Clock,
 AlertCircle,
 BarChart3,
 ExternalLink,
 Info,
 Key,
} from"lucide-react";

// ── 세그먼트 라벨 ─────────────────────────────────────────────────────────────
const SEGMENT_LABELS: Record<string, string> = {
 all:"전체 회원",
 marketing:"마케팅 수신 동의자",
 newsletter:"뉴스레터 구독자",
 active:"최근 30일 구매 회원",
 inactive:"90일 이상 미구매 회원 (휴면)",
 vip:"VIP 등급 회원",
 custom:"직접 입력",
};

// ── 상태 뱃지 ─────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; variant:"default"|"secondary"|"destructive"|"outline"}> = {
 draft: { label:"초안", variant:"secondary"},
 scheduled: { label:"예약됨", variant:"outline"},
 sending: { label:"발송 중", variant:"default"},
 sent: { label:"발송 완료", variant:"default"},
 failed: { label:"실패", variant:"destructive"},
 cancelled: { label:"취소됨", variant:"secondary"},
};

// ── 기본 HTML 템플릿 ──────────────────────────────────────────────────────────
const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport"content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6;">
 <table width="100%"cellpadding="0"cellspacing="0"style="background:#f3f4f6;padding:40px 20px;">
 <tr><td align="center">
 <table width="600"cellpadding="0"cellspacing="0"style="background:white;border-radius:16px;overflow:hidden;box-:0 4px 20px rgba(0,0,0,0.08);">
 <!-- 헤더 -->
 <tr>
 <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:40px 30px;text-align:center;">
 <div style="color:white;font-size:22px;font-weight:800;">💊 ококくすり</div>
 <h1 style="margin:16px 0 0;color:white;font-size:24px;font-weight:700;">제목을 입력하세요</h1>
 </td>
 </tr>
 <!-- 본문 -->
 <tr>
 <td style="padding:40px 30px;">
 <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">
 안녕하세요, <strong>ококくすり</strong>입니다.
 </p>
 <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">
 이곳에 메일 내용을 작성하세요.
 </p>
 <!-- CTA 버튼 -->
 <div style="text-align:center;margin:32px 0;">
 <a href="https://cocokusuri.com"style="display:inline-block;background:#dc2626;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">
 쇼핑하러 가기
 </a>
 </div>
 </td>
 </tr>
 <!-- 푸터 -->
 <tr>
 <td style="background:#1f2937;padding:24px 30px;text-align:center;">
 <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.7;">
 © 2025 ококくすり · <a href="https://cocokusuri.com/mypage/email-preferences"style="color:#f87171;text-decoration:none;">수신 거부</a>
 </p>
 </td>
 </tr>
 </table>
 </td></tr>
 </table>
</body>
</html>`;

// ── 캠페인 폼 ─────────────────────────────────────────────────────────────────
interface CampaignFormData {
 name: string;
 subject: string;
 previewText: string;
 senderName: string;
 senderEmail: string;
 targetSegment: string;
 customEmails: string;
 contentType:"html"|"text";
 htmlContent: string;
 textContent: string;
 scheduledAt: string;
 notes: string;
}

const DEFAULT_FORM: CampaignFormData = {
 name:"",
 subject:"",
 previewText:"",
 senderName:"ококくすり",
 senderEmail:"noreply@cocokusuri.com",
 targetSegment:"marketing",
 customEmails:"",
 contentType:"html",
 htmlContent: DEFAULT_HTML_TEMPLATE,
 textContent:"",
 scheduledAt:"",
 notes:"",
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function BulkEmail() {
 const [view, setView] = useState<"list"|"create"|"edit"|"preview">("list");
 const [selectedId, setSelectedId] = useState<number | null>(null);
 const [form, setForm] = useState<CampaignFormData>(DEFAULT_FORM);
 const [testEmailInput, setTestEmailInput] = useState("");
 const [showSendConfirm, setShowSendConfirm] = useState(false);
 const [sendTargetId, setSendTargetId] = useState<number | null>(null);
 const [htmlPreviewOpen, setHtmlPreviewOpen] = useState(false);
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [apiKeyInput, setApiKeyInput] = useState("");
 const [showApiKeyInput, setShowApiKeyInput] = useState(false);

 const utils = trpc.useUtils();

 // 쿼리
 const apiKeyQuery = trpc.bulkEmail.validateApiKey.useQuery(undefined, { retry: false });
 const apiKeyStatusQuery = trpc.bulkEmail.getApiKey.useQuery(undefined, { retry: false });
 const campaignsQuery = trpc.bulkEmail.listCampaigns.useQuery({ limit: 50, offset: 0, status: statusFilter ==="all"? undefined : statusFilter || undefined });
 const recipientCountQuery = trpc.bulkEmail.previewRecipientCount.useQuery(
 { segment: form.targetSegment as any, customEmails: form.customEmails || undefined },
 { enabled: view ==="create"|| view ==="edit"}
 );
 const selectedCampaignQuery = trpc.bulkEmail.getCampaign.useQuery(
 { id: selectedId! },
 { enabled: selectedId !== null && view ==="edit"}
 );

 // 뮤테이션
 const createMutation = trpc.bulkEmail.createCampaign.useMutation({
 onSuccess: () => {
 toast.success("캠페인이 저장되었습니다.");
 utils.bulkEmail.listCampaigns.invalidate();
 setView("list");
 setForm(DEFAULT_FORM);
 },
 onError: (e) => toast.error(`저장 실패: ${e.message}`),
 });

 const updateMutation = trpc.bulkEmail.updateCampaign.useMutation({
 onSuccess: () => {
 toast.success("캠페인이 수정되었습니다.");
 utils.bulkEmail.listCampaigns.invalidate();
 setView("list");
 },
 onError: (e) => toast.error(`수정 실패: ${e.message}`),
 });

 const deleteMutation = trpc.bulkEmail.deleteCampaign.useMutation({
 onSuccess: () => {
 toast.success("캠페인이 삭제되었습니다.");
 utils.bulkEmail.listCampaigns.invalidate();
 },
 onError: (e) => toast.error(`삭제 실패: ${e.message}`),
 });

 const sendTestMutation = trpc.bulkEmail.sendTest.useMutation({
 onSuccess: () => toast.success("테스트 메일 발송 완료"),
 onError: (e) => toast.error(`테스트 발송 실패: ${e.message}`),
 });

 const sendCampaignMutation = trpc.bulkEmail.sendCampaign.useMutation({
 onSuccess: (data) => {
 toast.success(`발송 완료: ${data.sentCount}명 성공, ${data.failedCount}명 실패`);
 utils.bulkEmail.listCampaigns.invalidate();
 setShowSendConfirm(false);
 },
 onError: (e) => {
 toast.error(`발송 실패: ${e.message}`);
 setShowSendConfirm(false);
 },
 });

 const saveApiKeyMutation = trpc.bulkEmail.saveApiKey.useMutation({
 onSuccess: () => {
 toast.success("Brevo API 키가 저장되었습니다.");
 setApiKeyInput("");
 setShowApiKeyInput(false);
 utils.bulkEmail.validateApiKey.invalidate();
 utils.bulkEmail.getApiKey.invalidate();
 },
 onError: (e) => toast.error(`API 키 저장 실패: ${e.message}`),
 });

 const syncStatsMutation = trpc.bulkEmail.syncCampaignStats.useMutation({
 onSuccess: () => {
 toast.success("통계가 동기화되었습니다.");
 utils.bulkEmail.listCampaigns.invalidate();
 },
 onError: (e) => toast.error(`동기화 실패: ${e.message}`),
 });

 // 편집 시작
 const handleEdit = (id: number) => {
 setSelectedId(id);
 setView("edit");
 const campaign = campaignsQuery.data?.campaigns.find((c) => c.id === id);
 if (campaign) {
 setForm({
 name: campaign.name,
 subject: campaign.subject,
 previewText: campaign.previewText ||"",
 senderName: campaign.senderName,
 senderEmail: campaign.senderEmail,
 targetSegment: campaign.targetSegment,
 customEmails: campaign.customEmails ||"",
 contentType: campaign.contentType,
 htmlContent: campaign.htmlContent || DEFAULT_HTML_TEMPLATE,
 textContent: campaign.textContent ||"",
 scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) :"",
 notes: campaign.notes ||"",
 });
 }
 };

 // 저장
 const handleSave = (asDraft = true) => {
 if (!form.name || !form.subject) {
 toast.error("캠페인 이름과 제목은 필수입니다.");
 return;
 }
 const payload = {
 ...form,
 targetSegment: form.targetSegment as any,
 scheduledAt: form.scheduledAt || undefined,
 customEmails: form.customEmails || undefined,
 htmlContent: form.htmlContent || undefined,
 textContent: form.textContent || undefined,
 notes: form.notes || undefined,
 previewText: form.previewText || undefined,
 };
 if (view ==="edit"&& selectedId) {
 updateMutation.mutate({ id: selectedId, ...payload });
 } else {
 createMutation.mutate(payload);
 }
 };

 // 발송 확인
 const handleSendConfirm = (id: number) => {
 setSendTargetId(id);
 setShowSendConfirm(true);
 };

 // 테스트 발송
 const handleSendTest = (id: number) => {
 const emails = testEmailInput.split(/[\n,;]/).map((e) => e.trim()).filter((e) => e.includes("@"));
 if (emails.length === 0) {
 toast.error("테스트 이메일 주소를 입력하세요.");
 return;
 }
 sendTestMutation.mutate({ campaignId: id, testEmails: emails.slice(0, 5) });
 };

 const isApiKeyValid = apiKeyQuery.data?.valid;

 // ── API 키 설정 섹션 ────────────────────────────────────────
 const ApiKeySection = () => (
 <div className={`rounded-lg border p-4 ${
 isApiKeyValid
 ?"border-green-200 bg-green-50"
 :"border-amber-200 bg-amber-50"
 }`}>
 <div className="flex items-start justify-between gap-4">
 <div className="flex gap-3 items-start flex-1">
 {isApiKeyValid
 ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0"/>
 : <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0"/>}
 <div className="flex-1">
 {isApiKeyValid ? (
 <div className="text-sm text-green-800">
 <p className="font-semibold">Brevo 연결됨</p>
 <p>계정: <strong>{apiKeyQuery.data?.email}</strong> ({apiKeyQuery.data?.plan} 플랜)</p>
 {apiKeyStatusQuery.data?.masked && (
 <p className="text-xs mt-1 font-mono text-green-700">키: {apiKeyStatusQuery.data.masked}</p>
 )}
 </div>
 ) : (
 <div className="text-sm text-amber-800">
 <p className="font-semibold mb-1">Brevo API 키를 설정해 주세요</p>
 <p className="text-xs mb-2">
 <a href="https://app.brevo.com"target="_blank"rel="noopener noreferrer"className="underline inline-flex items-center gap-1">
 app.brevo.com <ExternalLink className="h-3 w-3"/>
 </a>
 {""}→ 프로필 → SMTP &amp; API → API Keys →"키 생성"
 </p>
 </div>
 )}
 </div>
 </div>
 <Button
 size="sm"
 variant="outline"
 onClick={() => setShowApiKeyInput(!showApiKeyInput)}
 className="shrink-0"
 >
 <Key className="h-3.5 w-3.5 mr-1"/>
 {isApiKeyValid ?"API 키 변경":"API 키 입력"}
 </Button>
 </div>
 {showApiKeyInput && (
 <div className="mt-3 pt-3 border-t border-amber-200 flex gap-2">
 <Input
 type="password"
 placeholder="xkeysib-... 형식의 Brevo API 키를 입력하세요"
 value={apiKeyInput}
 onChange={(e) => setApiKeyInput(e.target.value)}
 className="flex-1 font-mono text-sm"
 />
 <Button
 size="sm"
 onClick={() => saveApiKeyMutation.mutate({ apiKey: apiKeyInput })}
 disabled={!apiKeyInput.trim() || saveApiKeyMutation.isPending}
 >
 {saveApiKeyMutation.isPending ?"저장 중..." :"저장"}
 </Button>
 <Button size="sm"variant="ghost"onClick={() => { setShowApiKeyInput(false); setApiKeyInput(""); }}>
 취소
 </Button>
 </div>
 )}
 </div>
 );

 // ── 목록 뷰 ──────────────────────────────────────────────────────────────
 const ListView = () => (
 <div className="space-y-6">
 {/* API 키 설정 섹션 — 항상 표시 */}
 <ApiKeySection />

 {/* 상단 액션 */}
 <div className="flex items-center justify-between gap-4">
 <div className="flex items-center gap-2">
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-36">
 <SelectValue placeholder="전체 상태"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">전체 상태</SelectItem>
 <SelectItem value="draft">초안</SelectItem>
 <SelectItem value="scheduled">예약됨</SelectItem>
 <SelectItem value="sent">발송 완료</SelectItem>
 <SelectItem value="failed">실패</SelectItem>
 </SelectContent>
 </Select>
 <Button variant="outline"size="sm"onClick={() => utils.bulkEmail.listCampaigns.invalidate()}>
 <RefreshCw className="h-4 w-4 mr-1"/> 새로고침
 </Button>
 </div>
 <Button onClick={() => { setForm(DEFAULT_FORM); setView("create"); }}>
 <Plus className="h-4 w-4 mr-1"/> 새 캠페인
 </Button>
 </div>

 {/* 캠페인 목록 */}
 {campaignsQuery.isLoading ? (
 <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
 ) : campaignsQuery.data?.campaigns.length === 0 ? (
 <div className="text-center py-16 text-muted-foreground">
 <Mail className="h-12 w-12 mx-auto mb-3 opacity-30"/>
 <p className="font-medium">캠페인이 없습니다.</p>
 <p className="text-sm mt-1">새 캠페인을 만들어 대량 메일을 발송하세요.</p>
 </div>
 ) : (
 <div className="space-y-3">
 {campaignsQuery.data?.campaigns.map((campaign) => {
 const statusInfo = STATUS_BADGE[campaign.status] || STATUS_BADGE.draft;
 const openRate = campaign.sentCount > 0
 ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1)
 :"0.0";
 return (
 <Card key={campaign.id} className="">
 <CardContent className="p-4">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
 <span className="text-xs text-muted-foreground">{SEGMENT_LABELS[campaign.targetSegment]}</span>
 </div>
 <h3 className="font-semibold text-sm truncate">{campaign.name}</h3>
 <p className="text-xs text-muted-foreground truncate mt-0.5">{campaign.subject}</p>
 {/* 통계 */}
 {campaign.status ==="sent"&& (
 <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
 <span className="flex items-center gap-1"><Users className="h-3 w-3"/>{campaign.recipientCount.toLocaleString()}명</span>
 <span className="flex items-center gap-1"><Send className="h-3 w-3"/>{campaign.sentCount.toLocaleString()}건 발송</span>
 <span className="flex items-center gap-1"><Eye className="h-3 w-3"/>{openRate}% 열람</span>
 </div>
 )}
 {campaign.scheduledAt && campaign.status ==="scheduled"&& (
 <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
 <Clock className="h-3 w-3"/>
 {new Date(campaign.scheduledAt).toLocaleString("ko-KR")} 예약
 </p>
 )}
 </div>
 {/* 액션 버튼 */}
 <div className="flex items-center gap-1 shrink-0">
 {campaign.status ==="draft"|| campaign.status ==="scheduled"? (
 <>
 <Button size="sm"variant="outline"onClick={() => handleEdit(campaign.id)}>편집</Button>
 <Button size="sm"onClick={() => handleSendConfirm(campaign.id)} disabled={!isApiKeyValid}>
 <Send className="h-3 w-3 mr-1"/>발송
 </Button>
 </>
 ) : campaign.status ==="sent"&& campaign.brevoCampaignId ? (
 <Button size="sm"variant="outline"onClick={() => syncStatsMutation.mutate({ campaignId: campaign.id })}>
 <BarChart3 className="h-3 w-3 mr-1"/>통계 동기화
 </Button>
 ) : null}
 <Button
 size="sm"
 variant="ghost"
 className="text-destructive hover:text-destructive"
 onClick={() => deleteMutation.mutate({ id: campaign.id })}
 >
 <Trash2 className="h-3 w-3"/>
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>
 )}
 </div>
 );

 // ── 폼 뷰 (생성/편집) ────────────────────────────────────────────────────
 const FormView = () => (
 <div className="space-y-6">
 <div className="flex items-center gap-2">
 <Button variant="ghost"size="sm"onClick={() => setView("list")}>← 목록으로</Button>
 <h2 className="font-semibold">{view ==="create"?"새 캠페인":"캠페인 편집"}</h2>
 </div>

 {/* 기본 정보 */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-base">기본 정보</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>캠페인 이름 (내부용) *</Label>
 <Input
 value={form.name}
 onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
 placeholder="예: 5월 신상품 안내"
 className="mt-1"
 />
 </div>
 <div>
 <Label>메일 제목 *</Label>
 <Input
 value={form.subject}
 onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
 placeholder="예: 🌸 5월 신상품이 도착했습니다!"
 className="mt-1"
 />
 </div>
 </div>
 <div>
 <Label>미리보기 텍스트 (받은편지함 제목 아래 표시)</Label>
 <Input
 value={form.previewText}
 onChange={(e) => setForm((f) => ({ ...f, previewText: e.target.value }))}
 placeholder="예: 지금 바로 확인해보세요 →"
 className="mt-1"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>발신자 이름</Label>
 <Input
 value={form.senderName}
 onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
 className="mt-1"
 />
 </div>
 <div>
 <Label>발신자 이메일</Label>
 <Input
 value={form.senderEmail}
 onChange={(e) => setForm((f) => ({ ...f, senderEmail: e.target.value }))}
 className="mt-1"
 />
 </div>
 </div>
 </CardContent>
 </Card>

 {/* 수신자 세그먼트 */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-base">수신자 설정</CardTitle>
 <CardDescription>이메일 수신 동의 여부가 자동으로 필터링됩니다.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-end gap-4">
 <div className="flex-1">
 <Label>수신자 세그먼트</Label>
 <Select value={form.targetSegment} onValueChange={(v) => setForm((f) => ({ ...f, targetSegment: v }))}>
 <SelectTrigger className="mt-1">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {Object.entries(SEGMENT_LABELS).map(([value, label]) => (
 <SelectItem key={value} value={value}>{label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground">
 <Users className="h-4 w-4"/>
 {recipientCountQuery.isLoading ?"계산 중...": `약 ${recipientCountQuery.data?.count?.toLocaleString() ?? 0}명`}
 </div>
 </div>

 {form.targetSegment ==="custom"&& (
 <div>
 <Label>이메일 목록 (줄바꿈, 쉼표, 세미콜론으로 구분)</Label>
 <Textarea
 value={form.customEmails}
 onChange={(e) => setForm((f) => ({ ...f, customEmails: e.target.value }))}
 placeholder="user1@example.com&#10;user2@example.com"
 rows={5}
 className="mt-1 font-mono text-sm"
 />
 </div>
 )}
 </CardContent>
 </Card>

 {/* 메일 내용 */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-base">메일 내용</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex gap-2">
 <Button
 size="sm"
 variant={form.contentType ==="html"?"default":"outline"}
 onClick={() => setForm((f) => ({ ...f, contentType:"html"}))}
 >HTML</Button>
 <Button
 size="sm"
 variant={form.contentType ==="text"?"default":"outline"}
 onClick={() => setForm((f) => ({ ...f, contentType:"text"}))}
 >텍스트</Button>
 {form.contentType ==="html"&& (
 <Button size="sm"variant="outline"onClick={() => setHtmlPreviewOpen(true)}>
 <Eye className="h-3 w-3 mr-1"/>미리보기
 </Button>
 )}
 </div>

 {form.contentType ==="html"? (
 <Textarea
 value={form.htmlContent}
 onChange={(e) => setForm((f) => ({ ...f, htmlContent: e.target.value }))}
 rows={18}
 className="font-mono text-xs"
 placeholder="HTML 코드를 입력하세요..."
 />
 ) : (
 <Textarea
 value={form.textContent}
 onChange={(e) => setForm((f) => ({ ...f, textContent: e.target.value }))}
 rows={12}
 placeholder="텍스트 내용을 입력하세요..."
 />
 )}
 </CardContent>
 </Card>

 {/* 예약 발송 */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-base">예약 발송 (선택)</CardTitle>
 <CardDescription>비워두면 즉시 발송됩니다.</CardDescription>
 </CardHeader>
 <CardContent>
 <Input
 type="datetime-local"
 value={form.scheduledAt}
 onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
 />
 </CardContent>
 </Card>

 {/* 테스트 발송 (편집 모드에서만) */}
 {view ==="edit"&& selectedId && (
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-base">테스트 발송</CardTitle>
 <CardDescription>실제 발송 전 테스트 이메일로 확인하세요. (최대 5개)</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="flex gap-2">
 <Input
 value={testEmailInput}
 onChange={(e) => setTestEmailInput(e.target.value)}
 placeholder="test@example.com, test2@example.com"
 className="flex-1"
 />
 <Button
 variant="outline"
 onClick={() => handleSendTest(selectedId)}
 disabled={sendTestMutation.isPending || !isApiKeyValid}
 >
 {sendTestMutation.isPending ?"발송 중...":"테스트 발송"}
 </Button>
 </div>
 </CardContent>
 </Card>
 )}

 {/* 메모 */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-base">메모 (내부용)</CardTitle>
 </CardHeader>
 <CardContent>
 <Textarea
 value={form.notes}
 onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
 rows={3}
 placeholder="캠페인 관련 메모를 입력하세요..."
 />
 </CardContent>
 </Card>

 {/* 저장 버튼 */}
 <div className="flex gap-2 justify-end">
 <Button variant="outline"onClick={() => setView("list")}>취소</Button>
 <Button
 onClick={() => handleSave()}
 disabled={createMutation.isPending || updateMutation.isPending}
 >
 {createMutation.isPending || updateMutation.isPending ?"저장 중...":"저장"}
 </Button>
 </div>
 </div>
 );

 return (
 <AdminLayout>
 <div className="p-6 max-w-4xl mx-auto">
 {/* 페이지 헤더 */}
 <div className="mb-6">
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <Mail className="h-6 w-6 text-primary"/>
 대량 메일 발송
 </h1>
 <p className="text-muted-foreground text-sm mt-1">
 Brevo API를 통해 고객 세그먼트별 대량 마케팅 메일을 발송합니다.
 </p>
 </div>

 {view ==="list"&& <ListView />}
 {(view ==="create"|| view ==="edit") && <FormView />}

 {/* 발송 확인 다이얼로그 */}
 <Dialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>캠페인 발송 확인</DialogTitle>
 </DialogHeader>
 <div className="py-2 text-sm text-muted-foreground space-y-2">
 <p>선택한 캠페인을 지금 발송하시겠습니까?</p>
 <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2 text-amber-800 text-xs">
 <Info className="h-4 w-4 shrink-0 mt-0.5"/>
 <span>발송 후에는 취소할 수 없습니다. 수신자 수와 내용을 다시 한번 확인하세요.</span>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline"onClick={() => setShowSendConfirm(false)}>취소</Button>
 <Button
 onClick={() => sendTargetId && sendCampaignMutation.mutate({ campaignId: sendTargetId })}
 disabled={sendCampaignMutation.isPending}
 >
 {sendCampaignMutation.isPending ? (
 <><RefreshCw className="h-4 w-4 mr-1 animate-spin"/>발송 중...</>
 ) : (
 <><Send className="h-4 w-4 mr-1"/>발송하기</>
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* HTML 미리보기 다이얼로그 */}
 <Dialog open={htmlPreviewOpen} onOpenChange={setHtmlPreviewOpen}>
 <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>HTML 미리보기</DialogTitle>
 </DialogHeader>
 <div className="border rounded-lg overflow-hidden">
 <iframe
 srcDoc={form.htmlContent}
 className="w-full h-[500px]"
 title="이메일 미리보기"
 sandbox="allow-same-origin"
 />
 </div>
 </DialogContent>
 </Dialog>
 </div>
 </AdminLayout>
 );
}
