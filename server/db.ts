import { eq, desc, and, like, or, sql, not, ne, asc, inArray, gte, lte, isNull, lt, gt, isNotNull, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import type { 
  User,
  InsertUser, 
  Category, InsertCategory,
  Product, InsertProduct,
  Review, InsertReview,
  CartItem, InsertCartItem,
  Banner, InsertBanner,
  EmailVerification, InsertEmailVerification,
  RegisteredUser, InsertRegisteredUser,
  PasswordResetToken, InsertPasswordResetToken,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  Announcement, InsertAnnouncement,
  AnnouncementComment, InsertAnnouncementComment,
  Inquiry, InsertInquiry,
  InquiryComment, InsertInquiryComment,
  Event, InsertEvent,
  Wishlist, InsertWishlist,
  Shipment, InsertShipment,
  ShipmentEvent, InsertShipmentEvent,
  ProductView, InsertProductView,
  ProductPriceTier, InsertProductPriceTier,
  Address, InsertAddress,
  PointTransaction, InsertPointTransaction,
  CustomerNote, InsertCustomerNote,
  SiteSetting, InsertSiteSetting,
  SeoSetting, InsertSeoSetting,
  CheckoutSession, InsertCheckoutSession,
  RecommendationEvent, InsertRecommendationEvent,
  PaymentSetting, InsertPaymentSetting,
  Payment, InsertPayment,
  EmailLog, InsertEmailLog,
  EmailTemplate, InsertEmailTemplate
} from "../drizzle/schema";
import { 
  users,
  categories,
  products,
  reviews,
  cartItems,
  banners,
  emailVerifications,
  registeredUsers,
  passwordResetTokens,
  orders,
  orderItems,
  announcements,
  announcementComments,
  inquiries,
  inquiryComments,
  events,
  wishlists,
  checkoutSessions,
  shipments,
  shipmentEvents,
  productViews,
  productPriceTiers,
  addresses,
  pointTransactions,
  customerNotes,
  productQuestions,
  siteSettings,
  seoSettings,
  legalNotices,
  recommendationEvents,
  productImageOrder,
  couponUsages,
  coupons,
  paymentSettings,
  payments,
  settingAuditLogs,
  emailLogs,
  shipmentTrackingCache,
  membershipTiers,
  referralSettings,
  referralRewards,
  loginHistory,
  emailTemplates,
  productAuditLogs
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

/**
 * 성/이름 분리 필드에서 표시용 이름을 조합합니다.
 * lastNameKanji + firstNameKanji가 있으면 「姓　名」 형식으로 반환,
 * 없으면 nameKanji(구 형식) 또는 fallback을 반환합니다.
 */
export function buildFullName(user: {
  lastNameKanji?: string | null;
  firstNameKanji?: string | null;
  nameKanji?: string | null;
  email?: string | null;
}, fallback = 'お客様'): string {
  if (user.lastNameKanji && user.firstNameKanji) {
    return `${user.lastNameKanji}　${user.firstNameKanji}`;
  }
  if (user.lastNameKanji) return user.lastNameKanji;
  if (user.nameKanji) return user.nameKanji;
  return fallback;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Create connection pool with optimized settings
      if (!_pool) {
        _pool = mysql.createPool({
          uri: process.env.DATABASE_URL,
          connectionLimit: 10, // Maximum number of connections
          waitForConnections: true, // Queue requests when pool is full
          queueLimit: 0, // Unlimited queue
          enableKeepAlive: true, // Keep connections alive
          keepAliveInitialDelay: 0, // Start keep-alive immediately
          connectTimeout: 10000, // 10 seconds
          idleTimeout: 60000, // 60 seconds
        });
        console.log("[Database] Connection pool created");
        // 연결 끊김 시 _db/_pool 초기화 → 다음 요청 시 자동 재연결
        _pool.on('connection', (conn: any) => {
          conn.on('error', (err: any) => {
            if (['PROTOCOL_CONNECTION_LOST', 'ECONNRESET', 'ETIMEDOUT'].includes(err.code)) {
              console.warn('[Database] Connection lost, resetting pool:', err.code);
              _db = null;
              _pool = null;
            }
          });
        });
      }
      _db = drizzle(_pool) as unknown as ReturnType<typeof drizzle>;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Functions ============
export async function upsertUser(user: InsertUser): Promise<User | null> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return null;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
    
    // Return the upserted user
    const result = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    return null;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ============ Category Functions ============
export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get categories: database not available");
    return [];
  }

  try {
    return await db.select().from(categories).orderBy(categories.sortOrder);
  } catch (error) {
    console.error("[Database] Failed to get categories:", error);
    return [];
  }
}

export async function getAllCategoriesWithCount(): Promise<(Category & { productCount: number })[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get categories: database not available");
    return [];
  }
  try {
    const result = await db
      .select({
        id: categories.id,
        name: categories.name,
        nameJa: categories.nameJa,
        slug: categories.slug,
        icon: categories.icon,
        sortOrder: categories.sortOrder,
        createdAt: categories.createdAt,
        productCount: sql<number>`COUNT(${products.id})`,
      })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(categories.sortOrder);
    return result as unknown as (Category & { productCount: number })[];
  } catch (error) {
    console.error("[Database] Failed to get categories with count:", error);
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get category: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get category by slug:", error);
    return undefined;
  }
}

export async function createCategory(data: InsertCategory): Promise<Category | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create category: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(categories).values(data);
    if (result[0].insertId) {
      return await db.select().from(categories).where(eq(categories.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
    }
  } catch (error) {
    console.error("[Database] Failed to create category:", error);
  }
  return undefined;
}

export async function updateCategory(id: number, data: Partial<InsertCategory>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update category: database not available");
    return;
  }

  try {
    await db.update(categories).set(data).where(eq(categories.id, id));
  } catch (error) {
    console.error("[Database] Failed to update category:", error);
  }
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete category: database not available");
    return;
  }

  try {
    await db.delete(categories).where(eq(categories.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete category:", error);
  }
}

// ============ Banner Functions ============
export async function getAllBanners(): Promise<Banner[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get banners: database not available");
    return [];
  }

  try {
    return await db.select().from(banners).orderBy(banners.sortOrder);
  } catch (error) {
    console.error("[Database] Failed to get banners:", error);
    return [];
  }
}

export async function getActiveBanners(bannerType?: string): Promise<Banner[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get banners: database not available");
    return [];
  }

  try {
    const now = new Date();
    // 기간 필터: startDate가 설정된 경우 현재 시각 이후, endDate가 설정된 경우 현재 시각 이전
    const dateFilter = and(
      or(isNull(banners.startDate), lte(banners.startDate, now)),
      or(isNull(banners.endDate), gte(banners.endDate, now))
    );

    if (bannerType) {
      return await db.select().from(banners)
        .where(and(eq(banners.isActive, true), eq(banners.bannerType, bannerType), dateFilter))
        .orderBy(banners.sortOrder);
    }
    return await db.select().from(banners)
      .where(and(eq(banners.isActive, true), dateFilter))
      .orderBy(banners.sortOrder);
  } catch (error) {
    console.error("[Database] Failed to get active banners:", error);
    return [];
  }
}

export async function createBanner(data: InsertBanner): Promise<Banner | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create banner: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(banners).values(data);
    if (result[0].insertId) {
      return await db.select().from(banners).where(eq(banners.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
    }
  } catch (error) {
    console.error("[Database] Failed to create banner:", error);
  }
  return undefined;
}

export async function updateBanner(id: number, data: Partial<InsertBanner>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update banner: database not available");
    return;
  }

  try {
    await db.update(banners).set(data).where(eq(banners.id, id));
  } catch (error) {
    console.error("[Database] Failed to update banner:", error);
  }
}

export async function deleteBanner(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete banner: database not available");
    return;
  }

  try {
    await db.delete(banners).where(eq(banners.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete banner:", error);
  }
}

// ============ Product Image Merge Utility ============
/**
 * Merge thumbnail images from product_image_order into product list.
 * This is the single source of truth for product images.
 */
export async function mergeProductThumbnails(productList: Product[]): Promise<Product[]> {
  if (productList.length === 0) return productList;
  const db = await getDb();
  if (!db) return productList;
  try {
    const productIds = productList.map(p => p.id);
    const thumbnails = await db
      .select({
        productId: productImageOrder.productId,
        imageUrl: productImageOrder.imageUrl,
        imageUrlMedium: productImageOrder.imageUrlMedium,
        imageUrlThumb: productImageOrder.imageUrlThumb,
        blurDataUrl: productImageOrder.blurDataUrl,
        isThumbnail: productImageOrder.isThumbnail,
        sortOrder: productImageOrder.sortOrder,
      })
      .from(productImageOrder)
      .where(sql`${productImageOrder.productId} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`);
    const grouped: Record<number, typeof thumbnails> = {};
    for (const t of thumbnails) {
      if (!grouped[t.productId]) grouped[t.productId] = [];
      grouped[t.productId].push(t);
    }
    const thumbnailMap: Record<number, { imageUrl: string; imageUrlMedium: string | null; imageUrlThumb: string | null; blurDataUrl: string | null }> = {};
    for (const [pid, imgs] of Object.entries(grouped)) {
      const thumb = imgs.find(i => i.isThumbnail) || imgs.sort((a, b) => a.sortOrder - b.sortOrder)[0];
      if (thumb) thumbnailMap[Number(pid)] = {
        imageUrl: thumb.imageUrl,
        imageUrlMedium: thumb.imageUrlMedium,
        imageUrlThumb: thumb.imageUrlThumb,
        blurDataUrl: thumb.blurDataUrl,
      };
    }
    return productList.map(p => {
      const thumbData = thumbnailMap[p.id];
      return {
        ...p,
        imageUrl: p.imageUrl || thumbData?.imageUrl || null,
        imageUrlMedium: (p as any).imageUrlMedium || thumbData?.imageUrlMedium || null,
        imageUrlThumb: (p as any).imageUrlThumb || thumbData?.imageUrlThumb || null,
        blurDataUrl: (p as any).blurDataUrl || thumbData?.blurDataUrl || null,
      };
    });
  } catch (e) {
    console.warn("[Product] Failed to merge thumbnail images:", e);
    return productList;
  }
}

/**
 * Merge thumbnail image for a single product from product_image_order.
 */
export async function mergeProductThumbnail(product: Product | null): Promise<Product | null> {
  if (!product) return null;
  const result = await mergeProductThumbnails([product]);
  return result[0] || null;
}

// ============ Product Functions ============
export async function getAllProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get products: database not available");
    return [];
  }

  try {
    return await db.select().from(products).where(eq(products.isVisible, true)).orderBy(desc(products.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get products:", error);
    return [];
  }
}

export async function adminGetAllProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get products: database not available");
    return [];
  }

  try {
    return await db.select().from(products).orderBy(desc(products.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get products:", error);
    return [];
  }
}

export async function getProductById(id: number): Promise<Product | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get product: database not available");
    return null;
  }

  try {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get product by id:", error);
    return null;
  }
}

export interface ProductCategoryFilter {
  search?: string;
  sortBy?: "newest" | "oldest" | "price_asc" | "price_desc" | "rating" | "popular";
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  discountOnly?: boolean;
  limit?: number;
  offset?: number;
}

export async function getProductsByCategory(
  categoryId: number,
  filter?: ProductCategoryFilter
): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get products: database not available");
    return [];
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [eq(products.categoryId, categoryId), eq(products.isVisible, true)];

    // 키워드 검색
    if (filter?.search && filter.search.trim() !== "") {
      const term = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          like(products.nameJa, term),
          like(products.name, term)
        )
      );
    }

    // 가격 범위
    if (filter?.minPrice != null) {
      conditions.push(gte(products.price, filter.minPrice));
    }
    if (filter?.maxPrice != null) {
      conditions.push(lte(products.price, filter.maxPrice));
    }

    // 재고 있는 상품만
    if (filter?.inStockOnly) {
      conditions.push(gt(products.stock, 0));
    }

    // 할인 상품만 (originalPrice > price)
    if (filter?.discountOnly) {
      conditions.push(isNotNull(products.originalPrice));
      conditions.push(gt(products.originalPrice, products.price));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    const limitNum = filter?.limit ?? 200;
    const offsetNum = filter?.offset ?? 0;

    // 정렬
    switch (filter?.sortBy) {
      case "price_asc":
        return await db.select().from(products).where(whereClause).orderBy(asc(products.price)).limit(limitNum).offset(offsetNum);
      case "price_desc":
        return await db.select().from(products).where(whereClause).orderBy(desc(products.price)).limit(limitNum).offset(offsetNum);
      case "rating":
        return await db.select().from(products).where(whereClause).orderBy(desc(products.rating)).limit(limitNum).offset(offsetNum);
      case "popular":
        return await db.select().from(products).where(whereClause).orderBy(desc(products.reviewCount)).limit(limitNum).offset(offsetNum);
      case "oldest":
        return await db.select().from(products).where(whereClause).orderBy(asc(products.createdAt)).limit(limitNum).offset(offsetNum);
      case "newest":
      default:
        // sortOrder ASC 우선, 동점이면 createdAt DESC (관리자 설정 순서 반영)
        return await db.select().from(products).where(whereClause).orderBy(asc(products.sortOrder), desc(products.createdAt)).limit(limitNum).offset(offsetNum);
    }
  } catch (error) {
    console.error("[Database] Failed to get products by category:", error);
    return [];
  }
}

