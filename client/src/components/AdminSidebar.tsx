import { Link } from "wouter";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
  FileText,
  HelpCircle,
  Tag,
  Image,
  Home,
  TrendingUp,
  Megaphone,
  CalendarDays,
  MessageSquare,
  Store,
  PanelLeftClose,
  PanelLeftOpen,
  Ticket,
  Bot,
  CreditCard,
  List,
  Star,
  Coins,
  Mail,
  MailSearch,
  Crown,
  UserPlus,
  SearchCheck,
  Bell,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "개요",
    items: [
      { label: "대시보드", href: "/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "방문자 애널리틱스", href: "/admin/analytics", icon: <TrendingUp className="w-4 h-4" /> },
      { label: "매출·주문 통계", href: "/admin/sales-stats", icon: <TrendingUp className="w-4 h-4" /> },
      { label: "상품·추천 분석", href: "/admin/product-analysis", icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
  {
    title: "주문·상품",
    items: [
      { label: "주문 목록 - 장바구니", href: "/admin/cart-orders", icon: <ShoppingCart className="w-4 h-4" /> },
      { label: "주문 목록", href: "/admin/orders", icon: <List className="w-4 h-4" /> },
      { label: "주문 대량 관리", href: "/admin/ordersnew", icon: <List className="w-4 h-4" /> },
      { label: "상품 목록", href: "/admin/products", icon: <Package className="w-4 h-4" /> },
      { label: "카테고리", href: "/admin/categories", icon: <Tag className="w-4 h-4" /> },
      { label: "쿠폰 관리", href: "/admin/coupons", icon: <Ticket className="w-4 h-4" /> },
      { label: "리뷰 관리", href: "/admin/reviews", icon: <Star className="w-4 h-4" /> },
    ],
  },
  {
    title: "고객·회원",
    items: [
      { label: "고객 목록", href: "/admin/customers", icon: <Users className="w-4 h-4" /> },
      { label: "탈퇴 회원 관리", href: "/admin/withdrawn-customers", icon: <UserX className="w-4 h-4" /> },
      { label: "회원 등급 설정", href: "/admin/membership-tiers", icon: <Crown className="w-4 h-4" /> },
      { label: "추천인 설정", href: "/admin/referral-settings", icon: <UserPlus className="w-4 h-4" /> },
      { label: "회원 통계", href: "/admin/member-stats", icon: <TrendingUp className="w-4 h-4" /> },
      { label: "포인트 설정", href: "/admin/point-settings", icon: <Coins className="w-4 h-4" /> },
      { label: "포인트 내역/지급", href: "/admin/point-history", icon: <Coins className="w-4 h-4" /> },
    ],
  },
  {
    title: "콘텐츠",
    items: [
      { label: "배너 관리", href: "/admin/banners", icon: <Image className="w-4 h-4" /> },
      { label: "공지사항", href: "/admin/announcements", icon: <Megaphone className="w-4 h-4" /> },
      { label: "이벤트", href: "/admin/events", icon: <CalendarDays className="w-4 h-4" /> },
    ],
  },
  {
    title: "고객지원",
    items: [
      { label: "문의 관리", href: "/admin/inquiries", icon: <HelpCircle className="w-4 h-4" /> },
      { label: "상품 Q&A 관리", href: "/admin/product-questions", icon: <MessageSquare className="w-4 h-4" /> },
      { label: "챗봇 관리", href: "/admin/chatbot", icon: <Bot className="w-4 h-4" /> },
      { label: "AI 자동 답변 설정", href: "/admin/ai-settings", icon: <Bot className="w-4 h-4" /> },
    ],
  },
  {
    title: "이메일·알림",
    items: [
      { label: "Gmail 인박스", href: "/admin/gmail-inbox", icon: <Mail className="w-4 h-4" /> },
      { label: "이메일 관리", href: "/admin/email-management", icon: <Mail className="w-4 h-4" /> },
      { label: "이메일 미리보기", href: "/admin/email-preview-studio", icon: <MailSearch className="w-4 h-4" /> },
      { label: "대량 메일 발송", href: "/admin/bulk-email", icon: <Megaphone className="w-4 h-4" /> },
      { label: "알림 관리", href: "/admin/notifications", icon: <Bell className="w-4 h-4" /> },
    ],
  },
  {
    title: "설정",
    items: [
      { label: "쇼핑몰 설정", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
      { label: "결제 수단 설정", href: "/admin/payment-settings", icon: <CreditCard className="w-4 h-4" /> },
      { label: "특정상거래법 표기", href: "/admin/legal-notice", icon: <FileText className="w-4 h-4" /> },
      { label: "검색엔진 등록 관리", href: "/admin/search-console", icon: <SearchCheck className="w-4 h-4" /> },
    ],
  },
];

// Flat list for collapsed mode
const allMenuItems = navSections.flatMap((s) => s.items);

export default function AdminSidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const { data: badgeCounts } = trpc.admin.badgeCounts.useQuery(undefined, {
    refetchInterval: 2 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const isItemActive = (href: string) => {
    if (href === "/admin") {
      return location === "/admin" || location === "/admin/dashboard";
    }
    return location === href || location?.startsWith(href + "/");
  };

  const getBadge = (href: string) => {
    if (!badgeCounts) return null;
    if ((href === "/admin/orders" || href === "/admin/ordersnew") && badgeCounts.pendingOrders > 0)
      return badgeCounts.pendingOrders;
    if (href === "/admin/inquiries" && badgeCounts.unansweredInquiries > 0)
      return badgeCounts.unansweredInquiries;
    if (href === "/admin/product-questions" && badgeCounts.unansweredProductQuestions > 0)
      return badgeCounts.unansweredProductQuestions;
    return null;
  };

  return (
    <aside
      className={cn(
        "bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-200 self-stretch flex flex-col",
        collapsed ? "w-16" : "w-48"
      )}
    >
      {/* Header */}
      <div className={cn(
        "border-b border-gray-200 flex items-center",
        collapsed ? "px-3 py-4 justify-center" : "px-5 py-4 justify-between"
      )}>
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-2">
            <Store className="w-6 h-6 text-pink-600" />
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">Coco kusuri</h2>
              <p className="text-xs text-gray-400 leading-tight">관리 시스템</p>
            </div>
          </Link>
        )}
        {collapsed && <Store className="w-6 h-6 text-pink-600" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn("overflow-y-auto flex-1", collapsed ? "px-1.5 py-1.5" : "px-2.5 py-1.5")}>
        {collapsed ? (
          <div className="space-y-1">
            {allMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-colors",
                  isItemActive(item.href)
                    ? "bg-pink-50 text-pink-600"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                )}
                title={item.label}
              >
                {item.icon}
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {navSections.map((section) => (
              <div key={section.title}>
                <p className="px-2.5 pb-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const badge = getBadge(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all",
                          isItemActive(item.href)
                            ? "bg-pink-50 text-pink-600 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <span className={cn(
                          "transition-colors flex-shrink-0",
                          isItemActive(item.href) ? "text-pink-500" : "text-gray-400"
                        )}>
                          {item.icon}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {badge !== null && (
                          <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0 h-4 min-w-[16px] flex-shrink-0">
                            {badge}
                          </Badge>
                        )}
                        {isItemActive(item.href) && badge === null && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-500 flex-shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className={cn("border-t border-gray-200", collapsed ? "p-2" : "p-3")}>
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors",
            collapsed ? "justify-center p-2" : "px-3 py-2"
          )}
        >
          <Home className="w-4 h-4" />
          {!collapsed && <span>쇼핑몰로 돌아가기</span>}
        </Link>
      </div>
    </aside>
  );
}
