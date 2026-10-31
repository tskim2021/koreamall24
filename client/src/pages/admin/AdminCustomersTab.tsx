import { useState, useMemo } from"react";
import { trpc } from"@/lib/trpc";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { User, Search, X, FileText } from"lucide-react";

export default function AdminCustomersTab() {
 const [page, setPage] = useState(1);
 const [searchQuery, setSearchQuery] = useState("");
 const [sortBy, setSortBy] = useState<"newest"|"oldest"|"name">("newest");
 
 const { data: usersRaw, isLoading } = trpc.admin.users.useQuery(
 { page: 1, limit: 1000 },
 { enabled: true }
 );
 const allUsers = (usersRaw as any)?.users ?? [];

 const ITEMS_PER_PAGE = 20;

 // Filter and sort users
 const filteredAndSortedUsers = useMemo(() => {
 let filtered = [...allUsers];

 // Filter by search query
 if (searchQuery.trim()) {
 const query = searchQuery.toLowerCase();
 filtered = filtered.filter((user: any) => {
 const nameMatch = (user.nameKanji || user.name ||"").toLowerCase().includes(query);
 const emailMatch = (user.email ||"").toLowerCase().includes(query);
 const idMatch = user.id.toString().includes(query);
 return nameMatch || emailMatch || idMatch;
 });
 }

 // Sort
 switch (sortBy) {
 case"newest":
 filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
 break;
 case"oldest":
 filtered.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
 break;
 case"name":
 filtered.sort((a: any, b: any) => {
 const nameA = (a.nameKanji || a.name ||"").toLowerCase();
 const nameB = (b.nameKanji || b.name ||"").toLowerCase();
 return nameA.localeCompare(nameB);
 });
 break;
 }

 return filtered;
 }, [allUsers, searchQuery, sortBy]);

 // Paginate
 const totalPages = Math.ceil(filteredAndSortedUsers.length / ITEMS_PER_PAGE);
 const paginatedUsers = filteredAndSortedUsers.slice(
 (page - 1) * ITEMS_PER_PAGE,
 page * ITEMS_PER_PAGE
 );

 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-xl font-bold text-gray-800 mb-4">고객 관리</h2>
 <p className="text-gray-600 mb-4">전체 {filteredAndSortedUsers.length}명의 고객</p>
 </div>

 {/* Search and Sort Controls */}
 <div className="space-y-4">
 {/* Search Bar */}
 <div className="flex gap-2">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"size={20} />
 <Input
 type="text"
 placeholder="고객명, 이메일 주소, ID로 검색..."
 value={searchQuery}
 onChange={(e) => {
 setSearchQuery(e.target.value);
 setPage(1);
 }}
 className="pl-10 pr-10"
 />
 {searchQuery && (
 <button
 onClick={() => {
 setSearchQuery("");
 setPage(1);
 }}
 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
 >
 <X size={20} />
 </button>
 )}
 </div>
 </div>

 {/* Sort Controls */}
 <div className="flex items-center gap-4">
 <label className="text-sm font-medium text-gray-700">정렬 순서:</label>
 <select
 value={sortBy}
 onChange={(e) => {
 setSortBy(e.target.value as any);
 setPage(1);
 }}
 className="px-3 py-2 border border-gray-300 rounded-md text-sm"
 >
 <option value="newest">최신순</option>
 <option value="oldest">오래된 순</option>
 <option value="name">이름순</option>
 </select>
 </div>
 </div>

 {/* Search Results Info */}
 {searchQuery && (
 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
 <p className="text-sm text-blue-800">
 "<strong>{searchQuery}</strong>"검색 결과: <strong>{filteredAndSortedUsers.length}</strong>건
 </p>
 </div>
 )}

 {/* Customers Table */}
 <div className="bg-white rounded-lg border border-border overflow-x-auto">
 <table className="w-full text-nowrap">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 whitespace-nowrap">ID</th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 whitespace-nowrap">고객정보</th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 whitespace-nowrap">등록일</th>
 <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 whitespace-nowrap">상태</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {isLoading ? (
 <tr>
 <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
 로딩 중...
 </td>
 </tr>
 ) : paginatedUsers.length === 0 ? (
 <tr>
 <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
 {searchQuery ? `"${searchQuery}"에 일치하는 고객을 찾을 수 없습니다` :"고객이 없습니다"}
 </td>
 </tr>
 ) : (
 paginatedUsers.map((customer: any) => (
 <tr key={customer.id} className="hover:bg-gray-50">
 <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">{customer.id}</td>
 <td className="px-2 py-2">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
 <User className="h-4 w-4 text-gray-500"/>
 </div>
 <div className="min-w-0">
 <p className="text-xs font-medium text-gray-900 truncate">
 {customer.nameKanji || customer.name ||"미설정"}
 </p>
 <p className="text-xs text-gray-500 truncate">
 {customer.nameHiragana || ""}
 </p>
 </div>
 </div>
 </td>
 <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">
 {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString("ja-JP") :"-"}
 </td>
 <td className="px-2 py-2 whitespace-nowrap">
 <div className="flex items-center gap-1">
 <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
 활성
 </span>
 <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="고객 상세 정보">
 <FileText className="h-4 w-4 text-gray-500"/>
 </button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex justify-center items-center gap-2">
 <Button
 variant="outline"
 onClick={() => setPage(Math.max(1, page - 1))}
 disabled={page === 1}
 >
 이전
 </Button>

 {Array.from({ length: totalPages }).map((_, i) => {
 const pageNum = i + 1;
 const isNearCurrent = Math.abs(pageNum - page) <= 2;
 const isFirstOrLast = pageNum === 1 || pageNum === totalPages;

 if (!isNearCurrent && !isFirstOrLast) {
 if (pageNum === 2 || pageNum === totalPages - 1) {
 return <span key={pageNum}>...</span>;
 }
 return null;
 }

 return (
 <Button
 key={pageNum}
 variant={page === pageNum ?"default":"outline"}
 onClick={() => setPage(pageNum)}
 size="sm"
 >
 {pageNum}
 </Button>
 );
 })}

 <Button
 variant="outline"
 onClick={() => setPage(Math.min(totalPages, page + 1))}
 disabled={page === totalPages}
 >
 다음
 </Button>
 </div>
 )}
 </div>
 );
}