export async function getTimeSaleProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get products: database not available");
    return [];
  }

  try {
    return await db.select().from(products).where(and(eq(products.isTimeSale, true), eq(products.isVisible, true))).orderBy(asc(products.sortOrder), desc(products.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get time sale products:", error);
    return [];
  }
}

export async function getMonthlySaleProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get products: database not available");
    return [];
  }

  try {
    return await db.select().from(products).where(and(eq(products.isMonthlySale, true), eq(products.isVisible, true))).orderBy(asc(products.sortOrder), desc(products.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get monthly sale products:", error);
    return [];
  }
}

export async function getPopularProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get products: database not available");
    return [];
  }
  try {
    return await db.select().from(products).where(and(eq(products.isPopular, true), eq(products.isVisible, true))).orderBy(asc(products.sortOrder), desc(products.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get popular products:", error);
    return [];
  }
}
export async function getNewProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get products: database not available");
    return [];
  }
  try {
    return await db.select().from(products).where(and(eq(products.isNew, true), eq(products.isVisible, true))).orderBy(asc(products.sortOrder), desc(products.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get new products:", error);
    return [];
  }
}

export async function getTodayBestSellingProducts(limit: number = 10): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get today best selling products: database not available");
    return [];
  }
  try {
    // Today's start time: KST midnight (UTC+9) converted to UTC
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const kstMidnight = new Date(kstNow);
    kstMidnight.setUTCHours(0, 0, 0, 0);
    const todayStartUTC = new Date(kstMidnight.getTime() - kstOffset);

    // Format date for SQL comparison
    const todayStartStr = todayStartUTC.toISOString().slice(0, 19).replace('T', ' ');

    // Sum quantity per product from today's non-cancelled orders
    const salesData = await db
      .select({
        productId: orderItems.productId,
        totalQty: sql<number>`SUM(${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        sql`${orders.createdAt} >= ${todayStartStr} AND ${orders.status} != ${'cancelled'}`
      )
      .groupBy(orderItems.productId)
      .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
      .limit(limit);

    if (salesData.length === 0) {
      // Fallback: return popular products if no orders today
      return await db
        .select()
        .from(products)
        .where(and(eq(products.isPopular, true), eq(products.isVisible, true)))
        .orderBy(desc(products.salesCount))
        .limit(limit);
    }

    const productIds = salesData.map((s) => s.productId);
    const productList = await db
      .select()
      .from(products)
      .where(and(inArray(products.id, productIds), eq(products.isVisible, true)));

    // Sort by today's sales order
    const sortedProducts = productIds
      .map((id) => productList.find((p) => p.id === id))
      .filter(Boolean) as Product[];

    return sortedProducts;
  } catch (error) {
    console.error("[Database] Failed to get today best selling products:", error);
    try {
      const db2 = await getDb();
      if (!db2) return [];
      return await db2
        .select()
        .from(products)
        .where(and(eq(products.isPopular, true), eq(products.isVisible, true)))
        .orderBy(desc(products.salesCount))
        .limit(limit);
    } catch {
      return [];
    }
  }
}

export async function getHitProducts(limit: number = 10): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get hit products: database not available");
    return [];
  }
  try {
    return await db.select().from(products)
      .where(and(eq(products.isHit, true), eq(products.isVisible, true)))
      .orderBy(desc(products.sortOrder), desc(products.salesCount))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get hit products:", error);
    return [];
  }
}
export async function getRecommendedProducts(limit: number = 9): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get recommended products: database not available");
    return [];
  }
  try {
    return await db.select().from(products)
      .where(and(eq(products.isRecommended, true), eq(products.isVisible, true)))
      .orderBy(desc(products.sortOrder), desc(products.salesCount))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get recommended products:", error);
    return [];
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot search products: database not available");
    return [];
  }

  try {
    return await db.select().from(products).where(
      and(
        eq(products.isVisible, true),
        or(
          like(products.name, `%${query}%`),
          like(products.nameJa, `%${query}%`),
          like(products.description, `%${query}%`),
          like(products.descriptionJa, `%${query}%`)
        )
      )
    ).orderBy(desc(products.createdAt));
  } catch (error) {
    console.error("[Database] Failed to search products:", error);
    return [];
  }
}

export async function adminCreateProduct(data: InsertProduct): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create product: database not available");
    return undefined;
  }

  try {
    // 자동 증가 정수 ID 생성 (1, 2, 3, ...)
    // ID는 autoincrement이므로 명시적으로 지정하지 않음
    const result = await db.insert(products).values(data);
    
    // 마지막 삽입된 상품 조회
    const [lastProduct] = await db.select().from(products).orderBy(desc(products.id)).limit(1);
    return lastProduct;
  } catch (error) {
    console.error("[Database] Failed to create product:", error);
  }
  return undefined;
}

export async function updateProduct(id: number, data: Partial<InsertProduct>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update product: database not available");
    return;
  }

  try {
    await db.update(products).set(data).where(eq(products.id, id));
  } catch (error) {
    console.error("[Database] Failed to update product:", error);
  }
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete product: database not available");
    return;
  }

  try {
    await db.delete(products).where(eq(products.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete product:", error);
  }
}

// ============ Review Functions ============
export async function getProductReviews(productId: number, sort?: 'newest' | 'highest' | 'lowest' | 'images'): Promise<Review[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get reviews: database not available");
    return [];
  }

  try {
    // Only show approved reviews on public pages
    let query: any = db.select().from(reviews).where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved')));
    if (sort === 'highest') {
      query = query.orderBy(desc(reviews.rating), desc(reviews.createdAt));
    } else if (sort === 'lowest') {
      query = query.orderBy(reviews.rating, desc(reviews.createdAt));
    } else {
      query = query.orderBy(desc(reviews.createdAt));
    }
    const result = await query;
    // For 'images' filter, filter in-memory
    if (sort === 'images') {
      return result.filter((r: Review) => r.images && (r.images as any) !== '[]' && (r.images as any) !== null);
    }
    return result;
  } catch (error) {
    console.error("[Database] Failed to get reviews:", error);
    return [];
  }
}

export async function getAllReviews(limit?: number, offset?: number): Promise<Array<Review & { productImageUrl: string | null; productName: string | null; productNameJa: string | null; productPrice: number | null; userEmail: string | null; userPoints: number }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get reviews: database not available");
    return [];
  }

  try {
    let query: any = db
      .select({
        review: reviews,
        productImageUrl: products.imageUrl,
        productName: products.name,
        productNameJa: products.nameJa,
        productPrice: products.price,
        userEmail: users.email,
        userPoints: users.points,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .leftJoin(users, eq(reviews.userId, users.id))
      .orderBy(desc(reviews.createdAt));
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.offset(offset);
    }
    const rows = await query;
    return rows.map((row: any) => ({
      ...row.review,
      productImageUrl: row.productImageUrl ?? null,
      productName: row.productName ?? null,
      productNameJa: row.productNameJa ?? null,
      productPrice: row.productPrice ?? null,
      userEmail: row.userEmail ?? null,
      userPoints: row.userPoints ?? 0,
    }));
  } catch (error) {
    console.error("[Database] Failed to get all reviews:", error);
    return [];
  }
}

export async function getReviewById(id: number): Promise<(Review & { productImageUrl: string | null; productName: string | null; productNameJa: string | null; productPrice: number | null; userEmail: string | null; userPoints: number }) | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select({
        review: reviews,
        productImageUrl: products.imageUrl,
        productName: products.name,
        productNameJa: products.nameJa,
        productPrice: products.price,
        userEmail: users.email,
        userPoints: users.points,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.id, id))
      .limit(1);
    if (!rows.length) return null;
    const row = rows[0];
    return {
      ...row.review,
      productImageUrl: row.productImageUrl ?? null,
      productName: row.productName ?? null,
      productNameJa: row.productNameJa ?? null,
      productPrice: row.productPrice ?? null,
      userEmail: row.userEmail ?? null,
      userPoints: row.userPoints ?? 0,
    };
  } catch (error) {
    console.error("[Database] Failed to get review by id:", error);
    return null;
  }
}

export async function getLatestReviews(limit: number = 10): Promise<Array<Review & { productImageUrl: string | null; productName: string | null; productNameJa: string | null; userEmail: string | null; userPoints: number }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get reviews: database not available");
    return [];
  }

  try {
    const rows = await db
      .select({
        review: reviews,
        productImageUrl: products.imageUrl,
        productName: products.name,
        productNameJa: products.nameJa,
        userEmail: users.email,
        userPoints: users.points,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.status, 'approved'))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);

    return rows.map(row => ({
      ...row.review,
      productImageUrl: row.productImageUrl ?? null,
      productName: row.productName ?? null,
      productNameJa: row.productNameJa ?? null,
      userEmail: row.userEmail ?? null,
      userPoints: row.userPoints ?? 0,
    }));
  } catch (error) {
    console.error("[Database] Failed to get latest reviews:", error);
    return [];
  }
}

export async function createReview(data: InsertReview): Promise<number | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create review: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(reviews).values(data);
    if (result[0].insertId) {
      // Update product rating and reviewCount
      await db.update(products)
        .set({
          rating: sql`COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE productId = ${data.productId} AND status = 'approved'), 0)`,
          reviewCount: sql`(SELECT COUNT(*) FROM reviews WHERE productId = ${data.productId} AND status = 'approved')`,
        })
        .where(eq(products.id, data.productId));
      return Number(result[0].insertId);
    }
  } catch (error) {
    console.error("[Database] Failed to create review:", error);
  }
  return undefined;
}

// ============ Cart Functions ============
export async function getCartItems(userId: number): Promise<Array<{ cartItem: CartItem; product: Product; priceTier?: any }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get cart items: database not available");
    return [];
  }

  try {
    const items = await db.select().from(cartItems).where(eq(cartItems.userId, userId));
    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        const product = await db.select().from(products).where(eq(products.id, item.productId)).limit(1).then(r => r[0]);
        
        // priceTierId가 있으면 해당 tier 정보도 조회
        let priceTier = null;
        if (item.priceTierId) {
          priceTier = await db.select()
            .from(productPriceTiers)
            .where(eq(productPriceTiers.id, item.priceTierId))
            .limit(1)
            .then(r => r[0] || null);
        }
        
        return {
          cartItem: item,
          product: product || ({} as Product),
          priceTier: priceTier
        };
      })
    );
    return itemsWithProducts;
  } catch (error) {
    console.error("[Database] Failed to get cart items:", error);
    return [];
  }
}

export async function getCartItemCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get cart item count: database not available");
    return 0;
  }

  try {
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(cartItems).where(eq(cartItems.userId, userId));
    return result[0]?.count || 0;
  } catch (error) {
    console.error("[Database] Failed to get cart item count:", error);
    return 0;
  }
}

export async function addToCart(userId: number, productId: number, quantity: number, priceTierId?: number): Promise<CartItem | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add to cart: database not available");
    return undefined;
  }

  try {
    // 수량별 할인 옵션이 다를 경우 별도 항목으로 추가하기 위해
    // 기존 병합 로직을 제거하고 항상 새 항목으로 삽입
    const result = await db.insert(cartItems).values({ 
      userId, 
      productId, 
      quantity,
      priceTierId: priceTierId || null
    });
    if (result[0].insertId) {
      return await db.select().from(cartItems).where(eq(cartItems.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
    }
  } catch (error) {
    console.error("[Database] Failed to add to cart:", error);
  }
  return undefined;
}

export async function updateCartItemQuantity(id: number, quantity: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update cart item: database not available");
    return;
  }

  try {
    await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id));
  } catch (error) {
    console.error("[Database] Failed to update cart item:", error);
  }
}

export async function removeFromCart(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot remove from cart: database not available");
    return;
  }

  try {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  } catch (error) {
    console.error("[Database] Failed to remove from cart:", error);
  }
}

export async function clearCart(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot clear cart: database not available");
    return;
  }

  try {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to clear cart:", error);
  }
}

// 특정 cartItem ID 목록만 삭제 (선택 구매 후 해당 상품만 제거)
export async function removeCartItemsByIds(userId: number, cartItemIds: number[]): Promise<void> {
  if (cartItemIds.length === 0) return;
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot remove cart items: database not available");
    return;
  }

  try {
    await db.delete(cartItems).where(
      and(
        eq(cartItems.userId, userId),
        inArray(cartItems.id, cartItemIds)
      )
    );
  } catch (error) {
    console.error("[Database] Failed to remove cart items by ids:", error);
  }
}

// ============ Email Verification Functions ============
export async function createEmailVerification(email: string, code: string, expiresAt: Date): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create email verification: database not available");
    return;
  }

  try {
    await db.insert(emailVerifications).values({ email, code, expiresAt, verified: false });
  } catch (error) {
    console.error("[Database] Failed to create email verification:", error);
  }
}

export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot verify email code: database not available");
    return false;
  }

  try {
    const result = await db.select().from(emailVerifications).where(
      and(eq(emailVerifications.email, email), eq(emailVerifications.code, code))
    ).limit(1);

    if (result.length > 0 && result[0].expiresAt > new Date()) {
      await db.update(emailVerifications).set({ verified: true }).where(eq(emailVerifications.id, result[0].id));
      return true;
    }
  } catch (error) {
    console.error("[Database] Failed to verify email code:", error);
  }
  return false;
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot check email verification: database not available");
    return false;
  }

  try {
    const result = await db.select().from(emailVerifications).where(
      and(eq(emailVerifications.email, email), eq(emailVerifications.verified, true))
    ).limit(1);
    return result.length > 0;
  } catch (error) {
    console.error("[Database] Failed to check email verification:", error);
  }
  return false;
}

// ============ Registered User Functions ============
export async function getRegisteredUserByEmail(email: string): Promise<RegisteredUser | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get registered user: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(registeredUsers).where(eq(registeredUsers.email, email)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get registered user by email:", error);
    return undefined;
  }
}

export async function createRegisteredUser(data: InsertRegisteredUser): Promise<RegisteredUser | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create registered user: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(registeredUsers).values(data);
    if (result[0].insertId) {
      return await db.select().from(registeredUsers).where(eq(registeredUsers.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
    }
  } catch (error) {
    console.error("[Database] Failed to create registered user:", error);
  }
  return undefined;
}

export async function updateRegisteredUserLastSignIn(email: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update registered user: database not available");
    return;
  }

  try {
    await db.update(registeredUsers).set({ lastSignedIn: new Date() }).where(eq(registeredUsers.email, email));
  } catch (error) {
    console.error("[Database] Failed to update registered user last sign in:", error);
  }
}

export async function updateRegisteredUserPassword(email: string, newPassword: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update registered user password: database not available");
    return;
  }

  try {
    await db.update(registeredUsers).set({ password: newPassword }).where(eq(registeredUsers.email, email));
  } catch (error) {
    console.error("[Database] Failed to update registered user password:", error);
  }
}

export async function getAllRegisteredUsers(): Promise<RegisteredUser[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get registered users: database not available");
    return [];
  }

  try {
    return await db.select().from(registeredUsers)
      .where(eq(registeredUsers.isWithdrawn, false))
      .orderBy(desc(registeredUsers.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get registered users:", error);
    return [];
  }
}

export async function getCustomerDetail(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get customer detail: database not available");
    return null;
  }

  try {
    // Get customer basic info (userId is registeredUsers.id)
    const [customer] = await db.select().from(registeredUsers).where(eq(registeredUsers.id, userId));
    if (!customer) return null;

    // Resolve users.id from openId pattern "email_{registeredUserId}"
    // orders/addresses/reviews/inquiries all store users.id (not registeredUsers.id)
    const openId = `email_${userId}`;
    const [userRow] = await db.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1);
    const actionsUserId = userRow?.id ?? userId;

    // Get customer's orders with items
    const customerOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        totalAmount: orders.totalAmount,
        status: orders.status,
        createdAt: orders.createdAt,
        shippingAddress: orders.shippingAddress,
      })
      .from(orders)
      .where(eq(orders.userId, actionsUserId))
      .orderBy(desc(orders.createdAt));

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      customerOrders.map(async (order) => {
        const items = await db
          .select({
            id: orderItems.id,
            productId: orderItems.productId,
            productName: orderItems.productName,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            imageUrl: orderItems.productImageUrl,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        return { ...order, items };
      })
    );

    // Get customer's inquiries
    const customerInquiries = await db
      .select({
        id: inquiries.id,
        title: inquiries.title,
        content: inquiries.content,
        status: inquiries.status,
        createdAt: inquiries.createdAt,
      })
      .from(inquiries)
      .where(eq(inquiries.userId, actionsUserId))
      .orderBy(desc(inquiries.createdAt));

    // Get customer's reviews
    const customerReviews = await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        rating: reviews.rating,
        content: reviews.content,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(eq(reviews.userId, actionsUserId))
      .orderBy(desc(reviews.createdAt));

    // Get product names for reviews
    const reviewsWithProducts = await Promise.all(
      customerReviews.map(async (review) => {
        const [product] = await db
          .select({ name: products.name, imageUrl: products.imageUrl })
          .from(products)
          .where(eq(products.id, review.productId));
        return { ...review, productName: product?.name, productImageUrl: product?.imageUrl };
      })
    );

    // Get customer notes
    const notes = await db
      .select({
        id: customerNotes.id,
        note: customerNotes.note,
        adminId: customerNotes.adminId,
        createdAt: customerNotes.createdAt,
        updatedAt: customerNotes.updatedAt,
      })
      .from(customerNotes)
      .where(eq(customerNotes.customerId, userId))
      .orderBy(desc(customerNotes.createdAt));

    // Calculate monthly purchase pattern (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const monthlyOrdersResult = await db.execute(
      sql`SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count, SUM(totalAmount) as total FROM orders WHERE userId = ${actionsUserId} AND createdAt >= ${twelveMonthsAgo} GROUP BY DATE_FORMAT(createdAt, '%Y-%m') ORDER BY DATE_FORMAT(createdAt, '%Y-%m')`
    );
    const monthlyOrders = (Array.isArray(monthlyOrdersResult) && Array.isArray(monthlyOrdersResult[0]) ? monthlyOrdersResult[0] : monthlyOrdersResult) as unknown as { month: string; count: number; total: number }[];

    // Calculate preferred categories
    const categoryStats = await db
      .select({
        categoryId: products.categoryId,
        count: sql<number>`COUNT(*)`.as('count'),
        total: sql<number>`SUM(${orderItems.subtotal})`.as('total'),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orders.userId, actionsUserId))
      .groupBy(products.categoryId)
      .orderBy(desc(sql`COUNT(*)`));

    // Get category names
    const categoryStatsWithNames = await Promise.all(
      categoryStats.map(async (stat) => {
        const [category] = await db
          .select({ name: categories.nameJa })
          .from(categories)
          .where(eq(categories.id, stat.categoryId));
        return { ...stat, categoryName: category?.name || '不明' };
      })
    );

    return {
      customer,
      orders: ordersWithItems,
      inquiries: customerInquiries,
      reviews: reviewsWithProducts,
      notes,
      analytics: {
        monthlyPurchases: monthlyOrders,
        preferredCategories: categoryStatsWithNames,
      },
      stats: {
        totalOrders: customerOrders.length,
        totalSpent: customerOrders
          .filter(order => order.status === 'delivered' || order.status === 'completed')
          .reduce((sum, order) => sum + Number(order.totalAmount), 0),
        totalInquiries: customerInquiries.length,
        totalReviews: customerReviews.length,
      },
    };
  } catch (error) {
    console.error("[Database] Failed to get customer detail:", error);
    return null;
  }
}

// ============ Password Reset Token Functions ============
export async function createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create password reset token: database not available");
    return;
  }

  try {
    await db.insert(passwordResetTokens).values({ email, token, expiresAt, used: false });
  } catch (error) {
    console.error("[Database] Failed to create password reset token:", error);
  }
}

export async function getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get password reset token: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(passwordResetTokens).where(
      and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.used, false))
    ).limit(1);
    if (result.length > 0 && result[0].expiresAt > new Date()) {
      return result[0];
    }
  } catch (error) {
    console.error("[Database] Failed to get password reset token:", error);
  }
  return undefined;
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot mark password reset token used: database not available");
    return;
  }

  try {
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.token, token));
  } catch (error) {
    console.error("[Database] Failed to mark password reset token used:", error);
  }
}

// ============ Order Functions ============
export async function createOrder(data: InsertOrder): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create order: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(orders).values(data);
    if (result[0].insertId) {
      return await db.select().from(orders).where(eq(orders.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
    }
  } catch (error) {
    console.error("[Database] Failed to create order:", error);
  }
  return undefined;
}

export async function getOrdersByUserId(userId: number): Promise<(Order & { shipment?: Shipment })[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get orders: database not available");
    return [];
  }

  try {
    const orderList = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    
    // Fetch shipments for each order
    const ordersWithShipments = await Promise.all(
      orderList.map(async (order) => {
        const shipment = await getShipmentByOrderId(order.id);
        return {
          ...order,
          shipment: shipment || undefined,
        };
      })
    );
    
    return ordersWithShipments;
  } catch (error) {
    console.error("[Database] Failed to get orders by user id:", error);
    return [];
  }
}

export async function getOrderById(id: number): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get order: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.id, id))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    // Merge order and user data
    const orderData = result[0].orders;
    const userData = result[0].users;
    
    // Get coupon usage for this order
    let couponInfo = null;
    try {
      const couponUsageResult = await db
        .select({
          discountAmount: couponUsages.discountAmount,
          couponCode: coupons.code,
          couponName: coupons.nameJa,
        })
        .from(couponUsages)
        .innerJoin(coupons, eq(couponUsages.couponId, coupons.id))
        .where(eq(couponUsages.orderId, id))
        .limit(1);
      if (couponUsageResult.length > 0) {
        couponInfo = couponUsageResult[0];
      }
    } catch (e) {
      // coupon info is optional
    }
    
    return {
      ...orderData,
      userEmail: userData?.email,
      userPhone: userData?.phone,
      couponCode: couponInfo?.couponCode || null,
      couponName: couponInfo?.couponName || null,
      couponDiscount: orderData.couponDiscount ? parseFloat(orderData.couponDiscount.toString()) : 0,
      pointsUsed: orderData.pointsUsed || 0,
    } as any;
  } catch (error) {
    console.error("[Database] Failed to get order by id:", error);
    return undefined;
  }
}

export async function adminGetOrderById(id: number): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get order: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get order by id:", error);
    return undefined;
  }
}

export async function getOrderByOrderNumber(orderNumber: string): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get order: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get order by order number:", error);
    return undefined;
  }
}

export async function saveOrderItems(orderId: number, items: any[]): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save order items: database not available");
    return false;
  }

  try {
    for (const item of items) {
      await db.insert(orderItems).values({
        orderId,
        productId: item.productId,
        productName: item.productName,
        productNameJa: item.productNameJa,
        productImageUrl: item.productImageUrl,
        priceTierId: item.priceTierId || null,
        tierName: item.tierName || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: (Number(item.unitPrice) * item.quantity).toString(),
      });
    }
    return true;
  } catch (error) {
    console.error("[Database] Failed to save order items:", error);
    return false;
  }
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get order items: database not available");
    return [];
  }

  try {
    // Simply return stored values from orderItems table
    // These values are saved at order creation time
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    return items;
  } catch (error) {
    console.error("[Database] Failed to get order items:", error);
    return [];
  }
}

export async function getOrdersByCartGroupId(cartGroupId: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(orders).where(eq(orders.cartGroupId, cartGroupId));
  } catch (error) {
    console.error("[Database] Failed to get orders by cartGroupId:", error);
    return [];
  }
}

export async function getItemsByCartGroupId(cartGroupId: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    const groupOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.cartGroupId, cartGroupId));
    if (groupOrders.length === 0) return [];
    const orderIds = groupOrders.map(o => o.id);
    const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
    return items;
  } catch (error) {
    console.error("[Database] Failed to get items by cartGroupId:", error);
    return [];
  }
}

export async function cancelOrder(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot cancel order: database not available");
    return;
  }

  try {
    await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, id));
  } catch (error) {
    console.error("[Database] Failed to cancel order:", error);
  }
}

/**
 * Get delayed shipment orders (shipped more than 14 days ago but not delivered)
 */
export async function getDelayedShipmentOrders(deliveryDelayDays = 14): Promise<(Order & { shipment?: Shipment; daysDelayed: number; trackingHasAlert?: boolean; trackingAlertType?: string | null; trackingAlertDescription?: string | null; userEmail?: string; userName?: string; itemsWithImages?: Array<{ id: number; productName: string; productNameJa: string; quantity: number; imageUrl: string | null; tierName: string | null; unitPrice: string; subtotal: string; discountAmount: string | null; cancelledAt: Date | null; shipment?: Shipment }> })[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get delayed orders: database not available");
    return [];
  }

  try {
    // Get orders with 'shipped' status (with user info for email)
    const shippedOrderRows = await db
      .select({
        order: orders,
        userEmail: users.email,
        userName: users.name,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.status, 'shipped'))
      .orderBy(desc(orders.createdAt));
    const shippedOrders = shippedOrderRows.map(r => ({ ...r.order, userEmail: r.userEmail ?? undefined, userName: r.userName ?? undefined }));

    // Calculate delay for each order
    const now = new Date();
    const delayedOrders: any[] = [];
    const addedOrderIds = new Set<number>();

    for (const order of shippedOrders) {
      const shipment = await getShipmentByOrderId(order.id);

      // Check tracking alert from cache
      let trackingHasAlert = false;
      let trackingAlertType: string | null = null;
      let trackingAlertDescription: string | null = null;
      try {
        const trackingNum = shipment?.trackingNumber;
        if (trackingNum) {
          const cacheRow = await db.select({
            hasAlert: shipmentTrackingCache.hasAlert,
            alertType: shipmentTrackingCache.alertType,
            alertDescription: shipmentTrackingCache.alertDescription,
          }).from(shipmentTrackingCache).where(eq(shipmentTrackingCache.trackingNumber, trackingNum)).limit(1);
          if (cacheRow[0]?.hasAlert) {
            trackingHasAlert = true;
            trackingAlertType = cacheRow[0].alertType || null;
            trackingAlertDescription = cacheRow[0].alertDescription || null;
          }
        }
      } catch {}

      // Calculate days delayed (0 if no shippedAt)
      const daysSinceShipped = order.shippedAt
        ? Math.floor((now.getTime() - new Date(order.shippedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Include orders delayed more than deliveryDelayDays OR with tracking alert
      if (daysSinceShipped > (deliveryDelayDays ?? 14) || trackingHasAlert) {
        addedOrderIds.add(order.id);
        // Fetch itemsWithImages for this order
        let itemsWithImages: Array<{ id: number; productName: string; productNameJa: string; quantity: number; imageUrl: string | null; tierName: string | null; unitPrice: string; subtotal: string; discountAmount: string | null; cancelledAt: Date | null; shipment?: Shipment }> = [];
        try {
          const items = await db.select({
            id: orderItems.id,
            productName: orderItems.productName,
            productNameJa: orderItems.productNameJa,
            quantity: orderItems.quantity,
            imageUrl: orderItems.productImageUrl,
            tierName: orderItems.tierName,
            unitPrice: orderItems.unitPrice,
            subtotal: orderItems.subtotal,
            discountAmount: orderItems.discountAmount,
            cancelledAt: orderItems.cancelledAt,
          }).from(orderItems).where(eq(orderItems.orderId, order.id));
          const allShipments = await db.select().from(shipments).where(eq(shipments.orderId, order.id));
          const shipmentByItemId = new Map<number, Shipment>();
          const orderLevelShipment = allShipments.find(s => s.orderItemId == null);
          for (const s of allShipments) {
            if (s.orderItemId != null) shipmentByItemId.set(s.orderItemId, s);
          }
          itemsWithImages = items.map(item => ({
            id: item.id,
            productName: item.productName || '알 수 없음',
            productNameJa: item.productNameJa || '알 수 없음',
            quantity: item.quantity,
            imageUrl: item.imageUrl,
            tierName: item.tierName,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            discountAmount: item.discountAmount,
            cancelledAt: item.cancelledAt,
            shipment: shipmentByItemId.get(item.id) || orderLevelShipment || undefined,
          }));
        } catch {}
        delayedOrders.push({
          ...order,
          shipment: shipment || undefined,
          daysDelayed: daysSinceShipped,
          trackingHasAlert,
          trackingAlertType,
          trackingAlertDescription,
          itemsWithImages,
        });
      }
    }

    return delayedOrders;
  } catch (error) {
    console.error("[Database] Failed to get delayed orders:", error);
    return [];
  }
}

/**
 * Get orders in 'confirmed' status for more than N days (발송지연 자동 감지)
 */
export async function getShipmentDelayedOrders(shipmentDelayDays = 3): Promise<(Order & { daysDelayed: number })[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get shipment delayed orders: database not available");
    return [];
  }
  try {
    const confirmedOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, 'confirmed'))
      .orderBy(desc(orders.createdAt));
    const now = new Date();
    const result = [];
    for (const order of confirmedOrders) {
      const baseDate = (order as any).paidAt || order.createdAt;
      if (!baseDate) continue;
      const daysSince = Math.floor((now.getTime() - new Date(baseDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= shipmentDelayDays) {
        result.push({ ...order, daysDelayed: daysSince });
      }
    }
    return result;
  } catch (error) {
    console.error("[Database] Failed to get shipment delayed orders:", error);
    return [];
  }
}

export async function getAllOrders(): Promise<(Order & { shipment?: Shipment })[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get orders: database not available");
    return [];
  }

  try {
    const orderList = await db.select().from(orders).orderBy(desc(orders.createdAt));
    
    // Fetch shipments for each order
    const ordersWithShipments = await Promise.all(
      orderList.map(async (order) => {
        const shipment = await getShipmentByOrderId(order.id);
        return {
          ...order,
          shipment: shipment || undefined,
        };
      })
    );
    
    return ordersWithShipments;
  } catch (error) {
    console.error("[Database] Failed to get all orders:", error);
    return [];
  }
}

export async function adminUpdateOrderStatus(id: number, status: Order['status']): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update order: database not available");
    return;
  }

  try {
    const updateData: Record<string, unknown> = { status };
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }
    await db.update(orders).set(updateData as any).where(eq(orders.id, id));
  } catch (error) {
    console.error("[Database] Failed to update order status:", error);
  }
}

// ============ Dashboard Functions ============
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get dashboard stats: database not available");
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalCustomers: 0,
      totalProducts: 0,
      todayOrders: 0,
      todayRevenue: 0,
      todayNewCustomers: 0,
      monthlyRevenue: 0,
    };
  }

  try {
    // 전체 통계
    const ordersCount = await db.select({ count: sql<number>`COUNT(*)` }).from(orders);
    const totalRevenue = await db.select({ sum: sql<number>`SUM(totalAmount)` }).from(orders);
    const customersCount = await db.select({ count: sql<number>`COUNT(DISTINCT userId)` }).from(orders);
    const productsCount = await db.select({ count: sql<number>`COUNT(*)` }).from(products);

    // 오늘의 통계
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayOrdersCount = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(
      and(
        sql`DATE(${orders.createdAt}) = DATE(${today})`,
      )
    );
    const todayRevenueResult = await db.select({ sum: sql<number>`SUM(totalAmount)` }).from(orders).where(
      and(
        sql`DATE(${orders.createdAt}) = DATE(${today})`,
      )
    );

    // 오늘의 신규 고객
    const todayNewCustomersCount = await db.select({ count: sql<number>`COUNT(DISTINCT userId)` }).from(orders).where(
      and(
        sql`DATE(${orders.createdAt}) = DATE(${today})`,
      )
    );

    // 이번 달 매출
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRevenueResult = await db.select({ sum: sql<number>`SUM(totalAmount)` }).from(orders).where(
      and(
        sql`DATE(${orders.createdAt}) >= DATE(${monthStart})`,
        sql`DATE(${orders.createdAt}) <= DATE(${today})`,
      )
    );

    return {
      totalOrders: ordersCount[0]?.count || 0,
      totalRevenue: totalRevenue[0]?.sum || 0,
      totalCustomers: customersCount[0]?.count || 0,
      totalProducts: productsCount[0]?.count || 0,
      todayOrders: todayOrdersCount[0]?.count || 0,
      todayRevenue: todayRevenueResult[0]?.sum || 0,
      todayNewCustomers: todayNewCustomersCount[0]?.count || 0,
      monthlyRevenue: monthlyRevenueResult[0]?.sum || 0,
    };
  } catch (error) {
    console.error("[Database] Failed to get dashboard stats:", error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalCustomers: 0,
      totalProducts: 0,
      todayOrders: 0,
      todayRevenue: 0,
      todayNewCustomers: 0,
      monthlyRevenue: 0,
    };
  }
}

export async function getCustomerOrderStats(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get customer order stats: database not available");
    return {
      totalOrders: 0,
      totalSpent: 0,
    };
  }

  try {
    const ordersCount = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(eq(orders.userId, userId));
    const totalSpent = await db.select({ sum: sql<number>`SUM(totalAmount)` }).from(orders).where(eq(orders.userId, userId));

    return {
      totalOrders: ordersCount[0]?.count || 0,
      totalSpent: totalSpent[0]?.sum || 0,
    };
  } catch (error) {
    console.error("[Database] Failed to get customer order stats:", error);
    return {
      totalOrders: 0,
      totalSpent: 0,
    };
  }
}

// ============ Announcement Functions ============
// TODO: Uncomment after database migration is applied
/*
export async function getAllAnnouncements(): Promise<Announcement[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get announcements: database not available");
    return [];
  }

  try {
    return await db.select().from(announcements).where(eq(announcements.isActive, true)).orderBy(desc(announcements.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get announcements:", error);
    return [];
  }
}

export async function createAnnouncement(data: InsertAnnouncement): Promise<Announcement | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create announcement: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(announcements).values(data);
    if (result[0].insertId) {
      return await db.select().from(announcements).where(eq(announcements.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
    }
  } catch (error) {
    console.error("[Database] Failed to create announcement:", error);
  }
  return undefined;
}

export async function updateAnnouncement(id: number, data: Partial<InsertAnnouncement>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update announcement: database not available");
    return;
  }

  try {
    await db.update(announcements).set(data).where(eq(announcements.id, id));
  } catch (error) {
    console.error("[Database] Failed to update announcement:", error);
  }
}

export async function deleteAnnouncement(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete announcement: database not available");
    return;
  }

  try {
    await db.delete(announcements).where(eq(announcements.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete announcement:", error);
  }
}

export async function incrementAnnouncementViewCount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot increment announcement view count: database not available");
    return;
  }

  try {
    const current = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
    if (current.length > 0) {
      await db.update(announcements).set({ viewCount: (current[0].viewCount || 0) + 1 }).where(eq(announcements.id, id));
    }
  } catch (error) {
    console.error("[Database] Failed to increment announcement view count:", error);
  }
}

// ============ FAQ Functions ============
export async function getAllFAQs(): Promise<FAQ[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get FAQs: database not available");
    return [];
  }

  try {
    return await db.select().from(faqs).where(eq(faqs.isActive, true)).orderBy(faqs.sortOrder);
  } catch (error) {
    console.error("[Database] Failed to get FAQs:", error);
    return [];
  }
}

export async function getFAQsByCategory(category: string): Promise<FAQ[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get FAQs: database not available");
    return [];
  }

  try {
    return await db.select().from(faqs).where(
      and(eq(faqs.isActive, true), eq(faqs.category, category))
    ).orderBy(faqs.sortOrder);
  } catch (error) {
    console.error("[Database] Failed to get FAQs by category:", error);
    return [];
  }
}

export async function createFAQ(data: InsertFAQ): Promise<FAQ | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create FAQ: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(faqs).values(data);
    if (result[0].insertId) {
      return await db.select().from(faqs).where(eq(faqs.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
    }
  } catch (error) {
    console.error("[Database] Failed to create FAQ:", error);
  }
  return undefined;
}

export async function updateFAQ(id: number, data: Partial<InsertFAQ>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update FAQ: database not available");
    return;
  }

  try {
    await db.update(faqs).set(data).where(eq(faqs.id, id));
  } catch (error) {
    console.error("[Database] Failed to update FAQ:", error);
  }
}

export async function deleteFAQ(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete FAQ: database not available");
    return;
  }

  try {
    await db.delete(faqs).where(eq(faqs.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete FAQ:", error);
  }
}
*/


// ============ Announcement Functions ============
export async function getAllAnnouncements(): Promise<Announcement[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get announcements: database not available");
    return [];
  }

  try {
    return await db.select().from(announcements).where(eq(announcements.isActive, true)).orderBy(desc(announcements.sortOrder), desc(announcements.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get announcements:", error);
    return [];
  }
}

export async function adminGetAllAnnouncements(): Promise<Announcement[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get announcements: database not available");
    return [];
  }

  try {
    return await db.select().from(announcements).orderBy(desc(announcements.sortOrder), desc(announcements.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get announcements:", error);
    return [];
  }
}

export async function getAnnouncementById(id: number): Promise<Announcement | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get announcement: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get announcement by id:", error);
    return undefined;
  }
}

export async function createAnnouncement(data: InsertAnnouncement): Promise<Announcement | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create announcement: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(announcements).values(data);
    if (result[0].insertId) {
      return await db.select().from(announcements).where(eq(announcements.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
    }
  } catch (error) {
    console.error("[Database] Failed to create announcement:", error);
  }
  return undefined;
}

export async function updateAnnouncement(id: number, data: Partial<InsertAnnouncement>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update announcement: database not available");
    return;
  }

  try {
    await db.update(announcements).set(data).where(eq(announcements.id, id));
  } catch (error) {
    console.error("[Database] Failed to update announcement:", error);
  }
}

export async function deleteAnnouncement(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete announcement: database not available");
    return;
  }

  try {
    await db.delete(announcements).where(eq(announcements.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete announcement:", error);
  }
}

// ============ Announcement Comment Functions ============
export async function getAnnouncementComments(announcementId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get announcement comments: database not available");
    return [];
  }

  try {
    const comments = await db
      .select({
        id: announcementComments.id,
        announcementId: announcementComments.announcementId,
        userId: announcementComments.userId,
        content: announcementComments.content,
        isActive: announcementComments.isActive,
        createdAt: announcementComments.createdAt,
        updatedAt: announcementComments.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(announcementComments)
      .leftJoin(users, eq(announcementComments.userId, users.id))
      .where(and(
        eq(announcementComments.announcementId, announcementId),
        eq(announcementComments.isActive, true)
      ))
      .orderBy(desc(announcementComments.createdAt));
    
    return comments as any;
  } catch (error) {
    console.error("[Database] Failed to get announcement comments:", error);
    return [];
  }
}

export async function createAnnouncementComment(data: InsertAnnouncementComment): Promise<AnnouncementComment | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create announcement comment: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(announcementComments).values(data);
    if (result[0]?.insertId) {
      return {
        id: Number(result[0].insertId),
        ...data,
      } as AnnouncementComment;
    }
  } catch (error) {
    console.error("[Database] Failed to create announcement comment:", error);
  }
  return undefined;
}

export async function deleteAnnouncementComment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete announcement comment: database not available");
    return;
  }

  try {
    await db.delete(announcementComments).where(eq(announcementComments.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete announcement comment:", error);
  }
}

export async function updateAnnouncementComment(id: number, content: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update announcement comment: database not available");
    return;
  }

  try {
    await db
      .update(announcementComments)
      .set({ content, updatedAt: new Date() })
      .where(eq(announcementComments.id, id));
  } catch (error) {
    console.error("[Database] Failed to update announcement comment:", error);
  }
}


// ============ Inquiry Functions ============
export async function getAllInquiries(): Promise<Inquiry[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get inquiries: database not available");
    return [];
  }

  try {
    const result = await db.select().from(inquiries).where(eq(inquiries.isActive, true)).orderBy(desc(inquiries.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get inquiries:", error);
    return [];
  }
}

export async function getInquiryById(id: number): Promise<Inquiry | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get inquiry: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get inquiry by id:", error);
    return undefined;
  }
}

export async function createInquiry(data: InsertInquiry): Promise<Inquiry | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create inquiry: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(inquiries).values(data);
    if (result[0].insertId) {
      return await db.select().from(inquiries).where(eq(inquiries.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
    }
  } catch (error) {
    console.error("[Database] Failed to create inquiry:", error);
  }
  return undefined;
}

export async function updateInquiry(id: number, data: Partial<InsertInquiry>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update inquiry: database not available");
    return;
  }

  try {
    await db.update(inquiries).set(data).where(eq(inquiries.id, id));
  } catch (error) {
    console.error("[Database] Failed to update inquiry:", error);
  }
}

export async function deleteInquiry(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete inquiry: database not available");
    return;
  }

  try {
    await db.delete(inquiries).where(eq(inquiries.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete inquiry:", error);
  }
}

export async function incrementInquiryViewCount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot increment inquiry view count: database not available");
    return;
  }

  try {
    await db
      .update(inquiries)
      .set({ viewCount: sql`${inquiries.viewCount} + 1` })
      .where(eq(inquiries.id, id));
  } catch (error) {
    console.error("[Database] Failed to increment inquiry view count:", error);
  }
}

// ============ Inquiry Comment Functions ============
export async function getInquiryComments(inquiryId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get inquiry comments: database not available");
    return [];
  }

  try {
    const comments = await db
      .select({
        id: inquiryComments.id,
        inquiryId: inquiryComments.inquiryId,
        userId: inquiryComments.userId,
        content: inquiryComments.content,
        imageUrl: inquiryComments.imageUrl,
        imageUrls: inquiryComments.image_urls,
        isActive: inquiryComments.isActive,
        isAiGenerated: inquiryComments.isAiGenerated,
        needsReview: inquiryComments.needsReview,
        createdAt: inquiryComments.createdAt,
        updatedAt: inquiryComments.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(inquiryComments)
      .leftJoin(users, eq(inquiryComments.userId, users.id))
      .where(and(
        eq(inquiryComments.inquiryId, inquiryId),
        eq(inquiryComments.isActive, true)
      ))
      .orderBy(desc(inquiryComments.createdAt));
    
    return comments as any;
  } catch (error) {
    console.error("[Database] Failed to get inquiry comments:", error);
    return [];
  }
}

export async function createInquiryComment(data: InsertInquiryComment): Promise<InquiryComment | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create inquiry comment: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(inquiryComments).values(data);
    if (result[0]?.insertId) {
      return {
        id: Number(result[0].insertId),
        ...data,
      } as InquiryComment;
    }
  } catch (error) {
    console.error("[Database] Failed to create inquiry comment:", error);
  }
  return undefined;
}

export async function deleteInquiryComment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete inquiry comment: database not available");
    return;
  }

  try {
    await db.delete(inquiryComments).where(eq(inquiryComments.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete inquiry comment:", error);
  }
}

export async function updateInquiryComment(id: number, content: string, imageUrl?: string | null): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update inquiry comment: database not available");
    return;
  }
  try {
    const updateData: Record<string, unknown> = { content, updatedAt: new Date() };
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    await db
      .update(inquiryComments)
      .set(updateData)
      .where(eq(inquiryComments.id, id));
  } catch (error) {
    console.error("[Database] Failed to update inquiry comment:", error);
  }
}

export async function updateInquiryCommentFull(
  id: number,
  content: string,
  imageUrl?: string | null,
  imageUrls?: string | null
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update inquiry comment: database not available");
    return;
  }
  try {
    const updateData: Record<string, unknown> = { content, updatedAt: new Date() };
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (imageUrls !== undefined) updateData.image_urls = imageUrls;
    await db
      .update(inquiryComments)
      .set(updateData)
      .where(eq(inquiryComments.id, id));
  } catch (error) {
    console.error("[Database] Failed to update inquiry comment (full):", error);
  }
}


// ============ Event Functions ============
export async function getAllEvents(): Promise<Event[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get events: database not available");
    return [];
  }

  try {
    return await db.select().from(events).where(eq(events.isActive, true)).orderBy(desc(events.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get events:", error);
    return [];
  }
}

export async function getEventById(id: number): Promise<Event | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get event: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get event by id:", error);
    return undefined;
  }
}

export async function createEvent(data: InsertEvent): Promise<Event | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create event: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(events).values(data);
    if (result[0]?.insertId) {
      return await db.select().from(events).where(eq(events.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
    }
  } catch (error) {
    console.error("[Database] Failed to create event:", error);
  }
  return undefined;
}

export async function updateEvent(id: number, data: Partial<InsertEvent>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update event: database not available");
    return;
  }

  try {
    await db.update(events).set(data).where(eq(events.id, id));
  } catch (error) {
    console.error("[Database] Failed to update event:", error);
  }
}

export async function deleteEvent(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete event: database not available");
    return;
  }

  try {
    await db.delete(events).where(eq(events.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete event:", error);
  }
}

export async function incrementEventViewCount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot increment event view count: database not available");
    return;
  }

  try {
    await db
      .update(events)
      .set({ viewCount: sql`${events.viewCount} + 1` })
      .where(eq(events.id, id));
  } catch (error) {
    console.error("[Database] Failed to increment event view count:", error);
  }
}

export async function adminGetAllEvents(): Promise<Event[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get events: database not available");
    return [];
  }

  try {
    return await db.select().from(events).orderBy(desc(events.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get events:", error);
    return [];
  }
}


/**
 * Wishlist operations
 */
export async function addToWishlist(userId: number, productId: number): Promise<Wishlist | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add to wishlist: database not available");
    return null;
  }

  try {
    const result = await db.insert(wishlists).values({ userId, productId });
    return { id: result[0].insertId as number, userId, productId, createdAt: new Date() };
  } catch (error) {
    console.error("[Database] Failed to add to wishlist:", error);
    return null;
  }
}

export async function removeFromWishlist(userId: number, productId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot remove from wishlist: database not available");
    return false;
  }

  try {
    await db.delete(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)));
    return true;
  } catch (error) {
    console.error("[Database] Failed to remove from wishlist:", error);
    return false;
  }
}

export async function getUserWishlist(userId: number): Promise<(Wishlist & { product: Product })[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get wishlist: database not available");
    return [];
  }

  try {
    return await db
      .select()
      .from(wishlists)
      .leftJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.userId, userId))
      .orderBy(desc(wishlists.createdAt))
      .then((rows) =>
        rows
          .filter((row) => row.products !== null)
          .map((row) => ({
            ...row.wishlists,
            product: row.products!,
          }))
      );
  } catch (error) {
    console.error("[Database] Failed to get wishlist:", error);
    return [];
  }
}

export async function isInWishlist(userId: number, productId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot check wishlist: database not available");
    return false;
  }

  try {
    const result = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
      .limit(1);
    return result.length > 0;
  } catch (error) {
    console.error("[Database] Failed to check wishlist:", error);
    return false;
  }
}

/**
 * Update user profile information
 */
export async function updateUserProfile(
  openId: string,
  data: {
    name?: string;
    nameKanji?: string;
    nameHiragana?: string;
    phone?: string;
    address?: string;
  }
): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user profile: database not available");
    return undefined;
  }

  try {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.nameKanji !== undefined) updateData.nameKanji = data.nameKanji;
    if (data.nameHiragana !== undefined) updateData.nameHiragana = data.nameHiragana;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;

    await db.update(users).set(updateData).where(eq(users.openId, openId));

    // Return updated user
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to update user profile:", error);
    return undefined;
  }
}

/**
 * Update registered user profile information
 */
export async function updateRegisteredUserProfile(
  email: string,
  data: {
    nameKanji?: string;
    nameHiragana?: string;
    lastNameKanji?: string;
    firstNameKanji?: string;
    lastNameKatakana?: string;
    firstNameKatakana?: string;
    gender?: "male" | "female" | "no_answer";
    phone?: string;
    address?: string;
  }
): Promise<RegisteredUser | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update registered user profile: database not available");
    return undefined;
  }

  try {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (data.nameKanji !== undefined) updateData.nameKanji = data.nameKanji;
    if (data.nameHiragana !== undefined) updateData.nameHiragana = data.nameHiragana;
    if (data.lastNameKanji !== undefined) updateData.lastNameKanji = data.lastNameKanji;
    if (data.firstNameKanji !== undefined) updateData.firstNameKanji = data.firstNameKanji;
    if (data.lastNameKatakana !== undefined) updateData.lastNameKatakana = data.lastNameKatakana;
    if (data.firstNameKatakana !== undefined) updateData.firstNameKatakana = data.firstNameKatakana;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;;

    await db.update(registeredUsers).set(updateData).where(eq(registeredUsers.email, email));

    // Return updated user
    const result = await db.select().from(registeredUsers).where(eq(registeredUsers.email, email)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to update registered user profile:", error);
    return undefined;
  }
}


// ============ Shipment Tracking Functions ============
export async function getShipmentByOrderId(orderId: number): Promise<Shipment | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get shipment: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get shipment:", error);
    return undefined;
  }
}

export async function getShipmentByTrackingNumber(trackingNumber: string): Promise<Shipment | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get shipment: database not available");
    return undefined;
  }
  try {
    const result = await db.select().from(shipments).where(eq(shipments.trackingNumber, trackingNumber)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get shipment by tracking number:", error);
    return undefined;
  }
}

export async function getShipmentEvents(shipmentId: number): Promise<ShipmentEvent[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get shipment events: database not available");
    return [];
  }

  try {
    return await db.select().from(shipmentEvents)
      .where(eq(shipmentEvents.shipmentId, shipmentId))
      .orderBy(desc(shipmentEvents.timestamp));
  } catch (error) {
    console.error("[Database] Failed to get shipment events:", error);
    return [];
  }
}

export async function createShipment(data: InsertShipment): Promise<Shipment | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create shipment: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(shipments).values(data);
    if (result[0].insertId) {
      return await db.select().from(shipments).where(eq(shipments.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
    }
  } catch (error) {
    console.error("[Database] Failed to create shipment:", error);
  }
  return undefined;
}

export async function updateShipmentStatus(shipmentId: number, status: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update shipment status: database not available");
    return;
  }

  try {
    await db.update(shipments)
      .set({ status: status as any })
      .where(eq(shipments.id, shipmentId));
  } catch (error) {
    console.error("[Database] Failed to update shipment status:", error);
  }
}

export async function updateShipmentTrackingNumber(orderId: number, trackingNumber: string, carrier: string = "Japan Post"): Promise<Shipment | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update shipment tracking number: database not available");
    return undefined;
  }

  try {
    // First, get or create shipment for this order
    const existingShipment = await getShipmentByOrderId(orderId);
    
    if (existingShipment) {
      // Update existing shipment
      await db.update(shipments)
        .set({ 
          trackingNumber: trackingNumber,
          carrier: carrier,
          updatedAt: new Date()
        })
        .where(eq(shipments.id, existingShipment.id));
      
      return await db.select().from(shipments).where(eq(shipments.id, existingShipment.id)).limit(1).then(r => r[0]);
    } else {
      // Create new shipment
      const newShipment = await createShipment({
        orderId,
        trackingNumber,
        carrier,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return newShipment;
    }
  } catch (error) {
    console.error("[Database] Failed to update shipment tracking number:", error);
    return undefined;
  }
}

export async function addShipmentEvent(data: InsertShipmentEvent): Promise<ShipmentEvent | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add shipment event: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(shipmentEvents).values(data);
    if (result[0].insertId) {
      return await db.select().from(shipmentEvents).where(eq(shipmentEvents.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
    }
  } catch (error) {
    console.error("[Database] Failed to add shipment event:", error);
  }
  return undefined;
}


// ============ Dashboard Analytics Functions ============

/**
 * Get daily revenue for the last 7 days
 */
export async function getDailyRevenueChart() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get daily revenue: database not available");
    return [];
  }

  try {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const result = await db.select({ sum: sql<number>`SUM(totalAmount)` }).from(orders).where(
        and(
          sql`DATE(${orders.createdAt}) = DATE(${date})`,
        )
      );

      last7Days.push({
        date: date.toISOString().split('T')[0],
        revenue: result[0]?.sum || 0,
      });
    }

    return last7Days;
  } catch (error) {
    console.error("[Database] Failed to get daily revenue:", error);
    return [];
  }
}

/**
 * Get top 5 products by sales volume in the last 30 days
 */
export async function getTopProductsBySales() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get top products: database not available");
    return [];
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
      totalRevenue: sql<number>`SUM(${orderItems.subtotal})`,
    })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(sql`DATE(${orders.createdAt}) >= DATE(${thirtyDaysAgo})`)
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
      .limit(5);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get top products:", error);
    return [];
  }
}

/**
 * Get recent 5 orders with customer info
 */
export async function getRecentOrders() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get recent orders: database not available");
    return [];
  }

  try {
    const result = await db.select({
      id: orders.id,
      userId: orders.userId,
      customerName: users.name,
      customerEmail: users.email,
      totalAmount: orders.totalAmount,
      status: orders.status,
      createdAt: orders.createdAt,
      itemCount: sql<number>`COUNT(${orderItems.id})`,
    })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .groupBy(orders.id, users.name, users.email)
      .orderBy(desc(orders.createdAt))
      .limit(5);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get recent orders:", error);
    return [];
  }
}

// ============ Announcement Pin Toggle Function ============
export async function toggleAnnouncementPin(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot toggle announcement pin: database not available");
    return;
  }

  try {
    // 현재 isPinned 상태를 조회
    const announcement = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);

    if (announcement.length === 0) {
      console.warn("[Database] Announcement not found:", id);
      return;
    }

    // isPinned 상태를 토글
    const newPinnedState = !announcement[0].isPinned;
    await db
      .update(announcements)
      .set({ isPinned: newPinnedState })
      .where(eq(announcements.id, id));

    console.log(`[Database] Announcement ${id} pin toggled to ${newPinnedState}`);
  } catch (error) {
    console.error("[Database] Failed to toggle announcement pin:", error);
  }
}


// ============ Product Image Upload Functions ============
export async function updateProductImages(productId: number, imageUrls: string[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update product images: database not available");
    return;
  }

  try {
    // imageUrls를 JSON 문자열로 저장
    const imageUrlsJson = JSON.stringify(imageUrls);
    await db
      .update(products)
      .set({ imageUrls: imageUrlsJson })
      .where(eq(products.id, productId));
    console.log(`[Database] Product ${productId} images updated: ${imageUrls.length} images`);
  } catch (error) {
    console.error("[Database] Failed to update product images:", error);
  }
}

export async function getProductImages(productId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get product images: database not available");
    return [];
  }

  try {
    const result = await db
      .select({ imageUrls: products.imageUrls })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    
    if (result.length === 0) {
      return [];
    }

    const imageUrlsJson = result[0].imageUrls;
    if (!imageUrlsJson) {
      return [];
    }

    try {
      return JSON.parse(imageUrlsJson);
    } catch (e) {
      console.warn("[Database] Failed to parse product images JSON:", e);
      return [];
    }
  } catch (error) {
    console.error("[Database] Failed to get product images:", error);
    return [];
  }
}

// ============ Related Products Functions ============

/**
 * Get products by similar tags (태그 기반 추천)
 */
export async function getProductsByTags(productId: number, limit: number = 4): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get products by tags: database not available");
    return [];
  }

  try {
    // 현재 상품의 searchTags 조회
    const currentProduct = await db
      .select({ searchTags: products.searchTags, categoryId: products.categoryId })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (currentProduct.length === 0 || !currentProduct[0].searchTags) {
      // searchTags가 없으면 카테고리 기반 추천으로 폴백
      return getRelatedProducts(productId, limit);
    }

    const currentTags = currentProduct[0].searchTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    const categoryId = currentProduct[0].categoryId;

    if (currentTags.length === 0) {
      // 태그가 비어있으면 카테고리 기반 추천으로 폴백
      return getRelatedProducts(productId, limit);
    }

    // 같은 태그를 가진 상품 조회 (현재 상품 제외)
    // SQL LIKE를 사용하여 태그 매칭
    const tagConditions = currentTags.map(tag => 
      sql`${products.searchTags} LIKE ${`%${tag}%`}`
    );

    const relatedProducts = await db
      .select()
      .from(products)
      .where(
        sql`${products.id} != ${productId} AND ${products.isVisible} = 1 AND (${sql.join(tagConditions, sql` OR `)})`
      )
      .orderBy(desc(products.createdAt))
      .limit(limit * 2); // 더 많이 가져와서 필터링

    // 태그 매칭 점수 계산
    const scoredProducts = relatedProducts.map(product => {
      const productTags = (product.searchTags || '').split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      const matchCount = currentTags.filter(tag => productTags.includes(tag)).length;
      return { product, score: matchCount };
    });

    // 점수 기준으로 정렬하고 limit만큼 반환
    const sortedProducts = scoredProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.product);

    // 태그 기반 추천이 부족하면 카테고리 기반으로 보완
    if (sortedProducts.length < limit) {
      const existingIds = sortedProducts.map(p => p.id);
      const categoryProducts = await db
        .select()
        .from(products)
        .where(
          existingIds.length > 0
            ? sql`${products.categoryId} = ${categoryId} AND ${products.id} != ${productId} AND ${products.isVisible} = 1 AND ${products.id} NOT IN (${sql.join(existingIds.map(id => sql`${id}`), sql`, `)})`
            : sql`${products.categoryId} = ${categoryId} AND ${products.id} != ${productId} AND ${products.isVisible} = 1`
        )
        .orderBy(desc(products.createdAt))
        .limit(limit - sortedProducts.length);

      return [...sortedProducts, ...categoryProducts];
    }

    return sortedProducts;
  } catch (error) {
    console.error("[Database] Failed to get products by tags:", error);
    // 에러 발생 시 카테고리 기반 추천으로 폴백
    return getRelatedProducts(productId, limit);
  }
}

export async function getRelatedProducts(productId: number, limit: number = 4): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get related products: database not available");
    return [];
  }

  try {
    // 현재 상품의 카테고리 조회
    const currentProduct = await db
      .select({ categoryId: products.categoryId })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (currentProduct.length === 0) {
      return [];
    }

    const categoryId = currentProduct[0].categoryId;

    // 같은 카테고리의 다른 상품 조회 (현재 상품 제외)
    const relatedProducts = await db
      .select()
      .from(products)
      .where(
        sql`${products.categoryId} = ${categoryId} AND ${products.id} != ${productId} AND ${products.isVisible} = 1`
      )
      .orderBy(desc(products.createdAt))
      .limit(limit);

    return relatedProducts;
  } catch (error) {
    console.error("[Database] Failed to get related products:", error);
    return [];
  }
}


/**
 * Track user product view for personalized recommendations
 */
export async function trackProductView(userId: number, productId: number, categoryId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot track product view: database not available");
    return;
  }

  try {
    const existing = await db
      .select()
      .from(productViews)
      .where(and(eq(productViews.userId, userId), eq(productViews.productId, productId)))
      .limit(1);

    if (existing.length > 0) {
      // Update existing view record
      await db
        .update(productViews)
        .set({
          viewCount: sql`${productViews.viewCount} + 1`,
          lastViewedAt: new Date()
        })
        .where(and(eq(productViews.userId, userId), eq(productViews.productId, productId)));
    } else {
      // Create new view record
      await db.insert(productViews).values({
        userId,
        productId,
        categoryId,
        viewCount: 1,
        lastViewedAt: new Date()
      });
    }
  } catch (error) {
    console.error("[Database] Failed to track product view:", error);
  }
}

/**
 * Get personalized product recommendations based on user's purchase and view history
 */
export async function getPersonalizedRecommendations(userId: number, limit: number = 6): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get recommendations: database not available");
    return [];
  }

  try {
    // Get user's most viewed categories (from product views)
    const viewedCategories = await db
      .select({
        categoryId: productViews.categoryId,
        totalViews: sql<number>`SUM(${productViews.viewCount})`
      })
      .from(productViews)
      .where(eq(productViews.userId, userId))
      .groupBy(productViews.categoryId)
      .orderBy(desc(sql`SUM(${productViews.viewCount})`))
      .limit(3);

    // Get user's purchased product categories
    const purchasedCategories = await db
      .select({
        categoryId: products.categoryId
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orders.userId, userId))
      .groupBy(products.categoryId);

    // Combine categories (prioritize viewed categories, then purchased categories)
    const categoryIds = new Set<number>();
    viewedCategories.forEach(vc => categoryIds.add(vc.categoryId));
    purchasedCategories.forEach(pc => categoryIds.add(pc.categoryId));

    if (categoryIds.size === 0) {
      // If user has no history, return popular products
      return await db
        .select()
        .from(products)
        .where(and(eq(products.isPopular, true), eq(products.isVisible, true)))
        .orderBy(desc(products.rating))
        .limit(limit);
    }

    // Get products from user's interested categories
    const categoryArray = Array.from(categoryIds);
    const recommendations = await db
      .select()
      .from(products)
      .where(
        sql`${products.categoryId} IN (${sql.raw(categoryArray.join(','))}) AND ${products.id} NOT IN (
          SELECT DISTINCT ${orderItems.productId} FROM ${orderItems}
          INNER JOIN ${orders} ON ${orderItems.orderId} = ${orders.id}
          WHERE ${orders.userId} = ${userId}
        ) AND ${products.isVisible} = 1`
      )
      .orderBy(desc(products.rating), desc(products.salesCount))
      .limit(limit);

    return recommendations;
  } catch (error) {
    console.error("[Database] Failed to get personalized recommendations:", error);
    return [];
  }
}

/**
 * Get recommended products for a specific product (considering user's history)
 */
export async function getSmartRelatedProducts(userId: number | null, productId: number, categoryId: number, limit: number = 6): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get smart related products: database not available");
    return [];
  }

  try {
    if (!userId) {
      // For anonymous users, return products from the same category
      return await db
        .select()
        .from(products)
        .where(
          sql`${products.categoryId} = ${categoryId} AND ${products.id} != ${productId} AND ${products.isVisible} = 1`
        )
        .orderBy(desc(products.rating), desc(products.salesCount))
        .limit(limit);
    }

    // For authenticated users, prioritize products from categories they've viewed
    const userViewedCategories = await db
      .select({
        categoryId: productViews.categoryId,
        totalViews: sql<number>`SUM(${productViews.viewCount})`
      })
      .from(productViews)
      .where(eq(productViews.userId, userId))
      .groupBy(productViews.categoryId)
      .orderBy(desc(sql`SUM(${productViews.viewCount})`))
      .limit(2);

    const categoryIds = [categoryId];
    userViewedCategories.forEach(vc => {
      if (vc.categoryId !== categoryId) {
        categoryIds.push(vc.categoryId);
      }
    });

    const recommendations = await db
      .select()
      .from(products)
      .where(
        sql`${products.categoryId} IN (${sql.raw(categoryIds.join(','))}) AND ${products.id} != ${productId} AND ${products.isVisible} = 1`
      )
      .orderBy(desc(products.rating), desc(products.salesCount))
      .limit(limit);

    return recommendations;
  } catch (error) {
    console.error("[Database] Failed to get smart related products:", error);
    return [];
  }
}


/**
 * Get recently viewed products for a user
 */
export async function getRecentlyViewedProducts(userId: number, limit: number = 8): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get recently viewed products: database not available");
    return [];
  }

  try {
    const viewedProductIds = await db
      .select({
        productId: productViews.productId
      })
      .from(productViews)
      .where(eq(productViews.userId, userId))
      .orderBy(desc(productViews.lastViewedAt))
      .limit(limit);

    if (viewedProductIds.length === 0) {
      return [];
    }

    const productIdList = viewedProductIds.map(v => v.productId);
    const recentProducts = await db
      .select()
      .from(products)
      .where(
        sql`${products.id} IN (${sql.raw(productIdList.join(','))}) AND ${products.isVisible} = 1`
      );

    // Sort by the order of lastViewedAt
    const viewedMap = new Map(viewedProductIds.map((v, idx) => [v.productId, idx]));
    return recentProducts.sort((a, b) => {
      const aIdx = viewedMap.get(a.id) ?? Infinity;
      const bIdx = viewedMap.get(b.id) ?? Infinity;
      return aIdx - bIdx;
    });
  } catch (error) {
    console.error("[Database] Failed to get recently viewed products:", error);
    return [];
  }
}


// ============ Product Sales Info Functions ============
/**
 * Get or create product sales info
 */
export async function getOrCreateProductSalesInfo(productId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get product sales info: database not available");
    return null;
  }

  try {
    const { productSalesInfo } = await import("../drizzle/schema");
    
    let salesInfo = await db
      .select()
      .from(productSalesInfo)
      .where(eq(productSalesInfo.productId, productId))
      .then(rows => rows[0] || null);

    if (!salesInfo) {
      // Create new sales info
      await db.insert(productSalesInfo).values({
        productId,
        cost: null,
        marginPercent: null,
        timeSaleDiscountPercent: 0,
        monthlySaleDiscountPercent: 0,
      });

      salesInfo = await db
        .select()
        .from(productSalesInfo)
        .where(eq(productSalesInfo.productId, productId))
        .then(rows => rows[0] || null);
    }

    return salesInfo;
  } catch (error) {
    console.error("[Database] Failed to get or create product sales info:", error);
    return null;
  }
}

/**
 * Update product sales info
 */
export async function updateProductSalesInfo(productId: number, data: {
  cost?: string | null;
  marginPercent?: string | null;
  timeSaleStartAt?: Date | null;
  timeSaleEndAt?: Date | null;
  timeSaleDiscountPercent?: number | null;
  monthlySaleDiscountPercent?: number | null;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update product sales info: database not available");
    return null;
  }

  try {
    const { productSalesInfo } = await import("../drizzle/schema");
    
    const updateData: Record<string, unknown> = {};
    
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.marginPercent !== undefined) updateData.marginPercent = data.marginPercent;
    if (data.timeSaleStartAt !== undefined) updateData.timeSaleStartAt = data.timeSaleStartAt;
    if (data.timeSaleEndAt !== undefined) updateData.timeSaleEndAt = data.timeSaleEndAt;
    if (data.timeSaleDiscountPercent !== undefined) updateData.timeSaleDiscountPercent = data.timeSaleDiscountPercent;
    if (data.monthlySaleDiscountPercent !== undefined) updateData.monthlySaleDiscountPercent = data.monthlySaleDiscountPercent;
    
    updateData.updatedAt = new Date();

    await db
      .update(productSalesInfo)
      .set(updateData)
      .where(eq(productSalesInfo.productId, productId));

    return await getOrCreateProductSalesInfo(productId);
  } catch (error) {
    console.error("[Database] Failed to update product sales info:", error);
    return null;
  }
}

// ============ Product Stock History Functions ============
/**
 * Add stock history record
 */
export async function addStockHistory(productId: number, previousStock: number, newStock: number, changeReason: string, orderId?: number, notes?: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add stock history: database not available");
    return null;
  }

  try {
    const { productStockHistory } = await import("../drizzle/schema");
    
    const result = await db.insert(productStockHistory).values({
      productId,
      previousStock,
      newStock,
      changeReason,
      orderId: orderId || null,
      notes: notes || null,
    });

    return result;
  } catch (error) {
    console.error("[Database] Failed to add stock history:", error);
    return null;
  }
}

/**
 * Get stock history for a product
 */
export async function getStockHistory(productId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get stock history: database not available");
    return [];
  }

  try {
    const { productStockHistory } = await import("../drizzle/schema");
    
    const history = await db
      .select()
      .from(productStockHistory)
      .where(eq(productStockHistory.productId, productId))
      .orderBy(desc(productStockHistory.createdAt))
      .limit(limit);

    return history;
  } catch (error) {
    console.error("[Database] Failed to get stock history:", error);
    return [];
  }
}

// ============ Product Image Order Functions ============
/**
 * Get product images with order from productImageOrder table
 */
export async function getProductImageOrder(productId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get product images: database not available");
    return [];
  }

  try {
    const { productImageOrder } = await import("../drizzle/schema");
    
    const images = await db
      .select()
      .from(productImageOrder)
      .where(eq(productImageOrder.productId, productId))
      .orderBy(asc(productImageOrder.sortOrder));

    // Fallback: if no images in productImageOrder, use products.imageUrl
    if (images.length === 0) {
      const productRows = await db
        .select({ imageUrl: products.imageUrl })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);
      if (productRows.length > 0 && productRows[0].imageUrl) {
        // Return a virtual image record (not saved to DB) so the UI can display it
        return [{
          id: -1,
          productId,
          imageUrl: productRows[0].imageUrl,
          imageUrlMedium: null,
          imageUrlThumb: null,
          blurDataUrl: null,
          sortOrder: 0,
          isThumbnail: true,
          width: null,
          height: null,
          fileSize: null,
          optimized: false,
          createdAt: new Date(),
        }];
      }
    }

    return images;
  } catch (error) {
    console.error("[Database] Failed to get product images:", error);
    return [];
  }
}

/**
 * Update image order
 */
export async function updateImageOrder(productId: number, images: Array<{ imageUrl: string; sortOrder: number; isThumbnail: boolean }>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update image order: database not available");
    return null;
  }

  try {
    const { productImageOrder } = await import("../drizzle/schema");
    
    // Delete existing images
    await db.delete(productImageOrder).where(eq(productImageOrder.productId, productId));

    // Insert new images
    if (images.length > 0) {
      await db.insert(productImageOrder).values(
        images.map((img) => ({
          productId,
          imageUrl: img.imageUrl,
          sortOrder: img.sortOrder,
          isThumbnail: img.isThumbnail,
        }))
      );
    }

    return await getProductImageOrder(productId);
  } catch (error) {
    console.error("[Database] Failed to update image order:", error);
    return null;
  }
}

/**
 * Delete product image
 */
export async function deleteProductImage(productId: number, imageUrl: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete product image: database not available");
    return null;
  }

  try {
    const { productImageOrder } = await import("../drizzle/schema");
    
    // Delete image from productImageOrder table
    await db.delete(productImageOrder)
      .where(
        and(
          eq(productImageOrder.productId, productId),
          eq(productImageOrder.imageUrl, imageUrl)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to delete product image:", error);
    throw error;
  }
}

// ============ Product SEO Metadata Functions ============
/**
 * Get or create product SEO metadata
 */
export async function getOrCreateProductSeoMetadata(productId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get product SEO metadata: database not available");
    return null;
  }

  try {
    const { productSeoMetadata } = await import("../drizzle/schema");
    
    let seoData = await db
      .select()
      .from(productSeoMetadata)
      .where(eq(productSeoMetadata.productId, productId))
      .then(rows => rows[0] || null);

    if (!seoData) {
      // Create new SEO metadata
      await db.insert(productSeoMetadata).values({
        productId,
        metaDescription: null,
        keywords: null,
        urlSlug: null,
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
      });

      seoData = await db
        .select()
        .from(productSeoMetadata)
        .where(eq(productSeoMetadata.productId, productId))
        .then(rows => rows[0] || null);
    }

    return seoData;
  } catch (error) {
    console.error("[Database] Failed to get or create product SEO metadata:", error);
    return null;
  }
}

/**
 * Update product SEO metadata
 */
export async function updateProductSeoMetadata(productId: number, data: {
  metaDescription?: string | null;
  keywords?: string | null;
  urlSlug?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update product SEO metadata: database not available");
    return null;
  }

  try {
    const { productSeoMetadata } = await import("../drizzle/schema");
    
    const updateData: Record<string, unknown> = {};
    
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
    if (data.keywords !== undefined) updateData.keywords = data.keywords;
    if (data.urlSlug !== undefined) updateData.urlSlug = data.urlSlug;
    if (data.ogTitle !== undefined) updateData.ogTitle = data.ogTitle;
    if (data.ogDescription !== undefined) updateData.ogDescription = data.ogDescription;
    if (data.ogImage !== undefined) updateData.ogImage = data.ogImage;
    
    updateData.updatedAt = new Date();

    await db
      .update(productSeoMetadata)
      .set(updateData)
      .where(eq(productSeoMetadata.productId, productId));

    return await getOrCreateProductSeoMetadata(productId);
  } catch (error) {
    console.error("[Database] Failed to update product SEO metadata:", error);
    return null;
  }
}

// ============ Product Shipping Info Functions ============
/**
 * Get or create product shipping info
 */
export async function getOrCreateProductShippingInfo(productId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get product shipping info: database not available");
    return null;
  }

  try {
    const { productShippingInfo } = await import("../drizzle/schema");
    
    let shippingData = await db
      .select()
      .from(productShippingInfo)
      .where(eq(productShippingInfo.productId, productId))
      .then(rows => rows[0] || null);

    if (!shippingData) {
      // Create new shipping info
      await db.insert(productShippingInfo).values({
        productId,
        weight: null,
        width: null,
        height: null,
        depth: null,
        shippingCost: null,
        supplierId: null,
      });

      shippingData = await db
        .select()
        .from(productShippingInfo)
        .where(eq(productShippingInfo.productId, productId))
        .then(rows => rows[0] || null);
    }

    return shippingData;
  } catch (error) {
    console.error("[Database] Failed to get or create product shipping info:", error);
    return null;
  }
}

/**
 * Update product shipping info
 */
export async function updateProductShippingInfo(productId: number, data: {
  weight?: string | null;
  width?: string | null;
  height?: string | null;
  depth?: string | null;
  shippingCost?: string | null;
  supplierId?: number | null;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update product shipping info: database not available");
    return null;
  }

  try {
    const { productShippingInfo } = await import("../drizzle/schema");
    
    const updateData: Record<string, unknown> = {};
    
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.width !== undefined) updateData.width = data.width;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.depth !== undefined) updateData.depth = data.depth;
    if (data.shippingCost !== undefined) updateData.shippingCost = data.shippingCost;
    if (data.supplierId !== undefined) updateData.supplierId = data.supplierId;
    
    updateData.updatedAt = new Date();

    await db
      .update(productShippingInfo)
      .set(updateData)
      .where(eq(productShippingInfo.productId, productId));

    return await getOrCreateProductShippingInfo(productId);
  } catch (error) {
    console.error("[Database] Failed to update product shipping info:", error);
    return null;
  }
}

// ============ Product Promotion Code Functions ============
/**
 * Get promotion codes for a product
 */
export async function getProductPromotionCodes(productId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get promotion codes: database not available");
    return [];
  }

  try {
    const { productPromotionCodes } = await import("../drizzle/schema");
    
    const codes = await db
      .select()
      .from(productPromotionCodes)
      .where(eq(productPromotionCodes.productId, productId))
      .orderBy(desc(productPromotionCodes.createdAt));

    return codes;
  } catch (error) {
    console.error("[Database] Failed to get promotion codes:", error);
    return [];
  }
}

/**
 * Create promotion code
 */
export async function createPromotionCode(productId: number, code: string, discountPercent: number, maxUses?: number, expiresAt?: Date) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create promotion code: database not available");
    return null;
  }

  try {
    const { productPromotionCodes } = await import("../drizzle/schema");
    
    const result = await db.insert(productPromotionCodes).values({
      productId,
      code,
      discountPercent,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
      currentUses: 0,
      isActive: true,
    });

    return result;
  } catch (error) {
    console.error("[Database] Failed to create promotion code:", error);
    return null;
  }
}

// ============ Related Products Functions ============
/**
 * Get related products (manually set)
 */
export async function getManualRelatedProducts(productId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get related products: database not available");
    return [];
  }

  try {
    const { relatedProducts, products: productsTable } = await import("../drizzle/schema");
    
    const related = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        nameJa: productsTable.nameJa,
        price: productsTable.price,
        stock: productsTable.stock,
        imageUrl: productsTable.imageUrl,
        rating: productsTable.rating,
        salesCount: productsTable.salesCount,
      })
      .from(relatedProducts)
      .innerJoin(productsTable, eq(relatedProducts.relatedProductId, productsTable.id))
      .where(eq(relatedProducts.productId, productId))
      .orderBy(asc(relatedProducts.sortOrder));

    return related;
  } catch (error) {
    console.error("[Database] Failed to get related products:", error);
    return [];
  }
}

/**
 * Update related products
 */
export async function updateRelatedProducts(productId: number, relatedProductIds: Array<{ id: number; sortOrder: number }>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update related products: database not available");
    return null;
  }

  try {
    const { relatedProducts } = await import("../drizzle/schema");
    
    // Delete existing related products
    await db.delete(relatedProducts).where(eq(relatedProducts.productId, productId));

    // Insert new related products
    if (relatedProductIds.length > 0) {
      await db.insert(relatedProducts).values(
        relatedProductIds.map(rel => ({
          productId,
          relatedProductId: rel.id,
          sortOrder: rel.sortOrder,
        }))
      );
    }

    return await getManualRelatedProducts(productId);
  } catch (error) {
    console.error("[Database] Failed to update related products:", error);
    return null;
  }
}


// ============ Product Price Tiers Functions (まとめ買い) ============

export async function getProductPriceTiers(productId: number): Promise<ProductPriceTier[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get price tiers: database not available");
    return [];
  }

  try {
    return await db.select().from(productPriceTiers)
      .where(eq(productPriceTiers.productId, productId))
      .orderBy(asc(productPriceTiers.quantity));
  } catch (error) {
    console.error("[Database] Failed to get price tiers:", error);
    return [];
  }
}

export async function getActiveProductPriceTiers(productId: number): Promise<ProductPriceTier[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get active price tiers: database not available");
    return [];
  }

  try {
    return await db.select().from(productPriceTiers)
      .where(and(
        eq(productPriceTiers.productId, productId),
        eq(productPriceTiers.isActive, true)
      ))
      .orderBy(asc(productPriceTiers.quantity));
  } catch (error) {
    console.error("[Database] Failed to get active price tiers:", error);
    return [];
  }
}

export async function upsertPriceTiers(
  productId: number,
  tiers: Array<{
    id?: number;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    discountPercent: number;
    stock?: number;
    isPopular: boolean;
    isActive: boolean;
    sortOrder: number;
  }>
): Promise<ProductPriceTier[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert price tiers: database not available");
    return [];
  }

  try {
    // Delete existing tiers for this product
    await db.delete(productPriceTiers).where(eq(productPriceTiers.productId, productId));

    // Insert new tiers
    if (tiers.length > 0) {
      const values = tiers.map((tier, index) => ({
        productId,
        quantity: tier.quantity,
        unitPrice: tier.unitPrice,
        totalPrice: tier.totalPrice,
        discountPercent: tier.discountPercent,
        stock: tier.stock ?? 0,
        isPopular: tier.isPopular,
        isActive: tier.isActive,
        sortOrder: tier.sortOrder ?? index,
      }));

      await db.insert(productPriceTiers).values(values);
    }

    // Also update the product's setPricing JSON field for backward compatibility
    const setPricingJson = JSON.stringify(tiers.map(t => ({
      quantity: t.quantity,
      pricePerUnit: parseFloat(t.unitPrice),
      totalPrice: parseFloat(t.totalPrice),
      discountPercent: t.discountPercent,
    })));
    await db.update(products).set({ setPricing: setPricingJson }).where(eq(products.id, productId));

    // Return the newly inserted tiers
    return await db.select().from(productPriceTiers)
      .where(eq(productPriceTiers.productId, productId))
      .orderBy(asc(productPriceTiers.quantity));
  } catch (error) {
    console.error("[Database] Failed to upsert price tiers:", error);
    return [];
  }
}

export async function deletePriceTier(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete price tier: database not available");
    return false;
  }

  try {
    await db.delete(productPriceTiers).where(eq(productPriceTiers.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete price tier:", error);
    return false;
  }
}


// ============ Enhanced Order Management Functions ============

/**
 * 관리자 주문 검색/필터 (서버 사이드 페이지네이션)
 */
export async function adminSearchOrders(params: {
  page: number;
  limit: number;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  carrier?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  paymentMethod?: string;
  bankTransferPending?: boolean;
}): Promise<{ orders: (Order & { shipment?: Shipment; userName?: string; userEmail?: string; itemsSummary?: string; itemsWithImages?: Array<{ productName: string; quantity: number; imageUrl: string | null }> })[], total: number }> {
  const db = await getDb();
  if (!db) return { orders: [], total: 0 };

  try {
    const conditions: any[] = [];

    if (params.status && params.status !== 'all') {
      // 여러 상태를 쉼표로 구분한 문자열을 배열로 변환
      const statusArray = params.status.split(',').map(s => s.trim());
      if (statusArray.length === 1) {
        conditions.push(eq(orders.status, statusArray[0] as any));
      } else {
        conditions.push(inArray(orders.status, statusArray as any));
      }
    }
    if (params.search) {
      conditions.push(
        sql`(${orders.orderNumber} LIKE ${`%${params.search}%`} OR ${orders.shippingName} LIKE ${`%${params.search}%`} OR ${orders.shippingPhone} LIKE ${`%${params.search}%`} OR ${orders.cartGroupId} LIKE ${`%${params.search}%`})`
      );
    }
    if (params.dateFrom) {
      conditions.push(sql`${orders.createdAt} >= ${params.dateFrom}`);
    }
    if (params.dateTo) {
      conditions.push(sql`${orders.createdAt} <= ${params.dateTo + ' 23:59:59'}`);
    }
    if (params.amountMin !== undefined) {
      conditions.push(sql`${orders.totalAmount} >= ${params.amountMin}`);
    }
    if (params.amountMax !== undefined) {
      conditions.push(sql`${orders.totalAmount} <= ${params.amountMax}`);
    }
    // Filter by payment method
    if (params.paymentMethod) {
      conditions.push(eq(orders.paymentMethod, params.paymentMethod as any));
    }
    // Filter: bank transfer pending (무통장 입금 대기)
    if (params.bankTransferPending) {
      conditions.push(eq(orders.paymentMethod, 'bank_transfer' as any));
      conditions.push(eq(orders.paymentStatus, 'pending' as any));
      conditions.push(isNull(orders.bankTransferConfirmedAt));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(whereClause);
    const total = countResult[0]?.count || 0;

    // Fetch orders with pagination
    const offset = (params.page - 1) * params.limit;
    let orderQuery = db.select().from(orders).where(whereClause);

    // Sort
    const sortOrder = params.sortOrder === 'asc' ? asc : desc;
    if (params.sortBy === 'amount') {
      orderQuery = orderQuery.orderBy(sortOrder(orders.totalAmount)) as any;
    } else if (params.sortBy === 'status') {
      orderQuery = orderQuery.orderBy(sortOrder(orders.status)) as any;
    } else {
      orderQuery = orderQuery.orderBy(desc(orders.createdAt)) as any;
    }

    const orderList = await (orderQuery as any).limit(params.limit).offset(offset);

    // Enrich with shipment + user info + order items summary
    const enrichedOrders = await Promise.all(
      orderList.map(async (order: Order) => {
        const shipment = await getShipmentByOrderId(order.id);
        // Get user info
        let userName: string | undefined;
        let userEmail: string | undefined;
        if (order.userId) {
          try {
            // orders.userId references users.id (not registeredUsers.id)
            const userResult = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
            if (userResult[0]) {
              userName = userResult[0].nameKanji || userResult[0].name || undefined;
              userEmail = userResult[0].email || undefined;
            }
          } catch {}
        }
        // Get order items with product names and images
        let itemsSummary: string | undefined;
        let itemsWithImages: Array<{ id: number; productName: string; productNameJa: string; quantity: number; imageUrl: string | null; tierName: string | null; shipment?: Shipment }> = [];
        try {
          const items = await db.select({
            id: orderItems.id,
            productName: orderItems.productName,
            productNameJa: orderItems.productNameJa,
            quantity: orderItems.quantity,
            imageUrl: orderItems.productImageUrl,
            tierName: orderItems.tierName,
            unitPrice: orderItems.unitPrice,
            subtotal: orderItems.subtotal,
            discountAmount: orderItems.discountAmount,
            cancelledAt: orderItems.cancelledAt,
            cancelReason: orderItems.cancelReason,
            optionInfo: orderItems.tierName,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
          
          // Fetch all shipments for this order (order-level and item-level)
          const allOrderShipments = await db.select().from(shipments).where(eq(shipments.orderId, order.id));
          const shipmentByItemId = new Map<number, Shipment>();
          const orderLevelShipment = allOrderShipments.find(s => s.orderItemId == null);
          for (const s of allOrderShipments) {
            if (s.orderItemId != null) shipmentByItemId.set(s.orderItemId, s);
          }
          
          if (items.length > 0) {
            itemsSummary = items.map(item => {
              const name = item.productNameJa || item.productName || '알 수 없음';
              const tier = item.tierName ? ` (${item.tierName})` : '';
              return `${name}${tier} x${item.quantity}`;
            }).join(', ');
            itemsWithImages = items.map(item => ({
              id: item.id,
              productName: item.productName || '알 수 없음',
              productNameJa: item.productNameJa || '알 수 없음',
              quantity: item.quantity,
              imageUrl: item.imageUrl,
              tierName: item.tierName,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              discountAmount: item.discountAmount,
              cancelledAt: item.cancelledAt,
              cancelReason: item.cancelReason,
              optionInfo: item.tierName,
              shipment: shipmentByItemId.get(item.id) || orderLevelShipment || undefined,
            }));
          }
        } catch {}
        // Get coupon code used for this order
        let couponCode: string | null = null;
        try {
          const couponResult = await db.select({ code: coupons.code })
            .from(couponUsages)
            .innerJoin(coupons, eq(couponUsages.couponId, coupons.id))
            .where(eq(couponUsages.orderId, order.id))
            .limit(1);
          if (couponResult.length > 0) couponCode = couponResult[0].code;
        } catch {}
        // Calculate itemsTotal (sum of order_items subtotals = original price before discount)
        let itemsTotal: number = 0;
        try {
          const totalResult = await db.select({ total: sql<string>`SUM(${orderItems.subtotal})` })
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));
          itemsTotal = Number(totalResult[0]?.total || 0);
        } catch {}
        // Filter by carrier if needed
        if (params.carrier && params.carrier !== 'all') {
          if (!shipment || shipment.carrier !== params.carrier) return null;
        }
        // Get tracking alert from cache
        let trackingHasAlert = false;
        let trackingAlertType: string | null = null;
        let trackingAlertDescription: string | null = null;
        try {
          const trackingNum = shipment?.trackingNumber;
          if (trackingNum) {
            const cacheRow = await db.select({
              hasAlert: shipmentTrackingCache.hasAlert,
              alertType: shipmentTrackingCache.alertType,
              alertDescription: shipmentTrackingCache.alertDescription,
            }).from(shipmentTrackingCache).where(eq(shipmentTrackingCache.trackingNumber, trackingNum)).limit(1);
            if (cacheRow[0]?.hasAlert) {
              trackingHasAlert = true;
              trackingAlertType = cacheRow[0].alertType || null;
              trackingAlertDescription = cacheRow[0].alertDescription || null;
            }
          }
        } catch {}
        return { ...order, shipment: shipment || undefined, userName, userEmail, itemsSummary, itemsWithImages, couponCode, itemsTotal, trackingHasAlert, trackingAlertType, trackingAlertDescription };
      })
    );

    const filtered = enrichedOrders.filter(Boolean) as any[];
    return { orders: filtered, total: params.carrier ? filtered.length : total };
  } catch (error) {
    console.error("[Database] Failed to search orders:", error);
    return { orders: [], total: 0 };
  }
}

/**
 * 관리자 주문 상세 조회 (주문자 정보 + 상품 썸네일 + 배송 + 이벤트 포함)
 */
export async function adminGetOrderDetail(orderId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // 주문 기본 정보
    const orderResult = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!orderResult[0]) return null;
    const order = orderResult[0];

    // 주문 상품 + 썸네일
    const items = await db.select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: orderItems.productName,
      productNameJa: orderItems.productNameJa,
      productImageUrl: orderItems.productImageUrl,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      subtotal: orderItems.subtotal,
      discountAmount: orderItems.discountAmount,
      cancelledAt: orderItems.cancelledAt,
      cancelReason: orderItems.cancelReason,
      imageUrl: products.imageUrl,
    }).from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    // 주문자 정보
    let customer: { id: number; name: string; email: string; phone?: string | null } | null = null;
    if (order.userId) {
      const userResult = await db.select().from(registeredUsers).where(eq(registeredUsers.id, order.userId)).limit(1);
      if (userResult[0]) {
        customer = {
          id: userResult[0].id,
          name: userResult[0].nameKanji,
          email: userResult[0].email,
          phone: userResult[0].phone,
        };
      }
    }

     // 배송 정보
    const shipment = await getShipmentByOrderId(orderId);
    // 배송 이벤트
    let shipmentEventList: ShipmentEvent[] = [];
    if (shipment) {
      shipmentEventList = await getShipmentEvents(shipment.id);
    }
    // 쿠폰 사용 정보
    let couponUsage: { couponCode: string; couponNameJa: string; discountAmount: string } | undefined;
    try {
      const couponUsageResult = await db
        .select({
          couponCode: coupons.code,
          couponNameJa: coupons.nameJa,
          discountAmount: couponUsages.discountAmount,
        })
        .from(couponUsages)
        .innerJoin(coupons, eq(couponUsages.couponId, coupons.id))
        .where(eq(couponUsages.orderId, orderId))
        .limit(1);
      if (couponUsageResult.length > 0) {
        couponUsage = couponUsageResult[0];
      }
    } catch {}
    return {
      ...order,
      items,
      customer,
      shipment: shipment || null,
      shipmentEvents: shipmentEventList,
      couponUsage,
    };
  } catch (error) {
    console.error("[Database] Failed to get order detail:", error);
    return null;
  }
}

/**
 * 관리자 메모 업데이트
 */
export async function updateOrderAdminNotes(orderId: number, notes: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(orders).set({ adminNotes: notes }).where(eq(orders.id, orderId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update admin notes:", error);
    return false;
  }
}

/**
 * 대량 주문 상태 변경
 */
export async function bulkUpdateOrderStatus(orderIds: number[], status: Order['status']): Promise<{ success: number; failed: number }> {
  const db = await getDb();
  if (!db) return { success: 0, failed: orderIds.length };

  let success = 0;
  let failed = 0;
  for (const id of orderIds) {
    try {
      await db.update(orders).set({ status }).where(eq(orders.id, id));
      success++;
    } catch {
      failed++;
    }
  }
  return { success, failed };
}

/**
 * 배송 정보 종합 업데이트 (운송사, 추적번호, 예상 배달일, 위치, 메모)
 */
export async function adminUpdateShipmentInfo(orderId: number, data: {
  carrier?: string;
  trackingNumber?: string;
  estimatedDelivery?: string | null;
  currentLocation?: string | null;
  notes?: string | null;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const existingShipment = await getShipmentByOrderId(orderId);
    
    if (existingShipment) {
      const updateData: any = {};
      if (data.carrier !== undefined) updateData.carrier = data.carrier;
      if (data.trackingNumber !== undefined) updateData.trackingNumber = data.trackingNumber;
      if (data.estimatedDelivery !== undefined) updateData.estimatedDeliveryDate = data.estimatedDelivery ? new Date(data.estimatedDelivery) : null;
      if (data.currentLocation !== undefined) updateData.currentLocation = data.currentLocation;
      if (data.notes !== undefined) updateData.notes = data.notes;
      
      await db.update(shipments).set(updateData).where(eq(shipments.id, existingShipment.id));
    } else {
      // Create new shipment
      await db.insert(shipments).values({
        orderId,
        carrier: data.carrier || 'Japan Post',
        trackingNumber: data.trackingNumber || '',
        status: 'pending',
        estimatedDeliveryDate: data.estimatedDelivery ? new Date(data.estimatedDelivery) : null,
        currentLocation: data.currentLocation || null,
        notes: data.notes || null,
      });
    }
    
    // Update tracking number on order too
    if (data.trackingNumber !== undefined) {
      await db.update(orders).set({ trackingNumber: data.trackingNumber }).where(eq(orders.id, orderId));
    }
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to update shipment info:", error);
    return false;
  }
}

/**
 * 주문 통계 (기간별)
 */
export async function getOrderStatistics(period: 'daily' | 'weekly' | 'monthly') {
  const db = await getDb();
  if (!db) return { chartData: [], statusDistribution: [], carrierStats: [], avgDeliveryDays: 0 };

  try {
    // 기간별 주문 건수 및 매출
    let dateFormat: string;
    let daysBack: number;
    if (period === 'daily') { dateFormat = '%Y-%m-%d'; daysBack = 30; }
    else if (period === 'weekly') { dateFormat = '%Y-%u'; daysBack = 90; }
    else { dateFormat = '%Y-%m'; daysBack = 365; }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const chartDataResult = await db.execute(
      sql`SELECT DATE_FORMAT(createdAt, ${dateFormat}) as period, COUNT(*) as \`count\`, COALESCE(SUM(totalAmount), 0) as revenue FROM orders WHERE createdAt >= ${cutoffDate} GROUP BY DATE_FORMAT(createdAt, ${dateFormat}) ORDER BY DATE_FORMAT(createdAt, ${dateFormat})`
    );
    const chartData = (Array.isArray(chartDataResult) && Array.isArray(chartDataResult[0]) ? chartDataResult[0] : chartDataResult) as unknown as { period: string; count: number; revenue: number }[];

    // 배송 상태별 분포
    const statusDistribution = await db.select({
      status: orders.status,
      count: sql<number>`COUNT(*)`,
    }).from(orders).groupBy(orders.status);

    // 운송사별 통계
    const carrierStats = await db.select({
      carrier: shipments.carrier,
      count: sql<number>`COUNT(*)`,
      delivered: sql<number>`SUM(CASE WHEN ${shipments.status} = 'delivered' THEN 1 ELSE 0 END)`,
    }).from(shipments).groupBy(shipments.carrier);

    // 평균 배송 소요일
    const avgDelivery = await db.select({
      avg: sql<number>`AVG(DATEDIFF(${shipments.actualDeliveryDate}, ${shipments.createdAt}))`,
    }).from(shipments)
      .where(sql`${shipments.actualDeliveryDate} IS NOT NULL`);

    return {
      chartData,
      statusDistribution,
      carrierStats,
      avgDeliveryDays: avgDelivery[0]?.avg || 0,
    };
  } catch (error) {
    console.error("[Database] Failed to get order statistics:", error);
    return { chartData: [], statusDistribution: [], carrierStats: [], avgDeliveryDays: 0 };
  }
}

