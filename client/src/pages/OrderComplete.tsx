import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, AlertCircle, Loader2, TrendingUp, Crown, Star, Gem,
  ChevronRight, Package, MapPin, CreditCard, Tag, Coins, Truck,
  ShoppingBag, Calendar, Hash, ChevronLeft, RefreshCw, ShoppingCart
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MyPageSidebar from "@/components/MyPageSidebar";
import { formatPrice } from "@/../../shared/utils/formatPrice";

// Tier icon mapping
function TierIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "Crown": return <Crown className={className} />;
    case "Gem": return <Gem className={className} />;
    default: return <Star className={className} />;
  }
}

// 결제 수단 표시
function paymentMethodLabel(method?: string) {
  if (!method) return "-";
  switch (method) {
    case "stripe": return "クレジットカード";
    case "bank_transfer": return "銀行振込";
    case "airwallex": return "Airwallex";
    default: return method;
  }
}

export default function OrderComplete() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [cartGroupId, setCartGroupId] = useState<string | null>(null);
  const [tierToastShown, setTierToastShown] = useState(false);

  // Fetch order data by session ID
  const { data: orderBySession, isLoading: isLoadingSession, error: sessionError } = trpc.order.getBySessionId.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId }
  );

  // Fetch order data by order ID
  const { data: orderById, isLoading: isLoadingById, error: orderByIdError } = trpc.order.getById.useQuery(
    { orderId: orderId || 0 },
    { enabled: !!orderId }
  );

  // Resolve cartGroupId from order data
  const resolvedCartGroupId = cartGroupId || orderBySession?.order?.cartGroupId || (orderById as any)?.cartGroupId || null;
  const resolvedOrderId = orderBySession?.order?.id || orderById?.id;

  // Fetch ALL items for the cart group (all products ordered together)
  const { data: cartGroupItems } = trpc.order.getItemsByCartGroup.useQuery(
    { cartGroupId: resolvedCartGroupId || "" },
    { enabled: !!resolvedCartGroupId }
  );

  // Fallback: fetch single order items if no cartGroupId
  const { data: singleOrderItems } = trpc.order.getItems.useQuery(
    { orderId: resolvedOrderId || 0 },
    { enabled: !!resolvedOrderId && !resolvedCartGroupId }
  );

  // Use cart group items if available, otherwise single order items
  const orderItems = cartGroupItems && cartGroupItems.length > 0 ? cartGroupItems : singleOrderItems;

  // Fetch tier info for the logged-in user
  const { data: user } = trpc.auth.me.useQuery();
  const { data: tierData } = trpc.membership.myTier.useQuery(undefined, {
    enabled: !!user,
  });

  // PayPal capture mutation
  const capturePayPal = trpc.checkout.capturePayPalOrder.useMutation({
    onSuccess: (data: any) => {
      if (data.orders && data.orders.length > 0) {
        setOrderId(data.orders[0].orderId);
      }
    },
    onError: (err: any) => {
      console.error('PayPal capture failed:', err);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionIdParam = params.get("session_id");
    const orderIdParam = params.get("order_id");
    const paypalParam = params.get("paypal");
    const paypalOrderId = params.get("token"); // PayPal returns token=<order_id>
    const cartGroupIdParam = params.get("cart_group_id");
    if (paypalParam === "1" && paypalOrderId) {
      // Capture PayPal payment
      capturePayPal.mutate({ paypalOrderId, cartGroupId: cartGroupIdParam || '' });
    } else if (sessionIdParam) {
      setSessionId(sessionIdParam);
    } else if (orderIdParam) {
      setOrderId(parseInt(orderIdParam));
    }
    // Also set cartGroupId if provided in URL
    if (cartGroupIdParam) {
      setCartGroupId(cartGroupIdParam);
    }
  }, []);

  // Show tier progress toast after order is confirmed and tier data is loaded
  useEffect(() => {
    if (!tierToastShown && tierData && (orderBySession?.order || orderById)) {
      const { tier, nextTier, totalPurchaseAmount } = tierData;
      if (nextTier && tier) {
        const remaining = nextTier.minAmount - (totalPurchaseAmount || 0);
        if (remaining > 0) {
          setTimeout(() => {
            toast(
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">
                    次のランク「{nextTier.name}」まであと¥{remaining.toLocaleString("ja-JP")}！
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    引き続きお買い物でランクアップを目指しましょう
                  </p>
                </div>
              </div>,
              {
                duration: 6000,
                action: {
                  label: "ランク確認",
                  onClick: () => setLocation("/mypage/membership"),
                },
              }
            );
          }, 1500);
        } else {
          setTimeout(() => {
            toast(
              <div className="flex items-start gap-3">
                <Crown className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">最高ランク「{tier.name}」達成中！</p>
                  <p className="text-xs text-gray-500 mt-0.5">特別な特典をお楽しみください</p>
                </div>
              </div>,
              { duration: 5000 }
            );
          }, 1500);
        }
      }
      setTierToastShown(true);
    }
  }, [tierData, orderBySession, orderById, tierToastShown, setLocation]);

  const isLoading = isLoadingSession || isLoadingById;
  const error = sessionError || orderByIdError;

  const isCompleted = orderBySession?.status === "completed" || orderBySession?.order || !!orderById;
  const order = orderBySession?.order || orderById;
  const checkoutSession = orderBySession?.checkoutSession;

  const showTierCard = !!tierData?.tier && !!user;
  const tierProgress = tierData && tierData.nextTier
    ? Math.min(100, Math.round(((tierData.totalPurchaseAmount || 0) / tierData.nextTier.minAmount) * 100))
    : 100;

  // 가격 계산
  const subtotal = orderItems?.reduce((s, i) => s + parseFloat((i as any).subtotal || '0'), 0) ?? 0;
  const shippingFee = parseFloat((order as any)?.shippingFee || '0');
  const couponDiscount = parseFloat((order as any)?.couponDiscount || '0');
  const pointsUsed = (order as any)?.pointsUsed || 0;
  const pointsEarned = (order as any)?.pointsEarned || 0;
  const totalAmount = parseFloat((order as any)?.totalAmount || '0');
  const couponCode = (order as any)?.couponCode;
  const couponName = (order as any)?.couponName;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container py-6 md:py-8">
        <div className="flex gap-6 lg:gap-8 items-start">
          {/* Sidebar */}
          <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <MyPageSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Loading State */}
            {isLoading && (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-gray-500">注文情報を取得中...</p>
              </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
                <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">エラーが発生しました</h2>
                <p className="text-gray-500 mb-6">{error.message}</p>
                <Button onClick={() => setLocation("/")} className="bg-primary hover:bg-primary/90 text-white">
                  ホームに戻る
                </Button>
              </div>
            )}

            {/* Pending State */}
            {!isLoading && !error && !isCompleted && checkoutSession && (
              <div className="bg-white rounded-xl border border-blue-200 p-12 text-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">処理中です</h2>
                <p className="text-gray-500 mb-6">ご注文を処理中です。しばらくお待ちください。</p>
                <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <RefreshCw className="w-4 h-4" /> 更新する
                </Button>
              </div>
            )}

            {/* No data state */}
            {!isLoading && !error && !isCompleted && !checkoutSession && (orderId || sessionId) && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">ご注文ありがとうございます！</h1>
                <p className="text-gray-500 mb-8">ご注文が正常に完了しました。確認メールをお送りします。</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button onClick={() => setLocation("/mypage/order")} className="bg-primary hover:bg-primary/90 text-white gap-2">
                    <Package className="w-4 h-4" /> 注文履歴を確認
                  </Button>
                  <Button onClick={() => setLocation("/")} variant="outline">
                    ショッピングを続ける
                  </Button>
                </div>
              </div>
            )}

            {/* Success State */}
            {!isLoading && !error && isCompleted && (
              <>
                {/* ── 브레드크럼 ── */}
                <nav className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Link href="/" className="hover:text-primary transition-colors">ホーム</Link>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <Link href="/mypage/order" className="hover:text-primary transition-colors">注文履歴</Link>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-gray-800 font-medium">注文完了</span>
                </nav>

                {/* ── 헤더 배너 ── */}
                <div className="bg-[#f0fdf4] border border-green-200 rounded-xl p-6 flex items-center gap-5">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-9 h-9 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900">ご注文ありがとうございます！</h1>
                    <p className="text-gray-600 mt-1">
                      ご注文が正常に完了しました。確認メールをお送りします。
                    </p>
                    {order?.orderNumber && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" />
                        注文番号: <span className="font-semibold text-gray-700">{order.orderNumber}</span>
                      </p>
                    )}
                    {order?.cartGroupId && (
                      <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        カート番号: <span className="font-semibold text-pink-600">{order.cartGroupId}</span>
                      </p>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-2">
                    <Button
                      onClick={() => setLocation("/mypage/order")}
                      className="bg-primary hover:bg-primary/90 text-white gap-2 text-sm"
                    >
                      <Package className="w-4 h-4" />
                      注文履歴を確認
                    </Button>
                    <Button
                      onClick={() => setLocation("/")}
                      variant="outline"
                      className="text-sm gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      ショッピングを続ける
                    </Button>
                  </div>
                </div>

                {/* ── 주문 정보 + 가격 요약 (2컬럼) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                  {/* 좌측: 주문 상품 목록 */}
                  <div className="lg:col-span-2 space-y-5">

                    {/* 주문 상품 */}
                    {orderItems && orderItems.length > 0 && (
                      <div className="bg-white rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                          <div className="w-1 h-5 bg-primary rounded-full" />
                          <h2 className="font-bold text-gray-900">注文商品</h2>
                          <span className="ml-auto text-sm text-gray-500">{orderItems.length}点</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {orderItems.map((item) => (
                            <div key={item.id} className="flex gap-4 p-4">
                              <Link href={`/product/${item.productId}`} className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity">
                                {(item as any).productImageUrl ? (
                                  <img src={(item as any).productImageUrl} alt={item.productNameJa} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                              </Link>
                              <div className="flex-1 min-w-0">
                                <Link href={`/product/${item.productId}`} className="font-medium text-gray-900 hover:text-primary line-clamp-1 text-sm">
                                  {item.productNameJa}
                                </Link>
                                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.productName}</p>
                                {(item as any).tierName && (
                                  <p className="text-xs text-blue-600 mt-0.5">オプション: {(item as any).tierName}</p>
                                )}
                                <div className="mt-2 flex items-center justify-between">
                                  <span className="text-xs text-gray-500">{formatPrice(item.unitPrice)} × {item.quantity}</span>
                                  <span className="font-semibold text-primary text-sm">{formatPrice(item.subtotal)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 배송지 정보 */}
                    {order?.shippingAddress && (
                      <div className="bg-white rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                          <div className="w-1 h-5 bg-primary rounded-full" />
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <h2 className="font-bold text-gray-900">お届け先</h2>
                        </div>
                        <div className="p-5 space-y-1.5 text-sm">
                          <p className="font-semibold text-gray-900">{order.shippingName}</p>
                          {order.shippingPostalCode && (
                            <p className="text-gray-600">〒{order.shippingPostalCode}</p>
                          )}
                          <p className="text-gray-600">{order.shippingAddress}</p>
                          {(order as any).shippingPhone && (
                            <p className="text-gray-600">{(order as any).shippingPhone}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 다음 단계 안내 */}
                    <div className="bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                        <div className="w-1 h-5 bg-primary rounded-full" />
                        <Truck className="w-4 h-4 text-gray-500" />
                        <h2 className="font-bold text-gray-900">次のステップ</h2>
                      </div>
                      <div className="p-5">
                        <ul className="space-y-3 text-sm text-gray-700">
                          <li className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                            注文確認メールをお送りします
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                            商品の準備ができましたら、発送のお知らせをします
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                            追跡番号で配送状況を確認できます
                          </li>
                        </ul>
                        {(order as any)?.paymentMethod === "bank_transfer" && (
                          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                            <p className="font-semibold mb-1">振込先情報</p>
                            <p>ご注文確認メールに振込先情報を記載しております。</p>
                            <p>お振込み確認後、商品を発送いたします。</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 모바일용 버튼 */}
                    <div className="flex gap-3 sm:hidden">
                      <Button onClick={() => setLocation("/mypage/order")} className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2">
                        <Package className="w-4 h-4" /> 注文履歴を確認
                      </Button>
                      <Button onClick={() => setLocation("/")} variant="outline" className="flex-1">
                        続けて買う
                      </Button>
                    </div>
                  </div>

                  {/* 우측: 가격 요약 + 주문 정보 + 티어 */}
                  <div className="space-y-5">

                    {/* 가격 요약 */}
                    <div className="bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                        <div className="w-1 h-5 bg-primary rounded-full" />
                        <CreditCard className="w-4 h-4 text-gray-500" />
                        <h2 className="font-bold text-gray-900">注文金額</h2>
                      </div>
                      <div className="p-5 space-y-3 text-sm">
                        {/* 상품 소계 */}
                        <div className="flex justify-between">
                          <span className="text-gray-600">商品小計</span>
                          <span className="text-gray-900">{formatPrice(subtotal || (totalAmount - shippingFee + couponDiscount + pointsUsed))}</span>
                        </div>
                        {/* 배송비 */}
                        <div className="flex justify-between">
                          <span className="text-gray-600">送料</span>
                          <span className={shippingFee === 0 ? "text-green-600 font-medium" : "text-gray-900"}>
                            {shippingFee === 0 ? "無料" : formatPrice(shippingFee)}
                          </span>
                        </div>
                        {/* 쿠폰 할인 */}
                        {couponDiscount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5 text-pink-500" />
                              クーポン
                              {couponCode && (
                                <span className="ml-1 text-xs bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded font-mono">{couponCode}</span>
                              )}
                            </span>
                            <span className="text-pink-600 font-medium">-{formatPrice(couponDiscount)}</span>
                          </div>
                        )}
                        {/* 포인트 사용 */}
                        {pointsUsed > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-amber-500" />
                              ポイント利用
                            </span>
                            <span className="text-amber-600 font-medium">-{formatPrice(pointsUsed)}</span>
                          </div>
                        )}
                        {/* 할인 합계 */}
                        {(couponDiscount > 0 || pointsUsed > 0) && (
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>割引合計</span>
                            <span>-{formatPrice(couponDiscount + pointsUsed)}</span>
                          </div>
                        )}
                        {/* 구분선 */}
                        <div className="border-t border-gray-100 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-900">合計</span>
                            <span className="text-xl font-bold text-primary">{formatPrice(totalAmount)}</span>
                          </div>
                          {pointsEarned > 0 && (() => {
                            const tierPointRate = tierData?.tier ? Number((tierData.tier as any).pointRate ?? 1) : 1;
                            const basePoints = tierPointRate !== 1 ? Math.round(pointsEarned / tierPointRate) : pointsEarned;
                            return (
                              <div className="text-right mt-1.5">
                                {tierPointRate !== 1 ? (
                                  <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                                    <Coins className="w-3.5 h-3.5" />
                                    基本 {basePoints}P × {tierPointRate}倍
                                    {tierData?.tier && (
                                      <span className="font-medium" style={{ color: (tierData.tier as any).color }}>
                                        ({(tierData.tier as any).nameKo || (tierData.tier as any).name}ランク特典)
                                      </span>
                                    )}
                                  </p>
                                ) : null}
                                <p className="text-xs text-green-600 flex items-center justify-end gap-1 font-bold">
                                  <Coins className="w-3.5 h-3.5" />
                                  +{pointsEarned}ポイント獲得予定
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                        {/* 결제 수단 */}
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>お支払い方法</span>
                            <span className="font-medium text-gray-700">{paymentMethodLabel((order as any)?.paymentMethod)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 주문 정보 */}
                    <div className="bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                        <div className="w-1 h-5 bg-primary rounded-full" />
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <h2 className="font-bold text-gray-900">注文情報</h2>
                      </div>
                      <div className="p-5 space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">注文日時</span>
                          <span className="text-gray-800 font-medium">
                            {order?.createdAt
                              ? new Date(order.createdAt).toLocaleString("ja-JP")
                              : new Date().toLocaleString("ja-JP")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">ステータス</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            (order as any)?.paymentMethod === "bank_transfer"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }`}>
                            {(order as any)?.paymentMethod === "bank_transfer" ? "振込待ち" : "支払い完了"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 티어 진행 카드 */}
                    {showTierCard && (
                      <div className="bg-white rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                          <div className="w-1 h-5 bg-primary rounded-full" />
                          <TrendingUp className="w-4 h-4 text-pink-500" />
                          <h2 className="font-bold text-gray-900">会員ランク状況</h2>
                          <button
                            onClick={() => setLocation("/mypage/membership")}
                            className="ml-auto flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                          >
                            詳細 <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm"
                              style={{ background: tierData?.tier?.color || "#e91e8c" }}
                            >
                              <TierIcon icon={tierData?.tier?.icon || "Star"} className="w-3.5 h-3.5" />
                              <span className="font-bold">{tierData?.tier?.name}</span>
                            </div>
                            {tierData?.nextTier && (
                              <>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-sm">
                                  <TierIcon icon={tierData.nextTier.icon || "Star"} className="w-3.5 h-3.5" />
                                  <span className="font-medium">{tierData.nextTier.name}</span>
                                </div>
                              </>
                            )}
                          </div>
                          {tierData?.nextTier ? (
                            <>
                              <Progress value={tierProgress} className="h-2 mb-2" />
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>累計 ¥{(tierData.totalPurchaseAmount || 0).toLocaleString("ja-JP")}</span>
                                <span>あと ¥{Math.max(0, tierData.nextTier.minAmount - (tierData.totalPurchaseAmount || 0)).toLocaleString("ja-JP")}</span>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-amber-600 font-medium">🎉 最高ランク達成中！</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 문의 링크 */}
                    <p className="text-center text-xs text-gray-500">
                      ご質問は{" "}
                      <a href="/bbs/inquiry/create" className="text-primary hover:underline">
                        お問い合わせ
                      </a>
                      {" "}からどうぞ
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
