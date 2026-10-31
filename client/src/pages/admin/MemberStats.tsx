import { trpc } from"@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Users, UserPlus, TrendingUp, UserMinus, Award, Coins, AlertTriangle } from"lucide-react";
import { useState } from"react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import AdminLayout from"@/components/AdminLayout";

function formatNumber(n: number) {
 return n.toLocaleString();
}

function formatPrice(n: number) {
 return `¥${n.toLocaleString()}`;
}

// Simple bar chart component
function BarChart({ data, maxHeight = 120 }: { data: { label: string; value: number; color?: string }[]; maxHeight?: number }) {
 const maxValue = Math.max(...data.map(d => d.value), 1);
 return (
 <div className="flex items-end gap-1 h-[120px]">
 {data.map((item, i) => (
 <div key={i} className="flex flex-col items-center flex-1 min-w-0">
 <span className="text-[10px] text-gray-500 mb-1">{item.value}</span>
 <div
 className="w-full rounded-t"
 style={{
 height: `${(item.value / maxValue) * maxHeight}px`,
 backgroundColor: item.color || '#ec4899',
 minHeight: item.value > 0 ? '4px' : '0px',
 }}
 />
 <span className="text-[9px] text-gray-400 mt-1 truncate w-full text-center">{item.label}</span>
 </div>
 ))}
 </div>
 );
}

// Donut chart component
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
 const total = data.reduce((sum, d) => sum + d.value, 0);
 if (total === 0) return <div className="text-center text-gray-400 py-8">데이터 없음</div>;
 
 let cumulativePercent = 0;
 const segments = data.filter(d => d.value > 0).map(d => {
 const percent = (d.value / total) * 100;
 const startPercent = cumulativePercent;
 cumulativePercent += percent;
 return { ...d, percent, startPercent };
 });

 const gradientParts = segments.map(s => 
 `${s.color} ${s.startPercent}% ${s.startPercent + s.percent}%`
 ).join(', ');

 return (
 <div className="flex items-center gap-4">
 <div
 className="w-32 h-32 rounded-full flex-shrink-0"
 style={{
 background: `conic-gradient(${gradientParts})`,
 position: 'relative',
 }}
 >
 <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
 <span className="text-sm font-bold">{total}명</span>
 </div>
 </div>
 <div className="space-y-1 flex-1">
 {data.filter(d => d.value > 0).map((d, i) => (
 <div key={i} className="flex items-center gap-2 text-sm">
 <div className="w-3 h-3 rounded-full flex-shrink-0"style={{ backgroundColor: d.color }} />
 <span className="text-gray-600">{d.label}</span>
 <span className="ml-auto font-medium">{d.value}명</span>
 <span className="text-gray-400 text-xs">({((d.value / total) * 100).toFixed(1)}%)</span>
 </div>
 ))}
 </div>
 </div>
 );
}

