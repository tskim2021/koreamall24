import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense } from "react";
import { CompareProvider } from "./contexts/CompareContext";
import AdminGuard from "./components/AdminGuard";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

// ─── Eagerly loaded (critical path) ───────────────────────────────────────────
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail"; // eager: 상품 페이지는 즉시 로드
import Category from "./pages/Category"; // eager: 카테고리 페이지
import RankingTop100 from "./pages/RankingTop100"; // eager: 랭킹 페이지
import SalePage from "./pages/SalePage"; // eager: 세일 페이지
import NewArrivals from "./pages/NewArrivals"; // eager: 신상품 페이지
import RecommendedPage from "./pages/RecommendedPage"; // eager: 추천 페이지
import Reviews from "./pages/Reviews"; // eager: 리뷰 페이지
import Search from "./pages/Search"; // eager: 검색 페이지
import AdminBar from "./components/AdminBar";
import SearchConsoleMetaTags from "./components/SearchConsoleMetaTags";
import CompareBar from "./components/CompareBar";

// ─── Lazy loaded (non-critical) ───────────────────────────────────────────────
const Cart = lazy(() => import("./pages/Cart"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const MyPage = lazy(() => import("./pages/MyPage"));
const MyOrder = lazy(() => import("./pages/MyOrder"));
const MyCartOrders = lazy(() => import("./pages/MyCartOrders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutCancel = lazy(() => import("./pages/CheckoutCancel"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const BbsNotice = lazy(() => import("./pages/BbsNotice"));
const BbsNoticeDetail = lazy(() => import("./pages/BbsNoticeDetail"));
const BbsInquiry = lazy(() => import("./pages/BbsInquiry"));
const BbsInquiryDetail = lazy(() => import("./pages/BbsInquiryDetail"));
const BbsInquiryCreate = lazy(() => import("./pages/BbsInquiryCreate"));
const BbsEvent = lazy(() => import("./pages/BbsEvent"));
const BbsEventDetail = lazy(() => import("./pages/BbsEventDetail"));
const MypageCoupons = lazy(() => import("./pages/MypageCoupons"));
const MypagePoints = lazy(() => import("./pages/MypagePoints"));
const MyPageProfile = lazy(() => import("./pages/MyPageProfile"));
const MypageAddresses = lazy(() => import("./pages/MypageAddresses"));
const MypageInquiries = lazy(() => import("./pages/MypageInquiries"));
const MypageWishlist = lazy(() => import("./pages/MypageWishlist"));
const MypageReviews = lazy(() => import("./pages/MypageReviews"));
const MypageMembership = lazy(() => import("./pages/MypageMembership"));
const EmailPreferencesPage = lazy(() => import("./pages/mypage/EmailPreferences"));
const RecentlyViewedPage = lazy(() => import("./pages/mypage/RecentlyViewed"));
const ReviewDetail = lazy(() => import("./pages/ReviewDetail"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const AddressManagement = lazy(() => import("./pages/AddressManagement"));
const ReviewWrite = lazy(() => import("./pages/ReviewWrite"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LegalNotice = lazy(() => import("./pages/LegalNotice"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const FirstTimeCustomer = lazy(() => import("./pages/FirstTimeCustomer"));
const Compare = lazy(() => import("./pages/Compare"));
const OrderComplete = lazy(() => import("./pages/OrderComplete"));
const Orders = lazy(() => import("./pages/Orders"));
const FAQ = lazy(() => import("./pages/FAQ"));
const CustomerSupport = lazy(() => import("./pages/CustomerSupport"));
const MypageNotifications = lazy(() => import("./pages/MypageNotifications"));

// ─── Admin pages (heavy, always lazy) ────────────────────────────────────────
const AdminCustomers = lazy(() => import("./pages/admin/Customers"));
const AdminCustomerDetail = lazy(() => import("./pages/admin/CustomerDetail"));
const AdminWithdrawnCustomers = lazy(() => import("./pages/admin/WithdrawnCustomers"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const CartOrders = lazy(() => import("./pages/admin/CartOrders"));
const CartOrderDetail = lazy(() => import("./pages/admin/CartOrderDetail"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminDashboardPage = lazy(() => import("./pages/admin/Dashboard"));
const AdminCategories = lazy(() => import("./pages/admin/Categories"));
const AdminBanners = lazy(() => import("./pages/admin/Banners"));
const AdminAnnouncements = lazy(() => import("./pages/admin/Announcements"));
const AdminInquiries = lazy(() => import("./pages/admin/Inquiries"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const AdminSiteSettings = lazy(() => import("./pages/admin/SiteSettings"));
const AdminProductDetail = lazy(() => import("./pages/admin/ProductDetail"));
const AdminProductNew = lazy(() => import("./pages/admin/ProductNew"));
const AdminProductPreviewPage = lazy(() => import("./pages/admin/ProductPreviewPage"));
const AdminSalesStats = lazy(() => import("./pages/admin/SalesStats"));
const AdminProductAnalysis = lazy(() => import("./pages/admin/ProductAnalysis"));
const AdminOrderDetail = lazy(() => import("./pages/admin/OrderDetail"));
const AdminCoupons = lazy(() => import("./pages/admin/Coupons"));
const AdminProductQuestions = lazy(() => import("./pages/admin/ProductQuestions"));
const AdminChatbot = lazy(() => import("./pages/admin/AdminChatbot"));
const AdminAISettings = lazy(() => import("./pages/admin/AdminAISettings"));
const AdminLegalNotice = lazy(() => import("./pages/admin/AdminLegalNotice"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminPaymentSettings = lazy(() => import("./pages/admin/AdminPaymentSettings"));
const AdminReviewsPage = lazy(() => import("./pages/admin/Reviews"));
const AdminPointSettings = lazy(() => import("./pages/admin/PointSettings"));
const AdminPointHistory = lazy(() => import("./pages/admin/PointHistory"));
const AdminEmailManagement = lazy(() => import("./pages/admin/EmailManagement"));
const AdminEmailPreviewStudio = lazy(() => import("./pages/admin/EmailPreviewStudio"));
const AdminEmailTemplateManagement = lazy(() => import("./pages/admin/EmailTemplateManagement"));
const GmailInbox = lazy(() => import("./pages/admin/GmailInbox"));
const AdminSearchConsole = lazy(() => import("./pages/admin/SearchConsole"));
const AdminBulkEmail = lazy(() => import("./pages/admin/BulkEmail"));
const AdminNotificationsManagement = lazy(() => import("./pages/admin/NotificationsManagement"));
const AdminMembershipTiers = lazy(() => import("./pages/admin/MembershipTiers"));
const AdminReferralSettings = lazy(() => import("./pages/admin/ReferralSettings"));
const AdminMemberStats = lazy(() => import("./pages/admin/MemberStats"));
const AdminOrdersNew = lazy(() => import("./pages/AdminOrdersNew"));

// ─── Lazy loaded components (heavy) ──────────────────────────────────────────
const FloatingChatbot = lazy(() => import("./components/FloatingChatbot"));
const MobileBottomNav = lazy(() => import("./components/MobileBottomNav"));

// ─── Page loading fallback ────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
    </div>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/product/:id" component={ProductDetail} />
        <Route path="/products/:id">{(params: { id: string }) => <Redirect to={`/product/${params.id}`} />}</Route>
        <Route path="/cart" component={Cart} />
        <Route path="/search" component={Search} />
        <Route path="/category/:slug" component={Category} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/mypage" component={MyPage} />
        <Route path="/mypage/order" component={MyCartOrders} />
        <Route path="/mypage/order-legacy" component={MyOrder} />
        <Route path="/mypage/order/:id" component={OrderDetail} />
        <Route path="/mypage/profile" component={MyPageProfile} />
        <Route path="/mypage/profile-edit" component={ProfileEdit} />
        <Route path="/mypage/addresses" component={AddressManagement} />
        <Route path="/mypage/coupons" component={MypageCoupons} />
        <Route path="/mypage/points" component={MypagePoints} />
        <Route path="/mypage/inquiries" component={MypageInquiries} />
        <Route path="/mypage/wishlist" component={MypageWishlist} />
        <Route path="/mypage/reviews" component={MypageReviews} />
        <Route path="/mypage/membership" component={MypageMembership} />
        <Route path="/mypage/email-preferences" component={EmailPreferencesPage} />
        <Route path="/mypage/notifications" component={MypageNotifications} />
        <Route path="/mypage/recently-viewed" component={RecentlyViewedPage} />
        <Route path="/mypage/review-write" component={ReviewWrite} />
        <Route path="/reviews" component={Reviews} />
        <Route path="/reviews/:id">{() => <ReviewDetail />}</Route>
        <Route path="/review"><Redirect to="/reviews" /></Route>
        <Route path="/review/:id">{() => <ReviewDetail />}</Route>
        {/* Checkout routes */}
        <Route path="/checkout" component={Checkout} />
        <Route path="/checkout/success" component={CheckoutSuccess} />
        <Route path="/checkout/cancel" component={CheckoutCancel} />
        <Route path="/order-complete" component={OrderComplete} />
        <Route path="/orders" component={Orders} />
        <Route path="/order-confirmation/:orderId" component={OrderConfirmation} />
        <Route path="/faq" component={FAQ} />
        {/* BBS routes */}
        <Route path="/bbs/notice" component={BbsNotice} />
        <Route path="/bbs/notice/:id" component={BbsNoticeDetail} />
        <Route path="/bbs/inquiry" component={BbsInquiry} />
        <Route path="/bbs/inquiry/create" component={BbsInquiryCreate} />
        <Route path="/bbs/inquiry/:id" component={BbsInquiryDetail} />
        <Route path="/bbs/event" component={BbsEvent} />
        <Route path="/bbs/event/:id" component={BbsEventDetail} />
        {/* Admin routes */}
        <Route path="/admin">{() => <AdminGuard><AdminDashboardPage /></AdminGuard>}</Route>
        <Route path="/admin/dashboard">{() => <AdminGuard><AdminDashboardPage /></AdminGuard>}</Route>
        <Route path="/admin/products">{() => <AdminGuard><AdminProducts /></AdminGuard>}</Route>
        <Route path="/admin/products/new">{() => <AdminGuard><AdminProductNew /></AdminGuard>}</Route>
        <Route path="/admin/products/:id/preview">{(params) => <AdminGuard><AdminProductPreviewPage /></AdminGuard>}</Route>
        <Route path="/admin/products/:id">{(params) => <AdminGuard><AdminProductDetail /></AdminGuard>}</Route>
        <Route path="/admin/cart-orders">{() => <AdminGuard><CartOrders /></AdminGuard>}</Route>
        <Route path="/admin/cart-orders/:cartGroupId">{() => <AdminGuard><CartOrderDetail /></AdminGuard>}</Route>
        <Route path="/admin/orders">{() => <AdminGuard><AdminOrders /></AdminGuard>}</Route>
        <Route path="/admin/sales-stats">{() => <AdminGuard><AdminSalesStats /></AdminGuard>}</Route>
        <Route path="/admin/orders/:id">{(params) => <AdminGuard><AdminOrderDetail /></AdminGuard>}</Route>
        <Route path="/admin/categories">{() => <AdminGuard><AdminCategories /></AdminGuard>}</Route>
        <Route path="/admin/banners">{() => <AdminGuard><AdminBanners /></AdminGuard>}</Route>
        <Route path="/admin/announcements">{() => <AdminGuard><AdminAnnouncements /></AdminGuard>}</Route>
        <Route path="/admin/inquiries">{() => <AdminGuard><AdminInquiries /></AdminGuard>}</Route>
        <Route path="/admin/events">{() => <AdminGuard><AdminEvents /></AdminGuard>}</Route>
        <Route path="/admin/settings">{() => <AdminGuard><AdminSiteSettings /></AdminGuard>}</Route>
        <Route path="/admin/customers">{() => <AdminGuard><AdminCustomers /></AdminGuard>}</Route>
        <Route path="/admin/customers/:id">{(params) => <AdminGuard><AdminCustomerDetail /></AdminGuard>}</Route>
        <Route path="/admin/withdrawn-customers">{() => <AdminGuard><AdminWithdrawnCustomers /></AdminGuard>}</Route>
        <Route path="/admin/coupons">{() => <AdminGuard><AdminCoupons /></AdminGuard>}</Route>
        <Route path="/admin/product-analysis">{() => <AdminGuard><AdminProductAnalysis /></AdminGuard>}</Route>
        <Route path="/admin/analytics">{() => <AdminGuard><AdminAnalytics /></AdminGuard>}</Route>
        <Route path="/admin/product-questions">{() => <AdminGuard><AdminProductQuestions /></AdminGuard>}</Route>
        <Route path="/admin/chatbot">{() => <AdminGuard><AdminChatbot /></AdminGuard>}</Route>
        <Route path="/admin/ai-settings">{() => <AdminGuard><AdminAISettings /></AdminGuard>}</Route>
        <Route path="/admin/legal-notice">{() => <AdminGuard><AdminLegalNotice /></AdminGuard>}</Route>
        <Route path="/admin/payment-settings">{() => <AdminGuard><AdminPaymentSettings /></AdminGuard>}</Route>
        <Route path="/admin/reviews">{() => <AdminGuard><AdminReviewsPage /></AdminGuard>}</Route>
        <Route path="/admin/point-settings">{() => <AdminGuard><AdminPointSettings /></AdminGuard>}</Route>
        <Route path="/admin/point-history">{() => <AdminGuard><AdminPointHistory /></AdminGuard>}</Route>
        <Route path="/admin/email-management">{() => <AdminGuard><AdminEmailManagement /></AdminGuard>}</Route>
        <Route path="/admin/gmail-inbox">{() => <AdminGuard><GmailInbox /></AdminGuard>}</Route>
        <Route path="/admin/email-settings">{() => <AdminGuard><AdminEmailManagement /></AdminGuard>}</Route>
        <Route path="/admin/email-logs">{() => <AdminGuard><AdminEmailManagement /></AdminGuard>}</Route>
        <Route path="/admin/email-dashboard">{() => <AdminGuard><AdminEmailManagement /></AdminGuard>}</Route>
        <Route path="/admin/email-preview">{() => <AdminGuard><AdminEmailManagement /></AdminGuard>}</Route>
        <Route path="/admin/email-preview-studio">{() => <AdminGuard><AdminEmailPreviewStudio /></AdminGuard>}</Route>
        <Route path="/admin/email-templates">{() => <AdminGuard><AdminEmailTemplateManagement /></AdminGuard>}</Route>
        <Route path="/admin/membership-tiers">{() => <AdminGuard><AdminMembershipTiers /></AdminGuard>}</Route>
        <Route path="/admin/referral-settings">{() => <AdminGuard><AdminReferralSettings /></AdminGuard>}</Route>
        <Route path="/admin/member-stats">{() => <AdminGuard><AdminMemberStats /></AdminGuard>}</Route>
        <Route path="/admin/ordersnew">{() => <AdminGuard><AdminOrdersNew /></AdminGuard>}</Route>
        <Route path="/admin/search-console">{() => <AdminGuard><AdminSearchConsole /></AdminGuard>}</Route>
        <Route path="/admin/bulk-email">{() => <AdminGuard><AdminBulkEmail /></AdminGuard>}</Route>
        <Route path="/admin/notifications">{() => <AdminGuard><AdminNotificationsManagement /></AdminGuard>}</Route>
        <Route path="/admin/notifications/advanced">{() => <AdminGuard><AdminNotificationsManagement /></AdminGuard>}</Route>
        <Route path="/admin/notifications-management">{() => <AdminGuard><AdminNotificationsManagement /></AdminGuard>}</Route>
        <Route path="/legal-notice" component={LegalNotice} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route path="/first-time-customer" component={FirstTimeCustomer} />
        <Route path="/compare" component={Compare} />
        <Route path="/ranking" component={RankingTop100} />
        <Route path="/new-arrivals" component={NewArrivals} />
        <Route path="/recommended" component={RecommendedPage} />
        <Route path="/sale" component={SalePage} />
        <Route path="/customer-support" component={CustomerSupport} />

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  // 페이지뷰 자동 추적
  return (
    <>
      <ScrollToTop />
      <AdminBar />
      <SearchConsoleMetaTags />
      <Toaster />
      <div style={{ paddingTop: isAdmin ? "32px" : "0" }}>
        <Router />
      </div>
      <CompareBar />
      <Suspense fallback={null}>
        <FloatingChatbot />
      </Suspense>
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <CompareProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </CompareProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
