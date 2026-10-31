import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown, Star, Gem, Gift, ShoppingBag, MessageSquare, Users, ChevronRight,
  CheckCircle, Coins, Camera, FileText, UserPlus, Award, TrendingUp, Sparkles
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

function TierIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "Crown": return <Crown className={className} />;
    case "Gem": return <Gem className={className} />;
    default: return <Star className={className} />;
  }
}

export default function FirstTimeCustomer() {
  const { user } = useAuth();
  const { data: tiers = [] } = trpc.membership.tiers.list.useQuery();
  const { data: referralData } = trpc.membership.referral.getSettings.useQuery();
  const { data: reviewPointsData } = trpc.settings.getReviewPoints.useQuery();
  const { data: signupPointsData } = trpc.settings.getSignupPoints.useQuery();
  // 로그인 사용자의 현재 등급 정보 (membership.me 없으면 로그인 사용자 정보로 대체)
  const { data: myMembership } = trpc.membership.myTier.useQuery(undefined, { enabled: !!user });

  // DB에서 가져온 실제 설정값
  const reviewPoints = reviewPointsData?.base ?? 1500;
  const reviewImagePoints = reviewPointsData?.image ?? 500;
  const reviewDetailPoints = reviewPointsData?.detail ?? 200;
  const purchasePointRate = 1;
  const signupPoints = signupPointsData?.signupPoints ?? 500;

  const referrerReward = referralData?.signupReferrerReward ?? 500;
  const refereeReward = referralData?.signupRefereeReward ?? 500;
  const purchaseReferrerReward = referralData?.purchaseReferrerReward ?? 1000;

  const displayTiers = tiers.length > 0 ? tiers : [
    { name: "BRONZE", nameJa: "ブロンズ", color: "#CD7F32", icon: "Star", minAmount: 0, discountRate: "0", pointRate: "0.50" },
    { name: "SILVER", nameJa: "シルバー", color: "#9CA3AF", icon: "Star", minAmount: 50000, discountRate: "0", pointRate: "1.00" },
    { name: "GOLD", nameJa: "ゴールド", color: "#F59E0B", icon: "Crown", minAmount: 200000, discountRate: "0", pointRate: "1.50" },
    { name: "PLATINUM", nameJa: "プラチナ", color: "#8B5CF6", icon: "Gem", minAmount: 500000, discountRate: "0", pointRate: "2.00" },
    { name: "DIAMOND", nameJa: "ダイヤモンド", color: "#EC4899", icon: "Gem", minAmount: 1000000, discountRate: "0", pointRate: "3.00" },
  ];

  // 등급별 pointRate를 이용한 購入ポイント 표시용 데이터
  const bronzeTier = displayTiers.find(t => t.name === 'BRONZE');
  const goldTier = displayTiers.find(t => t.name === 'GOLD');
  const platinumTier = displayTiers.find(t => t.name === 'PLATINUM');
  const diamondTier = displayTiers.find(t => t.name === 'DIAMOND');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-pink-50 to-purple-50 border-b border-primary/10">
        <div className="container max-w-5xl mx-auto py-12 px-4 text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            はじめてのお客様へ
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            ようこそ、<span className="text-primary">CoCo Kusuri</span> へ！
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
            会員登録するだけで、たくさんの特典が受けられます。<br />
            ポイント・等級・紹介特典など、お得な制度をご確認ください。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white px-8">
              <Link href="/register">
                <UserPlus className="w-4 h-4 mr-2" />
                今すぐ無料会員登録
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8">
              <Link href="/login">すでに会員の方はこちら</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto py-10 px-4 space-y-12">

        {/* 1. 회원 등급제 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">会員ランク制度</h2>
              <p className="text-sm text-gray-500">購入金額に応じてランクアップ！上位ランクほどお得な特典が充実</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {displayTiers.map((tier: any, idx: number) => {
              const isCurrentTier = myMembership?.tier?.name === tier.name;
              return (
              <div
                key={idx}
                className={`bg-white rounded-xl border overflow-hidden relative ${
                  isCurrentTier ? 'border-2 ring-2 ring-offset-1' : 'border-gray-200'
                }`}
                style={isCurrentTier ? { borderColor: tier.color } : {}}
              >
                <div
                  className="p-4 text-white text-center"
                  style={{ background: `linear-gradient(135deg, ${tier.color}ee, ${tier.color}88)` }}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <TierIcon icon={tier.icon || "Star"} className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-bold text-base leading-tight">{tier.nameJa || tier.name}</p>
                  {isCurrentTier && (
                    <div className="absolute top-2 right-2">
                      <span className="text-xs bg-white/90 font-bold px-1.5 py-0.5 rounded-full" style={{ color: tier.color }}>現在</span>
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">累計購入</span>
                    <span className="font-semibold text-gray-800 text-xs">
                      {Number(tier.minAmount).toLocaleString()}円〜
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">割引率</span>
                    <span className="font-bold text-xs" style={{ color: tier.color }}>
                      {tier.discountRate}% OFF
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">還元率</span>
                    <span className="font-semibold text-primary text-xs">{tier.pointRate}%</span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              ランクは直近6ヶ月間の累計購入金額で自動的に判定されます。上位ランクになるほど割引率とポイント還元率がアップします！
            </p>
          </div>
        </section>

        {/* 2. 포인트 적립 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Coins className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">ポイント積立システム</h2>
              <p className="text-sm text-gray-500">お買い物・レビュー・会員登録でポイントが貯まります</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 구매 포인트 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="font-bold text-gray-800">購入ポイント</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">通常購入（ブロンズ）</span>
                  <span className="font-bold text-primary">購入金額の{Number(bronzeTier?.pointRate ?? 0.5)}%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">ゴールド会員</span>
                  <span className="font-bold text-amber-500">購入金額の{Number(goldTier?.pointRate ?? 1.5)}%</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">プラチナ・ダイヤモンド会員</span>
                  <span className="font-bold text-purple-500">購入金額の{Number(platinumTier?.pointRate ?? 2)}〜{Number(diamondTier?.pointRate ?? 3)}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">※ 上位ランクほどポイント還元率がアップします</p>
            </div>

            {/* 회원가입 포인트 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-green-500" />
                </div>
                <h3 className="font-bold text-gray-800">登録・特別ポイント</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">新規会員登録</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="font-bold text-green-600">{Number(signupPoints).toLocaleString()}pt</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">紹介コードで登録</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="font-bold text-green-600">+{Number(refereeReward).toLocaleString()}pt</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">1pt = 1円として利用可能</span>
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">現金同等</Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 리뷰 포인트 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">レビューポイント積立</h2>
              <p className="text-sm text-gray-500">商品レビューを書くだけでポイントがもらえます</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
              <p className="text-sm text-blue-700 font-medium">
                📝 購入した商品にレビューを投稿すると、最大{" "}
                <span className="font-bold text-blue-900 text-base">
                  {reviewPoints + reviewImagePoints + reviewDetailPoints}pt
                </span>{" "}
                が獲得できます！
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">テキストレビュー</p>
                  <p className="text-xs text-gray-500">商品の感想を書くだけ</p>
                </div>
                <p className="font-bold text-primary text-lg">{reviewPoints.toLocaleString()}pt</p>
              </div>
              <div className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">画像添付ボーナス</p>
                  <p className="text-xs text-gray-500">写真を1枚以上添付した場合</p>
                </div>
                <p className="font-bold text-purple-600 text-lg">+{reviewImagePoints.toLocaleString()}pt</p>
              </div>
              <div className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">詳細レビューボーナス</p>
                  <p className="text-xs text-gray-500">100文字以上の詳細なレビュー</p>
                </div>
                <p className="font-bold text-green-600 text-lg">+{reviewDetailPoints.toLocaleString()}pt</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. 추천인 시스템 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">友達紹介システム</h2>
              <p className="text-sm text-gray-500">友達を紹介するとお互いにポイントがもらえます</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="w-6 h-6 text-pink-500" />
                </div>
                <div className="text-xs font-bold text-pink-500 mb-1 uppercase tracking-wide">STEP 1</div>
                <h4 className="font-bold text-gray-800 mb-2">紹介コードを共有</h4>
                <p className="text-xs text-gray-500">マイページから紹介コードを取得して、友達にシェアしましょう</p>
              </div>
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-purple-500" />
                </div>
                <div className="text-xs font-bold text-purple-500 mb-1 uppercase tracking-wide">STEP 2</div>
                <h4 className="font-bold text-gray-800 mb-2">友達が登録</h4>
                <p className="text-xs text-gray-500 mb-3">紹介コードを使って会員登録すると、双方にポイントが付与されます</p>
                <div className="flex justify-center gap-3">
                  <div className="bg-pink-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">紹介した方</p>
                    <p className="font-bold text-pink-600">+{Number(referrerReward).toLocaleString()}pt</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">登録した方</p>
                    <p className="font-bold text-purple-600">+{Number(refereeReward).toLocaleString()}pt</p>
                  </div>
                </div>
              </div>
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <div className="text-xs font-bold text-green-500 mb-1 uppercase tracking-wide">STEP 3</div>
                <h4 className="font-bold text-gray-800 mb-2">初回購入でさらにボーナス</h4>
                <p className="text-xs text-gray-500 mb-3">紹介した友達が初めて購入すると、追加ポイントが付与されます</p>
                <div className="bg-green-50 rounded-lg px-3 py-2 inline-block">
                  <p className="text-xs text-gray-500">初回購入ボーナス</p>
                  <p className="font-bold text-green-600">+{Number(purchaseReferrerReward).toLocaleString()}pt</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-primary/10 to-pink-100 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">今すぐ会員登録して特典をゲット！</h2>
          <p className="text-gray-600 mb-6">
            登録するだけで{" "}
            <span className="font-bold text-primary">{Number(signupPoints).toLocaleString()}pt</span>{" "}
            プレゼント！紹介コードを使えばさらに{" "}
            <span className="font-bold text-primary">+{Number(refereeReward).toLocaleString()}pt</span>{" "}
            追加！
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white px-10">
              <Link href="/register">
                <UserPlus className="w-4 h-4 mr-2" />
                無料会員登録
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-10">
              <Link href="/">
                <ChevronRight className="w-4 h-4 mr-1" />
                商品を見る
              </Link>
            </Button>
          </div>
        </section>

      </div>

      <Footer />
    </div>
  );
}