export default function MemberStats() {
 const [trendPeriod, setTrendPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
 const [trendDays, setTrendDays] = useState(30);

 const { data: overview, isLoading: overviewLoading } = trpc.membership.stats.overview.useQuery();
 const { data: tierDist, isLoading: tierLoading } = trpc.membership.stats.tierDistribution.useQuery();
 const { data: signupTrend, isLoading: trendLoading } = trpc.membership.stats.signupTrend.useQuery({ period: trendPeriod, days: trendDays });
 const { data: referralStats, isLoading: referralLoading } = trpc.membership.stats.referralStats.useQuery();
 const { data: loginStats, isLoading: loginLoading } = trpc.membership.stats.loginStats.useQuery();

 return (
 <AdminLayout>
 <div className="space-y-4">
 {/* 헤더 */}
 <div className="flex items-center justify-between">
 <h2 className="text-xl font-bold">회원 통계</h2>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2 mb-2">
 <Users className="w-4 h-4 text-blue-500"/>
 <span className="text-xs text-gray-500">총 회원수</span>
 </div>
 <p className="text-2xl font-bold">{overviewLoading ? '-' : formatNumber(overview?.totalMembers || 0)}</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2 mb-2">
 <UserPlus className="w-4 h-4 text-green-500"/>
 <span className="text-xs text-gray-500">이번 주 신규</span>
 </div>
 <p className="text-2xl font-bold">{overviewLoading ? '-' : formatNumber(overview?.newMembersThisWeek || 0)}</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2 mb-2">
 <TrendingUp className="w-4 h-4 text-purple-500"/>
 <span className="text-xs text-gray-500">이번 달 신규</span>
 </div>
 <p className="text-2xl font-bold">{overviewLoading ? '-' : formatNumber(overview?.newMembersThisMonth || 0)}</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2 mb-2">
 <Award className="w-4 h-4 text-orange-500"/>
 <span className="text-xs text-gray-500">활성 회원</span>
 </div>
 <p className="text-2xl font-bold">{overviewLoading ? '-' : formatNumber(overview?.activeMembers || 0)}</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2 mb-2">
 <UserMinus className="w-4 h-4 text-red-500"/>
 <span className="text-xs text-gray-500">휴면 회원</span>
 </div>
 <p className="text-2xl font-bold">{overviewLoading ? '-' : formatNumber(overview?.dormantMembers || 0)}</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2 mb-2">
 <Coins className="w-4 h-4 text-yellow-500"/>
 <span className="text-xs text-gray-500">평균 구매액</span>
 </div>
 <p className="text-2xl font-bold">{overviewLoading ? '-' : formatPrice(overview?.avgPurchaseAmount || 0)}</p>
 </CardContent>
 </Card>
 </div>

 {/* Charts Row */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Tier Distribution */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">등급별 회원 분포</CardTitle>
 </CardHeader>
 <CardContent>
 {tierLoading ? (
 <div className="text-center py-8 text-gray-400">로딩 중...</div>
 ) : (
 <DonutChart
 data={(tierDist || []).map(t => ({
 label: t.tierNameKo || t.tierName,
 value: t.count,
 color: t.color,
 }))}
 />
 )}
 </CardContent>
 </Card>

 {/* Signup Trend */}
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle className="text-lg">신규 가입 추이</CardTitle>
 <div className="flex gap-2">
 <Select value={trendPeriod} onValueChange={(v) => setTrendPeriod(v as any)}>
 <SelectTrigger className="w-24 h-8 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="daily">일별</SelectItem>
 <SelectItem value="weekly">주별</SelectItem>
 <SelectItem value="monthly">월별</SelectItem>
 </SelectContent>
 </Select>
 <Select value={String(trendDays)} onValueChange={(v) => setTrendDays(Number(v))}>
 <SelectTrigger className="w-20 h-8 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="7">7일</SelectItem>
 <SelectItem value="14">14일</SelectItem>
 <SelectItem value="30">30일</SelectItem>
 <SelectItem value="90">90일</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {trendLoading ? (
 <div className="text-center py-8 text-gray-400">로딩 중...</div>
 ) : signupTrend && signupTrend.length > 0 ? (
 <BarChart
 data={signupTrend.map(t => ({
 label: t.date.slice(-5),
 value: t.count,
 color: '#8b5cf6',
 }))}
 />
 ) : (
 <div className="text-center py-8 text-gray-400">데이터 없음</div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Second Row */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Referral Stats */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">추천 활동 현황</CardTitle>
 </CardHeader>
 <CardContent>
 {referralLoading ? (
 <div className="text-center py-8 text-gray-400">로딩 중...</div>
 ) : (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-blue-50 rounded-lg p-3">
 <p className="text-xs text-blue-600">총 추천 건수</p>
 <p className="text-xl font-bold text-blue-700">{referralStats?.totalReferrals || 0}</p>
 </div>
 <div className="bg-green-50 rounded-lg p-3">
 <p className="text-xs text-green-600">추천 가입 회원</p>
 <p className="text-xl font-bold text-green-700">{referralStats?.membersWithReferral || 0}</p>
 </div>
 <div className="bg-purple-50 rounded-lg p-3">
 <p className="text-xs text-purple-600">가입 보상</p>
 <p className="text-xl font-bold text-purple-700">{referralStats?.signupRewards || 0}건</p>
 </div>
 <div className="bg-orange-50 rounded-lg p-3">
 <p className="text-xs text-orange-600">구매 보상</p>
 <p className="text-xl font-bold text-orange-700">{referralStats?.purchaseRewards || 0}건</p>
 </div>
 </div>
 <div className="bg-gray-50 rounded-lg p-3">
 <p className="text-xs text-gray-600">총 보상 지급액</p>
 <p className="text-xl font-bold text-gray-800">{formatPrice(referralStats?.totalRewardAmount || 0)}</p>
 </div>
 {referralStats?.recentTrend && referralStats.recentTrend.length > 0 && (
 <div>
 <p className="text-xs text-gray-500 mb-2">최근 30일 추천 추이</p>
 <BarChart
 data={referralStats.recentTrend.map(t => ({
 label: t.date.slice(-5),
 value: t.count,
 color: '#3b82f6',
 }))}
 />
 </div>
 )}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Login Stats */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">접속 현황</CardTitle>
 </CardHeader>
 <CardContent>
 {loginLoading ? (
 <div className="text-center py-8 text-gray-400">로딩 중...</div>
 ) : (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-indigo-50 rounded-lg p-3">
 <p className="text-xs text-indigo-600">최근 7일 접속</p>
 <p className="text-xl font-bold text-indigo-700">{loginStats?.loginLast7Days || 0}회</p>
 </div>
 <div className="bg-teal-50 rounded-lg p-3">
 <p className="text-xs text-teal-600">최근 30일 접속</p>
 <p className="text-xl font-bold text-teal-700">{loginStats?.loginLast30Days || 0}회</p>
 </div>
 </div>
 {loginStats?.dailyLogins && loginStats.dailyLogins.length > 0 && (
 <div>
 <p className="text-xs text-gray-500 mb-2">일별 접속 추이 (30일)</p>
 <BarChart
 data={loginStats.dailyLogins.map(t => ({
 label: t.date.slice(-5),
 value: t.count,
 color: '#14b8a6',
 }))}
 />
 </div>
 )}
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* 휴면 회원 목록 */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-amber-500"/>
 휴면 회원 목록 (6개월 이상 미접속)
 </CardTitle>
 </CardHeader>
 <CardContent>
 <DormantMembersList />
 </CardContent>
 </Card>
 </div>
 </AdminLayout>
 );
}

function DormantMembersList() {
 const [page, setPage] = useState(1);
 const { data, isLoading } = trpc.membership.stats.dormantList.useQuery({ months: 6, page, limit: 10 });

 if (isLoading) return <div className="text-center py-4 text-gray-400">로딩 중...</div>;
 if (!data || data.users.length === 0) return <div className="text-center py-4 text-gray-400">휴면 회원이 없습니다</div>;

 const totalPages = Math.ceil(data.total / data.limit);

 return (
 <div>
 <div className="text-sm text-gray-500 mb-3">총 {data.total}명의 휴면 회원</div>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b text-left text-gray-500">
 <th className="pb-2 font-medium">이름</th>
 <th className="pb-2 font-medium">이메일</th>
 <th className="pb-2 font-medium">마지막 접속</th>
 <th className="pb-2 font-medium">누적 구매액</th>
 <th className="pb-2 font-medium">가입일</th>
 </tr>
 </thead>
 <tbody>
 {data.users.map(user => (
 <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
 <td className="py-2">{user.nameKanji}</td>
 <td className="py-2 text-gray-600">{user.email}</td>
 <td className="py-2 text-red-500">
 {user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString('ko-KR') : '-'}
 </td>
 <td className="py-2">¥{(user.totalPurchaseAmount || 0).toLocaleString()}</td>
 <td className="py-2 text-gray-500">
 {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {totalPages > 1 && (
 <div className="flex justify-center gap-2 mt-4">
 <button
 onClick={() => setPage(p => Math.max(1, p - 1))}
 disabled={page === 1}
 className="px-3 py-1 text-sm border rounded disabled:opacity-50"
 >
 이전
 </button>
 <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
 <button
 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
 disabled={page === totalPages}
 className="px-3 py-1 text-sm border rounded disabled:opacity-50"
 >
 다음
 </button>
 </div>
 )}
 </div>
 );
}
