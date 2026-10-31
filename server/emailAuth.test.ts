import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the email module
vi.mock("./_core/email", () => ({
  generateVerificationCode: vi.fn(() => "123456"),
  sendVerificationEmail: vi.fn(() => Promise.resolve(true)),
}));

// Mock the db module
vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    createEmailVerification: vi.fn(() => Promise.resolve()),
    verifyEmailCode: vi.fn((email: string, code: string) => {
      // Return true only for correct code
      return Promise.resolve(code === "123456");
    }),
    isEmailVerified: vi.fn((email: string) => {
      // Return true for all emails (no verification required)
      return Promise.resolve(true);
    }),
    getRegisteredUserByEmail: vi.fn((email: string) => {
      // Return user for existing emails
      if (email === "existing@example.com" || email === "duplicate@example.com") {
        return Promise.resolve({
          id: 1,
          email: email,
          password: "hashed",
          nameKanji: "テスト",
          nameHiragana: "てすと",
          gender: "male" as const,
          points: 500,
          isEmailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        });
      }
      return Promise.resolve(null);
    }),
    createRegisteredUser: vi.fn(() => Promise.resolve()),
  };
});

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

describe("emailAuth router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendCode", () => {
    it("accepts sendCode request (no-op)", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.emailAuth.sendCode({
        email: "new@example.com",
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("認証コードを送信しました。");
    });
  });

  describe("verifyCode", () => {
    it("accepts verifyCode request (no-op)", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.emailAuth.verifyCode({
        email: "test@example.com",
        code: "123456",
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("メールアドレスが確認されました。");
    });
  });

  describe("checkEmail", () => {
    it("returns exists true for registered email", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.emailAuth.checkEmail({
        email: "existing@example.com",
      });

      expect(result.exists).toBe(true);
    });

    it("returns exists false for new email", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.emailAuth.checkEmail({
        email: "new@example.com",
      });

      expect(result.exists).toBe(false);
    });
  });

  describe("register", () => {
    it("successfully registers new user without email verification", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.emailAuth.register({
        email: "newuser@example.com",
        password: "password123",
        nameKanji: "テスト太郎",
        nameHiragana: "てすとたろう",
        lastNameKanji: "テスト",
        firstNameKanji: "太郎",
        lastNameKatakana: "テスト",
        firstNameKatakana: "タロウ",
        gender: "male",
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("会員登録が完了しました。");
    });

    it("rejects duplicate email registration", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.emailAuth.register({
          email: "duplicate@example.com",
          password: "password123",
          nameKanji: "テスト太郎",
          nameHiragana: "てすとたろう",
          lastNameKanji: "テスト",
          firstNameKanji: "太郎",
          lastNameKatakana: "テスト",
          firstNameKatakana: "タロウ",
          gender: "male",
        })
      ).rejects.toThrow("このメールアドレスは既に登録されています。");
    });

    it("rejects registration with short password", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.emailAuth.register({
          email: "shortpass@example.com",
          password: "123",
          nameKanji: "テスト太郎",
          nameHiragana: "てすとたろう",
          gender: "male",
        } as any)
      ).rejects.toThrow();
    });

    it("rejects registration with missing fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.emailAuth.register({
          email: "missing@example.com",
          password: "password123",
          nameKanji: "",
          nameHiragana: "てすとたろう",
          gender: "male",
        } as any)
      ).rejects.toThrow();
    });
  });
});
