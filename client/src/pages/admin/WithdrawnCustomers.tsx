import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Search, UserX, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function WithdrawnCustomers() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  const [restoreTargetId, setRestoreTargetId] = useState<number | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);

  const utils = trpc.useUtils();
  const restoreUserMutation = trpc.admin.restoreUser.useMutation({
    onSuccess: () => {
      setRestoreDialogOpen(false);
      setRestoreTargetId(null);
      setRestoreConfirmed(false);
      utils.admin.withdrawnUsers.invalidate();
      toast.success("탈퇴가 복원되었습니다.");
    },
    onError: (err) => toast.error(err.message || "복원에 실패했습니다."),
  });

  const { data, isLoading } = trpc.admin.withdrawnUsers.useQuery({
    page,
    limit,
    search: search || undefined,
  });

  const restoreTarget = data?.users.find((u: any) => u.id === restoreTargetId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-red-500" />
            <h1 className="text-sm font-bold text-gray-800">탈퇴 회원 관리</h1>
            {data && (
              <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-xs font-medium">
                총 {data.total}명
              </span>
            )}
          </div>
        </div>

        {/* 검색 */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder="이메일, 이름, 연락처 검색..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-700 hover:bg-gray-800 rounded-md transition-colors"
          >
            검색
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              초기화
            </button>
          )}
        </form>

        {/* 테이블 */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-400 border-t-transparent" />
            </div>
          ) : !data || data.users.length === 0 ? (
            <div className="text-center py-16">
              <UserX className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">탈퇴 회원이 없습니다</p>
            </div>
          ) : (
              <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["ID", "이름", "이메일", "연락처", "탈퇴 사유", "탈퇴일", "가입일", "관리"].map(h => (
                    <th key={h} className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.map((user: any) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-red-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-500">#{user.id}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">
                            {user.lastNameKanji && user.firstNameKanji
                              ? `${user.lastNameKanji} ${user.firstNameKanji}`
                              : user.nameKanji || "-"}
                          </p>
                          {(user.lastNameKatakana || user.firstNameKatakana) && (
                            <p className="text-[10px] text-gray-400">{user.lastNameKatakana} {user.firstNameKatakana}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4 text-gray-600">{user.phone || "-"}</td>
                    <td className="py-3 px-4">
                      {user.withdrawReason ? (
                        <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-100 rounded text-[10px]">{user.withdrawReason}</span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      {user.withdrawnAt ? (
                        <span className="text-red-600 font-medium">
                          {new Date(user.withdrawnAt).toLocaleDateString("ko-KR")}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ko-KR") : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1.5">
                        <Link href={`/admin/customers/${user.id}`}>
                          <button className="px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors">
                            상세
                          </button>
                        </Link>
                        <button
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                          onClick={() => { setRestoreTargetId(user.id); setRestoreDialogOpen(true); }}
                        >
                          <RotateCcw className="w-3 h-3" /> 복원
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              이전
            </button>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  p === page
                    ? "bg-red-600 text-white"
                    : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 복원 확인 다이얼로그 */}
      <Dialog open={restoreDialogOpen} onOpenChange={(open) => { setRestoreDialogOpen(open); if (!open) { setRestoreTargetId(null); setRestoreConfirmed(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>탈퇴 회원 복원</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-700 mb-1">탈퇴 복원 확인</p>
              <p className="text-xs text-blue-600">이 회원의 탈퇴를 취소하고 정상 회원으로 복원합니다. 실수로 복원하지 않도록 아래 체크박스를 확인해 주세요.</p>
            </div>
            {restoreTarget && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <p className="font-medium">대상 회원:</p>
                <p>
                  {restoreTarget.lastNameKanji && restoreTarget.firstNameKanji
                    ? `${restoreTarget.lastNameKanji} ${restoreTarget.firstNameKanji}`
                    : restoreTarget.nameKanji || "-"}
                  {" "}({restoreTarget.email})
                </p>
                {restoreTarget.withdrawReason && (
                  <p>탈퇴 사유: <span className="text-red-600">{restoreTarget.withdrawReason}</span></p>
                )}
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={restoreConfirmed}
                onChange={e => setRestoreConfirmed(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-blue-600"
              />
              <span className="text-xs text-gray-700 font-medium">위 내용을 확인했습니다. 탈퇴를 복원합니다.</span>
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setRestoreDialogOpen(false); setRestoreTargetId(null); setRestoreConfirmed(false); }}>취소</Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
                onClick={() => restoreTargetId && restoreUserMutation.mutate({ userId: restoreTargetId })}
                disabled={!restoreConfirmed || restoreUserMutation.isPending}
              >
                {restoreUserMutation.isPending ? "복원 중..." : "탈퇴 복원"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
