import { useRoute } from"wouter";
import { trpc } from"@/lib/trpc";
import { useState, useMemo } from"react";
import { formatPrice } from"@/../../shared/utils/formatPrice";
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
 Monitor,
 Smartphone,
 Tablet,
 X,
} from"lucide-react";
import { Button } from"@/components/ui/button";

type DeviceMode ="desktop"|"tablet"|"mobile";

export default function AdminProductPreviewPage() {
 const [, params] = useRoute("/admin/products/:id/preview");
 const productId = params?.id ? parseInt(params.id) : null;
 const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
 const [selectedImageIndex, setSelectedImageIndex] = useState(0);

 const { data: product, isLoading } = trpc.product.getById.useQuery(
 { id: productId! },
 { enabled: !!productId }
 );

 const { data: imageOrderData } = trpc.product.getImageOrder.useQuery(
 { productId: productId! },
 { enabled: !!productId }
 );

 const { data: priceTiers } = trpc.product.getActivePriceTiers.useQuery(
 { productId: productId! },
 { enabled: !!productId }
 );

 const displayImages = useMemo(() => {
 if (imageOrderData && imageOrderData.length > 0) {
 return imageOrderData.map((img: any) => img.imageUrl);
 }
 if (product?.imageUrl) return [product.imageUrl];
 return [];
 }, [imageOrderData, product?.imageUrl]);

 const price = parseFloat(String(product?.price ??"0")) || 0;
 const originalPrice = parseFloat(String(product?.originalPrice ??"0")) || 0;
 const discount = originalPrice > 0 ? Math.round((1 - price / originalPrice) * 100) : 0;
 const stock = product?.stock ?? 0;

 const containerClass =
 deviceMode ==="mobile"
 ?"max-w-[390px]"
 : deviceMode ==="tablet"
 ?"max-w-[768px]"
 :"max-w-[1100px]";

 if (isLoading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-gray-50">
 <div className="text-center">
 <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
 <p className="text-sm text-gray-500">로딩 중...</p>
 </div>
 </div>
 );
 }

 if (!product) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-gray-50">
 <p className="text-gray-500">상품을 찾을 수 없습니다</p>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-gray-100">
 {/* 미리보기 툴바 */}
 <div className="sticky top-0 z-50 bg-white border-b">
 <div className="max-w-screen-xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
 <div className="flex items-center gap-2">
 <Eye className="w-4 h-4 text-primary"/>
 <span className="text-sm font-semibold text-gray-700">미리보기 모드</span>
 <span className="text-xs text-gray-400 hidden sm:inline">— 실제 페이지와 다를 수 있습니다</span>
 </div>

 {/* 디바이스 전환 */}
 <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
 <button
 onClick={() => setDeviceMode("desktop")}
 className={`p-1.5 rounded-md transition-colors ${deviceMode ==="desktop"?"bg-white text-primary":"text-gray-500 hover:text-gray-700"}`}
 title="데스크탑"
 >
 <Monitor className="w-4 h-4"/>
 </button>
 <button
 onClick={() => setDeviceMode("tablet")}
 className={`p-1.5 rounded-md transition-colors ${deviceMode ==="tablet"?"bg-white text-primary":"text-gray-500 hover:text-gray-700"}`}
 title="태블릿"
 >
 <Tablet className="w-4 h-4"/>
 </button>
 <button
 onClick={() => setDeviceMode("mobile")}
 className={`p-1.5 rounded-md transition-colors ${deviceMode ==="mobile"?"bg-white text-primary":"text-gray-500 hover:text-gray-700"}`}
 title="모바일"
 >
 <Smartphone className="w-4 h-4"/>
 </button>
 </div>

 <button
 onClick={() => window.close()}
 className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
 title="닫기"
 >
 <X className="w-4 h-4"/>
 </button>
 </div>
 </div>

 {/* 콘텐츠 영역 */}
 <div className="py-6 px-4">
 <div className={`mx-auto transition-all duration-300 ${containerClass}`}>
 <div
 className={`bg-white overflow-hidden ${
 deviceMode ==="mobile"
 ?"rounded-3xl border-4 border-gray-800"
 :"rounded-xl border border-gray-200"
 }`}
 >
 {/* 모바일 노치 */}
 {deviceMode ==="mobile"&& (
 <div className="bg-gray-800 h-7 flex items-center justify-center">
 <div className="w-20 h-3 bg-gray-900 rounded-full"/>
 </div>
 )}

 <div className={`overflow-y-auto ${deviceMode ==="mobile"?"max-h-[780px]":""}`}>
 {/* 브레드크럼 */}
 <div className="bg-gray-50 border-b py-2 px-4">
 <nav className="flex items-center gap-1 text-xs text-gray-500">
 <span>홈</span>
 <span>›</span>
 <span className="text-gray-900 font-medium truncate">
 {product.nameJa || product.name}
 </span>
 </nav>
 </div>

 {/* 상품 메인 영역 */}
 <div
 className={`p-4 ${
 deviceMode ==="desktop"?"grid grid-cols-2 gap-8":"space-y-4"
 }`}
 >
 {/* 이미지 영역 */}
 <div>
 <div className="relative border rounded-lg overflow-hidden bg-white mb-3">
 <div className="aspect-square">
 {displayImages[selectedImageIndex] ? (
 <img
 src={displayImages[selectedImageIndex]}
 alt={product.nameJa}
 className="w-full h-full object-contain"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center bg-gray-50">
 <div className="text-center">
 <Package className="w-12 h-12 mx-auto mb-2 text-gray-300"/>
 <p className="text-sm text-gray-400">이미지 없음</p>
 </div>
 </div>
 )}
 </div>
 {/* 배지 */}
 <div className="absolute top-3 left-3 flex flex-col gap-1.5">
 {discount > 0 && (
 <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded">
 {discount}%OFF
 </span>
 )}
 </div>
 </div>
 {displayImages.length > 1 && (
 <div className="flex gap-1.5 overflow-x-auto pb-1">
 {displayImages.map((url: string, idx: number) => (
 <button
 key={idx}
 onClick={() => setSelectedImageIndex(idx)}
 className={`flex-shrink-0 w-12 h-12 border-2 rounded overflow-hidden ${
 selectedImageIndex === idx ?"border-primary":"border-gray-200"
 }`}
 >
 <img src={url} alt=""className="w-full h-full object-cover"/>
 </button>
 ))}
 </div>
 )}
 </div>

 {/* 상품 정보 */}
 <div className="space-y-3">
 <div>
 <h1
 className={`font-bold text-gray-900 ${
 deviceMode ==="mobile"?"text-base":"text-xl"
 }`}
 >
 {product.nameJa ||"상품명 미설정"}
 </h1>
 <p className="text-xs text-gray-500 mt-0.5">{product.name}</p>
 </div>

 {(product.reviewCount ?? 0) > 0 && (
 <div className="flex items-center gap-1.5">
 <div className="flex">
 {[1, 2, 3, 4, 5].map((star) => (
 <Star
 key={star}
 className={`w-3.5 h-3.5 ${
 star <= Math.round(parseFloat(product.rating ??"0"))
 ?"fill-yellow-400 text-yellow-400"
 :"text-gray-300"
 }`}
 />
 ))}
 </div>
 <span className="text-xs text-primary">{product.reviewCount}건 리뷰</span>
 </div>
 )}

 <div className="flex items-center gap-1 text-xs text-gray-600">
 <Truck className="w-3.5 h-3.5 text-green-600"/>
 <span>통상 10-14일 이내 배송</span>
 </div>

 <div className="flex items-center gap-2 text-xs">
 <span className="text-orange-600 flex items-center gap-0.5">
 <Eye className="w-3.5 h-3.5"/>
 오늘 <strong>{product.viewCount ?? 0}</strong>명 확인
 </span>
 </div>

 <div>
 {stock > 0 ? (
 <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
 <CheckCircle className="w-3.5 h-3.5"/>
 재고 있음
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
 <AlertTriangle className="w-3.5 h-3.5"/>
 입하 대기
 </span>
 )}
 </div>

 {/* 가격 */}
 <div className="bg-gray-50 rounded-lg p-3">
 <div className="flex items-end gap-2">
 <span
 className={`font-bold text-primary ${
 deviceMode ==="mobile"?"text-xl":"text-2xl"
 }`}
 >
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
 </div>

 {/* 가격 티어 */}
 {priceTiers && priceTiers.length > 0 && (
 <div className="border rounded-lg overflow-hidden text-xs">
 <div className="bg-gray-50 px-3 py-1.5 font-semibold text-gray-700 border-b">
 더 살수록 저렴해집니다!
 </div>
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b">
 <th className="px-3 py-1.5 text-left text-gray-600">세트 수</th>
 <th className="px-3 py-1.5 text-right text-gray-600">판매가</th>
 </tr>
 </thead>
 <tbody>
 {priceTiers.map((tier: any, idx: number) => (
 <tr key={idx} className="border-b last:border-0">
 <td className="px-3 py-1.5 text-gray-700">{tier.label || `${tier.quantity}세트`}</td>
 <td className="px-3 py-1.5 text-right font-semibold text-primary">
 {formatPrice(tier.totalPrice ?? tier.unitPrice * tier.quantity)}
 {tier.discountPercent > 0 && (
 <span className="ml-1 text-red-500">{tier.discountPercent}%OFF</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {/* 장바구니 버튼 */}
 <div className="flex items-center gap-2">
 <div className="flex items-center border rounded-md">
 <button className="px-2.5 py-1.5 text-gray-500">-</button>
 <span className="px-3 py-1.5 text-sm font-medium border-x">1</span>
 <button className="px-2.5 py-1.5 text-gray-500">+</button>
 </div>
 <Button className="flex-1 gap-1.5"size="sm"disabled>
 <ShoppingCart className="w-3.5 h-3.5"/>
 장바구담기
 </Button>
 </div>

 {/* 안심 배지 */}
 <div className="flex gap-3 pt-2 border-t">
 <div className="flex items-center gap-1 text-[10px] text-gray-500">
 <Shield className="w-3 h-3 text-green-600"/>
 품질 보증
 </div>
 <div className="flex items-center gap-1 text-[10px] text-gray-500">
 <Truck className="w-3 h-3 text-blue-600"/>
 추적 배송
 </div>
 <div className="flex items-center gap-1 text-[10px] text-gray-500">
 <Package className="w-3 h-3 text-purple-600"/>
 안전 포장
 </div>
 </div>
 </div>
 </div>

 {/* 상품 설명 */}
 {(product.descriptionJa || product.description) && (
 <div className="px-4 pb-4 border-t mt-2 pt-4">
 <h3 className="text-sm font-bold text-gray-900 mb-3">상품 설명</h3>
 <div
 className="prose prose-sm max-w-none text-gray-700"
 dangerouslySetInnerHTML={{
 __html: product.descriptionJa || product.description ||"",
 }}
 />
 </div>
 )}

 {/* 사용 방법 */}
 {product.usageMethod && (
 <div className="px-4 pb-4 border-t pt-4">
 <h3 className="text-sm font-bold text-gray-900 mb-3">사용 방법</h3>
 <div
 className="prose prose-sm max-w-none text-gray-700"
 dangerouslySetInnerHTML={{ __html: product.usageMethod }}
 />
 </div>
 )}

 {/* 부작용 */}
 {product.sideEffects && (
 <div className="px-4 pb-4 border-t pt-4">
 <h3 className="text-sm font-bold text-gray-900 mb-3">부작용</h3>
 <div
 className="prose prose-sm max-w-none text-gray-700"
 dangerouslySetInnerHTML={{ __html: product.sideEffects }}
 />
 </div>
 )}

 {/* 주의사항 */}
 {product.precautions && (
 <div className="px-4 pb-4 border-t pt-4">
 <h3 className="text-sm font-bold text-gray-900 mb-3">주의사항</h3>
 <div
 className="prose prose-sm max-w-none text-gray-700"
 dangerouslySetInnerHTML={{ __html: product.precautions }}
 />
 </div>
 )}
 </div>

 {/* 모바일 하단 바 */}
 {deviceMode ==="mobile"&& (
 <div className="bg-gray-800 h-1.5 mx-auto w-32 rounded-full my-1.5"/>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
