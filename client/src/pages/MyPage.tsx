import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MyPageSidebar from "@/components/MyPageSidebar";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag, Star, MessageSquare, Heart, Crown, Coins, Ticket,
  MapPin, ChevronRight, Gift, AlertCircle, Clock, Truck, XCircle,
  Package, User, Copy, Check, Loader2, Share2, Link2, Users
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import { useState } from "react";
import { toast } from "sonner";

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; barColor: string }> = {
  BRONZE:   { color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   label: "ブロンズ",  barColor: "bg-amber-500" },
  SILVER:   { color: "text-slate-600",   bg: "bg-slate-50",   border: "border-slate-200",   label: "シルバー",  barColor: "bg-slate-400" },
  GOLD:     { color: "text-yellow-600",  bg: "bg-yellow-50",  border: "border-yellow-200",  label: "ゴールド",  barColor: "bg-yellow-500" },
  PLATINUM: { color: "text-purple-600",  bg: "bg-purple-50",  border: "border-purple-200",  label: "プラチナ",  barColor: "bg-purple-500" },
};

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending:             { label: "注文受付中",     color: "bg-yellow-100 text-yellow-800" },
  confirmed:           { label: "注文確定",       color: "bg-blue-100 text-blue-800" },
  processing:          { label: "処理中",         color: "bg-purple-100 text-purple-800" },
  shipped:             { label: "発送済み",       color: "bg-indigo-100 text-indigo-800" },
  delivered:           { label: "配達完了",       color: "bg-green-100 text-green-800" },
  cancelled:           { label: "キャンセル",     color: "bg-red-100 text-red-800" },
  partially_cancelled: { label: "一部キャンセル", color: "bg-orange-100 text-orange-800" },
};

