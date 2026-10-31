import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle, Clock, Zap, User, Tag } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import MyPageSidebar from "@/components/MyPageSidebar";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { formatPrice } from "@/../../shared/utils/formatPrice";

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "期限なし";
  const d = new Date(date);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

function formatDiscount(type: string, value: string) {
  if (type === "percentage") return `${parseFloat(value)}%OFF`;
  return `¥${Math.round(parseFloat(value)).toLocaleString()}OFF`;
}

function isExpired(expiresAt: Date | string | null | undefined) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export default function MypageCoupons() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "used">("available");

  const { data: activeCoupons = [], isLoading: activeCouponsLoading } = trpc.coupon.listActive.useQuery();

  const { data: usageList = [], isLoading: usageLoading } = trpc.coupon.myUsageList.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    toast.success(`クーポンコード「${code}」をコピーしました`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-4">ログインが必要です</h1>
            <p className="text-gray-600 mb-6">マイページを表示するにはログインしてください。</p>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => window.location.href = getLoginUrl()}>
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
            <span className="text-gray-800 font-medium">クーポン</span>
          </p>

          <div className="flex gap-6 lg:gap-8 items-start">
            {/* Sidebar */}
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Header Banner */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="p-4 sm:p-5" style={{ backgroundColor: '#fffbeb' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">クーポン</h1>
                      <p className="text-xs text-primary font-medium mt-0.5">ご利用可能なクーポンを確認できます</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-600">利用可能</div>
                      <div className="text-2xl font-bold text-primary">{activeCoupons.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs + Content */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex border-b border-gray-100">
                  <button
                    onClick={() => setActiveTab("available")}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === "available"
                        ? "text-primary border-b-2 border-primary bg-primary/5"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Zap className="w-4 h-4 inline mr-1.5" />
                    利用可能 ({activeCoupons.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("used")}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === "used"
                        ? "text-primary border-b-2 border-primary bg-primary/5"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1.5" />
                    使用済み ({usageList.length})
                  </button>
                </div>

                {activeTab === "available" && (
                  <>
                    {activeCouponsLoading ? (
                      <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                      </div>
                    ) : activeCoupons.length === 0 ? (
                      <div className="p-12 text-center">
                        <Tag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm font-medium mb-1">利用可能なクーポンはありません</p>
                        <p className="text-xs text-gray-400">新しいクーポンが発行されるとここに表示されます</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {activeCoupons.map((coupon) => {
                          const expired = isExpired(coupon.expiresAt);
                          return (
                            <div key={coupon.id} className={`p-4 sm:p-5 ${expired ? "opacity-60" : ""}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                                      expired
                                        ? "bg-gray-100 text-gray-500 border-gray-200"
                                        : "bg-green-50 text-green-700 border-green-200"
                                    }`}>
                                      {expired ? <Clock className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                      {expired ? "期限切れ" : "利用可能"}
                                    </span>
                                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                      {formatDiscount(coupon.discountType, coupon.discountValue)}
                                    </span>
                                  </div>
                                  <h3 className="text-sm font-bold text-gray-900 mb-0.5">{coupon.nameJa}</h3>
                                  {coupon.description && (
                                    <p className="text-xs text-gray-500 mb-2">{coupon.description}</p>
                                  )}
                                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                                    <span>
                                      コード: <span className="font-mono font-semibold text-gray-700">{coupon.code}</span>
                                    </span>
                                    {coupon.minOrderAmount && parseFloat(coupon.minOrderAmount) > 0 && (
                                      <span>最低注文: {formatPrice(parseFloat(coupon.minOrderAmount))}</span>
                                    )}
                                    <span>
                                      <Clock className="w-3 h-3 inline mr-0.5" />
                                      {formatDate(coupon.expiresAt)}まで
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCopyCoupon(coupon.code)}
                                  className={`flex-shrink-0 h-8 text-xs px-3 ${
                                    copiedCode === coupon.code ? "border-green-400 text-green-600" : ""
                                  }`}
                                >
                                  {copiedCode === coupon.code ? (
                                    <><CheckCircle className="w-3.5 h-3.5 mr-1" />コピー済み</>
                                  ) : (
                                    <><Copy className="w-3.5 h-3.5 mr-1" />コピー</>
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {activeTab === "used" && (
                  <>
                    {usageLoading ? (
                      <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                      </div>
                    ) : usageList.length === 0 ? (
                      <div className="p-12 text-center">
                        <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm font-medium mb-1">使用済みクーポンはありません</p>
                        <p className="text-xs text-gray-400">クーポンを使用するとここに履歴が表示されます</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {usageList.map((usage) => (
                          <div key={usage.usageId} className="p-4 sm:p-5 opacity-75">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                                    <CheckCircle className="w-3 h-3" />使用済み
                                  </span>
                                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    -{formatPrice(parseFloat(usage.discountAmount))}
                                  </span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-0.5">{usage.nameJa}</h3>
                                {usage.description && (
                                  <p className="text-xs text-gray-500 mb-1.5">{usage.description}</p>
                                )}
                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                                  <span>
                                    コード: <span className="font-mono font-semibold text-gray-600">{usage.code}</span>
                                  </span>
                                  {usage.orderId && (
                                    <span>注文ID: #{usage.orderId}</span>
                                  )}
                                  <span>
                                    <Clock className="w-3 h-3 inline mr-0.5" />
                                    {formatDate(usage.usedAt)}使用
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Usage Guide */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">クーポンの使い方</p>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                    <span>ご利用のクーポンコードをコピーしてください</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                    <span>カートページまたは注文確認ページでクーポンコードを入力してください</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                    <span>割引が適用されます。有効期限・最低注文金額をご確認ください</span>
                  </li>
                </ol>
              </div>

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
