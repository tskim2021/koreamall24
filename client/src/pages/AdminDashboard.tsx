import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LayoutDashboard, Package, ShoppingCart, Settings, BarChart3, Plus, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";
import AdminOrdersTab from "@/components/AdminOrdersTab";
import AdminCategoriesTab from "@/components/AdminCategoriesTab";
import AdminBannersTab from "@/components/AdminBannersTab";
import AdminAnnouncementsTab from "@/components/AdminAnnouncementsTab";

import { formatPrice } from "@/../../shared/utils/formatPrice";

interface SetPricingItem {
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  discountPercent: number;
}

interface DiscountTier {
  minQty: number;
  maxQty: number;
  discountPercent: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nameJa: "",
    categoryId: 1,
    price: "",
    originalPrice: "",
    description: "",
    descriptionJa: "",
    imageUrl: "",
    imageUrls: [] as string[],
    isTimeSale: false,
    isMonthlySale: false,
    activeIngredient: "",
    activeIngredientJa: "",
    volume: "",
    brand: "",
    brandJa: "",
    shippingFrom: "",
    deliveryDays: "10-14",
    usageMethod: "",
    usageMethodJa: "",
    sideEffects: "",
    sideEffectsJa: "",
    precautions: "",
    precautionsJa: "",
    contraindications: "",
    contraindicationsJa: "",
    setPricing: [] as SetPricingItem[],
    pointsPercent: 1,
    discountTiers: [] as DiscountTier[],
  });


  const { data: ordersData } = trpc.admin.orders.useQuery({ page: 1, limit: 100 });
  const { data: productsData, refetch: refetchProducts } = trpc.admin.products.list.useQuery({ page: 1, limit: 100 });
  const { data: usersData } = trpc.admin.users.useQuery({ page: 1, limit: 100 });
  const utils = trpc.useUtils();

  const orders = (ordersData as any)?.orders || ordersData || [];
  const products = productsData?.products || [];
  const users = (usersData as any)?.users || [];

  // 통계 계산
  const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
  const totalOrders = Array.isArray(orders) ? orders.length : 0;
  const totalCustomers = users.length;
  const totalProducts = products.length;

  // 상품 관리 뮤테이션
  const createProduct = trpc.admin.createProduct.useMutation({
    onSuccess: () => {
      toast.success("商品を作成しました");
      setShowProductForm(false);
      refetchProducts?.();
      utils.admin.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "商品の作成に失敗しました");
    },
  });

  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      toast.success("商品を更新しました");
      setShowProductForm(false);
      setEditingProductId(null);
      refetchProducts?.();
      utils.admin.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "商品の更新に失敗しました");
    },
  });

  const deleteProduct = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success("商品を削除しました");
      refetchProducts?.();
      utils.admin.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "商品の削除に失敗しました");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      nameJa: "",
      categoryId: 1,
      price: "",
      originalPrice: "",
      description: "",
      descriptionJa: "",
      imageUrl: "",
      imageUrls: [],
      isTimeSale: false,
      isMonthlySale: false,
      activeIngredient: "",
      activeIngredientJa: "",
      volume: "",
      brand: "",
      brandJa: "",
      shippingFrom: "",
      deliveryDays: "10-14",
      usageMethod: "",
      usageMethodJa: "",
      sideEffects: "",
      sideEffectsJa: "",
      precautions: "",
      precautionsJa: "",
      contraindications: "",
      contraindicationsJa: "",
      setPricing: [],
      pointsPercent: 1,
      discountTiers: [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      price: String(formData.price),
      originalPrice: formData.originalPrice ? String(formData.originalPrice) : undefined,
      imageUrls: formData.imageUrls.length > 0 ? JSON.stringify(formData.imageUrls) : undefined,
      setPricing: formData.setPricing.length > 0 ? JSON.stringify(formData.setPricing) : undefined,
    } as any

    if (editingProductId) {
      updateProduct.mutate({
        productId: editingProductId,
        ...payload,
      });
    } else {
      createProduct.mutate(payload);
    }
  };

  const menuItems = [
    { id: "dashboard", label: "ダッシュボード", icon: LayoutDashboard },
    { id: "announcements", label: "公知事項 管理", icon: BarChart3 },
    { id: "categories", label: "카테고리 관리", icon: Package },
    { id: "banners", label: "배너 관리", icon: BarChart3 },
    { id: "products", label: "상품 관리", icon: Package },
    { id: "orders", label: "주문 관리", icon: ShoppingCart },
    { id: "analytics", label: "分析", icon: BarChart3 },
    { id: "settings", label: "설정", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 左サイドバー */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-pink-600">ココくすり</h1>
          <p className="text-xs text-gray-600 mt-1">医薬品・健康商品</p>
          <p className="text-sm text-gray-600 mt-2">管理画面</p>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? "bg-pink-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* ダッシュボード */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">ダッシュボード</h2>
              
              {/* 統計カード */}
              <div className="grid grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">総売上</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{formatPrice(totalRevenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">注文数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{totalOrders}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">顧客数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{totalCustomers}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">商品数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{totalProducts}</p>
                  </CardContent>
                </Card>
              </div>

              {/* 最近の注文 */}
              <Card>
                <CardHeader>
                  <CardTitle>最近の注文</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">注文ID</th>
                          <th className="px-4 py-2 text-left font-semibold">顧客</th>
                          <th className="px-4 py-2 text-left font-semibold">金額</th>
                          <th className="px-4 py-2 text-left font-semibold">ステータス</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((order: any) => (
                          <tr key={order.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">#{order.id}</td>
                            <td className="px-4 py-3">{order.customerName || "N/A"}</td>
                            <td className="px-4 py-3">{formatPrice(order.totalAmount ?? 0)}</td>
                            <td className="px-4 py-3">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {order.status || "pending"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 公知事項管理 */}
          {activeTab === "announcements" && (
            <AdminAnnouncementsTab />
          )}

          {/* カテゴリ管理 */}
          {activeTab === "categories" && (
            <AdminCategoriesTab />
          )}

          {/* バナー管理 */}
          {activeTab === "banners" && (
            <AdminBannersTab />
          )}

          {/* 商品管理 */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">商品管理</h2>
                <Button
                  onClick={() => {
                    if (showProductForm) {
                      setShowProductForm(false);
                      setEditingProductId(null);
                      // 폼을 닫을 때는 resetForm을 호출하지 않음 (데이터 유지)
                    } else {
                      setShowProductForm(true);
                      resetForm(); // 새로운 상품 추가 시에만 초기화
                    }
                  }}
                  className="gap-2 bg-pink-600 hover:bg-pink-700"
                >
                  <Plus className="w-4 h-4" />
                  {showProductForm ? "취소" : "商品を追加"}
                </Button>
              </div>

              {showProductForm && (
                <div className="border rounded-lg p-6 bg-gray-50 max-h-[80vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4">
                    {editingProductId ? "商品を編集" : "新規商品を追加"}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">基本情報</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">商品名（英語）</label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">商品名（日本語）</label>
                          <Input
                            value={formData.nameJa}
                            onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">カテゴリID</label>
                          <Input
                            type="number"
                            value={formData.categoryId}
                            onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">価格（¥）</label>
                          <Input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">説明（英語）</label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">説明（日本語）</label>
                        <Textarea
                          value={formData.descriptionJa}
                          onChange={(e) => setFormData({ ...formData, descriptionJa: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">セット価格オプション</h4>
                      <p className="text-xs text-gray-600">保存済みのセット価格オプションを編集できます。新しいオプションを追加するには下のボタンをクリックしてください。</p>
                      <div className="space-y-3">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left">セット数</th>
                                <th className="px-3 py-2 text-left">一箱あたり</th>
                                <th className="px-3 py-2 text-left">販売価格</th>
                                <th className="px-3 py-2 text-left">割引率（%）</th>
                                <th className="px-3 py-2 text-left">チェック</th>
                                <th className="px-3 py-2 text-left">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.setPricing && formData.setPricing.length > 0 ? (
                                formData.setPricing.map((item, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="px-3 py-2">
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const newPricing = [...formData.setPricing];
                                        newPricing[idx].quantity = parseInt(e.target.value) || 0;
                                        setFormData({ ...formData, setPricing: newPricing });
                                      }}
                                      className="w-20"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="number"
                                      value={item.pricePerUnit}
                                      onChange={(e) => {
                                        const newPricing = [...formData.setPricing];
                                        const pricePerUnit = parseFloat(e.target.value) || 0;
                                        newPricing[idx].pricePerUnit = pricePerUnit;
                                        newPricing[idx].totalPrice = pricePerUnit * item.quantity;
                                        setFormData({ ...formData, setPricing: newPricing });
                                      }}
                                      className="w-24"
                                    />
                                  </td>
                                  <td className="px-3 py-2 font-semibold">{formatPrice(item.totalPrice)}</td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="number"
                                      value={item.discountPercent}
                                      onChange={(e) => {
                                        const newPricing = [...formData.setPricing];
                                        newPricing[idx].discountPercent = parseInt(e.target.value) || 0;
                                        setFormData({ ...formData, setPricing: newPricing });
                                      }}
                                      className="w-20"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={idx === 0}
                                      disabled
                                      className="w-4 h-4"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        const newPricing = formData.setPricing.filter((_, i) => i !== idx);
                                        setFormData({ ...formData, setPricing: newPricing });
                                      }}
                                    >
                                      削除
                                    </Button>
                                  </td>
                                </tr>
                              ))
                              ) : (
                                <tr>
                                  <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                                    セット価格オプションがありません。下のボタンをクリックして追加してください。
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const newPricing = [
                              ...formData.setPricing,
                              { quantity: 1, pricePerUnit: 0, totalPrice: 0, discountPercent: 0 },
                            ];
                            setFormData({ ...formData, setPricing: newPricing });
                          }}
                        >
                          + セット価格を追加
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">割引ティア設定</h4>
                      <div className="space-y-3">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left">最小数量</th>
                                <th className="px-3 py-2 text-left">最大数量</th>
                                <th className="px-3 py-2 text-left">割引率（%）</th>
                                <th className="px-3 py-2 text-left">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.discountTiers.map((tier, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="px-3 py-2">
                                    <Input
                                      type="number"
                                      value={tier.minQty}
                                      onChange={(e) => {
                                        const newTiers = [...formData.discountTiers];
                                        newTiers[idx].minQty = parseInt(e.target.value) || 0;
                                        setFormData({ ...formData, discountTiers: newTiers });
                                      }}
                                      className="w-20"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="number"
                                      value={tier.maxQty}
                                      onChange={(e) => {
                                        const newTiers = [...formData.discountTiers];
                                        newTiers[idx].maxQty = parseInt(e.target.value) || 0;
                                        setFormData({ ...formData, discountTiers: newTiers });
                                      }}
                                      className="w-20"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="number"
                                      value={tier.discountPercent}
                                      onChange={(e) => {
                                        const newTiers = [...formData.discountTiers];
                                        newTiers[idx].discountPercent = parseInt(e.target.value) || 0;
                                        setFormData({ ...formData, discountTiers: newTiers });
                                      }}
                                      className="w-20"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        const newTiers = formData.discountTiers.filter((_, i) => i !== idx);
                                        setFormData({ ...formData, discountTiers: newTiers });
                                      }}
                                    >
                                      削除
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const newTiers = [
                              ...formData.discountTiers,
                              { minQty: 1, maxQty: 5, discountPercent: 0 },
                            ];
                            setFormData({ ...formData, discountTiers: newTiers });
                          }}
                        >
                          + 割引ティアを追加
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">画像</h4>
                      <ImageUploader
                        onImagesSelected={(urls: string[]) => {
                          setFormData({ ...formData, imageUrls: urls, imageUrl: urls[0] || "" });
                        }}
                      />
                      {formData.imageUrls.length > 0 && (
                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm">アップロード済み画像 (ドラッグで順序変更可能)</h5>
                          <div className="grid grid-cols-4 gap-3">
                            {formData.imageUrls.map((url, idx) => (
                              <div
                                key={idx}
                                className="relative group cursor-move"
                                draggable
                                onDragStart={() => setDraggedImageIndex(idx)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                  if (draggedImageIndex !== null && draggedImageIndex !== idx) {
                                    const newUrls = [...formData.imageUrls];
                                    [newUrls[draggedImageIndex], newUrls[idx]] = [newUrls[idx], newUrls[draggedImageIndex]];
                                    setFormData({ ...formData, imageUrls: newUrls, imageUrl: newUrls[0] || "" });
                                    setDraggedImageIndex(null);
                                  }
                                }}
                                onDragEnd={() => setDraggedImageIndex(null)}
                              >
                                <img
                                  src={url}
                                  alt={`Product image ${idx + 1}`}
                                  className="w-full h-24 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                                  onClick={() => setSelectedImageModal(url)}
                                />
                                {idx === 0 && (
                                  <div className="absolute top-1 left-1 bg-pink-600 text-white text-xs px-2 py-1 rounded">
                                    メイン
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newUrls = formData.imageUrls.filter((_, i) => i !== idx);
                                    setFormData({ ...formData, imageUrls: newUrls, imageUrl: newUrls[0] || "" });
                                  }}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 画像プレビューモーダル */}
                    {selectedImageModal && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedImageModal(null)}>
                        <div className="bg-white rounded-lg p-4 max-w-2xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">画像プレビュー</h3>
                            <button onClick={() => setSelectedImageModal(null)} className="text-gray-500 hover:text-gray-700">
                              <X size={24} />
                            </button>
                          </div>
                          <img src={selectedImageModal} alt="Preview" className="w-full max-h-[60vh] object-contain" />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
                        {editingProductId ? "업데이트" : "作成"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowProductForm(false);
                          setEditingProductId(null);
                          // 폼을 닫을 때는 resetForm을 호출하지 않음 (데이터 유지)
                        }}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>商品一覧</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">画像</th>
                          <th className="px-4 py-2 text-left font-semibold">商品名</th>
                          <th className="px-4 py-2 text-left font-semibold">価格</th>
                          <th className="px-4 py-2 text-left font-semibold">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product: any) => (
                          <tr key={product.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              {product.imageUrls ? (
                                <div className="flex gap-2 flex-wrap">
                                  {JSON.parse(product.imageUrls).map((url: string, idx: number) => (
                                    <div key={idx} className="relative group">
                                      <img
                                        src={url}
                                        alt={`Product image ${idx + 1}`}
                                        className="w-12 h-12 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                                        title={`Image ${idx + 1}`}
                                      />
                                      {idx === 0 && (
                                        <div className="absolute top-0 left-0 bg-pink-600 text-white text-xs px-1 py-0.5 rounded-bl">
                                          M
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium">{product.nameJa}</td>
                            <td className="px-4 py-3">{formatPrice(product.price ?? 0)}</td>
                            <td className="px-4 py-3 flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="gap-1"
                                onClick={() => {
                                  setEditingProductId(product.id);
                                  setFormData({
                                    name: product.name || "",
                                    nameJa: product.nameJa || "",
                                    categoryId: product.categoryId || 1,
                                    price: String(product.price || ""),
                                    originalPrice: String(product.originalPrice || ""),
                                    description: product.description || "",
                                    descriptionJa: product.descriptionJa || "",
                                    imageUrl: product.imageUrl || "",
                                    imageUrls: product.imageUrls ? JSON.parse(product.imageUrls) : [],
                                    isTimeSale: product.isTimeSale || false,
                                    isMonthlySale: product.isMonthlySale || false,
                                    activeIngredient: product.activeIngredient || "",
                                    activeIngredientJa: product.activeIngredientJa || "",
                                    volume: product.volume || "",
                                    brand: product.brand || "",
                                    brandJa: product.brandJa || "",
                                    shippingFrom: product.shippingFrom || "",
                                    deliveryDays: product.deliveryDays || "10-14",
                                    usageMethod: product.usageMethod || "",
                                    usageMethodJa: product.usageMethodJa || "",
                                    sideEffects: product.sideEffects || "",
                                    sideEffectsJa: product.sideEffectsJa || "",
                                    precautions: product.precautions || "",
                                    precautionsJa: product.precautionsJa || "",
                                    contraindications: product.contraindications || "",
                                    contraindicationsJa: product.contraindicationsJa || "",
                                    setPricing: product.setPricing ? JSON.parse(product.setPricing) : [],
                                    pointsPercent: product.pointsPercent || 1,
                                    discountTiers: product.discountTiers ? JSON.parse(product.discountTiers) : [],
                                  });
                                  setShowProductForm(true);
                                }}
                              >
                                <Edit2 size={16} /> 編集
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteProduct.mutate({ id: product.id })}
                                className="gap-1"
                              >
                                <Trash2 size={16} /> 削除
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 注文管理 */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">注文管理</h2>
              <AdminOrdersTab />
            </div>
          )}

          {/* 分析 */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">分析</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-600">分析機能は準備中です</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 設定 */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">設定</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-600">設定機能は準備中です</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
