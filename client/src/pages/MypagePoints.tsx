import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Gift, Plus, Minus, ArrowRight, User, Coins, Clock, ShoppingBag, Shield, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import MyPageSidebar from "@/components/MyPageSidebar";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { getLoginUrl } from "@/const";

function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

type TxType = "earn" | "spend" | "admin_add" | "admin_deduct";

function getTxConfig(type: TxType) {
  switch (type) {
    case "earn":
      return { label: "獲得", badgeClass: "bg-green-50 text-green-700 border-green-200", amountClass: "text-green-600", icon: <Plus className="w-3.5 h-3.5" />, sign: "+" };
    case "spend":
      return { label: "使用", badgeClass: "bg-red-50 text-red-700 border-red-200", amountClass: "text-red-600", icon: <Minus className="w-3.5 h-3.5" />, sign: "" };
    case "admin_add":
      return { label: "付与", badgeClass: "bg-blue-50 text-blue-700 border-blue-200", amountClass: "text-blue-600", icon: <Shield className="w-3.5 h-3.5" />, sign: "+" };
    case "admin_deduct":
      return { label: "調整", badgeClass: "bg-orange-50 text-orange-700 border-orange-200", amountClass: "text-orange-600", icon: <Shield className="w-3.5 h-3.5" />, sign: "" };
    default:
      return { label: "その他", badgeClass: "bg-gray-100 text-gray-600 border-gray-200", amountClass: "text-gray-600", icon: <ArrowRight className="w-3.5 h-3.5" />, sign: "" };
  }
}

