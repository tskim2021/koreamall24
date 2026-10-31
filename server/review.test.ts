import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

describe("Review API Tests", () => {
  let testUserId: number;
  let testProductId: number;
  let testOrderId: number;

  beforeAll(async () => {
    // Use existing test data
    testUserId = 1;
    testProductId = 1;
    testOrderId = 1;
  });

  describe("getDeliveredProducts", () => {
    it("should return delivered products for review", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "user" },
      } as Context);

      const result = await caller.review.getDeliveredProducts();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should include product details and review status", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "user" },
      } as Context);

      const result = await caller.review.getDeliveredProducts();

      if (result.length > 0) {
        const item = result[0];
        expect(item).toHaveProperty("orderId");
        expect(item).toHaveProperty("orderNumber");
        expect(item).toHaveProperty("orderDate");
        expect(item).toHaveProperty("product");
        expect(item).toHaveProperty("quantity");
        expect(item).toHaveProperty("hasReview");
        expect(typeof item.hasReview).toBe("boolean");
      }
    });
  });

  describe("create review", () => {
    it("should create a review with all fields", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, name: "Test User", role: "user" },
      } as Context);

      const result = await caller.review.create({
        productId: testProductId,
        orderId: testOrderId,
        rating: 5,
        title: "Great product!",
        content: "I really enjoyed this product. Highly recommended!",
        images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should create a review with only required fields", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, name: "Test User", role: "user" },
      } as Context);

      const result = await caller.review.create({
        productId: testProductId,
        orderId: testOrderId,
        rating: 4,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should reject invalid rating (too low)", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, name: "Test User", role: "user" },
      } as Context);

      await expect(
        caller.review.create({
          productId: testProductId,
          orderId: testOrderId,
          rating: 0,
        })
      ).rejects.toThrow();
    });

    it("should reject invalid rating (too high)", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, name: "Test User", role: "user" },
      } as Context);

      await expect(
        caller.review.create({
          productId: testProductId,
          orderId: testOrderId,
          rating: 6,
        })
      ).rejects.toThrow();
    });
  });

  describe("getByProduct", () => {
    it("should return reviews for a product", async () => {
      const caller = appRouter.createCaller({
        user: null,
      } as Context);

      const result = await caller.review.getByProduct({
        productId: testProductId,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should include review details", async () => {
      const caller = appRouter.createCaller({
        user: null,
      } as Context);

      const result = await caller.review.getByProduct({
        productId: testProductId,
      });

      if (result.length > 0) {
        const review = result[0];
        expect(review).toHaveProperty("id");
        expect(review).toHaveProperty("productId");
        expect(review).toHaveProperty("userId");
        expect(review).toHaveProperty("rating");
        expect(review.rating).toBeGreaterThanOrEqual(1);
        expect(review.rating).toBeLessThanOrEqual(5);
      }
    });
  });

  describe("update and delete review", () => {
    it("should update a review", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, name: "Test User", role: "user" },
      } as Context);

      // Create a review first
      await caller.review.create({
        productId: testProductId,
        orderId: testOrderId,
        rating: 4,
        title: "初期レビュー",
        content: "初期コンテンツ",
      });

      // Get user reviews
      const userReviews = await caller.review.getUserReviews();
      
      // Skip if no reviews found
      if (userReviews.length === 0) {
        return;
      }
      
      const reviewToUpdate = userReviews[0];

      // Update the review
      const result = await caller.review.update({
        id: reviewToUpdate.id,
        rating: 5,
        title: "更新されたレビュー",
        content: "更新されたコンテンツ",
      });

      expect(result.success).toBe(true);
    });

    it("should delete a review", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, name: "Test User", role: "user" },
      } as Context);

      // Create a review first
      await caller.review.create({
        productId: testProductId,
        orderId: testOrderId,
        rating: 3,
        title: "削除予定レビュー",
      });

      // Get user reviews
      const userReviews = await caller.review.getUserReviews();
      
      // Skip if no reviews found
      if (userReviews.length === 0) {
        return;
      }
      
      const reviewToDelete = userReviews[0];

      // Delete the review
      const result = await caller.review.delete({ id: reviewToDelete.id });
      expect(result.success).toBe(true);

      // Verify deletion
      const updatedReviews = await caller.review.getUserReviews();
      expect(updatedReviews.length).toBe(userReviews.length - 1);
    });
  });

  describe("points system", () => {
    it("should award points for review creation", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, name: "Test User", role: "user" },
      } as Context);

      const { getUserPoints } = await import("./db");
      
      // Get initial points
      const initialPoints = await getUserPoints(testUserId);

      // Create review without images
      await caller.review.create({
        productId: testProductId,
        orderId: testOrderId,
        rating: 5,
        title: "ポイントテスト",
      });

      // Check points increased by 100
      const pointsAfterReview = await getUserPoints(testUserId);
      expect(pointsAfterReview).toBe(initialPoints + 100);
    });

    it("should award bonus points for review with images", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, name: "Test User", role: "user" },
      } as Context);

      const { getUserPoints } = await import("./db");
      
      // Get initial points
      const initialPoints = await getUserPoints(testUserId);

      // Create review with images
      await caller.review.create({
        productId: testProductId,
        orderId: testOrderId,
        rating: 5,
        title: "写真付きレビュー",
        images: ["image1.jpg", "image2.jpg"],
      });

      // Check points increased by 150 (100 base + 50 bonus)
      const pointsAfterReview = await getUserPoints(testUserId);
      expect(pointsAfterReview).toBe(initialPoints + 150);
    });
  });
});
