import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { eq } from "drizzle-orm";

describe("Final Features Test Suite", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testUserId: number;
  let testProductId: number;
  let testOrderId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Create test user
    const { users } = await import("../drizzle/schema");
    const [user] = await db
      .insert(users)
      .values({
        openId: `test-final-${Date.now()}`,
        name: "Final Test User",
        email: "finaltest@example.com",
        role: "user",
      })
      .$returningId();
    testUserId = user.id;

    // Create test product
    const { products } = await import("../drizzle/schema");
    const [product] = await db
      .insert(products)
      .values({
        categoryId: 1,
        name: "Test Product for Q&A",
        nameJa: "Q&Aテスト商品",
        price: "1000",
        stock: 100,
      })
      .$returningId();
    testProductId = product.id;

    // Create test order
    const { orders } = await import("../drizzle/schema");
    const [order] = await db
      .insert(orders)
      .values({
        userId: testUserId,
        orderNumber: `TEST-${Date.now()}`,
        totalAmount: 5000,
        status: "delivered",
        shippingName: "Test User",
        shippingPostalCode: "1234567",
        shippingAddress: "Test Address",
        shippingPhone: "090-1234-5678",
        createdAt: new Date(),
      })
      .$returningId();
    testOrderId = order.id;
  });

  describe("Product Q&A System", () => {
    let questionId: number;

    it("should create a product question", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Final Test User",
          email: "finaltest@example.com",
          role: "user",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.productQuestion.create({
        productId: testProductId,
        questionText: "この商品の使用方法を教えてください",
      });

      expect(result.success).toBe(true);

      // Verify question was created
      const { productQuestions } = await import("../drizzle/schema");
      const questions = await db!
        .select()
        .from(productQuestions)
        .where(eq(productQuestions.productId, testProductId));
      expect(questions.length).toBeGreaterThan(0);
      questionId = questions[0].id;
    });

    it("should list product questions", async () => {
      const ctx: TrpcContext = {};
      const caller = appRouter.createCaller(ctx);
      const questions = await caller.productQuestion.list({
        productId: testProductId,
        limit: 10,
      });

      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0].question).toBe("この商品の使用方法を教えてください");
    });

    it("should answer a product question (admin)", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.productQuestion.answer({
        questionId,
        answerText: "使用方法は商品ページの説明をご確認ください。",
      });

      expect(result.success).toBe(true);

      // Verify answer was saved
      const { productQuestions } = await import("../drizzle/schema");
      const [question] = await db!
        .select()
        .from(productQuestions)
        .where(eq(productQuestions.id, questionId));
      expect(question.answer).toBe("使用方法は商品ページの説明をご確認ください。");
      expect(question.answeredBy).toBe(testUserId);
    });

    it("should delete a product question (admin)", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.productQuestion.delete({ questionId });

      expect(result.success).toBe(true);

      // Verify question was deleted
      const { productQuestions } = await import("../drizzle/schema");
      const questions = await db!
        .select()
        .from(productQuestions)
        .where(eq(productQuestions.id, questionId));
      expect(questions.length).toBe(0);
    });
  });

  describe("Points System Integration", () => {
    it("should get user points balance", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Final Test User",
          email: "finaltest@example.com",
          role: "user",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const balance = await caller.point.getBalance();

      expect(typeof balance).toBe("number");
      expect(balance).toBeGreaterThanOrEqual(0);
    });

    it("should earn points from order", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Final Test User",
          email: "finaltest@example.com",
          role: "user",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const initialBalance = await caller.point.getBalance();

      // Earn points
      await caller.point.earn({
        orderId: testOrderId,
        amount: 50,
        description: "Order purchase points",
      });

      const newBalance = await caller.point.getBalance();
      expect(newBalance).toBe(initialBalance + 50);
    });

    it("should use points for order", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Final Test User",
          email: "finaltest@example.com",
          role: "user",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const initialBalance = await caller.point.getBalance();

      // Use points
      await caller.point.use({
        orderId: testOrderId,
        amount: 20,
        description: "Points discount",
      });

      const newBalance = await caller.point.getBalance();
      expect(newBalance).toBe(initialBalance - 20);
    });

    it("should get points transaction history", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Final Test User",
          email: "finaltest@example.com",
          role: "user",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const history = await caller.point.getHistory({ limit: 10 });

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty("type");
      expect(history[0]).toHaveProperty("amount");
    });
  });

  describe("Sales Analytics Dashboard", () => {
    it("should get dashboard analytics for 7 days", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const analytics = await caller.analytics.getDashboard({ dateRange: "7d" });

      expect(analytics).toHaveProperty("totalRevenue");
      expect(analytics).toHaveProperty("totalOrders");
      expect(analytics).toHaveProperty("totalCustomers");
      expect(analytics).toHaveProperty("averageOrderValue");
      expect(analytics).toHaveProperty("topProducts");
      expect(analytics).toHaveProperty("revenueByDay");
      expect(analytics).toHaveProperty("ordersByStatus");
      expect(analytics).toHaveProperty("repeatCustomerRate");

      expect(typeof analytics.totalRevenue).toBe("number");
      expect(typeof analytics.totalOrders).toBe("number");
      expect(typeof analytics.totalCustomers).toBe("number");
      expect(typeof analytics.averageOrderValue).toBe("number");
      expect(typeof analytics.repeatCustomerRate).toBe("number");

      expect(Array.isArray(analytics.topProducts)).toBe(true);
      expect(Array.isArray(analytics.revenueByDay)).toBe(true);
      expect(Array.isArray(analytics.ordersByStatus)).toBe(true);
    });

    it("should get dashboard analytics for 30 days", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const analytics = await caller.analytics.getDashboard({ dateRange: "30d" });

      expect(analytics.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(analytics.totalOrders).toBeGreaterThanOrEqual(0);
      expect(analytics.totalCustomers).toBeGreaterThanOrEqual(0);
    });

    it("should get dashboard analytics for 90 days", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const analytics = await caller.analytics.getDashboard({ dateRange: "90d" });

      expect(analytics.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(analytics.repeatCustomerRate).toBeGreaterThanOrEqual(0);
      expect(analytics.repeatCustomerRate).toBeLessThanOrEqual(100);
    });

    it("should calculate top products correctly", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const analytics = await caller.analytics.getDashboard({ dateRange: "30d" });

      if (analytics.topProducts.length > 0) {
        const topProduct = analytics.topProducts[0];
        expect(topProduct).toHaveProperty("productId");
        expect(topProduct).toHaveProperty("productName");
        expect(topProduct).toHaveProperty("totalQuantity");
        expect(topProduct).toHaveProperty("totalRevenue");
        expect(topProduct.totalQuantity).toBeGreaterThan(0);
        expect(topProduct.totalRevenue).toBeGreaterThan(0);
      }
    });

    it("should calculate revenue by day correctly", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const analytics = await caller.analytics.getDashboard({ dateRange: "7d" });

      if (analytics.revenueByDay.length > 0) {
        const dayRevenue = analytics.revenueByDay[0];
        expect(dayRevenue).toHaveProperty("date");
        expect(dayRevenue).toHaveProperty("revenue");
        expect(typeof dayRevenue.revenue).toBe("number");
      }
    });

    it("should calculate orders by status correctly", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-final-${Date.now()}`,
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const analytics = await caller.analytics.getDashboard({ dateRange: "30d" });

      if (analytics.ordersByStatus.length > 0) {
        const statusCount = analytics.ordersByStatus[0];
        expect(statusCount).toHaveProperty("status");
        expect(statusCount).toHaveProperty("count");
        expect(typeof statusCount.count).toBe("number");
      }
    });
  });
});