/**
 * Get registered user by ID
 */
export async function getRegisteredUserById(userId: number): Promise<RegisteredUser | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get registered user: database not available");
    return undefined;
  }

  try {
    // 1차: registeredUsers.id로 직접 조회
    const result = await db.select().from(registeredUsers).where(eq(registeredUsers.id, userId)).limit(1);
    if (result[0]) return result[0];

    // 2차 폴백: OAuth users.id로 email 조회 후 registeredUsers에서 찾기
    // (orders.userId는 users.id(OAuth)이므로 registeredUsers.id와 다를 수 있음)
    const oauthUser = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    if (oauthUser[0]?.email) {
      const regResult = await db.select().from(registeredUsers).where(eq(registeredUsers.email, oauthUser[0].email)).limit(1);
      if (regResult[0]) {
        console.log(`[Database] getRegisteredUserById: OAuth userId ${userId} → email ${oauthUser[0].email} → reg_id ${regResult[0].id}`);
        return regResult[0];
      }
    }
    return undefined;
  } catch (error) {
    console.error("[Database] Failed to get registered user by id:", error);
    return undefined;
  }
}

/**
 * Export orders for CSV/Excel download (admin)
 * Returns all matching orders with enriched data (no pagination)
 */
export async function adminExportOrders(params: {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions: any[] = [];
    if (params.status && params.status !== 'all') {
      // 여러 상태를 쉼표로 구분한 문자열을 배열로 변환
      const statusArray = params.status.split(',').map(s => s.trim());
      if (statusArray.length === 1) {
        conditions.push(eq(orders.status, statusArray[0] as any));
      } else {
        conditions.push(inArray(orders.status, statusArray as any));
      }
    }
    if (params.search) {
      conditions.push(
        sql`(${orders.orderNumber} LIKE ${`%${params.search}%`} OR ${orders.shippingName} LIKE ${`%${params.search}%`})`
      );
    }
    if (params.dateFrom) {
      conditions.push(sql`${orders.createdAt} >= ${params.dateFrom}`);
    }
    if (params.dateTo) {
      conditions.push(sql`${orders.createdAt} <= ${params.dateTo + ' 23:59:59'}`);
    }
    if (params.amountMin !== undefined) {
      conditions.push(sql`${orders.totalAmount} >= ${params.amountMin}`);
    }
    if (params.amountMax !== undefined) {
      conditions.push(sql`${orders.totalAmount} <= ${params.amountMax}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderList = await db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt));

    // Enrich with shipment + user + items info
    const enrichedOrders = await Promise.all(
      orderList.map(async (order: Order) => {
        const shipment = await getShipmentByOrderId(order.id);
        let userName: string | undefined;
        let userEmail: string | undefined;
        let userPhone: string | undefined;
        if (order.userId) {
          try {
            const userResult = await db.select().from(registeredUsers).where(eq(registeredUsers.id, order.userId)).limit(1);
            if (userResult[0]) {
              userName = buildFullName(userResult[0]);
              userEmail = userResult[0].email;
              userPhone = userResult[0].phone || undefined;
            }
          } catch {}
        }
        // Get order items
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        const itemSummary = items.map(i => `${i.productNameJa || i.productName}×${i.quantity}`).join(', ');

        return {
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt,
          userName: userName || order.shippingName,
          userEmail: userEmail || '',
          userPhone: userPhone || order.shippingPhone || '',
          totalAmount: order.totalAmount,
          shippingFee: order.shippingFee,
          pointsUsed: order.pointsUsed,
          pointsEarned: order.pointsEarned,
          shippingName: order.shippingName,
          shippingPostalCode: order.shippingPostalCode,
          shippingAddress: order.shippingAddress,
          shippingPhone: order.shippingPhone || '',
          trackingNumber: shipment?.trackingNumber || order.trackingNumber || '',
          carrier: shipment?.carrier || '',
          paymentMethod: order.paymentMethod || '',
          itemSummary,
          itemCount: items.length,
          adminNotes: order.adminNotes || '',
        };
      })
    );

    return enrichedOrders;
  } catch (error) {
    console.error("[Database] Failed to export orders:", error);
    return [];
  }
}


/**
 * Get user orders with filter, search, sort, pagination, and item thumbnails
 */
export async function getUserOrdersAdvanced(userId: number, params: {
  status?: string;
  search?: string;
  sort?: "newest" | "oldest" | "amount_high" | "amount_low";
  page?: number;
  limit?: number;
}): Promise<{
  orders: (Order & { shipment?: Shipment; items: { productImageUrl: string | null; productNameJa: string; productId: number }[]; couponUsage?: { couponCode: string; couponNameJa: string; discountAmount: string } })[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const db = await getDb();
  if (!db) {
    return { orders: [], total: 0, page: 1, totalPages: 0 };
  }

  try {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions: any[] = [eq(orders.userId, userId)];

    if (params.status && params.status !== "all") {
      conditions.push(eq(orders.status, params.status as any));
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      // Search in order number or in order items
      const matchingOrderIds = await db
        .select({ orderId: orderItems.orderId })
        .from(orderItems)
        .where(
          or(
            like(orderItems.productNameJa, searchTerm),
            like(orderItems.productName, searchTerm)
          )
        );
      const orderIdsFromItems = matchingOrderIds.map(r => r.orderId);

      if (orderIdsFromItems.length > 0) {
        conditions.push(
          or(
            like(orders.orderNumber, searchTerm),
            inArray(orders.id, orderIdsFromItems)
          )
        );
      } else {
        conditions.push(like(orders.orderNumber, searchTerm));
      }
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Count total
    const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(whereClause);
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Sort
    let orderByClause;
    switch (params.sort) {
      case "oldest":
        orderByClause = asc(orders.createdAt);
        break;
      case "amount_high":
        orderByClause = desc(orders.totalAmount);
        break;
      case "amount_low":
        orderByClause = asc(orders.totalAmount);
        break;
      default:
        orderByClause = desc(orders.createdAt);
    }

    // Fetch orders
    const orderList = await db.select().from(orders).where(whereClause).orderBy(orderByClause).limit(limit).offset(offset);

    // Fetch shipments and items for each order
    const ordersWithDetails = await Promise.all(
      orderList.map(async (order) => {
        const shipment = await getShipmentByOrderId(order.id);
        const items = await db
          .select({
            productImageUrl: orderItems.productImageUrl,
            productNameJa: orderItems.productNameJa,
            productId: orderItems.productId,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        // Fetch coupon usage for this order
        const couponUsageResult = await db
          .select({
            couponCode: coupons.code,
            couponNameJa: coupons.nameJa,
            discountAmount: couponUsages.discountAmount,
          })
          .from(couponUsages)
          .innerJoin(coupons, eq(couponUsages.couponId, coupons.id))
          .where(eq(couponUsages.orderId, order.id))
          .limit(1);

        return {
          ...order,
          shipment: shipment || undefined,
          items,
          couponUsage: couponUsageResult[0] || undefined,
        };
      })
    );

    return { orders: ordersWithDetails, total, page, totalPages };
  } catch (error) {
    console.error("[Database] Failed to get user orders advanced:", error);
    return { orders: [], total: 0, page: 1, totalPages: 0 };
  }
}

/**
 * Get user's reviews for specific product IDs (to check which products have been reviewed)
 */
export async function getUserReviewsByProductIds(userId: number, productIds: number[]): Promise<{ productId: number; rating: number; id: number }[]> {
  const db = await getDb();
  if (!db || productIds.length === 0) return [];

  try {
    const result = await db
      .select({
        productId: reviews.productId,
        rating: reviews.rating,
        id: reviews.id,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, userId),
          inArray(reviews.productId, productIds)
        )
      );
    return result;
  } catch (error) {
    console.error("[Database] Failed to get user reviews by product ids:", error);
    return [];
  }
}

/**
 * Get order status history timestamps from shipment events
 */
export async function getOrderStatusHistory(orderId: number): Promise<{ eventType: string; timestamp: Date; description: string | null }[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const shipment = await getShipmentByOrderId(orderId);
    if (!shipment) return [];

    const evts = await db
      .select({
        eventType: shipmentEvents.eventType,
        timestamp: shipmentEvents.timestamp,
        description: shipmentEvents.description,
      })
      .from(shipmentEvents)
      .where(eq(shipmentEvents.shipmentId, shipment.id))
      .orderBy(asc(shipmentEvents.timestamp));
    return evts;
  } catch (error) {
    console.error("[Database] Failed to get order status history:", error);
    return [];
  }
}

// ========== Address Management ==========

/**
 * Get all addresses for a user
 */
export async function getUserAddresses(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    return await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), desc(addresses.lastUsedAt), desc(addresses.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get user addresses:", error);
    return [];
  }
}

/**
 * Get default address for a user
 */
export async function getDefaultAddress(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get default address:", error);
    return null;
  }
}

/**
 * Create a new address
 */
export async function createAddress(data: InsertAddress) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, data.userId));
    }
    
    const result = await db.insert(addresses).values(data);
    const newId = result[0].insertId;
    
    const newAddress = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, newId))
      .limit(1);
    
    return newAddress[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create address:", error);
    return null;
  }
}

/**
 * Update an address
 */
export async function updateAddress(id: number, userId: number, data: Partial<InsertAddress>) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, userId));
    }
    
    await db
      .update(addresses)
      .set(data)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
    
    const updated = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, id))
      .limit(1);
    
    return updated[0] || null;
  } catch (error) {
    console.error("[Database] Failed to update address:", error);
    return null;
  }
}

/**
 * Delete an address
 */
export async function deleteAddress(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete address:", error);
    return false;
  }
}

/**
 * Set an address as default
 */
export async function setDefaultAddress(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Unset all defaults
    await db
      .update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.userId, userId));
    
    // Set the new default
    await db
      .update(addresses)
      .set({ isDefault: true })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to set default address:", error);
    return false;
  }
}

// ============ Review Helper Functions ============
export async function getDeliveredProductsForReview(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get delivered products: database not available");
    return [];
  }

  try {
    // Get all delivered orders for the user (shipped or delivered status)
    const deliveredOrders = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.userId, userId),
        or(
          eq(orders.status, "delivered"),
          eq(orders.status, "shipped")
        )
      ))
      .orderBy(desc(orders.createdAt));

    // Get all order items with product details
    const result = [];
    for (const order of deliveredOrders) {
      const items = await db
        .select({
          orderItem: orderItems,
          product: products,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));

      for (const item of items) {
        // Check if review already exists
        const existingReview = await db
          .select()
          .from(reviews)
          .where(and(
            eq(reviews.userId, userId),
            eq(reviews.productId, item.product.id),
            eq(reviews.orderId, order.id)
          ))
          .limit(1);

        result.push({
          orderId: order.id,
          orderItemId: item.orderItem.id,
          orderNumber: order.orderNumber,
          orderDate: order.createdAt,
          product: item.product,
          quantity: item.orderItem.quantity,
          hasReview: existingReview.length > 0,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("[Database] Failed to get delivered products for review:", error);
    return [];
  }
}

export async function updateReview(
  reviewId: number,
  userId: number,
  data: {
    rating?: number;
    title?: string;
    content?: string;
    images?: string[];
  }
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update review: database not available");
    throw new Error("Database not available");
  }

  try {
    // Check if review belongs to user
    const existingReview = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.userId, userId)))
      .limit(1);

    if (existingReview.length === 0) {
      throw new Error("Review not found or unauthorized");
    }

    // Update review
    const updateData: any = {};
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.images !== undefined) updateData.images = JSON.stringify(data.images);

    await db
      .update(reviews)
      .set(updateData)
      .where(eq(reviews.id, reviewId));

    console.log(`[Database] Review ${reviewId} updated successfully`);
  } catch (error) {
    console.error("[Database] Failed to update review:", error);
    throw error;
  }
}

export async function deleteReview(reviewId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete review: database not available");
    throw new Error("Database not available");
  }

  try {
    // Check if review belongs to user
    const existingReview = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.userId, userId)))
      .limit(1);

    if (existingReview.length === 0) {
      throw new Error("Review not found or unauthorized");
    }

    // Delete review
    const productId = existingReview[0].productId;
    await db
      .delete(reviews)
      .where(eq(reviews.id, reviewId));

    // Update product rating and reviewCount after deletion
    await db.update(products)
      .set({
        rating: sql`COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE productId = ${productId} AND status = 'approved'), 0)`,
        reviewCount: sql`(SELECT COUNT(*) FROM reviews WHERE productId = ${productId} AND status = 'approved')`,
      })
      .where(eq(products.id, productId));

    console.log(`[Database] Review ${reviewId} deleted successfully`);
  } catch (error) {
    console.error("[Database] Failed to delete review:", error);
    throw error;
  }
}

export async function getUserReviews(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user reviews: database not available");
    return [];
  }

  try {
    const userReviews = await db
      .select({
        review: reviews,
        product: products,
      })
      .from(reviews)
      .innerJoin(products, eq(reviews.productId, products.id))
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdAt));

    return userReviews.map((item) => ({
      ...item.review,
      product: item.product,
    }));
  } catch (error) {
    console.error("[Database] Failed to get user reviews:", error);
    return [];
  }
}

export async function addPointsToUser(
  userId: number,
  amount: number,
  description: string,
  orderId?: number,
  userEmail?: string
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add points: database not available");
    throw new Error("Database not available");
  }

  try {
    // 1. 이메일 확정: 파라미터 우선, 없으면 users 테이블에서 조회
    let resolvedEmail = userEmail;
    if (!resolvedEmail) {
      const oauthUser = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      resolvedEmail = oauthUser[0]?.email || undefined;
    }

    // 2. 이메일로 registered_users 조회 (포인트의 단일 진실 공급원)
    let regUser: { id: number; points: number } | undefined;
    if (resolvedEmail) {
      const regResult = await db
        .select({ id: registeredUsers.id, points: registeredUsers.points })
        .from(registeredUsers)
        .where(eq(registeredUsers.email, resolvedEmail))
        .limit(1);
      regUser = regResult[0];
    }

    if (regUser) {
      // registered_users 기준으로 포인트 적립
      const currentPoints = regUser.points || 0;
      const newBalance = currentPoints + amount;

      await db
        .update(registeredUsers)
        .set({ points: newBalance })
        .where(eq(registeredUsers.id, regUser.id));

      await db.insert(pointTransactions).values({
        userId: regUser.id,
        userEmail: resolvedEmail,
        orderId,
        type: "earn",
        amount,
        balance: newBalance,
        description,
      });

      console.log(`[Database] Added ${amount} points to registered_user ${regUser.id} (${resolvedEmail}) via email lookup: ${description}`);
    } else {
      // registered_users에 없으면 users 테이블 폴백 (기존 동작 유지)
      const oauthUser = await db
        .select({ points: users.points })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const currentPoints = oauthUser[0]?.points || 0;
      const newBalance = currentPoints + amount;

      await db
        .update(users)
        .set({ points: newBalance })
        .where(eq(users.id, userId));

      await db.insert(pointTransactions).values({
        userId,
        userEmail: resolvedEmail,
        orderId,
        type: "earn",
        amount,
        balance: newBalance,
        description,
      });

      console.log(`[Database] Added ${amount} points to oauth_user ${userId} (${resolvedEmail ?? 'no email'}) [fallback]: ${description}`);
    }
  } catch (error) {
    console.error("[Database] Failed to add points:", error);
    throw error;
  }
}

export async function getUserPoints(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user points: database not available");
    return 0;
  }

  try {
    // 1. users 테이블에서 이메일 조회
    const oauthUser = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const email = oauthUser[0]?.email;

    // 2. 이메일로 registered_users 조회 (포인트의 단일 진실 공급원)
    if (email) {
      const regUser = await db
        .select({ points: registeredUsers.points })
        .from(registeredUsers)
        .where(eq(registeredUsers.email, email))
        .limit(1);
      if (regUser[0] !== undefined) {
        return regUser[0].points || 0;
      }
    }

    // 3. registered_users에 없으면 users 테이블 폴백
    const user = await db
      .select({ points: users.points })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user[0]?.points || 0;
  } catch (error) {
    console.error("[Database] Failed to get user points:", error);
    return 0;
  }
}

export async function getUserPointTransactions(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get point transactions: database not available");
    return [];
  }

  try {
    const transactions = await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.userId, userId))
      .orderBy(desc(pointTransactions.createdAt))
      .limit(50);

    return transactions;
  } catch (error) {
    console.error("[Database] Failed to get point transactions:", error);
    return [];
  }
}

export async function getOrdersForReviewReminder() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get orders for review reminder: database not available");
    return [];
  }

  try {
    // Get orders delivered 3 days ago that don't have reviews yet
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    fourDaysAgo.setHours(0, 0, 0, 0);

    const ordersToRemind = await db
      .select({
        order: orders,
        user: users,
        orderItems: orderItems,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.status, "delivered"),
          gte(orders.updatedAt, fourDaysAgo),
          lte(orders.updatedAt, threeDaysAgo)
        )
      );

    // Group by order and filter out products that already have reviews
    const groupedOrders: Record<number, any> = {};
    for (const row of ordersToRemind) {
      const orderId = row.order.id;
      if (!groupedOrders[orderId]) {
        groupedOrders[orderId] = {
          order: row.order,
          user: row.user,
          items: [],
        };
      }

      // Check if this product already has a review
      const existingReview = await db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.orderId, orderId),
            eq(reviews.productId, row.orderItems.productId),
            eq(reviews.userId, row.user.id)
          )
        )
        .limit(1);

      if (existingReview.length === 0) {
        groupedOrders[orderId].items.push(row.orderItems);
      }
    }

    // Filter out orders with no items to review
    const result = Object.values(groupedOrders).filter(
      (order: any) => order.items.length > 0
    );

    console.log(`[Database] Found ${result.length} orders for review reminder`);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get orders for review reminder:", error);
    return [];
  }
}

/**
 * Set review as best (admin only)
 */
export async function setReviewBest(reviewId: number, isBest: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  await db
    .update(reviews)
    .set({
      isBest: isBest ? 1 : 0,
      bestSelectedAt: isBest ? new Date() : null,
    })
    .where(eq(reviews.id, reviewId));

  // If setting as best, award bonus points to the reviewer
  if (isBest) {
    const review = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (review.length > 0 && review[0].orderId) {
      await addPointsToUser(
        review[0].userId,
        500,
        "ベストレビュー選定",
        review[0].orderId
      );
    }
  }
}


// ============ Customer Notes Functions ============
export async function getCustomerNotes(customerId: number): Promise<CustomerNote[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get customer notes: database not available");
    return [];
  }

  try {
    return await db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.customerId, customerId))
      .orderBy(desc(customerNotes.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get customer notes:", error);
    return [];
  }
}

export async function createCustomerNote(customerId: number, adminId: number, note: string): Promise<CustomerNote | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create customer note: database not available");
    return null;
  }

  try {
    const [result] = await db
      .insert(customerNotes)
      .values({ customerId, adminId, note })
      .$returningId();
    
    if (!result) return null;

    const [newNote] = await db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.id, result.id));
    
    return newNote || null;
  } catch (error) {
    console.error("[Database] Failed to create customer note:", error);
    return null;
  }
}

export async function updateCustomerNote(id: number, note: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update customer note: database not available");
    return false;
  }

  try {
    await db
      .update(customerNotes)
      .set({ note })
      .where(eq(customerNotes.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update customer note:", error);
    return false;
  }
}

export async function deleteCustomerNote(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete customer note: database not available");
    return false;
  }

  try {
    await db
      .delete(customerNotes)
      .where(eq(customerNotes.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete customer note:", error);
    return false;
  }
}

// ============ Admin Badge Count Functions ============
/**
 * Get count of pending orders (status: pending)
 */
export async function getPendingOrdersCount(): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get pending orders count: database not available");
    return 0;
  }

  try {
    // 장바구니 단위 카운트: cartGroupId 기준 중복 제거
    const result = await db
      .select({ count: sql<number>`COUNT(DISTINCT COALESCE(${orders.cartGroupId}, CAST(COALESCE(${orders.parentOrderId}, ${orders.id}) AS CHAR)))` })
      .from(orders)
      .where(eq(orders.status, 'pending'));
    
    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error("[Database] Error getting pending orders count:", error);
    return 0;
  }
}

/**
 * Get count of unanswered inquiries
 */
export async function getUnansweredInquiriesCount(): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get unanswered inquiries count: database not available");
    return 0;
  }

  try {
    // Get inquiries without any comments
    const result = await db
      .select({ inquiryId: inquiries.id })
      .from(inquiries)
      .leftJoin(inquiryComments, eq(inquiries.id, inquiryComments.inquiryId))
      .where(isNull(inquiryComments.id))
      .groupBy(inquiries.id);
    
    return result.length;
  } catch (error) {
    console.error("[Database] Error getting unanswered inquiries count:", error);
    return 0;
  }
}

/**
 * Get count of unanswered product questions
 */
export async function getUnansweredProductQuestionsCount(): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get unanswered product questions count: database not available");
    return 0;
  }

  try {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(productQuestions)
      .where(isNull(productQuestions.answer));
    
    return result[0]?.count || 0;
  } catch (error) {
    console.error("[Database] Error getting unanswered product questions count:", error);
    return 0;
  }
}

/**
 * Get site setting by key
 */
export async function getSiteSetting(key: string): Promise<SiteSetting | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get site setting: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);
    
    return result[0];
  } catch (error) {
    console.error(`[Database] Error getting site setting ${key}:`, error);
    return undefined;
  }
}

/**
 * Update or insert site setting
 */
export async function upsertSiteSetting(key: string, value: string | null, description?: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert site setting: database not available");
    return;
  }

  try {
    const existing = await getSiteSetting(key);
    if (existing) {
      await db
        .update(siteSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(siteSettings.key, key));
    } else {
      await db.insert(siteSettings).values({ key, value, description });
    }
  } catch (error) {
    console.error(`[Database] Error upserting site setting ${key}:`, error);
    throw error;
  }
}

/**
 * Get site setting value by key (returns value string or null)
 */
export async function getSetting(key: string): Promise<string | null> {
  const setting = await getSiteSetting(key);
  return setting?.value || null;
}

/**
 * Get all site settings
 */
export async function getAllSiteSettings(): Promise<SiteSetting[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get all site settings: database not available");
    return [];
  }

  try {
    return await db.select().from(siteSettings);
  } catch (error) {
    console.error("[Database] Error getting all site settings:", error);
    return [];
  }
}

/**
 * Get SEO setting by page
 */
export async function getSeoSetting(page: string): Promise<SeoSetting | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get SEO setting: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(seoSettings)
      .where(eq(seoSettings.page, page))
      .limit(1);
    
    return result[0];
  } catch (error) {
    console.error(`[Database] Error getting SEO setting for ${page}:`, error);
    return undefined;
  }
}

/**
 * Update or insert SEO setting
 */
export async function upsertSeoSetting(data: InsertSeoSetting): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert SEO setting: database not available");
    return;
  }

  try {
    const existing = await getSeoSetting(data.page);
    if (existing) {
      await db
        .update(seoSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(seoSettings.page, data.page));
    } else {
      await db.insert(seoSettings).values(data);
    }
  } catch (error) {
    console.error(`[Database] Error upserting SEO setting for ${data.page}:`, error);
    throw error;
  }
}

/**
 * Get all SEO settings
 */
export async function getAllSeoSettings(): Promise<SeoSetting[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get all SEO settings: database not available");
    return [];
  }

  try {
    return await db.select().from(seoSettings);
  } catch (error) {
    console.error("[Database] Error getting all SEO settings:", error);
    return [];
  }
}

// ============================================================================
// Checkout Sessions
// ============================================================================

/**
 * Create a checkout session record
 */
export async function createCheckoutSessionRecord(data: InsertCheckoutSession): Promise<CheckoutSession | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create checkout session: database not available");
    return undefined;
  }

  try {
    const [session] = await db.insert(checkoutSessions).values(data).$returningId();
    if (!session) return undefined;
    
    const created = await db.select().from(checkoutSessions).where(eq(checkoutSessions.id, session.id)).limit(1);
    return created[0];
  } catch (error) {
    console.error("[Database] Error creating checkout session:", error);
    throw error;
  }
}

/**
 * Get checkout session by Stripe session ID
 */
export async function getCheckoutSessionBySessionId(sessionId: string): Promise<CheckoutSession | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get checkout session: database not available");
    return undefined;
  }

  try {
    const sessions = await db.select().from(checkoutSessions).where(eq(checkoutSessions.sessionId, sessionId)).limit(1);
    return sessions[0];
  } catch (error) {
    console.error(`[Database] Error getting checkout session ${sessionId}:`, error);
    return undefined;
  }
}

/**
 * Get checkout session by ID
 */
export async function getCheckoutSessionById(id: number): Promise<CheckoutSession | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get checkout session: database not available");
    return undefined;
  }

  try {
    const sessions = await db.select().from(checkoutSessions).where(eq(checkoutSessions.id, id)).limit(1);
    return sessions[0];
  } catch (error) {
    console.error(`[Database] Error getting checkout session ${id}:`, error);
    return undefined;
  }
}

/**
 * Update checkout session status
 */
export async function updateCheckoutSessionStatus(sessionId: string, status: "pending" | "completed" | "expired" | "failed", failureReason?: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update checkout session status: database not available");
    return;
  }

  try {
    await db
      .update(checkoutSessions)
      .set({ status, failureReason, updatedAt: new Date() })
      .where(eq(checkoutSessions.sessionId, sessionId));
  } catch (error) {
    console.error(`[Database] Error updating checkout session status ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Delete expired checkout sessions (older than 1 hour)
 */
export async function deleteExpiredCheckoutSessions(): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete expired checkout sessions: database not available");
    return 0;
  }

  try {
    const now = new Date();
    await db
      .delete(checkoutSessions)
      .where(and(
        eq(checkoutSessions.status, "pending"),
        lt(checkoutSessions.expiresAt, now)
      ));
    
    return 1; // Return success
  } catch (error) {
    console.error("[Database] Error deleting expired checkout sessions:", error);
    return 0;
  }
}


