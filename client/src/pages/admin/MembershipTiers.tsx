import { useState } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from"@/components/ui/dialog";
import { Label } from"@/components/ui/label";
import { Switch } from"@/components/ui/switch";
import { toast } from"sonner";
import { Crown, Plus, Pencil, Trash2, RefreshCw, Percent, Coins, Calendar, Layers } from"lucide-react";

interface TierFormData {
 name: string;
 nameKo: string;
 minAmount: number;
 discountRate: string;
 pointRate: string;
 color: string;
 icon: string;
 sortOrder: number;
 periodMonths: number;
 isActive: boolean;
}

const defaultFormData: TierFormData = {
 name:"",
 nameKo:"",
 minAmount: 0,
 discountRate:"0",
 pointRate:"1",
 color:"#6B7280",
 icon:"Star",
 sortOrder: 0,
 periodMonths: 6,
 isActive: true,
};

export default function MembershipTiers() {
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [editingId, setEditingId] = useState<number | null>(null);
 const [formData, setFormData] = useState<TierFormData>(defaultFormData);
 const [isRecalculating, setIsRecalculating] = useState(false);

 const { data: tiers, isLoading, refetch } = trpc.membership.tiers.list.useQuery();
 const createMutation = trpc.membership.tiers.create.useMutation({
 onSuccess: () => {
 toast.success("등급이 생성되었습니다.");
 setIsDialogOpen(false);
 refetch();
 },
 onError: (err) => toast.error(err.message),
 });
 const updateMutation = trpc.membership.tiers.update.useMutation({
 onSuccess: () => {
 toast.success("등급이 수정되었습니다.");
 setIsDialogOpen(false);
 refetch();
 },
 onError: (err) => toast.error(err.message),
 });
 const deleteMutation = trpc.membership.tiers.delete.useMutation({
 onSuccess: () => {
 toast.success("등급이 삭제되었습니다.");
 refetch();
 },
 onError: (err) => toast.error(err.message),
 });
 const recalculateMutation = trpc.membership.tiers.recalculateAll.useMutation({
 onSuccess: (data) => {
 toast.success(`전체 회원 등급 재산정 완료 (${data.updated}명 업데이트)`);
 setIsRecalculating(false);
 },
 onError: (err) => {
 toast.error(err.message);
 setIsRecalculating(false);
 },
 });

 const openCreate = () => {
 setEditingId(null);
 setFormData(defaultFormData);
 setIsDialogOpen(true);
 };

 const openEdit = (tier: any) => {
 setEditingId(tier.id);
 setFormData({
 name: tier.name,
 nameKo: tier.nameKo,
 minAmount: tier.minAmount,
 discountRate: tier.discountRate,
 pointRate: tier.pointRate,
 color: tier.color,
 icon: tier.icon ||"Star",
 sortOrder: tier.sortOrder,
 periodMonths: tier.periodMonths,
 isActive: tier.isActive,
 });
 setIsDialogOpen(true);
 };

 const handleSubmit = () => {
 if (editingId) {
 updateMutation.mutate({ id: editingId, ...formData });
 } else {
 createMutation.mutate(formData);
 }
 };

 const handleDelete = (id: number) => {
 if (confirm("정말 삭제하시겠습니까?")) {
 deleteMutation.mutate({ id });
 }
 };

 const handleRecalculate = () => {
 if (confirm("전체 회원의 등급을 재산정합니다. 진행하시겠습니까?")) {
 setIsRecalculating(true);
 recalculateMutation.mutate();
 }
 };

 // 통계 계산
 const activeTiers = tiers?.filter((t: any) => t.isActive).length || 0;
 const inactiveTiers = tiers?.filter((t: any) => !t.isActive).length || 0;
 const totalTiers = tiers?.length || 0;
 const maxDiscount = tiers?.reduce((max: number, t: any) => Math.max(max, parseFloat(t.discountRate) || 0), 0) || 0;

 return (
 <AdminLayout>
 <div className="space-y-6">
 {/* 헤더 */}
 <div className="flex items-center justify-between">
 <h2 className="text-xl font-bold">회원 등급 설정</h2>
 <div className="flex gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={handleRecalculate}
 disabled={isRecalculating}
 className="h-8 text-xs"
 >
 <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRecalculating ? 'animate-spin' : ''}`} />
 전체 등급 재산정
 </Button>
 <Button size="sm"onClick={openCreate} className="h-8 text-xs">
 <Plus className="w-3.5 h-3.5 mr-1"/>
 등급 추가
 </Button>
 </div>
 </div>

 {/* 통계 카드 - 고객 목록 스타일 */}
 <div className="grid grid-cols-6 gap-2">
 <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 select-none">
 <CardContent className="pt-4 pb-4 text-center">
 <div className="text-2xl font-bold text-blue-600">{totalTiers}</div>
 <div className="text-xs text-gray-600 mt-1">전체 등급</div>
 </CardContent>
 </Card>
 <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 select-none">
 <CardContent className="pt-4 pb-4 text-center">
 <div className="text-2xl font-bold text-green-600">{activeTiers}</div>
 <div className="text-xs text-gray-600 mt-1">활성 등급</div>
 </CardContent>
 </Card>
 <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 select-none">
 <CardContent className="pt-4 pb-4 text-center">
 <div className="text-2xl font-bold text-orange-600">{inactiveTiers}</div>
 <div className="text-xs text-gray-600 mt-1">비활성 등급</div>
 </CardContent>
 </Card>
 <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 select-none">
 <CardContent className="pt-4 pb-4 text-center">
 <div className="text-2xl font-bold text-purple-600">{maxDiscount}%</div>
 <div className="text-xs text-gray-600 mt-1">최대 할인율</div>
 </CardContent>
 </Card>
 </div>

 {/* 안내 카드 */}
 <Card className="border-blue-200 bg-blue-50/50">
 <CardContent className="p-3">
 <p className="text-xs text-blue-800">
 <strong>등급 산정 기준:</strong> 최근 설정된 기간(기본 6개월) 동안의 누적 구매 금액을 기준으로 자동 산정됩니다.
 관리자가 수동으로 등급을 변경할 수도 있습니다.
 </p>
 </CardContent>
 </Card>

 {/* 메인 카드 - 테이블 */}
 <Card>
 <CardHeader>
 <CardTitle>등급 목록</CardTitle>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="text-center py-8 text-xs text-gray-500">로딩 중...</div>
 ) : !tiers || tiers.length === 0 ? (
 <div className="text-center py-8 text-xs text-gray-500">
 <Crown className="w-8 h-8 mx-auto mb-2 text-gray-300"/>
 <p>등록된 등급이 없습니다.</p>
 <p className="text-xs mt-1">등급을 추가하여 회원 등급 시스템을 시작하세요.</p>
 </div>
 ) : (
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">순서</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">등급명</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">한국어명</th>
 <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">최소 금액</th>
 <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">할인율</th>
 <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">ポイント倍率</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">산정기간</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">상태</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">색상</th>
 <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">작업</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {tiers.map((tier: any) => (
 <tr key={tier.id} className="hover:bg-gray-50 transition-colors">
 <td className="px-3 py-2 text-xs text-gray-600">{tier.sortOrder}</td>
 <td className="px-3 py-2">
 <div className="flex items-center gap-2">
 <Crown className="w-3.5 h-3.5"style={{ color: tier.color }} />
 <span className="text-xs font-medium text-gray-900">{tier.name}</span>
 </div>
 </td>
 <td className="px-3 py-2 text-xs text-gray-600">{tier.nameKo}</td>
 <td className="px-3 py-2 text-xs text-gray-900 text-right font-medium">¥{tier.minAmount.toLocaleString()}</td>
 <td className="px-3 py-2 text-xs text-right">
 <span className="text-blue-600 font-medium">{tier.discountRate}%</span>
 </td>
 <td className="px-3 py-2 text-xs text-right">
 <span className="text-green-600 font-medium">×{tier.pointRate}</span>
 </td>
 <td className="px-3 py-2 text-xs text-gray-600 text-center">{tier.periodMonths}개월</td>
 <td className="px-3 py-2 text-center">
 <Badge
 variant={tier.isActive ?"default":"secondary"}
 className="text-[10px] py-0"
 >
 {tier.isActive ?"활성":"비활성"}
 </Badge>
 </td>
 <td className="px-3 py-2 text-center">
 <div
 className="w-5 h-5 rounded-full mx-auto border border-gray-200"
 style={{ backgroundColor: tier.color }}
 />
 </td>
 <td className="px-3 py-2 text-center">
 <div className="flex items-center justify-center gap-0.5">
 <Button size="sm"variant="ghost"className="h-7 w-7 p-0"onClick={() => openEdit(tier)}>
 <Pencil className="w-3.5 h-3.5 text-gray-500"/>
 </Button>
 <Button size="sm"variant="ghost"className="h-7 w-7 p-0"onClick={() => handleDelete(tier.id)}>
 <Trash2 className="w-3.5 h-3.5 text-red-500"/>
 </Button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </CardContent>
 </Card>

 {/* Create/Edit Dialog */}
 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle className="text-base">{editingId ?"등급 수정":"새 등급 추가"}</DialogTitle>
 </DialogHeader>
 <div className="grid gap-4 py-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-xs">등급명 (영문)</Label>
 <Input
 className="h-8 text-xs mt-1"
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 placeholder="BRONZE"
 />
 </div>
 <div>
 <Label className="text-xs">등급명 (한국어)</Label>
 <Input
 className="h-8 text-xs mt-1"
 value={formData.nameKo}
 onChange={(e) => setFormData({ ...formData, nameKo: e.target.value })}
 placeholder="브론즈"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-xs">최소 구매 금액 (¥)</Label>
 <Input
 className="h-8 text-xs mt-1"
 type="number"
 value={formData.minAmount}
 onChange={(e) => setFormData({ ...formData, minAmount: parseInt(e.target.value) || 0 })}
 />
 </div>
 <div>
 <Label className="text-xs">산정 기간 (개월)</Label>
 <Input
 className="h-8 text-xs mt-1"
 type="number"
 min={1}
 max={24}
 value={formData.periodMonths}
 onChange={(e) => setFormData({ ...formData, periodMonths: parseInt(e.target.value) || 6 })}
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-xs">할인율 (%)</Label>
 <Input
 className="h-8 text-xs mt-1"
 value={formData.discountRate}
 onChange={(e) => setFormData({ ...formData, discountRate: e.target.value })}
 placeholder="5"
 />
 </div>
 <div>
 <Label className="text-xs">ポイント倍率 (×)</Label>
 <Input
 className="h-8 text-xs mt-1"
 value={formData.pointRate}
 onChange={(e) => setFormData({ ...formData, pointRate: e.target.value })}
 placeholder="3"
 />
 </div>
 </div>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <Label className="text-xs">색상</Label>
 <Input
 className="h-8 mt-1"
 type="color"
 value={formData.color}
 onChange={(e) => setFormData({ ...formData, color: e.target.value })}
 />
 </div>
 <div>
 <Label className="text-xs">정렬 순서</Label>
 <Input
 className="h-8 text-xs mt-1"
 type="number"
 value={formData.sortOrder}
 onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
 />
 </div>
 <div className="flex items-end gap-2">
 <div>
 <Label className="text-xs">활성</Label>
 <div className="mt-2">
 <Switch
 checked={formData.isActive}
 onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline"size="sm"onClick={() => setIsDialogOpen(false)} className="text-xs">취소</Button>
 <Button size="sm"onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="text-xs">
 {editingId ?"수정":"생성"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </AdminLayout>
 );
}
