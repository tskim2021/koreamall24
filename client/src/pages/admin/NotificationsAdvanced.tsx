import { useState, useMemo } from"react";
import { trpc } from"@/lib/trpc";
import { toast } from"sonner";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Badge } from"@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Switch } from"@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from"@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Bell, Settings, FileText, Clock, BarChart2, Plus, Pencil, Trash2, Send, X, Eye, Download } from"lucide-react";
import {
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
 PieChart, Pie, Cell,
} from"recharts";

const DEFAULT_EVENTS = [
 { eventType:"order_created", label:"주문 생성 완료", defaultTitle:"ご注文を承りました", defaultMessage:"ご注文ありがとうございます。注文番号：{{orderNumber}}"},
 { eventType:"order_cancelled", label:"주문 취소 완료", defaultTitle:"ご注文がキャンセルされました", defaultMessage:"注文番号：{{orderNumber}} がキャンセルされました。"},
 { eventType:"order_refunded", label:"환불 처리 완료", defaultTitle:"返金処理が完了しました", defaultMessage:"注文番号：{{orderNumber}} の返金処理が完了しました。"},
 { eventType:"order_delivered", label:"배송 완료", defaultTitle:"商品が届きました！", defaultMessage:"ご注文の商品が届きました。レビューをお書きください。"},
 { eventType:"review_approved", label:"리뷰 승인", defaultTitle:"レビューが承認されました", defaultMessage:"投稿されたレビューが承認されました。"},
 { eventType:"review_rejected", label:"리뷰 반려", defaultTitle:"レビューが却下されました", defaultMessage:"投稿されたレビューが却下されました。"},
 { eventType:"review_points", label:"리뷰 포인트 적립", defaultTitle:"レビューポイントが付与されました", defaultMessage:"レビュー投稿で{{points}}ポイントが付与されました。"},
 { eventType:"tier_upgrade", label:"등급 업그레이드", defaultTitle:"会員ランクがアップしました！", defaultMessage:"ランクが「{{newTier}}」にアップグレードされました。"},
 { eventType:"tier_downgrade", label:"등급 다운그레이드", defaultTitle:"会員ランクが変更されました", defaultMessage:"ランクが「{{newTier}}」に変更されました。"},
 { eventType:"coupon_issued", label:"쿠폰 발급", defaultTitle:"クーポンが発行されました！", defaultMessage:"クーポン（コード：{{code}}）が発行されました。"},
 { eventType:"point_adjusted", label:"포인트 조정", defaultTitle:"ポイントが付与されました", defaultMessage:"{{points}}ポイントが付与されました。"},
 { eventType:"password_changed", label:"비밀번호 변경", defaultTitle:"パスワードが変更されました", defaultMessage:"パスワードが変更されました。"},
 { eventType:"welcome", label:"회원가입 환영", defaultTitle:"ご登録ありがとうございます！", defaultMessage:"Kusuri Mallへようこそ！"},
 { eventType:"inquiry_replied", label:"문의 답변", defaultTitle:"お問い合わせに回答が届きました", defaultMessage:"「{{title}}」への回答が届きました。"},
 { eventType:"qa_replied", label:"Q&A 답변", defaultTitle:"商品Q&Aに回答が届きました", defaultMessage:"「{{question}}」への回答が届きました。"},
];

const SAMPLE_VARS: Record<string, string> = {
 orderNumber:"ORD-2026-001", status:"発送済み", trackingNumber:"EMS123456789JP",
 points:"500", tierName:"ゴールド", previousTier:"シルバー", discountRate:"10", pointRate:"3",
 code:"WELCOME10", discount:"10%", discountText:"10%OFF", title:"商品について質問があります",
 question:"この商品は妊婦でも使えますか？", reason:"内容が不適切です", name:"田中様", newTier:"ゴールド",
};

