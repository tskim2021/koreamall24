import { useState } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { toast } from"sonner";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Badge } from"@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from"@/components/ui/select";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from"@/components/ui/dialog";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import {
 Coins,
 Plus,
 Minus,
 Search,
 RefreshCw,
 ChevronLeft,
 ChevronRight,
 ArrowUpDown,
 ArrowUp,
 ArrowDown,
} from"lucide-react";

const PAGE_SIZE = 50;

type TxType ="earn"|"spend"|"admin_add"|"admin_deduct"|"all";
type BalanceSort ="asc"|"desc"| undefined;

const typeLabel: Record<string, { label: string; color: string }> = {
 earn: { label:"적립", color:"bg-green-100 text-green-700"},
 spend: { label:"사용", color:"bg-orange-100 text-orange-700"},
 admin_add: { label:"관리자 지급", color:"bg-blue-100 text-blue-700"},
 admin_deduct: { label:"관리자 차감", color:"bg-red-100 text-red-700"},
};

export default function PointHistory() {
 // 필터 상태
 const [typeFilter, setTypeFilter] = useState<TxType>("all");
 const [searchInput, setSearchInput] = useState(""); // 입력 중
 const [search, setSearch] = useState(""); // 실제 쿼리
 const [dateFrom, setDateFrom] = useState("");
 const [dateTo, setDateTo] = useState("");
 const [balanceSort, setBalanceSort] = useState<BalanceSort>(undefined);
 const [page, setPage] = useState(0);

 // 수동 지급/차감 다이얼로그
 const [adjustOpen, setAdjustOpen] = useState(false);
 const [adjustMode, setAdjustMode] = useState<"add"|"deduct">("add");
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; email: string; points: number } | null>(null);
 const [adjustAmount, setAdjustAmount] = useState("");
 const [adjustDesc, setAdjustDesc] = useState("");

 // 데이터 쿼리
 const { data, isLoading, refetch } = trpc.point.adminGetAllTransactions.useQuery({
 limit: PAGE_SIZE,
 offset: page * PAGE_SIZE,
 type: typeFilter,
 search: search || undefined,
 dateFrom: dateFrom || undefined,
 dateTo: dateTo || undefined,
 balanceSort: balanceSort,
 });

 // 회원 검색 (지급/차감 다이얼로그용)
 const { data: searchResults, isFetching: isSearching } = trpc.point.adminSearchUsers.useQuery(
 { query: searchQuery },
 { enabled: searchQuery.length >= 2 }
 );

 // 수동 지급/차감 mutation
 const adjustMutation = trpc.point.adminAdjust.useMutation({
 onSuccess: (res) => {
 toast.success(adjustMode ==="add"?"포인트 지급 완료":"포인트 차감 완료", { description: res.message });
 setAdjustOpen(false);
 setAdjustAmount("");
 setAdjustDesc("");
 setSelectedUser(null);
 setSearchQuery("");
 refetch();
 },
 onError: (err) => {
 toast.error("오류", { description: err.message });
 },
 });

 const handleSearch = () => {
 setSearch(searchInput);
 setPage(0);
 };

 const handleReset = () => {
 setTypeFilter("all");
 setSearchInput("");
 setSearch("");
 setDateFrom("");
 setDateTo("");
 setBalanceSort(undefined);
 setPage(0);
 };

 const handleAdjust = () => {
 if (!selectedUser) return toast.error("회원을 선택해주세요.");
 const amt = parseInt(adjustAmount);
 if (!amt || amt <= 0) return toast.error("올바른 포인트 금액을 입력해주세요.");
 if (!adjustDesc.trim()) return toast.error("사유를 입력해주세요.");
 adjustMutation.mutate({
 userId: selectedUser.id,
 amount: amt,
 description: adjustDesc,
 isAdd: adjustMode ==="add",
 });
 };

 const toggleBalanceSort = () => {
 setBalanceSort((prev) => {
 if (!prev) return"desc";
 if (prev ==="desc") return"asc";
 return undefined;
 });
 setPage(0);
 };

 const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

 return (
 <AdminLayout>
 <div className="space-y-6">
 {/* 헤더 */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-xl font-bold">포인트 내역 / 지급 관리</h2>
 <p className="text-xs text-gray-500 mt-1">전체 회원의 포인트 적립·사용 내역을 조회하고 수동으로 지급·차감할 수 있습니다.</p>
 </div>
 <div className="flex gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => { setAdjustMode("add"); setAdjustOpen(true); }}
 className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
 >
 <Plus className="w-4 h-4"/>
 포인트 지급
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => { setAdjustMode("deduct"); setAdjustOpen(true); }}
 className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
 >
 <Minus className="w-4 h-4"/>
 포인트 차감
 </Button>
 <Button variant="ghost"size="sm"onClick={() => refetch()}>
 <RefreshCw className="w-4 h-4"/>
 </Button>
 </div>
 </div>

 {/* 필터 */}
 <Card>
 <CardContent className="pt-4 pb-3">
 <div className="flex flex-wrap gap-3 items-end">
 {/* 통합 검색 */}
 <div className="flex-1 min-w-[220px]">
 <Label className="text-xs text-gray-500 mb-1 block">검색 (ID / 회원명 / 이메일 / 주문번호)</Label>
 <div className="flex gap-1">
 <Input
 className="h-8 text-sm"
 placeholder="ID, 이름, 이메일, 주문번호 입력"
 value={searchInput}
 onChange={(e) => setSearchInput(e.target.value)}
 onKeyDown={(e) => e.key ==="Enter"&& handleSearch()}
 />
 <Button size="sm"className="h-8 px-3"onClick={handleSearch}>
 <Search className="w-3.5 h-3.5"/>
 </Button>
 </div>
 </div>

 {/* 거래 유형 */}
 <div>
 <Label className="text-xs text-gray-500 mb-1 block">거래 유형</Label>
 <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as TxType); setPage(0); }}>
 <SelectTrigger className="w-36 h-8 text-sm">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">전체</SelectItem>
 <SelectItem value="earn">적립</SelectItem>
 <SelectItem value="spend">사용</SelectItem>
 <SelectItem value="admin_add">관리자 지급</SelectItem>
 <SelectItem value="admin_deduct">관리자 차감</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* 날짜 범위 */}
 <div>
 <Label className="text-xs text-gray-500 mb-1 block">날짜 범위</Label>
 <div className="flex items-center gap-1">
 <Input
 type="date"
 className="h-8 text-sm w-36"
 value={dateFrom}
 onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
 />
 <span className="text-gray-400 text-xs">~</span>
 <Input
 type="date"
 className="h-8 text-sm w-36"
 value={dateTo}
 onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
 />
 </div>
 </div>

 {/* 잔액 정렬 */}
 <div>
 <Label className="text-xs text-gray-500 mb-1 block">잔액 정렬</Label>
 <Button
 variant="outline"
 size="sm"
 className="h-8 gap-1.5 text-sm border border-gray-300"
 onClick={toggleBalanceSort}
 >
 {!balanceSort && <ArrowUpDown className="w-3.5 h-3.5 text-gray-400"/>}
 {balanceSort ==="desc"&& <ArrowDown className="w-3.5 h-3.5 text-blue-500"/>}
 {balanceSort ==="asc"&& <ArrowUp className="w-3.5 h-3.5 text-blue-500"/>}
 {!balanceSort ?"기본": balanceSort ==="desc"?"많은순":"적은순"}
 </Button>
 </div>

 {/* 초기화 */}
 <div>
 <Label className="text-xs text-gray-500 mb-1 block invisible">초기화</Label>
 <Button
 variant="outline"
 size="sm"
 className="h-8 text-xs text-gray-500 border border-gray-300 hover:bg-gray-50"
 onClick={handleReset}
 >
 필터 초기화
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* 내역 테이블 */}
 <Card>
 <CardHeader className="pb-2 pt-4 px-4">
 <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
 <Coins className="w-4 h-4 text-yellow-500"/>
 포인트 거래 내역
 {data && <span className="text-gray-400 font-normal">총 {data.total.toLocaleString()}건</span>}
 </CardTitle>
 </CardHeader>
 <CardContent className="px-0 pb-0">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b bg-gray-50 text-xs text-gray-500">
 <th className="px-4 py-2 text-left">ID</th>
 <th className="px-4 py-2 text-left">회원</th>
 <th className="px-4 py-2 text-left">유형</th>
 <th className="px-4 py-2 text-right">포인트</th>
 <th
 className="px-4 py-2 text-right cursor-pointer select-none hover:text-blue-600"
 onClick={toggleBalanceSort}
 >
 잔액
 {!balanceSort && <ArrowUpDown className="inline w-3 h-3 ml-1 text-gray-300"/>}
 {balanceSort ==="desc"&& <ArrowDown className="inline w-3 h-3 ml-1 text-blue-500"/>}
 {balanceSort ==="asc"&& <ArrowUp className="inline w-3 h-3 ml-1 text-blue-500"/>}
 </th>
 <th className="px-4 py-2 text-left">사유</th>
 <th className="px-4 py-2 text-left">주문번호</th>
 <th className="px-4 py-2 text-left">일시</th>
 </tr>
 </thead>
 <tbody>
 {isLoading ? (
 <tr>
 <td colSpan={8} className="text-center py-10 text-gray-400">로딩 중...</td>
 </tr>
 ) : !data?.rows?.length ? (
 <tr>
 <td colSpan={8} className="text-center py-10 text-gray-400">내역이 없습니다.</td>
 </tr>
 ) : (
 data.rows.map((row) => {
 const t = typeLabel[row.type] ?? { label: row.type, color:"bg-gray-100 text-gray-600"};
 const isPositive = row.amount > 0;
 return (
 <tr key={row.id} className="border-b hover:bg-gray-50 transition-colors">
 <td className="px-4 py-2 text-gray-400 text-xs">{row.id}</td>
 <td className="px-4 py-2">
 <div className="text-xs font-medium text-gray-800">{row.userEmail ?? "-"}</div>
 {row.userName && <div className="text-xs text-gray-400">{row.userName}</div>}
 </td>
 <td className="px-4 py-2">
 <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.color}`}>
 {t.label}
 </span>
 </td>
 <td className={`px-4 py-2 text-right font-semibold text-sm ${isPositive ?"text-blue-600":"text-red-500"}`}>
 {isPositive ?"+":""}{row.amount.toLocaleString()}P
 </td>
 <td className="px-4 py-2 text-right text-sm text-gray-700">
 {row.balance.toLocaleString()}P
 </td>
 <td className="px-4 py-2 text-xs text-gray-600 max-w-[180px] truncate">
 {row.description ??"-"}
 </td>
 <td className="px-4 py-2 text-xs text-gray-400">
 {row.orderId ? `#${row.orderId}` :"-"}
 </td>
 <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">
 {row.createdAt ? new Date(row.createdAt).toLocaleString("ko-KR") :"-"}
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 {/* 페이지네이션 */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between px-4 py-3 border-t">
 <span className="text-xs text-gray-500">
 {page + 1} / {totalPages} 페이지
 </span>
 <div className="flex gap-1">
 <Button variant="ghost"size="sm"disabled={page === 0} onClick={() => setPage(p => p - 1)}>
 <ChevronLeft className="w-4 h-4"/>
 </Button>
 <Button variant="ghost"size="sm"disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
 <ChevronRight className="w-4 h-4"/>
 </Button>
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* 수동 지급/차감 다이얼로그 */}
 <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle className={adjustMode ==="add"?"text-blue-700":"text-red-600"}>
 {adjustMode ==="add"?"포인트 수동 지급":"포인트 수동 차감"}
 </DialogTitle>
 </DialogHeader>

 <div className="space-y-4 py-2">
 {/* 회원 검색 */}
 <div>
 <Label className="text-sm font-medium">회원 검색</Label>
 <div className="relative mt-1">
 <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400"/>
 <Input
 className="pl-8"
 placeholder="이름 또는 이메일 검색 (2자 이상)"
 value={searchQuery}
 onChange={(e) => { setSearchQuery(e.target.value); setSelectedUser(null); }}
 />
 </div>
 {searchQuery.length >= 2 && (
 <div className="mt-1 border rounded-md max-h-40 overflow-y-auto bg-white">
 {isSearching ? (
 <div className="text-center py-3 text-xs text-gray-400">검색 중...</div>
 ) : !searchResults?.length ? (
 <div className="text-center py-3 text-xs text-gray-400">검색 결과 없음</div>
 ) : (
 searchResults.map((u) => (
 <button
 key={u.id}
 className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${selectedUser?.id === u.id ?"bg-blue-50":""}`}
 onClick={() => { setSelectedUser(u); setSearchQuery(u.name ?? u.email); }}
 >
 <div>
 <div className="font-medium text-gray-800">{u.name}</div>
 <div className="text-xs text-gray-400">{u.email}</div>
 </div>
 <Badge variant="outline"className="text-xs">
 {u.points.toLocaleString()}P
 </Badge>
 </button>
 ))
 )}
 </div>
 )}
 {selectedUser && (
 <div className="mt-2 px-3 py-2 bg-blue-50 rounded-md text-sm">
 <span className="font-medium text-blue-800">{selectedUser.name}</span>
 <span className="text-blue-500 ml-2 text-xs">{selectedUser.email}</span>
 <span className="ml-2 text-blue-600 font-semibold">현재 {selectedUser.points.toLocaleString()}P</span>
 </div>
 )}
 </div>

 {/* 포인트 금액 */}
 <div>
 <Label className="text-sm font-medium">
 {adjustMode ==="add"?"지급":"차감"} 포인트
 </Label>
 <Input
 type="number"
 min={1}
 className="mt-1"
 placeholder="예: 1000"
 value={adjustAmount}
 onChange={(e) => setAdjustAmount(e.target.value)}
 />
 </div>

 {/* 사유 */}
 <div>
 <Label className="text-sm font-medium">사유</Label>
 <Textarea
 className="mt-1 resize-none"
 rows={2}
 placeholder="예: CS 보상 지급, 이벤트 당첨 등"
 value={adjustDesc}
 onChange={(e) => setAdjustDesc(e.target.value)}
 />
 </div>
 </div>

 <DialogFooter>
 <Button variant="ghost"onClick={() => setAdjustOpen(false)}>취소</Button>
 <Button
 onClick={handleAdjust}
 disabled={adjustMutation.isPending}
 className={adjustMode ==="add"?"bg-blue-600 hover:bg-blue-700":"bg-red-600 hover:bg-red-700"}
 >
 {adjustMutation.isPending ?"처리 중...": adjustMode ==="add"?"지급하기":"차감하기"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </AdminLayout>
 );
}