// ============ Chatbot Functions ============

import {
  chatbotSettings,
  chatbotConversations,
  chatbotMessages,
  chatbotFaqs,
  chatbotBlockedKeywords,
} from "../drizzle/schema";

// --- Chatbot Settings ---
export async function getChatbotSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(chatbotSettings).where(eq(chatbotSettings.key, key)).limit(1);
  return row?.value ?? null;
}

export async function getAllChatbotSettings() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(chatbotSettings).orderBy(chatbotSettings.key);
}

export async function upsertChatbotSetting(key: string, value: string, description?: string) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(chatbotSettings).where(eq(chatbotSettings.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(chatbotSettings).set({ value, ...(description ? { description } : {}) }).where(eq(chatbotSettings.key, key));
  } else {
    await db.insert(chatbotSettings).values({ key, value, ...(description ? { description } : {}) });
  }
  return { key, value };
}

// --- Chatbot Conversations ---
export async function createChatbotConversation(data: {
  userId?: number | null;
  sessionId: string;
  pageContext?: string;
  productId?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(chatbotConversations).values({
    userId: data.userId ?? null,
    sessionId: data.sessionId,
    pageContext: data.pageContext ?? null,
    productId: data.productId ?? null,
  }).$returningId();
  return result.id;
}

export async function getChatbotConversation(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(chatbotConversations).where(eq(chatbotConversations.id, id)).limit(1);
  return row ?? null;
}

export async function getChatbotConversationBySession(sessionId: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(chatbotConversations)
    .where(and(eq(chatbotConversations.sessionId, sessionId), eq(chatbotConversations.status, "active")))
    .orderBy(desc(chatbotConversations.startedAt))
    .limit(1);
  return row ?? null;
}

export async function updateChatbotConversation(id: number, data: { messageCount?: number; faqMatchCount?: number; status?: "active" | "ended"; endedAt?: Date }) {
  const db = await getDb();
  if (!db) return;
  await db.update(chatbotConversations).set(data).where(eq(chatbotConversations.id, id));
}

export async function getAllChatbotConversations(opts: { limit?: number; offset?: number; status?: string } = {}) {
  const db = await getDb();
  if (!db) return { conversations: [], total: 0 };
  const conditions = [];
  if (opts.status) {
    conditions.push(eq(chatbotConversations.status, opts.status as "active" | "ended"));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(chatbotConversations).where(whereClause);
  const total = countResult?.count ?? 0;
  
  const conversations = await db.select().from(chatbotConversations)
    .where(whereClause)
    .orderBy(desc(chatbotConversations.startedAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
  
  return { conversations, total };
}

// --- Chatbot Messages ---
export async function createChatbotMessage(data: {
  conversationId: number;
  role: "user" | "assistant" | "system";
  content: string;
  isFaqMatch?: number;
  faqId?: number | null;
  tokenCount?: number | null;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(chatbotMessages).values({
    conversationId: data.conversationId,
    role: data.role,
    content: data.content,
    isFaqMatch: data.isFaqMatch ?? 0,
    faqId: data.faqId ?? null,
    tokenCount: data.tokenCount ?? null,
  }).$returningId();
  
  // Update conversation message count
  await db.update(chatbotConversations).set({
    messageCount: sql`${chatbotConversations.messageCount} + 1`,
    ...(data.isFaqMatch ? { faqMatchCount: sql`${chatbotConversations.faqMatchCount} + 1` } : {}),
  }).where(eq(chatbotConversations.id, data.conversationId));
  
  return result.id;
}

export async function getChatbotMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(chatbotMessages)
    .where(eq(chatbotMessages.conversationId, conversationId))
    .orderBy(chatbotMessages.createdAt);
}

// --- Chatbot FAQs ---
export async function getAllChatbotFaqs(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return await db.select().from(chatbotFaqs).where(eq(chatbotFaqs.isActive, 1)).orderBy(chatbotFaqs.sortOrder);
  }
  return await db.select().from(chatbotFaqs).orderBy(chatbotFaqs.sortOrder);
}

export async function getChatbotFaqById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(chatbotFaqs).where(eq(chatbotFaqs.id, id)).limit(1);
  return row ?? null;
}

export async function createChatbotFaq(data: {
  questionJa?: string;
  questionKo?: string;
  answerJa?: string;
  answerKo?: string;
  category: string;
  keywords?: string;
  sortOrder?: number;
  isActive?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(chatbotFaqs).values({
    questionJa: data.questionJa ?? null,
    questionKo: data.questionKo ?? null,
    answerJa: data.answerJa ?? null,
    answerKo: data.answerKo ?? null,
    category: data.category as any,
    keywords: data.keywords ?? null,
    sortOrder: data.sortOrder ?? 0,
    isActive: data.isActive ?? 1,
  }).$returningId();
  return result.id;
}

export async function updateChatbotFaq(id: number, data: Partial<{
  questionJa: string | null;
  questionKo: string | null;
  answerJa: string | null;
  answerKo: string | null;
  category: string;
  keywords: string | null;
  sortOrder: number;
  isActive: number;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(chatbotFaqs).set(data as any).where(eq(chatbotFaqs.id, id));
}

export async function deleteChatbotFaq(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(chatbotFaqs).where(eq(chatbotFaqs.id, id));
}

export async function incrementFaqMatchCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(chatbotFaqs).set({ matchCount: sql`${chatbotFaqs.matchCount} + 1` }).where(eq(chatbotFaqs.id, id));
}

// --- Chatbot Blocked Keywords ---
export async function getAllBlockedKeywords() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(chatbotBlockedKeywords).orderBy(chatbotBlockedKeywords.createdAt);
}

export async function createBlockedKeyword(keyword: string, reason?: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const [result] = await db.insert(chatbotBlockedKeywords).values({ keyword, reason: reason ?? null }).$returningId();
    return result.id;
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') return null;
    throw e;
  }
}

export async function deleteBlockedKeyword(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(chatbotBlockedKeywords).where(eq(chatbotBlockedKeywords.id, id));
}

// --- Chatbot Statistics ---
export async function getChatbotStats() {
  const db = await getDb();
  if (!db) return { totalConversations: 0, totalMessages: 0, totalFaqMatches: 0, activeConversations: 0, todayConversations: 0, avgMessagesPerConversation: 0 };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [convStats] = await db.select({
    total: sql<number>`COUNT(*)`,
    active: sql<number>`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`,
    today: sql<number>`SUM(CASE WHEN startedAt >= ${today} THEN 1 ELSE 0 END)`,
    totalMessages: sql<number>`SUM(messageCount)`,
    totalFaqMatches: sql<number>`SUM(faqMatchCount)`,
    avgMessages: sql<number>`AVG(messageCount)`,
  }).from(chatbotConversations);
  
  return {
    totalConversations: convStats?.total ?? 0,
    totalMessages: convStats?.totalMessages ?? 0,
    totalFaqMatches: convStats?.totalFaqMatches ?? 0,
    activeConversations: convStats?.active ?? 0,
    todayConversations: convStats?.today ?? 0,
    avgMessagesPerConversation: Math.round((convStats?.avgMessages ?? 0) * 10) / 10,
  };
}

// --- FAQ Matching ---
export async function matchFaq(userMessage: string): Promise<{ faq: any; score: number } | null> {
  const db = await getDb();
  if (!db) return null;
  
  const faqs = await db.select().from(chatbotFaqs).where(eq(chatbotFaqs.isActive, 1));
  if (faqs.length === 0) return null;
  
  const normalizedInput = userMessage.toLowerCase().trim();
  let bestMatch: { faq: any; score: number } | null = null;
  
  for (const faq of faqs) {
    let score = 0;
    
    // Check keywords match
    if (faq.keywords) {
      const keywords = faq.keywords.split(',').map(k => k.trim().toLowerCase());
      const matchedKeywords = keywords.filter(k => normalizedInput.includes(k));
      if (matchedKeywords.length > 0) {
        score = matchedKeywords.length / keywords.length;
      }
    }
    
    // Check question text similarity (simple contains check)
    const questions = [faq.questionJa, faq.questionKo].filter(Boolean).map(q => q!.toLowerCase());
    for (const q of questions) {
      if (normalizedInput.includes(q) || q.includes(normalizedInput)) {
        score = Math.max(score, 0.9);
      }
      // Check if significant words overlap
      const qWords = q.split(/[\s、。？！,.\?!]+/).filter(w => w.length > 1);
      const inputWords = normalizedInput.split(/[\s、。？！,.\?!]+/).filter(w => w.length > 1);
      const overlap = qWords.filter(w => inputWords.some(iw => iw.includes(w) || w.includes(iw)));
      if (qWords.length > 0 && overlap.length > 0) {
        const overlapScore = overlap.length / qWords.length;
        score = Math.max(score, overlapScore * 0.8);
      }
    }
    
    if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { faq, score };
    }
  }
  
  return bestMatch;
}

