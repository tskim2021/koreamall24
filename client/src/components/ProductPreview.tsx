import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getOptimizedSrc } from "@/components/OptimizedImage";
import { useState, useMemo } from "react";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import {
  Star,
  ShoppingCart,
  Truck,
  Shield,
  CheckCircle,
  AlertTriangle,
  Eye,
  Clock,
  Package,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";

interface ProductPreviewProps {
  product: {
    name: string;
    nameJa: string;
    description: string;
    descriptionJa: string;
    price: string;
    originalPrice: string;
    stock: string;
    imageUrl: string;
    categoryId: number;
    rating?: string;
    reviewCount?: number;
    viewCount?: number;
    salesCount?: number;
    isTimeSale?: boolean;
    isMonthlySale?: boolean;
    deliveryDays?: string;
    pointsPercent?: number;
  };
  salesInfo?: {
    timeSaleDiscountPercent: number;
    monthlySaleDiscountPercent: number;
    timeSaleStartAt: string;
    timeSaleEndAt: string;
  };
  seoData?: {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
  };
  images: string[];
}

type DeviceMode = "desktop" | "tablet" | "mobile";

export function ProductPreview({ product, salesInfo, seoData, images }: ProductPreviewProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const price = parseFloat(product.price) || 0;
  const originalPrice = parseFloat(product.originalPrice) || 0;
  const discount = originalPrice > 0 ? Math.round((1 - price / originalPrice) * 100) : 0;
  const stock = parseInt(product.stock) || 0;
  const pointsEarned = Math.floor(price * (product.pointsPercent || 1) / 100);

  const displayImages = useMemo(() => {
    if (images.length > 0) return images;
    if (product.imageUrl) return [product.imageUrl];
    return [];
  }, [images, product.imageUrl]);

  const isTimeSaleActive = useMemo(() => {
    if (!salesInfo?.timeSaleDiscountPercent) return false;
    if (!salesInfo.timeSaleStartAt || !salesInfo.timeSaleEndAt) return false;
    const now = new Date();
    return now >= new Date(salesInfo.timeSaleStartAt) && now <= new Date(salesInfo.timeSaleEndAt);
  }, [salesInfo]);

  const containerWidth = deviceMode === "mobile" ? "max-w-[375px]" : deviceMode === "tablet" ? "max-w-[768px]" : "max-w-full";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-bold">顧客ページプレビュー</CardTitle>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDeviceMode("desktop")}
              className={`p-1.5 rounded-md transition-colors ${deviceMode === "desktop" ? "bg-white shadow-sm text-primary" : "text-gray-500 hover:text-gray-700"}`}
              title="デスクトップ"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode("tablet")}
              className={`p-1.5 rounded-md transition-colors ${deviceMode === "tablet" ? "bg-white shadow-sm text-primary" : "text-gray-500 hover:text-gray-700"}`}
              title="タブレット"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode("mobile")}
              className={`p-1.5 rounded-md transition-colors ${deviceMode === "mobile" ? "bg-white shadow-sm text-primary" : "text-gray-500 hover:text-gray-700"}`}
              title="モバイル"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* SEO 미리보기 */}
        {seoData && (seoData.metaTitle || seoData.metaDescription) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">検索結果プレビュー</h4>
            <div className="space-y-1">
              <p className="text-lg text-blue-700 hover:underline cursor-pointer truncate">
                {seoData.metaTitle || product.nameJa || product.name}
              </p>
              <p className="text-xs text-green-700">https://kusuri-mall.com/products/{product.nameJa?.toLowerCase().replace(/\s+/g, "-") || "product"}</p>
              <p className="text-sm text-gray-600 line-clamp-2">
                {seoData.metaDescription || product.descriptionJa?.slice(0, 160) || product.description?.slice(0, 160)}
              </p>
            </div>
          </div>
        )}

        {/* 디바이스 프레임 */}
        <div className={`mx-auto transition-all duration-300 ${containerWidth}`}>
          <div className={`border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm ${deviceMode === "mobile" ? "rounded-3xl border-4 border-gray-800" : ""}`}>
            {/* 모바일 노치 */}
            {deviceMode === "mobile" && (
              <div className="bg-gray-800 h-6 flex items-center justify-center">
                <div className="w-20 h-3 bg-gray-900 rounded-full" />
              </div>
            )}

            {/* 페이지 콘텐츠 */}
            <div className={`overflow-y-auto ${deviceMode === "mobile" ? "max-h-[600px]" : "max-h-[700px]"}`}>
              {/* 브레드크럼 */}
              <div className="bg-gray-50 border-b py-2 px-4">
                <nav className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="hover:text-primary cursor-pointer">ホーム</span>
                  <span>›</span>
                  <span className="text-gray-900 font-medium truncate">{product.nameJa || product.name}</span>
                </nav>
              </div>

              <div className={`p-4 ${deviceMode === "desktop" ? "grid grid-cols-2 gap-6" : "space-y-4"}`}>
                {/* 이미지 영역 */}
                <div>
                  <div className="relative border rounded-lg overflow-hidden bg-white mb-3">
                    <div className="aspect-square">
                      {displayImages[selectedImageIndex] ? (
                        <img
                          src={getOptimizedSrc(displayImages[selectedImageIndex], 600, 85)}
                          alt={product.nameJa}
                          loading="eager"
                          decoding="async"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                          <div className="text-center">
                            <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">画像なし</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* 배지 */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {(isTimeSaleActive || product.isTimeSale) && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          タイムセール
                        </span>
                      )}
                      {(salesInfo?.monthlySaleDiscountPercent || product.isMonthlySale) ? (
                        <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          月間セール
                        </span>
                      ) : null}
                      {discount > 0 && (
                        <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          {discount}%OFF
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 썸네일 */}
                  {displayImages.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {displayImages.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`flex-shrink-0 w-12 h-12 border-2 rounded overflow-hidden ${
                            selectedImageIndex === idx ? "border-primary" : "border-gray-200"
                          }`}
                        >
                          <img src={getOptimizedSrc(url, 100, 70)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 상품 정보 영역 */}
                <div className="space-y-3">
                  {/* 상품명 */}
                  <div>
                    <h1 className={`font-bold text-gray-900 ${deviceMode === "mobile" ? "text-base" : "text-lg"}`}>
                      {product.nameJa || "商品名未設定"}
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">{product.name || "商品名未設定"}</p>
                  </div>

                  {/* 평점 */}
                  {(product.reviewCount || 0) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= Math.round(parseFloat(product.rating || "0"))
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-primary">{product.reviewCount}件のレビュー</span>
                    </div>
                  )}

                  {/* 배송 정보 */}
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Truck className="w-3.5 h-3.5 text-green-600" />
                    <span>通常{product.deliveryDays || "10-14"}日間でお届けします</span>
                  </div>

                  {/* 인기도 */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-orange-600 flex items-center gap-0.5">
                      <Eye className="w-3.5 h-3.5" />
                      本日<strong>{product.viewCount || 0}</strong>人がチェック
                    </span>
                  </div>

                  {/* 재고 상태 */}
                  <div>
                    {stock > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        在庫あり ({stock}個)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        入荷待ち
                      </span>
                    )}
                  </div>

                  {/* 佐格 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-end gap-2">
                      <span className={`font-bold text-primary ${deviceMode === "mobile" ? "text-xl" : "text-2xl"}`}>
                        {formatPrice(price)}
                      </span>
                      {originalPrice > 0 && originalPrice !== price && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(originalPrice)}
                        </span>
                      )}
                      {discount > 0 && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          -{discount}%
                        </span>
                      )}
                    </div>
                    {pointsEarned > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        ポイント: {pointsEarned}pt ({product.pointsPercent || 1}%)
                      </p>
                    )}
                    {/* 타임세일 정보 */}
                    {salesInfo && salesInfo.timeSaleDiscountPercent > 0 && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                        <div className="flex items-center gap-1 text-red-700 font-medium">
                          <Clock className="w-3 h-3" />
                          タイムセール: {salesInfo.timeSaleDiscountPercent}%OFF
                        </div>
                        {salesInfo.timeSaleStartAt && salesInfo.timeSaleEndAt && (
                          <p className="text-red-600 mt-0.5">
                            {new Date(salesInfo.timeSaleStartAt).toLocaleDateString("ja-JP")} ~ {new Date(salesInfo.timeSaleEndAt).toLocaleDateString("ja-JP")}
                          </p>
                        )}
                      </div>
                    )}
                    {/* 월간세일 정보 */}
                    {salesInfo && salesInfo.monthlySaleDiscountPercent > 0 && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                        <span className="text-green-700 font-medium">月間セール: {salesInfo.monthlySaleDiscountPercent}%OFF</span>
                      </div>
                    )}
                  </div>

                  {/* 수량 선택 + 장바구니 */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-md">
                      <button className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50">-</button>
                      <span className="px-3 py-1.5 text-sm font-medium border-x">1</span>
                      <button className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50">+</button>
                    </div>
                    <Button className="flex-1 gap-1.5" size="sm" disabled>
                      <ShoppingCart className="w-3.5 h-3.5" />
                      カートに入れる
                    </Button>
                  </div>

                  {/* 안심 배지 */}
                  <div className="flex gap-3 pt-2 border-t">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Shield className="w-3 h-3 text-green-600" />
                      品質保証
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Truck className="w-3 h-3 text-blue-600" />
                      追跡配送
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Package className="w-3 h-3 text-purple-600" />
                      安心梱包
                    </div>
                  </div>
                </div>
              </div>

              {/* 상품 설명 */}
              <div className="px-4 pb-4 border-t mt-2 pt-3">
                <h3 className="text-sm font-bold text-gray-900 mb-2">商品説明</h3>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {product.descriptionJa || product.description || "商品説明はまだ入力されていません。"}
                </p>
              </div>
            </div>

            {/* 모바일 하단 바 */}
            {deviceMode === "mobile" && (
              <div className="bg-gray-800 h-1.5 mx-auto w-32 rounded-full my-1" />
            )}
          </div>
        </div>

        {/* OG 미리보기 */}
        {seoData && (seoData.ogTitle || seoData.ogDescription) && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">SNSシェアプレビュー</h4>
            <div className="border rounded-lg overflow-hidden bg-white max-w-md">
              {displayImages[0] && (
                <img src={getOptimizedSrc(displayImages[0], 600, 80)} alt="" loading="lazy" decoding="async" className="w-full h-40 object-cover" />
              )}
              <div className="p-3">
                <p className="text-xs text-gray-500 uppercase">kusuri-mall.com</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5 line-clamp-1">
                  {seoData.ogTitle || seoData.metaTitle || product.nameJa}
                </p>
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                  {seoData.ogDescription || seoData.metaDescription || product.descriptionJa?.slice(0, 100)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
