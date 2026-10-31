import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Mail, Send, Info, ExternalLink, Eye, RefreshCw } from "lucide-react";

const EMAIL_PREVIEW_TYPES = [
  { value: "test_email", label: "테스트 이메일" },
  { value: "delivery_completion", label: "배송 완료 알림" },
  { value: "review_reminder_7days", label: "리뷰 요청 (7일)" },
  { value: "order_cancellation", label: "주문 취소 알림" },
  { value: "delayed_shipment", label: "배송 지연 알림" },
  { value: "inquiry_receipt", label: "문의 접수 확인" },
  { value: "point_expiry_alert", label: "포인트 만료 알림" },
  { value: "retry_payment", label: "재결제 유도" },
];

// 미리보기 유형 → 실제 발송 가능 여부 매핑 (모든 8가지 유형 지원)
const SENDABLE_TYPES = new Set([
  "test_email",
  "delivery_completion",
  "review_reminder_7days",
  "point_expiry_alert",
  "order_cancellation",
  "delayed_shipment",
  "inquiry_receipt",
  "retry_payment",
]);

export default function EmailSettingsForm() {
  const { data: domainsData, isLoading: loadingDomains, refetch: refetchDomains } = trpc.admin.resend.getDomains.useQuery();
  const domains = domainsData?.domains || [];
  const isRestricted = domainsData?.restricted || false;
  const { data: siteSettings, refetch: refetchSiteSettings } = trpc.admin.siteSettings.getAll.useQuery();

  // Preview state
  const [previewType, setPreviewType] = useState("test_email");
  const [showPreview, setShowPreview] = useState(false);
  const [previewSendTo, setPreviewSendTo] = useState("");
  const { data: previewData, isLoading: loadingPreview, refetch: refetchPreview } = trpc.emailLogs.getPreviewHtml.useQuery(
    { emailType: previewType },
    { enabled: showPreview }
  );

  // Mutations
  const sendTestEmail = trpc.admin.resend.sendTestEmail.useMutation({
    onSuccess: () => toast.success("테스트 이메일을 발송했습니다. 수신함을 확인해주세요."),
    onError: (error) => toast.error(`테스트 이메일 발송 실패: ${error.message}`),
  });
  const sendTestDelivery = trpc.emailLogs.sendTestDelivery.useMutation({
    onSuccess: () => toast.success("배송 완료 테스트 이메일을 발송했습니다."),
    onError: (error) => toast.error(`발송 실패: ${error.message}`),
  });
  const sendTestReviewReminder = trpc.emailLogs.sendTestReviewReminder.useMutation({
    onSuccess: () => toast.success("리뷰 요청 테스트 이메일을 발송했습니다."),
    onError: (error) => toast.error(`발송 실패: ${error.message}`),
  });
  const sendTestPointExpiry = trpc.emailLogs.sendTestPointExpiry.useMutation({
    onSuccess: () => toast.success("포인트 만료 테스트 이메일을 발송했습니다."),
    onError: (error) => toast.error(`발송 실패: ${error.message}`),
  });
  const sendTestOrderCancellation = trpc.emailLogs.sendTestOrderCancellation.useMutation({
    onSuccess: () => toast.success("주문 취소 테스트 이메일을 발송했습니다."),
    onError: (error) => toast.error(`발송 실패: ${error.message}`),
  });
  const sendTestDelayedShipment = trpc.emailLogs.sendTestDelayedShipment.useMutation({
    onSuccess: () => toast.success("배송 지연 테스트 이메일을 발송했습니다."),
    onError: (error) => toast.error(`발송 실패: ${error.message}`),
  });
  const sendTestInquiryReceipt = trpc.emailLogs.sendTestInquiryReceipt.useMutation({
    onSuccess: () => toast.success("문의 접수 테스트 이메일을 발송했습니다."),
    onError: (error) => toast.error(`발송 실패: ${error.message}`),
  });
  const sendTestRetryPayment = trpc.emailLogs.sendTestRetryPayment.useMutation({
    onSuccess: () => toast.success("재결제 유도 테스트 이메일을 발송했습니다."),
    onError: (error) => toast.error(`발송 실패: ${error.message}`),
  });

  const updateSiteSetting = trpc.admin.siteSettings.update.useMutation({
    onSuccess: () => { toast.success("이메일 설정이 저장되었습니다."); refetchSiteSettings(); },
    onError: (error) => toast.error(`설정 저장 실패: ${error.message}`),
  });

  const [emailFrom, setEmailFrom] = useState("");
  const [emailFromName, setEmailFromName] = useState("");

  useEffect(() => {
    if (siteSettings) {
      const fromAddress = siteSettings.find(s => s.key === "EMAIL_FROM_ADDRESS");
      const fromName = siteSettings.find(s => s.key === "EMAIL_FROM_NAME");
      setEmailFrom(fromAddress?.value || "onboarding@resend.dev");
      setEmailFromName(fromName?.value || "ココくすり");
    }
  }, [siteSettings]);

  const handleSaveEmailSettings = () => {
    updateSiteSetting.mutate({ key: "EMAIL_FROM_ADDRESS", value: emailFrom || null });
    updateSiteSetting.mutate({ key: "EMAIL_FROM_NAME", value: emailFromName || null });
  };

  // 미리보기 모달에서 즉시 발송
  const handleSendFromPreview = () => {
    if (!previewSendTo) { toast.error("수신자 이메일 주소를 입력해주세요."); return; }
    if (previewType === "test_email") {
      sendTestEmail.mutate({ to: previewSendTo, from: emailFrom || "onboarding@resend.dev", fromName: emailFromName || "ココくすり" });
    } else if (previewType === "delivery_completion") {
      sendTestDelivery.mutate({ to: previewSendTo });
    } else if (previewType === "review_reminder_7days") {
      sendTestReviewReminder.mutate({ to: previewSendTo });
    } else if (previewType === "point_expiry_alert") {
      sendTestPointExpiry.mutate({ to: previewSendTo });
    } else if (previewType === "order_cancellation") {
      sendTestOrderCancellation.mutate({ to: previewSendTo });
    } else if (previewType === "delayed_shipment") {
      sendTestDelayedShipment.mutate({ to: previewSendTo });
    } else if (previewType === "inquiry_receipt") {
      sendTestInquiryReceipt.mutate({ to: previewSendTo });
    } else if (previewType === "retry_payment") {
      sendTestRetryPayment.mutate({ to: previewSendTo });
    }
  };

  const isSendingFromPreview =
    sendTestEmail.isPending ||
    sendTestDelivery.isPending ||
    sendTestReviewReminder.isPending ||
    sendTestPointExpiry.isPending ||
    sendTestOrderCancellation.isPending ||
    sendTestDelayedShipment.isPending ||
    sendTestInquiryReceipt.isPending ||
    sendTestRetryPayment.isPending;

  const canSendFromPreview = SENDABLE_TYPES.has(previewType);

  return (
    <div className="space-y-6">
      {/* ── 1. Resend 도메인 목록 ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Resend 도메인 목록</h3>
          <Button variant="ghost" size="sm" onClick={() => refetchDomains()} className="h-7 gap-1 text-xs">
            <RefreshCw className="w-3 h-3" />새로고침
          </Button>
        </div>
        {loadingDomains ? (
          <div className="text-xs text-muted-foreground">도메인 정보를 불러오는 중...</div>
        ) : isRestricted ? (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-amber-900 mb-1">API 키 제한</p>
                <p className="text-amber-800 mb-2">
                  현재 Resend API 키는 이메일 발송 전용으로 제한되어 있어 도메인 목록을 조회할 수 없습니다.
                  발신자 설정과 테스트 이메일 발송은 정상적으로 작동합니다.
                </p>
                <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-amber-900 font-semibold hover:underline inline-flex items-center gap-1">
                  Resend 대시보드에서 도메인 확인 <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        ) : domains.length > 0 ? (
          <div className="space-y-2">
            {domains.map((domain: any) => (
              <Card key={domain.id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{domain.name}</p>
                      <p className="text-xs text-muted-foreground">생성일: {new Date(domain.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                  </div>
                  {domain.status === "verified" ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />인증됨</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs"><XCircle className="w-3 h-3 mr-1" />미인증</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
            <div className="text-xs text-muted-foreground mt-2 p-3 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-800 mb-1">커스텀 도메인 설정 방법</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li><a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline">Resend 대시보드</a>에서 도메인 추가</li>
                <li>DNS 레코드 (SPF, DKIM) 설정</li>
                <li>인증 완료 후 아래 발신자 이메일에 해당 도메인 사용</li>
              </ol>
            </div>
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center text-xs text-muted-foreground">
              등록된 도메인이 없습니다.{" "}
              <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Resend 대시보드</a>에서 도메인을 추가하세요.
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── 2. 발신자 설정 ── */}
      <div>
        <h3 className="text-base font-semibold mb-3">발신자 설정</h3>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label htmlFor="email-from" className="text-xs">발신자 이메일 주소</Label>
              <Input id="email-from" type="email" placeholder="noreply@yourdomain.com" value={emailFrom}
                onChange={(e) => setEmailFrom(e.target.value)} className="h-8 text-xs mt-1" />
              <p className="text-xs text-muted-foreground mt-1">인증된 도메인의 이메일 주소 (예: noreply@yourdomain.com)</p>
            </div>
            <div>
              <Label htmlFor="email-from-name" className="text-xs">발신자 이름</Label>
              <Input id="email-from-name" placeholder="ココくすり" value={emailFromName}
                onChange={(e) => setEmailFromName(e.target.value)} className="h-8 text-xs mt-1" />
              <p className="text-xs text-muted-foreground mt-1">이메일에 표시될 발신자 이름</p>
            </div>
            <Button size="sm" onClick={handleSaveEmailSettings} disabled={updateSiteSetting.isPending} className="h-8 text-xs">
              {updateSiteSetting.isPending ? "저장 중..." : "발신자 설정 저장"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. 이메일 HTML 미리보기 + 즉시 발송 ── */}
      <div>
        <h3 className="text-base font-semibold mb-3">이메일 미리보기 및 테스트 발송</h3>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Select value={previewType} onValueChange={v => { setPreviewType(v); }}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="이메일 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_PREVIEW_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => setShowPreview(true)} className="h-8 text-xs gap-1.5 flex-shrink-0">
                <Eye className="w-3.5 h-3.5" />미리보기 및 발송
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              유형을 선택하고 미리보기를 열면 HTML 렌더링 확인 후 바로 테스트 이메일을 발송할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── 미리보기 + 즉시 발송 다이얼로그 ── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-sm font-semibold">
                이메일 미리보기
              </DialogTitle>
              {/* 유형 선택 */}
              <Select value={previewType} onValueChange={v => { setPreviewType(v); setTimeout(() => refetchPreview(), 50); }}>
                <SelectTrigger className="h-7 text-xs w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_PREVIEW_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => refetchPreview()} className="h-7 px-2 flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </DialogHeader>

          {/* iframe 미리보기 영역 */}
          <div className="flex-1 overflow-auto bg-gray-100 min-h-0">
            {loadingPreview ? (
              <div className="flex items-center justify-center h-64 text-xs text-muted-foreground">미리보기 생성 중...</div>
            ) : previewData?.html ? (
              <iframe
                srcDoc={previewData.html}
                className="w-full border-0"
                style={{ height: "480px" }}
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-xs text-muted-foreground">미리보기를 불러올 수 없습니다.</div>
            )}
          </div>

          {/* 즉시 발송 영역 */}
          <div className="flex-shrink-0 border-t bg-white px-4 py-3">
            {canSendFromPreview ? (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  type="email"
                  placeholder="수신자 이메일 주소 입력 후 발송"
                  value={previewSendTo}
                  onChange={(e) => setPreviewSendTo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendFromPreview()}
                  className="h-8 text-xs flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleSendFromPreview}
                  disabled={isSendingFromPreview || !previewSendTo}
                  className="h-8 text-xs gap-1.5 flex-shrink-0 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSendingFromPreview ? "발송 중..." : "테스트 발송"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>지원하지 않는 유형입니다.</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