const TYPE_LABELS: Record<string, string> = {
 order:"주문", admin:"공지", tier:"등급", coupon:"쿠폰",
 point:"포인트", review:"리뷰", inquiry:"문의", system:"시스템",
};
const TYPE_COLORS: Record<string, string> = {
 order:"bg-blue-100 text-blue-700", admin:"bg-purple-100 text-purple-700",
 tier:"bg-yellow-100 text-yellow-700", coupon:"bg-green-100 text-green-700",
 point:"bg-orange-100 text-orange-700", review:"bg-pink-100 text-pink-700",
 inquiry:"bg-cyan-100 text-cyan-700", system:"bg-gray-100 text-gray-700",
};

function applyVars(str: string, vars: Record<string, string>): string {
 return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

const PIE_COLORS = ["#3b82f6","#8b5cf6","#f59e0b","#10b981","#f97316","#ec4899","#06b6d4","#6b7280"];

function StatsTab() {
 const { data: stats } = trpc.notification.getStats.useQuery();
 const { data: byDay = [] } = trpc.notification.getStatsByDay.useQuery();

 if (!stats) return <div className="text-center py-12 text-gray-400">통계 데이터 없음</div>;

 // 유형별 파이 차트 데이터
 const pieData = stats.byType.map((r, i) => ({
 name: TYPE_LABELS[r.type] ?? r.type,
 value: r.count,
 color: PIE_COLORS[i % PIE_COLORS.length],
 }));

 // 일별 바 차트 — 최근 14일 날짜 배열 생성 (데이터 없는 날도 0으로)
 const today = new Date();
 const last14Days = Array.from({ length: 14 }, (_, i) => {
 const d = new Date(today);
 d.setDate(d.getDate() - (13 - i));
 return d.toISOString().slice(0, 10);
 });
 const allTypes = Array.from(new Set(stats.byType.map(r => r.type)));
 const barData = last14Days.map(day => {
 const found = byDay.find((r: Record<string, unknown>) => r.day === day) as Record<string, unknown> | undefined;
 const entry: Record<string, unknown> = { day: day.slice(5) }; // MM-DD
 for (const t of allTypes) entry[t] = found ? (Number(found[t]) || 0) : 0;
 return entry;
 });

 return (
 <div className="space-y-5">
 {/* 요약 카드 */}
 <div className="grid grid-cols-3 gap-4">
 <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-gray-500 mt-1">전체 알림</div></CardContent></Card>
 <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-amber-600">{stats.unread}</div><div className="text-xs text-gray-500 mt-1">미읽음</div></CardContent></Card>
 <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-600">{stats.recent7d}</div><div className="text-xs text-gray-500 mt-1">최근 7일</div></CardContent></Card>
 </div>

 {/* 일별 발송 추이 바 차트 */}
 <Card>
 <CardHeader><CardTitle className="text-sm">최근 14일 발송 추이</CardTitle></CardHeader>
 <CardContent>
 {byDay.length === 0 ? (
 <div className="text-center py-8 text-gray-400 text-sm">아직 발송 데이터가 없습니다</div>
 ) : (
 <ResponsiveContainer width="100%"height={220}>
 <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3"stroke="#f0f0f0"/>
 <XAxis dataKey="day"tick={{ fontSize: 11 }} />
 <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
 <Tooltip />
 <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => TYPE_LABELS[v] ?? v} />
 {allTypes.map((t, i) => (
 <Bar key={t} dataKey={t} stackId="a"fill={PIE_COLORS[i % PIE_COLORS.length]} name={t} />
 ))}
 </BarChart>
 </ResponsiveContainer>
 )}
 </CardContent>
 </Card>

 {/* 유형별 도넛 차트 + 목록 */}
 {pieData.length > 0 && (
 <Card>
 <CardHeader><CardTitle className="text-sm">유형별 발송 비율</CardTitle></CardHeader>
 <CardContent className="flex flex-col md:flex-row items-center gap-6">
 <div style={{ width: 180, height: 180, flexShrink: 0 }}>
 <PieChart width={180} height={180}>
 <Pie data={pieData} cx="50%"cy="50%"innerRadius={50} outerRadius={80}
 dataKey="value"paddingAngle={2}>
 {pieData.map((entry, i) => (
 <Cell key={i} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip formatter={(v: number) => `${v}건`} />
 </PieChart>
 </div>
 <div className="flex-1 space-y-2 w-full">
 {pieData.map((r, i) => (
 <div key={i} className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-full"style={{ background: r.color }} />
 <span className="text-sm">{r.name}</span>
 </div>
 <span className="text-sm font-semibold">{r.value}건</span>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 );
}

function SettingsTab() {
 const { data: settings = [], refetch } = trpc.notification.getSettings.useQuery();
 const upsert = trpc.notification.upsertSetting.useMutation({ onSuccess: () => { refetch(); toast.success("설정이 저장되었습니다."); } });
 const getEnabled = (eventType: string) => {
 const s = settings.find(s => s.eventType === eventType);
 return s ? s.isEnabled : true;
 };
 const toggle = (event: typeof DEFAULT_EVENTS[0], enabled: boolean) => {
 upsert.mutate({ eventType: event.eventType, label: event.label, isEnabled: enabled, defaultTitle: event.defaultTitle, defaultMessage: event.defaultMessage });
 };
 return (
 <div className="space-y-2">
 <p className="text-sm text-gray-500 mb-4">각 이벤트별로 인앱 알림 발송 여부를 ON/OFF 할 수 있습니다.</p>
 {DEFAULT_EVENTS.map(event => (
 <div key={event.eventType} className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50">
 <div>
 <div className="font-medium text-sm">{event.label}</div>
 <div className="text-xs text-gray-400 mt-0.5">{event.defaultTitle}</div>
 </div>
 <Switch checked={getEnabled(event.eventType)} onCheckedChange={v => toggle(event, v)} disabled={upsert.isPending} />
 </div>
 ))}
 </div>
 );
}

const NAME_KEY_GUIDE = [
 ["order_created","주문 생성 완료","{{orderNumber}}"],
 ["order_cancelled","주문 취소","-"],
 ["order_delivered","배송 완료","-"],
 ["order_status_update","주문 상태 변경","{{orderNumber}}, {{status}}"],
 ["order_refunded","환불 처리 완료","-"],
 ["review_point","리뷰 포인트 적립","{{points}}"],
 ["review_approved","리뷰 승인","-"],
 ["review_rejected","리뷰 반려","-"],
 ["inquiry_replied","문의 답변","{{title}}"],
 ["qa_replied","상품 Q&A 답변","{{title}}"],
 ["tier_upgraded","등급 업그레이드","{{tierName}}, {{previousTier}}, {{discountRate}}, {{pointRate}}"],
 ["tier_downgraded","등급 다운그레이드","{{tierName}}"],
 ["coupon_issued","쿠폰 발급","{{code}}, {{discount}}"],
 ["point_adjusted","포인트 지급/조정","{{points}}, {{reason}}"],
 ["welcome","회원가입 환영","-"],
 ["password_changed","비밀번호 변경","-"],
];

function TemplatesTab() {
 const { data: templates = [], refetch } = trpc.notification.listTemplates.useQuery();
 const createMut = trpc.notification.createTemplate.useMutation({ onSuccess: () => { refetch(); toast.success("템플릿이 생성되었습니다."); setShowCreate(false); } });
 const updateMut = trpc.notification.updateTemplate.useMutation({ onSuccess: () => { refetch(); toast.success("템플릿이 수정되었습니다."); setEditTarget(null); } });
 const deleteMut = trpc.notification.deleteTemplate.useMutation({ onSuccess: () => { refetch(); toast.success("삭제되었습니다."); } });
 const seedMut = trpc.notification.seedDefaultTemplates.useMutation({
 onSuccess: (result) => { refetch(); toast.success(`기본 템플릿 ${result.created}개 등록, ${result.skipped}개 건너뜀`); },
 onError: () => toast.error("일괄 등록에 실패했습니다."),
 });

 const [showCreate, setShowCreate] = useState(false);
 const [editTarget, setEditTarget] = useState<typeof templates[0] | null>(null);
 const [showPreview, setShowPreview] = useState(false);
 type NotifType ="order"|"admin"|"tier"|"coupon"|"point"|"review"|"inquiry"|"system";
 const [form, setForm] = useState<{ name: string; type: NotifType; title: string; message: string; link: string; isDefault: boolean }>({ name:"", type:"admin", title:"", message:"", link:"", isDefault: false });

 const openCreate = () => { setForm({ name:"", type:"admin", title:"", message:"", link:"", isDefault: false }); setShowCreate(true); setShowPreview(false); };
 const openEdit = (t: typeof templates[0]) => { setForm({ name: t.name, type: t.type as NotifType, title: t.title, message: t.message, link: t.link ??"", isDefault: t.isDefault }); setEditTarget(t); setShowPreview(false); };

 const previewTitle = useMemo(() => applyVars(form.title, SAMPLE_VARS), [form.title]);
 const previewMessage = useMemo(() => applyVars(form.message, SAMPLE_VARS), [form.message]);
 const usedVars = useMemo(() => {
 const matches = Array.from((form.title +""+ form.message).matchAll(/\{\{(\w+)\}\}/g));
 return Array.from(new Set(matches.map(m => m[1])));
 }, [form.title, form.message]);

 return (
 <div className="space-y-4">
 <div className="flex justify-between items-start gap-2">
 <div className="text-sm text-gray-500 space-y-1">
 <p>재사용 가능한 알림 메시지 템플릿을 관리합니다.</p>
 <p className="text-xs text-amber-600 font-medium">⚡ 표준 name 키로 등록하면 이벤트 발생 시 자동 적용됩니다.</p>
 </div>
 <div className="flex gap-2 flex-shrink-0">
 <Button size="sm"variant="outline"onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
 <Download className="w-4 h-4 mr-1"/>{seedMut.isPending ?"등록 중...":"기본 16종 일괄 등록"}
 </Button>
 <Button size="sm"onClick={openCreate}><Plus className="w-4 h-4 mr-1"/>추가</Button>
 </div>
 </div>
 {templates.length === 0 && (
 <div className="text-center py-12 text-gray-400">
 <p>등록된 템플릿이 없습니다.</p>
 <p className="text-xs mt-2">「기본 16종 일괄 등록」으로 표준 템플릿을 한 번에 등록하세요.</p>
 </div>
 )}
 <div className="space-y-2">
 {templates.map(t => (
 <div key={t.id} className="flex items-start justify-between p-3 border rounded-lg bg-white">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[t.type] ??""}`}>{TYPE_LABELS[t.type]}</span>
 <span className="font-medium text-sm font-mono text-blue-700">{t.name}</span>
 {t.isDefault && <Badge variant="secondary"className="text-xs">기본</Badge>}
 </div>
 <div className="text-sm text-gray-700 mt-1 font-medium">{t.title}</div>
 <div className="text-xs text-gray-400 mt-0.5 truncate">{t.message}</div>
 </div>
 <div className="flex gap-1 ml-2">
 <Button size="icon"variant="ghost"className="h-7 w-7"onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5"/></Button>
 <Button size="icon"variant="ghost"className="h-7 w-7 text-red-500"onClick={() => deleteMut.mutate({ id: t.id })}><Trash2 className="w-3.5 h-3.5"/></Button>
 </div>
 </div>
 ))}
 </div>

 <Dialog open={showCreate || !!editTarget} onOpenChange={v => { if (!v) { setShowCreate(false); setEditTarget(null); } }}>
 <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
 <DialogHeader><DialogTitle>{editTarget ?"템플릿 수정":"템플릿 추가"}</DialogTitle></DialogHeader>
 <div className="space-y-3">
 <div>
 <Input placeholder="템플릿 이름 (예: order_created)"value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
 <details className="mt-1">
 <summary className="text-xs text-amber-600 cursor-pointer hover:underline">📋 자동 적용 표준 name 키 목록 보기</summary>
 <div className="mt-1 border rounded overflow-auto max-h-48">
 <table className="text-xs w-full">
 <thead><tr className="bg-amber-50"><th className="px-2 py-1 text-left">name 키</th><th className="px-2 py-1 text-left">이벤트</th><th className="px-2 py-1 text-left">변수</th></tr></thead>
 <tbody>
 {NAME_KEY_GUIDE.map(([key, label, vars], i) => (
 <tr key={key} className={i % 2 === 0 ?"bg-white":"bg-gray-50"}>
 <td className="px-2 py-1 font-mono text-blue-700 cursor-pointer hover:bg-blue-50"onClick={() => setForm(f => ({ ...f, name: key }))}>{key}</td>
 <td className="px-2 py-1">{label}</td>
 <td className="px-2 py-1 text-gray-400">{vars}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <p className="text-xs text-gray-400 mt-1">💡 name 키를 클릭하면 자동 입력됩니다.</p>
 </details>
 </div>
 <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as NotifType }))}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>{Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
 </Select>
 <Input placeholder="제목 (변수: {{orderNumber}}, {{points}} 등)"value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
 <Textarea placeholder="메시지 내용"rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
 <Input placeholder="링크 (선택, 예: /mypage/orders)"value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />

 {(form.title || form.message) && (
 <div>
 <Button type="button"size="sm"variant="outline"className="w-full text-xs"onClick={() => setShowPreview(p => !p)}>
 <Eye className="w-3.5 h-3.5 mr-1"/>{showPreview ?"미리보기 닫기":"변수 치환 미리보기"}
 </Button>
 {showPreview && (
 <div className="mt-2 border rounded-lg p-3 bg-amber-50 space-y-2">
 <div className="text-xs font-medium text-amber-700 mb-1">📱 실제 알림 미리보기 (샘플 데이터 적용)</div>
 <div className="bg-white rounded-lg p-3 border">
 <div className="flex items-start gap-2">
 <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
 <Bell className="w-4 h-4 text-amber-600"/>
 </div>
 <div className="flex-1 min-w-0">
 <div className="font-medium text-sm text-gray-900">{previewTitle ||"(제목 없음)"}</div>
 <div className="text-xs text-gray-500 mt-0.5">{previewMessage ||"(메시지 없음)"}</div>
 <div className="text-xs text-gray-300 mt-1">방금 전</div>
 </div>
 </div>
 </div>
 {usedVars.length > 0 && (
 <div className="text-xs text-gray-500">
 <span className="font-medium">사용된 변수:</span>{""}
 {usedVars.map(v => (
 <span key={v} className="inline-block bg-blue-100 text-blue-700 rounded px-1 mr-1 font-mono">{`{{${v}}}`}</span>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 <DialogFooter>
 <Button variant="outline"onClick={() => { setShowCreate(false); setEditTarget(null); }}>취소</Button>
 <Button onClick={() => { if (editTarget) updateMut.mutate({ id: editTarget.id, ...form }); else createMut.mutate(form); }} disabled={createMut.isPending || updateMut.isPending}>
 {editTarget ?"수정":"추가"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
 pending: { label:"대기", color:"bg-yellow-100 text-yellow-700"},
 sent: { label:"발송완료", color:"bg-green-100 text-green-700"},
 cancelled: { label:"취소", color:"bg-gray-100 text-gray-500"},
 failed: { label:"실패", color:"bg-red-100 text-red-700"},
};

function SchedulesTab() {
 const { data: schedulesData, refetch } = trpc.notification.listSchedules.useQuery({ page: 1, limit: 50 });
 const schedules = schedulesData?.schedules ?? [];
 const createMut = trpc.notification.createSchedule.useMutation({ onSuccess: () => { refetch(); toast.success("예약 발송이 등록되었습니다."); setShowCreate(false); } });
 const cancelMut = trpc.notification.cancelSchedule.useMutation({ onSuccess: () => { refetch(); toast.success("예약이 취소되었습니다."); } });
 const [showCreate, setShowCreate] = useState(false);
 type NotifType ="order"|"admin"|"tier"|"coupon"|"point"|"review"|"inquiry"|"system";
 type TargetType ="all"|"segment"|"individual";
 const [form, setForm] = useState<{ title: string; message: string; link: string; type: NotifType; targetType: TargetType; scheduledAt: string }>({ title:"", message:"", link:"", type:"admin", targetType:"all", scheduledAt:""});
 return (
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <p className="text-sm text-gray-500">예약 시각에 자동으로 알림을 발송합니다.</p>
 <Button size="sm"onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1"/>예약 추가</Button>
 </div>
 {schedules.length === 0 && <div className="text-center py-12 text-gray-400">등록된 예약 발송이 없습니다.</div>}
 <div className="space-y-2">
 {schedules.map(s => (
 <div key={s.id} className="flex items-start justify-between p-3 border rounded-lg bg-white">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[s.status]?.color ??""}`}>{STATUS_LABELS[s.status]?.label}</span>
 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[s.type] ??""}`}>{TYPE_LABELS[s.type]}</span>
 <span className="font-medium text-sm">{s.title}</span>
 </div>
 <div className="text-xs text-gray-400 mt-1">
 예약 시각: {new Date(s.scheduledAt).toLocaleString("ko-KR")} · 대상: {s.targetType ==="all"?"전체": s.targetType ==="segment"?"세그먼트":"개별"}
 {s.sentCount > 0 && ` · ${s.sentCount}명 발송`}
 </div>
 </div>
 {s.status ==="pending"&& (
 <Button size="sm"variant="ghost"className="text-red-500 ml-2"onClick={() => cancelMut.mutate({ id: s.id })}>
 <X className="w-3.5 h-3.5 mr-1"/>취소
 </Button>
 )}
 </div>
 ))}
 </div>
 <Dialog open={showCreate} onOpenChange={setShowCreate}>
 <DialogContent>
 <DialogHeader><DialogTitle>예약 발송 추가</DialogTitle></DialogHeader>
 <div className="space-y-3">
 <Input placeholder="제목"value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
 <Textarea placeholder="메시지 내용"rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
 <Input placeholder="링크 (선택)"value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
 <div className="grid grid-cols-2 gap-2">
 <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as NotifType }))}>
 <SelectTrigger><SelectValue placeholder="유형"/></SelectTrigger>
 <SelectContent>{Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
 </Select>
 <Select value={form.targetType} onValueChange={v => setForm(f => ({ ...f, targetType: v as TargetType }))}>
 <SelectTrigger><SelectValue placeholder="발송 대상"/></SelectTrigger>
 <SelectContent>
 <SelectItem value="all">전체 사용자</SelectItem>
 <SelectItem value="segment">세그먼트</SelectItem>
 <SelectItem value="individual">개별 지정</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <Input type="datetime-local"value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
 </div>
 <DialogFooter>
 <Button variant="outline"onClick={() => setShowCreate(false)}>취소</Button>
 <Button onClick={() => {
 if (!form.title || !form.message || !form.scheduledAt) { toast.error("필수 항목을 입력해주세요."); return; }
 createMut.mutate({ ...form, scheduledAt: new Date(form.scheduledAt) });
 }} disabled={createMut.isPending}>
 <Send className="w-4 h-4 mr-1"/>예약 등록
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}

export default function NotificationsAdvanced() {
 return (
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
 <Bell className="w-5 h-5 text-amber-600"/>
 </div>
 <div>
 <h1 className="text-xl font-bold">알림 고도화 설정</h1>
 <p className="text-sm text-gray-500">이벤트 설정 · 메시지 템플릿 · 예약 발송 · 통계</p>
 </div>
 </div>
 <Tabs defaultValue="stats">
 <TabsList className="grid grid-cols-4 w-full">
 <TabsTrigger value="stats"className="flex items-center gap-1.5"><BarChart2 className="w-4 h-4"/>통계</TabsTrigger>
 <TabsTrigger value="settings"className="flex items-center gap-1.5"><Settings className="w-4 h-4"/>이벤트 설정</TabsTrigger>
 <TabsTrigger value="templates"className="flex items-center gap-1.5"><FileText className="w-4 h-4"/>템플릿</TabsTrigger>
 <TabsTrigger value="schedules"className="flex items-center gap-1.5"><Clock className="w-4 h-4"/>예약 발송</TabsTrigger>
 </TabsList>
 <TabsContent value="stats"className="mt-4"><StatsTab /></TabsContent>
 <TabsContent value="settings"className="mt-4"><SettingsTab /></TabsContent>
 <TabsContent value="templates"className="mt-4"><TemplatesTab /></TabsContent>
 <TabsContent value="schedules"className="mt-4"><SchedulesTab /></TabsContent>
 </Tabs>
 </div>
 );
}
