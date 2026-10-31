import { int, mysqlEnum, mysqlTable, text, longtext, timestamp, varchar, decimal, boolean, uniqueIndex, index, json, tinyint } from "drizzle-orm/mysql-core";

/**
 * Site-wide settings (key-value pairs for Sentry DSN, GA4 ID, etc.)
 */
export const siteSettings = mysqlTable("siteSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;

/**
 * SEO settings for each page
 */
export const seoSettings = mysqlTable("seoSettings", {
  id: int("id").autoincrement().primaryKey(),
  page: varchar("page", { length: 100 }).notNull().unique(), // e.g., 'home', 'category', 'product'
  title: varchar("title", { length: 255 }),
  description: text("description"),
  keywords: text("keywords"),
  ogImage: varchar("ogImage", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SeoSetting = typeof seoSettings.$inferSelect;
export type InsertSeoSetting = typeof seoSettings.$inferInsert;

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  nameKanji: varchar("nameKanji", { length: 100 }),
  nameHiragana: varchar("nameHiragana", { length: 100 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  points: int("points").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("usr_email_idx").on(table.email),
  roleIdx: index("usr_role_idx").on(table.role),
  createdAtIdx: index("usr_created_at_idx").on(table.createdAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Product categories (育毛, 美容, ダイエット, 健康 etc.)
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameJa: varchar("nameJa", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Products table
 */
export const products = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(), // 7자리 숫자 상품 ID (예: 1, 2, 3...)
  categoryId: int("categoryId").notNull(),
  categoryIds: text("categoryIds"), // JSON array of category IDs (최대 3개)
  name: varchar("name", { length: 255 }).notNull(),
  nameJa: varchar("nameJa", { length: 255 }).notNull(),
  description: text("description"),
  descriptionJa: text("descriptionJa"),
  price: int("price").notNull(), // 円 (JPY) - integer only
  originalPrice: int("originalPrice"), // 円 (JPY) - integer only
  imageUrl: varchar("imageUrl", { length: 500 }),
  // Additional product images (JSON array of URLs)
  imageUrls: text("imageUrls"),
  stock: int("stock").default(100).notNull(),
  trackInventory: boolean("trackInventory").default(false).notNull(), // 재고 추적 여부 (false=미추적/무한판매, true=재고 추적)
  isTimeSale: boolean("isTimeSale").default(false).notNull(),
  isMonthlySale: boolean("isMonthlySale").default(false).notNull(),
  isPopular: boolean("isPopular").default(false).notNull(),
  isHit: boolean("isHit").default(false).notNull(),           // 히트 뱃지
  isRecommended: boolean("isRecommended").default(false).notNull(), // 추천 뱃지
  isNew: boolean("isNew").default(false).notNull(),           // 신상품 뱃지
  isDiscount: boolean("isDiscount").default(false).notNull(), // 할인 뱃지
  sortOrder: int("sortOrder").default(0).notNull(),           // 상품 정렬 순서 (음수 허용: -100이 업어, 0이 기본)
  salesCount: int("salesCount").default(0).notNull(),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0.0"),
  reviewCount: int("reviewCount").default(0).notNull(),
  // Product details for kusuriexpress-style page
  activeIngredient: varchar("activeIngredient", { length: 255 }), // 有効成分
  activeIngredientJa: varchar("activeIngredientJa", { length: 255 }),
  volume: varchar("volume", { length: 100 }), // 内容量 (e.g., "30g/箱")
  brand: varchar("brand", { length: 255 }), // ブランド
  brandJa: varchar("brandJa", { length: 255 }),
  shippingFrom: varchar("shippingFrom", { length: 100 }), // 発送国 (e.g., "シンガポール / 台湾")
  deliveryDays: varchar("deliveryDays", { length: 50 }).default("10-14"), // 配送日数
  // Detailed information
  usageMethod: text("usageMethod"), // 使用方法
  usageMethodJa: text("usageMethodJa"),
  sideEffects: text("sideEffects"), // 副作用
  sideEffectsJa: text("sideEffectsJa"),
  precautions: text("precautions"), // 注意事項
  precautionsJa: text("precautionsJa"),
  contraindications: text("contraindications"), // 使用禁忌・併用禁忌
  contraindicationsJa: text("contraindicationsJa"),
  // Set pricing (JSON array for bulk discounts)
  setPricing: text("setPricing"), // [{quantity: 10, pricePerUnit: 1258, totalPrice: 12580, discountPercent: 67}]
  // Base discount rate for automatic tier calculation (0-100)
  baseDiscountRate: int("baseDiscountRate").default(0), // 基本割引率 (0-100%)
  // Discount tiers (JSON array for quantity-range based discounts)
  discountTiers: text("discountTiers"), // [{minQty: 1, maxQty: 2, discountPercent: 0}, {minQty: 3, maxQty: 5, discountPercent: 20}]
  // Points
  pointsPercent: int("pointsPercent").default(1), // ポイント還元率 (1-5%)
  // Coupon exclusion flag
  couponExcluded: boolean("couponExcluded").default(false).notNull(), // クーポン対象外フラグ
  isVisible: boolean("isVisible").default(true).notNull(), // 노출 여부 (true=노출, false=비노출)
  // Product content (商品説明 - 사용자 상품 상세 페이지 商品説明 섹션 전용 필드, 리치텍스트 HTML)
  productContent: text("productContent"),
  // Search tags (hashtags for product search)
  searchTags: text("searchTags"), // e.g., "#ED治療 #ビアグラ #男性健康"
  // View count for popularity
  viewCount: int("viewCount").default(0).notNull(),
  // SEO meta fields (optional overrides - if null, auto-generated from product data)
  seoTitle: varchar("seoTitle", { length: 255 }),        // Custom SEO title override
  seoDescription: text("seoDescription"),                // Custom SEO description override
  seoImage: varchar("seoImage", { length: 500 }),        // Custom SEO OG image URL override
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  categoryIdx: index("prod_category_idx").on(table.categoryId),
  sortOrderIdx: index("prod_sort_order_idx").on(table.sortOrder),
  salesCountIdx: index("prod_sales_count_idx").on(table.salesCount),
  createdAtIdx: index("prod_created_at_idx").on(table.createdAt),
  isTimeSaleIdx: index("prod_is_time_sale_idx").on(table.isTimeSale),
  isMonthlySaleIdx: index("prod_is_monthly_sale_idx").on(table.isMonthlySale),
  isPopularIdx: index("prod_is_popular_idx").on(table.isPopular),
  isHitIdx: index("prod_is_hit_idx").on(table.isHit),
  isRecommendedIdx: index("prod_is_recommended_idx").on(table.isRecommended),
  isNewIdx: index("prod_is_new_idx").on(table.isNew),
  isVisibleIdx: index("prod_is_visible_idx").on(table.isVisible),
  viewCountIdx: index("prod_view_count_idx").on(table.viewCount),
}));

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Product reviews
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  orderItemId: int("orderItemId"),
  userName: varchar("userName", { length: 100 }),
  rating: int("rating").notNull(),
  title: varchar("title", { length: 255 }),
  content: text("content"),
  images: json("images").$type<string[]>(),
  isBest: tinyint("isBest").default(0).notNull(),
  bestSelectedAt: timestamp("bestSelectedAt"),
  // Review quality management
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("approved").notNull(),
  rejectionReason: text("rejectionReason"),
  reportCount: int("reportCount").default(0).notNull(),
  // Purchase verification
  isVerifiedPurchase: boolean("isVerifiedPurchase").default(false).notNull(),
  // Points awarded
  pointsAwarded: int("pointsAwarded").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productIdx: index("rev_product_idx").on(table.productId),
  userIdx: index("rev_user_idx").on(table.userId),
  statusIdx: index("rev_status_idx").on(table.status),
  createdAtIdx: index("rev_created_at_idx").on(table.createdAt),
}));

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Shopping cart items
 */
export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  priceTierId: int("priceTierId"), // 선택된 가격 옵션 ID (nullable)
  quantity: int("quantity").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("cart_user_idx").on(table.userId),
  productIdx: index("cart_product_idx").on(table.productId),
}));

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

