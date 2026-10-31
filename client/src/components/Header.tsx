import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { getOptimizedSrc } from "@/lib/imageProxy";
import { Link, useLocation } from "wouter";
import {
  Search, ShoppingCart, User, Menu, X, Bell, Clock, ChevronDown, UserPlus,
  ChevronRight, Package, Heart, Tag, Star, MessageSquare, MapPin,
  Crown, LogOut, Settings, Megaphone, Trash2, RotateCcw, BookOpen, Ticket,
  LayoutDashboard, Mail, Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PointExpiryBanner } from "@/components/PointExpiryBanner";
import { useSSENotifications } from "@/hooks/useSSENotifications";
import { toast } from "sonner";

// ─── HTML에서 첫 번째 이미지 src 추출 ──────────────────────────────────────────
function extractFirstImageSrc(html: string): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// ─── 드래그 스크롤 훅 ───────────────────────────────────────────────────────
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false); // 실제로 이동했는지 여부
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  const updateShadows = () => {
    const el = ref.current;
    if (!el) return;
    setShowLeftShadow(el.scrollLeft > 4);
    setShowRightShadow(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  // 마운트 시 초기 그림자 상태 설정
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateShadows();
    el.addEventListener('scroll', updateShadows, { passive: true });
    const ro = new ResizeObserver(updateShadows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateShadows);
      ro.disconnect();
    };
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.pageX - (ref.current?.offsetLeft ?? 0);
    scrollLeft.current = ref.current?.scrollLeft ?? 0;
    if (ref.current) ref.current.style.cursor = 'grabbing';
  };
  const onMouseLeave = () => {
    isDragging.current = false;
    if (ref.current) ref.current.style.cursor = 'grab';
  };
  const onMouseUp = () => {
    isDragging.current = false;
    if (ref.current) ref.current.style.cursor = 'grab';
    // 짧은 딜레이 후 hasDragged 초기화 (클릭 이벤트가 먼저 처리되도록)
    setTimeout(() => { hasDragged.current = false; }, 0);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const x = e.pageX - (ref.current?.offsetLeft ?? 0);
    const walk = (x - startX.current) * 1.2;
    if (Math.abs(walk) > 4) {
      e.preventDefault();
      hasDragged.current = true;
      if (ref.current) ref.current.scrollLeft = scrollLeft.current - walk;
    }
  };
  // 드래그 중 링크 클릭 방지
  const onClickCapture = (e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return { ref, onMouseDown, onMouseLeave, onMouseUp, onMouseMove, onClickCapture, showLeftShadow, showRightShadow };
}

