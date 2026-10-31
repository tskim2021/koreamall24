import { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import { useAuth } from "@/_core/hooks/useAuth";
interface AdminLayoutProps {
  children: ReactNode;
  /** noPadding=true 시 내부 p-8 패딩 및 overflow-auto 제거 (전체화면 레이아웃용) */
  noPadding?: boolean;
}
export default function AdminLayout({ children, noPadding }: AdminLayoutProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  return (
    /*
     * PC 전용 관리자 레이아웃
     * - 최소 너비 1280px 고정: 그 이하 화면에서는 가로 스크롤
     * - 모바일 반응형 없음
     * - AdminBar(32px)가 표시될 때 상단 여백을 추가하여 가려지지 않도록 함
     */
    <div
      style={{ minWidth: "1280px", fontSize: "13px" }}
      className="admin-root min-h-screen overflow-x-auto bg-gray-100"
    >
      <div className="flex" style={{ minWidth: "1280px", minHeight: "100vh" }}>
        <AdminSidebar />
        {noPadding ? (
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            {children}
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
