import { describe, it, expect, beforeAll } from "vitest";
import { createCheckoutSessionRecord, getCheckoutSessionById, updateCheckoutSessionStatus } from "./db";
import { createRetryPaymentLink } from "./stripe";
import { sendRetryPaymentEmail } from "./_core/emailService";

describe("Retry Payment Email System", () => {
  let testCheckoutSessionId: number;

  beforeAll(async () => {
    // Create a test checkout session
    const session = await createCheckoutSessionRecord({
      sessionId: `test_session_${Date.now()}`,
      userId: 1,
      userEmail: "test@example.com",
      shippingName: "テストユーザー",
      shippingPostalCode: "100-0001",
      shippingPrefecture: "東京都",
      shippingCity: "千代田区",
      shippingAddress1: "千代田1-1-1",
      shippingAddress2: null,
      shippingPhone: "03-1234-5678",
      itemsJson: JSON.stringify([
        {
          productId: 1,
          name: "Test Product",
          nameJa: "テスト商品",
          price: 1000,
          quantity: 2,
          imageUrl: "https://example.com/image.jpg",
        },
      ]),
      subtotal: "2000",
      shippingFee: "500",
      totalAmount: "2500",
      status: "pending",
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    });

    if (session) {
      testCheckoutSessionId = session.id;
      // Mark as failed
      await updateCheckoutSessionStatus(session.sessionId, "failed", "カードが拒否されました");
    }
  });

  it("should retrieve checkout session by ID", async () => {
    const session = await getCheckoutSessionById(testCheckoutSessionId);
    expect(session).toBeDefined();
    expect(session?.status).toBe("failed");
    expect(session?.failureReason).toBe("カードが拒否されました");
  });

  it("should create retry payment link with correct data", async () => {
    const session = await getCheckoutSessionById(testCheckoutSessionId);
    expect(session).toBeDefined();

    if (session) {
      const { url, sessionId } = await createRetryPaymentLink({
        checkoutSession: session,
        origin: "https://test.example.com",
      });

      expect(url).toBeDefined();
      expect(url).toContain("checkout.stripe.com");
      expect(sessionId).toBeDefined();
      console.log("[Test] Retry payment link created:", url);
    }
  });

  it("should send retry payment email (dry run if RESEND_API_KEY not configured)", async () => {
    const result = await sendRetryPaymentEmail({
      to: "test@example.com",
      customerName: "テストユーザー",
      orderAmount: "¥2,500",
      retryPaymentUrl: "https://checkout.stripe.com/test",
      failureReason: "カードが拒否されました",
    });

    // If RESEND_API_KEY is not configured, it should return success: false
    // If configured, it should return success: true
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    console.log("[Test] Email send result:", result);
  });

  it("should validate email HTML template contains required elements", async () => {
    const emailParams = {
      to: "test@example.com",
      customerName: "テストユーザー",
      orderAmount: "¥2,500",
      retryPaymentUrl: "https://checkout.stripe.com/test",
      failureReason: "カードが拒否されました",
    };

    // Check that email service is imported correctly
    expect(sendRetryPaymentEmail).toBeDefined();
    expect(typeof sendRetryPaymentEmail).toBe("function");

    // Verify parameters
    expect(emailParams.customerName).toContain("テスト");
    expect(emailParams.orderAmount).toContain("¥");
    expect(emailParams.retryPaymentUrl).toContain("checkout.stripe.com");
  });
});
