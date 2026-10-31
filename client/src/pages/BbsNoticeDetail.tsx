import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronLeft, ChevronRight, Send, Trash2, List, Pin, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const BbsNoticeDetail = () => {
  const [, params] = useRoute("/bbs/notice/:id");
  const noticeId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const { data: notice, isLoading: isLoadingNotice } = trpc.announcements.getById.useQuery(
    { id: noticeId },
    { enabled: noticeId > 0 }
  );

  const incrementViewCountMutation = trpc.announcements.incrementViewCount.useMutation();
  useEffect(() => {
    if (noticeId > 0) {
      incrementViewCountMutation.mutate({ id: noticeId });
    }
  }, [noticeId]);

  const { data: comments = [], refetch: refetchComments } = trpc.announcements.getComments.useQuery(
    { announcementId: noticeId },
    { enabled: noticeId > 0 }
  );

  const { data: allNotices = [] } = trpc.announcements.getAll.useQuery();

  const addCommentMutation = trpc.announcements.addComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      setIsSubmittingComment(false);
      refetchComments();
    },
    onError: () => {
      setIsSubmittingComment(false);
    },
  });

  const deleteCommentMutation = trpc.announcements.deleteComment.useMutation({
    onSuccess: () => {
      refetchComments();
    },
  });

  const handleAddComment = async () => {
    if (!user) {
      alert("ログインが必要です。");
      return;
    }
    if (!commentText.trim()) {
      alert("コメントを入力してください。");
      return;
    }
    setIsSubmittingComment(true);
    await addCommentMutation.mutateAsync({
      announcementId: noticeId,
      content: commentText,
    });
  };

  const handleDeleteComment = async (commentId: number) => {
     if (confirm("このコメントを削除しますか？")) {
      await deleteCommentMutation.mutateAsync({ commentId });
    }
  };

  if (isLoadingNotice) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">読み込み中...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-gray-500">お知らせが見つかりません。</p>
          <button
            onClick={() => setLocation("/bbs/notice")}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            <List className="w-4 h-4" />
            一覧へ
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // 활성화된 공지만 필터링 후 정렬 (목록과 동일한 순서)
  const activeNotices = allNotices
    .filter((n: any) => n.isActive)
    .sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const currentIndex = activeNotices.findIndex((n: any) => n.id === noticeId);
  // 이전글 = 목록에서 위에 있는 글 (index가 작은 것), 다음글 = 아래에 있는 글 (index가 큰 것)
  const prevNotice = currentIndex > 0 ? activeNotices[currentIndex - 1] : null;
  const nextNotice = currentIndex < activeNotices.length - 1 ? activeNotices[currentIndex + 1] : null;

  const formattedDate = notice.createdAt
    ? new Date(notice.createdAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).replace(/\. /g, "-").replace(/\.$/, "")
    : "";

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* 관리자 전용 빠른 편집 버튼 - 화면 우측 하단 고정 */}
      {user?.role === "admin" && (
        <a
          href={`/admin/announcements?edit=${noticeId}`}
          title="管理者：お知らせ編集"
          className="fixed bottom-24 right-5 z-50 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-3 py-2.5 rounded-full shadow-lg transition-all hover:scale-105 group"
        >
          <Settings className="w-4 h-4 group-hover:animate-spin" />
          <span className="hidden group-hover:inline whitespace-nowrap">お知らせ編集</span>
        </a>
      )}

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* 게시판 제목 */}
        <div className="mb-0 pb-3 border-b-2 border-gray-800">
          <h1 className="text-xl font-bold text-gray-900">お知らせ</h1>
        </div>

        {/* 게시글 제목 영역 */}
        <div className="border-b border-gray-300">
          {/* 제목 행 */}
          <div className="bg-gray-50 px-4 py-4 border-b border-gray-200">
            <div className="flex items-start gap-2 mb-2.5">
              {notice.isPinned && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-600 text-[11px] font-bold rounded flex-shrink-0 mt-0.5">
                  <Pin className="w-2.5 h-2.5" />
                  お知らせ
                </span>
              )}
              <h2 className="text-base font-semibold text-gray-900 leading-snug">
                {notice.titleJa}
              </h2>
            </div>
            {/* 메타 정보 */}
            <div className="flex items-center gap-0 text-xs text-gray-500 border-t border-gray-200 pt-2.5">
              <span className="pr-3">管理者</span>
              <span className="border-l border-gray-300 px-3">{formattedDate}</span>
              <span className="border-l border-gray-300 px-3">閲覧 {(notice.viewCount || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* 본문 */}
          <div className="px-5 py-8 min-h-[200px]">
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {notice.contentJa}
            </p>
          </div>
        </div>

        {/* 이전/다음 글 네비게이션 - 한국형 테이블 스타일 */}
        <table className="w-full border-collapse mt-0 mb-6">
          <tbody>
            {prevNotice && (
              <tr
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setLocation(`/bbs/notice/${prevNotice.id}`)}
              >
                <td className="w-[80px] py-2.5 px-4 text-xs text-gray-500 bg-gray-50 border-r border-gray-200 font-medium">
                  <div className="flex items-center gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" />
                    前の記事
                  </div>
                </td>
                <td className="py-2.5 px-4 text-sm text-gray-700 hover:text-blue-700 line-clamp-1">
                  {prevNotice.titleJa}
                </td>
              </tr>
            )}
            {nextNotice && (
              <tr
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setLocation(`/bbs/notice/${nextNotice.id}`)}
              >
                <td className="w-[80px] py-2.5 px-4 text-xs text-gray-500 bg-gray-50 border-r border-gray-200 font-medium">
                  <div className="flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                    次の記事
                  </div>
                </td>
                <td className="py-2.5 px-4 text-sm text-gray-700 hover:text-blue-700 line-clamp-1">
                  {nextNotice.titleJa}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 목록으로 버튼 */}
        <div className="flex justify-center mb-10">
          <button
            onClick={() => setLocation("/bbs/notice")}
            className="flex items-center gap-2 px-6 py-2 text-sm border border-gray-400 rounded hover:bg-gray-100 transition-colors text-gray-700"
          >
            <List className="w-4 h-4" />
            一覧
          </button>
        </div>

        {/* 댓글 섹션 */}
        <div className="border-t-2 border-gray-800 pt-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            コメント <span className="text-blue-600">({comments.length})</span>
          </h3>

          {/* 댓글 목록 */}
          {comments.length > 0 ? (
            <div className="space-y-0 mb-6 border-t border-gray-200">
              {comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3 px-4 py-3.5 border-b border-gray-200 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-900">
                          {comment.userName || "匿名"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {comment.createdAt
                            ? new Date(comment.createdAt).toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              }).replace(/\. /g, "-").replace(/\.$/, "")
                            : ""}
                        </span>
                      </div>
                      {user && user.id === comment.userId && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          削除
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center border-t border-b border-gray-200 mb-6">
              <p className="text-sm text-gray-400">コメントはまだありません。</p>
            </div>
          )}

          {/* 댓글 작성 폼 */}
          {user ? (
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-700">{user.name || user.email}</span>
              </div>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="コメントを入力してください..."
                className="w-full p-3 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-400 resize-none bg-white"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddComment}
                  disabled={isSubmittingComment}
                  className="flex items-center gap-2 bg-gray-800 text-white px-5 py-2 text-sm rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmittingComment ? "投稿中..." : "投稿"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded p-6 text-center">
              <p className="text-sm text-gray-600">
                コメントを投稿するには{" "}
                <span
                  className="text-blue-600 font-medium cursor-pointer hover:underline"
                  onClick={() => setLocation("/login")}
                >
                  ログイン
                </span>
                が必要です。
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
};

export default BbsNoticeDetail;
