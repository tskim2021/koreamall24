import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, ShoppingBag, User, MapPin, Ticket,
  Coins, MessageSquare, Star, Heart, Crown, Mail, Bell, ChevronRight
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  BRONZE:   { color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   label: "ブロンズ" },
  SILVER:   { color: "text-slate-600",   bg: "bg-slate-50",   border: "border-slate-200",   label: "シルバー" },
  GOLD:     { color: "text-yellow-600",  bg: "bg-yellow-50",  border: "border-yellow-200",  label: "ゴールド" },
  PLATINUM: { color: "text-purple-600",  bg: "bg-purple-50",  border: "border-purple-200",  label: "プラチナ" },
};

const menuGroups = [
  {
    label: "マイページ",
    items: [
      { href: "/mypage", label: "ダッシュボード", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "注文・配送",
    items: [
      { href: "/mypage/order", label: "注文履歴", icon: ShoppingBag },
      { href: "/mypage/addresses", label: "お届け先住所", icon: MapPin },
    ],
  },
  {
    label: "特典・ポイント",
    items: [
      { href: "/mypage/coupons", label: "クーポン", icon: Ticket, badge: "coupon" },
      { href: "/mypage/points", label: "ポイント", icon: Coins },
      { href: "/mypage/membership", label: "会員ランク・紹介", icon: Crown },
    ],
  },
  {
    label: "アクティビティ",
    items: [
      { href: "/mypage/wishlist", label: "ウィッシュリスト", icon: Heart },
      { href: "/mypage/reviews", label: "レビュー管理", icon: Star, badge: "review" },
      { href: "/mypage/inquiries", label: "お問い合わせ", icon: MessageSquare, badge: "inquiry" },
    ],
  },
  {
    label: "アカウント",
    items: [
      { href: "/mypage/profile-edit", label: "プロフィール編集", icon: User },
      { href: "/mypage/email-preferences", label: "メール受信設定", icon: Mail },
      { href: "/mypage/notifications", label: "通知", icon: Bell, badge: "notification" },
    ],
  },
];

export default function MyPageSidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const { data: tierData } = trpc.membership.myTier.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const { data: pendingReviewCount } = trpc.review.getPendingReviewCount.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const { data: expiringCouponData } = trpc.coupon.getExpiringCount.useQuery(
    { days: 7 },
    { enabled: isAuthenticated, staleTime: 10 * 60 * 1000 }
  );

  const { data: pendingInquiryData } = trpc.inquiries.getMyPendingCount.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const tier = tierData?.tier;
  const tierKey = ((tier as any)?.tierCode || tier?.name?.toUpperCase() || "BRONZE") as keyof typeof TIER_CONFIG;
  const tierCfg = TIER_CONFIG[tierKey] || TIER_CONFIG.BRONZE;

  const { data: notificationData } = trpc.notification.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const getBadgeCount = (badge?: string) => {
    if (badge === "review") return pendingReviewCount ?? 0;
    if (badge === "coupon") return expiringCouponData?.count ?? 0;
    if (badge === "inquiry") return pendingInquiryData?.count ?? 0;
    if (badge === "notification") return notificationData?.count ?? 0;
    return 0;
  };

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location === href;
    return location === href || location.startsWith(href + "/");
  };

  return (
    <aside className="w-full">
      {/* ── 사용자 정보 박스 ── */}
      <div className={`rounded-lg border-2 ${tierCfg.border} ${tierCfg.bg} p-4 mb-5 text-center`}>
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold border-2 ${tierCfg.border} ${tierCfg.color} bg-white mx-auto mb-2`}>
          {user?.name?.charAt(0) || "?"}
        </div>
        <p className="text-sm font-bold text-gray-900 mb-1">マイページ</p>
        <p className="text-xs text-gray-600 mb-2">ようこそ、koreamall24へ</p>
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierCfg.border} ${tierCfg.color} bg-white`}>
          <Crown className="w-2.5 h-2.5" />
          {(tier as any)?.nameJa || tier?.name || tierCfg.label || "ブロンズ"}
        </span>
      </div>

      <nav className="space-y-5">
        {menuGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, (item as any).exact);
                const badgeCount = getBadgeCount((item as any).badge);

                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                        active
                          ? "bg-primary text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`} />
                      <span className="flex-1 font-medium">{item.label}</span>
                      {badgeCount > 0 && (
                        <span className={`text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center flex-shrink-0 ${
                          active ? "bg-white text-primary" : "bg-red-500 text-white"
                        }`}>
                          {badgeCount > 9 ? "9+" : badgeCount}
                        </span>
                      )}
                      {!badgeCount && (
                        <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${active ? "opacity-100 text-white/70" : ""}`} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
