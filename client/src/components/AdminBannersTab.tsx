import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit2, Trash2, X, Eye, EyeOff, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

type BannerType = "main" | "sidebar_top" | "sidebar_bottom";

interface BannerFormData {
  title: string;
  titleJa: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  sortOrder: number;
  bannerType: BannerType;
  startDate: string;
  endDate: string;
}

const BANNER_SECTIONS: { type: BannerType; label: string; desc: string; ratio: string }[] = [
  {
    type: "main",
    label: "메인 슬라이더 배너",
    desc: "홈 상단 슬라이더에 표시됩니다.",
    ratio: "권장 비율: 4:1 (예: 1200×300px)",
  },
  {
    type: "sidebar_top",
    label: "사이드바 상단 배너",
    desc: "왼쪽 카테고리 목록 위에 표시됩니다.",
    ratio: "권장 비율: 1:1 또는 4:3 (예: 240×180px)",
  },
  {
    type: "sidebar_bottom",
    label: "사이드바 하단 배너",
    desc: "왼쪽 LINE 배너 아래에 표시됩니다.",
    ratio: "권장 비율: 1:1 또는 4:3 (예: 240×180px)",
  },
];

function BannerSection({ bannerType, label, desc, ratio, allBanners, onRefresh }: {
  bannerType: BannerType;
  label: string;
  desc: string;
  ratio: string;
  allBanners: any[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<BannerFormData>({
    title: "",
    titleJa: "",
    imageUrl: "",
    linkUrl: "",
    isActive: true,
    sortOrder: 0,
    bannerType,
    startDate: "",
    endDate: "",
  });

  const createBannerMutation = trpc.admin.createBanner.useMutation();
  const updateBannerMutation = trpc.admin.updateBanner.useMutation();
  const deleteBannerMutation = trpc.admin.deleteBanner.useMutation();
  const uploadBannerImageMutation = trpc.admin.uploadBannerImage.useMutation();

  const banners = allBanners.filter((b: any) => (b.bannerType || "main") === bannerType);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("이미지 파일은 5MB 이하여야 합니다.");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        setPreviewUrl(base64);
        try {
          const result = await uploadBannerImageMutation.mutateAsync({
            file: base64,
            fileName: file.name,
            contentType: file.type,
          });
          setFormData((prev) => ({ ...prev, imageUrl: result.url }));
          toast.success("이미지가 업로드되었습니다.");
        } catch (err: any) {
          toast.error("이미지 업로드 실패: " + err.message);
          setPreviewUrl("");
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      toast.error("이미지 파일을 읽을 수 없습니다.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      toast.error("배너 이미지를 업로드해주세요.");
      return;
    }
    if (!formData.title) {
      toast.error("배너 제목을 입력해주세요.");
      return;
    }
    try {
      if (editingId) {
        await updateBannerMutation.mutateAsync({ id: editingId, ...formData });
        toast.success("배너가 업데이트되었습니다.");
      } else {
        await createBannerMutation.mutateAsync(formData);
        toast.success("배너가 추가되었습니다.");
      }
      resetForm();
      onRefresh();
    } catch (error: any) {
      toast.error("오류가 발생했습니다: " + error.message);
    }
  };

  const toDateInputValue = (val: any) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16);
  };

  const handleEdit = (banner: any) => {
    setFormData({
      title: banner.title || "",
      titleJa: banner.titleJa || "",
      imageUrl: banner.imageUrl || "",
      linkUrl: banner.linkUrl || "",
      isActive: !!banner.isActive,
      sortOrder: banner.sortOrder || 0,
      bannerType,
      startDate: toDateInputValue(banner.startDate),
      endDate: toDateInputValue(banner.endDate),
    });
    setPreviewUrl(banner.imageUrl || "");
    setEditingId(banner.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 배너를 삭제하시겠습니까?")) return;
    try {
      await deleteBannerMutation.mutateAsync({ id });
      toast.success("배너가 삭제되었습니다.");
      onRefresh();
    } catch (error: any) {
      toast.error("삭제 중 오류: " + error.message);
    }
  };

  const handleToggleActive = async (banner: any) => {
    try {
      await updateBannerMutation.mutateAsync({ id: banner.id, isActive: !banner.isActive });
      toast.success(banner.isActive ? "배너를 비활성화했습니다." : "배너를 활성화했습니다.");
      onRefresh();
    } catch (error: any) {
      toast.error("상태 변경 오류: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", titleJa: "", imageUrl: "", linkUrl: "", isActive: true, sortOrder: 0, bannerType, startDate: "", endDate: "" });
    setPreviewUrl("");
    setEditingId(null);
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isSidebar = bannerType !== "main";
  const aspectStyle = isSidebar ? { aspectRatio: "4/3" } : { aspectRatio: "4/1" };

  return (
    <div className="border rounded-xl p-5 bg-white space-y-4">
      {/* 섹션 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-base text-gray-800">{label}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{desc} <span className="text-blue-500">{ratio}</span></p>
        </div>
        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
          {banners.filter((b: any) => b.isActive).length} / {banners.length} 활성
        </span>
      </div>

      {/* 추가/수정 폼 */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex justify-between items-center text-sm">
              <span>{editingId ? "배너 수정" : "새 배너 추가"}</span>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 이미지 업로드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배너 이미지 <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">({ratio}, 최대 5MB)</span>
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors bg-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl || formData.imageUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl || formData.imageUrl}
                        alt="배너 미리보기"
                        className="w-full rounded object-cover mx-auto"
                        style={{ ...aspectStyle, maxWidth: isSidebar ? "240px" : "100%" }}
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                        <span className="text-white text-sm font-medium">클릭하여 변경</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6">
                      <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">클릭하여 이미지 선택</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP 지원</p>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
                {uploading && (
                  <p className="text-sm text-blue-500 mt-1 flex items-center gap-1">
                    <Upload className="w-3 h-3 animate-bounce" />업로드 중...
                  </p>
                )}
                <div className="mt-2">
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) => { setFormData({ ...formData, imageUrl: e.target.value }); setPreviewUrl(e.target.value); }}
                    placeholder="또는 이미지 URL 직접 입력"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* 제목 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">배너 제목 <span className="text-red-500">*</span></label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="배너 식별용 제목" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">배너 제목 (일본어)</label>
                  <Input value={formData.titleJa} onChange={(e) => setFormData({ ...formData, titleJa: e.target.value })} placeholder="例: バナータイトル" />
                </div>
              </div>

              {/* 링크 & 순서 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">클릭 링크 URL</label>
                  <Input value={formData.linkUrl} onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })} placeholder="/search?sort=discount" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">정렬 순서</label>
                  <Input type="number" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              {/* 노출 기간 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">노출 시작일 <span className="text-gray-400 font-normal">(비워두면 즉시 표시)</span></label>
                  <Input type="datetime-local" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">노출 종료일 <span className="text-gray-400 font-normal">(비워두면 무기한)</span></label>
                  <Input type="datetime-local" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="text-sm" />
                </div>
              </div>

              {/* 활성 상태 */}
              <div className="flex items-center gap-2">
                <input type="checkbox" id={`isActive-${bannerType}`} checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                <label htmlFor={`isActive-${bannerType}`} className="text-sm text-gray-700">배너 활성화 (체크 시 사이트에 표시)</label>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={resetForm}>취소</Button>
                <Button type="submit" disabled={createBannerMutation.isPending || updateBannerMutation.isPending || uploading} className="bg-blue-600 hover:bg-blue-700">
                  {editingId ? "업데이트" : "배너 추가"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 추가 버튼 */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1" />새 배너 추가
        </Button>
      )}

      {/* 배너 목록 */}
      <div className="space-y-2">
        {banners.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border border-dashed rounded-lg">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">등록된 배너가 없습니다.</p>
          </div>
        ) : (
          banners.map((banner: any) => (
            <Card key={banner.id} className="overflow-hidden">
              <div className="flex items-stretch">
                <div className={`flex-shrink-0 bg-gray-100 ${isSidebar ? "w-24" : "w-40 md:w-56"}`}>
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" style={{ minHeight: "64px" }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center min-h-[64px]">
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">{banner.title}</h4>
                      {banner.titleJa && <p className="text-xs text-gray-500">{banner.titleJa}</p>}
                      {banner.linkUrl && <p className="text-xs text-blue-500 mt-0.5 truncate max-w-[200px]">→ {banner.linkUrl}</p>}
                      {(banner.startDate || banner.endDate) && (
                        <p className="text-xs text-orange-500 mt-0.5">
                          기간: {banner.startDate ? new Date(banner.startDate).toLocaleDateString("ko-KR") : "즉시"} ~ {banner.endDate ? new Date(banner.endDate).toLocaleDateString("ko-KR") : "무기한"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400">순서: {banner.sortOrder}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${banner.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {banner.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {banner.isActive ? "활성" : "비활성"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => handleToggleActive(banner)} className="text-xs h-7 px-2">
                      {banner.isActive ? <><EyeOff className="w-3 h-3 mr-1" />비활성화</> : <><Eye className="w-3 h-3 mr-1" />활성화</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(banner)} className="text-xs h-7 px-2">
                      <Edit2 className="w-3 h-3 mr-1" />수정
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(banner.id)} className="text-xs h-7 px-2 text-red-500 hover:text-red-700 hover:border-red-300" disabled={deleteBannerMutation.isPending}>
                      <Trash2 className="w-3 h-3 mr-1" />삭제
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminBannersTab() {
  const utils = trpc.useUtils();
  const bannersQuery = trpc.admin.banners.useQuery();
  const allBanners = bannersQuery.data || [];

  const onRefresh = () => utils.admin.banners.invalidate();

  if (bannersQuery.isLoading) {
    return <div className="p-6 text-center text-gray-500">로딩 중...</div>;
  }

  const totalActive = allBanners.filter((b: any) => b.isActive).length;

  return (
    <div className="space-y-6">
      {/* 전체 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">전체 배너</p>
            <p className="text-2xl font-bold text-blue-600">{allBanners.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">활성 배너</p>
            <p className="text-2xl font-bold text-green-600">{totalActive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">비활성 배너</p>
            <p className="text-2xl font-bold text-gray-400">{allBanners.length - totalActive}</p>
          </CardContent>
        </Card>
      </div>

      {/* 3개 섹션 */}
      {BANNER_SECTIONS.map((section) => (
        <BannerSection
          key={section.type}
          bannerType={section.type}
          label={section.label}
          desc={section.desc}
          ratio={section.ratio}
          allBanners={allBanners}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}
