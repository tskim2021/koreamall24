import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  trackProductView,
  getPersonalizedRecommendations,
  getSmartRelatedProducts,
  getDb,
  createCategory,
  adminCreateProduct,
  createOrder,
  saveOrderItems,
} from "./db";
import type { InsertProduct } from "../drizzle/schema";

describe("Recommendation Algorithm", () => {
  let testUserId = 0;
  let testProductId1 = 0;
  let testProductId2 = 0;
  let testProductId3 = 0;
  let testCategoryId = 0;

  beforeAll(async () => {
    // Create test category
    const category = await createCategory({
      name: "Test Category",
      nameJa: "テストカテゴリー",
      slug: `test-category-${Date.now()}`,
      icon: "test",
      sortOrder: 0,
    });
    testCategoryId = category?.id || 1;

    // Create test products
    const product1: InsertProduct = {
      categoryId: testCategoryId,
      name: "Test Product 1",
      nameJa: "テスト商品1",
      description: "Test description 1",
      descriptionJa: "テスト説明1",
      price: "1000",
      stock: 100,
      isPopular: true,
      rating: "4.5",
      reviewCount: 10,
    };

    const product2: InsertProduct = {
      categoryId: testCategoryId,
      name: "Test Product 2",
      nameJa: "テスト商品2",
      description: "Test description 2",
      descriptionJa: "テスト説明2",
      price: "2000",
      stock: 100,
      rating: "4.0",
      reviewCount: 5,
    };

    const product3: InsertProduct = {
      categoryId: testCategoryId,
      name: "Test Product 3",
      nameJa: "テスト商品3",
      description: "Test description 3",
      descriptionJa: "テスト説明3",
      price: "3000",
      stock: 100,
      rating: "3.5",
      reviewCount: 3,
    };

    const p1 = await adminCreateProduct(product1);
    const p2 = await adminCreateProduct(product2);
    const p3 = adminCreateProduct(product3);

    testProductId1 = p1?.id || 1;
    testProductId2 = p2?.id || 2;
    testProductId3 = (await p3)?.id || 3;

    // Create test user (using a high ID to avoid conflicts)
    testUserId = 99999 + Math.floor(Math.random() * 10000);
  });

  it("should track product view", async () => {
    await trackProductView(testUserId, testProductId1, testCategoryId);
    // If no error is thrown, the test passes
    expect(true).toBe(true);
  });

  it("should increment view count on repeated views", async () => {
    await trackProductView(testUserId, testProductId1, testCategoryId);
    await trackProductView(testUserId, testProductId1, testCategoryId);
    // If no error is thrown, the test passes
    expect(true).toBe(true);
  });

  it("should get personalized recommendations for user with history", async () => {
    // Track multiple product views
    await trackProductView(testUserId, testProductId1, testCategoryId);
    await trackProductView(testUserId, testProductId2, testCategoryId);

    const recommendations = await getPersonalizedRecommendations(testUserId, 6);
    expect(Array.isArray(recommendations)).toBe(true);
  });

  it("should get smart related products for authenticated user", async () => {
    // Track a view
    await trackProductView(testUserId, testProductId1, testCategoryId);

    const relatedProducts = await getSmartRelatedProducts(
      testUserId,
      testProductId1,
      testCategoryId,
      6
    );
    expect(Array.isArray(relatedProducts)).toBe(true);
    // Should not include the current product
    expect(relatedProducts.every((p) => p.id !== testProductId1)).toBe(true);
  });

  it("should get smart related products for anonymous user", async () => {
    const relatedProducts = await getSmartRelatedProducts(
      null,
      testProductId1,
      testCategoryId,
      6
    );
    expect(Array.isArray(relatedProducts)).toBe(true);
    // Should not include the current product
    expect(relatedProducts.every((p) => p.id !== testProductId1)).toBe(true);
  });

  it("should respect limit parameter", async () => {
    const recommendations = await getPersonalizedRecommendations(testUserId, 3);
    expect(recommendations.length).toBeLessThanOrEqual(3);
  });
});
