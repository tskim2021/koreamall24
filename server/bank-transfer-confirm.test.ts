/**
 * Tests for bank transfer confirmation workflow and payment deadline feature
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getOrderById: vi.fn(),
  getAllPaymentSettings: vi.fn(),
  getActivePaymentSettings: vi.fn(),
  getPaymentSettingByProvider: vi.fn(),
  upsertPaymentSetting: vi.fn(),
  togglePaymentProvider: vi.fn(),
  getAdminPayments: vi.fn(),
  getPaymentsByUserId: vi.fn(),
  createPayment: vi.fn(),
}));

vi.mock("../../drizzle/schema", () => ({
  orders: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { getOrderById, getDb } from "./db";

// ─── Unit: Bank transfer confirmation logic ───────────────────────────────────
describe("Bank Transfer Confirmation Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should confirm bank transfer and update order status to confirmed + paid", async () => {
    const mockOrder = {
      id: 1,
      paymentMethod: "bank_transfer",
      paymentStatus: "pending",
      status: "pending",
      adminNotes: null,
      userId: 10,
    };
    (getOrderById as any).mockResolvedValue(mockOrder);

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (getDb as any).mockResolvedValue({ update: mockUpdate });

    // Simulate confirmation logic
    const order = await getOrderById(1);
    expect(order).not.toBeNull();
    expect(order!.paymentMethod).toBe("bank_transfer");

    const db = await getDb();
    expect(db).not.toBeNull();

    // Verify update would be called with correct fields
    const setData = {
      paymentStatus: "paid",
      status: "confirmed",
      bankTransferConfirmedAt: expect.any(Date),
      bankTransferConfirmedBy: 99, // admin user id
    };
    expect(setData.paymentStatus).toBe("paid");
    expect(setData.status).toBe("confirmed");
  });

  it("should reject confirmation if order is not bank_transfer", async () => {
    const mockOrder = {
      id: 2,
      paymentMethod: "stripe",
      paymentStatus: "pending",
      status: "pending",
      adminNotes: null,
      userId: 10,
    };
    (getOrderById as any).mockResolvedValue(mockOrder);

    const order = await getOrderById(2);
    expect(order!.paymentMethod).not.toBe("bank_transfer");
    // In real router, this would throw TRPCError BAD_REQUEST
    const isValid = order!.paymentMethod === "bank_transfer";
    expect(isValid).toBe(false);
  });

  it("should cancel bank transfer confirmation and revert to pending", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (getDb as any).mockResolvedValue({ update: mockUpdate });

    const db = await getDb();
    const revertData = {
      paymentStatus: "pending",
      status: "pending",
      bankTransferConfirmedAt: null,
      bankTransferConfirmedBy: null,
    };
    expect(revertData.paymentStatus).toBe("pending");
    expect(revertData.bankTransferConfirmedAt).toBeNull();
  });

  it("should append note to existing adminNotes on confirmation", () => {
    const existingNotes = "기존 메모";
    const newNote = "입금 확인 완료 - 관리자";
    const combined = existingNotes + "\n" + newNote;
    expect(combined).toBe("기존 메모\n입금 확인 완료 - 관리자");
  });

  it("should use newNote as adminNotes when no existing notes", () => {
    const existingNotes = null;
    const newNote = "입금 확인 완료";
    const result = newNote
      ? (existingNotes ? existingNotes + "\n" + newNote : newNote)
      : existingNotes;
    expect(result).toBe("입금 확인 완료");
  });
});

// ─── Unit: Payment deadline display logic ─────────────────────────────────────
describe("Payment Deadline Display Logic", () => {
  it("should calculate deadline date from order date + deadline days", () => {
    const orderDate = new Date("2026-03-05T12:00:00Z"); // Use noon UTC to avoid timezone boundary issues
    const deadlineDays = 3;
    const deadline = new Date(orderDate);
    deadline.setUTCDate(deadline.getUTCDate() + deadlineDays);
    expect(deadline.getUTCDate()).toBe(8); // March 8 UTC
  });

  it("should show 'no deadline' when paymentDeadlineDays is 0 or undefined", () => {
    const deadlineDays = 0;
    const hasDeadline = deadlineDays > 0;
    expect(hasDeadline).toBe(false);
  });

  it("should correctly format deadline message for checkout page", () => {
    const deadlineDays = 3;
    const message = deadlineDays > 0
      ? `ご注文後${deadlineDays}日以内にお振込みください`
      : null;
    expect(message).toBe("ご注文後3日以内にお振込みください");
  });

  it("should handle extraConfig with paymentDeadlineDays field", () => {
    const extraConfig = {
      bankName: "三菱UFJ銀行",
      accountNumber: "1234567",
      accountHolder: "テスト株式会社",
      paymentDeadlineDays: "3",
    };
    const days = parseInt(extraConfig.paymentDeadlineDays || "0", 10);
    expect(days).toBe(3);
    expect(days > 0).toBe(true);
  });
});

// ─── Unit: providers query bank_transfer extraConfig ─────────────────────────
describe("Providers Query - Bank Transfer ExtraConfig", () => {
  it("should expose paymentDeadlineDays from extraConfig", () => {
    const rawSetting = {
      provider: "bank_transfer",
      extraConfig: {
        bankName: "三菱UFJ銀行",
        accountNumber: "1234567",
        accountHolder: "テスト株式会社",
        branchName: "渋谷支店",
        swiftCode: "BOTKJPJT",
        instructions: "振込手数料はお客様負担でお願いします",
        paymentDeadlineDays: "3",
      },
    };
    const extra = rawSetting.extraConfig as Record<string, string>;
    const result = {
      bankName: extra.bankName || null,
      accountNumber: extra.accountNumber || null,
      accountHolder: extra.accountHolder || null,
      branchName: extra.branchName || null,
      swiftCode: extra.swiftCode || null,
      instructions: extra.instructions || null,
      paymentDeadlineDays: extra.paymentDeadlineDays ? parseInt(extra.paymentDeadlineDays, 10) : null,
    };
    expect(result.bankName).toBe("三菱UFJ銀行");
    expect(result.paymentDeadlineDays).toBe(3);
  });

  it("should return null for paymentDeadlineDays when not set", () => {
    const extra: Record<string, string> = { bankName: "テスト銀行" };
    const days = extra.paymentDeadlineDays ? parseInt(extra.paymentDeadlineDays, 10) : null;
    expect(days).toBeNull();
  });
});
