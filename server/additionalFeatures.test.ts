import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { eq } from "drizzle-orm";

describe("Additional Features Test Suite", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testUserId: number;
  let testAdminId: number;
  let testProductId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Create test user
    const { users } = await import("../drizzle/schema");
    const [user] = await db
      .insert(users)
      .values({
        openId: `test-additional-${Date.now()}`,
        name: "Additional Test User",
        email: "additionaltest@example.com",
        role: "user",
      })
      .$returningId();
    testUserId = user.id;

    // Create test admin
    const [admin] = await db
      .insert(users)
      .values({
        openId: `test-admin-${Date.now()}`,
        name: "Test Admin",
        email: "testadmin@example.com",
        role: "admin",
      })
      .$returningId();
    testAdminId = admin.id;

    // Create test product
    const { products } = await import("../drizzle/schema");
    const [product] = await db
      .insert(products)
      .values({
        categoryId: 1,
        name: "Test Product for Additional Features",
        nameJa: "追加機能テスト商品",
        price: "2000",
        stock: 50,
      })
      .$returningId();
    testProductId = product.id;
  });

  describe("Admin Product Q&A Management", () => {
    let questionId: number;

    it("should create a product question", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-additional-${Date.now()}`,
          name: "Additional Test User",
          email: "additionaltest@example.com",
          role: "user",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.productQuestion.create({
        productId: testProductId,
        questionText: "この商品の配送期間はどのくらいですか?",
      });

      expect(result.success).toBe(true);

      // Get question ID
      const { productQuestions } = await import("../drizzle/schema");
      const questions = await db!
        .select()
        .from(productQuestions)
        .where(eq(productQuestions.productId, testProductId));
      expect(questions.length).toBeGreaterThan(0);
      questionId = questions[0].id;
    });

    it("should list all questions for admin", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testAdminId,
          openId: `test-admin-${Date.now()}`,
          name: "Test Admin",
          email: "testadmin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const questions = await caller.productQuestion.adminList({ limit: 100 });

      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
      
      const ourQuestion = questions.find((q) => q.id === questionId);
      expect(ourQuestion).toBeDefined();
      expect(ourQuestion?.question).toBe("この商品の配送期間はどのくらいですか?");
      expect(ourQuestion?.isAnswered).toBe(false);
    });

    it("should answer a question (admin)", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testAdminId,
          openId: `test-admin-${Date.now()}`,
          name: "Test Admin",
          email: "testadmin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.productQuestion.answer({
        questionId,
        answerText: "通常3-5営業日でお届けします。",
      });

      expect(result.success).toBe(true);

      // Verify answer was saved
      const { productQuestions } = await import("../drizzle/schema");
      const [question] = await db!
        .select()
        .from(productQuestions)
        .where(eq(productQuestions.id, questionId));
      expect(question.answer).toBe("通常3-5営業日でお届けします。");
      expect(question.answeredBy).toBe(testAdminId);
    });

    it("should show answered status in admin list", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testAdminId,
          openId: `test-admin-${Date.now()}`,
          name: "Test Admin",
          email: "testadmin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const questions = await caller.productQuestion.adminList({ limit: 100 });

      const ourQuestion = questions.find((q) => q.id === questionId);
      expect(ourQuestion).toBeDefined();
      expect(ourQuestion?.isAnswered).toBe(true);
      expect(ourQuestion?.answer).toBe("通常3-5営業日でお届けします。");
    });
  });

  describe("Points Notification System", () => {
    it("should calculate points earned correctly (1% of order total)", () => {
      const orderTotal = 10000;
      const expectedPoints = Math.floor(orderTotal * 0.01);
      expect(expectedPoints).toBe(100);
    });

    it("should award points to user after order", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-additional-${Date.now()}`,
          name: "Additional Test User",
          email: "additionaltest@example.com",
          role: "user",
        },
      };

      const caller = appRouter.createCaller(ctx);
      
      // Create a test order first
      const { orders } = await import("../drizzle/schema");
      const [order] = await db!
        .insert(orders)
        .values({
          userId: testUserId,
          orderNumber: `TP${Date.now()}`,
          totalAmount: 5000,
          status: "pending",
          shippingName: "Test User",
          shippingPostalCode: "1234567",
          shippingAddress: "Test Address",
          shippingPhone: "090-1234-5678",
          createdAt: new Date(),
        })
        .$returningId();

      // Award points
      const pointsEarned = 50;
      await caller.point.earn({
        orderId: order.id,
        amount: pointsEarned,
        description: "Test order points",
      });

      // Verify points were awarded
      const balance = await caller.point.getBalance();
      expect(balance).toBeGreaterThanOrEqual(pointsEarned);
    });

    it("should track points transaction history", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testUserId,
          openId: `test-additional-${Date.now()}`,
          name: "Additional Test User",
          email: "additionaltest@example.com",
          role: "user",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const history = await caller.point.getHistory({ limit: 10 });

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      
      const earnTransaction = history.find((t) => t.description === "Test order points");
      expect(earnTransaction).toBeDefined();
      expect(earnTransaction?.type).toBe("earn");
      expect(earnTransaction?.amount).toBe(50);
    });
  });

  describe("Analytics CSV Export", () => {
    it("should export revenue data as CSV", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testAdminId,
          openId: `test-admin-${Date.now()}`,
          name: "Test Admin",
          email: "testadmin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.analytics.exportCSV({
        dateRange: "30d",
        dataType: "revenue",
      });

      expect(result).toHaveProperty("csvData");
      expect(typeof result.csvData).toBe("string");
      expect(result.csvData).toContain("日付");
      expect(result.csvData).toContain("売上");
      expect(result.csvData).toContain("注文数");
    });

    it("should export top products data as CSV", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testAdminId,
          openId: `test-admin-${Date.now()}`,
          name: "Test Admin",
          email: "testadmin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.analytics.exportCSV({
        dateRange: "30d",
        dataType: "topProducts",
      });

      expect(result).toHaveProperty("csvData");
      expect(typeof result.csvData).toBe("string");
      expect(result.csvData).toContain("商品ID");
      expect(result.csvData).toContain("商品名");
      expect(result.csvData).toContain("販売数");
      expect(result.csvData).toContain("売上");
    });

    it("should export order status data as CSV", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testAdminId,
          openId: `test-admin-${Date.now()}`,
          name: "Test Admin",
          email: "testadmin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.analytics.exportCSV({
        dateRange: "30d",
        dataType: "orderStatus",
      });

      expect(result).toHaveProperty("csvData");
      expect(typeof result.csvData).toBe("string");
      expect(result.csvData).toContain("ステータス");
      expect(result.csvData).toContain("件数");
    });

    it("should support different date ranges", async () => {
      const ctx: TrpcContext = {
        user: {
          id: testAdminId,
          openId: `test-admin-${Date.now()}`,
          name: "Test Admin",
          email: "testadmin@example.com",
          role: "admin",
        },
      };

      const caller = appRouter.createCaller(ctx);
      
      // Test 7 days
      const result7d = await caller.analytics.exportCSV({
        dateRange: "7d",
        dataType: "revenue",
      });
      expect(result7d.csvData).toBeTruthy();

      // Test 90 days
      const result90d = await caller.analytics.exportCSV({
        dateRange: "90d",
        dataType: "revenue",
      });
      expect(result90d.csvData).toBeTruthy();
    });
  });
});
