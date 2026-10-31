import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronLeft, ChevronRight, Send, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const BbsInquiryDetail = () => {
  const [, params] = useRoute("/bbs/inquiry/:id");
  const inquiryId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Fetch inquiry details
  const { data: inquiry, isLoading: isLoadingInquiry } = trpc.inquiries.getById.useQuery(
    { id: inquiryId },
    { enabled: inquiryId > 0 }
  );

  // Increment view count on mount
  const incrementViewCountMutation = trpc.inquiries.incrementViewCount.useMutation();
  useEffect(() => {
    if (inquiryId > 0) {
      incrementViewCountMutation.mutate({ id: inquiryId });
    }
  }, [inquiryId]);

  // Fetch comments
  const { data: comments = [], refetch: refetchComments } = trpc.inquiries.getComments.useQuery(
    { inquiryId: inquiryId },
    { enabled: inquiryId > 0 }
  );

  // Fetch all inquiries to find previous/next
  const { data: allInquiries = [] } = trpc.inquiries.getAll.useQuery();

  // Add comment mutation
  const addCommentMutation = trpc.inquiries.addComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      setIsSubmittingComment(false);
      refetchComments();
    },
    onError: () => {
      setIsSubmittingComment(false);
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = trpc.inquiries.deleteComment.useMutation({
    onSuccess: () => {
      refetchComments();
    },
  });

  const adminAddReplyMutation = trpc.inquiries.adminAddReply.useMutation({
    onSuccess: () => {
      setCommentText("");
      setIsSubmittingComment(false);
      refetchComments();
    },
    onError: () => {
      setIsSubmittingComment(false);
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
      inquiryId: inquiryId,
      content: commentText,
    });
  };

  const userDeleteMutation = trpc.inquiries.userDelete.useMutation({
    onSuccess: () => {
      alert("お問い合わせを削除しました。");
      setLocation("/bbs/inquiry");
    },
    onError: (error) => {
      alert("削除に失敗: " + error.message);
    },
  });

  const handleDeleteComment = async (commentId: number) => {
    if (confirm("このコメントを削除しますか？")) {
      await deleteCommentMutation.mutateAsync({ commentId });
    }
  };

  const handleDeleteInquiry = async () => {
    if (confirm("このお問い合わせを削除しますか？削除後は復元できません。")) {
      userDeleteMutation.mutate({ id: inquiryId });
    }
  };

  if (isLoadingInquiry) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>読み込み中...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>お問い合わせが見つかりません。</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Find previous and next inquiries
  const currentIndex = allInquiries.findIndex((n: any) => n.id === inquiryId);
  const previousInquiry = currentIndex > 0 ? allInquiries[currentIndex - 1] : null;
  const nextInquiry = currentIndex < allInquiries.length - 1 ? allInquiries[currentIndex + 1] : null;

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back Button */}
          <button
            onClick={() => setLocation("/bbs/inquiry")}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">一覧に戻る</span>
          </button>

          {/* Title Section */}
          <div className="mb-8 border-b border-gray-200 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {inquiry.titleJa}
              </h1>
              {inquiry.isPrivate && (
                <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded">
                  非公開
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>管理者</span>
                <span>{inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" }) : ""}</span>
              </div>
              {user && (user.id === inquiry.userId || user.role === "admin") && (
                <button
                  onClick={handleDeleteInquiry}
                  className="text-red-600 hover:text-red-900 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>削除</span>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none mb-12">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {inquiry.contentJa}
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3 mb-12 border-t border-b border-gray-200 py-6">
            {previousInquiry && (
              <button
                onClick={() => setLocation(`/bbs/inquiry/${previousInquiry.id}`)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                  <div className="text-left">
                    <div className="text-xs text-gray-500">前の記事</div>
                    <div className="text-sm font-medium text-gray-900">
                      {previousInquiry.titleJa}
                    </div>
                  </div>
                </div>
              </button>
            )}

            {nextInquiry && (
              <button
                onClick={() => setLocation(`/bbs/inquiry/${nextInquiry.id}`)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-left flex-1">
                    <div className="text-xs text-gray-500">次の記事</div>
                    <div className="text-sm font-medium text-gray-900">
                      {nextInquiry.titleJa}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </div>
              </button>
            )}
          </div>

          {/* Comments Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">
              コメント ({comments.length})
            </h2>

            {/* Admin Reply Form */}
            {user?.role === "admin" && (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">管理者からの返信</h3>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="返信を入力してください..."
                  className="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 resize-none"
                  rows={3}
                />
                <button
                  onClick={() => {
                    if (!commentText.trim()) {
                      alert("返信を入力してください。");
                      return;
                    }
                    setIsSubmittingComment(true);
                    adminAddReplyMutation.mutate({
                      inquiryId: inquiryId,
                      content: commentText,
                    });
                  }}
                  disabled={isSubmittingComment}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSubmittingComment ? "送信中..." : "返信を送信"}
                </button>
              </div>
            )}

            {/* Comment Form */}
            {user && user.role !== "admin" ? (
              <div className="bg-gray-50 p-6 rounded-lg">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="コメントを入力してください..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-3 resize-none"
                  rows={3}
                />
                <button
                  onClick={handleAddComment}
                  disabled={isSubmittingComment}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSubmittingComment ? "送信中..." : "送信"}
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <p className="text-gray-600">
                  コメントを投稿するには <span className="text-primary font-medium cursor-pointer">ログイン</span> してください。
                </p>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment: any) => (
                <div
                  key={comment.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {comment.userName || "匿名ユーザー"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" }) : ""}
                      </span>
                    </div>
                    {user && user.id === comment.userId && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-sm text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        削除
                      </button>
                    )}
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  コメントはまだありません。最初のコメントを投稿してください。
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default BbsInquiryDetail;
