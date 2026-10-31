import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, Crown, FileText, Download, Users, Star, UserCheck, UserX, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

type User = {
  id: number;
  email: string;
  nameKanji: string;
  nameHiragana: string;
  lastNameKanji?: string | null;
  firstNameKanji?: string | null;
  lastNameKatakana?: string | null;
  firstNameKatakana?: string | null;
  nickname?: string | null;
  phone?: string | null;
  points: number;
  role: "user" | "admin";
  isEmailVerified: boolean;
  createdAt: Date | string;
  lastSignedIn: Date | string;
  membershipTierId?: number | null;
  tierName?: string | null;
  tierColor?: string | null;
  totalPurchaseAmount?: number;
  orderCount?: number;
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "-";
  const dt = new Date(d);
  const y = dt.getFullYear().toString().slice(2);
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function TierBadge({ name, color }: { name: string | null | undefined; color: string | null | undefined }) {
  if (!name) return <span className="text-gray-400 text-xs">-</span>;
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium text-white"
      style={{ backgroundColor: color || "#6B7280", fontSize: '10px', borderRadius: '10px' }}
    >
      <Crown className="w-3 h-3" />
      {name}
    </span>
  );
}

export default function Customers() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchType, setSearchType] = useState<"all" | "id" | "name" | "email" | "phone">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [lastNameKatakanaInput, setLastNameKatakanaInput] = useState("");
  const [firstNameKatakanaInput, setFirstNameKatakanaInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState({
    search: "",
    searchType: "all" as "all" | "id" | "name" | "email" | "phone",
    dateFrom: "",
    dateTo: "",
    tierFilter: "all",
    lastNameKatakana: "",
    firstNameKatakana: "",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    nameKanji: "",
    nameHiragana: "",
    lastNameKanji: "",
    firstNameKanji: "",
    lastNameKatakana: "",
    firstNameKatakana: "",
    nickname: "",
    phone: "",
    email: "",
    role: "user" as "user" | "admin",
    points: 0,
  });

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"add_points" | "deduct_points" | "change_tier">("add_points");
  const [bulkValue, setBulkValue] = useState(0);
  const [bulkDescription, setBulkDescription] = useState("");

  const { data: tiersData } = trpc.membership.tiers.list.useQuery();
  const tiers = (tiersData as any[]) ?? [];

  const { data, isLoading, refetch } = trpc.admin.users.useQuery({
    page,
    limit: 50,
    search: appliedSearch.search || undefined,
    searchType: appliedSearch.searchType,
    dateFrom: appliedSearch.dateFrom || undefined,
    dateTo: appliedSearch.dateTo || undefined,
    tierFilter: appliedSearch.tierFilter === "all" ? undefined : appliedSearch.tierFilter || undefined,
    lastNameKatakana: appliedSearch.lastNameKatakana || undefined,
    firstNameKatakana: appliedSearch.firstNameKatakana || undefined,
  });

  const updateUserMut = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      toast.success("회원 정보가 수정되었습니다.");
      setEditOpen(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkMemberMut = trpc.admin.bulkMemberAction.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setBulkDialogOpen(false);
      setSelectedIds(new Set());
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const users: User[] = (data as any)?.users ?? [];
  const total: number = (data as any)?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 50));

  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    let newMembers = 0, activeMembers = 0, dormantMembers = 0, adminCount = 0;
    users.forEach(u => {
      const createdAt = new Date(u.createdAt);
      const lastLogin = u.lastSignedIn ? new Date(u.lastSignedIn) : null;
      if (createdAt >= thirtyDaysAgo) newMembers++;
      if (lastLogin && lastLogin >= sevenDaysAgo) activeMembers++;
      if (!lastLogin || lastLogin < sixMonthsAgo) dormantMembers++;
      if (u.role === "admin") adminCount++;
    });
    return { newMembers, activeMembers, dormantMembers, adminCount };
  }, [users]);

  const handleSearch = useCallback(() => {
    setPage(1);
    setAppliedSearch({ search: searchInput, searchType, dateFrom, dateTo, tierFilter, lastNameKatakana: lastNameKatakanaInput, firstNameKatakana: firstNameKatakanaInput });
  }, [searchInput, searchType, dateFrom, dateTo, tierFilter, lastNameKatakanaInput, firstNameKatakanaInput]);

  const handleReset = () => {
    setSearchInput(""); setSearchType("all"); setDateFrom(""); setDateTo(""); setTierFilter("all");
    setLastNameKatakanaInput(""); setFirstNameKatakanaInput(""); setPage(1);
    setAppliedSearch({ search: "", searchType: "all", dateFrom: "", dateTo: "", tierFilter: "all", lastNameKatakana: "", firstNameKatakana: "" });
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditForm({
      nameKanji: u.nameKanji, nameHiragana: u.nameHiragana,
      lastNameKanji: u.lastNameKanji ?? "", firstNameKanji: u.firstNameKanji ?? "",
      lastNameKatakana: u.lastNameKatakana ?? "", firstNameKatakana: u.firstNameKatakana ?? "",
      nickname: u.nickname ?? "", phone: u.phone ?? "", email: u.email,
      role: u.role, points: u.points,
    });
    setEditOpen(true);
  };

  const handleEditSave = () => {
    if (!editUser) return;
    updateUserMut.mutate({ id: editUser.id, ...editForm });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(users.map(u => u.id)));
  };

  const handleBulkAction = () => {
    if (selectedIds.size === 0) { toast.error("회원을 선택해주세요."); return; }
    bulkMemberMut.mutate({ userIds: Array.from(selectedIds), action: bulkAction, value: bulkValue, description: bulkDescription || undefined });
  };

  const handleExportCSV = async () => {
    try {
      const result = await (window as any).__trpcClient?.admin.exportMembersCSV.query({
        tierFilter: appliedSearch.tierFilter === "all" ? undefined : appliedSearch.tierFilter,
      });
      if (result?.csv) {
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + result.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `members_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success(`${result.count}명의 회원 데이터를 내보냈습니다.`);
      }
    } catch { toast.error("내보내기에 실패했습니다."); }
  };

  const handleTierCardClick = (tierId: string) => {
    setTierFilter(tierId); setPage(1);
    setAppliedSearch(prev => ({ ...prev, tierFilter: tierId }));
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* 페이지 타이틀 */}
        <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">회원 관리</h1>
            <p className="text-xs text-gray-500 mt-0.5">전체 회원 현황을 확인하고 관리하세요</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> CSV 내보내기
          </Button>
        </div>

        {/* 핵심 통계 4개 */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "총 회원 수", value: total, icon: Users, color: "text-pink-600", onClick: () => handleTierCardClick("all"), active: tierFilter === "all" },
            { label: "신규 가입 (30일)", value: stats.newMembers, icon: UserCheck, color: "text-green-600", onClick: undefined, active: false },
            { label: "활성 회원 (7일)", value: stats.activeMembers, icon: Star, color: "text-blue-600", onClick: undefined, active: false },
            { label: "관리자", value: stats.adminCount, icon: ShieldCheck, color: "text-purple-600", onClick: undefined, active: false },
          ].map((item) => (
            <div
              key={item.label}
              className={`bg-white border rounded-lg p-4 ${item.onClick ? 'cursor-pointer hover:border-pink-300 transition-colors' : ''} ${item.active ? 'border-pink-400 ring-1 ring-pink-300' : 'border-gray-200'}`}
              onClick={item.onClick}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{item.label}</p>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <p className={`text-xl font-bold ${item.color}`}>{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* 등급별 필터 카드 */}
        {tiers.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-500 mb-3">등급별 필터</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTierCardClick("all")}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${tierFilter === "all" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
              >
                전체
              </button>
              <button
                onClick={() => handleTierCardClick("none")}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${tierFilter === "none" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
              >
                등급 미지정
              </button>
              {tiers.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => handleTierCardClick(String(t.id))}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border transition-colors`}
                  style={{
                    backgroundColor: tierFilter === String(t.id) ? (t.color || '#6B7280') : 'white',
                    color: tierFilter === String(t.id) ? 'white' : (t.color || '#6B7280'),
                    borderColor: t.color || '#e5e7eb',
                  }}
                >
                  <Crown className="w-3 h-3" />
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 검색 필터 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={searchType} onValueChange={(v) => setSearchType(v as any)}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="id">아이디</SelectItem>
                  <SelectItem value="name">이름</SelectItem>
                  <SelectItem value="email">이메일</SelectItem>
                  <SelectItem value="phone">연락처</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1 min-w-[200px]">
                <Input
                  className="h-8 text-xs"
                  placeholder="검색어 입력..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Input type="date" className="h-8 text-xs w-32" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="text-gray-400 text-xs">~</span>
              <Input type="date" className="h-8 text-xs w-32" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              <Button onClick={handleSearch} size="sm" className="h-8 bg-pink-600 hover:bg-pink-700 text-white px-4 text-xs">
                <Search className="w-3.5 h-3.5 mr-1" /> 검색
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset} className="h-8 px-3 text-xs">
                초기화
              </Button>
            </div>
            <div className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-100 flex-wrap">
              <span className="text-xs text-purple-700 font-medium whitespace-nowrap">フリガナ検索</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 whitespace-nowrap">セイ</span>
                <Input className="h-7 text-xs w-28" placeholder="アイウエオ..." value={lastNameKatakanaInput} onChange={e => setLastNameKatakanaInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 whitespace-nowrap">メイ</span>
                <Input className="h-7 text-xs w-28" placeholder="タロウ..." value={firstNameKatakanaInput} onChange={e => setFirstNameKatakanaInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} />
              </div>
            </div>
          </div>
        </div>

        {/* 일괄 액션 바 */}
        {selectedIds.size > 0 && (
          <div className="bg-white border border-blue-200 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-500" />{selectedIds.size}명 선택됨
            </span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50"
                onClick={() => { setBulkAction("add_points"); setBulkValue(0); setBulkDescription(""); setBulkDialogOpen(true); }}>
                <Star className="h-3.5 w-3.5 mr-1" />포인트 지급
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => { setBulkAction("deduct_points"); setBulkValue(0); setBulkDescription(""); setBulkDialogOpen(true); }}>
                <Star className="h-3.5 w-3.5 mr-1" />포인트 차감
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={() => { setBulkAction("change_tier"); setBulkValue(0); setBulkDescription(""); setBulkDialogOpen(true); }}>
                <Crown className="h-3.5 w-3.5 mr-1" />등급 변경
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-500" onClick={() => setSelectedIds(new Set())}>
                선택 해제
              </Button>
            </div>
          </div>
        )}

        {/* 회원 테이블 */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">회원 목록</h3>
            <span className="text-xs text-gray-500">총 {total.toLocaleString()}명</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="w-10 px-2 py-2 text-left">
                    <input type="checkbox" checked={users.length > 0 && selectedIds.size === users.length} onChange={toggleSelectAll} className="rounded" />
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">이메일</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">이름</th>
                  <th className="w-20 px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">등급</th>
                  <th className="w-20 px-2 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">연락처</th>
                  <th className="w-16 px-2 py-2 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">포인트</th>
                  <th className="w-12 px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">주문</th>
                  <th className="w-12 px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">인증</th>
                  <th className="w-16 px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">최종접속</th>
                  <th className="w-16 px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">가입일</th>
                  <th className="w-12 px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">작업</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={11} className="px-3 py-8 text-center">
                    <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div></div>
                  </td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={11} className="px-3 py-8 text-center text-xs text-gray-400">회원이 없습니다</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedIds.has(u.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-2 py-2">
                        <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} className="rounded" />
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {u.role === "admin" && (
                            <span title="관리자" className="inline-flex items-center justify-center">
                              <Crown className="w-3 h-3 text-yellow-500" />
                            </span>
                          )}
                          <span>{u.email}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-semibold text-xs flex-shrink-0">
                            {(u.lastNameKanji || u.nameKanji)?.charAt(0) || u.email?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {(u.lastNameKanji && u.firstNameKanji) ? `${u.lastNameKanji}　${u.firstNameKanji}` : u.lastNameKanji || u.nameKanji || "-"}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {(u.lastNameKatakana && u.firstNameKatakana) ? `${u.lastNameKatakana}　${u.firstNameKatakana}` : u.lastNameKatakana || u.nameHiragana || ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center"><TierBadge name={u.tierName} color={u.tierColor} /></td>
                      <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">{u.phone || "-"}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-pink-600 text-right whitespace-nowrap">{u.points.toLocaleString()}</td>
                      <td className="px-2 py-2 text-xs text-center font-medium text-gray-700 whitespace-nowrap">{u.orderCount || 0}</td>
                      <td className="px-2 py-2 text-center">
                        {u.isEmailVerified
                          ? <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="인증완료" />
                          : <span className="inline-block w-2 h-2 rounded-full bg-gray-300" title="미인증" />}
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-500 text-center whitespace-nowrap">{formatDate(u.lastSignedIn)}</td>
                      <td className="px-2 py-2 text-xs text-gray-500 text-center whitespace-nowrap">{formatDate(u.createdAt)}</td>
                      <td className="px-2 py-2 text-center">
                        <Link href={`/admin/customers/${u.id}`}>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-1 text-xs border border-gray-200 rounded hover:bg-pink-50 hover:border-pink-300 hover:text-pink-600 text-gray-600 cursor-pointer transition-colors whitespace-nowrap">
                            <FileText className="w-3 h-3" />
                          </span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="h-8 text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            if (totalPages <= 7 || Math.abs(p - page) <= 2 || p === 1 || p === totalPages) {
              return (
                <Button
                  key={p}
                  variant={page === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                  className="h-8 w-8 text-xs"
                >
                  {p}
                </Button>
              );
            } else if (p === 2 || p === totalPages - 1) {
              return <span key={p} className="text-gray-400">...</span>;
            }
            return null;
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="h-8 text-xs"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* 수정 다이얼로그 */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>회원 정보 수정</DialogTitle>
            </DialogHeader>
            {editUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">이메일</Label>
                    <Input disabled value={editForm.email} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">역할</Label>
                    <Select value={editForm.role} onValueChange={(v: any) => setEditForm({ ...editForm, role: v })}>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">일반</SelectItem>
                        <SelectItem value="admin">관리자</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">한자 이름</Label>
                    <Input value={editForm.nameKanji} onChange={(e) => setEditForm({ ...editForm, nameKanji: e.target.value })} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">히라가나 이름</Label>
                    <Input value={editForm.nameHiragana} onChange={(e) => setEditForm({ ...editForm, nameHiragana: e.target.value })} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">성 (한자)</Label>
                    <Input value={editForm.lastNameKanji} onChange={(e) => setEditForm({ ...editForm, lastNameKanji: e.target.value })} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">이름 (한자)</Label>
                    <Input value={editForm.firstNameKanji} onChange={(e) => setEditForm({ ...editForm, firstNameKanji: e.target.value })} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">성 (가타카나)</Label>
                    <Input value={editForm.lastNameKatakana} onChange={(e) => setEditForm({ ...editForm, lastNameKatakana: e.target.value })} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">이름 (가타카나)</Label>
                    <Input value={editForm.firstNameKatakana} onChange={(e) => setEditForm({ ...editForm, firstNameKatakana: e.target.value })} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">닉네임</Label>
                    <Input value={editForm.nickname} onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">연락처</Label>
                    <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">포인트</Label>
                    <Input type="number" value={editForm.points} onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 0 })} className="text-xs" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditOpen(false)} className="text-xs h-8">취소</Button>
                  <Button onClick={handleEditSave} className="text-xs h-8 bg-pink-600 hover:bg-pink-700">저장</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 일괄 액션 다이얼로그 */}
        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {bulkAction === "add_points" ? "포인트 지급" : bulkAction === "deduct_points" ? "포인트 차감" : "등급 변경"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {bulkAction !== "change_tier" ? (
                <>
                  <div>
                    <Label className="text-xs">포인트</Label>
                    <Input type="number" value={bulkValue} onChange={(e) => setBulkValue(parseInt(e.target.value) || 0)} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">사유 (선택)</Label>
                    <Input value={bulkDescription} onChange={(e) => setBulkDescription(e.target.value)} placeholder="예: 이벤트 보상" className="text-xs" />
                  </div>
                </>
              ) : (
                <div>
                  <Label className="text-xs">등급</Label>
                  <Select value={String(bulkValue)} onValueChange={(v) => setBulkValue(parseInt(v) || 0)}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">등급 미지정</SelectItem>
                      {tiers.map((t: any) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkDialogOpen(false)} className="text-xs h-8">취소</Button>
                <Button onClick={handleBulkAction} className="text-xs h-8 bg-pink-600 hover:bg-pink-700">적용</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
