import { useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Copy, MapPin, CreditCard, Truck, Tag, Coins, HelpCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import { formatPrice } from "@/../../shared/utils/formatPrice";

export default function OrderConfirmation() {
  const [, params] = useRoute('/order-confirmation/:orderId');
  const orderId = params?.orderId ? Number(params.orderId) : 0;
  const { data: order, isLoading } = trpc.order.getById.useQuery(
    { orderId },
    { enabled: orderId > 0 }
  );

  const { data: orderItems } = trpc.order.getItems.useQuery(
    { orderId },
    { enabled: orderId > 0 }
  );

  // Clear cart mutation
  const clearCartMutation = trpc.cart.clear.useMutation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Clear cart when order is confirmed
  useEffect(() => {
    if (order && orderId > 0) {
      clearCartMutation.mutate();
    }
  }, [orderId, order]);

  // CookiePay: confirm payment status after redirect from CookiePay
  useEffect(() => {
    if (orderId > 0 && order && order.paymentMethod === 'cookiepay' && order.paymentStatus !== 'paid') {
      // Call server to confirm CookiePay payment
      fetch('/api/cookiepay/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'SUCCESS' }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // Refetch order to get updated status
            window.location.reload();
          }
        })
        .catch(err => console.error('[CookiePay] Confirm error:', err));
    }
  }, [orderId, order?.paymentMethod, order?.paymentStatus]);

  const handleCopyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      toast.success('注文番号をコピーしました');
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">注文情報が見つかりません</p>
            <Link href="/">
              <Button>ホームに戻る</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const subtotal = orderItems?.reduce((sum, item) => sum + Math.round(Number(item.subtotal)), 0) || 0;
  const shippingFee = Math.round(Number(order.shippingFee) || 0);
  const couponDiscount = Math.round(Number((order as any).couponDiscount) || 0);
  const pointsUsed = order.pointsUsed || 0;
  const totalAmount = Math.round(Number(order.totalAmount) || 0);
  const couponCode = (order as any).couponCode;
  const couponName = (order as any).couponName;

  const paymentMethodLabel = order.paymentMethod === 'bank_transfer' ? '銀行振込' :
    order.paymentMethod === 'credit_card' ? 'クレジットカード' :
    order.paymentMethod === 'stripe' ? 'クレジットカード' :
    order.paymentMethod || '未設定';

  const statusLabel = order.status === 'pending' ? '注文受付中' :
    order.status === 'confirmed' ? '注文確定' :
    order.status === 'shipped' ? '発送済み' :
    order.status === 'delivered' ? '配達完了' :
    order.status === 'cancelled' ? 'キャンセル' : order.status;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">

          {/* Success Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ご注文ありがとうございます</h1>
            <p className="text-sm text-gray-500 mt-1">確認メールをお送りしました</p>
          </div>

          {/* Order Number + Status Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">注文番号</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-mono text-gray-900">{order.orderNumber || order.id}</span>
                  <button onClick={handleCopyOrderNumber} className="text-gray-400 hover:text-pink-600 transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">注文状態</p>
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                  order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                  order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {statusLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span>
                注文日時: {new Date(order.createdAt).toLocaleString('ja-JP', {
                  year: 'numeric', month: '2-digit', day: '2-digit',
                  hour: '2-digit', minute: '2-digit'
                })}
              </span>
              <span className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                {paymentMethodLabel}
              </span>
            </div>

            {/* Bank Transfer Warning */}
            {order.paymentMethod === 'bank_transfer' && order.status === 'pending' && (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <span className="font-semibold">未入金:</span> お振込みをお待ちしております。
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">

            {/* Left: Order Items */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-pink-600" />
                ご注文内容
              </h2>
              <div className="space-y-3">
                {orderItems && orderItems.length > 0 ? (
                  orderItems.map((item) => (
                    <div key={item.id} className="flex gap-3 items-start">
                      {item.productImageUrl && (
                        <div className="w-14 h-14 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                          <img
                            src={item.productImageUrl}
                            alt={item.productNameJa || item.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.productNameJa || item.productName}
                        </p>
                        {(item as any).tierNameJa && (
                          <p className="text-xs text-blue-600 mt-0.5">{(item as any).tierNameJa}</p>
                        )}
                        {item.quantity > 0 && (() => {
                          const unitPrice = Math.round(Number(item.subtotal) / item.quantity);
                          return (
                            <p className="text-xs text-gray-500 mt-0.5">{formatPrice(unitPrice)} × {item.quantity}</p>
                          );
                        })()}
                      </div>
                      <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                        {formatPrice(Math.round(Number(item.subtotal)))}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">注文商品情報がありません</p>
                )}
              </div>
            </div>

            {/* Right: Payment Summary */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-3 bg-gray-50">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  注文金額
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">商品小計</span>
                  <span className="text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">送料</span>
                  <span className={shippingFee === 0 ? 'text-green-600 font-medium' : 'text-gray-900'}>
                    {shippingFee === 0 ? '無料' : formatPrice(shippingFee)}
                  </span>
                </div>

                {/* Coupon Discount */}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Tag className="w-4 h-4 text-pink-500" />
                      クーポン
                    </span>
                    <span className="text-pink-600 font-medium">-{formatPrice(couponDiscount)}</span>
                  </div>
                )}

                {/* Points Used */}
                {pointsUsed > 0 && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Coins className="w-4 h-4 text-amber-500" />
                      ポイント利用
                    </span>
                    <span className="text-amber-600 font-medium">-{formatPrice(pointsUsed)}</span>
                  </div>
                )}

                {/* Total Discount Summary */}
                {(couponDiscount > 0 || pointsUsed > 0) && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>割引合計</span>
                    <span>-{formatPrice((couponDiscount + pointsUsed))}</span>
                  </div>
                )}

                {/* Divider + Total */}
                <div className="border-t border-gray-200 my-2 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-lg">合計</span>
                    <span className="text-xl font-bold text-pink-600">{formatPrice(totalAmount)}</span>
                  </div>
                </div>

                {/* Points Earned */}
                {order.pointsEarned > 0 && (
                  <div className="mt-1 p-2 bg-amber-50 rounded-lg text-xs text-amber-700 text-center">
                    🎉 この注文で <span className="font-bold">{order.pointsEarned}P</span> 獲得予定
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shipping + Contact in one row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Shipping Address */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-pink-600" />
                お届け先
              </h2>
              <div className="text-sm text-gray-700 space-y-0.5">
                <p className="font-medium">{order.shippingName}</p>
                <p className="text-xs text-gray-500">〒{order.shippingPostalCode}</p>
                <p className="text-xs">{order.shippingAddress}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                <p>📦 配送予定日: {new Date(new Date(order.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')}</p>
                <p>🚚 配送状況: 準備中</p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">ご連絡先</h2>
              <div className="text-sm space-y-2">
                <div>
                  <p className="text-xs text-gray-500">メールアドレス</p>
                  <p className="text-gray-900 truncate">{(order as any).userEmail || '未登録'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">電話番号</p>
                  <p className="text-gray-900">{(order as any).userPhone || '未登録'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-4">
            <Link href="/mypage" className="flex-1">
              <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2.5 rounded-lg text-sm">
                注文履歴を確認
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button
                variant="outline"
                className="w-full border-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50"
              >
                ショッピングを続ける
              </Button>
            </Link>
          </div>

          {/* Support */}
          <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600">
              ご不明な点がございましたら
              <Link href="/bbs/inquiry/create" className="text-blue-600 hover:underline ml-1">お問い合わせ</Link>
              よりお気軽にご連絡ください。
            </p>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}
