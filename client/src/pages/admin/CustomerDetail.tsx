import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  User, Mail, Phone, Calendar, ShoppingBag, MessageSquare, Star,
  ArrowLeft, Package, TrendingUp, PieChart as PieChartIcon, FileText,
  Edit, Trash2, Gift, Coins, Send, Crown, UserPlus, Globe, Clock,
  MapPin, Home, TrendingDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Link } from "wouter";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import { toast } from "sonner";

const TIER_COLORS: Record<string, string> = {
  BRONZE: "#b45309", SILVER: "#6b7280", GOLD: "#ca8a04",
  PLATINUM: "#7c3aed", DIAMOND: "#dc2626",
};

export default function CustomerDetail() {
  const [, params] = useRoute("/admin/customers/:id");
  const userId = params?.id ? parseInt(params.id) : 0;
  const [noteText, setNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [pointAmount, setPointAmount] = useState("");
  const [pointDescription, setPointDescription] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [editInfoForm, setEditInfoForm] = useState({
    lastNameKanji: "", firstNameKanji: "", lastNameKatakana: "", firstNameKatakana: "",
    email: "", phone: "",
  });
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);

  const utils = trpc.useUtils();

  const createNoteMutation = trpc.admin.createCustomerNote.useMutation({
    onSuccess: () => { utils.admin.customerDetail.invalidate({ userId }); setNoteText(""); toast.success("메모가 저장되었습니다."); },
  });
  const updateNoteMutation = trpc.admin.updateCustomerNote.useMutation({
    onSuccess: () => { utils.admin.customerDetail.invalidate({ userId }); setEditingNoteId(null); setNoteText(""); toast.success("메모가 수정되었습니다."); },
  });
  const deleteNoteMutation = trpc.admin.deleteCustomerNote.useMutation({
    onSuccess: () => { utils.admin.customerDetail.invalidate({ userId }); toast.success("메모가 삭제되었습니다."); },
  });
  const issueCouponMutation = trpc.admin.issueCouponToCustomer.useMutation({
    onSuccess: () => { setCouponDialogOpen(false); setCouponCode(""); setDiscountValue(""); toast.success("쿠폰이 발급되었습니다."); },
  });
  const awardPointsMutation = trpc.admin.awardPointsToCustomer.useMutation({
    onSuccess: () => { setPointDialogOpen(false); setPointAmount(""); setPointDescription(""); utils.admin.customerDetail.invalidate({ userId }); utils.point.adminGetHistory.invalidate({ userId }); toast.success("포인트가 지급되었습니다."); },
  });
  const changeTierMutation = trpc.membership.tiers.setUserTier.useMutation({
    onSuccess: () => { utils.membership.getUserTier.invalidate({ userId }); utils.admin.customerDetail.invalidate({ userId }); tierHistoryQuery.refetch(); toast.success("등급이 변경되었습니다."); },
    onError: () => toast.error("등급 변경에 실패했습니다."),
  });
  const sendEmailMutation = trpc.admin.sendEmailToCustomer.useMutation({
    onSuccess: () => { setEmailDialogOpen(false); setEmailSubject(""); setEmailContent(""); toast.success("이메일이 발송되었습니다."); },
    onError: (err) => toast.error(err.message || "이메일 발송에 실패했습니다."),
  });
  const updateUserMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => { utils.admin.customerDetail.invalidate({ userId }); toast.success("회원정보가 수정되었습니다."); },
    onError: (err) => toast.error(err.message || "수정에 실패했습니다."),
  });
  const withdrawUserMutation = trpc.admin.withdrawUser.useMutation({
    onSuccess: () => { setWithdrawDialogOpen(false); setWithdrawReason(""); utils.admin.customerDetail.invalidate({ userId }); toast.success("탈퇴 처리가 완료되었습니다."); },
    onError: (err) => toast.error(err.message || "탈퇴 처리에 실패했습니다."),
  });
  const restoreUserMutation = trpc.admin.restoreUser.useMutation({
    onSuccess: () => { setRestoreDialogOpen(false); setRestoreConfirmed(false); utils.admin.customerDetail.invalidate({ userId }); toast.success("탈퇴가 복원되었습니다."); },
    onError: (err) => toast.error(err.message || "복원에 실패했습니다."),
  });

  const { data: tiersList } = trpc.membership.tiers.list.useQuery();
  const { data: customerData, isLoading } = trpc.admin.customerDetail.useQuery({ userId }, { enabled: userId > 0 });
  const { data: memberTier } = trpc.membership.getUserTier.useQuery({ userId }, { enabled: userId > 0 });
  const { data: loginHistory } = trpc.membership.loginHistory.getByUser.useQuery({ userId, limit: 20 }, { enabled: userId > 0 });
  const { data: referralInfo } = trpc.membership.getUserReferrals.useQuery({ userId }, { enabled: userId > 0 });
  const tierHistoryQuery = trpc.membership.tiers.getTierHistory.useQuery({ userId }, { enabled: userId > 0 });
  const { data: customerAddresses } = trpc.admin.getCustomerAddresses.useQuery({ userId }, { enabled: userId > 0 });

  // 포인트 내역 (서버 측 페이지네이션)
  const [pointPage, setPointPage] = useState(0);
  const POINT_PAGE_SIZE = 10;
  const { data: pointHistoryData } = trpc.point.adminGetHistory.useQuery(
    { userId, limit: POINT_PAGE_SIZE, offset: pointPage * POINT_PAGE_SIZE },
    { enabled: userId > 0 }
  );

  // customerData 로드 후 폼 초기값 설정
  useEffect(() => {
    if (customerData?.customer) {
      const c = customerData.customer as any;
      setEditInfoForm({
        lastNameKanji: c.lastNameKanji || "",
        firstNameKanji: c.firstNameKanji || "",
        lastNameKatakana: c.lastNameKatakana || "",
        firstNameKatakana: c.firstNameKatakana || "",
        email: c.email || "",
        phone: c.phone || "",
      });
    }
  }, [customerData]);

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    if (editingNoteId) updateNoteMutation.mutate({ id: editingNoteId, note: noteText });
    else createNoteMutation.mutate({ customerId: userId, note: noteText });
  };
  const handleEditNote = (note: any) => { setEditingNoteId(note.id); setNoteText(note.note); };
  const handleDeleteNote = (noteId: number) => { if (confirm("이 메모를 삭제하시겠습니까?")) deleteNoteMutation.mutate({ id: noteId }); };
  const handleIssueCoupon = () => {
    if (!couponCode.trim() || !discountValue) return;
    issueCouponMutation.mutate({ customerId: userId, code: couponCode, discountType, discountValue: parseFloat(discountValue) });
  };
  const handleAwardPoints = () => {
    if (!pointAmount || !pointDescription.trim()) return;
    awardPointsMutation.mutate({ customerId: userId, points: parseInt(pointAmount), description: pointDescription });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }
  if (!customerData) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <p className="text-sm text-gray-500 mb-4">고객을 찾을 수 없습니다.</p>
          <Link href="/admin/customers"><Button size="sm">고객 목록으로</Button></Link>
        </div>
      </AdminLayout>
    );
  }

  const { customer, orders, inquiries, reviews, stats, analytics, notes } = customerData;
  const tierName = memberTier?.tierName || "";
  const tierColor = TIER_COLORS[tierName] || "#6b7280";

  const monthlyData = analytics?.monthlyPurchases?.map((item: any) => ({
    month: item.month, "주문 수": item.count, "구매액": Math.round(Number(item.total)),
  })) || [];
  const categoryData = analytics?.preferredCategories?.map((item: any) => ({ name: item.categoryName, value: item.count })) || [];
  const COLORS = ["#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    processing: "bg-blue-50 text-blue-700 border border-blue-200",
    shipped: "bg-purple-50 text-purple-700 border border-purple-200",
    delivered: "bg-green-50 text-green-700 border border-green-200",
    cancelled: "bg-red-50 text-red-700 border border-red-200",
  };
  const statusLabels: Record<string, string> = {
    pending: "보류 중", processing: "준비 중", shipped: "배송 중", delivered: "배송완료", cancelled: "취소",
  };
  const inquiryStatusColors: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    answered: "bg-green-50 text-green-700 border border-green-200",
    closed: "bg-gray-50 text-gray-600 border border-gray-200",
  };
  const inquiryStatusLabels: Record<string, string> = { pending: "미답변", answered: "답변완료", closed: "종료" };

  return (
    <AdminLayout>
      <div className="space-y-4">

        {/* ===== 페이지 헤더 ===== */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/customers">
              <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                고객 목록
              </button>
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-sm font-bold text-gray-800">고객 상세 정보</h1>
          </div>
          <div className="flex gap-2">
            {/* 쿠폰 발급 */}
            <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <Gift className="w-3.5 h-3.5" /> 쿠폰 발급
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>쿠폰 발급</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>쿠폰 코드</Label><Input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="WELCOME10" /></div>
                  <div>
                    <Label>할인 유형</Label>
                    <select className="w-full border rounded-md p-2 text-sm mt-1" value={discountType} onChange={e => setDiscountType(e.target.value as "percentage" | "fixed")}>
                      <option value="percentage">퍼센트 (%)</option>
                      <option value="fixed">고정 금액 (원)</option>
                    </select>
                  </div>
                  <div><Label>할인 값</Label><Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="10" /></div>
                  <Button onClick={handleIssueCoupon} className="w-full bg-pink-600 hover:bg-pink-700">발급</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* 포인트 지급 */}
            <Dialog open={pointDialogOpen} onOpenChange={setPointDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <Coins className="w-3.5 h-3.5" /> 포인트 지급
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>포인트 지급</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>포인트</Label><Input type="number" value={pointAmount} onChange={e => setPointAmount(e.target.value)} placeholder="1000" /></div>
                  <div><Label>사유</Label><Input value={pointDescription} onChange={e => setPointDescription(e.target.value)} placeholder="이벤트 보상" /></div>
                  <Button onClick={handleAwardPoints} className="w-full bg-pink-600 hover:bg-pink-700">지급</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* 이메일 발송 */}
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <Mail className="w-3.5 h-3.5" /> 이메일 발송
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>고객에게 이메일 발송</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>받는 사람</Label><Input value={customer?.email || ""} disabled className="bg-gray-50" /></div>
                  <div><Label>제목</Label><Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="이메일 제목" /></div>
                  <div><Label>내용</Label><Textarea value={emailContent} onChange={e => setEmailContent(e.target.value)} placeholder="이메일 내용..." className="min-h-[120px]" /></div>
                  <Button onClick={() => sendEmailMutation.mutate({ customerId: userId, subject: emailSubject, content: emailContent })} disabled={!emailSubject.trim() || !emailContent.trim() || sendEmailMutation.isPending} className="w-full bg-pink-600 hover:bg-pink-700">
                    {sendEmailMutation.isPending ? "발송 중..." : "이메일 발송"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* 탈퇴 처리 버튼 - 맨 뒤 */}
            {!(customer as any).isWithdrawn ? (
              <Dialog open={withdrawDialogOpen} onOpenChange={(open) => { setWithdrawDialogOpen(open); if (!open) setWithdrawReason(""); }}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> 회원 탈퇴
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>회원 탈퇴 처리</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-semibold text-red-700 mb-1">⚠️ 탈퇴 처리 확인</p>
                      <p className="text-xs text-red-600">이 회원을 탈퇴 처리하시겠습니까? 탈퇴 회원 데이터는 별도 보관됩니다.</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                      <p className="font-medium mb-1">대상 회원:</p>
                      <p>{(customer as any).lastNameKanji} {(customer as any).firstNameKanji} ({customer.email})</p>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">탈퇴 사유 <span className="text-gray-400 font-normal">(선택사항)</span></Label>
                      <select
                        className="w-full border border-gray-200 rounded-md p-2 text-xs mt-1 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        value={withdrawReason}
                        onChange={e => setWithdrawReason(e.target.value)}
                      >
                        <option value="">사유 선택...</option>
                        <option value="관리자 직접 탈퇴 처리">관리자 직접 탈퇴 처리</option>
                        <option value="회원 요청에 의한 탈퇴">회원 요청에 의한 탈퇴</option>
                        <option value="장기간 미사용 계정">장기간 미사용 계정</option>
                        <option value="중복 가입 의심">중복 가입 의심</option>
                        <option value="부정 행위 또는 정책 위반">부정 행위 또는 정책 위반</option>
                        <option value="기타">기타</option>
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => { setWithdrawDialogOpen(false); setWithdrawReason(""); }}>취소</Button>
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => withdrawUserMutation.mutate({ userId, reason: withdrawReason || undefined })}
                        disabled={withdrawUserMutation.isPending}
                      >
                        {withdrawUserMutation.isPending ? "처리 중..." : "탈퇴 처리"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={restoreDialogOpen} onOpenChange={(open) => { setRestoreDialogOpen(open); if (!open) setRestoreConfirmed(false); }}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                    <User className="w-3.5 h-3.5" /> 탈퇴 복원
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>탈퇴 회원 복원</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-semibold text-blue-700 mb-1">탈퇴 복원 확인</p>
                      <p className="text-xs text-blue-600">이 회원의 탈퇴를 취소하고 정상 회원으로 복원합니다. 실수로 복원하지 않도록 아래 체크박스를 확인해 주세요.</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                      <p className="font-medium mb-1">대상 회원:</p>
                      <p>{(customer as any).lastNameKanji} {(customer as any).firstNameKanji} ({customer.email})</p>
                      {(customer as any).withdrawReason && (
                        <p className="mt-1">탈퇴 사유: <span className="text-red-600">{(customer as any).withdrawReason}</span></p>
                      )}
                    </div>
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
                      <Button variant="outline" size="sm" onClick={() => { setRestoreDialogOpen(false); setRestoreConfirmed(false); }}>취소</Button>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
                        onClick={() => restoreUserMutation.mutate({ userId })}
                        disabled={!restoreConfirmed || restoreUserMutation.isPending}
                      >
                        {restoreUserMutation.isPending ? "복원 중..." : "탈퇴 복원"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* ===== 프로필 + 등급 ===== */}
        <div className="grid grid-cols-3 gap-4">
          {/* 프로필 */}
          <div className="col-span-2 bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                <User className="w-7 h-7 text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {(customer as any).isWithdrawn && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded text-xs font-medium">탈퇴회원</span>
                  )}
                  <h2 className="text-base font-bold text-gray-800">
                    {(customer as any).lastNameKanji && (customer as any).firstNameKanji
                      ? `${(customer as any).lastNameKanji}　${(customer as any).firstNameKanji}`
                      : customer.email}
                  </h2>
                  {((customer as any).lastNameKatakana || (customer as any).firstNameKatakana) && (
                    <span className="text-xs text-gray-400">{(customer as any).lastNameKatakana}　{(customer as any).firstNameKatakana}</span>
                  )}
                  {tierName && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: tierColor }}>
                      <Crown className="w-2.5 h-2.5" />{tierName}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${customer.role === "admin" ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {customer.role === "admin" ? "관리자" : "일반 회원"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500"><Mail className="w-3.5 h-3.5 text-gray-400" />{customer.email}</div>
                  {(customer as any).phone && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Phone className="w-3.5 h-3.5 text-gray-400" />{(customer as any).phone}</div>}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500"><Calendar className="w-3.5 h-3.5 text-gray-400" />가입일: {new Date(customer.createdAt).toLocaleDateString("ko-KR")}</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500"><Globe className="w-3.5 h-3.5 text-gray-400" />추천코드: {(customer as any).referralCode || "미발급"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 등급 & 포인트 */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-1.5 mb-3 pb-3 border-b border-gray-100">
              <Crown className="w-4 h-4" style={{ color: tierColor }} />
              <span className="text-xs font-bold text-gray-800">등급 & 포인트</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">현재 등급</span>
                <select
                  className="text-xs font-bold px-2 py-1 rounded border border-gray-200 bg-gray-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-pink-400"
                  value={memberTier?.tierName ? (tiersList?.find((t: any) => t.name === memberTier.tierName)?.id || "") : ""}
                  onChange={e => { const tierId = parseInt(e.target.value); if (!isNaN(tierId)) changeTierMutation.mutate({ userId, tierId }); }}
                  disabled={changeTierMutation.isPending}
                >
                  <option value="">미지정</option>
                  {tiersList?.map((tier: any) => <option key={tier.id} value={tier.id}>{tier.name} ({tier.nameKo})</option>)}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">할인율</span>
                <span className="text-sm font-bold text-pink-600">{memberTier?.discountRate || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">적립률</span>
                <span className="text-sm font-bold text-green-600">{memberTier?.pointRate || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">보유 포인트</span>
                <span className="text-sm font-bold text-blue-600">{((customer as any).points || 0).toLocaleString()}P</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">6개월 구매액</span>
                <span className="text-sm font-bold text-gray-800">{memberTier?.purchaseAmount6m ? formatPrice(memberTier.purchaseAmount6m) : "0원"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 회원정보 수정 ===== */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100">
            <Edit className="w-4 h-4 text-pink-500" />
            <span className="text-xs font-bold text-gray-800">회원정보 수정</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-1 block">성명（漢字）</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px] text-gray-400">성（姓）</Label><Input className="h-8 text-sm mt-0.5" placeholder="山田" value={editInfoForm.lastNameKanji} onChange={e => setEditInfoForm(f => ({ ...f, lastNameKanji: e.target.value }))} /></div>
                  <div><Label className="text-[10px] text-gray-400">이름（名）</Label><Input className="h-8 text-sm mt-0.5" placeholder="太郎" value={editInfoForm.firstNameKanji} onChange={e => setEditInfoForm(f => ({ ...f, firstNameKanji: e.target.value }))} /></div>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-1 block">성명（フリガナ）</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px] text-gray-400">セイ</Label><Input className="h-8 text-sm mt-0.5" placeholder="ヤマダ" value={editInfoForm.lastNameKatakana} onChange={e => setEditInfoForm(f => ({ ...f, lastNameKatakana: e.target.value }))} /></div>
                  <div><Label className="text-[10px] text-gray-400">メイ</Label><Input className="h-8 text-sm mt-0.5" placeholder="タロウ" value={editInfoForm.firstNameKatakana} onChange={e => setEditInfoForm(f => ({ ...f, firstNameKatakana: e.target.value }))} /></div>
                </div>
              </div>
              <div><Label className="text-xs font-semibold text-gray-700">이메일 (수정 불가)</Label><Input className="h-8 text-sm mt-1 bg-gray-50 text-gray-500 cursor-not-allowed" value={editInfoForm.email} readOnly disabled /></div>
              <div><Label className="text-xs font-semibold text-gray-700">연락처</Label><Input className="h-8 text-sm mt-1" placeholder="연락처" value={editInfoForm.phone} onChange={e => setEditInfoForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => updateUserMutation.mutate({ id: userId, lastNameKanji: editInfoForm.lastNameKanji, firstNameKanji: editInfoForm.firstNameKanji, lastNameKatakana: editInfoForm.lastNameKatakana, firstNameKatakana: editInfoForm.firstNameKatakana, email: editInfoForm.email, phone: editInfoForm.phone, role: (customerData?.customer as any)?.role || 'user' })}
                disabled={updateUserMutation.isPending}
                className="px-4 py-1.5 text-xs font-medium text-white bg-pink-600 hover:bg-pink-700 rounded-md transition-colors disabled:opacity-50"
              >
                {updateUserMutation.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>

        {/* ===== 통계 카드 5개 ===== */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { icon: ShoppingBag, label: "총 주문", value: stats.totalOrders, color: "text-blue-600" },
            { icon: Package, label: "총 구매액", value: formatPrice(stats.totalSpent), color: "text-green-600" },
            { icon: MessageSquare, label: "문의", value: stats.totalInquiries, color: "text-purple-600" },
            { icon: Star, label: "리뷰", value: stats.totalReviews, color: "text-yellow-600" },
            { icon: UserPlus, label: "추천인 수", value: `${referralInfo?.referralCount || 0}명`, color: "text-pink-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* ===== 추천인 정보 ===== */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100">
            <UserPlus className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-gray-800">추천인 정보</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "내 추천코드", value: (customer as any).referralCode || "미발급", mono: true },
                { label: "나를 추천한 사람", value: referralInfo?.referredBy || "없음" },
                { label: "내가 추천한 회원 수", value: `${referralInfo?.referralCount || 0}명`, highlight: true },
              ].map(({ label, value, mono, highlight }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                  <p className={`text-sm font-bold ${highlight ? "text-blue-600" : "text-gray-800"} ${mono ? "font-mono" : ""}`}>{value}</p>
                </div>
              ))}
            </div>
            {referralInfo?.referrals && referralInfo.referrals.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-600 mb-2">추천한 회원 목록</p>
                <div className="grid grid-cols-4 gap-2">
                  {referralInfo.referrals.map((r: any, i: number) => (
                    <div key={i} className="text-xs bg-gray-50 rounded p-2 border border-gray-100">
                      <span className="font-medium text-gray-800">{r.name || r.email}</span>
                      <span className="text-gray-400 ml-1">{new Date(r.joinedAt).toLocaleDateString("ko-KR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== 접속 이력 ===== */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100">
            <Clock className="w-4 h-4 text-green-500" />
            <span className="text-xs font-bold text-gray-800">접속 이력</span>
            <span className="text-[10px] text-gray-400 font-normal">(최근 20건)</span>
          </div>
          <div className="p-5">
            {!loginHistory || loginHistory.history.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-xs">접속 이력이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["접속 일시", "IP 주소", "브라우저", "기기", "국가"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loginHistory.history.map((log: any) => (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-3 text-gray-700">{new Date(log.loginAt).toLocaleString("ko-KR")}</td>
                        <td className="py-2 px-3 font-mono text-gray-600">{log.ipAddress || "-"}</td>
                        <td className="py-2 px-3 text-gray-600">{log.browser || "-"}</td>
                        <td className="py-2 px-3 text-gray-600">{log.device || "-"}</td>
                        <td className="py-2 px-3 text-gray-600">{log.country || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ===== 등급 변경 이력 ===== */}
        {tierHistoryQuery.data && tierHistoryQuery.data.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100">
              <Crown className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-gray-800">등급 변경 이력</span>
              <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{tierHistoryQuery.data.length}건</span>
            </div>
            <div className="p-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["변경일", "이전 등급", "변경 등급", "유형", "사유"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tierHistoryQuery.data.map((h: any) => (
                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-3 text-gray-700">{new Date(h.createdAt).toLocaleString("ko-KR")}</td>
                      <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">{h.previousTierName}</span></td>
                      <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 text-[10px] font-medium">{h.newTierName}</span></td>
                      <td className="py-2 px-3"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${h.changeType === "manual" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>{h.changeType === "manual" ? "수동" : "자동"}</span></td>
                      <td className="py-2 px-3 text-gray-500">{h.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== 분석 차트 ===== */}
        {analytics && (analytics.monthlyPurchases?.length > 0 || analytics.preferredCategories?.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {analytics.monthlyPurchases?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100">
                  <TrendingUp className="w-4 h-4 text-pink-500" />
                  <span className="text-xs font-bold text-gray-800">월별 구매 패턴</span>
                </div>
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e5e7eb" }} formatter={(value: any, name: string) => name === "구매액" ? [formatPrice(Number(value)), "구매액"] : [`${value}건`, "주문 수"]} labelFormatter={label => `${label}월`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line yAxisId="left" type="monotone" dataKey="주문 수" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
                      <Line yAxisId="right" type="monotone" dataKey="구매액" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {analytics.preferredCategories?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100">
                  <PieChartIcon className="w-4 h-4 text-pink-500" />
                  <span className="text-xs font-bold text-gray-800">선호 카테고리</span>
                </div>
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={70} dataKey="value">
                        {categoryData.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e5e7eb" }} formatter={(value: any, name: string) => [`${value}건`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== 주문 내역 ===== */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100">
            <ShoppingBag className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-gray-800">주문 내역</span>
            <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{orders.length}건</span>
          </div>
          <div className="p-5">
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">주문 내역이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {orders.map((order) => (
                  <div key={order.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-sm text-gray-800">#{order.orderNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[order.status] || "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                            {statusLabels[order.status] || order.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleString("ko-KR")}</p>
                      </div>
                      <p className="text-sm font-bold text-pink-600">{formatPrice(Number(order.totalAmount))}</p>
                    </div>
                    <div className="space-y-1.5 border-t border-gray-50 pt-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          {item.imageUrl && <img src={item.imageUrl} alt={item.productName} className="w-8 h-8 object-cover rounded" />}
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-700">{item.productName}</p>
                            <p className="text-[10px] text-gray-400">수량: {item.quantity} × {formatPrice(Number(item.unitPrice))}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== 문의 내역 ===== */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100">
            <MessageSquare className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-bold text-gray-800">문의 내역</span>
            <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{inquiries.length}건</span>
          </div>
          <div className="p-5">
            {inquiries.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">문의 내역이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-xs font-medium text-gray-800">{inquiry.title}</h4>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${inquiryStatusColors[inquiry.status] || "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                        {inquiryStatusLabels[inquiry.status] || inquiry.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2">{inquiry.content}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(inquiry.createdAt).toLocaleString("ko-KR")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== 리뷰 내역 ===== */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-bold text-gray-800">리뷰 내역</span>
            <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{reviews.length}건</span>
          </div>
          <div className="p-5">
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">리뷰 내역이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {reviews.map((review: any) => (
                  <div key={review.id} className="border border-gray-100 rounded-lg p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                    {review.productImageUrl && <img src={review.productImageUrl} alt={review.productName || "Product"} className="w-10 h-10 object-cover rounded" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-gray-800">{review.productName}</span>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => <Star key={i} className={`w-2.5 h-2.5 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />)}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-2">{review.content}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(review.createdAt).toLocaleString("ko-KR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== 배송지 목록 ===== */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100">
            <MapPin className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-bold text-gray-800">배송지 목록</span>
            <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{customerAddresses?.length || 0}건</span>
          </div>
          <div className="p-5">
            {customerAddresses && customerAddresses.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {customerAddresses.map((addr: any) => (
                  <div key={addr.id} className={`rounded-lg border p-3 text-xs ${addr.isDefault ? "border-orange-200 bg-orange-50" : "border-gray-100 bg-gray-50"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-semibold text-gray-800">{addr.label || "배송지"}</span>
                      </div>
                      {addr.isDefault && <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] rounded font-medium">기본</span>}
                    </div>
                    <p className="text-gray-700 font-medium">{addr.recipientNameKanji}</p>
                    {addr.recipientNameHiragana && <p className="text-gray-400 text-[10px]">{addr.recipientNameHiragana}</p>}
                    <p className="text-gray-500 mt-1">〒{addr.postalCode}</p>
                    <p className="text-gray-600">{addr.prefecture}{addr.city}{addr.address1}</p>
                    {addr.address2 && <p className="text-gray-600">{addr.address2}</p>}
                    <p className="text-gray-500 mt-1">📞 {addr.phone}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-6 text-xs">등록된 배송지가 없습니다</p>
            )}
          </div>
        </div>

        {/* ===== 포인트 내역 ===== */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-bold text-gray-800">포인트 내역</span>
            <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{pointHistoryData?.total || 0}건</span>
          </div>
          <div className="p-5">
            {!pointHistoryData || pointHistoryData.rows.length === 0 ? (
              <div className="text-center py-8">
                <Coins className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">포인트 내역이 없습니다</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  {pointHistoryData.rows.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          tx.amount > 0 ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          {tx.amount > 0
                            ? <TrendingUp className="w-3 h-3 text-green-500" />
                            : <TrendingDown className="w-3 h-3 text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 truncate">{tx.description || tx.type}</p>
                          <p className="text-[10px] text-gray-400">{new Date(tx.createdAt).toLocaleString('ko-KR')}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className={`text-xs font-bold ${
                          tx.amount > 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}pt
                        </p>
                        <p className="text-[10px] text-gray-400">잔액 {tx.balance?.toLocaleString() ?? '-'}pt</p>
                      </div>
                    </div>
                  ))}
                </div>
                {pointHistoryData.total > POINT_PAGE_SIZE && (() => {
                  const totalPages = Math.ceil(pointHistoryData.total / POINT_PAGE_SIZE);
                  const current = pointPage;
                  // 표시할 페이지 번호 범위 계산 (current 중심 최대 5개)
                  const getPageNumbers = () => {
                    const pages: number[] = [];
                    let start = Math.max(0, current - 2);
                    let end = Math.min(totalPages - 1, start + 4);
                    if (end - start < 4) start = Math.max(0, end - 4);
                    for (let i = start; i <= end; i++) pages.push(i);
                    return pages;
                  };
                  const btnBase = "flex items-center justify-center w-6 h-6 text-[10px] border rounded transition-colors";
                  return (
                    <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-gray-100">
                      {/* << 첫 페이지 */}
                      <button onClick={() => setPointPage(0)} disabled={current === 0}
                        className={`${btnBase} ${current === 0 ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        <ChevronsLeft className="w-3 h-3" />
                      </button>
                      {/* < 이전 */}
                      <button onClick={() => setPointPage(p => Math.max(0, p - 1))} disabled={current === 0}
                        className={`${btnBase} ${current === 0 ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      {/* 페이지 번호 */}
                      {getPageNumbers().map(p => (
                        <button key={p} onClick={() => setPointPage(p)}
                          className={`${btnBase} ${
                            p === current
                              ? 'bg-pink-600 border-pink-600 text-white font-bold'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}>
                          {p + 1}
                        </button>
                      ))}
                      {/* > 다음 */}
                      <button onClick={() => setPointPage(p => Math.min(totalPages - 1, p + 1))} disabled={current >= totalPages - 1}
                        className={`${btnBase} ${current >= totalPages - 1 ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      {/* >> 마지막 페이지 */}
                      <button onClick={() => setPointPage(totalPages - 1)} disabled={current >= totalPages - 1}
                        className={`${btnBase} ${current >= totalPages - 1 ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        <ChevronsRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* ===== 관리자 메모 ===== */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-800">관리자 메모</span>
            <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{notes?.length || 0}건</span>
          </div>
          <div className="p-5">
            <div className="mb-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="고객에 대한 메모를 작성하세요..." className="mb-2 min-h-[60px] text-xs bg-white border-gray-200" />
              <div className="flex gap-2">
                <button onClick={handleSaveNote} disabled={!noteText.trim()} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-pink-600 hover:bg-pink-700 rounded-md transition-colors disabled:opacity-40">
                  <Send className="w-3 h-3" />{editingNoteId ? "수정" : "저장"}
                </button>
                {editingNoteId && (
                  <button onClick={() => { setEditingNoteId(null); setNoteText(""); }} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">취소</button>
                )}
              </div>
            </div>
            {notes && notes.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {notes.map((note: any) => (
                  <div key={note.id} className="border border-gray-100 rounded-lg p-3 flex items-start justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 mb-0.5">{new Date(note.createdAt).toLocaleString("ko-KR")}</p>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap">{note.note}</p>
                    </div>
                    <div className="flex gap-0.5 ml-3">
                      <button onClick={() => handleEditNote(note)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"><Edit className="w-3 h-3" /></button>
                      <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-4 text-xs">메모가 없습니다</p>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
