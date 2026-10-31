import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Chatbot Public API", () => {
  it("chatbot.getSettings returns settings object", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const settings = await caller.chatbot.getSettings();
    expect(settings).toBeDefined();
    expect(typeof settings).toBe("object");
  });

  it("chatbot.getSuggestions returns array of strings", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const suggestions = await caller.chatbot.getSuggestions({ page: "home" });
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach((s: string) => expect(typeof s).toBe("string"));
  });

  it("chatbot.getSuggestions returns cart-specific suggestions", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const suggestions = await caller.chatbot.getSuggestions({ page: "cart" });
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("chatbot.getActiveFaqs returns array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const faqs = await caller.chatbot.getActiveFaqs();
    expect(Array.isArray(faqs)).toBe(true);
  });
});

describe("Admin Chatbot API - Access Control", () => {
  it("non-admin user cannot access getStats", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.adminChatbot.getStats()).rejects.toThrow();
  });

  it("non-admin user cannot access getFaqs", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.adminChatbot.getFaqs()).rejects.toThrow();
  });

  it("non-admin user cannot access getSettings", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.adminChatbot.getSettings()).rejects.toThrow();
  });

  it("non-admin user cannot access getBlockedKeywords", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.adminChatbot.getBlockedKeywords()).rejects.toThrow();
  });
});

describe("Admin Chatbot API - Admin Access", () => {
  it("admin can access getStats", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const stats = await caller.adminChatbot.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalConversations).toBe("number");
    expect(typeof stats.totalMessages).toBe("number");
    expect(typeof stats.totalFaqMatches).toBe("number");
    expect(typeof stats.activeConversations).toBe("number");
    expect(typeof stats.todayConversations).toBe("number");
    expect(typeof stats.avgMessagesPerConversation).toBe("number");
  });

  it("admin can access getConversations", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminChatbot.getConversations({ limit: 10, offset: 0 });
    expect(result).toBeDefined();
    expect(typeof result.total).toBe("number");
    expect(Array.isArray(result.conversations)).toBe(true);
  });

  it("admin can access getFaqs", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const faqs = await caller.adminChatbot.getFaqs();
    expect(Array.isArray(faqs)).toBe(true);
  });

  it("admin can create and delete FAQ", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    
    // Create FAQ
    const createResult = await caller.adminChatbot.createFaq({
      questionJa: "テスト質問です",
      questionKo: "테스트 질문입니다",
      answerJa: "テスト回答です",
      answerKo: "테스트 답변입니다",
      category: "other",
      keywords: "テスト,test",
      sortOrder: 999,
      isActive: 1,
    });
    expect(createResult).toBeDefined();
    expect(createResult.id).toBeDefined();

    // Delete FAQ
    const deleteResult = await caller.adminChatbot.deleteFaq({ id: createResult.id! });
    expect(deleteResult.success).toBe(true);
  });

  it("admin can update settings", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    
    const result = await caller.adminChatbot.updateSetting({
      key: "TEST_SETTING",
      value: "test_value",
      description: "Test setting for vitest",
    });
    expect(result.success).toBe(true);

    // Verify setting was saved
    const settings = await caller.adminChatbot.getSettings();
    const testSetting = settings.find((s: any) => s.key === "TEST_SETTING");
    expect(testSetting).toBeDefined();
    expect(testSetting?.value).toBe("test_value");
  });

  it("admin can add and remove blocked keyword", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    
    // Add keyword
    const addResult = await caller.adminChatbot.addBlockedKeyword({
      keyword: "vitest_blocked_keyword_" + Date.now(),
      reason: "Test reason",
    });
    expect(addResult).toBeDefined();
    expect(addResult.id).toBeDefined();

    // Remove keyword
    const removeResult = await caller.adminChatbot.removeBlockedKeyword({ id: addResult.id! });
    expect(removeResult.success).toBe(true);
  });

  it("admin can access getBlockedKeywords", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const keywords = await caller.adminChatbot.getBlockedKeywords();
    expect(Array.isArray(keywords)).toBe(true);
  });
});
