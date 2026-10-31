import { useState, useEffect } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Switch } from"@/components/ui/switch";
import { Label } from"@/components/ui/label";
import { Badge } from"@/components/ui/badge";
import { toast } from"sonner";
import { UserPlus, Save, Users, Gift, TrendingUp, Calendar } from"lucide-react";

export default function ReferralSettings() {
 const { data: settings, isLoading } = trpc.membership.referral.getSettings.useQuery();
 const { data: rewards } = trpc.membership.referral.adminGetRewards.useQuery({ page: 1, limit: 20 });

 const [formData, setFormData] = useState({
 signupReferrerReward: 500,
 signupRefereeReward: 500,
 purchaseReferrerReward: 1000,
 purchaseRefereeReward: 1000,
 isActive: true,
 });

 useEffect(() => {
 if (settings) {
 setFormData({
 signupReferrerReward: settings.signupReferrerReward,
 signupRefereeReward: settings.signupRefereeReward,
 purchaseReferrerReward: settings.purchaseReferrerReward,
 purchaseRefereeReward: settings.purchaseRefereeReward,
 isActive: settings.isActive,
 });
 }
 }, [settings]);

 const updateMutation = trpc.membership.referral.updateSettings.useMutation({
 onSuccess: () => toast.success("추천인 설정이 저장되었습니다."),
 onError: (err) => toast.error(err.message),
 });

 const handleSave = () => {
 updateMutation.mutate(formData);
 };

 // 통계 계산
 const totalRewards = rewards?.rewards?.length || 0;
 const completedRewards = rewards?.rewards?.filter((r: any) => r.status === 'completed').length || 0;
 const totalReferrerPoints = rewards?.rewards?.reduce((sum: number, r: any) => sum + r.referrerReward, 0) || 0;
 const totalRefereePoints = rewards?.rewards?.reduce((sum: number, r: any) => sum + r.refereeReward, 0) || 0;

 return (
 <AdminLayout>
 <div className="space-y-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <UserPlus className="w-6 h-6 text-blue-500"/>
 <h2 className="text-xl font-bold">추천인 제도 설정</h2>
 </div>
 </div>

 {/* 통계 카드 - 회원등급설정 스타일 */}
 <div className="grid grid-cols-6 gap-2">
 <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 select-none">
 <CardContent className="pt-4 pb-4 text-center">
 <div className="text-2xl font-bold text-blue-600">{totalRewards}</div>
 <div className="text-xs text-gray-600 mt-1">전체 보상</div>
 </CardContent>
 </Card>
 <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 select-none">
 <CardContent className="pt-4 pb-4 text-center">
 <div className="text-2xl font-bold text-green-600">{completedRewards}</div>
 <div className="text-xs text-gray-600 mt-1">완료된 보상</div>
 </CardContent>
 </Card>
 <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 select-none">
 <CardContent className="pt-4 pb-4 text-center">
 <div className="text-2xl font-bold text-orange-600">{totalReferrerPoints.toLocaleString()}</div>
 <div className="text-xs text-gray-600 mt-1">추천인 포인트</div>
 </CardContent>
 </Card>
 <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 select-none">
 <CardContent className="pt-4 pb-4 text-center">
 <div className="text-2xl font-bold text-purple-600">{totalRefereePoints.toLocaleString()}</div>
 <div className="text-xs text-gray-600 mt-1">피추천인 포인트</div>
 </CardContent>
 </Card>
 </div>

 {/* 안내 카드 */}
 <Card className="border-blue-200 bg-blue-50/50">
 <CardContent className="p-3">
 <p className="text-xs text-blue-800">
 <strong>추천인 제도:</strong> 회원이 다른 사람을 추천하면 회원가입 및 첫 구매 시 포인트를 지급하는 제도입니다.
 아래에서 각 단계별 보상 포인트를 설정할 수 있습니다.
 </p>
 </CardContent>
 </Card>

 {/* 보상 설정 카드 */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center justify-between">
 <span className="flex items-center gap-2">
 <Gift className="w-4 h-4 text-pink-500"/>
 보상 설정
 </span>
 <div className="flex items-center gap-2">
 <Label className="text-sm font-normal">추천인 제도 활성화</Label>
 <Switch
 checked={formData.isActive}
 onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
 />
 </div>
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-6">
 {/* 회원가입 시 보상 */}
 <div className="border rounded-lg p-4 bg-gray-50">
 <h3 className="font-semibold mb-4 text-sm text-gray-700 flex items-center gap-2">
 <Users className="w-4 h-4 text-blue-500"/>
 회원가입 시 보상
 </h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-xs font-semibold text-gray-700">추천인 보상 (포인트)</Label>
 <Input
 type="number"
 className="mt-1 h-8 text-sm"
 value={formData.signupReferrerReward}
 onChange={(e) => setFormData({ ...formData, signupReferrerReward: parseInt(e.target.value) || 0 })}
 />
 <p className="text-xs text-gray-500 mt-1">추천한 사람이 받는 포인트</p>
 </div>
 <div>
 <Label className="text-xs font-semibold text-gray-700">피추천인 보상 (포인트)</Label>
 <Input
 type="number"
 className="mt-1 h-8 text-sm"
 value={formData.signupRefereeReward}
 onChange={(e) => setFormData({ ...formData, signupRefereeReward: parseInt(e.target.value) || 0 })}
 />
 <p className="text-xs text-gray-500 mt-1">추천받은 사람이 받는 포인트</p>
 </div>
 </div>
 </div>

 {/* 첫 구매 완료 시 보상 */}
 <div className="border rounded-lg p-4 bg-gray-50">
 <h3 className="font-semibold mb-4 text-sm text-gray-700 flex items-center gap-2">
 <TrendingUp className="w-4 h-4 text-green-500"/>
 피추천인 첫 구매 완료 시 보상
 </h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-xs font-semibold text-gray-700">추천인 보상 (포인트)</Label>
 <Input
 type="number"
 className="mt-1 h-8 text-sm"
 value={formData.purchaseReferrerReward}
 onChange={(e) => setFormData({ ...formData, purchaseReferrerReward: parseInt(e.target.value) || 0 })}
 />
 <p className="text-xs text-gray-500 mt-1">피추천인 첫 구매 시 추천인이 받는 포인트</p>
 </div>
 <div>
 <Label className="text-xs font-semibold text-gray-700">피추천인 보상 (포인트)</Label>
 <Input
 type="number"
 className="mt-1 h-8 text-sm"
 value={formData.purchaseRefereeReward}
 onChange={(e) => setFormData({ ...formData, purchaseRefereeReward: parseInt(e.target.value) || 0 })}
 />
 <p className="text-xs text-gray-500 mt-1">피추천인 첫 구매 시 본인이 받는 추가 포인트</p>
 </div>
 </div>
 </div>

 <div className="flex justify-end">
 <Button
 onClick={handleSave}
 disabled={updateMutation.isPending}
 className="bg-pink-600 hover:bg-pink-700 text-white"
 >
 <Save className="w-4 h-4 mr-2"/>
 {updateMutation.isPending ?"저장 중...":"설정 저장"}
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* 추천 보상 내역 카드 */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Calendar className="w-4 h-4 text-orange-500"/>
 추천 보상 내역
 </CardTitle>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="text-center py-8 text-xs text-gray-500">로딩 중...</div>
 ) : !rewards || rewards.rewards.length === 0 ? (
 <div className="text-center py-8">
 <Gift className="w-8 h-8 mx-auto mb-2 text-gray-300"/>
 <p className="text-xs text-gray-500">아직 추천 보상 내역이 없습니다.</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
                 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">추천인 (이메일)</th>
                 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">피추천인 (이메일)</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">유형</th>
 <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">추천인 보상</th>
 <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">피추천인 보상</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">상태</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">일시</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {rewards.rewards.map((reward: any) => (
 <tr key={reward.id} className="hover:bg-gray-50 transition-colors">
                 <td className="px-3 py-2 text-xs text-gray-600">
                   <span className="font-mono" title={`ID: ${reward.referrerId}`}>{reward.referrerEmail || reward.referrerId}</span>
                 </td>
                 <td className="px-3 py-2 text-xs text-gray-600">
                   <span className="font-mono" title={`ID: ${reward.refereeId}`}>{reward.refereeEmail || reward.refereeId}</span>
                 </td>
 <td className="px-3 py-2">
 <Badge variant="outline"className="text-[10px]">
 {reward.rewardType === 'signup' ? '회원가입' : '첫 구매'}
 </Badge>
 </td>
 <td className="px-3 py-2 text-xs text-right font-medium text-blue-600">
 {reward.referrerReward.toLocaleString()}P
 </td>
 <td className="px-3 py-2 text-xs text-right font-medium text-green-600">
 {reward.refereeReward.toLocaleString()}P
 </td>
 <td className="px-3 py-2 text-center">
 <Badge
 variant={
 reward.status === 'completed'
 ? 'default'
 : reward.status === 'pending'
 ? 'secondary'
 : 'destructive'
 }
 className="text-[10px] py-0"
 >
 {reward.status === 'completed' ? '완료' : reward.status === 'pending' ? '대기' : '취소'}
 </Badge>
 </td>
 <td className="px-3 py-2 text-xs text-gray-600">
 {new Date(reward.createdAt).toLocaleDateString('ko-KR')}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </AdminLayout>
 );
}
