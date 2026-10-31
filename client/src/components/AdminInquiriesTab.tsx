import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Trash2, Edit2, Plus } from "lucide-react";

interface InquiryForm {
  id?: number;
  titleJa: string;
  contentJa: string;
  isActive: boolean;
  sortOrder: number;
  isPrivate: boolean;
}

export default function AdminInquiriesTab() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<InquiryForm>({
    titleJa: "",
    contentJa: "",
    isActive: true,
    sortOrder: 0,
    isPrivate: false,
  });

  // Fetch inquiries
  const { data: inquiriesData, refetch } = trpc.inquiries.adminGetAll.useQuery();

  const createMutation = trpc.inquiries.adminCreate.useMutation({
    onSuccess: () => {
      setForm({ titleJa: "", contentJa: "", isActive: true, sortOrder: 0, isPrivate: false });
      refetch();
    },
  });

  const updateMutation = trpc.inquiries.adminUpdate.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setForm({ titleJa: "", contentJa: "", isActive: true, sortOrder: 0, isPrivate: false });
      refetch();
    },
  });

  const deleteMutation = trpc.inquiries.adminDelete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleSubmit = async () => {
    if (!form.titleJa.trim() || !form.contentJa.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    if (editingId) {
      await updateMutation.mutateAsync({
        id: editingId,
        titleJa: form.titleJa,
        contentJa: form.contentJa,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
        isPrivate: form.isPrivate,
      });
    } else {
      await createMutation.mutateAsync({
        titleJa: form.titleJa,
        contentJa: form.contentJa,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
        isPrivate: form.isPrivate,
      });
    }
  };

  const handleEdit = (inquiry: any) => {
    setEditingId(inquiry.id);
    setForm({
      titleJa: inquiry.titleJa,
      contentJa: inquiry.contentJa,
      isActive: inquiry.isActive,
      sortOrder: inquiry.sortOrder,
      isPrivate: inquiry.isPrivate || false,
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("이 문의를 삭제하시겠습니까?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ titleJa: "", contentJa: "", isActive: true, sortOrder: 0, isPrivate: false });
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? "문의 편집" : "새 문의 추가"}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">제목</label>
            <Input
              value={form.titleJa}
              onChange={(e) => setForm({ ...form, titleJa: e.target.value })}
              placeholder="문의 제목 입력"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">내용</label>
            <Textarea
              value={form.contentJa}
              onChange={(e) => setForm({ ...form, contentJa: e.target.value })}
              placeholder="문의 내용 입력"
              rows={5}
            />
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

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isPrivate}
                onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm font-medium">비밀 문의 (작성자만 표시)</span>
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {editingId ? "업데이트" : "추가"}
            </Button>
            {editingId && (
              <Button
                onClick={handleCancel}
                variant="outline"
              >
                취소
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="bg-white p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">문의 목록</h3>

        {inquiriesData && inquiriesData.length > 0 ? (
          <div className="space-y-3">
            {inquiriesData.map((inquiry: any) => (
              <div
                key={inquiry.id}
                className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{inquiry.titleJa}</h4>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        inquiry.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {inquiry.isActive ? "공개" : "비공개"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {inquiry.contentJa}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    작성일: {new Date(inquiry.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(inquiry)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(inquiry.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            문의가 아직 없습니다
          </p>
        )}
      </div>
    </div>
  );
}