/**
 * Banners for slider
 */
export const banners = mysqlTable("banners", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  titleJa: varchar("titleJa", { length: 255 }).notNull(),
  subtitle: varchar("subtitle", { length: 255 }),
  subtitleJa: varchar("subtitleJa", { length: 255 }),
  imageUrl: varchar("imageUrl", { length: 500 }),
  linkUrl: varchar("linkUrl", { length: 500 }),
  bgColor: varchar("bgColor", { length: 50 }).default("#f0f9ff"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  // 'main' = 메인 슬라이더, 'sidebar_top' = 사이드바 상단, 'sidebar_bottom' = 사이드바 하단
  bannerType: varchar("bannerType", { length: 50 }).default("main").notNull(),
  // 노출 기간 설정 (null이면 기간 제한 없음)
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Banner = typeof banners.$inferSelect;
export type InsertBanner = typeof banners.$inferInsert;

/**
 * Email verification codes for registration
 */
export const emailVerifications = mysqlTable("email_verifications", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailVerification = typeof emailVerifications.$inferSelect;
export type InsertEmailVerification = typeof emailVerifications.$inferInsert;

/**
 * Registered users (email/password authentication)
 */
export const registeredUsers = mysqlTable("registered_users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  nameKanji: varchar("nameKanji", { length: 100 }).notNull(),
  nameHiragana: varchar("nameHiragana", { length: 100 }).notNull(),
  // 성/이름 분리 필드 (일본 표준)
  lastNameKanji: varchar("lastNameKanji", { length: 50 }),
  firstNameKanji: varchar("firstNameKanji", { length: 50 }),
  lastNameKatakana: varchar("lastNameKatakana", { length: 50 }),
  firstNameKatakana: varchar("firstNameKatakana", { length: 50 }),
  gender: mysqlEnum("gender", ["male", "female", "no_answer"]),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  points: int("points").default(0).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  nickname: varchar("nickname", { length: 50 }),
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  // 회원 등급 관련
  membershipTierId: int("membershipTierId"), // FK to membership_tiers
  totalPurchaseAmount: int("totalPurchaseAmount").default(0).notNull(), // 누적 구매 금액 (원)
  tierUpdatedAt: timestamp("tierUpdatedAt"), // 등급 갱신일
  // 추천인 관련
  referralCode: varchar("referralCode", { length: 20 }), // 고유 추천 코드
  referredBy: int("referredBy"), // 추천인 userId
  referralRewardClaimed: boolean("referralRewardClaimed").default(false).notNull(), // 회원가입 추천 보상 수령 여부
  // 탈퇴 관련
  isWithdrawn: boolean("isWithdrawn").default(false).notNull(),
  withdrawnAt: timestamp("withdrawnAt"),
  withdrawReason: varchar("withdrawReason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type RegisteredUser = typeof registeredUsers.$inferSelect;
export type InsertRegisteredUser = typeof registeredUsers.$inferInsert;

/**
 * Password reset tokens
 */
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;


/**
 * Orders table
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull().unique(),
  status: mysqlEnum("status", [
    "pending",              // 入金前 (입금전 - 무통장 미확인 대기)
    "paid",                 // 결제완료 (카드결제 완료 or 무통장 입금확인)
    "confirmed",            // 商品準備中 (상품 준비중)
    "shipped",              // 配送中 (배송중 - 송장번호 입력 시 자동 전환)
    "delivered",            // 配送完了 (배송완료)
    "completed",            // 注文完了 (주문완료 - 포인트 적립 완료)
    "cancelled",            // 전체취소
    "partially_cancelled"  // 부분취소
  ]).default("pending").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  shippingFee: decimal("shippingFee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  couponDiscount: decimal("couponDiscount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  membershipDiscount: decimal("membershipDiscount", { precision: 10, scale: 2 }).default("0.00").notNull(), // 등급 할인 금액
  membershipTierName: varchar("membershipTierName", { length: 50 }), // 주문 시 적용된 등급명
  pointsUsed: int("pointsUsed").default(0).notNull(),
  pointsEarned: int("pointsEarned").default(0).notNull(),
  pointsAdded: tinyint("pointsAdded").default(0).notNull(), // 포인트 적립 완료 여부
  completedAt: timestamp("completedAt"), // 주문완료 시각
  // Shipping address
  shippingName: varchar("shippingName", { length: 100 }).notNull(),
  shippingPostalCode: varchar("shippingPostalCode", { length: 10 }).notNull(),
  shippingAddress: text("shippingAddress").notNull(),
  shippingPhone: varchar("shippingPhone", { length: 20 }),
  // Tracking
  trackingNumber: varchar("trackingNumber", { length: 50 }),
  shippedAt: timestamp("shippedAt"),
  deliveredAt: timestamp("deliveredAt"),
  // Payment info
  paymentMethod: varchar("paymentMethod", { length: 50 }), // stripe, bank_transfer, cod
  paymentStatus: varchar("paymentStatus", { length: 50 }), // pending, paid, failed, refunded
  stripePaymentId: varchar("stripePaymentId", { length: 255 }),
  // Admin notes
  adminNotes: text("adminNotes"),
  // Bank transfer confirmation
  bankTransferConfirmedAt: timestamp("bankTransferConfirmedAt"),
  bankTransferConfirmedBy: int("bankTransferConfirmedBy"), // admin userId who confirmed
  // Parent order (for per-item order grouping: all items from same cart share parentOrderId)
  parentOrderId: int("parentOrderId"),
  // Cart group ID - shared across all orders from the same cart checkout (#0000000 format)
  cartGroupId: varchar("cartGroupId", { length: 20 }),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("ord_user_idx").on(table.userId),
  statusIdx: index("ord_status_idx").on(table.status),
  createdAtIdx: index("ord_created_at_idx").on(table.createdAt),
  parentOrderIdx: index("ord_parent_order_idx").on(table.parentOrderId),
  userStatusIdx: index("ord_user_status_idx").on(table.userId, table.status),
  statusCreatedIdx: index("ord_status_created_idx").on(table.status, table.createdAt),
  cartGroupIdx: index("ord_cart_group_idx").on(table.cartGroupId),
}));
export type Order = typeof orders.$inferSelect;;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order items table
 */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  productNameJa: varchar("productNameJa", { length: 255 }).notNull(),
  productImageUrl: varchar("productImageUrl", { length: 500 }),
  priceTierId: int("priceTierId"),
  tierName: varchar("tierName", { length: 255 }),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  // Discount amount allocated to this item (from coupon, proportional to subtotal ratio)
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  reviewEligible: tinyint("reviewEligible").default(0).notNull(),
  reviewId: int("reviewId"),
  reviewSubmitted: timestamp("reviewSubmitted"),
  reviewReminderSent: timestamp("reviewReminderSent"),
  // Partial cancellation support
  cancelledAt: timestamp("cancelledAt"),
  cancelReason: varchar("cancelReason", { length: 500 }),
  sellerOptionCode: varchar("sellerOptionCode", { length: 100 }),
  // Per-item shipping tracking (상품별 개별 송장번호)
  itemTrackingNumber: varchar("itemTrackingNumber", { length: 100 }),
  itemCarrier: varchar("itemCarrier", { length: 50 }),
  itemShippedAt: timestamp("itemShippedAt"),
  itemDeliveredAt: timestamp("itemDeliveredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orderIdx: index("oi_order_idx").on(table.orderId),
  productIdx: index("oi_product_idx").on(table.productId),
}));

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Announcements (공지사항)
 */
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  titleJa: varchar("titleJa", { length: 255 }).notNull(),
  content: text("content").notNull(),
  contentJa: text("contentJa").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  isExpanded: boolean("isExpanded").default(false).notNull(),
  category: mysqlEnum("category", ["notice", "important", "sale", "maintenance", "event"]).default("notice").notNull(),
  expiresAt: timestamp("expiresAt"),
  sortOrder: int("sortOrder").default(0).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

/**
 * FAQ (よくある質問)
 */
export const faqs = mysqlTable("faqs", {
  id: int("id").autoincrement().primaryKey(),
  question: varchar("question", { length: 255 }).notNull(),
  questionJa: varchar("questionJa", { length: 255 }).notNull(),
  answer: text("answer").notNull(),
  answerJa: text("answerJa").notNull(),
  category: varchar("category", { length: 100 }), // e.g., "shipping", "payment", "product"
  categoryJa: varchar("categoryJa", { length: 100 }),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FAQ = typeof faqs.$inferSelect;
export type InsertFAQ = typeof faqs.$inferInsert;

/**
 * Announcement Comments (공지사항 댓글)
 */
export const announcementComments = mysqlTable("announcement_comments", {
  id: int("id").autoincrement().primaryKey(),
  announcementId: int("announcementId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AnnouncementComment = typeof announcementComments.$inferSelect;
export type InsertAnnouncementComment = typeof announcementComments.$inferInsert;


/**
 * Inquiries (お問い合わせ)
 */
export const inquiries = mysqlTable("inquiries", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  titleJa: varchar("titleJa", { length: 255 }).notNull(),
  content: text("content").notNull(),
  contentJa: text("contentJa").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  isPrivate: boolean("isPrivate").default(false).notNull(),
  userId: int("userId"),
  imageUrls: text("image_urls"), // JSON array of image URLs attached by user
  status: mysqlEnum("status", ["pending", "answered"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = typeof inquiries.$inferInsert;

/**
 * Inquiry Comments (お問い合わせコメント)
 */
export const inquiryComments = mysqlTable("inquiry_comments", {
  id: int("id").autoincrement().primaryKey(),
  inquiryId: int("inquiryId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  imageUrl: varchar("imageUrl", { length: 1024 }),
  image_urls: text("image_urls"), // JSON array of multiple image URLs
  isActive: boolean("isActive").default(true).notNull(),
  isAiGenerated: boolean("isAiGenerated").default(false).notNull(), // AI 자동 생성 여부
  needsReview: boolean("needsReview").default(false).notNull(), // 관리자 검토 필요 여부
  feedbackRating: varchar("feedbackRating", { length: 16 }), // 만족도 피드백: 'helpful' | 'not_helpful' | null
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InquiryComment = typeof inquiryComments.$inferSelect;
export type InsertInquiryComment = typeof inquiryComments.$inferInsert;


/**
 * Events table (イベント)
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  titleJa: varchar("titleJa", { length: 255 }).notNull(),
  description: text("description").notNull(),
  descriptionJa: text("descriptionJa").notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;


/**
 * Wishlist table - stores user's favorite products
 */
export const wishlists = mysqlTable("wishlists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userProductIdx: uniqueIndex("user_product_idx").on(table.userId, table.productId),
  userIdx: index("user_idx").on(table.userId),
  productIdx: index("product_idx").on(table.productId),
}));

export type Wishlist = typeof wishlists.$inferSelect;
export type InsertWishlist = typeof wishlists.$inferInsert;


/**
 * Shipment tracking table - tracks order shipping status and timeline
 */
export const shipments = mysqlTable("shipments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  orderItemId: int("orderItemId"), // null = 주문 전체 송장, not null = 상품별 개별 송장
  trackingNumber: varchar("trackingNumber", { length: 50 }),
  carrier: varchar("carrier", { length: 50 }).default('Japan Post'),
  status: mysqlEnum("status", [
    "pending",        // 配送準備中
    "picked_up",      // 集荷完了
    "in_transit",     // 配送中
    "out_for_delivery", // 配送予定
    "delivered",      // 配達完了
    "failed",         // 配達失敗
    "returned"        // 返送中
  ]).default("pending").notNull(),
  estimatedDeliveryDate: timestamp("estimatedDeliveryDate"),
  actualDeliveryDate: timestamp("actualDeliveryDate"),
  currentLocation: varchar("currentLocation", { length: 255 }), // 現在地
  currentLocationJa: varchar("currentLocationJa", { length: 255 }),
  notes: text("notes"), // 配送メモ
  notesJa: text("notesJa"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orderIdx: index("ship_order_idx").on(table.orderId),
  statusIdx: index("ship_status_idx").on(table.status),
}));

export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = typeof shipments.$inferInsert;

/**
 * Shipment events table - tracks detailed shipping timeline events
 */
export const shipmentEvents = mysqlTable("shipment_events", {
  id: int("id").autoincrement().primaryKey(),
  shipmentId: int("shipmentId").notNull(),
  eventType: mysqlEnum("eventType", [
    "order_placed",     // 注文確定
    "payment_confirmed", // 支払い確認
    "processing",       // 処理中
    "picked_up",        // 集荷完了
    "departed",         // 発送完了
    "in_transit",       // 配送中
    "out_for_delivery", // 配送予定
    "delivered",        // 配達完了
    "failed",           // 配達失敗
    "returned"          // 返送中
  ]).notNull(),
  location: varchar("location", { length: 255 }), // イベント発生地点
  locationJa: varchar("locationJa", { length: 255 }),
  description: varchar("description", { length: 255 }), // イベント説明
  descriptionJa: varchar("descriptionJa", { length: 255 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type ShipmentEvent = typeof shipmentEvents.$inferSelect;
export type InsertShipmentEvent = typeof shipmentEvents.$inferInsert;


/**
 * Product view history for personalized recommendations
 */
export const productViews = mysqlTable("product_views", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  categoryId: int("categoryId").notNull(),
  viewCount: int("viewCount").default(1).notNull(),
  lastViewedAt: timestamp("lastViewedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductView = typeof productViews.$inferSelect;
export type InsertProductView = typeof productViews.$inferInsert;


/**
 * Product sales information (타임세일, 월간세일, 원가, 마진율)
 */
export const productSalesInfo = mysqlTable("product_sales_info", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().unique(),
  cost: decimal("cost", { precision: 10, scale: 2 }), // 원가
  marginPercent: decimal("marginPercent", { precision: 5, scale: 2 }), // 마진율 (자동 계산)
  timeSaleStartAt: timestamp("timeSaleStartAt"), // 타임세일 시작
  timeSaleEndAt: timestamp("timeSaleEndAt"), // 타임세일 종료
  timeSaleDiscountPercent: int("timeSaleDiscountPercent"), // 타임세일 할인율
  monthlySaleDiscountPercent: int("monthlySaleDiscountPercent"), // 월간세일 할인율
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductSalesInfo = typeof productSalesInfo.$inferSelect;
export type InsertProductSalesInfo = typeof productSalesInfo.$inferInsert;

/**
 * Product stock history (재고 변동 이력)
 */
export const productStockHistory = mysqlTable("product_stock_history", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  previousStock: int("previousStock").notNull(),
  newStock: int("newStock").notNull(),
  changeReason: varchar("changeReason", { length: 100 }).notNull(), // "order", "restock", "adjustment", "return"
  orderId: int("orderId"), // 주문 ID (order인 경우)
  notes: text("notes"), // 추가 메모
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductStockHistory = typeof productStockHistory.$inferSelect;
export type InsertProductStockHistory = typeof productStockHistory.$inferInsert;

/**
 * Product image order (이미지 순서 관리)
 */
export const productImageOrder = mysqlTable("product_image_order", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  imageUrlMedium: varchar("imageUrlMedium", { length: 500 }), // 600px WebP
  imageUrlThumb: varchar("imageUrlThumb", { length: 500 }), // 200px WebP
  blurDataUrl: text("blurDataUrl"), // base64 blur placeholder (~20px)
  sortOrder: int("sortOrder").notNull(),
  isThumbnail: boolean("isThumbnail").default(false).notNull(), // 썸네일 여부
  width: int("width"), // original width
  height: int("height"), // original height
  fileSize: int("fileSize"), // original file size in bytes
  optimized: boolean("optimized").default(false).notNull(), // 최적화 완료 여부
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  productIdIdx: index("pio_product_id_idx").on(table.productId),
  thumbnailIdx: index("pio_thumbnail_idx").on(table.productId, table.isThumbnail),
}));

export type ProductImageOrder = typeof productImageOrder.$inferSelect;
export type InsertProductImageOrder = typeof productImageOrder.$inferInsert;

/**
 * Product SEO metadata (SEO 및 메타데이터)
 */
export const productSeoMetadata = mysqlTable("product_seo_metadata", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().unique(),
  metaDescription: text("metaDescription"), // 메타 설명
  keywords: text("keywords"), // 키워드 (쉼표로 구분)
  urlSlug: varchar("urlSlug", { length: 255 }).unique(), // URL 슬러그
  ogTitle: varchar("ogTitle", { length: 255 }), // Open Graph 제목
  ogDescription: text("ogDescription"), // Open Graph 설명
  ogImage: varchar("ogImage", { length: 500 }), // Open Graph 이미지
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductSeoMetadata = typeof productSeoMetadata.$inferSelect;
export type InsertProductSeoMetadata = typeof productSeoMetadata.$inferInsert;

/**
 * Product shipping information (배송 정보)
 */
export const productShippingInfo = mysqlTable("product_shipping_info", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().unique(),
  weight: decimal("weight", { precision: 8, scale: 3 }), // 무게 (kg)
  width: decimal("width", { precision: 8, scale: 2 }), // 가로 (cm)
  height: decimal("height", { precision: 8, scale: 2 }), // 높이 (cm)
  depth: decimal("depth", { precision: 8, scale: 2 }), // 깊이 (cm)
  shippingCost: decimal("shippingCost", { precision: 10, scale: 2 }), // 배송료
  supplierId: int("supplierId"), // 공급자 ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductShippingInfo = typeof productShippingInfo.$inferSelect;
export type InsertProductShippingInfo = typeof productShippingInfo.$inferInsert;

/**
 * Product promotion codes (프로모션 코드)
 */
export const productPromotionCodes = mysqlTable("product_promotion_codes", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountPercent: int("discountPercent").notNull(), // 할인율
  maxUses: int("maxUses"), // 최대 사용 횟수 (null = 무제한)
  currentUses: int("currentUses").default(0).notNull(),
  expiresAt: timestamp("expiresAt"), // 만료 날짜
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductPromotionCode = typeof productPromotionCodes.$inferSelect;
export type InsertProductPromotionCode = typeof productPromotionCodes.$inferInsert;

/**
 * Related products (연관 상품 수동 설정)
 */
export const relatedProducts = mysqlTable("related_products", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  relatedProductId: int("relatedProductId").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RelatedProduct = typeof relatedProducts.$inferSelect;
export type InsertRelatedProduct = typeof relatedProducts.$inferInsert;

/**
 * Product price tiers (대량구매 할인 - まとめ買い)
 * 수량별 가격 티어를 관리하여 볼륨 디스카운트 구현
 */
export const productPriceTiers = mysqlTable("product_price_tiers", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(), // 세트 수 (1, 2, 3, 5, 7, 10 등)
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(), // 개당 단가
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(), // 총 판매가격
  discountPercent: int("discountPercent").default(0).notNull(), // 할인율 (기본가 대비 %)
  stock: int("stock").default(0).notNull(), // 옵션별 재고 수량
  isPopular: boolean("isPopular").default(false).notNull(), // 人気 배지 표시
  isActive: boolean("isActive").default(true).notNull(), // 활성화/비활성화
  sortOrder: int("sortOrder").default(0).notNull(), // 정렬 순서
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productIdx: index("ppt_product_idx").on(table.productId),
  productActiveIdx: index("ppt_product_active_idx").on(table.productId, table.isActive),
}));
export type ProductPriceTier = typeof productPriceTiers.$inferSelect;
export type InsertProductPriceTier = typeof productPriceTiers.$inferInsert;


/**
 * Coupons (쿠폰/할인 코드)
 * 전체 주문에 적용 가능한 범용 쿠폰 시스템
 */
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  nameJa: varchar("nameJa", { length: 255 }).notNull(), // 쿠폰 이름 (일본어)
  description: text("description"), // 쿠폰 설명
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull(), // 할인 유형
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(), // 할인 값 (% 또는 ¥)
  minOrderAmount: decimal("minOrderAmount", { precision: 10, scale: 2 }).default("0.00"), // 최소 주문 금액
  maxDiscountAmount: decimal("maxDiscountAmount", { precision: 10, scale: 2 }), // 최대 할인 금액 (% 할인 시)
  maxUses: int("maxUses"), // 전체 최대 사용 횟수 (null = 무제한)
  maxUsesPerUser: int("maxUsesPerUser").default(1), // 사용자당 최대 사용 횟수
  currentUses: int("currentUses").default(0).notNull(),
  startsAt: timestamp("startsAt"), // 유효 시작일
  expiresAt: timestamp("expiresAt"), // 유효 종료일
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

/**
 * Coupon usage history (쿠폰 사용 이력)
 */
export const couponUsages = mysqlTable("coupon_usages", {
  id: int("id").autoincrement().primaryKey(),
  couponId: int("couponId").notNull(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("cu_user_idx").on(table.userId),
  couponIdx: index("cu_coupon_idx").on(table.couponId),
  orderIdx: index("cu_order_idx").on(table.orderId),
}));

export type CouponUsage = typeof couponUsages.$inferSelect;
export type InsertCouponUsage = typeof couponUsages.$inferInsert;

/**
 * Point transactions table - tracks all point earning and spending history
 */
export const pointTransactions = mysqlTable("point_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userEmail: varchar("userEmail", { length: 320 }), // 이메일 기준 식별용
  orderId: int("orderId"), // null for manual adjustments
  type: mysqlEnum("type", ["earn", "spend", "admin_add", "admin_deduct"]).notNull(),
  amount: int("amount").notNull(), // positive for earn/admin_add, negative for spend/admin_deduct
  balance: int("balance").notNull(), // user's point balance after this transaction
  description: text("description"), // e.g., "購入で獲得", "ポイント使用", "管理者付与"
  expiresAt: timestamp("expiresAt"), // 포인트 만료일 (null = 무기한)
  expiryNotifiedAt: timestamp("expiryNotifiedAt"), // 만료 알림 이메일 발송 시각
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  orderIdx: index("order_idx").on(table.orderId),
  typeIdx: index("type_idx").on(table.type),
}));

export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = typeof pointTransactions.$inferInsert;


// Product Q&A
export const productQuestions = mysqlTable("product_questions", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  userId: int("userId"),
  question: text("question").notNull(),
  answer: text("answer"),
  answeredBy: int("answeredBy"),
  answeredAt: timestamp("answeredAt"),
  isPublic: boolean("isPublic").default(true).notNull(),
  answerImageUrl: varchar("answerImageUrl", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductQuestion = typeof productQuestions.$inferSelect;
export type InsertProductQuestion = typeof productQuestions.$inferInsert;

/**
 * Addresses table - stores user shipping addresses
 */
export const addresses = mysqlTable("addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 50 }),
  recipientNameKanji: varchar("recipientNameKanji", { length: 100 }).notNull(),
  recipientNameHiragana: varchar("recipientNameHiragana", { length: 100 }).notNull(),
  postalCode: varchar("postalCode", { length: 10 }).notNull(),
  prefecture: varchar("prefecture", { length: 50 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  address1: varchar("address1", { length: 255 }).notNull(),
  address2: varchar("address2", { length: 255 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
}));

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = typeof addresses.$inferInsert;

/**
 * Customer notes table - stores admin notes about customers
 */
export const customerNotes = mysqlTable("customer_notes", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  adminId: int("adminId").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  customerIdx: index("customer_idx").on(table.customerId),
}));

export type CustomerNote = typeof customerNotes.$inferSelect;
export type InsertCustomerNote = typeof customerNotes.$inferInsert;

/**
 * Checkout sessions table - stores temporary checkout data before Stripe payment
 */
export const checkoutSessions = mysqlTable("checkout_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 255 }).notNull().unique(), // Stripe session ID
  userId: int("userId").notNull(),
  userEmail: varchar("userEmail", { length: 320 }).notNull(),
  // Shipping address
  shippingName: varchar("shippingName", { length: 100 }).notNull(),
  shippingPostalCode: varchar("shippingPostalCode", { length: 20 }).notNull(),
  shippingPrefecture: varchar("shippingPrefecture", { length: 50 }).notNull(),
  shippingCity: varchar("shippingCity", { length: 100 }).notNull(),
  shippingAddress1: varchar("shippingAddress1", { length: 255 }).notNull(),
  shippingAddress2: varchar("shippingAddress2", { length: 255 }),
  shippingPhone: varchar("shippingPhone", { length: 20 }).notNull(),
  // Cart items (JSON)
  itemsJson: text("itemsJson").notNull(), // [{id, name, nameJa, price, quantity, imageUrl}]
  cartItemIds: text("cartItemIds"), // JSON array of cartItem IDs for selective purchase
  cartGroupId: varchar("cartGroupId", { length: 20 }), // Shared cart group ID (#0000000 format)
  // Totals
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingFee: decimal("shippingFee", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  // Status
  status: mysqlEnum("status", ["pending", "completed", "expired", "failed"]).default("pending").notNull(),
  failureReason: text("failureReason"), // Reason for payment failure
  expiresAt: timestamp("expiresAt").notNull(), // Auto-expire after 1 hour
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  sessionIdx: index("session_idx").on(table.sessionId),
  userIdx: index("user_idx").on(table.userId),
  statusIdx: index("status_idx").on(table.status),
}));

export type CheckoutSession = typeof checkoutSessions.$inferSelect;
export type InsertCheckoutSession = typeof checkoutSessions.$inferInsert;

// ─── Chatbot Tables ─────────────────────────────────────────────────

export const chatbotSettings = mysqlTable("chatbotSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const chatbotConversations = mysqlTable("chatbotConversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 100 }).notNull(),
  pageContext: varchar("pageContext", { length: 50 }),
  productId: int("productId"),
  messageCount: int("messageCount").notNull().default(0),
  faqMatchCount: int("faqMatchCount").notNull().default(0),
  status: mysqlEnum("status", ["active", "ended"]).notNull().default("active"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
}, (table) => ({
  sessionIdx: index("chatbot_session_idx").on(table.sessionId),
  userIdx: index("chatbot_user_idx").on(table.userId),
}));

export const chatbotMessages = mysqlTable("chatbotMessages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  isFaqMatch: tinyint("isFaqMatch").notNull().default(0),
  faqId: int("faqId"),
  tokenCount: int("tokenCount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  convIdx: index("chatbot_conv_idx").on(table.conversationId),
}));

export const chatbotFaqs = mysqlTable("chatbotFaqs", {
  id: int("id").autoincrement().primaryKey(),
  questionJa: text("questionJa"),
  questionKo: text("questionKo"),
  answerJa: text("answerJa"),
  answerKo: text("answerKo"),
  category: mysqlEnum("category", ["product", "order_shipping", "payment", "member_points", "other"]).notNull().default("other"),
  keywords: text("keywords"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: tinyint("isActive").notNull().default(1),
  matchCount: int("matchCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const chatbotBlockedKeywords = mysqlTable("chatbotBlockedKeywords", {
  id: int("id").autoincrement().primaryKey(),
  keyword: varchar("keyword", { length: 200 }).notNull().unique(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatbotSetting = typeof chatbotSettings.$inferSelect;
export type ChatbotConversation = typeof chatbotConversations.$inferSelect;
export type ChatbotMessage = typeof chatbotMessages.$inferSelect;
export type ChatbotFaq = typeof chatbotFaqs.$inferSelect;
export type ChatbotBlockedKeyword = typeof chatbotBlockedKeywords.$inferSelect;

// ─── Legal Notice Table ─────────────────────────────────────────────────

export const legalNotices = mysqlTable("legalNotices", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(), // 'tokushoho' for 特定商取引法
  titleJa: varchar("titleJa", { length: 200 }).notNull(),
  contentJa: text("contentJa").notNull(),
  isPublished: tinyint("isPublished").notNull().default(1),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LegalNotice = typeof legalNotices.$inferSelect;
export type InsertLegalNotice = typeof legalNotices.$inferInsert;

/**
 * Recommendation events tracking (impressions and clicks)
 */
export const recommendationEvents = mysqlTable("recommendationEvents", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(), // 현재 보고 있는 상품 ID
  recommendedProductId: int("recommendedProductId").notNull(), // 추천된 상품 ID
  recommendationType: mysqlEnum("recommendationType", [
    "tag_based",        // 태그 기반 추천
    "collaborative",    // 협업 필터링 (함께 본 상품)
    "category_based",   // 카테고리 기반 추천
    "after_review"      // 리뷰 제출 후 추천 상품 클릭
  ]).notNull(),
  eventType: mysqlEnum("eventType", ["impression", "click"]).notNull(), // 노출 또는 클릭
  userId: int("userId"), // 로그인한 사용자 (nullable)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RecommendationEvent = typeof recommendationEvents.$inferSelect;
export type InsertRecommendationEvent = typeof recommendationEvents.$inferInsert;

/**
 * Review reports table - tracks user reports for inappropriate reviews
 */
export const reviewReports = mysqlTable("reviewReports", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  reporterUserId: int("reporterUserId").notNull(),
  reason: mysqlEnum("reason", [
    "spam",           // スパム・広告
    "inappropriate",  // 不適切な内容
    "offensive",      // 攻撃的・侮辱的
    "fake",           // 虚偽の内容
    "other"           // その他
  ]).notNull(),
  comment: text("comment"),
  status: mysqlEnum("status", ["pending", "reviewed", "dismissed"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"), // Admin user ID who reviewed this report
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  reviewIdx: index("review_idx").on(table.reviewId),
  reporterIdx: index("reporter_idx").on(table.reporterUserId),
  statusIdx: index("status_idx").on(table.status),
}));

export type ReviewReport = typeof reviewReports.$inferSelect;
export type InsertReviewReport = typeof reviewReports.$inferInsert;

// ─── Payment Gateway Tables ───────────────────────────────────────────────────

/**
 * Payment settings - stores API keys and config per provider
 * Admin manages these via the dashboard
 */
export const paymentSettings = mysqlTable("paymentSettings", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["stripe", "airwallex", "2checkout", "payoneer", "bank_transfer", "cookiepay", "paypal"]).notNull().unique(),
  isActive: int("isActive").default(0).notNull(),
  displayName: varchar("displayName", { length: 100 }),
  publicKey: text("publicKey"),
  secretKey: text("secretKey"),
  webhookSecret: text("webhookSecret"),
  extraConfig: json("extraConfig"),
  mode: mysqlEnum("mode", ["test", "live"]).default("test").notNull(),
  supportedCurrencies: json("supportedCurrencies"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentSetting = typeof paymentSettings.$inferSelect;
export type InsertPaymentSetting = typeof paymentSettings.$inferInsert;

/**
 * Payments - records each payment attempt and its lifecycle
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  userId: int("userId").notNull(),
  provider: mysqlEnum("provider", ["stripe", "airwallex", "2checkout", "payoneer", "paypal", "bank_transfer", "cookiepay"]).notNull(),
  status: mysqlEnum("status", [
    "pending", "processing", "succeeded", "failed",
    "cancelled", "refunded", "partially_refunded",
  ]).default("pending").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("KRW").notNull(),
  externalPaymentId: varchar("externalPaymentId", { length: 255 }),
  externalSessionId: varchar("externalSessionId", { length: 255 }),
  paymentMethod: varchar("paymentMethod", { length: 64 }),
  cardLast4: varchar("cardLast4", { length: 4 }),
  cardBrand: varchar("cardBrand", { length: 32 }),
  refundAmount: decimal("refundAmount", { precision: 12, scale: 2 }),
  refundReason: text("refundReason"),
  metadata: json("metadata"),
  errorMessage: text("errorMessage"),
  paidAt: timestamp("paidAt"),
  refundedAt: timestamp("refundedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orderIdx: index("payment_order_idx").on(table.orderId),
  userIdx: index("payment_user_idx").on(table.userId),
  statusIdx: index("payment_status_idx").on(table.status),
}));

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Setting audit logs — records every change made to site settings
 */
export const settingAuditLogs = mysqlTable("settingAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull(),
  previousValue: text("previousValue"),
  newValue: text("newValue"),
  changedBy: int("changedBy").notNull(),
  changedByName: varchar("changedByName", { length: 100 }),
  changeNote: text("changeNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  settingKeyIdx: index("audit_setting_key_idx").on(table.settingKey),
  changedByIdx: index("audit_changed_by_idx").on(table.changedBy),
  createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
}));
export type SettingAuditLog = typeof settingAuditLogs.$inferSelect;
export type InsertSettingAuditLog = typeof settingAuditLogs.$inferInsert;

// ─── Email Logs ───────────────────────────────────────────────────────────────
export const emailLogs = mysqlTable("email_logs", {
  id: int("id").autoincrement().primaryKey(),
  emailType: varchar("email_type", { length: 100 }).notNull(), // order_confirmation, delivery_completion, review_reminder, point_expiry, test, etc.
  to: varchar("to", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["sent", "failed", "skipped"]).notNull().default("sent"),
  errorMessage: text("error_message"),
  userId: int("user_id"),
  orderId: int("order_id"),
  metadata: text("metadata"), // JSON string for extra info
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (table) => ({
  emailTypeIdx: index("email_type_idx").on(table.emailType),
  toIdx: index("email_to_idx").on(table.to),
  userIdIdx: index("email_user_id_idx").on(table.userId),
  sentAtIdx: index("email_sent_at_idx").on(table.sentAt),
}));
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

/**
 * Membership tiers - 회원 등급 설정
 */
export const membershipTiers = mysqlTable("membership_tiers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(), // BRONZE, SILVER, GOLD, VIP, VVIP
  nameKo: varchar("nameKo", { length: 50 }).notNull(), // 브론즈, 실버, 골드, VIP, VVIP
  minAmount: int("minAmount").default(0).notNull(), // 최소 누적 구매 금액 (원)
  discountRate: decimal("discountRate", { precision: 5, scale: 2 }).default("0").notNull(), // 등급 할인율 (%)
  pointRate: decimal("pointRate", { precision: 5, scale: 2 }).default("1").notNull(), // 포인트 적립률 (%)
  color: varchar("color", { length: 20 }).default("#6B7280").notNull(), // 배지 색상
  icon: varchar("icon", { length: 50 }).default("Star").notNull(), // 아이콘
  sortOrder: int("sortOrder").default(0).notNull(), // 정렬 순서 (낮을수록 낮은 등급)
  periodMonths: int("periodMonths").default(6).notNull(), // 산정 기간 (개월, 기본 6개월)
  isActive: boolean("isActive").default(true).notNull(), // 활성 여부
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MembershipTier = typeof membershipTiers.$inferSelect;
export type InsertMembershipTier = typeof membershipTiers.$inferInsert;

/**
 * Referral rewards - 추천인 보상 내역
 */
export const referralRewards = mysqlTable("referral_rewards", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(), // 추천한 사람
  refereeId: int("refereeId").notNull(), // 추천받은 사람
  rewardType: mysqlEnum("rewardType", ["signup", "first_purchase"]).notNull(), // 보상 유형
  referrerReward: int("referrerReward").default(0).notNull(), // 추천인 보상 포인트
  refereeReward: int("refereeReward").default(0).notNull(), // 피추천인 보상 포인트
  status: mysqlEnum("status", ["pending", "completed", "cancelled"]).default("pending").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  referrerIdx: index("referral_referrer_idx").on(table.referrerId),
  refereeIdx: index("referral_referee_idx").on(table.refereeId),
  statusIdx: index("referral_status_idx").on(table.status),
}));
export type ReferralReward = typeof referralRewards.$inferSelect;
export type InsertReferralReward = typeof referralRewards.$inferInsert;

/**
 * Login history - 접속 이력
 */
export const loginHistory = mysqlTable("login_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  loginAt: timestamp("loginAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  device: varchar("device", { length: 20 }), // PC / Mobile / Tablet
  browser: varchar("browser", { length: 50 }), // Chrome / Safari 등
  country: varchar("country", { length: 50 }), // 접속 국가
}, (table) => ({
  userIdIdx: index("login_user_id_idx").on(table.userId),
  loginAtIdx: index("login_at_idx").on(table.loginAt),
}));
export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = typeof loginHistory.$inferInsert;

/**
 * Referral settings - 추천인 제도 설정
 */
export const referralSettings = mysqlTable("referral_settings", {
  id: int("id").autoincrement().primaryKey(),
  signupReferrerReward: int("signupReferrerReward").default(500).notNull(), // 회원가입 시 추천인 보상
  signupRefereeReward: int("signupRefereeReward").default(500).notNull(), // 회원가입 시 피추천인 보상
  purchaseReferrerReward: int("purchaseReferrerReward").default(1000).notNull(), // 첣 구매 시 추천인 보상
  purchaseRefereeReward: int("purchaseRefereeReward").default(1000).notNull(), // 첣 구매 시 피추천인 보상
  isActive: boolean("isActive").default(true).notNull(), // 추천인 제도 활성 여부
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ReferralSetting = typeof referralSettings.$inferSelect;
export type InsertReferralSetting = typeof referralSettings.$inferInsert;

/**
 * Tier change history - 등급 변경 이력
 */
export const tierChangeHistory = mysqlTable("tier_change_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  previousTierId: int("previousTierId"),
  newTierId: int("newTierId").notNull(),
  changedBy: int("changedBy"),
  changeType: varchar("changeType", { length: 20 }).default("manual").notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("tch_user_id_idx").on(table.userId),
  createdAtIdx: index("tch_created_at_idx").on(table.createdAt),
}));
export type TierChangeHistory = typeof tierChangeHistory.$inferSelect;
export type InsertTierChangeHistory = typeof tierChangeHistory.$inferInsert;


/**
 * Email preferences - 고객 이메일 수신 설정
 */
export const emailPreferences = mysqlTable("email_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  // 필수 이메일 (항상 발송 권장)
  orderConfirmation: boolean("order_confirmation").default(true).notNull(),
  orderShipped: boolean("order_shipped").default(true).notNull(),
  orderDelivered: boolean("order_delivered").default(true).notNull(),
  orderCancelled: boolean("order_cancelled").default(true).notNull(),
  refundProcessed: boolean("refund_processed").default(true).notNull(),
  passwordChanged: boolean("password_changed").default(true).notNull(),
  // 마케팅 이메일 (선택)
  marketingEmails: boolean("marketing_emails").default(true).notNull(),
  eventNotifications: boolean("event_notifications").default(true).notNull(),
  couponNotifications: boolean("coupon_notifications").default(true).notNull(),
  pointNotifications: boolean("point_notifications").default(true).notNull(),
  // 리뷰/문의 이메일 (선택)
  reviewReminders: boolean("review_reminders").default(true).notNull(),
  inquiryReplies: boolean("inquiry_replies").default(true).notNull(),
  productQaReplies: boolean("product_qa_replies").default(true).notNull(),
  // 뉴스레터
  newsletter: boolean("newsletter").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("ep_user_id_idx").on(table.userId),
}));
export type EmailPreference = typeof emailPreferences.$inferSelect;
export type InsertEmailPreference = typeof emailPreferences.$inferInsert;

/**
 * Bulk Email Campaigns - Brevo 대량 메일 캠페인
 */
export const bulkEmailCampaigns = mysqlTable("bulk_email_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  // 캠페인 기본 정보
  name: varchar("name", { length: 200 }).notNull(),              // 캠페인 이름 (내부용)
  subject: varchar("subject", { length: 300 }).notNull(),        // 메일 제목
  previewText: varchar("preview_text", { length: 200 }),         // 미리보기 텍스트
  // 발신자 정보
  senderName: varchar("sender_name", { length: 100 }).default("ококくすり").notNull(),
  senderEmail: varchar("sender_email", { length: 200 }).default("noreply@cocokusuri.com").notNull(),
  // 수신자 세그먼트
  targetSegment: mysqlEnum("target_segment", [
    "all",            // 전체 회원
    "marketing",      // 마케팅 수신 동의자
    "newsletter",     // 뉴스레터 구독자
    "active",         // 최근 30일 구매 회원
    "inactive",       // 90일 이상 미구매 회원
    "vip",            // VIP 등급 이상
    "custom",         // 직접 입력 이메일 목록
  ]).default("marketing").notNull(),
  customEmails: text("custom_emails"),                           // custom 세그먼트용 이메일 목록 (JSON)
  // 메일 내용
  contentType: mysqlEnum("content_type", ["html", "text"]).default("html").notNull(),
  htmlContent: longtext("html_content"),                         // HTML 본문
  textContent: text("text_content"),                             // 텍스트 본문
  // Brevo 연동 정보
  brevoTemplateId: int("brevo_template_id"),                     // Brevo 템플릿 ID (선택)
  brevoCampaignId: int("brevo_campaign_id"),                     // Brevo에서 생성된 캠페인 ID
  // 발송 상태
  status: mysqlEnum("status", [
    "draft",          // 초안
    "scheduled",      // 예약됨
    "sending",        // 발송 중
    "sent",           // 발송 완료
    "failed",         // 실패
    "cancelled",      // 취소됨
  ]).default("draft").notNull(),
  scheduledAt: timestamp("scheduled_at"),                        // 예약 발송 시각
  sentAt: timestamp("sent_at"),                                  // 실제 발송 시각
  // 발송 통계
  recipientCount: int("recipient_count").default(0).notNull(),   // 수신자 수
  sentCount: int("sent_count").default(0).notNull(),             // 발송 성공 수
  failedCount: int("failed_count").default(0).notNull(),         // 발송 실패 수
  openCount: int("open_count").default(0).notNull(),             // 열람 수
  clickCount: int("click_count").default(0).notNull(),           // 클릭 수
  // 메타
  createdBy: int("created_by"),                                  // 생성한 관리자 ID
  notes: text("notes"),                                          // 메모
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("bec_status_idx").on(table.status),
  createdAtIdx: index("bec_created_at_idx").on(table.createdAt),
  scheduledAtIdx: index("bec_scheduled_at_idx").on(table.scheduledAt),
}));
export type BulkEmailCampaign = typeof bulkEmailCampaigns.$inferSelect;
export type InsertBulkEmailCampaign = typeof bulkEmailCampaigns.$inferInsert;

// ─── User Notifications ──────────────────────────────────────────────────────
export const userNotifications = mysqlTable("user_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  type: mysqlEnum("type", ["order", "admin", "tier", "coupon", "point", "review", "inquiry", "system"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 500 }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("un_user_id_idx").on(table.userId),
  isReadIdx: index("un_is_read_idx").on(table.isRead),
  createdAtIdx: index("un_created_at_idx").on(table.createdAt),
  typeIdx: index("un_type_idx").on(table.type),
}));
export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = typeof userNotifications.$inferInsert;

// ─── Notification Settings (관리자 알림 설정) ─────────────────────────────────
export const notificationSettings = mysqlTable("notification_settings", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("event_type", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  defaultTitle: varchar("default_title", { length: 200 }),
  defaultMessage: text("default_message"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type InsertNotificationSetting = typeof notificationSettings.$inferInsert;

// ─── Notification Templates (알림 메시지 템플릿) ──────────────────────────────
export const notificationTemplates = mysqlTable("notification_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["order", "admin", "tier", "coupon", "point", "review", "inquiry", "system"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 500 }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = typeof notificationTemplates.$inferInsert;

// ─── Notification Schedules (예약 발송) ───────────────────────────────────────
export const notificationSchedules = mysqlTable("notification_schedules", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 500 }),
  type: mysqlEnum("type", ["order", "admin", "tier", "coupon", "point", "review", "inquiry", "system"]).default("admin").notNull(),
  targetType: mysqlEnum("target_type", ["all", "segment", "individual"]).default("all").notNull(),
  targetUserIds: text("target_user_ids"),
  targetSegment: varchar("target_segment", { length: 100 }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "cancelled", "failed"]).default("pending").notNull(),
  sentCount: int("sent_count").default(0).notNull(),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("ns_status_idx").on(table.status),
  scheduledAtIdx: index("ns_scheduled_at_idx").on(table.scheduledAt),
}));
export type NotificationSchedule = typeof notificationSchedules.$inferSelect;
export type InsertNotificationSchedule = typeof notificationSchedules.$inferInsert;

// ─── User Notification Preferences (사용자 알림 수신 설정) ───────────────────
export const userNotificationPreferences = mysqlTable("user_notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  orderEnabled: boolean("order_enabled").default(true).notNull(),
  tierEnabled: boolean("tier_enabled").default(true).notNull(),
  couponEnabled: boolean("coupon_enabled").default(true).notNull(),
  pointEnabled: boolean("point_enabled").default(true).notNull(),
  reviewEnabled: boolean("review_enabled").default(true).notNull(),
  inquiryEnabled: boolean("inquiry_enabled").default(true).notNull(),
  adminEnabled: boolean("admin_enabled").default(true).notNull(),
  systemEnabled: boolean("system_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("unp_user_id_idx").on(table.userId),
}));
export type UserNotificationPreference = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreference = typeof userNotificationPreferences.$inferInsert;

// ─── Shipment Tracking Cache (배송추적 DB 캐시) ──────────────────────────────
// 일본우편 실시간 스크래핑 결과를 DB에 캐싱하여 빠른 조회 + 야간 자동 동기화
export const shipmentTrackingCache = mysqlTable("shipment_tracking_cache", {
  id: int("id").autoincrement().primaryKey(),
  trackingNumber: varchar("tracking_number", { length: 50 }).notNull().unique(),
  carrier: varchar("carrier", { length: 50 }).default("Japan Post").notNull(),
  // 이벤트 목록 JSON 배열 저장 (TrackingEvent[])
  eventsJson: text("events_json"),
  // 전체 상태
  status: varchar("status", { length: 50 }),
  currentLocation: varchar("current_location", { length: 255 }),
  // 경고 플래그 (세관 조회, 부재중, 배달 실패 등)
  hasAlert: boolean("has_alert").default(false).notNull(),
  alertType: varchar("alert_type", { length: 100 }), // "customs", "absent", "failed", "returned"
  alertDescription: text("alert_description"),
  alertNotifiedAt: timestamp("alert_notified_at"), // 알림 발송 시간 (중복 방지)
  // 동기화 메타
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  syncError: text("sync_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  trackingNumberIdx: index("stc_tracking_number_idx").on(table.trackingNumber),
  hasAlertIdx: index("stc_has_alert_idx").on(table.hasAlert),
  lastSyncedAtIdx: index("stc_last_synced_at_idx").on(table.lastSyncedAt),
}));
export type ShipmentTrackingCache = typeof shipmentTrackingCache.$inferSelect;
export type InsertShipmentTrackingCache = typeof shipmentTrackingCache.$inferInsert;


// ─── Analytics: Page Views (페이지 뷰) ────────────────────────────────────────
export const pageViews = mysqlTable("page_views", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("session_id", { length: 100 }).notNull(),
  userId: int("user_id"), // null if anonymous
  page: varchar("page", { length: 255 }).notNull(), // e.g., '/', '/product/123', '/category/health'
  referrer: varchar("referrer", { length: 500 }),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
  country: varchar("country", { length: 2 }), // ISO 3166-1 alpha-2 code
  countryName: varchar("country_name", { length: 100 }),
  region: varchar("region", { length: 100 }), // State/Province
  city: varchar("city", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  deviceType: varchar("device_type", { length: 20 }), // 'desktop', 'mobile', 'tablet'
  browser: varchar("browser", { length: 100 }),
  os: varchar("os", { length: 100 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index("pv_session_id_idx").on(table.sessionId),
  userIdIdx: index("pv_user_id_idx").on(table.userId),
  pageIdx: index("pv_page_idx").on(table.page),
  countryIdx: index("pv_country_idx").on(table.country),
  timestampIdx: index("pv_timestamp_idx").on(table.timestamp),
  createdAtIdx: index("pv_created_at_idx").on(table.createdAt),
}));
export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = typeof pageViews.$inferInsert;

// ─── Analytics: Events (사용자 이벤트: 검색, 클릭, 구매 등) ──────────────────
export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("session_id", { length: 100 }).notNull(),
  userId: int("user_id"), // null if anonymous
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'search', 'click', 'add_to_cart', 'purchase', 'view_product'
  eventName: varchar("event_name", { length: 100 }),
  eventValue: varchar("event_value", { length: 500 }), // e.g., search keyword, product ID
  page: varchar("page", { length: 255 }),
  metadata: json("metadata"), // Additional event data (JSON)
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index("ae_session_id_idx").on(table.sessionId),
  userIdIdx: index("ae_user_id_idx").on(table.userId),
  eventTypeIdx: index("ae_event_type_idx").on(table.eventType),
  timestampIdx: index("ae_timestamp_idx").on(table.timestamp),
  createdAtIdx: index("ae_created_at_idx").on(table.createdAt),
}));
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// ─── Analytics: Sessions (세션 정보) ──────────────────────────────────────────
export const analyticsessions = mysqlTable("analytics_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("session_id", { length: 100 }).notNull().unique(),
  userId: int("user_id"), // null if anonymous
  ipAddress: varchar("ip_address", { length: 45 }),
  country: varchar("country", { length: 2 }),
  countryName: varchar("country_name", { length: 100 }),
  deviceType: varchar("device_type", { length: 20 }),
  browser: varchar("browser", { length: 100 }),
  os: varchar("os", { length: 100 }),
  pageViewCount: int("page_view_count").default(1).notNull(),
  eventCount: int("event_count").default(0).notNull(),
  lastSearchKeyword: varchar("last_search_keyword", { length: 255 }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  duration: int("duration"), // seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index("as_session_id_idx").on(table.sessionId),
  userIdIdx: index("as_user_id_idx").on(table.userId),
  countryIdx: index("as_country_idx").on(table.country),
  startedAtIdx: index("as_started_at_idx").on(table.startedAt),
  createdAtIdx: index("as_created_at_idx").on(table.createdAt),
}));
export type AnalyticsSession = typeof analyticsessions.$inferSelect;
export type InsertAnalyticsSession = typeof analyticsessions.$inferInsert;

// ─── Analytics: Daily Stats (일일 통계 - 집계 데이터) ────────────────────────
export const dailyStats = mysqlTable("daily_stats", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  totalSessions: int("total_sessions").default(0).notNull(),
  totalPageViews: int("total_page_views").default(0).notNull(),
  totalEvents: int("total_events").default(0).notNull(),
  uniqueVisitors: int("unique_visitors").default(0).notNull(),
  totalPurchases: int("total_purchases").default(0).notNull(),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  avgSessionDuration: decimal("avg_session_duration", { precision: 10, scale: 2 }),
  bounceRate: decimal("bounce_rate", { precision: 5, scale: 2 }), // percentage
  topPage: varchar("top_page", { length: 255 }),
  topSearchKeyword: varchar("top_search_keyword", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  dateIdx: index("ds_date_idx").on(table.date),
}));
export type DailyStat = typeof dailyStats.$inferSelect;
export type InsertDailyStat = typeof dailyStats.$inferInsert;

// ─── Analytics: Country Stats (국가별 통계) ──────────────────────────────────
export const countryStats = mysqlTable("country_stats", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  country: varchar("country", { length: 2 }).notNull(),
  countryName: varchar("country_name", { length: 100 }),
  sessions: int("sessions").default(0).notNull(),
  pageViews: int("page_views").default(0).notNull(),
  uniqueVisitors: int("unique_visitors").default(0).notNull(),
  purchases: int("purchases").default(0).notNull(),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  dateCountryIdx: index("cs_date_country_idx").on(table.date, table.country),
  dateIdx: index("cs_date_idx").on(table.date),
  countryIdx: index("cs_country_idx").on(table.country),
}));
export type CountryStat = typeof countryStats.$inferSelect;
export type InsertCountryStat = typeof countryStats.$inferInsert;

// ─── Analytics: Search Keywords (검색 키워드 통계) ────────────────────────────
export const searchKeywords = mysqlTable("search_keywords", {
  id: int("id").autoincrement().primaryKey(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  count: int("count").default(1).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  conversions: int("conversions").default(0).notNull(), // 검색 후 구매로 이어진 경우
  revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  keywordDateIdx: index("sk_keyword_date_idx").on(table.keyword, table.date),
  dateIdx: index("sk_date_idx").on(table.date),
  keywordIdx: index("sk_keyword_idx").on(table.keyword),
}));
export type SearchKeyword = typeof searchKeywords.$inferSelect;
export type InsertSearchKeyword = typeof searchKeywords.$inferInsert;

// ─── Product Audit Log (상품 수정 이력) ────────────────────────────────────────
export const productAuditLogs = mysqlTable("product_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id").notNull(),
  productName: varchar("product_name", { length: 500 }).notNull(),
  adminId: int("admin_id").notNull(),
  adminName: varchar("admin_name", { length: 255 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // 'update', 'create', 'delete', 'stock_update'
  changedFields: text("changed_fields"), // JSON: 변경된 필드 목록
  oldValues: text("old_values"),         // JSON: 변경 전 값
  newValues: text("new_values"),         // JSON: 변경 후 값
  note: varchar("note", { length: 1000 }), // 메모
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  productIdIdx: index("pal_product_id_idx").on(table.productId),
  adminIdIdx: index("pal_admin_id_idx").on(table.adminId),
  createdAtIdx: index("pal_created_at_idx").on(table.createdAt),
  actionIdx: index("pal_action_idx").on(table.action),
}));
export type ProductAuditLog = typeof productAuditLogs.$inferSelect;
export type InsertProductAuditLog = typeof productAuditLogs.$inferInsert;


// ─── Email Templates (메일 템플릿 관리) ────────────────────────────────────────
export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  templateKey: varchar("template_key", { length: 100 }).notNull().unique(), // e.g., 'retry_payment', 'order_confirmation'
  templateName: varchar("template_name", { length: 255 }).notNull(), // 한글 이름: "결제 재시도", "주문 확인"
  subject: text("subject").notNull(), // 메일 제목 템플릿 (변수 포함 가능: {{customerName}}, {{orderAmount}} 등)
  bodyText: text("body_text").notNull(), // 메일 본문 텍스트 (HTML 제거된 순수 텍스트)
  isActive: boolean("is_active").default(true).notNull(),
  description: text("description"), // 템플릿 설명 및 사용 가능한 변수 목록
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  templateKeyIdx: index("et_template_key_idx").on(table.templateKey),
  isActiveIdx: index("et_is_active_idx").on(table.isActive),
}));

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;
