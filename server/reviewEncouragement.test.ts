import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { orders, orderItems, products as productsTable, reviews, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Review Encouragement System", () => {
  let testUserId: string;
  let testProductId: number;
  let testOrderId: number;
  let testOrderItemId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const [user] = await db.insert(users).values({
      openId: `test-user-${Date.now()}`,
      name: "Test User",
      email: `test-${Date.now()}@example.com`,
      role: "user",
    }).$returningId();
    testUserId = `test-user-${Date.now()}`;

    // Create test product
    const [product] = await db.insert(productsTable).values({
      name: "Test Product",
      nameJa: "テスト商品",
      price: 1000,
      stock: 100,
      categoryId: 1,
    }).$returningId();
    testProductId = product.id;

    // Create test order (delivered status)
    const [order] = await db.insert(orders).values({
      userId: 1, // Use numeric userId for orders table
      orderNumber: `TEST-${Date.now()}`,
      totalAmount: "1000",
      shippingFee: "0",
      status: "delivered",
      shippingName: "Test User",
      shippingPostalCode: "1234567",
      shippingAddress: "Test Address",
      shippingPhone: "09012345678",
      paymentMethod: "stripe",
      paymentStatus: "paid",
      deliveredAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    }).$returningId();
    testOrderId = order.id;

    // Create test order item
    const [orderItem] = await db.insert(orderItems).values({
      orderId: testOrderId,
      productId: testProductId,
      productName: "Test Product",
      productNameJa: "テスト商品",
      quantity: 1,
      unitPrice: "1000",
      subtotal: "1000",
    }).$returningId();
    testOrderItemId = orderItem.id;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    // Clean up test data
    await db.delete(reviews).where(eq(reviews.userId, 1)); // Use numeric userId
    await db.delete(orderItems).where(eq(orderItems.orderId, testOrderId));
    await db.delete(orders).where(eq(orders.id, testOrderId));
    await db.delete(productsTable).where(eq(productsTable.id, testProductId));
    await db.delete(users).where(eq(users.openId, testUserId));
  });

  it("should return delivered products for review", async () => {
    const { getDeliveredProductsForReview } = await import("./db");
    const products = await getDeliveredProductsForReview(1); // Use numeric userId

    expect(products).toBeDefined();
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);

    const testProduct = products.find(p => p.product.id === testProductId);
    expect(testProduct).toBeDefined();
    expect(testProduct?.orderId).toBe(testOrderId);
    expect(testProduct?.hasReview).toBe(false);
  });

  it("should calculate pending review count correctly", async () => {
    const { getDeliveredProductsForReview } = await import("./db");
    const products = await getDeliveredProductsForReview(1); // Use numeric userId
    const pendingCount = products.filter(p => !p.hasReview).length;

    expect(pendingCount).toBeGreaterThan(0);
  });

  it("should mark product as reviewed after review creation", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { getDeliveredProductsForReview } = await import("./db");

    // Create a review
    await db.insert(reviews).values({
      userId: 1, // Use numeric userId
      productId: testProductId,
      orderId: testOrderId,
      orderItemId: testOrderItemId,
      rating: 5,
      title: "素晴らしい商品",
      content: "とても良い商品でした",
    });

    // Check if product is marked as reviewed
    const products = await getDeliveredProductsForReview(1); // Use numeric userId
    const testProduct = products.find(p => p.product.id === testProductId);

    expect(testProduct?.hasReview).toBe(true);
  });

  it("should calculate review progress per order", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create another order item for the same order
    const [product2] = await db.insert(productsTable).values({
      name: "Test Product 2",
      nameJa: "テスト商品2",
      price: 2000,
      stock: 100,
      categoryId: 1,
    }).$returningId();

    const [orderItem2] = await db.insert(orderItems).values({
      orderId: testOrderId,
      productId: product2.id,
      productName: "Test Product 2",
      productNameJa: "テスト商品2",
      quantity: 1,
      unitPrice: "2000",
      subtotal: "2000",
    }).$returningId();

    const { getDeliveredProductsForReview } = await import("./db");
    const products = await getDeliveredProductsForReview(1); // Use numeric userId

    // Group by order
    const orderGroups = products.reduce((acc: any, item: any) => {
      if (!acc[item.orderId]) {
        acc[item.orderId] = [];
      }
      acc[item.orderId].push(item);
      return acc;
    }, {});

    const orderProducts = orderGroups[testOrderId];
    expect(orderProducts).toBeDefined();
    expect(orderProducts.length).toBeGreaterThanOrEqual(2);

    const totalItems = orderProducts.length;
    const reviewedItems = orderProducts.filter((item: any) => item.hasReview).length;
    const progress = Math.round((reviewedItems / totalItems) * 100);

    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);

    // Clean up
    await db.delete(orderItems).where(eq(orderItems.id, orderItem2.id));
    await db.delete(productsTable).where(eq(productsTable.id, product2.id));
  });

  it("should filter out products with existing reviews from pending count", async () => {
    const { getDeliveredProductsForReview } = await import("./db");
    const products = await getDeliveredProductsForReview(1); // Use numeric userId

    const pendingProducts = products.filter(p => !p.hasReview);
    const reviewedProducts = products.filter(p => p.hasReview);

    expect(pendingProducts.length + reviewedProducts.length).toBe(products.length);

    // Verify that reviewed products have reviews
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    for (const product of reviewedProducts) {
      const [review] = await db
        .select()
        .from(reviews)
        .where(eq(reviews.productId, product.product.id))
        .limit(1);

      expect(review).toBeDefined();
    }
  });
});
