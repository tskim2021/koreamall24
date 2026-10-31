import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/OptimizedImage";
import { toProxyUrl } from "@/lib/imageProxy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trash2, ShoppingBag, ArrowRight, Ticket, X, Check, Package, Tag, TrendingUp, Users, Loader2, Star, Crown, Gem } from "lucide-react";
import MyPageSidebar from "@/components/MyPageSidebar";
import { useState, useEffect } from "react";
import { formatPrice } from "@/../../shared/utils/formatPrice";

// 추천 이유 텍스트 및 아이콘 매핑
const getRecommendationLabel = (reason: string) => {
  switch (reason) {
    case "same_category":
      return { text: "同じカテゴリの人気商品", icon: Tag, color: "bg-blue-100 text-blue-700" };
    case "frequently_bought_together":
      return { text: "よく一緒に購入される", icon: Users, color: "bg-green-100 text-green-700" };
    case "popular":
      return { text: "人気商品", icon: TrendingUp, color: "bg-orange-100 text-orange-700" };
    default:
      return { text: "おすすめ", icon: Tag, color: "bg-gray-100 text-gray-700" };
  }
};

// 추천 상품 컴포넌트
function RecommendedProducts() {
  const { data: recommendations, isLoading } = trpc.cart.recommendations.useQuery();

  if (isLoading) {
    return (
      <section className="bg-gray-50 py-12">
        <div className="container">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            一緒に購入するとお得な商品
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded mb-3" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="bg-gray-50 py-12">
      <div className="container">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          一緒に購入するとお得な商品
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {recommendations.map((product) => (
            <a
              key={product.id}
              href={`/product/${product.id}`}
              className="bg-white rounded-lg p-4 hover:shadow-lg transition-shadow group"
            >
              <div className="aspect-square mb-3 overflow-hidden rounded relative">
                <OptimizedImage
                  src={toProxyUrl(product.imageUrl) || "/placeholder-product.png"}
                  srcMedium={toProxyUrl((product as any).imageUrlMedium)}
                  srcThumb={toProxyUrl((product as any).imageUrlThumb)}
                  blurDataUrl={(product as any).blurDataUrl}
                  alt={product.nameJa}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                {/* 추천 이유 배지 */}
                {(product as any).recommendationReason && (() => {
                  const label = getRecommendationLabel((product as any).recommendationReason);
                  const Icon = label.icon;
                  return (
                    <div className={`absolute top-2 left-2 ${label.color} px-2 py-1 rounded-full flex items-center gap-1 text-xs font-medium`}>
                      <Icon className="w-3 h-3" />
                      <span>{label.text}</span>
                    </div>
                  );
                })()}
              </div>
              <h3 className="text-sm font-medium mb-2 line-clamp-2">{product.nameJa}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-primary">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Cart() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    couponId: number;
    code: string;
    nameJa: string;
    discountType: string;
    discountValue: string;
    discountAmount: number;
  } | null>(null);
  const [pointsToUse, setPointsToUse] = useState(0);

  // 체크박스 선택 상태 관리
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: cartItems, isLoading } = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: tierData } = trpc.membership.myTier.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: userPoints } = trpc.point.getBalance.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // 장바구니 데이터 로드 시 전체 선택으로 초기화
  useEffect(() => {
    if (cartItems && cartItems.length > 0) {
      setSelectedIds(new Set(cartItems.map((item) => item.cartItem.id)));
    }
  }, [cartItems?.length]);

  const removeItem = trpc.cart.remove.useMutation({
    onSuccess: () => {
      toast.success("商品を削除しました");
      utils.cart.list.invalidate();
      utils.cart.count.invalidate();
      if (appliedCoupon) {
        setAppliedCoupon(null);
        setCouponCode("");
      }
    },
    onError: () => {
      toast.error("削除に失敗しました");
    },
  });

  const clearCart = trpc.cart.clear.useMutation({
    onSuccess: () => {
      toast.success("カートを空にしました");
      utils.cart.list.invalidate();
      utils.cart.count.invalidate();
      setAppliedCoupon(null);
      setCouponCode("");
    },
    onError: () => {
      toast.error("カートのクリアに失敗しました");
    },
  });

  const validateCoupon = trpc.coupon.validate.useMutation({
    onSuccess: (data) => {
      setAppliedCoupon(data);
      toast.success(`クーポン「${data.nameJa}」が適用されました！ ${data.discountAmount.toLocaleString()}円 OFF`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast.error("クーポンコードを入力してください");
      return;
    }
    validateCoupon.mutate({
      code: couponCode.trim(),
      orderAmount: selectedSubtotal,
      userId: user?.id,
    });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.info("クーポンを解除しました");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-gray-800">カートを見るにはログインが必要です</h1>
            <p className="text-gray-500 mb-6">ログインして、お買い物を続けましょう</p>
            <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={() => { window.location.href = getLoginUrl(); }}>ログイン</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
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

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-6 md:py-8">
          <p className="text-sm text-gray-500 mb-4">
            <span className="hover:text-gray-700 cursor-pointer" onClick={() => setLocation("/")}>ホーム</span>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="text-gray-800 font-medium">お買物かご</span>
          </p>
          <div className="flex gap-6 lg:gap-8 items-start">
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>
            <div className="flex-1 min-w-0">
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h1 className="text-xl font-bold mb-2 text-gray-800">カートは空です</h1>
                <p className="text-gray-500 mb-6">お気に入りの商品を見つけて、カートに追加しましょう</p>
                <Button className="bg-primary hover:bg-primary/90" onClick={() => setLocation("/")}>お買い物を続ける</Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 세트 옵션 가격 계산 함수
  const getItemPrice = (item: any) => {
    const { cartItem, product, priceTier } = item;
    if (!product || !product.price) {
      return 0;
    }
    const basePrice = parseFloat(product.price);
    const quantity = cartItem.quantity;
    
    if (priceTier && priceTier.totalPrice) {
      return parseFloat(priceTier.totalPrice);
    }
    
    if (product.setPricing) {
      try {
        const setPricing = JSON.parse(product.setPricing);
        const matchedSet = setPricing.find((set: any) => set.quantity === quantity);
        if (matchedSet) {
          return parseFloat(matchedSet.price);
        }
      } catch {
        // JSON 파싱 실패 시 기본 가격 사용
      }
    }
    
    return basePrice * quantity;
  };

  // 전체 합계 (모든 상품)
  const subtotal = cartItems.reduce(
    (sum, item) => sum + getItemPrice(item),
    0
  );

  // 선택된 상품만의 합계
  const selectedItems = cartItems.filter((item) => selectedIds.has(item.cartItem.id));
  const selectedSubtotal = selectedItems.reduce(
    (sum, item) => sum + getItemPrice(item),
    0
  );

  // 쿠폰 할인: 선택된 상품 합계 기준으로 재계산
  const computeCouponDiscount = (subtotal: number): number => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      return Math.floor(subtotal * parseFloat(appliedCoupon.discountValue) / 100);
    } else {
      // fixed: 고정 금액, 선택 합계를 초과하지 않도록
      return Math.min(parseInt(appliedCoupon.discountValue), subtotal);
    }
  };
  const couponDiscount = computeCouponDiscount(selectedSubtotal);
  const pointDiscount = pointsToUse || 0;
  const selectedShipping = selectedSubtotal >= 5000 ? 0 : 500;
  const selectedTotal = selectedSubtotal - couponDiscount - pointDiscount + selectedShipping;

  // 등급별 포인트 배율 (tier.pointRate: 기본 1배, 상위 등급은 더 높음)
  const tierPointRate = tierData?.tier ? Number((tierData.tier as any).pointRate ?? 1) : 1;
  // 선택 상품의 총 포인트 적립 계산 (등급 배율 적용)
  const selectedTotalPoints = selectedItems.reduce((sum, item) => {
    const { product } = item;
    const itemPrice = Math.round(getItemPrice(item));
    const pointsPercent = (product as any).pointsPercent ?? 1;
    return sum + Math.floor(itemPrice * pointsPercent / 100 * tierPointRate);
  }, 0);

  // 전체 선택 여부
  const allSelected = cartItems.length > 0 && selectedIds.size === cartItems.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < cartItems.length;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cartItems.map((item) => item.cartItem.id)));
    }
  };

  const handleToggleItem = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 체크아웃으로 이동 (선택된 상품만)
  const handleCheckout = () => {
    if (selectedIds.size === 0) {
      toast.error("購入する商品を選択してください");
      return;
    }
    const params = new URLSearchParams();
    if (appliedCoupon) {
      params.set('couponId', appliedCoupon.couponId.toString());
      params.set('couponCode', appliedCoupon.code);
      params.set('couponDiscount', appliedCoupon.discountAmount.toString());
      params.set('couponName', appliedCoupon.nameJa);
      params.set('couponDiscountType', appliedCoupon.discountType);
      params.set('couponDiscountValue', appliedCoupon.discountValue);
    }
    if (pointsToUse > 0) {
      params.set('pointsUsed', pointsToUse.toString());
    }
    // 선택된 cartItemIds 전달 (전체 선택이 아닌 경우에만)
    if (selectedIds.size < cartItems.length) {
      params.set('cartItemIds', Array.from(selectedIds).join(','));
    }
    const queryString = params.toString();
    setLocation(`/checkout${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-8">
          {/* Breadcrumb */}
          <p className="text-sm text-gray-500 mb-4">
            <span className="hover:text-gray-700 cursor-pointer" onClick={() => setLocation("/")}>ホーム</span>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="text-gray-800 font-medium">お買物かご</span>
          </p>

          <div className="flex gap-6 lg:gap-8 items-start">
            {/* Sidebar */}
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Header Banner */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="p-4 sm:p-5" style={{backgroundColor: '#fffbeb'}}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">お買物かご</h1>
                      <p className="text-xs text-primary font-medium mt-0.5">商品を確認してご注文手続きへ進んでください</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">商品数</div>
                        <div className="text-2xl font-bold text-primary">{cartItems.length}<span className="text-xs font-normal text-gray-500 ml-0.5">点</span></div>
                      </div>
                      <button
                        onClick={() => clearCart.mutate()}
                        disabled={clearCart.isPending}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded border border-gray-200 hover:border-red-200 bg-white"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>カートを空にする</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-4">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-3">
                  {/* 전체 선택 체크박스 */}
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleToggleAll}
                        className="w-4 h-4"
                        data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        全て選択
                        <span className="text-xs text-gray-400 ml-1.5">
                          ({selectedIds.size}/{cartItems.length}点選択中)
                        </span>
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      {selectedIds.size > 0 && selectedIds.size < cartItems.length && (
                        <span className="text-xs text-primary font-medium">
                          選択商品のみ購入できます
                        </span>
                      )}
                      {selectedIds.size > 0 && (
                        <button
                          onClick={() => {
                            Array.from(selectedIds).forEach(id => removeItem.mutate({ id }));
                          }}
                          disabled={removeItem.isPending}
                          className="text-xs text-red-500 hover:text-red-700 font-medium border border-red-200 rounded px-2 py-0.5 hover:bg-red-50 transition-colors"
                        >
                          選択削除 ({selectedIds.size})
                        </button>
                      )}
                    </div>
                  </div>

                  {cartItems.map((item) => {
                    const { cartItem, product, priceTier } = item;
                    const isSelected = selectedIds.has(cartItem.id);
                    return (
                    <div
                      key={cartItem.id}
                      className={`rounded-xl border bg-white p-4 transition-colors ${
                        isSelected ? "border-primary/30" : "border-gray-200 opacity-60"
                      }`}
                    >
                      <div className="flex gap-3 md:gap-4">
                        {/* 체크박스 */}
                        <div className="flex items-start pt-1 shrink-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleItem(cartItem.id)}
                            className="w-4 h-4"
                          />
                        </div>

                        {/* Product Image */}
                        <Link href={`/product/${product.id}`}>
                          <div className="w-20 md:w-24 h-20 md:h-24 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                            <OptimizedImage
                              src={toProxyUrl((product as any).imageUrl)}
                              srcMedium={toProxyUrl((product as any).imageUrlMedium)}
                              srcThumb={toProxyUrl((product as any).imageUrlThumb)}
                              blurDataUrl={(product as any).blurDataUrl}
                              alt={product.nameJa}
                              size="thumb"
                              className="w-full h-full object-cover"
                              containerClassName="w-full h-full"
                            />
                          </div>
                        </Link>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <Link href={`/product/${product.id}`}>
                            <h3 className="text-sm font-medium hover:text-primary transition-colors line-clamp-2 text-gray-800">
                              {product.nameJa}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <p className="text-base font-bold text-primary">
                              {formatPrice(Math.round(getItemPrice(item)))}
                            </p>
                            {(() => {
                              const originalPrice = (product as any).originalPrice;
                              if (originalPrice && originalPrice > 0) {
                                const totalPrice = Math.round(getItemPrice(item));
                                const originalTotal = originalPrice * cartItem.quantity;
                                const discountAmt = originalTotal - totalPrice;
                                if (discountAmt > 0) {
                                  return (
                                    <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                      -{formatPrice(discountAmt)}
                                    </span>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                          {cartItem.quantity > 0 && (() => {
                            const totalPrice = Math.round(getItemPrice(item));
                            const unitPrice = Math.round(totalPrice / cartItem.quantity);
                            return (
                              <p className="text-xs text-blue-600 mt-0.5">
                                {formatPrice(unitPrice)} × {cartItem.quantity}
                              </p>
                            );
                          })()}
                          {/* 쿠폰 제외 배지 */}
                          {(product as any).couponExcluded && (
                            <span className="inline-block text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded mt-0.5">
                              クーポン対象外
                            </span>
                          )}
                          {/* 쿠폰 할인 금액 표시 */}
                          {appliedCoupon && !(product as any).couponExcluded && (() => {
                            const itemPrice = Math.round(getItemPrice(item));
                            let itemCouponDiscount = 0;
                            if (appliedCoupon.discountType === 'percentage') {
                              itemCouponDiscount = Math.floor(itemPrice * parseFloat(appliedCoupon.discountValue) / 100);
                            } else {
                              // fixed: 상품 가격 비율로 안분
                              const totalSelected = selectedSubtotal;
                              if (totalSelected > 0) {
                                itemCouponDiscount = Math.floor(couponDiscount * (itemPrice / totalSelected));
                              }
                            }
                            if (itemCouponDiscount > 0) {
                              return (
                                <p className="text-xs text-pink-600 mt-0.5 font-medium">
                                  <Ticket className="inline w-3 h-3 mr-0.5" />
                                  クーポン割引 -{formatPrice(itemCouponDiscount)}
                                </p>
                              );
                            }
                            return null;
                          })()}
                          {/* 포인트 적립 표시 + 등급 배지 + 등급 배율 안내 */}
                          {(() => {
                            const itemPrice = Math.round(getItemPrice(item));
                            const pointsPercent = (product as any).pointsPercent ?? 1;
                            const earnedPoints = Math.floor(itemPrice * pointsPercent / 100 * tierPointRate);
                            const tier = tierData?.tier;
                            const tierDiscountRate = tier ? Number((tier as any).discountRate) : 0;
                            if (earnedPoints > 0) {
                              return (
                                <div className="mt-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs text-amber-600">
                                      <span className="font-medium">{earnedPoints.toLocaleString()}P</span> ポイント積立
                                    </p>
                                    {tier && (
                                      <span
                                        className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
                                        style={{ backgroundColor: (tier as any).color + '22', color: (tier as any).color }}
                                      >
                                        {(tier as any).icon === 'Crown' ? <Crown className="w-3 h-3" /> :
                                         (tier as any).icon === 'Gem' ? <Gem className="w-3 h-3" /> :
                                         <Star className="w-3 h-3" />}
                                        {(tier as any).nameKo || (tier as any).name}
                                      </span>
                                    )}
                                  </div>
                                  {tier && tierDiscountRate > 0 && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {(tier as any).nameKo || (tier as any).name}ランク特典: ポイント{(pointsPercent * tierPointRate).toFixed(1)}%還元 (x{tierPointRate}倍) + 会員割引{tierDiscountRate}%
                                    </p>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {/* Quantity + Delete */}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-sm text-gray-600">
                              数量: <span className="font-medium text-gray-800">{cartItem.quantity}</span>
                            </span>
                            <button
                              onClick={() => removeItem.mutate({ id: cartItem.id })}
                              disabled={removeItem.isPending}
                              className="text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 sticky top-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-base text-gray-900">ご注文内容</h2>
                      {selectedIds.size < cartItems.length && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          {selectedIds.size}点選択中
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">
                          {selectedIds.size < cartItems.length ? "選択商品合計" : "商品合計"}
                        </span>
                        <span className="font-medium text-gray-800">{formatPrice(selectedSubtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">送料</span>
                        <span className="font-medium">
                          {selectedShipping === 0 ? (
                            <span className="text-green-600">無料</span>
                          ) : (
                            formatPrice(selectedShipping)
                          )}
                        </span>
                      </div>
                      <div className="text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg">
                        全品送料無料でお届けします！
                      </div>
                    </div>

                    {/* Coupon Section */}
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Ticket className="w-3.5 h-3.5 text-pink-500" />
                        <span className="text-xs font-semibold text-gray-700">クーポンコード</span>
                      </div>
                      {appliedCoupon ? (
                        <div className="bg-pink-50 border border-pink-200 rounded-lg p-2.5">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-pink-700 truncate">{appliedCoupon.nameJa}</p>
                                <p className="text-xs text-pink-500 truncate">{appliedCoupon.code}</p>
                              </div>
                            </div>
                            <button onClick={handleRemoveCoupon} className="text-gray-300 hover:text-red-400 shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex justify-between mt-1.5 text-xs font-medium text-pink-700">
                            <span>クーポン割引</span>
                            <span>-{formatPrice(couponDiscount)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <Input
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="コードを入力"
                            className="font-mono text-xs h-9 border-gray-200"
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleApplyCoupon}
                            disabled={validateCoupon.isPending}
                            className="shrink-0 text-xs h-9 border-gray-200"
                          >
                            {validateCoupon.isPending ? "..." : "適用"}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Point Usage Section */}
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">ポイント使用</span>
                        <span className="text-xs text-gray-400">保有: {(userPoints?.balance || 0).toLocaleString()}P</span>
                      </div>
                      <div className="flex gap-1.5">
                        <Input
                          type="number"
                          value={pointsToUse || ''}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            const maxPoints = Math.min(
                              userPoints?.balance || 0,
                              Math.floor((selectedSubtotal - couponDiscount) * 0.5)
                            );
                            setPointsToUse(Math.min(value, maxPoints));
                          }}
                          placeholder="0"
                          className="text-xs h-9 border-gray-200"
                          min="0"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const maxPoints = Math.min(
                              userPoints?.balance || 0,
                              Math.floor((selectedSubtotal - couponDiscount) * 0.5)
                            );
                            setPointsToUse(maxPoints);
                          }}
                          className="shrink-0 text-xs h-9 border-gray-200"
                        >
                          最大
                        </Button>
                      </div>
                      {pointsToUse > 0 && (
                        <p className="text-xs text-green-600 mt-1">{pointsToUse}P使用 (-{formatPrice(pointsToUse)})</p>
                      )}
                    </div>

                    {/* Total */}
                    <div className="border-t pt-3">
                      {appliedCoupon && (
                        <div className="flex justify-between text-xs text-pink-600 font-medium mb-1">
                          <span>クーポン割引</span>
                          <span>-{formatPrice(couponDiscount)}</span>
                        </div>
                      )}
                      {pointsToUse > 0 && (
                        <div className="flex justify-between text-xs text-green-600 font-medium mb-1">
                          <span>ポイント割引</span>
                          <span>-{formatPrice(pointDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base">
                        <span className="text-gray-800">合計</span>
                        <span className="text-primary text-lg">{formatPrice(Math.max(0, selectedTotal))}</span>
                      </div>
                      {selectedTotalPoints > 0 && (
                        <div className="mt-2 pt-2 border-t border-dashed border-amber-200 bg-amber-50 rounded-lg px-2 py-1.5">
                          <div className="flex justify-between text-xs text-amber-600 font-medium">
                            <span>🌟 今回のポイント積立</span>
                            <span className="font-bold">+{selectedTotalPoints.toLocaleString()}P</span>
                          </div>
                          {tierData?.tier && (
                            <div className="flex justify-end mt-1">
                              <span
                                className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: (tierData.tier as any).color + '22', color: (tierData.tier as any).color }}
                              >
                                {(tierData.tier as any).icon === 'Crown' ? <Crown className="w-3 h-3" /> :
                                 (tierData.tier as any).icon === 'Gem' ? <Gem className="w-3 h-3" /> :
                                 <Star className="w-3 h-3" />}
                                {(tierData.tier as any).nameKo || (tierData.tier as any).name}ランク
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 구매 버튼 */}
                    <Button
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90 h-11"
                      disabled={selectedIds.size === 0}
                      onClick={handleCheckout}
                    >
                      {selectedIds.size < cartItems.length && selectedIds.size > 0
                        ? `選択した${selectedIds.size}点を購入する`
                        : "ご注文手続きへ"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    <button
                      onClick={() => setLocation("/")}
                      className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-2 text-center"
                    >
                      お買い物を続ける
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 함께 구매하면 좋은 상품 추천 섹션 */}
      <RecommendedProducts />

      <Footer />
    </div>
  );
}
