import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bell,
  ShoppingBag,
  Megaphone,
  Crown,
  Ticket,
  Coins,
  Star,
  MessageSquare,
  Settings,
  ChevronDown,
  Trash2,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  Inbox,
  SlidersHorizontal,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatDistanceToNow, isToday, isThisWeek, format } from "date-fns";
import { ja } from "date-fns/locale";
import Header from "@/components/Header";
import MyPageSidebar from "@/components/MyPageSidebar";
import Footer from "@/components/Footer";

type NotificationType =
  | "all"
  | "order"
  | "admin"
  | "tier"
  | "coupon"
  | "point"
  | "review"
  | "inquiry"
  | "system";

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  order: { label: "注文", icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
  admin: { label: "お知らせ", icon: Megaphone, color: "text-red-600", bg: "bg-red-50" },
  tier: { label: "ランク", icon: Crown, color: "text-yellow-600", bg: "bg-yellow-50" },
  coupon: { label: "クーポン", icon: Ticket, color: "text-green-600", bg: "bg-green-50" },
  point: { label: "ポイント", icon: Coins, color: "text-orange-600", bg: "bg-orange-50" },
  review: { label: "レビュー", icon: Star, color: "text-purple-600", bg: "bg-purple-50" },
  inquiry: {
    label: "お問合せ",
    icon: MessageSquare,
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  system: { label: "システム", icon: Settings, color: "text-gray-600", bg: "bg-gray-50" },
};

const TABS: { key: NotificationType; label: string }[] = [
  { key: "all", label: "全て" },
  { key: "order", label: "注文" },
  { key: "admin", label: "お知らせ" },
  { key: "tier", label: "ランク" },
  { key: "coupon", label: "クーポン" },
  { key: "point", label: "ポイント" },
  { key: "review", label: "レビュー" },
  { key: "inquiry", label: "お問合せ" },
  { key: "system", label: "システム" },
];

// ─── Phase 2: 인앱 알림 수신 설정 컴포넌트 ──────────────────────────────────
const PREF_ITEMS = [
  { key: "orderEnabled" as const,   label: "注文・配送",   icon: ShoppingBag,   color: "text-blue-600" },
  { key: "tierEnabled" as const,    label: "ランク変更",   icon: Crown,         color: "text-yellow-600" },
  { key: "couponEnabled" as const,  label: "クーポン",    icon: Ticket,        color: "text-green-600" },
  { key: "pointEnabled" as const,   label: "ポイント",    icon: Coins,         color: "text-orange-600" },
  { key: "reviewEnabled" as const,  label: "レビュー",    icon: Star,          color: "text-purple-600" },
  { key: "inquiryEnabled" as const, label: "お問合せ",    icon: MessageSquare, color: "text-teal-600" },
  { key: "adminEnabled" as const,   label: "お知らせ",    icon: Megaphone,     color: "text-red-600" },
  { key: "systemEnabled" as const,  label: "システム",    icon: Settings,      color: "text-gray-600" },
];

function NotificationPreferences() {
  const { data: prefs, refetch } = trpc.notification.getPreferences.useQuery();
  const updateMut = trpc.notification.updatePreferences.useMutation({
    onSuccess: () => { refetch(); toast.success("通知設定を保存しました"); },
  });

  const defaultPrefs = {
    orderEnabled: true, tierEnabled: true, couponEnabled: true, pointEnabled: true,
    reviewEnabled: true, inquiryEnabled: true, adminEnabled: true, systemEnabled: true,
  };
  const current = prefs ?? defaultPrefs;

  const toggle = (key: keyof typeof defaultPrefs) => {
    updateMut.mutate({ ...current, [key]: !current[key] });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-sm">通知受信設定</span>
        <span className="text-xs text-gray-400 ml-1">受け取りたい通知の種類を選択</span>
      </div>
      <div className="divide-y divide-gray-50">
        {PREF_ITEMS.map(item => {
          const Icon = item.icon;
          const enabled = current[item.key];
          return (
            <div key={item.key} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-sm">{item.label}</span>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={() => toggle(item.key)}
                disabled={updateMut.isPending}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MypageNotifications() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<NotificationType>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.notification.list.useQuery(
    { type: activeTab, unreadOnly, limit: LIMIT, offset },
    { enabled: isAuthenticated }
  );

  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
      toast("全て既読にしました");
    },
  });

  const deleteMutation = trpc.notification.delete.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
      toast("通知を削除しました");
    },
  });

  const deleteAllReadMutation = trpc.notification.deleteAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
      toast("既読通知を全て削除しました");
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-8">
          <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        </main>
      </div>
    );
  }

  if (!authLoading && !user) {
    return null;
  }

  const notifications = data?.items ?? [];
  const total = data?.total ?? 0;
  const unreadCount = data?.unreadCount ?? 0;

  // 날짜별 그룹핑
  type NotifItem = (typeof notifications)[number];
  function groupByDate(items: NotifItem[]) {
    const today: NotifItem[] = [];
    const thisWeek: NotifItem[] = [];
    const older: NotifItem[] = [];
    for (const n of items) {
      const d = new Date(n.createdAt);
      if (isToday(d)) today.push(n);
      else if (isThisWeek(d, { weekStartsOn: 1 })) thisWeek.push(n);
      else older.push(n);
    }
    return { today, thisWeek, older };
  }
  const grouped = groupByDate(notifications);

  const handleTabChange = (tab: NotificationType) => {
    setActiveTab(tab);
    setOffset(0);
  };

  const handleNotificationClick = (
    id: number,
    isRead: boolean,
    link?: string | null
  ) => {
    if (!isRead) markReadMutation.mutate({ id });
    if (link) navigate(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link
            href="/mypage"
            className="flex items-center gap-1 text-primary hover:underline font-medium"
          >
            <ChevronDown className="w-4 h-4 rotate-90" />
            マイページに戻る
          </Link>
        </div>

        <div className="flex gap-6 lg:gap-8 items-start">
          {/* Sidebar */}
          <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <MyPageSidebar />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Header Banner */}
            <div className="rounded-lg border border-yellow-200 bg-[#fffbeb] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-500" />
                    通知
                  </h1>
                  <p className="mt-0.5 text-sm text-amber-700">
                    お知らせ・注文・ランクなどの通知を確認できます
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">未読</p>
                  <p className="text-2xl font-bold text-primary">
                    {unreadCount}
                    <span className="text-sm font-normal ml-0.5">件</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUnreadOnly(!unreadOnly)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      unreadOnly
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    未読のみ
                  </button>
                  <button
                    onClick={() => refetch()}
                    className="text-sm px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    更新
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      disabled={markAllReadMutation.isPending}
                      className="text-sm px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-colors flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      全て既読
                    </button>
                  )}
                  <button
                    onClick={() => deleteAllReadMutation.mutate()}
                    disabled={deleteAllReadMutation.isPending}
                    className="text-sm px-3 py-1.5 rounded-full border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    既読を削除
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs + List */}
            <div className="rounded-lg border border-gray-200 bg-white">
              {/* Tabs */}
              <div className="overflow-x-auto border-b border-gray-100">
                <div className="flex min-w-max">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key)}
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                        activeTab === tab.key
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification List */}
              {isLoading ? (
                <div className="divide-y divide-gray-100">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3 p-4 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-full" />
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Inbox className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">通知がありません</p>
                  <p className="text-xs mt-1">新しい通知が届くとここに表示されます</p>
                </div>
              ) : (
                <div>
                  {([
                    { label: "今日", items: grouped.today },
                    { label: "今週", items: grouped.thisWeek },
                    { label: "以前", items: grouped.older },
                  ] as { label: string; items: NotifItem[] }[]).map(({ label, items }) =>
                    items.length === 0 ? null : (
                      <div key={label}>
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                          <span className="text-xs font-bold text-gray-500 tracking-wide">{label}</span>
                          <span className="ml-2 text-xs text-gray-400">{items.length}件</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {items.map((notif) => {
                            const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
                            const Icon = cfg.icon;
                            return (
                              <div
                                key={notif.id}
                                className={`flex gap-3 p-4 transition-colors ${
                                  !notif.isRead ? "bg-blue-50/40" : "hover:bg-gray-50"
                                } ${notif.link ? "cursor-pointer" : ""}`}
                                onClick={() =>
                                  handleNotificationClick(notif.id, notif.isRead, notif.link)
                                }
                              >
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}
                                >
                                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.bg} ${cfg.color}`}
                                      >
                                        {cfg.label}
                                      </span>
                                      {!notif.isRead && (
                                        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-xs text-gray-400">
                                        {format(new Date(notif.createdAt), "M/d HH:mm", { locale: ja })}
                                      </span>
                                      {notif.link && (
                                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteMutation.mutate({ id: notif.id });
                                        }}
                                        className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="mt-1 text-sm font-semibold text-gray-900 leading-snug">
                                    {notif.title}
                                  </p>
                                  <p className="mt-0.5 text-sm text-gray-600 leading-relaxed">
                                    {notif.message}
                                  </p>
                                  <p className="mt-1.5 text-xs text-gray-400">
                                    {formatDistanceToNow(new Date(notif.createdAt), {
                                      addSuffix: true,
                                      locale: ja,
                                    })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Pagination */}
              {total > LIMIT && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {offset + 1}〜{Math.min(offset + LIMIT, total)} / 全{total}件
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                    >
                      前へ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset + LIMIT >= total}
                      onClick={() => setOffset(offset + LIMIT)}
                    >
                      次へ
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 인앱 알림 수신 설정 (Phase 2) */}
            <NotificationPreferences />

            {/* Email settings link */}
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Bell className="w-4 h-4 text-gray-400" />
                <span>メール通知の設定はこちら</span>
              </div>
              <Link href="/mypage/email-preferences">
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <Settings className="w-3.5 h-3.5" />
                  メール設定
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
