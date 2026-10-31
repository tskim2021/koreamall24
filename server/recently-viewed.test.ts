import { describe, it, expect, beforeAll } from "vitest";
import {
  getRecentlyViewedProducts,
  trackProductView,
  adminCreateProduct,
  createCategory,
} from "./db";
import type { InsertProduct } from "../drizzle/schema";

describe("Recently Viewed Products", () => {
  let testUserId = 0;
  let testProductIds: number[] = [];
  let testCategoryId = 0;

  beforeAll(async () => {
    // Create test category
    const category = await createCategory({
      name: "Recently Viewed Test",
      nameJa: "最近見たテスト",
      slug: `recently-viewed-test-${Date.now()}`,
      icon: "test",
      sortOrder: 0,
    });
    testCategoryId = category?.id || 1;

    // Create multiple test products
    const productNames = ["Product A", "Product B", "Product C", "Product D"];
    for (const name of productNames) {
      const product: InsertProduct = {
        categoryId: testCategoryId,
        name,
        nameJa: `${name}テスト`,
        description: `Test description for ${name}`,
        descriptionJa: `${name}のテスト説明`,
        price: "1000",
        stock: 100,
        rating: "4.0",
        reviewCount: 5,
      };

      const created = await adminCreateProduct(product);
      if (created?.id) {
        testProductIds.push(created.id);
      }
    }

    // Create test user ID
    testUserId = 99999 + Math.floor(Math.random() * 10000);
  });

  it("should return empty array for user with no viewed products", async () => {
    const recentlyViewed = await getRecentlyViewedProducts(testUserId + 1000, 8);
    expect(Array.isArray(recentlyViewed)).toBe(true);
    expect(recentlyViewed.length).toBe(0);
  });

  it("should return recently viewed products in correct order", async () => {
    // Track products in specific order
    if (testProductIds.length >= 3) {
      await trackProductView(testUserId, testProductIds[0], testCategoryId);
      await trackProductView(testUserId, testProductIds[1], testCategoryId);
      await trackProductView(testUserId, testProductIds[2], testCategoryId);

      const recentlyViewed = await getRecentlyViewedProducts(testUserId, 8);
      expect(recentlyViewed.length).toBe(3);
      // Most recently viewed should be first
      expect(recentlyViewed[0].id).toBe(testProductIds[2]);
      expect(recentlyViewed[1].id).toBe(testProductIds[1]);
      expect(recentlyViewed[2].id).toBe(testProductIds[0]);
    }
  });

  it("should respect limit parameter", async () => {
    if (testProductIds.length >= 4) {
      // Track all products
      for (const productId of testProductIds) {
        await trackProductView(testUserId, productId, testCategoryId);
      }

      const recentlyViewed = await getRecentlyViewedProducts(testUserId, 2);
      expect(recentlyViewed.length).toBeLessThanOrEqual(2);
    }
  });

  it("should return products with required fields", async () => {
    if (testProductIds.length > 0) {
      const recentlyViewed = await getRecentlyViewedProducts(testUserId, 1);
      if (recentlyViewed.length > 0) {
        const product = recentlyViewed[0];
        expect(product).toHaveProperty("id");
        expect(product).toHaveProperty("name");
        expect(product).toHaveProperty("price");
        expect(product).toHaveProperty("categoryId");
      }
    }
  });

  it("should handle duplicate views correctly", async () => {
    if (testProductIds.length > 0) {
      const productId = testProductIds[0];
      // View same product multiple times
      await trackProductView(testUserId, productId, testCategoryId);
      await trackProductView(testUserId, productId, testCategoryId);
      await trackProductView(testUserId, productId, testCategoryId);

      const recentlyViewed = await getRecentlyViewedProducts(testUserId, 8);
      // Should still return the product (not duplicated)
      const count = recentlyViewed.filter(p => p.id === productId).length;
      expect(count).toBe(1);
    }
  });
});
