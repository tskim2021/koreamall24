import { useState } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { Button } from"@/components/ui/button";
import { Progress } from"@/components/ui/progress";
import { RefreshCw, Mail, CheckCircle2, XCircle, SkipForward, TrendingUp, BarChart3, Calendar, ArrowRight } from"lucide-react";
import { Link } from"wouter";

const EMAIL_TYPE_LABELS: Record<string, string> = {
 order_confirmation:"주문 확인",
 order_shipped:"배송 출발",
 order_delivered:"배송 완료",
 order_cancelled:"주문 취소",
 refund_processed:"환불 처리",
 password_changed:"비밀번호 변경",
 registration_complete:"회원가입 완료",
 profile_updated:"프로필 수정",
 review_approved:"리뷰 승인",
 review_rejected:"리뷰 반려",
 review_reminder:"리뷰 요청",
 review_reminder_7days:"리뷰 요청 (7일)",
 review_reminder_30days:"리뷰 요청 (30일)",
 inquiry_reply:"문의 답변",
 product_qa_reply:"상품 Q&A 답변",
 coupon_issued:"쿠폰 발급",
 coupon_expiry_warning:"쿠폰 만료 예정",
 birthday_coupon:"생일 쿠폰",
 point_earned:"포인트 적립",
 point_expiry_alert:"포인트 만료 알림",
 event_started:"이벤트 시작",
 event_ending_soon:"이벤트 종료 임박",
 first_purchase_coupon:"첫 구매 감사 쿠폰",
 restock_alert:"재입고 알림",
 price_drop:"가격 인하",
 announcement:"공지사항",
 newsletter:"뉴스레터",
 delivery_completion:"배송 완료",
 delayed_shipment:"배송 지연",
 new_product_question:"상품 Q&A 알림",
 inquiry_receipt:"문의 접수 확인",
 retry_payment:"재결제 유도",
 test_email:"테스트 이메일",
 test_point_expiry:"테스트 - 포인트 만료",
 test_delivery:"테스트 - 배송 완료",
 test_review_reminder:"테스트 - 리뷰 요청",
};

function getLabel(type: string) {
 return EMAIL_TYPE_LABELS[type] || type;
}

