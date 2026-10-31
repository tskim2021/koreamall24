import { useState } from"react";
import { trpc } from"@/lib/trpc";
import { toast } from"sonner";
import { Badge } from"@/components/ui/badge";
import { Button } from"@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from"@/components/ui/tabs";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from"@/components/ui/alert-dialog";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from"@/components/ui/dialog";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Star, CheckCircle, XCircle, Trash2, Eye, Calendar } from"lucide-react";
import AdminLayout from"@/components/AdminLayout";

type StatusFilter ="all"|"pending"|"approved"|"rejected";

function StarRating({ rating }: { rating: number }) {
 return (
 <span className="flex items-center gap-0.5">
 {[1, 2, 3, 4, 5].map((s) => (
 <Star
 key={s}
 className={`w-3 h-3 ${s <= rating ?"fill-yellow-400 text-yellow-400":"text-gray-300"}`}
 />
 ))}
 </span>
 );
}

function StatusBadge({ status }: { status: string }) {
 if (status ==="approved") return <Badge className="bg-green-100 text-green-700 text-xs">승인</Badge>;
 if (status ==="rejected") return <Badge className="bg-red-100 text-red-700 text-xs">거절</Badge>;
 return <Badge className="bg-yellow-100 text-yellow-700 text-xs">대기</Badge>;
}