// ─── hover 팝업 공통 훅 ──────────────────────────────────────────────────────
function useHoverPopup(delay = 120) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };
  const onMouseLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), delay);
  };
  return { open, onMouseEnter, onMouseLeave };
}

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (location === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const _headerInitial = typeof window !== "undefined" ? (window as any).__INITIAL_DATA__ : undefined;
  const { data: brandSettings } = trpc.admin.siteSettings.getBrandSettings.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 }
  );
  const { data: categories } = trpc.category.list.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000, ...(_headerInitial?.categories ? { initialData: _headerInitial.categories } : {}) }
  );
  const { data: cartCount } = trpc.cart.count.useQuery(undefined, { enabled: isAuthenticated });
  const { data: activeCoupons } = trpc.coupon.listActive.useQuery(undefined, { enabled: isAuthenticated });
  const couponCount = activeCoupons?.length ?? 0;
  const { data: notificationCount } = trpc.notification.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
  const { data: pendingReviewCount } = trpc.review.getPendingReviewCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  // 공지 미리보기용 데이터
  const noticePopup = useHoverPopup();
  const { data: announcementsData } = trpc.announcements.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    ...(_headerInitial?.announcements ? { initialData: _headerInitial.announcements } : {}),
  });
  const recentNotices = (announcementsData ?? [])
    .filter((a: any) => {
      if (!a.isActive) return false;
      if (a.expiresAt && new Date(a.expiresAt) < new Date()) return false;
      return true;
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const NOTICE_CATEGORY_CONFIG: Record<string, { label: string; cls: string }> = {
    notice:      { label: "お知らせ",    cls: "bg-blue-500 text-white" },
    important:   { label: "重要",        cls: "bg-red-500 text-white" },
    sale:        { label: "期間限定",     cls: "bg-amber-400 text-white" },
    maintenance: { label: "メンテナンス", cls: "bg-gray-500 text-white" },
    event:       { label: "イベント",     cls: "bg-purple-500 text-white" },
  };

  // 장바구니 미리보기용 데이터
  const cartPopup = useHoverPopup();
  const { data: cartItems } = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 0,
  });
  const removeCartMutation = trpc.cart.remove.useMutation({
    onSuccess: () => {
      trpc.useUtils().cart.list.invalidate();
      trpc.useUtils().cart.count.invalidate();
    },
  });

  // 유저 서브메뉴 hover
  const userPopup = useHoverPopup();

  // SSE 알림
  const handleSSENotification = useCallback((notif: { type: string; title: string; message: string; link?: string }) => {
    toast(notif.title, { description: notif.message, duration: 6000 });
  }, []);
  useSSENotifications(handleSSENotification);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileSearchOpen(false);
    }
  };

  const topLinks = [
    { id: "guide", label: "はじめてのお客様へ", href: "/first-time-customer" },
    { id: "shipping", label: "安心・安全な国際配送", href: "/international-shipping" },
    { id: "inquiry", label: "お問い合わせ", href: "/mypage/inquiries" },
    { id: "faq", label: "FAQ", href: "/faq" },
  ];

  const quickMenuItems = [
    { label: "売れ筋ランキングTOP100", href: "/ranking" },
    { label: "新着商品", href: "/new-arrivals" },
    { label: "おすすめ商品", href: "/recommended" },
    { label: "セール商品", href: "/sale" },
    { label: "レビュー", href: "/review" },
    { label: "イベント", href: "/bbs/event" },
    { label: "カスタマーサポート", href: "/customer-support" },
  ];

  // 마이페이지 메뉴 (MyPageSidebar.tsx와 동일하게)
  const mypageMenuItems = [
    { href: "/mypage", icon: LayoutDashboard, label: "ダッシュボード", color: "text-primary" },
    { href: "/mypage/order", icon: Package, label: "注文履歴", color: "text-blue-600" },
    { href: "/mypage/addresses", icon: MapPin, label: "お届け先住所", color: "text-blue-600" },
    { href: "/mypage/coupons", icon: Tag, label: "クーポン", color: "text-green-600" },
    { href: "/mypage/points", icon: Coins, label: "ポイント", color: "text-yellow-500" },
    { href: "/mypage/membership", icon: Crown, label: "会員ランク・紹介", color: "text-yellow-600" },
    { href: "/mypage/wishlist", icon: Heart, label: "ウィッシュリスト", color: "text-pink-500" },
    { href: "/mypage/reviews", icon: Star, label: "レビュー管理", color: "text-orange-500", badge: pendingReviewCount },
    { href: "/mypage/inquiries", icon: MessageSquare, label: "お問い合わせ", color: "text-purple-600" },
    { href: "/mypage/profile-edit", icon: Settings, label: "プロフィール編集", color: "text-gray-600" },
    { href: "/mypage/email-preferences", icon: Mail, label: "メール受信設定", color: "text-indigo-500" },
    { href: "/mypage/notifications", icon: Bell, label: "通知", color: "text-indigo-600" },
  ];

  // 장바구니 합계
  const cartTotal = (cartItems ?? []).reduce((sum: number, item: any) => {
    const cartItem = item.cartItem ?? item;
    const price = item.product?.discountedPrice ?? item.product?.price ?? 0;
    return sum + price * (cartItem.quantity ?? 1);
  }, 0);

  // AdminBar가 있을 때 헤더를 32px 아래로 내려 가려지지 않도록 함
  const isAdmin = user?.role === "admin";

  // 모바일 카테고리 바 드래그 스크롤
  const dragScroll = useDragScroll();

  return (
    <header
      className="sticky z-50 bg-white border-b border-gray-200"
      style={{ top: isAdmin ? "32px" : "0" }}
    >
      {/* ═══════════════════════════════════════════════════════════
          모바일 전용 헤더 (md 미만에서만 표시)
          3단 구조: 유틸리티 바 → 메인 헤더 → 카테고리 바
      ═══════════════════════════════════════════════════════════ */}
      <div className="md:hidden">
        {/* ── Row 2: 메인 헤더 (햄버거 + 로고 + 검색/장바구니) ─── */}
        <div className="bg-white px-2 flex items-center gap-0" style={{height: '64px'}}>
          {/* 햄버거 메뉴 */}
          <button
            className="p-1 rounded-md hover:bg-gray-100 transition-colors shrink-0"
            onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setMobileSearchOpen(false); }}
            aria-label="メニュー"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* 로고 (중앙) */}
          <Link href="/" className="flex-1 flex items-center justify-center gap-1.5" onClick={handleLogoClick} style={{height: '40px', textAlign: 'left', width: '201px', paddingRight: '36px'}}>
            {brandSettings?.headerLogoMobile || brandSettings?.headerLogoPC ? (
              <img
                src={(brandSettings.headerLogoMobile || brandSettings.headerLogoPC) || ""}
                alt="ロゴ"
                className="max-h-9 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <div>
                <div className="qoo-logo-text leading-tight" style={{ fontSize: '20px' }}>KOREAMALL24</div>
                <div className="text-muted-foreground leading-tight" style={{ fontSize: '10px' }}>医薬品・健康商品の個人輸入</div>
              </div>
            )}
          </Link>

          {/* 오른쪽: 검색 + 장바구니 */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* 검색 버튼 */}
            <button
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              onClick={() => { setMobileSearchOpen(!mobileSearchOpen); setMobileMenuOpen(false); }}
              aria-label="検索"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* 장바구니 */}
            <Link href="/cart" className="relative p-1.5 rounded-md hover:bg-gray-100 transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartCount !== undefined && cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[8px] bg-primary">
                  {cartCount > 9 ? "9+" : cartCount}
                </Badge>
              )}
            </Link>

            {/* 알림 (로그인 시) */}
            {isAuthenticated && (
              <Link href="/mypage/notifications" className="relative p-1.5 rounded-md hover:bg-gray-100 transition-colors" aria-label="通知">
                <Bell className="w-5 h-5" />
                {notificationCount !== undefined && notificationCount.count > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[8px] bg-red-500">
                    {notificationCount.count > 9 ? "9+" : notificationCount.count}
                  </Badge>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* 모바일 검색바 (토글) */}
        {mobileSearchOpen && (
          <div className="px-3 pb-2 bg-white">
            <form onSubmit={handleSearch}>
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="商品名・症状で検索する"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-12 bg-secondary/30 text-sm h-10"
                  autoFocus
                />
                <button type="submit" className="absolute right-0 top-0 h-full px-4 bg-primary text-white rounded-r-md">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Row 3: 카테고리 스크롤 바 (PC 스타일 동일) ──────── */}
        <div className="border-t border-primary/20 qoo-nav-bar relative">
          {/* 왼쪽 그림자 */}
          {dragScroll.showLeftShadow && (
            <div className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10"
              style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.15) 0%, transparent 100%)' }} />
          )}
          {/* 오른쪽 그림자 */}
          {dragScroll.showRightShadow && (
            <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10"
              style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.15) 0%, transparent 100%)' }} />
          )}
          <div
            ref={dragScroll.ref}
            className="overflow-x-auto select-none drag-scroll-area"
            style={{ cursor: 'grab' }}
            onMouseDown={dragScroll.onMouseDown}
            onMouseLeave={dragScroll.onMouseLeave}
            onMouseUp={dragScroll.onMouseUp}
            onMouseMove={dragScroll.onMouseMove}
            onClickCapture={dragScroll.onClickCapture}
          >
            <div className="flex items-center" style={{ minWidth: 'max-content' }}>
              {/* 퀵메뉴 앞쪽 */}
              {quickMenuItems.map((item, idx) => (
                item.label === "セール商品" ? (
                  <Link
                    key={`quick-${idx}`}
                    href={item.href}
                    className="shrink-0 mx-1.5"
                  >
                    <span className="qoo-accent-pill">{item.label}</span>
                  </Link>
                ) : (
                  <Link
                    key={`quick-${idx}`}
                    href={item.href}
                    className="font-medium text-white/90 hover:text-white hover:bg-white/10 px-3 py-2 transition-colors whitespace-nowrap border-r border-white/15 shrink-0"
                    style={{ fontSize: '12px' }}
                  >
                    {item.label}
                  </Link>
                )
              ))}
              {/* 카테고리 뒤쪽 */}
              {categories && categories.map((category: any) => (
                <Link
                  key={`cat-${category.id}`}
                  href={`/category/${category.slug}`}
                  className="font-medium text-white/90 hover:text-white hover:bg-white/10 px-3 py-2 transition-colors whitespace-nowrap border-r border-white/15 last:border-r-0 shrink-0"
                  style={{ fontSize: '12px' }}
                >
                  {category.nameJa}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          PC 헤더 (md 이상에서만 표시) - 기존 디자인 유지
      ═══════════════════════════════════════════════════════════ */}
      <div className="hidden md:block">
        {/* Top bar */}
        <div className="bg-secondary/50 text-xs py-1">
          <div className="container flex justify-between items-center">
            <div className="flex gap-4 flex-wrap">
              {topLinks.map((link) => (
                <Link key={link.id} href={link.href} className="hover:text-primary transition-colors whitespace-nowrap">
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              {isAuthenticated && user ? (
                <span className="text-primary font-medium">{user.name}様、いらっしゃいませ！</span>
              ) : (
                <>
                  <User className="w-3 h-3" />
                  <span>ログインまたは会員登録をしてください</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main header */}
        <div className="container py-2 md:py-3" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
          <div className="flex items-center gap-2 md:gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-1.5 md:gap-2 shrink-0" onClick={handleLogoClick}>
              {brandSettings?.headerLogoPC ? (
                <img src={brandSettings.headerLogoPC} alt="ロゴ" className="max-h-20 w-auto max-w-[330px] object-contain" />
              ) : (
                <div className="block">
                  <div className="qoo-logo-text text-sm md:text-base" style={{fontSize: '24px'}}>KOREAMALL24</div>
                  <div className="hidden sm:block text-xs md:text-sm text-muted-foreground -mt-0.5">医薬品・健康商品の個人輸入</div>
                </div>
              )}
            </Link>

            {/* PC: 검색바 */}
            <form onSubmit={handleSearch} className="flex-1 hidden md:flex" style={{ maxWidth: '600px' }}>
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="商品名・症状で検索する"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-12 bg-secondary/30 border-secondary focus:border-primary text-sm h-10 rounded-r-none"
                />
                <button
                  type="submit"
                  className="absolute right-0 top-0 h-full px-4 bg-primary text-white rounded-r-md hover:bg-primary/90 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* 오른쪽 액션 버튼들 */}
            <div className="flex items-center gap-1 md:gap-2 ml-auto">
              {isAuthenticated ? (
                <>
                  {/* ── 라쿠텐 스타일 6개 아이콘 메뉴 (PC) ─────────────── */}
                  <div className="flex items-end gap-0">

                    {/* 1. 買い物かご */}
                    <div
                      className="relative"
                      onMouseEnter={cartPopup.onMouseEnter}
                      onMouseLeave={cartPopup.onMouseLeave}
                    >
                      <Link
                        href="/cart"
                        className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-gray-100 transition-colors group min-w-[44px]"
                      >
                        <div className="relative">
                          <ShoppingCart className="w-6 h-6 text-gray-600 group-hover:text-primary transition-colors" />
                          {cartCount !== undefined && cartCount > 0 && (
                            <Badge className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[9px] bg-primary">
                              {cartCount > 9 ? "9+" : cartCount}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-600 group-hover:text-primary transition-colors whitespace-nowrap">買い物かご</span>
                      </Link>

                      {/* 장바구니 hover 팝업 */}
                      {cartPopup.open && (
                        <div className="absolute right-0 top-full pt-1 z-50 w-80">
                          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold text-gray-800">カート</span>
                                {cartCount !== undefined && cartCount > 0 && (
                                  <span className="text-xs text-gray-500">({cartCount}点)</span>
                                )}
                              </div>
                              <Link href="/cart" className="text-xs text-primary hover:underline">カートを見る</Link>
                            </div>
                            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                              {(!cartItems || cartItems.length === 0) && (
                                <div className="px-4 py-8 text-center">
                                  <ShoppingCart className="w-8 h-8 mx-auto text-gray-200 mb-2" />
                                  <p className="text-sm text-gray-400">カートは空です</p>
                                </div>
                              )}
                              {cartItems && cartItems.slice(0, 5).map((item: any) => {
                                const cartItem = item.cartItem ?? item;
                                const price = item.product?.discountedPrice ?? item.product?.price ?? 0;
                                const imageUrl = item.product?.imageUrls?.[0] || item.product?.imageUrl;
                                return (
                                  <div key={cartItem.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                                      {imageUrl ? (
                                        <img src={getOptimizedSrc(imageUrl, 48, 80)} alt={item.product?.nameJa || ""} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <ShoppingCart className="w-4 h-4 text-gray-300" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">
                                        {item.product?.nameJa || item.product?.name || "商品名不明"}
                                      </p>
                                      <div className="flex items-center justify-between mt-1">
                                        <p className="text-xs text-gray-500">×{cartItem.quantity}</p>
                                        <p className="text-xs font-semibold text-primary">
                                          ¥{(price * cartItem.quantity).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeCartMutation.mutate({ id: cartItem.id }); }}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                              {cartItems && cartItems.length > 5 && (
                                <div className="px-4 py-2 text-center text-xs text-gray-400">他{cartItems.length - 5}点...</div>
                              )}
                            </div>
                            {cartItems && cartItems.length > 0 && (
                              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs text-gray-600">小計</span>
                                  <span className="text-sm font-bold text-primary">¥{cartTotal.toLocaleString()}</span>
                                </div>
                                <Link href="/cart" className="block w-full text-center py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                                  カートへ進む
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. お知らせ */}
                    <div
                      className="relative"
                      onMouseEnter={noticePopup.onMouseEnter}
                      onMouseLeave={noticePopup.onMouseLeave}
                    >
                      <Link
                        href="/bbs/notice"
                        className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-gray-100 transition-colors group min-w-[44px]"
                      >
                        <div className="relative">
                          <Megaphone className="w-6 h-6 text-gray-600 group-hover:text-primary transition-colors" />
                          {recentNotices.length > 0 && (
                            <Badge className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[9px] bg-primary">
                              {recentNotices.length > 9 ? "9+" : recentNotices.length}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-600 group-hover:text-primary transition-colors whitespace-nowrap">お知らせ</span>
                      </Link>

                      {/* 공지 hover 팝업 */}
                      {noticePopup.open && (
                        <div className="absolute right-0 top-full pt-1 z-50 w-80">
                          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Megaphone className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-semibold text-gray-800">お知らせ</span>
                              </div>
                              <Link href="/bbs/notice" className="text-xs text-primary hover:underline">すべて見る</Link>
                            </div>
                            <div className="divide-y divide-gray-50">
                              {recentNotices.length === 0 && (
                                <div className="px-4 py-6 text-center text-sm text-gray-400">お知らせがありません</div>
                              )}
                              {recentNotices.map((notice: any) => {
                                const thumbSrc = extractFirstImageSrc(notice.contentJa || "");
                                const cat = NOTICE_CATEGORY_CONFIG[notice.category ?? "notice"] ?? NOTICE_CATEGORY_CONFIG["notice"];
                                return (
                                  <Link key={notice.id} href="/bbs/notice" className="block px-4 py-3 hover:bg-gray-50 transition-colors group">
                                    {thumbSrc && (
                                      <div className="mb-2 rounded-lg overflow-hidden h-20 w-full bg-gray-100">
                                        <img src={getOptimizedSrc(thumbSrc, 300, 75)} alt={notice.titleJa} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className={`inline-block px-1.5 py-0 text-[10px] font-bold rounded-sm ${cat.cls}`}>{cat.label}</span>
                                      <p className="text-xs text-gray-400">
                                        {new Date(notice.createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".")}
                                      </p>
                                    </div>
                                    <p className="text-sm text-gray-700 group-hover:text-gray-900 line-clamp-2 leading-snug">{notice.titleJa}</p>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. お気に入り */}
                    <Link
                      href="/mypage/wishlist"
                      className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-gray-100 transition-colors group min-w-[44px]"
                    >
                      <Heart className="w-6 h-6 text-gray-600 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-gray-600 group-hover:text-primary transition-colors whitespace-nowrap">お気に入り</span>
                    </Link>

                    {/* 4. 購入履歴 */}
                    <Link
                      href="/mypage/order"
                      className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-gray-100 transition-colors group min-w-[44px]"
                    >
                      <BookOpen className="w-6 h-6 text-gray-600 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-gray-600 group-hover:text-primary transition-colors whitespace-nowrap">購入履歴</span>
                    </Link>

                    {/* 5. myクーポン */}
                    <Link
                      href="/mypage/coupons"
                      className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-gray-100 transition-colors group min-w-[44px]"
                    >
                      <div className="relative">
                        <Ticket className="w-6 h-6 text-gray-600 group-hover:text-primary transition-colors" />
                        {couponCount > 0 && (
                          <Badge className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[9px] bg-green-500">
                            {couponCount > 9 ? "9+" : couponCount}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-600 group-hover:text-primary transition-colors whitespace-nowrap">myクーポン</span>
                    </Link>

                    {/* 구분선 */}
                    <div className="w-px h-10 bg-gray-200 mx-0.5" />

                    {/* 유저 메뉴 (hover) */}
                    <div
                      className="relative"
                      onMouseEnter={userPopup.onMouseEnter}
                      onMouseLeave={userPopup.onMouseLeave}
                    >
                      <button className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-gray-100 transition-colors group min-w-[44px]">
                        <User className="w-6 h-6 text-gray-600 group-hover:text-primary transition-colors" />
                        <span className="text-[10px] text-gray-600 group-hover:text-primary transition-colors max-w-[64px] truncate">{user?.name || "マイページ"}</span>
                      </button>

                      {userPopup.open && (
                        <div className="absolute right-0 top-full pt-1 z-50 w-56">
                          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">{user?.name || "ゲスト"}</p>
                                  <p className="text-[11px] text-gray-500 truncate max-w-[140px]">{user?.email || ""}</p>
                                </div>
                              </div>
                            </div>
                            <div className="py-1">
                              {mypageMenuItems.map((item) => (
                                <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors group">
                                  <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                                  <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1">{item.label}</span>
                                  {item.badge !== undefined && item.badge > 0 && (
                                    <Badge className="h-4 min-w-[16px] px-1 text-[10px] bg-pink-500">{item.badge}</Badge>
                                  )}
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                                </Link>
                              ))}
                            </div>
                            <div className="border-t border-gray-100" />
                            {user?.role === 'admin' && (
                              <>
                                <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-primary/5 transition-colors">
                                  <Settings className="w-4 h-4 text-primary" />
                                  <span className="text-sm text-primary font-semibold">管理者ページ</span>
                                </Link>
                                <div className="border-t border-gray-100" />
                              </>
                            )}
                            <button onClick={() => logout()} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-50 transition-colors group">
                              <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                              <span className="text-sm text-gray-600 group-hover:text-red-600">ログアウト</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 알림 벨 */}
                    <Link
                      href="/mypage/notifications"
                      className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-gray-100 transition-colors group min-w-[40px]"
                      aria-label="通知"
                    >
                      <div className="relative">
                        <Bell className="w-6 h-6 text-gray-600 group-hover:text-primary transition-colors" />
                        {notificationCount !== undefined && notificationCount.count > 0 && (
                          <Badge className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 flex items-center justify-center p-0 text-[9px] bg-red-500">
                            {notificationCount.count > 99 ? "99+" : notificationCount.count}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-600 group-hover:text-primary transition-colors">通知</span>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  {/* 비로그인 - 공지/로그인/회원가입 3개 아이콘 (PC) */}
                  <div className="flex items-end gap-0">

                    {/* 공지 */}
                    <Link
                      href="/bbs/notice"
                      className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-gray-100 transition-colors group min-w-[44px]"
                    >
                      <Megaphone className="w-6 h-6 text-gray-600 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-gray-600 group-hover:text-primary transition-colors whitespace-nowrap">お知らせ</span>
                    </Link>

                    {/* 구분선 */}
                    <div className="w-px h-10 bg-gray-200 mx-0.5" />

                    {/* 로그인 버튼 */}
                    <Link
                      href="/login"
                      className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-gray-100 transition-colors group min-w-[44px]"
                    >
                      <User className="w-6 h-6 text-gray-600 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-gray-600 group-hover:text-primary transition-colors whitespace-nowrap">ログイン</span>
                    </Link>

                    {/* 회원가입 버튼 */}
                    <Link
                      href="/register"
                      className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-gray-100 transition-colors group min-w-[44px]"
                    >
                      <UserPlus className="w-6 h-6 text-gray-600 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-gray-600 group-hover:text-primary transition-colors whitespace-nowrap">会員登録</span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick menu bar - PC only */}
        <div className="border-t border-primary/20 qoo-nav-bar">
          <div className="container">
            <div className="flex items-center overflow-x-auto scrollbar-hide" style={{ paddingTop: '6px', paddingBottom: '6px' }}>
              {quickMenuItems.map((item, idx) => (
                item.label === "セール商品" ? (
                  <Link key={idx} href={item.href} className="shrink-0 mx-1.5">
                    <span className="qoo-accent-pill" style={{ fontSize: '12px', padding: '3px 12px' }}>{item.label}</span>
                  </Link>
                ) : (
                  <Link
                    key={idx}
                    href={item.href}
                    className="font-medium text-white/95 hover:text-white hover:bg-white/10 px-3 py-1 transition-colors whitespace-nowrap border-r border-white/15 last:border-r-0 shrink-0"
                    style={{ fontSize: '12.5px' }}
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: 풀 메뉴 드로어 */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-border shadow-lg fixed left-0 right-0 z-50" style={{top: '64px', bottom: '60px', overflowY: 'auto'}}>
          <div className="container py-2 space-y-3 pb-4">
            {/* 유저 정보 + 닫기/로그아웃 한 줄 */}
            {isAuthenticated ? (
              <div className="flex items-center justify-between py-1.5 border-b">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-xs font-medium">{user?.name || "マイページ"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-500 transition-colors border border-gray-200 text-[9px] font-medium"
                  >
                    <LogOut className="w-2.5 h-2.5" />
                    ログアウト
                  </button>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors border border-gray-200 text-[9px] font-medium"
                  >
                    <X className="w-2.5 h-2.5" />
                    閉じる
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex gap-2 flex-1">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2 border border-primary text-primary text-sm rounded-md font-medium">
                    ログイン
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2 bg-primary text-white text-sm rounded-md font-medium">
                    新規登録
                  </Link>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="ml-2 flex items-center gap-0.5 px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors border border-gray-200 text-[9px] font-medium shrink-0"
                >
                  <X className="w-3 h-3" />
                  閉じる
                </button>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">メニュー</p>
              <div className="grid grid-cols-2 gap-1.5">
                {quickMenuItems.map((item, idx) => (
                  <Link key={idx} href={item.href}
                    className="text-xs py-2 px-3 bg-gray-50 rounded-md hover:bg-primary/5 hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">サービス</p>
              <div className="grid grid-cols-2 gap-1.5">
                {topLinks.map((link) => (
                  <Link key={link.id} href={link.href}
                    className="text-xs py-2 px-3 bg-secondary/50 rounded-md hover:bg-secondary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {categories && categories.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">カテゴリー</p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((category: any) => (
                    <Link key={category.id} href={`/category/${category.slug}`}
                      className="text-xs py-1 px-2.5 bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}>
                      {category.nameJa}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {isAuthenticated && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">マイページ</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {mypageMenuItems.map((item) => (
                    <Link key={item.href} href={item.href}
                      className="text-xs py-2 px-3 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors text-blue-700"
                      onClick={() => setMobileMenuOpen(false)}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {user?.role === 'admin' && (
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2 bg-primary/10 text-primary text-sm rounded-md font-medium">
                管理者ページ
              </Link>
            )}
          </div>
        </div>
      )}

      <PointExpiryBanner />
    </header>
  );
}
