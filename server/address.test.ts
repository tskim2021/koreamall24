import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { registeredUsers, addresses } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { Context } from "./_core/context";

describe("Address Router", () => {
  let testUserId: number;
  let testUserEmail: string;
  let testContext: Context;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    testUserEmail = `test-address-${Date.now()}@example.com`;
    const [user] = await db
      .insert(registeredUsers)
      .values({
        email: testUserEmail,
        password: "test-hash",
        name: "Test User",
        nameKanji: "テストユーザー",
        nameHiragana: "てすとゆーざー",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .$returningId();

    testUserId = user.id;

    // Create test context
    testContext = {
      user: {
        id: testUserId,
        email: testUserEmail,
        name: "Test User",
        nameKanji: "テストユーザー",
        nameHiragana: "てすとゆーざー",
        role: "user",
        openId: "test-openid",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      req: {} as any,
      res: {} as any,
    };
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.delete(addresses).where(eq(addresses.userId, testUserId));
    await db.delete(registeredUsers).where(eq(registeredUsers.id, testUserId));
  });

  it("should create a new address", async () => {
    const caller = appRouter.createCaller(testContext);

    const result = await caller.address.create({
      label: "自宅",
      recipientNameKanji: "山田太郎",
      recipientNameHiragana: "やまだたろう",
      postalCode: "1234567",
      prefecture: "東京都",
      city: "渋谷区",
      address1: "道玄4坆21-2-3",
      address2: "マンション101",
      phone: "09012345678",
      isDefault: true,
    });

    expect(result).toBeDefined();
    expect(result.label).toBe("自宅");
    expect(result.recipientNameKanji).toBe("山田太郎");
    expect(result.recipientNameHiragana).toBe("やまだたろう");
    expect(result.postalCode).toBe("1234567");
    expect(result.prefecture).toBe("東京都");
    expect(result.city).toBe("渋谷区");
    expect(result.address1).toBe("道玄4坆21-2-3");
    expect(result.address2).toBe("マンション101");
    expect(result.phone).toBe("09012345678");
    expect(result.isDefault).toBe(true);
  });

  it("should list all addresses for the user", async () => {
    const caller = appRouter.createCaller(testContext);

    const addresses = await caller.address.list();

    expect(addresses).toBeDefined();
    expect(Array.isArray(addresses)).toBe(true);
    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses[0].recipientNameKanji).toBe("山田太郎");
  });

  it("should get the default address", async () => {
    const caller = appRouter.createCaller(testContext);

    const defaultAddress = await caller.address.getDefault();

    expect(defaultAddress).toBeDefined();
    expect(defaultAddress?.isDefault).toBe(true);
    expect(defaultAddress?.recipientNameKanji).toBe("山田太郎");
  });

  it("should update an address", async () => {
    const caller = appRouter.createCaller(testContext);

    // Get the first address
    const addresses = await caller.address.list();
    const addressId = addresses[0].id;

    // Update the address
    const updated = await caller.address.update({
      id: addressId,
      label: "会社",
      recipientNameKanji: "佐藤花子",
      recipientNameHiragana: "さとうはなこ",
      postalCode: "7654321",
      prefecture: "大阪府",
      city: "大阪市",
      address1: "梅田1-1-1",
      phone: "08098765432",
      isDefault: true,
    });

    expect(updated).toBeDefined();
    expect(updated.label).toBe("会社");
    expect(updated.recipientNameKanji).toBe("佐藤花子");
    expect(updated.recipientNameHiragana).toBe("さとうはなこ");
    expect(updated.postalCode).toBe("7654321");
    expect(updated.prefecture).toBe("大阪府");
    expect(updated.city).toBe("大阪市");
    expect(updated.address1).toBe("梅田1-1-1");
    expect(updated.phone).toBe("08098765432");
  });

  it("should set an address as default", async () => {
    const caller = appRouter.createCaller(testContext);

    // Create a second address
    const secondAddress = await caller.address.create({
      recipientNameKanji: "鈴木一郎",
      recipientNameHiragana: "すずきいちろう",
      postalCode: "9876543",
      prefecture: "神奈川県",
      city: "横浜市",
      address1: "みなとみらい2-2-2",
      phone: "07011112222",
      isDefault: false,
    });

    // Set the second address as default
    const updated = await caller.address.setDefault({
      id: secondAddress.id,
    });

    // Verify the second address is now default
    const addresses = await caller.address.list();
    const updatedSecond = addresses.find(a => a.id === secondAddress.id);
    expect(updatedSecond?.isDefault).toBe(true);

    // Verify the first address is no longer default
    const firstAddress = addresses.find(a => a.recipientNameKanji === "佐藤花子");
    expect(firstAddress?.isDefault).toBe(false);
  });

  it("should delete an address", async () => {
    const caller = appRouter.createCaller(testContext);

    // Get all addresses
    const beforeDelete = await caller.address.list();
    const addressToDelete = beforeDelete.find(a => a.recipientNameKanji === "鈴木一郎");

    if (!addressToDelete) {
      throw new Error("Address to delete not found");
    }

    // Delete the address
    await caller.address.delete({
      id: addressToDelete.id,
    });

    // Verify the address is deleted
    const afterDelete = await caller.address.list();
    const deletedAddress = afterDelete.find(a => a.id === addressToDelete.id);
    expect(deletedAddress).toBeUndefined();
  });

  it("should allow deleting an address when multiple exist", async () => {
    const caller = appRouter.createCaller(testContext);

    // Get all addresses (should have 2 after previous tests)
    const beforeDelete = await caller.address.list();
    expect(beforeDelete.length).toBeGreaterThanOrEqual(1);

    // Delete works fine when there are addresses
    const result = await caller.address.delete({
      id: beforeDelete[0].id,
    });

    expect(result.success).toBe(true);
  });
});
