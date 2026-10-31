import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, User, ArrowLeft, Plus, Edit2, Trash2, Check } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import MyPageSidebar from "@/components/MyPageSidebar";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AddressFormData = {
  id?: number;
  label: string;
  recipientNameKanji: string;
  recipientNameHiragana: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string;
  phone: string;
  isDefault: boolean;
};

const prefectures = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県",
  "沖縄県",
];

export default function AddressManagement() {
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery();
  const isAuthenticated = !!user;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    label: "",
    recipientNameKanji: "",
    recipientNameHiragana: "",
    postalCode: "",
    prefecture: "",
    city: "",
    address1: "",
    address2: "",
    phone: "",
    isDefault: false,
  });

  // Fetch addresses
  const { data: addresses = [], isLoading: addressesLoading, refetch: refetchAddresses } = trpc.address.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Mutations
  const createAddressMutation = trpc.address.create.useMutation({
    onSuccess: () => {
      toast.success("配送先を追加しました");
      refetchAddresses();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (e: any) => {
      toast.error(e.message || "配送先追加に失敗しました");
    },
  });

  const updateAddressMutation = trpc.address.update.useMutation({
    onSuccess: () => {
      toast.success("配送先を更新しました");
      refetchAddresses();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (e: any) => {
      toast.error(e.message || "配送先更新に失敗しました");
    },
  });

  const deleteAddressMutation = trpc.address.delete.useMutation({
    onSuccess: () => {
      toast.success("配送先を削除しました");
      refetchAddresses();
    },
    onError: (e: any) => {
      toast.error(e.message || "配送先削除に失敗しました");
    },
  });

  const setDefaultMutation = trpc.address.setDefault.useMutation({
    onSuccess: () => {
      toast.success("デフォルト配送先を設定しました");
      refetchAddresses();
    },
    onError: (e: any) => {
      toast.error(e.message || "設定に失敗しました");
    },
  });

  const resetForm = () => {
    setFormData({
      label: "",
      recipientNameKanji: "",
      recipientNameHiragana: "",
      postalCode: "",
      prefecture: "",
      city: "",
      address1: "",
      address2: "",
      phone: "",
      isDefault: false,
    });
    setEditingId(null);
  };

  const handleEdit = (address: any) => {
    setFormData(address);
    setEditingId(address.id);
    setIsDialogOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      await updateAddressMutation.mutateAsync({
        id: editingId,
        ...formData,
      });
    } else {
      await createAddressMutation.mutateAsync(formData);
    }
  };

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-4">ログインが必須です</h1>
            <p className="text-gray-600 mb-6">
              配送先管理にはログインしてください。
            </p>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => window.location.href = getLoginUrl()}
            >
              ログインページへ
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-8">
          {/* Breadcrumb */}
          <p className="text-sm text-gray-500 mb-4">
            <Link href="/mypage" className="hover:text-gray-700 cursor-pointer">マイページ</Link>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="text-gray-800 font-medium">お届け先住所</span>
          </p>

          <div className="flex gap-6 lg:gap-8 items-start">
            {/* Sidebar */}
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* ── 헤더 배너 (MyOrder 스타일) ── */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="p-4 sm:p-5" style={{backgroundColor: '#fffbeb'}}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">お届け先住所</h1>
                      <p className="text-xs text-primary font-medium mt-0.5">配送先住所を管理できます</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-600">登録住所数</div>
                      <div className="text-2xl font-bold text-primary">{addresses.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 住所追加ボタン ── */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">住所管理</p>
                    <p className="text-sm text-gray-600">配送先住所の追加・編集・削除ができます</p>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        className="bg-primary hover:bg-primary/90 flex-shrink-0"
                        size="sm"
                        onClick={() => resetForm()}
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        新規追加
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingId ? "配送先を編集" : "新規配送先を追加"}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ラベル（例：自宅、会社）</label>
                          <Input type="text" name="label" value={formData.label} onChange={handleInputChange} placeholder="自宅" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">受取人名（漢字） <span className="text-red-500">*</span></label>
                          <Input type="text" name="recipientNameKanji" value={formData.recipientNameKanji} onChange={handleInputChange} placeholder="山田太郎" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">受取人名（フリガナ） <span className="text-red-500">*</span></label>
                          <Input type="text" name="recipientNameHiragana" value={formData.recipientNameHiragana} onChange={handleInputChange} placeholder="やまだたろう" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号 <span className="text-red-500">*</span></label>
                          <Input type="text" name="postalCode" value={formData.postalCode} onChange={handleInputChange} placeholder="100-0001" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">都道府県 <span className="text-red-500">*</span></label>
                          <select name="prefecture" value={formData.prefecture} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm" required>
                            <option value="">選択してください</option>
                            {prefectures.map((pref) => (<option key={pref} value={pref}>{pref}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">市区町村 <span className="text-red-500">*</span></label>
                          <Input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="千代田区" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">住所（番地） <span className="text-red-500">*</span></label>
                          <Input type="text" name="address1" value={formData.address1} onChange={handleInputChange} placeholder="丸の内1-1-1" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">住所（建物名・部屋番号）</label>
                          <Input type="text" name="address2" value={formData.address2} onChange={handleInputChange} placeholder="ビル3階" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">電話番号 <span className="text-red-500">*</span></label>
                          <Input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="090-1234-5678" required />
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="isDefault" name="isDefault" checked={formData.isDefault} onChange={handleInputChange} className="w-4 h-4" />
                          <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">デフォルト配送先として設定</label>
                        </div>
                        <div className="flex gap-3 pt-4">
                          <Button type="submit" disabled={createAddressMutation.isPending || updateAddressMutation.isPending} className="flex-1 bg-primary hover:bg-primary/90">
                            {createAddressMutation.isPending || updateAddressMutation.isPending ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中...</>
                            ) : (editingId ? "更新" : "追加")}
                          </Button>
                          <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); setIsDialogOpen(false); }}>キャンセル</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* ── 住所リスト ── */}
              {addressesLoading ? (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                  <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm font-medium mb-1">配送先がありません</p>
                  <p className="text-xs text-gray-400">新規配送先を追加してください。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address: any) => (
                    <div
                      key={address.id}
                      className={`rounded-xl border bg-white overflow-hidden transition-colors ${
                        address.isDefault
                          ? "border-primary/30 ring-1 ring-primary/20"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="text-sm font-bold text-gray-900">{address.recipientNameKanji}</h3>
                              {address.recipientNameHiragana && (
                                <span className="text-xs text-gray-400">({address.recipientNameHiragana})</span>
                              )}
                              {address.label && (
                                <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">{address.label}</span>
                              )}
                              {address.isDefault && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold">
                                  <Check className="w-3 h-3" />デフォルト
                                </span>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-sm text-gray-700"><span className="text-gray-400 text-xs mr-1">〒</span>{address.postalCode}　{address.prefecture}{address.city}</p>
                              <p className="text-sm text-gray-700">{address.address1}{address.address2 ? ` ${address.address2}` : ""}</p>
                              <p className="text-xs text-gray-400 mt-1"><span className="mr-1">📞</span>{address.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!address.isDefault && (
                              <Button size="sm" variant="outline" onClick={() => setDefaultMutation.mutate({ id: address.id })} disabled={setDefaultMutation.isPending} className="text-xs h-8 px-2.5 hidden sm:flex items-center gap-1">
                                <Check className="w-3 h-3" />デフォルト
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleEdit(address)} className="h-8 w-8 p-0">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => deleteAddressMutation.mutate({ id: address.id })} disabled={deleteAddressMutation.isPending} className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:border-red-300">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        {!address.isDefault && (
                          <div className="mt-3 pt-3 border-t border-gray-100 sm:hidden">
                            <Button size="sm" variant="outline" onClick={() => setDefaultMutation.mutate({ id: address.id })} disabled={setDefaultMutation.isPending} className="text-xs h-7 px-2 w-full">
                              <Check className="w-3 h-3 mr-1" />デフォルトに設定
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