// --- Blocked Keywords Check ---
export async function checkBlockedKeywords(message: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const keywords = await db.select().from(chatbotBlockedKeywords);
  const normalizedMessage = message.toLowerCase();
  
  for (const kw of keywords) {
    if (normalizedMessage.includes(kw.keyword.toLowerCase())) {
      return kw.keyword;
    }
  }
  return null;
}


// ─── Legal Notice Functions ─────────────────────────────────────────────────

export async function getLegalNoticeByKey(key: string) {
  const db = await getDb();
  if (!db) return null;
  const [notice] = await db.select().from(legalNotices).where(eq(legalNotices.key, key));
  return notice;
}

export async function getAllLegalNotices() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(legalNotices);
}

export async function upsertLegalNotice(data: { key: string; titleJa: string; contentJa: string; isPublished?: number }) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getLegalNoticeByKey(data.key);
  
  if (existing) {
    await db.update(legalNotices)
      .set({
        titleJa: data.titleJa,
        contentJa: data.contentJa,
        isPublished: data.isPublished ?? existing.isPublished,
        updatedAt: new Date(),
      })
      .where(eq(legalNotices.key, data.key));
    return await getLegalNoticeByKey(data.key);
  } else {
    const [result] = await db.insert(legalNotices).values({
      key: data.key,
      titleJa: data.titleJa,
      contentJa: data.contentJa,
      isPublished: data.isPublished ?? 1,
    });
    return await getLegalNoticeByKey(data.key);
  }
}


