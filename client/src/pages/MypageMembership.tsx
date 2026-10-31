import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, Star, Gem, Copy, Share2, Users, Gift, TrendingUp, ChevronRight, Link2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import MyPageSidebar from "@/components/MyPageSidebar";
import { toast } from "sonner";
import { useState } from "react";

// Tier icon mapping
function TierIcon({ icon, className, style }: { icon: string; className?: string; style?: React.CSSProperties }) {
  switch (icon) {
    case "Crown": return <Crown className={className} style={style} />;
    case "Gem": return <Gem className={className} style={style} />;
    default: return <Star className={className} style={style} />;
  }
}

export default function MypageMembership() {
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery();
  const isAuthenticated = !!user;
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [instagramModalOpen, setInstagramModalOpen] = useState(false);

  // Fetch tier info
  const { data: tierData, isLoading: tierLoading } = trpc.membership.myTier.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Fetch all tiers for progress display
  const { data: allTiers = [] } = trpc.membership.tiers.list.useQuery();

  // Fetch referral code
  const { data: referralCode } = trpc.membership.referral.getMyCode.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Referral link (uses the deployed domain)
  const SITE_URL = "https://koreamall24.com";
  const referralLink = referralCode ? `${SITE_URL}/register?ref=${referralCode}` : null;

  // Fetch referral stats
  const { data: referralStats } = trpc.membership.referral.getMyReferrals.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success("紹介コードをコピーしました");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareCode = () => {
    if (referralCode) {
      const shareText = `koreamall24で一緒にお買い物しませんか？紹介コード「${referralCode}」を使って登録すると特典がもらえます！`;
      if (navigator.share) {
        navigator.share({ title: "koreamall24紹介", text: shareText, url: referralLink || undefined }).catch(() => {});
      } else {
        navigator.clipboard.writeText(shareText);
        toast.success("共有テキストをコピーしました");
      }
    }
  };

  const handleCopyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setLinkCopied(true);
      toast.success("招待リンクをコピーしました");
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleLineShare = () => {
    if (!referralLink) return;
    const text = encodeURIComponent(`koreamall24で日本の医薬品・健康商品をお得に購入しませんか？\n紹介リンクから登録すると特典ポイントがもらえます！\n${referralLink}`);
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(referralLink)}&text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleTwitterShare = () => {
    if (!referralLink) return;
    const text = encodeURIComponent(`koreamall24で日本の医薬品・健康商品を購入しています！紹介リンクから登録すると特典ポイントがもらえます 🎁`);
    const url = encodeURIComponent(referralLink);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener,noreferrer");
  };

  const handleInstagramShare = () => {
    if (!referralLink) return;
    // Instagram doesn't support direct URL sharing — copy to clipboard and guide user
    navigator.clipboard.writeText(`koreamall24で日本の医薬品・健康商品をお得に購入しませんか？\n紹介リンクから登録すると特典ポイントがもらえます！\n${referralLink}`);
    setInstagramModalOpen(true);
  };

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <Crown className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-4">ログインが必須です</h1>
            <p className="text-gray-600 mb-6">会員情報を表示するにはログインしてください。</p>
            <Button onClick={() => window.location.href = getLoginUrl()}>ログインページへ</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (authLoading || tierLoading) {
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

  // OAuth users (loginMethod !== 'email') don't have registered_users records
  const isOAuthUser = user?.loginMethod && user.loginMethod !== 'email';

  const currentTier = tierData?.tier;
  const nextTier = tierData?.nextTier;
  const totalPurchase = tierData?.totalPurchaseAmount || 0;

  // Calculate progress to next tier
  const progressPercent = nextTier
    ? Math.min(100, Math.round((totalPurchase / nextTier.minAmount) * 100))
    : 100;
  const amountToNext = nextTier ? Math.max(0, nextTier.minAmount - totalPurchase) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/mypage" className="flex items-center gap-1 text-primary hover:underline font-medium">
            <ChevronRight className="w-4 h-4 rotate-180" />
            マイページに戻る
          </Link>
        </div>

        <div className="flex gap-6 lg:gap-8 items-start">
          {/* Sidebar */}
          <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <MyPageSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Header Banner */}
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-5 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  会員ランク・紹介
                </h1>
                <p className="text-sm text-amber-700 mt-0.5">ご注文状況をご確認ください</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">現在のランク</p>
                <p className="text-2xl font-bold text-primary">{currentTier?.name || "—"}</p>
              </div>
            </div>

            {/* OAuth user notice */}
            {isOAuthUser && (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 flex items-start gap-3">
                <Crown className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 text-sm">会員ランクはメール会員登録が必要です</p>
                  <p className="text-xs text-amber-700 mt-1">
                    現在はソーシャルログインでご利用中です。会員ランク・ポイント・紹介コードをご利用いただくには、メールアドレスでの会員登録が必要です。
                  </p>
                  <Link href="/register" className="text-xs text-amber-600 underline mt-1 inline-block">メール会員登録はこちら →</Link>
                </div>
              </div>
            )}

            {/* Current Tier Card */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Tier Header - colored gradient */}
              <div
                className="p-6 text-white relative"
                style={{
                  background: currentTier
                    ? `linear-gradient(135deg, ${currentTier.color}ee, ${currentTier.color}99)`
                    : "linear-gradient(135deg, #9CA3AFee, #9CA3AF99)",
                }}
              >
                <div className="absolute top-4 right-4 opacity-15">
                  <TierIcon icon={currentTier?.icon || "Star"} className="w-28 h-28" />
                </div>
                <div className="relative z-10">
                  <p className="text-xs opacity-80 mb-1 uppercase tracking-wider">現在の会員ランク</p>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="bg-white/20 rounded-full p-2">
                      <TierIcon icon={currentTier?.icon || "Star"} className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold leading-tight">{currentTier?.name || "未設定"}</h2>
                      <p className="text-sm opacity-75">{currentTier?.nameKo || "未設定"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                      <p className="text-xs opacity-75 mb-1">割引率</p>
                      <p className="text-xl font-bold">{currentTier?.discountRate || "0"}%</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                      <p className="text-xs opacity-75 mb-1">ポイント還元</p>
                      <p className="text-xl font-bold">{currentTier?.pointRate || "1"}%</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                      <p className="text-xs opacity-75 mb-1">累計購入額</p>
                      <p className="text-lg font-bold">¥{totalPurchase.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress to next tier */}
              {nextTier ? (
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      次のランク: <span className="font-semibold text-gray-800">{nextTier.name}</span>
                      <span className="text-xs text-gray-500 ml-1">({nextTier.nameKo})</span>
                    </span>
                    <span className="text-sm font-bold text-primary">
                      あと ¥{amountToNext.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${progressPercent}%`, backgroundColor: nextTier.color }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">{progressPercent}% 達成</p>
                </div>
              ) : currentTier ? (
                <div className="p-4 bg-amber-50 border-t border-amber-100 text-center">
                  <p className="text-sm font-medium text-amber-700">🎉 最高ランクに到達しました！</p>
                </div>
              ) : null}
            </div>

            {/* All Tiers Overview */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                ランク一覧・特典比較
              </h3>
              <div className="space-y-2">
                {allTiers.map((tier: any) => {
                  const isCurrent = currentTier?.id === tier.id;
                  return (
                    <div
                      key={tier.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isCurrent
                          ? "border-primary bg-primary/5"
                          : "border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: tier.color + "22" }}
                        >
                          <TierIcon icon={tier.icon} className="w-4 h-4" style={{ color: tier.color }} />
                        </div>
                        <div>
                          <p className={`font-medium text-sm ${isCurrent ? "text-primary" : "text-gray-800"}`}>
                            {tier.name}
                            <span className="text-xs text-gray-400 ml-1">({tier.nameKo})</span>
                            {isCurrent && (
                              <span className="ml-2 text-xs bg-primary text-white px-1.5 py-0.5 rounded-full">現在</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            ¥{Number(tier.minAmount).toLocaleString()} 以上
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-right">
                        <div>
                          <p className="text-xs text-gray-400">割引</p>
                          <p className="font-semibold text-gray-700">{tier.discountRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">ポイント</p>
                          <p className="font-semibold text-gray-700">{tier.pointRate}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Referral Program */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Gift className="w-5 h-5 text-primary" />
                友達紹介プログラム
              </h3>

              {/* Referral Stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Users className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-xl font-bold text-blue-600">{referralStats?.totalReferrals || 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">紹介人数</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                  <Gift className="w-5 h-5 mx-auto text-green-500 mb-1" />
                  <p className="text-xl font-bold text-green-600">{referralStats?.completedCount || 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">報酬獲得</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <Star className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                  <p className="text-xl font-bold text-amber-600">{referralStats?.totalEarned || 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">獲得ポイント</p>
                </div>
              </div>

              {/* Referral Code & Link */}
              {referralCode ? (
                <div className="space-y-3">
                  {/* Code copy */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">紹介コード</p>
                      <p className="font-mono font-bold text-gray-900 text-lg tracking-widest">{referralCode}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyCode}
                      className="shrink-0 gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? "コピー済" : "コピー"}
                    </Button>
                  </div>

                  {/* Link copy */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">招待リンク</p>
                      <p className="text-xs text-gray-600 truncate font-mono">{referralLink}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyLink}
                      className="shrink-0 gap-1.5"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      {linkCopied ? "コピー済" : "コピー"}
                    </Button>
                  </div>

                  {/* SNS Share buttons */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">SNSでシェア</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleLineShare}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#06C755] hover:opacity-90 transition-opacity"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                        </svg>
                        LINE
                      </button>
                      <button
                        onClick={handleTwitterShare}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-black hover:opacity-80 transition-opacity"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 5.88zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        X (Twitter)
                      </button>
                      <button
                        onClick={handleInstagramShare}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-opacity"
                        style={{ background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                        </svg>
                        Instagram
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleShareCode}
                        className="gap-1.5"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        その他
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">紹介コードは会員登録時に自動発行されます。</p>
              )}

              {/* How it works */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">紹介プログラムの仕組み</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { step: "1", text: "紹介コードをお友達に共有" },
                    { step: "2", text: "お友達が紹介コードで会員登録" },
                    { step: "3", text: "登録・初回購入でポイント報酬獲得！" },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
                      <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">{step}</span>
                      <p className="text-xs text-gray-600 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent referrals */}
              {referralStats && referralStats.rewards.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">紹介履歴</p>
                  <div className="space-y-2">
                    {referralStats.rewards.slice(0, 5).map((reward: any) => (
                      <div key={reward.id} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-gray-50">
                        <span className="text-gray-600 text-xs">
                          {reward.type === "signup" ? "会員登録" : "初回購入"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            reward.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {reward.status === "completed" ? "完了" : "保留中"}
                          </span>
                          <span className="font-semibold text-green-600 text-xs">+{reward.referrerReward}P</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Instagram Guide Modal */}
      {instagramModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setInstagramModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(45deg, #f09433, #dc2743, #bc1888)" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900">Instagramでシェア</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              テキストをクリップボードにコピーしました。Instagramアプリを開いて投稿またはストーリーに貼り付けてください。
            </p>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 mb-4 break-all">
              koreamall24で日本の医薬品・健康商品をお得に購入しませんか？<br />
              紹介リンクから登録すると特典ポイントがもらえます！<br />
              {referralLink}
            </div>
            <Button size="sm" className="w-full" onClick={() => setInstagramModalOpen(false)}>
              閉じる
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