export default function MypagePoints() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: balanceData, isLoading: balanceLoading } = trpc.point.getBalance.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: historyData, isLoading: historyLoading } = trpc.point.getHistory.useQuery(
    { limit: pageSize, offset: page * pageSize },
    { enabled: isAuthenticated }
  );
  const pointHistory = historyData?.rows ?? [];
  const totalHistory = historyData?.total ?? 0;

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-4">ログインが必要です</h1>
            <p className="text-gray-600 mb-6">マイページを表示するにはログインしてください。</p>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => window.location.href = getLoginUrl()}>
              ログインページへ
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const currentPoints = balanceData?.balance ?? 0;

  const thisMonthEarned = pointHistory
    .filter((tx) => {
      const d = new Date(tx.createdAt);
      const now = new Date();
      return (tx.type === "earn" || tx.type === "admin_add") &&
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalUsed = pointHistory
    .filter((tx) => tx.type === "spend" || tx.type === "admin_deduct")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-8">
          {/* Breadcrumb */}
          <p className="text-sm text-gray-500 mb-4">
            <Link href="/mypage" className="hover:text-gray-700 cursor-pointer">マイページ</Link>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="text-gray-800 font-medium">ポイント</span>
          </p>

          <div className="flex gap-6 lg:gap-8 items-start">
            {/* Sidebar */}
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Header Banner */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="p-4 sm:p-5" style={{ backgroundColor: "#fffbeb" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">ポイント</h1>
                      <p className="text-xs text-primary font-medium mt-0.5">ポイント残高と履歴を確認できます</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-600">現在の残高</div>
                      {balanceLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary ml-auto mt-1" />
                      ) : (
                        <div className="text-2xl font-bold text-primary">
                          {currentPoints.toLocaleString("ja-JP")} <span className="text-sm font-semibold">pt</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <Coins className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">保有ポイント</span>
                  </div>
                  {balanceLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <p className="text-xl font-bold text-primary">{currentPoints.toLocaleString("ja-JP")}<span className="text-xs font-semibold ml-0.5">pt</span></p>
                  )}
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">今月の獲得</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">+{thisMonthEarned.toLocaleString("ja-JP")}<span className="text-xs font-semibold ml-0.5">pt</span></p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
                      <ShoppingBag className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">累計使用</span>
                  </div>
                  <p className="text-xl font-bold text-red-500">{totalUsed.toLocaleString("ja-JP")}<span className="text-xs font-semibold ml-0.5">pt</span></p>
                </div>
              </div>

              {/* Point History */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-bold text-gray-900">ポイント履歴</span>
                  </div>
                  {pointHistory.length > 0 && (
                    <span className="text-xs text-gray-400">{pointHistory.length}件</span>
                  )}
                </div>

                {historyLoading ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  </div>
                ) : pointHistory.length === 0 ? (
                  <div className="p-12 text-center">
                    <Gift className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm font-medium mb-1">ポイント履歴がありません</p>
                    <p className="text-xs text-gray-400">商品を購入するとポイントが付与されます</p>
                  </div>
                ) : (
                  <>
                    {/* Table Header (desktop) */}
                    <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <span>内容</span>
                      <span className="text-right">日付</span>
                      <span className="text-right">ポイント</span>
                      <span className="text-right">残高</span>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {pointHistory.map((tx) => {
                        const cfg = getTxConfig(tx.type as TxType);
                        const isPositive = tx.amount > 0;
                        return (
                          <div key={tx.id} className="px-4 sm:px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                            {/* Mobile */}
                            <div className="flex items-start justify-between gap-3 sm:hidden">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${cfg.badgeClass}`}>
                                    {cfg.icon}{cfg.label}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-800 font-medium truncate">{tx.description || cfg.label}</p>
                                {tx.orderId && (
                                  <Link href={`/mypage/order/${tx.orderId}`} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-0.5">
                                    <ShoppingBag className="w-3 h-3" />注文 #{tx.orderId}
                                  </Link>
                                )}
                                <p className="text-xs text-gray-400 mt-0.5">
                                  <Clock className="w-3 h-3 inline mr-0.5" />
                                  {formatDateTime(tx.createdAt)}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`text-base font-bold ${cfg.amountClass}`}>
                                  {isPositive ? "+" : ""}{tx.amount.toLocaleString("ja-JP")}pt
                                </p>
                                <p className="text-xs text-gray-400">残高 {tx.balance.toLocaleString("ja-JP")}pt</p>
                              </div>
                            </div>

                            {/* Desktop */}
                            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${cfg.badgeClass}`}>
                                    {cfg.icon}{cfg.label}
                                  </span>
                                  <p className="text-sm text-gray-800 font-medium truncate">{tx.description || cfg.label}</p>
                                </div>
                                {tx.orderId && (
                                  <Link href={`/mypage/order/${tx.orderId}`} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
                                    <ShoppingBag className="w-3 h-3" />注文 #{tx.orderId}
                                  </Link>
                                )}
                              </div>
                              <span className="text-xs text-gray-400 text-right whitespace-nowrap">{formatDateTime(tx.createdAt)}</span>
                              <span className={`text-sm font-bold text-right whitespace-nowrap ${cfg.amountClass}`}>
                                {isPositive ? "+" : ""}{tx.amount.toLocaleString("ja-JP")}pt
                              </span>
                              <span className="text-xs text-gray-500 text-right whitespace-nowrap">{tx.balance.toLocaleString("ja-JP")}pt</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {totalHistory > pageSize && (() => {
                      const totalPages = Math.ceil(totalHistory / pageSize);
                      const current = page;
                      const getPageNumbers = () => {
                        const pages: number[] = [];
                        let start = Math.max(0, current - 2);
                        let end = Math.min(totalPages - 1, start + 4);
                        if (end - start < 4) start = Math.max(0, end - 4);
                        for (let i = start; i <= end; i++) pages.push(i);
                        return pages;
                      };
                      const btnBase = "flex items-center justify-center w-7 h-7 text-xs border rounded transition-colors";
                      return (
                        <div className="px-4 sm:px-5 py-3.5 border-t border-gray-100 flex items-center justify-center gap-1">
                          <button onClick={() => setPage(0)} disabled={current === 0}
                            className={`${btnBase} ${current === 0 ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50 bg-white'}`}>
                            <ChevronsLeft className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={current === 0}
                            className={`${btnBase} ${current === 0 ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50 bg-white'}`}>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          {getPageNumbers().map(p => (
                            <button key={p} onClick={() => setPage(p)}
                              className={`${btnBase} ${
                                p === current
                                  ? 'bg-primary border-primary text-white font-bold'
                                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'
                              }`}>
                              {p + 1}
                            </button>
                          ))}
                          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={current >= totalPages - 1}
                            className={`${btnBase} ${current >= totalPages - 1 ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50 bg-white'}`}>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setPage(totalPages - 1)} disabled={current >= totalPages - 1}
                            className={`${btnBase} ${current >= totalPages - 1 ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50 bg-white'}`}>
                            <ChevronsRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Point Guide */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">ポイントについて</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 mb-0.5">ポイント還元率</p>
                      <p className="text-xs text-gray-500">購入金額の1%を自動付与</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 mb-0.5">有効期限</p>
                      <p className="text-xs text-gray-500">最後の獲得から1年間</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Coins className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 mb-0.5">最小使用ポイント</p>
                      <p className="text-xs text-gray-500">300ポイント以上から利用可能</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Gift className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 mb-0.5">キャンセル時</p>
                      <p className="text-xs text-gray-500">使用ポイントは全額返却</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
