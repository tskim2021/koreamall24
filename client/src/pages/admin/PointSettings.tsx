import { useState, useEffect } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Badge } from"@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { toast } from"sonner";
import {
 Coins,
 Star,
 ShoppingBag,
 Clock,
 Bell,
 Send,
 Save,
 RefreshCw,
 History,
 ChevronRight,
 ChevronLeft,
 Eye,
} from"lucide-react";

const POINT_SETTINGS_CONFIG = [
 {
 group:"리뷰 포인트",
 icon: <Star className="w-5 h-5 text-amber-500"/>,
 items: [
 {
 key:"REVIEW_POINTS",
 label:"리뷰 기본 포인트",
 description:"리뷰를 작성했을 때 지급되는 포인트",
 unit:"pt",
 min: 0,
 max: 10000,
 },
 {
 key:"REVIEW_IMAGE_POINTS",
 label:"이미지 첨부 보너스",
 description:"리뷰에 이미지를 첨부했을 때 추가로 지급되는 포인트",
 unit:"pt",
 min: 0,
 max: 5000,
 },
 {
 key:"REVIEW_DETAIL_POINTS",
 label:"상세 리뷰 보너스",
 description:"100자 이상의 상세 리뷰를 작성했을 때 추가로 지급되는 포인트",
 unit:"pt",
 min: 0,
 max: 5000,
 },
 ],
 },
 {
 group:"회원가입 포인트",
 icon: <ShoppingBag className="w-5 h-5 text-blue-500"/>,
 items: [
 {
 key:"SIGNUP_POINTS",
 label:"신규 회원가입 포인트",
 description:"신규 회원가입 시 지급되는 포인트",
 unit:"pt",
 min: 0,
 max: 10000,
 },
 ],
 },
 {
 group:"포인트 유효기간",
 icon: <Clock className="w-5 h-5 text-purple-500"/>,
 items: [
 {
 key:"POINT_EXPIRY_MONTHS",
 label:"포인트 유효기간",
 description:"포인트 지급 후 만료까지의 기간(개월). 0 = 무기한",
 unit:"개월",
 min: 0,
 max: 60,
 },
 {
 key:"POINT_EXPIRY_ALERT_DAYS",
 label:"만료 알림 발송 시점",
 description:"만료 며칠 전에 알림 이메일을 발송할지 설정",
 unit:"일 전",
 min: 1,
 max: 90,
 },
 ],
 },
];

const SETTING_KEY_LABELS: Record<string, string> = {
 REVIEW_POINTS:"리뷰 기본 포인트",
 REVIEW_IMAGE_POINTS:"이미지 첨부 보너스",
 REVIEW_DETAIL_POINTS:"상세 리뷰 보너스",
 SIGNUP_POINTS:"신규 회원가입 포인트",
 POINT_EXPIRY_MONTHS:"포인트 유효기간",
 POINT_EXPIRY_ALERT_DAYS:"만료 알림 발송 시점",
};

