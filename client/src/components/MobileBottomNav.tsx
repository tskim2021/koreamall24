import { Link, useLocation } from "wouter";
import { Home, ShoppingCart, Search, User, ShoppingBag } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const tabs = [
  { href: "/", label: "ホーム", icon: Home, exact: true },
  { href: "/search", label: "商品", icon: Search },
  { href: "/cart", label: "カート", icon: ShoppingCart, badge: "cart" },
  { href: "/mypage/order", label: "注文", icon: ShoppingBag },
  { href: "/mypage", label: "マイページ", icon: User },
];

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  const { data: cartCount } = trpc.cart.count.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location === href;
    // /mypage는 /mypage/order 등 하위 경로와 구분: 정확히 /mypage 이거나 /mypage/ 로 시작하되
    // 다른 탭의 href가 더 구체적으로 매칭되면 해당 탭만 활성화
    const otherTabHrefs = tabs.filter(t => t.href !== href).map(t => t.href);
    const moreSpecificMatch = otherTabHrefs.some(
      other => other !== "/" && (location === other || location.startsWith(other + "/"))
    );
    if (moreSpecificMatch && location.startsWith(href + "/")) return false;
    return location === href || location.startsWith(href + "/");
  };

  const handleAuthRequired = (e: React.MouseEvent, href: string) => {
    if (!isAuthenticated && (href.startsWith("/mypage") || href === "/cart")) {
      e.preventDefault();
      window.location.href = getLoginUrl();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200">
      <div className="flex items-stretch h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href, tab.exact);
          const count = tab.badge === "cart" ? (cartCount ?? 0) : 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 h-full relative"
              onClick={(e: React.MouseEvent) => handleAuthRequired(e, tab.href)}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    active ? "text-primary" : "text-gray-400"
                  }`}
                />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 px-0.5 flex items-center justify-center leading-none">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium truncate max-w-full px-1 transition-colors ${
                  active ? "text-primary" : "text-gray-400"
                }`}
              >
                {tab.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
