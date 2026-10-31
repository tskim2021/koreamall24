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
import { Plus, Edit, Trash2, GripVertical, Save } from"lucide-react";

export default function AdminCategories() {
 const { user, loading } = useAuth();
 const [showDialog, setShowDialog] = useState(false);
 const [editingCategory, setEditingCategory] = useState<any>(null);
 const [formData, setFormData] = useState({
 name:"",
 nameJa:"",
 slug:"",
 description:"",
 descriptionJa:"",
 });

 // 드래그 앤 드롭 상태
 const [draggedId, setDraggedId] = useState<number | null>(null);
 const [dragOverId, setDragOverId] = useState<number | null>(null);
 const [localOrder, setLocalOrder] = useState<number[] | null>(null);

 const { data: isAdmin, isLoading: checkingAdmin } = trpc.admin.isAdmin.useQuery(undefined, {
 enabled: !!user,
 });

 const { data, isLoading, refetch } = trpc.admin.categories.useQuery(undefined, {
 enabled: isAdmin === true,
 });

 const createMutation = trpc.admin.createCategory.useMutation({
 onSuccess: () => {
 toast.success("카테고리가 생성되었습니다");
 setShowDialog(false);
 resetForm();
 refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const updateMutation = trpc.admin.updateCategory.useMutation({
 onSuccess: () => {
 toast.success("카테고리가 업데이트되었습니다");
 setShowDialog(false);
 resetForm();
 refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteMutation = trpc.admin.deleteCategory.useMutation({
 onSuccess: () => { toast.success("카테고리가 삭제되었습니다"); refetch(); },
 onError: (error) => toast.error(error.message),
 });

 const sortOrderMutation = trpc.admin.updateCategorySortOrders.useMutation({
 onSuccess: () => {
 toast.success("노출 순서가 저장되었습니다");
 refetch();
 setLocalOrder(null);
 },
 onError: (e) => toast.error(`순서 저장 실패: ${e.message}`),
 });

 const quickSortMutation = trpc.admin.updateCategory.useMutation({
 onSuccess: () => refetch(),
 onError: (e) => toast.error(`저장 실패: ${e.message}`),
 });

 const resetForm = () => {
 setFormData({ name:"", nameJa:"", slug:"", description:"", descriptionJa:""});
 setEditingCategory(null);
 };

 const handleSubmit = () => {
 if (!formData.name || !formData.nameJa || !formData.slug) {
 toast.error("필수 항목을 입력해주세요");
 return;
 }
 if (editingCategory) {
 updateMutation.mutate({ id: editingCategory.id, ...formData });
 } else {
 createMutation.mutate(formData);
 }
 };

 const handleEdit = (category: any) => {
 setEditingCategory(category);
 setFormData({
 name: category.name,
 nameJa: category.nameJa,
 slug: category.slug ||"",
 description: category.description ||"",
 descriptionJa: category.descriptionJa ||"",
 });
 setShowDialog(true);
 };

 const handleDelete = (categoryId: number) => {
 if (confirm("이 카테고리를 삭제하시겠습니까?")) {
 deleteMutation.mutate({ id: categoryId });
 }
 };

 // 서버 데이터를 sortOrder 기준으로 정렬
 const serverCategories = (data || []).slice().sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

 // 드래그 후 로컬 순서 적용
 const displayedCategories = localOrder
 ? localOrder.map(id => serverCategories.find((c: any) => c.id === id)).filter(Boolean)
 : serverCategories;

 // 드래그 핸들러
 const handleDragStart = (e: React.DragEvent, id: number) => {
 setDraggedId(id);
 e.dataTransfer.effectAllowed ="move";
 };

 const handleDragOver = (e: React.DragEvent, id: number) => {
 e.preventDefault();
 e.dataTransfer.dropEffect ="move";
 setDragOverId(id);
 };

 const handleDrop = (e: React.DragEvent, targetId: number) => {
 e.preventDefault();
 if (draggedId === null || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return; }
 const currentOrder = localOrder || serverCategories.map((c: any) => c.id);
 const fromIdx = currentOrder.indexOf(draggedId);
 const toIdx = currentOrder.indexOf(targetId);
 const newOrder = [...currentOrder];
 newOrder.splice(fromIdx, 1);
 newOrder.splice(toIdx, 0, draggedId);
 setLocalOrder(newOrder);
 setDraggedId(null);
 setDragOverId(null);
 };

 const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };

 // 드래그 순서 저장
 const saveSortOrder = () => {
 if (!localOrder) return;
 const orders = localOrder.map((id, idx) => ({ id, sortOrder: idx }));
 sortOrderMutation.mutate({ orders });
 };

 // 순위 직접 입력 저장
 const handleSortOrderInput = (categoryId: number, value: string) => {
 const sortOrder = parseInt(value);
 if (!isNaN(sortOrder)) {
 quickSortMutation.mutate({ id: categoryId, sortOrder });
 }
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
 <h2 className="text-xl font-bold">카테고리 관리</h2>
 <Button
 onClick={() => { resetForm(); setShowDialog(true); }}
 className="bg-pink-600 hover:bg-pink-700 flex items-center gap-2"
 >
 <Plus size={16} />
 새 카테고리 등록
 </Button>
 </div>

 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle>카테고리 목록</CardTitle>
 <p className="text-xs text-muted-foreground">순위 숫자가 작을수록 상위 노출 · 드래그로 순서 변경 가능</p>
 </div>
 </CardHeader>

 {/* 드래그 순서 저장 알림 */}
 {localOrder && (
 <div className="mx-6 mb-3 flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
 <span className="text-xs text-yellow-700">순서가 변경되었습니다. 저장하시겠습니까?</span>
 <Button size="sm"className="h-7 text-xs bg-yellow-500 hover:bg-yellow-600"onClick={saveSortOrder} disabled={sortOrderMutation.isPending}>
 <Save className="h-3 w-3 mr-1"/>
 {sortOrderMutation.isPending ?"저장 중...":"순서 저장"}
 </Button>
 <Button size="sm"variant="outline"className="h-7 text-xs"onClick={() => setLocalOrder(null)}>취소</Button>
 </div>
 )}

 <CardContent>
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className="w-8 px-2 py-2 text-left text-xs font-medium text-gray-700"></th>{/* 드래그 핸들 */}
 <th className="w-16 px-3 py-2 text-center text-xs font-medium text-gray-700">순위</th>
 <th className="w-12 px-3 py-2 text-left text-xs font-medium text-gray-700">ID</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">카테고리명 (일본어)</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">카테고리명 (영어)</th>
 <th className="w-20 px-3 py-2 text-center text-xs font-medium text-gray-700">상품 수</th>
 <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">설명</th>
 <th className="w-28 px-3 py-2 text-left text-xs font-medium text-gray-700">작업</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {isLoading ? (
 <tr>
 <td colSpan={8} className="px-3 py-4 text-center text-xs text-gray-500">로딩 중...</td>
 </tr>
 ) : displayedCategories.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-3 py-4 text-center text-xs text-gray-500">카테고리가 없습니다</td>
 </tr>
 ) : (
 displayedCategories.map((category: any) => {
 const isDragging = draggedId === category.id;
 const isDragOver = dragOverId === category.id;
 return (
 <tr
 key={category.id}
 draggable
 onDragStart={(e) => handleDragStart(e, category.id)}
 onDragOver={(e) => handleDragOver(e, category.id)}
 onDrop={(e) => handleDrop(e, category.id)}
 onDragEnd={handleDragEnd}
 className={`hover:bg-gray-50 transition-all ${isDragging ?"opacity-40":""} ${isDragOver ?"border-t-2 border-blue-400":""}`}
 >
 {/* 드래그 핸들 */}
 <td className="px-2 py-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
 <GripVertical className="h-4 w-4"/>
 </td>
 {/* 순위 직접 입력 */}
 <td className="px-3 py-2 text-center">
 <input
 type="number"
 defaultValue={category.sortOrder ?? 0}
 key={`${category.id}-${category.sortOrder}`}
 onBlur={(e) => handleSortOrderInput(category.id, e.target.value)}
 className="w-14 text-xs text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-blue-400"
 title="숫자가 작을수록 상위 노출 (0이 기본)"
 />
 </td>
 <td className="px-3 py-2 text-xs font-medium text-gray-900">{category.id}</td>
 <td className="px-3 py-2 text-xs text-gray-800 font-medium">
 {category.icon && <span className="mr-1">{category.icon}</span>}
 {category.nameJa}
 </td>
 <td className="px-3 py-2 text-xs text-gray-600">{category.name}</td>
 <td className="px-3 py-2 text-xs text-center">
 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
 {category.productCount ?? 0}개
 </span>
 </td>
 <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-xs">
 {category.descriptionJa ||"-"}
 </td>
 <td className="px-3 py-2">
 <div className="flex items-center gap-1">
 <Button variant="outline"size="sm"onClick={() => handleEdit(category)}>
 <Edit className="h-3.5 w-3.5"/>
 </Button>
 <Button variant="outline"size="sm"onClick={() => handleDelete(category.id)} className="text-red-600 hover:text-red-700">
 <Trash2 className="h-3.5 w-3.5"/>
 </Button>
 </div>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </CardContent>
 </Card>

 {/* Category Dialog */}
 <Dialog open={showDialog} onOpenChange={setShowDialog}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{editingCategory ?"카테고리 수정":"신규 카테고리 생성"}</DialogTitle>
 </DialogHeader>

 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">카테고리명 (일본어) *</label>
 <Input
 value={formData.nameJa}
 onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })}
 placeholder="예: 멘탈케어·수면"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">카테고리명 (영어) *</label>
 <Input
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 placeholder="예: mental-care"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">슬러그 *</label>
 <Input
 value={formData.slug}
 onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
 placeholder="예: mental-care-sleep"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">설명 (일본어)</label>
 <Input
 value={formData.descriptionJa}
 onChange={(e) => setFormData({ ...formData, descriptionJa: e.target.value })}
 placeholder="카테고리 설명"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">설명 (영어)</label>
 <Input
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder="Category description"
 />
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
