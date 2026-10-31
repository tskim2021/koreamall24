import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MyPageSidebar from "@/components/MyPageSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, Package, Truck, CheckCircle, XCircle, Clock, 
  ArrowLeft, MapPin, Phone, User, Calendar, CreditCard,
  AlertCircle, RefreshCw, Printer, ExternalLink,
  Star, ShoppingCart, Upload, X, Image as ImageIcon, Tag, Coins,
  Copy, Building2, Hash, UserCheck, Info, ChevronRight
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import ShipmentTrackingPanel from "@/components/ShipmentTrackingPanel";
import { useEffect, useRef, useState, useMemo } from "react";
import { formatPrice } from "@/../../shared/utils/formatPrice";

// Order status mapping
const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode; step: number }> = {
  pending: { label: "入金待ち", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: <Clock className="w-5 h-5" />, step: 1 },
  paid: { label: "決済完了", color: "bg-green-100 text-green-800 border-green-300", icon: <CheckCircle className="w-5 h-5" />, step: 2 },
  confirmed: { label: "商品準備中", color: "bg-blue-100 text-blue-800 border-blue-300", icon: <Package className="w-5 h-5" />, step: 3 },
  shipped: { label: "発送済み", color: "bg-indigo-100 text-indigo-800 border-indigo-300", icon: <Truck className="w-5 h-5" />, step: 4 },
  delivered: { label: "配達完了", color: "bg-green-100 text-green-800 border-green-300", icon: <CheckCircle className="w-5 h-5" />, step: 5 },
  completed: { label: "注文完了", color: "bg-teal-100 text-teal-800 border-teal-300", icon: <CheckCircle className="w-5 h-5" />, step: 6 },
  cancelled: { label: "キャンセル", color: "bg-red-100 text-red-800 border-red-300", icon: <XCircle className="w-5 h-5" />, step: 0 },
  partially_cancelled: { label: "一部キャンセル", color: "bg-orange-100 text-orange-800 border-orange-300", icon: <XCircle className="w-5 h-5" />, step: 0 },
};

const statusSteps = ["入金待ち", "決済完了", "商品準備中", "発送済み", "配達完了"];

