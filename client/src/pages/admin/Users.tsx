import { useAuth } from"@/_core/hooks/useAuth";
import { trpc } from"@/lib/trpc";
import Header from"@/components/Header";
import Footer from"@/components/Footer";
import { Link } from"wouter";
import { useState } from"react";
import { Button } from"@/components/ui/button";
import { ArrowLeft, User, Shield, ShieldOff } from"lucide-react";
import { toast } from"sonner";

export default function AdminUsers() {
 const { user, loading } = useAuth();
 const [page, setPage] = useState(1);
 
 const { data: isAdmin, isLoading: checkingAdmin } = trpc.admin.isAdmin.useQuery(undefined, {
 enabled: !!user,
 });
 
 const { data, isLoading, refetch } = trpc.admin.users.useQuery(
 { page, limit: 20 },
 { enabled: isAdmin === true }
 );

 const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
 onSuccess: () => {
 toast.success("사용자 권한이 업데이트되었습니다");
 refetch();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const handleToggleAdmin = (userId: number, currentRole: string) => {
 const newRole = currentRole ==="admin"?"user":"admin";
 if (confirm(`이 사용자를 ${newRole ==="admin"?"관리자":"일반 사용자"}로 변경하시겠습니까?`)) {
 updateRoleMutation.mutate({ userId, role: newRole });
 }
 };

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
 <h1 className="text-2xl font-bold text-gray-800 mb-4">접근 권한이 없습니다</h1>
 <Link href="/"className="text-red-600 hover:underline">홈 페이지로 돌아가기</Link>
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
 <div className="mb-6">
 <Link href="/admin"className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
 <ArrowLeft className="h-4 w-4"/>
 대시보드로 돌아가기
 </Link>
 <h1 className="text-2xl font-bold text-gray-800">회원 관리</h1>
 </div>

 {/* Users Table */}
 <div className="bg-white rounded-lg border border-border overflow-hidden">
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">회원정보</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">이메일 주소</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">등록일</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">권한</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작업</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {isLoading ? (
 <tr>
 <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
 로딩 중...
 </td>
 </tr>
 ) : (data as any)?.users?.length === 0 ? (
 <tr>
 <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
 회원이 없습니다
 </td>
 </tr>
 ) : (
 ((data as any)?.users ?? []).map((member: any) => (
 <tr key={member.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm text-gray-600">{member.id}</td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
 <User className="h-5 w-5 text-gray-500"/>
 </div>
 <div>
 <p className="text-sm font-medium text-gray-900">
 {member.nameKanji || member.name ||"미설정"}
 </p>
 <p className="text-xs text-gray-500">
 {member.nameHiragana ||""}
 </p>
 </div>
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-gray-600">
 {member.email ||"-"}
 </td>
 <td className="px-4 py-3 text-sm text-gray-600">
 {member.createdAt ? new Date(member.createdAt).toLocaleDateString("ja-JP") :"-"}
 </td>
 <td className="px-4 py-3">
 {member.role ==="admin"? (
 <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
 <Shield className="h-3 w-3"/>
 관리자
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
 <User className="h-3 w-3"/>
 일반
 </span>
 )}
 </td>
 <td className="px-4 py-3">
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleToggleAdmin(member.id, member.role ||"user")}
 disabled={updateRoleMutation.isPending}
 >
 {member.role ==="admin"? (
 <>
 <ShieldOff className="h-4 w-4 mr-1"/>
 권한 해제
 </>
 ) : (
 <>
 <Shield className="h-4 w-4 mr-1"/>
 관리자로
 </>
 )}
 </Button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {(data as any)?.users && (data as any).users.length >= 20 && (
 <div className="mt-4 flex justify-center gap-2">
 <Button
 variant="outline"
 onClick={() => setPage(p => Math.max(1, p - 1))}
 disabled={page === 1}
 >
 이전
 </Button>
 <span className="flex items-center px-4 text-sm text-gray-600">
 {page} / {Math.ceil(((data as any)?.users?.length || 0) / 20) || 1}
 </span>
 <Button
 variant="outline"
 onClick={() => setPage(p => p + 1)}
 disabled={!(data as any)?.users || (data as any).users.length < 20}
 >
 다음
 </Button>
 </div>
 )}
 </main>
 <Footer />
 </div>
 );
}
