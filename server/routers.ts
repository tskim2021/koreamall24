import { COOKIE_NAME, ONE_YEAR_MS, ONE_DAY_MS } from "@shared/const";
import { withCache, cacheInvalidate, TTL_30MIN, TTL_10MIN, TTL_5MIN, TTL_1MIN } from "./cache";
import { getSessionCookieOptions } from "./_core/cookies";
import { updateAddressLastUsedByDetails } from "./updateAddressUsage";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { eq, desc, asc, sql, and, gte, lte, or, ne, isNull, like, gt, inArray } from "drizzle-orm";
import { users, registeredUsers, orders, orderItems, products, coupons, couponUsages, wishlists, pointTransactions, productPriceTiers, shipments as shipmentsTable, categories, membershipTiers, referralRewards, loginHistory, referralSettings, cartItems } from "../drizzle/schema";
import type { InsertOrder, InsertShipment, InsertShipmentEvent } from "../drizzle/schema";
import {
  getAllCategories,
  getAllCategoriesWithCount,
  getDb,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getSiteSetting,
  upsertSiteSetting,
  getAllSiteSettings,
  getSeoSetting,
  upsertSeoSetting,
  getAllSeoSettings,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getTimeSaleProducts,
  getMonthlySaleProducts,
  getPopularProducts,
  getNewProducts,
  getTodayBestSellingProducts,
  getHitProducts,
  getRecommendedProducts,
  getWeeklyBestProducts,
  searchProducts,
  trackProductView,
  getPersonalizedRecommendations,
  getSmartRelatedProducts,
  getRecentlyViewedProducts,
  getOrCreateProductSalesInfo,
  updateProductSalesInfo,
  getOrCreateProductSeoMetadata,
  updateProductSeoMetadata,
  getOrCreateProductShippingInfo,
  updateProductShippingInfo,
  getProductPromotionCodes,
  createPromotionCode,
  getStockHistory,
  getProductImageOrder,
  mergeProductThumbnails,
  mergeProductThumbnail,
  getManualRelatedProducts,
  updateRelatedProducts,
  getProductReviews,
  createReview,
  getLatestReviews,
  getAllReviews,
  getCartItems,
  getCartItemCount,
  addToCart,
  getPendingOrdersCount,
  getUnansweredInquiriesCount,
  getUnansweredProductQuestionsCount,
  getCustomerDetail,
  getCustomerNotes,
  createCustomerNote,
  updateCustomerNote,
  deleteCustomerNote,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  removeCartItemsByIds,
  getActiveBanners,
  createEmailVerification,
  verifyEmailCode,
  isEmailVerified,
  getRegisteredUserByEmail,
  createRegisteredUser,
  updateRegisteredUserLastSignIn,
  upsertUser,
  getUserByOpenId,
  createPasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenUsed,
  updateRegisteredUserPassword,
  createOrder,
  getOrdersByUserId,
  getOrderById,
  getOrderByOrderNumber,
  getOrderItems,
  getOrdersByCartGroupId,
  getItemsByCartGroupId,
  saveOrderItems,
  cancelOrder,
  getAllOrders,
  getDelayedShipmentOrders,
  getShipmentDelayedOrders,
  adminUpdateOrderStatus,
  adminGetOrderById,
  getAllRegisteredUsers,
  adminGetAllProducts,
  adminCreateProduct,
  updateProduct,
  deleteProduct,
  getDashboardStats,
  getDailyRevenueChart,
  getTopProductsBySales,
  getRecentOrders,
  getCustomerOrderStats,
  getAllAnnouncements,
  adminGetAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementComments,
  createAnnouncementComment,
  deleteAnnouncementComment,
  updateAnnouncementComment,
  getAllInquiries,
  getInquiryById,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  incrementInquiryViewCount,
  getInquiryComments,
  createInquiryComment,
  deleteInquiryComment,
  updateInquiryComment,
  updateInquiryCommentFull,
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  incrementEventViewCount,
  adminGetAllEvents,
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  isInWishlist,
  updateUserProfile,
  updateRegisteredUserProfile,
  getShipmentByOrderId,
  getShipmentByTrackingNumber,
  getShipmentEvents,
  createShipment,
  updateShipmentStatus,
  addShipmentEvent,
  adminSearchOrders,
  adminGetOrderDetail,
  adminGetCartGroups,
  adminGetCartGroupDetail,
  updateOrderItemTracking,
  getUserCartGroups,
  updateOrderAdminNotes,
  bulkUpdateOrderStatus,
  bulkConfirmBankTransfer,
  adminUpdateShipmentInfo,
  getOrderStatistics,
  updateShipmentTrackingNumber,
  getRegisteredUserById,
  adminExportOrders,
  getUserOrdersAdvanced,
  getUserReviewsByProductIds,
  getOrderStatusHistory,
  getUserAddresses,
  getDefaultAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getChatbotSetting,
  getAllChatbotSettings,
  upsertChatbotSetting,
  createChatbotConversation,
  getChatbotConversation,
  getChatbotConversationBySession,
  updateChatbotConversation,
  getAllChatbotConversations,
  createChatbotMessage,
  getChatbotMessages,
  getAllChatbotFaqs,
  getChatbotFaqById,
  createChatbotFaq,
  updateChatbotFaq,
  deleteChatbotFaq,
  incrementFaqMatchCount,
  getAllBlockedKeywords,
  createBlockedKeyword,
  deleteBlockedKeyword,
  getChatbotStats,
  matchFaq,
  checkBlockedKeywords,
  createSettingAuditLog,
  getSettingAuditLogs,
  buildFullName,
  recalculateMembershipTier,
  createProductAuditLog,
  getProductAuditLogs,
  getProductAuditLogCount,
  getOrderCountsByUserIds,
} from "./db";
import { sdk } from "./_core/sdk";
import { generateVerificationCode, sendVerificationEmail, generateResetToken, sendPasswordResetEmail } from "./_core/email";
import { TRPCError } from "@trpc/server";
import { createCheckoutSession, getCheckoutSession } from "./stripe";
import { storagePut } from "./storage";
import { fetchJapanPostTracking, isValidJapanPostTrackingNumber } from "./_core/japanPostTracking";
import { syncTrackingCache, syncAllActiveTrackings, getTrackingCache } from "./_core/trackingCacheSync";
import { sendOrderStatusEmail } from "./_core/orderStatusEmail";
import { getCartBasedRecommendations } from "./db_cart_recommendations";
import { paymentRouter } from "./routers/paymentRouter";
import { membershipRouter } from "./routers/membershipRouter";
import { emailRouter } from "./routers/emailRouter";
import { bulkEmailRouter } from "./routers/bulkEmailRouter";
import { gmailRouter } from "./routers/gmailRouter";

/**
 * Extract registeredUsers.id from ctx.user.
 * ctx.user.openId is "email_{registeredUserId}" for email-login users.
 * Falls back to ctx.user.id for Manus OAuth users (where users.id == registeredUsers.id).
 */
function getRegisteredUserId(user: { id: number; openId: string }): number {
  if (user.openId && user.openId.startsWith('email_')) {
    const parsed = parseInt(user.openId.slice(6), 10);
    if (!isNaN(parsed)) return parsed;
  }
  return user.id;
}

