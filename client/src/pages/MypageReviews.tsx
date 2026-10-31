import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toProxyUrl } from "@/lib/imageProxy";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Star, Package, Upload, X, ChevronRight, User, Pencil, Trash2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState } from "react";
import MyPageSidebar from "@/components/MyPageSidebar";
import { Link } from "wouter";
import { toast } from "sonner";

export default function MypageReviews() {
  const { user: _user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: deliveredProducts, isLoading, refetch } = trpc.review.getDeliveredProducts.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: userReviews, refetch: refetchUserReviews } = trpc.review.getUserReviews.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: pendingReviewCount } = trpc.review.getPendingReviewCount.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: reviewPointSettings } = trpc.settings.getReviewPoints.useQuery();

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"write" | "list">("write");

  const createReviewMutation = trpc.review.create.useMutation({
    onSuccess: (data) => {
      setSelectedProduct(null);
      setRating(0);
      setTitle("");
      setContent("");
      setImages([]);
      refetch();
      refetchUserReviews();
      const pts = data?.pointsAwarded ?? 0;
      if (pts > 0) {
        const bd = data?.pointsBreakdown as { base: number; image: number; detail: number } | undefined;
        const lines: string[] = [];
        if (bd?.base) lines.push(`レビュー基本: +${bd.base.toLocaleString()}pt`);
        if (bd?.image) lines.push(`画像投稿ボーナス: +${bd.image.toLocaleString()}pt`);
        if (bd?.detail) lines.push(`詳細レビューボーナス: +${bd.detail.toLocaleString()}pt`);
        toast.success(
          <div className="flex flex-col gap-2">
            <div className="font-bold text-base">レビューを投稿しました 🎉</div>
            <div className="text-sm text-green-700 font-semibold">
              ストアポイント <span className="text-lg font-bold">+{pts.toLocaleString()}pt</span> 積立完了！
            </div>
            {lines.length > 0 && (
              <div className="text-xs text-gray-500 space-y-0.5">
                {lines.map((line, i) => <div key={i}>• {line}</div>)}
              </div>
            )}
            <button
              onClick={() => setLocation("/mypage/points")}
              className="mt-1 w-full text-center text-xs bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1.5 font-medium transition-colors"
            >
              ポイント履歴を確認する →
            </button>
          </div>,
          { duration: 8000, style: { minWidth: "280px" } }
        );
      } else {
        toast.success("レビューが投稿されました");
      }
    },
    onError: (error) => {
      toast.error(error.message || "レビューの投稿に失敗しました");
    },
  });

  const updateReviewMutation = trpc.review.update.useMutation({
    onSuccess: () => {
      toast.success("レビューが更新されました");
      setEditingReview(null);
      setRating(0);
      setTitle("");
      setContent("");
      setImages([]);
      refetchUserReviews();
    },
    onError: () => {
      toast.error("レビューの更新に失敗しました");
    },
  });

  const deleteReviewMutation = trpc.review.delete.useMutation({
    onSuccess: () => {
      toast.success("レビューが削除されました");
      refetchUserReviews();
      refetch();
    },
    onError: () => {
      toast.error("レビューの削除に失敗しました");
    },
  });

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-4">ログインが必要です</h1>
            <p className="text-gray-600 mb-6">レビューを書くにはログインしてください。</p>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setLocation("/login")}>
              ログインページへ
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > 5) {
      toast.error("画像は最大5枚までアップロードできます");
      return;
    }
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (file.size > 5 * 1024 * 1024) { toast.error("画像サイズは5MB以下にしてください"); return null; }
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });
      const uploadedUrls = (await Promise.all(uploadPromises)).filter((url): url is string => url !== null);
      setImages([...images, ...uploadedUrls]);
      toast.success("画像が追加されました");
    } catch {
      toast.error("画像の読み込みに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => setImages(images.filter((_, i) => i !== index));

  const handleSubmitReview = () => {
    if (editingReview) {
      if (rating < 1) { toast.error("評価を選択してください"); return; }
      updateReviewMutation.mutate({ reviewId: editingReview.id, rating, title: title || undefined, content: content || undefined, images: images.length > 0 ? images : undefined });
    } else {
      if (!selectedProduct) return;
      if (rating < 1) { toast.error("評価を選択してください"); return; }
      createReviewMutation.mutate({ productId: selectedProduct.product.id, orderId: selectedProduct.orderId, orderItemId: selectedProduct.orderItemId, rating, title: title || undefined, content: content || undefined, images: images.length > 0 ? images : undefined });
    }
  };

  const handleEditReview = (review: any) => {
    setEditingReview(review);
    setRating(review.rating);
    setTitle(review.title || "");
    setContent(review.content || "");
    setImages(Array.isArray(review.images) ? review.images : (review.images ? JSON.parse(review.images as unknown as string) : []));
    setViewMode("write");
  };

  const handleDeleteReview = (reviewId: number) => {
    if (confirm("このレビューを削除してもよろしいですか？")) deleteReviewMutation.mutate({ reviewId });
  };

  const renderStars = (currentRating: number, editable = false, onChange?: (r: number) => void) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => editable && onChange?.(i)} disabled={!editable}
          className={editable ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}>
          <Star className={`w-6 h-6 ${i <= currentRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
        </button>
      ))}
    </div>
  );

  const totalReviews = userReviews?.length ?? 0;
  const pendingCount = pendingReviewCount ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/mypage" className="flex items-center gap-1 text-primary hover:underline font-medium">
            <ChevronRight className="w-4 h-4 rotate-180" />
            マイページに戻る
          </Link>
        </div>

        <div className="flex gap-6 lg:gap-8 items-start">
          <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <MyPageSidebar />
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            {/* Header Banner */}
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-5 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  レビュー管理
                </h1>
                <p className="text-sm text-amber-700 mt-0.5">ご購入商品のレビューを投稿してポイントをゲット</p>
                {reviewPointSettings && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                      <Gift className="w-3 h-3" />
                      最大 +{reviewPointSettings.max.toLocaleString()}P 獲得可能
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 bg-white border border-amber-200 text-amber-700 rounded-full text-xs">
                      基本 +{reviewPointSettings.base.toLocaleString()}P
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 bg-white border border-amber-200 text-amber-700 rounded-full text-xs">
                      画像 +{reviewPointSettings.image.toLocaleString()}P
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 bg-white border border-amber-200 text-amber-700 rounded-full text-xs">
                      詳細 +{reviewPointSettings.detail.toLocaleString()}P
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-xs text-gray-500">投稿済み</p>
                  <p className="text-2xl font-bold text-primary">{totalReviews}</p>
                </div>
                {pendingCount > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">未投稿</p>
                    <p className="text-2xl font-bold text-red-500">{pendingCount}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tab + Content Card */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => { setViewMode("write"); setEditingReview(null); setSelectedProduct(null); setRating(0); setTitle(""); setContent(""); setImages([]); }}
                  className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors ${viewMode === "write" ? "text-primary border-b-2 border-primary bg-amber-50/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                >
                  <Star className="w-4 h-4" />
                  レビューを書く
                  {pendingCount > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingCount}</span>
                  )}
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors ${viewMode === "list" ? "text-primary border-b-2 border-primary bg-amber-50/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                >
                  <Package className="w-4 h-4" />
                  作成したレビュー
                  {totalReviews > 0 && (
                    <span className="ml-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-full px-1.5 py-0.5">{totalReviews}</span>
                  )}
                </button>
              </div>

              <div className="p-5">
                {/* WRITE TAB */}
                {viewMode === "write" && (
                  <div className="space-y-4">
                    {/* Review form */}
                    {(selectedProduct || editingReview) && (
                      <div className="border border-primary/30 bg-amber-50/30 rounded-xl p-5 space-y-4">
                        {selectedProduct && (
                          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                            <img src={toProxyUrl(selectedProduct.product.imageUrl) || "/placeholder.png"} alt={selectedProduct.product.nameJa} className="w-14 h-14 object-cover rounded-lg border border-gray-100 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900 line-clamp-2">{selectedProduct.product.nameJa}</p>
                              <p className="text-xs text-gray-500 mt-0.5">注文番号: {selectedProduct.orderNumber}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedProduct(null); setRating(0); setTitle(""); setContent(""); setImages([]); }} className="shrink-0 text-xs">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                        {editingReview && (
                          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                            <p className="text-sm font-semibold text-primary">レビューを編集中</p>
                            <Button size="sm" variant="outline" onClick={() => { setEditingReview(null); setRating(0); setTitle(""); setContent(""); setImages([]); }} className="text-xs">キャンセル</Button>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">評価 <span className="text-red-500">*</span></label>
                          {renderStars(rating, true, setRating)}
                          {rating > 0 && <p className="text-xs text-gray-500 mt-1">{["", "非常に不満", "不満", "普通", "満足", "非常に満足"][rating]}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">タイトル</label>
                          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="レビューのタイトルを入力してください" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">レビュー内容</label>
                          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="商品についての感想を詳しく書いてください（詳細レビューでボーナスポイントGET！）" rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">画像 <span className="text-xs font-normal text-gray-400">（最大5枚・画像投稿でボーナスポイント）</span></label>
                          <div className="flex flex-wrap gap-2">
                            {images.map((img, idx) => (
                              <div key={idx} className="relative w-20 h-20">
                                <img src={img} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                <button onClick={() => handleRemoveImage(idx)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"><X className="w-3 h-3" /></button>
                              </div>
                            ))}
                            {images.length < 5 && (
                              <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-amber-50/30 transition-colors">
                                <Upload className="w-5 h-5 text-gray-400" />
                                <span className="text-xs text-gray-400 mt-1">追加</span>
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                              </label>
                            )}
                          </div>
                        </div>
                        <Button onClick={handleSubmitReview} disabled={createReviewMutation.isPending || updateReviewMutation.isPending || rating < 1} className="w-full">
                          {editingReview ? "レビューを更新する" : "レビューを投稿する"}
                        </Button>
                      </div>
                    )}

                    {/* Product list */}
                    {isLoading ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex gap-3 p-4 border border-gray-100 rounded-xl animate-pulse">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-2 py-1"><div className="h-4 bg-gray-100 rounded w-3/4" /><div className="h-3 bg-gray-100 rounded w-1/2" /></div>
                          </div>
                        ))}
                      </div>
                    ) : deliveredProducts && deliveredProducts.length > 0 ? (
                      <div className="space-y-3">
                        {(() => {
                          const orderGroups = deliveredProducts.reduce((acc: any, item: any) => {
                            if (!acc[item.orderId]) acc[item.orderId] = [];
                            acc[item.orderId].push(item);
                            return acc;
                          }, {});
                          return Object.entries(orderGroups).map(([orderId, items]: [string, any]) => {
                            const orderItems = items as any[];
                            const totalItems = orderItems.length;
                            const reviewedItems = orderItems.filter((item: any) => item.hasReview).length;
                            const progress = Math.round((reviewedItems / totalItems) * 100);
                            return (
                              <div key={orderId} className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700">注文番号: {orderItems[0].orderNumber}</p>
                                    <p className="text-xs text-gray-400">{new Date(orderItems[0].orderDate).toLocaleDateString("ja-JP")}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                      <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
                                    </div>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">{reviewedItems}/{totalItems}</span>
                                  </div>
                                </div>
                                <div className="divide-y divide-gray-50">
                                  {orderItems.map((item: any) => (
                                    <div key={`${item.orderId}-${item.product.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                      <img src={toProxyUrl(item.product.imageUrl) || "/placeholder.png"} alt={item.product.nameJa} className="w-12 h-12 object-cover rounded-lg border border-gray-100 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.product.nameJa}</p>
                                        {item.hasReview && <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">レビュー済み</span>}
                                      </div>
                                      <Button size="sm" onClick={() => { setSelectedProduct(item); setEditingReview(null); setRating(0); setTitle(""); setContent(""); setImages([]); }} disabled={item.hasReview} variant={item.hasReview ? "outline" : "default"} className="shrink-0 text-xs">
                                        {item.hasReview ? "投稿済み" : "書く"}
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : !selectedProduct && !editingReview ? (
                      <div className="text-center py-12">
                        <Package className="w-14 h-14 mx-auto text-gray-200 mb-4" />
                        <h2 className="text-base font-bold text-gray-700 mb-2">レビュー可能な商品がありません</h2>
                        <p className="text-sm text-gray-400 mb-6">配送完了した商品のレビューを書くことができます</p>
                        <Link href="/"><Button variant="outline" size="sm">ショッピングを続ける</Button></Link>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* LIST TAB */}
                {viewMode === "list" && (
                  <div className="space-y-3">
                    {userReviews && userReviews.length > 0 ? (
                      userReviews.map((review: any) => (
                        <div key={review.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50/50 transition-colors">
                          <div className="flex gap-3">
                            {review.product?.imageUrl && (
                              <img src={toProxyUrl(review.product.imageUrl) || "/placeholder.png"} alt={review.product.nameJa} className="w-14 h-14 object-cover rounded-lg border border-gray-100 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-500 mb-0.5">{review.product?.nameJa}</p>
                                  <div className="flex items-center gap-2 mb-1">
                                    {renderStars(review.rating)}
                                    <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString("ja-JP")}</span>
                                  </div>
                                  {review.title && <p className="text-sm font-semibold text-gray-900 mb-1">{review.title}</p>}
                                  {review.content && <p className="text-sm text-gray-600 line-clamp-3">{review.content}</p>}
                                  {review.images && (Array.isArray(review.images) ? review.images : []).length > 0 && (
                                    <div className="flex gap-1.5 mt-2">
                                      {(Array.isArray(review.images) ? review.images : []).slice(0, 4).map((img: string, i: number) => (
                                        <img key={i} src={img} alt="" className="w-12 h-12 object-cover rounded border border-gray-100" />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <Button size="sm" variant="outline" onClick={() => handleEditReview(review)} className="text-xs gap-1"><Pencil className="w-3 h-3" />編集</Button>
                                  <Button size="sm" variant="outline" onClick={() => handleDeleteReview(review.id)} disabled={deleteReviewMutation.isPending} className="text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"><Trash2 className="w-3 h-3" />削除</Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Star className="w-14 h-14 mx-auto text-gray-200 mb-4" />
                        <h2 className="text-base font-bold text-gray-700 mb-2">まだレビューがありません</h2>
                        <p className="text-sm text-gray-400 mb-6">レビューを投稿してポイントをゲットしましょう</p>
                        <Button variant="outline" size="sm" onClick={() => setViewMode("write")}>レビューを書く</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
