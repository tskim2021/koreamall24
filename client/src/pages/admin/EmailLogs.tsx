import { useState } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from"@/components/ui/dialog";
import { Mail, CheckCircle2, XCircle, SkipForward, RefreshCw, BarChart3, ChevronLeft, ChevronRight } from"lucide-react";

const EMAIL_TYPE_LABELS: Record<string, string> = {
 order_confirmation:"주문 확인",
 delivery_completion:"배송 완료",
 review_reminder_7days:"리뷰 요청 (7일)",
 review_reminder_30days:"리뷰 요청 (30일)",
 order_cancellation:"주문 취소",
 delayed_shipment:"배송 지연",
 new_product_question:"상품 Q&A 알림",
 inquiry_receipt:"문의 접수 확인",
 inquiry_reply:"문의 답변",
 point_expiry_alert:"포인트 만료 알림",
 retry_payment:"재결제 유도",
 test_email:"테스트 이메일",
 test_point_expiry:"테스트 - 포인트 만료",
 test_delivery:"테스트 - 배송 완료",
 test_review_reminder:"테스트 - 리뷰 요청",
};

function StatusBadge({ status }: { status: string }) {
 if (status ==="sent") return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1"/>발송 완료</Badge>;
 if (status ==="failed") return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1"/>발송 실패</Badge>;
 if (status ==="skipped") return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><SkipForward className="w-3 h-3 mr-1"/>건너뜀</Badge>;
 return <Badge variant="outline">{status}</Badge>;
}