/**
 * Get products also viewed by users who viewed this product (협업 필터링 추천)
 */
export async function getAlsoViewedProducts(productId: number, limit: number = 6): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get also viewed products: database not available");
    return [];
  }

  try {
    // 1. 현재 상품을 본 사용자들 찾기
    const usersWhoViewedThis = await db
      .select({ userId: productViews.userId })
      .from(productViews)
      .where(eq(productViews.productId, productId))
      .groupBy(productViews.userId);

    if (usersWhoViewedThis.length === 0) {
      // 조회 이력이 없으면 카테고리 기반 추천으로 폴백
      return getRelatedProducts(productId, limit);
    }

    const userIds = usersWhoViewedThis.map(u => u.userId);

    // 2. 이 사용자들이 본 다른 상품들 찾기 (현재 상품 제외)
    const alsoViewedProducts = await db
      .select({
        productId: productViews.productId,
        viewCount: sql<number>`SUM(${productViews.viewCount})`.as('total_views'),
      })
      .from(productViews)
      .where(
        sql`${productViews.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)}) AND ${productViews.productId} != ${productId}`
      )
      .groupBy(productViews.productId)
      .orderBy(desc(sql`total_views`))
      .limit(limit);

    if (alsoViewedProducts.length === 0) {
      // 함께 본 상품이 없으면 카테고리 기반 추천으로 폴백
      return getRelatedProducts(productId, limit);
    }

    // 3. 상품 정보 조회
    const productIds = alsoViewedProducts.map(p => p.productId);
    const productsData = await db
      .select()
      .from(products)
      .where(sql`${products.id} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`);

    // 4. 조회 횟수 순서대로 정렬
    const sortedProducts = alsoViewedProducts
      .map(av => productsData.find(p => p.id === av.productId))
      .filter((p): p is Product => p !== undefined);

    return sortedProducts;
  } catch (error) {
    console.error("[Database] Failed to get also viewed products:", error);
    // 에러 발생 시 카테고리 기반 추천으로 폴백
    return getRelatedProducts(productId, limit);
  }
}

// ============ Recommendation Event Tracking Functions ============

/**
 * Track recommendation event (impression or click)
 */
export async function trackRecommendationEvent(
  productId: number,
  recommendedProductId: number,
  recommendationType: 'tag_based' | 'collaborative' | 'category_based' | 'after_review',
  eventType: 'impression' | 'click',
  userId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot track recommendation event: database not available");
    return;
  }

  try {
    await db.insert(recommendationEvents).values({
      productId,
      recommendedProductId,
      recommendationType,
      eventType,
      userId: userId || null,
    });
  } catch (error) {
    console.error("[Database] Failed to track recommendation event:", error);
  }
}

/**
 * Get recommendation statistics by type
 */
export async function getRecommendationStats(
  startDate?: Date,
  endDate?: Date
): Promise<Array<{
  recommendationType: string;
  impressions: number;
  clicks: number;
  ctr: number;
}>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get recommendation stats: database not available");
    return [];
  }

  try {
    const conditions = [];
    if (startDate) {
      conditions.push(sql`${recommendationEvents.createdAt} >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`${recommendationEvents.createdAt} <= ${endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const stats = await db
      .select({
        recommendationType: recommendationEvents.recommendationType,
        eventType: recommendationEvents.eventType,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(recommendationEvents)
      .where(whereClause)
      .groupBy(recommendationEvents.recommendationType, recommendationEvents.eventType);

    // 타입별로 그룹화하여 impressions와 clicks를 계산
    const grouped = stats.reduce((acc, row) => {
      const type = row.recommendationType;
      if (!acc[type]) {
        acc[type] = { impressions: 0, clicks: 0 };
      }
      if (row.eventType === 'impression') {
        acc[type].impressions = Number(row.count);
      } else if (row.eventType === 'click') {
        acc[type].clicks = Number(row.count);
      }
      return acc;
    }, {} as Record<string, { impressions: number; clicks: number }>);

    // CTR 계산
    return Object.entries(grouped).map(([type, data]) => ({
      recommendationType: type,
      impressions: data.impressions,
      clicks: data.clicks,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
    }));
  } catch (error) {
    console.error("[Database] Failed to get recommendation stats:", error);
    return [];
  }
}

/**
 * Get top performing recommended products by type
 */
export async function getTopRecommendedProducts(
  recommendationType: 'tag_based' | 'collaborative' | 'category_based' | 'after_review',
  limit: number = 10
): Promise<Array<{
  product: Product;
  impressions: number;
  clicks: number;
  ctr: number;
}>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get top recommended products: database not available");
    return [];
  }

  try {
    const stats = await db
      .select({
        recommendedProductId: recommendationEvents.recommendedProductId,
        eventType: recommendationEvents.eventType,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(recommendationEvents)
      .where(eq(recommendationEvents.recommendationType, recommendationType))
      .groupBy(recommendationEvents.recommendedProductId, recommendationEvents.eventType);

    // 상품별로 그룹화
    const grouped = stats.reduce((acc, row) => {
      const productId = row.recommendedProductId;
      if (!acc[productId]) {
        acc[productId] = { impressions: 0, clicks: 0 };
      }
      if (row.eventType === 'impression') {
        acc[productId].impressions = Number(row.count);
      } else if (row.eventType === 'click') {
        acc[productId].clicks = Number(row.count);
      }
      return acc;
    }, {} as Record<number, { impressions: number; clicks: number }>);

    // CTR 계산 및 정렬
    const sorted = Object.entries(grouped)
      .map(([productId, data]) => ({
        productId: Number(productId),
        impressions: data.impressions,
        clicks: data.clicks,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);

    // 상품 정보 조회
    const productIds = sorted.map(item => item.productId);
    
    // productIds가 비어있으면 빈 배열 반환
    if (productIds.length === 0) {
      return [];
    }
    
    const productList = await db
      .select()
      .from(products)
      .where(sql`${products.id} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`);

    // 상품 정보와 통계 결합
    return sorted.map(stat => {
      const product = productList.find(p => p.id === stat.productId);
      return {
        product: product!,
        impressions: stat.impressions,
        clicks: stat.clicks,
        ctr: stat.ctr,
      };
    }).filter(item => item.product); // product가 없는 경우 제외
  } catch (error) {
    console.error("[Database] Failed to get top recommended products:", error);
    return [];
  }
}

/**
 * Award points for review creation
 */
export async function awardReviewPoints(params: {
  userId: number;
  reviewId: number;
  hasImages: boolean;
  contentLength: number;
}): Promise<{ totalPoints: number; breakdown: { base: number; image: number; detail: number } }> {
  const { userId, reviewId, hasImages, contentLength } = params;

  // Get point settings
  const basePoints = parseInt(await getSetting('REVIEW_POINTS') || '1500');
  const imagePoints = parseInt(await getSetting('REVIEW_IMAGE_POINTS') || '500');
  const detailPoints = parseInt(await getSetting('REVIEW_DETAIL_POINTS') || '200');
  const detailThreshold = parseInt(await getSetting('REVIEW_DETAIL_THRESHOLD') || '100');

  // Calculate points
  let totalPoints = basePoints;
  const breakdown = {
    base: basePoints,
    image: 0,
    detail: 0,
  };

  // Add image bonus
  if (hasImages) {
    totalPoints += imagePoints;
    breakdown.image = imagePoints;
  }

  // Add detail bonus
  if (contentLength >= detailThreshold) {
    totalPoints += detailPoints;
    breakdown.detail = detailPoints;
  }

  // Award points to user (이메일 기준으로 registered_users에 적립)
  const database = await getDb();
  if (database) {
    // 1. users 테이블에서 이메일 조회
    const oauthUser = await database
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const email = oauthUser[0]?.email;

    // 2. 이메일로 registered_users 조회
    let regUser: { id: number; points: number } | undefined;
    if (email) {
      const regResult = await database
        .select({ id: registeredUsers.id, points: registeredUsers.points })
        .from(registeredUsers)
        .where(eq(registeredUsers.email, email))
        .limit(1);
      regUser = regResult[0];
    }

    if (regUser) {
      // registered_users에 포인트 적립
      const newBalance = (regUser.points || 0) + totalPoints;
      await database.update(registeredUsers)
        .set({ points: newBalance })
        .where(eq(registeredUsers.id, regUser.id));
      // 거래 내역 기록
      await database.insert(pointTransactions).values({
        userId: regUser.id,
        userEmail: email,
        type: 'earn',
        amount: totalPoints,
        balance: newBalance,
        description: `レビュー投稿ポイント (レビューID: ${reviewId})`,
      });
      console.log(`[ReviewPoints] Awarded ${totalPoints} points to registered_user ${regUser.id} (${email}) for review ${reviewId}`);
    } else {
      // 폴백: users 테이블에 적립
      await database.update(users)
        .set({ points: sql`${users.points} + ${totalPoints}` })
        .where(eq(users.id, userId));
      console.log(`[ReviewPoints] Awarded ${totalPoints} points to oauth_user ${userId} (fallback) for review ${reviewId}`);
    }
  }

  console.log(`[ReviewPoints] Total ${totalPoints} points for user ${userId} review ${reviewId} (base: ${breakdown.base}, image: ${breakdown.image}, detail: ${breakdown.detail})`);

  return { totalPoints, breakdown };
}

// ============ Payment Settings Functions ============

export async function getAllPaymentSettings(): Promise<PaymentSetting[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(paymentSettings).orderBy(paymentSettings.sortOrder);
  } catch (e) {
    console.error("[DB] getAllPaymentSettings:", e);
    return [];
  }
}

export async function getPaymentSettingByProvider(provider: string): Promise<PaymentSetting | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(paymentSettings)
      .where(eq(paymentSettings.provider, provider as any))
      .limit(1);
    return result[0];
  } catch (e) {
    console.error("[DB] getPaymentSettingByProvider:", e);
    return undefined;
  }
}

export async function getActivePaymentSettings(): Promise<PaymentSetting[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(paymentSettings)
      .where(eq(paymentSettings.isActive, 1))
      .orderBy(paymentSettings.sortOrder);
  } catch (e) {
    console.error("[DB] getActivePaymentSettings:", e);
    return [];
  }
}

export async function upsertPaymentSetting(data: InsertPaymentSetting): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(paymentSettings).values(data).onDuplicateKeyUpdate({ set: data });
  } catch (e) {
    console.error("[DB] upsertPaymentSetting:", e);
  }
}

export async function togglePaymentProvider(provider: string, isActive: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(paymentSettings)
      .set({ isActive: isActive ? 1 : 0 })
      .where(eq(paymentSettings.provider, provider as any));
  } catch (e) {
    console.error("[DB] togglePaymentProvider:", e);
  }
}

// ============ Payment Transaction Functions ============

export async function createPayment(data: InsertPayment): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.insert(payments).values(data);
    if (result[0].insertId) {
      const rows = await db.select().from(payments).where(eq(payments.id, Number(result[0].insertId))).limit(1);
      return rows[0];
    }
  } catch (e) {
    console.error("[DB] createPayment:", e);
  }
  return undefined;
}

export async function getPaymentsByOrderId(orderId: number): Promise<Payment[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(payments)
      .where(eq(payments.orderId, orderId))
      .orderBy(desc(payments.createdAt));
  } catch (e) {
    console.error("[DB] getPaymentsByOrderId:", e);
    return [];
  }
}

export async function getPaymentsByUserId(userId: number, limit = 20, offset = 0): Promise<Payment[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (e) {
    console.error("[DB] getPaymentsByUserId:", e);
    return [];
  }
}

export async function updatePaymentStatus(
  id: number,
  status: Payment["status"],
  extra?: Partial<InsertPayment>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(payments).set({ status, ...extra }).where(eq(payments.id, id));
  } catch (e) {
    console.error("[DB] updatePaymentStatus:", e);
  }
}

export async function getPaymentByExternalId(externalPaymentId: string): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(payments)
      .where(eq(payments.externalPaymentId, externalPaymentId))
      .limit(1);
    return result[0];
  } catch (e) {
    console.error("[DB] getPaymentByExternalId:", e);
    return undefined;
  }
}

export async function getAdminPayments(params: {
  limit?: number;
  offset?: number;
  status?: string;
  provider?: string;
}): Promise<Payment[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const conditions = [];
    if (params.status) conditions.push(eq(payments.status, params.status as any));
    if (params.provider) conditions.push(eq(payments.provider, params.provider as any));
    return await db.select().from(payments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payments.createdAt))
      .limit(params.limit ?? 50)
      .offset(params.offset ?? 0);
  } catch (e) {
    console.error("[DB] getAdminPayments:", e);
    return [];
  }
}

// ============ Partial Cancellation Functions ============

/**
 * 특정 주문 아이템을 부분 취소 처리
 * - orderItems.cancelledAt, cancelReason 업데이트
 * - 취소 후 남은 아이템 수에 따라 orders.status 자동 결정
 */
