import { useAuth } from"@/_core/hooks/useAuth";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import AdminBannersTab from"@/components/AdminBannersTab";

export default function AdminBanners() {
 const { user, loading } = useAuth();

 const { data: isAdmin, isLoading: checkingAdmin } = trpc.admin.isAdmin.useQuery(undefined, {
 enabled: !!user,
 });

 if (loading || checkingAdmin) {
 return (
 <AdminLayout>
 <div className="flex items-center justify-center h-96">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
 </div>
 </AdminLayout>
 );
 }

 if (!user || !isAdmin) {
 return (
 <AdminLayout>
 <div className="text-center py-12">
 <h2 className="text-xl font-bold text-gray-800 mb-4">접근 권한이 없습니다</h2>
 </div>
 </AdminLayout>
 );
 }

 return (
 <AdminLayout>
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-xl font-bold">배너 관리</h2>
 <p className="text-sm text-gray-500">
 메인 슬라이더 배너, 사이드바 상단/하단 배너를 관리합니다.
 </p>
 </div>
 <AdminBannersTab />
 </div>
 </AdminLayout>
 );
}
