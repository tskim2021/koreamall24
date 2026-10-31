import Header from"@/components/Header";
import Footer from"@/components/Footer";
import { useAuth } from"@/_core/hooks/useAuth";
import { trpc } from"@/lib/trpc";
import AdminEventsTab from"./AdminEventsTab";

export default function AdminEvents() {
 const { user, loading } = useAuth();

 const { data: isAdmin, isLoading: checkingAdmin } = trpc.admin.isAdmin.useQuery(undefined, {
 enabled: !!user,
 });

 if (loading || checkingAdmin) {
 return (
 <div className="min-h-screen flex flex-col">
 <Header />
 <main className="flex-1 flex items-center justify-center">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
 </main>
 <Footer />
 </div>
 );
 }

 if (!user || !isAdmin) {
 return (
 <div className="min-h-screen flex flex-col">
 <Header />
 <main className="flex-1 flex items-center justify-center">
 <div className="text-center">
 <h2 className="text-xl font-bold text-gray-800 mb-4">접근 권한이 없습니다</h2>
 <p className="text-gray-600 mb-4">이 페이지는 관리자만 접근할 수 있습니다.</p>
 </div>
 </main>
 <Footer />
 </div>
 );
 }

 return (
 <div className="min-h-screen flex flex-col bg-gray-50">
 <Header />
 <main className="flex-1 container py-8">
 <div className="mb-8">
 <h2 className="text-xl font-bold text-gray-800">이벤트 관리</h2>
 <p className="text-gray-600 mt-1">이벤트 정보 관리</p>
 </div>

 <div className="bg-white rounded-lg border border-border p-6">
 <AdminEventsTab />
 </div>
 </main>
 <Footer />
 </div>
 );
}