export async function cancelOrderItems(
  orderId: number,
  itemIds: number[],
  cancelReason?: string,
  refundAmount?: number  // 환불 금액 (원 단위, Stripe에 전달)
): Promise<{ success: boolean; newStatus: string; refundId?: string; pointsRefunded?: number }> {
  const db = await getDb();
  if (!db) return { success: false, newStatus: "error" };
  try {
    const now = new Date();
    await db.update(orderItems)
      .set({ cancelledAt: now, cancelReason: cancelReason || "관리자 취소" })
      .where(and(eq(orderItems.orderId, orderId), inArray(orderItems.id, itemIds)));

    const allItems = await db.select({ id: orderItems.id, cancelledAt: orderItems.cancelledAt })
      .from(orderItems).where(eq(orderItems.orderId, orderId));

    const totalCount = allItems.length;
    const cancelledCount = allItems.filter(i => i.cancelledAt != null).length;

    let newStatus: string;
    if (cancelledCount === totalCount) {
      newStatus = "cancelled";
    } else {
      newStatus = "partially_cancelled";
    }

    await db.update(orders).set({ status: newStatus as any }).where(eq(orders.id, orderId));

    // 주문 정보 조회 (Stripe 환불 + 포인트 환불 + 이메일 발송에 필요)
    const [orderInfo] = await db.select({
      stripePaymentId: orders.stripePaymentId,
      paymentMethod: orders.paymentMethod,
      userId: orders.userId,
      pointsUsed: orders.pointsUsed,
      orderNumber: orders.orderNumber,
      shippingFee: orders.shippingFee,
      couponDiscount: orders.couponDiscount,
    }).from(orders).where(eq(orders.id, orderId));

    // 부분 취소 후 totalAmount 재계산 (취소되지 않은 상품들의 소계 합계 기준)
    try {
      const remainingItems = await db.select({
        subtotal: orderItems.subtotal,
      }).from(orderItems)
        .where(and(eq(orderItems.orderId, orderId), isNull(orderItems.cancelledAt)));

      const remainingSubtotal = remainingItems.reduce((s, i) => s + Number(i.subtotal || 0), 0);
      const shippingFee = Number(orderInfo?.shippingFee || 0);
      const couponDiscount = Number(orderInfo?.couponDiscount || 0);
      const pointsUsed = Number(orderInfo?.pointsUsed || 0);

      // 전체 취소인 경우 totalAmount = 0, 부분 취소는 재계산
      let newTotalAmount: number;
      if (newStatus === 'cancelled') {
        newTotalAmount = 0;
      } else {
        // 잔여 상품 소계 + 배송비 - 쿠폰할인 - 포인트사용
        // 쿠폰할인은 전체 주문에 적용되므로 잔여 상품에도 유지
        newTotalAmount = Math.max(0, remainingSubtotal + shippingFee - couponDiscount - pointsUsed);
      }

      await db.update(orders)
        .set({ totalAmount: newTotalAmount.toString() as any })
        .where(eq(orders.id, orderId));
      console.log(`[Order] Updated totalAmount for order ${orderId}: ${newTotalAmount} (remaining subtotal: ${remainingSubtotal})`);
    } catch (recalcError) {
      console.error('[Order] Failed to recalculate totalAmount (cancellation still processed):', recalcError);
    }

    // Stripe 환불 처리
    let refundId: string | undefined;
    if (refundAmount && refundAmount > 0) {
      try {
        if (orderInfo?.stripePaymentId && orderInfo.paymentMethod === 'stripe') {
          const { stripe } = await import('./stripe');
          const refund = await stripe.refunds.create({
            payment_intent: orderInfo.stripePaymentId,
            amount: refundAmount,
            reason: 'requested_by_customer',
            metadata: {
              orderId: orderId.toString(),
              cancelReason: cancelReason || '관리자 취소',
              itemIds: itemIds.join(','),
            },
          });
          refundId = refund.id;
          console.log(`[Stripe] Refund created: ${refundId} for order ${orderId}, amount: ${refundAmount}`);
        }
      } catch (stripeError) {
        console.error('[Stripe] Refund failed (order cancellation still processed):', stripeError);
      }
    }

    // 포인트 환불 처리 (전체 취소 시에만 포인트 전액 복원)
    let pointsRefunded = 0;
    if (newStatus === 'cancelled' && orderInfo?.userId && orderInfo.pointsUsed && orderInfo.pointsUsed > 0) {
      try {
        await addPointsToUser(
          orderInfo.userId,
          orderInfo.pointsUsed,
          `주문 취소 포인트 환불 (주문번호: ${orderInfo.orderNumber || orderId})`,
          orderId
        );
        pointsRefunded = orderInfo.pointsUsed;
        console.log(`[Points] Refunded ${orderInfo.pointsUsed} points to user ${orderInfo.userId} for cancelled order ${orderId}`);
      } catch (pointsError) {
        console.error('[Points] Failed to refund points (cancellation still processed):', pointsError);
      }
    }

    // 취소 이메일 발송 (취소된 아이템 정보 조회)
    try {
      if (orderInfo?.userId) {
        const userResult = await db.select({ email: registeredUsers.email, nameKanji: registeredUsers.nameKanji })
          .from(registeredUsers).where(eq(registeredUsers.id, orderInfo.userId)).limit(1);
        const cancelledItemDetails = await db.select({
          productName: orderItems.productName,
          productNameJa: orderItems.productNameJa,
          quantity: orderItems.quantity,
          subtotal: orderItems.subtotal,
          discountAmount: orderItems.discountAmount,
        }).from(orderItems)
          .where(and(eq(orderItems.orderId, orderId), inArray(orderItems.id, itemIds)));

        if (userResult[0]?.email && cancelledItemDetails.length > 0) {
          const { sendOrderCancellationEmail } = await import('./_core/emailService');
          const emailItems = cancelledItemDetails.map(item => ({
            productName: item.productName || '상품',
            productNameJa: item.productNameJa || item.productName || '商品',
            quantity: item.quantity,
            refundAmount: Number(item.subtotal || 0) - Number(item.discountAmount || 0),
          }));
          const totalRefund = emailItems.reduce((s, i) => s + i.refundAmount, 0);
          await sendOrderCancellationEmail({
            to: userResult[0].email,
            userName: buildFullName(userResult[0]),
            orderNumber: orderInfo.orderNumber || String(orderId),
            orderId,
            cancelledItems: emailItems,
            totalRefundAmount: totalRefund,
            cancelReason,
            paymentMethod: orderInfo.paymentMethod || 'unknown',
            isFullCancellation: newStatus === 'cancelled',
          });
        }
      }
    } catch (emailError) {
      console.error('[Email] Failed to send cancellation email (cancellation still processed):', emailError);
    }

    return { success: true, newStatus, refundId, pointsRefunded };
  } catch (error) {
    console.error("[Database] Failed to cancel order items:", error);
    return { success: false, newStatus: "error" };
  }
}

/**
 * 취소된 아이템을 복원 (취소 취소)
 */
export async function restoreOrderItem(
  orderId: number,
  itemId: number
): Promise<{ success: boolean; newStatus: string }> {
  const db = await getDb();
  if (!db) return { success: false, newStatus: "error" };
  try {
    // 복원 전 현재 주문 상태 저장
    const [currentOrder] = await db.select({ status: orders.status })
      .from(orders).where(eq(orders.id, orderId));
    const previousStatus = currentOrder?.status || 'confirmed';

    await db.update(orderItems)
      .set({ cancelledAt: null, cancelReason: null })
      .where(and(eq(orderItems.orderId, orderId), eq(orderItems.id, itemId)));

    const allItems = await db.select({ id: orderItems.id, cancelledAt: orderItems.cancelledAt })
      .from(orderItems).where(eq(orderItems.orderId, orderId));

    const totalCount = allItems.length;
    const cancelledCount = allItems.filter(i => i.cancelledAt != null).length;

    let newStatus: string;
    if (cancelledCount === 0) {
      // 전체 복원 시 취소 전 상태로 복원 (cancelled/partially_cancelled가 아닌 이전 상태)
      const nonCancelStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
      newStatus = nonCancelStatuses.includes(previousStatus) ? previousStatus : 'confirmed';
    } else if (cancelledCount < totalCount) {
      newStatus = "partially_cancelled";
    } else {
      newStatus = "cancelled";
    }

    await db.update(orders).set({ status: newStatus as any }).where(eq(orders.id, orderId));
    // 복원 후 totalAmount 재계산 (취소되지 않은 상품들의 소계 합계 기준)
    try {
      const [orderInfo] = await db.select({
        shippingFee: orders.shippingFee,
        couponDiscount: orders.couponDiscount,
        pointsUsed: orders.pointsUsed,
      }).from(orders).where(eq(orders.id, orderId));
      const remainingItems = await db.select({ subtotal: orderItems.subtotal })
        .from(orderItems)
        .where(and(eq(orderItems.orderId, orderId), isNull(orderItems.cancelledAt)));
      const remainingSubtotal = remainingItems.reduce((s, i) => s + Number(i.subtotal || 0), 0);
      const shippingFee = Number(orderInfo?.shippingFee || 0);
      const couponDiscount = Number(orderInfo?.couponDiscount || 0);
      const pointsUsed = Number(orderInfo?.pointsUsed || 0);
      const newTotalAmount = Math.max(0, remainingSubtotal + shippingFee - couponDiscount - pointsUsed);
      await db.update(orders)
        .set({ totalAmount: newTotalAmount.toString() as any })
        .where(eq(orders.id, orderId));
      console.log(`[Order] Restored totalAmount for order ${orderId}: ${newTotalAmount} (remaining subtotal: ${remainingSubtotal})`);
    } catch (recalcError) {
      console.error('[Order] Failed to recalculate totalAmount on restore (restore still processed):', recalcError);
    }
    return { success: true, newStatus };
  } catch (error) {
    console.error("[Database] Failed to restore order item:", error);
    return { success: false, newStatus: "error" };
  }
}
/**
 * Get order counts per status tab in a single queryy (replaces 5 separate admin.orders queries)
 */
export async function getOrderTabCounts(): Promise<{
  pending: number;
  paid: number;
  confirmed: number;
  processing: number;
  shipped: number;
  cancelled: number;
  partially_cancelled: number;
  delivered: number;
}> {
  const db = await getDb();
  if (!db) {
    return { pending: 0, paid: 0, confirmed: 0, processing: 0, shipped: 0, cancelled: 0, partially_cancelled: 0, delivered: 0 };
  }
  try {
    // 장바구니 단위 카운트: cartGroupId 기준 중복 제거
    const result = await db
      .select({
        status: orders.status,
        count: sql<number>`COUNT(DISTINCT COALESCE(${orders.cartGroupId}, CAST(COALESCE(${orders.parentOrderId}, ${orders.id}) AS CHAR)))`,
      })
      .from(orders)
      .groupBy(orders.status);

    const counts: Record<string, number> = {};
    result.forEach(r => {
      counts[r.status] = Number(r.count || 0);
    });

    return {
      pending: counts['pending'] || 0,
      paid: counts['paid'] || 0,
      confirmed: counts['confirmed'] || 0,
      processing: counts['processing'] || 0,
      shipped: counts['shipped'] || 0,
      cancelled: counts['cancelled'] || 0,
      partially_cancelled: counts['partially_cancelled'] || 0,
      delivered: counts['delivered'] || 0,
    };
  } catch (error) {
    console.error("[Database] Error getting order tab counts:", error);
    return { pending: 0, paid: 0, confirmed: 0, processing: 0, shipped: 0, cancelled: 0, partially_cancelled: 0, delivered: 0 };
  }
}

// ── 일괄 무통장 입금 확인 ────────────────────────────────────────────────────
export async function bulkConfirmBankTransfer(orderIds: number[]): Promise<{
  success: number;
  skipped: number;
  results: { orderId: number; orderNumber: string; success: boolean; reason?: string }[];
}> {
  if (!orderIds.length) return { success: 0, skipped: 0, results: [] };

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results: { orderId: number; orderNumber: string; success: boolean; reason?: string }[] = [];
  let successCount = 0;
  let skippedCount = 0;

  try {
    const targetOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        paymentMethod: orders.paymentMethod,
        status: orders.status,
        bankTransferConfirmedAt: orders.bankTransferConfirmedAt,
      })
      .from(orders)
      .where(inArray(orders.id, orderIds));

    for (const order of targetOrders) {
      if (order.paymentMethod !== 'bank_transfer') {
        results.push({ orderId: order.id, orderNumber: order.orderNumber || '', success: false, reason: '무통장 주문이 아닙니다.' });
        skippedCount++;
        continue;
      }
      if (order.bankTransferConfirmedAt) {
        results.push({ orderId: order.id, orderNumber: order.orderNumber || '', success: false, reason: '이미 입금 확인된 주문입니다.' });
        skippedCount++;
        continue;
      }

      await db
        .update(orders)
        .set({
          bankTransferConfirmedAt: new Date(),
          status: 'paid',  // 무통장 입금확인 시 결제완료 상태
          paymentStatus: 'paid',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      results.push({ orderId: order.id, orderNumber: order.orderNumber || '', success: true });
      successCount++;
    }

    return { success: successCount, skipped: skippedCount, results };
  } catch (error) {
    console.error('[Database] Error in bulkConfirmBankTransfer:', error);
    throw error;
  }
}

/**
 * 주간 베스트 상품 조회 (최근 7일 판매량 기반)
 */
export async function getWeeklyBestProducts(limit: number = 6): Promise<Product[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get products: database not available");
    return [];
  }

  try {
    // isVisible=true 상품 중 salesCount 내림차순, 동점이면 viewCount → sortOrder → createdAt 순
    const list = await db
      .select()
      .from(products)
      .where(eq(products.isVisible, true))
      .orderBy(desc(products.salesCount), desc(products.viewCount), desc(products.sortOrder), desc(products.createdAt))
      .limit(limit);
    // salesCount가 모두 0이면 인기(isPopular), 히트(isHit), 추천(isRecommended) 상품 우선
    const allZero = list.every((p) => (p.salesCount ?? 0) === 0);
    if (allZero) {
      const featured = await db
        .select()
        .from(products)
        .where(and(
          eq(products.isVisible, true),
          or(
            eq(products.isPopular, true),
            eq(products.isHit, true),
            eq(products.isRecommended, true),
          )
        ))
        .orderBy(desc(products.viewCount), desc(products.sortOrder), desc(products.createdAt))
        .limit(limit);
      if (featured.length >= 3) return featured;
    }
    return list;
  } catch (error) {
    console.error("[Database] Failed to get weekly best products:", error);
    return [];
  }
}

/**
 * Admin: Get all reviews with product info and filters
 */
export async function adminGetAllReviews(params?: {
  status?: 'pending' | 'approved' | 'rejected';
  limit?: number;
  offset?: number;
}): Promise<Array<Review & { productName: string | null; productNameJa: string | null; productImageUrl: string | null }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get reviews: database not available");
    return [];
  }
  try {
    let query: any = db
      .select({
        review: reviews,
        productName: products.name,
        productNameJa: products.nameJa,
        productImageUrl: products.imageUrl,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id));

    if (params?.status) {
      query = query.where(eq(reviews.status, params.status));
    }

    query = query.orderBy(desc(reviews.createdAt));

    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.offset(params.offset);
    }

    const rows = await query;
    return rows.map((row: any) => ({
      ...row.review,
      productName: row.productName ?? null,
      productNameJa: row.productNameJa ?? null,
      productImageUrl: row.productImageUrl ?? null,
    }));
  } catch (error) {
    console.error("[Database] Failed to get admin reviews:", error);
    return [];
  }
}

/**
 * Admin: Update review status (approve / reject)
 */
export async function adminUpdateReviewStatus(
  reviewId: number,
  status: 'approved' | 'rejected'
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.update(reviews).set({ status }).where(eq(reviews.id, reviewId));
    console.log(`[Database] Review ${reviewId} status updated to ${status}`);
  } catch (error) {
    console.error("[Database] Failed to update review status:", error);
    throw error;
  }
}

/**
 * Admin: Delete review by id (admin can delete any review)
 */
export async function adminDeleteReview(reviewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.delete(reviews).where(eq(reviews.id, reviewId));
    console.log(`[Database] Review ${reviewId} deleted by admin`);
  } catch (error) {
    console.error("[Database] Failed to delete review:", error);
    throw error;
  }
}

/**
 * Admin: Get review count by status
 */
export async function getReviewCountByStatus(): Promise<{ pending: number; approved: number; rejected: number; total: number }> {
  const db = await getDb();
  if (!db) return { pending: 0, approved: 0, rejected: 0, total: 0 };
  try {
    const rows = await db
      .select({ status: reviews.status, count: sql<number>`COUNT(*)` })
      .from(reviews)
      .groupBy(reviews.status);

    const result = { pending: 0, approved: 0, rejected: 0, total: 0 };
    for (const row of rows) {
      const count = Number(row.count);
      const s = row.status as string;
      if (s === 'pending') result.pending = count;
      else if (s === 'approved') result.approved = count;
      else if (s === 'rejected') result.rejected = count;
      result.total += count;
    }
    return result;
  } catch (error) {
    console.error("[Database] Failed to get review counts:", error);
    return { pending: 0, approved: 0, rejected: 0, total: 0 };
  }
}

/**
 * Check if user already reviewed a product (duplicate review prevention)
 */
export async function getUserReviewForProduct(userId: number, productId: number): Promise<Review | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.productId, productId)))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to check user review for product:", error);
    return null;
  }
}

// ============================================================
// 포인트 만료 알림 관련 함수
// ============================================================

/**
 * 만료 예정 포인트 트랜잭션 조회 (만료 N일 이내, 아직 알림 미발송)
 */
export async function getExpiringPointTransactions(daysAhead: number = 30): Promise<Array<{
  id: number;
  userId: number;
  amount: number;
  expiresAt: Date;
  userEmail: string | null;
  userName: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  try {
    const now = new Date();
    const threshold = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const result = await db
      .select({
        id: pointTransactions.id,
        userId: pointTransactions.userId,
        amount: pointTransactions.amount,
        expiresAt: pointTransactions.expiresAt,
        userEmail: users.email,
        userName: users.nameKanji,
      })
      .from(pointTransactions)
      .innerJoin(users, eq(pointTransactions.userId, users.id))
      .where(
        and(
          isNotNull(pointTransactions.expiresAt),
          gt(pointTransactions.expiresAt, now),
          lte(pointTransactions.expiresAt, threshold),
          isNull(pointTransactions.expiryNotifiedAt),
          gt(pointTransactions.amount, 0),
        )
      );
    return result.map(r => ({ ...r, expiresAt: r.expiresAt! }));
  } catch (error) {
    console.error('[Database] Failed to get expiring point transactions:', error);
    return [];
  }
}

/**
 * 포인트 트랜잭션 만료 알림 발송 완료 표시
 */
export async function markPointExpiryNotified(transactionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .update(pointTransactions)
      .set({ expiryNotifiedAt: new Date() })
      .where(eq(pointTransactions.id, transactionId));
  } catch (error) {
    console.error('[Database] Failed to mark point expiry notified:', error);
  }
}

/**
 * 사용자의 만료 예정 포인트 합계 조회 (사이트 내 알림용)
 */
export async function getUserExpiringPoints(userId: number, daysAhead: number = 30): Promise<{
  totalExpiring: number;
  nearestExpiry: Date | null;
}> {
  const db = await getDb();
  if (!db) return { totalExpiring: 0, nearestExpiry: null };
  try {
    const now = new Date();
    const threshold = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const result = await db
      .select({
        amount: pointTransactions.amount,
        expiresAt: pointTransactions.expiresAt,
      })
      .from(pointTransactions)
      .where(
        and(
          eq(pointTransactions.userId, userId),
          isNotNull(pointTransactions.expiresAt),
          gt(pointTransactions.expiresAt, now),
          lte(pointTransactions.expiresAt, threshold),
          gt(pointTransactions.amount, 0),
        )
      )
      .orderBy(pointTransactions.expiresAt);

    const totalExpiring = result.reduce((sum, r) => sum + r.amount, 0);
    const nearestExpiry = result.length > 0 ? result[0].expiresAt : null;
    return { totalExpiring, nearestExpiry };
  } catch (error) {
    console.error('[Database] Failed to get user expiring points:', error);
    return { totalExpiring: 0, nearestExpiry: null };
  }
}

/**
 * 포인트 적립 시 만료일 설정 (기본 12개월)
 */
export async function setPointTransactionExpiry(
  transactionId: number,
  expiryMonths: number = 12
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + expiryMonths);
    await db
      .update(pointTransactions)
      .set({ expiresAt })
      .where(eq(pointTransactions.id, transactionId));
  } catch (error) {
    console.error('[Database] Failed to set point transaction expiry:', error);
  }
}

// ============ Setting Audit Log Functions ============
export async function createSettingAuditLog(data: {
  settingKey: string;
  previousValue: string | null;
  newValue: string | null;
  changedBy: number;
  changedByName?: string;
  changeNote?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(settingAuditLogs).values({
      settingKey: data.settingKey,
      previousValue: data.previousValue,
      newValue: data.newValue,
      changedBy: data.changedBy,
      changedByName: data.changedByName || null,
      changeNote: data.changeNote || null,
    });
  } catch (error) {
    console.error('[Database] Failed to create setting audit log:', error);
  }
}

export async function getSettingAuditLogs(options?: {
  settingKey?: string;
  limit?: number;
  offset?: number;
}): Promise<Array<{
  id: number;
  settingKey: string;
  previousValue: string | null;
  newValue: string | null;
  changedBy: number;
  changedByName: string | null;
  changeNote: string | null;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];
  try {
    const conditions = [];
    if (options?.settingKey) {
      conditions.push(eq(settingAuditLogs.settingKey, options.settingKey));
    }
    const query = db
      .select()
      .from(settingAuditLogs)
      .orderBy(desc(settingAuditLogs.createdAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  } catch (error) {
    console.error('[Database] Failed to get setting audit logs:', error);
    return [];
  }
}




export async function createEmailLog(data: InsertEmailLog) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [row] = await db.insert(emailLogs).values(data);
  return row;
}

export async function getEmailLogs(params: {
  emailType?: string;
  status?: 'sent' | 'failed' | 'skipped';
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const { emailType, status, limit = 50, offset = 0 } = params;
  const conditions = [];
  if (emailType) conditions.push(eq(emailLogs.emailType, emailType));
  if (status) conditions.push(eq(emailLogs.status, status));

  const rows = await db
    .select()
    .from(emailLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(emailLogs.sentAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: count() })
    .from(emailLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return { rows, total: countResult?.count ?? 0 };
}

export async function getEmailLogStats() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      emailType: emailLogs.emailType,
      status: emailLogs.status,
      count: count(),
    })
    .from(emailLogs)
    .groupBy(emailLogs.emailType, emailLogs.status)
    .orderBy(emailLogs.emailType);
  return rows;
}



// 날짜별 이메일 발송 통계 (최근 30일)
export async function getEmailLogStatsByDate() {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.execute(sql`
      SELECT 
        DATE(sentAt) as date,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
        COUNT(*) as total
      FROM email_logs
      WHERE sentAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(sentAt)
      ORDER BY date ASC
    `);
    return (rows as any[]).map(r => ({
      date: String(r.date),
      sent: Number(r.sent),
      failed: Number(r.failed),
      skipped: Number(r.skipped),
      total: Number(r.total),
    }));
  } catch { return []; }
}

// 이메일 타입별 상세 통계
export async function getEmailLogStatsByType() {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.execute(sql`
      SELECT 
        emailType,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
        COUNT(*) as total,
        MAX(sentAt) as lastSentAt
      FROM email_logs
      GROUP BY emailType
      ORDER BY total DESC
    `);
    return (rows as any[]).map(r => ({
      emailType: String(r.emailType),
      sent: Number(r.sent),
      failed: Number(r.failed),
      skipped: Number(r.skipped),
      total: Number(r.total),
      lastSentAt: r.lastSentAt ? new Date(r.lastSentAt) : null,
    }));
  } catch { return []; }
}

// ─── User Notification Helpers ────────────────────────────────────────────────
/**
 * 사용자에게 인앱 알림을 삽입합니다 (non-blocking, 실패해도 메인 로직에 영향 없음).
 */
/**
 * 알림 삽입 헬퍼 — 템플릿 우선 조회 방식
 *
 * templateName 이 지정된 경우:
 *   1. notification_templates 테이블에서 name = templateName 인 행을 조회
 *   2. 템플릿이 존재하면 템플릿의 title / message / link 를 사용
 *      (템플릿 message 안의 {{변수}} 는 templateVars 로 치환)
 *   3. 템플릿이 없으면 params.title / params.message / params.link fallback 사용
 *
 * 표준 templateName 키:
 *   order_created, order_cancelled, order_delivered, order_status_update, order_refunded
 *   review_point, review_approved, review_rejected
 *   inquiry_replied, qa_replied
 *   tier_upgraded, tier_downgraded
 *   coupon_issued, point_adjusted, welcome
 */
