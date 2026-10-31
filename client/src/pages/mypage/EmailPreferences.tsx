import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Mail, ShoppingBag, Package, RefreshCw, Lock, Megaphone, Tag, Star, MessageSquare, Newspaper, Bell, CheckCircle2, AlertCircle, Copy, Check, Share2, Link2, Users } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MyPageSidebar from "@/components/MyPageSidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";

interface PreferenceItem {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  required?: boolean;
}

const PREFERENCE_GROUPS: { title: string; description: string; icon: React.ReactNode; items: PreferenceItem[] }[] = [
  {
    title: "注文・決済通知",
    description: "注文、配送、決済に関する重要なお知らせです。",
    icon: <ShoppingBag className="w-5 h-5 text-blue-600" />,
    items: [
      { key: "orderConfirmation", label: "注文確認メール", description: "注文が受付されると注文明細を送信します。", icon: <ShoppingBag className="w-4 h-4" />, required: true },
      { key: "orderShipped", label: "発送通知", description: "商品が発送されると追跡番号とともに送信します。", icon: <Package className="w-4 h-4" /> },
      { key: "orderDelivered", label: "配送完了通知", description: "商品が配送完了されるとレビュー依頼とともに送信します。", icon: <CheckCircle2 className="w-4 h-4" /> },
      { key: "orderCancelled", label: "注文キャンセル通知", description: "注文がキャンセルされるとキャンセル理由とともに送信します。", icon: <AlertCircle className="w-4 h-4" /> },
      { key: "refundProcessed", label: "返金処理通知", description: "返金が完了すると返金金額と入金予定日を送信します。", icon: <RefreshCw className="w-4 h-4" /> },
    ],
  },
  {
    title: "アカウントセキュリティ通知",
    description: "アカウントのセキュリティに関する重要なお知らせです。",
    icon: <Lock className="w-5 h-5 text-red-600" />,
    items: [
      { key: "passwordChanged", label: "パスワード変更通知", description: "パスワードが変更されると即座にお知らせを送信します。", icon: <Lock className="w-4 h-4" />, required: true },
    ],
  },
  {
    title: "マーケティング・イベント通知",
    description: "セール、イベント、クーポンなどお得な情報をお届けします。",
    icon: <Megaphone className="w-5 h-5 text-orange-600" />,
    items: [
      { key: "marketingEmails", label: "マーケティングメール", description: "新商品、特価セール、シーズンセールなどお得な情報を送信します。", icon: <Megaphone className="w-4 h-4" /> },
      { key: "eventNotifications", label: "イベント開始通知", description: "新しいイベントが始まるとお知らせを送信します。", icon: <Bell className="w-4 h-4" /> },
      { key: "couponNotifications", label: "クーポン発行通知", description: "新しいクーポン発行時または有効期限切れ先にお知らせを送信します。", icon: <Tag className="w-4 h-4" /> },
      { key: "pointNotifications", label: "ポイント積立/差引き通知", description: "ポイント変動履歴をメールでお知らせします。", icon: <Star className="w-4 h-4" /> },
    ],
  },
  {
    title: "レビュー・お問い合わせ通知",
    description: "レビュー依頼、お問い合わせ回答などのお知らせです。",
    icon: <MessageSquare className="w-5 h-5 text-green-600" />,
    items: [
      { key: "reviewReminders", label: "レビュー依頼", description: "配送完了後にレビュー依頼メールを送信します。", icon: <Star className="w-4 h-4" /> },
      { key: "inquiryReplies", label: "1:1お問い合わせ回答通知", description: "お問い合わせに回答が登録されるとお知らせを送信します。", icon: <MessageSquare className="w-4 h-4" /> },
      { key: "productQaReplies", label: "商品Q&A回答通知", description: "商品Q&Aに回答が登録されるとお知らせを送信します。", icon: <MessageSquare className="w-4 h-4" /> },
    ],
  },
  {
    title: "ニュースレター",
    description: "健康情報、新商品のお知らせなどニュースレターをお届けします。",
    icon: <Newspaper className="w-5 h-5 text-purple-600" />,
    items: [
      { key: "newsletter", label: "ニュースレター登録", description: "健康情報、新商品情報、イベントなど月刊ニュースレターを送信します。", icon: <Newspaper className="w-4 h-4" /> },
    ],
  },
];

