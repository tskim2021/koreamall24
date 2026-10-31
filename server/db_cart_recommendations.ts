import { getDb } from "./db";
import { products, cartItems, orderItems } from "../drizzle/schema";
import { eq, inArray, and, desc, sql, ne } from "drizzle-orm";
import type { Product } from "../drizzle/schema";

export type RecommendationReason = 
  | "same_category"           // 同じカテゴリの人気商品
  | "frequently_bought_together"  // よく一緒に購入される商品
  | "popular";                // 人気商品

export interface ProductWithReason extends Product {
  recommendationReason: RecommendationReason;
}

/**
 * 장바구니 기반 추천 상품 가져오기 (추천 이유 포함)
 * 로직:
 * 1. 장바구니에 있는 상품들의 카테고리 추출
 * 2. 같은 카테고리의 인기 상품 추천 (장바구니 상품 제외)
 * 3. 함께 구매된 상품 추천 (주문 데이터 기반)
 * 4. 인기 상품으로 보완
 */
export async function getCartBasedRecommendations(
  userId: number,
  limit: number = 6
): Promise<ProductWithReason[]> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // 1. 현재 장바구니 상품 ID 및 카테고리 가져오기
  const cartProducts = await db
    .select({
      productId: cartItems.productId,
      categoryId: products.categoryId,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));

  if (cartProducts.length === 0) {
    // 장바구니가 비어있으면 인기 상품 반환
    const popularProducts = await getPopularProductsForRecommendation(limit);
    return popularProducts.map(p => ({ ...p, recommendationReason: "popular" as RecommendationReason }));
  }

  const cartProductIds = cartProducts.map((p) => p.productId);
  const categoryIds = Array.from(new Set(cartProducts.map((p) => p.categoryId).filter(Boolean)));

  // 2. 같은 카테고리의 인기 상품 추천 (장바구니 상품 제외)
  let recommendations: ProductWithReason[] = [];

  if (categoryIds.length > 0) {
    const sameCategoryProducts = await db
      .select()
      .from(products)
      .where(
        and(
          inArray(products.categoryId, categoryIds as number[]),
          sql`${products.id} NOT IN (${sql.join(cartProductIds, sql`, `)})`
        )
      )
      .orderBy(desc(products.viewCount))
      .limit(Math.ceil(limit / 2)); // 절반은 같은 카테고리에서

    recommendations.push(...sameCategoryProducts.map(p => ({ 
      ...p, 
      recommendationReason: "same_category" as RecommendationReason 
    })));
  }

  // 3. 함께 구매된 상품 추천 (주문 데이터 기반)
  if (recommendations.length < limit) {
    try {
      const frequentlyBoughtTogether = await db
        .select({
          product: products,
          purchaseCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`.as("purchaseCount"),
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(
          and(
            sql`${orderItems.orderId} IN (
              SELECT DISTINCT ${orderItems.orderId}
              FROM ${orderItems}
              WHERE ${orderItems.productId} IN (${sql.join(cartProductIds, sql`, `)})
            )`,
            sql`${orderItems.productId} NOT IN (${sql.join(cartProductIds, sql`, `)})`
          )
        )
        .groupBy(products.id)
        .orderBy(desc(sql`purchaseCount`))
        .limit(limit - recommendations.length);

      recommendations.push(...frequentlyBoughtTogether.map(item => ({ 
        ...item.product, 
        recommendationReason: "frequently_bought_together" as RecommendationReason 
      })));
    } catch (error) {
      console.error("[getCartBasedRecommendations] Error fetching frequently bought together:", error);
    }
  }

  // 4. 인기 상품으로 보완
  if (recommendations.length < limit) {
    const popularProducts = await getPopularProductsForRecommendation(
      limit - recommendations.length,
      [...cartProductIds, ...recommendations.map((p) => p.id)]
    );
    recommendations.push(...popularProducts.map(p => ({ 
      ...p, 
      recommendationReason: "popular" as RecommendationReason 
    })));
  }

  // 중복 제거 및 limit 적용
  const uniqueRecommendations = Array.from(
    new Map(recommendations.map((p) => [p.id, p])).values()
  ).slice(0, limit);

  return uniqueRecommendations;
}

/**
 * 인기 상품 가져오기 (추천용)
 */
async function getPopularProductsForRecommendation(
  limit: number,
  excludeIds: number[] = []
): Promise<Product[]> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const whereConditions = excludeIds.length > 0
    ? sql`${products.id} NOT IN (${sql.join(excludeIds, sql`, `)})`
    : undefined;

  const query = db
    .select()
    .from(products)
    .where(whereConditions)
    .orderBy(desc(products.viewCount))
    .limit(limit);

  return await query;
}
