import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { LayoutDashboard, Package, Megaphone, Settings, ExternalLink, ShoppingBag, Users, EyeOff, Eye } from "lucide-react";
import { useState } from "react";

/**
 * AdminBar - WordPress 스타일 관리자 전용 상단 바
 * 관리자 로그인 시에만 표시되며, 페이지 최상단에 고정됩니다.
 * 높이: 32px (h-8)
 */
export default function AdminBar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [hidden, setHidden] = useState(false);

  if (!user || user.role !== "admin") return null;

  // 숨김 상태일 때 작은 복원 버튼만 표시
  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="fixed top-0 right-4 z-[9999] bg-gray-900 text-white/60 hover:text-white text-[10px] px-2 py-0.5 rounded-b shadow-md flex items-center gap-1 transition-colors"
        title="관리자 바 표시"
      >
        <Eye className="w-3 h-3" />
        관리자
      </button>
    );
  }

  // 현재 페이지에서 관리자 편집 URL 계산
  const getEditUrl = (): string | null => {
    const productMatch = location.match(/^\/products?\/([^/]+)/);
    if (productMatch) return `/admin/products`;

    const noticeMatch = location.match(/^\/bbs\/notice\/(\d+)/);
    if (noticeMatch) return `/admin/announcements?edit=${noticeMatch[1]}`;

    if (location === "/bbs/notice") return `/admin/announcements`;
    if (location.startsWith("/category")) return `/admin/categories`;
    if (location === "/" || location === "") return `/admin`;

    return null;
  };

  const editUrl = getEditUrl();
  const isAdminPage = location.startsWith("/admin");

  return (
    <div
      className="hidden md:flex fixed top-0 left-0 right-0 z-[9999] bg-gray-900 text-white text-xs h-8 items-center px-3 shadow-md"
      style={{ fontFamily: "sans-serif" }}
    >
      <div className="flex items-center gap-0 flex-1 overflow-x-auto scrollbar-none">
        {/* 로고/홈 */}
        <a
          href="/admin"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-white/10 transition-colors whitespace-nowrap font-bold text-white/90 hover:text-white mr-1"
        >
          <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" />
          <span>관리자 모드</span>
        </a>

        <div className="w-px h-4 bg-white/20 mx-1" />

        {/* 대시보드 */}
        <a
          href="/admin"
          className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-white/10 transition-colors whitespace-nowrap ${location === "/admin" ? "text-yellow-300 font-semibold" : "text-white/80 hover:text-white"}`}
        >
          <LayoutDashboard className="w-3 h-3" />
          대시보드
        </a>

        {/* 상품 관리 */}
        <a
          href="/admin/products"
          className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-white/10 transition-colors whitespace-nowrap ${location.startsWith("/admin/product") ? "text-yellow-300 font-semibold" : "text-white/80 hover:text-white"}`}
        >
          <Package className="w-3 h-3" />
          상품 관리
        </a>

        {/* 주문 관리 */}
        <a
          href="/admin/orders"
          className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-white/10 transition-colors whitespace-nowrap ${location.startsWith("/admin/order") ? "text-yellow-300 font-semibold" : "text-white/80 hover:text-white"}`}
        >
          <ShoppingBag className="w-3 h-3" />
          주문 관리
        </a>

        {/* 고객 관리 */}
        <a
          href="/admin/customers"
          className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-white/10 transition-colors whitespace-nowrap ${location.startsWith("/admin/customer") ? "text-yellow-300 font-semibold" : "text-white/80 hover:text-white"}`}
        >
          <Users className="w-3 h-3" />
          고객 관리
        </a>

        {/* 공지사항 */}
        <a
          href="/admin/announcements"
          className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-white/10 transition-colors whitespace-nowrap ${location.startsWith("/admin/announcement") ? "text-yellow-300 font-semibold" : "text-white/80 hover:text-white"}`}
        >
          <Megaphone className="w-3 h-3" />
          공지사항
        </a>

        {/* 사이트 설정 */}
        <a
          href="/admin/settings"
          className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-white/10 transition-colors whitespace-nowrap ${location.startsWith("/admin/setting") ? "text-yellow-300 font-semibold" : "text-white/80 hover:text-white"}`}
        >
          <Settings className="w-3 h-3" />
          사이트 설정
        </a>

        {/* 현재 페이지 편집 */}
        {editUrl && !isAdminPage && (
          <>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <a
              href={editUrl}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 hover:text-yellow-200 transition-colors whitespace-nowrap font-semibold"
            >
              <ExternalLink className="w-3 h-3" />
              현재 페이지 편집
            </a>
          </>
        )}

        {/* 사용자 페이지 보기 (관리자 페이지에서) */}
        {isAdminPage && (
          <>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <a
              href="/"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200 transition-colors whitespace-nowrap font-semibold"
            >
              <ExternalLink className="w-3 h-3" />
              사용자 페이지 보기
            </a>
          </>
        )}
      </div>

      {/* 우측: 사용자 이름 + 숨기기 버튼 */}
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        <span className="hidden sm:inline text-white/60 text-[11px]">{user.name}</span>
        <span className="hidden sm:inline text-white/30 text-[11px]">|</span>
        <span className="text-yellow-400 font-bold hidden sm:inline text-[11px]">관리자</span>
        <button
          onClick={() => setHidden(true)}
          className="ml-1 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
          title="관리자 바 숨기기"
        >
          <EyeOff className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
