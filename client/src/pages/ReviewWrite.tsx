import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, ArrowLeft, Star, Upload, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import MyPageSidebar from "@/components/MyPageSidebar";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type ReviewFormData = {
  productId: number;
  orderId: number;
  orderItemId: number;
  rating: number;
  title: string;
  content: string;
  images: string[];
};

export default function ReviewWrite() {
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery();
  const isAuthenticated = !!user;
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState<ReviewFormData>({
    productId: 0,
    orderId: 0,
    orderItemId: 0,
    rating: 5,
    title: "",
    content: "",
    images: [],
  });

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch delivered products for review
  const { data: deliveredProducts = [], isLoading: productsLoading } = trpc.review.getDeliveredProducts.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Create review mutation
  const createReviewMutation = trpc.review.create.useMutation({
    onSuccess: (result: any) => {
      toast.success(`レビューを投稿しました。${result.pointsAwarded}ポイント獲得！`);
      setLocation("/mypage/reviews");
    },
    onError: (e: any) => {
      toast.error(e.message || "レビュー投稿に失敗しました");
    },
  });

  // Handle product selection
  const handleProductSelect = (productId: number) => {
    const product = deliveredProducts.find(p => p.product.id === productId);
    if (product) {
      setSelectedProduct(product);
      setFormData(prev => ({
        ...prev,
        productId: product.product.id,
        orderId: product.orderId,
        orderItemId: product.orderItemId,
      }));
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "rating" ? parseInt(value) : value,
    }));
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("ファイルサイズは5MB以下にしてください");
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, base64],
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error("商品を選択してください");
      return;
    }

    if (formData.rating === 0) {
      toast.error("星の数を選択してください");
      return;
    }

    setIsSubmitting(true);
    try {
      await createReviewMutation.mutateAsync({
        productId: formData.productId,
        orderId: formData.orderId,
        orderItemId: formData.orderItemId,
        rating: formData.rating,
        title: formData.title,
        content: formData.content,
        images: formData.images,
      });
    } finally {
      setIsSubmitting(false);
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
              レビュー投稿にはログインしてください。
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

      <main className="flex-1 container py-6 md:py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/mypage/reviews" className="inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" />
            レビュー一覧に戻る
          </Link>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">レビューを投稿</h1>
          <p className="text-gray-600 mt-1">
            ご購入いただいた商品のレビューをお聞かせください
          </p>
        </div>

        <div className="flex gap-6 lg:gap-8 items-start">
          {/* Sidebar */}
          <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <MyPageSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Selection */}
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>商品を選択</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : deliveredProducts.length === 0 ? (
                    <p className="text-gray-500">レビュー対象の商品がありません</p>
                  ) : (
                    <div className="space-y-3">
                      {deliveredProducts.map((product: any) => (
                        <label
                          key={`${product.orderId}-${product.orderItemId}`}
                          className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedProduct?.orderItemId === product.orderItemId
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="product"
                            value={product.product.id}
                            checked={selectedProduct?.orderItemId === product.orderItemId}
                            onChange={() => handleProductSelect(product.product.id)}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{product.product.name}</p>
                            <p className="text-sm text-gray-500">注文番号: {product.orderId}</p>
                            {product.hasReview && (
                              <p className="text-xs text-green-600 mt-1">✓ レビュー済み</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedProduct && !selectedProduct.hasReview && (
                <>
                  {/* Rating */}
                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle>評価を選択</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                            className="focus:outline-none transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-10 h-10 ${
                                star <= formData.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-3">
                        {formData.rating}つ星を選択しました
                      </p>
                    </CardContent>
                  </Card>

                  {/* Title */}
                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle>タイトル</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <Input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="例: 素晴らしい商品です！"
                        maxLength={100}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {formData.title.length}/100
                      </p>
                    </CardContent>
                  </Card>

                  {/* Content */}
                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle>レビュー内容</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <Textarea
                        name="content"
                        value={formData.content}
                        onChange={handleInputChange}
                        placeholder="商品の感想をお聞かせください..."
                        rows={6}
                        maxLength={2000}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {formData.content.length}/2000
                      </p>
                    </CardContent>
                  </Card>

                  {/* Images */}
                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle>写真を追加（最大5枚）</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {formData.images.length < 5 && (
                        <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <div className="text-center">
                            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">クリックして写真を選択</p>
                            <p className="text-xs text-gray-500">または、ドラッグ＆ドロップ</p>
                          </div>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                      )}

                      {formData.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {formData.images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Review image ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        {formData.images.length}/5枚
                      </p>
                    </CardContent>
                  </Card>

                  {/* Submit Button */}
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={isSubmitting || createReviewMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isSubmitting || createReviewMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          投稿中...
                        </>
                      ) : (
                        "レビューを投稿"
                      )}
                    </Button>
                    <Link href="/mypage/reviews">
                      <Button type="button" variant="outline">
                        キャンセル
                      </Button>
                    </Link>
                  </div>
                </>
              )}

              {selectedProduct && selectedProduct.hasReview && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-6 text-center">
                    <p className="text-yellow-800">
                      この商品のレビューは既に投稿済みです
                    </p>
                  </CardContent>
                </Card>
              )}
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