export default function MyPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: tierData } = trpc.membership.myTier.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const { data: referralCode } = trpc.membership.referral.getMyCode.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const { data: pointData } = trpc.point.getBalance.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const { data: ordersData } = trpc.order.list.useQuery(
    { limit: 3 },
    { enabled: isAuthenticated, staleTime: 2 * 60 * 1000 }
  );
  const { data: allOrdersData } = trpc.order.list.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated, staleTime: 5 * 60 * 1000 }
  );
  const { data: couponCount } = trpc.coupon.getExpiringCount.useQuery(
    { days: 30 },
    { enabled: isAuthenticated, staleTime: 5 * 60 * 1000 }
  );
  const { data: pendingReviewCount } = trpc.review.getPendingReviewCount.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const { data: pendingReviewItems } = trpc.review.getDeliveredProducts.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const { data: wishlistItems } = trpc.wishlist.getAll.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const { data: inquiries } = trpc.inquiries.getMyList.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const { data: addressList } = trpc.address.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-16">
          <div className="max-w-md mx-auto text-center">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-3">ログインが必要です</h1>
            <p className="text-gray-500 mb-6">マイページを表示するにはログインしてください。</p>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setLocation("/login")}>
              ログインする
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const tier = tierData?.tier;
  const tierKey = ((tier as any)?.tierCode || tier?.name?.toUpperCase() || "BRONZE") as keyof typeof TIER_CONFIG;
  const tierCfg = TIER_CONFIG[tierKey] || TIER_CONFIG.BRONZE;
  const totalPurchase = Number(tierData?.totalPurchaseAmount) || 0;
  const nextTier = tierData?.nextTier;
  const nextThreshold = nextTier ? parseFloat(String((nextTier as any).minPurchaseAmount || nextTier.minAmount || "0")) : 0;
  const progress = nextThreshold > 0 ? Math.min((totalPurchase / nextThreshold) * 100, 100) : 100;
  const pointBalance = pointData?.balance ?? user?.points ?? 0;
  const recentOrders = ordersData?.orders || [];
  const totalOrderCount = allOrdersData?.total ?? 0;
  const pendingItems = (pendingReviewItems || []).filter((p: any) => !p.hasReview);
  const openInquiries = (inquiries || []).filter((i: any) => i.status !== "closed" && i.status !== "answered");

  const referralLink = referralCode ? `${window.location.origin}/register?ref=${referralCode}` : null;

  const handleCopyCode = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("紹介コードをコピーしました");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success("招待リンクをコピーしました！友達に送ってみましょう");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareLine = () => {
    if (!referralLink) return;
    const msg = encodeURIComponent(`ココくすりで日本の医薬品・健康商品をお得に購入しませんか？\n招待リンクから登録すると特典ポイントがもらえます！`);
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(referralLink)}&text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const handleShareTwitter = () => {
    if (!referralLink) return;
    const text = encodeURIComponent(`ココくすりで日本の医薬品・健康商品をお得に購入しませんか？招待リンクから登録すると特典ポイントがもらえます！ ${referralLink}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (!referralLink) return;
    if (!navigator.share) { handleCopyLink(); return; }
    try {
      await navigator.share({ title: "ココくすり招待", text: `紹介コード「${referralCode}」を使って登録すると特典ポイントがもらえます！`, url: referralLink });
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <div className="container py-6 md:py-8">
          {/* Breadcrumb */}
          <p className="text-sm text-gray-500 mb-4">
            <span className="text-gray-800 font-medium">マイページ</span>
          </p>

          <div className="flex gap-6 lg:gap-8 items-start">
            {/* Sidebar */}
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* ── 1. 상단 헤더 배너 (타이틀 + 사용자 정보 가로 배치) ── */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* 사용자 정보 + 수치 */}
                <div className="flex-1 min-w-0 p-4 sm:p-5" style={{backgroundColor: '#fffbeb', borderColor: 'oklch(0.924 0.12 95.746)'}}>
                  {/* 사용자 이름 + 인사말 */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h2 className="text-base font-bold text-gray-900">{user?.name}様</h2>
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${tierCfg.border} ${tierCfg.color} bg-white flex-shrink-0`}>
                          <Crown className="w-2 h-2" />
                          {(tier as any)?.nameJa || tier?.name || tierCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-primary font-medium mt-0.5">ご注文履歴をご確認ください</p>
                    </div>
                    {referralCode && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-gray-400 mb-0.5">紹介コード</p>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs font-bold text-gray-700 bg-gray-50 border rounded px-1.5 py-0.5">{referralCode}</span>
                          <button onClick={handleCopyCode} className="p-0.5 rounded hover:bg-gray-100 transition-colors">
                            {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 주문/쿠폰/포인트 수치 가로 배치 */}
                  <div className="flex items-stretch border border-gray-200 rounded-lg overflow-hidden mb-3" style={{backgroundColor: '#ffffff'}}>
                    <Link href="/mypage/order" className="flex-1">
                      <div className="flex flex-col items-center justify-center py-2.5 px-3 hover:bg-gray-50 transition-colors cursor-pointer h-full">
                        <p className="text-xs text-gray-500 mb-1">注文/配送</p>
                        <p className="text-lg font-bold text-primary">{totalOrderCount}<span className="text-xs font-normal text-gray-500 ml-0.5">件</span></p>
                      </div>
                    </Link>
                    <div className="w-px bg-gray-200" />
                    <Link href="/mypage/coupons" className="flex-1">
                      <div className="flex flex-col items-center justify-center py-2.5 px-3 hover:bg-gray-50 transition-colors cursor-pointer h-full">
                        <p className="text-xs text-gray-500 mb-1">クーポン</p>
                        <p className="text-lg font-bold text-primary">{couponCount?.count ?? 0}<span className="text-xs font-normal text-gray-500 ml-0.5">枚</span></p>
                      </div>
                    </Link>
                    <div className="w-px bg-gray-200" />
                    <Link href="/mypage/points" className="flex-1">
                      <div className="flex flex-col items-center justify-center py-2.5 px-3 hover:bg-gray-50 transition-colors cursor-pointer h-full">
                        <p className="text-xs text-gray-500 mb-1">ポイント</p>
                        <p className="text-lg font-bold text-primary">{pointBalance.toLocaleString()}<span className="text-xs font-normal text-gray-500 ml-0.5">pt</span></p>
                      </div>
                    </Link>
                  </div>

                  {/* 1:1 문의 건수 */}
                  <div className="flex items-center gap-3">
                    <Link href="/mypage/inquiries">
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors cursor-pointer" style={{backgroundColor: '#ffffff'}}>
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600">1:1お問い合わせ</span>
                        <span className="text-xs font-bold text-gray-900 ml-1">{inquiries?.length ?? 0}件</span>
                      </div>
                    </Link>
                    {nextTier && (
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                          <span>累計購入 {formatPrice(totalPurchase)}</span>
                          <span>{(nextTier as any).nameJa || nextTier.name}まで {formatPrice(Math.max(0, nextThreshold - totalPurchase))}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${tierCfg.barColor}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* ── 2-B. 추천인 코드 마케팅 카드 ────────────────── */}
              {referralCode && (
                <div className="relative overflow-hidden rounded-2xl shadow-sm border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-200/30 rounded-full -translate-y-12 translate-x-12 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-28 h-28 bg-teal-200/20 rounded-full translate-y-8 -translate-x-6 pointer-events-none" />
                  <div className="relative p-4 sm:p-5">
                    {/* 헤더 */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">友達を招待してポイントをもらおう！</h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">招待した友達が登録すると、あなたにもポイントが付与されます</p>
                      </div>
                    </div>
                    {/* 코드 + 링크 표시 */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-emerald-200 p-3 mb-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div>
                          <p className="text-[10px] text-gray-400 mb-0.5">あなたの招待コード</p>
                          <span className="font-mono text-xl font-extrabold text-emerald-700 tracking-widest">{referralCode}</span>
                        </div>
                        <button
                          onClick={handleCopyCode}
                          className="flex items-center gap-1.5 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "コピー済" : "コードをコピー"}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-200">
                        <Link2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="text-[10px] text-gray-500 truncate flex-1 font-mono">{referralLink}</span>
                        <button
                          onClick={handleCopyLink}
                          className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 transition-colors"
                          title="リンクをコピー"
                        >
                          {copiedLink ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                    {/* 공유 버튼들 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleCopyLink}
                        className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        リンクをコピー
                      </button>
                      <button
                        onClick={handleShareLine}
                        className="flex items-center gap-1.5 text-xs bg-[#06C755] hover:bg-[#05b34c] text-white font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        LINEで送る
                      </button>
                      <button
                        onClick={handleShareTwitter}
                        className="flex items-center gap-1.5 text-xs bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Xでシェア
                      </button>
                      {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <button
                          onClick={handleNativeShare}
                          className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-800 text-white font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          その他でシェア
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 3. 리뷰 미작성 강조 배너 ─────────────── */}
              {pendingItems.length > 0 && (
                <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 shadow-md">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />
                  <div className="absolute bottom-0 left-1/3 w-20 h-20 bg-white/10 rounded-full translate-y-8 pointer-events-none" />
                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Star className="w-6 h-6 text-white fill-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-white text-sm">レビューを書いてポイントをもらおう！</h3>
                          <span className="bg-white text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {pendingItems.length}件 未投稿
                          </span>
                        </div>
                        <p className="text-xs text-orange-100">
                          レビュー投稿で<span className="font-bold text-white">ポイントプレゼント</span>中！まだレビューしていない商品があります。
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {pendingItems.slice(0, 3).map((item: any) => (
                            <span key={item.orderItemId} className="text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full truncate max-w-[160px]">
                              {item.productNameJa || item.productName}
                            </span>
                          ))}
                          {pendingItems.length > 3 && (
                            <span className="text-[11px] text-orange-100 font-medium">+{pendingItems.length - 3}件</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link href="/mypage/reviews">
                      <Button size="sm" className="bg-white text-orange-600 hover:bg-orange-50 flex-shrink-0 text-xs font-bold shadow-sm">
                        レビューを書く →
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* ── 4. 최근 주문 ─────────────────────────────── */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-gray-500" />
                    <h3 className="font-bold text-gray-900 text-sm">最近の注文</h3>
                  </div>
                  <Link href="/mypage/order">
                    <span className="text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer">
                      すべて見る <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </div>
                {recentOrders.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">注文履歴はありません</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {recentOrders.map((order: any) => {
                      const st = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
                      return (
                        <Link key={order.id} href={`/mypage/order/${order.id}`}>
                          <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="text-xs text-gray-400">#{order.orderNumber || order.id}</span>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${st.color}`}>
                                  {st.label}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {order.items?.[0]?.productNameJa || order.items?.[0]?.productName || "商品"}
                                {order.items?.length > 1 && ` 他${order.items.length - 1}点`}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-gray-900">{formatPrice(order.totalAmount)}</p>
                              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto mt-1" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── 5. 문의 + 리뷰 현황 ──────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                      <h3 className="font-bold text-gray-900 text-sm">お問い合わせ</h3>
                    </div>
                    <Link href="/mypage/inquiries">
                      <span className="text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer">
                        詳細 <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </Link>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{inquiries?.length ?? 0}</p>
                        <p className="text-xs text-gray-500">合計</p>
                      </div>
                      <div className="w-px h-8 bg-gray-100" />
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{openInquiries.length}</p>
                        <p className="text-xs text-gray-500">対応中</p>
                      </div>
                    </div>
                    {openInquiries.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg px-2.5 py-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{openInquiries.length}件の問い合わせが対応中です</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-gray-500" />
                      <h3 className="font-bold text-gray-900 text-sm">レビュー</h3>
                    </div>
                    <Link href="/mypage/reviews">
                      <span className="text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer">
                        詳細 <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </Link>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {(pendingReviewItems?.length ?? 0) - pendingItems.length}
                        </p>
                        <p className="text-xs text-gray-500">投稿済み</p>
                      </div>
                      <div className="w-px h-8 bg-gray-100" />
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-500">{pendingItems.length}</p>
                        <p className="text-xs text-gray-500">未投稿</p>
                      </div>
                    </div>
                    {pendingItems.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 rounded-lg px-2.5 py-1.5">
                        <Gift className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>レビューでポイントGET！</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── 6. 빠른 링크 ─────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { href: "/mypage/profile-edit", icon: User, label: "プロフィール編集", color: "text-gray-600" },
                  { href: "/mypage/membership", icon: Crown, label: "会員ランク・紹介", color: "text-yellow-600" },
                  { href: "/mypage/addresses", icon: MapPin, label: "お届け先住所", color: "text-blue-600" },
                ].map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors cursor-pointer flex items-center gap-3 group">
                      <item.icon className={`w-5 h-5 ${item.color} flex-shrink-0`} />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
