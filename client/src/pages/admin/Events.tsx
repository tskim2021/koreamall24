import { useState } from"react";
import { useAuth } from"@/_core/hooks/useAuth";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Trash2, Edit2, Plus, Upload, X } from"lucide-react";

export default function AdminEvents() {
 const { user, loading } = useAuth();
 const [showForm, setShowForm] = useState(false);
 const [editingId, setEditingId] = useState<number | null>(null);
 const [uploading, setUploading] = useState(false);
 const [imagePreview, setImagePreview] = useState<string | null>(null);
 const [formData, setFormData] = useState({
 titleJa:"",
 descriptionJa:"",
 imageUrl:"",
 startDate:"",
 endDate:"",
 isActive: true,
 sortOrder: 0,
 });

 const { data: events = [], isLoading: loadingEvents, refetch } = trpc.events.adminGetAll.useQuery();

 const createMutation = trpc.events.adminCreate.useMutation({
 onSuccess: () => {
 console.log("이벤트가 생성되었습니다.");
 resetForm();
 refetch();
 },
 onError: (error: any) => {
 console.error("오류:", error.message);
 },
 });

 const updateMutation = trpc.events.adminUpdate.useMutation({
 onSuccess: () => {
 console.log("이벤트가 업데이트되었습니다.");
 resetForm();
 refetch();
 },
 onError: (error: any) => {
 console.error("오류:", error.message);
 },
 });

 const deleteMutation = trpc.events.adminDelete.useMutation({
 onSuccess: () => {
 console.log("이벤트가 삭제되었습니다.");
 refetch();
 },
 onError: (error: any) => {
 console.error("오류:", error.message);
 },
 });

 const resetForm = () => {
 setFormData({
 titleJa:"",
 descriptionJa:"",
 imageUrl:"",
 startDate:"",
 endDate:"",
 isActive: true,
 sortOrder: 0,
 });
 setEditingId(null);
 setShowForm(false);
 setImagePreview(null);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 if (!formData.titleJa || !formData.descriptionJa || !formData.imageUrl || !formData.startDate || !formData.endDate) {
 console.error("모든 필드를 입력해주세요.");
 return;
 }

 if (editingId) {
 await updateMutation.mutateAsync({
 id: editingId,
 titleJa: formData.titleJa,
 descriptionJa: formData.descriptionJa,
 imageUrl: formData.imageUrl,
 startDate: new Date(formData.startDate),
 endDate: new Date(formData.endDate),
 isActive: formData.isActive,
 sortOrder: formData.sortOrder,
 });
 } else {
 await createMutation.mutateAsync({
 titleJa: formData.titleJa,
 descriptionJa: formData.descriptionJa,
 imageUrl: formData.imageUrl,
 startDate: new Date(formData.startDate),
 endDate: new Date(formData.endDate),
 isActive: formData.isActive,
 sortOrder: formData.sortOrder,
 });
 }
 };

 const handleEdit = (event: any) => {
 setFormData({
 titleJa: event.titleJa,
 descriptionJa: event.descriptionJa,
 imageUrl: event.imageUrl,
 startDate: new Date(event.startDate).toISOString().split('T')[0],
 endDate: new Date(event.endDate).toISOString().split('T')[0],
 isActive: event.isActive,
 sortOrder: event.sortOrder,
 });
 setImagePreview(event.imageUrl);
 setEditingId(event.id);
 setShowForm(true);
 };

 const handleDelete = async (id: number) => {
 if (confirm("정말로 삭제하시겠습니까?")) {
 await deleteMutation.mutateAsync({ id });
 }
 };

 const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 setUploading(true);
 try {
 const reader = new FileReader();
 reader.onload = async (event) => {
 const buffer = event.target?.result;
 if (buffer instanceof ArrayBuffer) {
 try {
 const uploadMutation = trpc.admin.uploadEventImage.useMutation();
 const result = await uploadMutation.mutateAsync({
 file: Buffer.from(buffer),
 fileName: file.name,
 contentType: file.type,
 });
 setFormData({ ...formData, imageUrl: result.url });
 setImagePreview(result.url);
 } catch (error: any) {
 console.error("Upload error:", error.message);
 }
 }
 };
 reader.readAsArrayBuffer(file);
 } finally {
 setUploading(false);
 }
 };

 if (loading) {
 return (
 <AdminLayout>
 <div className="flex items-center justify-center h-96">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
 </div>
 </AdminLayout>
 );
 }

 if (!user || user.role !=="admin") {
 return (
 <AdminLayout>
 <div className="text-center py-12">
 <h1 className="text-2xl font-bold text-gray-800 mb-4">접근 권한이 없습니다</h1>
 </div>
 </AdminLayout>
 );
 }

 return (
 <AdminLayout>
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h2 className="text-xl font-bold">이벤트 관리</h2>
 <button
 onClick={() => {
 resetForm();
 setShowForm(true);
 }}
 className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
 >
 <Plus className="h-4 w-4"/>
 신규 작성
 </button>
 </div>

 {/* Form */}
 {showForm && (
 <div className="bg-white p-6 rounded-lg border border-gray-200">
 <h3 className="text-xl font-semibold mb-4">{editingId ?"이벤트 편집":"신규 이벤트 생성"}</h3>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">제목 (일본어)</label>
 <Input
 type="text"
 value={formData.titleJa}
 onChange={(e) => setFormData({ ...formData, titleJa: e.target.value })}
 placeholder="이벤트 제목"
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">설명 (일본어)</label>
 <Textarea
 value={formData.descriptionJa}
 onChange={(e) => setFormData({ ...formData, descriptionJa: e.target.value })}
 placeholder="이벤트 설명"
 rows={4}
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">이미지</label>
 <div className="space-y-3">
 <div className="flex items-center gap-2">
 <input
 type="file"
 accept="image/*"
 onChange={handleImageUpload}
 disabled={uploading}
 className="hidden"
 id="image-upload"
 />
 <label
 htmlFor="image-upload"
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50"
 >
 <Upload className="h-4 w-4"/>
 {uploading ?"업로드 중...":"이미지 업로드"}
 </label>
 </div>
 {imagePreview && (
 <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
 <img
 src={imagePreview}
 alt="Preview"
 className="w-full h-full object-cover"
 />
 <button
 type="button"
 onClick={() => {
 setImagePreview(null);
 setFormData({ ...formData, imageUrl:""});
 }}
 className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded hover:bg-red-700"
 >
 <X className="h-4 w-4"/>
 </button>
 </div>
 )}
 {!imagePreview && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">또는 이미지 URL</label>
 <Input
 type="url"
 value={formData.imageUrl}
 onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
 placeholder="https://example.com/image.jpg"
 />
 </div>
 )}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
 <Input
 type="date"
 value={formData.startDate}
 onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
 <Input
 type="date"
 value={formData.endDate}
 onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">정렬 순서</label>
 <Input
 type="number"
 value={formData.sortOrder}
 onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
 <select
 value={formData.isActive ?"active":"inactive"}
 onChange={(e) => setFormData({ ...formData, isActive: e.target.value ==="active"})}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 >
 <option value="active">활성</option>
 <option value="inactive">비활성</option>
 </select>
 </div>
 </div>

 <div className="flex gap-2 pt-4">
 <button
 type="submit"
 className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 {editingId ?"업데이트":"생성"}
 </button>
 <button
 type="button"
 onClick={resetForm}
 className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
 >
 취소
 </button>
 </div>
 </form>
 </div>
 )}

 {/* Events List */}
 <div className="bg-white rounded-lg border border-gray-200">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">제목</th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">상태</th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">시작일</th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">종료일</th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">조회수</th>
 <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">작업</th>
 </tr>
 </thead>
 <tbody>
 {loadingEvents ? (
 <tr>
 <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
 로딩 중...
 </td>
 </tr>
 ) : events && events.length > 0 ? (
 events.map((event) => (
 <tr key={event.id} className="border-b hover:bg-gray-50">
 <td className="px-3 py-2 text-xs text-gray-800">
 <div className="font-semibold">{event.titleJa}</div>
 </td>
 <td className="px-3 py-2 text-xs">
 <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
 event.isActive
 ?"bg-green-100 text-green-800"
 :"bg-gray-100 text-gray-800"
 }`}>
 {event.isActive ?"활성":"비활성"}
 </span>
 </td>
 <td className="px-3 py-2 text-xs text-gray-600">
 {new Date(event.startDate).toLocaleDateString("ja-JP")}
 </td>
 <td className="px-3 py-2 text-xs text-gray-600">
 {new Date(event.endDate).toLocaleDateString("ja-JP")}
 </td>
 <td className="px-3 py-2 text-xs text-gray-600">
 {event.viewCount}
 </td>
 <td className="px-6 py-4 text-center">
 <div className="flex justify-center gap-2">
 <button
 onClick={() => handleEdit(event)}
 className="p-2 text-blue-600 hover:bg-blue-50 rounded"
 title="편집"
 >
 <Edit2 className="h-4 w-4"/>
 </button>
 <button
 onClick={() => handleDelete(event.id)}
 className="p-2 text-red-600 hover:bg-red-50 rounded"
 title="삭제"
 >
 <Trash2 className="h-4 w-4"/>
 </button>
 </div>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
 이벤트가 없습니다
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </AdminLayout>
 );
}