export default function EmailPreferences() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: prefs, isLoading } = trpc.emailPreferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const updateMutation = trpc.emailPreferences.update.useMutation({
    onSuccess: () => {
      toast.success("メール受信設定を保存しました。");
    },
    onError: (err) => {
      toast.error(err.message || "保存に失敗しました。");
    },
  });

  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (prefs) {
      const mapped: Record<string, boolean> = {};
      for (const key of Object.keys(prefs)) {
        if (typeof (prefs as any)[key] === "boolean") {
          mapped[key] = (prefs as any)[key];
        }
      }
      setLocalPrefs(mapped);
    }
  }, [prefs]);

  const handleToggle = (key: string, required?: boolean) => {
    if (required) {
      toast.error("この通知は必須項目のため無効にできません。");
      return;
    }
    setLocalPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    updateMutation.mutate(localPrefs as any);
  };

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: referralCode } = trpc.membership.referral.getMyCode.useQuery(undefined, { enabled: isAuthenticated });
  const referralLink = referralCode ? `${window.location.origin}/register?ref=${referralCode}` : null;

  const handleCopyCode = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    toast.success("紹介コードをコピーしました");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success("招待リンクをコピーしました！");
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

  const handleAllMarketing = (enabled: boolean) => {
    setLocalPrefs(prev => ({
      ...prev,
      marketingEmails: enabled,
      eventNotifications: enabled,
      couponNotifications: enabled,
      pointNotifications: enabled,
      newsletter: enabled,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-8">
          <div className="flex gap-6 lg:gap-8 items-start">
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>
            <div className="flex-1 min-w-0 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <p className="text-gray-500 mb-4">ログインが必要です</p>
          <Button onClick={() => setLocation("/login")}>ログインする</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/mypage" className="flex items-center gap-1 text-primary hover:underline font-medium">
            <Mail className="w-4 h-4 rotate-90" />
            マイページに戻る
          </Link>
        </div>

        <div className="flex gap-6 lg:gap-8 items-start">
          {/* Sidebar */}
          <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <MyPageSidebar />
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            {/* Header Banner */}
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-amber-500" />
                  メール受信設定
                </h1>
                <p className="text-sm text-amber-700 mt-0.5">受け取りたいメール通知を選択してください。注文・セキュリティ関連の必須通知は変更できません。</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => handleAllMarketing(false)} className="text-xs">
                  マーケティング全拒否
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAllMarketing(true)} className="text-xs">
                  マーケティング全受信
                </Button>
              </div>
            </div>

            {/* Preference Groups */}
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse border border-gray-200" />
              ))
            ) : (
              PREFERENCE_GROUPS.map((group) => (
                <div key={group.title} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {/* Group Header */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex-shrink-0">{group.icon}</div>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">{group.title}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>
                    </div>
                  </div>
                  {/* Group Items */}
                  <div className="divide-y divide-gray-100">
                    {group.items.map((item) => (
                      <div key={item.key} className="flex items-center justify-between px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-gray-400 flex-shrink-0">{item.icon}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-800">{item.label}</span>
                              {item.required && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-600 border border-red-200">必須</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={localPrefs[item.key] ?? true}
                          onCheckedChange={() => handleToggle(item.key, item.required)}
                          disabled={item.required}
                          className={`flex-shrink-0 ml-4 ${item.required ? "opacity-60" : ""}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* ── 추천인 코드 섹션 ── */}
            {referralCode && (
              <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full -translate-y-10 translate-x-10 pointer-events-none" />
                <div className="relative p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">友達を招待してポイントをもらおう！</h2>
                      <p className="text-[11px] text-gray-500 mt-0.5">招待リンクから登録した友達に特典ポイントが付与されます</p>
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-xl border border-emerald-200 p-3 mb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">あなたの招待コード</p>
                        <span className="font-mono text-xl font-extrabold text-emerald-700 tracking-widest">{referralCode}</span>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="flex items-center gap-1.5 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCode ? "コピー済" : "コードをコピー"}
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
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex-1">
                <Mail className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                <span className="text-xs">受信拒否設定後も、注文確認・配送通知などの取引関連メールは引き続き送信されます。</span>
              </div>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white px-6 flex-shrink-0"
              >
                {updateMutation.isPending ? "保存中..." : "設定を保存"}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
