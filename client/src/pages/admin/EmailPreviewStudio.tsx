import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail,
  Send,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  ChevronRight,
  Eye,
  CheckCircle2,
  Search,
  Loader2,
  ExternalLink,
} from "lucide-react";

// ─────────────────────────────────────────────
// 이메일 카테고리 / 타입 데이터
// ─────────────────────────────────────────────
const EMAIL_CATEGORIES = [
  {
    label: "회원 관리",
    icon: "👤",
    dotColor: "bg-blue-500",
    types: [
      { key: "registration_complete", label: "회원가입 완료", desc: "신규 회원 가입 시 발송" },
      { key: "password_changed", label: "비밀번호 변경 완료", desc: "비밀번호 변경 시 발송" },
      { key: "profile_updated", label: "프로필 수정 확인", desc: "프로필 정보 변경 시 발송" },
    ],
  },
  {
    label: "주문 / 배송",
    icon: "📦",
    dotColor: "bg-orange-500",
    types: [
      { key: "order_confirmation", label: "주문 확인", desc: "주문 완료 시 발송" },
      { key: "order_shipped", label: "배송 출발", desc: "배송 시작 시 발송" },
      { key: "delivery_completion", label: "배송 완료", desc: "배송 완료 시 발송" },
      { key: "order_cancellation", label: "주문 취소", desc: "주문 취소 시 발송" },
      { key: "delayed_shipment", label: "배송 지연", desc: "배송 지연 시 발송" },
      { key: "retry_payment", label: "재결제 유도", desc: "결제 실패 후 발송" },
    ],
  },
  {
    label: "문의 / 리뷰",
    icon: "💬",
    dotColor: "bg-purple-500",
    types: [
      { key: "inquiry_receipt", label: "문의 접수 확인", desc: "1:1 문의 접수 시 발송" },
      { key: "inquiry_reply", label: "문의 답변", desc: "1:1 문의 답변 시 발송" },
      { key: "new_product_question", label: "상품 Q&A 알림", desc: "상품 Q&A 등록 시 발송" },
      { key: "review_approved", label: "리뷰 승인", desc: "리뷰 승인 시 발송" },
      { key: "review_rejected", label: "리뷰 반려", desc: "리뷰 반려 시 발송" },
      { key: "review_reminder_7days", label: "리뷰 요청 (7일)", desc: "구매 7일 후 발송" },
      { key: "review_reminder_30days", label: "리뷰 요청 (30일)", desc: "구매 30일 후 발송" },
    ],
  },
  {
    label: "쿠폰 / 포인트",
    icon: "🎁",
    dotColor: "bg-pink-500",
    types: [
      { key: "coupon_issued", label: "쿠폰 발급", desc: "쿠폰 발급 시 발송" },
      { key: "coupon_expiry_warning", label: "쿠폰 만료 예정", desc: "쿠폰 만료 3일 전 발송" },
      { key: "birthday_coupon", label: "생일 쿠폰", desc: "생일 당일 발송" },
      { key: "first_purchase_coupon", label: "첫 구매 감사 쿠폰", desc: "첫 구매 완료 시 발송" },
      { key: "point_earned", label: "포인트 적립", desc: "포인트 적립 시 발송" },
      { key: "point_expiry_alert", label: "포인트 만료 알림", desc: "포인트 만료 30일 전 발송" },
    ],
  },
  {
    label: "이벤트 / 알림",
    icon: "🎉",
    dotColor: "bg-green-500",
    types: [
      { key: "event_started", label: "이벤트 시작", desc: "이벤트 시작 시 발송" },
      { key: "event_ending_soon", label: "이벤트 종료 임박", desc: "이벤트 종료 1일 전 발송" },
      { key: "restock_alert", label: "재입고 알림", desc: "재입고 시 발송" },
      { key: "price_drop", label: "가격 인하", desc: "가격 인하 시 발송" },
      { key: "announcement", label: "공지사항", desc: "공지사항 등록 시 발송" },
    ],
  },
  {
    label: "테스트",
    icon: "🧪",
    dotColor: "bg-gray-400",
    types: [
      { key: "test_email", label: "테스트 이메일", desc: "이메일 시스템 테스트용" },
      { key: "test_delivery", label: "테스트 - 배송 완료", desc: "배송 완료 이메일 테스트" },
      { key: "test_point_expiry", label: "테스트 - 포인트 만료", desc: "포인트 만료 이메일 테스트" },
      { key: "test_review_reminder", label: "테스트 - 리뷰 요청", desc: "리뷰 요청 이메일 테스트" },
    ],
  },
];

