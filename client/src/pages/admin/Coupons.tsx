import { useAuth } from"@/_core/hooks/useAuth";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { useState } from"react";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from"@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { toast } from"sonner";
import { Plus, Edit, Trash2, Ticket, Copy, ToggleLeft, ToggleRight } from"lucide-react";
import { formatPrice } from"@/../../shared/utils/formatPrice";

export default function AdminCoupons() {
 const { user, loading } = useAuth();
 const [showDialog, setShowDialog] = useState(false);
 const [editingCoupon, setEditingCoupon] = useState<any>(null);
 const [formData, setFormData] = useState({
 code:"",
 nameJa:"",
 description:"",
 discountType:"percentage"as"percentage"|"fixed",
 discountValue: 0,
 minOrderAmount: 0,
 maxDiscountAmount: 0,
 maxUses: 0,
 maxUsesPerUser: 1,
 startsAt:"",
 expiresAt:"",
 });

 const { data: isAdmin, isLoading: checkingAdmin } = trpc.admin.isAdmin.useQuery(undefined, {
 enabled: !!user,
 });

 const { data, isLoading, refetch } = trpc.coupon.adminList.useQuery(undefined, {
 enabled: isAdmin === true,
 });

 const createMutation = trpc.coupon.adminCreate.useMutation({
 onSuccess: () => {
 toast.success("쿠폰이 생성되었습니다");
 setShowDialog(false);
 resetForm();
 refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const updateMutation = trpc.coupon.adminUpdate.useMutation({
 onSuccess: () => {
 toast.success("쿠폰이 업데이트되었습니다");
 setShowDialog(false);
 resetForm();
 refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteMutation = trpc.coupon.adminDelete.useMutation({
 onSuccess: () => {
 toast.success("쿠폰이 삭제되었습니다");
 refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const toggleMutation = trpc.coupon.adminUpdate.useMutation({
 onSuccess: () => {
 refetch();
 },
 });

 const resetForm = () => {
 setFormData({
 code:"",
 nameJa:"",
 description:"",
 discountType:"percentage",
 discountValue: 0,
 minOrderAmount: 0,
 maxDiscountAmount: 0,
 maxUses: 0,
 maxUsesPerUser: 1,
 startsAt:"",
 expiresAt:"",
 });
 setEditingCoupon(null);
 };

 const generateCode = () => {
 const chars ="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
 let code ="";
 for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
 setFormData({ ...formData, code });
 };

 const handleSubmit = () => {
 if (!formData.code || !formData.nameJa) {
 toast.error("쿠폰 코드와 이름은 필수입니다");
 return;
 }
 if (formData.discountValue <= 0) {
 toast.error("할인값은 0보다 큰 값을 입력해주세요");
 return;
 }
 if (formData.discountType ==="percentage"&& formData.discountValue > 100) {
 toast.error("할인율은 100% 이하로 입력해주세요");
 return;
 }

 // datetime-local values are in user's local timezone, convert to ISO string for server
 const payload = {
 ...formData,
 maxUses: formData.maxUses > 0 ? formData.maxUses : undefined,
 maxDiscountAmount: formData.maxDiscountAmount > 0 ? formData.maxDiscountAmount : undefined,
 startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : undefined,
 expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
 };

 if (editingCoupon) {
 updateMutation.mutate({ id: editingCoupon.id, ...payload });
 } else {
 createMutation.mutate(payload);
 }
 };

 const handleEdit = (item: any) => {
 setEditingCoupon(item);
 setFormData({
 code: item.code,
 nameJa: item.nameJa,
 description: item.description ||"",
 discountType: item.discountType,
 discountValue: parseFloat(item.discountValue),
 minOrderAmount: parseFloat(item.minOrderAmount ||"0"),
 maxDiscountAmount: parseFloat(item.maxDiscountAmount ||"0"),
 maxUses: item.maxUses || 0,
 maxUsesPerUser: item.maxUsesPerUser || 1,
 // Convert UTC timestamp to local datetime-local format for editing
 startsAt: item.startsAt ? (() => { const d = new Date(item.startsAt); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })() :"",
 expiresAt: item.expiresAt ? (() => { const d = new Date(item.expiresAt); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })() :"",
 });
 setShowDialog(true);
 };

 const handleDelete = (id: number) => {
 if (confirm("이 쿠폰을 삭제하시겠습니까?")) {
 deleteMutation.mutate({ id });
 }
 };

 const copyCode = (code: string) => {
 navigator.clipboard.writeText(code);
 toast.success("코드를 복사했습니다");
 };

 const isExpired = (expiresAt: string | null) => {
 if (!expiresAt) return false;
 return new Date(expiresAt) < new Date();
 };

 if (loading || checkingAdmin) {
 return (
 <AdminLayout>
 <div className="flex items-center justify-center h-96">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
 </div>
 </AdminLayout>
 );
 }

 if (!user || !isAdmin) {
 return (
 <AdminLayout>
 <div className="text-center py-12">
 <h2 className="text-xl font-bold text-gray-800 mb-4">접근 권한이 없습니다</h2>
 </div>
 </AdminLayout>
 );
 }

 return (
 <AdminLayout>
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Ticket className="w-8 h-8 text-pink-600"/>
 <h2 className="text-xl font-bold">쿠폰 관리</h2>
 </div>
 <Button
 onClick={() => { resetForm(); setShowDialog(true); }}
 className="bg-pink-600 hover:bg-pink-700 flex items-center gap-2"
 >
 <Plus size={20} />
 신규 쿠폰 생성
 </Button>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-4 gap-4">
 <Card>
 <CardContent className="pt-6">
 <div className="text-sm text-gray-500">총 쿠폰 수</div>
 <div className="text-xl font-bold">{data?.length || 0}</div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="text-sm text-gray-500">활성쿠폰</div>
 <div className="text-xl font-bold text-green-600">
 {data?.filter((c: any) => c.isActive && !isExpired(c.expiresAt)).length || 0}
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="text-sm text-gray-500">기간 만료</div>
 <div className="text-xl font-bold text-red-600">
 {data?.filter((c: any) => isExpired(c.expiresAt)).length || 0}
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="text-sm text-gray-500">총 사용 횟수</div>
 <div className="text-xl font-bold text-blue-600">
 {data?.reduce((sum: number, c: any) => sum + (c.currentUses || 0), 0) || 0}
 </div>
 </CardContent>
 </Card>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>쿠폰 목록</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">코드</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">이름</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">할인</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">최소 주문 금액</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">사용 현황</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">유효기간</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">상태</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">작업</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {isLoading ? (
 <tr>
 <td colSpan={8} className="px-3 py-4 text-center text-xs text-gray-500">로딩 중...</td>
 </tr>
 ) : data?.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-3 py-4 text-center text-xs text-gray-500">
 쿠폰이 없습니다
 </td>
 </tr>
 ) : (
 data?.map((item: any) => (
 <tr key={item.id} className={`hover:bg-gray-50 ${isExpired(item.expiresAt) ? 'opacity-50' : ''}`}>
 <td className="px-3 py-2">
 <div className="flex items-center gap-2">
 <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono font-bold">
 {item.code}
 </code>
 <button onClick={() => copyCode(item.code)} className="text-gray-400 hover:text-gray-600">
 <Copy className="w-4 h-4"/>
 </button>
 </div>
 </td>
 <td className="px-3 py-2 text-xs">{item.nameJa}</td>
 <td className="px-3 py-2 text-xs font-medium">
 {item.discountType === 'percentage'
 ? <span className="text-pink-600">{parseFloat(item.discountValue)}% OFF</span>
 : <span className="text-pink-600">{formatPrice(Math.round(parseFloat(item.discountValue)))} OFF</span>
 }
 </td>
 <td className="px-3 py-2 text-xs">
 {parseFloat(item.minOrderAmount || '0') > 0
 ? formatPrice(Math.round(parseFloat(item.minOrderAmount)))
 : '-'
 }
 </td>
 <td className="px-3 py-2 text-xs">
 {item.currentUses}/{item.maxUses || '∞'}
 </td>
 <td className="px-3 py-2 text-xs">
 {item.expiresAt
 ? <span className={isExpired(item.expiresAt) ? 'text-red-600' : ''}>
 {new Date(item.expiresAt).toLocaleDateString('ja-JP')}
 </span>
 : '무기한'
 }
 </td>
 <td className="px-3 py-2">
 <button
 onClick={() => toggleMutation.mutate({ id: item.id, isActive: !item.isActive })}
 className={`flex items-center gap-1 text-sm ${item.isActive ? 'text-green-600' : 'text-gray-400'}`}
 >
 {item.isActive ? <ToggleRight className="w-5 h-5"/> : <ToggleLeft className="w-5 h-5"/>}
 {item.isActive ? '활성' : '비활성'}
 </button>
 </td>
 <td className="px-3 py-2">
 <div className="flex items-center gap-2">
 <Button variant="outline"size="sm"onClick={() => handleEdit(item)}>
 <Edit className="h-4 w-4 mr-1"/>
 편집
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleDelete(item.id)}
 className="text-red-600 hover:text-red-700"
 >
 <Trash2 className="h-4 w-4 mr-1"/>
 삭제
 </Button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>

 {/* Create/Edit Dialog */}
 <Dialog open={showDialog} onOpenChange={setShowDialog}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{editingCoupon ?"쿠폰 편집":"신규 쿠폰 생성"}</DialogTitle>
 </DialogHeader>

 <div className="space-y-4">
 {/* Code */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">쿠폰 코드 *</label>
 <div className="flex gap-2">
 <Input
 value={formData.code}
 onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
 placeholder="예: WELCOME20"
 className="font-mono"
 disabled={!!editingCoupon}
 />
 {!editingCoupon && (
 <Button variant="outline"onClick={generateCode} type="button">자동 생성</Button>
 )}
 </div>
 </div>

 {/* Name */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">쿠폰명 *</label>
 <Input
 value={formData.nameJa}
 onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })}
 placeholder="예: 신규 회원 20% 할인 쿠폰"
 />
 </div>

 {/* Description */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
 <Input
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder="쿠폰 설명 (선택)"
 />
 </div>

 {/* Discount Type & Value */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">할인유형 *</label>
 <select
 value={formData.discountType}
 onChange={(e) => setFormData({ ...formData, discountType: e.target.value as"percentage"|"fixed"})}
 className="w-full border rounded-md px-3 py-2 text-sm"
 >
 <option value="percentage">할인율 (%)</option>
 <option value="fixed">고정 금액 (円)</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 할인값 * {formData.discountType === 'percentage' ? '(%)' : '(円)'}
 </label>
 <Input
 type="number"
 value={formData.discountValue ||""}
 onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
 placeholder={formData.discountType === 'percentage' ? '예: 20' : '예: 500'}
 min={0}
 max={formData.discountType === 'percentage' ? 100 : undefined}
 />
 </div>
 </div>

 {/* Min Order & Max Discount */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">최소 주문 금액 (円)</label>
 <Input
 type="number"
 value={formData.minOrderAmount ||""}
 onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) || 0 })}
 placeholder="0 = 제한 없음"
 min={0}
 />
 </div>
 {formData.discountType === 'percentage' && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">최대 할인 금액 (円)</label>
 <Input
 type="number"
 value={formData.maxDiscountAmount ||""}
 onChange={(e) => setFormData({ ...formData, maxDiscountAmount: parseFloat(e.target.value) || 0 })}
 placeholder="0 = 제한 없음"
 min={0}
 />
 </div>
 )}
 </div>

 {/* Usage Limits */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">전체 사용 상한</label>
 <Input
 type="number"
 value={formData.maxUses ||""}
 onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 0 })}
 placeholder="0 = 무제한"
 min={0}
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">1인당 사용 상한</label>
 <Input
 type="number"
 value={formData.maxUsesPerUser ||""}
 onChange={(e) => setFormData({ ...formData, maxUsesPerUser: parseInt(e.target.value) || 1 })}
 placeholder="1"
 min={1}
 />
 </div>
 </div>

 {/* Date Range */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">활성시작일</label>
 <Input
 type="datetime-local"
 value={formData.startsAt}
 onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">활성종료일</label>
 <Input
 type="datetime-local"
 value={formData.expiresAt}
 onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
 />
 </div>
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline"onClick={() => setShowDialog(false)}>취소</Button>
 <Button
 onClick={handleSubmit}
 disabled={createMutation.isPending || updateMutation.isPending}
 className="bg-pink-600 hover:bg-pink-700"
 >
 {createMutation.isPending || updateMutation.isPending ?"저장 중...":"저장"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </AdminLayout>
 );
}
