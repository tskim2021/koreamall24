import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bot,
  Save,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  BarChart3,
  Send,
  FlaskConical,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useLocation } from "wouter";

export default function AdminAISettings() {
  const [, navigate] = useLocation();

  // URL 파라미터로 FAQ 다이얼로그 자동 열기 (문의 답변 페이지에서 넘어올 때)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const a = params.get('a');
    if (q || a) {
      setFaqQuestion(q || '');
      setFaqAnswer(a || '');
      setSaveFaqDialog({ open: true });
      // URL 파라미터 제거
      window.history.replaceState({}, '', '/admin/ai-settings');
    }
  }, []);

  // 설정 상태
  const [enabled, setEnabled] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [cannotAnswerMessage, setCannotAnswerMessage] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // 설정 조회
  const { data: settings, isLoading: loadingSettings, refetch: refetchSettings } =
    trpc.admin.aiSettings.get.useQuery();

  // 검토 필요 목록 조회
  const { data: pendingReviews, isLoading: loadingReviews, refetch: refetchReviews } =
    trpc.admin.aiSettings.getPendingReviews.useQuery();

  // 설정 저장
  const saveMutation = trpc.admin.aiSettings.save.useMutation({
    onSuccess: () => {
      toast.success("AI 자동 답변 설정이 저장되었습니다.");
      setIsDirty(false);
      refetchSettings();
    },
    onError: (err) => {
      toast.error(`저장 실패: ${err.message}`);
    },
  });

  // 검토 완료 처리
  const markReviewedMutation = trpc.admin.aiSettings.markReviewed.useMutation({
    onSuccess: () => {
      toast.success("검토 완료 처리되었습니다.");
      refetchReviews();
    },
    onError: (err) => {
      toast.error(`처리 실패: ${err.message}`);
    },
  });

  // FAQ 저장 다이얼로그 상태
  const [saveFaqDialog, setSaveFaqDialog] = useState<{
    open: boolean;
    commentId?: number;
    inquiryTitle?: string;
    content?: string;
  }>({ open: false });
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqCategory, setFaqCategory] = useState<"product" | "order_shipping" | "payment" | "member_points" | "other">("other");
  const [faqKeywords, setFaqKeywords] = useState("");

  // 통계 조회
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } =
    trpc.admin.aiSettings.getStats.useQuery();
  // AI 테스트 패널 상태
  const [testQuestion, setTestQuestion] = useState("");
  const [testResult, setTestResult] = useState<{ canAnswer: boolean; reply: string; confidence: number } | null>(null);
  const testMutation = trpc.admin.aiSettings.test.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (err) => {
      toast.error(`테스트 실패: ${err.message}`);
    },
  });
  const saveAsFAQMutation = trpc.admin.aiSettings.saveAsFAQ.useMutation({
    onSuccess: () => {
      toast.success("FAQ에 추가되었습니다.");
      setSaveFaqDialog({ open: false });
      setFaqQuestion("");
      setFaqAnswer("");
      setFaqKeywords("");
    },
    onError: (err) => {
      toast.error(`FAQ 저장 실패: ${err.message}`);
    },
  });

  // 설정 로드 시 상태 초기화
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setConfidenceThreshold(settings.confidenceThreshold);
      setSystemPrompt(settings.systemPrompt);
      setCannotAnswerMessage(settings.cannotAnswerMessage);
      setIsDirty(false);
    }
  }, [settings]);

  const handleSave = () => {
    saveMutation.mutate({
      enabled,
      confidenceThreshold,
      systemPrompt,
      cannotAnswerMessage,
    });
  };

  const openFaqDialog = (review: { commentId: number; inquiryTitle: string | null; content: string }) => {
    setFaqQuestion(review.inquiryTitle || "");
    setFaqAnswer(review.content.replace(/\n\n---\n\*.+\*$/, "").trim()); // AI 태그 제거
    setSaveFaqDialog({ open: true, commentId: review.commentId, inquiryTitle: review.inquiryTitle || "", content: review.content });
  };

  const aiAnswerRate = stats && stats.totalInquiries > 0
    ? Math.round((stats.aiAnswered / stats.totalInquiries) * 100)
    : 0;
  const reviewRate = stats && stats.aiAnswered > 0
    ? Math.round((stats.reviewed / stats.aiAnswered) * 100)
    : 0;

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-6 h-6 text-violet-600" />
              AI 자동 답변 설정
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              고객 문의에 대한 AI 자동 답변 동작을 설정합니다.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !isDirty}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            설정 저장
          </Button>
        </div>

        {loadingSettings ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
          </div>
        ) : (
          <>
            {/* 기본 설정 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">기본 설정</CardTitle>
                <CardDescription>AI 자동 답변 활성화 및 답변 기준을 설정합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ON/OFF */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-semibold">AI 자동 답변 활성화</Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      비활성화 시 모든 문의는 담당자가 직접 답변해야 합니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={enabled ? "default" : "secondary"}
                      className={enabled ? "bg-emerald-100 text-emerald-700 border-emerald-200" : ""}
                    >
                      {enabled ? "활성화" : "비활성화"}
                    </Badge>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => { setEnabled(v); setIsDirty(true); }}
                    />
                  </div>
                </div>

                {/* Confidence Threshold */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">자동 답변 확신도 임계값</Label>
                    <span className="text-sm font-bold text-violet-600">
                      {Math.round(confidenceThreshold * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={[confidenceThreshold]}
                    onValueChange={([v]) => { setConfidenceThreshold(v); setIsDirty(true); }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0% (모두 자동 답변)</span>
                    <span>100% (거의 자동 답변 안 함)</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      AI가 이 확신도 이상일 때만 자동 답변합니다. 미만이면 담당자 확인 안내 메시지가 자동 등록됩니다.
                      권장값: <strong>70%</strong>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 시스템 프롬프트 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI 시스템 프롬프트</CardTitle>
                <CardDescription>
                  AI가 답변을 생성할 때 사용하는 기본 지침입니다. 쇼핑몰 정보, 답변 스타일 등을 설정하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => { setSystemPrompt(e.target.value); setIsDirty(true); }}
                  rows={12}
                  className="font-mono text-xs resize-none"
                  placeholder="AI 시스템 프롬프트를 입력하세요..."
                />
                <p className="text-xs text-gray-400 mt-2 text-right">{systemPrompt.length}자</p>
              </CardContent>
            </Card>

            {/* 담당자 안내 메시지 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">담당자 확인 안내 메시지</CardTitle>
                <CardDescription>
                  AI가 답변하기 어려운 문의에 자동으로 등록되는 안내 메시지입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={cannotAnswerMessage}
                  onChange={(e) => { setCannotAnswerMessage(e.target.value); setIsDirty(true); }}
                  rows={8}
                  className="text-sm resize-none"
                  placeholder="담당자 안내 메시지를 입력하세요..."
                />
                <p className="text-xs text-gray-400 mt-2 text-right">{cannotAnswerMessage.length}자</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* AI 통계 대시보드 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-600" />
                  AI 자동 답변 통계
                </CardTitle>
                <CardDescription>AI 자동 답변 운영 현황을 확인합니다.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetchStats()}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalInquiries ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">전체 문의</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-violet-700">{stats?.aiAnswered ?? 0}</p>
                  <p className="text-xs text-violet-600 mt-1">AI 자동 답변</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{stats?.pendingReview ?? 0}</p>
                  <p className="text-xs text-amber-600 mt-1">검토 필요</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{stats?.reviewed ?? 0}</p>
                  <p className="text-xs text-emerald-600 mt-1">검토 완료</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{stats?.faqSaved ?? 0}</p>
                  <p className="text-xs text-blue-600 mt-1">FAQ 등록</p>
                </div>
              </div>
            )}
            {!loadingStats && stats && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-violet-600" />
                  <div>
                    <p className="text-xs text-gray-500">AI 자동 답변 비율</p>
                    <p className="text-sm font-bold text-violet-700">{aiAnswerRate}%</p>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 ml-auto">
                    <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${aiAnswerRate}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs text-gray-500">검토 완료율</p>
                    <p className="text-sm font-bold text-emerald-700">{reviewRate}%</p>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 ml-auto">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${reviewRate}%` }} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI 답변 테스트 패널 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-blue-600" />
              AI 답변 테스트
            </CardTitle>
            <CardDescription>
              가상 문의를 입력하여 현재 AI 설정으로 어떤 답변이 생성되는지 미리 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">테스트 문의 내용</Label>
              <Textarea
                value={testQuestion}
                onChange={(e) => setTestQuestion(e.target.value)}
                rows={4}
                className="resize-none text-sm"
                placeholder="예: 배송은 얼마나 걸리나요? / 반품은 어떻게 하나요?"
              />
            </div>
            <Button
              onClick={() => testMutation.mutate({ question: testQuestion })}
              disabled={testMutation.isPending || !testQuestion.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {testMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              AI 답변 테스트
            </Button>
            {testResult && (
              <div className={`rounded-lg border p-4 space-y-3 ${
                testResult.canAnswer
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {testResult.canAnswer ? (
                      <><CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700">자동 답변 가능</span></>
                    ) : (
                      <><AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-700">담당자 안내 메시지 발송</span></>
                    )}
                  </div>
                  <Badge variant="outline" className={testResult.canAnswer ? 'border-emerald-300 text-emerald-700' : 'border-amber-300 text-amber-700'}>
                    확신도 {Math.round(testResult.confidence * 100)}%
                  </Badge>
                </div>
                <div className="bg-white rounded-md border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 mb-1 font-semibold">AI 생성 답변:</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{testResult.reply}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI 검토 필요 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  AI 자동 답변 검토 목록
                  {pendingReviews && pendingReviews.length > 0 && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                      {pendingReviews.length}건
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  AI가 자동으로 답변한 문의입니다. 내용을 확인하고 검토 완료 처리하세요.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetchReviews()}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingReviews ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : !pendingReviews || pendingReviews.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
                <p className="text-sm">검토 필요한 AI 답변이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReviews.map((review) => (
                  <div
                    key={review.commentId}
                    className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-800 truncate">
                            {review.inquiryTitle || "제목 없음"}
                          </span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 flex-shrink-0">
                            <Bot className="w-2.5 h-2.5" />AI自動回答
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap">
                          {review.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {review.createdAt
                            ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: ko })
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-3 border-violet-200 text-violet-700 hover:bg-violet-50"
                        onClick={() => navigate(`/admin/inquiries`)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        문의 보기
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() =>
                          openFaqDialog({
                            commentId: review.commentId,
                            inquiryTitle: review.inquiryTitle,
                            content: review.content,
                          })
                        }
                      >
                        <Lightbulb className="w-3 h-3 mr-1" />
                        FAQ로 저장
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => markReviewedMutation.mutate({ commentId: review.commentId })}
                        disabled={markReviewedMutation.isPending}
                      >
                        {markReviewedMutation.isPending ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        )}
                        검토 완료
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* FAQ 저장 다이얼로그 */}
        {saveFaqDialog.open && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold">FAQ로 저장</h2>
              </div>
              <p className="text-xs text-gray-500">
                이 답변을 챗봇 FAQ에 추가하면 유사한 문의에 더 정확하게 자동 답변할 수 있습니다.
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold">질문 (일본어)</Label>
                  <Textarea
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                    rows={2}
                    className="mt-1 text-sm resize-none"
                    placeholder="FAQ 질문을 입력하세요..."
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">답변 (일본어)</Label>
                  <Textarea
                    value={faqAnswer}
                    onChange={(e) => setFaqAnswer(e.target.value)}
                    rows={5}
                    className="mt-1 text-sm resize-none"
                    placeholder="FAQ 답변을 입력하세요..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">카테고리</Label>
                    <select
                      value={faqCategory}
                      onChange={(e) => setFaqCategory(e.target.value as typeof faqCategory)}
                      className="mt-1 w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="product">상품</option>
                      <option value="order_shipping">주문/배송</option>
                      <option value="payment">결제</option>
                      <option value="member_points">회원/포인트</option>
                      <option value="other">기타</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">키워드 (쉼표 구분)</Label>
                    <input
                      type="text"
                      value={faqKeywords}
                      onChange={(e) => setFaqKeywords(e.target.value)}
                      className="mt-1 w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="배송, 추적, 운송장..."
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveFaqDialog({ open: false })}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() =>
                    saveAsFAQMutation.mutate({
                      questionJa: faqQuestion,
                      answerJa: faqAnswer,
                      category: faqCategory,
                      keywords: faqKeywords || undefined,
                    })
                  }
                  disabled={saveAsFAQMutation.isPending || !faqQuestion.trim() || !faqAnswer.trim()}
                >
                  {saveAsFAQMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1" />
                  )}
                  FAQ 저장
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