const ALL_TYPES = EMAIL_CATEGORIES.flatMap((c) =>
  c.types.map((t) => ({ ...t, category: c.label, categoryIcon: c.icon, dotColor: c.dotColor }))
);

type ViewportMode = "desktop" | "tablet" | "mobile";

const VIEWPORT_SIZES: Record<ViewportMode, { width: string; label: string }> = {
  desktop: { width: "100%", label: "데스크탑" },
  tablet: { width: "768px", label: "태블릿" },
  mobile: { width: "390px", label: "모바일" },
};

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function EmailPreviewStudio() {
  const [selectedType, setSelectedType] = useState<string>("order_confirmation");
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [searchQuery, setSearchQuery] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(EMAIL_CATEGORIES.map((c) => c.label))
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const selectedMeta = ALL_TYPES.find((t) => t.key === selectedType);

  // 미리보기 HTML 쿼리
  const { data: previewData, isLoading, refetch } = trpc.emailLogs.getPreviewHtml.useQuery(
    { emailType: selectedType },
    { enabled: !!selectedType }
  );

  // 테스트 발송 뮤테이션 (선택된 이메일 타입에 맞게 발송)
  const sendTestMutation = trpc.emailLogs.sendTestByType.useMutation({
    onSuccess: () => {
      const typeMeta = ALL_TYPES.find((t) => t.key === selectedType);
      toast.success(`「${typeMeta?.label || selectedType}」 테스트 이메일이 ${testEmail}로 발송되었습니다.`);
      setSendingTest(false);
    },
    onError: (err) => {
      toast.error(err.message || "테스트 발송에 실패했습니다.");
      setSendingTest(false);
    },
  });

  const handleSendTest = () => {
    if (!testEmail) { toast.error("이메일 주소를 입력하세요."); return; }
    setSendingTest(true);
    sendTestMutation.mutate({ to: testEmail, emailType: selectedType });
  };

  const toggleCategory = (label: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // 검색 필터링
  const filteredCategories = EMAIL_CATEGORIES.map((cat) => ({
    ...cat,
    types: cat.types.filter(
      (t) =>
        !searchQuery ||
        t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.key.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.types.length > 0);

  const totalCount = ALL_TYPES.length;

  return (
    <AdminLayout noPadding>
      <div className="flex overflow-hidden bg-gray-50" style={{ height: "calc(100vh - 56px)" }}>
        {/* ── 왼쪽 사이드바: 템플릿 목록 ── */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          {/* 사이드바 헤더 */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                <Mail className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">이메일 미리보기</h2>
                <p className="text-[11px] text-gray-400">총 {totalCount}개 템플릿</p>
              </div>
            </div>
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="템플릿 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs border-gray-200 bg-gray-50"
              />
            </div>
          </div>

          {/* 카테고리 목록 */}
          <div className="flex-1 overflow-y-auto py-2">
            {filteredCategories.map((cat) => (
              <div key={cat.label}>
                {/* 카테고리 헤더 */}
                <button
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCategory(cat.label)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{cat.icon}</span>
                    <span className="text-xs font-semibold text-gray-600">{cat.label}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-gray-200 text-gray-400">
                      {cat.types.length}
                    </Badge>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                      expandedCategories.has(cat.label) ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {/* 템플릿 항목 */}
                {expandedCategories.has(cat.label) && (
                  <div className="pb-1">
                    {cat.types.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setSelectedType(t.key)}
                        className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors hover:bg-gray-50 ${
                          selectedType === t.key ? "bg-pink-50 border-r-2 border-pink-500" : ""
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cat.dotColor}`} />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs font-medium truncate ${
                              selectedType === t.key ? "text-pink-700" : "text-gray-800"
                            }`}
                          >
                            {t.label}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{t.desc}</p>
                        </div>
                        {selectedType === t.key && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-pink-500 flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Search className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </aside>

        {/* ── 오른쪽 미리보기 영역 ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 상단 툴바 */}
          <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 flex-shrink-0 flex-wrap">
            {/* 현재 선택된 템플릿 정보 */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-md bg-pink-100 flex items-center justify-center flex-shrink-0">
                <Eye className="w-3.5 h-3.5 text-pink-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {selectedMeta?.label || selectedType}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-gray-400 border-gray-200 flex-shrink-0">
                    {selectedType}
                  </Badge>
                </div>
                {selectedMeta && (
                  <p className="text-[11px] text-gray-400 truncate">{selectedMeta.desc}</p>
                )}
              </div>
            </div>

            {/* 뷰포트 전환 */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
              {(["desktop", "tablet", "mobile"] as ViewportMode[]).map((mode) => {
                const icons = {
                  desktop: <Monitor className="w-4 h-4" />,
                  tablet: <Tablet className="w-4 h-4" />,
                  mobile: <Smartphone className="w-4 h-4" />,
                };
                return (
                  <button
                    key={mode}
                    onClick={() => setViewport(mode)}
                    title={VIEWPORT_SIZES[mode].label}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewport === mode
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {icons[mode]}
                    <span className="hidden lg:inline">{VIEWPORT_SIZES[mode].label}</span>
                  </button>
                );
              })}
            </div>

            {/* 새로고침 */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs flex-shrink-0"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              새로고침
            </Button>

            {/* 테스트 발송 */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-8 text-xs w-40 border-gray-200"
              />
              <Button
                size="sm"
                className="gap-1.5 h-8 text-xs bg-pink-600 hover:bg-pink-700 flex-shrink-0"
                onClick={handleSendTest}
                disabled={sendingTest || !testEmail}
              >
                {sendingTest ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                테스트 발송
              </Button>
            </div>
          </div>

          {/* 미리보기 캔버스 */}
          <div className="flex-1 overflow-auto bg-gray-100 p-6 flex justify-center">
            <div
              className="transition-all duration-300 ease-in-out w-full"
              style={{ maxWidth: VIEWPORT_SIZES[viewport].width === "100%" ? "100%" : VIEWPORT_SIZES[viewport].width }}
            >
              {/* 브라우저 크롬 UI */}
              <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 px-4 py-2.5 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-gray-100 rounded-md px-3 py-1 text-[11px] text-gray-400 flex items-center gap-1.5 min-w-0">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{selectedMeta?.label || selectedType} — koreamall24</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </div>

              {/* iframe 미리보기 */}
              <div className="border border-gray-200 rounded-b-xl overflow-hidden bg-white shadow-sm">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center bg-gray-50" style={{ height: "600px" }}>
                    <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-3" />
                    <p className="text-sm text-gray-400">이메일 템플릿 불러오는 중...</p>
                  </div>
                ) : previewData?.html ? (
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewData.html}
                    className="w-full border-0"
                    style={{ minHeight: "600px", height: "calc(100vh - 240px)" }}
                    title={`이메일 미리보기: ${selectedMeta?.label}`}
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center bg-gray-50" style={{ height: "600px" }}>
                    <Mail className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-500">미리보기를 불러올 수 없습니다</p>
                    <p className="text-xs text-gray-400 mt-1">이 이메일 타입의 미리보기가 준비되지 않았습니다.</p>
                    <Button size="sm" variant="outline" className="mt-4 gap-1.5 text-xs" onClick={() => refetch()}>
                      <RefreshCw className="w-3.5 h-3.5" />다시 시도
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 하단 상태바 */}
          <div className="bg-white border-t border-gray-100 px-5 py-2 flex items-center gap-4 text-[11px] text-gray-400 flex-shrink-0">
            <span className="flex items-center gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isLoading
                    ? "bg-yellow-400 animate-pulse"
                    : previewData?.html
                    ? "bg-green-400"
                    : "bg-gray-300"
                }`}
              />
              {isLoading ? "로딩 중..." : previewData?.html ? "미리보기 준비됨" : "미리보기 없음"}
            </span>
            <span>·</span>
            <span>
              뷰포트: {VIEWPORT_SIZES[viewport].label}
              {viewport !== "desktop" && ` (${VIEWPORT_SIZES[viewport].width})`}
            </span>
            <span>·</span>
            <span>
              선택: <strong className="text-gray-600">{selectedMeta?.label}</strong>
            </span>
            <span className="ml-auto">총 {totalCount}개 템플릿</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
