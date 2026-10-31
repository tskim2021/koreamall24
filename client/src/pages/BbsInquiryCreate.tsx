import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MyPageSidebar from "@/components/MyPageSidebar";
import { ChevronLeft, Lock, Send, MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

const BbsInquiryCreate = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    titleJa: "",
    contentJa: "",
    isPrivate: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const createInquiryMutation = trpc.inquiries.create.useMutation({
    onSuccess: (_data: any) => {
      setIsSubmitting(false);
      toast.success("お問い合わせを受け付けました。確認後、担当者よりご回答いたします。");
      setLocation("/mypage/inquiries");
    },
    onError: (err: any) => {
      setIsSubmitting(false);
      setError(err.message || "エラーが発生しました。");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("ログインが必要です。");
      return;
    }

    if (!formData.titleJa.trim()) {
      setError("タイトルを入力してください。");
      return;
    }

    if (!formData.contentJa.trim()) {
      setError("内容を入力してください。");
      return;
    }

    setIsSubmitting(true);
    await createInquiryMutation.mutateAsync({
      titleJa: formData.titleJa,
      contentJa: formData.contentJa,
      isPrivate: formData.isPrivate,
    });
  };

  /* ── 비로그인 상태 ── */
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1">
          <div className="container py-8">
            <p className="text-sm text-gray-500 mb-4">
              <Link href="/" className="hover:text-gray-700 cursor-pointer">ホーム</Link>
              <span className="mx-1.5 text-gray-300">/</span>
              <Link href="/mypage/inquiries" className="hover:text-gray-700 cursor-pointer">お問い合わせ</Link>
              <span className="mx-1.5 text-gray-300">/</span>
              <span className="text-gray-800 font-medium">新規作成</span>
            </p>
            <div className="max-w-2xl mx-auto">
              <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
                <MessageSquarePlus className="w-12 h-12 mx-auto text-gray-200 mb-4" />
                <h1 className="text-lg font-bold text-gray-900 mb-2">ログインが必要です</h1>
                <p className="text-sm text-gray-500 mb-6">
                  お問い合わせを作成するには、ログインしてください。
                </p>
                <a
                  href={getLoginUrl()}
                  className="inline-block bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  ログイン
                </a>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ── 로그인 상태 ── */
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <div className="container py-6 md:py-8">
          {/* Breadcrumb */}
          <p className="text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-gray-700 cursor-pointer">ホーム</Link>
            <span className="mx-1.5 text-gray-300">/</span>
            <Link href="/mypage/inquiries" className="hover:text-gray-700 cursor-pointer">お問い合わせ</Link>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="text-gray-800 font-medium">新規作成</span>
          </p>

          <div className="flex gap-6 lg:gap-8 items-start">
            {/* Sidebar — マイページと同じレイアウト */}
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Header Banner */}
              <div className="rounded-xl overflow-hidden" style={{ background: '#fefce8', border: '1px solid #fde68a' }}>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <h1 className="text-base font-bold text-gray-900">新しいお問い合わせ</h1>
                    <p className="text-xs mt-0.5 text-gray-500">
                      ご不明な点やご質問がございましたら、お気軽にお問い合わせください。
                    </p>
                  </div>
                  <button
                    onClick={() => setLocation("/mypage/inquiries")}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-amber-100"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    一覧へ
                  </button>
                </div>
              </div>

              {/* 오류 메시지 */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* 폼 카드 */}
              <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {/* 제목 */}
                  <div className="px-5 py-4">
                    <label htmlFor="titleJa" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      タイトル <span className="text-red-500 normal-case">*</span>
                    </label>
                    <input
                      type="text"
                      id="titleJa"
                      name="titleJa"
                      value={formData.titleJa}
                      onChange={handleChange}
                      placeholder="タイトルを入力してください"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all bg-gray-50 placeholder:text-gray-400"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* 내용 */}
                  <div className="px-5 py-4">
                    <label htmlFor="contentJa" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      内容 <span className="text-red-500 normal-case">*</span>
                    </label>
                    <textarea
                      id="contentJa"
                      name="contentJa"
                      value={formData.contentJa}
                      onChange={handleChange}
                      placeholder="内容を入力してください"
                      rows={9}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all bg-gray-50 placeholder:text-gray-400 resize-none"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* 비공개 체크박스 */}
                  <div className="px-5 py-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex-shrink-0">
                        <input
                          type="checkbox"
                          id="isPrivate"
                          name="isPrivate"
                          checked={formData.isPrivate}
                          onChange={handleChange}
                          className="sr-only"
                          disabled={isSubmitting}
                        />
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            formData.isPrivate
                              ? "bg-primary border-primary"
                              : "border-gray-300 group-hover:border-gray-400"
                          }`}
                        >
                          {formData.isPrivate && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700">非公開にする</span>
                        <span className="text-xs text-gray-400">（管理者のみ閲覧可能）</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 버튼 영역 */}
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 flex-1 text-white px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                    style={{ backgroundColor: '#d30046' }}
                    onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#b8003a')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#d30046')}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        送信中...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        送信する
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation("/mypage/inquiries")}
                    disabled={isSubmitting}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BbsInquiryCreate;