export default function AdminReviews() {
 const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
 const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
 const [expandedId, setExpandedId] = useState<number | null>(null);
 const [editDateTarget, setEditDateTarget] = useState<{ id: number; currentDate: Date } | null>(null);
 const [newDate, setNewDate] = useState<string>("");

 const countsQuery = trpc.review.adminCounts.useQuery();
 const reviewsQuery = trpc.review.adminList.useQuery(
 statusFilter ==="all"? {} : { status: statusFilter as"pending"|"approved"|"rejected"}
 );

 const utils = trpc.useUtils();

 const updateStatus = trpc.review.adminUpdateStatus.useMutation({
 onSuccess: (_, vars) => {
 if (vars.status ==="approved") toast.success("리뷰 승인 완료 - 리뷰가 공개됩니다.");
 else toast.success("리뷰 거절 완료 - 리뷰가 비공개 처리됩니다.");
 utils.review.adminList.invalidate();
 utils.review.adminCounts.invalidate();
 },
 onError: (e) => toast.error(e.message),
 });

 const deleteReview = trpc.review.adminDelete.useMutation({
 onSuccess: () => {
 toast.success("리뷰 삭제 완료");
 setDeleteTarget(null);
 utils.review.adminList.invalidate();
 utils.review.adminCounts.invalidate();
 },
 onError: (e) => toast.error(e.message),
 });

 const setBest = trpc.review.setBest.useMutation({
 onSuccess: () => {
 toast.success("베스트 리뷰 변경 완료");
 utils.review.adminList.invalidate();
 },
 });

 const updateCreatedAt = trpc.review.adminUpdateCreatedAt.useMutation({
 onSuccess: () => {
 toast.success("리뷰 작성 날짜 변경 완료");
 setEditDateTarget(null);
 setNewDate("");
 utils.review.adminList.invalidate();
 },
 onError: (e) => toast.error(e.message),
 });

 const counts = countsQuery.data;
 const reviews = reviewsQuery.data ?? [];

 return (
 <AdminLayout>
 <div className="p-4 space-y-4">
 {/* 헤더 */}
 <div>
 <h1 className="text-xl font-bold text-gray-900">리뷰 관리</h1>
 <p className="text-xs text-gray-500 mt-0.5">고객 리뷰를 검토하고 승인/거절할 수 있습니다.</p>
 </div>

 {/* 통계 카드 */}
 <div className="grid grid-cols-4 gap-3">
 {[
 { label:"전체", value: counts?.total ?? 0, color:"text-gray-700"},
 { label:"대기", value: counts?.pending ?? 0, color:"text-yellow-600"},
 { label:"승인", value: counts?.approved ?? 0, color:"text-green-600"},
 { label:"거절", value: counts?.rejected ?? 0, color:"text-red-600"},
 ].map((c) => (
 <Card key={c.label} className="p-3">
 <p className="text-xs text-gray-500">{c.label}</p>
 <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
 </Card>
 ))}
 </div>

 {/* 필터 탭 */}
 <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
 <TabsList className="h-8">
 <TabsTrigger value="all"className="text-xs px-3">전체</TabsTrigger>
 <TabsTrigger value="pending"className="text-xs px-3">
 대기 {counts?.pending ? <span className="ml-1 bg-yellow-500 text-white rounded-full px-1.5 text-[10px]">{counts.pending}</span> : null}
 </TabsTrigger>
 <TabsTrigger value="approved"className="text-xs px-3">승인</TabsTrigger>
 <TabsTrigger value="rejected"className="text-xs px-3">거절</TabsTrigger>
 </TabsList>
 </Tabs>

 {/* 리뷰 목록 */}
 {reviewsQuery.isLoading ? (
 <div className="text-center py-10 text-gray-400 text-sm">로딩 중...</div>
 ) : reviews.length === 0 ? (
 <div className="text-center py-10 text-gray-400 text-sm">리뷰가 없습니다.</div>
 ) : (
 <div className="space-y-2">
 {reviews.map((review) => {
 const images: string[] = Array.isArray(review.images) ? review.images : (() => {
 try {
 return review.images ? JSON.parse(review.images as unknown as string) : [];
 } catch {
 return [];
 }
 })();
 const isExpanded = expandedId === review.id;

 return (
 <Card key={review.id} className="overflow-hidden">
 <CardContent className="p-3">
 <div className="flex items-start gap-3">
 {/* 상품 이미지 */}
 {review.productImageUrl && (
 <img
 src={review.productImageUrl}
 alt=""
 className="w-12 h-12 object-cover rounded border flex-shrink-0"
 />
 )}

 {/* 내용 */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <StatusBadge status={review.status} />
 {review.isBest && <Badge className="bg-pink-100 text-pink-700 text-xs">베스트</Badge>}
 <StarRating rating={review.rating} />
 <span className="text-xs text-gray-500">
 {new Date(review.createdAt).toLocaleDateString("ko-KR")}
 </span>
 </div>

 <p className="text-xs text-gray-500 mt-0.5 truncate">
 {review.productNameJa || review.productName ||"상품 없음"} · {review.userName}
 </p>

 {review.title && (
 <p className="text-sm font-medium text-gray-800 mt-1">{review.title}</p>
 )}

 <p className={`text-xs text-gray-600 mt-0.5 ${isExpanded ?"":"line-clamp-2"}`}>
 {review.content}
 </p>

 {(review.content?.length ?? 0) > 100 && (
 <button
 className="text-xs text-blue-500 mt-0.5"
 onClick={() => setExpandedId(isExpanded ? null : review.id)}
 >
 {isExpanded ?"접기":"더 보기"}
 </button>
 )}

 {images.length > 0 && (
 <div className="flex gap-1 mt-1">
 {images.map((img, i) => (
 <img key={i} src={img} alt=""className="w-10 h-10 object-cover rounded border"/>
 ))}
 </div>
 )}
 </div>

 {/* 액션 버튼 */}
 <div className="flex flex-col gap-1 flex-shrink-0">
 {review.status !=="approved"&& (
 <Button
 size="sm"
 variant="outline"
 className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
 onClick={() => updateStatus.mutate({ reviewId: review.id, status:"approved"})}
 disabled={updateStatus.isPending}
 >
 <CheckCircle className="w-3 h-3 mr-1"/> 승인
 </Button>
 )}
 {review.status !=="rejected"&& (
 <Button
 size="sm"
 variant="outline"
 className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
 onClick={() => updateStatus.mutate({ reviewId: review.id, status:"rejected"})}
 disabled={updateStatus.isPending}
 >
 <XCircle className="w-3 h-3 mr-1"/> 거절
 </Button>
 )}
 <Button
 size="sm"
 variant="outline"
 className={`h-7 text-xs ${review.isBest ?"text-pink-600 border-pink-200":"text-gray-500"}`}
 onClick={() => setBest.mutate({ reviewId: review.id, isBest: !review.isBest })}
 >
 <Star className="w-3 h-3 mr-1"/> {review.isBest ?"베스트 해제":"베스트"}
 </Button>
 <Button
 size="sm"
 variant="outline"
 className="h-7 text-xs text-gray-500 hover:text-blue-600"
 onClick={() => {
 setEditDateTarget({ id: review.id, currentDate: new Date(review.createdAt) });
 setNewDate(new Date(review.createdAt).toISOString().split('T')[0]);
 }}
 >
 <Calendar className="w-3 h-3 mr-1"/> 날짜 변경
 </Button>
 <Button
 size="sm"
 variant="outline"
 className="h-7 text-xs text-gray-500 hover:text-red-600"
 onClick={() => setDeleteTarget(review.id)}
 >
 <Trash2 className="w-3 h-3 mr-1"/> 삭제
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>
 )}
 </div>

 {/* 날짜 변경 다이얼로그 */}
 <Dialog open={editDateTarget !== null} onOpenChange={() => setEditDateTarget(null)}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>리뷰 작성 날짜 변경</DialogTitle>
 <DialogDescription>리뷰의 작성 날짜를 변경합니다.</DialogDescription>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label htmlFor="review-date">작성 날짜</Label>
 <Input
 id="review-date"
 type="date"
 value={newDate}
 onChange={(e) => setNewDate(e.target.value)}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setEditDateTarget(null)}>취소</Button>
 <Button
 onClick={() => {
 if (editDateTarget && newDate) {
 updateCreatedAt.mutate({
 reviewId: editDateTarget.id,
 createdAt: new Date(newDate),
 });
 }
 }}
 disabled={updateCreatedAt.isPending}
 >
 변경
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* 삭제 확인 다이얼로그 */}
 <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>리뷰를 삭제하시겠습니까?</AlertDialogTitle>
 <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>취소</AlertDialogCancel>
 <AlertDialogAction
 className="bg-red-600 hover:bg-red-700"
 onClick={() => deleteTarget && deleteReview.mutate({ reviewId: deleteTarget })}
 >
 삭제
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </AdminLayout>
 );
}
