import { useState, useEffect, useMemo } from "react";
import { hiraganaToKatakana } from "@/hooks/useKatakanaInput";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { lookupPostalCode } from "@/lib/postalCodeLookup";
import { createValidationHandlers } from "@/lib/validationHandlers";
import { useAuth } from "@/_core/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/OptimizedImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, X, Ticket, ShoppingCart, Loader2, MapPin, Star, Crown, Gem } from "lucide-react";
import MyPageSidebar from "@/components/MyPageSidebar";
import PaymentMethodSelector, { type PaymentProvider } from "@/components/PaymentMethodSelector";
import PaymentErrorDialog from "@/components/PaymentErrorDialog";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import { parsePaymentError, formatErrorForLogging, type PaymentErrorInfo } from "@/../../shared/utils/paymentErrorHandler";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Japanese prefectures
const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentErrorInfo, setPaymentErrorInfo] = useState<PaymentErrorInfo | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<PaymentProvider | null>(null);
  const [noBuildingChecked, setNoBuildingChecked] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    couponId: number;
    code: string;
    nameJa: string;
    discountType: string;
    discountValue: string;
    discountAmount: number;
  } | null>(null);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [selectedCartItemIds, setSelectedCartItemIds] = useState<number[] | null>(null); // 選択購入 cartItem IDs
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const validators = createValidationHandlers(setValidationErrors);

  // Shipping form state
  // Buy now items from sessionStorage
  const [buyNowItems, setBuyNowItems] = useState<any[] | null>(null);
  const [shippingForm, setShippingForm] = useState({
    recipientNameKanji: "",
    recipientNameHiragana: "",
    email: "",
    phone: "",
    postalCode: "",
    prefecture: "",
    city: "",
    address1: "",
    address2: "",
  });

  // Get cart items (or use buy now items if available)
  const { data: cartItemsFromDB, isLoading: cartLoading } = trpc.cart.list.useQuery(
    undefined,
    { enabled: !!user && !authLoading && !buyNowItems }
  );
  
  // Use buy now items if available, otherwise use cart items from DB
  const cartItems = buyNowItems ? null : cartItemsFromDB;
  // Get user points balance
  const { data: pointsBalance } = trpc.point.getBalance.useQuery(
    undefined,
    { enabled: !!user && !authLoading }
  );
  // Get membership tier for discount display
  const { data: tierData } = trpc.membership.myTier.useQuery(
    undefined,
    { enabled: !!user && !authLoading }
  );
  // Get saved addresses
  const { data: savedAddresses = [], refetch: refetchAddresses } = trpc.address.list.useQuery(
    undefined,
    { enabled: !!user && !authLoading }
  );
  // Selected address ID (null = new address entry)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  // Create address mutation (for saving new address from checkout)
  const createAddressMutation = trpc.address.create.useMutation({
    onSuccess: () => {
      refetchAddresses();
    },
  });
  // Read coupon and points from URL parameters (passed from cart)
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);;
  useEffect(() => {
    if (urlParamsProcessed) return;
    
    // Check for buy now data in sessionStorage
    const buyNowDataStr = sessionStorage.getItem('buyNowData');
    if (buyNowDataStr) {
      try {
        const buyNowData = JSON.parse(buyNowDataStr);
        if (buyNowData.product) {
          // Transform buyNowData to match cart item structure
          const transformedItem = {
            id: `buynow-${buyNowData.product.id}-${Date.now()}`,
            product: buyNowData.product,
            cartItem: {
              id: `buynow-${buyNowData.product.id}-${Date.now()}`,
              quantity: buyNowData.quantity || 1,
              priceTierId: buyNowData.priceTierId,
            },
          };
          setBuyNowItems([transformedItem]);
          sessionStorage.removeItem('buyNowData');
        }
      } catch (e) {
        console.error('Failed to parse buyNowData:', e);
      }
    }
    
    // Check for buy now items in sessionStorage (legacy)
    const checkoutDataStr = sessionStorage.getItem('checkoutData');
    if (checkoutDataStr) {
      try {
        const checkoutData = JSON.parse(checkoutDataStr);
        if (checkoutData.items && Array.isArray(checkoutData.items)) {
          // Ensure each item has a unique id
          const itemsWithIds = checkoutData.items.map((item: any, idx: number) => ({
            ...item,
            id: item.id || `buynow-${item.product?.id || item.productId || idx}-${idx}`,
          }));
          setBuyNowItems(itemsWithIds);
          sessionStorage.removeItem('checkoutData');
        }
      } catch (e) {
        console.error('Failed to parse checkoutData:', e);
      }
    }
    
    const params = new URLSearchParams(window.location.search);
    
    // Read points
    const points = params.get('pointsUsed');
    if (points) {
      const parsedPoints = parseInt(points, 10);
      if (!isNaN(parsedPoints) && parsedPoints > 0) {
        setPointsToUse(parsedPoints);
      }
    }
    
    // Read coupon info
    const couponId = params.get('couponId');
    const couponCodeParam = params.get('couponCode');
    const couponDiscount = params.get('couponDiscount');
    const couponName = params.get('couponName');
    const couponDiscountType = params.get('couponDiscountType');
    const couponDiscountValue = params.get('couponDiscountValue');
    
    if (couponId && couponCodeParam && couponDiscount) {
      setAppliedCoupon({
        couponId: parseInt(couponId, 10),
        code: couponCodeParam,
        nameJa: couponName || couponCodeParam,
        discountType: couponDiscountType || 'fixed',
        discountValue: couponDiscountValue || couponDiscount,
        discountAmount: parseInt(couponDiscount, 10),
      });
      setCouponCode(couponCodeParam);
    }

    // Read selected cartItemIds
    const cartItemIdsParam = params.get('cartItemIds');
    if (cartItemIdsParam) {
      const ids = cartItemIdsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      if (ids.length > 0) {
        setSelectedCartItemIds(ids);
      }
    }
    
    setUrlParamsProcessed(true);
  }, [urlParamsProcessed]);

  // Validate coupon mutation
  const validateCoupon = trpc.coupon.validate.useMutation({
    onSuccess: (data: any) => {
      setAppliedCoupon({
        couponId: data.couponId,
        code: data.code,
        nameJa: data.nameJa,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount: data.discountAmount,
      });
      toast.success(`クーポン「${data.nameJa}」が適用されました`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'クーポンコードが無効です');
    },
  });

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast.error('クーポンコードを入力してください');
      return;
    }
    validateCoupon.mutate({
      code: couponCode.trim(),
      orderAmount: subtotal,
      userId: user?.id,
    });
  };

  // Create checkout session mutation
  const createCheckoutSession = trpc.checkout.createSession.useMutation({
    onSuccess: (data: any) => {
      if (data.url) {
        // Redirect to Stripe Checkout immediately
        setIsProcessing(false);
        window.location.href = data.url;
      } else {
        // Fallback: URL not returned
        setIsProcessing(false);
        (window as any).__PAYMENT_IN_PROGRESS__ = false;
        toast.error('決済ページのURLを取得できませんでした。もう一度お試しください。');
      }
    },
    onError: (error: any) => {
      const errorInfo = parsePaymentError(error, "stripe");
      setPaymentErrorInfo(errorInfo);
      setShowErrorDialog(true);
      setLastPaymentMethod("stripe");
      console.error(formatErrorForLogging(errorInfo));
      setIsProcessing(false);
    },
  });

  // CookiePay utils for fetching providers
  const utils = trpc.useUtils();

  // Create CookiePay order mutation (creates pending order then launches payment popup)
  const createCookiePayOrder = trpc.order.createBankTransferOrder.useMutation({
    onSuccess: async (data: any) => {
      // Launch CookiePay payment popup
      const orderId = data.orderId;
      try {
        // Get CookiePay API ID from server
        const providerData = await utils.paymentSettings.providers.fetch();
        const cookieProvider = providerData?.find((p: any) => p.provider === 'cookiepay');
        if (!cookieProvider?.publicKey) {
          setError('CookiePay API IDが設定されていません。管理者にお問い合わせください。');
          setIsProcessing(false);
          return;
        }
        const baseUrl = cookieProvider.mode === 'test'
          ? 'https://sandbox.cookiepayments.com'
          : 'https://www.cookiepayments.com';
        // Load jQuery if not present
        if (!(window as any).jQuery) {
          await new Promise<void>((resolve, reject) => {
            const jq = document.createElement('script');
            jq.src = 'https://code.jquery.com/jquery-1.12.4.min.js';
            jq.onload = () => resolve();
            jq.onerror = reject;
            document.head.appendChild(jq);
          });
        }
        // Load CookiePay JS
        await new Promise<void>((resolve, reject) => {
          const cp = document.createElement('script');
          cp.src = `${baseUrl}/js/cookiepayments-1.1.4.js`;
          cp.onload = () => resolve();
          cp.onerror = reject;
          document.head.appendChild(cp);
        });
        const cp = (window as any).cookiepayments;
        if (!cp) throw new Error('CookiPayライブラリの読み込みに失敗しました');
        cp.init({ api_id: cookieProvider.publicKey });
        const returnUrl = `${window.location.origin}/order-confirmation/${orderId}`;
        cp.payrequest({
          ORDERNO: String(orderId),
          PRODUCTNAME: cartItems?.map(i => i.product.nameJa || i.product.name).join(', ').slice(0, 100) || '商品',
          AMOUNT: String(total),
          BUYERNAME: shippingForm.recipientNameKanji,
          BUYEREMAIL: shippingForm.email,
          BUYERPHONE: shippingForm.phone,
          BUYERADDRESS: `${shippingForm.prefecture}${shippingForm.city}${shippingForm.address1}`,
          RETURNURL: returnUrl,
          ETC1: String(data.orderId),
        });
      } catch (e: any) {
        setError(e.message || 'CookiePay決済画面の読み込みに失敗しました。');
        setIsProcessing(false);
      }
    },
    onError: (error: any) => {
      const errorInfo = parsePaymentError(error, "cookiepay");
      setPaymentErrorInfo(errorInfo);
      setShowErrorDialog(true);
      setLastPaymentMethod("cookiepay");
      console.error(formatErrorForLogging(errorInfo));
      setIsProcessing(false);
    },
  });

  // Create PayPal order mutation
  const createPayPalOrder = trpc.checkout.createPayPalOrder.useMutation({
    onSuccess: (data: any) => {
      if (data.approvalUrl) {
        setIsProcessing(false);
        window.location.href = data.approvalUrl;
      }
    },
    onError: (error: any) => {
      const errorInfo = parsePaymentError(error, "paypal");
      setPaymentErrorInfo(errorInfo);
      setShowErrorDialog(true);
      setLastPaymentMethod("paypal");
      console.error(formatErrorForLogging(errorInfo));
      setIsProcessing(false);
    },
  });

  // Create bank transfer order mutation
  const createBankTransferOrder = trpc.order.createBankTransferOrder.useMutation({
    onSuccess: (data: any) => {
      // Use window.location.href for immediate navigation to prevent removeChild errors
      setIsProcessing(false);
      window.location.href = `/order-complete?order_id=${data.orderId}`;
    },
    onError: (error: any) => {
      const errorInfo = parsePaymentError(error, "bank_transfer");
      setPaymentErrorInfo(errorInfo);
      setShowErrorDialog(true);
      setLastPaymentMethod("bank_transfer");
      console.error(formatErrorForLogging(errorInfo));
      setIsProcessing(false);
    },
  });

  // Handle payment retry
  const handlePaymentRetry = async () => {
    if (!lastPaymentMethod) return;
    
    setIsRetrying(true);
    setShowErrorDialog(false);
    setError(null);
    
    // Small delay to ensure UI updates
    setTimeout(() => {
      setIsRetrying(false);
      handleCheckout();
    }, 500);
  };

  // Handle changing payment method
  const handleChangePaymentMethod = () => {
    setShowErrorDialog(false);
    setPaymentErrorInfo(null);
    setLastPaymentMethod(null);
    setPaymentMethod(null);
    setError(null);
    // Scroll to payment method selector
    document.getElementById('payment-method-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user && !(window as any).__PAYMENT_IN_PROGRESS__) {
      // Use window.location.href to prevent React cleanup conflicts
      window.location.href = "/login?redirect=/checkout";
    }
  }, [user, authLoading]);

  // Pre-fill recipient name and email from user
  useEffect(() => {
    if (user && !shippingForm.recipientNameKanji) {
      setShippingForm((prev) => ({
        ...prev,
        recipientNameKanji: user.name || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  // Auto-select default address on load
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId) {
      const defaultAddress = savedAddresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        handleAddressSelect(defaultAddress.id);
      }
    }
  }, [savedAddresses]);

  // Handle address selection
  const handleAddressSelect = (addressId: number) => {
    const address = savedAddresses.find(addr => addr.id === addressId);
    if (address) {
      setSelectedAddressId(addressId);
      setShippingForm({
        recipientNameKanji: address.recipientNameKanji,
        recipientNameHiragana: address.recipientNameHiragana,
        email: user?.email || "",
        phone: address.phone,
        postalCode: address.postalCode,
        prefecture: address.prefecture,
        city: address.city,
        address1: address.address1,
        address2: address.address2 || "",
      });
    }
  };

  // Handle manual address entry
  const handleManualEntry = () => {
    setSelectedAddressId(null);
    setShippingForm({
      recipientNameKanji: user?.name || "",
      recipientNameHiragana: "",
      email: user?.email || "",
      phone: "",
      postalCode: "",
      prefecture: "",
      city: "",
      address1: "",
      address2: "",
    });
    setSaveNewAddress(false);
    setSaveAsDefault(false);
  };

  // Function to calculate set option price
  const getItemPrice = (item: any) => {
    const { cartItem, product, priceTier } = item;
    if (!product || !product.price) {
      return 0;
    }
    const basePrice = parseFloat(product.price);
    const quantity = cartItem?.quantity || item.quantity || 1;
    
    // Use tier price if priceTier info is available
    if (priceTier && priceTier.totalPrice) {
      return parseFloat(priceTier.totalPrice);
    }
    
    // Find matching set option price if setPricing is available
    if (product.setPricing) {
      try {
        const setPricing = JSON.parse(product.setPricing);
        const matchedSet = setPricing.find((set: any) => set.quantity === quantity);
        if (matchedSet) {
          return matchedSet.totalPrice;
        }
      } catch {
        // Use base price if JSON parsing fails
      }
    }
    
    // Base price × quantity
    return basePrice * quantity;
  };

  // Use buy now items or cart items
  // cartItemIdsが指定された場合はその商品のみ表示
  const allCartItems = buyNowItems || cartItems;
  const displayCartItems = selectedCartItemIds && selectedCartItemIds.length > 0 && !buyNowItems
    ? allCartItems?.filter((item: any) => selectedCartItemIds.includes(item.cartItem?.id))
    : allCartItems;
  
  // Calculate totals
  const subtotal = displayCartItems?.reduce(
    (sum: number, item: any) => sum + (item ? getItemPrice(item) : 0),
    0
  ) || 0;
  const shippingFee = subtotal >= 5000 ? 0 : 500;
  // クーポン割引: couponExcluded商品除外後計算
  const couponEligibleSubtotal = displayCartItems?.reduce(
    (sum: number, item: any) => {
      if ((item.product as any)?.couponExcluded) return sum;
      return sum + (item ? getItemPrice(item) : 0);
    },
    0
  ) || 0;
  const computeCouponDiscount = (sub: number): number => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      return Math.floor(sub * parseFloat(appliedCoupon.discountValue) / 100);
    } else {
      return Math.min(parseInt(appliedCoupon.discountValue), sub);
    }
  };
  const couponDiscount = computeCouponDiscount(couponEligibleSubtotal);
  const pointsDiscount = pointsToUse;
  const membershipDiscountRate = tierData?.tier ? Number(tierData.tier.discountRate) : 0;
  const membershipDiscount = membershipDiscountRate > 0 ? Math.floor(subtotal * membershipDiscountRate / 100) : 0;
  const total = Math.max(0, subtotal + shippingFee - couponDiscount - pointsDiscount - membershipDiscount);

  // 選択商品総ポイント積立計算
  // ランク別ポイント倍率 (tier.pointRate: デフォルト1倍、上位ランクはより高い)
  const tierPointRate = tierData?.tier ? Number((tierData.tier as any).pointRate ?? 1) : 1;
  const totalEarnedPoints = displayCartItems?.reduce((sum: number, item: any) => {
    const itemPrice = Math.round(getItemPrice(item));
    const pointsPercent = (item.product as any)?.pointsPercent ?? 1;
    return sum + Math.floor(itemPrice * pointsPercent / 100 * tierPointRate);
  }, 0) || 0;

  // Format postal code with auto-lookup
  const handlePostalCodeChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    if (cleaned.length <= 7) {
      setShippingForm((prev) => ({
        ...prev,
        postalCode: cleaned,
      }));
      
      // Auto-lookup when 7 digits are entered
      if (cleaned.length === 7) {
        setIsLookingUpPostalCode(true);
        const result = lookupPostalCode(cleaned);
        setIsLookingUpPostalCode(false);
        
        if (result) {
          setShippingForm((prev) => ({
            ...prev,
            prefecture: result.prefecture,
            city: result.city,
            address1: result.town,
          }));
        }
      }
    }
  };

  // Format phone number
  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^0-9-]/g, "");
    setShippingForm((prev) => ({
      ...prev,
      phone: cleaned,
    }));
  };

  // Validate form
  const isFormValid = () => {
    return (
      shippingForm.recipientNameKanji.trim() !== "" &&
      shippingForm.recipientNameHiragana.trim() !== "" &&
      shippingForm.email.trim() !== "" &&
      shippingForm.phone.trim() !== "" &&
      shippingForm.postalCode.length === 7 &&
      shippingForm.prefecture !== "" &&
      shippingForm.city.trim() !== "" &&
      shippingForm.address1.trim() !== "" &&
      (noBuildingChecked || shippingForm.address2.trim() !== "")
    );
  };

  // Handle checkout
  const handleCheckout = async () => {
    // 重複ナビゲーション防止フラグ設定
    (window as any).__PAYMENT_IN_PROGRESS__ = true;
    
    if (!isFormValid()) {
      (window as any).__PAYMENT_IN_PROGRESS__ = false;
      setError("配送先情報をすべて入力してください。");
      // Scroll to first empty required field for mobile UX
      const requiredFields = [
        { value: shippingForm.recipientNameKanji.trim(), id: 'recipientNameKanji' },
        { value: shippingForm.recipientNameHiragana.trim(), id: 'recipientNameHiragana' },
        { value: shippingForm.email.trim(), id: 'email' },
        { value: shippingForm.phone.trim(), id: 'phone' },
        { value: shippingForm.postalCode.length === 7 ? shippingForm.postalCode : '', id: 'postalCode' },
        { value: shippingForm.prefecture, id: 'prefecture' },
        { value: shippingForm.city.trim(), id: 'city' },
        { value: shippingForm.address1.trim(), id: 'address1' },
      ];
      const firstEmpty = requiredFields.find(f => !f.value);
      if (firstEmpty) {
        const el = document.getElementById(firstEmpty.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => el.focus(), 500);
        }
      }
      return;
    }

    if (!displayCartItems || displayCartItems.length === 0) {
      (window as any).__PAYMENT_IN_PROGRESS__ = false;
      setError("カートが空です。");
      return;
    }

    if (!paymentMethod) {
      (window as any).__PAYMENT_IN_PROGRESS__ = false;
      setError("お支払い方法を選択してください。");
      document.getElementById('payment-method-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setError(null);
    setIsProcessing(true);

    // Save new address if requested (when manually entering, not selecting saved)
    if (selectedAddressId === null && saveNewAddress && shippingForm.postalCode && shippingForm.prefecture) {
      try {
        await createAddressMutation.mutateAsync({
          recipientNameKanji: shippingForm.recipientNameKanji,
          recipientNameHiragana: shippingForm.recipientNameHiragana,
          postalCode: shippingForm.postalCode,
          prefecture: shippingForm.prefecture,
          city: shippingForm.city,
          address1: shippingForm.address1,
          address2: shippingForm.address2 || undefined,
          phone: shippingForm.phone,
          isDefault: saveAsDefault,
        });
      } catch (e) {
        // Non-blocking: continue checkout even if address save fails
        console.error('Failed to save address:', e);
      }
    }

    const items = displayCartItems.map((item: any) => {
      const product = item.product;
      const cartItem = item.cartItem;
      const qty = cartItem?.quantity || item.quantity || 1;
      const totalPrice = Math.round(getItemPrice(item));
      const unitPrice = qty > 0 ? Math.round(totalPrice / qty) : totalPrice;
      return {
        productId: product?.id || item.productId,
        name: product?.name || '',
        nameJa: product?.nameJa || '',
        price: unitPrice,
        quantity: qty,
        imageUrl: product?.imageUrl || undefined,
        priceTierId: cartItem?.priceTierId || item.priceTierId || undefined,
        tierName: item.priceTier ? `${item.priceTier.quantity}個セット` : undefined,
      };
    });

    // CookiePay payment - create pending order then launch popup
    if (paymentMethod === 'cookiepay') {
      createCookiePayOrder.mutate({
        items,
        shippingAddress: {
          recipientName: shippingForm.recipientNameKanji,
          postalCode: shippingForm.postalCode,
          prefecture: shippingForm.prefecture,
          city: shippingForm.city,
          address1: shippingForm.address1,
          address2: shippingForm.address2 || undefined,
          phone: shippingForm.phone,
        },
        email: shippingForm.email,
        pointsUsed: pointsToUse,
        couponDiscount: appliedCoupon?.discountAmount || 0,
      });
      return;
    }

    // PayPal payment
    if (paymentMethod === 'paypal') {
      createPayPalOrder.mutate({
        items,
        shippingAddress: {
          recipientName: shippingForm.recipientNameKanji,
          postalCode: shippingForm.postalCode,
          prefecture: shippingForm.prefecture,
          city: shippingForm.city,
          address1: shippingForm.address1,
          address2: shippingForm.address2 || undefined,
          phone: shippingForm.phone,
        },
        pointsUsed: pointsToUse,
        couponDiscount: appliedCoupon?.discountAmount || 0,
        cartItemIds: selectedCartItemIds || undefined,
      });
      return;
    }

    // Bank transfer payment - go directly to order confirmation
    if (paymentMethod === 'bank_transfer' || paymentMethod === 'payoneer') {
      createBankTransferOrder.mutate({
        items,
        shippingAddress: {
          recipientName: shippingForm.recipientNameKanji,
          postalCode: shippingForm.postalCode,
          prefecture: shippingForm.prefecture,
          city: shippingForm.city,
          address1: shippingForm.address1,
          address2: shippingForm.address2 || undefined,
          phone: shippingForm.phone,
        },
        email: shippingForm.email,
        pointsUsed: pointsToUse,
        couponDiscount: appliedCoupon?.discountAmount || 0,
      });
    } else {
      // Online payment (Stripe / Airwallex / 2Checkout)
      createCheckoutSession.mutate({
        items,
        shippingAddress: {
          recipientName: shippingForm.recipientNameKanji,
          postalCode: shippingForm.postalCode,
          prefecture: shippingForm.prefecture,
          city: shippingForm.city,
          address1: shippingForm.address1,
          address2: shippingForm.address2 || undefined,
          phone: shippingForm.phone,
        },
        pointsUsed: pointsToUse,
        couponDiscount: appliedCoupon?.discountAmount || 0,
        membershipDiscount: membershipDiscount || 0,
        cartItemIds: selectedCartItemIds || undefined,
      });
    }
  };

  if (authLoading || cartLoading) {
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

  if (!user) {
    return null;
  }

  if (!displayCartItems || displayCartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-6 md:py-8">
          <p className="text-sm text-gray-500 mb-4">
            <span className="hover:text-gray-700 cursor-pointer" onClick={() => setLocation("/")}>ホーム</span>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="text-gray-800 font-medium">ご注文手続き</span>
          </p>
          <div className="flex gap-6 lg:gap-8 items-start">
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>
            <div className="flex-1 min-w-0">
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h1 className="text-xl font-bold mb-2 text-gray-800">カートが空です</h1>
                <p className="text-gray-500 mb-6">商品をカートに追加してからお手続きください</p>
                <Button className="bg-primary hover:bg-primary/90" onClick={() => setLocation("/")}>商品を探す</Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <div className="container py-6 md:py-8">
          {/* Breadcrumb */}
          <p className="text-sm text-gray-500 mb-4">
            <span className="hover:text-gray-700 cursor-pointer" onClick={() => setLocation("/")}>ホーム</span>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="hover:text-gray-700 cursor-pointer" onClick={() => setLocation("/cart")}>お買物かご</span>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="text-gray-800 font-medium">ご注文手続き</span>
          </p>

          <div className="flex gap-6 lg:gap-8 items-start">
            {/* Sidebar */}
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Header Banner */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="p-4 sm:p-5" style={{backgroundColor: '#fffbeb'}}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">ご注文手続き</h1>
                      <p className="text-xs text-primary font-medium mt-0.5">配送先情報とお支払い方法を入力してご注文を完了してください</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">商品数</div>
                      <div className="text-2xl font-bold text-primary">{displayCartItems.length}<span className="text-xs font-normal text-gray-500 ml-0.5">点</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Shipping Form */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
              {/* Customer Info Section */}
              <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><span className="w-1 h-4 bg-primary rounded-full inline-block"></span>お客様情報</h2>
              
              <div className="space-y-4 mb-8">
                {/* お名前（漢字） — 姓 / 名 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 items-start">
                  <Label className="text-gray-700 text-sm pt-3">
                    お名前（漢字） <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">姓</Label>
                        <Input
                          id="recipientNameKanji"
                          value={shippingForm.recipientNameKanji.split("　")[0] || ""}
                          onChange={(e) => {
                            const sei = e.target.value;
                            const mei = shippingForm.recipientNameKanji.split("　")[1] || "";
                            setShippingForm((prev) => ({ ...prev, recipientNameKanji: sei + "　" + mei }));
                          }}
                          placeholder="例：山田"
                          className={`w-full bg-gray-100 border-gray-300 ${validationErrors.recipientNameKanji ? "border-red-500" : ""}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">名</Label>
                        <Input
                          value={shippingForm.recipientNameKanji.split("　")[1] || ""}
                          onChange={(e) => {
                            const sei = shippingForm.recipientNameKanji.split("　")[0] || "";
                            const mei = e.target.value;
                            setShippingForm((prev) => ({ ...prev, recipientNameKanji: sei + "　" + mei }));
                          }}
                          placeholder="例：太郎"
                          className={`w-full bg-gray-100 border-gray-300 ${validationErrors.recipientNameKanji ? "border-red-500" : ""}`}
                        />
                      </div>
                    </div>
                    {validationErrors.recipientNameKanji && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.recipientNameKanji}</p>
                    )}
                  </div>
                </div>
                {/* フリガナ（カタカナ） — セイ / メイ */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 items-start">
                  <Label className="text-gray-700 text-sm pt-3">
                    フリガナ（カタカナ） <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">セイ</Label>
                        <Input
                          id="recipientNameHiragana"
                          value={shippingForm.recipientNameHiragana.split("　")[0] || ""}
                          onChange={(e) => {
                            const sei = hiraganaToKatakana(e.target.value);
                            const mei = shippingForm.recipientNameHiragana.split("　")[1] || "";
                            setShippingForm((prev) => ({ ...prev, recipientNameHiragana: sei + "　" + mei }));
                            validators.validateNameHiraganaField(sei + "　" + mei);
                          }}
                          placeholder="例：ヤマダ"
                          className={`w-full bg-gray-100 border-gray-300 ${validationErrors.recipientNameHiragana ? "border-red-500" : ""}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">メイ</Label>
                        <Input
                          value={shippingForm.recipientNameHiragana.split("　")[1] || ""}
                          onChange={(e) => {
                            const sei = shippingForm.recipientNameHiragana.split("　")[0] || "";
                            const mei = hiraganaToKatakana(e.target.value);
                            setShippingForm((prev) => ({ ...prev, recipientNameHiragana: sei + "　" + mei }));
                            validators.validateNameHiraganaField(sei + "　" + mei);
                          }}
                          placeholder="例：タロウ"
                          className={`w-full bg-gray-100 border-gray-300 ${validationErrors.recipientNameHiragana ? "border-red-500" : ""}`}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">※カタカナで入力してください</p>
                    {validationErrors.recipientNameHiragana && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.recipientNameHiragana}</p>
                    )}
                  </div>
                </div>
                {/* Email */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 items-start">
                  <Label htmlFor="email" className="text-gray-700 text-sm pt-3">
                    メールアドレス <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-2">
                    <Input
                      id="email"
                      type="email"
                      value={shippingForm.email}
                      onChange={(e) =>
                        setShippingForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="メールアドレスを入力してください"
                      className="w-full bg-gray-100 border-gray-300"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 items-start">
                  <Label htmlFor="phone" className="text-gray-700 text-sm pt-3">
                    電話番号 <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-2">
                    <Input
                      id="phone"
                      value={shippingForm.phone}
                      onChange={(e) => {
                        handlePhoneChange(e.target.value);
                        validators.validatePhoneField(e.target.value);
                      }}
                      placeholder="電話番号を入力してください"
                      className={`w-full bg-gray-100 border-gray-300 ${validationErrors.phone ? "border-red-500" : ""}`}
                    />
                    {validationErrors.phone && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Info Section */}
              <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2 mt-6 pt-5 border-t"><MapPin className="w-4 h-4 text-primary" />お届け先情報</h2>
              
              {/* Saved Addresses Selection */}
              {savedAddresses.length > 0 && (
                <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">保存された住所から選択</h3>
                  <div className="space-y-2">
                    {savedAddresses.map((address) => (
                      <label
                        key={address.id}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedAddressId === address.id
                            ? "bg-blue-100 border-blue-400"
                            : "bg-white border-gray-300 hover:border-blue-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          checked={selectedAddressId === address.id}
                          onChange={() => handleAddressSelect(address.id)}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 flex items-center gap-2">
                            <span>{address.recipientNameKanji} ({address.recipientNameHiragana})</span>
                            {address.label && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{address.label}</span>
                            )}
                            {address.isDefault && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">デフォルト</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            〒{address.postalCode} {address.prefecture}{address.city}{address.address1}
                            {address.address2 && ` ${address.address2}`}
                          </div>
                          <div className="text-sm text-gray-600">電話: {address.phone}</div>
                        </div>
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={handleManualEntry}
                      className={`w-full p-3 border rounded-lg text-left transition-colors ${
                        selectedAddressId === null
                          ? "bg-blue-100 border-blue-400"
                          : "bg-white border-gray-300 hover:border-blue-300"
                      }`}
                    >
                      <div className="font-medium text-gray-800">新しい住所を入力</div>
                      <div className="text-sm text-gray-600 mt-1">手動で配送先情報を入力します</div>
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {/* Postal Code */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 items-start">
                  <Label htmlFor="postalCode" className="text-gray-700 text-sm pt-3">
                    郵便番号 <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-2">
                    <Input
                      id="postalCode"
                      value={shippingForm.postalCode}
                      onChange={(e) => handlePostalCodeChange(e.target.value)}
                      onBlur={(e) => validators.validatePostalCodeField(e.target.value)}
                      placeholder="郵便番号"
                      className={`w-full bg-gray-100 border-gray-300 ${validationErrors.postalCode ? "border-red-500" : ""}`}
                      maxLength={7}
                      disabled={isLookingUpPostalCode}
                    />
                    {isLookingUpPostalCode && (
                      <p className="text-sm text-gray-500 mt-1">住所を検索中...</p>
                    )}
                    {validationErrors.postalCode && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.postalCode}</p>
                    )}
                  </div>
                </div>

                {/* Prefecture */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 items-start">
                  <Label htmlFor="prefecture" className="text-gray-700 text-sm pt-3">
                    都道府県 <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-2">
                    <select
                      id="prefecture"
                      value={shippingForm.prefecture}
                      onChange={(e) => {
                        setShippingForm((prev) => ({
                          ...prev,
                          prefecture: e.target.value,
                        }));
                        validators.validatePrefectureField(e.target.value);
                      }}
                      className={`w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md ${validationErrors.prefecture ? "border-red-500" : ""}`}
                    >
                      <option value="">---選択してください---</option>
                      {PREFECTURES.map((pref) => (
                        <option key={pref} value={pref}>
                          {pref}
                        </option>
                      ))}
                    </select>
                    {validationErrors.prefecture && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.prefecture}</p>
                    )}
                  </div>
                </div>

                {/* City */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 items-start">
                  <Label htmlFor="city" className="text-gray-700 text-sm pt-3">
                    市区町村 <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-2">
                    <Input
                      id="city"
                      value={shippingForm.city}
                      onChange={(e) => {
                        setShippingForm((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }));
                        validators.validateCityField(e.target.value);
                      }}
                      placeholder="市区町村"
                      className={`w-full bg-gray-100 border-gray-300 ${validationErrors.city ? "border-red-500" : ""}`}
                    />
                    {validationErrors.city && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.city}</p>
                    )}
                  </div>
                </div>

                {/* Address 1 (丁目番地) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 items-start">
                  <Label htmlFor="address1" className="text-gray-700 text-sm pt-3">
                    丁目番地 <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-2">
                    <Input
                      id="address1"
                      value={shippingForm.address1}
                      onChange={(e) => {
                        setShippingForm((prev) => ({
                          ...prev,
                          address1: e.target.value,
                        }));
                        validators.validateAddress1Field(e.target.value);
                      }}
                      placeholder="丁目番地"
                      className={`w-full bg-gray-100 border-gray-300 ${validationErrors.address1 ? "border-red-500" : ""}`}
                    />
                    {validationErrors.address1 && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.address1}</p>
                    )}
                  </div>
                </div>

                {/* Address 2 (建物名・部屋番号) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 items-start">
                  <Label htmlFor="address2" className="text-gray-700 text-sm pt-3">
                    建物名・部屋番号 <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-2 space-y-2">
                    <Input
                      id="address2"
                      value={shippingForm.address2}
                      onChange={(e) =>
                        setShippingForm((prev) => ({
                          ...prev,
                          address2: e.target.value,
                        }))
                      }
                      placeholder="例: マンション901　苑名太郎"
                      className="w-full bg-gray-100 border-gray-300"
                      disabled={noBuildingChecked}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="noBuilding"
                        checked={noBuildingChecked}
                        onChange={(e) => {
                          setNoBuildingChecked(e.target.checked);
                          if (e.target.checked) {
                            setShippingForm((prev) => ({
                              ...prev,
                              address2: "",
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <label htmlFor="noBuilding" className="text-sm text-gray-600">
                        建物名・部屋番号なし
                      </label>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="text-sm text-red-500 mt-6 border-t pt-4">
                  <p>※建物名・部屋番号を入力するか、なしにチェックを入れてください</p>
                  <p>※宛名がある場合は必ずご記入ください</p>
                </div>

                {/* Save address option - only shown when entering new address */}
                {selectedAddressId === null && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="saveNewAddress"
                        checked={saveNewAddress}
                        onChange={(e) => {
                          setSaveNewAddress(e.target.checked);
                          if (!e.target.checked) setSaveAsDefault(false);
                        }}
                        className="w-4 h-4 rounded border-gray-300 accent-green-600"
                      />
                      <label htmlFor="saveNewAddress" className="text-sm font-medium text-gray-700 cursor-pointer">
                        この住所をマイページに保存する
                      </label>
                    </div>
                    {saveNewAddress && (
                      <div className="flex items-center gap-2 pl-6">
                        <input
                          type="checkbox"
                          id="saveAsDefault"
                          checked={saveAsDefault}
                          onChange={(e) => setSaveAsDefault(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 accent-green-600"
                        />
                        <label htmlFor="saveAsDefault" className="text-sm text-gray-600 cursor-pointer">
                          デフォルト住所として設定する
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
                  </div>

                  {/* Order Items */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><span className="w-1 h-4 bg-primary rounded-full inline-block"></span>ご注文内容</h2>

              <div className="divide-y">
                {displayCartItems.map((item: any, idx: number) => (
                  <div key={`${item.id || `buynow-${item.product?.id || item.productId}`}-${idx}`} className="py-4 flex gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      <OptimizedImage
                        src={item.product?.imageUrl || ''}
                        srcThumb={item.product?.imageUrlThumb || ''}
                        blurDataUrl={item.product?.blurDataUrl || ''}
                        alt={item.product?.nameJa || ''}
                        size="thumb"
                        className="w-full h-full object-cover"
                        containerClassName="w-full h-full"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{item.product?.nameJa || "商品"}</h3>
                      <p className="text-sm text-gray-500">{item.product?.name || ""}</p>
                      {(item.cartItem?.quantity || item.quantity) > 0 && (() => {
                        const totalPrice = item.product ? Math.round(getItemPrice(item)) : 0;
                        const unitPrice = item.product ? Math.round(totalPrice / (item.cartItem?.quantity || 1)) : 0;
                        return (
                          <p className="text-sm text-blue-600 mt-1">
                            {formatPrice(unitPrice)} × {item.cartItem?.quantity || item.quantity}
                          </p>
                        );
                      })()}
                      {/* 割引金額表示 */}
                      {(() => {
                        const originalPrice = (item.product as any)?.originalPrice;
                        if (originalPrice && originalPrice > 0) {
                          const totalPrice = Math.round(getItemPrice(item));
                          const qty = item.cartItem?.quantity || item.quantity || 1;
                          const originalTotal = originalPrice * qty;
                          const discountAmt = originalTotal - totalPrice;
                          if (discountAmt > 0) {
                            return (
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-sm font-bold text-primary">{formatPrice(totalPrice)}</span>
                                <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">-{formatPrice(discountAmt)}</span>
                              </div>
                            );
                          }
                        }
                        return (
                          <div className="mt-1">
                            <span className="text-sm font-bold text-primary">{formatPrice(Math.round(getItemPrice(item)))}</span>
                          </div>
                        );
                      })()}
                      {/* クーポン割引 */}
                      {appliedCoupon && (() => {
                        const itemPrice = Math.round(getItemPrice(item));
                        let itemCouponDiscount = 0;
                        if (appliedCoupon.discountType === 'percentage') {
                          itemCouponDiscount = Math.floor(itemPrice * parseFloat(appliedCoupon.discountValue) / 100);
                        } else {
                          if (subtotal > 0) {
                            itemCouponDiscount = Math.floor(couponDiscount * (itemPrice / subtotal));
                          }
                        }
                        if (itemCouponDiscount > 0) {
                          return (
                            <p className="text-xs text-pink-600 mt-0.5 font-medium">
                              <Ticket className="inline w-3 h-3 mr-0.5" />
                              クーポン割引 -{formatPrice(itemCouponDiscount)}
                            </p>
                          );
                        }
                        return null;
                      })()}
                      {/* ポイント積立 + ランクバッジ */}
                      {(() => {
                        const itemPrice = Math.round(getItemPrice(item));
                        const pointsPercent = (item.product as any)?.pointsPercent ?? 1;
                        const earnedPoints = Math.floor(itemPrice * pointsPercent / 100 * tierPointRate);
                        const tier = tierData?.tier;
                        if (earnedPoints > 0) {
                          return (
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <p className="text-xs text-amber-600">
                                <span className="font-medium">{earnedPoints.toLocaleString()}P</span> ポイント積立
                              </p>
                              {tier && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: (tier as any).color + '22', color: (tier as any).color }}
                                >
                                  {(tier as any).icon === 'Crown' ? <Crown className="w-3 h-3" /> :
                                   (tier as any).icon === 'Gem' ? <Gem className="w-3 h-3" /> :
                                   <Star className="w-3 h-3" />}
                                  {(tier as any).nameKo || (tier as any).name}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <div className="rounded-xl border border-gray-200 bg-white p-5 sticky top-4">
                    {/* Payment Information Section */}
                    <div id="payment-method-section" className="mb-4 pb-4 border-b">
                      <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-primary rounded-full inline-block"></span>お支払い情報</h2>
                      <PaymentMethodSelector
                        selected={paymentMethod}
                        onChange={setPaymentMethod}
                      />
                    </div>
              
              {/* Coupon Code Section */}
              <div className="mb-4 pb-4 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <Ticket className="w-4 h-4 text-pink-600" />
                  <h3 className="text-sm font-bold text-gray-800">クーポンコード</h3>
                </div>
                {appliedCoupon ? (
                  <div className="space-y-2">
                    <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-pink-700">{appliedCoupon.nameJa}</p>
                            <p className="text-xs text-pink-600">コード: {appliedCoupon.code}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setAppliedCoupon(null);
                            setCouponCode('');
                            toast.info('クーポンを取り消しました');
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"
                          title="クーポンを取り消す"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between mt-2 text-sm font-medium text-pink-700">
                        <span>クーポン割引</span>
                        <span>-{formatPrice(appliedCoupon.discountAmount)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode('');
                        toast.info('別のクーポンコードを入力してください');
                      }}
                      className="text-xs text-pink-600 hover:text-pink-800 hover:underline transition-colors"
                    >
                      別のクーポンに変更する
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="コードを入力"
                      className="flex-1 bg-gray-100 border-gray-300 text-sm h-10 font-mono"
                    />
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={validateCoupon.isPending}
                      className="bg-white border-2 border-pink-600 text-pink-600 hover:bg-pink-50 px-3 text-sm font-medium h-10"
                    >
                      {validateCoupon.isPending ? '確認中...' : '適用'}
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Store Points Section */}
              <div className="mb-6 pb-6 border-b">
                <h3 className="text-sm font-bold text-gray-800 mb-3">
                  ストアポイント
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">保有ポイント</span>
                    <span className="font-bold text-pink-600">{(pointsBalance?.balance || 0).toLocaleString()}pt</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="使用ポイント"
                        value={pointsToUse || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10) || 0;
                          const maxSpendable = Math.min(
                            pointsBalance?.balance || 0,
                            Math.floor(subtotal * 0.3)
                          );
                          setPointsToUse(Math.min(Math.max(0, value), maxSpendable));
                        }}
                        min="0"
                        max={Math.min(pointsBalance?.balance || 0, Math.floor(subtotal * 0.3))}
                        className="text-sm"
                      />
                    </div>
                    {pointsToUse > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setPointsToUse(0);
                          toast.info('ポイント使用を取り消しました');
                        }}
                        className="text-sm whitespace-nowrap border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        リセット
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const maxSpendable = Math.min(
                            pointsBalance?.balance || 0,
                            Math.floor(subtotal * 0.3)
                          );
                          if (maxSpendable > 0) {
                            setPointsToUse(maxSpendable);
                            toast.success(`${maxSpendable.toLocaleString()}pt を適用しました`);
                          } else {
                            toast.error('使用可能なポイントがありません');
                          }
                        }}
                        className="text-sm whitespace-nowrap"
                      >
                        全て使う
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    ※ 最大{Math.floor(subtotal * 0.3).toLocaleString()}pt（注文金額の30%）まで使用できます
                  </p>
                  
                  {pointsToUse > 0 && (
                    <div className="bg-pink-50 border border-pink-200 rounded p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-pink-600 font-medium">
                          {pointsToUse.toLocaleString()}pt を使用します（-{formatPrice(pointsToUse)}）
                        </p>
                        <button
                          onClick={() => {
                            setPointsToUse(0);
                            toast.info('ポイント使用を取り消しました');
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-red-50"
                          title="ポイント使用を取り消す"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Order Content */}
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-primary rounded-full inline-block"></span>ご注文内容</h2>

              <div className="space-y-3 mb-6 pb-6 border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">小計</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">送料</span>
                  <span className="font-medium">
                    {shippingFee === 0 ? "無料" : formatPrice(shippingFee)}
                  </span>
                </div>
                {membershipDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-600">会員ランク割引 ({tierData?.tier?.name} {membershipDiscountRate}%)</span>
                    <span className="font-medium text-purple-600">-{formatPrice(membershipDiscount)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-pink-600">クーポン割引</span>
                    <span className="font-medium text-pink-600">-{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                {pointsToUse > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">ポイント割引</span>
                    <span className="font-medium text-green-600">-{formatPrice(pointsToUse)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-2 py-3 bg-amber-50 rounded-xl px-4">
                <span className="text-base font-bold text-gray-800">合計</span>
                <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
              </div>
              {totalEarnedPoints > 0 && (
                <div className="mb-4 bg-amber-50 rounded-xl px-4 py-2">
                  <div className="flex justify-between text-xs text-amber-600 font-medium">
                    <span>🌟 今回のポイント積立</span>
                    <span className="font-bold">+{totalEarnedPoints.toLocaleString()}P</span>
                  </div>
                  {tierData?.tier && (
                    <div className="flex justify-end mt-1">
                      <span
                        className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: (tierData.tier as any).color + '22', color: (tierData.tier as any).color }}
                      >
                        {(tierData.tier as any).icon === 'Crown' ? <Crown className="w-3 h-3" /> :
                         (tierData.tier as any).icon === 'Gem' ? <Gem className="w-3 h-3" /> :
                         <Star className="w-3 h-3" />}
                        {(tierData.tier as any).nameKo || (tierData.tier as any).name}ランク
                      </span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl text-base"
              >
                {isProcessing ? "処理中..." : "注文する"}
              </Button>

              <p className="text-xs text-gray-600 mt-3 leading-relaxed" style={{fontSize: '10px', textAlign: 'left'}}>
                ※ご注文することにより、注文者は当社の<a href="#" className="text-pink-600 hover:underline">利用規約</a>および<a href="#" className="text-pink-600 hover:underline">プライバシー規約</a>に同意したものとみなされます。
              </p>

              <div className="mt-4 space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span style={{fontSize: '11px'}}>不良品や次包ミスの返品・交換を無償対応</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span style={{fontSize: '11px'}}>クレジットカード決済・銀行振込利用可</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span style={{fontSize: '11px'}}>プライバシー保護◎・100%正規品保証</span>
                </div>
              </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* Payment Error Dialog */}
      <PaymentErrorDialog
        open={showErrorDialog}
        errorInfo={paymentErrorInfo}
        onRetry={handlePaymentRetry}
        onChangePaymentMethod={handleChangePaymentMethod}
        onClose={() => setShowErrorDialog(false)}
        isRetrying={isRetrying}
      />
    </div>
  );
}
