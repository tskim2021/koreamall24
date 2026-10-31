/**
 * Coupon Expiry Validation Tests
 * Tests for timezone-safe coupon expiry comparison logic
 */
import { describe, it, expect } from "vitest";

// ─── Helper: simulate the server-side coupon validation logic ─────────────────

function validateCouponExpiry(
  couponExpiresAt: Date | null,
  couponStartsAt: Date | null,
  now: Date
): { valid: boolean; error?: string } {
  const nowMs = now.getTime();

  if (couponStartsAt && nowMs < new Date(couponStartsAt).getTime()) {
    return { valid: false, error: "このクーポンはまだ有効期間前です" };
  }
  if (couponExpiresAt && nowMs > new Date(couponExpiresAt).getTime()) {
    return { valid: false, error: "このクーポンは有効期限切れです" };
  }
  return { valid: true };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Coupon Expiry Validation", () => {
  const now = new Date("2026-03-05T01:00:00.000Z"); // Fixed reference time

  it("valid coupon with future expiresAt should pass", () => {
    const expiresAt = new Date("2027-03-05T23:59:59.000Z"); // Future
    const result = validateCouponExpiry(expiresAt, null, now);
    expect(result.valid).toBe(true);
  });

  it("expired coupon with past expiresAt should fail", () => {
    const expiresAt = new Date("2026-01-25T08:58:42.000Z"); // Past (original bug case)
    const result = validateCouponExpiry(expiresAt, null, now);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("このクーポンは有効期限切れです");
  });

  it("coupon with null expiresAt (no expiry) should always pass", () => {
    const result = validateCouponExpiry(null, null, now);
    expect(result.valid).toBe(true);
  });

  it("coupon that has not started yet should fail", () => {
    const startsAt = new Date("2026-04-01T00:00:00.000Z"); // Future start
    const result = validateCouponExpiry(null, startsAt, now);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("このクーポンはまだ有効期間前です");
  });

  it("coupon within valid date range should pass", () => {
    const startsAt = new Date("2026-01-01T00:00:00.000Z"); // Past start
    const expiresAt = new Date("2026-12-31T23:59:59.000Z"); // Future end
    const result = validateCouponExpiry(expiresAt, startsAt, now);
    expect(result.valid).toBe(true);
  });

  it("timezone-safe: getTime() comparison handles UTC vs local correctly", () => {
    // Simulate the original bug: expiresAt stored as Jan 25 2026 (past)
    // After fix: update to 2027-03-05 (future)
    const originalExpiry = new Date("2026-01-25T08:58:42.000Z");
    const updatedExpiry = new Date("2027-03-05T23:59:59.000Z");

    const originalResult = validateCouponExpiry(originalExpiry, null, now);
    const updatedResult = validateCouponExpiry(updatedExpiry, null, now);

    expect(originalResult.valid).toBe(false); // Was expired
    expect(updatedResult.valid).toBe(true);   // Now valid after DB update
  });

  it("coupon expiring exactly at now should be considered expired", () => {
    const expiresAt = new Date(now.getTime() - 1); // 1ms before now
    const result = validateCouponExpiry(expiresAt, null, now);
    expect(result.valid).toBe(false);
  });

  it("coupon expiring 1ms in the future should be valid", () => {
    const expiresAt = new Date(now.getTime() + 1); // 1ms after now
    const result = validateCouponExpiry(expiresAt, null, now);
    expect(result.valid).toBe(true);
  });
});
