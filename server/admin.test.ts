import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  adminGetAllProducts: vi.fn().mockResolvedValue({
    products: [
      {
        id: 1,
        categoryId: 1,
        name: "Acyclovir 400mg",
        nameJa: "アシクロビル400mg",
        price: 2480,
        originalPrice: 2980,
        description: "Antiviral medication",
        descriptionJa: "抗ウイルス薬",
        imageUrl: "https://example.com/acyclovir.jpg",
        imageUrls: '["https://example.com/acyclovir1.jpg"]',
        isTimeSale: false,
        isMonthlySale: false,
        activeIngredient: "Acyclovir",
        activeIngredientJa: "アシクロビル",
        volume: "400mg",
        brand: "Generic",
        brandJa: "ジェネリック",
        shippingFrom: "Japan",
        deliveryDays: "10-14",
        usageMethod: "Take 1 tablet 5 times daily",
        usageMethodJa: "1日5回、1錠を服用",
        sideEffects: "Headache, dizziness",
        sideEffectsJa: "頭痛、めまい",
        precautions: "Do not use if allergic",
        precautionsJa: "アレルギーがある場合は使用しないでください",
        contraindications: "None",
        contraindicationsJa: "なし",
        setPrices: '[]',
        pointsPercent: 1,
        rating: "4.2",
        reviewCount: 134,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    total: 1,
  }),
  adminCreateProduct: vi.fn().mockResolvedValue({
    id: 2,
    categoryId: 2,
    name: "Test Product",
    nameJa: "テスト商品",
    price: 1000,
    originalPrice: 1500,
    description: "Test description",
    descriptionJa: "テスト説明",
    imageUrl: "https://example.com/test.jpg",
    imageUrls: '[]',
    isTimeSale: false,
    isMonthlySale: false,
    rating: "0",
    reviewCount: 0,
  }),
  adminUpdateProduct: vi.fn().mockResolvedValue({
    id: 1,
    categoryId: 1,
    name: "Acyclovir 400mg Updated",
    nameJa: "アシクロビル400mg 更新",
    price: 2580,
    originalPrice: 3000,
    description: "Updated antiviral medication",
    descriptionJa: "更新された抗ウイルス薬",
  }),
  adminDeleteProduct: vi.fn().mockResolvedValue(true),
  deleteProduct: vi.fn().mockResolvedValue(true),
  updateProduct: vi.fn().mockResolvedValue(true),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalRevenue: 50000,
    totalOrders: 10,
    totalCustomers: 5,
    totalProducts: 30,
  }),
  getAllOrders: vi.fn().mockResolvedValue({
    orders: [
      {
        id: 1,
        userId: 1,
        totalAmount: 5000,
        status: "pending",
        createdAt: new Date(),
      },
    ],
    total: 1,
  }),
  getAllRegisteredUsers: vi.fn().mockResolvedValue({
    users: [
      {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        role: "user",
      },
    ],
    total: 1,
  }),
  adminUpdateOrderStatus: vi.fn().mockResolvedValue(true),
  adminGetOrderById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    totalAmount: 5000,
    status: "pending",
    createdAt: new Date(),
  }),
  getOrderItems: vi.fn().mockResolvedValue([]),
}));

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
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

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
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

describe("Admin Dashboard API", () => {
  it("should check if user is admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const isAdmin = await caller.admin.isAdmin();

    expect(isAdmin).toBe(true);
  });

  it("should return false if user is not admin", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const isAdmin = await caller.admin.isAdmin();

    expect(isAdmin).toBe(false);
  });

  it("should return dashboard stats for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.admin.stats();

    expect(stats.totalRevenue).toBe(50000);
    expect(stats.totalOrders).toBe(10);
    expect(stats.totalCustomers).toBe(5);
    expect(stats.totalProducts).toBe(30);
  });

  it("should deny non-admin access to dashboard stats", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.stats()).rejects.toThrow("관리자 권한이 필요합니다.");
  });
});

describe("Admin Product Management API", () => {
  it("should get all products for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.products({ page: 1, limit: 20 });

    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("Acyclovir 400mg");
    expect(result.products[0].nameJa).toBe("アシクロビル400mg");
    expect(result.total).toBe(1);
  });

  it("should deny non-admin access to product list", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.products({ page: 1, limit: 20 })).rejects.toThrow(
      "관리자 권한이 필요합니다."
    );
  });

  it("should create a new product as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.createProduct({
      name: "Test Product",
      nameJa: "テスト商品",
      categoryId: 2,
      price: "1000",
      originalPrice: "1500",
      description: "Test description",
      descriptionJa: "テスト説明",
      imageUrl: "https://example.com/test.jpg",
    });

    expect(result.success).toBe(true);
    expect(result.product.id).toBe(2);
    expect(result.product.name).toBe("Test Product");
  });

  it("should deny non-admin from creating products", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.createProduct({
        name: "Test Product",
        nameJa: "テスト商品",
        categoryId: 2,
        price: "1000",
      })
    ).rejects.toThrow("관리자 권한이 필요합니다.");
  });

  it("should update a product as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.updateProduct({
      productId: 1,
      name: "Acyclovir 400mg Updated",
      nameJa: "アシクロビル400mg 更新",
      price: "2580",
      originalPrice: "3000",
    });

    expect(result.success).toBe(true);
  });

  it("should delete a product as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.deleteProduct({ productId: 1 });

    expect(result.success).toBe(true);
  });
});

describe("Admin Orders Management API", () => {
  it("should get all orders for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.orders({ page: 1, limit: 20 });

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].status).toBe("pending");
    expect(result.total).toBe(1);
  });

  it("should deny non-admin access to orders", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.orders({ page: 1, limit: 20 })).rejects.toThrow(
      "관리자 권한이 필요합니다."
    );
  });
});

describe("Admin Users Management API", () => {
  it("should get all registered users for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.users({ page: 1, limit: 20 });

    expect(result.users).toHaveLength(1);
    expect(result.users[0].email).toBe("test@example.com");
    expect(result.total).toBe(1);
  });

  it("should deny non-admin access to users list", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.users({ page: 1, limit: 20 })).rejects.toThrow(
      "관리자 권한이 필요합니다."
    );
  });
});
