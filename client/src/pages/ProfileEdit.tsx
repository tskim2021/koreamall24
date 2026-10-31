import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, User, ArrowLeft, Mail, Lock, Eye, EyeOff,
  CheckCircle, MapPin, Crown, ChevronRight, Shield, Pencil
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import MyPageSidebar from "@/components/MyPageSidebar";
import { useState, useEffect } from "react";
import { handleKatakanaChange } from "@/hooks/useKatakanaInput";
import { toast } from "sonner";

// 등급별 색상 매핑
const TIER_STYLES: Record<string, { gradient: string; text: string; badge: string; icon: string }> = {
  BRONZE:   { gradient: "from-amber-50 to-orange-50",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-800 border-amber-200", icon: "text-amber-500" },
  SILVER:   { gradient: "from-slate-50 to-gray-100",   text: "text-slate-600",  badge: "bg-slate-100 text-slate-700 border-slate-200", icon: "text-slate-400" },
  GOLD:     { gradient: "from-yellow-50 to-amber-50",  text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "text-yellow-500" },
  PLATINUM: { gradient: "from-purple-50 to-indigo-50", text: "text-purple-700", badge: "bg-purple-100 text-purple-800 border-purple-200", icon: "text-purple-500" },
};

function getTierStyle(tierName?: string | null) {
  if (!tierName) return { gradient: "from-gray-50 to-gray-100", text: "text-gray-600", badge: "bg-gray-100 text-gray-700 border-gray-200", icon: "text-gray-400" };
  const upper = tierName.toUpperCase();
  for (const key of Object.keys(TIER_STYLES)) {
    if (upper.includes(key)) return TIER_STYLES[key];
  }
  return { gradient: "from-gray-50 to-gray-100", text: "text-gray-600", badge: "bg-gray-100 text-gray-700 border-gray-200", icon: "text-gray-400" };
}

// 섹션 헤더 컴포넌트
function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function ProfileEdit() {
  const { data: authUser, isLoading: authLoading } = trpc.auth.me.useQuery();
  const isAuthenticated = !!authUser;
  const [, navigate] = useLocation();

  const { data: profile, isLoading: profileLoading } = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: membershipData } = trpc.membership.myTier.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const [formData, setFormData] = useState({
    lastNameKanji: "",
    firstNameKanji: "",
    lastNameKatakana: "",
    firstNameKatakana: "",
    gender: "no_answer" as "male" | "female" | "no_answer",
    phone: "",
  });

  const [pwData, setPwData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPw, setIsSubmittingPw] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        lastNameKanji: (profile as any).lastNameKanji || "",
        firstNameKanji: (profile as any).firstNameKanji || "",
        lastNameKatakana: (profile as any).lastNameKatakana || "",
        firstNameKatakana: (profile as any).firstNameKatakana || "",
        gender: ((profile as any).gender as "male" | "female" | "no_answer") || "no_answer",
        phone: (profile as any).phone || "",
      });
    }
  }, [profile]);

  const utils = trpc.useUtils();

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("プロフィールを更新しました");
      utils.user.getProfile.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (e: any) => toast.error(e.message || "プロフィール更新に失敗しました"),
  });

  const changePasswordMutation = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      toast.success("パスワードを変更しました");
      setPwData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (e: any) => toast.error(e.message || "パスワード変更に失敗しました"),
  });

  const deleteAccountMutation = trpc.user.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("退会処理が完了しました");
      navigate("/");
    },
    onError: (e: any) => {
      toast.error(e.message || "退会処理に失敗しました");
      setIsDeletingAccount(false);
    },
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const katakanaRegex = /^[゠-ヿー　\s　]*$/;
    if (formData.lastNameKatakana && !katakanaRegex.test(formData.lastNameKatakana)) {
      toast.error("フリガナはカタカナで入力してください"); return;
    }
    if (formData.firstNameKatakana && !katakanaRegex.test(formData.firstNameKatakana)) {
      toast.error("フリガナはカタカナで入力してください"); return;
    }
    setIsSubmittingProfile(true);
    try {
      const nameKanji = formData.lastNameKanji && formData.firstNameKanji
        ? `${formData.lastNameKanji}　${formData.firstNameKanji}` : undefined;
      const nameHiragana = formData.lastNameKatakana && formData.firstNameKatakana
        ? `${formData.lastNameKatakana}　${formData.firstNameKatakana}` : undefined;
      await updateProfileMutation.mutateAsync({ ...formData, name: nameKanji, nameKanji, nameHiragana });
    } finally { setIsSubmittingProfile(false); }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwData.newPassword !== pwData.confirmPassword) { toast.error("新しいパスワードが一致しません"); return; }
    if (pwData.newPassword.length < 6) { toast.error("パスワードは6文字以上で入力してください"); return; }
    setIsSubmittingPw(true);
    try {
      await changePasswordMutation.mutateAsync({ currentPassword: pwData.currentPassword, newPassword: pwData.newPassword });
    } finally { setIsSubmittingPw(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "退会する") { toast.error("「退会する」と入力してください"); return; }
    setIsDeletingAccount(true);
    await deleteAccountMutation.mutateAsync({ confirmText: "退会する" });
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-4">ログインが必須です</h1>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => window.location.href = getLoginUrl()}>
              ログインページへ
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (authLoading || profileLoading) {
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

  const isEmailUser = (authUser as any)?.loginMethod === "email";
  const tier = (membershipData as any)?.tier;
  const tierStyle = getTierStyle(tier?.name);
  const totalPurchase = (membershipData as any)?.totalPurchaseAmount || 0;
  const nextTier = (membershipData as any)?.nextTier;
  const pointRate = tier ? parseFloat(tier.pointRate || "0") : 0;
  const discountRate = tier ? parseFloat(tier.discountRate || "0") : 0;
  const nextThreshold = nextTier ? parseFloat(nextTier.minPurchaseAmount || "0") : 0;
  const currentThreshold = tier ? parseFloat(tier.minPurchaseAmount || "0") : 0;
  const progress = nextTier
    ? Math.min(100, ((totalPurchase - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100;

  const pwMatch = pwData.newPassword && pwData.confirmPassword && pwData.newPassword === pwData.confirmPassword;
  const pwMismatch = pwData.newPassword && pwData.confirmPassword && pwData.newPassword !== pwData.confirmPassword;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container py-8">
        <div className="mb-6">
          <Link href="/mypage" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            マイページに戻る
          </Link>
        </div>

        <div className="flex gap-6 lg:gap-8 items-start">
          <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <MyPageSidebar />
          </div>

          <div className="flex-1 min-w-0 space-y-4">

            {/* ── Page Title ── */}
            <div className="mb-2">
              <h1 className="text-xl font-bold text-gray-900">プロフィール編集</h1>
              <p className="text-sm text-gray-500 mt-0.5">登録情報の確認・変更ができます</p>
            </div>

            {/* ── Account Info Bar ── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                {/* Name + Email */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {formData.lastNameKanji && formData.firstNameKanji
                      ? `${formData.lastNameKanji} ${formData.firstNameKanji}`
                      : (authUser as any)?.name || "—"}
                  </p>
                  <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {authUser?.email || ""}
                  </p>
                </div>
                {/* Login method badge */}
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                  {isEmailUser ? "メール会員" : "SNSログイン"}
                </span>
              </div>

              {/* Membership tier strip */}
              {tier && (
                <div className={`bg-gradient-to-r ${tierStyle.gradient} border-t border-gray-100 px-5 py-2.5 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Crown className={`w-4 h-4 ${tierStyle.icon}`} />
                    <span className={`text-xs font-bold ${tierStyle.text}`}>{tier.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${tierStyle.badge}`}>
                      ポイント還元 {pointRate.toFixed(2)}%
                    </span>
                    {discountRate > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${tierStyle.badge}`}>
                        割引 {discountRate.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {nextTier && (
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">次のランクまで</span>
                        <div className="w-20 h-1.5 bg-white/70 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${tierStyle.text.replace("text-", "bg-")}`} style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">¥{(nextThreshold - totalPurchase).toLocaleString()}</span>
                      </div>
                      <Link href="/mypage/membership" className={`text-xs ${tierStyle.text} hover:underline flex items-center gap-0.5`}>
                        詳細 <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                  {!nextTier && (
                    <span className={`text-xs ${tierStyle.text} opacity-70`}>最高ランク達成 🎉</span>
                  )}
                </div>
              )}
            </div>

            {/* ── Profile Form ── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <SectionHeader icon={Pencil} title="基本情報" subtitle="お名前・性別・電話番号を編集できます" />
              </div>
              <form onSubmit={handleProfileSubmit}>
                <div className="px-6 py-5 space-y-5">

                  {/* お名前（漢字）*/}
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">お名前（漢字）</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-400 mb-1 block">姓</Label>
                        <Input
                          value={formData.lastNameKanji}
                          onChange={(e) => setFormData(p => ({ ...p, lastNameKanji: e.target.value }))}
                          placeholder="山田"
                          className="h-10 text-sm bg-gray-50 border-gray-200 focus:bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 mb-1 block">名</Label>
                        <Input
                          value={formData.firstNameKanji}
                          onChange={(e) => setFormData(p => ({ ...p, firstNameKanji: e.target.value }))}
                          placeholder="太郎"
                          className="h-10 text-sm bg-gray-50 border-gray-200 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* フリガナ */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">フリガナ（カタカナ）</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-400 mb-1 block">セイ</Label>
                        <Input
                          value={formData.lastNameKatakana}
                          onChange={handleKatakanaChange((v) => setFormData(p => ({ ...p, lastNameKatakana: v })))}
                          placeholder="ヤマダ"
                          className="h-10 text-sm bg-gray-50 border-gray-200 focus:bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 mb-1 block">メイ</Label>
                        <Input
                          value={formData.firstNameKatakana}
                          onChange={handleKatakanaChange((v) => setFormData(p => ({ ...p, firstNameKatakana: v })))}
                          placeholder="タロウ"
                          className="h-10 text-sm bg-gray-50 border-gray-200 focus:bg-white"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">※ カタカナで入力してください</p>
                  </div>

                  {/* 性別 + 電話番号 — 2열 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">性別</Label>
                      <RadioGroup
                        value={formData.gender}
                        onValueChange={(v) => setFormData(p => ({ ...p, gender: v as "male" | "female" | "no_answer" }))}
                        className="flex gap-4 pt-1"
                      >
                        {[["male", "男性"], ["female", "女性"], ["no_answer", "未回答"]].map(([val, label]) => (
                          <div key={val} className="flex items-center gap-1.5">
                            <RadioGroupItem value={val} id={val} />
                            <Label htmlFor={val} className="text-sm font-normal cursor-pointer text-gray-700">{label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">電話番号</Label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                        placeholder="090-1234-5678"
                        className="h-10 text-sm bg-gray-50 border-gray-200 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Form footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl flex items-center justify-between">
                  <Link href="/mypage">
                    <Button type="button" variant="ghost" size="sm" className="text-gray-500">キャンセル</Button>
                  </Link>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmittingProfile || updateProfileMutation.isPending}
                    className="bg-primary hover:bg-primary/90 min-w-[120px]"
                  >
                    {isSubmittingProfile || updateProfileMutation.isPending
                      ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />更新中</>
                      : <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />変更を保存</>}
                  </Button>
                </div>
              </form>
            </div>

            {/* ── Password Change (email users only) ── */}
            {isEmailUser && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100">
                  <SectionHeader icon={Lock} title="パスワード変更" subtitle="セキュリティのため定期的な変更をお勧めします" />
                </div>
                <form onSubmit={handlePasswordSubmit}>
                  <div className="px-6 py-5 space-y-4">
                    {[
                      { key: "currentPassword", label: "現在のパスワード", show: showCurrentPw, toggle: () => setShowCurrentPw(!showCurrentPw), placeholder: "現在のパスワードを入力" },
                      { key: "newPassword", label: "新しいパスワード", show: showNewPw, toggle: () => setShowNewPw(!showNewPw), placeholder: "6文字以上" },
                      { key: "confirmPassword", label: "新しいパスワード（確認）", show: showConfirmPw, toggle: () => setShowConfirmPw(!showConfirmPw), placeholder: "もう一度入力" },
                    ].map(({ key, label, show, toggle, placeholder }) => (
                      <div key={key}>
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{label}</Label>
                        <div className="relative">
                          <Input
                            type={show ? "text" : "password"}
                            value={(pwData as any)[key]}
                            onChange={(e) => setPwData(p => ({ ...p, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="h-10 text-sm bg-gray-50 border-gray-200 focus:bg-white pr-10"
                          />
                          <button type="button" onClick={toggle}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Password match indicator */}
                    {(pwMatch || pwMismatch) && (
                      <p className={`text-xs flex items-center gap-1 ${pwMatch ? "text-green-600" : "text-red-500"}`}>
                        {pwMatch
                          ? <><CheckCircle className="w-3.5 h-3.5" />パスワードが一致しています</>
                          : <>✗ パスワードが一致しません</>}
                      </p>
                    )}
                  </div>
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      disabled={isSubmittingPw || changePasswordMutation.isPending || !pwData.currentPassword || !pwData.newPassword || !pwData.confirmPassword}
                      className="border-primary text-primary hover:bg-primary hover:text-white min-w-[140px]"
                    >
                      {isSubmittingPw || changePasswordMutation.isPending
                        ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />変更中</>
                        : <><Shield className="w-3.5 h-3.5 mr-1.5" />パスワードを変更</>}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Quick Links ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/mypage/addresses">
                <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3 hover:border-primary/30 transition-colors cursor-pointer group">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                    <MapPin className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">お届け先住所</p>
                    <p className="text-xs text-gray-400">配送先の追加・変更・削除</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </Link>
              <Link href="/mypage/membership">
                <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3 hover:border-primary/30 transition-colors cursor-pointer group">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
                    <Crown className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">会員ランク・紹介</p>
                    <p className="text-xs text-gray-400">ランク詳細・紹介コードを確認</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            </div>

            {/* ── Delete Account ── */}
            <div className="text-center py-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="text-xs text-gray-300 hover:text-red-400 transition-colors"
              >
                退会する
              </button>
            </div>

          </div>
        </div>
      </main>

      <Footer />

      {/* Delete Account Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">退会の確認</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1">
                <div className="text-sm text-gray-600">退会すると以下のデータが<strong>完全に削除</strong>されます：</div>
                <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
                  <li>アカウント情報・プロフィール</li>
                  <li>注文履歴・ポイント</li>
                  <li>ウィッシュリスト・クーポン</li>
                </ul>
                <div className="text-sm text-gray-400">
                  この操作は取り消せません。確認するには「退会する」と入力してください。
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="「退会する」と入力"
              className="border-red-200 focus:border-red-400"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "退会する" || isDeletingAccount}
              onClick={handleDeleteAccount}
            >
              {isDeletingAccount ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />処理中...</> : "退会する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