export default function EmailLogs() {
 const [emailType, setEmailType] = useState<string>("all");
 const [status, setStatus] = useState<string>("all");
 const [page, setPage] = useState(0);
 const [selectedLog, setSelectedLog] = useState<any>(null);
 const limit = 20;

 const { data, isLoading, refetch } = trpc.emailLogs.getAll.useQuery({
 emailType: emailType !=="all"? emailType : undefined,
 status: status !=="all"? (status as"sent"|"failed"|"skipped") : undefined,
 limit,
 offset: page * limit,
 });

 const { data: stats } = trpc.emailLogs.getStats.useQuery();

 const rows = data?.rows ?? [];
 const total = data?.total ?? 0;
 const totalPages = Math.ceil(total / limit);

 // 통계 계산
 const sentCount = stats?.filter(s => s.status ==="sent").reduce((acc, s) => acc + (s.count as number), 0) ?? 0;
 const failedCount = stats?.filter(s => s.status ==="failed").reduce((acc, s) => acc + (s.count as number), 0) ?? 0;
 const skippedCount = stats?.filter(s => s.status ==="skipped").reduce((acc, s) => acc + (s.count as number), 0) ?? 0;
 const totalCount = sentCount + failedCount + skippedCount;

 return (
 <AdminLayout>
 <div className="space-y-4">
 {/* 헤더 */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-xl font-bold">이메일 발송 이력</h2>
 <p className="text-xs text-muted-foreground mt-0.5">시스템에서 발송된 모든 이메일 내역을 조회합니다.</p>
 </div>
 <Button variant="outline"size="sm"onClick={() => refetch()} className="gap-1.5">
 <RefreshCw className="w-3.5 h-3.5"/>새로고침
 </Button>
 </div>

 {/* 통계 카드 */}
 <div className="grid grid-cols-4 gap-3">
 <Card className="border-0">
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
 <Mail className="w-4 h-4 text-blue-600"/>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">전체 발송</p>
 <p className="text-lg font-bold">{totalCount.toLocaleString()}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card className="border-0">
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
 <CheckCircle2 className="w-4 h-4 text-green-600"/>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">발송 완료</p>
 <p className="text-lg font-bold text-green-600">{sentCount.toLocaleString()}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card className="border-0">
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
 <XCircle className="w-4 h-4 text-red-600"/>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">발송 실패</p>
 <p className="text-lg font-bold text-red-600">{failedCount.toLocaleString()}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card className="border-0">
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
 <SkipForward className="w-4 h-4 text-yellow-600"/>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">건너뜀</p>
 <p className="text-lg font-bold text-yellow-600">{skippedCount.toLocaleString()}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* 유형별 통계 */}
 {stats && stats.length > 0 && (
 <Card className="border-0">
 <CardHeader className="pb-2 pt-4 px-4">
 <CardTitle className="text-sm flex items-center gap-1.5"><BarChart3 className="w-4 h-4"/>유형별 발송 현황</CardTitle>
 </CardHeader>
 <CardContent className="px-4 pb-4">
 <div className="flex flex-wrap gap-2">
 {Object.entries(
 stats.reduce((acc: Record<string, { sent: number; failed: number; skipped: number }>, s) => {
 const key = s.emailType;
 if (!acc[key]) acc[key] = { sent: 0, failed: 0, skipped: 0 };
 acc[key][s.status as"sent"|"failed"|"skipped"] = s.count as number;
 return acc;
 }, {})
 ).map(([type, counts]) => (
 <div key={type} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs">
 <span className="font-medium text-gray-700">{EMAIL_TYPE_LABELS[type] ?? type}</span>
 {counts.sent > 0 && <span className="text-green-600">✓{counts.sent}</span>}
 {counts.failed > 0 && <span className="text-red-600">✗{counts.failed}</span>}
 {counts.skipped > 0 && <span className="text-yellow-600">⊘{counts.skipped}</span>}
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 )}

 {/* 필터 */}
 <Card className="border-0">
 <CardContent className="p-4">
 <div className="flex gap-3">
 <div className="flex-1">
 <Select value={emailType} onValueChange={v => { setEmailType(v); setPage(0); }}>
 <SelectTrigger className="h-8 text-xs">
 <SelectValue placeholder="이메일 유형"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">전체 유형</SelectItem>
 {Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => (
 <SelectItem key={value} value={value}>{label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="flex-1">
 <Select value={status} onValueChange={v => { setStatus(v); setPage(0); }}>
 <SelectTrigger className="h-8 text-xs">
 <SelectValue placeholder="발송 상태"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">전체 상태</SelectItem>
 <SelectItem value="sent">발송 완료</SelectItem>
 <SelectItem value="failed">발송 실패</SelectItem>
 <SelectItem value="skipped">건너뜀</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="text-xs text-muted-foreground flex items-center">
 총 {total.toLocaleString()}건
 </div>
 </div>
 </CardContent>
 </Card>

 {/* 테이블 */}
 <Card className="border-0">
 <CardContent className="p-0">
 <Table>
 <TableHeader>
 <TableRow className="bg-gray-50">
 <TableHead className="text-xs px-3 py-2 w-[160px]">발송 일시</TableHead>
 <TableHead className="text-xs px-3 py-2 w-[140px]">이메일 유형</TableHead>
 <TableHead className="text-xs px-3 py-2">수신자</TableHead>
 <TableHead className="text-xs px-3 py-2">제목</TableHead>
 <TableHead className="text-xs px-3 py-2 w-[100px]">상태</TableHead>
 <TableHead className="text-xs px-3 py-2 w-[60px]">상세</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">로딩 중...</TableCell>
 </TableRow>
 ) : rows.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
 <Mail className="w-8 h-8 mx-auto mb-2 text-gray-300"/>
 발송 이력이 없습니다.
 </TableCell>
 </TableRow>
 ) : rows.map((row: any) => (
 <TableRow key={row.id} className="hover:bg-gray-50 cursor-pointer"onClick={() => setSelectedLog(row)}>
 <TableCell className="text-xs px-3 py-2 text-muted-foreground">
 {new Date(row.sentAt).toLocaleString("ko-KR", { month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit"})}
 </TableCell>
 <TableCell className="text-xs px-3 py-2">
 <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px]">
 {EMAIL_TYPE_LABELS[row.emailType] ?? row.emailType}
 </span>
 </TableCell>
 <TableCell className="text-xs px-3 py-2 font-mono">{row.to}</TableCell>
 <TableCell className="text-xs px-3 py-2 max-w-[200px] truncate">{row.subject}</TableCell>
 <TableCell className="text-xs px-3 py-2"><StatusBadge status={row.status} /></TableCell>
 <TableCell className="text-xs px-3 py-2">
 <Button variant="ghost"size="sm"className="h-6 px-2 text-xs">보기</Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </CardContent>
 </Card>

 {/* 페이지네이션 */}
 {totalPages > 1 && (
 <div className="flex items-center justify-center gap-2">
 <Button variant="outline"size="sm"disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 px-2">
 <ChevronLeft className="w-3.5 h-3.5"/>
 </Button>
 <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
 <Button variant="outline"size="sm"disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 px-2">
 <ChevronRight className="w-3.5 h-3.5"/>
 </Button>
 </div>
 )}
 </div>

 {/* 상세 다이얼로그 */}
 <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle className="text-sm">이메일 발송 상세</DialogTitle>
 </DialogHeader>
 {selectedLog && (
 <div className="space-y-3 text-xs">
 <div className="grid grid-cols-2 gap-2">
 <div>
 <p className="text-muted-foreground mb-0.5">발송 일시</p>
 <p className="font-medium">{new Date(selectedLog.sentAt).toLocaleString("ko-KR")}</p>
 </div>
 <div>
 <p className="text-muted-foreground mb-0.5">상태</p>
 <StatusBadge status={selectedLog.status} />
 </div>
 <div>
 <p className="text-muted-foreground mb-0.5">이메일 유형</p>
 <p className="font-medium">{EMAIL_TYPE_LABELS[selectedLog.emailType] ?? selectedLog.emailType}</p>
 </div>
 <div>
 <p className="text-muted-foreground mb-0.5">수신자</p>
 <p className="font-mono">{selectedLog.to}</p>
 </div>
 </div>
 <div>
 <p className="text-muted-foreground mb-0.5">제목</p>
 <p className="font-medium">{selectedLog.subject}</p>
 </div>
 {selectedLog.errorMessage && (
 <div>
 <p className="text-muted-foreground mb-0.5">오류 메시지</p>
 <p className="text-red-600 bg-red-50 rounded p-2 font-mono">{selectedLog.errorMessage}</p>
 </div>
 )}
 {selectedLog.metadata && (
 <div>
 <p className="text-muted-foreground mb-0.5">메타데이터</p>
 <pre className="bg-gray-50 rounded p-2 text-[11px] overflow-auto max-h-32">
 {JSON.stringify(JSON.parse(selectedLog.metadata), null, 2)}
 </pre>
 </div>
 )}
 {selectedLog.resendId && (
 <div>
 <p className="text-muted-foreground mb-0.5">Resend ID</p>
 <p className="font-mono text-[11px] text-blue-600">{selectedLog.resendId}</p>
 </div>
 )}
 </div>
 )}
 </DialogContent>
 </Dialog>
 </AdminLayout>
 );
}
