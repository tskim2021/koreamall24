import { useState, useRef } from"react";
import AdminLayout from"@/components/AdminLayout";
import { trpc } from"@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";
import { Button } from"@/components/ui/button";
import { Textarea } from"@/components/ui/textarea";
import { Input } from"@/components/ui/input";
import { toast } from"sonner";
import {
 MessageSquare, User, Calendar, Eye, Lock,
 ChevronDown, ChevronUp, ImagePlus, X, Loader2, Send,
 Search, Pencil, Trash2, Check, XCircle, Lightbulb
} from"lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from"date-fns";
import { ko } from"date-fns/locale";

type Inquiry = {
 id: number;
 title: string;
 content: string;
 status: string;
 isPrivate: boolean;
 userId: number | null;
 viewCount: number;
 commentCount: number;
 createdAt: Date | string;
};

type ImagePreview = { file: File; preview: string };

type Comment = {
 id: number;
 userName?: string;
 createdAt: Date | string;
 content: string;
 imageUrl?: string | null;
 imageUrls?: string | null;
 isAiGenerated?: boolean;
 needsReview?: boolean;
};

export default function AdminInquiries() {
 const [expandedId, setExpandedId] = useState<number | null>(null);
 const [replyContent, setReplyContent] = useState<Record<number, string>>({});
 // Multiple images per inquiry
 const [replyImages, setReplyImages] = useState<Record<number, ImagePreview[]>>({});
 const [uploadingImage, setUploadingImage] = useState<Record<number, boolean>>({});
 const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

 // Search & Filter
 const [searchQuery, setSearchQuery] = useState("");
 const [statusFilter, setStatusFilter] = useState<"all"|"pending"|"answered">("all");

 // Edit state per comment
 const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
 const [editContent, setEditContent] = useState("");
 const [editImages, setEditImages] = useState<ImagePreview[]>([]);
 const [editExistingImages, setEditExistingImages] = useState<string[]>([]);
 const editFileInputRef = useRef<HTMLInputElement | null>(null);

 const { data: inquiries, isLoading, refetch } = trpc.admin.inquiries.getAll.useQuery();
 const { data: inquiryDetail, isLoading: loadingDetail, refetch: refetchDetail } = trpc.admin.inquiries.getById.useQuery(
 { id: expandedId! },
 { enabled: !!expandedId }
 );

 const uploadImageMutation = trpc.admin.inquiries.uploadReplyImage.useMutation();

 const replyMutation = trpc.admin.inquiries.reply.useMutation({
 onSuccess: (_, variables) => {
 toast.success("답변을 등록했습니다. 고객에게 이메일이 발송됩니다.");
 setReplyContent((prev) => ({ ...prev, [variables.inquiryId]:""}));
 setReplyImages((prev) => ({ ...prev, [variables.inquiryId]: [] }));
 refetch();
 refetchDetail();
 },
 onError: (error) => {
 toast.error(error.message ||"답변 등록에 실패했습니다.");
 },
 });

 const updateStatusMutation = trpc.admin.inquiries.updateStatus.useMutation({
 onSuccess: () => {
 toast.success("상태를 변경했습니다.");
 refetch();
 },
 onError: (error) => {
 toast.error(error.message ||"상태 변경에 실패했습니다.");
 },
 });

 const updateCommentMutation = trpc.admin.inquiries.updateComment.useMutation({
 onSuccess: () => {
 toast.success("답변을 수정했습니다.");
 setEditingCommentId(null);
 setEditContent("");
 setEditImages([]);
 setEditExistingImages([]);
 refetchDetail();
 },
 onError: (error) => {
 toast.error(error.message ||"답변 수정에 실패했습니다.");
 },
 });

 const deleteCommentMutation = trpc.admin.inquiries.deleteComment.useMutation({
 onSuccess: () => {
 toast.success("답변을 삭제했습니다.");
 refetch();
 refetchDetail();
 },
 onError: (error) => {
 toast.error(error.message ||"답변 삭제에 실패했습니다.");
 },
 });

 const toggleAccordion = (id: number) => {
 setExpandedId((prev) => (prev === id ? null : id));
 setEditingCommentId(null);
 };

 const handleImageSelect = (inquiryId: number, files: FileList) => {
 const current = replyImages[inquiryId] || [];
 const remaining = 5 - current.length;
 if (remaining <= 0) {
 toast.error("이미지는 최대 5장까지 첨부할 수 있습니다.");
 return;
 }
 const newImages: ImagePreview[] = Array.from(files).slice(0, remaining).map((file) => ({
 file,
 preview: URL.createObjectURL(file),
 }));
 setReplyImages((prev) => ({ ...prev, [inquiryId]: [...current, ...newImages] }));
 };

 const handleRemoveImage = (inquiryId: number, index: number) => {
 setReplyImages((prev) => {
 const current = [...(prev[inquiryId] || [])];
 URL.revokeObjectURL(current[index].preview);
 current.splice(index, 1);
 return { ...prev, [inquiryId]: current };
 });
 };

 const handleReply = async (inquiryId: number) => {
 const content = replyContent[inquiryId]?.trim();
 if (!content) {
 toast.error("답변 내용을 입력해주세요.");
 return;
 }

 const imageDataList = replyImages[inquiryId] || [];
 const uploadedUrls: string[] = [];

 if (imageDataList.length > 0) {
 setUploadingImage((prev) => ({ ...prev, [inquiryId]: true }));
 try {
 for (const imageData of imageDataList) {
 const reader = new FileReader();
 const base64 = await new Promise<string>((resolve, reject) => {
 reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
 reader.onerror = reject;
 reader.readAsDataURL(imageData.file);
 });
 const result = await uploadImageMutation.mutateAsync({
 fileName: imageData.file.name,
 fileData: base64,
 contentType: imageData.file.type,
 });
 uploadedUrls.push(result.url);
 }
 } catch {
 toast.error("이미지 업로드에 실패했습니다.");
 setUploadingImage((prev) => ({ ...prev, [inquiryId]: false }));
 return;
 }
 setUploadingImage((prev) => ({ ...prev, [inquiryId]: false }));
 }

 replyMutation.mutate({
 inquiryId,
 content,
 imageUrl: uploadedUrls[0] || undefined,
 imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
 });
 };

 const handleStatusToggle = (e: React.MouseEvent, id: number, currentStatus: string) => {
 e.stopPropagation();
 const newStatus = currentStatus ==="pending"?"answered":"pending";
 updateStatusMutation.mutate({ id, status: newStatus });
 };

 const startEditComment = (comment: Comment) => {
 setEditingCommentId(comment.id);
 setEditContent(comment.content);
 setEditImages([]);
 // Parse existing images
 const existing: string[] = [];
 if (comment.imageUrls) {
 try { existing.push(...JSON.parse(comment.imageUrls)); } catch { /* ignore */ }
 } else if (comment.imageUrl) {
 existing.push(comment.imageUrl);
 }
 setEditExistingImages(existing);
 };

 const handleEditImageSelect = (files: FileList) => {
 const remaining = 5 - editExistingImages.length - editImages.length;
 if (remaining <= 0) {
 toast.error("이미지는 최대 5장까지 첨부할 수 있습니다.");
 return;
 }
 const newImages: ImagePreview[] = Array.from(files).slice(0, remaining).map((file) => ({
 file,
 preview: URL.createObjectURL(file),
 }));
 setEditImages((prev) => [...prev, ...newImages]);
 };

 const handleSaveEdit = async (commentId: number) => {
 const content = editContent.trim();
 if (!content) {
 toast.error("답변 내용을 입력해주세요.");
 return;
 }

 const uploadedUrls: string[] = [...editExistingImages];

 if (editImages.length > 0) {
 try {
 for (const imageData of editImages) {
 const reader = new FileReader();
 const base64 = await new Promise<string>((resolve, reject) => {
 reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
 reader.onerror = reject;
 reader.readAsDataURL(imageData.file);
 });
 const result = await uploadImageMutation.mutateAsync({
 fileName: imageData.file.name,
 fileData: base64,
 contentType: imageData.file.type,
 });
 uploadedUrls.push(result.url);
 }
 } catch {
 toast.error("이미지 업로드에 실패했습니다.");
 return;
 }
 }

 updateCommentMutation.mutate({
 commentId,
 content,
 imageUrl: uploadedUrls[0] || null,
 imageUrls: uploadedUrls.length > 0 ? uploadedUrls : null,
 });
 };

 const handleDeleteComment = (commentId: number, inquiryId: number) => {
 if (!confirm("이 답변을 삭제하시겠습니까?")) return;
 deleteCommentMutation.mutate({ commentId, inquiryId });
 };

 // Pagination
 const [currentPage, setCurrentPage] = useState(1);
 const PAGE_SIZE = 20;

 // Filter inquiries
 const filteredInquiries = (inquiries || []).filter((inquiry: Inquiry) => {
 const matchesStatus = statusFilter ==="all"|| inquiry.status === statusFilter;
 const matchesSearch =
 !searchQuery ||
 inquiry.title.toLowerCase().includes(searchQuery.toLowerCase());
 return matchesStatus && matchesSearch;
 });

 const totalPages = Math.max(1, Math.ceil(filteredInquiries.length / PAGE_SIZE));
 const paginatedInquiries = filteredInquiries.slice(
 (currentPage - 1) * PAGE_SIZE,
 currentPage * PAGE_SIZE
 );

 const handleFilterChange = (filter:"all"|"pending"|"answered") => {
 setStatusFilter(filter);
 setCurrentPage(1);
 };
 const handleSearchChange = (value: string) => {
 setSearchQuery(value);
 setCurrentPage(1);
 };

 if (isLoading) {
 return (
 <AdminLayout>
 <div className="flex items-center justify-center h-96">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"/>
 </div>
 </AdminLayout>
 );
 }

 return (
 <AdminLayout>
 <div className="space-y-6">
 {/* Header */}
 <div>
 <h1 className="text-xl font-bold text-gray-800">문의 관리</h1>
 <p className="text-xs text-gray-600 mt-1">고객 문의를 확인하고 답변을 작성할 수 있습니다. 답변 등록 시 고객에게 자동으로 이메일이 발송됩니다.</p>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-3 gap-4">
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium text-gray-600">전체</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{inquiries?.length || 0}</div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium text-gray-600">답변 대기</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-amber-600">
 {inquiries?.filter((i: Inquiry) => i.status ==="pending").length || 0}
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium text-gray-600">답변 완료</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-green-600">
 {inquiries?.filter((i: Inquiry) => i.status ==="answered").length || 0}
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Search & Filter */}
 <Card>
 <CardContent className="pt-4 pb-4">
 <div className="flex items-center gap-3">
 <div className="relative flex-1">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
 <Input
 placeholder="제목으로 검색..."
 value={searchQuery}
 onChange={(e) => handleSearchChange(e.target.value)}
 className="pl-8 h-8 text-xs"
 />
 </div>
 <div className="flex items-center gap-1.5">
 {(["all","pending","answered"] as const).map((s) => (
 <Button
 key={s}
 size="sm"
 variant={statusFilter === s ?"default":"outline"}
 className="h-8 text-xs px-3"
 onClick={() => handleFilterChange(s)}
 >
 {s ==="all"?"전체": s ==="pending"?"답변 대기":"답변 완료"}
 </Button>
 ))}
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Inquiries Accordion List */}
 <Card>
 <CardHeader>
 <CardTitle>문의 목록</CardTitle>
 <CardDescription>
 총 {filteredInquiries.length}건 · {currentPage}/{totalPages}페이지 · 항목을 클릭하면 상세 내용과 답변 폼이 펼쳐집니다
 </CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 {filteredInquiries.length === 0 ? (
 <div className="text-center py-12 text-gray-500">
 <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300"/>
 <p>{searchQuery || statusFilter !=="all"?"검색 결과가 없습니다.":"문의가 없습니다."}</p>
 </div>
 ) : (
 <div className="divide-y divide-gray-200">
 {paginatedInquiries.map((inquiry: Inquiry) => {
 const isExpanded = expandedId === inquiry.id;
 const isPending = inquiry.status ==="pending";
 const currentImages = replyImages[inquiry.id] || [];

 return (
 <div key={inquiry.id} className="bg-white">
 {/* Accordion Header */}
 <div
 className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors select-none"
 onClick={() => toggleAccordion(inquiry.id)}
 >
 <div className="flex items-center gap-1.5 shrink-0">
 <Badge
 className={`text-[10px] px-1.5 py-0.5 h-5 font-medium ${
 isPending
 ?"bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-100"
 :"bg-green-100 text-green-700 border border-green-300 hover:bg-green-100"
 }`}
 variant="outline"
 >
 {isPending ?"답변 대기":"답변 완료"}
 </Badge>
 <Button
 size="sm"
 variant="outline"
 className={`h-5 text-[10px] px-1.5 py-0 font-normal ${
 isPending
 ?"text-green-700 border-green-300 hover:bg-green-50"
 :"text-amber-700 border-amber-300 hover:bg-amber-50"
 }`}
 onClick={(e) => handleStatusToggle(e, inquiry.id, inquiry.status)}
 disabled={updateStatusMutation.isPending}
 >
 {isPending ?"답변 완료로 변경":"답변 대기로 변경"}
 </Button>
 </div>

 <div className="flex-1 min-w-0 flex items-center gap-2">
 {inquiry.isPrivate && <Lock className="w-3 h-3 text-gray-400 shrink-0"/>}
 <span className="text-sm font-medium text-gray-900 truncate">{inquiry.title}</span>
 </div>

 <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
 <span className="flex items-center gap-1">
 <User className="w-3 h-3"/>
 {inquiry.userId ||"비회원"}
 </span>
 <span className="flex items-center gap-1">
 <Eye className="w-3 h-3"/>
 {inquiry.viewCount}
 </span>
 <span className="flex items-center gap-1">
 <MessageSquare className="w-3 h-3"/>
 {inquiry.commentCount}
 </span>
 <span className="flex items-center gap-1">
 <Calendar className="w-3 h-3"/>
 {formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true, locale: ko })}
 </span>
 {isExpanded ? (
 <ChevronUp className="w-4 h-4 text-gray-400"/>
 ) : (
 <ChevronDown className="w-4 h-4 text-gray-400"/>
 )}
 </div>
 </div>

 {/* Accordion Body */}
 {isExpanded && (
 <div className="px-4 pb-5 bg-gray-50 border-t border-gray-100">
 {loadingDetail && expandedId === inquiry.id ? (
 <div className="flex items-center justify-center py-8">
 <Loader2 className="w-6 h-6 animate-spin text-pink-500"/>
 </div>
 ) : inquiryDetail ? (
 <div className="space-y-4 pt-4">
 {/* Original Inquiry Content */}
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
 <User className="w-3 h-3"/>
 <span>{(inquiryDetail.inquiry as any).userEmail || inquiryDetail.inquiry.userId || "비회원"}</span>
 <span>·</span>
 <span>{new Date(inquiryDetail.inquiry.createdAt).toLocaleDateString("ko-KR")}</span>
 <span>·</span>
 <span>조회 {inquiryDetail.inquiry.viewCount}회</span>
 </div>
 <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
 {inquiryDetail.inquiry.content}
 </p>
 {/* Inquiry images */}
 {(() => {
 const imgs: string[] = [];
 if ((inquiryDetail.inquiry as any).image_urls) {
 try { imgs.push(...JSON.parse((inquiryDetail.inquiry as any).image_urls)); } catch { /* ignore */ }
 }
 return imgs.length > 0 ? (
 <div className="flex flex-wrap gap-2 mt-3">
 {imgs.map((url, i) => (
 <img key={i} src={url} alt={`첨부 이미지${i + 1}`} className="max-w-[160px] max-h-[120px] rounded-lg border border-gray-200 object-cover cursor-pointer"onClick={() => window.open(url, '_blank')} />
 ))}
 </div>
 ) : null;
 })()}
 </div>

 {/* Existing Replies */}
 {inquiryDetail.comments.length > 0 && (
 <div className="space-y-2">
 <p className="text-xs font-semibold text-gray-600">
 답변 ({inquiryDetail.comments.length})
 </p>
 {inquiryDetail.comments.map((comment: Comment) => {
 // Parse comment images
 const commentImgs: string[] = [];
 if (comment.imageUrls) {
 try { commentImgs.push(...JSON.parse(comment.imageUrls)); } catch { /* ignore */ }
 } else if (comment.imageUrl) {
 commentImgs.push(comment.imageUrl);
 }

 return (
 <div key={comment.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 {editingCommentId === comment.id ? (
 /* Edit Mode */
 <div className="space-y-2">
 <Textarea
 value={editContent}
 onChange={(e) => setEditContent(e.target.value)}
 rows={4}
 className="resize-none text-sm bg-white"
 />
 {/* Edit Images */}
 <div className="space-y-1">
 <div className="flex flex-wrap gap-2">
 {editExistingImages.map((url, i) => (
 <div key={`existing-${i}`} className="relative inline-block">
 <img src={url} alt={`이미지${i + 1}`} className="w-20 h-20 rounded-lg border border-blue-200 object-cover"/>
 <button
 type="button"
 onClick={() => setEditExistingImages((prev) => prev.filter((_, idx) => idx !== i))}
 className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
 >
 <X className="w-3 h-3"/>
 </button>
 </div>
 ))}
 {editImages.map((img, i) => (
 <div key={`new-${i}`} className="relative inline-block">
 <img src={img.preview} alt={`새 이미지${i + 1}`} className="w-20 h-20 rounded-lg border border-gray-200 object-cover"/>
 <button
 type="button"
 onClick={() => {
 URL.revokeObjectURL(img.preview);
 setEditImages((prev) => prev.filter((_, idx) => idx !== i));
 }}
 className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
 >
 <X className="w-3 h-3"/>
 </button>
 </div>
 ))}
 {(editExistingImages.length + editImages.length) < 5 && (
 <button
 type="button"
 onClick={() => editFileInputRef.current?.click()}
 className="w-20 h-20 flex flex-col items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
 >
 <ImagePlus className="w-4 h-4"/>
 <span>추가</span>
 </button>
 )}
 </div>
 <input
 type="file"
 accept="image/*"
 multiple
 className="hidden"
 ref={editFileInputRef}
 onChange={(e) => {
 if (e.target.files) handleEditImageSelect(e.target.files);
 e.target.value ="";
 }}
 />
 </div>
 <div className="flex items-center gap-2 justify-end">
 <Button
 size="sm"
 variant="outline"
 className="h-7 text-xs px-3"
 onClick={() => { setEditingCommentId(null); setEditImages([]); setEditExistingImages([]); }}
 >
 <XCircle className="w-3 h-3 mr-1"/>
취소
 </Button>
 <Button
 size="sm"
 className="h-7 text-xs px-3"
 onClick={() => handleSaveEdit(comment.id)}
 disabled={updateCommentMutation.isPending}
 >
 {updateCommentMutation.isPending ? (
 <Loader2 className="w-3 h-3 mr-1 animate-spin"/>
 ) : (
 <Check className="w-3 h-3 mr-1"/>
 )}
저장
 </Button>
 </div>
 </div>
 ) : (
 /* View Mode */
 <>
 <div className="flex items-center justify-between mb-1.5">
 <div className="flex items-center gap-2 text-xs text-gray-500">
 <User className="w-3 h-3"/>
 <span className="font-medium text-blue-700">
 {comment.userName || "관리자"}
 </span>
 {/* AI 자동 답변 배지 */}
 {(comment.isAiGenerated || comment.content.includes("AIが自動生成")) && (
 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
 <Bot className="w-2.5 h-2.5" />AI自動回答
 </span>
 )}
 {/* 검토 필요 배지 */}
 {comment.needsReview && (
 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
 <span>⚠</span>検討必要
 </span>
 )}
 <span>
 {formatDistanceToNow(new Date(comment.createdAt), {
 addSuffix: true,
 locale: ko,
 })}
 </span>
 </div>
 <div className="flex items-center gap-1">
 <Button
 size="sm"
 variant="ghost"
 className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
 onClick={() => startEditComment(comment)}
 >
 <Pencil className="w-3 h-3"/>
 등록 중..답변 등록
 </Button> <Button
 size="sm"
 variant="ghost"
 className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
 onClick={() => handleDeleteComment(comment.id, inquiry.id)}
 disabled={deleteCommentMutation.isPending}
 >
 <Trash2 className="w-3 h-3"/>
 </Button>
 </div>
 </div>
 <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
 {comment.content}
 </p>
 {commentImgs.length > 0 && (
 <div className="flex flex-wrap gap-2 mt-2">
 {commentImgs.map((url, i) => (
 <img
 key={i}
 src={url}
 alt={`첨부 이미지${i + 1}`}
 className="max-w-[160px] max-h-[120px] rounded-lg border border-blue-200 object-cover cursor-pointer"
 onClick={() => window.open(url, '_blank')}
 />
 ))}
 </div>
 )}
 </>
 )}
 </div>
 );
 })}
 </div>
 )}

 {/* Reply Form */}
 <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
 <p className="text-xs font-semibold text-gray-700">답변 작성</p>
 <Textarea
 value={replyContent[inquiry.id] ||""}
 onChange={(e) =>
 setReplyContent((prev) => ({
 ...prev,
 [inquiry.id]: e.target.value,
 }))
 }
 placeholder="답변 내용을 입력해주세요..."
 rows={4}
 className="resize-none text-sm"
 />

 {/* Multiple Image Attachment */}
 <div className="space-y-2">
 <div className="flex flex-wrap gap-2">
 {currentImages.map((img, i) => (
 <div key={i} className="relative inline-block">
 <img
 src={img.preview}
 alt={`첨부 이미지${i + 1}`}
 className="w-20 h-20 rounded-lg border border-gray-200 object-cover"
 />
 <button
 type="button"
 onClick={() => handleRemoveImage(inquiry.id, i)}
 className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
 >
 <X className="w-3 h-3"/>
 </button>
 </div>
 ))}
 {currentImages.length < 5 && (
 <button
 type="button"
 onClick={() => fileInputRefs.current[inquiry.id]?.click()}
 className="w-20 h-20 flex flex-col items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
 >
 <ImagePlus className="w-4 h-4"/>
 <span>이미지 추가</span>
 <span className="text-[10px] text-gray-400">{currentImages.length}/5</span>
 </button>
 )}
 </div>
 <input
 type="file"
 accept="image/*"
 multiple
 className="hidden"
 ref={(el) => { fileInputRefs.current[inquiry.id] = el; }}
 onChange={(e) => {
 if (e.target.files) handleImageSelect(inquiry.id, e.target.files);
 e.target.value ="";
 }}
 />
 </div>

 <div className="flex items-center justify-between">
 <Button
 size="sm"
 variant="outline"
 className="h-8 text-xs px-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
 onClick={() => {
 const content = replyContent[inquiry.id]?.trim();
 if (!content) { toast.error('먼저 답변을 작성해주세요.'); return; }
 // AI 설정 페이지로 이동 (FAQ 저장은 AI 설정 페이지에서)
 const params = new URLSearchParams({ q: inquiry.title || '', a: content.slice(0, 500) });
 window.open(`/admin/ai-settings?${params.toString()}`, '_blank');
 }}
 >
 <Lightbulb className="w-3 h-3 mr-1.5" />
 FAQ로 저장
 </Button>
 <Button
 size="sm"
 onClick={() => handleReply(inquiry.id)}
 disabled={
 replyMutation.isPending ||
 uploadingImage[inquiry.id] ||
 !replyContent[inquiry.id]?.trim()
 }
 className="h-8 text-xs px-4"
 >
 {replyMutation.isPending || uploadingImage[inquiry.id] ? (
 <>
 <Loader2 className="w-3 h-3 mr-1.5 animate-spin"/>
 登録中...
 </>
 ) : (
 <>
 <Send className="w-3 h-3 mr-1.5"/>
 返答登録
 </>
 )}
 </Button>
 </div>
 </div>
 </div>
 ) : null}
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between">
 <p className="text-xs text-gray-500">
 총 {filteredInquiries.length}건 중 {(currentPage - 1) * PAGE_SIZE + 1}~{Math.min(currentPage * PAGE_SIZE, filteredInquiries.length)}건 표시
 </p>
 <div className="flex items-center gap-1">
 <Button size="sm"variant="outline"className="h-7 px-2 text-xs"disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>«</Button>
 <Button size="sm"variant="outline"className="h-7 px-2 text-xs"disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>‹</Button>
 {Array.from({ length: totalPages }, (_, i) => i + 1)
 .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
 .reduce<(number | string)[]>((acc, p, idx, arr) => {
 if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
 acc.push(p);
 return acc;
 }, [])
 .map((p, idx) =>
 p ==="..."? (
 <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">...</span>
 ) : (
 <Button key={p} size="sm"variant={currentPage === p ?"default":"outline"} className="h-7 w-7 p-0 text-xs"onClick={() => setCurrentPage(p as number)}>{p}</Button>
 )
 )}
 <Button size="sm"variant="outline"className="h-7 px-2 text-xs"disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>›</Button>
 <Button size="sm"variant="outline"className="h-7 px-2 text-xs"disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>»</Button>
 </div>
 </div>
 )}
 </div>
 </AdminLayout>
 );
}
