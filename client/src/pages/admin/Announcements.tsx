import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Trash2, Edit2, Plus, Pin, ChevronDown, ChevronRight, Clock } from "lucide-react";

type AnnouncementCategory = "notice" | "important" | "sale" | "maintenance" | "event";

const CATEGORY_OPTIONS: { value: AnnouncementCategory; label: string; labelKo: string; color: string }[] = [
  { value: "notice",      label: "お知らせ",     labelKo: "공지",     color: "bg-blue-100 text-blue-800" },
  { value: "important",   label: "重要",         labelKo: "중요",     color: "bg-red-100 text-red-800" },
  { value: "sale",        label: "期間限定",      labelKo: "세일",     color: "bg-yellow-100 text-yellow-800" },
  { value: "maintenance", label: "メンテナンス",  labelKo: "점검",     color: "bg-gray-200 text-gray-700" },
  { value: "event",       label: "イベント",      labelKo: "이벤트",   color: "bg-purple-100 text-purple-800" },
];

function CategoryBadge({ category }: { category: string }) {
  const opt = CATEGORY_OPTIONS.find((c) => c.value === category) ?? CATEGORY_OPTIONS[0];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${opt.color}`}>
      {opt.label}
    </span>
  );
}

export default function AdminAnnouncements() {
  const { user, loading } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    titleJa: "",
    contentJa: "",
    isActive: true,
    isPinned: false,
    isExpanded: false,
    category: "notice" as AnnouncementCategory,
    expiresAt: "",
    sortOrder: 0,
    createdAt: "", // 관리자가 작성일 직접 수정 가능
    viewCount: 0, // 관리자가 조회수 직접 수정 가능
  });

  const { data: announcements, isLoading: loadingAnnouncements, refetch } = trpc.announcements.adminGetAll.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const createMutation = trpc.announcements.adminCreate.useMutation({
    onSuccess: () => { resetForm(); refetch(); },
    onError: (error: any) => { console.error("오류:", error.message); },
  });

  const updateMutation = trpc.announcements.adminUpdate.useMutation({
    onSuccess: () => { resetForm(); refetch(); },
    onError: (error: any) => { console.error("오류:", error.message); },
  });

  const deleteMutation = trpc.announcements.adminDelete.useMutation({
    onSuccess: () => { refetch(); },
    onError: (error: any) => { console.error("오류:", error.message); },
  });

  const togglePinMutation = trpc.announcements.adminTogglePin.useMutation({
    onSuccess: () => { refetch(); },
    onError: (error: any) => { console.error("오류:", error.message); },
  });

  const resetForm = () => {
    setFormData({ titleJa: "", contentJa: "", isActive: true, isPinned: false, isExpanded: false, category: "notice", expiresAt: "", sortOrder: 0, createdAt: "", viewCount: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titleJa || !formData.contentJa) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }
    const payload = {
      titleJa: formData.titleJa,
      contentJa: formData.contentJa,
      isActive: formData.isActive,
      isPinned: formData.isPinned,
      isExpanded: formData.isExpanded,
      category: formData.category,
      expiresAt: formData.expiresAt || undefined,
      sortOrder: formData.sortOrder,
      createdAt: formData.createdAt || undefined,
      viewCount: formData.viewCount,
    };
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  // URL ?edit=ID 쿼리 파라미터로 바로 편집 모드 진입
  const [location] = useLocation();
  useEffect(() => {
    if (!announcements || announcements.length === 0) return;
    const searchParams = new URLSearchParams(window.location.search);
    const editId = searchParams.get("edit");
    if (editId) {
      const target = announcements.find((a: any) => a.id === parseInt(editId));
      if (target) handleEdit(target);
    }
  }, [announcements]);

  const handleEdit = (announcement: any) => {
    const expiresAt = announcement.expiresAt
      ? new Date(announcement.expiresAt).toISOString().slice(0, 16)
      : "";
    // createdAt: datetime-local용 포맷 (YYYY-MM-DDTHH:mm)
    const createdAt = announcement.createdAt
      ? new Date(announcement.createdAt).toISOString().slice(0, 16)
      : "";
    setFormData({
      titleJa: announcement.titleJa,
      contentJa: announcement.contentJa,
      isActive: announcement.isActive,
      isPinned: announcement.isPinned ?? false,
      isExpanded: announcement.isExpanded ?? false,
      category: announcement.category ?? "notice",
      expiresAt,
      sortOrder: announcement.sortOrder ?? 0,
      createdAt,
      viewCount: announcement.viewCount ?? 0,
    });
    setEditingId(announcement.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const handleTogglePin = async (id: number) => {
    await togglePinMutation.mutateAsync({ id });
  };

  const handleToggleExpanded = async (id: number, current: boolean) => {
    await updateMutation.mutateAsync({ id, isExpanded: !current });
    refetch();
  };

  const isExpired = (expiresAt: Date | null | undefined) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
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

  if (!user || user.role !== "admin") {
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
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">공지사항 관리</h2>
          <Button
            onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); } }}
            className="bg-pink-600 hover:bg-pink-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showForm ? "취소" : "새 공지사항"}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingId ? "공지사항 수정" : "새 공지사항 작성"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">제목 (일본어) *</label>
                <Input
                  type="text"
                  value={formData.titleJa}
                  onChange={(e) => setFormData({ ...formData, titleJa: e.target.value })}
                  placeholder="タイトルを入力してください"
                  className="border-gray-300"
                />
              </div>

              {/* 내용 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">내용 (일본어) *</label>
                <RichTextEditor
                  value={formData.contentJa}
                  onChange={(val) => setFormData({ ...formData, contentJa: val })}
                  placeholder="内容を入力してください"
                  folder="announcements"
                />
              </div>

              {/* 카테고리 + 만료일 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">카테고리</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as AnnouncementCategory })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.labelKo})
                      </option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <CategoryBadge category={formData.category} />
                    <span className="text-xs text-gray-400 ml-2">미리보기</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    자동 만료일시 <span className="text-gray-400 font-normal">(선택, 이 날짜 이후 자동 비활성화)</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="border-gray-300"
                  />
                  {formData.expiresAt && (
                    <p className="text-xs text-orange-500 mt-1">
                      {new Date(formData.expiresAt).toLocaleString("ko-KR")} 이후 자동 만료
                    </p>
                  )}
                </div>
              </div>

              {/* 정렬 순서 + 작성일 수정 + 조회수 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">정렬 순서 <span className="text-gray-400 font-normal">(숫자가 클수록 상단 표시)</span></label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="border-gray-300 w-32"
                    min={0}
                  />
                </div>
                {editingId && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        작성일 수정 <span className="text-gray-400 font-normal">(수정 시에만 표시)</span>
                      </label>
                      <Input
                        type="datetime-local"
                        value={formData.createdAt}
                        onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                        className="border-gray-300"
                      />
                      {formData.createdAt && (
                        <p className="text-xs text-blue-500 mt-1">
                          {new Date(formData.createdAt).toLocaleString("ko-KR")} 으로 변경
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        조회수 <span className="text-gray-400 font-normal">(수정 시에만 표시)</span>
                      </label>
                      <Input
                        type="number"
                        value={formData.viewCount}
                        onChange={(e) => setFormData({ ...formData, viewCount: parseInt(e.target.value) || 0 })}
                        className="border-gray-300 w-32"
                        min={0}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* 체크박스 옵션 */}
              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 accent-pink-600"
                  />
                  <span className="text-sm font-semibold text-gray-700">활성화</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 accent-pink-600"
                  />
                  <span className="text-sm font-semibold text-gray-700">핀 고정 (상단 고정)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isExpanded}
                    onChange={(e) => setFormData({ ...formData, isExpanded: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 accent-pink-600"
                  />
                  <span className="text-sm font-semibold text-gray-700">기본 펼침 (아코디언 열린 상태)</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  {createMutation.isPending || updateMutation.isPending ? "처리 중..." : editingId ? "수정" : "작성"}
                </Button>
                <Button type="button" onClick={resetForm} variant="outline">취소</Button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">제목</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">카테고리</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">기본 펼침</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">만료일</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">조회수</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">작성일</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">작업</th>
                </tr>
              </thead>
              <tbody>
                {loadingAnnouncements ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">로딩 중...</td>
                  </tr>
                ) : announcements && announcements.length > 0 ? (
                  announcements.map((announcement) => {
                    const expired = isExpired((announcement as any).expiresAt);
                    return (
                      <tr key={announcement.id} className={`border-b hover:bg-gray-50 ${expired ? "opacity-60" : ""}`}>
                        <td className="px-4 py-2 text-xs text-gray-800 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            {announcement.isPinned && <Pin className="w-3 h-3 text-yellow-500 shrink-0" />}
                            <span className="font-semibold truncate">{announcement.titleJa}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <CategoryBadge category={(announcement as any).category ?? "notice"} />
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            expired ? "bg-orange-100 text-orange-700" :
                            announcement.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                          }`}>
                            {expired ? "만료됨" : announcement.isActive ? "활성화" : "비활성화"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <button
                            onClick={() => handleToggleExpanded(announcement.id, (announcement as any).isExpanded ?? false)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              (announcement as any).isExpanded
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {(announcement as any).isExpanded
                              ? <><ChevronDown className="w-3 h-3" /> 펼침</>
                              : <><ChevronRight className="w-3 h-3" /> 닫힘</>
                            }
                          </button>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {(announcement as any).expiresAt ? (
                            <span className={`flex items-center gap-1 ${expired ? "text-orange-500" : "text-gray-500"}`}>
                              <Clock className="w-3 h-3" />
                              {new Date((announcement as any).expiresAt).toLocaleDateString("ko-KR")}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600">{announcement.viewCount}</td>
                        <td className="px-4 py-2 text-xs text-gray-600">
                          {new Date(announcement.createdAt).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleTogglePin(announcement.id)}
                              className={`p-1.5 rounded ${
                                announcement.isPinned ? "text-yellow-600 hover:bg-yellow-50" : "text-gray-400 hover:bg-gray-50"
                              }`}
                              title={announcement.isPinned ? "핀 해제" : "핀 고정"}
                            >
                              <Pin className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(announcement)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="수정"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(announcement.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">공지사항이 없습니다</td>
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