export default function EmailDashboard() {
 const { data: stats, isLoading: statsLoading, refetch } = trpc.emailLogs.getStats.useQuery();
 const { data: statsByDate, isLoading: dateLoading } = trpc.emailLogs.getStatsByDate.useQuery();
 const { data: statsByType, isLoading: typeLoading } = trpc.emailLogs.getStatsByType.useQuery();

 const isLoading = statsLoading || dateLoading || typeLoading;

 // 전체 통계 계산
 const sentCount = stats?.filter(s => s.status ==="sent").reduce((acc, s) => acc + (s.count as number), 0) ?? 0;
 const failedCount = stats?.filter(s => s.status ==="failed").reduce((acc, s) => acc + (s.count as number), 0) ?? 0;
 const skippedCount = stats?.filter(s => s.status ==="skipped").reduce((acc, s) => acc + (s.count as number), 0) ?? 0;
 const totalCount = sentCount + failedCount + skippedCount;
 const successRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

 // 최근 7일 통계
 const last7Days = statsByDate?.slice(-7) ?? [];
 const last7Total = last7Days.reduce((acc, d) => acc + d.total, 0);
 const last7Sent = last7Days.reduce((acc, d) => acc + d.sent, 0);

 // 최근 30일 차트 데이터 (간단한 막대 시각화)
 const maxDayTotal = Math.max(...(statsByDate?.map(d => d.total) ?? [1]));

 return (
 <AdminLayout>
 <div className="space-y-6">
 {/* 헤더 */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-xl font-bold text-gray-900">이메일 발송 통계 대시보드</h2>
 <p className="text-sm text-gray-500 mt-1">전체 이메일 발송 현황 및 성공률을 확인합니다.</p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline"size="sm"onClick={() => refetch()} className="gap-1.5">
 <RefreshCw className="w-3.5 h-3.5"/>새로고침
 </Button>
 <Link href="/admin/email-logs">
 <Button variant="outline"size="sm"className="gap-1.5">
 발송 이력 <ArrowRight className="w-3.5 h-3.5"/>
 </Button>
 </Link>
 </div>
 </div>

 {/* 핵심 지표 카드 */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
 <CardContent className="p-4">
 <div className="flex items-center gap-2 mb-2">
 <Mail className="w-5 h-5 text-blue-600"/>
 <span className="text-sm font-medium text-blue-700">전체 발송</span>
 </div>
 <p className="text-3xl font-bold text-blue-900">{totalCount.toLocaleString()}</p>
 <p className="text-xs text-blue-600 mt-1">누적 이메일 수</p>
 </CardContent>
 </Card>
 <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
 <CardContent className="p-4">
 <div className="flex items-center gap-2 mb-2">
 <CheckCircle2 className="w-5 h-5 text-green-600"/>
 <span className="text-sm font-medium text-green-700">발송 성공</span>
 </div>
 <p className="text-3xl font-bold text-green-900">{sentCount.toLocaleString()}</p>
 <p className="text-xs text-green-600 mt-1">성공률 {successRate}%</p>
 </CardContent>
 </Card>
 <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
 <CardContent className="p-4">
 <div className="flex items-center gap-2 mb-2">
 <XCircle className="w-5 h-5 text-red-600"/>
 <span className="text-sm font-medium text-red-700">발송 실패</span>
 </div>
 <p className="text-3xl font-bold text-red-900">{failedCount.toLocaleString()}</p>
 <p className="text-xs text-red-600 mt-1">실패율 {totalCount > 0 ? Math.round((failedCount / totalCount) * 100) : 0}%</p>
 </CardContent>
 </Card>
 <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100">
 <CardContent className="p-4">
 <div className="flex items-center gap-2 mb-2">
 <TrendingUp className="w-5 h-5 text-amber-600"/>
 <span className="text-sm font-medium text-amber-700">최근 7일</span>
 </div>
 <p className="text-3xl font-bold text-amber-900">{last7Total.toLocaleString()}</p>
 <p className="text-xs text-amber-600 mt-1">성공 {last7Sent}건</p>
 </CardContent>
 </Card>
 </div>

 {/* 성공률 프로그레스 바 */}
 <Card className="border-0">
 <CardHeader className="pb-3">
 <CardTitle className="text-base font-semibold flex items-center gap-2">
 <BarChart3 className="w-4 h-4 text-blue-600"/>
 전체 발송 성공률
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 <div className="space-y-1">
 <div className="flex justify-between text-sm">
 <span className="text-green-700 font-medium">발송 성공</span>
 <span className="text-green-700 font-bold">{successRate}%</span>
 </div>
 <Progress value={successRate} className="h-3 bg-gray-100"/>
 </div>
 <div className="grid grid-cols-3 gap-3 pt-2">
 <div className="text-center p-2 bg-green-50 rounded-lg">
 <p className="text-lg font-bold text-green-700">{sentCount.toLocaleString()}</p>
 <p className="text-xs text-green-600">성공</p>
 </div>
 <div className="text-center p-2 bg-red-50 rounded-lg">
 <p className="text-lg font-bold text-red-700">{failedCount.toLocaleString()}</p>
 <p className="text-xs text-red-600">실패</p>
 </div>
 <div className="text-center p-2 bg-amber-50 rounded-lg">
 <p className="text-lg font-bold text-amber-700">{skippedCount.toLocaleString()}</p>
 <p className="text-xs text-amber-600">건너뜀</p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* 최근 30일 발송 추이 */}
 <Card className="border-0">
 <CardHeader className="pb-3">
 <CardTitle className="text-base font-semibold flex items-center gap-2">
 <Calendar className="w-4 h-4 text-purple-600"/>
 최근 30일 발송 추이
 </CardTitle>
 </CardHeader>
 <CardContent>
 {dateLoading ? (
 <div className="h-32 bg-gray-100 rounded animate-pulse"/>
 ) : statsByDate && statsByDate.length > 0 ? (
 <div className="space-y-2">
 <div className="flex items-end gap-1 h-32">
 {statsByDate.map((d, i) => {
 const heightPct = maxDayTotal > 0 ? (d.total / maxDayTotal) * 100 : 0;
 const sentPct = d.total > 0 ? (d.sent / d.total) * 100 : 0;
 return (
 <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative"title={`${d.date}: 총 ${d.total}건 (성공 ${d.sent}, 실패 ${d.failed})`}>
 <div className="w-full rounded-t overflow-hidden"style={{ height: `${Math.max(heightPct, 4)}%` }}>
 <div className="w-full bg-green-400 rounded-t"style={{ height: `${sentPct}%` }} />
 {d.failed > 0 && <div className="w-full bg-red-400"style={{ height: `${100 - sentPct}%` }} />}
 </div>
 </div>
 );
 })}
 </div>
 <div className="flex justify-between text-xs text-gray-400">
 <span>{statsByDate[0]?.date?.slice(5)}</span>
 <span>{statsByDate[statsByDate.length - 1]?.date?.slice(5)}</span>
 </div>
 <div className="flex gap-4 text-xs text-gray-500">
 <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block"/>성공</span>
 <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block"/>실패</span>
 </div>
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center h-32 text-gray-400">
 <Calendar className="w-8 h-8 mb-2 opacity-30"/>
 <p className="text-sm">최근 30일 발송 데이터가 없습니다.</p>
 </div>
 )}
 </CardContent>
 </Card>

 {/* 이메일 타입별 통계 */}
 <Card className="border-0">
 <CardHeader className="pb-3">
 <CardTitle className="text-base font-semibold flex items-center gap-2">
 <Mail className="w-4 h-4 text-indigo-600"/>
 이메일 타입별 발송 현황
 </CardTitle>
 </CardHeader>
 <CardContent>
 {typeLoading ? (
 <div className="space-y-2">
 {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse"/>)}
 </div>
 ) : statsByType && statsByType.length > 0 ? (
 <div className="space-y-2">
 {statsByType.map((row) => {
 const rate = row.total > 0 ? Math.round((row.sent / row.total) * 100) : 0;
 return (
 <div key={row.emailType} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
 <div className="w-40 shrink-0">
 <p className="text-sm font-medium text-gray-800 truncate">{getLabel(row.emailType)}</p>
 <p className="text-xs text-gray-400">{row.emailType}</p>
 </div>
 <div className="flex-1">
 <Progress value={rate} className="h-2"/>
 </div>
 <div className="flex items-center gap-2 shrink-0 text-xs">
 <Badge variant="outline"className="bg-green-50 text-green-700 border-green-200 text-[11px]">
 성공 {row.sent}
 </Badge>
 {row.failed > 0 && (
 <Badge variant="outline"className="bg-red-50 text-red-700 border-red-200 text-[11px]">
 실패 {row.failed}
 </Badge>
 )}
 <span className="text-gray-500 w-10 text-right">{rate}%</span>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center h-32 text-gray-400">
 <Mail className="w-8 h-8 mb-2 opacity-30"/>
 <p className="text-sm">이메일 발송 데이터가 없습니다.</p>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </AdminLayout>
 );
}
