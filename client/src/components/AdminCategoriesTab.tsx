import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function AdminCategoriesTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nameJa: "",
    slug: "",
    description: "",
    descriptionJa: "",
    imageUrl: "",
    sortOrder: 0,
  });

  const categoriesQuery = trpc.admin.categories.useQuery();
  const createCategoryMutation = trpc.admin.createCategory.useMutation();
  const updateCategoryMutation = trpc.admin.updateCategory.useMutation();
  const deleteCategoryMutation = trpc.admin.deleteCategory.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateCategoryMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("카테고리가 업데이트되었습니다.");
      } else {
        await createCategoryMutation.mutateAsync(formData);
        toast.success("카테고리가 생성되었습니다.");
      }

      setFormData({
        name: "",
        nameJa: "",
        slug: "",
        description: "",
        descriptionJa: "",
        imageUrl: "",
        sortOrder: 0,
      });
      setEditingId(null);
      setShowForm(false);
      categoriesQuery.refetch();
    } catch (error) {
      toast.error("오류가 발생했습니다.");
    }
  };

  const handleEdit = (category: any) => {
    setFormData({
      name: category.name || "",
      nameJa: category.nameJa || "",
      slug: category.slug || "",
      description: category.description || "",
      descriptionJa: category.descriptionJa || "",
      imageUrl: category.imageUrl || "",
      sortOrder: category.sortOrder || 0,
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("이 카테고리를 삭제하시겠습니까?")) {
      try {
        await deleteCategoryMutation.mutateAsync({ id });
        toast.success("카테고리가 삭제되었습니다.");
        categoriesQuery.refetch();
      } catch (error) {
        toast.error("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      nameJa: "",
      slug: "",
      description: "",
      descriptionJa: "",
      imageUrl: "",
      sortOrder: 0,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (categoriesQuery.isLoading) {
    return <div className="p-6 text-center">로딩 중...</div>;
  }

  const categories = categoriesQuery.data || [];

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              전체 카테고리
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{categories.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* 카테고리 추가/수정 폼 */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              {editingId ? "카테고리 수정" : "새 카테고리 추가"}
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리명 (한국어)
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="예: 헤어케어"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리명 (일본어)
                  </label>
                  <Input
                    value={formData.nameJa}
                    onChange={(e) =>
                      setFormData({ ...formData, nameJa: e.target.value })
                    }
                    placeholder="예: 헤어케어"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (URL용)
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="hair-care"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명 (한국어)
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="카테고리 설명"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명 (일본어)
                  </label>
                  <Textarea
                    value={formData.descriptionJa}
                    onChange={(e) =>
                      setFormData({ ...formData, descriptionJa: e.target.value })
                    }
                    placeholder="카테고리 설명"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이미지 URL
                  </label>
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    정렬 순서
                  </label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sortOrder: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createCategoryMutation.isPending ||
                    updateCategoryMutation.isPending
                  }
                >
                  {editingId ? "업데이트" : "추가"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 카테고리 추가 버튼 */}
      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          새 카테고리 추가
        </Button>
      )}

      {/* 카테고리 목록 */}
      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            카테고리가 없습니다.
          </p>
        ) : (
          categories.map((category: any) => (
            <Card key={category.id} className="hover:shadow-md transition">
              <div
                className="p-4 cursor-pointer"
                onClick={() =>
                  setExpandedId(
                    expandedId === category.id ? null : category.id
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {category.nameJa}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(category);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(category.id);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {expandedId === category.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {expandedId === category.id && (
                <div className="border-t bg-gray-50 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      Slug
                    </p>
                    <p className="text-sm text-gray-800">{category.slug}</p>
                  </div>

                  {category.description && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">
                        설명 (한국어)
                      </p>
                      <p className="text-sm text-gray-800">
                        {category.description}
                      </p>
                    </div>
                  )}

                  {category.descriptionJa && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">
                        설명 (일본어)
                      </p>
                      <p className="text-sm text-gray-800">
                        {category.descriptionJa}
                      </p>
                    </div>
                  )}

                  {category.imageUrl && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">
                        이미지
                      </p>
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-32 h-32 object-cover rounded"
                      />
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      정렬 순서
                    </p>
                    <p className="text-sm text-gray-800">
                      {category.sortOrder}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
