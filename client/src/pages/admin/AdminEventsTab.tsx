import { useState } from"react";
import { trpc } from"@/lib/trpc";
import { Button } from"@/components/ui/button";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from"@/components/ui/dialog";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Edit2, Trash2, Plus } from"lucide-react";

interface EventForm {
 titleJa: string;
 descriptionJa: string;
 imageUrl: string;
 startDate: string;
 endDate: string;
}

export default function AdminEventsTab() {
 const [isOpen, setIsOpen] = useState(false);
 const [editingId, setEditingId] = useState<number | null>(null);
 const [formData, setFormData] = useState<EventForm>({
 titleJa:"",
 descriptionJa:"",
 imageUrl:"",
 startDate:"",
 endDate:"",
 });

 const { data: events = [], refetch } = trpc.events.getAll.useQuery();
 const createMutation = trpc.events.adminCreate.useMutation({
 onSuccess: () => {
 alert("이벤트가 생성되었습니다");
 refetch();
 setIsOpen(false);
 setFormData({
 titleJa:"",
 descriptionJa:"",
 imageUrl:"",
 startDate:"",
 endDate:"",
 });
 },
 onError: (error) => {
 alert("오류:"+ (error.message ||"이벤트 생성에 실패했습니다"));
 },
 });

 const updateMutation = trpc.events.adminUpdate.useMutation({
 onSuccess: () => {
 alert("이벤트가 업데이트되었습니다");
 refetch();
 setIsOpen(false);
 setEditingId(null);
 setFormData({
 titleJa:"",
 descriptionJa:"",
 imageUrl:"",
 startDate:"",
 endDate:"",
 });
 },
 onError: (error) => {
 alert("오류:"+ (error.message ||"이벤트 업데이트에 실패했습니다"));
 },
 });

 const deleteMutation = trpc.events.adminDelete.useMutation({
 onSuccess: () => {
 alert("이벤트가 삭제되었습니다");
 refetch();
 },
 onError: (error) => {
 alert("오류:"+ (error.message ||"이벤트 삭제에 실패했습니다"));
 },
 });

 const handleOpenCreate = () => {
 setEditingId(null);
 setFormData({
 titleJa:"",
 descriptionJa:"",
 imageUrl:"",
 startDate:"",
 endDate:"",
 });
 setIsOpen(true);
 };

 const handleOpenEdit = (event: any) => {
 setEditingId(event.id);
 setFormData({
 titleJa: event.titleJa,
 descriptionJa: event.descriptionJa,
 imageUrl: event.imageUrl,
 startDate: new Date(event.startDate).toISOString().split("T")[0],
 endDate: new Date(event.endDate).toISOString().split("T")[0],
 });
 setIsOpen(true);
 };

 const handleSubmit = () => {
 if (!formData.titleJa || !formData.descriptionJa || !formData.imageUrl) {
 alert("모든 필수 항목을 입력해주세요");
 return;
 }

 const payload = {
 titleJa: formData.titleJa,
 descriptionJa: formData.descriptionJa,
 imageUrl: formData.imageUrl,
 startDate: new Date(formData.startDate),
 endDate: new Date(formData.endDate),
 };

 if (editingId) {
 updateMutation.mutate({
 id: editingId,
 ...payload,
 });
 } else {
 createMutation.mutate(payload);
 }
 };

 const handleDelete = (id: number) => {
 if (confirm("이 이벤트를 삭제하시겠습니까?")) {
 deleteMutation.mutate({ id });
 }
 };

 return (
 <div>
 <div className="mb-6 flex justify-between items-center">
 <h2 className="text-xl font-bold text-gray-800">이벤트 관리</h2>
 <Button onClick={handleOpenCreate} className="bg-pink-600 hover:bg-pink-700">
 <Plus className="mr-2 h-4 w-4"/>
 신규 작성
 </Button>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-gray-100 border-b">
 <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">제목</th>
 <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">시작일</th>
 <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">종료일</th>
 <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">작업</th>
 </tr>
 </thead>
 <tbody>
 {events.map((event: any) => (
 <tr key={event.id} className="border-b hover:bg-gray-50">
 <td className="px-4 py-3 text-sm text-gray-700">{event.titleJa}</td>
 <td className="px-4 py-3 text-sm text-gray-700">
 {new Date(event.startDate).toLocaleDateString("ja-JP")}
 </td>
 <td className="px-4 py-3 text-sm text-gray-700">
 {new Date(event.endDate).toLocaleDateString("ja-JP")}
 </td>
 <td className="px-4 py-3 text-center">
 <button
 onClick={() => handleOpenEdit(event)}
 className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200 mr-2"
 >
 <Edit2 className="h-4 w-4"/>
 편집
 </button>
 <button
 onClick={() => handleDelete(event.id)}
 className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
 >
 <Trash2 className="h-4 w-4"/>
 삭제
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {events.length === 0 && (
 <div className="text-center py-8 text-gray-500">
 <p>이벤트가 아직 등록되지 않았습니다</p>
 </div>
 )}

 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>
 {editingId ?"이벤트 편집":"신규 이벤트 생성"}
 </DialogTitle>
 </DialogHeader>

 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 제목 *
 </label>
 <Input
 value={formData.titleJa}
 onChange={(e) =>
 setFormData({ ...formData, titleJa: e.target.value })
 }
 placeholder="이벤트 제목"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 설명 *
 </label>
 <Textarea
 value={formData.descriptionJa}
 onChange={(e) =>
 setFormData({ ...formData, descriptionJa: e.target.value })
 }
 placeholder="이벤트 설명"
 rows={3}
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 이미지URL *
 </label>
 <Input
 value={formData.imageUrl}
 onChange={(e) =>
 setFormData({ ...formData, imageUrl: e.target.value })
 }
 placeholder="https://example.com/image.jpg"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 시작일 *
 </label>
 <Input
 type="date"
 value={formData.startDate}
 onChange={(e) =>
 setFormData({ ...formData, startDate: e.target.value })
 }
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 종료일 *
 </label>
 <Input
 type="date"
 value={formData.endDate}
 onChange={(e) =>
 setFormData({ ...formData, endDate: e.target.value })
 }
 />
 </div>
 </div>

 <DialogFooter>
 <Button
 variant="outline"
 onClick={() => setIsOpen(false)}
 >
 취소
 </Button>
 <Button
 onClick={handleSubmit}
 className="bg-pink-600 hover:bg-pink-700"
 disabled={createMutation.isPending || updateMutation.isPending}
 >
 {editingId ?"업데이트":"생성"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
