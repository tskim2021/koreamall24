import { useState } from"react";
import AdminLayout from"@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Badge } from"@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from"@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Switch } from"@/components/ui/switch";
import { Label } from"@/components/ui/label";
import { trpc } from"@/lib/trpc";
import { toast } from"sonner";
import {
 MessageSquare,
 BarChart3,
 HelpCircle,
 Settings,
 ShieldBan,
 Plus,
 Trash2,
 Edit,
 Eye,
 Save,
 RefreshCw,
 Bot,
 Users,
 TrendingUp,
 Clock,
 Search,
} from"lucide-react";

// ─── Dashboard Tab ───────────────────────────────────────────────────
function DashboardTab() {
 const { data: stats, isLoading } = trpc.adminChatbot.getStats.useQuery(undefined, {
 refetchInterval: 2 * 60 * 1000,
 });

 if (isLoading) {
 return (
 <div className="grid grid-cols-3 gap-4">
 {[1, 2, 3, 4, 5, 6].map((i) => (
 <Card key={i} className="animate-pulse">
 <CardContent className="p-6">
 <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"/>
 <div className="h-8 bg-gray-200 rounded w-1/3"/>
 </CardContent>
 </Card>
 ))}
 </div>
 );
 }

 const statCards = [
 { label:"전체 대화", value: stats?.totalConversations ?? 0, icon: <MessageSquare className="w-5 h-5"/>, color:"text-blue-600 bg-blue-50"},
 { label:"오늘 대화", value: stats?.todayConversations ?? 0, icon: <Clock className="w-5 h-5"/>, color:"text-green-600 bg-green-50"},
 { label:"활성 대화", value: stats?.activeConversations ?? 0, icon: <Users className="w-5 h-5"/>, color:"text-orange-600 bg-orange-50"},
 { label:"전체 메시지", value: stats?.totalMessages ?? 0, icon: <MessageSquare className="w-5 h-5"/>, color:"text-purple-600 bg-purple-50"},
 { label:"FAQ 매칭 수", value: stats?.totalFaqMatches ?? 0, icon: <HelpCircle className="w-5 h-5"/>, color:"text-pink-600 bg-pink-50"},
 { label:"평균 메시지/대화", value: stats?.avgMessagesPerConversation ?? 0, icon: <TrendingUp className="w-5 h-5"/>, color:"text-indigo-600 bg-indigo-50"},
 ];

 return (
 <div className="space-y-6">
 <div className="grid grid-cols-3 gap-4">
 {statCards.map((card) => (
 <Card key={card.label}>
 <CardContent className="p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{card.label}</p>
 <p className="text-xl font-bold mt-1">{card.value}</p>
 </div>
 <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
 {card.icon}
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 
 <Card>
 <CardHeader>
 <CardTitle className="text-base">챗봇 운영 안내</CardTitle>
 </CardHeader>
 <CardContent className="text-sm text-muted-foreground space-y-2">
 <p>FAQ를 등록하면 LLM 호출 없이 즉시 응답하여 비용을 절감할 수 있습니다.</p>
 <p>차단 키워드를 등록하면 부적절한 질문을 자동으로 필터링합니다.</p>
 <p>설정 탭에서 챗봇 활성화/비활성화, 시스템 프롬프트 커스터마이징이 가능합니다.</p>
 </CardContent>
 </Card>
 </div>
 );
}

// ─── Conversations Tab ───────────────────────────────────────────────
function ConversationsTab() {
 const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [page, setPage] = useState(0);
 const limit = 20;

 const { data, isLoading, refetch } = trpc.adminChatbot.getConversations.useQuery({
 limit,
 offset: page * limit,
 status: statusFilter ==="all"? undefined : statusFilter,
 });

 const { data: messages, isLoading: messagesLoading } = trpc.adminChatbot.getMessages.useQuery(
 { conversationId: selectedConvId! },
 { enabled: !!selectedConvId }
 );

 const endConversation = trpc.adminChatbot.endConversation.useMutation({
 onSuccess: () => {
 toast.success("대화가 종료되었습니다");
 refetch();
 },
 });

 return (
 <div className="space-y-4">
 <div className="flex items-center gap-4">
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-40">
 <SelectValue placeholder="상태 필터"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">전체</SelectItem>
 <SelectItem value="active">활성</SelectItem>
 <SelectItem value="ended">종료</SelectItem>
 </SelectContent>
 </Select>
 <Button variant="outline"size="sm"onClick={() => refetch()}>
 <RefreshCw className="w-4 h-4 mr-1"/> 새로고침
 </Button>
 <span className="text-sm text-muted-foreground ml-auto">
 총 {data?.total ?? 0}건
 </span>
 </div>

 <div className="border rounded-lg overflow-hidden">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">ID</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">세션</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">페이지</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">메시지</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">FAQ 매칭</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">상태</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">시작 시간</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">액션</th>
 </tr>
 </thead>
 <tbody>
 {isLoading ? (
 <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">로딩 중...</td></tr>
 ) : (data?.conversations ?? []).length === 0 ? (
 <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">대화 기록이 없습니다</td></tr>
 ) : (
 (data?.conversations ?? []).map((conv) => (
 <tr key={conv.id} className="border-b hover:bg-gray-50">
 <td className="px-3 py-2">{conv.id}</td>
 <td className="px-3 py-2 font-mono text-xs truncate max-w-[120px]">{conv.sessionId}</td>
 <td className="px-3 py-2">{conv.pageContext ||"-"}</td>
 <td className="px-3 py-2 text-center text-xs">{conv.messageCount}</td>
 <td className="px-3 py-2 text-center text-xs">{conv.faqMatchCount}</td>
 <td className="px-3 py-2 text-center text-xs">
 <Badge variant={conv.status ==="active"?"default":"secondary"}>
 {conv.status ==="active"?"활성":"종료"}
 </Badge>
 </td>
 <td className="px-3 py-2 text-xs">{new Date(conv.startedAt).toLocaleString("ko-KR")}</td>
 <td className="px-3 py-2 text-center text-xs">
 <div className="flex items-center justify-center gap-1">
 <Button variant="ghost"size="sm"onClick={() => setSelectedConvId(conv.id)}>
 <Eye className="w-4 h-4"/>
 </Button>
 {conv.status ==="active"&& (
 <Button variant="ghost"size="sm"onClick={() => endConversation.mutate({ conversationId: conv.id })}>
 <ShieldBan className="w-4 h-4 text-red-500"/>
 </Button>
 )}
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {(data?.total ?? 0) > limit && (
 <div className="flex items-center justify-center gap-2">
 <Button variant="outline"size="sm"disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</Button>
 <span className="text-sm text-muted-foreground">
 {page + 1} / {Math.ceil((data?.total ?? 0) / limit)}
 </span>
 <Button variant="outline"size="sm"disabled={(page + 1) * limit >= (data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>다음</Button>
 </div>
 )}

 {/* Message Detail Dialog */}
 <Dialog open={!!selectedConvId} onOpenChange={(open) => !open && setSelectedConvId(null)}>
 <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>대화 기록 #{selectedConvId}</DialogTitle>
 <DialogDescription>대화 내용을 확인합니다</DialogDescription>
 </DialogHeader>
 <div className="space-y-3 mt-4">
 {messagesLoading ? (
 <p className="text-center text-muted-foreground py-4">로딩 중...</p>
 ) : (messages ?? []).length === 0 ? (
 <p className="text-center text-muted-foreground py-4">메시지가 없습니다</p>
 ) : (
 (messages ?? []).map((msg) => (
 <div key={msg.id} className={`flex ${msg.role ==="user"?"justify-end":"justify-start"}`}>
 <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
 msg.role ==="user"?"bg-blue-100 text-blue-900":"bg-gray-100 text-gray-900"
 }`}>
 <div className="flex items-center gap-2 mb-1">
 <Badge variant="outline"className="text-[10px]">
 {msg.role ==="user"?"고객":"AI"}
 </Badge>
 {msg.isFaqMatch === 1 && (
 <Badge variant="secondary"className="text-[10px]">FAQ</Badge>
 )}
 <span className="text-[10px] text-muted-foreground">
 {new Date(msg.createdAt).toLocaleTimeString("ko-KR")}
 </span>
 </div>
 <p className="whitespace-pre-wrap">{msg.content}</p>
 </div>
 </div>
 ))
 )}
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}

// ─── FAQ Tab ─────────────────────────────────────────────────────────
function FaqTab() {
 const [editingFaq, setEditingFaq] = useState<any | null>(null);
 const [isCreateOpen, setIsCreateOpen] = useState(false);
 const [formData, setFormData] = useState({
 questionJa:"",
 questionKo:"",
 answerJa:"",
 answerKo:"",
 category:"other"as string,
 keywords:"",
 sortOrder: 0,
 isActive: 1,
 });

 const { data: faqs, isLoading, refetch } = trpc.adminChatbot.getFaqs.useQuery();
 const utils = trpc.useUtils();

 const createFaq = trpc.adminChatbot.createFaq.useMutation({
 onSuccess: () => {
 toast.success("FAQ가 등록되었습니다");
 setIsCreateOpen(false);
 resetForm();
 utils.adminChatbot.getFaqs.invalidate();
 },
 onError: (err) => toast.error(err.message),
 });

 const updateFaq = trpc.adminChatbot.updateFaq.useMutation({
 onSuccess: () => {
 toast.success("FAQ가 수정되었습니다");
 setEditingFaq(null);
 resetForm();
 utils.adminChatbot.getFaqs.invalidate();
 },
 onError: (err) => toast.error(err.message),
 });

 const deleteFaq = trpc.adminChatbot.deleteFaq.useMutation({
 onSuccess: () => {
 toast.success("FAQ가 삭제되었습니다");
 utils.adminChatbot.getFaqs.invalidate();
 },
 onError: (err) => toast.error(err.message),
 });

 const resetForm = () => {
 setFormData({ questionJa:"", questionKo:"", answerJa:"", answerKo:"", category:"other", keywords:"", sortOrder: 0, isActive: 1 });
 };

 const openEdit = (faq: any) => {
 setEditingFaq(faq);
 setFormData({
 questionJa: faq.questionJa ||"",
 questionKo: faq.questionKo ||"",
 answerJa: faq.answerJa ||"",
 answerKo: faq.answerKo ||"",
 category: faq.category ||"other",
 keywords: faq.keywords ||"",
 sortOrder: faq.sortOrder || 0,
 isActive: faq.isActive ?? 1,
 });
 };

 const handleSubmit = () => {
 if (editingFaq) {
 updateFaq.mutate({ id: Number(editingFaq.id), ...formData } as any);
 } else {
 createFaq.mutate(formData as any);
 }
 };

 const categoryLabels: Record<string, string> = {
 product:"상품",
 order_shipping:"주문/배송",
 payment:"결제",
 member_points:"회원/포인트",
 other:"기타",
 };

 const categoryColors: Record<string, string> = {
 product:"bg-blue-100 text-blue-800",
 order_shipping:"bg-green-100 text-green-800",
 payment:"bg-yellow-100 text-yellow-800",
 member_points:"bg-purple-100 text-purple-800",
 other:"bg-gray-100 text-gray-800",
 };

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <p className="text-sm text-muted-foreground">
 FAQ를 등록하면 LLM 호출 없이 즉시 응답하여 비용을 절감합니다. (총 {faqs?.length ?? 0}건)
 </p>
 <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
 <Plus className="w-4 h-4 mr-1"/> FAQ 추가
 </Button>
 </div>

 <div className="border rounded-lg overflow-hidden">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="text-left px-4 py-3 font-medium w-8">ID</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">질문 (일본어)</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">카테고리</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">매칭 수</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">활성</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">순서</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">액션</th>
 </tr>
 </thead>
 <tbody>
 {isLoading ? (
 <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">로딩 중...</td></tr>
 ) : (faqs ?? []).length === 0 ? (
 <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">등록된 FAQ가 없습니다</td></tr>
 ) : (
 (faqs ?? []).map((faq) => (
 <tr key={faq.id} className="border-b hover:bg-gray-50">
 <td className="px-3 py-2">{faq.id}</td>
 <td className="px-4 py-3 max-w-[300px] truncate">{faq.questionJa || faq.questionKo ||"-"}</td>
 <td className="px-3 py-2">
 <Badge className={categoryColors[faq.category] ||"bg-gray-100"} variant="secondary">
 {categoryLabels[faq.category] || faq.category}
 </Badge>
 </td>
 <td className="px-3 py-2 text-center text-xs">{faq.matchCount}</td>
 <td className="px-3 py-2 text-center text-xs">
 <Badge variant={faq.isActive ?"default":"secondary"}>
 {faq.isActive ?"활성":"비활성"}
 </Badge>
 </td>
 <td className="px-3 py-2 text-center text-xs">{faq.sortOrder}</td>
 <td className="px-3 py-2 text-center text-xs">
 <div className="flex items-center justify-center gap-1">
 <Button variant="ghost"size="sm"onClick={() => openEdit(faq)}>
 <Edit className="w-4 h-4"/>
 </Button>
 <Button variant="ghost"size="sm"onClick={() => {
 if (confirm("정말 삭제하시겠습니까?")) deleteFaq.mutate({ id: faq.id });
 }}>
 <Trash2 className="w-4 h-4 text-red-500"/>
 </Button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Create/Edit Dialog */}
 <Dialog open={isCreateOpen || !!editingFaq} onOpenChange={(open) => {
 if (!open) { setIsCreateOpen(false); setEditingFaq(null); resetForm(); }
 }}>
 <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{editingFaq ?"FAQ 수정":"FAQ 추가"}</DialogTitle>
 <DialogDescription>자주 묻는 질문과 답변을 등록합니다</DialogDescription>
 </DialogHeader>
 <div className="space-y-4 mt-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>카테고리</Label>
 <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="product">상품</SelectItem>
 <SelectItem value="order_shipping">주문/배송</SelectItem>
 <SelectItem value="payment">결제</SelectItem>
 <SelectItem value="member_points">회원/포인트</SelectItem>
 <SelectItem value="other">기타</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <Label>정렬 순서</Label>
 <Input type="number"value={formData.sortOrder} onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))} />
 </div>
 <div className="flex items-end gap-2">
 <Label>활성</Label>
 <Switch checked={formData.isActive === 1} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked ? 1 : 0 }))} />
 </div>
 </div>
 </div>
 <div>
 <Label>질문 (일본어)</Label>
 <Input value={formData.questionJa} onChange={(e) => setFormData(prev => ({ ...prev, questionJa: e.target.value }))} placeholder="일본어 질문 입력"/>
 </div>
 <div>
 <Label>질문 (한국어)</Label>
 <Input value={formData.questionKo} onChange={(e) => setFormData(prev => ({ ...prev, questionKo: e.target.value }))} placeholder="예: 배송비는 얼마인가요?"/>
 </div>
 <div>
 <Label>답변 (일본어)</Label>
 <Textarea value={formData.answerJa} onChange={(e) => setFormData(prev => ({ ...prev, answerJa: e.target.value }))} placeholder="일본어 답변 입력"rows={3} />
 </div>
 <div>
 <Label>답변 (한국어)</Label>
 <Textarea value={formData.answerKo} onChange={(e) => setFormData(prev => ({ ...prev, answerKo: e.target.value }))} placeholder="예: 5,000엔 이상 주문 시 무료배송입니다."rows={3} />
 </div>
 <div>
 <Label>키워드 (쉼표 구분)</Label>
 <Input value={formData.keywords} onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))} placeholder="배송비,배송,shipping,배송비"/>
 <p className="text-xs text-muted-foreground mt-1">사용자 질문에 이 키워드가 포함되면 FAQ로 매칭됩니다</p>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline"onClick={() => { setIsCreateOpen(false); setEditingFaq(null); resetForm(); }}>취소</Button>
 <Button onClick={handleSubmit} disabled={createFaq.isPending || updateFaq.isPending}>
 <Save className="w-4 h-4 mr-1"/> {editingFaq ?"수정":"등록"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}

// ─── Settings Tab ────────────────────────────────────────────────────
function SettingsTab() {
 const { data: settings, isLoading, refetch } = trpc.adminChatbot.getSettings.useQuery();
 const updateSetting = trpc.adminChatbot.updateSetting.useMutation({
 onSuccess: () => {
 toast.success("설정이 저장되었습니다");
 refetch();
 },
 onError: (err) => toast.error(err.message),
 });

 const getSettingValue = (key: string, defaultValue: string ="") => {
 return settings?.find((s) => s.key === key)?.value ?? defaultValue;
 };

 const [chatbotEnabled, setChatbotEnabled] = useState<boolean | null>(null);
 const [systemPrompt, setSystemPrompt] = useState("");
 const [welcomeMessage, setWelcomeMessage] = useState("");
 const [maxTokens, setMaxTokens] = useState("");

 // Initialize from settings
 if (settings && chatbotEnabled === null) {
 setChatbotEnabled(getSettingValue("CHATBOT_ENABLED","true") !=="false");
 setSystemPrompt(getSettingValue("SYSTEM_PROMPT",""));
 setWelcomeMessage(getSettingValue("WELCOME_MESSAGE","안녕하세요! ココくすり 쇼핑을 지원합니다. 편하게 질문해 주세요."));
 setMaxTokens(getSettingValue("MAX_TOKENS","500"));
 }

 const handleSave = (key: string, value: string, description?: string) => {
 updateSetting.mutate({ key, value, description });
 };

 if (isLoading) {
 return <div className="text-center py-8 text-muted-foreground">로딩 중...</div>;
 }

 return (
 <div className="space-y-6 max-w-2xl">
 {/* Chatbot Enable/Disable */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base">챗봇 활성화</CardTitle>
 <CardDescription>챗봇을 활성화하거나 비활성화합니다</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="flex items-center gap-4">
 <Switch
 checked={chatbotEnabled ?? true}
 onCheckedChange={(checked) => {
 setChatbotEnabled(checked);
 handleSave("CHATBOT_ENABLED", checked ?"true":"false","챗봇 활성화 여부");
 }}
 />
 <span className="text-sm">{chatbotEnabled ?"활성화됨":"비활성화됨"}</span>
 </div>
 </CardContent>
 </Card>

 {/* Welcome Message */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base">환영 메시지</CardTitle>
 <CardDescription>챗봇 창을 열었을 때 표시되는 환영 메시지입니다</CardDescription>
 </CardHeader>
 <CardContent className="space-y-3">
 <Textarea
 value={welcomeMessage}
 onChange={(e) => setWelcomeMessage(e.target.value)}
 rows={3}
 placeholder="안녕하세요! ココくすり 쇼핑을 지원합니다."
 />
 <Button size="sm"onClick={() => handleSave("WELCOME_MESSAGE", welcomeMessage,"챗봇 환영 메시지")} disabled={updateSetting.isPending}>
 <Save className="w-4 h-4 mr-1"/> 저장
 </Button>
 </CardContent>
 </Card>

 {/* System Prompt */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base">시스템 프롬프트</CardTitle>
 <CardDescription>AI 챗봇의 성격과 응답 스타일을 정의합니다. 비워두면 기본 프롬프트가 사용됩니다.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-3">
 <Textarea
 value={systemPrompt}
 onChange={(e) => setSystemPrompt(e.target.value)}
 rows={8}
 placeholder="당신은 ココくすり의 AI 고객 지원 어시스턴트입니다..."
 />
 <Button size="sm"onClick={() => handleSave("SYSTEM_PROMPT", systemPrompt,"AI 시스템 프롬프트")} disabled={updateSetting.isPending}>
 <Save className="w-4 h-4 mr-1"/> 저장
 </Button>
 </CardContent>
 </Card>

 {/* Max Tokens */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base">최대 토큰 수</CardTitle>
 <CardDescription>AI 응답의 최대 길이를 설정합니다 (기본값: 500)</CardDescription>
 </CardHeader>
 <CardContent className="space-y-3">
 <Input
 type="number"
 value={maxTokens}
 onChange={(e) => setMaxTokens(e.target.value)}
 placeholder="500"
 className="w-40"
 />
 <Button size="sm"onClick={() => handleSave("MAX_TOKENS", maxTokens,"AI 응답 최대 토큰 수")} disabled={updateSetting.isPending}>
 <Save className="w-4 h-4 mr-1"/> 저장
 </Button>
 </CardContent>
 </Card>
 </div>
 );
}

// ─── Blocked Keywords Tab ────────────────────────────────────────────
function BlockedKeywordsTab() {
 const [newKeyword, setNewKeyword] = useState("");
 const [newReason, setNewReason] = useState("");

 const { data: keywords, isLoading, refetch } = trpc.adminChatbot.getBlockedKeywords.useQuery();
 const utils = trpc.useUtils();

 const addKeyword = trpc.adminChatbot.addBlockedKeyword.useMutation({
 onSuccess: () => {
 toast.success("차단 키워드가 등록되었습니다");
 setNewKeyword("");
 setNewReason("");
 utils.adminChatbot.getBlockedKeywords.invalidate();
 },
 onError: (err) => toast.error(err.message),
 });

 const removeKeyword = trpc.adminChatbot.removeBlockedKeyword.useMutation({
 onSuccess: () => {
 toast.success("차단 키워드가 삭제되었습니다");
 utils.adminChatbot.getBlockedKeywords.invalidate();
 },
 onError: (err) => toast.error(err.message),
 });

 return (
 <div className="space-y-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-base">차단 키워드 추가</CardTitle>
 <CardDescription>사용자 메시지에 이 키워드가 포함되면 자동으로 차단됩니다</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="flex gap-3 items-end">
 <div className="flex-1">
 <Label>키워드</Label>
 <Input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="차단할 키워드 입력"/>
 </div>
 <div className="flex-1">
 <Label>사유 (선택)</Label>
 <Input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="차단 사유"/>
 </div>
 <Button onClick={() => addKeyword.mutate({ keyword: newKeyword, reason: newReason || undefined })} disabled={!newKeyword.trim() || addKeyword.isPending}>
 <Plus className="w-4 h-4 mr-1"/> 추가
 </Button>
 </div>
 </CardContent>
 </Card>

 <div className="border rounded-lg overflow-hidden">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">ID</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">키워드</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">사유</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">등록일</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">액션</th>
 </tr>
 </thead>
 <tbody>
 {isLoading ? (
 <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">로딩 중...</td></tr>
 ) : (keywords ?? []).length === 0 ? (
 <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">등록된 차단 키워드가 없습니다</td></tr>
 ) : (
 (keywords ?? []).map((kw) => (
 <tr key={kw.id} className="border-b hover:bg-gray-50">
 <td className="px-3 py-2">{kw.id}</td>
 <td className="px-4 py-3 font-medium">{kw.keyword}</td>
 <td className="px-4 py-3 text-muted-foreground">{kw.reason ||"-"}</td>
 <td className="px-3 py-2 text-xs">{new Date(kw.createdAt).toLocaleDateString("ko-KR")}</td>
 <td className="px-3 py-2 text-center text-xs">
 <Button variant="ghost"size="sm"onClick={() => {
 if (confirm("정말 삭제하시겠습니까?")) removeKeyword.mutate({ id: kw.id });
 }}>
 <Trash2 className="w-4 h-4 text-red-500"/>
 </Button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function AdminChatbot() {
 return (
 <AdminLayout>
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
 <Bot className="w-4 h-4 text-pink-600"/>
 </div>
 <div>
 <h2 className="text-xl font-bold">챗봇 관리</h2>
 <p className="text-xs text-muted-foreground">AI 챗봇 설정, FAQ 관리, 대화 기록 확인</p>
 </div>
 </div>
 </div>

 <Tabs defaultValue="dashboard"className="space-y-4">
 <TabsList className="grid grid-cols-5 w-full max-w-xl">
 <TabsTrigger value="dashboard"className="flex items-center gap-1.5">
 <BarChart3 className="w-3.5 h-3.5"/> 대시보드
 </TabsTrigger>
 <TabsTrigger value="conversations"className="flex items-center gap-1.5">
 <MessageSquare className="w-3.5 h-3.5"/> 대화기록
 </TabsTrigger>
 <TabsTrigger value="faq"className="flex items-center gap-1.5">
 <HelpCircle className="w-3.5 h-3.5"/> FAQ
 </TabsTrigger>
 <TabsTrigger value="settings"className="flex items-center gap-1.5">
 <Settings className="w-3.5 h-3.5"/> 설정
 </TabsTrigger>
 <TabsTrigger value="blocked"className="flex items-center gap-1.5">
 <ShieldBan className="w-3.5 h-3.5"/> 차단
 </TabsTrigger>
 </TabsList>

 <TabsContent value="dashboard"><DashboardTab /></TabsContent>
 <TabsContent value="conversations"><ConversationsTab /></TabsContent>
 <TabsContent value="faq"><FaqTab /></TabsContent>
 <TabsContent value="settings"><SettingsTab /></TabsContent>
 <TabsContent value="blocked"><BlockedKeywordsTab /></TabsContent>
 </Tabs>
 </div>
 </AdminLayout>
 );
}
