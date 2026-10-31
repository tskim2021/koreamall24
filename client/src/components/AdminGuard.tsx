import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AdminLayout from "./AdminLayout";

interface AdminGuardProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

/**
 * AdminGuard: 관리자 인증 가드 컴포넌트
 * - 미인증 시 /login 으로 리다이렉트
 * - 비관리자 시 접근 권한 없음 메시지 표시
 */
export default function AdminGuard({ children, noPadding }: AdminGuardProps) {
  const { user, loading } = useAuth();

  const { data: isAdmin, isLoading: checkingAdmin } = trpc.admin.isAdmin.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    // 로딩 완료 후 미인증 시 /login 으로 리다이렉트
    if (!loading && !checkingAdmin && !user) {
      // React 언마운트 완료 후 리다이렉트하여 removeChild 오류 방지
      setTimeout(() => {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }, 0);
    }
  }, [loading, checkingAdmin, user]);

  if (loading || checkingAdmin) {
    return (
      <AdminLayout noPadding={noPadding}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    // 리다이렉트 중 - 스피너 표시
    return (
      <AdminLayout noPadding={noPadding}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout noPadding={noPadding}>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">접근 권한이 없습니다</h1>
          <p className="text-gray-600 mb-4">이 페이지는 관리자만 접근할 수 있습니다.</p>
          <a href="/" className="text-pink-600 hover:underline">홈페이지로 돌아가기</a>
        </div>
      </AdminLayout>
    );
  }

  return <>{children}</>;
}