function formatDate(date: Date | string | null) {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// formatPrice 함수는 shared/utils/formatPrice.ts에서 import

// Star rating component
function StarRating({ rating, onRate, interactive = false, size = "w-5 h-5" }: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          className={interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}
        >
          <Star
            className={`${size} ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id || "0");
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState<number>(0);
  const [reviewOrderItemId, setReviewOrderItemId] = useState<number>(0);
  const [reviewProductName, setReviewProductName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const { data: order, isLoading: orderLoading, error: orderError } = trpc.order.getById.useQuery(
    { orderId },
    { enabled: isAuthenticated && orderId > 0 }
  );

  const { data: orderItems, isLoading: itemsLoading } = trpc.order.getItems.useQuery(
    { orderId },
    { enabled: isAuthenticated && orderId > 0 }
  );

  const { data: reviewPointData } = trpc.settings.getReviewPoints.useQuery();
  const reviewPoints = reviewPointData?.max ?? 1500;

  const { data: shipment } = trpc.order.getShipment.useQuery(
    { orderId },
    { enabled: isAuthenticated && orderId > 0, refetchInterval: 30000 }
  );

  // Review status for order items
  // Payment providers (for bank transfer info)
  const { data: paymentProviders } = trpc.paymentSettings.providers.useQuery();
  const bankTransferProvider = paymentProviders?.find((p: any) => p.provider === 'bank_transfer');

  const { data: reviewStatus } = trpc.order.getItemReviewStatus.useQuery(
    { orderId },
    { enabled: isAuthenticated && orderId > 0 && order?.status === "delivered" }
  );



  // Build review map: productId -> { rating, id }
  const reviewMap = useMemo(() => {
    const map = new Map<number, { rating: number; id: number }>();
    if (reviewStatus) {
      for (const r of reviewStatus) {
        map.set(r.productId, { rating: r.rating, id: r.id });
      }
    }
    return map;
  }, [reviewStatus]);

  // Reorder mutation
  const reorderMutation = trpc.order.reorder.useMutation({
    onSuccess: (result: any) => {
      const added = result.added || 0;
      const skipped = result.skipped || [];
      if (added > 0) {
        toast.success(`${added}個の商品をカートに追加しました`);
      }
      if (skipped.length > 0) {
        toast.warning(`${skipped.length}個の商品は在庫切れまたは販売終了のためスキップされました`);
      }
      if (added > 0) {
        setLocation("/cart");
      }
    },
    onError: (e: any) => {
      toast.error(e.message || "再注文に失敗しました");
    },
  });

  // Review create mutation
  const createReviewMutation = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("レビューを投稿しました！");
      setReviewDialogOpen(false);
      setReviewRating(5);
      setReviewTitle("");
      setReviewContent("");
      utils.order.getItemReviewStatus.invalidate({ orderId });
    },
    onError: (e: any) => {
      toast.error(e.message || "レビューの投稿に失敗しました");
    },
  });

  // Mutation for updating order status when delivery detected
  const updateOrderStatusMutation = trpc.order.updateStatus.useMutation({
    onSuccess: () => {
      utils.order.getById.invalidate({ orderId });
      toast.success("配送が完了しました！");
    },
    onError: (error) => {
      console.error("Failed to update order status:", error);
    },
  });

  const cancelMutation = trpc.order.cancel.useMutation({
    onSuccess: () => {
      toast.success("注文がキャンセルされました");
      utils.order.getById.invalidate({ orderId });
      utils.order.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "キャンセルに失敗しました");
    },
  });

  // Print receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  // Open review dialog
  const openReviewDialog = (productId: number, productName: string, orderItemId: number) => {
    setReviewProductId(productId);
    setReviewProductName(productName);
    setReviewOrderItemId(orderItemId);
    setReviewRating(5);
    setReviewTitle("");
    setReviewContent("");
    setReviewImages([]);
    setReviewImagePreviews([]);
    setReviewDialogOpen(true);
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (reviewImages.length + files.length > 5) {
      toast.error("画像は最大5枚までアップロードできます");
      return;
    }

    // Validate file size (max 5MB per image)
    const oversizedFiles = files.filter(f => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error("画像サイズは5MB以下にしてください");
      return;
    }

    // Validate file type
    const invalidFiles = files.filter(f => !f.type.startsWith("image/"));
    if (invalidFiles.length > 0) {
      toast.error("画像ファイルのみアップロードできます");
      return;
    }

    // Create preview URLs
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setReviewImages(prev => [...prev, ...files]);
    setReviewImagePreviews(prev => [...prev, ...newPreviews]);
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(reviewImagePreviews[index]);
    setReviewImages(prev => prev.filter((_, i) => i !== index));
    setReviewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Submit review
  const handleSubmitReview = async () => {
    if (reviewRating < 1) {
      toast.error("評価を選択してください");
      return;
    }

    let imageUrls: string[] = [];

    // Upload images to S3 if any
    if (reviewImages.length > 0) {
      setIsUploadingImages(true);
      try {
        const uploadPromises = reviewImages.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", "reviews");
          
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error("画像のアップロードに失敗しました");
          }
          
          const data = await response.json();
          return data.url;
        });
        
        imageUrls = await Promise.all(uploadPromises);
      } catch (error) {
        toast.error("画像のアップロードに失敗しました");
        setIsUploadingImages(false);
        return;
      } finally {
        setIsUploadingImages(false);
      }
    }

    createReviewMutation.mutate({
      productId: reviewProductId,
      orderId: order?.id || 0,
      orderItemId: reviewOrderItemId,
      rating: reviewRating,
      title: reviewTitle || undefined,
      content: reviewContent || undefined,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    });
  };

  // Handle delivery detected from tracking panel
  const handleDeliveryDetected = () => {
    if (order && order.status !== "delivered") {
      updateOrderStatusMutation.mutate({
        orderId,
        status: "delivered",
      });
    }
  };

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-4">ログインが必要です</h1>
            <p className="text-gray-600 mb-6">
              注文詳細を表示するにはログインしてください。
            </p>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => setLocation("/login")}
            >
              ログインページへ
            </Button>
        </div>
      </main>
      <Footer />
      </div>
    );
  }

  if (authLoading || orderLoading || itemsLoading) {
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

  if (orderError || !order) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-300 mb-4" />
            <h1 className="text-2xl font-bold mb-4">注文が見つかりません</h1>
            <p className="text-gray-600 mb-6">
              指定された注文は存在しないか、アクセス権限がありません。
            </p>
            <Link href="/mypage" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-white hover:bg-primary/90">
              マイページに戻る
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const status = statusMap[order.status] || statusMap.pending;
  const canCancel = ["pending", "confirmed"].includes(order.status);
  const isDelivered = order.status === "delivered";
  const hasTracking = shipment && shipment.trackingNumber;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container py-6 md:py-8">
        <div className="flex gap-6 lg:gap-8 items-start">
          {/* Sidebar */}
          <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4 print:hidden">
            <MyPageSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* 브레드크럼 */}
            <nav className="flex items-center gap-1.5 text-sm text-gray-500 print:hidden">
              <Link href="/" className="hover:text-primary transition-colors">ホーム</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/mypage" className="hover:text-primary transition-colors">マイページ</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/mypage/order" className="hover:text-primary transition-colors">注文履歴</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-gray-800 font-medium">注文詳細</span>
            </nav>

          {/* Order Header - 마이페이지 스타일 배너 */}
          <div className="bg-[#fffbeb] border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 print:hidden">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900">注文詳細</h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.color}`}>
                  {status.icon}
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                注文番号: <span className="font-semibold text-gray-800">{order.orderNumber}</span>
                {order.cartGroupId && (
                  <>
                    <span className="mx-2 text-gray-300">|</span>
                    カート番号: <span className="font-semibold text-pink-600">{order.cartGroupId}</span>
                  </>
                )}
                <span className="mx-2 text-gray-300">|</span>
                {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap print:hidden">
              {/* Reorder Button */}
              {isDelivered && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reorderMutation.mutate({ orderId })}
                  disabled={reorderMutation.isPending}
                  className="gap-2 border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 font-medium shadow-sm"
                >
                  {reorderMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  再注文
                </Button>
              )}
              {/* Print Receipt Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintReceipt}
                className="gap-2 border-sky-200 text-sky-600 bg-sky-50 hover:bg-sky-100 hover:border-sky-300 font-medium shadow-sm"
              >
                <Printer className="w-4 h-4" />
                領収書
              </Button>
            </div>
          </div>

          {/* Order Status Progress (only for non-cancelled orders) */}
          {order.status !== "cancelled" && (
            <Card className="mb-6">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  {statusSteps.map((step, index) => {
                    const stepNum = index + 1;
                    const isCompleted = status.step >= stepNum;
                    const isCurrent = status.step === stepNum;
                  
                    // Timestamp removed (statusHistory no longer available)
                    const stepTimestamp = null;
                  
                    return (
                      <div key={step} className="flex-1 flex flex-col items-center">
                        <div className="relative flex items-center justify-center w-full">
                          {index > 0 && (
                            <div 
                              className={`absolute left-0 right-1/2 h-1 -translate-y-1/2 top-4 ${
                                isCompleted ? "bg-primary" : "bg-gray-200"
                              }`}
                            />
                          )}
                          {index < statusSteps.length - 1 && (
                            <div 
                              className={`absolute left-1/2 right-0 h-1 -translate-y-1/2 top-4 transition-colors ${
                                status.step > stepNum ? "bg-primary" : "bg-gray-200"
                              }`}
                              style={{ zIndex: 0 }}
                            />
                          )}
                          <div 
                            className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              isCompleted
                                ? "bg-primary text-white"
                                : "bg-gray-200 text-gray-500"
                            } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                          >
                            {isCompleted ? <CheckCircle className="w-4 h-4" /> : stepNum}
                          </div>
                        </div>
                        <span 
                          className={`mt-2 text-xs text-center ${
                            isCurrent ? "font-bold text-primary" : isCompleted ? "text-gray-700" : "text-gray-400"
                          }`}
                        >
                          {step}
                        </span>
                        {stepTimestamp && (
                          <span className="text-[10px] text-gray-400 mt-0.5">{stepTimestamp}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== BANK TRANSFER NOTICE ===== */}
          {(order as any).paymentMethod === 'bank_transfer' && !(order as any).bankTransferConfirmedAt && order.status !== 'cancelled' && (() => {
            const createdAt = new Date(order.createdAt);
            const deadlineDays = bankTransferProvider?.paymentDeadlineDays || 3;
            const deadline = new Date(createdAt.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
            const now = new Date();
            const diffMs = deadline.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const isExpired = diffMs <= 0;
            const isUrgent = diffDays <= 1 && !isExpired;

            const copyToClipboard = (text: string, label: string) => {
              navigator.clipboard.writeText(text).then(() => {
                toast.success(`${label}をコピーしました`);
              });
            };

            return (
              <Card className={`mb-6 border-2 ${
                isExpired ? 'border-red-300 bg-red-50' : isUrgent ? 'border-orange-300 bg-orange-50' : 'border-amber-300 bg-amber-50'
              }`}>
                <CardHeader className="border-b border-amber-200 pb-3">
                  <CardTitle className={`flex items-center gap-2 text-base ${
                    isExpired ? 'text-red-700' : isUrgent ? 'text-orange-700' : 'text-amber-700'
                  }`}>
                    <Building2 className="w-5 h-5" />
                    銀行振込のご案内
                    {isExpired ? (
                      <Badge className="ml-auto bg-red-100 text-red-700 border-red-300">入金期限切れ</Badge>
                    ) : isUrgent ? (
                      <Badge className="ml-auto bg-orange-100 text-orange-700 border-orange-300">本日期限</Badge>
                    ) : (
                      <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-300">入金待ち</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Deadline Banner */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    isExpired ? 'bg-red-100 border border-red-200' : isUrgent ? 'bg-orange-100 border border-orange-200' : 'bg-white border border-amber-200'
                  }`}>
                    <Clock className={`w-5 h-5 flex-shrink-0 ${
                      isExpired ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-amber-500'
                    }`} />
                    <div>
                      {isExpired ? (
                        <p className="font-bold text-red-700">入金期限が過ぎました</p>
                      ) : (
                        <p className={`font-bold ${
                          isUrgent ? 'text-orange-700' : 'text-amber-700'
                        }`}>
                          入金期限: {deadline.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                          {isUrgent ? ' （本日まで）' : ` （あと${diffDays}日）`}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-0.5">
                        ご注文後{deadlineDays}日以内にお振込みください。期限を過ぎると自動キャンセルとなります。
                      </p>
                    </div>
                  </div>

                  {/* Account Info */}
                  {bankTransferProvider && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                        <Info className="w-4 h-4" />
                        振込先口座情報
                      </p>
                      <div className="bg-white rounded-lg border border-amber-200 divide-y divide-amber-100">
                        {bankTransferProvider.bankName && (
                          <div className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-sm text-gray-500 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5" />銀行名
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{bankTransferProvider.bankName}</span>
                              <button onClick={() => copyToClipboard(bankTransferProvider.bankName, '銀行名')} className="text-gray-400 hover:text-amber-600 transition-colors">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                        {bankTransferProvider.branchName && (
                          <div className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-sm text-gray-500 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5" />支店名
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{bankTransferProvider.branchName}</span>
                              <button onClick={() => copyToClipboard(bankTransferProvider.branchName, '支店名')} className="text-gray-400 hover:text-amber-600 transition-colors">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                        {bankTransferProvider.accountNumber && (
                          <div className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-sm text-gray-500 flex items-center gap-1.5">
                              <Hash className="w-3.5 h-3.5" />口座番号
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900 font-mono">{bankTransferProvider.accountNumber}</span>
                              <button onClick={() => copyToClipboard(bankTransferProvider.accountNumber, '口座番号')} className="text-gray-400 hover:text-amber-600 transition-colors">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                        {bankTransferProvider.accountHolder && (
                          <div className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-sm text-gray-500 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5" />口座名義
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{bankTransferProvider.accountHolder}</span>
                              <button onClick={() => copyToClipboard(bankTransferProvider.accountHolder, '口座名義')} className="text-gray-400 hover:text-amber-600 transition-colors">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                        {bankTransferProvider.swiftCode && (
                          <div className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-sm text-gray-500 flex items-center gap-1.5">
                              <Hash className="w-3.5 h-3.5" />SWIFTコード
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 font-mono">{bankTransferProvider.swiftCode}</span>
                              <button onClick={() => copyToClipboard(bankTransferProvider.swiftCode, 'SWIFTコード')} className="text-gray-400 hover:text-amber-600 transition-colors">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transfer Amount */}
                  <div className="flex items-center justify-between p-3 bg-pink-50 border border-pink-200 rounded-lg">
                    <span className="text-sm font-semibold text-pink-700">お振込金額</span>
                    <span className="text-lg font-bold text-pink-600">{formatPrice(order.totalAmount)}</span>
                  </div>

                  {/* Instructions */}
                  {bankTransferProvider?.instructions && (
                    <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
                      {bankTransferProvider.instructions}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Confirmed bank transfer notice */}
          {(order as any).paymentMethod === 'bank_transfer' && (order as any).bankTransferConfirmedAt && (
            <Card className="mb-6 border-2 border-green-300 bg-green-50">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-green-700">ご入金を確認しました</p>
                    <p className="text-sm text-green-600">
                      確認日時: {formatDate((order as any).bankTransferConfirmedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== SHIPPING TRACKING PANEL (Unified) ===== */}
          {hasTracking && (
            <ShipmentTrackingPanel
              shipment={shipment}
              orderStatus={order.status}
              orderId={orderId}
              onDeliveryDetected={handleDeliveryDetected}
              forceShowTracking={isDelivered}
            />
          )}

          {/* Waiting for tracking number */}
          {!hasTracking && (order.status === "shipped" || order.status === "confirmed") && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50/30">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-900">配送準備中</p>
                    <p className="text-sm text-yellow-700">追跡番号が登録され次第、配送状況をリアルタイムで確認できるようになります。</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review Prompt - compact inline notice after delivery */}
          {isDelivered && (
            <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg print:hidden">
              <Star className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                各商品のレビューを書いていただけると嬉しいです。下の商品リストからレビューできます。
              </p>
            </div>
          )}



          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Order Items */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  <Package className="w-4 h-4 text-gray-500" />
                  <h3 className="font-bold text-gray-900">注文商品</h3>
                  <span className="ml-auto text-sm text-gray-500">{orderItems?.length ?? 0}点</span>
                </div>
                <div className="">
                  <div className="divide-y">
                    {orderItems?.map((item) => {
                      const existingReview = reviewMap.get(item.productId);
                      return (
                        <div key={item.id} className="p-4 flex gap-4">
                          <Link href={`/product/${item.productId}`} className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer">
                            {item.productImageUrl ? (
                              <img 
                                src={item.productImageUrl} 
                                alt={item.productNameJa}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-8 h-8 text-gray-400" />
                            )}
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link href={`/product/${item.productId}`} className="font-medium text-gray-900 hover:text-primary line-clamp-1">
                              {item.productNameJa}
                            </Link>
                            <p className="text-sm text-gray-500 line-clamp-1">{item.productName}</p>
                            {(item as any).tierName && (
                              <p className="text-xs text-blue-600 font-medium mt-0.5">
                                オプション: {(item as any).tierName}
                              </p>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                {formatPrice(item.unitPrice)} × {item.quantity}
                              </span>
                              <span className="font-medium text-primary">
                                {formatPrice(item.subtotal)}
                              </span>
                            </div>
                            {/* Review section for delivered orders */}
                            {isDelivered && (
                              <div className="mt-3 print:hidden">
                                {existingReview ? (
                                  <div className="flex items-center gap-2">
                                    <StarRating rating={existingReview.rating} size="w-4 h-4" />
                                    <span className="text-sm text-gray-500">レビュー済み</span>
                                  </div>
                                ) : (
                    <button
                      onClick={() => openReviewDialog(item.productId, item.productNameJa, item.id)}
                      className="inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-4 py-2 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                      <Star className="w-4 h-4 fill-current" />
                      レビュー作成 +{reviewPoints}P
                    </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ===== 취소 이력 섹션 ===== */}
              {orderItems?.some((item: any) => item.cancelledAt) && (
                <div className="bg-white rounded-xl border border-red-200">
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-red-100 bg-red-50/50">
                    <div className="w-1 h-5 bg-red-500 rounded-full" />
                    <XCircle className="w-4 h-4 text-red-500" />
                    <h3 className="font-bold text-red-700">キャンセル履歴</h3>
                    <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      {orderItems.filter((item: any) => item.cancelledAt).length}件
                    </span>
                  </div>
                  <div className="">
                    <div className="divide-y divide-red-50">
                      {[...orderItems]
                        .filter((item: any) => item.cancelledAt)
                        .sort((a: any, b: any) => new Date(b.cancelledAt).getTime() - new Date(a.cancelledAt).getTime())
                        .map((item: any) => {
                          const refundAmt = Math.max(0, parseFloat(item.subtotal || '0') - parseFloat(item.discountAmount || '0'));
                          return (
                            <div key={item.id} className="p-4 flex gap-3 hover:bg-red-50/30 transition-colors">
                              {/* 상품 이미지 */}
                              <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 opacity-60">
                                {item.productImageUrl ? (
                                  <img
                                    src={item.productImageUrl}
                                    alt={item.productNameJa}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-700 line-clamp-1 text-sm">{item.productNameJa}</p>
                                <p className="text-xs text-gray-500 line-clamp-1">{item.productName}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.quantity}個</p>
                                <div className="mt-1.5 space-y-0.5">
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Clock className="w-3 h-3 flex-shrink-0" />
                                    <span>キャンセル日時:</span>
                                    <span className="text-gray-700">
                                      {new Date(item.cancelledAt).toLocaleString('ja-JP', {
                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                        hour: '2-digit', minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  {item.cancelReason && (
                                    <div className="flex items-start gap-1.5 text-xs text-gray-500">
                                      <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                      <span>キャンセル理由:</span>
                                      <span className="text-gray-700">{item.cancelReason}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* 환불 금액 */}
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs text-gray-400 line-through">{formatPrice(parseFloat(item.subtotal || '0'))}</p>
                                <p className="text-sm font-semibold text-red-600">-{formatPrice(refundAmt)}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">返金額</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    {/* 취소 합계 */}
                    {(() => {
                      const cancelledItems = orderItems.filter((item: any) => item.cancelledAt);
                      const totalRefund = cancelledItems.reduce((sum: number, item: any) => {
                        return sum + Math.max(0, parseFloat(item.subtotal || '0') - parseFloat(item.discountAmount || '0'));
                      }, 0);
                      return (
                        <div className="p-4 border-t border-red-100 bg-red-50/50 flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">合計返金額</span>
                          <span className="text-base font-bold text-red-600">-{formatPrice(totalRefund)}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary & Info */}
            <div className="space-y-5">
              {/* Order Summary */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <h3 className="font-bold text-gray-900">注文金額</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">商品小計</span>
                    <span className="text-gray-900">{formatPrice((order as any).items?.reduce((s: number, i: any) => s + parseFloat(i.subtotal || '0'), 0) || (parseFloat(order.totalAmount as string) - parseFloat(order.shippingFee as string) + (order as any).couponDiscount + order.pointsUsed))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">送料</span>
                    <span className={parseFloat(order.shippingFee as string) === 0 ? "text-green-600 font-medium" : "text-gray-900"}>{parseFloat(order.shippingFee as string) === 0 ? "無料" : formatPrice(order.shippingFee)}</span>
                  </div>
                  {(() => {
                    const itemDiscountTotal = (order as any).items?.reduce((s: number, i: any) => s + parseFloat(i.discountAmount || '0'), 0) || 0;
                    const couponAmt = itemDiscountTotal > 0 ? itemDiscountTotal : ((order as any).couponDiscount || 0);
                    return couponAmt > 0 ? (
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Tag className="w-4 h-4 text-pink-500" />
                          クーポン
                        </span>
                        <span className="text-pink-600 font-medium">-{formatPrice(couponAmt)}</span>
                      </div>
                    ) : null;
                  })()}
                  {order.pointsUsed > 0 && (
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Coins className="w-4 h-4 text-amber-500" />
                        ポイント利用
                      </span>
                      <span className="text-amber-600 font-medium">-{formatPrice(order.pointsUsed)}</span>
                    </div>
                  )}
                  {(() => {
                    const itemDiscountTotal = (order as any).items?.reduce((s: number, i: any) => s + parseFloat(i.discountAmount || '0'), 0) || 0;
                    const couponAmt = itemDiscountTotal > 0 ? itemDiscountTotal : ((order as any).couponDiscount || 0);
                    return (couponAmt > 0 || order.pointsUsed > 0) ? (
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>割引合計</span>
                        <span>-{formatPrice(couponAmt + order.pointsUsed)}</span>
                      </div>
                    ) : null;
                  })()}
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-lg">合計</span>
                    <span className="text-xl font-bold text-pink-600">{formatPrice(order.totalAmount)}</span>
                  </div>
                  {order.pointsEarned > 0 && (
                    <p className="text-xs text-green-600 text-right flex items-center justify-end gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      +{order.pointsEarned}ポイント獲得予定
                    </p>
                  )}
                </div>
              </div>

              {/* Shipping Info */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <h3 className="font-bold text-gray-900">お届け先</h3>
                </div>
                <div className="p-5 space-y-2 text-sm">
                  <p className="font-medium">{order.shippingName}</p>
                  <p className="text-gray-600">〒{order.shippingPostalCode}</p>
                  <p className="text-gray-600">{order.shippingAddress}</p>
                  {order.shippingPhone && (
                    <p className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      {order.shippingPhone}
                    </p>
                  )}
                </div>
              </div>

              {/* Order Dates */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <h3 className="font-bold text-gray-900">注文情報</h3>
                </div>
                <div className="p-5 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">注文日時</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  {order.shippedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">発送日時</span>
                      <span>{formatDate(order.shippedAt)}</span>
                    </div>
                  )}
                  {order.deliveredAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">配達日時</span>
                      <span>{formatDate(order.deliveredAt)}</span>
                    </div>
                  )}
                  {/* 결제 수단 */}
                  {(order as any).paymentMethod && (
                    <div className="flex justify-between pt-1 border-t border-gray-100">
                      <span className="text-gray-600">お支払い方法</span>
                      <span className="font-medium text-gray-800">
                        {(order as any).paymentMethod === 'stripe' ? 'クレジットカード' :
                         (order as any).paymentMethod === 'bank_transfer' ? '銀行振込' :
                         (order as any).paymentMethod}
                      </span>
                    </div>
                  )}
                  {/* 쿠폰 코드 */}
                  {(order as any).couponCode && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-pink-500" />
                        クーポン
                      </span>
                      <span className="font-mono text-xs bg-pink-50 text-pink-600 px-2 py-0.5 rounded">{(order as any).couponCode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 print:hidden">
                {canCancel && (
                  <Button
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm("この注文をキャンセルしますか？")) {
                        cancelMutation.mutate({ orderId });
                      }
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    注文をキャンセル
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Print-only Receipt Section */}
          <div className="hidden print:block mt-8 border-t-2 border-dashed pt-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">領収書</h2>
              <p className="text-sm text-gray-600 mt-1">Receipt</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="font-medium">注文番号: {order.orderNumber}</p>
                {order.cartGroupId && <p className="text-pink-600">カート番号: {order.cartGroupId}</p>}
                <p>注文日: {formatDate(order.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{order.shippingName} 様</p>
                <p>〒{order.shippingPostalCode}</p>
                <p>{order.shippingAddress}</p>
              </div>
            </div>
            <table className="w-full text-sm border-collapse mb-4">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left py-2">商品名</th>
                  <th className="text-right py-2">単価</th>
                  <th className="text-right py-2">数量</th>
                  <th className="text-right py-2">小計</th>
                </tr>
              </thead>
              <tbody>
                {orderItems?.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.productNameJa}</td>
                    <td className="text-right py-2">{formatPrice(item.unitPrice)}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">{formatPrice(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td colSpan={3} className="text-right py-2 font-bold">合計</td>
                  <td className="text-right py-2 font-bold">{formatPrice(order.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="text-center text-xs text-gray-500 mt-6">
              この領収書は電子的に発行されたものです。
            </p>
          </div>
          </div>
        </div>
      </main>
      <Footer />
      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>レビューを書く</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">商品</p>
              <p className="text-sm text-gray-900">{reviewProductName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">評価</p>
              <StarRating rating={reviewRating} onRate={setReviewRating} interactive />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">タイトル（任意）</p>
              <input
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="レビューのタイトル"
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">コメント（任意）</p>
              <Textarea
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                placeholder="商品の使用感や感想をお書きください..."
                rows={4}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">画像（任意、最大5枚）</p>
              <div className="space-y-3">
                {/* Image Previews */}
                {reviewImagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {reviewImagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Upload Button */}
                {reviewImages.length < 5 && (
                  <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      画像を選択 ({reviewImages.length}/5)
                    </span>
                  </label>
                )}
                <p className="text-xs text-gray-500">
                  ※ JPG, PNG形式、最大5MBまで
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={createReviewMutation.isPending || isUploadingImages}
            >
              {(createReviewMutation.isPending || isUploadingImages) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isUploadingImages ? "画像アップロード中..." : "投稿中..."}
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  投稿する
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