function AuditLogTab() {
 const [offset, setOffset] = useState(0);
 const limit = 20;

 const { data: logs, isLoading, refetch } = trpc.pointSettings.getAuditLogs.useQuery({
 limit,
 offset,
 });

 const formatDate = (d: Date | string) =>
 new Date(d).toLocaleString("ko-KR", {
 year:"numeric",
 month:"2-digit",
 day:"2-digit",
 hour:"2-digit",
 minute:"2-digit",
 });

 if (isLoading) {
 return (
 <div className="flex items-center justify-center h-32">
 <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground"/>
 </div>
 );
 }

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <p className="text-sm text-muted-foreground">
 설정 변경 이력을 확인할 수 있습니다. 변경자·변경 전후 값이 기록됩니다.
 </p>
 <Button variant="ghost"size="sm"onClick={() => refetch()}>
 <RefreshCw className="w-4 h-4 mr-1"/>
 새로고침
 </Button>
 </div>

 {!logs || logs.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground">
 <History className="w-8 h-8 mb-2 opacity-40"/>
 <p className="text-sm">변경 이력이 없습니다</p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-2">
 {logs.map((log) => (
 <Card key={log.id} className="overflow-hidden">
 <CardContent className="p-4">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <span className="font-medium text-sm">
 {SETTING_KEY_LABELS[log.settingKey] ?? log.settingKey}
 </span>
 <Badge variant="outline"className="text-xs font-mono">
 {log.settingKey}
 </Badge>
 </div>
 <div className="flex items-center gap-2 text-sm">
 <span className="text-muted-foreground line-through">
 {log.previousValue ??"（미설정）"}
 </span>
 <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0"/>
 <span className="font-semibold text-foreground">
 {log.newValue ??"（삭제）"}
 </span>
 </div>
 {log.changeNote && (
 <p className="text-xs text-muted-foreground mt-1 italic">
 메모: {log.changeNote}
 </p>
 )}
 </div>
 <div className="text-right shrink-0">
 <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
 {log.changedByName && (
 <p className="text-xs font-medium mt-0.5">{log.changedByName}</p>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 )}

 {/* 페이지네이션 */}
 <div className="flex items-center justify-between pt-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setOffset(Math.max(0, offset - limit))}
 disabled={offset === 0}
 >
 <ChevronLeft className="w-4 h-4 mr-1"/>
 이전 페이지
 </Button>
 <span className="text-sm text-muted-foreground">
 {offset + 1} ~ {offset + (logs?.length ?? 0)} 건
 </span>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setOffset(offset + limit)}
 disabled={!logs || logs.length < limit}
 >
 다음 페이지
 <ChevronRight className="w-4 h-4 ml-1"/>
 </Button>
 </div>
 </div>
 );
}

export default function AdminPointSettings() {
 const { data: settings, isLoading, refetch } = trpc.pointSettings.getAll.useQuery();
 const updateManyMutation = trpc.pointSettings.updateMany.useMutation({
 onSuccess: () => {
 toast.success("포인트 설정을 저장했습니다");
 refetch();
 },
 onError: (err) => toast.error(`저장 실패: ${err.message}`),
 });
 const sendAlertsMutation = trpc.pointExpiry.sendExpiryAlerts.useMutation({
 onSuccess: (data) => {
 toast.success(
 `만료 알림 이메일 발송 완료: ${data.sent}건 발송, ${data.skipped}건 건너뜀 (총 ${data.total}건)`
 );
 },
 onError: (err) => toast.error(`발송 실패: ${err.message}`),
 });

 const [values, setValues] = useState<Record<string, string>>({});

 useEffect(() => {
 if (settings) setValues(settings);
 }, [settings]);

 const handleSave = () => {
 const updates = Object.entries(values).map(([key, value]) => ({ key, value }));
 updateManyMutation.mutate(updates);
 };

 const handleReset = () => {
 if (settings) setValues(settings);
 };

 const isDirty =
 settings &&
 Object.entries(values).some(([key, val]) => settings[key] !== val);

 if (isLoading) {
 return (
 <AdminLayout>
 <div className="flex items-center justify-center h-64">
 <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground"/>
 </div>
 </AdminLayout>
 );
 }

 return (
 <AdminLayout>
 <div className="space-y-6">
 {/* 헤더 */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <Coins className="w-6 h-6 text-amber-500"/>
 포인트 설정
 </h1>
 <p className="text-muted-foreground mt-1">
 포인트 지급량·유효기간·알림 발송 시점을 관리합니다
 </p>
 </div>
 </div>

 <Tabs defaultValue="settings">
 <TabsList>
 <TabsTrigger value="settings"className="gap-1.5">
 <Coins className="w-4 h-4"/>
 설정
 </TabsTrigger>
 <TabsTrigger value="history"className="gap-1.5">
 <History className="w-4 h-4"/>
 변경 이력
 </TabsTrigger>
 </TabsList>

 {/* 설정 탭 */}
 <TabsContent value="settings"className="space-y-6 mt-4">
 {/* 저장 / 초기화 버튼 */}
 <div className="flex justify-end gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={handleReset}
 disabled={!isDirty}
 >
 <RefreshCw className="w-4 h-4 mr-1"/>
 초기화
 </Button>
 <Button
 size="sm"
 onClick={handleSave}
 disabled={!isDirty || updateManyMutation.isPending}
 >
 <Save className="w-4 h-4 mr-1"/>
 {updateManyMutation.isPending ?"저장 중...":"변경사항 저장"}
 </Button>
 </div>

 {/* 설정 그룹 */}
 {POINT_SETTINGS_CONFIG.map((group) => (
 <Card key={group.group}>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 {group.icon}
 {group.group}
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-5">
 {group.items.map((item) => (
 <div key={item.key} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
 <div className="md:col-span-2">
 <Label htmlFor={item.key} className="font-medium">
 {item.label}
 </Label>
 <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
 </div>
 <div className="flex items-center gap-2">
 <Input
 id={item.key}
 type="number"
 min={item.min}
 max={item.max}
 value={values[item.key] ??""}
 onChange={(e) =>
 setValues((prev) => ({ ...prev, [item.key]: e.target.value }))
 }
 className="w-28 text-right"
 />
 <span className="text-sm text-muted-foreground whitespace-nowrap">
 {item.unit}
 </span>
 {settings && values[item.key] !== settings[item.key] && (
 <Badge variant="outline"className="text-amber-600 border-amber-300 text-xs">
 변경됨
 </Badge>
 )}
 </div>
 </div>
 ))}
 </CardContent>
 </Card>
 ))}

 {/* 만료 알림 이메일 일괄 발송 */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <Bell className="w-5 h-5 text-red-500"/>
 만료 알림 이메일
 </CardTitle>
 <CardDescription>
 현재 만료까지 {values["POINT_EXPIRY_ALERT_DAYS"] ||"30"}일 이내의 포인트를 보유한 회원 중
 아직 알림을 받지 않은 회원에게만 이메일을 일괄 발송합니다.
 </CardDescription>
 </CardHeader>
 <CardContent>
 <Button
 variant="outline"
 onClick={() => sendAlertsMutation.mutate()}
 disabled={sendAlertsMutation.isPending}
 className="border-red-200 text-red-600 hover:bg-red-50"
 >
 <Send className="w-4 h-4 mr-2"/>
 {sendAlertsMutation.isPending ?"발송 중...":"만료 알림 이메일 지금 발송"}
 </Button>
 <p className="text-xs text-muted-foreground mt-2">
 ※ 이미 알림을 받은 회원에게는 이메일을 발송하지 않습니다.
 </p>
 </CardContent>
 </Card>

 {/* 현재 설정 요약 */}
 <Card className="bg-blue-50 border-blue-200">
 <CardHeader>
 <CardTitle className="text-sm text-blue-900">현재 설정 요약</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <div className="flex items-center gap-2">
 <Star className="w-4 h-4 text-amber-400"/>
 <div>
 <div className="text-xs text-muted-foreground">리뷰 기본</div>
 <div className="font-semibold text-sm">{values["REVIEW_POINTS"] || 1500}pt</div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Clock className="w-4 h-4 text-purple-400"/>
 <div>
 <div className="text-xs text-muted-foreground">유효기간</div>
 <div className="font-semibold text-sm">{values["POINT_EXPIRY_MONTHS"] ==="0"?"무기한": `${values["POINT_EXPIRY_MONTHS"] || 12}개월`}</div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Bell className="w-4 h-4 text-red-400"/>
 <div>
 <div className="text-xs text-muted-foreground">알림 시점</div>
 <div className="font-semibold text-sm">만료 {values["POINT_EXPIRY_ALERT_DAYS"] || 30}일 전</div>
 </div>
 </div>
 </div>
 <div className="border-t border-blue-200 pt-3">
 <div className="flex items-center justify-between">
 <div>
 <div className="text-sm font-medium text-blue-900">구매 적립률</div>
 <div className="text-xs text-blue-700 mt-0.5">등급별 적립 상세보기</div>
 </div>
 <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin/membership-tiers'} className="gap-1.5">
 <Eye className="w-4 h-4"/>
 상세보기
 </Button>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 </TabsContent>

 {/* 변경 이력 탭 */}
 <TabsContent value="history"className="mt-4">
 <AuditLogTab />
 </TabsContent>
 </Tabs>
 </div>
 </AdminLayout>
 );
}
