import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getAllCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "Hair Growth", nameJa: "育毛・ヘアケア", slug: "hair-growth", icon: "Scissors", sortOrder: 1 },
    { id: 2, name: "Beauty", nameJa: "美容・スキンケア", slug: "beauty", icon: "Sparkles", sortOrder: 2 },
  ]),
  getCategoryBySlug: vi.fn().mockImplementation(async (slug: string) => {
    if (slug === "hair-growth") {
      return { id: 1, name: "Hair Growth", nameJa: "育毛・ヘアケア", slug: "hair-growth", icon: "Scissors", sortOrder: 1 };
    }
    return null;
  }),
  getAllProducts: vi.fn().mockResolvedValue([
    { id: 1, categoryId: 1, name: "Minoxidil 5%", nameJa: "ミノキシジル5%", price: "3980", rating: "4.5", reviewCount: 234 },
    { id: 2, categoryId: 2, name: "Tretinoin Cream", nameJa: "トレチノインクリーム", price: "2480", rating: "4.7", reviewCount: 312 },
  ]),
  getProductById: vi.fn().mockImplementation(async (id: number) => {
    if (id === 1) {
      return { id: 1, categoryId: 1, name: "Minoxidil 5%", nameJa: "ミノキシジル5%", price: "3980", rating: "4.5", reviewCount: 234 };
    }
    return null;
  }),
  getProductsByCategory: vi.fn().mockResolvedValue([
    { id: 1, categoryId: 1, name: "Minoxidil 5%", nameJa: "ミノキシジル5%", price: "3980", rating: "4.5", reviewCount: 234 },
  ]),
  getTimeSaleProducts: vi.fn().mockResolvedValue([
    { id: 1, categoryId: 1, name: "Minoxidil 5%", nameJa: "ミノキシジル5%", price: "3980", isTimeSale: true },
  ]),
  getMonthlySaleProducts: vi.fn().mockResolvedValue([
    { id: 3, categoryId: 1, name: "Biotin", nameJa: "ビオチン", price: "1980", isMonthlySale: true },
  ]),
  getPopularProducts: vi.fn().mockResolvedValue([
    { id: 1, categoryId: 1, name: "Minoxidil 5%", nameJa: "ミノキシジル5%", price: "3980", isPopular: true, salesCount: 1520 },
  ]),
  searchProducts: vi.fn().mockImplementation(async (query: string) => {
    if (query.includes("ミノキシジル")) {
      return [{ id: 1, categoryId: 1, name: "Minoxidil 5%", nameJa: "ミノキシジル5%", price: "3980" }];
    }
    return [];
  }),
  getProductReviews: vi.fn().mockResolvedValue([
    { id: 1, productId: 1, userId: 1, userName: "田中太郎", rating: 5, title: "効果抜群！", content: "使い始めて3ヶ月、明らかに髪が増えてきました。" },
  ]),
  getLatestReviews: vi.fn().mockResolvedValue([
    { 
      review: { id: 1, productId: 1, userId: 1, userName: "田中太郎", rating: 5, title: "効果抜群！", content: "素晴らしい" },
      product: { id: 1, nameJa: "ミノキシジル5%", price: "3980" }
    },
  ]),
  getActiveBanners: vi.fn().mockResolvedValue([
    { id: 1, title: "Summer Sale", titleJa: "夏の特別セール", bgColor: "#e0f2fe", isActive: true },
  ]),
  getCartItems: vi.fn().mockResolvedValue([]),
  getCartItemCount: vi.fn().mockResolvedValue(0),
  addToCart: vi.fn().mockResolvedValue(undefined),
  updateCartItemQuantity: vi.fn().mockResolvedValue(undefined),
  removeFromCart: vi.fn().mockResolvedValue(undefined),
  clearCart: vi.fn().mockResolvedValue(undefined),
  createReview: vi.fn().mockResolvedValue(undefined),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Category API", () => {
  it("should return list of categories", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const categories = await caller.category.list();
    
    expect(categories).toHaveLength(2);
    expect(categories[0].nameJa).toBe("育毛・ヘアケア");
  });

  it("should return category by slug", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const category = await caller.category.getBySlug({ slug: "hair-growth" });
    
    expect(category).not.toBeNull();
    expect(category?.nameJa).toBe("育毛・ヘアケア");
  });
});

describe("Product API", () => {
  it("should return list of products", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const products = await caller.product.list();
    
    expect(products).toHaveLength(2);
    expect(products[0].nameJa).toBe("ミノキシジル5%");
  });

  it("should return product by id", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const product = await caller.product.getById({ id: 1 });
    
    expect(product).not.toBeNull();
    expect(product?.nameJa).toBe("ミノキシジル5%");
  });

  it("should return time sale products", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const products = await caller.product.timeSale();
    
    expect(products).toHaveLength(1);
    expect(products[0].isTimeSale).toBe(true);
  });

  it("should return popular products", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const products = await caller.product.popular();
    
    expect(products).toHaveLength(1);
    expect(products[0].isPopular).toBe(true);
  });

  it("should search products", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const products = await caller.product.search({ query: "ミノキシジル" });
    
    expect(products).toHaveLength(1);
    expect(products[0].nameJa).toBe("ミノキシジル5%");
  });
});

describe("Review API", () => {
  it("should return reviews for a product", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const reviews = await caller.review.getByProduct({ productId: 1 });
    
    expect(reviews).toHaveLength(1);
    expect(reviews[0].userName).toBe("田中太郎");
  });

  it("should return latest reviews", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const reviews = await caller.review.latest();
    
    expect(reviews).toHaveLength(1);
  });
});

describe("Banner API", () => {
  it("should return active banners", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const banners = await caller.banner.list();
    
    expect(banners).toHaveLength(1);
    expect(banners[0].titleJa).toBe("夏の特別セール");
  });
});

describe("Cart API", () => {
  it("should require authentication for cart operations", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.cart.list()).rejects.toThrow();
  });

  it("should allow authenticated users to access cart", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const cartItems = await caller.cart.list();
    
    expect(cartItems).toEqual([]);
  });

  it("should allow authenticated users to add to cart", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.cart.add({ productId: 1, quantity: 2 });
    
    expect(result.success).toBe(true);
  });
});
