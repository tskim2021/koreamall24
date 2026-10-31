import { useParams, useLocation, Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import OptimizedImage from "@/components/OptimizedImage";
import { toProxyUrl } from "@/lib/imageProxy";
import { AlsoBoughtProducts } from "@/components/RecommendedProducts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useMemo, useRef, useEffect } from "react";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import {
  parsePriceTiers,
  getLowestPrice,
  getHighestPrice,
  getBestDiscount,
  formatPriceRange,
  generateProductSeoTitle,
  generateProductSeoDescription,
  generateImageAlt,
} from "@/../../shared/utils/seoUtils";
import {
  Star,
  ShoppingCart,
  Heart,
  Truck,
  Shield,
  ChevronRight,
  ChevronLeft,
  Minus,
  Plus,
  Eye,
  Clock,
  Package,
  CheckCircle,
  AlertTriangle,
  Info,
  Camera,
  MessageSquare,
  PenLine,
  Settings,
  ZoomIn,
  Award,
  ThumbsUp,
  Tag,
  Share2,
  Link as LinkIcon,
} from "lucide-react";

interface SetPricing {
  tierId?: number;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  discountPercent: number;
  stock?: number;
  isPopular?: boolean;
}

// メールアドレスマスキング: 先頭5文字 + *
function maskEmail(email: string | null | undefined, fallbackName?: string | null): string {
  if (email && email.includes("@")) {
    const local = email.split("@")[0];
    const prefix = local.slice(0, 5);
    return prefix + "*";
  }
  if (fallbackName) {
    const name = fallbackName.trim();
    if (name.length <= 2) return name + "*";
    return name.slice(0, 5) + "*";
  }
  return "匿名*";
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id || "0");
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewImages, setReviewImages] = useState<{ file: File; preview: string }[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const reviewImageInputRef = useRef<HTMLInputElement>(null);

  const handleReviewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - reviewImages.length;
    const toAdd = files.slice(0, remaining);
    const validFiles = toAdd.filter(f => {
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name}は5MB以下にしてください`); return false; }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { toast.error(`${f.name}はJPG/PNG/WebP形式のみ対応`); return false; }
      return true;
    });
    const newImages = validFiles.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setReviewImages(prev => [...prev, ...newImages]);
    if (e.target) e.target.value = '';
  };

  const removeReviewImage = (index: number) => {
    setReviewImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadReviewImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const img of reviewImages) {
      const formData = new FormData();
      formData.append('file', img.file);
      formData.append('folder', 'reviews');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) { const data = await res.json(); urls.push(data.url); }
    }
    return urls;
  };
  const [selectedSetIndex, setSelectedSetIndex] = useState<number | null>(null);

  // 회원 등급 조회
  const { data: myTierData } = trpc.membership.myTier.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 2,
    retryDelay: 1000,
  });

  // 전체 등급 목록 (fallback용 - OAuth 사용자도 기본 등급 표시)
  const { data: allTiers = [] } = trpc.membership.tiers.list.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
  });

  // 표시할 등급: 내 등급이 있으면 사용, 없으면 가장 낮은 등급(sortOrder 기준 첫번째)
  const displayTier = myTierData?.tier ?? (isAuthenticated && allTiers.length > 0 ? allTiers[0] : null);

  // 다음 등급 정보: myTierData에 nextTier가 있으면 사용, OAuth 사용자는 allTiers[1]을 다음 등급으로
  const nextTier = myTierData?.nextTier ?? (isAuthenticated && allTiers.length > 1 ? allTiers[1] : null);
  const totalPurchaseAmount = myTierData?.totalPurchaseAmount ?? 0;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);
  const autoSlideIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoSliding, setIsAutoSliding] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest' | 'images'>('newest');
  const [reviewJustSubmitted, setReviewJustSubmitted] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [questionText, setQuestionText] = useState("");
  const { user } = useAuth();

  // Recommendation tracking mutations
  const trackRecommendation = trpc.recommendations.trackEvent.useMutation();
  const bulkTrackImpressions = trpc.recommendations.bulkTrackImpressions.useMutation();

  // 서버 주입 데이터 활용 (TTFB 개선 - 스켈레톤 제거)
  const serverInitialData = (window as any).__INITIAL_DATA__ || {};
  const serverProduct = serverInitialData.productDetail;
  const serverImageOrder = serverInitialData.productImageOrder;
  const serverPriceTiers = serverInitialData.productPriceTiers;
  // 서버 데이터가 이 상품의 것인지 확인
  const isServerDataForThisProduct = serverProduct && serverProduct.id === productId;

  const { data: product, isLoading } = trpc.product.getById.useQuery(
    { id: productId },
    {
      enabled: productId > 0,
      staleTime: 1000 * 60 * 10,
      initialData: isServerDataForThisProduct ? serverProduct : undefined,
    }
  );

  // Fetch image order from product_image_order table
  const { data: imageOrderData } = trpc.product.getImageOrder.useQuery(
    { productId },
    {
      enabled: productId > 0,
      staleTime: 1000 * 60 * 10,
      initialData: isServerDataForThisProduct && serverImageOrder ? serverImageOrder : undefined,
    }
  );

  const { data: reviews } = trpc.review.getByProduct.useQuery(
    { productId, limit: 10, sort: reviewSort },
    { enabled: productId > 0, staleTime: 1000 * 60 * 5 }
  );

  const { data: relatedProducts } = trpc.product.getByTags.useQuery(
    { productId, limit: 6 },
    { enabled: productId > 0, staleTime: 1000 * 60 * 10 }
  );

  const { data: alsoViewedProducts } = trpc.product.getAlsoViewed.useQuery(
    { productId, limit: 6 },
    { enabled: productId > 0, staleTime: 1000 * 60 * 10 }
  );

  // 상품 페이지 진입 시 항상 최상단으로 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [productId]);

  // Track recommendation impressions — single batch call instead of N individual mutations
  useEffect(() => {
    if (!product || !relatedProducts || relatedProducts.length === 0) return;
    const ids = relatedProducts.map(p => p.id).filter(id => id !== productId);
    if (ids.length === 0) return;
    bulkTrackImpressions.mutate({
      productId,
      recommendedProductIds: ids,
      recommendationType: 'tag_based',
      userId: user?.id,
    });
  }, [relatedProducts, productId, user?.id]);

  useEffect(() => {
    if (!product || !alsoViewedProducts || alsoViewedProducts.length === 0) return;
    const ids = alsoViewedProducts.map(p => p.id).filter(id => id !== productId);
    if (ids.length === 0) return;
    bulkTrackImpressions.mutate({
      productId,
      recommendedProductIds: ids,
      recommendationType: 'collaborative',
      userId: user?.id,
    });
  }, [alsoViewedProducts, productId, user?.id]);

  // Track recommendation click
  const handleRecommendationClick = (
    recommendedProductId: number,
    recommendationType: 'tag_based' | 'collaborative' | 'category_based' | 'after_review'
  ) => {
    trackRecommendation.mutate({
      productId,
      recommendedProductId,
      recommendationType,
      eventType: 'click',
      userId: user?.id,
    });
  };

  const questionsQuery = trpc.productQuestion.list.useQuery(
    { productId: productId, limit: 10 },
    { enabled: productId > 0, staleTime: 1000 * 60 * 10, gcTime: 1000 * 60 * 15 }
  );

  const createQuestionMutation = trpc.productQuestion.create.useMutation({
    onSuccess: () => {
      toast.success("質問を送信しました");
      setQuestionText("");
      setShowQuestionForm(false);
      questionsQuery.refetch();
    },
    onError: () => {
      toast.error("質問の送信に失敗しました");
    },
  });

  const handleSubmitQuestion = () => {
    if (!questionText.trim()) return;
    createQuestionMutation.mutate({
      productId,
      questionText: questionText.trim(),
    });
  };

  // Fetch DB price tiers
  const { data: dbPriceTiers } = trpc.product.getActivePriceTiers.useQuery(
    { productId: productId },
    {
      enabled: productId > 0,
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 15,
      initialData: isServerDataForThisProduct && serverPriceTiers ? serverPriceTiers : undefined,
    }
  );

  // カテゴリ一覧 (BreadcrumbList JSON-LD 用)
  const { data: allCategories } = trpc.category.list.useQuery(undefined, { staleTime: 1000 * 60 * 30, gcTime: 1000 * 60 * 35 });

  const trackViewMutation = trpc.product.trackView.useMutation();

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast.success("カートに追加しました");
      utils.cart.count.invalidate();
      utils.cart.list.invalidate();
    },
    onError: () => {
      toast.error("カートへの追加に失敗しました");
    },
  });

  const createReview = trpc.review.create.useMutation({
    onSuccess: (data) => {
      // 폼 초기화
      setReviewTitle("");
      setReviewContent("");
      setReviewRating(5);
      reviewImages.forEach(img => URL.revokeObjectURL(img.preview));
      setReviewImages([]);
      setShowReviewForm(false);
      setReviewJustSubmitted(true);
      utils.review.getByProduct.invalidate({ productId });
      utils.product.getById.invalidate({ id: productId });
      utils.review.getPendingReviewCount.invalidate();

      // 포인트 적립 알림 토스트
      const pts = data?.pointsAwarded ?? 0;
      if (pts > 0) {
        toast.success(
          <div className="flex flex-col gap-2">
            <div className="font-bold text-base">レビューを投稿しました 🎉</div>
            <div className="text-sm text-green-700 font-semibold">
              ストアポイント <span className="text-lg font-bold">+{pts.toLocaleString()}pt</span> 積立完了！
            </div>
            {data?.pointsBreakdown && (() => {
              const bd = data.pointsBreakdown as { base: number; image: number; detail: number };
              const lines: string[] = [];
              if (bd.base > 0) lines.push(`レビュー基本: +${bd.base.toLocaleString()}pt`);
              if (bd.image > 0) lines.push(`画像投稿ボーナス: +${bd.image.toLocaleString()}pt`);
              if (bd.detail > 0) lines.push(`詳細レビューボーナス: +${bd.detail.toLocaleString()}pt`);
              return lines.length > 0 ? (
                <div className="text-xs text-gray-500 space-y-0.5">
                  {lines.map((line, i) => <div key={i}>• {line}</div>)}
                </div>
              ) : null;
            })()}
            <button
              onClick={() => navigate("/mypage/points")}
              className="mt-1 w-full text-center text-xs bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1.5 font-medium transition-colors"
            >
              ポイント履歴を確認する →
            </button>
          </div>,
          { duration: 8000, style: { minWidth: "280px" } }
        );
      } else {
        toast.success("レビューを投稿しました");
      }
    },
    onError: (err) => {
      toast.error(err.message || "レビューの投稿に失敗しました");
    },
  });

  // Build set pricing from DB price tiers (primary) or fallback to product.setPricing
  const setPricing = useMemo<SetPricing[]>(() => {
    // If DB price tiers exist, use them
    if (dbPriceTiers && dbPriceTiers.length > 0) {
      return dbPriceTiers.map(tier => ({
        tierId: tier.id,
        quantity: tier.quantity,
        pricePerUnit: Math.round(parseFloat(tier.unitPrice)),
        totalPrice: Math.round(parseFloat(tier.totalPrice)),
        discountPercent: tier.discountPercent,
        stock: tier.stock || 0,
        isPopular: tier.isPopular,
      }));
    }
    // Fallback: try product.setPricing JSON
    if (product?.setPricing) {
      try {
        return JSON.parse(product.setPricing);
      } catch {
        // ignore
      }
    }
    // Final fallback: generate default pricing
    const basePrice = product?.price || 0;
    if (basePrice === 0) return [];
    return [
      { quantity: 10, pricePerUnit: Math.round(basePrice * 0.33), totalPrice: Math.round(basePrice * 0.33 * 10), discountPercent: 67, isPopular: true },
      { quantity: 7, pricePerUnit: Math.round(basePrice * 0.37), totalPrice: Math.round(basePrice * 0.37 * 7), discountPercent: 63 },
      { quantity: 5, pricePerUnit: Math.round(basePrice * 0.41), totalPrice: Math.round(basePrice * 0.41 * 5), discountPercent: 59 },
      { quantity: 3, pricePerUnit: Math.round(basePrice * 0.52), totalPrice: Math.round(basePrice * 0.52 * 3), discountPercent: 48 },
      { quantity: 2, pricePerUnit: Math.round(basePrice * 0.64), totalPrice: Math.round(basePrice * 0.64 * 2), discountPercent: 36 },
      { quantity: 1, pricePerUnit: Math.round(basePrice), totalPrice: Math.round(basePrice), discountPercent: 0 },
    ];
  }, [dbPriceTiers, product?.setPricing, product?.price]);

  // Parse image data - prioritize product_image_order data with optimization info
  interface ImageData {
    url: string;
    urlMedium?: string | null;
    urlThumb?: string | null;
    blurDataUrl?: string | null;
  }
  const imageDataList = useMemo<ImageData[]>(() => {
    // 1. Use product_image_order table data if available
    if (imageOrderData && imageOrderData.length > 0) {
      return imageOrderData
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
        .map((img: any) => ({
          url: toProxyUrl(img.imageUrl) || img.imageUrl,
          urlMedium: toProxyUrl(img.imageUrlMedium) || null,
          urlThumb: toProxyUrl(img.imageUrlThumb) || null,
          blurDataUrl: img.blurDataUrl || null,
        }));
    }
    // 2. Fallback to product fields
    const urls: ImageData[] = [];
    if (product?.imageUrl) urls.push({ url: toProxyUrl(product.imageUrl) || product.imageUrl });
    if (product?.imageUrls) {
      try {
        const parsed = JSON.parse(product.imageUrls);
        if (Array.isArray(parsed)) urls.push(...parsed.map((u: string) => ({ url: u })));
      } catch {
        // ignore
      }
    }
    return urls.length > 0 ? urls : [{ url: "/placeholder-product.png" }];
  }, [imageOrderData, product?.imageUrl, product?.imageUrls]);
  // Backward-compatible imageUrls array
  const imageUrls = useMemo(() => imageDataList.map(d => d.url), [imageDataList]);

  // Calculate review statistics
  const reviewStats = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return { average: 0, total: 0, distribution: [0, 0, 0, 0, 0], recommendPercent: 0 };
    }
    const distribution = [0, 0, 0, 0, 0];
    let sum = 0;
    reviews.forEach((r) => {
      distribution[r.rating - 1]++;
      sum += r.rating;
    });
    const average = sum / reviews.length;
    const recommendPercent = Math.round((distribution[3] + distribution[4]) / reviews.length * 100);
    return {
      average: Math.round(average * 10) / 10,
      total: reviews.length,
      distribution: distribution.reverse(),
      recommendPercent,
    };
  }, [reviews]);

  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = direction === 'left' 
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
      
      setTimeout(checkScrollPosition, 300);
    }
  };

  const handleButtonClick = (direction: 'left' | 'right') => {
    scroll(direction);
    resetAutoSlide();
  };

  const handleScroll = () => {
    checkScrollPosition();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndXRef.current = e.changedTouches[0].screenX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const swipeThreshold = 50;
    const diff = touchStartXRef.current - touchEndXRef.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        scroll('right');
      } else {
        scroll('left');
      }
      resetAutoSlide();
    }
  };

  const resetAutoSlide = () => {
    setIsAutoSliding(false);
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current);
      autoSlideIntervalRef.current = null;
    }
    setTimeout(() => setIsAutoSliding(true), 5000);
  };

  useEffect(() => {
    checkScrollPosition();
  }, [relatedProducts]);

  useEffect(() => {
    if (!isAutoSliding || !relatedProducts || relatedProducts.length === 0) {
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current);
        autoSlideIntervalRef.current = null;
      }
      return;
    }

    autoSlideIntervalRef.current = setInterval(() => {
      scroll('right');
    }, 3000);

    return () => {
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current);
        autoSlideIntervalRef.current = null;
      }
    };
  }, [isAutoSliding, relatedProducts]);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error("ログインが必要です");
      return;
    }
    addToCart.mutate({ productId, quantity });
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      toast.error("ログインが必要です");
      return;
    }
    // Check if options are required but not selected
    if (setPricing.length > 0 && selectedSetIndex === null) {
      toast.error("セットを選択してください");
      return;
    }
    // Store product info in sessionStorage for checkout
    if (product) {
      const buyNowData = {
        product: {
          id: product.id,
          name: product.name,
          nameJa: product.nameJa,
          price: product.price,
          imageUrl: product.imageUrl,
          imageUrlThumb: (product as any).imageUrlThumb,
          blurDataUrl: (product as any).blurDataUrl,
        },
        quantity: selectedSetIndex !== null ? setPricing[selectedSetIndex].quantity : quantity,
        priceTierId: selectedSetIndex !== null ? setPricing[selectedSetIndex].tierId : undefined,
      };
      sessionStorage.setItem('buyNowData', JSON.stringify(buyNowData));
    }
    navigate('/checkout');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("ログインが必要です");
      return;
    }
    setIsUploadingImages(true);
    try {
      const imageUrls = reviewImages.length > 0 ? await uploadReviewImages() : [];
      createReview.mutate({
        productId,
        orderId: 0,
        orderItemId: 0,
        rating: reviewRating,
        title: reviewTitle || undefined,
        content: reviewContent || undefined,
        images: imageUrls.length > 0 ? imageUrls : undefined,
      });
    } catch {
      toast.error("画像のアップロードに失敗しました");
    } finally {
      setIsUploadingImages(false);
    }
  };

  // Track product view when product loads
  useEffect(() => {
    if (product && isAuthenticated) {
      trackViewMutation.mutate({ productId: product.id, categoryId: product.categoryId });
    }
  }, [product?.id, isAuthenticated]);

  // 서버 주입 데이터가 있으면 스켈레톤 표시 안 함 (즉시 렌더링)
  if (isLoading && !isServerDataForThisProduct) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1">
          <div className="container py-6 lg:py-8">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6 animate-pulse">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="p-4 lg:p-6">
                  <div className="aspect-square bg-gray-200 rounded-xl w-full"></div>
                  <div className="flex gap-2 mt-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
                    ))}
                  </div>
                </div>
                <div className="p-4 lg:p-6 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-7 bg-gray-200 rounded w-full"></div>
                  <div className="h-7 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-10 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-32 bg-gray-200 rounded-lg"></div>
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-8 text-center">
          <p className="text-gray-500">商品が見つかりませんでした</p>
          <Link href="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
            トップページへ戻る
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round(
        (1 - product.price / product.originalPrice) * 100
      )
    : 0;

  // 등급별 포인트 환원율: displayTier.pointRate(관리자 설정) 우선, 없으면 product.pointsPercent 사용
  const effectivePointRate = displayTier ? parseFloat(String(displayTier.pointRate || product.pointsPercent || 1)) : (product.pointsPercent || 1);

  // 선택된 옵션 기준 포인트 계산 (등급별 pointRate 적용)
  const selectedTierPrice = selectedSetIndex !== null ? setPricing[selectedSetIndex]?.totalPrice : null;
  const pointsBasePrice = selectedTierPrice ?? product.price;
  const pointsEarned = Math.floor(pointsBasePrice * effectivePointRate / 100);
  const pointsEarnedMin = Math.floor(product.price * effectivePointRate / 100);
  const pointsEarnedMax = setPricing.length > 0
    ? Math.floor(Math.max(...setPricing.map(p => p.totalPrice)) * effectivePointRate / 100)
    : pointsEarnedMin;

  // ── SEO computed values ──────────────────────────────────────────────────
  const seoTiers = parsePriceTiers((product as any).setPricing);
  const seoLowestPrice = getLowestPrice(seoTiers, product.price);
  const seoHighestPrice = getHighestPrice(seoTiers, product.price);
  const seoBestDiscount = getBestDiscount(seoTiers, product.price, product.originalPrice);
  const seoHasTiers = seoTiers.length > 1;
  const canonicalUrl = typeof window !== "undefined"
    ? `${window.location.origin}/product/${product.id}`
    : `/product/${product.id}`;

  const seoTitleText = generateProductSeoTitle({
    nameJa: product.nameJa,
    lowestPrice: seoLowestPrice,
    hasTiers: seoHasTiers,
    bestDiscount: seoBestDiscount,
    seoTitle: (product as any).seoTitle,
  });

  const seoDescriptionText = generateProductSeoDescription({
    nameJa: product.nameJa,
    lowestPrice: seoLowestPrice,
    hasTiers: seoHasTiers,
    bestDiscount: seoBestDiscount,
    descriptionJa: product.descriptionJa,
    brandJa: (product as any).brandJa,
    seoDescription: (product as any).seoDescription,
  });

  const seoOgImage = (product as any).seoImage || imageUrls[0] || "";

  const mainImageAlt = generateImageAlt({
    nameJa: product.nameJa,
    brandJa: (product as any).brandJa,
    lowestPrice: seoLowestPrice,
    hasTiers: seoHasTiers,
  });
  // カテゴリ名 (BreadcrumbList 用)
  const categoryObj = allCategories?.find((c: any) => c.id === product.categoryId);
  const categoryName = categoryObj?.nameJa || categoryObj?.name || null;
  const categorySlug = categoryObj?.slug || null;

  const _availability = (product.stock > 0 || !product.trackInventory)
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  // ── JSON-LD: 공통 seller 정보 ──────────────────────────────────────────────
  const _siteOrigin = typeof window !== "undefined" ? window.location.origin : "https://koreamall24.com";
  const _sellerLd = {
    "@type": "Organization",
    name: "koreamall24",
    url: _siteOrigin,
  };

  // ── JSON-LD: 배송 상세 정보 ────────────────────────────────────────────────
  const _deliveryDays = (product as any).deliveryDays || "10-14";
  const _deliveryMin = parseInt(_deliveryDays.split("-")[0]) || 10;
  const _deliveryMax = parseInt(_deliveryDays.split("-")[1] || _deliveryDays) || 14;
  const _shippingDetailsLd = {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "JPY" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "JP" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: _deliveryMin, maxValue: _deliveryMax, unitCode: "DAY" },
    },
  };

  // ── JSON-LD: Offer / AggregateOffer ───────────────────────────────────────
  const _priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const _offersLd = seoHasTiers
    ? {
        "@type": "AggregateOffer",
        priceCurrency: "JPY",
        lowPrice: String(seoLowestPrice),
        highPrice: String(seoHighestPrice),
        offerCount: String(seoTiers.length),
        availability: _availability,
        url: canonicalUrl,
        seller: _sellerLd,
        itemCondition: "https://schema.org/NewCondition",
        shippingDetails: _shippingDetailsLd,
        priceValidUntil: _priceValidUntil,
        offers: seoTiers.map((tier: any) => ({
          "@type": "Offer",
          priceCurrency: "JPY",
          price: String(tier.pricePerUnit ?? seoLowestPrice),
          availability: _availability,
          url: canonicalUrl,
          seller: _sellerLd,
          itemCondition: "https://schema.org/NewCondition",
          priceValidUntil: _priceValidUntil,
        })),
      }
    : {
        "@type": "Offer",
        priceCurrency: "JPY",
        price: String(seoLowestPrice),
        availability: _availability,
        url: canonicalUrl,
        seller: _sellerLd,
        itemCondition: "https://schema.org/NewCondition",
        shippingDetails: _shippingDetailsLd,
        priceValidUntil: _priceValidUntil,
      };

  // ── JSON-LD: AggregateRating (평점 + 리뷰 수) ─────────────────────────────
  const _ratingValue = parseFloat(product.rating || "0");
  const _reviewCount = product.reviewCount || 0;
  const _aggregateRatingLd = _reviewCount > 0 && _ratingValue > 0
    ? {
        "@type": "AggregateRating",
        ratingValue: _ratingValue.toFixed(1),
        reviewCount: String(_reviewCount),
        bestRating: "5",
        worstRating: "1",
      }
    : null;

  // ── JSON-LD: Review 배열 (최대 5개, 구글 제품 스니펫 필수 필드) ──────────────
  const _reviewsLd = reviews && reviews.length > 0
    ? reviews.slice(0, 5).map((r) => ({
        "@type": "Review",
        author: {
          "@type": "Person",
          name: r.userName || "ユーザー",
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: String(r.rating),
          bestRating: "5",
          worstRating: "1",
        },
        reviewBody: r.content || r.title || "",
        datePublished: new Date(r.createdAt).toISOString().split("T")[0],
        name: r.title || product.nameJa,
      }))
    : null;

  const jsonLd: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.nameJa,
      ...(product.name ? { alternateName: product.name } : {}),
      image: seoOgImage ? [seoOgImage] : undefined,
      description: seoDescriptionText,
      ...(((product as any).brandJa) ? { brand: { "@type": "Brand", name: (product as any).brandJa } } : {}),
      sku: String(product.id),
      mpn: String(product.id),
      ...(_aggregateRatingLd ? { aggregateRating: _aggregateRatingLd } : {}),
      ...(_reviewsLd ? { review: _reviewsLd } : {}),
      offers: _offersLd,
    },
    // WebSite schema (사이트 전체 검색 지원)
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "koreamall24",
      url: `${_siteOrigin}/`,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${_siteOrigin}/products?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    // BreadcrumbList
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "ホーム",
          item: `${_siteOrigin}/`,
        },
        ...(categoryName ? [{
          "@type": "ListItem",
          position: 2,
          name: categoryName,
          item: categorySlug ? `${_siteOrigin}/category/${categorySlug}` : `${_siteOrigin}/products?category=${product.categoryId}`,
        }] : []),
        {
          "@type": "ListItem",
          position: categoryName ? 3 : 2,
          name: product.nameJa,
          item: canonicalUrl,
        },
      ],
    },
  ];
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEOHead
        title={seoTitleText}
        rawTitle
        description={seoDescriptionText}
        keywords={[
          product.nameJa,
          product.name,
          (product as any).brandJa,
          (product as any).searchTags,
          "日本医薬品","健康商品","個人輸入",
        ].filter(Boolean).join(",")}
        ogImage={seoOgImage}
        ogType="product"
        canonicalUrl={canonicalUrl}
        jsonLd={jsonLd}
        ogPrice={String(seoLowestPrice)}
        ogPriceCurrency="JPY"
        ogAvailability={_availability === "https://schema.org/InStock" ? "instock" : "oos"}
      />
      <Header />

      {/* 관리자 전용 빠른 편집 버튼 - 화면 우측 하단 고정 */}
      {user?.role === "admin" && (
        <a
          href={`/admin/products/${productId}`}
          title="管理者：商品設定へ"
          className="fixed bottom-24 right-5 z-50 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-3 py-2.5 rounded-full shadow-lg transition-all hover:scale-105 group"
        >
          <Settings className="w-4 h-4 animate-none group-hover:animate-spin" />
          <span className="hidden group-hover:inline whitespace-nowrap">商品設定</span>
        </a>
      )}

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="container py-3">
            <nav className="flex items-center gap-1.5 text-xs text-gray-500">
              <Link href="/" className="hover:text-primary transition-colors">ホーム</Link>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              {categoryName && (
                <>
                  <Link href={categorySlug ? `/category/${categorySlug}` : `/products?category=${product.categoryId}`} className="hover:text-primary transition-colors">{categoryName}</Link>
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                </>
              )}
              <span className="text-gray-700 font-medium truncate max-w-[200px] md:max-w-none">{product.nameJa}</span>
            </nav>
          </div>
        </div>

        <div className="container py-6 lg:py-8">
          {/* Main Product Section */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              
              {/* ─── Left Column: Images ─── */}
              <div className="p-4 lg:p-6 lg:border-r border-gray-100">
                {/* Main Image */}
                <div
                  className="relative rounded-xl overflow-hidden bg-white mb-3 cursor-zoom-in group border border-gray-100 flex items-center justify-center"
                  onClick={() => { setLightboxIndex(selectedImageIndex); setLightboxOpen(true); }}
                >
                  <div className="aspect-square w-full">
                    <div className="w-full h-full flex items-center justify-center p-[10%]">
                      <OptimizedImage
                        src={imageDataList[selectedImageIndex]?.url}
                        srcMedium={imageDataList[selectedImageIndex]?.urlMedium}
                        blurDataUrl={imageDataList[selectedImageIndex]?.blurDataUrl}
                        alt={selectedImageIndex === 0 ? mainImageAlt : `${product.nameJa} - 画像${selectedImageIndex + 1}`}
                        size="full"
                        objectFit="contain"
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        containerClassName="w-full h-full"
                        lazy={false}
                        fetchpriority="high"
                      />
                    </div>
                  </div>
                  {/* Zoom hint */}
                  <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <ZoomIn className="w-3 h-3" />
                    <span>拡大</span>
                  </div>
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {product.isTimeSale && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                        タイムセール
                      </span>
                    )}
                    {product.isMonthlySale && (
                      <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                        月間セール
                      </span>
                    )}
                    {discount > 0 && (
                      <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                        {discount}%OFF
                      </span>
                    )}
                    {(product as any).couponExcluded && (
                      <span className="bg-gray-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                        クーポン対象外
                      </span>
                    )}
                  </div>
                  {/* Image counter */}
                  {imageDataList.length > 1 && (
                    <div className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-lg pointer-events-none">
                      {selectedImageIndex + 1} / {imageDataList.length}
                    </div>
                  )}
                </div>

                {/* Thumbnail Images */}
                {imageDataList.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {imageDataList.map((imgData, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all border-2 ${
                          selectedImageIndex === index
                            ? "border-primary shadow-md scale-105"
                            : "border-transparent hover:border-gray-300 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <OptimizedImage
                          src={imgData.urlThumb || imgData.url}
                          blurDataUrl={imgData.blurDataUrl}
                          alt={`${product.nameJa} - ${index + 1}`}
                          size="thumb"
                          className="w-full h-full object-cover"
                          containerClassName="w-full h-full"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Image Notice */}
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                  ※画像は参考です。パッケージや消費期限は注文タイミングや製造状況により変わることがございます。
                </p>
              </div>

              {/* ─── Right Column: Product Info ─── */}
              <div className="p-4 lg:p-6 flex flex-col">
                
                {/* Brand & Category */}
                {(product as any).brandJa && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      {(product as any).brandJa}
                    </span>
                  </div>
                )}

                {/* Product Title */}
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 leading-tight mb-1">{product.nameJa}</h1>
                <p className="text-sm text-gray-400 mb-3">{product.name}</p>

                {/* Coupon Excluded Badge */}
                {(product as any).couponExcluded && (
                  <div className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-lg mb-3 w-fit">
                    <span>🚫</span>
                    <span>クーポン対象外</span>
                  </div>
                )}

                {/* Rating & Reviews */}
                {product.reviewCount > 0 && (
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const ratingVal = parseFloat(product.rating || "0");
                        const filled = ratingVal >= star;
                        const half = !filled && ratingVal >= star - 0.5;
                        return (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              filled ? "fill-yellow-400 text-yellow-400" :
                              half ? "fill-yellow-200 text-yellow-400" :
                              "fill-gray-200 text-gray-300"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-sm font-bold text-yellow-600">{parseFloat(product.rating || "0").toFixed(1)}</span>
                    <a href="#reviews" className="text-sm text-gray-400 hover:text-primary transition-colors">({product.reviewCount}件のレビュー)</a>
                  </div>
                )}

                {/* Price Section */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-primary">
                      {formatPriceRange(seoLowestPrice, seoHasTiers)}
                    </span>
                    {seoBestDiscount > 0 && (
                      <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">
                        最大{seoBestDiscount}%OFF
                      </span>
                    )}
                  </div>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <p className="text-sm text-gray-400">
                      通常価格: <span className="line-through">{formatPrice(product.originalPrice)}</span>
                    </p>
                  )}
                </div>

                {/* Key Info Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* Stock Status */}
                  {!product.trackInventory ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                      <CheckCircle className="w-3 h-3" />
                      在庫制限なし
                    </span>
                  ) : product.stock > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                      <CheckCircle className="w-3 h-3" />
                      在庫あり
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      入荷待ち
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                    <Truck className="w-3 h-3" />
                    {product.deliveryDays || "10-14"}日でお届け
                  </span>
                  {(product.viewCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full font-medium">
                      <Eye className="w-3 h-3" />
                      本日{product.viewCount}人チェック
                    </span>
                  )}
                </div>

                {/* Short Description */}
                <p className="text-sm text-gray-600 mb-5 leading-relaxed bg-gray-50 rounded-xl p-3">
                  {(() => {
                    const raw = product.descriptionJa || product.description || "商品説明はありません";
                    const plain = raw.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
                    return plain.length > 150 ? plain.slice(0, 150) + "..." : plain;
                  })()}
                </p>

                {/* Pricing Table */}
                {setPricing.length > 0 && (
                  <div className="mb-5">
                    {/* Bulk Purchase Banner */}
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-bold text-red-600">まとめ買いでお得！</span>
                    </div>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">セット</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">1箱あたり</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">合計</th>
                            <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">在庫</th>
                            <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">選択</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {setPricing.map((pricing, index) => {
                            const isOutOfStock = product.trackInventory && pricing.stock === 0;
                            const isSelected = selectedSetIndex === index;
                            const isPopular = pricing.isPopular && !isOutOfStock;
                            return (
                              <tr
                                key={index}
                                className={`transition-colors cursor-pointer ${
                                  isOutOfStock
                                    ? "bg-gray-50 opacity-50 cursor-not-allowed"
                                    : isSelected
                                    ? "bg-primary/5 border-l-2 border-l-primary"
                                    : isPopular
                                    ? "bg-amber-50 hover:bg-amber-100"
                                    : "hover:bg-gray-50"
                                }`}
                                onClick={() => !isOutOfStock && setSelectedSetIndex(index)}
                              >
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-1.5">
                                    {isPopular && (
                                      <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-md">人気</span>
                                    )}
                                    {isOutOfStock && (
                                      <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md">品切</span>
                                    )}
                                    <span className={`font-semibold ${isOutOfStock ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                      {pricing.quantity}箱
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <span className={`text-sm ${isOutOfStock ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                    {formatPrice(pricing.pricePerUnit)}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className={`font-bold ${isOutOfStock ? 'line-through text-gray-400' : 'text-primary'}`}>
                                      {formatPrice(pricing.totalPrice)}
                                    </span>
                                    {pricing.discountPercent > 0 && !isOutOfStock && (
                                      <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                        {pricing.discountPercent}%OFF
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {!product.trackInventory ? (
                                    <span className="text-emerald-600 text-xs font-medium">◎</span>
                                  ) : pricing.stock === 0 ? (
                                    <span className="text-red-400 text-xs">×</span>
                                  ) : (
                                    <span className="text-green-600 text-xs font-medium">{pricing.stock}</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <div className={`w-4 h-4 rounded-full border-2 mx-auto transition-all ${
                                    isSelected
                                      ? 'border-primary bg-primary'
                                      : isOutOfStock
                                      ? 'border-gray-200 bg-gray-100'
                                      : 'border-gray-300 hover:border-primary'
                                  }`}>
                                    {isSelected && <div className="w-full h-full rounded-full flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                    </div>}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Points Info */}
                <div className="text-sm mb-5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-amber-800 flex-1">
                      獲得予定ポイント{" "}
                      <strong className="text-amber-600 text-base">
                        {selectedSetIndex !== null ? pointsEarned : pointsEarnedMin}
                        {selectedSetIndex === null && setPricing.length > 1 && pointsEarnedMax > pointsEarnedMin ? `〜${pointsEarnedMax}` : ""}
                        pt
                      </strong>
                      {selectedSetIndex === null && setPricing.length > 1 && (
                        <span className="text-xs ml-1 text-amber-600">（まとめ買いでポイントアップ！）</span>
                      )}
                    </span>
                    {isAuthenticated && displayTier && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0"
                        style={{ backgroundColor: displayTier.color || '#6B7280' }}
                      >
                        {displayTier.name}
                      </span>
                    )}
                  </div>
                  {isAuthenticated && displayTier && (
                    <p className="text-xs text-amber-600 mt-1 pl-6">
                      あなたのランク: <strong>{displayTier.nameKo || displayTier.name}</strong> — ポイント還元率 <strong>{effectivePointRate}%</strong>
                    </p>
                  )}

                  {/* 다음 등급 업그레이드 진행 바 */}
                  {isAuthenticated && nextTier && (
                    (() => {
                      const nextMin = nextTier.minAmount || 0;
                      const currentAmount = totalPurchaseAmount;
                      const prevMin = displayTier?.minAmount || 0;
                      const range = nextMin - prevMin;
                      const progress = range > 0 ? Math.min(100, Math.round(((currentAmount - prevMin) / range) * 100)) : 100;
                      const remaining = Math.max(0, nextMin - currentAmount);
                      return (
                        <div className="mt-2.5 pt-2.5 border-t border-amber-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-amber-700">
                              <span
                                className="font-bold px-1.5 py-0.5 rounded text-white text-[10px] mr-1"
                                style={{ backgroundColor: nextTier.color || '#6B7280' }}
                              >
                                {nextTier.name}
                              </span>
                              まであと
                              <strong className="text-amber-800 mx-1">¥{remaining.toLocaleString()}</strong>
                              でアップ！
                            </span>
                            <span className="text-[10px] text-amber-600">{progress}%</span>
                          </div>
                          <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: nextTier.color || '#F59E0B',
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-amber-600 mt-1">
                            現在の累計購入額: ¥{currentAmount.toLocaleString()} / ¥{nextMin.toLocaleString()}
                          </p>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Add to Cart & Buy Now Buttons */}
                <div className="flex gap-2 mb-5">
                  <Button
                    size="lg"
                    className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-12 shadow-sm"
                    onClick={() => {
                      if (selectedSetIndex !== null) {
                        const selected = setPricing[selectedSetIndex];
                        if (isAuthenticated) {
                          addToCart.mutate({ 
                            productId, 
                            quantity: selected.quantity,
                            priceTierId: selected.tierId || undefined
                          });
                          setSelectedSetIndex(null);
                        } else {
                          toast.error("ログインが必要です");
                        }
                      } else {
                        handleAddToCart();
                      }
                    }}
                    disabled={addToCart.isPending || (product.trackInventory && product.stock === 0)}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {!product.trackInventory || product.stock > 0 ? "カートに入れる" : "入荷待ち"}
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl h-12 shadow-sm"
                    onClick={handleBuyNow}
                    disabled={product.trackInventory && product.stock === 0}
                  >
                    今すぐ購入
                  </Button>
                </div>

                {/* Wishlist & Share Row */}
                <div className="flex items-center gap-3 mb-4">
                  <Button size="lg" variant="outline" className="px-4 rounded-xl h-10 border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    <span className="text-sm">お気に入り</span>
                  </Button>

                  {/* SNS Share Buttons */}
                  <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5" />
                    シェア
                  </span>
                  {/* LINE */}
                  <a
                    href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(product.nameJa || product.name || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#06C755] hover:bg-[#05a847] text-white transition-colors"
                    title="LINEでシェア"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                  </a>
                  {/* X (Twitter) */}
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent((product.nameJa || product.name || '') + ' | koreamall24')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black hover:bg-gray-800 text-white transition-colors"
                    title="Xでシェア"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                  {/* Facebook */}
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1877F2] hover:bg-[#1565c0] text-white transition-colors"
                    title="Facebookでシェア"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  {/* URL Copy */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href).then(() => {
                        toast.success('URLをコピーしました');
                      }).catch(() => {
                        toast.error('コピーに失敗しました');
                      });
                    }}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    title="URLをコピー"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>
                  </div>
                </div>

                {/* Product Details Table */}
                {(product.activeIngredientJa || product.volume || product.brandJa || product.shippingFrom) && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden mb-5">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {product.activeIngredientJa && (
                          <tr>
                            <th className="px-4 py-2.5 bg-gray-50 text-left text-xs font-semibold text-gray-500 w-1/3">有効成分</th>
                            <td className="px-4 py-2.5 text-gray-700 text-xs">{product.activeIngredientJa}</td>
                          </tr>
                        )}
                        {product.volume && (
                          <tr>
                            <th className="px-4 py-2.5 bg-gray-50 text-left text-xs font-semibold text-gray-500">内容量</th>
                            <td className="px-4 py-2.5 text-gray-700 text-xs">{product.volume}</td>
                          </tr>
                        )}
                        {product.brandJa && (
                          <tr>
                            <th className="px-4 py-2.5 bg-gray-50 text-left text-xs font-semibold text-gray-500">ブランド</th>
                            <td className="px-4 py-2.5 text-xs">
                              <span className="text-primary font-medium">{product.brandJa}</span>
                            </td>
                          </tr>
                        )}
                        {product.shippingFrom && (
                          <tr>
                            <th className="px-4 py-2.5 bg-gray-50 text-left text-xs font-semibold text-gray-500">発送国</th>
                            <td className="px-4 py-2.5 text-gray-700 text-xs">{product.shippingFrom}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: <Truck className="w-4 h-4" />, text: "全品送料無料", color: "text-blue-600 bg-blue-50" },
                    { icon: <Shield className="w-4 h-4" />, text: "100%正規品保証", color: "text-green-600 bg-green-50" },
                    { icon: <Clock className="w-4 h-4" />, text: `最短${product.deliveryDays || "10-14"}日でお届け`, color: "text-orange-600 bg-orange-50" },
                    { icon: <Package className="w-4 h-4" />, text: "プライバシー配送", color: "text-purple-600 bg-purple-50" },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${item.color}`}>
                      {item.icon}
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Sections */}
          <div className="space-y-4">
            {/* 商品説明 Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded-full"></span>
                商品説明
              </h2>
              <div
                className="product-content"
                dangerouslySetInnerHTML={{
                  __html: (product as any).productContent || product.description || product.descriptionJa || "商品説明はありません。",
                }}
              />
            </div>

            {/* Q&A Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                  商品に関する質問
                  {questionsQuery.data && questionsQuery.data.filter((q: any) => !q.answer).length > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-normal">
                      未回答 {questionsQuery.data.filter((q: any) => !q.answer).length}件
                    </span>
                  )}
                </h2>
                {user && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowQuestionForm(!showQuestionForm)}
                    className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    質問する
                  </Button>
                )}
              </div>

              {/* Question Form */}
              {showQuestionForm && user && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="質問を入力してください..."
                    className="w-full min-h-[100px] p-3 border border-blue-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleSubmitQuestion}
                      disabled={!questionText.trim() || createQuestionMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    >
                      {createQuestionMutation.isPending ? '送信中...' : '質問を送信'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setShowQuestionForm(false); setQuestionText(''); }}
                      className="text-xs"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-3">
                {questionsQuery.isLoading && (
                  <div className="text-center py-8 text-gray-400 text-sm">読み込み中...</div>
                )}
                {questionsQuery.data && questionsQuery.data.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">まだ質問はありません。</div>
                )}
                {questionsQuery.data && questionsQuery.data.map((q) => (
                  <div key={q.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    {/* Question */}
                    <div className="flex items-start gap-3 p-4 bg-gray-50">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-bold text-xs">Q</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{q.question}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(q.createdAt).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                    {/* Answer or Pending */}
                    {!q.answer ? (
                      <div className="px-4 py-2.5 bg-white border-t border-gray-100">
                        <span className="text-xs text-orange-500 flex items-center gap-1">
                          <span>⏳</span> 回答待ち
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 p-4 bg-white border-t border-gray-100">
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600 font-bold text-xs">A</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{q.answer}</p>
                          {q.answerImageUrl && (
                            <img
                              src={q.answerImageUrl}
                              alt="回答画像"
                              className="mt-2 max-w-xs rounded-lg border cursor-pointer hover:opacity-90"
                              onClick={() => window.open(q.answerImageUrl!, '_blank')}
                            />
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {q.answeredAt && new Date(q.answeredAt).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="w-1 h-5 bg-yellow-400 rounded-full"></span>
                  カスタマーレビュー
                  {reviews && reviews.length > 0 && (
                    <span className="text-sm font-normal text-gray-500">({reviews.length}件)</span>
                  )}
                </h2>
                {isAuthenticated && !showReviewForm && (
                  <Button
                    onClick={() => setShowReviewForm(true)}
                    size="sm"
                    className="bg-pink-600 hover:bg-pink-700 text-white text-xs rounded-lg"
                  >
                    <PenLine className="w-3.5 h-3.5 mr-1" />
                    レビューを書く
                  </Button>
                )}
              </div>

              {/* Review Statistics */}
              {reviews && reviews.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-5 mb-6">
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    {/* Average Rating */}
                    <div className="text-center flex-shrink-0">
                      <div className="text-5xl font-bold text-gray-900 mb-1">{reviewStats.average}</div>
                      <div className="flex justify-center mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= Math.round(reviewStats.average)
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-gray-200 text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{reviewStats.total}件のレビュー</p>
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-20 bg-gray-200"></div>

                    {/* Rating Distribution */}
                    <div className="flex-1 w-full">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = reviewStats.distribution[4 - rating + 1] || 0;
                        const percent = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                        return (
                          <div key={rating} className="flex items-center gap-2 text-xs mb-1">
                            <span className="w-6 text-gray-500 flex-shrink-0">★{rating}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-400 rounded-full transition-all"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-gray-500 flex-shrink-0">{count}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-20 bg-gray-200"></div>

                    {/* Recommend Percent */}
                    <div className="text-center flex-shrink-0">
                      <div className="text-4xl font-bold text-primary mb-1">
                        {reviewStats.recommendPercent}%
                      </div>
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                        <ThumbsUp className="w-3 h-3" />
                        <span>おすすめ</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Review Form */}
              {isAuthenticated && showReviewForm ? (
                <div className="border border-pink-100 bg-pink-50/30 rounded-xl p-5 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm">レビューを書く</h3>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      ✕ 閉じる
                    </button>
                  </div>
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-2 block">評価</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                          >
                            <Star
                              className={`w-8 h-8 transition-colors ${
                                star <= reviewRating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "fill-gray-200 text-gray-200 hover:fill-yellow-200 hover:text-yellow-200"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-2 block">タイトル</label>
                      <input
                        type="text"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                        placeholder="レビューのタイトル"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-2 block">レビュー内容</label>
                      <Textarea
                        value={reviewContent}
                        onChange={(e) => setReviewContent(e.target.value)}
                        placeholder="商品のレビューを書いてください"
                        rows={4}
                        className="resize-none bg-white border-gray-200 focus:ring-pink-300"
                      />
                    </div>
                    {/* Photo Upload */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-2 block">写真（最大3枚）</label>
                      <input
                        ref={reviewImageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={handleReviewImageSelect}
                      />
                      {reviewImages.length > 0 && (
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {reviewImages.map((img, idx) => (
                            <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                              <img src={img.preview} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeReviewImage(idx)}
                                className="absolute top-0 right-0 bg-black/60 text-white rounded-bl-lg w-5 h-5 flex items-center justify-center text-xs"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {reviewImages.length < 3 && (
                        <button
                          type="button"
                          onClick={() => reviewImageInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-pink-300 hover:text-pink-500 transition-colors bg-white"
                        >
                          <Camera className="w-4 h-4" /> 写真を追加
                        </button>
                      )}
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG形式、最大5MB・3枚まで</p>
                    </div>
                    <Button
                      type="submit"
                      disabled={createReview.isPending || isUploadingImages}
                      className="bg-pink-600 hover:bg-pink-700 text-white rounded-lg"
                    >
                      {isUploadingImages ? "アップロード中..." : "レビューを投稿"}
                    </Button>
                  </form>
                </div>
              ) : !isAuthenticated ? (
                <div className="border border-gray-100 rounded-xl p-6 mb-6 text-center bg-gray-50">
                  <p className="text-gray-500 text-sm mb-4">
                    レビューを書くにはログインが必要です
                  </p>
                  <Button
                    size="sm"
                    onClick={() => { window.location.href = getLoginUrl(); }}
                    className="bg-primary hover:bg-primary/90"
                  >
                    ログイン
                  </Button>
                </div>
              ) : null}

              {/* Reviews Sort/Filter */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs text-gray-400">並び替え:</span>
                {([
                  { value: 'newest', label: '新着順' },
                  { value: 'highest', label: '評価高い順' },
                  { value: 'lowest', label: '評価低い順' },
                  { value: 'images', label: '画像あり' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setReviewSort(opt.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      reviewSort === opt.value
                        ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-pink-300 hover:text-pink-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Reviews List */}
              {reviews && reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* 리뷰 이미지 or 상품 기본이미지 썸네일 */}
                        <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                          {review.images && review.images.length > 0 ? (
                            <img src={toProxyUrl(review.images[0], { width: 56, quality: 80 }) ?? ''} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          ) : product?.imageUrl ? (
                            <img src={toProxyUrl(product.imageUrl, { width: 56, quality: 80 }) ?? ''} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Stars + Title */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${
                                    star <= review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "fill-gray-200 text-gray-200"
                                  }`}
                                />
                              ))}
                            </div>
                            {review.title && (
                              <span className="font-semibold text-sm text-gray-800 truncate">{review.title}</span>
                            )}
                          </div>
                          {/* Content */}
                          {review.content && (
                            <p className="text-sm text-gray-600 mb-2 leading-relaxed line-clamp-3">{review.content}</p>
                          )}
                          {/* Meta */}
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="font-medium text-gray-500">
                              {maskEmail(undefined, review.userName)}
                            </span>
                            <span>•</span>
                            <span>{new Date(review.createdAt).toLocaleDateString("ja-JP")}</span>
                          </div>
                        </div>
                      </div>
                      {/* 추가 이미지 (2번째 이상) */}
                      {review.images && review.images.length > 1 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {review.images.slice(1).map((img: string, idx: number) => (
                            <img key={idx} src={toProxyUrl(img, { width: 64, quality: 80 }) ?? ''} alt="" loading="lazy" decoding="async" className="w-16 h-16 rounded-lg object-cover border border-gray-100" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm">
                    まだレビューがありません。<br />ご購入後ぜひレビューをお寄せください。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 리뷰 완료 후 추천 상품 섹션 */}
          {reviewJustSubmitted && relatedProducts && relatedProducts.filter(p => p.id !== productId).length > 0 && (
            <section className="mt-6 border rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-pink-700 flex items-center gap-2">
                    <span>🛍️</span>
                    レビューありがとうございます！こちらもいかがですか？
                  </h2>
                  <p className="text-xs text-pink-400 mt-0.5">この商品と一緒によく購入される商品です</p>
                </div>
                <button
                  onClick={() => setReviewJustSubmitted(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  閉じる
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {relatedProducts
                  .filter(p => p.id !== productId)
                  .slice(0, 4)
                  .map(p => (
                    <Link
                      key={p.id}
                      href={`/product/${p.id}`}
                      onClick={() => handleRecommendationClick(p.id, 'after_review')}
                    >
                      <div className="bg-white rounded-xl p-3 hover:border-pink-300 transition-colors cursor-pointer group border border-pink-100">
                        <div className="aspect-square bg-gray-50 rounded-lg mb-2 overflow-hidden">
                          <OptimizedImage
                            src={toProxyUrl((p as any).imageUrl)}
                            srcThumb={toProxyUrl((p as any).imageUrlThumb)}
                            blurDataUrl={(p as any).blurDataUrl}
                            alt={p.nameJa}
                            size="thumb"
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                            containerClassName="w-full h-full"
                            fallback={<Package className="w-10 h-10 text-gray-300" />}
                          />
                        </div>
                        <h3 className="text-xs font-medium line-clamp-2 mb-1 text-gray-700">{p.nameJa}</h3>
                        <p className="text-primary font-bold text-sm">{formatPrice(p.price)}</p>
                      </div>
                    </Link>
                  ))}
              </div>
            </section>
          )}

          {/* Also Bought Products */}
          {product && <AlsoBoughtProducts productId={productId} />}

          {/* Also Viewed Products */}
          {alsoViewedProducts && alsoViewedProducts.length > 0 && (
            <section className="mt-6 bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded-full"></span>
                この商品を見た人はこんな商品も見ています
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {alsoViewedProducts
                  .filter((p) => p.id !== productId)
                  .map((p) => (
                    <Link 
                      key={p.id} 
                      href={`/product/${p.id}`}
                      onClick={() => handleRecommendationClick(p.id, 'collaborative')}
                    >
                        <div className="border border-gray-200 rounded-xl p-3 hover:border-gray-300 transition-colors bg-white cursor-pointer group">
                        <div className="aspect-square bg-gray-50 rounded-lg mb-2 overflow-hidden">
                          <OptimizedImage
                            src={toProxyUrl((p as any).imageUrl)}
                            srcThumb={toProxyUrl((p as any).imageUrlThumb)}
                            blurDataUrl={(p as any).blurDataUrl}
                            alt={p.nameJa}
                            size="thumb"
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                            containerClassName="w-full h-full"
                            fallback={<Package className="w-12 h-12 text-gray-300" />}
                          />
                        </div>
                        <h3 className="text-xs font-medium line-clamp-2 mb-1 text-gray-700">
                          {p.nameJa}
                        </h3>
                        <p className="text-primary font-bold text-sm">{formatPrice(p.price)}</p>
                      </div>
                    </Link>
                  ))}
              </div>
            </section>
          )}

          {/* Related Products Slide */}
          {relatedProducts && relatedProducts.length > 1 && (
            <section className="mt-6 bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded-full"></span>
                同等薬や効果のよく似た商品をオススメ
              </h2>
              <div className="relative">
                {canScrollLeft && (
                  <button
                    onClick={() => handleButtonClick('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-primary text-white p-1.5 rounded-full shadow-md hover:bg-primary/90 transition"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  className="flex gap-3 overflow-x-auto scroll-smooth pb-2 px-6"
                  style={{
                    scrollBehavior: 'smooth',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  <style>{`
                    div::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  {relatedProducts
                    .filter((p) => p.id !== productId)
                    .map((p) => (
                      <Link 
                        key={p.id} 
                        href={`/product/${p.id}`}
                        onClick={() => handleRecommendationClick(p.id, 'tag_based')}
                      >
                        <div className="border border-gray-200 rounded-xl p-3 hover:border-gray-300 transition-colors bg-white flex-shrink-0 w-40 cursor-pointer group">
                          <div className="aspect-square bg-gray-50 rounded-lg mb-2 overflow-hidden">
                            <OptimizedImage
                              src={toProxyUrl((p as any).imageUrl)}
                              srcThumb={toProxyUrl((p as any).imageUrlThumb)}
                              blurDataUrl={(p as any).blurDataUrl}
                              alt={p.nameJa}
                              size="thumb"
                              className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                              containerClassName="w-full h-full"
                            />
                          </div>
                          <p className="text-xs line-clamp-2 text-gray-700 mb-1">{p.nameJa}</p>
                          <p className="text-sm font-bold text-primary">
                            {formatPrice(p.price)}
                          </p>
                        </div>
                      </Link>
                    ))}
                </div>
                {canScrollRight && (
                  <button
                    onClick={() => handleButtonClick('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-primary text-white p-1.5 rounded-full shadow-md hover:bg-primary/90 transition"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxOpen(false);
            if (e.key === 'ArrowRight') setLightboxIndex(i => Math.min(i + 1, imageDataList.length - 1));
            if (e.key === 'ArrowLeft') setLightboxIndex(i => Math.max(i - 1, 0));
          }}
          tabIndex={0}
          autoFocus
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none z-10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            ×
          </button>
          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i - 1); }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {/* Next */}
          {lightboxIndex < imageDataList.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i + 1); }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          {/* Image */}
          <div className="max-w-3xl max-h-[85vh] w-full px-16" onClick={(e) => e.stopPropagation()}>
            <img
              src={imageDataList[lightboxIndex]?.url}
              alt={`${product.nameJa} - ${lightboxIndex + 1}`}
              className="w-full h-full object-contain max-h-[80vh]"
            />
            <div className="text-center text-white/50 text-sm mt-3">{lightboxIndex + 1} / {imageDataList.length}</div>
          </div>
          {/* Thumbnail strip */}
          {imageDataList.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
              {imageDataList.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`w-12 h-12 rounded-lg border-2 overflow-hidden flex-shrink-0 transition-all ${
                    i === lightboxIndex ? 'border-white scale-110' : 'border-white/20 opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={toProxyUrl(img.urlThumb || img.url, { width: 80, quality: 75 }) ?? ''} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
}
