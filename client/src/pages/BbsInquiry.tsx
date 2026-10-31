import Footer from "@/components/Footer";
import { Search, ChevronLeft, ChevronRight, Plus, Lock, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import NoticeSearchModal from "@/components/NoticeSearchModal";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEOHead } from "@/components/SEOHead";

interface Inquiry {
  id: number;
  title: string;
  titleJa: string;
  category: string;
  author: string;
  date: string;
  views: number;
  comments: number;
  content?: string;
  contentJa: string;
  isActive?: boolean;
  createdAt?: Date;
  isPrivate?: boolean;
  userId?: number;
  status?: 'pending' | 'answered';
}

const ITEMS_PER_PAGE = 10;

export default function BbsInquiry() {
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>([]);
  const [displayInquiries, setDisplayInquiries] = useState<Inquiry[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [hoveredPrivateId, setHoveredPrivateId] = useState<number | null>(null);
  const { user } = useAuth();

  const { data: inquiriesData, isLoading } = trpc.inquiries.getAll.useQuery();

  useEffect(() => {
    if (inquiriesData) {
      const convertedInquiries: Inquiry[] = inquiriesData
        .filter((inq: any) => inq.isActive)
        .map((inq: any) => ({
          id: inq.id,
          title: inq.titleJa,
          titleJa: inq.titleJa,
          category: "一般",
          author: "管理者",
          date: new Date(inq.createdAt).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" }).replace(/\//g, "-"),
          views: inq.viewCount || 0,
          comments: 0,
          content: inq.contentJa,
          contentJa: inq.contentJa,
          isActive: inq.isActive,
          createdAt: new Date(inq.createdAt),
          isPrivate: inq.isPrivate || false,
          userId: inq.userId,
          status: inq.status || 'pending',
        }))
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

      setInquiries(convertedInquiries);
      setFilteredInquiries(convertedInquiries);
    }
  }, [inquiriesData]);

  useEffect(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    setDisplayInquiries(filteredInquiries.slice(startIdx, endIdx));
  }, [filteredInquiries, currentPage]);

  const totalPages = Math.ceil(filteredInquiries.length / ITEMS_PER_PAGE);

  const handleSearch = (results: Inquiry[]) => {
    setFilteredInquiries(results);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">読み込み中...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="お問い合わせ"
        description="ココくすりへのお問い合わせはこちらからどうぞ。"
        keywords="お問い合わせ, カスタマーサポート, 日本医薬品, ココくすり"
        ogType="website"
      />
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />

        <main className="flex-1">
          <div className="container py-6 md:py-8">
            {/* Breadcrumb */}
            <p className="text-sm text-gray-500 mb-4">
              <Link href="/" className="hover:text-gray-700 cursor-pointer">ホーム</Link>
              <span className="mx-1.5 text-gray-300">/</span>
              <span className="text-gray-800 font-medium">お問い合わせ</span>
            </p>

            <div className="max-w-4xl mx-auto space-y-4">
              {/* Header Banner - 공지 페이지와 동일한 스타일 */}
              <div className="rounded-xl overflow-hidden" style={{ background: '#fefce8', border: '1px solid #fde68a' }}>
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <h1 className="text-base font-bold text-gray-900">お問い合わせ</h1>
                        <p className="text-xs mt-0.5" style={{ color: '#e11d48' }}>
                          全 {filteredInquiries.length}件
                        </p>
                      </div>
                    </div>
                    {/* 검색 버튼 */}
                    <button
                      onClick={() => setIsSearchModalOpen(true)}
                      className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                      aria-label="検索"
                    >
                      <Search className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 문의 목록 */}
              {displayInquiries.length > 0 ? (
                <div className="space-y-3">
                  {displayInquiries.map((inquiry) => {
                    const canViewPrivate = !inquiry.isPrivate || user?.id === inquiry.userId || user?.role === "admin";
                    return (
                      <Link
                        key={inquiry.id}
                        href={canViewPrivate ? `/bbs/inquiry/${inquiry.id}` : "#"}
                        className="block rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="px-5 py-4">
                          {/* 상태 배지 */}
                          <div className="mb-2">
                            {inquiry.status === 'pending' && (
                              <span className="inline-block px-2 py-0.5 text-[11px] font-bold rounded-sm bg-amber-400 text-white">
                                回答待ち
                              </span>
                            )}
                            {inquiry.status === 'answered' && (
                              <span className="inline-block px-2 py-0.5 text-[11px] font-bold rounded-sm bg-green-500 text-white">
                                回答完了
                              </span>
                            )}
                          </div>

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* 날짜 */}
                              <p className="text-xs text-gray-400 mb-1">{inquiry.date}</p>
                              {/* 제목 */}
                              <h3 className="text-sm font-semibold leading-snug text-gray-800 flex items-center gap-1.5">
                                {inquiry.isPrivate && (
                                  <div
                                    className="relative inline-flex"
                                    onMouseEnter={() => setHoveredPrivateId(inquiry.id)}
                                    onMouseLeave={() => setHoveredPrivateId(null)}
                                  >
                                    <Lock className="w-3.5 h-3.5 text-red-500 flex-shrink-0 cursor-help" />
                                    {hoveredPrivateId === inquiry.id && (
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50">
                                        非公開のお問い合わせです
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                                      </div>
                                    )}
                                  </div>
                                )}
                                {inquiry.isPrivate && !canViewPrivate ? "非公開のお問い合わせです" : inquiry.titleJa}
                              </h3>
                            </div>

                            {/* 오른쪽 메타 정보 */}
                            <div className="flex-shrink-0 text-xs text-gray-400 text-right space-y-0.5">
                              <p>{inquiry.views} 閲覧</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="py-16 text-center">
                    <MessageSquare className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                    <p className="text-sm text-gray-400">お問い合わせがありません</p>
                  </div>
                </div>
              )}

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-full transition-all text-sm ${
                          currentPage === page
                            ? "bg-primary text-white shadow-md"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* 문의 작성 버튼 */}
              <div className="flex justify-end pt-2">
                <Link
                  href="/bbs/inquiry/create"
                  className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors font-medium text-sm"
                  style={{ backgroundColor: '#d30046' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#b8003a')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#d30046')}
                >
                  <Plus className="w-4 h-4" />
                  お問い合わせ
                </Link>
              </div>
            </div>
          </div>
        </main>

        {/* 검색 모달 */}
        <NoticeSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          notices={inquiries}
          onSearch={handleSearch}
        />

        <Footer />
      </div>
    </>
  );
}