export const appRouter = router({
  system: systemRouter,
  membership: membershipRouter,
  email: emailRouter,
  bulkEmail: bulkEmailRouter,
  gmail: gmailRouter,
  
  // Public Settings API
  settings: router({
    getReviewPoints: publicProcedure.query(async () => {
      const settings = await getAllSiteSettings();
      const base = parseInt(settings.find(s => s.key === "REVIEW_POINTS")?.value || "1500", 10);
      const image = parseInt(settings.find(s => s.key === "REVIEW_IMAGE_POINTS")?.value || "500", 10);
      const detail = parseInt(settings.find(s => s.key === "REVIEW_DETAIL_POINTS")?.value || "200", 10);
      return { base, image, detail, max: base + image + detail };
    }),
    getSignupPoints: publicProcedure.query(async () => {
      const settings = await getAllSiteSettings();
      const signupPoints = parseInt(settings.find(s => s.key === "SIGNUP_POINTS")?.value || "500", 10);
      return { signupPoints };
    }),
  }),
  
  // Public SEO API
  seo: router({
    get: publicProcedure
      .input(z.object({ page: z.string() }))
      .query(async ({ input }) => {
        return getSeoSetting(input.page);
      }),
  }),

  // Public Search Console verification tags API
  searchConsole: router({
    getVerificationTags: publicProcedure.query(async () => {
      const keys = [
        "SEARCH_GOOGLE_VERIFICATION",
        "SEARCH_BING_VERIFICATION",
        "SEARCH_YAHOO_VERIFICATION",
        "SEARCH_NAVER_VERIFICATION",
        "SEARCH_BAIDU_VERIFICATION",
        "SEARCH_YANDEX_VERIFICATION",
        "SEARCH_GOOGLE_SITEMAP",
      ];
      const settings = await getAllSiteSettings();
      const result: Record<string, string> = {};
      for (const key of keys) {
        const found = settings.find((s: { key: string; value: string | null }) => s.key === key);
        if (found?.value) result[key] = found.value;
      }
      return result;
    }),
    // robots.txt 取得 (管理者専用)
    getRobotsTxt: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const setting = await getSiteSetting('ROBOTS_TXT_CONTENT');
      return {
        content: setting?.value ?? null,
        defaultContent: `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /mypage/\nDisallow: /checkout/\nDisallow: /cart\n\nSitemap: https://koreamall24.com/sitemap.xml`,
      };
    }),
    // robots.txt 保存 (管理者専用)
    saveRobotsTxt: protectedProcedure
      .input(z.object({ content: z.string().max(10000) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await upsertSiteSetting('ROBOTS_TXT_CONTENT', input.content, 'robots.txtカスタム内容');
        return { success: true };
      }),
    // サイトマップ手動更新 (管理者専用)
    refreshSitemap: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const { refreshSitemapCache, getSitemapLastGeneratedAt } = await import('./sitemapScheduler');
      await refreshSitemapCache();
      return { success: true, generatedAt: getSitemapLastGeneratedAt()?.toISOString() ?? null };
    }),
    // サイトマップ最終更新日時取得 (管理者専用)
    getSitemapStatus: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const { getSitemapLastGeneratedAt } = await import('./sitemapScheduler');
      return { lastGeneratedAt: getSitemapLastGeneratedAt()?.toISOString() ?? null };
    }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    // Email/password login
    loginWithEmail: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
        rememberMe: z.boolean().optional().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        // Find registered user by email
        const registeredUser = await getRegisteredUserByEmail(input.email);
        if (!registeredUser) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "メールアドレスまたはパスワードが正しくありません。",
          });
        }

        // Verify password with bcrypt
        const bcrypt = await import('bcryptjs');
        const isPasswordValid = await bcrypt.compare(input.password, registeredUser.password);
        if (!isPasswordValid) {
          // Fallback: check legacy base64 format and migrate
          const legacyHash = Buffer.from(input.password).toString("base64");
          if (registeredUser.password !== legacyHash) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "メールアドレスまたはパスワードが正しくありません。",
            });
          }
          // Migrate legacy password to bcrypt
          const newHash = await bcrypt.hash(input.password, 10);
          await updateRegisteredUserPassword(registeredUser.email, newHash);
        }

        // Create openId from email for session management
        const openId = `email_${registeredUser.id}`;

        // Upsert to users table for session management
        await upsertUser({
          openId,
          name: registeredUser.nameKanji,
          email: registeredUser.email,
          loginMethod: "email",
          lastSignedIn: new Date(),
        });

        // Update last sign in for registered user
        await updateRegisteredUserLastSignIn(registeredUser.email);

        // Create session token
        const sessionDuration = input.rememberMe ? ONE_YEAR_MS : ONE_DAY_MS;
        const sessionToken = await sdk.createSessionToken(openId, {
          name: registeredUser.nameKanji,
          expiresInMs: sessionDuration,
        });

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        if (input.rememberMe) {
          // 로그인 상태 유지: 1년간 쿠키 유지
          ctx.res.cookie(COOKIE_NAME, sessionToken, {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });
        } else {
          // 로그인 상태 유지 미선택: 브라우저 세션 쿠키 (maxAge 없음)
          ctx.res.cookie(COOKIE_NAME, sessionToken, {
            ...cookieOptions,
          });
        }

        // Get user from users table
        const user = await getUserByOpenId(openId);

        // ログイン履歴記録
        try {
          const database = await getDb();
          if (database) {
            const userAgent = ctx.req.headers["user-agent"] || "";
            const ipAddress = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ctx.req.ip || "";
            const device = /Mobile|Android|iPhone/i.test(userAgent) ? "Mobile" : "Desktop";
            const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)[\/\s]([\d.]+)/);
            const browser = browserMatch ? browserMatch[1] : "Unknown";
            await database.insert(loginHistory).values({
              userId: registeredUser.id,
              ipAddress,
              userAgent,
              device,
              browser,
              country: null,
            });
          }
        } catch (loginHistoryErr) {
          console.error("[Login] Login history recording failed", loginHistoryErr);
        }

        return {
          success: true,
          message: "ログインしました。",
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
          } : null,
        };
      }),
  }),

  // Category routes
  category: router({
    list: publicProcedure.query(async () => {
      return withCache('category:list', TTL_1MIN, () => getAllCategories());
    }),
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string(), withProducts: z.boolean().optional() }))
      .query(async ({ input }) => {
        const category = await withCache(`category:slug:${input.slug}`, TTL_1MIN, () => getCategoryBySlug(input.slug));
        if (!input.withProducts || !category) return category;
        // withProducts=true 시 카테고리 + 초기 상품 목록을 한 번에 반환 (직렬 요청 제거)
        const { getProductsByCategory, mergeProductThumbnails } = await import('./db');
        const products = await withCache(
          `category:${category.id}:products:newest:30:0`,
          TTL_30MIN,
          async () => mergeProductThumbnails(await getProductsByCategory(category.id, { sortBy: 'newest', limit: 30, offset: 0 }))
        );
        return { ...category, initialProducts: products };
      }),
  }),

  // Product routes
  product: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 12;
        return withCache(`product:list:${limit}`, TTL_1MIN, async () => {
          const productList = await getAllProducts();
          return mergeProductThumbnails(productList.slice(0, limit));
        });
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return withCache(`product:detail:${input.id}`, TTL_1MIN, async () => {
          const product = await getProductById(input.id);
          return mergeProductThumbnail(product);
        });
      }),
    getByCategory: publicProcedure
      .input(z.object({
        categoryId: z.number(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["newest", "oldest", "price_asc", "price_desc", "rating", "popular"]).optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        inStockOnly: z.boolean().optional(),
        discountOnly: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const hasFilter = !!(input.search || input.minPrice || input.maxPrice || input.inStockOnly || input.discountOnly);
        const sortBy = input.sortBy || 'newest';
        const limit = input.limit ?? 30;
        const offset = input.offset ?? 0;
        // 필터가 없는 기본 조회는 서버 캐시 적용 (30분)
        if (!hasFilter) {
          const cacheKey = `category:${input.categoryId}:products:${sortBy}:${limit}:${offset}`;
          return withCache(cacheKey, TTL_30MIN, async () => {
            const list = await getProductsByCategory(input.categoryId, { sortBy, limit, offset });
            return mergeProductThumbnails(list);
          });
        }
        // 필터가 있으면 캐시 없이 직접 조회
        const list = await getProductsByCategory(input.categoryId, {
          search: input.search,
          sortBy,
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          inStockOnly: input.inStockOnly,
          discountOnly: input.discountOnly,
          limit,
          offset,
        });
        return mergeProductThumbnails(list);
      }),
    timeSale: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return withCache('product:timeSale', TTL_1MIN, async () => {
          const list = await getTimeSaleProducts();
          return mergeProductThumbnails(list);
        });
      }),
    monthlySale: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return withCache('product:monthlySale', TTL_1MIN, async () => {
          const list = await getMonthlySaleProducts();
          return mergeProductThumbnails(list);
        });
      }),
    popular: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return withCache('product:popular', TTL_1MIN, async () => {
          const list = await getPopularProducts();
          return mergeProductThumbnails(list);
        });
      }),
    newArrivals: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const withThumbs = await withCache('product:newArrivals', TTL_1MIN, async () => {
          const list = await getNewProducts();
          return mergeProductThumbnails(list);
        });
        return input?.limit ? withThumbs.slice(0, input.limit) : withThumbs;
      }),
    todayBest: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(20).optional() }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 10;
        return withCache(`product:todayBest:${limit}`, TTL_1MIN, async () => {
          const list = await getTodayBestSellingProducts(limit);
          return mergeProductThumbnails(list);
        });
      }),
    hitProducts: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(20).optional() }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 10;
        return withCache(`product:hitProducts:${limit}`, TTL_1MIN, async () => {
          const list = await getHitProducts(limit);
          return mergeProductThumbnails(list);
        });
      }),
    recommendedProducts: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(30).optional() }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 12;
        return withCache(`product:recommended:${limit}`, TTL_1MIN, async () => {
          const list = await getRecommendedProducts(limit);
          return mergeProductThumbnails(list);
        });
      }),
    getWeeklyBest: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit || 6;
        return withCache(`product:weeklyBest:${limit}`, TTL_1MIN, async () => {
          const list = await getWeeklyBestProducts(limit);
          return mergeProductThumbnails(list);
        });
      }),
    search: publicProcedure
      .input(z.object({
        query: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        sortBy: z.enum(["newest", "oldest", "price_asc", "price_desc", "popular"]).optional(),
        categoryId: z.number().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        inStockOnly: z.boolean().optional(),
        discountOnly: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const { query, limit = 48, offset = 0, sortBy = 'newest', categoryId, minPrice, maxPrice, inStockOnly, discountOnly } = input;
        let list = await searchProducts(query);
        // 카테고리 필터
        if (categoryId) {
          list = list.filter(p => p.categoryId === categoryId);
        }
        // 가격 필터
        if (minPrice !== undefined) {
          list = list.filter(p => Number(p.price) >= minPrice);
        }
        if (maxPrice !== undefined) {
          list = list.filter(p => Number(p.price) <= maxPrice);
        }
        // 재고 필터
        if (inStockOnly) {
          list = list.filter(p => (p.stock ?? 0) > 0);
        }
        // 할인 필터
        if (discountOnly) {
          list = list.filter(p => p.originalPrice && Number(p.originalPrice) > Number(p.price));
        }
        // 정렬
        if (sortBy === 'price_asc') list.sort((a, b) => Number(a.price) - Number(b.price));
        else if (sortBy === 'price_desc') list.sort((a, b) => Number(b.price) - Number(a.price));
        else if (sortBy === 'oldest') list.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
        else if (sortBy === 'popular') list.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
        else list.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
        const total = list.length;
        const paged = list.slice(offset, offset + limit);
        return { items: await mergeProductThumbnails(paged), total };
      }),
    trackView: publicProcedure
      .input(z.object({ productId: z.number(), categoryId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user) {
          await trackProductView(ctx.user.id, input.productId, input.categoryId);
        }
        return { success: true };
      }),
    getRecommendations: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          const list = await getPopularProducts();
          return mergeProductThumbnails(list);
        }
        const list = await getPersonalizedRecommendations(ctx.user.id, input?.limit ?? 6);
        return mergeProductThumbnails(list);
      }),
    getSmartRelated: publicProcedure
      .input(z.object({ productId: z.number(), categoryId: z.number(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user?.id ?? null;
        const list = await getSmartRelatedProducts(userId, input.productId, input.categoryId, input.limit ?? 6);
        return mergeProductThumbnails(list);
      }),
    getByTags: publicProcedure
      .input(z.object({ productId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        const limit = input.limit ?? 4;
        return withCache(`product:byTags:${input.productId}:${limit}`, TTL_10MIN, async () => {
          const { getProductsByTags } = await import("./db");
          const list = await getProductsByTags(input.productId, limit);
          return mergeProductThumbnails(list);
        });
      }),
    getAlsoViewed: publicProcedure
      .input(z.object({ productId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        const limit = input.limit ?? 6;
        return withCache(`product:alsoViewed:${input.productId}:${limit}`, TTL_10MIN, async () => {
          const { getAlsoViewedProducts } = await import("./db");
          const list = await getAlsoViewedProducts(input.productId, limit);
          return mergeProductThumbnails(list);
        });
      }),
    getRecentlyViewed: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const list = await getRecentlyViewedProducts(ctx.user.id, input?.limit ?? 8);
        return mergeProductThumbnails(list);
      }),
    getActivePriceTiers: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return withCache(`product:priceTiers:${input.productId}`, TTL_10MIN, async () => {
          const { getActiveProductPriceTiers } = await import("./db");
          return await getActiveProductPriceTiers(input.productId);
        });
      }),
    getImageOrder: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return withCache(`product:imageOrder:${input.productId}`, TTL_10MIN, async () => {
          try {
            return await getProductImageOrder(input.productId);
          } catch (error: any) {
            console.error("Failed to get product image order:", error);
            return [];
          }
        });
      }),
  }),
  // Recommendation tracking routess
  recommendations: router({
    trackEvent: publicProcedure
      .input(z.object({
        productId: z.number(),
        recommendedProductId: z.number(),
        recommendationType: z.enum(['tag_based', 'collaborative', 'category_based', 'after_review']),
        eventType: z.enum(['impression', 'click']),
        userId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { trackRecommendationEvent } = await import("./db");
        await trackRecommendationEvent(
          input.productId,
          input.recommendedProductId,
          input.recommendationType,
          input.eventType,
          input.userId
        );
        return { success: true };
      }),
    // Batch impression tracking: replaces N individual trackEvent calls with one request
    bulkTrackImpressions: publicProcedure
      .input(z.object({
        productId: z.number(),
        recommendedProductIds: z.array(z.number()).max(30),
        recommendationType: z.enum(['tag_based', 'collaborative', 'category_based', 'after_review']),
        userId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { trackRecommendationEvent } = await import("./db");
        // Fire-and-forget: do not await individual inserts to keep response fast
        Promise.allSettled(
          input.recommendedProductIds
            .filter(id => id !== input.productId)
            .map(id => trackRecommendationEvent(
              input.productId,
              id,
              input.recommendationType,
              'impression',
              input.userId
            ))
        ).catch(() => {});
        return { success: true };
      }),
    getStats: publicProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getRecommendationStats } = await import("./db");
        return getRecommendationStats(input?.startDate, input?.endDate);
      }),
    getTopProducts: publicProcedure
      .input(z.object({
        recommendationType: z.enum(['tag_based', 'collaborative', 'category_based', 'after_review']),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const { getTopRecommendedProducts } = await import("./db");
        return getTopRecommendedProducts(input.recommendationType, input.limit ?? 10);
      }),
  }),
  // Review routess
  review: router({
    getByProduct: publicProcedure
      .input(z.object({
        productId: z.number(),
        limit: z.number().optional(),
        sort: z.enum(['newest', 'highest', 'lowest', 'images']).optional(),
      }))
      .query(async ({ input }) => {
        const sort = input.sort ?? 'newest';
        return withCache(`review:byProduct:${input.productId}:${sort}`, TTL_5MIN, () =>
          getProductReviews(input.productId, sort)
        );
      }),
    latest: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 8;
        return withCache(`review:latest:${limit}`, TTL_10MIN, () => getLatestReviews(limit));
      }),
    all: publicProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getAllReviews(input?.limit, input?.offset);
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getReviewById } = await import('./db');
        return getReviewById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        productId: z.number(),
        orderId: z.number().optional().default(0),
        orderItemId: z.number().optional().default(0),
        rating: z.number().min(1).max(5),
        title: z.string().optional(),
        content: z.string().optional(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { addPointsToUser, getOrderById, getOrderItems, getSetting, getDb } = await import("./db");
        const { orderItems: orderItemsTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        // orderIdがある場合のみ注文検証 (商品詳細ページではorderIdなしでレビュー作成可能)
        const hasOrderContext = !!(input.orderId && input.orderId > 0);

        if (hasOrderContext) {
          // 1. Verify order exists and belongs to user
          const order = await getOrderById(input.orderId!);
          if (!order || (order.userId !== ctx.user.id && ctx.user.role !== "admin")) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'この注文にアクセスする権限がありません',
            });
          }

          // 2. Verify order is delivered
          if (order.status !== 'delivered') {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: '配達完了後にレビューを投稿できます',
            });
          }

          // 3. Verify product is in order
          const orderItems = await getOrderItems(input.orderId!);
          const orderItem = orderItems.find(item => item.id === input.orderItemId && item.productId === input.productId);
          if (!orderItem) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'この商品は注文に含まれていません',
            });
          }

          // 4. Check if review already exists
          if (orderItem.reviewId) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'この商品のレビューは既に投稿済みです',
            });
          }

          // 5. Check review deadline (90 days after delivery)
          const deliveryDate = order.updatedAt || order.createdAt;
          const daysSinceDelivery = Math.floor((Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceDelivery > 90) {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: 'レビュー投稿期限（配達完了後90日）を過ぎています',
            });
          }
        }

        // 5-b. Check for duplicate review (same user + same product) regardless of order context
        const { getUserReviewForProduct } = await import('./db');
        const existingReview = await getUserReviewForProduct(ctx.user.id, input.productId);
        if (existingReview) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'この商品のレビューは既に投稿済みです',
          });
        }

        // 6. Upload images to S3 (convert base64 to S3 URLs)
        let imageUrls: string[] = [];
        if (input.images && input.images.length > 0) {
          const { storagePut } = await import('./storage');
          for (const img of input.images) {
            try {
              if (img.startsWith('data:')) {
                // base64 image - upload to S3
                const matches = img.match(/^data:image\/(\w+);base64,(.+)$/);
                if (matches) {
                  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                  const buffer = Buffer.from(matches[2], 'base64');
                  const fileKey = `reviews/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                  const { url } = await storagePut(fileKey, buffer, `image/${matches[1]}`);
                  imageUrls.push(url);
                }
              } else {
                // Already a URL (e.g. from edit)
                imageUrls.push(img);
              }
            } catch (uploadErr) {
              console.error('[Review] Image upload failed:', uploadErr);
            }
          }
        }

        // 7. Create review
        const reviewId = await createReview({
          productId: input.productId,
          userId: ctx.user.id,
          orderId: hasOrderContext ? input.orderId : undefined,
          orderItemId: hasOrderContext ? input.orderItemId : undefined,
          userName: ctx.user.name || "匿名",
          rating: input.rating,
          title: input.title,
          content: input.content,
          images: imageUrls.length > 0 ? imageUrls : undefined,
        });

        // 8. Update order_items.reviewId (only when order context exists)
        const db = await getDb();
        if (db && reviewId && hasOrderContext && input.orderItemId) {
          await db.update(orderItemsTable).set({ reviewId }).where(eq(orderItemsTable.id, input.orderItemId!));
        }

        // 9. Award points
        const { awardReviewPoints } = await import('./db');
        const pointsResult = await awardReviewPoints({
          userId: ctx.user.id,
          reviewId: reviewId || 0,
          hasImages: !!(input.images && input.images.length > 0),
          contentLength: input.content?.length || 0,
        });

        // 10. Send review points email
        if (pointsResult.totalPoints > 0 && ctx.user.email) {
          try {
            const { sendReviewPointsEmail } = await import('./_core/emailService');
            const productInfo = await getProductById(input.productId);
            const userInfo = await getRegisteredUserById(ctx.user.id);
            const totalPts = userInfo?.points ?? 0;
            sendReviewPointsEmail({
              to: ctx.user.email,
              userName: ctx.user.name || ctx.user.email,
              productName: productInfo?.nameJa || productInfo?.name || '商品',
              earnedPoints: pointsResult.totalPoints,
              totalPoints: totalPts,
            }).catch(err => console.error('[Email] Review points email failed:', err));
          } catch (emailErr) {
            console.error('[Email] Failed to send review points email:', emailErr);
          }
          // レビューポイント積立アプリ内通知
          try {
            const { insertNotification } = await import('./db');
            await insertNotification({
              userId: ctx.user.id,
              type: 'point',
              title: `レビュー投稿でポイントを獲得しました！`,
              message: `レビュー投稿ありがとうございます。${pointsResult.totalPoints}ポイントが付与されました。`,
              link: '/mypage/points',
              templateName: 'review_point',
              templateVars: { points: String(pointsResult.totalPoints) },
            });
          } catch (notifErr) {
            console.error('[Notification] Review points notification failed:', notifErr);
          }
        }
        return { 
          success: true, 
          pointsAwarded: pointsResult.totalPoints,
          pointsBreakdown: pointsResult.breakdown,
        };
      }),
    getDeliveredProducts: protectedProcedure
      .query(async ({ ctx }) => {
        const { getDeliveredProductsForReview } = await import("./db");
        return await getDeliveredProductsForReview(ctx.user.id);
      }),
    getPendingReviewCount: protectedProcedure
      .query(async ({ ctx }) => {
        const { getDeliveredProductsForReview } = await import("./db");
        const products = await getDeliveredProductsForReview(ctx.user.id);
        return products.filter(p => !p.hasReview).length;
      }),
    getUserReviews: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserReviews } = await import("./db");
        return await getUserReviews(ctx.user.id);
      }),
    update: protectedProcedure
      .input(z.object({
        reviewId: z.number(),
        rating: z.number().min(1).max(5).optional(),
        title: z.string().optional(),
        content: z.string().optional(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateReview } = await import("./db");
        // Upload new base64 images to S3
        let imageUrls: string[] | undefined = undefined;
        if (input.images && input.images.length > 0) {
          const { storagePut } = await import('./storage');
          imageUrls = [];
          for (const img of input.images) {
            try {
              if (img.startsWith('data:')) {
                const matches = img.match(/^data:image\/(\w+);base64,(.+)$/);
                if (matches) {
                  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                  const buffer = Buffer.from(matches[2], 'base64');
                  const fileKey = `reviews/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                  const { url } = await storagePut(fileKey, buffer, `image/${matches[1]}`);
                  imageUrls.push(url);
                }
              } else {
                imageUrls.push(img);
              }
            } catch (uploadErr) {
              console.error('[Review] Image upload failed:', uploadErr);
            }
          }
        }
        await updateReview(input.reviewId, ctx.user.id, {
          rating: input.rating,
          title: input.title,
          content: input.content,
          images: imageUrls,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteReview } = await import("./db");
        await deleteReview(input.reviewId, ctx.user.id);
        return { success: true };
      }),
    setBest: protectedProcedure
      .input(z.object({
        reviewId: z.number(),
        isBest: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user is admin
        if (ctx.user.role !== 'admin') {
          throw new Error('管理者権限が必要です');
        }

        const { setReviewBest } = await import("./db");
        await setReviewBest(input.reviewId, input.isBest);
        return { success: true };
      }),
    // Admin: get all reviews with filters
    adminList: protectedProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
        const { adminGetAllReviews } = await import('./db');
        return adminGetAllReviews(input);
      }),
    // Admin: approve or reject a review
    adminUpdateStatus: protectedProcedure
      .input(z.object({
        reviewId: z.number(),
        status: z.enum(['approved', 'rejected']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
        const { adminUpdateReviewStatus } = await import('./db');
        await adminUpdateReviewStatus(input.reviewId, input.status);
        // Send review status email to customer
        try {
          const db = await getDb();
          if (db) {
            const { reviews: reviewsTable } = await import('../drizzle/schema');
            const reviewRows = await db.select().from(reviewsTable).where(eq(reviewsTable.id, input.reviewId)).limit(1);
            const review = reviewRows[0];
            if (review?.userId) {
              const userInfo = await getRegisteredUserById(review.userId);
              if (userInfo?.email) {
                const productInfo = await getProductById(review.productId);
                const { sendReviewStatusEmail } = await import('./_core/emailService');
                const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
                sendReviewStatusEmail({
                  to: userInfo.email,
                  userName: userInfo.nameKanji || userInfo.nameHiragana || userInfo.email,
                  productName: productInfo?.nameJa || productInfo?.name || '商品',
                  status: input.status,
                  reviewUrl: `${frontendUrl}/mypage/reviews`,
                }).catch(err => console.error('[Email] Review status email failed:', err));
              }
            }
          }
        } catch (emailErr) {
          console.error('[Email] Failed to send review status email:', emailErr);
        }
        // レビュー承認/却下アプリ内通知
        try {
          const db2 = await getDb();
          if (db2) {
            const { reviews: reviewsTable2 } = await import('../drizzle/schema');
            const reviewRows2 = await db2.select().from(reviewsTable2).where(eq(reviewsTable2.id, input.reviewId)).limit(1);
            const review2 = reviewRows2[0];
            if (review2?.userId) {
              const { insertNotification } = await import('./db');
              const isApproved = input.status === 'approved';
              await insertNotification({
                userId: review2.userId,
                type: 'review',
                title: isApproved ? 'レビューが承認されました' : 'レビューが非承認になりました',
                message: isApproved
                  ? 'お客様のレビューが承認され、商品ページに掲載されました。'
                  : 'お客様のレビューは審査の結果、掲載できませんでした。',
                link: '/mypage/reviews',
                templateName: isApproved ? 'review_approved' : 'review_rejected',
              });
            }
          }
        } catch (notifErr) {
          console.error('[Notification] Review status notification failed:', notifErr);
        }
        return { success: true };
      }),
    // Admin: delete any review
    adminUpdateCreatedAt: protectedProcedure
      .input(z.object({
        reviewId: z.number(),
        createdAt: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
        const { adminUpdateReviewCreatedAt } = await import('./db');
        await adminUpdateReviewCreatedAt(input.reviewId, input.createdAt);
        return { success: true };
      }),
    adminDelete: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
        const { adminDeleteReview } = await import('./db');
        await adminDeleteReview(input.reviewId);
        return { success: true };
      }),
    // Admin: get review counts by status
    adminCounts: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
        const { getReviewCountByStatus } = await import('./db');
        return getReviewCountByStatus();
      }),
  }),
  // Cart routes
  cart: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const items = await getCartItems(ctx.user.id);
      // Merge thumbnail images for cart products
      const cartProducts = items.map(i => i.product).filter(p => p && p.id);
      const merged = await mergeProductThumbnails(cartProducts);
      const mergedMap = new Map(merged.map(p => [p.id, p]));
      return items.map(item => ({
        ...item,
        product: mergedMap.get(item.product?.id) || item.product,
      }));
    }),
    buyNowPreview: protectedProcedure
      .input(z.object({ 
        productId: z.number(), 
        quantity: z.number(), 
        priceTierId: z.number().optional() 
      }))
      .query(async ({ input }) => {
        const product = await getProductById(input.productId);
        if (!product) return null;
        
        // Get price tier if provided
        let priceTier = null;
        if (input.priceTierId) {
          const db = await (await import('./db')).getDb();
          if (db) {
            const { productPriceTiers } = await import('../drizzle/schema');
            const { eq } = await import('drizzle-orm');
            priceTier = await db.select()
              .from(productPriceTiers)
              .where(eq(productPriceTiers.id, input.priceTierId))
              .limit(1)
              .then((r: any[]) => r[0] || null);
          }
        }
        
        const mergedProduct = await mergeProductThumbnail(product);
        
        return {
          cartItem: {
            id: -1,
            userId: -1,
            productId: input.productId,
            quantity: input.quantity,
            priceTierId: input.priceTierId || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          product: mergedProduct,
          priceTier: priceTier,
        };
      }),
    count: protectedProcedure.query(async ({ ctx }) => {
      return getCartItemCount(ctx.user.id);
    }),
    add: protectedProcedure
      .input(z.object({ productId: z.number(), quantity: z.number().optional(), priceTierId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        await addToCart(ctx.user.id, input.productId, input.quantity ?? 1, input.priceTierId);
        return { success: true };
      }),
    updateQuantity: protectedProcedure
      .input(z.object({ id: z.number(), quantity: z.number() }))
      .mutation(async ({ input }) => {
        await updateCartItemQuantity(input.id, input.quantity);
        return { success: true };
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await removeFromCart(input.id);
        return { success: true };
      }),
    clear: protectedProcedure.mutation(async ({ ctx }) => {
      await clearCart(ctx.user.id);
      return { success: true };
    }),
    recommendations: protectedProcedure.query(async ({ ctx }) => {
      const recommendations = await getCartBasedRecommendations(ctx.user.id, 6);
      // Merge thumbnail images for recommended products
      const merged = await mergeProductThumbnails(recommendations);
      return merged;
    }),
  }),

  // Banner routes
  banner: router({
    list: publicProcedure.query(async () => {
      return withCache('banner:main', TTL_30MIN, () => getActiveBanners('main'));
    }),
    // タイプ別バナー取得 (sidebar_top, sidebar_bottom)
    listByType: publicProcedure
      .input(z.object({ bannerType: z.enum(["main", "sidebar_top", "sidebar_bottom"]) }))
      .query(async ({ input }) => {
        return withCache(`banner:${input.bannerType}`, TTL_30MIN, () => getActiveBanners(input.bannerType));
      }),
  }),

  // Email verification routes
  emailAuth: router({
    // Placeholder for sendCode (no longer used)
    sendCode: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        // Email verification is no longer required
        return { success: true, message: "認証コードを送信しました。" };
      }),

    // Placeholder for verifyCode (no longer used)
    verifyCode: publicProcedure
      .input(z.object({ 
        email: z.string().email(),
        code: z.string().length(6)
      }))
      .mutation(async ({ input }) => {
        // Email verification is no longer required
        return { success: true, message: "メールアドレスが確認されました。" };
      }),

     // Complete registration (without email verification)
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        nameKanji: z.string().min(1),
        nameHiragana: z.string().min(1),
        lastNameKanji: z.string().min(1),
        firstNameKanji: z.string().min(1),
        lastNameKatakana: z.string().min(1),
        firstNameKatakana: z.string().min(1),
        gender: z.enum(["male", "female", "no_answer"]).optional(),
        referralCode: z.string().optional(), // 紹介コード入力
        rememberMe: z.boolean().optional().default(false), // 로그인 상태 유지
        address: z.object({
          recipientNameKanji: z.string().min(1),
          recipientNameHiragana: z.string().min(1),
          postalCode: z.string().min(1),
          prefecture: z.string().min(1),
          city: z.string().min(1),
          address1: z.string().min(1),
          address2: z.string().optional(),
          phone: z.string().min(1),
          isDefault: z.boolean().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if email is already registered
        const existingUser = await getRegisteredUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "このメールアドレスは既に登録されています。",
          });
        }

        // Check if phone is already registered (phone is in address.phone)
        if (input.address?.phone) {
          const phoneCheckDb = await getDb();
          if (phoneCheckDb) {
            const existingPhone = await phoneCheckDb.select({ id: registeredUsers.id })
              .from(registeredUsers)
              .where(eq(registeredUsers.phone, input.address.phone))
              .limit(1);
            if (existingPhone.length > 0) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "この電話番号は既に登録されています。",
              });
            }
          }
        }

        // Validate referral code and find referrer
        let referrerId: number | null = null;
        if (input.referralCode) {
          const refDb = await getDb();
          if (refDb) {
            const referrer = await refDb.select({ id: registeredUsers.id })
              .from(registeredUsers)
              .where(eq(registeredUsers.referralCode, input.referralCode))
              .limit(1);
            if (referrer[0]) {
              referrerId = referrer[0].id;
            }
          }
        }

        // Generate unique referral code for new user
        const newReferralCode = (() => {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let code = '';
          for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return code;
        })();

        // Hash password with bcrypt
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(input.password, 10);
        // SIGNUP_POINTS: DB 설정값 읽기 (기본값 300)
        const allSettingsForSignup = await getAllSiteSettings();
        const signupInitialPoints = parseInt(allSettingsForSignup.find(s => s.key === 'SIGNUP_POINTS')?.value || '300', 10);
        const registeredUser = await createRegisteredUser({
          email: input.email,
          password: hashedPassword,
          nameKanji: input.nameKanji,
          nameHiragana: input.nameHiragana,
          lastNameKanji: input.lastNameKanji,
          firstNameKanji: input.firstNameKanji,
          lastNameKatakana: input.lastNameKatakana,
          firstNameKatakana: input.firstNameKatakana,
          gender: input.gender ?? "no_answer",
          isEmailVerified: true,
          referralCode: newReferralCode,
          referredBy: referrerId,
          points: signupInitialPoints,
        });

        // Auto-login: Create openId from email for session management
        if (registeredUser) {
          const openId = `email_${registeredUser.id}`;

          // Upsert to users table for session management
          const user: Awaited<ReturnType<typeof upsertUser>> = await upsertUser({
            openId,
            name: input.nameKanji,
            email: input.email,
            loginMethod: "email",
            lastSignedIn: new Date(),
            nameKanji: input.nameKanji,
            nameHiragana: input.nameHiragana,
          });
          
          // Create address if provided
          if (input.address && user) {
            await createAddress({
              userId: user.id,
              ...input.address,
              isDefault: input.address.isDefault ?? true,
            });
          }

          // Create session token with rememberMe setting
          const sessionDuration = input.rememberMe ? ONE_YEAR_MS : ONE_DAY_MS;
          const sessionToken = await sdk.createSessionToken(openId, {
            name: input.nameKanji,
            expiresInMs: sessionDuration,
          });

          // Set session cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          if (input.rememberMe) {
            // 로그인 상태 유지: 1년간 쿠키 유지
            ctx.res.cookie(COOKIE_NAME, sessionToken, {
              ...cookieOptions,
              maxAge: ONE_YEAR_MS,
            });
          } else {
            // 로그인 상태 유지 미선택: 브라우저 세션 쿠키 (maxAge 없음)
            ctx.res.cookie(COOKIE_NAME, sessionToken, {
              ...cookieOptions,
            });
          }

          // Auto-assign BRONZE membership tier to new user
          try {
            const tierDb = await getDb();
            if (tierDb && registeredUser) {
              const bronzeTier = await tierDb.select({ id: membershipTiers.id })
                .from(membershipTiers)
                .where(eq(membershipTiers.sortOrder, 1))
                .limit(1);
              if (bronzeTier[0]) {
                await tierDb.update(registeredUsers)
                  .set({ membershipTierId: bronzeTier[0].id })
                  .where(eq(registeredUsers.id, registeredUser.id));
              }
            }
          } catch (tierErr) {
            console.error('[Register] Failed to assign membership tier:', tierErr);
          }

          // Process referral signup reward
          if (referrerId && registeredUser) {
            try {
              // DB 재시도 로직: 연결 실패 시 최대 3회 재시도
              let rwDb = await getDb();
              if (!rwDb) {
                for (let attempt = 1; attempt <= 3; attempt++) {
                  await new Promise(r => setTimeout(r, 1000 * attempt));
                  rwDb = await getDb();
                  if (rwDb) { console.log(`[Referral] DB reconnected on attempt ${attempt}`); break; }
                }
              }
              if (rwDb) {
                // Get referral settings
                const settings = await rwDb.select().from(referralSettings).limit(1);
                const setting = settings[0];
                if (setting && setting.isActive) {
                  // Create referral reward record (signup type)
                  await rwDb.insert(referralRewards).values({
                    referrerId,
                    refereeId: registeredUser.id,
                    rewardType: 'signup',
                    referrerReward: setting.signupReferrerReward,
                    refereeReward: setting.signupRefereeReward,
                    status: 'completed',
                    completedAt: new Date(),
                  });
                  // Add points to referrer
                  // Get current balance for referrer from registered_users
                  const referrerUserRes = await rwDb.select({ points: registeredUsers.points })
                    .from(registeredUsers).where(eq(registeredUsers.id, referrerId)).limit(1);
                  const referrerBal = Number(referrerUserRes[0]?.points || 0);
                  const newReferrerBal = referrerBal + setting.signupReferrerReward;
                  await rwDb.insert(pointTransactions).values({
                    userId: referrerId,
                    amount: setting.signupReferrerReward,
                    type: 'earn',
                    balance: newReferrerBal,
                    description: 'お友達紹介報酬（会員登録）',
                  });
                  // Update referrer's points in registered_users
                  await rwDb.update(registeredUsers)
                    .set({ points: newReferrerBal })
                    .where(eq(registeredUsers.id, referrerId));
                  // Add points to referee (new user)
                  const refereeBasePoints = registeredUser.points || signupInitialPoints || 300;
                  const newRefereeBal = refereeBasePoints + setting.signupRefereeReward;
                  await rwDb.insert(pointTransactions).values({
                    userId: registeredUser.id,
                    amount: setting.signupRefereeReward,
                    type: 'earn',
                    balance: newRefereeBal,
                    description: '紹介コード入力特典',
                  });
                  // Update referee's points in registered_users
                  await rwDb.update(registeredUsers)
                    .set({ points: newRefereeBal })
                    .where(eq(registeredUsers.id, registeredUser.id));
                  // Send referral success email to referrer
                  let referrerInfo: Array<{ email: string | null; nameKanji: string | null; id: number }> = [];
                  try {
                    referrerInfo = await rwDb.select({ id: registeredUsers.id, email: registeredUsers.email, nameKanji: registeredUsers.nameKanji })
                      .from(registeredUsers).where(eq(registeredUsers.id, referrerId)).limit(1);
                    if (referrerInfo[0]?.email) {
                      const { sendReferralSuccessEmail } = await import('./_core/emailService');
                      sendReferralSuccessEmail({
                        to: referrerInfo[0].email,
                        referrerName: referrerInfo[0].nameKanji || '',
                        refereeName: registeredUser.nameKanji || '',
                        rewardType: 'signup',
                        rewardPoints: setting.signupReferrerReward,
                      }).catch(err => console.error('[Referral] Email send failed:', err));
                    }
                  } catch (emailErr) {
                    console.error('[Referral] Failed to send referral email:', emailErr);
                  }
                  // 紹介者ポイント付与アプリ内通知
                  try {
                    const { insertNotification } = await import('./db');
                    await insertNotification({
                      userId: referrerInfo[0].id,
                      type: 'point',
                      title: '紹介ボーナスポイントが付与されました！',
                      message: `お客様の紹介で新規会員が登録されました。${setting.signupReferrerReward}ポイントが付与されました。`,
                      link: '/mypage/points',
                      templateName: 'point_adjusted',
                      templateVars: { points: String(setting.signupReferrerReward), reason: '紹介ボーナス' },
                    });
                  } catch (notifErr) {
                    console.error('[Notification] Referral points notification failed:', notifErr);
                  }
                }
              }
            } catch (e) {
              console.error('[Referral] Failed to process signup reward:', e);
            }
          }
        }
        // Send welcome email
        try {
          const { sendWelcomeEmail } = await import('./_core/emailService');
          sendWelcomeEmail({
            to: input.email,
            userName: input.nameKanji || input.nameHiragana || input.email,
          }).catch(err => console.error('[Email] Welcome email failed:', err));
        } catch (emailErr) {
          console.error('[Email] Failed to send welcome email:', emailErr);
        }
        // 会員登録ウェルカムアプリ内通知
        try {
          const { insertNotification } = await import('./db');
          const newUser = await getRegisteredUserByEmail(input.email);
          if (newUser) {
            await insertNotification({
              userId: newUser.id,
              type: 'system',
              title: 'ようこそ ココくすりへ！',
              message: '会員登録が完了しました。お買い物をお楽しみください。初回購入でポイントが獲得できます！',
              link: '/',
              templateName: 'welcome',
            });
          }
        } catch (notifErr) {
          console.error('[Notification] Welcome notification failed:', notifErr);
        }
        return { success: true, message: "会員登録が完了しました。", autoLogin: true };;
      }),
    // Check if email is already registered
    checkEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const existingUser = await getRegisteredUserByEmail(input.email);
        return { exists: !!existingUser };
      }),
    // Check if phone is already registered
    checkPhone: publicProcedure
      .input(z.object({ phone: z.string().min(1) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { exists: false };
        const normalized = input.phone.replace(/-/g, "");
        const [existing] = await db
          .select({ id: registeredUsers.id })
          .from(registeredUsers)
          .where(eq(registeredUsers.phone, normalized))
          .limit(1);
        return { exists: !!existing };
      }),
  }),

  // Order routes
  order: router({
    // Create order from cart
    create: protectedProcedure
      .input(z.object({
        shippingName: z.string().min(1),
        shippingPostalCode: z.string().min(1),
        shippingAddress: z.string().min(1),
        shippingPhone: z.string().optional(),
        pointsUsed: z.number().min(0).default(0),
        cartItemIds: z.array(z.number()).optional(), // 選択購入時のcartItem IDリスト
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }

        // Get cart items
        const allCartItemsData = await getCartItems(ctx.user.id);
        if (allCartItemsData.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "カートが空です。" });
        }

        // cartItemIdsが指定された場合はその商品のみ、なければ全商品注文
        const cartItemsData = input.cartItemIds && input.cartItemIds.length > 0
          ? allCartItemsData.filter(item => input.cartItemIds!.includes(item.cartItem.id))
          : allCartItemsData;

        if (cartItemsData.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "選択された商品がカートに見つかりません。" });
        }

        // Prepare order items (removed - not needed for new createOrder signature)
        // const orderItemsData = cartItemsData.map(item => ({
        //   productId: item.productId,
        //   productName: item.product.name,
        //   productNameJa: item.product.nameJa,
        //   productImageUrl: item.product.imageUrl,
        //   quantity: item.quantity,
        //   unitPrice: item.product.price,
        // }));

        // Merge thumbnail images for cart products
        const cartProducts = cartItemsData.map(i => i.product).filter(p => p && p.id);
        const mergedProducts = await mergeProductThumbnails(cartProducts);
        const mergedMap = new Map(mergedProducts.map(p => [p.id, p]));
        const enrichedCartData = cartItemsData.map(item => ({
          ...item,
          product: mergedMap.get(item.product?.id) || item.product,
        }));

        // Get product details and calculate total amount
        let subtotal: number = 0;
        for (const item of enrichedCartData) {
          const product = await getProductById(item.cartItem.productId);
          if (product) {
            subtotal += Number(product.price) * item.cartItem.quantity;
          }
        }
        const shippingFee = subtotal >= 5000 ? 0 : 500;

        // Apply membership tier discount
        let membershipDiscountAmount = 0;
        let membershipTierName: string | null = null;
        const db = await getDb();
        if (db) {
          const userTierInfo = await db.select({
            membershipTierId: registeredUsers.membershipTierId,
          }).from(registeredUsers).where(eq(registeredUsers.id, ctx.user.id)).limit(1);
          if (userTierInfo[0]?.membershipTierId) {
            const tier = await db.select().from(membershipTiers)
              .where(eq(membershipTiers.id, userTierInfo[0].membershipTierId))
              .limit(1);
            if (tier[0] && Number(tier[0].discountRate) > 0) {
              membershipDiscountAmount = Math.floor(subtotal * Number(tier[0].discountRate) / 100);
              membershipTierName = tier[0].name;
            }
          }
        }

        const totalAmount = subtotal + shippingFee - membershipDiscountAmount;

        // Helper: generate unique order number
        const generateOrderNumber = () => {
          const now = new Date();
          const dateStr = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0');
          const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
          return dateStr + randomNum;
        };
        // Helper: generate cart group ID (#0000000 format, 7 random digits)
        const generateCartGroupId = () => {
          const randomNum = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
          return `#${randomNum}`;
        };
        // One cartGroupId shared across all orders from the same cart checkout
        const cartGroupId = generateCartGroupId();

        // Create one order per item (per-item order numbers)
        // parentOrderId: first order's ID links all sibling orders from same cart
        const createdOrders: { orderId: number; orderNumber: string; cartGroupId: string }[] = [];
        let parentOrderId: number | undefined;
        for (const item of enrichedCartData) {
          const itemSubtotal = Number(item.product.price) * item.cartItem.quantity;
          // First item gets shipping fee; subsequent items get 0
          const itemShipping = createdOrders.length === 0 ? shippingFee : 0;
          // Proportional membership discount per item
          const itemMembershipDiscount = subtotal > 0
            ? Math.floor(membershipDiscountAmount * itemSubtotal / subtotal)
            : 0;
          const itemTotal = itemSubtotal + itemShipping - itemMembershipDiscount;

          let tierName = null;
          if (item.cartItem.priceTierId && db) {
            const tiers = await db.select().from(productPriceTiers)
              .where(eq(productPriceTiers.id, item.cartItem.priceTierId))
              .limit(1);
            if (tiers[0]) tierName = `${tiers[0].quantity}個セット`;
          }

          const orderData: InsertOrder = {
            userId: ctx.user.id,
            orderNumber: generateOrderNumber(),
            status: "pending",
            shippingName: input.shippingName,
            shippingPostalCode: input.shippingPostalCode,
            shippingAddress: input.shippingAddress,
            shippingPhone: input.shippingPhone,
            totalAmount: itemTotal.toString(),
            shippingFee: itemShipping.toString(),
            membershipDiscount: itemMembershipDiscount.toString(),
            membershipTierName,
            parentOrderId: parentOrderId,
            cartGroupId,
          };

          const order = await createOrder(orderData);
          if (!order) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "注文の作成に失敗しました。" });
          }

          // First order becomes the parent for siblings
          if (parentOrderId === undefined) parentOrderId = order.id;

          await saveOrderItems(order.id, [{
            productId: item.cartItem.productId,
            productName: item.product.name,
            productNameJa: item.product.nameJa,
            productImageUrl: item.product.imageUrl,
            priceTierId: item.cartItem.priceTierId || null,
            tierName,
            quantity: item.cartItem.quantity,
            unitPrice: item.product.price,
            subtotal: itemSubtotal.toString(),
            discountAmount: itemMembershipDiscount.toString(),
          }]);

          createdOrders.push({ orderId: order.id, orderNumber: order.orderNumber, cartGroupId });
        }

        // Clear cart after successful order
        // 選択購入の場合は該当商品のみ削除、全体購入の場合は全削除
        if (input.cartItemIds && input.cartItemIds.length > 0) {
          await removeCartItemsByIds(ctx.user.id, input.cartItemIds);
        } else {
          await clearCart(ctx.user.id);
        }
        // 注文作成完了アプリ内通知
        try {
          const { insertNotification } = await import('./db');
          for (const o of createdOrders) {
            await insertNotification({
              userId: ctx.user.id,
              type: 'order',
              title: `ご注文を承りました（${o.orderNumber}）`,
              message: `ご注文ありがとうございます。注文番号：${o.orderNumber}。ご注文内容はマイページよりご確認いただけます。`,
              link: `/mypage/orders/${o.orderId}`,
              templateName: 'order_created',
              templateVars: { orderNumber: o.orderNumber },
            });
          }
        } catch (notifErr) {
          console.error('[Notification] Order create notification failed:', notifErr);
        }

        return { success: true, orderNumber: createdOrders[0]?.orderNumber, orderId: createdOrders[0]?.orderId, orders: createdOrders };
      }),

    // Get user's orders (with filter, search, sort, pagination)
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        sort: z.enum(["newest", "oldest", "amount_high", "amount_low"]).optional(),
        page: z.number().min(1).optional(),
        limit: z.number().min(1).max(50).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        return getUserOrdersAdvanced(ctx.user.id, {
          status: input?.status,
          search: input?.search,
          sort: input?.sort,
          page: input?.page,
          limit: input?.limit,
        });
      }),

    // 사용자용 장바구니 단위 주문 목록 조회
    getMyCartGroups: protectedProcedure
      .input(z.object({
        page: z.number().min(1).optional(),
        limit: z.number().min(1).max(50).optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
        }
        return getUserCartGroups(ctx.user.id, {
          page: input?.page,
          limit: input?.limit,
          status: input?.status,
        });
      }),

    // Get order by ID
    getById: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const order = await getOrderById(input.orderId);
        if (order && order.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "このオーダーにアクセスする権限がありません。" });
        }
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "注文が見つかりません。" });
        }
        return order;
      }),

    // Get order by order number
    getByOrderNumber: protectedProcedure
      .input(z.object({ orderNumber: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const order = await getOrderByOrderNumber(input.orderNumber);
        if (order && order.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "このオーダーにアクセスする権限がありません。" });
        }
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "注文が見つかりません。" });
        }
        return order;
      }),

    // Get order items
    getItems: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        // Verify order belongs to user
        const order = await getOrderById(input.orderId);
        if (order && order.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "このオーダーにアクセスする権限がありません。" });
        }
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "注文が見つかりません。" });
        }
        return getOrderItems(input.orderId);
      }),

    // Get all items for a cart group (multiple orders with same cartGroupId)
    getItemsByCartGroup: protectedProcedure
      .input(z.object({ cartGroupId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        // Verify at least one order in this cart group belongs to user
        const groupOrders = await getOrdersByCartGroupId(input.cartGroupId);
        const userOrder = groupOrders.find(o => o.userId === ctx.user.id);
        if (!userOrder && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "このカートグループにアクセスする権限がありません。" });
        }
        return getItemsByCartGroupId(input.cartGroupId);
      }),

    // Get all orders for a cart group
    getByCartGroup: protectedProcedure
      .input(z.object({ cartGroupId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const groupOrders = await getOrdersByCartGroupId(input.cartGroupId);
        const userOrder = groupOrders.find(o => o.userId === ctx.user.id);
        if (!userOrder && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "このカートグループにアクセスする権限がありません。" });
        }
        return groupOrders;
      }),

    // Cancel order
    cancel: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        await cancelOrder(input.orderId);
        // 注文キャンセル完了アプリ内通知
        try {
          const { insertNotification } = await import('./db');
          await insertNotification({
            userId: ctx.user.id,
            type: 'order',
            title: 'ご注文がキャンセルされました',
            message: 'ご注文のキャンセルが完了しました。返金がある場合は数日以内に処理されます。',
            link: '/mypage/orders',
            templateName: 'order_cancelled',
          });
        } catch (notifErr) {
          console.error('[Notification] Order cancel notification failed:', notifErr);
        }
         return { success: true, message: "注文がキャンセルされました。" };
      }),
    // Complete order (user confirms receipt) - triggers point award
    complete: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const order = await getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "注文が見つかりません。" });
        }
        if (order.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "権限がありません。" });
        }
        // Only delivered orders can be completed
        if (order.status !== 'delivered') {
          throw new TRPCError({ code: "BAD_REQUEST", message: "配送完了の注文のみ完了できます。" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Mark order as completed
        await db.update(orders).set({
          status: 'completed',
          completedAt: new Date(),
        }).where(eq(orders.id, input.orderId));
        // Award points if not already added
        if (!order.pointsAdded && order.pointsEarned > 0) {
          const { addPointsToUser } = await import('./db');
          await addPointsToUser(
            order.userId,
            order.pointsEarned,
            `注文完了ポイント積立 (注文番号: ${order.orderNumber})`,
            input.orderId
          );
          await db.update(orders).set({ pointsAdded: 1 }).where(eq(orders.id, input.orderId));
        }
        // In-app notification
        try {
          const { insertNotification } = await import('./db');
          await insertNotification({
            userId: ctx.user.id,
            type: 'order',
            title: '注文が完了しました',
            message: `注文番号 ${order.orderNumber} が完了しました。${order.pointsEarned > 0 ? `${order.pointsEarned}Pが積立されました。` : ''}`,
            link: '/mypage/orders',
            templateName: 'order_completed',
          });
        } catch (e) { /* ignore notification errors */ }
        return { success: true, pointsEarned: order.pointsEarned };
      }),
    // Get shipment tracking information
    getShipment: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        // Verify order belongs to user
        const order = await getOrderById(input.orderId);
        if (order && order.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "このオーダーにアクセスする権限がありません。" });
        }
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "注文が見つかりません。" });
        }
        const shipment = await getShipmentByOrderId(input.orderId);
        if (!shipment) {
          return null;
        }
        const events = await getShipmentEvents(shipment.id);
        return { ...shipment, events };
      }),

    // Update order status (for auto-update when shipping is delivered)
    updateStatus: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["pending", "paid", "confirmed", "shipped", "delivered", "cancelled"])
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        // Verify order belongs to user
        const order = await getOrderById(input.orderId);
        if (order && order.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "このオーダーにアクセスする権限がありません。" });
        }
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "注文が見つかりません。" });
        }
        // Update order status
        await adminUpdateOrderStatus(input.orderId, input.status);
        return { success: true, message: "注文状態が更新されました。" };
      }),

    // Create bank transfer order (未入金 status)
    createBankTransferOrder: protectedProcedure
      .input(z.object({
        items: z.array(z.object({
          productId: z.number(),
          name: z.string(),
          nameJa: z.string(),
          price: z.number(),
          quantity: z.number(),
          imageUrl: z.string().optional(),
        })),
        shippingAddress: z.object({
          recipientName: z.string(),
          postalCode: z.string(),
          prefecture: z.string(),
          city: z.string(),
          address1: z.string(),
          address2: z.string().optional(),
          phone: z.string(),
        }),
        email: z.string().email(),
        pointsUsed: z.number().default(0),
        couponDiscount: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }

        // Calculate total amount
        const subtotal = input.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingFee = subtotal >= 5000 ? 0 : 500;

        // Helper: generate unique order number
        const generateBTOrderNumber = () => {
          const now = new Date();
          const dateStr = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0');
          const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
          return dateStr + randomNum;
        };
        // One cartGroupId shared across all orders from the same cart checkout
        const btCartGroupId = `#${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;

        const fullAddress = `${input.shippingAddress.prefecture}${input.shippingAddress.city}${input.shippingAddress.address1}${input.shippingAddress.address2 || ""}`;

        // Create one order per item (per-item order numbers)
        const btCreatedOrders: { orderId: number; orderNumber: string; cartGroupId: string }[] = [];
        let btParentOrderId: number | undefined;
        let remainingCouponDiscount = input.couponDiscount;
        let remainingPoints = input.pointsUsed;

        for (let idx = 0; idx < input.items.length; idx++) {
          const item = input.items[idx];
          const itemSubtotal = item.price * item.quantity;
          const itemShipping = btCreatedOrders.length === 0 ? shippingFee : 0;
          // Proportional coupon discount
          const itemCouponDiscount = idx === input.items.length - 1
            ? remainingCouponDiscount
            : (subtotal > 0 ? Math.floor(input.couponDiscount * itemSubtotal / subtotal) : 0);
          remainingCouponDiscount -= itemCouponDiscount;
          // Proportional points
          const itemPoints = idx === input.items.length - 1
            ? remainingPoints
            : (subtotal > 0 ? Math.floor(input.pointsUsed * itemSubtotal / subtotal) : 0);
          remainingPoints -= itemPoints;
          const itemTotal = itemSubtotal + itemShipping - itemCouponDiscount - itemPoints;

          const orderData: InsertOrder = {
            userId: ctx.user.id,
            orderNumber: generateBTOrderNumber(),
            status: "pending",
            shippingName: input.shippingAddress.recipientName,
            shippingPostalCode: input.shippingAddress.postalCode,
            shippingAddress: fullAddress,
            shippingPhone: input.shippingAddress.phone,
            totalAmount: itemTotal.toString(),
            shippingFee: itemShipping.toString(),
            paymentMethod: "bank_transfer",
            paymentStatus: "pending",
            couponDiscount: itemCouponDiscount.toString(),
            pointsUsed: itemPoints,
            parentOrderId: btParentOrderId,
            cartGroupId: btCartGroupId,
          };

          const order = await createOrder(orderData);
          if (!order) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "注文の作成に失敗しました。" });
          }

          if (btParentOrderId === undefined) btParentOrderId = order.id;

          await saveOrderItems(order.id, [{
            productId: item.productId,
            productName: item.name,
            productNameJa: item.nameJa,
            productImageUrl: item.imageUrl || null,
            priceTierId: null,
            tierName: null,
            quantity: item.quantity,
            unitPrice: item.price.toString(),
            subtotal: itemSubtotal.toString(),
            discountAmount: itemCouponDiscount.toString(),
          }]);

          btCreatedOrders.push({ orderId: order.id, orderNumber: order.orderNumber, cartGroupId: btCartGroupId });
        }

        // Update address usage timestamp
        await updateAddressLastUsedByDetails(ctx.user.id, {
          postalCode: input.shippingAddress.postalCode,
          prefecture: input.shippingAddress.prefecture,
          city: input.shippingAddress.city,
          address1: input.shippingAddress.address1,
        });
        // Send order confirmation email to customer (non-blocking)
        try {
          const registeredUser = await getRegisteredUserById(ctx.user.id);
          const customerEmail = registeredUser?.email || input.email;
          const customerName = registeredUser?.nameKanji || 'お客様';
          if (customerEmail && btCreatedOrders.length > 0) {
            const { sendOrderConfirmationEmail } = await import('./services/emailService');
            const firstOrder = btCreatedOrders[0];
            // Collect all items from all sub-orders
            const allGroupItems: any[] = [];
            for (const o of btCreatedOrders) {
              const items = await getOrderItems(o.orderId);
              allGroupItems.push(...items);
            }
            const orderDate = new Intl.DateTimeFormat('ja-JP', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit',
            }).format(new Date());
            const itemsTotal = input.items.reduce((s, it) => s + it.price * it.quantity, 0);
            const discount = (input.couponDiscount || 0) + (input.pointsUsed || 0);
            sendOrderConfirmationEmail(
              ctx.user.id,
              firstOrder.orderId,
              customerEmail,
              customerName,
              {
                orderNumber: firstOrder.orderNumber,
                customerName,
                customerEmail,
                orderDate,
                items: allGroupItems.map(it => ({
                  productName: it.productNameJa || it.productName,
                  quantity: it.quantity,
                  unitPrice: parseFloat(it.unitPrice.toString()),
                  subtotal: parseFloat(it.subtotal.toString()),
                })),
                subtotal: itemsTotal,
                shippingFee,
                discount,
                total: itemsTotal + shippingFee - discount,
                shippingAddress: `${input.shippingAddress.recipientName}\n〒${input.shippingAddress.postalCode}\n${input.shippingAddress.prefecture}${input.shippingAddress.city}${input.shippingAddress.address1}${input.shippingAddress.address2 || ''}`,
                estimatedDeliveryDate: '3〜7営業日以内',
              }
            ).catch(err => console.error('[Email] BT order confirmation failed:', err));
          }
        } catch (emailErr) {
          console.error('[Email] Bank transfer order confirmation email error:', emailErr);
        }
        return { success: true, orderId: btCreatedOrders[0]?.orderId, orderNumber: btCreatedOrders[0]?.orderNumber, orders: btCreatedOrders };
      }),

    // Get review status for order items (which products have been reviewed)
    getItemReviewStatus: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const order = await getOrderById(input.orderId);
        if (!order || (order.userId !== ctx.user.id && ctx.user.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "このオーダーにアクセスする権限がありません。" });
        }
        const items = await getOrderItems(input.orderId);
        const productIds = items.map(item => item.productId);
        const userReviews = await getUserReviewsByProductIds(ctx.user.id, productIds);
        return userReviews;
      }),

    // Get order status change history timestamps
    getStatusHistory: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const order = await getOrderById(input.orderId);
        if (!order || (order.userId !== ctx.user.id && ctx.user.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "このオーダーにアクセスする権限がありません。" });
        }
        return getOrderStatusHistory(input.orderId);
      }),

    // Get order by Stripe session ID
    getBySessionId: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        try {
          const { getCheckoutSessionBySessionId, getOrderById } = await import("./db");
          const checkoutSession = await getCheckoutSessionBySessionId(input.sessionId);
          if (!checkoutSession) {
            throw new TRPCError({ code: "NOT_FOUND", message: "セッションが見つかりません。" });
          }
          
          // If checkout session is completed, get the order by cartGroupId
          if (checkoutSession.status === "completed") {
            // Query for order by cartGroupId (more reliable than userId + recent time)
            const { getDb } = await import("./db");
            const { orders } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            
            const db = await getDb();
            if (!db) {
              throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "データベース接続エラー" });
            }
            
            // Get order by cartGroupId (장바구니 번호)
            let ordersByCartGroup: typeof orders.$inferSelect[] = [];
            if (checkoutSession.cartGroupId) {
              ordersByCartGroup = await db
                .select()
                .from(orders)
                .where(eq(orders.cartGroupId, checkoutSession.cartGroupId))
                .limit(1);
            }
            
            if (ordersByCartGroup.length > 0) {
              return {
                status: "completed",
                order: ordersByCartGroup[0],
                checkoutSession,
              };
            }
            
            // Fallback: Get the most recent order for this user if cartGroupId not found
            const { desc } = await import("drizzle-orm");
            const recentOrders = await db
              .select()
              .from(orders)
              .where(eq(orders.userId, checkoutSession.userId))
              .orderBy(desc(orders.createdAt))
              .limit(1);
            
            if (recentOrders.length > 0) {
              return {
                status: "completed",
                order: recentOrders[0],
                checkoutSession,
              };
            }
          }
          
          // Return checkout session data if order not yet created
          return {
            status: checkoutSession.status,
            checkoutSession,
          };
        } catch (error: any) {
          console.error("Error getting order by session ID:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "注文情報の取得に失敗しました。",
          });
        }
      }),

    // Reorder - add items from a previous order to cart
    reorder: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        // Verify order belongs to user
        const order = await getOrderById(input.orderId);
        if (!order || (order.userId !== ctx.user.id && ctx.user.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "このオーダーにアクセスする権限がありません。" });
        }
        // Get order items
        const items = await getOrderItems(input.orderId);
        if (!items || items.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "注文商品が見つかりません。" });
        }
        let added = 0;
        const skipped: string[] = [];
        for (const item of items) {
          // Check if product still exists and is available
          const product = await getProductById(item.productId);
          if (!product || product.stock <= 0) {
            skipped.push(item.productName || item.productNameJa);
            continue;
          }
          const qty = Math.min(item.quantity, product.stock);
          await addToCart(ctx.user.id, item.productId, qty);
          added++;
        }
        return { success: true, added, skipped };
      }),
  }),

  // Stripe checkout routes
  checkout: router({
    // Create checkout session
    createSession: protectedProcedure
      .input(z.object({
        items: z.array(z.object({
          productId: z.number(),
          name: z.string(),
          nameJa: z.string(),
          price: z.number(),
          quantity: z.number(),
          imageUrl: z.string().optional(),
        })),
        shippingAddress: z.object({
          postalCode: z.string(),
          prefecture: z.string(),
          city: z.string(),
          address1: z.string(),
          address2: z.string().optional(),
          phone: z.string(),
          recipientName: z.string(),
        }),
        pointsUsed: z.number().default(0),
        couponDiscount: z.number().default(0),
        membershipDiscount: z.number().default(0),
        cartItemIds: z.array(z.number()).optional(), // 選択購入時のcartItem IDリスト
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }

        // Get origin from request
        const protocol = ctx.req.protocol || 'https';
        const host = ctx.req.get('host') || 'localhost:3000';
        const origin = `${protocol}://${host}`;

        try {
          // Generate cartGroupId for this checkout (#0000000 format)
          const stripeCartGroupId = `#${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
          const result = await createCheckoutSession({
            items: input.items,
            shippingAddress: input.shippingAddress,
            userId: ctx.user.id,
            userEmail: ctx.user.email || '',
            userName: ctx.user.name || '',
            origin,
            cartItemIds: input.cartItemIds,
            cartGroupId: stripeCartGroupId,
            pointsUsed: input.pointsUsed,
            couponDiscount: input.couponDiscount,
            membershipDiscount: input.membershipDiscount,
          });

          // Update address usage timestamp
          await updateAddressLastUsedByDetails(ctx.user.id, {
            postalCode: input.shippingAddress.postalCode,
            prefecture: input.shippingAddress.prefecture,
            city: input.shippingAddress.city,
            address1: input.shippingAddress.address1,
          });

          return { success: true, url: result.url, sessionId: result.sessionId };
        } catch (error: any) {
          console.error("Stripe checkout error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "決済セッションの作成に失敗しました。",
          });
        }
       }),

    // Get checkout session status
    getSession: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        try {
          const session = await getCheckoutSession(input.sessionId);
          return {
            status: session.payment_status,
            customerEmail: session.customer_email,
            amountTotal: session.amount_total,
          };
        } catch (error: any) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "セッションが見つかりません。",
          });
        }
      }),

    // Create PayPal order
    createPayPalOrder: protectedProcedure
      .input(z.object({
        items: z.array(z.object({
          productId: z.number(),
          name: z.string(),
          nameJa: z.string(),
          price: z.number(),
          quantity: z.number(),
          imageUrl: z.string().optional(),
        })),
        shippingAddress: z.object({
          postalCode: z.string(),
          prefecture: z.string(),
          city: z.string(),
          address1: z.string(),
          address2: z.string().optional(),
          phone: z.string(),
          recipientName: z.string(),
        }),
        pointsUsed: z.number().default(0),
        couponDiscount: z.number().default(0),
        cartItemIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const { createPayPalOrder: _createPayPalOrder } = await import('./paypal');
        const subtotal = input.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const shippingFee = subtotal >= 5000 ? 0 : 500;
        const cartGroupId = `#${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
        const protocol = ctx.req.protocol || 'https';
        const host = ctx.req.get('host') || 'localhost:3000';
        const origin = `${protocol}://${host}`;
        try {
          const result = await _createPayPalOrder({
            items: input.items.map(i => ({ name: i.nameJa || i.name, price: i.price, quantity: i.quantity })),
            shippingFee,
            cartGroupId,
            userId: ctx.user.id,
            origin,
          });
          // Store checkout data for later order creation on capture
          const { createCheckoutSessionRecord } = await import('./db');
          const fullAddress = `${input.shippingAddress.prefecture}${input.shippingAddress.city}${input.shippingAddress.address1}${input.shippingAddress.address2 || ''}`;
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
          await createCheckoutSessionRecord({
            sessionId: `paypal_${result.orderId}`,
            userId: ctx.user.id,
            userEmail: ctx.user.email || '',
            shippingName: input.shippingAddress.recipientName,
            shippingPostalCode: input.shippingAddress.postalCode,
            shippingPrefecture: input.shippingAddress.prefecture,
            shippingCity: input.shippingAddress.city,
            shippingAddress1: input.shippingAddress.address1,
            shippingAddress2: input.shippingAddress.address2,
            shippingPhone: input.shippingAddress.phone,
            itemsJson: JSON.stringify(input.items),
            cartItemIds: input.cartItemIds && input.cartItemIds.length > 0 ? JSON.stringify(input.cartItemIds) : null,
            cartGroupId,
            subtotal: subtotal.toString() as any,
            shippingFee: shippingFee.toString() as any,
            totalAmount: (subtotal + shippingFee).toString() as any,
            status: 'pending',
            expiresAt,
          });
          // Update address usage
          await updateAddressLastUsedByDetails(ctx.user.id, {
            postalCode: input.shippingAddress.postalCode,
            prefecture: input.shippingAddress.prefecture,
            city: input.shippingAddress.city,
            address1: input.shippingAddress.address1,
          });
          return { success: true, approvalUrl: result.approvalUrl, paypalOrderId: result.orderId, cartGroupId };
        } catch (error: any) {
          console.error('PayPal order creation error:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'PayPal注文の作成に失敗しました。' });
        }
      }),

    // Capture PayPal order after buyer approval
    capturePayPalOrder: protectedProcedure
      .input(z.object({ paypalOrderId: z.string(), cartGroupId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const { capturePayPalOrder: _capturePayPalOrder } = await import('./paypal');
        const { getCheckoutSessionBySessionId, updateCheckoutSessionStatus } = await import('./db');
        try {
          const captureResult = await _capturePayPalOrder(input.paypalOrderId);
          if (captureResult.status !== 'COMPLETED') {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'PayPal決済が完了していません。' });
          }
          // Get stored checkout session
          const checkoutSession = await getCheckoutSessionBySessionId(`paypal_${input.paypalOrderId}`);
          if (!checkoutSession) {
            throw new TRPCError({ code: 'NOT_FOUND', message: '注文情報が見つかりません。' });
          }
          // Create orders (same logic as Stripe webhook)
          const { handlePayPalOrderCompletion } = await import('./paypalOrderHandler');
          const orders = await handlePayPalOrderCompletion(checkoutSession, ctx.user.id);
          await updateCheckoutSessionStatus(`paypal_${input.paypalOrderId}`, 'completed');
          return { success: true, orders, cartGroupId: input.cartGroupId };
        } catch (error: any) {
          console.error('PayPal capture error:', error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'PayPal決済の処理に失敗しました。' });
        }
      }),
  }),

  // Password reset routes
  passwordReset: router({
    // Request password reset (send email)
    requestReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        // Check if email exists
        const user = await getRegisteredUserByEmail(input.email);
        if (!user) {
          // Don't reveal if email exists or not for security
          return { success: true, message: "メールアドレスが登録されている場合、パスワード再設定のメールを送信しました。" };
        }

        // Generate reset token
        const token = generateResetToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await createPasswordResetToken(input.email, token, expiresAt);

        // Get base URL from request
        const protocol = ctx.req.protocol || 'https';
        const host = ctx.req.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        // Send reset email
        const sent = await sendPasswordResetEmail(input.email, token, baseUrl);
        if (!sent) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "メールの送信に失敗しました。しばらく経ってからお試しください。",
          });
        }

        return { success: true, message: "パスワード再設定のメールを送信しました。" };
      }),

    // Verify reset token
    verifyToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const resetToken = await getPasswordResetToken(input.token);
        if (!resetToken) {
          return { valid: false, email: null };
        }
        return { valid: true, email: resetToken.email };
      }),

    // Reset password with token
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        // Verify token
        const resetToken = await getPasswordResetToken(input.token);
        if (!resetToken) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "無効または期限切れのリンクです。もう一度パスワード再設定をリクエストしてください。",
          });
        }

        // Hash new password with bcrypt
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(input.newPassword, 10);

          // Update password
        await updateRegisteredUserPassword(resetToken.email, hashedPassword);
        // Mark token as used
        await markPasswordResetTokenUsed(input.token);
        // Send password changed email
        try {
          const user = await getRegisteredUserByEmail(resetToken.email);
          if (user) {
            const { sendPasswordChangedEmail } = await import('./_core/emailService');
            sendPasswordChangedEmail({
              to: resetToken.email,
              userName: user.nameKanji || user.nameHiragana || resetToken.email,
            }).catch(err => console.error('[Email] Password changed email failed:', err));
          }
        } catch (emailErr) {
          console.error('[Email] Failed to send password changed email:', emailErr);
        }
        // パスワード変更セキュリティアプリ内通知
        try {
          const { insertNotification } = await import('./db');
          const userByEmail = await getRegisteredUserByEmail(resetToken.email);
          if (userByEmail) {
            await insertNotification({
              userId: userByEmail.id,
              type: 'system',
              title: 'パスワードが変更されました',
              message: 'パスワードが正常に変更されました。身に覚えがない場合はすぐにお問い合わせください。',
              link: '/mypage',
              templateName: 'password_changed',
            });
          }
        } catch (notifErr) {
          console.error('[Notification] Password changed notification failed:', notifErr);
        }
        return { success: true, message: "パスワードが正常に変更されました。" };
      }),
  }),
  // Admin routess
  admin: router({
    // Check if user is admin
    isAdmin: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return false;
      return ctx.user.role === "admin";
    }),

    // Categories query (direct access) - productCount含む
    categories: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
      }
      return getAllCategoriesWithCount();
    }),

    // Products sub-router
    products: router({
      list: protectedProcedure
        .input(z.object({
          page: z.number().optional(),
          limit: z.number().optional(),
          search: z.string().optional(),
          categoryId: z.number().nullable().optional(),
          priceMin: z.number().optional(),
          priceMax: z.number().optional(),
          isTimeSale: z.boolean().optional(),
          isMonthlySale: z.boolean().optional(),
          isLowStock: z.boolean().optional(),
          isHit: z.boolean().optional(),
          isRecommended: z.boolean().optional(),
          isNew: z.boolean().optional(),
          isDiscount: z.boolean().optional(),
          isPopular: z.boolean().optional(),
        }))
        .query(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
          }
          const page = input.page ?? 1;
          const limit = input.limit ?? 20;
          const offset = (page - 1) * limit;
          
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

          // フィルター条件組み立て
          const conditions: any[] = [];
          if (input.search && input.search.trim() !== "") {
            const searchTerm = `%${input.search.trim()}%`;
            conditions.push(or(
              sql`${products.nameJa} LIKE ${searchTerm}`,
              sql`${products.name} LIKE ${searchTerm}`
            ));
          }
          if (input.categoryId != null) {
            conditions.push(eq(products.categoryId, input.categoryId));
          }
          if (input.priceMin != null) {
            conditions.push(gte(products.price, input.priceMin));
          }
          if (input.priceMax != null) {
            conditions.push(lte(products.price, input.priceMax));
          }
          if (input.isTimeSale) {
            conditions.push(eq(products.isTimeSale, true));
          }
          if (input.isMonthlySale) {
            conditions.push(eq(products.isMonthlySale, true));
          }
          if (input.isLowStock) {
            // trackInventory=true かつ価格ティア最小在庫≤5の商品のみフィルター
            conditions.push(eq(products.trackInventory, true));
            conditions.push(
              sql`${products.id} IN (
                SELECT productId FROM product_price_tiers
                GROUP BY productId
                HAVING MIN(stock) <= 5
              )`
            );
          }
          if (input.isHit) conditions.push(eq(products.isHit, true));
          if (input.isRecommended) conditions.push(eq(products.isRecommended, true));
          if (input.isNew) conditions.push(eq(products.isNew, true));
          if (input.isDiscount) conditions.push(eq(products.isDiscount, true));
          if (input.isPopular) conditions.push(eq(products.isPopular, true));
          const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

          const [productList, countResult] = await Promise.all([
            whereClause
              ? db.select().from(products).where(whereClause).limit(limit).offset(offset).orderBy(asc(products.sortOrder), desc(products.createdAt))
              : db.select().from(products).limit(limit).offset(offset).orderBy(asc(products.sortOrder), desc(products.createdAt)),
            whereClause
              ? db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause)
              : db.select({ count: sql<number>`count(*)` }).from(products)
          ]);
          const productsWithImages = await mergeProductThumbnails(productList);

          // 各商品の価格ティア最小在庫取得 (trackInventoryチェック用)
          const productIds = productList.map((p: any) => p.id);
          let minTierStockMap: Record<number, number | null> = {};
          if (productIds.length > 0) {
            const tierStocks = await db
              .select({
                productId: productPriceTiers.productId,
                minStock: sql<number>`MIN(${productPriceTiers.stock})`,
              })
              .from(productPriceTiers)
              .where(sql`${productPriceTiers.productId} IN (${sql.join(productIds.map((id: number) => sql`${id}`), sql`, `)})`)
              .groupBy(productPriceTiers.productId);
            tierStocks.forEach((row: any) => {
              minTierStockMap[row.productId] = row.minStock;
            });
          }

          const productsWithTierStock = productsWithImages.map((p: any) => ({
            ...p,
            minTierStock: minTierStockMap[p.id] ?? null,
          }));

          return {
            products: productsWithTierStock,
            total: Number(countResult[0]?.count ?? 0),
            page,
            limit,
          };
        }),
      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
          }
          return getProductById(input.id);
        }),
    }),

    // Get product badge stats (全商品基準固定統計 - フィルター無関係)
    productStats: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [totalRow, hitRow, recommendedRow, newRow, popularRow, discountRow, lowStockRow] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(products),
        db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isHit, true)),
        db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isRecommended, true)),
        db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isNew, true)),
        db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isPopular, true)),
        db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isDiscount, true)),
        db.select({ count: sql<number>`count(*)` }).from(products).where(
          and(
            eq(products.trackInventory, true),
            sql`${products.id} IN (SELECT productId FROM product_price_tiers GROUP BY productId HAVING MIN(stock) <= 5)`
          )
        ),
      ]);
      return {
        total: Number(totalRow[0]?.count ?? 0),
        hit: Number(hitRow[0]?.count ?? 0),
        recommended: Number(recommendedRow[0]?.count ?? 0),
        newProducts: Number(newRow[0]?.count ?? 0),
        popular: Number(popularRow[0]?.count ?? 0),
        discount: Number(discountRow[0]?.count ?? 0),
        lowStock: Number(lowStockRow[0]?.count ?? 0),
      };
    }),
    // Get dashboard stats
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
      }
      return getDashboardStats();
    }),

    // Get daily revenue chart (last 7 days)
    dailyRevenueChart: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
      }
      return getDailyRevenueChart();
    }),

    // Get top 5 products by sales
    topProducts: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
      }
      return getTopProductsBySales();
    }),

    // Get recent 5 orders
    recentOrders: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
      }
      return getRecentOrders();
    }),

    // Get category-wise statistics
    categoryStats: protectedProcedure
      .input(z.object({ period: z.enum(['today', '7days', '30days', 'all']).default('all') }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { getCategoryStats } = await import('./db-category-stats');
        return getCategoryStats(input.period);
      }),

    // Get last tracking sync time
    lastTrackingSyncTime: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const setting = await getSiteSetting('LAST_TRACKING_SYNC_AT');
        return { lastSyncAt: setting?.value || null };
      }),

    // 장바구니 목록 조회 (관리자용)
    cartList: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(30),
        search: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const page = input?.page ?? 1;
        const limit = input?.limit ?? 30;
        const search = input?.search ?? '';
        const offset = (page - 1) * limit;
        try {
          const db = await getDb();
          if (!db) return { items: [], total: 0, page, limit };
          // cartItems.userId references users table (not registeredUsers)
          const whereClause = search
            ? or(
                like(users.email, `%${search}%`),
                like(users.name, `%${search}%`),
                like(users.phone, `%${search}%`)
              )
            : undefined;
          const baseSelect = db
            .select({
              userId: cartItems.userId,
              email: users.email,
              name: users.name,
              phone: users.phone,
              openId: users.openId,
              itemCount: sql<number>`COUNT(${cartItems.id})`,
              totalQuantity: sql<number>`SUM(${cartItems.quantity})`,
              lastUpdated: sql<Date>`MAX(${cartItems.updatedAt})`,
            })
            .from(cartItems)
            .leftJoin(users, eq(cartItems.userId, users.id))
            .groupBy(cartItems.userId, users.email, users.name, users.phone, users.openId);
          const rows = whereClause
            ? await baseSelect.where(whereClause).orderBy(desc(sql`MAX(${cartItems.updatedAt})`)).limit(limit).offset(offset)
            : await baseSelect.orderBy(desc(sql`MAX(${cartItems.updatedAt})`)).limit(limit).offset(offset);
          const countSelect = db
            .select({ cnt: sql<number>`COUNT(DISTINCT ${cartItems.userId})` })
            .from(cartItems)
            .leftJoin(users, eq(cartItems.userId, users.id));
          const [{ cnt }] = whereClause
            ? await countSelect.where(whereClause)
            : await countSelect;
          return { items: rows, total: Number(cnt), page, limit };
        } catch (e) {
          console.error('[Admin] cartList error:', e);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '장바구니 목록 조회 실패' });
        }
      }),

    // 특정 회원의 장바구니 상세 조회
    cartDetail: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        try {
          const db = await getDb();
          if (!db) return { items: [], user: null };
          // cartItems.userId references users table
          const [userInfo] = await db
            .select({ email: users.email, name: users.name, phone: users.phone, openId: users.openId })
            .from(users)
            .where(eq(users.id, input.userId))
            .limit(1);
          const items = await db
            .select({
              id: cartItems.id,
              quantity: cartItems.quantity,
              createdAt: cartItems.createdAt,
              updatedAt: cartItems.updatedAt,
              productId: cartItems.productId,
              priceTierId: cartItems.priceTierId,
              productName: products.nameJa,
              productNameKo: products.name,
              productImage: products.imageUrl,
              productPrice: products.price,
            })
            .from(cartItems)
            .leftJoin(products, eq(cartItems.productId, products.id))
            .where(eq(cartItems.userId, input.userId))
            .orderBy(desc(cartItems.updatedAt));
          return { items, user: userInfo || null };
        } catch (e) {
          console.error('[Admin] cartDetail error:', e);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '장바구니 상세 조회 실패' });
        }
      }),

    // Get delayed shipment orders
    delayedOrders: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const deliveryDelayDaysSetting = await getSiteSetting('DELIVERY_DELAY_DAYS');
        const deliveryDelayDays = parseInt(deliveryDelayDaysSetting?.value || '14', 10);
        return getDelayedShipmentOrders(deliveryDelayDays);
      }),
    // Get shipment-delayed orders (confirmed status for N+ days)
    shipmentDelayedOrders: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const shipmentDelayDaysSetting = await getSiteSetting('SHIPMENT_DELAY_DAYS');
        const shipmentDelayDays = parseInt(shipmentDelayDaysSetting?.value || '3', 10);
        return getShipmentDelayedOrders(shipmentDelayDays);
      }),

    // Send delayed shipment notification emails to selected customers
    sendDelayedShipmentEmails: protectedProcedure
      .input(z.object({
        orderIds: z.array(z.number()).min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const { sendDelayedShipmentNotificationEmail } = await import('./_core/emailService');
        const delayedOrders = await getDelayedShipmentOrders();
        const targetOrders = delayedOrders.filter((o: any) => input.orderIds.includes(o.id));
        if (targetOrders.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '有効な配送遅延注文がありません。' });
        }
        const CARRIER_NAMES: Record<string, string> = {
          'yamato': 'ヤマト運輸 (クロネコヤマト)',
          'sagawa': '佐川急便',
          'japanpost': '日本郵便',
          'emspost': 'EMS (国際速達郵便)',
          'seino': '西濃運輸',
          'fukuyama': '福山通運',
          'nittsu': '日通 (日本通運)',
        };
        const CARRIER_TRACKING_URLS: Record<string, string> = {
          'yamato': 'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=',
          'sagawa': 'https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=',
          'japanpost': 'https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=',
          'emspost': 'https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=',
          'seino': 'https://track.seino.co.jp/cgi-bin/gnpquery.pgm?GNPNO1=',
          'fukuyama': 'https://corp.fukuyama-transporting.co.jp/tracking/?number=',
          'nittsu': 'https://www.nittsu.co.jp/pelican/tracking/?number=',
        };
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];
        for (const order of targetOrders) {
          const userEmail = (order as any).userEmail || '';
          if (!userEmail) {
            failCount++;
            errors.push(`${(order as any).orderNumber}: 이메일 주소 없음`);
            continue;
          }
          const carrierCode = (order as any).carrierCode || '';
          const trackingNumber = (order as any).trackingNumber || '';
          const trackingBaseUrl = CARRIER_TRACKING_URLS[carrierCode];
          const trackingUrl = trackingBaseUrl && trackingNumber ? `${trackingBaseUrl}${trackingNumber}` : undefined;
          const result = await sendDelayedShipmentNotificationEmail({
            to: userEmail,
            userName: (order as any).userName || userEmail.split('@')[0] || '顧客',
            orderNumber: (order as any).orderNumber,
            daysDelayed: (order as any).daysDelayed,
            trackingNumber: trackingNumber || undefined,
            carrierName: CARRIER_NAMES[carrierCode] || carrierCode || undefined,
            trackingUrl,
            shippedAt: (order as any).shippedAt,
          });
          if (result.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(`${(order as any).orderNumber}: ${result.error}`);
          }
        }
        console.log(`[Admin] Sent delayed shipment emails: ${successCount} success, ${failCount} failed`);
        return { successCount, failCount, errors };
      }),

    // 税関照会 - 顧客へのメール一括送信
    sendCustomsInquiryEmails: protectedProcedure
      .input(z.object({
        orderIds: z.array(z.number()).min(1).max(100),
        customMessage: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const { sendCustomsInquiryEmail } = await import('./_core/emailService');
        const delayedOrders = await getDelayedShipmentOrders();
        const targetOrders = delayedOrders.filter((o: any) => input.orderIds.includes(o.id));
        if (targetOrders.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '対象注文が見つかりません。' });
        }
        const CARRIER_NAMES: Record<string, string> = {
          'yamato': 'ヤマト運輸 (クロネコヤマト)',
          'sagawa': '佐川急便',
          'japanpost': '日本郵便',
          'emspost': 'EMS (国際速達郵便)',
          'seino': '西濃運輸',
          'fukuyama': '福山通運',
          'nittsu': '日通 (日本通運)',
        };
        const CARRIER_TRACKING_URLS: Record<string, string> = {
          'yamato': 'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=',
          'sagawa': 'https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=',
          'japanpost': 'https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=',
          'emspost': 'https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=',
          'seino': 'https://track.seino.co.jp/cgi-bin/gnpquery.pgm?GNPNO1=',
          'fukuyama': 'https://corp.fukuyama-transporting.co.jp/tracking/?number=',
          'nittsu': 'https://www.nittsu.co.jp/pelican/tracking/?number=',
        };
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];
        for (const order of targetOrders) {
          const userEmail = (order as any).userEmail || '';
          if (!userEmail) {
            failCount++;
            errors.push(`${(order as any).orderNumber}: 이메일 주소 없음`);
            continue;
          }
          const carrierCode = (order as any).carrierCode || '';
          const trackingNumber = (order as any).trackingNumber || '';
          const trackingBaseUrl = CARRIER_TRACKING_URLS[carrierCode];
          const trackingUrl = trackingBaseUrl && trackingNumber ? `${trackingBaseUrl}${trackingNumber}` : undefined;
          const result = await sendCustomsInquiryEmail({
            to: userEmail,
            userName: (order as any).userName || userEmail.split('@')[0] || '顧客',
            orderNumber: (order as any).orderNumber,
            trackingNumber: trackingNumber || undefined,
            carrierName: CARRIER_NAMES[carrierCode] || carrierCode || undefined,
            trackingUrl,
            customMessage: input.customMessage,
          });
          if (result.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(`${(order as any).orderNumber}: ${result.error}`);
          }
        }
        console.log(`[Admin] Sent customs inquiry emails: ${successCount} success, ${failCount} failed`);
        return { successCount, failCount, errors };
      }),

    // 発送遅延通知 - 特定注文に理由入力後、顧客通知+メール送信
    notifyShipmentDelay: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        delayReason: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: '注文が見つかりません。' });
        // 注文者メールアドレス取得
        const userRows = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
        const userEmail = userRows[0]?.email;
        const userName = userRows[0]?.name || userRows[0]?.email?.split('@')[0] || 'ユーザー';
        // メール送信
        let emailResult: { success: boolean; error?: string } = { success: false, error: 'No email' };
        if (userEmail) {
          const { sendShipmentDelayNotificationEmail } = await import('./_core/emailService');
          emailResult = await sendShipmentDelayNotificationEmail({
            to: userEmail,
            userName,
            orderNumber: order.orderNumber,
            delayReason: input.delayReason,
          });
        }
        // オーナー通知 - 発送遅延処理確認
        try {
          const { notifyOwner } = await import('./_core/notification');
          await notifyOwner({
            title: `[発送遅延案内送信] ${order.orderNumber}`,
            content: `お客様 ${userName}(${userEmail || 'N/A'})に発送遅延のご案内を送信しました。\n理由: ${input.delayReason}`,
          });
        } catch (e) {
          console.warn('[notifyShipmentDelay] Owner notification failed:', e);
        }
        console.log(`[Admin] Shipment delay notification sent for order ${order.orderNumber}, email: ${emailResult.success}`);
        return { success: true, emailSent: emailResult.success };
      }),

    // Get badge counts for sidebar
    badgeCounts: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const [pendingOrders, unansweredInquiries, unansweredProductQuestions] = await Promise.all([
          getPendingOrdersCount(),
          getUnansweredInquiriesCount(),
          getUnansweredProductQuestionsCount(),
        ]);
        return {
          pendingOrders,
          unansweredInquiries,
          unansweredProductQuestions,
        };
      }),

    // Order Tab Counts (single query replacing 5 separate status queries)
    orderTabCounts: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const { getOrderTabCounts } = await import('./db');
        return getOrderTabCounts();
      }),

    // Cancellation Statistics API
    cancellationStats: protectedProcedure
      .input(z.object({ period: z.enum(['7days', '30days', '90days', 'all']).default('30days') }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const { getCancellationStats } = await import('./db-cancellation-stats');
        return getCancellationStats(input.period);
      }),

    // Site Settings API
    siteSettings: router({
      getAll: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return getAllSiteSettings();
      }),
      
      get: protectedProcedure
        .input(z.object({ key: z.string() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
          }
          return getSiteSetting(input.key);
        }),
      
      update: protectedProcedure
        .input(z.object({
          key: z.string(),
          value: z.string().nullable(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
          }
          await upsertSiteSetting(input.key, input.value);
          return { success: true };
        }),

      uploadBrandImage: protectedProcedure
        .input(z.object({
          file: z.string(), // base64 data URL
          fileName: z.string(),
          contentType: z.string(),
          type: z.enum(["headerLogoPC", "headerLogoMobile", "footerLogoPC", "footerLogoMobile", "favicon", "ogDefaultImage"]),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
          }
          const { storagePut } = await import("./storage");
          const base64Data = input.file.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const ext = input.fileName.split(".").pop() || "png";
          const fileKey = `brand/${input.type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const result = await storagePut(fileKey, buffer, input.contentType);
          // Save URL to siteSettings
          await upsertSiteSetting(input.type, result.url);
          return { success: true, url: result.url };
        }),

      getBrandSettings: publicProcedure.query(async () => {
        const keys = ["headerLogoPC", "headerLogoMobile", "footerLogoPC", "footerLogoMobile", "favicon", "ogDefaultImage", "ogDefaultTitle", "ogDefaultDescription"];
        const settings = await getAllSiteSettings();
        const result: Record<string, string | null> = {};
        for (const key of keys) {
          result[key] = settings.find(s => s.key === key)?.value ?? null;
        }
        return result;
      }),
    }),

    // SEO Settings API
    seoSettings: router({
      getAll: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return getAllSeoSettings();
      }),
      
      get: protectedProcedure
        .input(z.object({ page: z.string() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
          }
          return getSeoSetting(input.page);
        }),
      
      update: protectedProcedure
        .input(z.object({
          page: z.string(),
          title: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          keywords: z.string().nullable().optional(),
          ogImage: z.string().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
          }
          await upsertSeoSetting(input);
          return { success: true };
        }),

      aiGenerate: protectedProcedure
        .input(z.object({
          page: z.enum(["home", "products", "category", "search", "notice", "inquiry"]),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
          }
          const { invokeLLM } = await import("./_core/llm");
          const pageLabels: Record<string, string> = {
            home: "ホームページ (メイン)",
            products: "商品一覧ページ",
            category: "カテゴリページ",
            search: "検索結果ページ",
            notice: "お知らせページ",
            inquiry: "お問い合わせページ",
          };
          const pageLabel = pageLabels[input.page] || input.page;
          const pageLabelsJa: Record<string, string> = {
            home: "トップページ（メイン）",
            products: "商品一覧ページ",
            category: "カテゴリーページ",
            search: "検索結果ページ",
            notice: "お知らせページ",
            inquiry: "お問い合わせページ",
          };
          const pageLabelJa = pageLabelsJa[input.page] || pageLabel;
          const prompt = `あなたは日本の医薬品・健康商品の個人輸入ショッピングモール「koreamall24」のSEO専門家です。
ショッピングモールの特徴:
- 日本の医薬品、健康食品、化粧品の個人輸入代行
- 正規品保証、全品送料無料
- 韓国語サービス、日本直送
- ドメイン: koreamall24.com

[${pageLabelJa}]のSEOメタデータを生成してください。

要件:
1. title: 30〜60文字（日本語メイン、重要キーワードを前に配置、ブランド名「ococくすり」を含める、| 正規品保証・送料無料 を末尾に付ける）
2. description: 70〜160文字（具体的なメリットを含む、クリックを促す、正規品保証・全品送料無料に言及）
3. keywords: 検索ボリュームの高いキーワード10個以内、カンマ区切り（日本語メイン）

必ずJSON形式のみで応答してください:
{"title": "...", "description": "...", "keywords": "..."}`;

          const response = await invokeLLM({
            messages: [
              { role: "system", content: "SEO専門家としてJSON形式のみで応答します。" },
              { role: "user", content: prompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "seo_metadata",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    keywords: { type: "string" },
                  },
                  required: ["title", "description", "keywords"],
                  additionalProperties: false,
                },
              },
            },
          });

          const rawContent = response.choices[0]?.message?.content;
          const content = typeof rawContent === "string" ? rawContent : null;
          if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI応答がありません。" });
          const parsed = JSON.parse(content) as { title: string; description: string; keywords: string };
          return parsed;
        }),

      uploadOgImage: protectedProcedure
        .input(z.object({
          file: z.string(), // base64 data URL
          fileName: z.string(),
          contentType: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
          }
          const { storagePut } = await import("./storage");
          const base64Data = input.file.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const ext = input.fileName.split(".").pop() || "jpg";
          const fileKey = `seo/og-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const result = await storagePut(fileKey, buffer, input.contentType);
          return { success: true, url: result.url };
        }),
    }),

    // Get all orders (with search/filter/pagination)
    orders: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        status: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        amountMin: z.number().optional(),
        amountMax: z.number().optional(),
        carrier: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        paymentMethod: z.string().optional(),
        bankTransferPending: z.boolean().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return adminSearchOrders(input);
      }),

    // Get order detail (admin - enriched)
    orderById: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const detail = await adminGetOrderDetail(input.orderId);
        if (!detail) {
          throw new TRPCError({ code: "NOT_FOUND", message: "注文が見つかりません。" });
        }
        return detail;
      }),

    // 장바구니 단위 주문 목록 조회 (관리자)
    getCartGroups: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        status: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        paymentMethod: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
        }
        return adminGetCartGroups(input);
      }),

    // 장바구니 그룹 상세 조회 (관리자)
    getCartGroupDetail: protectedProcedure
      .input(z.object({ cartGroupId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
        }
        const detail = await adminGetCartGroupDetail(input.cartGroupId);
        if (!detail) throw new TRPCError({ code: 'NOT_FOUND', message: '주문을 찾을 수 없습니다.' });
        const { getSetting } = await import('./db');
        const purchasePointsPercent = parseFloat(await getSetting('PURCHASE_POINTS_PERCENT') || '1');
        return { ...detail, purchasePointsPercent };
      }),

    // 송장번호로 배송 이벤트 조회 (관리자 - 모달용)
    getShipmentWithEvents: protectedProcedure
      .input(z.object({ trackingNumber: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
        }
        const shipment = await getShipmentByTrackingNumber(input.trackingNumber);
        if (!shipment) return { shipment: null, events: [] };
        const events = await getShipmentEvents(shipment.id);
        return { shipment, events };
      }),

    // 배송추적 캐시 조회 (DB 캐시 우선, 없으면 null)
    getTrackingCached: protectedProcedure
      .input(z.object({ trackingNumber: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
        }
        const cached = await getTrackingCache(input.trackingNumber);
        return { cached };
      }),
    // 단일 송장번호 실시간 동기화 (수동 새로고침)
    refreshTrackingCache: protectedProcedure
      .input(z.object({ trackingNumber: z.string(), carrier: z.string().nullish(), orderId: z.number().nullish() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
        }
        const result = await syncTrackingCache(input.trackingNumber, input.carrier || 'Japan Post');
        const cached = await getTrackingCache(input.trackingNumber);
        return { ...result, cached };
      }),
    // 전체 배송중 송장번호 일괄 동기화 (야간 스케줄러 수동 실행)
    syncAllTrackings: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
        }
        const result = await syncAllActiveTrackings();
        return result;
      }),

    // 장바구니 그룹 레벨 송장번호 일괄 업데이트 (관리자)
    updateCartGroupTracking: protectedProcedure
      .input(z.object({
        cartGroupId: z.string(),
        trackingNumber: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        // 해당 장바구니 그룹의 모든 주문 조회
        const cartGroupOrders = await db
          .select()
          .from(orders)
          .where(eq(orders.cartGroupId, input.cartGroupId));

        if (cartGroupOrders.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '주문을 찾을 수 없습니다.' });
        }

        // 각 주문의 모든 상품에 송장번호 적용
        for (const order of cartGroupOrders) {
          const orderItemsData = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));

          for (const item of orderItemsData) {
            // 기존 shipment 조회
            const existingShipments = await db
              .select()
              .from(shipmentsTable)
              .where(
                and(
                  eq(shipmentsTable.orderId, order.id),
                  eq(shipmentsTable.orderItemId, item.id)
                )
              )
              .limit(1);

            if (existingShipments.length > 0) {
              // 기존 shipment 업데이트
              await db
                .update(shipmentsTable)
                .set({
                  trackingNumber: input.trackingNumber,
                  carrier: null,
                  updatedAt: new Date(),
                })
                .where(eq(shipmentsTable.id, existingShipments[0].id));
            } else {
              // 새 shipment 생성
              await createShipment({
                orderId: order.id,
                orderItemId: item.id,
                trackingNumber: input.trackingNumber,
                carrier: null,
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
          }

          // 주문 상태 자동 변경 (pending/paid/confirmed -> shipped)
          if (['pending', 'paid', 'confirmed'].includes(order.status)) {
            await adminUpdateOrderStatus(order.id, 'shipped');
            // 배송 중 전환 시 고객 이메일 자동 발송
            try {
              const db2 = await getDb();
              if (db2) {
                const userRows = await db2
                  .select()
                  .from(users)
                  .where(eq(users.id, order.userId))
                  .limit(1);
                if (userRows[0]?.email) {
                  sendOrderStatusEmail({
                    customerEmail: userRows[0].email,
                    customerName: userRows[0].nameKanji || userRows[0].name || userRows[0].email.split('@')[0],
                    orderNumber: order.orderNumber,
                    status: 'shipped',
                    trackingNumber: input.trackingNumber,
                    carrier: null,
                    reviewLink: undefined,
                  }).catch(err => console.error('[updateCartGroupTracking] Email failed:', err));
                }
              }
            } catch (emailErr) {
              console.error('[updateCartGroupTracking] Email error:', emailErr);
            }
          }
        }

        return { success: true };
      }),

    // 선택된 장바구니들의 송장번호 일괄 저장
    bulkSaveCartGroupTracking: protectedProcedure
      .input(z.object({
        entries: z.array(z.object({
          cartGroupId: z.string(),
          trackingNumber: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        let success = 0;
        let failed = 0;

        for (const entry of input.entries) {
          try {
            // 해당 장바구니 그룹의 모든 주문 조회
            const cartGroupOrders = await db
              .select()
              .from(orders)
              .where(eq(orders.cartGroupId, entry.cartGroupId));

            if (cartGroupOrders.length === 0) {
              failed++;
              continue;
            }

            // 각 주문의 모든 상품에 송장번호 적용
            for (const order of cartGroupOrders) {
              const orderItemsData = await db
                .select()
                .from(orderItems)
                .where(eq(orderItems.orderId, order.id));

              for (const item of orderItemsData) {
                // orderItems.itemTrackingNumber 직접 업데이트 (목록 표시용)
                await db
                  .update(orderItems)
                  .set({
                    itemTrackingNumber: entry.trackingNumber,
                    itemShippedAt: new Date(),
                  })
                  .where(eq(orderItems.id, item.id));

                // 기존 shipment 조회
                const existingShipments = await db
                  .select()
                  .from(shipmentsTable)
                  .where(
                    and(
                      eq(shipmentsTable.orderId, order.id),
                      eq(shipmentsTable.orderItemId, item.id)
                    )
                  )
                  .limit(1);

                if (existingShipments.length > 0) {
                  // 기존 shipment 업데이트
                  await db
                    .update(shipmentsTable)
                    .set({
                      trackingNumber: entry.trackingNumber,
                      carrier: null,
                      updatedAt: new Date(),
                    })
                    .where(eq(shipmentsTable.id, existingShipments[0].id));
                } else {
                  // 새 shipment 생성
                  await createShipment({
                    orderId: order.id,
                    orderItemId: item.id,
                    trackingNumber: entry.trackingNumber,
                    carrier: null,
                    status: 'pending',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  });
                }
              }

              // 주문 상태 자동 변경 (pending/paid/confirmed -> shipped)
              if (['pending', 'paid', 'confirmed'].includes(order.status)) {
                await adminUpdateOrderStatus(order.id, 'shipped');
                // 배송 중 전환 시 고객 이메일 자동 발송
                try {
                  const db2 = await getDb();
                  if (db2) {
                    const userRows = await db2
                      .select()
                      .from(users)
                      .where(eq(users.id, order.userId))
                      .limit(1);
                    if (userRows[0]?.email) {
                      sendOrderStatusEmail({
                        customerEmail: userRows[0].email,
                        customerName: userRows[0].nameKanji || userRows[0].name || userRows[0].email.split('@')[0],
                        orderNumber: order.orderNumber,
                        status: 'shipped',
                        trackingNumber: entry.trackingNumber,
                        carrier: null,
                        reviewLink: undefined,
                      }).catch(err => console.error('[bulkSaveCartGroupTracking] Email failed:', err));
                    }
                  }
                } catch (emailErr) {
                  console.error('[bulkSaveCartGroupTracking] Email error:', emailErr);
                }
              }
            }
            success++;
          } catch (err) {
            console.error('[bulkSaveCartGroupTracking] Error:', err);
            failed++;
          }
        }

        return { success, failed };
      }),

    // ステータス別注文件数取得
    orderStatusCounts: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { getOrderTabCounts } = await import('./db');
        const counts = await getOrderTabCounts();
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return { ...counts, all: total };
      }),
    // Update order status
    updateOrderStatus: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["pending", "paid", "confirmed", "shipped", "delivered", "cancelled"]),
        trackingNumber: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        await adminUpdateOrderStatus(input.orderId, input.status);
        // Auto-create shipment event
        const shipment = await getShipmentByOrderId(input.orderId);
        if (shipment) {
          const eventTypeMap: Record<string, string> = {
            pending: 'order_placed',
            confirmed: 'payment_confirmed',
            shipped: 'departed',
            delivered: 'delivered',
            cancelled: 'failed',
          };
          await addShipmentEvent({
            shipmentId: shipment.id,
            eventType: (eventTypeMap[input.status] || 'in_transit') as any,
            location: null,
            description: `ステータス変更: ${input.status}`,
          });
        }

        // Send email notification to customer (non-blocking)
        try {
          const order = await getOrderById(input.orderId);
          if (order) {
            const user = await getRegisteredUserById(order.userId);
            if (user) {
              const shipmentInfo = await getShipmentByOrderId(input.orderId);
              const origin = ctx.req.headers.origin || ctx.req.headers.referer || '';
              
              // Get order items with product details
              const items = await getOrderItems(input.orderId);
              const orderItemsWithDetails = items.map((item) => ({
                productName: item.productName,
                quantity: item.quantity,
                price: parseFloat(item.subtotal),
                tierName: item.tierName,
                imageUrl: item.productImageUrl,
              }));
              
              // paid 상태 변경 시 입금확인 이메일 발송 (bank_transfer_confirmed 템플릿 사용)
              const emailStatus = input.status === 'paid' ? 'bank_transfer_confirmed' : input.status;
              sendOrderStatusEmail({
                customerEmail: user.email,
                customerName: user.nameKanji,
                orderNumber: order.orderNumber,
                status: emailStatus,
                trackingNumber: shipmentInfo?.trackingNumber || order.trackingNumber,
                carrier: shipmentInfo?.carrier,
                estimatedDelivery: shipmentInfo?.estimatedDeliveryDate ? new Date(shipmentInfo.estimatedDeliveryDate).toLocaleDateString('ja-JP') : undefined,
                reviewLink: input.status === 'delivered' ? `${origin}/mypage` : undefined,
                orderItems: orderItemsWithDetails,
                totalAmount: parseFloat(order.totalAmount),
              }).catch(err => console.error('[OrderEmail] Background send failed:', err));

              // Send delivery completion email with review invitation
              if (input.status === 'delivered') {
                const { sendDeliveryCompletionEmail } = await import('./_core/emailService');
                const { getSetting, addPointsToUser: awardPoints } = await import('./db');
                const reviewPoints = parseInt(await getSetting('REVIEW_POINTS') || '1500');

                // === 配送完了ポイント自動積立 ===
                let deliveryEarnedPoints = 0;
                let deliveryNewBalance: number | undefined = undefined;
                try {
                  // 重複積立防止: pointsEarnedが0の場合のみ積立
                  const currentPointsEarned = order.pointsEarned || 0;
                  if (currentPointsEarned === 0) {
                    const rewardRateStr = await getSetting('PURCHASE_POINTS_PERCENT');
                    const rewardRate = parseFloat(rewardRateStr || '1'); // デフォルト1%
                    if (rewardRate > 0) {
                      // 実決済金額 = 商品金額 - クーポン割引 - 使用ポイント(円換算)
                      const totalAmt = parseFloat(order.totalAmount);
                      const couponDisc = parseFloat(order.couponDiscount || '0');
                      const pointsUsedAmt = order.pointsUsed || 0;
                      const actualPaid = Math.max(0, totalAmt - couponDisc - pointsUsedAmt);
                      const earnedPoints = Math.floor(actualPaid * (rewardRate / 100));
                      if (earnedPoints > 0) {
                        await awardPoints(
                          order.userId,
                          earnedPoints,
                          `購入ポイント還元 ${rewardRate}% - 注文番号: ${order.orderNumber}`,
                          order.id
                        );
                        // ordersテーブルにpointsEarned記録
                        const db = await getDb();
                        if (db) {
                          await db.update(orders)
                            .set({ pointsEarned: earnedPoints })
                            .where(eq(orders.id, order.id));
                          // 積立後残高取得 (メール表示用)
                          const { getUserPoints } = await import('./db');
                          const balanceResult = await getUserPoints(order.userId);
                          // getUserPointsはnumberを返す
                          deliveryNewBalance = typeof balanceResult === 'number' ? balanceResult : undefined;
                        }
                        deliveryEarnedPoints = earnedPoints;
                        console.log(`[PointReward] User ${order.userId} earned ${earnedPoints}pts for order ${order.orderNumber} (rate: ${rewardRate}%)`);
                      }
                    }
                  }
                } catch (pointErr) {
                  console.error('[PointReward] Failed to award delivery points:', pointErr);
                }
                // === ポイント積立終了 ===
                
                // Mark all order items as review eligible
                const dbModule = await import('./db');
                await Promise.all(items.map(item => 
                  (dbModule as any).db.update((dbModule as any).orderItems)
                    .set({ reviewEligible: 1 })
                    .where((dbModule as any).eq((dbModule as any).orderItems.id, item.id))
                ));

                if (user.email) sendDeliveryCompletionEmail({
                  to: user.email,
                  userName: buildFullName(user) || user.email || 'お客様',
                  orderNumber: order.orderNumber,
                  orderId: order.id,
                  orderItems: items.map(item => ({
                    productId: item.productId,
                    productNameJa: item.productName,
                    productImageUrl: item.productImageUrl,
                    orderItemId: item.id,
                  })),
                  reviewPoints,
                  earnedPoints: deliveryEarnedPoints > 0 ? deliveryEarnedPoints : undefined,
                  newPointBalance: deliveryNewBalance,
                }).catch(err => console.error('[DeliveryEmail] Background send failed:', err));
              }
            }
          }
        } catch (emailErr) {
          console.error('[OrderEmail] Failed to send status email:', emailErr);
        }
        // 配送完了アプリ内通知
        if (input.status === 'delivered') {
          try {
            const { insertNotification } = await import('./db');
            const deliveredOrder = await getOrderById(input.orderId);
            if (deliveredOrder?.userId) {
              await insertNotification({
                userId: deliveredOrder.userId,
                type: 'order',
                title: '商品が届きました！',
                message: 'ご注文の商品が届きました。ぜひレビューをお書きください。ポイントも獲得できます！',
                link: `/mypage/orders/${input.orderId}`,
                templateName: 'order_delivered',
              });
            }
          } catch (notifErr) {
            console.error('[Notification] Delivery notification failed:', notifErr);
          }
        }

        // Auto-recalculate membership tier on delivery (공통 헬퍼 사용 - periodMonths 반영)
        if (input.status === 'delivered') {
          try {
            const order = await getOrderById(input.orderId);
            if (order) {
              const tierResult = await recalculateMembershipTier(order.userId);
              const { previousTierId, newTierId, newTierData, upgraded } = tierResult;

              // Send tier upgrade notification if tier changed (upgraded)
              if (upgraded && newTierId && newTierData) {
                try {
                  const tierDb = await getDb();
                  const allTiers = tierDb ? await tierDb.select().from(membershipTiers).orderBy(desc(membershipTiers.minAmount)) : [];
                  const previousTier = previousTierId ? allTiers.find(t => t.id === previousTierId) : null;
                  const currentUser = tierDb ? await tierDb.select({ email: registeredUsers.email, nameKanji: registeredUsers.nameKanji })
                    .from(registeredUsers).where(eq(registeredUsers.id, order.userId)).limit(1) : [];
                  if (currentUser[0]?.email) {
                    const { sendTierUpgradeEmail } = await import('./_core/emailService');
                    sendTierUpgradeEmail({
                      to: currentUser[0].email,
                      userName: buildFullName(currentUser[0]),
                      previousTierName: previousTier?.name || '一般',
                      newTierName: newTierData.name,
                      newDiscountRate: parseFloat(newTierData.discountRate),
                      newPointRate: parseFloat(newTierData.pointRate),
                    }).catch(err => console.error('[TierUpgrade] Email send failed:', err));
                  }
                  // アプリ内通知送信
                  try {
                    const { insertNotification } = await import('./db');
                    await insertNotification({
                      userId: order.userId,
                      type: 'tier',
                      title: `会員ランクが「${newTierData.name}」にアップグレードされました！`,
                      message: `おめでとうございます！会員ランクが「${previousTier?.name || '一般'}」から「${newTierData.name}」にアップグレードされました。割引率 ${parseFloat(newTierData.discountRate)}%、ポイント還元率 ${parseFloat(newTierData.pointRate)}% が適用されます。`,
                      link: '/mypage/membership',
                      templateName: 'tier_upgraded',
                      templateVars: { tierName: newTierData.name, previousTier: previousTier?.name || '一般', discountRate: String(parseFloat(newTierData.discountRate)), pointRate: String(parseFloat(newTierData.pointRate)) },
                    });
                  } catch (notifErr) {
                    console.error('[Notification] Tier upgrade notification failed:', notifErr);
                  }
                } catch (emailErr) {
                  console.error('[TierUpgrade] Failed to send upgrade email:', emailErr);
                }
              }

              // Check and process first-purchase referral reward
              try {
                const tierDb = await getDb();
                if (tierDb) {
                  const deliveredOrdersCount = await tierDb.select({ id: orders.id })
                    .from(orders)
                    .where(and(eq(orders.userId, order.userId), eq(orders.status, 'delivered')));
                  const userDeliveredCount = deliveredOrdersCount.length;
                  // Send first-purchase thank-you coupon email
                  if (userDeliveredCount === 1) {
                    try {
                      const firstPurchaseUser = await tierDb.select({ email: registeredUsers.email, nameKanji: registeredUsers.nameKanji })
                        .from(registeredUsers).where(eq(registeredUsers.id, order.userId)).limit(1);
                      if (firstPurchaseUser[0]?.email) {
                        const { sendFirstPurchaseCouponEmail } = await import('./_core/emailService');
                        const expiresAt = new Date();
                        expiresAt.setDate(expiresAt.getDate() + 30);
                        const firstPurchaseCouponCode = `FIRST${order.userId}${Date.now().toString(36).toUpperCase().slice(-4)}`;
                        sendFirstPurchaseCouponEmail({
                          to: firstPurchaseUser[0].email,
                          userName: firstPurchaseUser[0].nameKanji || firstPurchaseUser[0].email,
                          couponCode: firstPurchaseCouponCode,
                          discountText: '10% OFF',
                          expiresAt,
                        }).catch(err => console.error('[Email] First purchase coupon email failed:', err));
                      }
                    } catch (emailErr) {
                      console.error('[Email] Failed to send first purchase coupon email:', emailErr);
                    }
                    // Check referral reward
                    const regUser = await tierDb.select({ referredBy: registeredUsers.referredBy })
                      .from(registeredUsers).where(eq(registeredUsers.id, order.userId)).limit(1);
                    if (regUser[0]?.referredBy) {
                      const existingReward = await tierDb.select({ id: referralRewards.id })
                        .from(referralRewards)
                        .where(and(eq(referralRewards.refereeId, order.userId), eq(referralRewards.rewardType, 'first_purchase')))
                        .limit(1);
                      if (!existingReward[0]) {
                        const settings = await tierDb.select().from(referralSettings).limit(1);
                        const setting = settings[0];
                        if (setting && setting.isActive) {
                          await tierDb.insert(referralRewards).values({
                            referrerId: regUser[0].referredBy, refereeId: order.userId,
                            rewardType: 'first_purchase', referrerReward: setting.purchaseReferrerReward,
                            refereeReward: setting.purchaseRefereeReward, status: 'completed', completedAt: new Date(),
                          });
                          const refBalRes = await tierDb.select({ bal: sql<number>`COALESCE(SUM(${pointTransactions.amount}), 0)` })
                            .from(pointTransactions).where(eq(pointTransactions.userId, regUser[0].referredBy));
                          const refBal = Number(refBalRes[0]?.bal || 0);
                          await tierDb.insert(pointTransactions).values({
                            userId: regUser[0].referredBy, amount: setting.purchaseReferrerReward,
                            type: 'earn', balance: refBal + setting.purchaseReferrerReward, description: 'お友達紹介報酬（初回購入）',
                          });
                          const reeBalRes = await tierDb.select({ bal: sql<number>`COALESCE(SUM(${pointTransactions.amount}), 0)` })
                            .from(pointTransactions).where(eq(pointTransactions.userId, order.userId));
                          const reeBal = Number(reeBalRes[0]?.bal || 0);
                          await tierDb.insert(pointTransactions).values({
                            userId: order.userId, amount: setting.purchaseRefereeReward,
                            type: 'earn', balance: reeBal + setting.purchaseRefereeReward, description: '紹介特典（初回購入ボーナス）',
                          });
                        }
                      }
                    }
                  }
                }
              } catch (referralErr) {
                console.error('[Referral] First purchase reward failed:', referralErr);
              }
            }
          } catch (tierErr) {
            console.error('[MembershipTier] Failed to recalculate tier:', tierErr);
          }
        }
        // 自動アプリ内通知送信 (non-blocking)
        try {
          const { insertNotification } = await import('./db');
          const orderForNotif = await getOrderById(input.orderId);
          if (orderForNotif) {
            const statusLabels: Record<string, string> = {
              pending: '注文受付', paid: '入金確認', confirmed: '注文確認',
              shipped: '発送済み', delivered: '配達完了', cancelled: 'キャンセル',
            };
            const statusLabel = statusLabels[input.status] || input.status;
            await insertNotification({
              userId: orderForNotif.userId,
              type: 'order',
              title: `注文ステータス更新: ${statusLabel}`,
              message: `注文番号 ${orderForNotif.orderNumber} のステータスが「${statusLabel}」に変更されました。`,
              link: `/mypage/orders/${input.orderId}`,
              templateName: 'order_status_update',
              templateVars: { orderNumber: orderForNotif.orderNumber, status: statusLabel },
            });
          }
        } catch (notifErr) {
          console.error('[Notification] Order status notification failed:', notifErr);
        }
        return { success: true, message: "注文ステータスが更新されました。" };
      }),
    // Update tracking numberr
    updateTrackingNumber: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        trackingNumber: z.string(),
        carrier: z.string().default("Japan Post"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const dbModule = await import("./db");
        await (dbModule as any).updateShipmentTrackingNumber(input.orderId, input.trackingNumber, input.carrier);
        return { success: true, message: "追跡番号が保存されました。" };
      }),

    // Update admin notes
    updateAdminNotes: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        notes: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const success = await updateOrderAdminNotes(input.orderId, input.notes);
        if (!success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return { success: true };
      }),

    // Bulk update order status
    bulkUpdateStatus: protectedProcedure
      .input(z.object({
        orderIds: z.array(z.number()),
        status: z.enum(["pending", "paid", "confirmed", "shipped", "delivered", "cancelled"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const result = await bulkUpdateOrderStatus(input.orderIds, input.status);

        // Send email notifications + recalculate membership tier for each order (non-blocking)
        const origin = ctx.req.headers.origin || ctx.req.headers.referer || '';
        for (const orderId of input.orderIds) {
          try {
            const order = await getOrderById(orderId);
            if (order) {
              const user = await getRegisteredUserById(order.userId);
              if (user) {
                const shipmentInfo = await getShipmentByOrderId(orderId);
                // paid 상태 변경 시 입금확인 이메일 발송 (bank_transfer_confirmed 템플릿 사용)
                const bulkEmailStatus = input.status === 'paid' ? 'bank_transfer_confirmed' : input.status;
                sendOrderStatusEmail({
                  customerEmail: user.email,
                  customerName: user.nameKanji,
                  orderNumber: order.orderNumber,
                  status: bulkEmailStatus,
                  trackingNumber: shipmentInfo?.trackingNumber || order.trackingNumber,
                  carrier: shipmentInfo?.carrier,
                  reviewLink: input.status === 'delivered' ? `${origin}/mypage` : undefined,
                }).catch(err => console.error('[OrderEmail] Bulk email failed:', err));
              }

              // 배송완료 시 등급 자동 업그레이드 (bulk에도 적용)
              if (input.status === 'delivered') {
                try {
                  const tierResult = await recalculateMembershipTier(order.userId);
                  if (tierResult.upgraded && tierResult.newTierData) {
                    const tierDb = await getDb();
                    const allTiers = tierDb ? await tierDb.select().from(membershipTiers).orderBy(desc(membershipTiers.minAmount)) : [];
                    const previousTier = tierResult.previousTierId ? allTiers.find(t => t.id === tierResult.previousTierId) : null;
                    const currentUser = tierDb ? await tierDb.select({ email: registeredUsers.email, nameKanji: registeredUsers.nameKanji })
                      .from(registeredUsers).where(eq(registeredUsers.id, order.userId)).limit(1) : [];
                    if (currentUser[0]?.email) {
                      const { sendTierUpgradeEmail } = await import('./_core/emailService');
                      sendTierUpgradeEmail({
                        to: currentUser[0].email,
                        userName: buildFullName(currentUser[0]),
                        previousTierName: previousTier?.name || '一般',
                        newTierName: tierResult.newTierData.name,
                        newDiscountRate: parseFloat(tierResult.newTierData.discountRate),
                        newPointRate: parseFloat(tierResult.newTierData.pointRate),
                      }).catch(err => console.error('[TierUpgrade] Bulk email failed:', err));
                    }
                    try {
                      const { insertNotification } = await import('./db');
                      await insertNotification({
                        userId: order.userId,
                        type: 'tier',
                        title: `会員ランクが「${tierResult.newTierData.name}」にアップグレードされました！`,
                        message: `おめでとうございます！会員ランクが「${previousTier?.name || '一般'}」から「${tierResult.newTierData.name}」にアップグレードされました。`,
                        link: '/mypage/membership',
                        templateName: 'tier_upgraded',
                        templateVars: { tierName: tierResult.newTierData.name, previousTier: previousTier?.name || '一般' },
                      });
                    } catch (notifErr) {
                      console.error('[Notification] Bulk tier notification failed:', notifErr);
                    }
                  }
                } catch (tierErr) {
                  console.error('[MembershipTier] Bulk recalculate failed for order', orderId, ':', tierErr);
                }
              }
            }
          } catch (emailErr) {
            console.error('[OrderEmail] Bulk email error:', emailErr);
          }
        }

        return result;
      }),

    // Update shipment info
    updateShipmentInfo: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        carrier: z.string().optional(),
        trackingNumber: z.string().optional(),
        estimatedDelivery: z.string().nullable().optional(),
        currentLocation: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const success = await adminUpdateShipmentInfo(input.orderId, input);
        if (!success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return { success: true };
      }),
    // Update tracking number per order item (inline edit)
    updateItemTracking: protectedProcedure
      .input(z.object({
        orderId: z.number().optional(),
        orderItemId: z.number(),
        trackingNumber: z.string().nullish(),
        carrier: z.string().nullish(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const safeCarrier = input.carrier ?? "Japan Post";
        const safeTrackingNumber = input.trackingNumber ?? "";
        // orderItemIdベースで既存shipment取得
        // orderItemId=0の場合、注文レベルshipment(orderId基準最初)にfallback
        let existing: any[] = [];
        if (input.orderItemId > 0 && input.orderId) {
          existing = await db.select().from(shipmentsTable)
            .where(and(eq(shipmentsTable.orderId, input.orderId), eq(shipmentsTable.orderItemId, input.orderItemId)))
            .limit(1);
        } else if (input.orderItemId > 0) {
          existing = await db.select().from(shipmentsTable)
            .where(eq(shipmentsTable.orderItemId, input.orderItemId))
            .limit(1);
        }
        if (existing.length === 0 && input.orderId) {
          // orderItemIdがないか見つからない場合、注文レベルshipment取得
          existing = await db.select().from(shipmentsTable)
            .where(eq(shipmentsTable.orderId, input.orderId))
            .orderBy(asc(shipmentsTable.id))
            .limit(1);
        }
        if (existing.length > 0) {
          await db.update(shipmentsTable)
            .set({ trackingNumber: safeTrackingNumber, carrier: safeCarrier, updatedAt: new Date() })
            .where(eq(shipmentsTable.id, existing[0].id));
        } else if (input.orderId) {
          await createShipment({
            orderId: input.orderId,
            orderItemId: input.orderItemId > 0 ? input.orderItemId : undefined,
            trackingNumber: safeTrackingNumber,
            carrier: safeCarrier,
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        // BUG-03 fix: paid状態も含めてshippedに自動転換
        const order = input.orderId ? await getOrderById(input.orderId) : null;
        if (order && ["pending", "paid", "confirmed"].includes(order.status)) {
          await adminUpdateOrderStatus(input.orderId!, "shipped");
          // 配送中転換時、顧客メール自動送信
          try {
            const db2 = await getDb();
            if (db2) {
              const userRows = await db2.select().from(users).where(eq(users.id, order.userId)).limit(1);
              if (userRows[0]?.email) {
                const origin = ctx.req.headers.origin || 'https://localhost:3000';
                sendOrderStatusEmail({
                  customerEmail: userRows[0].email,
                  customerName: userRows[0].nameKanji || userRows[0].name || userRows[0].email.split('@')[0],
                  orderNumber: order.orderNumber,
                  status: 'shipped',
                  trackingNumber: safeTrackingNumber,
                  carrier: safeCarrier,
                  reviewLink: undefined,
                }).catch(err => console.error('[updateItemTracking] Email failed:', err));
              }
            }
          } catch (emailErr) {
            console.error('[updateItemTracking] Email error:', emailErr);
          }
        }
        return { success: true };
      }),
    // Add shipment event (admin)
    addShipmentEvent: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.string(),
        location: z.string().nullable().optional(),
        description: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const shipment = await getShipmentByOrderId(input.orderId);
        if (!shipment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "配送情報がありません。" });
        }
        await addShipmentEvent({
          shipmentId: shipment.id,
          eventType: input.status as any,
          location: input.location || null,
          description: input.description,
        });
        return { success: true };
      }),

    // Bulk update tracking numbers (CSV upload)
    bulkUpdateTracking: protectedProcedure
      .input(z.object({
        entries: z.array(z.object({
          orderNumber: z.string(),
          trackingNumber: z.string(),
          carrier: z.string().default("Japan Post"),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "\u7BA1\u7406\u8005\u6A29\u9650\u304C\u5FC5\u8981\u3067\u3059\u3002" });
        }
        const results: { orderNumber: string; success: boolean; message: string }[] = [];
        for (const entry of input.entries) {
          try {
            // Find order by orderNumber
            const allOrders = await adminSearchOrders({ search: entry.orderNumber, page: 1, limit: 5 });
            const order = allOrders.orders.find((o: any) => o.orderNumber === entry.orderNumber);
            if (!order) {
              results.push({ orderNumber: entry.orderNumber, success: false, message: "\u6CE8\u6587\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
              continue;
            }
            await updateShipmentTrackingNumber(order.id, entry.trackingNumber, entry.carrier);
            // BUG-03 fix: paid状態も含めてshippedに自動転換
            if (["pending", "paid", "confirmed"].includes(order.status)) {
              await adminUpdateOrderStatus(order.id, "shipped");
            }
            results.push({ orderNumber: entry.orderNumber, success: true, message: "\u66F4\u65B0\u5B8C\u4E86" });
          } catch (error: any) {
            results.push({ orderNumber: entry.orderNumber, success: false, message: error.message || "\u30A8\u30E9\u30FC" });
          }
        }
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;
        return { results, success: successCount, failed: failedCount };
      }),

    // 一括銀行振込入金確認
    bulkConfirmBankTransfer: protectedProcedure
      .input(z.object({
        orderIds: z.array(z.number()).min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        return await bulkConfirmBankTransfer(input.orderIds);
      }),

    // Export orders (CSV/Excel data)
    exportOrders: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        amountMin: z.number().optional(),
        amountMax: z.number().optional(),
        format: z.enum(['csv', 'excel']).default('csv'),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const data = await adminExportOrders(input);
        return { data, count: data.length };
      }),

    // Order statistics
    orderStatistics: protectedProcedure
      .input(z.object({
        period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return getOrderStatistics(input.period);
      }),

    // Get all users
     users: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        search: z.string().optional(),
        searchType: z.enum(["all", "id", "name", "email", "phone"]).default("all"),
        lastNameKatakana: z.string().optional(), // フリガナ姓(セイ)検索
        firstNameKatakana: z.string().optional(), // フリガナ名(メイ)検索
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        tierFilter: z.string().optional(), // ランクフィルター: "none" | tierId
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) return { users: [], total: 0 };
        const conditions: ReturnType<typeof eq>[] = [];
        if (input.search && input.search.trim()) {
          const s = `%${input.search.trim()}%`;
          if (input.searchType === "id") {
            const numId = parseInt(input.search.trim());
            if (!isNaN(numId)) conditions.push(eq(registeredUsers.id, numId) as any);
          } else if (input.searchType === "name") {
            conditions.push(or(like(registeredUsers.nameKanji, s), like(registeredUsers.nameHiragana, s)) as any);
          } else if (input.searchType === "email") {
            conditions.push(like(registeredUsers.email, s) as any);
          } else if (input.searchType === "phone") {
            conditions.push(like(registeredUsers.phone, s) as any);
          } else {
            const numId2 = parseInt(input.search.trim());
            const orConds: any[] = [
              like(registeredUsers.email, s),
              like(registeredUsers.nameKanji, s),
              like(registeredUsers.nameHiragana, s),
              like(registeredUsers.phone, s),
            ];
            if (!isNaN(numId2)) orConds.push(eq(registeredUsers.id, numId2));
            conditions.push(or(...orConds) as any);
          }
        }
        if (input.dateFrom) conditions.push(gte(registeredUsers.createdAt, new Date(input.dateFrom)) as any);
        if (input.dateTo) {
          const to = new Date(input.dateTo);
          to.setHours(23, 59, 59, 999);
          conditions.push(lte(registeredUsers.createdAt, to) as any);
        }
        // フリガナ検索条件
        if (input.lastNameKatakana && input.lastNameKatakana.trim()) {
          conditions.push(like(registeredUsers.lastNameKatakana, `%${input.lastNameKatakana.trim()}%`) as any);
        }
        if (input.firstNameKatakana && input.firstNameKatakana.trim()) {
          conditions.push(like(registeredUsers.firstNameKatakana, `%${input.firstNameKatakana.trim()}%`) as any);
        }
        // ランクフィルター
        if (input.tierFilter) {
          if (input.tierFilter === "none") {
            conditions.push(isNull(registeredUsers.membershipTierId) as any);
          } else {
            const tierId = parseInt(input.tierFilter);
            if (!isNaN(tierId)) conditions.push(eq(registeredUsers.membershipTierId, tierId) as any);
          }
        }
        // 탈퇴 계정 제외
        conditions.push(eq(registeredUsers.isWithdrawn, false) as any);
        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const offset = (input.page - 1) * input.limit;
        const [rows, countRows] = await Promise.all([
          db.select().from(registeredUsers).where(where).orderBy(desc(registeredUsers.createdAt)).limit(input.limit).offset(offset),
          db.select({ count: sql<number>`count(*)` }).from(registeredUsers).where(where),
        ]);
        // ランク情報JOIN
        const tierIds = Array.from(new Set(rows.map(r => r.membershipTierId).filter(Boolean))) as number[];
        let tiersMap: Record<number, { name: string; color: string }> = {};
        if (tierIds.length > 0) {
          const tiers = await db.select({ id: membershipTiers.id, name: membershipTiers.name, color: membershipTiers.color })
            .from(membershipTiers);
          tiersMap = Object.fromEntries(tiers.map(t => [t.id, { name: t.name, color: t.color }]));
        }
        // 각 사용자의 주문 횟수 조회 (cartGroupId 기준 - 중복 제거)
        const userIds = rows.map(r => r.id);
        let orderCountMap: Record<number, number> = {};
        if (userIds.length > 0) {
          try {
            orderCountMap = await getOrderCountsByUserIds(userIds);
          } catch (err) {
            console.error('[admin.users] Error fetching order counts:', err);
          }
        }
        const usersWithTier = rows.map(r => ({
          ...r,
          tierName: r.membershipTierId ? tiersMap[r.membershipTierId]?.name || null : null,
          tierColor: r.membershipTierId ? tiersMap[r.membershipTierId]?.color || null : null,
          orderCount: orderCountMap[r.id] || 0,
        }));
        return { users: usersWithTier, total: Number(countRows[0]?.count ?? 0) };
      }),
    updateUser: protectedProcedure
      .input(z.object({
        id: z.number(),
        nameKanji: z.string().optional(),
        nameHiragana: z.string().optional(),
        lastNameKanji: z.string().optional(),
        firstNameKanji: z.string().optional(),
        lastNameKatakana: z.string().optional(),
        firstNameKatakana: z.string().optional(),
        nickname: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        role: z.enum(["user", "admin"]).optional(),
        points: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (data.nameKanji !== undefined) updateData.nameKanji = data.nameKanji;
        if (data.nameHiragana !== undefined) updateData.nameHiragana = data.nameHiragana;
        if (data.lastNameKanji !== undefined) updateData.lastNameKanji = data.lastNameKanji;
        if (data.firstNameKanji !== undefined) updateData.firstNameKanji = data.firstNameKanji;
        if (data.lastNameKatakana !== undefined) updateData.lastNameKatakana = data.lastNameKatakana;
        if (data.firstNameKatakana !== undefined) updateData.firstNameKatakana = data.firstNameKatakana;
        if (data.nickname !== undefined) updateData.nickname = data.nickname;
        if (data.phone !== undefined) updateData.phone = data.phone;
        // 이메일은 사용자 ID로 사용되므로 수정 불가
        // if (data.email !== undefined) updateData.email = data.email;
        if (data.role !== undefined) updateData.role = data.role;
        if (data.points !== undefined) updateData.points = data.points;
        // 修正前元データ取得
        const beforeResult = await db.select().from(registeredUsers).where(eq(registeredUsers.id, id)).limit(1);
        const before = beforeResult[0];
        await db.update(registeredUsers).set(updateData).where(eq(registeredUsers.id, id));
        const result = await db.select().from(registeredUsers).where(eq(registeredUsers.id, id)).limit(1);
        // 修正履歴自動メモ記録
        if (before) {
          const fieldLabels: Record<string, string> = {
            lastNameKanji: "姓（漢字）",
            firstNameKanji: "名（漢字）",
            lastNameKatakana: "セイ（カタカナ）",
            firstNameKatakana: "メイ（カタカナ）",
            nickname: "ニックネーム",
            email: "メールアドレス",
            phone: "電話番号",
            role: "権限",
            points: "ポイント",
          };
          const changes: string[] = [];
          for (const [key, label] of Object.entries(fieldLabels)) {
            if (data[key as keyof typeof data] !== undefined) {
              const oldVal = (before as any)[key] ?? "";
              const newVal = data[key as keyof typeof data];
              if (String(oldVal) !== String(newVal)) {
                changes.push(`${label}: "${oldVal}" → "${newVal}"`);
              }
            }
          }
          if (changes.length > 0) {
            const adminName = ctx.user.name || ctx.user.email || "管理者";
            const noteText = `[会員情報修正] ${adminName} (${new Date().toLocaleString("ja-JP")})\n${changes.join("\n")}`;
            await createCustomerNote(id, ctx.user.id, noteText).catch(() => null);
          }
        }
        return result[0];
      }),
    // Get customer detail (orders, inquiries, reviews)
    // Get customer addresses (admin)
    getCustomerAddresses: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        // input.userId is registeredUsers.id; addresses use users.id
        const db = await getDb();
        let actionsUserId = input.userId;
        if (db) {
          const openId = `email_${input.userId}`;
          const [userRow] = await db.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1);
          if (userRow) actionsUserId = userRow.id;
        }
        return getUserAddresses(actionsUserId);
      }),
    customerDetail: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return getCustomerDetail(input.userId);
      }),

    // Get customer order statistics
    customerStats: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return getCustomerOrderStats(input.userId);
      }),

    // Customer notes CRUD
    getCustomerNotes: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return getCustomerNotes(input.customerId);
      }),

    createCustomerNote: protectedProcedure
      .input(z.object({ customerId: z.number(), note: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return createCustomerNote(input.customerId, ctx.user.id, input.note);
      }),

    updateCustomerNote: protectedProcedure
      .input(z.object({ id: z.number(), note: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return updateCustomerNote(input.id, input.note);
      }),

    deleteCustomerNote: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return deleteCustomerNote(input.id);
      }),

    // Quick actions: Issue coupon to customer
    issueCouponToCustomer: protectedProcedure
      .input(z.object({
        customerId: z.number(),
        code: z.string(),
        discountType: z.enum(["percentage", "fixed"]),
        discountValue: z.number(),
        expiresAt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        await db.insert(coupons).values({
          code: input.code,
          nameJa: `お客様専用クーポン`,
          discountType: input.discountType,
          discountValue: input.discountValue.toString(),
          minOrderAmount: "0.00",
          maxDiscountAmount: null,
          maxUses: 1,
          maxUsesPerUser: 1,
          currentUses: 0,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // クーポン発行アプリ内通知
        try {
          const { insertNotification } = await import('./db');
          const discountText = input.discountType === 'percentage'
            ? `${input.discountValue}% OFF`
            : `${input.discountValue}円引き`;
          await insertNotification({
            userId: input.customerId,
            type: 'coupon',
            title: 'クーポンが発行されました！',
            message: `${discountText}クーポン（コード：${input.code}）が発行されました。${input.expiresAt ? `有効期限：${new Date(input.expiresAt).toLocaleDateString('ja-JP')}` : ''}`,
            link: '/mypage/coupons',
            templateName: 'coupon_issued',
            templateVars: { code: input.code, discount: discountText },
          });
        } catch (notifErr) {
          console.error('[Notification] Coupon issued notification failed:', notifErr);
        }
        return { success: true, message: "クーポンが発行されました。" };
      }),

    // Quick actions: Award points to customer
    awardPointsToCustomer: protectedProcedure
      .input(z.object({
        customerId: z.number(),
        points: z.number(),
        description: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        // Get current user balance from registered_users (source of truth)
        const [currentUser] = await db
          .select({ points: registeredUsers.points })
          .from(registeredUsers)
          .where(eq(registeredUsers.id, input.customerId))
          .limit(1);
        if (!currentUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'ユーザーが見つかりません。' });
        const newBalance = (currentUser.points || 0) + input.points;
        // Update registered_users.points (source of truth)
        await db.update(registeredUsers)
          .set({ points: newBalance })
          .where(eq(registeredUsers.id, input.customerId));
        // Record transaction
        await db.insert(pointTransactions).values({
          userId: input.customerId,
          amount: input.points,
          balance: newBalance,
          type: "admin_add",
          description: input.description,
          createdAt: new Date(),
        });
        // Send points earned email
        try {
          const [customerInfo] = await db.select({ email: registeredUsers.email, nameKanji: registeredUsers.nameKanji })
            .from(registeredUsers).where(eq(registeredUsers.id, input.customerId)).limit(1);
          if (customerInfo?.email) {
            const { sendPointsEarnedEmail } = await import('./_core/emailService');
            sendPointsEarnedEmail({
              to: customerInfo.email,
              userName: customerInfo.nameKanji || customerInfo.email,
              earnedPoints: input.points,
              totalPoints: newBalance,
              reason: input.description || '管理者によるポイント付与',
            }).catch(err => console.error('[Email] Points earned email failed:', err));
          }
        } catch (emailErr) {
          console.error('[Email] Failed to send points earned email:', emailErr);
        }
        // 管理者ポイント調整アプリ内通知
        try {
          const { insertNotification } = await import('./db');
          await insertNotification({
            userId: input.customerId,
            type: 'point',
            title: `${input.points > 0 ? 'ポイントが付与されました' : 'ポイントが調整されました'}`,
            message: `${Math.abs(input.points)}ポイントが${input.points > 0 ? '付与' : '調整'}されました。理由：${input.description}`,
            link: '/mypage/points',
            templateName: 'point_adjusted',
            templateVars: { points: String(Math.abs(input.points)), reason: input.description },
          });
        } catch (notifErr) {
          console.error('[Notification] Admin points notification failed:', notifErr);
        }
            return { success: true, message: "ポイントが付与されました。" };;
      }),
    // 管理者: お客様へ直接メール送信
    sendEmailToCustomer: protectedProcedure
      .input(z.object({
        customerId: z.number(),
        subject: z.string().min(1),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        const [customer] = await db.select({ email: registeredUsers.email, nameKanji: registeredUsers.nameKanji })
          .from(registeredUsers).where(eq(registeredUsers.id, input.customerId)).limit(1);
        if (!customer?.email) {
          throw new TRPCError({ code: "NOT_FOUND", message: "お客様のメールアドレスが見つかりません。" });
        }
        const { sendCustomEmailToCustomer } = await import('./_core/emailService');
        const result = await sendCustomEmailToCustomer({
          to: customer.email,
          userName: buildFullName(customer),
          subject: input.subject,
          content: input.content,
        });
        if (!result.success) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error || "メール送信に失敗しました。" });
        }
        return { success: true, message: "メールが送信されました。" };
      }),
    // 관리자: 회원 탈퇴 처리 (소프트 삭제)
    withdrawUser: protectedProcedure
      .input(z.object({ userId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [user] = await db.select({ id: registeredUsers.id, email: registeredUsers.email, isWithdrawn: registeredUsers.isWithdrawn })
          .from(registeredUsers).where(eq(registeredUsers.id, input.userId)).limit(1);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "会員が見つかりません。" });
        if (user.isWithdrawn) throw new TRPCError({ code: "BAD_REQUEST", message: "既に退会済みの会員です。" });
        await db.update(registeredUsers)
          .set({ isWithdrawn: true, withdrawnAt: new Date(), withdrawReason: input.reason || null })
          .where(eq(registeredUsers.id, input.userId));
        // 탈퇴 메모 기록
        const adminName = ctx.user.name || ctx.user.email || "管理者";
        const reasonNote = input.reason ? ` 사유: ${input.reason}` : "";
        await createCustomerNote(input.userId, ctx.user.id, `[退会処理] ${adminName} (${new Date().toLocaleString("ja-JP")}) により退会処理されました。${reasonNote}`).catch(() => null);
        return { success: true, message: "退会処理が完了しました。" };
      }),

    // 관리자: 탈퇴 회원 복원
    restoreUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [user] = await db.select({ id: registeredUsers.id, isWithdrawn: registeredUsers.isWithdrawn })
          .from(registeredUsers).where(eq(registeredUsers.id, input.userId)).limit(1);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "会員が見つかりません。" });
        if (!user.isWithdrawn) throw new TRPCError({ code: "BAD_REQUEST", message: "退会済みではない会員です。" });
        await db.update(registeredUsers)
          .set({ isWithdrawn: false, withdrawnAt: null, withdrawReason: null })
          .where(eq(registeredUsers.id, input.userId));
        const adminName = ctx.user.name || ctx.user.email || "管理者";
        await createCustomerNote(input.userId, ctx.user.id, `[退会復元] ${adminName} (${new Date().toLocaleString("ja-JP")}) により退会が取り消されました。`).catch(() => null);
        return { success: true, message: "退会が取り消されました。" };
      }),

    // 관리자: 탈퇴 회원 목록 조회
    withdrawnUsers: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        search: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) return { users: [], total: 0 };
        const conditions: any[] = [eq(registeredUsers.isWithdrawn, true)];
        if (input.search && input.search.trim()) {
          const s = `%${input.search.trim()}%`;
          conditions.push(or(
            like(registeredUsers.email, s),
            like(registeredUsers.nameKanji, s),
            like(registeredUsers.phone, s),
          ) as any);
        }
        const where = and(...conditions);
        const offset = (input.page - 1) * input.limit;
        const [rows, countRows] = await Promise.all([
          db.select().from(registeredUsers).where(where).orderBy(desc(registeredUsers.withdrawnAt)).limit(input.limit).offset(offset),
          db.select({ count: sql<number>`count(*)` }).from(registeredUsers).where(where),
        ]);
        return { users: rows, total: Number(countRows[0]?.count ?? 0) };
      }),

    // Bulk member management: points, tier change
    bulkMemberAction: protectedProcedure
      .input(z.object({
        userIds: z.array(z.number()),
        action: z.enum(['add_points', 'deduct_points', 'change_tier']),
        value: z.number(), // points amount or tier id
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        let successCount = 0;
        if (input.action === 'add_points' || input.action === 'deduct_points') {
          for (const userId of input.userIds) {
            const [currentUser] = await db.select({ points: registeredUsers.points })
              .from(registeredUsers).where(eq(registeredUsers.id, userId)).limit(1);
            if (!currentUser) continue;
            const amount = input.action === 'add_points' ? input.value : -input.value;
            const newBalance = (currentUser.points || 0) + amount;
            // Update registered_users.points (source of truth)
            await db.update(registeredUsers)
              .set({ points: newBalance })
              .where(eq(registeredUsers.id, userId));
            await db.insert(pointTransactions).values({
              userId,
              amount,
              balance: newBalance,
              type: input.action === 'add_points' ? 'admin_add' : 'admin_deduct',
              description: input.description || (`一括${input.action === 'add_points' ? '付与' : '減算'}`),
            });
            successCount++;
          }
        } else if (input.action === 'change_tier') {
          await db.update(registeredUsers).set({
            membershipTierId: input.value,
            tierUpdatedAt: new Date(),
          }).where(sql`${registeredUsers.id} IN (${sql.join(input.userIds.map(id => sql`${id}`), sql`,`)})`);
          successCount = input.userIds.length;
        }
        return { success: true, message: `${successCount}名の会員に処理が完了しました。` };
      }),
    // Export members as CSV
    exportMembersCSV: protectedProcedure
      .input(z.object({
        tierFilter: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        let query = db.select({
          id: registeredUsers.id,
          email: registeredUsers.email,
          nameKanji: registeredUsers.nameKanji,
          nameHiragana: registeredUsers.nameHiragana,
          phone: registeredUsers.phone,
          gender: registeredUsers.gender,
          membershipTierId: registeredUsers.membershipTierId,
          totalPurchaseAmount: registeredUsers.totalPurchaseAmount,
          referralCode: registeredUsers.referralCode,
          createdAt: registeredUsers.createdAt,
        }).from(registeredUsers);
        if (input.tierFilter && input.tierFilter !== 'all') {
          if (input.tierFilter === 'none') {
            query = query.where(isNull(registeredUsers.membershipTierId)) as any;
          } else {
            query = query.where(eq(registeredUsers.membershipTierId, parseInt(input.tierFilter))) as any;
          }
        }
        const members = await query;
        // Get tier names
        const tiers = await db.select().from(membershipTiers);
        const tierMap = new Map(tiers.map(t => [t.id, t.name]));
        // Build CSV
        const header = 'ID,メール,氏名(漢字),氏名(ヒラガナ),電話番号,性別,会員ランク,累計購入額,紹介コード,登録日';
        const rows = members.map(m => [
          m.id,
          m.email,
          m.nameKanji || '',
          m.nameHiragana || '',
          m.phone || '',
          m.gender || '',
          tierMap.get(m.membershipTierId ?? 0) || '一般',
          m.totalPurchaseAmount,
          m.referralCode || '',
          m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        return { csv: [header, ...rows].join('\n'), count: members.length };
      }),
    // Email notification settings
    getEmailSettings: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const emailSettingKeys = [
          'EMAIL_REGISTER_COMPLETE', 'EMAIL_PASSWORD_CHANGED', 'EMAIL_PROFILE_UPDATED',
          'EMAIL_TIER_UPGRADE', 'EMAIL_DORMANT_ACCOUNT', 'EMAIL_WITHDRAWAL_COMPLETE',
          'EMAIL_ORDER_CONFIRMED', 'EMAIL_ORDER_SHIPPED', 'EMAIL_ORDER_DELIVERED',
          'EMAIL_ORDER_CANCELLED', 'EMAIL_REFUND_COMPLETE', 'EMAIL_BANK_TRANSFER_REMINDER',
          'EMAIL_ADMIN_NEW_ORDER', 'EMAIL_INQUIRY_REPLIED', 'EMAIL_QA_ANSWERED',
          'EMAIL_REVIEW_APPROVED', 'EMAIL_REVIEW_REJECTED', 'EMAIL_REVIEW_POINTS',
          'EMAIL_COUPON_ISSUED', 'EMAIL_COUPON_EXPIRING', 'EMAIL_BIRTHDAY_COUPON',
          'EMAIL_FIRST_PURCHASE_COUPON', 'EMAIL_POINTS_EARNED', 'EMAIL_POINTS_EXPIRING',
          'EMAIL_EVENT_STARTED', 'EMAIL_EVENT_ENDING_SOON', 'EMAIL_EVENT_WINNER',
          'EMAIL_NEW_PRODUCT', 'EMAIL_PRICE_DROP', 'EMAIL_RESTOCK', 'EMAIL_NEWSLETTER',
        ];
        const results = await Promise.all(
          emailSettingKeys.map(async (key) => {
            const { getSetting } = await import('./db');
            const value = await getSetting(key);
            return { key, value: value ?? 'true' };
          })
        );
        return results;
      }),
    updateEmailSetting: protectedProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const { upsertSiteSetting } = await import('./db');
        await upsertSiteSetting(input.key, input.value);
        return { success: true };
      }),
    // Create categoryry
    createCategory: protectedProcedure
      .input(z.object({
        name: z.string(),
        nameJa: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        descriptionJa: z.string().optional(),
        imageUrl: z.string().optional(),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        await createCategory(input);
        return { success: true, message: "カテゴリが作成されました。" };
      }),

    // Update category
    updateCategory: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        nameJa: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        descriptionJa: z.string().optional(),
        imageUrl: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { id, ...data } = input;
        await updateCategory(id, data);
        return { success: true, message: "カテゴリが更新されました。" };
      }),

    // Update category sort orders (bulk)
    updateCategorySortOrders: protectedProcedure
      .input(z.object({
        orders: z.array(z.object({ id: z.number(), sortOrder: z.number() })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await Promise.all(
          input.orders.map(({ id, sortOrder }) =>
            db.update(categories).set({ sortOrder }).where(eq(categories.id, id))
          )
        );
        return { success: true, count: input.orders.length };
      }),

    // Delete category
    deleteCategory: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        await deleteCategory(input.id);
        return { success: true, message: "カテゴリが削除されました。" };
      }),

    // Get all banners (admin)
    banners: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
      }
      return getAllBanners();
    }),

    // Create banner
    createBanner: protectedProcedure
      .input(z.object({
        title: z.string(),
        titleJa: z.string(),
        imageUrl: z.string(),
        linkUrl: z.string().optional().nullable(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().default(0),
        bannerType: z.enum(["main", "sidebar_top", "sidebar_bottom"]).default("main"),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { startDate, endDate, ...rest } = input;
        await createBanner({
          ...rest,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        });
        cacheInvalidate('banner');
        return { success: true, message: "バナーが作成されました。" };
      }),

    // Update banner
    updateBanner: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        titleJa: z.string().optional(),
        imageUrl: z.string().optional(),
        linkUrl: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
        bannerType: z.enum(["main", "sidebar_top", "sidebar_bottom"]).optional(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { id, startDate, endDate, ...rest } = input;
        await updateBanner(id, {
          ...rest,
          startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
          endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        });
        cacheInvalidate('banner');
        return { success: true, message: "バナーが更新されました。" };
      }),

    // Delete banner
    deleteBanner: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        await deleteBanner(input.id);
        cacheInvalidate('banner');
        return { success: true, message: "バナーが削除されました。" };
      }),

    // Upload banner image (base64 → S3)
    uploadBannerImage: protectedProcedure
      .input(z.object({
        file: z.string(), // base64 data URL
        fileName: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        try {
          const base64Data = input.file.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const ext = input.fileName.split(".").pop() || "jpg";
          const fileKey = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const result = await storagePut(fileKey, buffer, input.contentType);
          return { success: true, url: result.url };
        } catch (error: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `バナー画像アップロード失敗: ${error.message}` });
        }
      }),


    // Create product
    createProduct: protectedProcedure
      .input(z.object({
        name: z.string(),
        nameJa: z.string(),
        categoryId: z.number(),
        price: z.number(), // 円 (JPY) - integer only
        originalPrice: z.number().optional(), // 円 (JPY) - integer only
        description: z.string().optional(),
        descriptionJa: z.string().optional(),
        imageUrl: z.string().optional(),
        imageUrls: z.string().optional(), // JSON array of image URLs
        isTimeSale: z.boolean().default(false),
        isMonthlySale: z.boolean().default(false),
        inStock: z.boolean().default(true),
        isVisible: z.boolean().optional(),
        stock: z.number().optional(),
        // Product details
        activeIngredient: z.string().optional(),
        activeIngredientJa: z.string().optional(),
        volume: z.string().optional(),
        brand: z.string().optional(),
        brandJa: z.string().optional(),
        shippingFrom: z.string().optional(),
        deliveryDays: z.string().optional(),
        usageMethod: z.string().optional(),
        usageMethodJa: z.string().optional(),
        sideEffects: z.string().optional(),
        sideEffectsJa: z.string().optional(),
        precautions: z.string().optional(),
        precautionsJa: z.string().optional(),
        contraindications: z.string().optional(),
        contraindicationsJa: z.string().optional(),
        setPricing: z.string().optional(), // JSON array of set pricing
        pointsPercent: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const product = await adminCreateProduct({
          ...input,
          rating: "0",
          reviewCount: 0,
        });
        if (!product) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "商品の作成に失敗しました。" });
        }
        // 신규 상품 등록 시 모든 상품 관련 캐시 무효화
        cacheInvalidate('product');
        cacheInvalidate('category');
        return { success: true, product };
      }),

    // Update product
    updateProduct: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        nameJa: z.string().optional(),
        categoryId: z.number().optional(),
        categoryIds: z.array(z.number()).max(3).optional(), // 最大3カテゴリ
        price: z.number().optional(), // 円 (JPY) - integer only
        originalPrice: z.number().optional(), // 円 (JPY) - integer only
        description: z.string().optional(),
        descriptionJa: z.string().optional(),
        imageUrl: z.string().optional(),
        imageUrls: z.string().optional(), // JSON array of image URLs
        isTimeSale: z.boolean().optional(),
        isMonthlySale: z.boolean().optional(),
        // Product details
        activeIngredient: z.string().optional(),
        activeIngredientJa: z.string().optional(),
        volume: z.string().optional(),
        brand: z.string().optional(),
        brandJa: z.string().optional(),
        shippingFrom: z.string().optional(),
        deliveryDays: z.string().optional(),
        usageMethod: z.string().optional(),
        usageMethodJa: z.string().optional(),
        sideEffects: z.string().optional(),
        sideEffectsJa: z.string().optional(),
        precautions: z.string().optional(),
        precautionsJa: z.string().optional(),
        contraindications: z.string().optional(),
        contraindicationsJa: z.string().optional(),
        setPricing: z.string().optional(), // JSON array of set pricing
        pointsPercent: z.number().optional(),
        stock: z.number().optional(),
        trackInventory: z.boolean().optional(),
        searchTags: z.string().optional(),
        productContent: z.string().optional(),
        isActive: z.boolean().optional(),
        isHit: z.boolean().optional(),
        isRecommended: z.boolean().optional(),
        isNew: z.boolean().optional(),
        isPopular: z.boolean().optional(),
        isDiscount: z.boolean().optional(),
        couponExcluded: z.boolean().optional(),
        isVisible: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { id: productId, categoryIds, ...data } = input;
        const updateData: any = { ...data };
        // categoryIds配列をJSON文字列に変換 (空配列も保存)
        if (categoryIds !== undefined) {
          updateData.categoryIds = JSON.stringify(categoryIds);
        }
        // price and originalPrice are already numbers, no need to parse
        // 수정 전 데이터 조회 (audit log용)
        const oldProduct = await getProductById(productId);
        await updateProduct(productId, updateData);
        cacheInvalidate('product');
        // 수정 이력 저장 (비동기, 실패해도 무시)
        try {
          const changedFields = Object.keys(data).filter(k => {
            const oldVal = (oldProduct as any)?.[k];
            const newVal = (data as any)[k];
            return oldVal !== newVal;
          });
          const oldValues: Record<string, any> = {};
          const newValues: Record<string, any> = {};
          for (const field of changedFields) {
            oldValues[field] = (oldProduct as any)?.[field];
            newValues[field] = (data as any)[field];
          }
          const adminName = ctx.user.name || ctx.user.email || String(ctx.user.id);
          await createProductAuditLog({
            productId,
            productName: oldProduct?.name || oldProduct?.nameJa || String(productId),
            adminId: ctx.user.id,
            adminName,
            action: 'update',
            changedFields,
            oldValues,
            newValues,
          });
        } catch (auditErr) {
          console.warn('[Audit] Failed to save product audit log:', auditErr);
        }
        return { success: true, message: "商品が更新されました。" };
      }),

    // Delete product
    deleteProduct: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        await deleteProduct(input.id);
        cacheInvalidate('product');
        return { success: true, message: "商品が削除されました。" };
      }),

    // Get product sales info
    getSalesInfo: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return await getOrCreateProductSalesInfo(input.productId);
      }),

    // Update product sales info
    updateSalesInfo: protectedProcedure
      .input(z.object({
        productId: z.number(),
        cost: z.string().optional().nullable(),
        marginPercent: z.string().optional().nullable(),
        timeSaleStartAt: z.date().optional().nullable(),
        timeSaleEndAt: z.date().optional().nullable(),
        timeSaleDiscountPercent: z.number().optional(),
        monthlySaleDiscountPercent: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { productId, ...data } = input;
        const result = await updateProductSalesInfo(productId, data);
        cacheInvalidate('product');
        return { success: !!result, data: result };
      }),

    // Get sales info
    getProductSalesInfo: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return await getOrCreateProductSalesInfo(input.productId);
      }),

    // Update SEO metadata
    updateSeoMetadata: protectedProcedure
      .input(z.object({
        productId: z.number(),
        metaTitle: z.string().optional().nullable(),
        metaDescription: z.string().optional().nullable(),
        keywords: z.string().optional().nullable(),
        urlSlug: z.string().optional().nullable(),
        ogTitle: z.string().optional().nullable(),
        ogDescription: z.string().optional().nullable(),
        ogImageUrl: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { productId, metaTitle, ogImageUrl, ...rest } = input;
        const dbData = {
          ...rest,
          ogImage: ogImageUrl,
        };
        const result = await updateProductSeoMetadata(productId, dbData);
        cacheInvalidate('product');
        return { success: !!result, data: result };
      }),

    // Get SEO metadata
    getProductSeoMetadata: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return await getOrCreateProductSeoMetadata(input.productId);
      }),

    // Update products.seoTitle / seoDescription / seoImage directly
    updateProductSeoFields: protectedProcedure
      .input(z.object({
        productId: z.number(),
        seoTitle: z.string().optional().nullable(),
        seoDescription: z.string().optional().nullable(),
        seoImage: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { productId, ...fields } = input;
        const updateData: Record<string, string | null> = {};
        if (fields.seoTitle !== undefined) updateData.seoTitle = fields.seoTitle;
        if (fields.seoDescription !== undefined) updateData.seoDescription = fields.seoDescription;
        if (fields.seoImage !== undefined) updateData.seoImage = fields.seoImage;
        if (Object.keys(updateData).length === 0) return { success: true };
        await db.update(products).set(updateData).where(eq(products.id, productId));
        cacheInvalidate('product');
        return { success: true };
      }),

    // Get products.seoTitle / seoDescription / seoImage
    getProductSeoFields: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) return null;
        const rows = await db
          .select({ seoTitle: products.seoTitle, seoDescription: products.seoDescription, seoImage: products.seoImage })
          .from(products)
          .where(eq(products.id, input.productId))
          .limit(1);
        return rows[0] || null;
      }),

    // Update shipping info
    updateShippingInfo: protectedProcedure
      .input(z.object({
        productId: z.number(),
        weight: z.string().optional().nullable(),
        width: z.string().optional().nullable(),
        height: z.string().optional().nullable(),
        depth: z.string().optional().nullable(),
        shippingFee: z.string().optional().nullable(),
        freeShippingThreshold: z.string().optional().nullable(),
        supplierName: z.string().optional().nullable(),
        supplierContact: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { productId, shippingFee, freeShippingThreshold, supplierName, supplierContact, ...rest } = input;
        const dbData = {
          ...rest,
          shippingCost: shippingFee,
        };
        const result = await updateProductShippingInfo(productId, dbData);
        cacheInvalidate('product');
        return { success: !!result, data: result };
      }),

    // Get shipping info
    getProductShippingInfo: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return await getOrCreateProductShippingInfo(input.productId);
      }),

    // Add promotion code
    addPromotionCode: protectedProcedure
      .input(z.object({
        productId: z.number(),
        code: z.string(),
        discountPercent: z.number().min(0).max(100),
        maxUses: z.number().optional(),
        expiresAt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
        const result = await createPromotionCode(input.productId, input.code, input.discountPercent, input.maxUses, expiresAt);
        return { success: !!result, data: result };
      }),

    // Get promotion codes
    getProductPromotionCodes: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return await getProductPromotionCodes(input.productId);
      }),

    // Adjust stock with history
    adjustStock: protectedProcedure
      .input(z.object({
        productId: z.number(),
        newStock: z.number().min(0),
        reason: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { addStockHistory } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [product] = await db.select().from(products).where(eq(products.id, input.productId));
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "商品が見つかりません。" });
        const previousStock = product.stock || 0;
        await db.update(products).set({ stock: input.newStock }).where(eq(products.id, input.productId));
        await addStockHistory(input.productId, previousStock, input.newStock, input.reason, undefined, input.notes);
        cacheInvalidate('product');
        return { success: true, previousStock, newStock: input.newStock };
      }),

    // Get stock history
    getStockHistory: protectedProcedure
      .input(z.object({ productId: z.number(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return await getStockHistory(input.productId, input.limit || 50);
      }),

    // Update related products
    updateRelatedProductsList: protectedProcedure
      .input(z.object({
        productId: z.number(),
        relatedProductIds: z.array(z.object({ id: z.number(), sortOrder: z.number() })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        await updateRelatedProducts(input.productId, input.relatedProductIds);
        return { success: true };
      }),

    // Get manual related products for admin
    getManualRelatedProducts: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return await getManualRelatedProducts(input.productId);
      }),

    // AI suggest related products based on product name/description
    aiSuggestRelatedProducts: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { getProductById, adminGetAllProducts, updateRelatedProducts: updateRP } = await import("./db");
        const { invokeLLM } = await import("./_core/llm");

        const product = await getProductById(input.productId);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "商品が見つかりません。" });

        // Get all products (excluding current)
        const allProducts = await adminGetAllProducts();
        const candidates = allProducts.filter((p: any) => p.id !== input.productId).slice(0, 100);

        const candidateList = candidates.map((p: any) =>
          `ID:${p.id} | ${p.nameJa || ''} | ${p.name || ''} | カテゴリ:${p.categoryId}`
        ).join('\n');

        const prompt = `以下の商品に関連する商品を6つ推薦してください。

基準商品:
- 名前(日本語): ${product.nameJa || ''}
- 名前(英語): ${product.name || ''}
- 説明: ${(product.description || '').substring(0, 200)}
- カテゴリID: ${product.categoryId}

候補商品リスト:
${candidateList}

上記候補商品の中から最も関連度の高い6つのIDのみJSON配列で返してください。
例: [123, 456, 789, 101, 202, 303]`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "あなたは日本の医薬品・健康食品の専門家です。成分・効能・使用目的が類似する関連商品を推薦します。" },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "related_product_ids",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  ids: { type: "array", items: { type: "number" }, description: "関連商品ID配列" }
                },
                required: ["ids"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response?.choices?.[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent || {});
        let suggestedIds: number[] = [];
        try {
          const parsed = JSON.parse(content || '{}');
          suggestedIds = (parsed.ids || []).filter((id: number) =>
            candidates.some((p: any) => p.id === id)
          ).slice(0, 6);
        } catch {
          suggestedIds = [];
        }

        // Save AI suggestions to related_products table
        if (suggestedIds.length > 0) {
          await updateRP(input.productId, suggestedIds.map((id, i) => ({ id, sortOrder: i })));
        }

        return { suggestedIds, count: suggestedIds.length };
      }),

    // Add single related product
    addRelatedProduct: protectedProcedure
      .input(z.object({ productId: z.number(), relatedProductId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const existing = await getManualRelatedProducts(input.productId);
        const alreadyExists = existing.some((p: any) => p.id === input.relatedProductId);
        if (alreadyExists) return { success: true, message: "すでに登録済みの関連商品です。" };
        const newList = [...existing.map((p: any, i: number) => ({ id: p.id, sortOrder: i })), { id: input.relatedProductId, sortOrder: existing.length }];
        await updateRelatedProducts(input.productId, newList);
        return { success: true };
      }),

    // Remove single related product
    removeRelatedProduct: protectedProcedure
      .input(z.object({ productId: z.number(), relatedProductId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const existing = await getManualRelatedProducts(input.productId);
        const newList = existing
          .filter((p: any) => p.id !== input.relatedProductId)
          .map((p: any, i: number) => ({ id: p.id, sortOrder: i }));
        await updateRelatedProducts(input.productId, newList);
        return { success: true };
      }),
    // Get price tiers for a product (まとめ買い)
    getPriceTiers: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        const { getProductPriceTiers } = await import("./db");
        return await getProductPriceTiers(input.productId);
      }),
    // Upsert price tiers (bulk save)
    upsertPriceTiers: protectedProcedure
      .input(z.object({
        productId: z.number(),
        tiers: z.array(z.object({
          id: z.number().optional(),
          quantity: z.number().min(1),
          unitPrice: z.string(),
          totalPrice: z.string(),
          discountPercent: z.number().min(0).max(100),
          stock: z.number().min(0).default(0),
          isPopular: z.boolean(),
          isActive: z.boolean(),
          sortOrder: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { upsertPriceTiers } = await import("./db");
        const result = await upsertPriceTiers(input.productId, input.tiers);
        return { success: result.length > 0 || input.tiers.length === 0, data: result };
      }),
    // Delete a single price tier
    deletePriceTier: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deletePriceTier } = await import("./db");
        const success = await deletePriceTier(input.id);
        return { success };
      }),
    // Update user role
    updateUserRole: protectedProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "データベースに接続できません。" });
        }
        await db.update(registeredUsers).set({ role: input.role }).where(eq(registeredUsers.id, input.userId));
        return { success: true };
      }),

    uploadEventImage: protectedProcedure
      .input(z.object({
        file: z.instanceof(Buffer),
        fileName: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        try {
          const { storagePut } = await import("./storage");
          const fileKey = `events/${Date.now()}-${input.fileName}`;
          const result = await storagePut(fileKey, input.file, input.contentType);
          return { success: true, url: result.url, key: result.key };
        } catch (error: any) {
          console.error("Image upload error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Image upload failed: ${error.message}`,
          });
        }
      }),
    uploadProductImages: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          images: z.array(
            z.object({
              file: z.instanceof(Buffer),
              fileName: z.string(),
              contentType: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        try {
          const { storagePut } = await import("./storage");
          const { updateProductImages } = await import("./db");
          const uploadedUrls: string[] = [];

          for (const image of input.images) {
            const fileKey = `products/${input.productId}/${Date.now()}-${image.fileName}`;
            const result = await storagePut(fileKey, image.file, image.contentType);
            uploadedUrls.push(result.url);
          }

          await updateProductImages(input.productId, uploadedUrls);
          cacheInvalidate('product');
          return { success: true, urls: uploadedUrls };
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Image upload failed: ${error.message}`,
          });
        }
      }),
    getProductImages: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        try {
          const { getProductImages } = await import("./db");
          return await getProductImages(input.productId);
        } catch (error: any) {
          console.error("Failed to get product images:", error);
          return [];
        }
      }),
    getRelatedProducts: publicProcedure
      .input(z.object({ productId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        try {
          const { getRelatedProducts } = await import("./db");
          return await getRelatedProducts(input.productId, input.limit || 4);
        } catch (error: any) {
          console.error("Failed to get related products:", error);
          return [];
        }
      }),
    // Product image upload (base64)
    uploadProductImage: protectedProcedure
      .input(z.object({
        productId: z.number(),
        fileName: z.string().min(1),
        fileData: z.string(), // base64 encoded
        contentType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        try {
          const buffer = Buffer.from(input.fileData, 'base64');
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const baseKey = `products/${input.productId}/${Date.now()}-${randomSuffix}`;

          // Image optimization pipeline
          let optimizedData: any = null;
          try {
            const { optimizeImage, getWebPFileKey } = await import("./imageOptimizer");
            optimizedData = await optimizeImage(buffer);

            // Upload all variants to S3 in parallel
            const [originalResult, mediumResult, thumbResult] = await Promise.all([
              storagePut(`${baseKey}.webp`, optimizedData.original.buffer, "image/webp"),
              storagePut(`${baseKey}-md.webp`, optimizedData.medium.buffer, "image/webp"),
              storagePut(`${baseKey}-thumb.webp`, optimizedData.thumbnail.buffer, "image/webp"),
            ]);

            // DBに画像レコード挿入 (最適化データ含む)
            const existingImages = await getProductImageOrder(input.productId);
            const maxSortOrder = existingImages.length > 0
              ? Math.max(...existingImages.map((img: any) => img.sortOrder))
              : -1;
            const isFirstImage = existingImages.length === 0;

            const { productImageOrder } = await import("../drizzle/schema");
            const { getDb } = await import("./db");
            const dbInstance = await getDb();
            if (dbInstance) {
              await dbInstance.insert(productImageOrder).values({
                productId: input.productId,
                imageUrl: originalResult.url,
                imageUrlMedium: mediumResult.url,
                imageUrlThumb: thumbResult.url,
                blurDataUrl: optimizedData.blurDataUrl,
                sortOrder: maxSortOrder + 1,
                isThumbnail: isFirstImage,
                width: optimizedData.metadata.originalWidth,
                height: optimizedData.metadata.originalHeight,
                fileSize: optimizedData.metadata.originalSize,
                optimized: true,
              });
            }

            return {
              url: originalResult.url,
              key: originalResult.key,
              urlMedium: mediumResult.url,
              urlThumb: thumbResult.url,
              blurDataUrl: optimizedData.blurDataUrl,
              optimized: true,
              success: true,
            };
          } catch (optimizeError) {
            // Fallback: upload original without optimization
            console.warn("Image optimization failed, uploading original:", optimizeError);
            const fileKey = `${baseKey}-${input.fileName}`;
            const { url, key } = await storagePut(fileKey, buffer, input.contentType);

            const existingImages = await getProductImageOrder(input.productId);
            const maxSortOrder = existingImages.length > 0
              ? Math.max(...existingImages.map((img: any) => img.sortOrder))
              : -1;
            const isFirstImage = existingImages.length === 0;

            const { productImageOrder } = await import("../drizzle/schema");
            const { getDb } = await import("./db");
            const dbInstance = await getDb();
            if (dbInstance) {
              await dbInstance.insert(productImageOrder).values({
                productId: input.productId,
                imageUrl: url,
                sortOrder: maxSortOrder + 1,
                isThumbnail: isFirstImage,
                optimized: false,
              });
            }

            return { url, key, optimized: false, success: true };
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Upload failed',
          });
        }
      }),
    // Get product image order
    getProductImageOrder: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        try {
          return await getProductImageOrder(input.productId);
        } catch (error: any) {
          console.error("Failed to get product image order:", error);
          return [];
        }
      }),
    // Update product image order
    updateProductImageOrder: protectedProcedure
      .input(z.object({
        productId: z.number(),
        images: z.array(z.object({
          imageUrl: z.string(),
          sortOrder: z.number(),
          isThumbnail: z.boolean(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        try {
          const { updateImageOrder } = await import("./db");
          const result = await updateImageOrder(input.productId, input.images);

          // 代表画像(isThumbnail=true)がある場合、products.imageUrlおよびseoImage自動同期
          const thumbnailImage = input.images.find(img => img.isThumbnail);
          if (thumbnailImage) {
            const db = await getDb();
            if (db) {
              // 1. products.imageUrl更新
              await db.update(products)
                .set({ imageUrl: thumbnailImage.imageUrl })
                .where(eq(products.id, input.productId));

              // 2. seoImageが空の場合、新しい代表画像に自動設定
              const currentRows = await db
                .select({ seoImage: products.seoImage })
                .from(products)
                .where(eq(products.id, input.productId))
                .limit(1);
              const currentSeoImage = currentRows[0]?.seoImage || "";
              if (!currentSeoImage || currentSeoImage.trim() === "") {
                await db.update(products)
                  .set({ seoImage: thumbnailImage.imageUrl })
                  .where(eq(products.id, input.productId));
              }
            }
          }

          cacheInvalidate('product');
          return { success: true, data: result };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to update image order: ${error.message}`,
          });
        }
      }),
    // Delete product image
    deleteProductImage: protectedProcedure
      .input(z.object({
        productId: z.number(),
        imageUrl: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        try {
          const { deleteProductImage } = await import("./db");
          await deleteProductImage(input.productId, input.imageUrl);
          cacheInvalidate('product');
          return { success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to delete image: ${error.message}`,
          });
        }
      }),

    // Optimize existing images (batch)
    optimizeExistingImages: protectedProcedure
      .input(z.object({
        productId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        try {
          const { productImageOrder } = await import("../drizzle/schema");
          const db = await getDb();
          if (!db) throw new Error('Database not available');

          // Find unoptimized images
          let query = db.select().from(productImageOrder)
            .where(
              or(
                eq(productImageOrder.optimized, false),
                isNull(productImageOrder.optimized)
              )
            );
          
          if (input.productId) {
            query = db.select().from(productImageOrder)
              .where(
                and(
                  eq(productImageOrder.productId, input.productId),
                  or(
                    eq(productImageOrder.optimized, false),
                    isNull(productImageOrder.optimized)
                  )
                )
              );
          }

          const unoptimizedImages = await query;
          if (unoptimizedImages.length === 0) {
            return { success: true, optimized: 0, total: 0, message: 'No images to optimize' };
          }

          const { optimizeImage } = await import("./imageOptimizer");
          let optimizedCount = 0;
          const errors: string[] = [];

          for (const img of unoptimizedImages) {
            try {
              // Fetch original image
              const response = await fetch(img.imageUrl);
              if (!response.ok) {
                errors.push(`Failed to fetch image ${img.id}: ${response.status}`);
                continue;
              }
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);

              // Optimize
              const optimizedData = await optimizeImage(buffer);
              const randomSuffix = Math.random().toString(36).substring(2, 8);
              const baseKey = `products/${img.productId}/opt-${Date.now()}-${randomSuffix}`;

              // Upload variants
              const [originalResult, mediumResult, thumbResult] = await Promise.all([
                storagePut(`${baseKey}.webp`, optimizedData.original.buffer, "image/webp"),
                storagePut(`${baseKey}-md.webp`, optimizedData.medium.buffer, "image/webp"),
                storagePut(`${baseKey}-thumb.webp`, optimizedData.thumbnail.buffer, "image/webp"),
              ]);

              // Update DB record
              await db.update(productImageOrder)
                .set({
                  imageUrl: originalResult.url,
                  imageUrlMedium: mediumResult.url,
                  imageUrlThumb: thumbResult.url,
                  blurDataUrl: optimizedData.blurDataUrl,
                  width: optimizedData.metadata.originalWidth,
                  height: optimizedData.metadata.originalHeight,
                  fileSize: optimizedData.metadata.originalSize,
                  optimized: true,
                })
                .where(eq(productImageOrder.id, img.id));

              optimizedCount++;
            } catch (imgError: any) {
              errors.push(`Image ${img.id}: ${imgError.message}`);
            }
          }

          return {
            success: true,
            optimized: optimizedCount,
            total: unoptimizedImages.length,
            errors: errors.length > 0 ? errors : undefined,
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Optimization failed',
          });
        }
      }),

    // Send retry payment email
    sendRetryPaymentEmail: protectedProcedure
      .input(z.object({ checkoutSessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }

        const { getCheckoutSessionById } = await import('./db');
        const { createRetryPaymentLink } = await import('./stripe');
        const { sendRetryPaymentEmail } = await import('./_core/emailService');

        // Get checkout session
        const checkoutSession = await getCheckoutSessionById(input.checkoutSessionId);
        if (!checkoutSession) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '決済セッションが見つかりません。' });
        }

        if (checkoutSession.status !== 'failed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '失敗した決済のみ再試行メールを送信できます。' });
        }

        // Create retry payment link
        const origin = process.env.VITE_APP_URL || 'https://3000-i9vfm549vzsxm7lk7zain-9771d71b.sg1.manus.computer';
        const { url } = await createRetryPaymentLink({
          checkoutSession,
          origin,
        });

        // Send email
        const result = await sendRetryPaymentEmail({
          to: checkoutSession.userEmail,
          customerName: checkoutSession.shippingName,
          orderAmount: `${Number(checkoutSession.totalAmount).toLocaleString()}円`,
          retryPaymentUrl: url,
          failureReason: checkoutSession.failureReason || undefined,
        });

        if (!result.success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || 'メール送信に失敗しました。' });
        }

        return { success: true, message: '再決済メールを送信しました。' };
      }),
    // AI検索タグ自動生成
    generateSearchTags: protectedProcedure
      .input(z.object({
        name: z.string(),
        nameJa: z.string().optional(),
        description: z.string().optional(),
        descriptionJa: z.string().optional(),
        currentTags: z.string().optional(),
        count: z.number().default(10),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const { invokeLLM } = await import('./_core/llm');
        const cleanHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        const prompt = `あなたは日本の医薬品・健康食品ショッピングモールの商品検索最適化の専門家です。
以下の商品情報を元に、検索タグを生成してください。

商品名(韓国語): ${input.name}
商品名(日本語): ${input.nameJa || ''}
商品説明: ${input.description ? cleanHtml(input.description) : ''}
説明(日本語): ${input.descriptionJa ? cleanHtml(input.descriptionJa) : ''}
既存タグ: ${input.currentTags || 'なし'}

要件:
- 必ず日本語のみのタグを生成する（韓国語タグは不要）
- 各タグは#で始まるハッシュタグ形式（例: #ED治療、#バイアグラ、#男性健康）
- 症状、成分、効能、ブランド、カテゴリなど多角的な観点から生成
- ユーザーが実際に検索することが多いキーワードを优先
- 既存タグと重複しない新しいタグを含める
- 内容が少ない場合は無理に数を増やさなくてよい（内容に合った適切な数で可）
- 必ずJSON配列形式のみで応答: ["#タグ1", "#タグ2", ...]`;
        const result = await invokeLLM({
          messages: [
            { role: 'system', content: 'あなたは日本の医薬品ショッピングモールSEOの専門家です。日本語タグのみJSON配列形式で返答してください。' },
            { role: 'user', content: prompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'search_tags',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '生成された検索タグ配列',
                  },
                },
                required: ['tags'],
                additionalProperties: false,
              },
            },
          },
        });
        const rawContent = result.choices?.[0]?.message?.content;
        if (!rawContent) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI応答がありません。' });
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        let tags: string[] = [];
        try {
          const parsed = JSON.parse(content);
          tags = Array.isArray(parsed) ? parsed : (parsed.tags || []);
        } catch {
          tags = content.split(/[\n,]/).map((t: string) => t.trim()).filter((t: string) => t.startsWith('#'));
        }
        return { success: true, tags: tags.slice(0, input.count) };
      }),

    generateProductContent: protectedProcedure
      .input(z.object({
        name: z.string(),
        nameJa: z.string().optional(),
        description: z.string().optional(),
        descriptionJa: z.string().optional(),
        ingredients: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const { invokeLLM } = await import('./_core/llm');
        const cleanHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        const prompt = `あなたは日本の医薬品・健康食品ショッピングモールの商品説明文記者です。
以下の商品情報を元に、詳細な商品説明をHTML形式で作成してください。

商品名(韓国語): ${input.name}
商品名(日本語): ${input.nameJa || ''}
簡単な説明: ${input.description ? cleanHtml(input.description) : ''}
説明(日本語): ${input.descriptionJa ? cleanHtml(input.descriptionJa) : ''}
成分・特徴: ${input.ingredients || ''}

要件:
- 必ず日本語のみで作成する
- HTMLタグのみ使用（h2, h3, p, ul, li, strong, emのみ許可）
- 構成: 商品概要 → このような方におすすめ → 主な効果・特徴 → 成分・規格(判明している場合)
- 商品の実際の効果（避妊、ED治療、育毛等）を具体的に記載する
- 内容が少ない場合は無理に増やさなくてよい
- JSONで封じず、純粋なHTML文字列のみで返答する`;
        const result = await invokeLLM({
          messages: [
            { role: 'system', content: 'あなたは日本の医薬品ECサイトの商品説明ライターです。HTML形式の商品説明文のみ返答してください。マークダウンやJSONは不要です。' },
            { role: 'user', content: prompt },
          ],
        });
        const rawContent = result.choices?.[0]?.message?.content;
        if (!rawContent) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI応答がありません。' });
        const contentStr = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        // コードブロック除去 (```html ... ``` など)
        const cleanedContent = contentStr.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '').trim();
        return { success: true, html: cleanedContent };
      }),
    // Bulk update product isActive / isSoldOut
    bulkUpdateProductStatus: protectedProcedure
      .input(z.object({
        ids: z.array(z.number()).min(1),
        isActive: z.boolean().optional(),
        isSoldOut: z.boolean().optional(),
        isHit: z.boolean().optional(),
        isRecommended: z.boolean().optional(),
        isNew: z.boolean().optional(),
        isDiscount: z.boolean().optional(),
        isPopular: z.boolean().optional(),
        isVisible: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const updateData: Record<string, unknown> = {};
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.isSoldOut !== undefined) updateData.stock = input.isSoldOut ? 0 : 9999;
        if (input.isHit !== undefined) updateData.isHit = input.isHit;
        if (input.isRecommended !== undefined) updateData.isRecommended = input.isRecommended;
        if (input.isNew !== undefined) updateData.isNew = input.isNew;
        if (input.isDiscount !== undefined) updateData.isDiscount = input.isDiscount;
        if (input.isPopular !== undefined) updateData.isPopular = input.isPopular;
        if (input.isVisible !== undefined) updateData.isVisible = input.isVisible;
        if (Object.keys(updateData).length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '変更する値がありません。' });
        }
        await Promise.all(input.ids.map(id => updateProduct(id, updateData as any)));
        return { success: true, count: input.ids.length };
      }),
    // 전체 상품 순위 조회 (순위 관리 페이지용)
    getAllProductRankings: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        categoryId: z.number().nullable().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });

        const conditions: any[] = [];
        if (input.search && input.search.trim() !== '') {
          const searchTerm = `%${input.search.trim()}%`;
          conditions.push(or(
            sql`${products.nameJa} LIKE ${searchTerm}`,
            sql`${products.name} LIKE ${searchTerm}`
          ));
        }
        if (input.categoryId != null) {
          conditions.push(eq(products.categoryId, input.categoryId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        // Select all columns so mergeProductThumbnails receives a full Product object
        const productList = whereClause
          ? await db.select().from(products).where(whereClause).orderBy(asc(products.sortOrder))
          : await db.select().from(products).orderBy(asc(products.sortOrder));

        // 썸네일 추가 후 필요한 필드만 반환
        const withImages = await mergeProductThumbnails(productList);
        return withImages.map(p => ({
          id: p.id,
          name: p.name,
          nameJa: p.nameJa,
          sortOrder: p.sortOrder,
          categoryId: p.categoryId,
          isActive: p.isVisible,
          price: p.price,
          thumbnailUrl: (p as any).thumbnailUrl ?? null,
        }));
      }),

    // 商品順序一括保存 (ドラッグ＆ドロップ結果)
    updateProductSortOrders: protectedProcedure
      .input(z.object({
        orders: z.array(z.object({ id: z.number(), sortOrder: z.number() })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        await Promise.all(
          input.orders.map(({ id, sortOrder }) =>
            db.update(products).set({ sortOrder }).where(eq(products.id, id))
          )
        );
        // Invalidate all product list caches so changes are reflected immediately
        const cacheKeys = [
          'product:popular',
          'product:newArrivals',
          'product:timeSale',
          'product:monthlySale',
          'product:hitProducts:10',
          'product:hitProducts:6',
          'product:recommended:12',
          'product:recommended:9',
          'product:recommended:6',
          'product:weeklyBest:6',
          'product:weeklyBest:10',
          'product:todayBest:10',
          'product:todayBest:6',
        ];
        cacheKeys.forEach(key => cacheInvalidate(key));
        // Also invalidate category product caches (pattern: category:*:products:*)
        // Get unique categoryIds from the updated products and clear their caches
        const updatedIds = input.orders.map(o => o.id);
        if (updatedIds.length > 0) {
          const productRows = await db.select({ categoryId: products.categoryId }).from(products)
            .where(inArray(products.id, updatedIds));
          const categoryIds = Array.from(new Set(productRows.map(r => r.categoryId).filter(Boolean)));
          const sortOptions = ['newest', 'oldest', 'price_asc', 'price_desc', 'rating', 'popular'];
          const pageSizes = [30, 50, 100, 200];
          for (const catId of categoryIds) {
            for (const sort of sortOptions) {
              for (const size of pageSizes) {
                cacheInvalidate(`category:${catId}:products:${sort}:${size}:0`);
              }
            }
          }
        }
        return { success: true };
      }),
    // Inquiry managementtt
    inquiries: router({
      // Get all inquiries with user info
      getAll: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const { getAllInquiries, getInquiryComments } = await import('./db');
        const inquiries = await getAllInquiries();
        
        // Get comment counts for each inquiry
        const inquiriesWithComments = await Promise.all(
          inquiries.map(async (inquiry) => {
            const comments = await getInquiryComments(inquiry.id);
            return {
              ...inquiry,
              commentCount: comments.length,
            };
          })
        );
        
        return inquiriesWithComments;
      }),

      // Get inquiry detail with comments
      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
          }
          const { getInquiryById, getInquiryComments } = await import('./db');
          const inquiry = await getInquiryById(input.id);
          if (!inquiry) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'お問い合わせが見つかりません。' });
          }
          const comments = await getInquiryComments(input.id);
          // Fetch userEmail for display
          let userEmail: string | null = null;
          if (inquiry.userId) {
            try {
              const db = await getDb();
              if (db) {
                const userRow = await db.select({ email: users.email }).from(users).where(eq(users.id, inquiry.userId)).limit(1);
                userEmail = userRow[0]?.email ?? null;
              }
            } catch {}
          }
          return { inquiry: { ...inquiry, userEmail }, comments };
        }),

      // Reply to inquiry (create comment)
      reply: protectedProcedure
        .input(z.object({
          inquiryId: z.number(),
          content: z.string().min(1),
          imageUrl: z.string().optional(),
          imageUrls: z.array(z.string()).optional(), // multiple images
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
          }
          const { createInquiryComment, updateInquiry } = await import('./db');
          
          // Create comment
          const comment = await createInquiryComment({
            inquiryId: input.inquiryId,
            userId: ctx.user.id,
            content: input.content,
            imageUrl: input.imageUrl || (input.imageUrls && input.imageUrls.length > 0 ? input.imageUrls[0] : undefined),
            image_urls: input.imageUrls && input.imageUrls.length > 0 ? JSON.stringify(input.imageUrls) : undefined,
            isActive: true,
          });
          
          // Update inquiry status to 'answered'
          await updateInquiry(input.inquiryId, { status: 'answered' });
          
          // Send email notification to customer
          try {
            const inquiry = await getInquiryById(input.inquiryId);
            if (inquiry && inquiry.userId) {
              const userForEmail = await getUserByOpenId(`email_${inquiry.userId}`) || await getUserByOpenId(inquiry.userId.toString());
              const userEmail = userForEmail?.email;
              if (userEmail) {
                const { sendInquiryReplyNotification } = await import('./_core/emailService');
                const origin = ctx.req.headers.origin || 'https://kusurimall-uqkfprxu.manus.space';
                const inquiryUrl = `${origin}/mypage/inquiries/${input.inquiryId}`;
                await sendInquiryReplyNotification(
                  userEmail,
                  { id: inquiry.id, title: inquiry.title, replyContent: input.content, inquiryUrl }
                );
                console.log(`[Inquiry] Reply notification sent to ${userEmail}`);
              }
            }
          } catch (emailError) {
            console.error('[Inquiry] Failed to send reply notification email:', emailError);
          }
          // アプリ内通知送信
          try {
            const { insertNotification } = await import('./db');
            const inquiryForNotif = await getInquiryById(input.inquiryId);
            if (inquiryForNotif?.userId) {
              await insertNotification({
                userId: inquiryForNotif.userId,
                type: 'inquiry',
                title: 'お問い合わせに回答が届きました',
                message: `「${inquiryForNotif.title}」への回答が届きました。`,
                link: `/mypage/inquiries/${input.inquiryId}`,
                templateName: 'inquiry_replied',
                templateVars: { title: inquiryForNotif.title },
              });
            }
          } catch (notifErr) {
            console.error('[Notification] Inquiry reply notification failed:', notifErr);
          }
          
          return { success: true, comment };
        }),

      // Update reply comment
      updateComment: protectedProcedure
        .input(z.object({
          commentId: z.number(),
          content: z.string().min(1),
          imageUrl: z.string().nullable().optional(),
          imageUrls: z.array(z.string()).nullable().optional(), // multiple images
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
          }
          const effectiveImageUrl = input.imageUrl !== undefined
            ? input.imageUrl
            : (input.imageUrls && input.imageUrls.length > 0 ? input.imageUrls[0] : undefined);
          const imageUrlsJson = input.imageUrls !== undefined
            ? (input.imageUrls && input.imageUrls.length > 0 ? JSON.stringify(input.imageUrls) : null)
            : undefined;
          await updateInquiryCommentFull(input.commentId, input.content, effectiveImageUrl, imageUrlsJson);
          return { success: true };
        }),

      // Delete reply comment
      deleteComment: protectedProcedure
        .input(z.object({ commentId: z.number(), inquiryId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
          }
          await deleteInquiryComment(input.commentId);
          // Check if any comments remain; if not, revert status to pending
          const remaining = await getInquiryComments(input.inquiryId);
          if (remaining.length === 0) {
            await updateInquiry(input.inquiryId, { status: 'pending' });
          }
          return { success: true };
        }),

      // Update inquiry status
      updateStatus: protectedProcedure
        .input(z.object({
          id: z.number(),
          status: z.enum(['pending', 'answered']),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
          }
          const { updateInquiry } = await import('./db');
          await updateInquiry(input.id, { status: input.status });
          return { success: true };
        }),
      // Upload reply image
      uploadReplyImage: protectedProcedure
        .input(z.object({
          fileName: z.string().min(1),
          fileData: z.string(), // base64 encoded
          contentType: z.string().default('image/jpeg'),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
          }
          try {
            const buffer = Buffer.from(input.fileData, 'base64');
            const { url, key } = await storagePut(
              `inquiry-replies/${Date.now()}-${input.fileName}`,
              buffer,
              input.contentType
            );
            return { url, key, success: true };
          } catch (error) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: error instanceof Error ? error.message : 'Upload failed',
            });
          }
        }),
    }),

    // AI自動回答設定管理
    aiSettings: router({
      // AI設定取得
      get: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const { getAISettings } = await import('./inquiry-ai');
        return await getAISettings();
      }),

      // AI設定保存
      save: protectedProcedure
        .input(z.object({
          enabled: z.boolean(),
          confidenceThreshold: z.number().min(0).max(1),
          systemPrompt: z.string().min(1),
          cannotAnswerMessage: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
          }
          await upsertSiteSetting('AI_INQUIRY_ENABLED', input.enabled ? 'true' : 'false');
          await upsertSiteSetting('AI_INQUIRY_CONFIDENCE_THRESHOLD', input.confidenceThreshold.toString());
          await upsertSiteSetting('AI_INQUIRY_SYSTEM_PROMPT', input.systemPrompt);
          await upsertSiteSetting('AI_INQUIRY_CANNOT_ANSWER_MESSAGE', input.cannotAnswerMessage);
          return { success: true };
        }),

      // AIレビュー必要コメント一覧取得
      getPendingReviews: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const db = await getDb();
        if (!db) return [];
        const { inquiryComments: ic, inquiries: inq } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const rows = await db.select({
          commentId: ic.id,
          inquiryId: ic.inquiryId,
          content: ic.content,
          createdAt: ic.createdAt,
          inquiryTitle: inq.titleJa,
          inquiryStatus: inq.status,
        })
          .from(ic)
          .leftJoin(inq, eq(ic.inquiryId, inq.id))
          .where(and(eq(ic.isAiGenerated, true), eq(ic.needsReview, true)))
          .orderBy(ic.createdAt);
        return rows;
      }),

      // レビュー完了処理 (needsReview = false)
      markReviewed: protectedProcedure
        .input(z.object({ commentId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
          }
          const db = await getDb();
          if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
          const { inquiryComments: ic } = await import('../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          await db.update(ic).set({ needsReview: false }).where(eq(ic.id, input.commentId));
          return { success: true };
        }),

      // AI自動回答統計取得
      getStats: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const db = await getDb();
        if (!db) return { totalInquiries: 0, aiAnswered: 0, pendingReview: 0, reviewed: 0, faqSaved: 0 };
        const { inquiryComments: ic, inquiries: inq, chatbotFaqs } = await import('../drizzle/schema');
        const { eq, and, count } = await import('drizzle-orm');
        const [totalInquiries] = await db.select({ cnt: count() }).from(inq);
        const [aiAnswered] = await db.select({ cnt: count() }).from(ic).where(eq(ic.isAiGenerated, true));
        const [pendingReview] = await db.select({ cnt: count() }).from(ic).where(and(eq(ic.isAiGenerated, true), eq(ic.needsReview, true)));
        const [reviewed] = await db.select({ cnt: count() }).from(ic).where(and(eq(ic.isAiGenerated, true), eq(ic.needsReview, false)));
        const [faqSaved] = await db.select({ cnt: count() }).from(chatbotFaqs);
        return {
          totalInquiries: totalInquiries?.cnt ?? 0,
          aiAnswered: aiAnswered?.cnt ?? 0,
          pendingReview: pendingReview?.cnt ?? 0,
          reviewed: reviewed?.cnt ?? 0,
          faqSaved: faqSaved?.cnt ?? 0,
        };
      }),
      // AI回答テスト
      test: protectedProcedure
        .input(z.object({ question: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
          }
          const { generateAIInquiryReply } = await import('./inquiry-ai');
          const result = await generateAIInquiryReply(input.question, '');
          return result;
        }),
      // 管理者回答をFAQとして保存
      saveAsFAQ: protectedProcedure
        .input(z.object({
          questionJa: z.string().min(1),
          answerJa: z.string().min(1),
          category: z.enum(['product', 'order_shipping', 'payment', 'member_points', 'other']).default('other'),
          keywords: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
          }
          const id = await createChatbotFaq({
            questionJa: input.questionJa,
            answerJa: input.answerJa,
            category: input.category,
            keywords: input.keywords,
            isActive: 1,
            sortOrder: 0,
          });
          return { success: true, id };
        }),
    }),

    // Resend email system management
    resend: router({
      // Get all domains from Resend
      getDomains: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }

        const { getResendDomains } = await import('./_core/emailService');
        const result = await getResendDomains();

        // If API key is restricted (401 error), return empty array with restriction flag
        if (!result.success) {
          const isRestricted = result.error?.includes('restricted') || result.error?.includes('only send emails');
          if (isRestricted) {
            return { domains: [], restricted: true };
          }
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || 'ドメイン取得に失敗しました。' });
        }

        return { domains: result.domains || [], restricted: false };
      }),

      // Send test email
      sendTestEmail: protectedProcedure
        .input(z.object({
          to: z.string().email(),
          from: z.string().email(),
          fromName: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
          }

          const { sendTestEmail } = await import('./_core/emailService');
          const result = await sendTestEmail({
            to: input.to,
            from: input.from,
            fromName: input.fromName,
          });

          if (!result.success) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || 'テストメール送信に失敗しました。' });
          }

          return { success: true, message: 'テストメールを送信しました。' };
        }),
    }),
    // 商品別部分キャンセル
    cancelItems: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        itemIds: z.array(z.number()).min(1),
        cancelReason: z.string().optional(),
        refundAmount: z.number().optional(), // 返金金額 (円単位)
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const { cancelOrderItems } = await import('./db');
        const result = await cancelOrderItems(
          input.orderId,
          input.itemIds,
          input.cancelReason,
          input.refundAmount
        );
        if (!result.success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'キャンセル処理中にエラーが発生しました。' });
        }
        // Send refund email to customer
        try {
          const orderInfo = await adminGetOrderById(input.orderId);
          if (orderInfo?.userId && input.refundAmount && input.refundAmount > 0) {
            const userInfo = await getRegisteredUserById(orderInfo.userId);
            if (userInfo?.email) {
              const { sendRefundEmail } = await import('./_core/emailService');
              sendRefundEmail({
                to: userInfo.email,
                userName: userInfo.nameKanji || userInfo.nameHiragana || userInfo.email,
                orderId: input.orderId,
                refundAmount: input.refundAmount,
                cancelledItems: [],
                isPartial: result.newStatus !== 'cancelled',
              }).catch(err => console.error('[Email] Refund email failed:', err));
            }
          }
        } catch (emailErr) {
          console.error('[Email] Failed to send refund email:', emailErr);
        }
        // 返金処理完了アプリ内通知
        try {
          const { insertNotification } = await import('./db');
          await insertNotification({
            userId: ctx.user.id,
            type: 'order',
            title: '返金処理が完了しました',
            message: '返金処理が完了しました。ご利用の決済方法によって、返金反映まで数日かかる場合があります。',
            link: '/mypage/orders',
            templateName: 'order_refunded',
          });
        } catch (notifErr) {
          console.error('[Notification] Refund notification failed:', notifErr);
        }
        return { success: true, newStatus: result.newStatus, refundId: result.refundId };
      }),
    // キャンセル済み商品復元
    restoreItem: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        itemId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です。' });
        }
        const { restoreOrderItem } = await import('./db');
        const result = await restoreOrderItem(input.orderId, input.itemId);
        if (!result.success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '復元処理中にエラーが発生しました。' });
        }
        return { success: true, newStatus: result.newStatus };
      }),

    // Payment Settings Management
    paymentSettings: router({
      // Get all payment settings
      getAll: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { getAllPaymentSettings } = await import("./db");
        return await getAllPaymentSettings();
      }),

      // Get payment setting by provider
      getByProvider: protectedProcedure
        .input(z.object({ provider: z.string() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
          }
          const { getPaymentSettingByProvider } = await import("./db");
          return await getPaymentSettingByProvider(input.provider);
        }),

      // Update/create payment setting
      upsert: protectedProcedure
        .input(z.object({
          provider: z.string(),
          isActive: z.boolean(),
          displayName: z.string().optional(),
          publicKey: z.string().optional(),
          secretKey: z.string().optional(),
          webhookSecret: z.string().optional(),
          mode: z.enum(["test", "live"]),
          sortOrder: z.number().optional(),
          extraConfig: z.any().optional(),
          supportedCurrencies: z.array(z.string()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
          }
          const { upsertPaymentSetting } = await import("./db");
          await upsertPaymentSetting({
            provider: input.provider as any,
            isActive: input.isActive ? 1 : 0,
            displayName: input.displayName,
            publicKey: input.publicKey,
            secretKey: input.secretKey,
            webhookSecret: input.webhookSecret,
            mode: input.mode,
            sortOrder: input.sortOrder ?? 0,
            extraConfig: input.extraConfig,
            supportedCurrencies: input.supportedCurrencies,
          });
          return { success: true };
        }),

      // Toggle payment provider
      toggle: protectedProcedure
        .input(z.object({
          provider: z.string(),
          isActive: z.boolean(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
          }
          const { togglePaymentProvider } = await import("./db");
          await togglePaymentProvider(input.provider, input.isActive);
          return { success: true };
        }),
    }),
  }),
  announcements: router({
    getAll: publicProcedure.query(async () => {
      return withCache('announcements:all', TTL_10MIN, () => getAllAnnouncements());
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const result = await getAnnouncementById(input.id);
        return result ?? null;
      }),
    incrementViewCount: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        }
        try {
          const { announcements } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const current = await db.select().from(announcements).where(eq(announcements.id, input.id)).limit(1);
          if (current.length > 0) {
            await db.update(announcements).set({ viewCount: (current[0].viewCount || 0) + 1 }).where(eq(announcements.id, input.id));
          }
        } catch (error) {
          console.error("Failed to increment view count:", error);
        }
        return { success: true };
      }),
    adminGetAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
      }
      return await adminGetAllAnnouncements();
    }),
    adminCreate: protectedProcedure
      .input(z.object({
        titleJa: z.string().min(1),
        contentJa: z.string().min(1),
        isActive: z.boolean().default(true),
        isPinned: z.boolean().default(false),
        isExpanded: z.boolean().default(false),
        category: z.enum(["notice", "important", "sale", "maintenance", "event"]).default("notice"),
        expiresAt: z.string().optional(),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        return await createAnnouncement({
          title: input.titleJa,
          titleJa: input.titleJa,
          content: input.contentJa,
          contentJa: input.contentJa,
          isActive: input.isActive,
          isPinned: input.isPinned,
          isExpanded: input.isExpanded,
          category: input.category,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          sortOrder: input.sortOrder,
        });
      }),
    adminUpdate: protectedProcedure
      .input(z.object({
        id: z.number(),
        titleJa: z.string().min(1).optional(),
        contentJa: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
        isPinned: z.boolean().optional(),
        isExpanded: z.boolean().optional(),
        category: z.enum(["notice", "important", "sale", "maintenance", "event"]).optional(),
        expiresAt: z.string().nullable().optional(),
        sortOrder: z.number().optional(),
        createdAt: z.string().optional(), // 관리자가 작성일 직접 수정 가능
        viewCount: z.number().optional(), // 관리자가 조회수 직접 수정 가능
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const updateData: any = {};
        if (input.titleJa) {
          updateData.title = input.titleJa;
          updateData.titleJa = input.titleJa;
        }
        if (input.contentJa) {
          updateData.content = input.contentJa;
          updateData.contentJa = input.contentJa;
        }
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.isPinned !== undefined) updateData.isPinned = input.isPinned;
        if (input.isExpanded !== undefined) updateData.isExpanded = input.isExpanded;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.expiresAt !== undefined) updateData.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
        if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
        if (input.createdAt !== undefined) updateData.createdAt = new Date(input.createdAt);
        if (input.viewCount !== undefined) updateData.viewCount = input.viewCount;
        await updateAnnouncement(input.id, updateData);
        return { success: true };
      }),
    getComments: publicProcedure
      .input(z.object({ announcementId: z.number() }))
      .query(async ({ input }) => {
        return await getAnnouncementComments(input.announcementId);
      }),
    addComment: protectedProcedure
      .input(z.object({
        announcementId: z.number(),
        content: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const comment = await createAnnouncementComment({
          announcementId: input.announcementId,
          userId: ctx.user.id,
          content: input.content,
          isActive: true,
        });
        return comment;
      }),
    deleteComment: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        await deleteAnnouncementComment(input.commentId);
        return { success: true };
      }),
    updateComment: protectedProcedure
      .input(z.object({
        commentId: z.number(),
        content: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        await updateAnnouncementComment(input.commentId, input.content);
        return { success: true };
      }),
    adminDelete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        await deleteAnnouncement(input.id);
        return { success: true };
      }),
    adminTogglePin: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const { toggleAnnouncementPin } = await import("../server/db");
        await toggleAnnouncementPin(input.id);
        return { success: true };
      }),
  }),
  inquiries: router({
    getAll: publicProcedure.query(async () => {
      return await getAllInquiries();
    }),
    // Get current user's inquiries with comments
    getMyList: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const all = await getAllInquiries();
      const mine = all.filter(inq => inq.userId === ctx.user!.id);
      const withComments = await Promise.all(
        mine.map(async (inq) => {
          const comments = await getInquiryComments(inq.id);
          return { ...inq, comments };
        })
      );
      return withComments;
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const inquiry = await getInquiryById(input.id);
        if (!inquiry) return undefined;
        if (inquiry.isPrivate && ctx.user?.id !== inquiry.userId && ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "This is a private inquiry." });
        }
        return inquiry;
      }),
    incrementViewCount: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await incrementInquiryViewCount(input.id);
        return { success: true };
      }),
    getComments: publicProcedure
      .input(z.object({ inquiryId: z.number() }))
      .query(async ({ input }) => {
        return await getInquiryComments(input.inquiryId);
      }),
    addComment: protectedProcedure
      .input(z.object({
        inquiryId: z.number(),
        content: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const comment = await createInquiryComment({
          inquiryId: input.inquiryId,
          userId: ctx.user.id,
          content: input.content,
          isActive: true,
        });
        return comment;
      }),
    deleteComment: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        await deleteInquiryComment(input.commentId);
        return { success: true };
      }),
    updateComment: protectedProcedure
      .input(z.object({
        commentId: z.number(),
        content: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        await updateInquiryComment(input.commentId, input.content);
        return { success: true };
      }),
    adminGetAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "管理者のみアクセス可能です。" });
      }
      return await getAllInquiries();
    }),
    // Upload inquiry image (base64 → S3)
    uploadImage: protectedProcedure
      .input(z.object({
        file: z.string(), // base64 data URL
        fileName: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        try {
          const { storagePut } = await import("./storage");
          const base64Data = input.file.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const ext = input.fileName.split(".").pop() || "jpg";
          const fileKey = `inquiries/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const result = await storagePut(fileKey, buffer, input.contentType);
          return { success: true, url: result.url };
        } catch (error: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `画像のアップロードに失敗しました: ${error.message}` });
        }
      }),
    // Customer creates inquiry (with admin email notification)
    create: protectedProcedure
      .input(z.object({
        titleJa: z.string().min(1),
        contentJa: z.string().min(1),
        isPrivate: z.boolean().default(false),
        imageUrls: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        
        // Create inquiry
        const newInquiry = await createInquiry({
          title: input.titleJa,
          titleJa: input.titleJa,
          content: input.contentJa,
          contentJa: input.contentJa,
          isActive: true,
          sortOrder: 0,
          isPrivate: input.isPrivate,
          userId: ctx.user.id,
          imageUrls: input.imageUrls && input.imageUrls.length > 0 ? JSON.stringify(input.imageUrls) : undefined,
        });
        
        // Send email notification to admin
        try {
          const { sendNewInquiryNotification } = await import("./_core/emailService");
          const { getSiteSetting } = await import("./db");
          
          // Get email settings from DB
          const fromAddressSetting = await getSiteSetting("EMAIL_FROM_ADDRESS");
          const fromNameSetting = await getSiteSetting("EMAIL_FROM_NAME");
          const fromAddress = fromAddressSetting?.value || undefined;
          const fromName = fromNameSetting?.value || undefined;
          
          // Get admin email (owner email)
          const adminEmail = process.env.OWNER_NAME?.includes("@") 
            ? process.env.OWNER_NAME 
            : "kim2025.platform@gmail.com"; // fallback
          
          if (newInquiry) {
            await sendNewInquiryNotification(
              adminEmail,
              {
                id: newInquiry.id,
              title: input.titleJa,
              content: input.contentJa,
              userName: ctx.user.name || "匿名",
              userEmail: ctx.user.email || "",
            },
              fromAddress || undefined,
              fromName || undefined
            );
          }
        } catch (emailError) {
          console.error("[Inquiry] Failed to send admin notification email:", emailError);
          // Don't throw error - inquiry was created successfully
        }
        
        // Send receipt confirmation email to customer
        try {
          if (newInquiry && ctx.user.email) {
            const { sendInquiryReceiptConfirmation, getSiteSetting: _getSS } = await import("./_core/emailService").then(async (m) => ({
              sendInquiryReceiptConfirmation: m.sendInquiryReceiptConfirmation,
              getSiteSetting: null,
            }));
            const { getSiteSetting } = await import("./db");
            const fromAddressSetting = await getSiteSetting("EMAIL_FROM_ADDRESS");
            const fromNameSetting = await getSiteSetting("EMAIL_FROM_NAME");
            const origin = ctx.req.headers.origin || 'https://kusurimall-uqkfprxu.manus.space';
            await sendInquiryReceiptConfirmation(
              ctx.user.email,
              {
                id: newInquiry.id,
                title: input.titleJa,
                content: input.contentJa,
                inquiryUrl: `${origin}/mypage/inquiries`,
              },
              fromAddressSetting?.value || undefined,
              fromNameSetting?.value || undefined
            );
            console.log(`[Inquiry] Receipt confirmation sent to ${ctx.user.email}`);
          }
        } catch (receiptError) {
          console.error("[Inquiry] Failed to send receipt confirmation email:", receiptError);
          // Don't throw error - inquiry was created successfully
        }
        
        // AI自動回答処理 (非同期 - 応答待機なし)
        if (newInquiry) {
          const inquiryId = newInquiry.id;
          const inquiryUserId = ctx.user.id;
          const titleJa = input.titleJa;
          const contentJa = input.contentJa;
          
          // AI自動回答即時実行 (応答ブロッキングなしバックグラウンド処理)
          (async () => {
            try {
              const { processInquiryWithAI } = await import("./inquiry-ai");
              const { users: usersTable } = await import("../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              const db = await import("./db").then((m: any) => m.getDb());
              
              // 管理者ユーザーID取得 (role=adminの最初のユーザー)
              let adminUserId = 1; // fallback
              if (db) {
                const adminUsers = await db.select({ id: usersTable.id })
                  .from(usersTable)
                  .where(eq(usersTable.role, 'admin'))
                  .limit(1);
                if (adminUsers.length > 0) adminUserId = adminUsers[0].id;
              }
              
              console.log(`[Inquiry] Starting AI auto-reply for inquiry #${inquiryId}`);
              await processInquiryWithAI(
                inquiryId,
                titleJa,
                contentJa,
                inquiryUserId,
                adminUserId
              );
            } catch (aiErr) {
              console.error("[Inquiry] AI auto-reply failed:", aiErr);
            }
          })();
        }
        
        return newInquiry;
      }),
    
    adminCreate: protectedProcedure
      .input(z.object({
        titleJa: z.string().min(1),
        contentJa: z.string().min(1),
        isActive: z.boolean().default(true),
        sortOrder: z.number().default(0),
        isPrivate: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者のみアクセス可能です。" });
        }
        return await createInquiry({
          title: input.titleJa,
          titleJa: input.titleJa,
          content: input.contentJa,
          contentJa: input.contentJa,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
          isPrivate: input.isPrivate,
          userId: ctx.user.id,
        });
      }),
    adminUpdate: protectedProcedure
      .input(z.object({
        id: z.number(),
        titleJa: z.string().min(1).optional(),
        contentJa: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
        isPrivate: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者のみアクセス可能です。" });
        }
        const updateData: any = {};
        if (input.titleJa) updateData.titleJa = input.titleJa;
        if (input.contentJa) updateData.contentJa = input.contentJa;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
        if (input.isPrivate !== undefined) updateData.isPrivate = input.isPrivate;
        await updateInquiry(input.id, updateData);
        return { success: true };
      }),
    adminDelete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者のみアクセス可能です。" });
        }
        await deleteInquiry(input.id);
        return { success: true };
      }),
    adminAddReply: protectedProcedure
      .input(z.object({
        inquiryId: z.number(),
        content: z.string().min(1).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者のみアクセス可能です。" });
        }
        const comment = await createInquiryComment({
          inquiryId: input.inquiryId,
          userId: ctx.user.id,
          content: input.content,
          isActive: true,
        });
        await updateInquiry(input.inquiryId, { status: "answered" });
        
        // Send email notification to customer
        try {
          const { sendInquiryReplyNotification } = await import("./_core/emailService");
          const { getSiteSetting } = await import("./db");
          
          // Get email settings from DB
          const fromAddressSetting = await getSiteSetting("EMAIL_FROM_ADDRESS");
          const fromNameSetting = await getSiteSetting("EMAIL_FROM_NAME");
          const fromAddress = fromAddressSetting?.value || undefined;
          const fromName = fromNameSetting?.value || undefined;
          
          // Get inquiry details
          const inquiry = await getInquiryById(input.inquiryId);
          if (inquiry && inquiry.userId) {
            // Get customer email
            const { getRegisteredUserById } = await import("./db");
            const customer = await getRegisteredUserById(inquiry.userId);
            
            if (customer && customer.email) {
              const inquiryUrl = `${process.env.VITE_OAUTH_PORTAL_URL?.replace('/portal', '')}/bbs/inquiry/${inquiry.id}`;
              
              await sendInquiryReplyNotification(
                customer.email,
                {
                  id: inquiry.id,
                  title: inquiry.titleJa || inquiry.title,
                  replyContent: input.content,
                  inquiryUrl,
                },
                fromAddress || undefined,
                fromName || undefined
              );
            }
          }
        } catch (emailError) {
          console.error("[Inquiry] Failed to send customer notification email:", emailError);
          // Don't throw error - reply was created successfully
        }
        // Q&A回答アプリ内通知
        try {
          const inquiryForNotif = await getInquiryById(input.inquiryId);
          if (inquiryForNotif?.userId) {
            const { insertNotification } = await import('./db');
            await insertNotification({
              userId: inquiryForNotif.userId,
              type: 'inquiry',
              title: 'お問い合わせへの回答が届きました',
              message: `「${inquiryForNotif.titleJa || inquiryForNotif.title}」へのご回答が届きました。マイページよりご確認ください。`,
              link: `/mypage/inquiries`,
              templateName: 'qa_replied',
              templateVars: { title: inquiryForNotif.titleJa || inquiryForNotif.title },
            });
          }
        } catch (notifErr) {
          console.error('[Notification] Q&A reply notification failed:', notifErr);
        }
        
        return comment;
      }),
    userUpdate: protectedProcedure
      .input(z.object({
        id: z.number(),
        titleJa: z.string().min(1),
        contentJa: z.string().min(1),
        isPrivate: z.boolean().optional(),
        imageUrls: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const inquiry = await getInquiryById(input.id);
        if (!inquiry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "お問い合わせが見つかりません。" });
        }
        if (inquiry.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "編集権限がありません。" });
        }
        if (inquiry.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "回答済みのお問い合わせは編集できません。" });
        }
        const imageUrlsJson = input.imageUrls && input.imageUrls.length > 0
          ? JSON.stringify(input.imageUrls)
          : null;
        await updateInquiry(input.id, {
          titleJa: input.titleJa,
          title: input.titleJa,
          contentJa: input.contentJa,
          content: input.contentJa,
          isPrivate: input.isPrivate,
          imageUrls: imageUrlsJson ?? undefined,
        });
        return { success: true };
      }),

    userDelete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const inquiry = await getInquiryById(input.id);
        if (!inquiry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "お問い合わせが見つかりません。" });
        }
        if (inquiry.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "削除権限がありません。" });
        }
        await deleteInquiry(input.id);
        return { success: true };
      }),
    // ユーザーがAI回答後に追加管理者回答を要求するプロシージャ
    requestHumanReply: protectedProcedure
      .input(z.object({ inquiryId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ログインが必要です。" });
        }
        const inquiry = await getInquiryById(input.inquiryId);
        if (!inquiry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "お問い合わせが見つかりません。" });
        }
        if (inquiry.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "権限がありません。" });
        }
        // 追加対応要求コメント登録 (ユーザー名義)
        await createInquiryComment({
          inquiryId: input.inquiryId,
          userId: ctx.user.id,
          content: "【追加対応のご依頼】\nAIの回答に加え、担当者による追加対応をご依頼いたします。\nご確認のほど、よろしくお願いいたします。",
          isActive: true,
          isAiGenerated: false,
          needsReview: false,
        });
        // お問い合わせステータスをpendingに戻して管理者が確認するよう
        await updateInquiry(input.inquiryId, { status: "pending" });
        // 管理者へアプリ内通知送信
        try {
          const { notifyOwner } = await import('./_core/notification');
          await notifyOwner({
            title: "追加対応リクエスト",
            content: `お問い合わせ #${input.inquiryId}「${inquiry.titleJa}」に対して、${ctx.user.name || 'ユーザー'}様から追加対応のご依頼がありました。`,
          });
        } catch (e) {
          console.error('[Inquiry] Failed to notify owner:', e);
        }
        // ユーザーへメール通知送信 (追加対応要求受付確認)
        try {
          const db = await getDb();
          if (db) {
            const [userRow] = await db.select({ email: users.email, name: users.name })
              .from(users).where(eq(users.id, ctx.user.id)).limit(1);
            if (userRow?.email) {
              const { sendInquiryReplyNotification } = await import('./_core/emailService');
              await sendInquiryReplyNotification(
                userRow.email,
                {
                  id: input.inquiryId,
                  title: inquiry.titleJa || inquiry.title || `お問い合わせ #${input.inquiryId}`,
                  replyContent: `担当者への追加対応依頼を受け付けました。\n担当者が確認次第、1～3営業日以内にご回答いたします。\nしばらくお待ちください。`,
                  inquiryUrl: `${(ctx.req.headers.origin as string) || ''}/mypage/inquiries`,
                },
              );
            }
          }
        } catch (e) {
          console.error('[Inquiry] Failed to send email notification:', e);
        }
        return { success: true };
      }),
    // AI回答満足度フィードバック
    submitFeedback: protectedProcedure
      .input(z.object({
        commentId: z.number(),
        rating: z.enum(['helpful', 'not_helpful']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { inquiryComments } = await import('../drizzle/schema');
        const [comment] = await db.select({ id: inquiryComments.id, inquiryId: inquiryComments.inquiryId })
          .from(inquiryComments).where(eq(inquiryComments.id, input.commentId)).limit(1);
        if (!comment) throw new TRPCError({ code: 'NOT_FOUND' });
        const inquiry = await getInquiryById(comment.inquiryId);
        if (!inquiry || inquiry.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        // not_helpfulフィードバック時 needsReview=true自動設定
        if (input.rating === 'not_helpful') {
          await db.update(inquiryComments)
            .set({ feedbackRating: input.rating, needsReview: true })
            .where(eq(inquiryComments.id, input.commentId));
          console.log(`[AI Feedback] Comment ${input.commentId} marked as needsReview=true due to not_helpful feedback`);
        } else {
          await db.update(inquiryComments)
            .set({ feedbackRating: input.rating })
            .where(eq(inquiryComments.id, input.commentId));
        }
        return { success: true };
      }),
    // Get count of user's pending (unanswered) inquiries (for sidebar badge)
    getMyPendingCount: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { count: 0 };
      const { inquiries: inquiriesTable } = await import('../drizzle/schema');
      const pending = await db.select({ id: inquiriesTable.id }).from(inquiriesTable).where(
        and(
          eq(inquiriesTable.userId, ctx.user.id),
          sql`${inquiriesTable.status} = 'pending'`,
        )
      );
      return { count: pending.length };
    }),
  }),
  events: router({
    getAll: publicProcedure.query(async () => {
      return withCache('events:all', TTL_10MIN, () => getAllEvents());
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getEventById(input.id);
      }),
    incrementViewCount: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await incrementEventViewCount(input.id);
        return { success: true };
      }),
    adminGetAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return await adminGetAllEvents();
    }),
    adminCreate: protectedProcedure
      .input(z.object({
        titleJa: z.string().min(1),
        descriptionJa: z.string().min(1),
        imageUrl: z.string().url(),
        startDate: z.date(),
        endDate: z.date(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const newEvent = await createEvent({
          title: input.titleJa,
          titleJa: input.titleJa,
          description: input.descriptionJa,
          descriptionJa: input.descriptionJa,
          imageUrl: input.imageUrl,
          startDate: input.startDate,
          endDate: input.endDate,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
        });
        // Send event start email to all active users (if event starts today or is already active)
        if (input.isActive) {
          try {
            const db = await getDb();
            if (db) {
              const { sendEventStartEmail } = await import('./_core/emailService');
              const allUsers = await db.select({ id: registeredUsers.id, email: registeredUsers.email, nameKanji: registeredUsers.nameKanji, nameHiragana: registeredUsers.nameHiragana })
                .from(registeredUsers)
                .limit(500);
              for (const user of allUsers) {
                if (user.email) {
                  sendEventStartEmail({
                    to: user.email,
                    userName: user.nameKanji || user.nameHiragana || user.email,
                    eventTitle: input.titleJa,
                    eventDescription: input.descriptionJa,
                    eventImageUrl: input.imageUrl,
                    startDate: input.startDate,
                    endDate: input.endDate,
                  }).catch(err => console.error('[Email] Event start email failed:', err));
                }
              }
            }
          } catch (emailErr) {
            console.error('[Email] Failed to send event start emails:', emailErr);
          }
        }
        return newEvent;
      }),
    adminUpdate: protectedProcedure
      .input(z.object({
        id: z.number(),
        titleJa: z.string().min(1).optional(),
        descriptionJa: z.string().min(1).optional(),
        imageUrl: z.string().url().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const updateData: any = {};
        if (input.titleJa) {
          updateData.title = input.titleJa;
          updateData.titleJa = input.titleJa;
        }
        if (input.descriptionJa) {
          updateData.description = input.descriptionJa;
          updateData.descriptionJa = input.descriptionJa;
        }
        if (input.imageUrl) updateData.imageUrl = input.imageUrl;
        if (input.startDate) updateData.startDate = input.startDate;
        if (input.endDate) updateData.endDate = input.endDate;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
        await updateEvent(input.id, updateData);
        return { success: true };
      }),
    adminDelete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await deleteEvent(input.id);
        return { success: true };
      }),
  }),
  storage: router({
    uploadImage: protectedProcedure
      .input(z.object({
        fileName: z.string().min(1),
        fileData: z.string(), // base64 encoded
        contentType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        
        try {
          // base64をBufferに変換
          const buffer = Buffer.from(input.fileData, 'base64');
          
          // S3にアップロード
          const { url, key } = await storagePut(
            `events/${Date.now()}-${input.fileName}`,
            buffer,
            input.contentType
          );
          
          return { url, key, success: true };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Upload failed',
          });
        }
      }),
  }),

  wishlist: router({
    add: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await addToWishlist(ctx.user.id, input.productId);
        return { success: !!result };
      }),

    remove: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await removeFromWishlist(ctx.user.id, input.productId);
        return { success: result };
      }),

    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        return await getUserWishlist(ctx.user.id);
      }),

    isInWishlist: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await isInWishlist(ctx.user.id, input.productId);
      }),
  }),

  user: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const base = ctx.user;
      if (base?.loginMethod === 'email' && base.email) {
        const regUser = await getRegisteredUserByEmail(base.email);
        if (regUser) {
          return {
            ...base,
            lastNameKanji: regUser.lastNameKanji ?? '',
            firstNameKanji: regUser.firstNameKanji ?? '',
            lastNameKatakana: regUser.lastNameKatakana ?? '',
            firstNameKatakana: regUser.firstNameKatakana ?? '',
            gender: regUser.gender ?? 'no_answer',
            phone: regUser.phone ?? '',
          };
        }
      }
      return {
        ...base,
        lastNameKanji: '',
        firstNameKanji: '',
        lastNameKatakana: '',
        firstNameKatakana: '',
        gender: 'no_answer' as const,
        phone: base?.phone ?? '',
      };
    }),
    deleteAccount: protectedProcedure
      .input(z.object({
        confirmText: z.literal('退会する'),
      }))
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        // メール会員: registered_users削除
        if (ctx.user.loginMethod === 'email' && ctx.user.email) {
          await db.delete(registeredUsers).where(eq(registeredUsers.email, ctx.user.email));
        }
        // usersテーブルから削除
        await db.delete(users).where(eq(users.openId, ctx.user.openId));
        // セッションCookie削除
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return { success: true };
      }),
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.loginMethod !== 'email') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'SNSログインユーザーはパスワードを変更できません' });
        }
        const email = ctx.user.email;
        if (!email) throw new TRPCError({ code: 'BAD_REQUEST', message: 'メールアドレスが見つかりません' });
        const regUser = await getRegisteredUserByEmail(email);
        if (!regUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'ユーザーが見つかりません' });
        const bcrypt = await import('bcryptjs');
        const isValid = await bcrypt.compare(input.currentPassword, regUser.password);
        if (!isValid) throw new TRPCError({ code: 'UNAUTHORIZED', message: '現在のパスワードが正しくありません' });
        const hashedPassword = await bcrypt.hash(input.newPassword, 10);
        await updateRegisteredUserPassword(email, hashedPassword);
        // Send password changed email
        try {
          const { sendPasswordChangedEmail } = await import('./_core/emailService');
          sendPasswordChangedEmail({ to: email, userName: ctx.user.name || email })
            .catch(err => console.error('[Email] Password changed email failed:', err));
        } catch (e) {
          console.error('[Email] Failed to send password changed email:', e);
        }
        return { success: true };
      }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        nameKanji: z.string().optional(),
        nameHiragana: z.string().optional(),
        lastNameKanji: z.string().optional(),
        firstNameKanji: z.string().optional(),
        lastNameKatakana: z.string().optional(),
        firstNameKatakana: z.string().optional(),
        gender: z.enum(['male', 'female', 'no_answer']).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 登録会員の場合registeredUsersテーブルも更新
        if (ctx.user.loginMethod === "email") {
          const { email } = ctx.user;
          if (email) {
            await updateRegisteredUserProfile(email, {
              lastNameKanji: input.lastNameKanji,
              firstNameKanji: input.firstNameKanji,
              lastNameKatakana: input.lastNameKatakana,
              firstNameKatakana: input.firstNameKatakana,
              gender: input.gender,
              phone: input.phone,
            });
          }
        }
        const updatedUser = await updateUserProfile(ctx.user.openId, input);
        // Send profile updated email
        if (ctx.user.email) {
          try {
            const { sendProfileUpdatedEmail } = await import('./_core/emailService');
            const updatedFieldNames: string[] = [];
            if (input.nameKanji || input.lastNameKanji || input.firstNameKanji) updatedFieldNames.push('氏名');
            if (input.nameHiragana || input.lastNameKatakana || input.firstNameKatakana) updatedFieldNames.push('フリガナ');
            if (input.phone) updatedFieldNames.push('電話番号');
            if (input.address) updatedFieldNames.push('住所');
            if (updatedFieldNames.length > 0) {
              sendProfileUpdatedEmail({
                to: ctx.user.email,
                userName: ctx.user.name || ctx.user.email,
                updatedFields: updatedFieldNames,
              }).catch(err => console.error('[Email] Profile updated email failed:', err));
            }
          } catch (emailErr) {
            console.error('[Email] Failed to send profile updated email:', emailErr);
          }
        }
        return { success: !!updatedUser, user: updatedUser };
      }),
  }),
  japanPost: router({
    getTracking: publicProcedure
      .input(z.object({ trackingNumber: z.string() }))
      .query(async ({ input }) => {
        // Return null if tracking number is empty or whitespace
        if (!input.trackingNumber || input.trackingNumber.trim() === '') {
          return null;
        }
        
        if (!isValidJapanPostTrackingNumber(input.trackingNumber)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid Japan Post tracking number format',
          });
        }

        try {
          const tracking = await fetchJapanPostTracking(input.trackingNumber);
          return tracking;
        } catch (error) {
          console.error('[Japan Post] Tracking fetch error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch tracking information',
          });
        }
      }),
    syncShipment: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input }) => {
        const { syncShipmentStatus } = await import('./_core/shipmentStatusSync');
        try {
          const result = await syncShipmentStatus(input.orderId);
          return result;
        } catch (error) {
          console.error('[Japan Post] Sync shipment error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to sync shipment status',
          });
        }
      }),
  }),

  // AI Chatbot router (Enhanced with FAQ matching, conversation tracking, blocked keywords)
  chatbot: router({
    // Enhanced chat with FAQ priority matching, conversation tracking, blocked keyword filtering
    chat: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(['system', 'user', 'assistant']),
          content: z.string(),
        })),
        context: z.object({
          currentPage: z.string().optional(),
          productId: z.number().optional(),
          categorySlug: z.string().optional(),
        }).optional(),
        sessionId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if chatbot is enabled
        const enabledSetting = await getChatbotSetting('CHATBOT_ENABLED');
        if (enabledSetting === 'false') {
          return { response: 'チャットボットは現在メンテナンス中です。お問い合わせは /bbs/inquiry/create からお願いいたします。', sessionId: input.sessionId };
        }

        const lastUserMessage = input.messages.filter(m => m.role === 'user').pop()?.content || '';

        // 1. Check blocked keywords
        const blockedKeyword = await checkBlockedKeywords(lastUserMessage);
        if (blockedKeyword) {
          return { response: '申し訳ございませんが、その内容にはお答えできません。他にご質問がございましたらお気軽にどうぞ。', sessionId: input.sessionId, blocked: true };
        }

        // 2. Manage conversation session
        let conversationId: number | null = null;
        const sessionId = input.sessionId || `anon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        try {
          const existingConv = await getChatbotConversationBySession(sessionId);
          if (existingConv) {
            conversationId = existingConv.id;
          } else {
            conversationId = await createChatbotConversation({
              userId: ctx.user?.id ?? null,
              sessionId,
              pageContext: input.context?.currentPage,
              productId: input.context?.productId,
            });
          }
        } catch (e) {
          console.warn('[Chatbot] Failed to manage conversation:', e);
        }

        // Save user message
        if (conversationId) {
          try {
            await createChatbotMessage({
              conversationId,
              role: 'user',
              content: lastUserMessage,
            });
          } catch (e) {
            console.warn('[Chatbot] Failed to save user message:', e);
          }
        }

        // 3. Try FAQ matching first (cost saving)
        const faqMatch = await matchFaq(lastUserMessage);
        if (faqMatch && faqMatch.score >= 0.6) {
          const faq = faqMatch.faq;
          const faqAnswer = faq.answerJa || faq.answerKo || '';
          
          // Increment FAQ match count
          await incrementFaqMatchCount(faq.id);
          
          // Save assistant message as FAQ match
          if (conversationId) {
            try {
              await createChatbotMessage({
                conversationId,
                role: 'assistant',
                content: faqAnswer,
                isFaqMatch: 1,
                faqId: faq.id,
              });
            } catch (e) {
              console.warn('[Chatbot] Failed to save FAQ response:', e);
            }
          }
          
          return { response: faqAnswer, sessionId, faqMatched: true };
        }

        // 4. Fall back to LLM
        const { invokeLLM } = await import('./_core/llm');
        
        // Get custom system prompt from settings
        const customPrompt = await getChatbotSetting('SYSTEM_PROMPT');
        const maxTokensSetting = await getChatbotSetting('MAX_TOKENS');
        
        let contextInfo = '';
        if (input.context?.productId) {
          try {
            const product = await getProductById(input.context.productId);
            if (product) {
              contextInfo = `\n\n現在のお客様が閲覧中の商品情報:\n- 商品名: ${product.nameJa}\n- 価格: ${product.price}円\n- カテゴリ: ${product.categoryId}\n- 説明: ${product.descriptionJa || product.description || ''}\n- 有効成分: ${product.activeIngredientJa || product.activeIngredient || ''}\n- 使用方法: ${product.usageMethodJa || product.usageMethod || ''}\n- 副作用: ${product.sideEffectsJa || product.sideEffects || ''}\n- 注意事項: ${product.precautionsJa || product.precautions || ''}`;
            }
          } catch (e) {
            console.warn('[Chatbot] Failed to load product context:', e);
          }
        }

        let popularProducts: any[] = [];
        try { popularProducts = await getPopularProducts(); } catch (e) { console.warn('[Chatbot] Failed to load popular products:', e); }

        let allCategories: any[] = [];
        try { allCategories = await getAllCategories(); } catch (e) { console.warn('[Chatbot] Failed to load categories:', e); }

        const categoriesList = allCategories.map(c => `- ${c.nameJa} (/category/${c.slug})`).join('\n');
        const popularList = popularProducts.map(p => `- ${p.nameJa} (${p.price}円) - /product/${p.id}`).join('\n');

        const defaultPrompt = `あなたはココくすり（ココくすり）のAIカスタマーサポートアシスタントです。
