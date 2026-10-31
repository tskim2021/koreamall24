import { useState } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Label } from"@/components/ui/label";
import { Bell, Send, Users, User, Trash2, RefreshCw, CheckCheck } from"lucide-react";
import { toast } from"sonner";

const NOTIFICATION_TYPES = [
 { value:"admin", label:"관리자 공지"},
 { value:"order", label:"주문 알림"},
 { value:"tier", label:"등급 알림"},
 { value:"coupon", label:"쿠폰 알림"},
 { value:"point", label:"포인트 알림"},
 { value:"system", label:"시스템 알림"},
];

const TYPE_COLORS: Record<string, string> = {
 order:"bg-blue-100 text-blue-700",
 admin:"bg-purple-100 text-purple-700",
 tier:"bg-yellow-100 text-yellow-700",
 coupon:"bg-green-100 text-green-700",
 point:"bg-orange-100 text-orange-700",
 review:"bg-pink-100 text-pink-700",
 inquiry:"bg-cyan-100 text-cyan-700",
 system:"bg-gray-100 text-gray-700",
};

export default function AdminNotifications() {
 // 개별 발송 폼
 const [sendForm, setSendForm] = useState({
 userId:"",
 type:"admin"as string,
 title:"",
 message:"",
 link:"",
 });

 // 전체 발송 폼
 const [broadcastForm, setBroadcastForm] = useState({
 type:"admin"as string,
 title:"",
 message:"",
 link:"",
 });

 // 알림 목록 조회 (관리자용 전체 조회)
 const [listPage, setListPage] = useState(1);
 const { data: notifList, refetch: refetchList, isLoading: listLoading } = trpc.notification.adminList.useQuery(
 { page: listPage, limit: 20 },
 { refetchOnWindowFocus: false }
 );

 // 개별 발송 뮤테이션
 const sendMutation = trpc.notification.adminSend.useMutation({
 onSuccess: () => {
 toast.success("알림 발송 완료", { description:"사용자에게 알림이 발송되었습니다."});
 setSendForm({ userId:"", type:"admin", title:"", message:"", link:""});
 refetchList();
 },
 onError: (err) => toast.error("발송 실패", { description: err.message }),
 });

 // 전체 발송 뮤테이션
 const broadcastMutation = trpc.notification.adminBroadcast.useMutation({
 onSuccess: (data) => {
 toast.success("전체 발송 완료", { description: `${data.count}명에게 알림이 발송되었습니다.` });
 setBroadcastForm({ type:"admin", title:"", message:"", link:""});
 refetchList();
 },
 onError: (err) => toast.error("발송 실패", { description: err.message }),
 });

 // 알림 삭제
 const deleteMutation = trpc.notification.adminDelete.useMutation({
 onSuccess: () => { toast.success("삭제 완료"); refetchList(); },
 onError: (err) => toast.error("삭제 실패", { description: err.message }),
 });

 const handleSend = () => {
 if (!sendForm.userId || !sendForm.title || !sendForm.message) {
 toast.error("입력 오류", { description:"사용자 ID, 제목, 내용을 모두 입력해주세요."});
 return;
 }
 sendMutation.mutate({
 userId: parseInt(sendForm.userId),
 type: sendForm.type as any,
 title: sendForm.title,
 message: sendForm.message,
 link: sendForm.link || undefined,
 });
 };

 const handleBroadcast = () => {
 if (!broadcastForm.title || !broadcastForm.message) {
 toast.error("입력 오류", { description:"제목과 내용을 입력해주세요."});
 return;
 }
 if (!confirm(`전체 사용자에게 알림을 발송하시겠습니까?`)) return;
 broadcastMutation.mutate({
 type: broadcastForm.type as any,
 title: broadcastForm.title,
 message: broadcastForm.message,
 link: broadcastForm.link || undefined,
 });
 };

 const formatDate = (date: Date | string) =>
 new Date(date).toLocaleString("ko-KR", { timeZone:"Asia/Tokyo"});

 return (
 <AdminLayout>
 <div className="space-y-6">
 {/* 헤더 */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-purple-100 rounded-lg">
 <Bell className="w-6 h-6 text-purple-600"/>
 </div>
 <div>
 <h1 className="text-2xl font-bold text-gray-900">알림 관리</h1>
 <p className="text-sm text-gray-500">사용자에게 인앱 알림을 발송하고 관리합니다</p>
 </div>
 </div>
 <Button variant="outline"size="sm"onClick={() => refetchList()}>
 <RefreshCw className="w-4 h-4 mr-2"/>
 새로고침
 </Button>
 </div>

 <Tabs defaultValue="send">
 <TabsList className="grid w-full grid-cols-3">
 <TabsTrigger value="send">
 <User className="w-4 h-4 mr-2"/>
 개별 발송
 </TabsTrigger>
 <TabsTrigger value="broadcast">
 <Users className="w-4 h-4 mr-2"/>
 전체 발송
 </TabsTrigger>
 <TabsTrigger value="history">
 <Bell className="w-4 h-4 mr-2"/>
 발송 이력
 </TabsTrigger>
 </TabsList>

 {/* 개별 발송 탭 */}
 <TabsContent value="send">
 <Card>
 <CardHeader>
 <CardTitle className="text-base">특정 사용자에게 알림 발송</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label>사용자 ID <span className="text-red-500">*</span></Label>
 <Input
 type="number"
 placeholder="사용자 DB ID 입력"
 value={sendForm.userId}
 onChange={e => setSendForm(f => ({ ...f, userId: e.target.value }))}
 />
 <p className="text-xs text-gray-400">고객 목록에서 사용자 ID를 확인하세요</p>
 </div>
 <div className="space-y-1.5">
 <Label>알림 유형</Label>
 <Select value={sendForm.type} onValueChange={v => setSendForm(f => ({ ...f, type: v }))}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {NOTIFICATION_TYPES.map(t => (
 <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="space-y-1.5">
 <Label>제목 <span className="text-red-500">*</span></Label>
 <Input
 placeholder="알림 제목"
 value={sendForm.title}
 onChange={e => setSendForm(f => ({ ...f, title: e.target.value }))}
 maxLength={200}
 />
 </div>
 <div className="space-y-1.5">
 <Label>내용 <span className="text-red-500">*</span></Label>
 <Textarea
 placeholder="알림 내용을 입력하세요"
 value={sendForm.message}
 onChange={e => setSendForm(f => ({ ...f, message: e.target.value }))}
 rows={3}
 />
 </div>
 <div className="space-y-1.5">
 <Label>링크 (선택)</Label>
 <Input
 placeholder="/mypage/orders/123"
 value={sendForm.link}
 onChange={e => setSendForm(f => ({ ...f, link: e.target.value }))}
 />
 </div>
 <Button
 onClick={handleSend}
 disabled={sendMutation.isPending}
 className="w-full bg-purple-600 hover:bg-purple-700"
 >
 <Send className="w-4 h-4 mr-2"/>
 {sendMutation.isPending ?"발송 중...":"알림 발송"}
 </Button>
 </CardContent>
 </Card>
 </TabsContent>

 {/* 전체 발송 탭 */}
 <TabsContent value="broadcast">
 <Card>
 <CardHeader>
 <CardTitle className="text-base">전체 사용자에게 알림 발송 (브로드캐스트)</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
 ⚠️ 전체 발송은 모든 회원에게 알림을 보냅니다. 신중하게 사용하세요.
 </div>
 <div className="space-y-1.5">
 <Label>알림 유형</Label>
 <Select value={broadcastForm.type} onValueChange={v => setBroadcastForm(f => ({ ...f, type: v }))}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {NOTIFICATION_TYPES.map(t => (
 <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1.5">
 <Label>제목 <span className="text-red-500">*</span></Label>
 <Input
 placeholder="알림 제목"
 value={broadcastForm.title}
 onChange={e => setBroadcastForm(f => ({ ...f, title: e.target.value }))}
 maxLength={200}
 />
 </div>
 <div className="space-y-1.5">
 <Label>내용 <span className="text-red-500">*</span></Label>
 <Textarea
 placeholder="알림 내용을 입력하세요"
 value={broadcastForm.message}
 onChange={e => setBroadcastForm(f => ({ ...f, message: e.target.value }))}
 rows={3}
 />
 </div>
 <div className="space-y-1.5">
 <Label>링크 (선택)</Label>
 <Input
 placeholder="/sale"
 value={broadcastForm.link}
 onChange={e => setBroadcastForm(f => ({ ...f, link: e.target.value }))}
 />
 </div>
 <Button
 onClick={handleBroadcast}
 disabled={broadcastMutation.isPending}
 className="w-full bg-red-600 hover:bg-red-700"
 >
 <Users className="w-4 h-4 mr-2"/>
 {broadcastMutation.isPending ?"발송 중...":"전체 발송"}
 </Button>
 </CardContent>
 </Card>
 </TabsContent>

 {/* 발송 이력 탭 */}
 <TabsContent value="history">
 <Card>
 <CardHeader>
 <CardTitle className="text-base">최근 알림 발송 이력</CardTitle>
 </CardHeader>
 <CardContent>
 {listLoading ? (
 <div className="text-center py-8 text-gray-400">로딩 중...</div>
 ) : !notifList?.notifications?.length ? (
 <div className="text-center py-8 text-gray-400">
 <Bell className="w-10 h-10 mx-auto mb-2 opacity-30"/>
 <p>발송된 알림이 없습니다</p>
 </div>
 ) : (
 <div className="space-y-2">
 {notifList.notifications.map((n: any) => (
 <div
 key={n.id}
 className={`flex items-start justify-between p-3 rounded-lg border ${n.isRead ?"bg-gray-50":"bg-white border-purple-200"}`}
 >
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <Badge className={`text-xs ${TYPE_COLORS[n.type] ||"bg-gray-100 text-gray-700"}`}>
 {NOTIFICATION_TYPES.find(t => t.value === n.type)?.label || n.type}
 </Badge>
 <span className="text-xs text-gray-400">
 사용자 ID: {n.userId}
 </span>
 {!n.isRead && (
 <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"/>
 )}
 </div>
 <p className="font-medium text-sm text-gray-900 truncate">{n.title}</p>
 <p className="text-xs text-gray-500 truncate">{n.message}</p>
 <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
 </div>
 <Button
 variant="ghost"
 size="sm"
 className="text-red-400 hover:text-red-600 ml-2 shrink-0"
 onClick={() => deleteMutation.mutate({ notificationId: n.id })}
 disabled={deleteMutation.isPending}
 >
 <Trash2 className="w-4 h-4"/>
 </Button>
 </div>
 ))}
 {/* 페이지네이션 */}
 <div className="flex justify-between items-center pt-3">
 <Button
 variant="outline"size="sm"
 disabled={listPage <= 1}
 onClick={() => setListPage(p => p - 1)}
 >이전</Button>
 <span className="text-sm text-gray-500">
 {listPage} / {Math.ceil((notifList.total || 0) / 20)} 페이지
 </span>
 <Button
 variant="outline"size="sm"
 disabled={listPage >= Math.ceil((notifList.total || 0) / 20)}
 onClick={() => setListPage(p => p + 1)}
 >다음</Button>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </div>
 </AdminLayout>
 );
}
