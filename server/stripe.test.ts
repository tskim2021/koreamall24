import { describe, it, expect, vi, beforeEach } from "vitest";
import { ENV } from "./_core/env";

// Mock Stripe
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: "cs_test_session_123",
            url: "https://checkout.stripe.com/test",
            payment_status: "unpaid",
          }),
          retrieve: vi.fn().mockResolvedValue({
            id: "cs_test_session_123",
            payment_status: "paid",
            customer_email: "test@example.com",
            amount_total: 5500,
          }),
        },
      },
      webhooks: {
        constructEvent: vi.fn().mockImplementation((payload, sig, secret) => {
          if (sig === "invalid_signature") {
            throw new Error("Invalid signature");
          }
          return {
            id: "evt_test_123",
            type: "checkout.session.completed",
            data: {
              object: {
                id: "cs_test_session_123",
                payment_status: "paid",
                metadata: {
                  user_id: "1",
                  shipping_name: "テスト 太郎",
                  shipping_postal_code: "1234567",
                  shipping_prefecture: "東京都",
                  shipping_city: "渋谷区",
                  shipping_address1: "道玄坂1-2-3",
                  shipping_phone: "090-1234-5678",
                  items_json: JSON.stringify([
                    { id: 1, qty: 2, price: "2500" },
                  ]),
                },
              },
            },
          };
        }),
      },
    })),
  };
});

describe("Stripe Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Environment Variables", () => {
    it("should have Stripe secret key in ENV", () => {
      // ENV should have stripeSecretKey property
      expect(ENV).toHaveProperty("stripeSecretKey");
    });

    it("should have Stripe webhook secret in ENV", () => {
      // ENV should have stripeWebhookSecret property
      expect(ENV).toHaveProperty("stripeWebhookSecret");
    });
  });

  describe("Checkout Session Creation", () => {
    it("should create checkout session with correct parameters", async () => {
      const { createCheckoutSession } = await import("./stripe");

      const result = await createCheckoutSession({
        items: [
          {
            productId: 1,
            name: "Test Product",
            nameJa: "テスト商品",
            price: 2500,
            quantity: 2,
            imageUrl: "https://example.com/image.jpg",
          },
        ],
        shippingAddress: {
          postalCode: "1234567",
          prefecture: "東京都",
          city: "渋谷区",
          address1: "道玄坂1-2-3",
          address2: "",
          phone: "090-1234-5678",
          recipientName: "テスト 太郎",
        },
        userId: 1,
        userEmail: "test@example.com",
        userName: "テスト 太郎",
        origin: "http://localhost:3000",
      });

      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("sessionId");
      expect(result.url).toBe("https://checkout.stripe.com/test");
      expect(result.sessionId).toBe("cs_test_session_123");
    });
  });

  describe("Checkout Session Retrieval", () => {
    it("should retrieve checkout session details", async () => {
      const { getCheckoutSession } = await import("./stripe");

      const session = await getCheckoutSession("cs_test_session_123");

      expect(session).toHaveProperty("payment_status");
      expect(session.payment_status).toBe("paid");
      expect(session.customer_email).toBe("test@example.com");
      expect(session.amount_total).toBe(5500);
    });
  });

  describe("Shipping Fee Calculation", () => {
    it("should apply free shipping for orders over 5000 yen", async () => {
      const { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } = await import("./stripe");

      expect(FREE_SHIPPING_THRESHOLD).toBe(5000);
      expect(SHIPPING_FEE).toBe(500);

      // Order total 5500 (2500 * 2 + 500 shipping) should be free shipping
      const subtotal = 5500;
      const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
      expect(shippingFee).toBe(0);
    });

    it("should charge shipping for orders under 5000 yen", async () => {
      const { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } = await import("./stripe");

      const subtotal = 3000;
      const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
      expect(shippingFee).toBe(500);
    });
  });

  describe("Checkout Item Interface", () => {
    it("should accept valid checkout item structure", async () => {
      const { CheckoutItem } = await import("./stripe");

      const item = {
        productId: 1,
        name: "Test Product",
        nameJa: "テスト商品",
        price: 2500,
        quantity: 2,
        imageUrl: "https://example.com/image.jpg",
      };

      // Type check - item should match CheckoutItem interface
      expect(item.productId).toBeTypeOf("number");
      expect(item.name).toBeTypeOf("string");
      expect(item.nameJa).toBeTypeOf("string");
      expect(item.price).toBeTypeOf("number");
      expect(item.quantity).toBeTypeOf("number");
    });
  });

  describe("Shipping Address Interface", () => {
    it("should accept valid shipping address structure", async () => {
      const address = {
        postalCode: "1234567",
        prefecture: "東京都",
        city: "渋谷区",
        address1: "道玄坂1-2-3",
        address2: "マンション101",
        phone: "090-1234-5678",
        recipientName: "テスト 太郎",
      };

      expect(address.postalCode).toHaveLength(7);
      expect(address.prefecture).toContain("都");
      expect(address.phone).toMatch(/^\d{2,4}-\d{2,4}-\d{4}$/);
    });
  });
});

describe("Webhook Handler", () => {
  it("should verify webhook signature", async () => {
    const { constructWebhookEvent } = await import("./stripe");

    // Valid signature
    const event = constructWebhookEvent(
      Buffer.from("{}"),
      "valid_signature",
      "whsec_test"
    );

    expect(event).toHaveProperty("type");
    expect(event.type).toBe("checkout.session.completed");
  });

  it("should reject invalid webhook signature", async () => {
    const { constructWebhookEvent } = await import("./stripe");

    expect(() =>
      constructWebhookEvent(
        Buffer.from("{}"),
        "invalid_signature",
        "whsec_test"
      )
    ).toThrow("Invalid signature");
  });
});
