import { useState, useRef } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Input } from"@/components/ui/input";
import { Button } from"@/components/ui/button";
import { Textarea } from"@/components/ui/textarea";
import { toast } from"sonner";
import {
 MessageSquare,
 Search,
 CheckCircle,
 Clock,
 Trash2,
 Send,
 ChevronDown,
 ChevronUp,
 Pencil,
 X,
 ImagePlus,
} from"lucide-react";

const PAGE_SIZE = 20;

export default function ProductQuestions() {
 const [searchQuery, setSearchQuery] = useState("");
 const [filterStatus, setFilterStatus] = useState<"all"|"unanswered"|"answered">("unanswered");
 const [currentPage, setCurrentPage] = useState(1);
 const [expandedId, setExpandedId] = useState<number | null>(null);

 // Answer form state per question
 const [answerTexts, setAnswerTexts] = useState<Record<number, string>>({});
 const [answerImages, setAnswerImages] = useState<Record<number, { file: File; preview: string; uploading: boolean; url?: string }>>({});
 const [editingId, setEditingId] = useState<number | null>(null);

 const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
 const utils = trpc.useUtils();

 const { data: allQuestions, isLoading } = trpc.productQuestion.adminList.useQuery({ limit: 500 });

 const answerMutation = trpc.productQuestion.answer.useMutation({
 onSuccess: () => {
 toast.success("답변이 등록되었습니다");
 utils.productQuestion.adminList.invalidate();
 setAnswerTexts({});
 setAnswerImages({});
 setEditingId(null);
 },
 onError: () => toast.error("답변 등록에 실패했습니다"),
 });

 const deleteAnswerMutation = trpc.productQuestion.deleteAnswer.useMutation({
 onSuccess: () => {
 toast.success("답변이 삭제되었습니다");
 utils.productQuestion.adminList.invalidate();
 },
 onError: () => toast.error("답변 삭제에 실패했습니다"),
 });

 const deleteMutation = trpc.productQuestion.delete.useMutation({
 onSuccess: () => {
 toast.success("질문이 삭제되었습니다");
 utils.productQuestion.adminList.invalidate();
 },
 onError: () => toast.error("질문 삭제에 실패했습니다"),
 });

 const uploadImageMutation = trpc.productQuestion.uploadAnswerImage.useMutation();

 const handleImageSelect = async (questionId: number, file: File) => {
 const preview = URL.createObjectURL(file);
 setAnswerImages((prev) => ({ ...prev, [questionId]: { file, preview, uploading: true } }));
 try {
 const base64 = await new Promise<string>((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = () => resolve((reader.result as string).split(",")[1]);
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });
 const { url } = await uploadImageMutation.mutateAsync({
 fileName: file.name,
 fileData: base64,
 contentType: file.type,
 });
 setAnswerImages((prev) => ({ ...prev, [questionId]: { file, preview, uploading: false, url } }));
 } catch {
 toast.error("이미지 업로드에 실패했습니다");
 setAnswerImages((prev) => {
 const next = { ...prev };
 delete next[questionId];
 return next;
 });
 }
 };

 const handleAnswer = (questionId: number) => {
 const answerText = answerTexts[questionId]?.trim();
 if (!answerText) { toast.error("답변을 입력해주세요"); return; }
 const imgData = answerImages[questionId];
 if (imgData?.uploading) { toast.error("이미지 업로드 중입니다. 잠시 후 다시 시도해주세요"); return; }
 answerMutation.mutate({ questionId, answerText, answerImageUrl: imgData?.url });
 };

 const handleEditStart = (q: { id: number; answer: string | null; answerImageUrl?: string | null }) => {
 setEditingId(q.id);
 setAnswerTexts((prev) => ({ ...prev, [q.id]: q.answer ||""}));
 if (q.answerImageUrl) {
 setAnswerImages((prev) => ({ ...prev, [q.id]: { file: new File([],""), preview: q.answerImageUrl!, uploading: false, url: q.answerImageUrl! } }));
 }
 setExpandedId(q.id);
 };

 const handleEditCancel = (questionId: number) => {
 setEditingId(null);
 setAnswerTexts((prev) => { const n = { ...prev }; delete n[questionId]; return n; });
 setAnswerImages((prev) => { const n = { ...prev }; delete n[questionId]; return n; });
 };

 const handleDeleteAnswer = (questionId: number) => {
 if (confirm("답변을 삭제하시겠습니까?")) deleteAnswerMutation.mutate({ questionId });
 };

 const handleDeleteQuestion = (questionId: number) => {
 if (confirm("이 질문을 삭제하시겠습니까?")) deleteMutation.mutate({ questionId });
 };

 const toggleExpand = (id: number) => {
 setExpandedId((prev) => (prev === id ? null : id));
 if (expandedId !== id) setEditingId(null);
 };

 // Filter
 const filteredQuestions = (allQuestions || []).filter((q) => {
 const matchSearch =
 searchQuery ===""||
 q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (q.productName ||"").toLowerCase().includes(searchQuery.toLowerCase());
 const matchStatus =
 filterStatus ==="all"||
 (filterStatus ==="unanswered"&& !q.isAnswered) ||
 (filterStatus ==="answered"&& q.isAnswered);
 return matchSearch && matchStatus;
 });

 // Pagination
 const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
 const safePage = Math.min(currentPage, totalPages);
 const paginatedQuestions = filteredQuestions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

 const handleFilterChange = (status: typeof filterStatus) => {
 setFilterStatus(status);
 setCurrentPage(1);
 };
 const handleSearchChange = (v: string) => {
 setSearchQuery(v);
 setCurrentPage(1);
 };

 const unansweredCount = (allQuestions || []).filter((q) => !q.isAnswered).length;
 const answeredCount = (allQuestions || []).filter((q) => q.isAnswered).length;

 return (
 <AdminLayout>
 <div className="space-y-6">
 {/* Header */}
 <div className="flex justify-between items-center">
 <h2 className="text-xl font-bold">상품 Q&A 관리</h2>
 <div className="flex gap-2">
 <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-3 py-1.5 rounded-md">
 미답변 {unansweredCount}건
 </span>
 <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1.5 rounded-md">
 답변완료 {answeredCount}건
 </span>
 </div>
 </div>

 {/* Filters */}
 <Card>
 <CardContent className="pt-4 pb-4">
 <div className="flex gap-3 flex-wrap">
 <div className="flex-1 min-w-[200px] relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
 <Input
 value={searchQuery}
 onChange={(e) => handleSearchChange(e.target.value)}
 placeholder="상품명 또는 질문 내용으로 검색..."
 className="pl-9 text-sm"
 />
 </div>
 <div className="flex gap-2">
 {(["all","unanswered","answered"] as const).map((s) => (
 <button
 key={s}
 onClick={() => handleFilterChange(s)}
 className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
 filterStatus === s ?"bg-pink-600 text-white":"bg-gray-100 text-gray-700 hover:bg-gray-200"
 }`}
 >
 {s ==="all"?"전체": s ==="unanswered"?"미답변":"답변완료"}
 </button>
 ))}
 </div>
 </div>
 </CardContent>
 </Card>

 {/* List */}
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-gray-600">
 총 {filteredQuestions.length}건 · {safePage}/{totalPages} 페이지
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 {isLoading ? (
 <div className="flex justify-center py-16">
 <div className="animate-spin rounded-full h-8 w-8 border-4 border-pink-500 border-t-transparent"/>
 </div>
 ) : paginatedQuestions.length === 0 ? (
 <div className="py-16 text-center text-gray-400">
 <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40"/>
 <p className="text-sm">질문이 없습니다</p>
 </div>
 ) : (
 <div className="divide-y divide-gray-100">
 {paginatedQuestions.map((q) => {
 const isExpanded = expandedId === q.id;
 const isEditing = editingId === q.id;
 const imgData = answerImages[q.id];

 return (
 <div key={q.id}>
 {/* Row header - clickable */}
 <div
 className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
 onClick={() => toggleExpand(q.id)}
 >
 {/* Status badge */}
 <div className="flex-shrink-0">
 {q.isAnswered ? (
 <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded">
 <CheckCircle className="w-3 h-3"/> 답변완료
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded">
 <Clock className="w-3 h-3"/> 답변대기
 </span>
 )}
 </div>

 {/* Product name */}
 <span className="text-xs text-pink-600 font-medium flex-shrink-0 w-32 truncate">
 {q.productName || `상품 #${q.productId}`}
 </span>

 {/* Question preview */}
 <span className="flex-1 text-xs text-gray-700 truncate">{q.question}</span>

 {/* Date */}
 <span className="text-xs text-gray-400 flex-shrink-0">
 {new Date(q.createdAt).toLocaleDateString("ko-KR")}
 </span>

 {/* Expand icon */}
 <span className="text-gray-400 flex-shrink-0">
 {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
 </span>
 </div>

 {/* Accordion body */}
 {isExpanded && (
 <div className="bg-gray-50 px-6 py-4 space-y-4 border-t border-gray-100">
 {/* Question */}
 <div className="bg-blue-50 rounded-lg p-4">
 <div className="flex items-start gap-2">
 <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">Q</span>
 <p className="text-sm text-gray-800 flex-1">{q.question}</p>
 </div>
 </div>

 {/* Answer display (not editing) */}
 {q.isAnswered && q.answer && !isEditing && (
 <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
 <div className="flex items-start gap-2">
 <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">A</span>
 <div className="flex-1 space-y-2">
 <p className="text-sm text-gray-800">{q.answer}</p>
 {(q as any).answerImageUrl && (
 <img src={(q as any).answerImageUrl} alt="답변 이미지"className="max-w-xs rounded-lg border"/>
 )}
 <p className="text-xs text-gray-400">
 {q.answeredAt && new Date(q.answeredAt).toLocaleDateString("ko-KR")}
 </p>
 </div>
 <div className="flex gap-1 flex-shrink-0">
 <button
 onClick={(e) => { e.stopPropagation(); handleEditStart(q as any); }}
 className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
 title="수정"
 >
 <Pencil className="w-3.5 h-3.5"/>
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); handleDeleteAnswer(q.id); }}
 className="p-1.5 text-red-500 hover:bg-red-50 rounded"
 title="답변 삭제"
 >
 <Trash2 className="w-3.5 h-3.5"/>
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Answer form (new or editing) */}
 {(!q.isAnswered || isEditing) && (
 <div className="space-y-3">
 <Textarea
 value={answerTexts[q.id] ||""}
 onChange={(e) => setAnswerTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
 placeholder="답변을 입력해주세요..."
 className="min-h-[90px] text-sm"
 onClick={(e) => e.stopPropagation()}
 />

 {/* Image upload */}
 <div className="flex items-center gap-3">
 <input
 ref={(el) => { fileInputRefs.current[q.id] = el; }}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleImageSelect(q.id, file);
 }}
 />
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); fileInputRefs.current[q.id]?.click(); }}
 className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
 >
 <ImagePlus className="w-3.5 h-3.5"/>
 이미지 첨부
 </button>
 {imgData && (
 <div className="flex items-center gap-2">
 {imgData.uploading ? (
 <span className="text-xs text-gray-400">업로드 중...</span>
 ) : (
 <>
 <img src={imgData.preview} alt="미리보기"className="w-12 h-12 object-cover rounded border"/>
 <button
 onClick={(e) => { e.stopPropagation(); setAnswerImages((prev) => { const n = { ...prev }; delete n[q.id]; return n; }); }}
 className="p-1 text-red-400 hover:text-red-600"
 >
 <X className="w-3.5 h-3.5"/>
 </button>
 </>
 )}
 </div>
 )}
 </div>

 <div className="flex gap-2">
 <Button
 size="sm"
 onClick={(e) => { e.stopPropagation(); handleAnswer(q.id); }}
 disabled={answerMutation.isPending}
 className="bg-green-600 hover:bg-green-700 text-white text-xs"
 >
 <Send className="w-3.5 h-3.5 mr-1"/>
 {isEditing ?"수정 완료":"답변 등록"}
 </Button>
 {isEditing && (
 <Button
 size="sm"
 variant="outline"
 onClick={(e) => { e.stopPropagation(); handleEditCancel(q.id); }}
 className="text-xs"
 >
 취소
 </Button>
 )}
 </div>
 </div>
 )}

 {/* Delete question */}
 <div className="flex justify-end pt-1">
 <button
 onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }}
 className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600"
 >
 <Trash2 className="w-3.5 h-3.5"/>
 질문 삭제
 </button>
 </div>
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
 <div className="flex items-center justify-center gap-1">
 <button
 onClick={() => setCurrentPage(1)}
 disabled={safePage === 1}
 className="px-2 py-1.5 text-xs rounded border disabled:opacity-40 hover:bg-gray-50"
 >
 처음
 </button>
 <button
 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
 disabled={safePage === 1}
 className="px-2 py-1.5 text-xs rounded border disabled:opacity-40 hover:bg-gray-50"
 >
 이전
 </button>
 {Array.from({ length: totalPages }, (_, i) => i + 1)
 .filter((p) => Math.abs(p - safePage) <= 2)
 .map((p) => (
 <button
 key={p}
 onClick={() => setCurrentPage(p)}
 className={`w-8 h-8 text-xs rounded border ${
 p === safePage ?"bg-pink-600 text-white border-pink-600":"hover:bg-gray-50"
 }`}
 >
 {p}
 </button>
 ))}
 <button
 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
 disabled={safePage === totalPages}
 className="px-2 py-1.5 text-xs rounded border disabled:opacity-40 hover:bg-gray-50"
 >
 다음
 </button>
 <button
 onClick={() => setCurrentPage(totalPages)}
 disabled={safePage === totalPages}
 className="px-2 py-1.5 text-xs rounded border disabled:opacity-40 hover:bg-gray-50"
 >
 마지막
 </button>
 <span className="text-xs text-gray-500 ml-2">
 {(safePage - 1) * PAGE_SIZE + 1}~{Math.min(safePage * PAGE_SIZE, filteredQuestions.length)}건 / 총 {filteredQuestions.length}건
 </span>
 </div>
 )}
 </div>
 </AdminLayout>
 );
}
