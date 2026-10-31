import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getRegisteredUserByEmail: vi.fn().mockImplementation((email: string) => {
      if (email === "test@example.com") {
        return {
          id: 1,
          email: "test@example.com",
          password: Buffer.from("password123").toString("base64"), // base64 encoded
          nameKanji: "テスト太郎",
          nameHiragana: "てすとたろう",
          gender: "male",
          points: 500,
          isEmailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };
      }
      return null;
    }),
    updateRegisteredUserLastSignIn: vi.fn().mockResolvedValue(undefined),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockImplementation((openId: string) => {
      if (openId === "email_1") {
        return {
          id: 1,
          openId: "email_1",
          name: "テスト太郎",
          email: "test@example.com",
          loginMethod: "email",
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };
      }
      return null;
    }),
  };
});

// Mock the SDK
vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-session-token"),
  },
}));

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function createTestContext(): { ctx: TrpcContext; setCookies: CookieCall[] } {
  const setCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx, setCookies };
}

describe("auth.loginWithEmail", () => {
  it("should login successfully with correct credentials", async () => {
    const { ctx, setCookies } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.loginWithEmail({
      email: "test@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("ログインしました。");
    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe("test@example.com");
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]?.value).toBe("mock-session-token");
  });

  it("should fail with non-existent email", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithEmail({
        email: "nonexistent@example.com",
        password: "password123",
      })
    ).rejects.toThrow("メールアドレスまたはパスワードが正しくありません。");
  });

  it("should fail with incorrect password", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithEmail({
        email: "test@example.com",
        password: "wrongpassword",
      })
    ).rejects.toThrow("メールアドレスまたはパスワードが正しくありません。");
  });
});