日本の医薬品・健康商品の個人輸入代行サイトのお客様をサポートします。

【あなたの役割】
- 商品に関する質問への回答（成分、使用方法、副作用、注意事項など）
- 注文・配送に関するお問い合わせ対応
- 商品の推薦・提案
- サイトの使い方案内
- 一般的な健康相談（ただし、医療アドバイスは提供しない）

【重要なルール】
- 常に日本語で丁寧に回答してください
- 医療診断や処方は行わないでください。必ず「医師にご相談ください」と案内してください
- 商品を推薦する際は、お客様のニーズに合った商品を提案してください
- 回答は簡潔で分かりやすくしてください（200文字以内を目安）
- 商品リンクを提案する際は [商品名](/product/ID) の形式で提供してください`;

        const systemPrompt = `${customPrompt || defaultPrompt}

【利用可能なカテゴリ】
${categoriesList}

【人気商品】
${popularList}

【サイト情報】
- 全品送料無料
- 24時間メール受付
- 配送日数: 通常10-14日
- お問い合わせ: /bbs/inquiry/create
- お知らせ: /bbs/notice
- イベント: /bbs/event${contextInfo}`;

        const llmMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...input.messages.filter(m => m.role !== 'system'),
        ];

        try {
          const result = await invokeLLM({ messages: llmMessages });
          const assistantContent = result.choices?.[0]?.message?.content;
          const responseText = typeof assistantContent === 'string' 
            ? assistantContent 
            : Array.isArray(assistantContent) 
              ? assistantContent.map((c: any) => 'text' in c ? c.text : '').join('')
              : 'すみません、応答を生成できませんでした。';
          
          // Save assistant message
          if (conversationId) {
            try {
              await createChatbotMessage({
                conversationId,
                role: 'assistant',
                content: responseText,
              });
            } catch (e) {
              console.warn('[Chatbot] Failed to save assistant message:', e);
            }
          }
          
          return { response: responseText, sessionId };
        } catch (error) {
          console.error('[Chatbot] LLM invocation error:', error);
          return { response: 'ただいまシステムが混み合っております。しばらくしてからもう一度お試しください。', sessionId };
        }
      }),

    // Get suggested questions based on context (enhanced with FAQ)
    getSuggestions: publicProcedure
      .input(z.object({
        page: z.string().optional(),
        productId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        // Try to get FAQ-based suggestions first
        const faqs = await getAllChatbotFaqs(true);
        if (faqs.length > 0) {
          // Return top FAQ questions as suggestions
          const faqSuggestions = faqs
            .slice(0, 3)
            .map(f => f.questionJa || f.questionKo || '')
            .filter(Boolean);
          if (faqSuggestions.length >= 2) return faqSuggestions;
        }

        const baseSuggestions = [
          '送料はいくらですか？',
          '人気商品を教えてください',
          '注文の配送状況を確認したい',
        ];

        if (input.productId) {
          try {
            const product = await getProductById(input.productId);
            if (product) {
              return [
                `${product.nameJa}の使い方を教えてください`,
                `${product.nameJa}の副作用はありますか？`,
                '似た商品を教えてください',
              ];
            }
          } catch (e) { /* fallback */ }
        }

        if (input.page === 'cart') {
          return ['クーポンの使い方を教えてください', '送料はいくらですか？', '支払い方法について教えてください'];
        }
        if (input.page === 'mypage') {
          return ['注文の配送状況を確認したい', 'ポイントの使い方を教えてください', '返品・交換について教えてください'];
        }

        return baseSuggestions;
      }),

    // Get active FAQs for frontend quick access
    getActiveFaqs: publicProcedure.query(async () => {
      return await getAllChatbotFaqs(true);
    }),

    // Get chatbot settings for frontend
    getSettings: publicProcedure.query(async () => {
      const settings = await getAllChatbotSettings();
      const result: Record<string, string> = {};
      for (const s of settings) {
        result[s.key] = s.value;
      }
      return result;
    }),

    // Search products for chatbot (returns product cards with image, price, stock)
    searchProducts: publicProcedure
      .input(z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(10).optional().default(5),
      }))
      .query(async ({ input }) => {
        const allProducts = await searchProducts(input.query);
        const limitedProducts = allProducts.slice(0, input.limit);
        
        return limitedProducts.map(p => ({
          id: p.id,
          name: p.nameJa || p.name,
          price: p.price,
          imageUrl: p.imageUrl,
          stock: p.stock,
          isInStock: p.stock > 0,
        }));
      }),
  }),

  // Admin Chatbot Management
  adminChatbot: router({
    // Dashboard statistics
    getStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return await getChatbotStats();
    }),

    // Conversation list
    getConversations: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
        status: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return await getAllChatbotConversations(input);
      }),

    // Conversation messages
    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return await getChatbotMessages(input.conversationId);
      }),

    // End conversation
    endConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await updateChatbotConversation(input.conversationId, { status: 'ended', endedAt: new Date() });
        return { success: true };
      }),

    // FAQ CRUD
    getFaqs: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return await getAllChatbotFaqs();
    }),

    getFaqById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return await getChatbotFaqById(input.id);
      }),

    createFaq: protectedProcedure
      .input(z.object({
        questionJa: z.string().optional(),
        questionKo: z.string().optional(),
        answerJa: z.string().optional(),
        answerKo: z.string().optional(),
        category: z.enum(['product', 'order_shipping', 'payment', 'member_points', 'other']),
        keywords: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const id = await createChatbotFaq(input);
        return { id };
      }),

    updateFaq: protectedProcedure
      .input(z.object({
        id: z.number(),
        questionJa: z.string().optional().nullable(),
        questionKo: z.string().optional().nullable(),
        answerJa: z.string().optional().nullable(),
        answerKo: z.string().optional().nullable(),
        category: z.enum(['product', 'order_shipping', 'payment', 'member_points', 'other']).optional(),
        keywords: z.string().optional().nullable(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { id, ...data } = input;
        await updateChatbotFaq(id, data);
        return { success: true };
      }),

    deleteFaq: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await deleteChatbotFaq(input.id);
        return { success: true };
      }),

    // Settings
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return await getAllChatbotSettings();
    }),

    updateSetting: protectedProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await upsertChatbotSetting(input.key, input.value, input.description);
        return { success: true };
      }),

    // Blocked Keywords
    getBlockedKeywords: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return await getAllBlockedKeywords();
    }),

    addBlockedKeyword: protectedProcedure
      .input(z.object({
        keyword: z.string().min(1),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const id = await createBlockedKeyword(input.keyword, input.reason);
        if (id === null) throw new TRPCError({ code: 'CONFLICT', message: 'このキーワードは既に登録されています' });
        return { id };
      }),

    removeBlockedKeyword: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await deleteBlockedKeyword(input.id);
        return { success: true };
      }),
  }),

  // AI Recommendation router
  recommendation: router({
    getForUser: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(30).optional() }))
      .query(async ({ ctx, input }) => {
        return await getPersonalizedRecommendations(ctx.user.id, input.limit || 6);
      }),

    getForProduct: publicProcedure
      .input(z.object({
        productId: z.number(),
        categoryId: z.number(),
        limit: z.number().min(1).max(20).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user?.id || null;
        return await getSmartRelatedProducts(userId, input.productId, input.categoryId, input.limit || 6);
      }),

    getPopular: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(20).optional() }))
      .query(async ({ input }) => {
        const all = await getPopularProducts();
        return all.slice(0, input.limit || 6);
      }),

    // AI-powered "customers also bought" recommendations
    getAlsoBought: publicProcedure
      .input(z.object({ productId: z.number(), limit: z.number().min(1).max(10).optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        try {
          // Find products frequently bought together
          const alsoBought = await db
            .select({
              productId: orderItems.productId,
              count: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`,
            })
            .from(orderItems)
            .where(
              sql`${orderItems.orderId} IN (
                SELECT ${orderItems.orderId} FROM ${orderItems} WHERE ${orderItems.productId} = ${input.productId}
              ) AND ${orderItems.productId} != ${input.productId}`
            )
            .groupBy(orderItems.productId)
            .orderBy(desc(sql`COUNT(DISTINCT ${orderItems.orderId})`))
            .limit(input.limit || 6);

          if (alsoBought.length === 0) return [];

          const productIds = alsoBought.map(a => a.productId);
          const result = await db
            .select()
            .from(products)
            .where(sql`${products.id} IN (${sql.raw(productIds.join(','))})`);
          return result;
        } catch (error) {
          console.error('[Recommendation] Also bought error:', error);
          return [];
        }
      }),
  }),

  // Coupon system router
  coupon: router({
    // Validate and apply coupon code
    validate: publicProcedure
      .input(z.object({
        code: z.string().min(1),
        orderAmount: z.number().min(0),
        userId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });

        const [coupon] = await db.select().from(coupons).where(eq(coupons.code, input.code.toUpperCase())).limit(1);
        if (!coupon) throw new TRPCError({ code: 'NOT_FOUND', message: 'クーポンコードが見つかりません' });
        if (!coupon.isActive) throw new TRPCError({ code: 'BAD_REQUEST', message: 'このクーポンは無効です' });

        const now = new Date();
        const nowMs = now.getTime();
        // Use getTime() for timezone-safe timestamp comparison
        if (coupon.startsAt && nowMs < new Date(coupon.startsAt).getTime()) throw new TRPCError({ code: 'BAD_REQUEST', message: 'このクーポンはまだ有効期間前です' });
        if (coupon.expiresAt && nowMs > new Date(coupon.expiresAt).getTime()) throw new TRPCError({ code: 'BAD_REQUEST', message: 'このクーポンは有効期限切れです' });
        if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) throw new TRPCError({ code: 'BAD_REQUEST', message: 'このクーポンは使用上限に達しました' });

        const minOrder = parseFloat(coupon.minOrderAmount || '0');
        if (input.orderAmount < minOrder) throw new TRPCError({ code: 'BAD_REQUEST', message: `${Math.round(minOrder).toLocaleString()}円以上のご注文で使用可能です` });

        // Check per-user usage limit
        if (input.userId && coupon.maxUsesPerUser) {
          const userUsages = await db.select().from(couponUsages)
            .where(and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.userId, input.userId)));
          if (userUsages.length >= coupon.maxUsesPerUser) throw new TRPCError({ code: 'BAD_REQUEST', message: 'このクーポンの使用回数上限に達しました' });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
          discountAmount = input.orderAmount * (parseFloat(coupon.discountValue) / 100);
          if (coupon.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, parseFloat(coupon.maxDiscountAmount));
          }
        } else {
          discountAmount = parseFloat(coupon.discountValue);
        }
        discountAmount = Math.min(discountAmount, input.orderAmount);

        return {
          couponId: coupon.id,
          code: coupon.code,
          nameJa: coupon.nameJa,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: Math.round(discountAmount),
        };
      }),

    // Record coupon usage after order
    recordUsage: protectedProcedure
      .input(z.object({
        couponId: z.number(),
        orderId: z.number(),
        discountAmount: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.insert(couponUsages).values({
          couponId: input.couponId,
          userId: ctx.user.id,
          orderId: input.orderId,
          discountAmount: input.discountAmount.toString(),
        });
        await db.update(coupons).set({ currentUses: sql`${coupons.currentUses} + 1` }).where(eq(coupons.id, input.couponId));
        return { success: true };
      }),

    // Admin: list all coupons
    adminList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    }),

    // User: get my coupon usage history
    myUsageList: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const usages = await db
        .select({
          usageId: couponUsages.id,
          couponId: couponUsages.couponId,
          orderId: couponUsages.orderId,
          discountAmount: couponUsages.discountAmount,
          usedAt: couponUsages.usedAt,
          code: coupons.code,
          nameJa: coupons.nameJa,
          description: coupons.description,
          discountType: coupons.discountType,
          discountValue: coupons.discountValue,
          minOrderAmount: coupons.minOrderAmount,
          expiresAt: coupons.expiresAt,
          isActive: coupons.isActive,
        })
        .from(couponUsages)
        .innerJoin(coupons, eq(couponUsages.couponId, coupons.id))
        .where(eq(couponUsages.userId, ctx.user.id))
        .orderBy(desc(couponUsages.usedAt));
      return usages;
    }),
    // User: get all active coupons (publicly visible)
    listActive: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const now = new Date();
      return await db
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.isActive, true),
            or(
              isNull(coupons.expiresAt),
              gt(coupons.expiresAt, now)
            )
          )
        )
        .orderBy(desc(coupons.createdAt));
    }),
    // Admin: create coupon
    adminCreate: protectedProcedure
      .input(z.object({
        code: z.string().min(1).max(50),
        nameJa: z.string().min(1),
        description: z.string().optional(),
        discountType: z.enum(['percentage', 'fixed']),
        discountValue: z.number().min(0),
        minOrderAmount: z.number().min(0).optional(),
        maxDiscountAmount: z.number().min(0).optional(),
        maxUses: z.number().min(1).optional(),
        maxUsesPerUser: z.number().min(1).optional(),
        startsAt: z.string().optional(),
        expiresAt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.insert(coupons).values({
          code: input.code.toUpperCase(),
          nameJa: input.nameJa,
          description: input.description || null,
          discountType: input.discountType,
          discountValue: input.discountValue.toString(),
          minOrderAmount: (input.minOrderAmount || 0).toString(),
          maxDiscountAmount: input.maxDiscountAmount ? input.maxDiscountAmount.toString() : null,
          maxUses: input.maxUses || null,
          maxUsesPerUser: input.maxUsesPerUser || 1,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        });
        return { success: true };
      }),

    // Admin: update coupon
    adminUpdate: protectedProcedure
      .input(z.object({
        id: z.number(),
        nameJa: z.string().min(1).optional(),
        description: z.string().optional(),
        discountType: z.enum(['percentage', 'fixed']).optional(),
        discountValue: z.number().min(0).optional(),
        minOrderAmount: z.number().min(0).optional(),
        maxDiscountAmount: z.number().min(0).optional().nullable(),
        maxUses: z.number().min(1).optional().nullable(),
        maxUsesPerUser: z.number().min(1).optional(),
        startsAt: z.string().optional().nullable(),
        expiresAt: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, ...updates } = input;
        const setData: any = {};
        if (updates.nameJa !== undefined) setData.nameJa = updates.nameJa;
        if (updates.description !== undefined) setData.description = updates.description;
        if (updates.discountType !== undefined) setData.discountType = updates.discountType;
        if (updates.discountValue !== undefined) setData.discountValue = updates.discountValue.toString();
        if (updates.minOrderAmount !== undefined) setData.minOrderAmount = updates.minOrderAmount.toString();
        if (updates.maxDiscountAmount !== undefined) setData.maxDiscountAmount = updates.maxDiscountAmount ? updates.maxDiscountAmount.toString() : null;
        if (updates.maxUses !== undefined) setData.maxUses = updates.maxUses;
        if (updates.maxUsesPerUser !== undefined) setData.maxUsesPerUser = updates.maxUsesPerUser;
        if (updates.startsAt !== undefined) setData.startsAt = updates.startsAt ? new Date(updates.startsAt) : null;
        if (updates.expiresAt !== undefined) setData.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null;
        if (updates.isActive !== undefined) setData.isActive = updates.isActive;
        await db.update(coupons).set(setData).where(eq(coupons.id, id));
        return { success: true };
      }),

    // Admin: delete coupon
    adminDelete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.delete(couponUsages).where(eq(couponUsages.couponId, input.id));
        await db.delete(coupons).where(eq(coupons.id, input.id));
        return { success: true };
      }),
    // Get count of active coupons expiring within N days (for sidebar badge)
    getExpiringCount: protectedProcedure
      .input(z.object({ days: z.number().min(1).max(30).default(7) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { count: 0 };
        const now = new Date();
        const future = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);
        // Count active public coupons expiring soon
        const expiring = await db.select({ id: coupons.id })
          .from(coupons)
          .where(
            and(
              eq(coupons.isActive, true),
              sql`${coupons.expiresAt} IS NOT NULL`,
              sql`${coupons.expiresAt} > ${now.toISOString()}`,
              sql`${coupons.expiresAt} <= ${future.toISOString()}`,
            )
          );
        return { count: expiring.length };
      }),
  }),

  // Point system router
  point: router({
    // Get current user's point balance
     getBalance: protectedProcedure.query(async ({ ctx }) => {
      const { getUserPoints } = await import("./_core/pointService");
      const registeredUserId = getRegisteredUserId(ctx.user);
      const balance = await getUserPoints(registeredUserId);
      return { balance };
    }),
    // Get point transaction history
    getHistory: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        const registeredUserId = getRegisteredUserId(ctx.user);
        const limit = input.limit || 20;
        const offset = input.offset || 0;
        const [rows, countResult] = await Promise.all([
          db.select().from(pointTransactions)
            .where(eq(pointTransactions.userId, registeredUserId))
            .orderBy(desc(pointTransactions.createdAt))
            .limit(limit)
            .offset(offset),
          db.select({ count: sql<number>`COUNT(*)` }).from(pointTransactions)
            .where(eq(pointTransactions.userId, registeredUserId)),
        ]);
        return { rows, total: Number(countResult[0]?.count ?? 0) };
      }),
    // Calculate max spendable points for order
    calculateMaxSpendable: protectedProcedure
      .input(z.object({ orderAmount: z.number().min(0) }))
      .query(async ({ ctx, input }) => {
        const { getUserPoints, calculateMaxSpendablePoints } = await import("./_core/pointService");
        const registeredUserId = getRegisteredUserId(ctx.user);
        const balance = await getUserPoints(registeredUserId);
        const maxSpendable = calculateMaxSpendablePoints(balance, input.orderAmount);
        return { balance, maxSpendable };
      }),

    // Admin: Manually adjust user points
    adminAdjust: protectedProcedure
      .input(z.object({
        userId: z.number().min(1),
        amount: z.number().min(1),
        description: z.string().min(1),
        isAdd: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        // TODO: Add admin role check
        const { adminAdjustPoints } = await import("./_core/pointService");
        const result = await adminAdjustPoints(
          input.userId,
          input.amount,
          input.description,
          input.isAdd
        );
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.message });
        }
        return result;
      }),

    // Admin: Get user's point history (server-side pagination + total)
    adminGetHistory: protectedProcedure
      .input(z.object({
        userId: z.number().min(1),
        limit: z.number().min(1).max(500).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        const limit = input.limit || 10;
        const offset = input.offset || 0;
        const [rows, countResult] = await Promise.all([
          db.select().from(pointTransactions)
            .where(eq(pointTransactions.userId, input.userId))
            .orderBy(desc(pointTransactions.createdAt))
            .limit(limit)
            .offset(offset),
          db.select({ count: sql<number>`COUNT(*)` }).from(pointTransactions)
            .where(eq(pointTransactions.userId, input.userId)),
        ]);
        return { rows, total: Number(countResult[0]?.count ?? 0) };
      }),
    // Admin: Get ALL point transactions across all users
    adminGetAllTransactions: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).optional(),
        offset: z.number().min(0).optional(),
        userId: z.number().optional(),
        type: z.enum(["earn", "spend", "admin_add", "admin_deduct", "all"]).optional(),
        search: z.string().optional(), // ID/会員名/メール/注文番号統合検索
        dateFrom: z.string().optional(), // YYYY-MM-DD
        dateTo: z.string().optional(),   // YYYY-MM-DD
        balanceSort: z.enum(["asc", "desc"]).optional(), // 残高ソート
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        const limit = input.limit || 50;
        const offset = input.offset || 0;
        const conditions: any[] = [];
        if (input.userId) conditions.push(eq(pointTransactions.userId, input.userId));
        if (input.type && input.type !== "all") conditions.push(eq(pointTransactions.type, input.type as any));
        // 統合検索 (ID, 会員名, メール, 注文番号)
        if (input.search && input.search.trim()) {
          const s = input.search.trim();
          const numId = parseInt(s);
          const searchConds: any[] = [
            like(registeredUsers.nameKanji, `%${s}%`),
            like(registeredUsers.email, `%${s}%`),
          ];
          if (!isNaN(numId)) {
            searchConds.push(eq(pointTransactions.userId, numId));
            searchConds.push(eq(pointTransactions.orderId, numId));
          }
          conditions.push(or(...searchConds));
        }
        // 日付範囲
        if (input.dateFrom) {
          conditions.push(sql`DATE(${pointTransactions.createdAt}) >= ${input.dateFrom}`);
        }
        if (input.dateTo) {
          conditions.push(sql`DATE(${pointTransactions.createdAt}) <= ${input.dateTo}`);
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        // ソート: 残高ソート or デフォルト日付降順
        const orderClause = input.balanceSort
          ? (input.balanceSort === "desc" ? desc(pointTransactions.balance) : asc(pointTransactions.balance))
          : desc(pointTransactions.createdAt);
        const rawRows = await db
          .select({
            id: pointTransactions.id,
            userId: pointTransactions.userId,
            userName: registeredUsers.nameKanji,
            userEmailFromJoin: registeredUsers.email,
            userEmailFromTx: pointTransactions.userEmail,
            orderId: pointTransactions.orderId,
            type: pointTransactions.type,
            amount: pointTransactions.amount,
            balance: pointTransactions.balance,
            description: pointTransactions.description,
            createdAt: pointTransactions.createdAt,
          })
          .from(pointTransactions)
          .leftJoin(registeredUsers, eq(pointTransactions.userId, registeredUsers.id))
          .where(whereClause)
          .orderBy(orderClause)
          .limit(limit)
          .offset(offset);
        // 이메일: registeredUsers 조인 값 우선, 없으면 pointTransactions.userEmail 폴백
        const rows = rawRows.map(r => ({
          ...r,
          userEmail: r.userEmailFromJoin || r.userEmailFromTx || null,
          userEmailFromJoin: undefined,
          userEmailFromTx: undefined,
        }));
        const [countRow] = await db
          .select({ total: sql<number>`COUNT(*)` })
          .from(pointTransactions)
          .leftJoin(registeredUsers, eq(pointTransactions.userId, registeredUsers.id))
          .where(whereClause);
        return { rows, total: Number(countRow?.total ?? 0) };
      }),
    // Admin: Search users for point adjustment
    adminSearchUsers: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です。" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        const q = `%${input.query}%`;
        const users = await db
          .select({
            id: registeredUsers.id,
            name: registeredUsers.nameKanji,
            email: registeredUsers.email,
            points: registeredUsers.points,
          })
          .from(registeredUsers)
          .where(or(like(registeredUsers.nameKanji, q), like(registeredUsers.email, q)))
          .limit(10);
        return users;
      }),
  }),
  // Product Q&A routes
  productQuestion: router({
    // Admin: Get all questions with product info
    adminList: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(1000).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const { productQuestions, products } = await import("../drizzle/schema");
        
        const questions = await db
          .select({
            id: productQuestions.id,
            productId: productQuestions.productId,
            productName: products.nameJa,
            userId: productQuestions.userId,
            question: productQuestions.question,
            answer: productQuestions.answer,
            answerImageUrl: productQuestions.answerImageUrl,
            answeredBy: productQuestions.answeredBy,
            answeredAt: productQuestions.answeredAt,
            createdAt: productQuestions.createdAt,
            isAnswered: sql<boolean>`${productQuestions.answer} IS NOT NULL`,
          })
          .from(productQuestions)
          .leftJoin(products, eq(productQuestions.productId, products.id))
          .orderBy(desc(productQuestions.createdAt))
          .limit(input.limit || 100);
        
        return questions;
      }),

    // Get questions for a product
    list: publicProcedure
      .input(z.object({
        productId: z.number().min(1),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ input }) => {
        const limit = input.limit || 10;
        const offset = input.offset || 0;
        return withCache(`productQuestion:list:${input.productId}:${limit}:${offset}`, TTL_10MIN, async () => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
          const { productQuestions } = await import("../drizzle/schema");
          const questions = await db
            .select()
            .from(productQuestions)
            .where(eq(productQuestions.productId, input.productId))
            .orderBy(desc(productQuestions.createdAt))
            .limit(limit)
            .offset(offset);
          return questions;
        });
      }),

    // Create a question (customer)
    create: protectedProcedure
      .input(z.object({
        productId: z.number().min(1),
        questionText: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const { productQuestions, products } = await import("../drizzle/schema");
        const result = await db.insert(productQuestions).values({
          productId: input.productId,
          userId: ctx.user.id,
          question: input.questionText,
          createdAt: new Date(),
        });
        // Send admin notification email
        try {
          const { sendNewProductQuestionNotification } = await import('./_core/emailService');
          const { getSiteSetting } = await import('./db');
          const fromAddressSetting = await getSiteSetting('EMAIL_FROM_ADDRESS');
          const fromNameSetting = await getSiteSetting('EMAIL_FROM_NAME');
          const fromAddress = fromAddressSetting?.value || undefined;
          const fromName = fromNameSetting?.value || undefined;
          // Get admin email
          const adminEmailSetting = await getSiteSetting('ADMIN_NOTIFICATION_EMAIL');
          const adminEmail = adminEmailSetting?.value || process.env.OWNER_NAME || 'kim2025.platform@gmail.com';
          // Get product name
          const productRow = await db.select({ name: products.name, nameJa: products.nameJa }).from(products).where(eq(products.id, input.productId)).limit(1);
          const productName = productRow[0]?.nameJa || productRow[0]?.name || `商品 #${input.productId}`;
          const newId = result[0]?.insertId ? Number(result[0].insertId) : 0;
          await sendNewProductQuestionNotification(
            adminEmail,
            {
              id: newId,
              productName,
              question: input.questionText,
              userName: ctx.user.name || '匿名',
              userEmail: ctx.user.email || '',
            },
            fromAddress,
            fromName
          );
        } catch (emailError) {
          console.error('[ProductQuestion] Failed to send admin notification email:', emailError);
        }
        return { success: true };
      }),

    // Answer a question (admin)
    answer: protectedProcedure
      .input(z.object({
        questionId: z.number().min(1),
        answerText: z.string().min(1).max(1000),
        answerImageUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const { productQuestions } = await import("../drizzle/schema");
        await db
          .update(productQuestions)
          .set({
            answer: input.answerText,
            answerImageUrl: input.answerImageUrl || null,
            answeredAt: new Date(),
            answeredBy: ctx.user.id,
          })
          .where(eq(productQuestions.id, input.questionId));
        // Send Q&A answer email to customer
        try {
          const question = await db.select().from(productQuestions).where(eq(productQuestions.id, input.questionId)).limit(1);
          if (question[0]?.userId) {
            const userInfo = await getRegisteredUserById(question[0].userId);
            if (userInfo?.email) {
              const productInfo = await getProductById(question[0].productId);
              const { sendProductQAAnswerEmail } = await import('./_core/emailService');
              const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
              sendProductQAAnswerEmail({
                to: userInfo.email,
                userName: userInfo.nameKanji || userInfo.nameHiragana || userInfo.email,
                productName: productInfo?.nameJa || productInfo?.name || '商品',
                question: question[0].question,
                answer: input.answerText,
                productUrl: `${frontendUrl}/products/${question[0].productId}`,
              }).catch(err => console.error('[Email] Q&A answer email failed:', err));
            }
          }
        } catch (emailErr) {
          console.error('[Email] Failed to send Q&A answer email:', emailErr);
        }
        return { success: true };
      }),
    // Delete answer only (admin))
    deleteAnswer: protectedProcedure
      .input(z.object({ questionId: z.number().min(1) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const { productQuestions } = await import("../drizzle/schema");
        await db
          .update(productQuestions)
          .set({ answer: null, answerImageUrl: null, answeredAt: null, answeredBy: null })
          .where(eq(productQuestions.id, input.questionId));
        return { success: true };
      }),

    // Upload answer image (admin)
    uploadAnswerImage: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.fileData, 'base64');
        const key = `qa-answers/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url };
      }),

    // Delete a question (admin)
    delete: protectedProcedure
      .input(z.object({ questionId: z.number().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const { productQuestions } = await import("../drizzle/schema");
        await db.delete(productQuestions).where(eq(productQuestions.id, input.questionId));
        return { success: true };
      }),
  }),

  // Analytics routes
    analytics: router({
    // 공개: 페이지뷰 추적
    trackPageView: publicProcedure
      .input(z.object({
        page: z.string(),
        referrer: z.string().optional(),
        sessionId: z.string(),
        userAgent: z.string().optional(),
        country: z.string().optional(),
        countryName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { trackPageView } = await import("./analytics");
          await trackPageView({
            page: input.page,
            referrer: input.referrer || null,
            sessionId: input.sessionId,
            userAgent: input.userAgent || null,
            country: input.country || null,
            countryName: input.countryName || null,
            timestamp: new Date(),
          });
          return { success: true };
        } catch (e) {
          return { success: false };
        }
      }),

    // 공개: 검색 키워드 추적
    trackSearch: publicProcedure
      .input(z.object({
        keyword: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { trackSearchKeyword } = await import("./analytics");
          const today = new Date().toISOString().split("T")[0];
          await trackSearchKeyword(input.keyword.trim(), today);
          return { success: true };
        } catch (e) {
          return { success: false };
        }
      }),

    // 관리자 전용: 애널리틱스 요약
    getSummary: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { getAnalyticsSummary } = await import("./analytics");
        return getAnalyticsSummary(input.startDate, input.endDate);
      }),

    // 관리자 전용: 일일 통계
    getDailyStats: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { getDailyStatsRange } = await import("./analytics");
        return getDailyStatsRange(input.startDate, input.endDate);
      }),

    // 관리자 전용: 국가별 통계
    getCountryStats: protectedProcedure
      .input(z.object({
        date: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { getCountryStats } = await import("./analytics");
        return getCountryStats(input.date);
      }),

    // 관리자 전용: 검색 키워드 통계
    getSearchKeywords: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        limit: z.number().optional().default(20),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { getSearchKeywordStats } = await import("./analytics");
        const data = await getSearchKeywordStats(input.startDate, input.endDate);
        return data.slice(0, input.limit);
      }),

    // Get dashboard analytics (기존 프로시저 유지)
    getDashboard: protectedProcedure
      .input(z.object({
        dateRange: z.enum(["7d", "30d", "90d"]),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const now = new Date();
        const daysAgo = input.dateRange === "7d" ? 7 : input.dateRange === "30d" ? 30 : 90;
        const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

        // Total revenue
        const revenueResult = await db
          .select({ total: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)` })
          .from(orders)
          .where(and(
            gte(orders.createdAt, startDate),
            ne(orders.status, 'cancelled')
          ));
        const totalRevenue = Number(revenueResult[0]?.total || 0);

        // Total orders
        const ordersResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(orders)
          .where(and(
            gte(orders.createdAt, startDate),
            ne(orders.status, 'cancelled')
          ));
        const totalOrders = Number(ordersResult[0]?.count || 0);

        // Total customers (unique users who placed orders)
        const customersResult = await db
          .select({ count: sql<number>`COUNT(DISTINCT ${orders.userId})` })
          .from(orders)
          .where(and(
            gte(orders.createdAt, startDate),
            ne(orders.status, 'cancelled')
          ));
        const totalCustomers = Number(customersResult[0]?.count || 0);

        // Average order value
        const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        // Top products
        const topProductsResult = await db
          .select({
            productId: orderItems.productId,
            productName: orderItems.productNameJa,
            totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
            totalRevenue: sql<number>`SUM(${orderItems.unitPrice} * ${orderItems.quantity})`,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(and(
            gte(orders.createdAt, startDate),
            ne(orders.status, 'cancelled')
          ))
          .groupBy(orderItems.productId, orderItems.productNameJa)
          .orderBy(desc(sql`SUM(${orderItems.quantity})`))
          .limit(10);
        const topProducts = topProductsResult.map((p) => ({
          productId: p.productId,
          productName: p.productName,
          totalQuantity: Number(p.totalQuantity),
          totalRevenue: Number(p.totalRevenue),
        }));

        // Revenue by day
        const revenueByDayResult = await db.execute(sql`
          SELECT DATE(createdAt) as date, SUM(totalAmount) as revenue
          FROM orders
          WHERE createdAt >= ${startDate} AND status <> 'cancelled'
          GROUP BY DATE(createdAt)
          ORDER BY DATE(createdAt)
        `);
        const revenueByDay = (revenueByDayResult as any[]).map((r: any) => ({
          date: typeof r.date === 'string' ? r.date.substring(5) : String(r.date).substring(5), // MM-DD format
          revenue: Number(r.revenue),
        }));

        // Orders by status
        const ordersByStatusResult = await db
          .select({
            status: orders.status,
            count: sql<number>`COUNT(*)`,
          })
          .from(orders)
          .where(gte(orders.createdAt, startDate))
          .groupBy(orders.status);
        const ordersByStatus = ordersByStatusResult.map((s) => ({
          status: s.status,
          count: Number(s.count),
        }));

        // Repeat customer rate
        const repeatCustomersResult = await db
          .select({
            userId: orders.userId,
            orderCount: sql<number>`COUNT(*)`,
          })
          .from(orders)
          .where(and(
            gte(orders.createdAt, startDate),
            ne(orders.status, 'cancelled')
          ))
          .groupBy(orders.userId);
        const repeatCustomers = repeatCustomersResult.filter((c) => Number(c.orderCount) >= 2).length;
        const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

        return {
          totalRevenue,
          totalOrders,
          totalCustomers,
          averageOrderValue,
          topProducts,
          revenueByDay,
          ordersByStatus,
          repeatCustomerRate,
        };
      }),

    // Export analytics data to CSV
    exportCSV: protectedProcedure
      .input(z.object({
        dateRange: z.enum(["7d", "30d", "90d"]),
        dataType: z.enum(["revenue", "topProducts", "orderStatus"]),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { orders, orderItems } = await import("../drizzle/schema");
        
        // Calculate date range
        const now = new Date();
        const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
        const startDate = new Date(now.getTime() - daysMap[input.dateRange] * 24 * 60 * 60 * 1000);
        
        let csvData = "";
        
        if (input.dataType === "revenue") {
          // Revenue by day
          const revenueByDayResult = await db.execute(sql`
            SELECT DATE(createdAt) as date, SUM(totalAmount) as revenue, COUNT(*) as orderCount
            FROM orders
            WHERE createdAt >= ${startDate} AND status <> 'cancelled'
            GROUP BY DATE(createdAt)
            ORDER BY DATE(createdAt)
          `);
          
          csvData = "日付,売上,注文数\n";
          for (const row of revenueByDayResult as any[]) {
            csvData += `${row.date},${row.revenue},${row.orderCount}\n`;
          }
        } else if (input.dataType === "topProducts") {
          // Top products
          const topProductsResult = await db
            .select({
              productId: orderItems.productId,
              productName: orderItems.productNameJa,
              totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
              totalRevenue: sql<number>`SUM(${orderItems.unitPrice} * ${orderItems.quantity})`,
            })
            .from(orderItems)
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(and(
              gte(orders.createdAt, startDate),
              ne(orders.status, 'cancelled')
            ))
            .groupBy(orderItems.productId, orderItems.productNameJa)
            .orderBy(desc(sql`SUM(${orderItems.quantity})`));
          
          csvData = "商品ID,商品名,販売数,売上\n";
          for (const row of topProductsResult) {
            csvData += `${row.productId},${row.productName},${row.totalQuantity},${row.totalRevenue}\n`;
          }
        } else if (input.dataType === "orderStatus") {
          // Orders by status
          const ordersByStatusResult = await db
            .select({
              status: orders.status,
              count: sql<number>`COUNT(*)`,
            })
            .from(orders)
            .where(gte(orders.createdAt, startDate))
            .groupBy(orders.status);
          
          csvData = "ステータス,件数\n";
          for (const row of ordersByStatusResult) {
            csvData += `${row.status},${row.count}\n`;
          }
        }
        
        return { csvData };
      }),

    // 관리자 전용: 상품 수정 이력 조회
    getProductAuditLogs: protectedProcedure
      .input(z.object({
        productId: z.number().optional(),
        adminId: z.number().optional(),
        action: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const logs = await getProductAuditLogs({
          productId: input.productId,
          adminId: input.adminId,
          action: input.action,
          limit: input.limit,
          offset: input.offset,
        });
        const total = await getProductAuditLogCount({
          productId: input.productId,
          adminId: input.adminId,
          action: input.action,
        });
        return { logs, total };
      }),
   }),

  // Address management
  address: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserAddresses(ctx.user.id);
    }),

    getDefault: protectedProcedure.query(async ({ ctx }) => {
      return await getDefaultAddress(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        label: z.string().optional(),
        recipientNameKanji: z.string().min(1),
        recipientNameHiragana: z.string().min(1),
        postalCode: z.string().min(1),
        prefecture: z.string().min(1),
        city: z.string().min(1),
        address1: z.string().min(1),
        address2: z.string().optional(),
        phone: z.string().min(1),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const newAddress = await createAddress({
          userId: ctx.user.id,
          ...input,
          isDefault: input.isDefault ?? false,
        });
        if (!newAddress) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create address' });
        }
        return newAddress;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        recipientNameKanji: z.string().min(1).optional(),
        recipientNameHiragana: z.string().min(1).optional(),
        postalCode: z.string().min(1).optional(),
        prefecture: z.string().min(1).optional(),
        city: z.string().min(1).optional(),
        address1: z.string().min(1).optional(),
        address2: z.string().optional(),
        phone: z.string().min(1).optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updated = await updateAddress(id, ctx.user.id, data);
        if (!updated) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Address not found' });
        }
        return updated;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await deleteAddress(input.id, ctx.user.id);
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Address not found' });
        }
        return { success };
      }),

    setDefault: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await setDefaultAddress(input.id, ctx.user.id);
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Address not found' });
        }
        return { success };
      }),
  }),

  // Legal Notice routes
  legalNotice: router({
    // Public: Get legal notice by key
    get: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        const { getLegalNoticeByKey } = await import("./db");
        return await getLegalNoticeByKey(input.key);
      }),

    // Admin: Get all legal notices
    adminList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "管理者のみアクセス可能です。" });
      }
      const { getAllLegalNotices } = await import("./db");
      return await getAllLegalNotices();
    }),

    // Admin: Upsert legal notice
    adminUpsert: protectedProcedure
      .input(z.object({
        key: z.string(),
        titleJa: z.string().min(1),
        contentJa: z.string().min(1),
        isPublished: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者のみアクセス可能です。" });
        }
        const { upsertLegalNotice } = await import("./db");
        return await upsertLegalNotice(input);
      }),
  }),
  paymentSettings: paymentRouter,

  // ============================================================
  // ポイント有効期限通知API
  // ============================================================
  pointExpiry: router({
    // ログインユーザーの有効期限予定ポイント取得 (サイト内バナー通知用)
    getMyExpiringPoints: protectedProcedure
      .input(z.object({ daysAhead: z.number().default(30) }).optional())
      .query(async ({ ctx, input }) => {
        const { getUserExpiringPoints } = await import('./db');
        return await getUserExpiringPoints(ctx.user.id, input?.daysAhead ?? 30);
      }),

    // 管理者: 有効期限通知メール一括送信
    sendExpiryAlerts: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const { getExpiringPointTransactions, markPointExpiryNotified } = await import('./db');
      const { sendPointExpiryAlertEmail } = await import('./_core/emailService');
      const expiring = await getExpiringPointTransactions(30);
      let sent = 0;
      let skipped = 0;
      for (const tx of expiring) {
        if (!tx.userEmail) { skipped++; continue; }
        try {
          await sendPointExpiryAlertEmail({
            to: tx.userEmail,
            userName: tx.userName || 'お客様',
            expiringPoints: tx.amount,
            expiryDate: tx.expiresAt,
          });
          await markPointExpiryNotified(tx.id);
          sent++;
        } catch { skipped++; }
      }
      return { sent, skipped, total: expiring.length };
    }),
  }),

  // ============================================================
  // 管理者ポイント付与設定API
  // ============================================================
  pointSettings: router({
    // 全ポイント設定取得
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const all = await getAllSiteSettings();
      const pointKeys = [
        'REVIEW_POINTS', 'REVIEW_IMAGE_POINTS', 'REVIEW_DETAIL_POINTS',
        'PURCHASE_POINTS_PERCENT', 'SIGNUP_POINTS', 'POINT_EXPIRY_MONTHS',
        'POINT_EXPIRY_ALERT_DAYS',
      ];
      const defaults: Record<string, string> = {
        REVIEW_POINTS: '1500',
        REVIEW_IMAGE_POINTS: '500',
        REVIEW_DETAIL_POINTS: '200',
        PURCHASE_POINTS_PERCENT: '1',
        SIGNUP_POINTS: '300',
        POINT_EXPIRY_MONTHS: '12',
        POINT_EXPIRY_ALERT_DAYS: '30',
      };
      const result: Record<string, string> = {};
      for (const key of pointKeys) {
        const found = all.find(s => s.key === key);
        result[key] = found?.value ?? defaults[key] ?? '';
      }
      return result;
    }),

    // ポイント設定一括更新
    updateMany: protectedProcedure
      .input(z.array(z.object({ key: z.string(), value: z.string(), changeNote: z.string().optional() })))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const allSettings = await getAllSiteSettings();
        for (const item of input) {
          const previous = allSettings.find(s => s.key === item.key);
          await upsertSiteSetting(item.key, item.value);
          await createSettingAuditLog({
            settingKey: item.key,
            previousValue: previous?.value ?? null,
            newValue: item.value,
            changedBy: ctx.user.id,
            changedByName: ctx.user.nameKanji || ctx.user.name || undefined,
            changeNote: item.changeNote,
          });
        }
        return { success: true, updated: input.length };
      }),
    // 設定変更履歴取得
    getAuditLogs: protectedProcedure
      .input(z.object({
        settingKey: z.string().optional(),
        limit: z.number().min(1).max(200).optional(),
        offset: z.number().min(0).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return getSettingAuditLogs({
          settingKey: input?.settingKey,
          limit: input?.limit ?? 50,
          offset: input?.offset ?? 0,
        });
      }),
  }),

  // ─── Email Logs ─────────────────────────────────────────────────────────────
  emailLogs: router({
    // メールHTMLプレビュー生成 (管理者)
    getPreviewHtml: protectedProcedure
      .input(z.object({ emailType: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { generateEmailPreviewHtml } = await import('./_core/emailService');
        return { html: generateEmailPreviewHtml(input.emailType) };
      }),
    // メール送信履歴取得 (管理者)
    getAll: protectedProcedure
      .input(z.object({
        emailType: z.string().optional(),
        status: z.enum(['sent', 'failed', 'skipped']).optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { getEmailLogs } = await import('./db');
        return getEmailLogs({
          emailType: input?.emailType,
          status: input?.status,
          limit: input?.limit ?? 50,
          offset: input?.offset ?? 0,
        });
      }),
    // メール送信統計
    getStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const { getEmailLogStats } = await import('./db');
      return getEmailLogStats();
    }),
    // 日付別メール送信統計 (直近30日)
    getStatsByDate: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const { getEmailLogStatsByDate } = await import('./db');
      return getEmailLogStatsByDate();
    }),
    // メールタイプ別詳細統計
    getStatsByType: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const { getEmailLogStatsByType } = await import('./db');
      return getEmailLogStatsByType();
    }),
    // ポイント有効期限通知テスト送信
    sendTestPointExpiry: protectedProcedure
      .input(z.object({ to: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { sendPointExpiryAlertEmail } = await import('./_core/emailService');
        const { createEmailLog } = await import('./db');
        const testExpiryDate = new Date();
        testExpiryDate.setDate(testExpiryDate.getDate() + 30);
        const result = await sendPointExpiryAlertEmail({
          to: input.to,
          userName: ctx.user.nameKanji || ctx.user.name || 'テストユーザー',
          expiringPoints: 3500,
          expiryDate: testExpiryDate,
        });
        await createEmailLog({
          emailType: 'test_point_expiry',
          to: input.to,
          subject: '【テスト】ポイント失効アラート',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          userId: ctx.user.id,
          metadata: JSON.stringify({ isTest: true, sentBy: ctx.user.name }),
        });
        if (!result.success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || '送信失敗' });
        return { success: true };
      }),
    // 配送完了メールテスト送信
    sendTestDelivery: protectedProcedure
      .input(z.object({ to: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { sendDeliveryCompletionEmail } = await import('./_core/emailService');
        const { createEmailLog } = await import('./db');
        const result = await sendDeliveryCompletionEmail({
          to: input.to,
          userName: ctx.user.nameKanji || ctx.user.name || 'テストユーザー',
          orderNumber: 'TEST-001',
          orderId: 0,
          orderItems: [{ productId: 0, productNameJa: 'テスト商品', productImageUrl: null, orderItemId: 0 }],
          reviewPoints: 1500,
        });
        await createEmailLog({
          emailType: 'test_delivery',
          to: input.to,
          subject: '【テスト】配達完了メール',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          userId: ctx.user.id,
          metadata: JSON.stringify({ isTest: true, sentBy: ctx.user.name }),
        });
        if (!result.success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || '送信失敗' });
        return { success: true };
      }),
    // レビュー依頼メールテスト送信
    sendTestReviewReminder: protectedProcedure
      .input(z.object({ to: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { sendReviewReminderEmail } = await import('./_core/emailService');
        const { createEmailLog } = await import('./db');
        const result = await sendReviewReminderEmail({
          to: input.to,
          userName: ctx.user.nameKanji || ctx.user.name || 'テストユーザー',
          orderNumber: 'TEST-001',
          orderId: 0,
          orderDate: new Date(),
          orderItems: [{ productId: 0, productNameJa: 'テスト商品', productImageUrl: null, orderItemId: 0 }],
          reviewPoints: 1500,
          reminderType: '7days',
        });
        await createEmailLog({
          emailType: 'test_review_reminder',
          to: input.to,
          subject: '【テスト】レビューリマインダー',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          userId: ctx.user.id,
          metadata: JSON.stringify({ isTest: true, sentBy: ctx.user.name }),
        });
        if (!result.success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || '送信失敗' });
        return { success: true };
      }),
    // 注文キャンセルメールテスト送信
    sendTestOrderCancellation: protectedProcedure
      .input(z.object({ to: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { sendOrderCancellationEmail } = await import('./_core/emailService');
        const { createEmailLog } = await import('./db');
        const result = await sendOrderCancellationEmail({
          to: input.to,
          userName: ctx.user.nameKanji || ctx.user.name || 'テストユーザー',
          orderNumber: 'TEST-CANCEL-001',
          orderId: 0,
          cancelledItems: [
            { productName: 'Test Product A', productNameJa: 'テスト商品 A', quantity: 2, refundAmount: 3200 },
            { productName: 'Test Product B', productNameJa: 'テスト商品 B', quantity: 1, refundAmount: 1800 },
          ],
          totalRefundAmount: 5000,
          cancelReason: 'テスト用キャンセル',
          paymentMethod: 'stripe',
          isFullCancellation: true,
        });
        await createEmailLog({
          emailType: 'test_order_cancellation',
          to: input.to,
          subject: '【テスト】注文キャンセル確認',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          userId: ctx.user.id,
          metadata: JSON.stringify({ isTest: true, sentBy: ctx.user.name }),
        });
        if (!result.success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || '送信失敗' });
        return { success: true };
      }),
    // 配送遅延メールテスト送信
    sendTestDelayedShipment: protectedProcedure
      .input(z.object({ to: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { sendDelayedShipmentNotificationEmail } = await import('./_core/emailService');
        const { createEmailLog } = await import('./db');
        const shippedDate = new Date();
        shippedDate.setDate(shippedDate.getDate() - 16);
        const result = await sendDelayedShipmentNotificationEmail({
          to: input.to,
          userName: ctx.user.nameKanji || ctx.user.name || 'テストユーザー',
          orderNumber: 'TEST-DELAY-001',
          daysDelayed: 16,
          trackingNumber: 'JP123456789',
          carrierName: '日本郵便',
          trackingUrl: 'https://trackings.post.japanpost.jp/services/srv/search/',
          shippedAt: shippedDate,
        });
        await createEmailLog({
          emailType: 'test_delayed_shipment',
          to: input.to,
          subject: '【テスト】配送遅延のお知らせ',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          userId: ctx.user.id,
          metadata: JSON.stringify({ isTest: true, sentBy: ctx.user.name }),
        });
        if (!result.success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || '送信失敗' });
        return { success: true };
      }),
    // お問い合わせ受付確認メールテスト送信
    sendTestInquiryReceipt: protectedProcedure
      .input(z.object({ to: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { sendInquiryReceiptConfirmation } = await import('./_core/emailService');
        const { createEmailLog } = await import('./db');
        const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
        let inquirySuccess = false;
        let inquiryError: string | undefined;
        try {
          const response = await sendInquiryReceiptConfirmation(
            input.to,
            {
              id: 9999,
              title: '【テスト】商品の在庫について',
              content: 'こちらはテスト用のお問い合わせ内容です。\n実際のお問い合わせでは、お客様のご質問内容がここに表示されます。',
              inquiryUrl: `${frontendUrl}/mypage/inquiries`,
            }
          );
          inquirySuccess = !response.error;
          inquiryError = response.error ? String(response.error) : undefined;
        } catch (e) {
          inquiryError = String(e);
        }
        await createEmailLog({
          emailType: 'test_inquiry_receipt',
          to: input.to,
          subject: '【テスト】お問い合わせ受付確認',
          status: inquirySuccess ? 'sent' : 'failed',
          errorMessage: inquiryError,
          userId: ctx.user.id,
          metadata: JSON.stringify({ isTest: true, sentBy: ctx.user.name }),
        });
        if (!inquirySuccess) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: inquiryError || '送信失敗' });
        return { success: true };
      }),
    // 再決済誘導メールテスト送信
    sendTestRetryPayment: protectedProcedure
      .input(z.object({ to: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { sendRetryPaymentEmail } = await import('./_core/emailService');
        const { createEmailLog } = await import('./db');
        const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
        const result = await sendRetryPaymentEmail({
          to: input.to,
          customerName: ctx.user.nameKanji || ctx.user.name || 'テストユーザー',
          orderAmount: '¥12,800',
          retryPaymentUrl: `${frontendUrl}/checkout`,
          failureReason: 'カード残高不足（テスト）',
        });
        await createEmailLog({
          emailType: 'test_retry_payment',
          to: input.to,
          subject: '【テスト】お支払い再手続きのお願い',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          userId: ctx.user.id,
          metadata: JSON.stringify({ isTest: true, sentBy: ctx.user.name }),
        });
        if (!result.success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || '送信失敗' });
        return { success: true };
      }),
    // 汎用テストメール送信 (emailType に応じて適切な関数を呼び出す)
    sendTestByType: protectedProcedure
      .input(z.object({ to: z.string().email(), emailType: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { createEmailLog } = await import('./db');
        const emailSvc = await import('./_core/emailService');
        const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
        const userName = ctx.user.nameKanji || ctx.user.name || 'テストユーザー';
        const orderNumber = 'TEST-001';
        const reviewPoints = 1500;
        const testDate = new Date();
        let result: { success: boolean; error?: string };
        let subject = '【テスト】メール';
        switch (input.emailType) {
          case 'test_email':
          case 'registration_complete':
            result = await emailSvc.sendTestEmail({ to: input.to, from: 'noreply@cocokusuri.com', fromName: 'Coco Kusuri' });
            subject = '【テスト】テストメール';
            break;
          case 'order_confirmation':
          case 'order_shipped':
          case 'delivery_completion':
          case 'test_delivery':
            result = await emailSvc.sendDeliveryCompletionEmail({ to: input.to, userName, orderNumber, orderId: 0, orderItems: [{ productId: 0, productNameJa: 'テスト商品', productImageUrl: null, orderItemId: 0 }], reviewPoints });
            subject = '【テスト】配達完了メール';
            break;
          case 'review_reminder_7days':
          case 'review_reminder_30days':
          case 'test_review_reminder':
            result = await emailSvc.sendReviewReminderEmail({ to: input.to, userName, orderNumber, orderId: 0, orderDate: testDate, orderItems: [{ productId: 0, productNameJa: 'テスト商品', productImageUrl: null, orderItemId: 0 }], reviewPoints, reminderType: input.emailType === 'review_reminder_30days' ? '30days' : '7days' });
            subject = '【テスト】レビューリマインダー';
            break;
          case 'order_cancellation':
            result = await emailSvc.sendOrderCancellationEmail({ to: input.to, userName, orderNumber, orderId: 0, cancelledItems: [{ productName: 'Test Product', productNameJa: 'テスト商品', quantity: 1, refundAmount: 5000 }], totalRefundAmount: 5000, cancelReason: 'テストキャンセル', paymentMethod: 'stripe', isFullCancellation: true });
            subject = '【テスト】注文キャンセル';
            break;
          case 'delayed_shipment':
            result = await emailSvc.sendDelayedShipmentNotificationEmail({ to: input.to, userName, orderNumber, daysDelayed: 3 });
            subject = '【テスト】配送遅延';
            break;
          case 'inquiry_receipt':
          case 'test_inquiry_receipt': {
            try {
              await emailSvc.sendInquiryReceiptConfirmation(input.to, { id: 0, title: 'テスト問い合わせ', content: 'これはテスト問い合わせです。', inquiryUrl: `${frontendUrl}/inquiries/0` });
              result = { success: true };
            } catch (e) {
              result = { success: false, error: String(e) };
            }
            subject = '【テスト】問い合わせ受付';
            break;
          }
          case 'retry_payment':
            result = await emailSvc.sendRetryPaymentEmail({ to: input.to, customerName: userName, orderAmount: '¥12,800', retryPaymentUrl: `${frontendUrl}/checkout`, failureReason: 'カード残高不足（テスト）' });
            subject = '【テスト】再決済依頼';
            break;
          case 'point_earned':
          case 'test_point_expiry':
          case 'point_expiry_alert': {
            const expiryDate = new Date(Date.now() + 30 * 86400000);
            result = await emailSvc.sendPointExpiryAlertEmail({ to: input.to, userName, expiringPoints: 3500, expiryDate });
            subject = '【テスト】ポイント失効アラート';
            break;
          }
          case 'coupon_issued':
            result = await emailSvc.sendCouponIssuedEmail({ to: input.to, userName, couponCode: 'TEST10', couponName: 'テストクーポン', discountType: 'percentage', discountValue: 10, expiresAt: new Date(Date.now() + 30 * 86400000) });
            subject = '【テスト】クーポン発行';
            break;
          case 'birthday_coupon':
            result = await emailSvc.sendBirthdayCouponEmail({ to: input.to, userName, couponCode: 'BDAY20', discountText: '20%割引', expiresAt: new Date(Date.now() + 30 * 86400000) });
            subject = '【テスト】誕生日クーポン';
            break;
          case 'password_changed':
            result = await emailSvc.sendPasswordChangedEmail({ to: input.to, userName });
            subject = '【テスト】パスワード変更';
            break;
          case 'profile_updated':
            result = await emailSvc.sendProfileUpdatedEmail({ to: input.to, userName, updatedFields: ['名前', 'メールアドレス'] });
            subject = '【テスト】プロフィール更新';
            break;
          case 'review_approved':
          case 'review_rejected':
            result = await emailSvc.sendReviewStatusEmail({ to: input.to, userName, productName: 'テスト商品', status: input.emailType === 'review_approved' ? 'approved' : 'rejected', rejectReason: input.emailType === 'review_rejected' ? 'テスト理由' : undefined });
            subject = `【テスト】レビュー${input.emailType === 'review_approved' ? '承認' : '却下'}`;
            break;
          case 'restock_alert':
            result = await emailSvc.sendRestockAlertEmail({ to: input.to, userName, productName: 'テスト商品', productUrl: `${frontendUrl}/products/1`, stock: 5 });
            subject = '【テスト】再入荷通知';
            break;
          case 'price_drop':
            result = await emailSvc.sendPriceDropEmail({ to: input.to, userName, productName: 'テスト商品', originalPrice: 3000, newPrice: 2200, discountRate: 27, productUrl: `${frontendUrl}/products/1` });
            subject = '【テスト】価格下落通知';
            break;
          case 'event_started':
            result = await emailSvc.sendEventStartEmail({ to: input.to, userName, eventTitle: 'テストイベント', eventDescription: 'これはテストイベントです。', startDate: new Date(), endDate: new Date(Date.now() + 7 * 86400000), eventUrl: `${frontendUrl}/events/1` });
            subject = '【テスト】イベント開始';
            break;
          case 'event_ending_soon':
            result = await emailSvc.sendEventEndingSoonEmail({ to: input.to, userName, eventTitle: 'テストイベント', eventDescription: 'イベント終了まであとわずかです。', endDate: new Date(Date.now() + 24 * 3600000), eventUrl: `${frontendUrl}/events/1` });
            subject = '【テスト】イベント終了間近';
            break;
          case 'announcement':
            result = await emailSvc.sendTestEmail({ to: input.to, from: 'noreply@cocokusuri.com', fromName: 'Coco Kusuri' });
            subject = '【テスト】お知らせ';
            break;
          case 'inquiry_reply':
          case 'new_product_question':
          case 'coupon_expiry_warning':
          case 'first_purchase_coupon':
          default:
            result = await emailSvc.sendTestEmail({ to: input.to, from: 'noreply@cocokusuri.com', fromName: 'Coco Kusuri' });
            subject = `【テスト】${input.emailType}`;
        }
        await createEmailLog({ emailType: input.emailType, to: input.to, subject, status: result.success ? 'sent' : 'failed', errorMessage: result.error, userId: ctx.user.id, metadata: JSON.stringify({ isTest: true, sentBy: ctx.user.name }) });
        if (!result.success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || '送信失敗' });
        return { success: true };
      }),
  }),

  // お客様メール受信設定
  emailPreferences: router({
    // 自分の受信設定取得
    get: protectedProcedure.query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { emailPreferences } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const [pref] = await database.select().from(emailPreferences).where(eq(emailPreferences.userId, ctx.user.id)).limit(1);
      if (!pref) {
        return {
          orderConfirmation: true, orderShipped: true, orderDelivered: true,
          orderCancelled: true, refundProcessed: true, passwordChanged: true,
          marketingEmails: true, eventNotifications: true, couponNotifications: true,
          pointNotifications: true, reviewReminders: true, inquiryReplies: true,
          productQaReplies: true, newsletter: false,
        };
      }
      return pref;
    }),
    // 受信設定更新
    update: protectedProcedure
      .input(z.object({
        orderConfirmation: z.boolean().optional(),
        orderShipped: z.boolean().optional(),
        orderDelivered: z.boolean().optional(),
        orderCancelled: z.boolean().optional(),
        refundProcessed: z.boolean().optional(),
        passwordChanged: z.boolean().optional(),
        marketingEmails: z.boolean().optional(),
        eventNotifications: z.boolean().optional(),
        couponNotifications: z.boolean().optional(),
        pointNotifications: z.boolean().optional(),
        reviewReminders: z.boolean().optional(),
        inquiryReplies: z.boolean().optional(),
        productQaReplies: z.boolean().optional(),
        newsletter: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { emailPreferences } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const [existing] = await database.select().from(emailPreferences).where(eq(emailPreferences.userId, ctx.user.id)).limit(1);
        if (existing) {
          await database.update(emailPreferences).set(input).where(eq(emailPreferences.userId, ctx.user.id));
        } else {
          await database.insert(emailPreferences).values({ userId: ctx.user.id, ...input });
        }
        return { success: true };
      }),
  }),

  // ─── User Notifications ────────────────────────────────────────────────────
  notification: router({
    // 通知一覧取得 (ページネーション, タイプフィルター)
    list: protectedProcedure
      .input(z.object({
        type: z.enum(["all", "order", "admin", "tier", "coupon", "point", "review", "inquiry", "system"]).optional().default("all"),
        unreadOnly: z.boolean().optional().default(false),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { userNotifications } = await import('../drizzle/schema');
        const { eq, and, desc, sql } = await import('drizzle-orm');
        const conditions = [eq(userNotifications.userId, ctx.user.id)];
        if (input.type !== "all") conditions.push(eq(userNotifications.type, input.type));
        if (input.unreadOnly) conditions.push(eq(userNotifications.isRead, false));
        const [items, countResult] = await Promise.all([
          database.select().from(userNotifications)
            .where(and(...conditions))
            .orderBy(desc(userNotifications.createdAt))
            .limit(input.limit)
            .offset(input.offset),
          database.select({ count: sql<number>`COUNT(*)` }).from(userNotifications)
            .where(and(...conditions)),
        ]);
        const unreadCount = await database.select({ count: sql<number>`COUNT(*)` })
          .from(userNotifications)
          .where(and(eq(userNotifications.userId, ctx.user.id), eq(userNotifications.isRead, false)));
        return {
          items,
          total: Number(countResult[0]?.count ?? 0),
          unreadCount: Number(unreadCount[0]?.count ?? 0),
        };
      }),

    // 単一通知既読処理
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { userNotifications } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await database.update(userNotifications)
          .set({ isRead: true })
          .where(and(eq(userNotifications.id, input.id), eq(userNotifications.userId, ctx.user.id)));
        return { success: true };
      }),

    // 全体既読処理
    markAllRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { userNotifications } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await database.update(userNotifications)
          .set({ isRead: true })
          .where(and(eq(userNotifications.userId, ctx.user.id), eq(userNotifications.isRead, false)));
        return { success: true };
      }),

    // 通知削除
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { userNotifications } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await database.delete(userNotifications)
          .where(and(eq(userNotifications.id, input.id), eq(userNotifications.userId, ctx.user.id)));
        return { success: true };
      }),

    // 全体削除 (既読のみ)
    deleteAllRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { userNotifications } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await database.delete(userNotifications)
          .where(and(eq(userNotifications.userId, ctx.user.id), eq(userNotifications.isRead, true)));
        return { success: true };
      }),

    // 未読通知数取得 (ヘッダーバッジ用)
    unreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const database = await getDb();
        if (!database) return { count: 0 };
        const { userNotifications } = await import('../drizzle/schema');
        const { eq, and, sql } = await import('drizzle-orm');
        const result = await database.select({ count: sql<number>`COUNT(*)` })
          .from(userNotifications)
          .where(and(eq(userNotifications.userId, ctx.user.id), eq(userNotifications.isRead, false)));
        return { count: Number(result[0]?.count ?? 0) };
      }),

    // 管理者: 全通知一覧取得
    adminList: protectedProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const database = await getDb();
        if (!database) return { notifications: [], total: 0 };
        const { userNotifications } = await import('../drizzle/schema');
        const { desc, sql } = await import('drizzle-orm');
        const offset = (input.page - 1) * input.limit;
        const [notifications, countResult] = await Promise.all([
          database.select().from(userNotifications)
            .orderBy(desc(userNotifications.createdAt))
            .limit(input.limit)
            .offset(offset),
          database.select({ count: sql<number>`COUNT(*)` }).from(userNotifications),
        ]);
        return { notifications, total: Number(countResult[0]?.count ?? 0) };
      }),
    // 管理者: 特定通知削除
    adminDelete: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { userNotifications } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await database.delete(userNotifications).where(eq(userNotifications.id, input.notificationId));
        return { success: true };
      }),
    // 管理者: 特定ユーザーへ通知送信
    adminSend: protectedProcedure
      .input(z.object({
        userId: z.number(),
        type: z.enum(["order", "admin", "tier", "coupon", "point", "review", "inquiry", "system"]),
        title: z.string().min(1).max(200),
        message: z.string().min(1),
        link: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { userNotifications } = await import('../drizzle/schema');
        await database.insert(userNotifications).values({
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          link: input.link,
        });
        return { success: true };
      }),

    // 管理者: 全ユーザーへ通知送信
    adminBroadcast: protectedProcedure
      .input(z.object({
        type: z.enum(["order", "admin", "tier", "coupon", "point", "review", "inquiry", "system"]),
        title: z.string().min(1).max(200),
        message: z.string().min(1),
        link: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { userNotifications, users } = await import('../drizzle/schema');
        const allUsers = await database.select({ id: users.id }).from(users);
        if (allUsers.length === 0) return { success: true, count: 0 };
        await database.insert(userNotifications).values(
          allUsers.map(u => ({
            userId: u.id,
            type: input.type,
            title: input.title,
            message: input.message,
            link: input.link,
          }))
        );
        return { success: true, count: allUsers.length };
      }),

    // ── Phase 1: 管理者通知設定管理 ──────────────────────────────────────────
    // イベント別通知設定一覧取得
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const database = await getDb();
      if (!database) return [];
      const { notificationSettings } = await import('../drizzle/schema');
      return database.select().from(notificationSettings).orderBy(notificationSettings.eventType);
    }),
    // イベント通知設定保存 (upsert)
    upsertSetting: protectedProcedure
      .input(z.object({
        eventType: z.string(),
        label: z.string(),
        isEnabled: z.boolean(),
        defaultTitle: z.string().optional(),
        defaultMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { notificationSettings } = await import('../drizzle/schema');
        const existing = await database.select().from(notificationSettings)
          .where(eq(notificationSettings.eventType, input.eventType)).limit(1);
        if (existing.length > 0) {
          await database.update(notificationSettings)
            .set({ label: input.label, isEnabled: input.isEnabled, defaultTitle: input.defaultTitle, defaultMessage: input.defaultMessage })
            .where(eq(notificationSettings.eventType, input.eventType));
        } else {
          await database.insert(notificationSettings).values(input);
        }
        return { success: true };
      }),

    // ── Phase 1: 通知テンプレート管理 ────────────────────────────────────────────────
    listTemplates: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const database = await getDb();
      if (!database) return [];
      const { notificationTemplates } = await import('../drizzle/schema');
      return database.select().from(notificationTemplates).orderBy(desc(notificationTemplates.createdAt));
    }),
    createTemplate: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        type: z.enum(["order", "admin", "tier", "coupon", "point", "review", "inquiry", "system"]),
        title: z.string().min(1).max(200),
        message: z.string().min(1),
        link: z.string().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { notificationTemplates } = await import('../drizzle/schema');
        await database.insert(notificationTemplates).values(input);
        return { success: true };
      }),
    updateTemplate: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(200),
        type: z.enum(["order", "admin", "tier", "coupon", "point", "review", "inquiry", "system"]),
        title: z.string().min(1).max(200),
        message: z.string().min(1),
        link: z.string().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { notificationTemplates } = await import('../drizzle/schema');
        const { id, ...data } = input;
        await database.update(notificationTemplates).set(data).where(eq(notificationTemplates.id, id));
        return { success: true };
      }),
    deleteTemplate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { notificationTemplates } = await import('../drizzle/schema');
        await database.delete(notificationTemplates).where(eq(notificationTemplates.id, input.id));
        return { success: true };
      }),

    // ── Phase 1: 予約送信管理 ──────────────────────────────────────────────────
    listSchedules: protectedProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const database = await getDb();
        if (!database) return { schedules: [], total: 0 };
        const { notificationSchedules } = await import('../drizzle/schema');
        const offset = (input.page - 1) * input.limit;
        const [schedules, countResult] = await Promise.all([
          database.select().from(notificationSchedules)
            .orderBy(desc(notificationSchedules.scheduledAt))
            .limit(input.limit).offset(offset),
          database.select({ count: sql<number>`COUNT(*)` }).from(notificationSchedules),
        ]);
        return { schedules, total: Number(countResult[0]?.count ?? 0) };
      }),
    createSchedule: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(200),
        message: z.string().min(1),
        link: z.string().optional(),
        type: z.enum(["order", "admin", "tier", "coupon", "point", "review", "inquiry", "system"]).default("admin"),
        targetType: z.enum(["all", "segment", "individual"]).default("all"),
        targetUserIds: z.string().optional(),
        targetSegment: z.string().optional(),
        scheduledAt: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { notificationSchedules } = await import('../drizzle/schema');
        await database.insert(notificationSchedules).values({ ...input, createdBy: ctx.user.id });
        return { success: true };
      }),
    cancelSchedule: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { notificationSchedules } = await import('../drizzle/schema');
        await database.update(notificationSchedules)
          .set({ status: 'cancelled' })
          .where(and(eq(notificationSchedules.id, input.id), eq(notificationSchedules.status, 'pending')));
        return { success: true };
      }),

    // ── Phase 1: 通知統計 ───────────────────────────────────────────────────────
    getStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const database = await getDb();
      if (!database) return null;
      const { userNotifications } = await import('../drizzle/schema');
      const [total, unread, byType, recent7d] = await Promise.all([
        database.select({ count: sql<number>`COUNT(*)` }).from(userNotifications),
        database.select({ count: sql<number>`COUNT(*)` }).from(userNotifications).where(eq(userNotifications.isRead, false)),
        database.select({ type: userNotifications.type, count: sql<number>`COUNT(*)` })
          .from(userNotifications).groupBy(userNotifications.type),
        database.select({ count: sql<number>`COUNT(*)` }).from(userNotifications)
          .where(gte(userNotifications.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))),
      ]);
      return {
        total: Number(total[0]?.count ?? 0),
        unread: Number(unread[0]?.count ?? 0),
        recent7d: Number(recent7d[0]?.count ?? 0),
        byType: byType.map(r => ({ type: r.type, count: Number(r.count) })),
      };
    }),
    getStatsByDay: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const database = await getDb();
      if (!database) return [];
      const { userNotifications } = await import('../drizzle/schema');
      const rows = await database.select({
        day: sql<string>`DATE(created_at)`,
        count: sql<number>`COUNT(*)`,
        type: userNotifications.type,
      }).from(userNotifications)
        .where(gte(userNotifications.createdAt, new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)))
        .groupBy(sql`DATE(created_at)`, userNotifications.type)
        .orderBy(sql`DATE(created_at)`);
      const dayMap: Record<string, Record<string, number>> = {};
      for (const r of rows) {
        if (!dayMap[r.day]) dayMap[r.day] = {};
        dayMap[r.day][r.type] = Number(r.count);
      }
      return Object.entries(dayMap).map(([day, types]) => ({ day, ...types }));
    }),

    // ── Phase 2: ユーザー通知受信設定 ──────────────────────────────────────────
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) return null;
      const { userNotificationPreferences } = await import('../drizzle/schema');
      const prefs = await database.select().from(userNotificationPreferences)
        .where(eq(userNotificationPreferences.userId, ctx.user.id)).limit(1);
      return prefs[0] ?? null;
    }),
    updatePreferences: protectedProcedure
      .input(z.object({
        orderEnabled: z.boolean(),
        tierEnabled: z.boolean(),
        couponEnabled: z.boolean(),
        pointEnabled: z.boolean(),
        reviewEnabled: z.boolean(),
        inquiryEnabled: z.boolean(),
        adminEnabled: z.boolean(),
        systemEnabled: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { userNotificationPreferences } = await import('../drizzle/schema');
        const existing = await database.select().from(userNotificationPreferences)
          .where(eq(userNotificationPreferences.userId, ctx.user.id)).limit(1);
        if (existing.length > 0) {
          await database.update(userNotificationPreferences).set(input)
            .where(eq(userNotificationPreferences.userId, ctx.user.id));
        } else {
          await database.insert(userNotificationPreferences).values({ userId: ctx.user.id, ...input });
        }
        return { success: true };
      }),
    // ── デフォルトテンプレート16種一括登録 ───────────────────────────────────────────────
    seedDefaultTemplates: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { notificationTemplates } = await import('../drizzle/schema');
      const DEFAULT_TEMPLATES = [
        { name: "order_created",       type: "order",   title: "ご注文を承りました",           message: "ご注文ありがとうございます。注文番号：{{orderNumber}}",           link: "/mypage/orders" },
        { name: "order_cancelled",     type: "order",   title: "ご注文がキャンセルされました",  message: "注文番号：{{orderNumber}} がキャンセルされました。",              link: "/mypage/orders" },
        { name: "order_delivered",     type: "order",   title: "商品が届きました！",           message: "ご注文の商品が届きました。レビューをお書きください。",            link: "/mypage/reviews" },
        { name: "order_status_update", type: "order",   title: "注文状況が更新されました",     message: "注文番号：{{orderNumber}} の状況が「{{status}}」に変わりました。", link: "/mypage/orders" },
        { name: "order_refunded",      type: "order",   title: "返金処理が完了しました",       message: "ご注文の返金処理が完了しました。",                               link: "/mypage/orders" },
        { name: "review_point",        type: "review",  title: "レビューポイントが付与されました", message: "レビュー投稿で{{points}}ポイントが付与されました。",           link: "/mypage/points" },
        { name: "review_approved",     type: "review",  title: "レビューが承認されました",     message: "投稿されたレビューが承認されました。",                           link: "/mypage/reviews" },
        { name: "review_rejected",     type: "review",  title: "レビューが却下されました",     message: "投稿されたレビューが却下されました。",                           link: "/mypage/reviews" },
        { name: "inquiry_replied",     type: "inquiry", title: "お問い合わせに回答が届きました", message: "「{{title}}」への回答が届きました。",                           link: "/mypage/inquiries" },
        { name: "qa_replied",          type: "inquiry", title: "商品Q&Aに回答が届きました",   message: "「{{title}}」への回答が届きました。",                            link: "/mypage/inquiries" },
        { name: "tier_upgraded",       type: "tier",    title: "会員ランクがアップしました！",  message: "ランクが「{{tierName}}」にアップグレードされました！",            link: "/mypage/tier" },
        { name: "tier_downgraded",     type: "tier",    title: "会員ランクが変更されました",   message: "ランクが「{{tierName}}」に変更されました。",                     link: "/mypage/tier" },
        { name: "coupon_issued",       type: "coupon",  title: "クーポンが発行されました！",   message: "クーポン（コード：{{code}}、割引：{{discount}}）が発行されました。", link: "/mypage/coupons" },
        { name: "point_adjusted",      type: "point",   title: "ポイントが付与されました",     message: "{{points}}ポイントが付与されました。理由：{{reason}}",            link: "/mypage/points" },
        { name: "welcome",             type: "system",  title: "ご登録ありがとうございます！", message: "Kusuri Mallへようこそ！特典ポイントをプレゼントします。",         link: "/" },
        { name: "password_changed",    type: "system",  title: "パスワードが変更されました",   message: "パスワードが変更されました。ご自身でない場合はお問い合わせください。", link: "/mypage" },
      ] as const;
      let created = 0;
      let skipped = 0;
      for (const tpl of DEFAULT_TEMPLATES) {
        const existing = await db.select({ id: notificationTemplates.id }).from(notificationTemplates)
          .where(eq(notificationTemplates.name, tpl.name)).limit(1);
        if (existing.length > 0) { skipped++; continue; }
        await db.insert(notificationTemplates).values({
          name: tpl.name, type: tpl.type as "order" | "admin" | "tier" | "coupon" | "point" | "review" | "inquiry" | "system",
          title: tpl.title, message: tpl.message, link: tpl.link, isDefault: true,
        });
        created++;
      }
      return { created, skipped };
    }),
    // Email Templates Management
    emailTemplates: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
        }
        const { getAllEmailTemplates } = await import("./db");
        return await getAllEmailTemplates();
      }),

      getByKey: protectedProcedure
        .input(z.object({ templateKey: z.string() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
          }
          const { getEmailTemplateByKey } = await import("./db");
          return await getEmailTemplateByKey(input.templateKey);
        }),

      upsert: protectedProcedure
        .input(z.object({
          templateKey: z.string(),
          templateName: z.string(),
          subject: z.string(),
          bodyText: z.string(),
          isActive: z.boolean().optional(),
          description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
          }
          const { upsertEmailTemplate } = await import("./db");
          const result = await upsertEmailTemplate(input);
          if (!result) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "템플릿 저장에 실패했습니다." });
          }
          return result;
        }),

      delete: protectedProcedure
        .input(z.object({ templateKey: z.string() }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
          }
          const { deleteEmailTemplate } = await import("./db");
          const success = await deleteEmailTemplate(input.templateKey);
          if (!success) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "템플릿 삭제에 실패했습니다." });
          }
          return { success: true };
        }),
    }),
  }),
});
export type AppRouter = typeof appRouter;
