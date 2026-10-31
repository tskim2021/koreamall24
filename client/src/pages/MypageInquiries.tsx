import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronUp,
  Lock,
  X,
  ImagePlus,
  Loader2,
  Trash2,
  Pencil,
  Check,
  XCircle,
  CheckCircle2,
  Clock,
  Bot,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import MyPageSidebar from "@/components/MyPageSidebar";
import { Link } from "wouter";
import { toast } from "sonner";

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Comment = {
  id: number;
  inquiryId: number;
  userId: number;
  content: string;
  imageUrl?: string | null;
  imageUrls?: string | null;
  isActive: boolean;
  isAiGenerated?: boolean | null;
  needsReview?: boolean | null;
  feedbackRating?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  userName?: string | null;
  userEmail?: string | null;
};

type InquiryWithComments = {
  id: number;
  title: string;
  titleJa?: string | null;
  content: string;
  contentJa?: string | null;
  status: string;
  isPrivate: boolean;
  userId: number;
  imageUrls?: string | null;
  createdAt: Date | string;
  comments: Comment[];
};

// ── InquiryRow ─────────────────────────────────────────────────────────────────
function InquiryRow({
  inquiry,
  onDeleted,
}: {
  inquiry: InquiryWithComments;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editExistingImages, setEditExistingImages] = useState<string[]>([]);
  const [editNewImages, setEditNewImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingEditImages, setUploadingEditImages] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const isAnswered = inquiry.status === "answered";
  const adminComments = inquiry.comments.filter((c) => c.isActive);
  // AI 자동 답변 여부 판단
  const hasAiReply = adminComments.some((c) =>
    c.isAiGenerated === true ||
    c.content.includes("AI自動回答") ||
    c.content.includes("AIが自動生成") ||
    c.content.includes("担当者が1～3営業日")
  );
  const hasRequestedHuman = adminComments.some((c) => c.content.includes("追加対応のご依頼"));

  const utils = trpc.useUtils();
  const uploadImageMutation = trpc.inquiries.uploadImage.useMutation();
  const feedbackMutation = trpc.inquiries.submitFeedback.useMutation({
    onSuccess: () => {
      toast.success("フィードバックを送信しました。ありがとうございます！");
      utils.inquiries.getMyList.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "フィードバックの送信に失敗しました。");
    },
  });

  const requestHumanMutation = trpc.inquiries.requestHumanReply.useMutation({
    onSuccess: () => {
      toast.success("担当者への追加対応を依頼しました。");
      utils.inquiries.getMyList.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "要請に失敗しました。");
    },
  });

  const deleteMutation = trpc.inquiries.userDelete.useMutation({
    onSuccess: () => {
      toast.success("お問い合わせを削除しました。");
      utils.inquiries.getMyList.invalidate();
      onDeleted();
    },
    onError: (err) => {
      toast.error(err.message || "削除に失敗しました。");
    },
  });

  const updateMutation = trpc.inquiries.userUpdate.useMutation({
    onSuccess: () => {
      toast.success("お問い合わせを更新しました。");
      utils.inquiries.getMyList.invalidate();
      cancelEdit();
    },
    onError: (err) => {
      toast.error(err.message || "更新に失敗しました。");
    },
  });

  // Parse attached images
  let attachedImages: string[] = [];
  if (inquiry.imageUrls) {
    try {
      attachedImages = JSON.parse(inquiry.imageUrls);
    } catch {
      attachedImages = [];
    }
  }

  function startEdit() {
    setEditTitle(inquiry.titleJa || inquiry.title);
    setEditContent(inquiry.contentJa || inquiry.content);
    setEditIsPrivate(inquiry.isPrivate);
    setEditExistingImages([...attachedImages]);
    setEditNewImages([]);
    setEditMode(true);
    setOpen(true);
  }

  function cancelEdit() {
    editNewImages.forEach((img) => URL.revokeObjectURL(img.preview));
    setEditMode(false);
    setEditTitle("");
    setEditContent("");
    setEditIsPrivate(false);
    setEditExistingImages([]);
    setEditNewImages([]);
  }

  function handleEditFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const totalCurrent = editExistingImages.length + editNewImages.length;
    const remaining = MAX_IMAGES - totalCurrent;
    if (remaining <= 0) {
      toast.error(`画像は最大${MAX_IMAGES}枚までです。`);
      return;
    }
    const toAdd = files.slice(0, remaining);
    const oversized = toAdd.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error("5MB以下の画像のみアップロードできます。");
      return;
    }
    const newItems = toAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setEditNewImages((prev) => [...prev, ...newItems]);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  }

  async function handleEditSubmit() {
    if (!editTitle.trim()) {
      toast.error("件名を入力してください。");
      return;
    }
    if (!editContent.trim()) {
      toast.error("内容を入力してください。");
      return;
    }

    let newUploadedUrls: string[] = [];
    if (editNewImages.length > 0) {
      setUploadingEditImages(true);
      try {
        const results = await Promise.all(
          editNewImages.map(async ({ file }) => {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            const result = await uploadImageMutation.mutateAsync({
              file: dataUrl,
              fileName: file.name,
              contentType: file.type,
            });
            return result.url;
          })
        );
        newUploadedUrls = results;
      } catch {
        toast.error("画像のアップロードに失敗しました。");
        setUploadingEditImages(false);
        return;
      }
      setUploadingEditImages(false);
    }

    const allImageUrls = [...editExistingImages, ...newUploadedUrls];
    updateMutation.mutate({
      id: inquiry.id,
      titleJa: editTitle.trim(),
      contentJa: editContent.trim(),
      isPrivate: editIsPrivate,
      imageUrls: allImageUrls,
    });
  }

  const isEditSubmitting = uploadingEditImages || updateMutation.isPending;

  return (
    <>
      <div className="border-b last:border-b-0">
        {/* Row header */}
        <div className="flex items-center gap-0">
          <button
            className="flex-1 text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 min-w-0"
            onClick={() => { if (!editMode) setOpen((v) => !v); }}
          >
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 border ${
                isAnswered
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {isAnswered ? (
                <><CheckCircle2 className="w-3 h-3" />回答済み</>
              ) : (
                <><Clock className="w-3 h-3" />回答待ち</>
              )}
            </span>
            {inquiry.isPrivate && <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />}
            <span className="flex-1 text-sm font-medium text-gray-900 truncate">
              {inquiry.titleJa || inquiry.title}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0 mr-2">
              {formatDate(inquiry.createdAt)}
            </span>
            {open ? (
              <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
          </button>

          {/* Edit button — unanswered only */}
          {!isAnswered && (
            <button
              className="px-3 py-3 text-gray-300 hover:text-blue-500 transition-colors flex-shrink-0"
              title="編集"
              onClick={(e) => {
                e.stopPropagation();
                startEdit();
              }}
              disabled={editMode || isEditSubmitting}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}

          {/* Delete button — unanswered only */}
          {!isAnswered && (
            <button
              className="px-3 py-3 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
              title="削除"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteDialogOpen(true);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Expanded content */}
        {open && (
          <div className="px-4 pb-4 bg-gray-50 border-t">
            {editMode ? (
              /* ── Edit Mode ── */
              <div className="mt-3 space-y-3">
                <div className="text-xs font-semibold text-blue-600 flex items-center gap-1 mb-1">
                  <Pencil className="w-3 h-3" />
                  お問い合わせを編集
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <Label className="text-xs">
                    件名 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={100}
                    disabled={isEditSubmitting}
                    className="text-sm"
                  />
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <Label className="text-xs">
                    内容 <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={6}
                    maxLength={2000}
                    disabled={isEditSubmitting}
                    className="resize-none text-sm"
                  />
                  <p className="text-xs text-gray-400 text-right">{editContent.length}/2000</p>
                </div>

                {/* Image management */}
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    画像添付{" "}
                    <span className="text-gray-400 font-normal">
                      （最大{MAX_IMAGES}枚・各5MB以下）
                    </span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {/* Existing images */}
                    {editExistingImages.map((url, idx) => (
                      <div key={`ex-${idx}`} className="relative w-20 h-20 group">
                        <img
                          src={url}
                          alt={`既存画像 ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded border"
                        />
                        <button
                          type="button"
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            setEditExistingImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                          disabled={isEditSubmitting}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {/* New images */}
                    {editNewImages.map(({ preview }, idx) => (
                      <div key={`new-${idx}`} className="relative w-20 h-20 group">
                        <img
                          src={preview}
                          alt={`新規画像 ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded border border-blue-300"
                        />
                        <button
                          type="button"
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            URL.revokeObjectURL(preview);
                            setEditNewImages((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          disabled={isEditSubmitting}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {/* Add button */}
                    {editExistingImages.length + editNewImages.length < MAX_IMAGES && (
                      <button
                        type="button"
                        className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary hover:text-primary transition-colors"
                        onClick={() => editFileInputRef.current?.click()}
                        disabled={isEditSubmitting}
                      >
                        <ImagePlus className="w-5 h-5" />
                        <span className="text-xs">追加</span>
                      </button>
                    )}
                  </div>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleEditFileChange}
                  />
                </div>

                {/* Private toggle */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-private-${inquiry.id}`}
                    checked={editIsPrivate}
                    onCheckedChange={(v) => setEditIsPrivate(!!v)}
                    disabled={isEditSubmitting}
                  />
                  <Label
                    htmlFor={`edit-private-${inquiry.id}`}
                    className="cursor-pointer font-normal text-sm"
                  >
                    <Lock className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    非公開にする
                  </Label>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={isEditSubmitting}
                    className="gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    キャンセル
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleEditSubmit}
                    disabled={isEditSubmitting}
                    className="gap-1"
                  >
                    {isEditSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {uploadingEditImages ? "画像アップロード中..." : "更新中..."}
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        更新する
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* ── View Mode ── */
              <>
                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-500 mb-1">お問い合わせ内容</div>
                  <div className="bg-white border rounded p-3 text-sm text-gray-800 whitespace-pre-wrap">
                    {inquiry.contentJa || inquiry.content}
                  </div>
                  {attachedImages.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {attachedImages.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`添付画像 ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setLightboxImg(url)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {adminComments.length > 0 ? (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-blue-600">運営からの回答</span>
                    </div>
                    <div className="space-y-2">
                      {adminComments.map((comment) => {
                        const commentImgs: string[] = [];
                        if (comment.imageUrls) {
                          try {
                            commentImgs.push(...JSON.parse(comment.imageUrls));
                          } catch { /* ignore */ }
                        } else if (comment.imageUrl) {
                          commentImgs.push(comment.imageUrl);
                        }
                        const isAiReply = comment.isAiGenerated === true ||
                          comment.content.includes("AIが自動生成") ||
                          comment.content.includes("AI自動回答");
                        return (
                          <div
                            key={comment.id}
                            className="bg-blue-50 border border-blue-100 rounded p-3"
                          >
                            {isAiReply && (
                              <div className="flex items-center gap-1 mb-1.5">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
                                  <Bot className="w-2.5 h-2.5" />AI自動回答
                                </span>
                              </div>
                            )}
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                              {comment.content}
                            </p>
                            {commentImgs.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {commentImgs.map((url, i) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt={`添付画像 ${i + 1}`}
                                    className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-90"
                                    onClick={() => setLightboxImg(url)}
                                  />
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-400">
                                {formatDate(comment.createdAt)}
                              </p>
                              {/* AI 답변 만족도 피드백 버튼 */}
                              {isAiReply && (
                                <div className="flex items-center gap-1">
                                  {comment.feedbackRating ? (
                                    <span className="text-xs text-gray-400">
                                      {comment.feedbackRating === 'helpful'
                                        ? '👍 役に立ちました'
                                        : '👎 役に立ちませんでした'}
                                    </span>
                                  ) : (
                                    <>
                                      <span className="text-xs text-gray-400 mr-1">この回答は役に立ちましたか？</span>
                                      <button
                                        className="p-1 rounded hover:bg-emerald-100 text-gray-400 hover:text-emerald-600 transition-colors"
                                        title="役に立った"
                                        onClick={() => feedbackMutation.mutate({ commentId: comment.id, rating: 'helpful' })}
                                        disabled={feedbackMutation.isPending}
                                      >
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                                        title="役に立たなかった"
                                        onClick={() => feedbackMutation.mutate({ commentId: comment.id, rating: 'not_helpful' })}
                                        disabled={feedbackMutation.isPending}
                                      >
                                        <ThumbsDown className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-gray-500 italic">
                    まだ回答が届いていません。
                  </div>
                )}
                {/* AI 답변 후 추가 답변 요청 버튼 */}
                {hasAiReply && !hasRequestedHuman && (
                  <div className="mt-3 p-3 bg-violet-50 border border-violet-100 rounded-lg">
                    <p className="text-xs text-violet-700 mb-2">
                      ℹ️ AIが自動回答しました。ご不明な点がある場合は、担当者への追加対応を依頼できます。
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-violet-700 border-violet-300 hover:bg-violet-100 text-xs"
                      onClick={() => requestHumanMutation.mutate({ inquiryId: inquiry.id })}
                      disabled={requestHumanMutation.isPending}
                    >
                      {requestHumanMutation.isPending ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" />処理中...</>
                      ) : (
                        <><MessageSquare className="w-3 h-3 mr-1" />担当者に追加対応を依頼する</>
                      )}
                    </Button>
                  </div>
                )}
                {hasRequestedHuman && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <p className="text-xs text-amber-700">
                      ✅ 担当者への追加対応を依頼済みです。担当者から回答があり次第、通知にてご案内いたします。
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>お問い合わせを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。削除後は内容を確認することができなくなります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteMutation.mutate({ id: inquiry.id })}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightboxImg(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxImg}
            alt="拡大画像"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ── New Inquiry Modal ──────────────────────────────────────────────────────────
function NewInquiryModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const uploadImageMutation = trpc.inquiries.uploadImage.useMutation();
  const createMutation = trpc.inquiries.create.useMutation({
    onSuccess: () => {
      toast.success("お問い合わせを受け付けました。確認メールをお送りしました。");
      utils.inquiries.getMyList.invalidate();
      handleClose();
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message || "送信に失敗しました。");
    },
  });

  function handleClose() {
    setTitle("");
    setContent("");
    setIsPrivate(false);
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`画像は最大${MAX_IMAGES}枚までです。`);
      return;
    }
    const toAdd = files.slice(0, remaining);
    const oversized = toAdd.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error("5MB以下の画像のみアップロードできます。");
      return;
    }
    const newItems = toAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("件名を入力してください。");
      return;
    }
    if (!content.trim()) {
      toast.error("内容を入力してください。");
      return;
    }

    let uploadedUrls: string[] = [];
    if (images.length > 0) {
      setUploadingImages(true);
      try {
        const results = await Promise.all(
          images.map(async ({ file }) => {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            const result = await uploadImageMutation.mutateAsync({
              file: dataUrl,
              fileName: file.name,
              contentType: file.type,
            });
            return result.url;
          })
        );
        uploadedUrls = results;
      } catch {
        toast.error("画像のアップロードに失敗しました。");
        setUploadingImages(false);
        return;
      }
      setUploadingImages(false);
    }

    createMutation.mutate({
      titleJa: title.trim(),
      contentJa: content.trim(),
      isPrivate,
      imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
    });
  }

  const isSubmitting = uploadingImages || createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            新規お問い合わせ
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inq-title">
              件名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="inq-title"
              placeholder="お問い合わせの件名を入力してください"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inq-content">
              内容 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="inq-content"
              placeholder="お問い合わせの詳細をご記入ください"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              maxLength={2000}
              disabled={isSubmitting}
              className="resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{content.length}/2000</p>
          </div>

          <div className="space-y-2">
            <Label>
              画像添付{" "}
              <span className="text-gray-400 font-normal text-xs">
                （最大{MAX_IMAGES}枚・各5MB以下）
              </span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {images.map(({ preview }, idx) => (
                <div key={idx} className="relative w-20 h-20 group">
                  <img
                    src={preview}
                    alt={`添付 ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded border"
                  />
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(idx)}
                    disabled={isSubmitting}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary hover:text-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-xs">追加</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="inq-private"
              checked={isPrivate}
              onCheckedChange={(v) => setIsPrivate(!!v)}
              disabled={isSubmitting}
            />
            <Label htmlFor="inq-private" className="cursor-pointer font-normal text-sm">
              <Lock className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
              非公開にする
            </Label>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadingImages ? "画像アップロード中..." : "送信中..."}
                </>
              ) : (
                "送信する"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MypageInquiries() {
  const { user } = useAuth();
  // modalOpen 제거 - 페이지 이동으로 변경
  const utils = trpc.useUtils();
  // 미답변 문의가 있을 때 5초마다 자동 갱신 (AI 답변 대기 중)
  const hasPendingInquiries = (inquiries?: { status: string }[]) =>
    inquiries?.some((i) => i.status === "pending") ?? false;

  const { data: inquiries, isLoading } = trpc.inquiries.getMyList.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: (query) => {
      // 미답변 문의가 있으면 5초마다 폴링, 없으면 폴링 중단
      return hasPendingInquiries(query.state.data) ? 5000 : false;
    },
    refetchIntervalInBackground: false, // 탭이 활성화된 경우에만 폴링
  });
  const totalCount = inquiries?.length ?? 0;
  const answeredCount = inquiries?.filter((i) => i.status === "answered").length ?? 0;
  const pendingCount = totalCount - answeredCount;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/mypage" className="flex items-center gap-1 text-primary hover:underline font-medium">
            <ChevronDown className="w-4 h-4 rotate-90" />
            マイページに戻る
          </Link>
        </div>

        <div className="flex gap-6 lg:gap-8 items-start">
          {/* Sidebar */}
          <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <MyPageSidebar />
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            {/* Header Banner */}
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-5 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  お問い合わせ
                </h1>
                <p className="text-sm text-amber-700 mt-0.5">ご不明な点はお気軽にお問い合わせください</p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-xs text-gray-500">全件</p>
                  <p className="text-2xl font-bold text-primary">{totalCount}</p>
                </div>
                {pendingCount > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">回答待ち</p>
                    <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
                  </div>
                )}
                {answeredCount > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">回答済み</p>
                    <p className="text-2xl font-bold text-green-600">{answeredCount}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Inquiry List Card */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  お問い合わせ履歴
                  {totalCount > 0 && (
                    <span className="text-xs font-normal text-gray-400">({totalCount}件)</span>
                  )}
                </h2>
                <Link href="/bbs/inquiry/create">
                  <Button size="sm" className="gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    新規お問い合わせ
                  </Button>
                </Link>
              </div>

              {/* Content */}
              {isLoading ? (
                <div className="divide-y">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
                      <div className="w-16 h-5 bg-gray-100 rounded" />
                      <div className="flex-1 h-4 bg-gray-100 rounded" />
                      <div className="w-20 h-4 bg-gray-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : inquiries && inquiries.length > 0 ? (
                <div>
                  {inquiries.map((inquiry) => (
                    <InquiryRow
                      key={inquiry.id}
                      inquiry={inquiry as InquiryWithComments}
                      onDeleted={() => utils.inquiries.getMyList.invalidate()}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <MessageSquare className="w-14 h-14 mx-auto text-gray-200 mb-4" />
                  <h3 className="text-base font-bold text-gray-700 mb-2">お問い合わせ履歴がありません</h3>
                  <p className="text-sm text-gray-400 mb-6">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
                  <Link href="/bbs/inquiry/create">
                    <Button size="sm" className="gap-1.5">
                      <Plus className="w-4 h-4" />
                      新規お問い合わせ
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      {/* NewInquiryModal 제거 - /bbs/inquiry/create 페이지로 이동 */}
    </div>
  );
}
