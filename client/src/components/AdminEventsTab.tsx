import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";
import { trpc } from "@/lib/trpc";
import { Trash2, Edit2, Plus } from "lucide-react";
import { toast } from "sonner";

interface EventForm {
  id?: number;
  titleJa: string;
  descriptionJa: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminEventsTab() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventForm>({
    titleJa: "",
    descriptionJa: "",
    imageUrl: "",
    startDate: "",
    endDate: "",
    isActive: true,
    sortOrder: 0,
  });

  // Fetch events
  const { data: eventsData, refetch, isLoading } = trpc.events.adminGetAll.useQuery();

  const createMutation = trpc.events.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("이벤트가 생성되었습니다");
      setForm({
        titleJa: "",
        descriptionJa: "",
        imageUrl: "",
        startDate: "",
        endDate: "",
        isActive: true,
        sortOrder: 0,
      });
      setShowForm(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "이벤트 생성에 실패했습니다");
    },
  });

  const updateMutation = trpc.events.adminUpdate.useMutation({
    onSuccess: () => {
      toast.success("이벤트가 업데이트되었습니다");
      setEditingId(null);
      setForm({
        titleJa: "",
        descriptionJa: "",
        imageUrl: "",
        startDate: "",
        endDate: "",
        isActive: true,
        sortOrder: 0,
      });
      setShowForm(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "이벤트 업데이트에 실패했습니다");
    },
  });

  const deleteMutation = trpc.events.adminDelete.useMutation({
    onSuccess: () => {
      toast.success("이벤트가 삭제되었습니다");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "이벤트 삭제에 실패했습니다");
    },
  });

  const handleSubmit = async () => {
    if (!form.titleJa.trim() || !form.descriptionJa.trim() || !form.imageUrl.trim() || !form.startDate || !form.endDate) {
      toast.error("모든 필드를 입력해주세요");
      return;
    }

    if (new Date(form.startDate) >= new Date(form.endDate)) {
      toast.error("종료일은 시작일보다 이후여야 합니다");
      return;
    }

    if (editingId) {
      await updateMutation.mutateAsync({
        id: editingId,
        titleJa: form.titleJa,
        descriptionJa: form.descriptionJa,
        imageUrl: form.imageUrl,
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        isActive: form.isActive,
        sortOrder: form.sortOrder,
      });
    } else {
      await createMutation.mutateAsync({
        titleJa: form.titleJa,
        descriptionJa: form.descriptionJa,
        imageUrl: form.imageUrl,
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        isActive: form.isActive,
        sortOrder: form.sortOrder,
      });
    }
  };

  const handleEdit = (event: any) => {
    setEditingId(event.id);
    setForm({
      titleJa: event.titleJa,
      descriptionJa: event.descriptionJa,
      imageUrl: event.imageUrl,
      startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : "",
      isActive: event.isActive,
      sortOrder: event.sortOrder,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("이 이벤트를 삭제하시겠습니까?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({
      titleJa: "",
      descriptionJa: "",
      imageUrl: "",
      startDate: "",
      endDate: "",
      isActive: true,
      sortOrder: 0,
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "이벤트 편집" : "새 이벤트 추가"}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">제목</label>
              <Input
                value={form.titleJa}
                onChange={(e) => setForm({ ...form, titleJa: e.target.value })}
                placeholder="이벤트 제목 입력"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">설명</label>
              <Textarea
                value={form.descriptionJa}
                onChange={(e) => setForm({ ...form, descriptionJa: e.target.value })}
                placeholder="이벤트 설명 입력"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">이미지</label>
              <ImageUpload
                onImageUrlChange={(url) => setForm({ ...form, imageUrl: url })}
                currentImageUrl={form.imageUrl}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">시작일</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">종료일</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">정렬 순서</label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">상태</label>
                <select
                  value={form.isActive ? "active" : "inactive"}
                  onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}
                  className="w-full px-3 py-2 border border-border rounded-md"
                >
                  <option value="active">공개</option>
                  <option value="inactive">비공개</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {editingId ? "업데이트" : "추가"}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="bg-white p-6 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">이벤트 목록</h3>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              신규 작성
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : eventsData && eventsData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">제목</th>
                  <th className="px-4 py-2 text-left font-semibold">설명</th>
                  <th className="px-4 py-2 text-left font-semibold">시작일</th>
                  <th className="px-4 py-2 text-left font-semibold">종료일</th>
                  <th className="px-4 py-2 text-left font-semibold">상태</th>
                  <th className="px-4 py-2 text-left font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {eventsData.map((event: any) => (
                  <tr key={event.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{event.titleJa}</td>
                    <td className="px-4 py-3 text-gray-600 line-clamp-2">{event.descriptionJa}</td>
                    <td className="px-4 py-3">
                      {new Date(event.startDate).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(event.endDate).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          event.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {event.isActive ? "공개" : "비공개"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(event)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(event.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            이벤트가 아직 없습니다
          </p>
        )}
      </div>
    </div>
  );
}