export async function insertNotification(params: {
  userId: number;
  type: "order" | "admin" | "tier" | "coupon" | "point" | "review" | "inquiry" | "system";
  title: string;
  message: string;
  link?: string;
  /** 관리자가 등록한 템플릿의 name 키 (없으면 params.title/message 사용) */
  templateName?: string;
  /** 템플릿 내 {{변수}} 치환용 맵 e.g. { orderNumber: 'ORD-001', tierName: '골드' } */
  templateVars?: Record<string, string>;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const { userNotifications, notificationTemplates } = await import('../drizzle/schema');

    // ── 템플릿 조회 ──────────────────────────────────────────────────────────
    let finalTitle   = params.title;
    let finalMessage = params.message;
    let finalLink    = params.link;

    if (params.templateName) {
      try {
        const [tpl] = await db
          .select()
          .from(notificationTemplates)
          .where(eq(notificationTemplates.name, params.templateName))
          .limit(1);

        if (tpl) {
          const replace = (str: string) =>
            str.replace(/\{\{(\w+)\}\}/g, (_, key) => params.templateVars?.[key] ?? _);
          finalTitle   = replace(tpl.title);
          finalMessage = replace(tpl.message);
          finalLink    = tpl.link ? replace(tpl.link) : params.link;
          console.log(`[Notification] Template '${params.templateName}' applied for userId=${params.userId}`);
        } else {
          console.log(`[Notification] Template '${params.templateName}' not found — using fallback`);
        }
      } catch (tplErr) {
        console.error('[Notification] Template lookup failed, using fallback:', tplErr);
      }
    }

    // ── 알림 삽입 ────────────────────────────────────────────────────────────
    await db.insert(userNotifications).values({
      userId: params.userId,
      type: params.type,
      title: finalTitle,
      message: finalMessage,
      link: finalLink,
    });

    // ── SSE 실시간 전송 ───────────────────────────────────────────────────────
    try {
      const { notifyUserSSE } = await import('./_core/sseManager');
      notifyUserSSE(params.userId, {
        type: params.type,
        title: finalTitle,
        message: finalMessage,
        link: finalLink,
      });
    } catch { /* SSE 없어도 무시 */ }
  } catch (err) {
    console.error('[Notification] insertNotification failed:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 장바구니 단위 주문 관리 (Cart-Group based order management)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 관리자용: 장바구니 그룹 목록 조회 (cartGroupId 기준으로 그룹핑)
 * 각 그룹은 대표 주문 정보 + 그룹 내 모든 주문의 상품 목록을 포함
 */
export async function adminGetCartGroups(params: {
  page: number;
  limit: number;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  groups: Array<{
    cartGroupId: string;
    groupTrackingNumber: string | null;
    orders: Array<Order & { itemsWithImages: Array<{ id: number; productId: number; productName: string; productNameJa: string; quantity: number; unitPrice: string; subtotal: string; imageUrl: string | null; tierName: string | null; itemTrackingNumber: string | null; itemCarrier: string | null; itemShippedAt: Date | null; itemDeliveredAt: Date | null; cancelledAt: Date | null }> }>;
    totalAmount: number;
    itemCount: number;
    orderCount: number;
    status: string;
    createdAt: Date;
    userId: number;
    userName: string | null;
    userEmail: string | null;
    shippingName: string;
    shippingAddress: string;
    shippingPhone: string | null;
    shippingPostalCode: string | null;
    paymentMethod: string | null;
    couponDiscount: number;
    pointsUsed: number;
  }>;
  total: number;
}> {
  const db = await getDb();
  if (!db) return { groups: [], total: 0 };

  try {
    const conditions: any[] = [];

    if (params.status && params.status !== 'all') {
      const statusArray = params.status.split(',').map(s => s.trim());
      if (statusArray.length === 1) {
        conditions.push(eq(orders.status, statusArray[0] as any));
      } else {
        conditions.push(inArray(orders.status, statusArray as any));
      }
    }
    if (params.search) {
      conditions.push(
        sql`(${orders.orderNumber} LIKE ${`%${params.search}%`} OR ${orders.shippingName} LIKE ${`%${params.search}%`} OR ${orders.shippingPhone} LIKE ${`%${params.search}%`} OR ${orders.cartGroupId} LIKE ${`%${params.search}%`})`
      );
    }
    if (params.dateFrom) {
      conditions.push(sql`${orders.createdAt} >= ${params.dateFrom}`);
    }
    if (params.dateTo) {
      conditions.push(sql`${orders.createdAt} <= ${params.dateTo + ' 23:59:59'}`);
    }
    if (params.paymentMethod && params.paymentMethod !== 'all') {
      conditions.push(eq(orders.paymentMethod, params.paymentMethod as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get distinct cartGroupIds with pagination
    const sortDir = params.sortOrder === 'asc' ? asc : desc;

    // Count distinct cart groups
    const countResult = await db
      .selectDistinct({ cartGroupId: orders.cartGroupId })
      .from(orders)
      .where(whereClause);
    const total = countResult.length;

    // Get paginated cartGroupIds (ordered by most recent order in group)
    const offset = (params.page - 1) * params.limit;
    const groupIds = await db
      .select({
        cartGroupId: orders.cartGroupId,
        latestCreatedAt: sql<Date>`MAX(${orders.createdAt})`,
      })
      .from(orders)
      .where(whereClause)
      .groupBy(orders.cartGroupId)
      .orderBy(sortDir(sql`MAX(${orders.createdAt})`))
      .limit(params.limit)
      .offset(offset);

    // For each cartGroupId, fetch all orders and their items
    const groups = await Promise.all(
      groupIds.map(async ({ cartGroupId }) => {
        if (!cartGroupId) return null;

        const groupOrders = await db.select().from(orders)
          .where(eq(orders.cartGroupId, cartGroupId))
          .orderBy(asc(orders.createdAt));

        if (groupOrders.length === 0) return null;

        // Fetch items for all orders in this group
        const orderIds = groupOrders.map(o => o.id);
        const allItems = await db.select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          productName: orderItems.productName,
          productNameJa: orderItems.productNameJa,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          subtotal: orderItems.subtotal,
          imageUrl: orderItems.productImageUrl,
          tierName: orderItems.tierName,
          itemTrackingNumber: orderItems.itemTrackingNumber,
          itemCarrier: orderItems.itemCarrier,
          itemShippedAt: orderItems.itemShippedAt,
          itemDeliveredAt: orderItems.itemDeliveredAt,
          cancelledAt: orderItems.cancelledAt,
        }).from(orderItems).where(inArray(orderItems.orderId, orderIds));

        // Fetch shipments for all orders to use as fallback tracking
        let shipmentTrackingByOrderId = new Map<number, { trackingNumber: string | null; carrier: string | null }>();
        try {
          const allShipmentRows = await db
            .select({ orderId: shipments.orderId, trackingNumber: shipments.trackingNumber, carrier: shipments.carrier })
            .from(shipments)
            .where(inArray(shipments.orderId, orderIds));
          for (const s of allShipmentRows) {
            if (!shipmentTrackingByOrderId.has(s.orderId) && s.trackingNumber) {
              shipmentTrackingByOrderId.set(s.orderId, { trackingNumber: s.trackingNumber, carrier: s.carrier });
            }
          }
        } catch {}

        // Group items by orderId
        const itemsByOrderId = new Map<number, typeof allItems>();
        for (const item of allItems) {
          if (!itemsByOrderId.has(item.orderId)) itemsByOrderId.set(item.orderId, []);
          itemsByOrderId.get(item.orderId)!.push(item);
        }

        const ordersWithItems = groupOrders.map(order => ({
          ...order,
          itemsWithImages: (itemsByOrderId.get(order.id) || []).map(item => {
            // If itemTrackingNumber is empty, fall back to shipments table
            if (!item.itemTrackingNumber) {
              const shipTracking = shipmentTrackingByOrderId.get(item.orderId);
              if (shipTracking?.trackingNumber) {
                return { ...item, itemTrackingNumber: shipTracking.trackingNumber, itemCarrier: shipTracking.carrier };
              }
            }
            return item;
          }),
        }));

        // Get user info from first order
        const firstOrder = groupOrders[0];
        let userName: string | null = null;
        let userEmail: string | null = null;
        if (firstOrder.userId) {
          try {
            const userResult = await db.select().from(registeredUsers)
              .where(eq(registeredUsers.id, firstOrder.userId)).limit(1);
            if (userResult[0]) {
              userName = buildFullName(userResult[0]);
              userEmail = userResult[0].email;
            }
          } catch {}
        }

        // Calculate totals
        const totalAmount = groupOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        const itemCount = allItems.length;

        // Determine group status (worst status in group)
        const statusPriority: Record<string, number> = {
          pending: 0, paid: 1, confirmed: 2, shipped: 3, delivered: 4,
          completed: 5, cancelled: 6, partially_cancelled: 7
        };
        const groupStatus = groupOrders.reduce((worst, o) => {
          return (statusPriority[o.status] ?? 0) < (statusPriority[worst] ?? 0) ? o.status : worst;
        }, groupOrders[0].status);

        // Get first tracking number: first from orderItems, then fallback to shipments table
        let firstTrackingNumber: string | null = allItems.length > 0 ? allItems[0].itemTrackingNumber : null;
        let firstCarrier: string | null = allItems.length > 0 ? allItems[0].itemCarrier : null;
        // Get shipment tracking status (latest status from shipments table)
        let groupShipmentStatus: string | null = null;
        if (orderIds.length > 0) {
          try {
            const shipmentRows = await db
              .select({ trackingNumber: shipments.trackingNumber, carrier: shipments.carrier, status: shipments.status })
              .from(shipments)
              .where(inArray(shipments.orderId, orderIds))
              .orderBy(desc(shipments.updatedAt))
              .limit(1);
            if (shipmentRows[0]) {
              if (!firstTrackingNumber && shipmentRows[0].trackingNumber) {
                firstTrackingNumber = shipmentRows[0].trackingNumber;
                firstCarrier = shipmentRows[0].carrier;
              }
              groupShipmentStatus = shipmentRows[0].status;
            }
          } catch {}
        }
        // Also check orderItems for carrier if not set
        if (!firstCarrier && allItems.length > 0) {
          firstCarrier = allItems.find(i => i.itemCarrier)?.itemCarrier ?? null;
        }

        return {
          cartGroupId,
          groupTrackingNumber: firstTrackingNumber,
          groupCarrier: firstCarrier,
          groupShipmentStatus,
          orders: ordersWithItems,
          totalAmount,
          itemCount,
          orderCount: groupOrders.length,
          status: groupStatus,
          createdAt: firstOrder.createdAt,
          userId: firstOrder.userId,
          userName,
          userEmail,
          shippingName: firstOrder.shippingName,
          shippingAddress: firstOrder.shippingAddress,
          shippingPhone: firstOrder.shippingPhone ?? null,
          shippingPostalCode: firstOrder.shippingPostalCode ?? null,
          paymentMethod: firstOrder.paymentMethod ?? null,
          couponDiscount: groupOrders.reduce((sum, o) => sum + Number(o.couponDiscount || 0), 0),
          pointsUsed: groupOrders.reduce((sum, o) => sum + Number(o.pointsUsed || 0), 0),
        };
      })
    );

    return {
      groups: groups.filter(Boolean) as any[],
      total,
    };
  } catch (error) {
    console.error("[Database] Failed to get cart groups:", error);
    return { groups: [], total: 0 };
  }
}

/**
 * 관리자용: 장바구니 그룹 상세 조회 (cartGroupId로 전체 주문 + 상품 + 배송 정보)
 */
export async function adminGetCartGroupDetail(cartGroupId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const groupOrders = await db.select().from(orders)
      .where(eq(orders.cartGroupId, cartGroupId))
      .orderBy(asc(orders.createdAt));

    if (groupOrders.length === 0) return null;

    const orderIds = groupOrders.map(o => o.id);

    // Fetch all items with full details
    const allItems = await db.select().from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    // Fetch all shipments
    const allShipments = await db.select().from(shipments)
      .where(inArray(shipments.orderId, orderIds));

    // Fetch shipment events for all shipments
    const shipmentIds = allShipments.map(s => s.id);
    const allEvents = shipmentIds.length > 0
      ? await db.select().from(shipmentEvents).where(inArray(shipmentEvents.shipmentId, shipmentIds))
      : [];

    // Fetch tracking cache alerts (세관 조회 등 경고 상태)
    const allTrackingNumbers = allShipments.map(s => s.trackingNumber).filter(Boolean) as string[];
    const trackingCacheMap = new Map<string, { hasAlert: boolean; alertType: string | null; alertDescription: string | null }>();
    if (allTrackingNumbers.length > 0) {
      try {
        const cacheRows = await db
          .select({ trackingNumber: shipmentTrackingCache.trackingNumber, hasAlert: shipmentTrackingCache.hasAlert, alertType: shipmentTrackingCache.alertType, alertDescription: shipmentTrackingCache.alertDescription })
          .from(shipmentTrackingCache)
          .where(inArray(shipmentTrackingCache.trackingNumber, allTrackingNumbers));
        for (const row of cacheRows) {
          trackingCacheMap.set(row.trackingNumber, { hasAlert: row.hasAlert, alertType: row.alertType, alertDescription: row.alertDescription });
        }
      } catch {}
    }

    // Get user info (orders.userId references users.id, not registeredUsers.id)
    const firstOrder = groupOrders[0];
    let user: any = null;
    if (firstOrder.userId) {
      try {
        const userResult = await db.select().from(users)
          .where(eq(users.id, firstOrder.userId)).limit(1);
        if (userResult[0]) user = userResult[0];
      } catch {}
    }

    // Get coupon info for each order
    const couponInfoByOrderId = new Map<number, { code: string; nameJa: string; discountAmount: string }>();
    for (const orderId of orderIds) {
      try {
        const couponResult = await db.select({
          code: coupons.code,
          nameJa: coupons.nameJa,
          discountAmount: couponUsages.discountAmount,
        }).from(couponUsages)
          .innerJoin(coupons, eq(couponUsages.couponId, coupons.id))
          .where(eq(couponUsages.orderId, orderId)).limit(1);
        if (couponResult[0]) couponInfoByOrderId.set(orderId, couponResult[0]);
      } catch {}
    }

    // Group items and shipments by orderId
    const itemsByOrderId = new Map<number, typeof allItems>();
    for (const item of allItems) {
      if (!itemsByOrderId.has(item.orderId)) itemsByOrderId.set(item.orderId, []);
      itemsByOrderId.get(item.orderId)!.push(item);
    }

    const shipmentsByOrderId = new Map<number, typeof allShipments>();
    for (const s of allShipments) {
      if (!shipmentsByOrderId.has(s.orderId)) shipmentsByOrderId.set(s.orderId, []);
      shipmentsByOrderId.get(s.orderId)!.push(s);
    }

    const eventsByShipmentId = new Map<number, typeof allEvents>();
    for (const e of allEvents) {
      if (!eventsByShipmentId.has(e.shipmentId)) eventsByShipmentId.set(e.shipmentId, []);
      eventsByShipmentId.get(e.shipmentId)!.push(e);
    }

    // Build a map: orderId -> first shipment trackingNumber (for fallback)
    const shipmentTrackingByOrderId = new Map<number, { trackingNumber: string | null; carrier: string | null }>();
    for (const s of allShipments) {
      if (!shipmentTrackingByOrderId.has(s.orderId) && s.trackingNumber) {
        shipmentTrackingByOrderId.set(s.orderId, { trackingNumber: s.trackingNumber, carrier: s.carrier });
      }
    }

    const ordersDetail = groupOrders.map(order => ({
      ...order,
      items: (itemsByOrderId.get(order.id) || []).map(item => {
        // If itemTrackingNumber is empty, fall back to shipments table
        let resolvedItem = item;
        if (!item.itemTrackingNumber) {
          const shipTracking = shipmentTrackingByOrderId.get(item.orderId);
          if (shipTracking?.trackingNumber) {
            resolvedItem = { ...item, itemTrackingNumber: shipTracking.trackingNumber, itemCarrier: shipTracking.carrier };
          }
        }
        // Attach tracking cache alert info (세관 조회 등)
        const trackingNum = resolvedItem.itemTrackingNumber;
        const cacheAlert = trackingNum ? trackingCacheMap.get(trackingNum) : null;
        return {
          ...resolvedItem,
          trackingHasAlert: cacheAlert?.hasAlert ?? false,
          trackingAlertType: cacheAlert?.alertType ?? null,
          trackingAlertDescription: cacheAlert?.alertDescription ?? null,
        };
      }),
      shipments: shipmentsByOrderId.get(order.id) || [],
      couponInfo: couponInfoByOrderId.get(order.id) || null,
    }));

    const totalAmount = groupOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    return {
      cartGroupId,
      orders: ordersDetail,
      user,
      totalAmount,
      allShipments,
      allEvents: eventsByShipmentId,
    };
  } catch (error) {
    console.error("[Database] Failed to get cart group detail:", error);
    return null;
  }
}

/**
 * 상품별 송장번호 업데이트
 */
export async function updateOrderItemTracking(params: {
  orderItemId: number;
  trackingNumber: string | null;
  carrier: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  try {
    const updateData: any = {
      itemTrackingNumber: params.trackingNumber,
      itemCarrier: params.carrier,
    };
    if (params.trackingNumber) {
      updateData.itemShippedAt = new Date();
    }
    await db.update(orderItems).set(updateData).where(eq(orderItems.id, params.orderItemId));
  } catch (error) {
    console.error("[Database] Failed to update order item tracking:", error);
    throw error;
  }
}

/**
 * 사용자용: 장바구니 그룹 목록 조회 (내 주문 목록 - 장바구니 단위)
 */
export async function getUserCartGroups(userId: number, params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{
  groups: Array<{
    cartGroupId: string;
    orders: Array<Order & { items: Array<{ id: number; productId: number; productNameJa: string; productName: string; quantity: number; unitPrice: string; subtotal: string; imageUrl: string | null; tierName: string | null; itemTrackingNumber: string | null; itemCarrier: string | null; itemShippedAt: Date | null; itemDeliveredAt: Date | null; cancelledAt: Date | null }> }>;
    totalAmount: number;
    itemCount: number;
    status: string;
    createdAt: Date;
    paymentMethod: string | null;
    couponUsage?: { couponCode: string; discountAmount: string } | null;
  }>;
  total: number;
  totalPages: number;
}> {
  const db = await getDb();
  if (!db) return { groups: [], total: 0, totalPages: 0 };

  try {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(orders.userId, userId)];
    if (params.status && params.status !== 'all') {
      conditions.push(eq(orders.status, params.status as any));
    }
    const whereClause = and(...conditions);

    // Count distinct cart groups
    const countResult = await db
      .selectDistinct({ cartGroupId: orders.cartGroupId })
      .from(orders)
      .where(whereClause);
    const total = countResult.length;
    const totalPages = Math.ceil(total / limit);

    // Get paginated cartGroupIds
    const groupIds = await db
      .select({
        cartGroupId: orders.cartGroupId,
        latestCreatedAt: sql<Date>`MAX(${orders.createdAt})`,
      })
      .from(orders)
      .where(whereClause)
      .groupBy(orders.cartGroupId)
      .orderBy(desc(sql`MAX(${orders.createdAt})`))
      .limit(limit)
      .offset(offset);

    const groups = await Promise.all(
      groupIds.map(async ({ cartGroupId }) => {
        if (!cartGroupId) return null;

        const groupOrders = await db.select().from(orders)
          .where(and(eq(orders.cartGroupId, cartGroupId), eq(orders.userId, userId)))
          .orderBy(asc(orders.createdAt));

        if (groupOrders.length === 0) return null;

        const orderIds = groupOrders.map(o => o.id);
        const allItems = await db.select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          productName: orderItems.productName,
          productNameJa: orderItems.productNameJa,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          subtotal: orderItems.subtotal,
          imageUrl: orderItems.productImageUrl,
          tierName: orderItems.tierName,
          itemTrackingNumber: orderItems.itemTrackingNumber,
          itemCarrier: orderItems.itemCarrier,
          itemShippedAt: orderItems.itemShippedAt,
          itemDeliveredAt: orderItems.itemDeliveredAt,
          cancelledAt: orderItems.cancelledAt,
        }).from(orderItems).where(inArray(orderItems.orderId, orderIds));

        const itemsByOrderId = new Map<number, typeof allItems>();
        for (const item of allItems) {
          if (!itemsByOrderId.has(item.orderId)) itemsByOrderId.set(item.orderId, []);
          itemsByOrderId.get(item.orderId)!.push(item);
        }

        const ordersWithItems = groupOrders.map(order => ({
          ...order,
          items: itemsByOrderId.get(order.id) || [],
        }));

        const totalAmount = groupOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        const itemCount = allItems.length;

        const statusPriority: Record<string, number> = {
          pending: 0, paid: 1, confirmed: 2, shipped: 3, delivered: 4,
          completed: 5, cancelled: 6, partially_cancelled: 7
        };
        const groupStatus = groupOrders.reduce((worst, o) => {
          return (statusPriority[o.status] ?? 0) < (statusPriority[worst] ?? 0) ? o.status : worst;
        }, groupOrders[0].status);

        // Coupon info from first order
        let couponUsage: { couponCode: string; discountAmount: string } | null = null;
        try {
          const couponResult = await db.select({
            couponCode: coupons.code,
            discountAmount: couponUsages.discountAmount,
          }).from(couponUsages)
            .innerJoin(coupons, eq(couponUsages.couponId, coupons.id))
            .where(eq(couponUsages.orderId, groupOrders[0].id)).limit(1);
          if (couponResult[0]) couponUsage = couponResult[0];
        } catch {}

        return {
          cartGroupId,
          orders: ordersWithItems,
          totalAmount,
          itemCount,
          status: groupStatus,
          createdAt: groupOrders[0].createdAt,
          paymentMethod: groupOrders[0].paymentMethod ?? null,
          couponUsage,
        };
      })
    );

    return {
      groups: groups.filter(Boolean) as any[],
      total,
      totalPages,
    };
  } catch (error) {
    console.error("[Database] Failed to get user cart groups:", error);
    return { groups: [], total: 0, totalPages: 0 };
  }
}

/**
 * 회원 등급 재계산 헬퍼 - 배송완료 기준 누적 구매금액으로 등급 자동 업그레이드
 * updateOrderStatus(단건), bulkUpdateStatus(일괄) 양쪽에서 공통 사용
 */
export async function recalculateMembershipTier(userId: number): Promise<{
  previousTierId: number | null;
  newTierId: number | null;
  newTierData: any | null;
  totalPurchase: number;
  upgraded: boolean;
}> {
  const db = await getDb();
  if (!db) return { previousTierId: null, newTierId: null, newTierData: null, totalPurchase: 0, upgraded: false };

  // 현재 등급 조회
  const currentUser = await db.select({
    membershipTierId: registeredUsers.membershipTierId,
    email: registeredUsers.email,
    nameKanji: registeredUsers.nameKanji,
  }).from(registeredUsers).where(eq(registeredUsers.id, userId)).limit(1);
  const previousTierId = currentUser[0]?.membershipTierId ?? null;

  // 모든 등급 조회 (산정 기간은 가장 높은 periodMonths 사용)
  const allTiers = await db.select().from(membershipTiers)
    .where(eq(membershipTiers.isActive, true))
    .orderBy(desc(membershipTiers.minAmount));

  // 등급별 산정 기간 중 가장 긴 기간 사용 (또는 기본 6개월)
  const maxPeriodMonths = allTiers.reduce((max, t) => Math.max(max, t.periodMonths ?? 6), 6);
  const periodStart = new Date();
  periodStart.setMonth(periodStart.getMonth() - maxPeriodMonths);

  // orders.userId = users.id (not registeredUsers.id)
  // openId 패턴 'email_{registeredUserId}'로 users.id 조회
  const openId = `email_${userId}`;
  const [userRow] = await db.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1);
  const ordersUserId = userRow?.id ?? userId; // fallback: userId 그대로 사용

  // 배송완료 주문 누적 금액 집계 (delivered + completed 모두 포함)
  const userOrders = await db.select({ totalAmount: orders.totalAmount })
    .from(orders)
    .where(and(
      eq(orders.userId, ordersUserId),
      or(eq(orders.status, 'delivered'), eq(orders.status, 'completed')),
      gte(orders.createdAt, periodStart)
    ));
  const totalPurchase = userOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);

  // 적합한 등급 찾기 (minAmount 내림차순으로 정렬되어 있으므로 첫 번째 매칭)
  let newTierId: number | null = null;
  let newTierData: any | null = null;
  for (const tier of allTiers) {
    if (totalPurchase >= Number(tier.minAmount)) {
      newTierId = tier.id;
      newTierData = tier;
      break;
    }
  }

  // 등급 업데이트
  await db.update(registeredUsers).set({
    membershipTierId: newTierId,
    totalPurchaseAmount: Math.round(totalPurchase),
    tierUpdatedAt: new Date(),
  }).where(eq(registeredUsers.id, userId));

  const upgraded = newTierId !== null && newTierId !== previousTierId;
  return { previousTierId, newTierId, newTierData, totalPurchase, upgraded };
}

// ─── Product Audit Log (상품 수정 이력) ────────────────────────────────────────

export async function createProductAuditLog(data: {
  productId: number;
  productName: string;
  adminId: number;
  adminName: string;
  action: string;
  changedFields?: string[];
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  note?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(productAuditLogs).values({
    productId: data.productId,
    productName: data.productName,
    adminId: data.adminId,
    adminName: data.adminName,
    action: data.action,
    changedFields: data.changedFields ? JSON.stringify(data.changedFields) : null,
    oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
    newValues: data.newValues ? JSON.stringify(data.newValues) : null,
    note: data.note ?? null,
  });
}

export async function getProductAuditLogs(options?: {
  productId?: number;
  adminId?: number;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (options?.productId) conditions.push(eq(productAuditLogs.productId, options.productId));
  if (options?.adminId) conditions.push(eq(productAuditLogs.adminId, options.adminId));
  if (options?.action) conditions.push(eq(productAuditLogs.action, options.action));

  const baseQuery = db.select().from(productAuditLogs);
  const withWhere = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
  const withOrder = withWhere.orderBy(desc(productAuditLogs.createdAt));
  const withLimit = options?.limit ? withOrder.limit(options.limit) : withOrder;
  const withOffset = options?.offset ? withLimit.offset(options.offset) : withLimit;
  const rows = await withOffset;
  // changedFields, oldValues, newValues는 DB에 JSON 문자열로 저장되므로 파싱
  return rows.map((row: any) => ({
    ...row,
    changedFields: row.changedFields
      ? (Array.isArray(row.changedFields) ? row.changedFields : (() => { try { return JSON.parse(row.changedFields); } catch { return []; } })())
      : [],
    oldValues: row.oldValues
      ? (typeof row.oldValues === 'object' ? row.oldValues : (() => { try { return JSON.parse(row.oldValues); } catch { return {}; } })())
      : {},
    newValues: row.newValues
      ? (typeof row.newValues === 'object' ? row.newValues : (() => { try { return JSON.parse(row.newValues); } catch { return {}; } })())
      : {},
  }));
}

export async function getProductAuditLogCount(options?: {
  productId?: number;
  adminId?: number;
  action?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const conditions: any[] = [];
  if (options?.productId) conditions.push(eq(productAuditLogs.productId, options.productId));
  if (options?.adminId) conditions.push(eq(productAuditLogs.adminId, options.adminId));
  if (options?.action) conditions.push(eq(productAuditLogs.action, options.action));

  const baseQuery = db.select({ count: sql<number>`count(*)` }).from(productAuditLogs);
  const withWhere = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
  const result = await withWhere;
  return Number(result[0]?.count ?? 0);
}

// 사용자별 주문 횟수 조회 (registeredUsers.id 기준)
// registered_users.id → registered_users.email → users.id → orders.userId 경로로 매핑
export async function getOrderCountsByUserIds(registeredUserIds: number[]): Promise<Record<number, number>> {
  if (!registeredUserIds.length) return {};
  if (!_pool) await getDb();
  if (!_pool) return {};
  const placeholders = registeredUserIds.map(() => '?').join(',');
  const [rows] = await (_pool as any).query(
    `SELECT ru.id as registeredUserId,
            COUNT(DISTINCT COALESCE(o.cartGroupId, CAST(COALESCE(o.parentOrderId, o.id) AS CHAR))) as orderCount
     FROM registered_users ru
     JOIN users u ON u.email = ru.email
     LEFT JOIN orders o ON o.userId = u.id AND o.status != 'cancelled'
     WHERE ru.id IN (${placeholders})
     GROUP BY ru.id`,
    registeredUserIds
  );
  const result: Record<number, number> = {};
  if (Array.isArray(rows)) {
    for (const row of rows as any[]) {
      result[Number(row.registeredUserId)] = Number(row.orderCount);
    }
  }
  return result;
}


// ============ Email Template Functions ============
export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get email templates: database not available");
    return [];
  }
  try {
    return await db.select().from(emailTemplates).orderBy(emailTemplates.templateName);
  } catch (error) {
    console.error("[Database] Failed to get email templates:", error);
    return [];
  }
}

export async function getEmailTemplateByKey(templateKey: string): Promise<EmailTemplate | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get email template: database not available");
    return null;
  }
  try {
    const result = await db.select().from(emailTemplates).where(eq(emailTemplates.templateKey, templateKey)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get email template:", error);
    return null;
  }
}

export async function upsertEmailTemplate(data: {
  templateKey: string;
  templateName: string;
  subject: string;
  bodyText: string;
  isActive?: boolean;
  description?: string;
}): Promise<EmailTemplate | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert email template: database not available");
    return null;
  }
  try {
    const existing = await getEmailTemplateByKey(data.templateKey);
    if (existing) {
      // Update existing
      await db.update(emailTemplates).set({
        templateName: data.templateName,
        subject: data.subject,
        bodyText: data.bodyText,
        isActive: data.isActive ?? true,
        description: data.description,
      }).where(eq(emailTemplates.templateKey, data.templateKey));
    } else {
      // Insert new
      await db.insert(emailTemplates).values({
        templateKey: data.templateKey,
        templateName: data.templateName,
        subject: data.subject,
        bodyText: data.bodyText,
        isActive: data.isActive ?? true,
        description: data.description,
      });
    }
    return await getEmailTemplateByKey(data.templateKey);
  } catch (error) {
    console.error("[Database] Failed to upsert email template:", error);
    return null;
  }
}

export async function updateEmailTemplate(templateKey: string, data: Partial<Omit<InsertEmailTemplate, 'templateKey'>>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update email template: database not available");
    return;
  }
  try {
    await db.update(emailTemplates).set(data).where(eq(emailTemplates.templateKey, templateKey));
  } catch (error) {
    console.error("[Database] Failed to update email template:", error);
  }
}

export async function deleteEmailTemplate(templateKey: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete email template: database not available");
    return false;
  }
  try {
    const result = await db.delete(emailTemplates).where(eq(emailTemplates.templateKey, templateKey));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete email template:", error);
    return false;
  }
}

/**
 * Admin: Update review createdAt (작성 날짜 변경)
 */
export async function adminUpdateReviewCreatedAt(
  reviewId: number,
  createdAt: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.update(reviews).set({ createdAt }).where(eq(reviews.id, reviewId));
    console.log(`[Database] Review ${reviewId} createdAt updated to ${createdAt}`);
  } catch (error) {
    console.error("[Database] Failed to update review createdAt:", error);
    throw error;
  }
}
