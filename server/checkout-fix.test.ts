import { describe, it, expect } from "vitest";
import fs from "fs";

describe("체크아웃 결제 플로우 수정 검증", () => {
  describe("서버 스키마 - Stripe checkout.createSession", () => {
    const routersContent = fs.readFileSync("server/routers.ts", "utf-8");

    it("should include couponDiscount in createSession schema", () => {
      expect(routersContent).toContain("couponDiscount: z.number().default(0)");
    });

    it("should include membershipDiscount in createSession schema", () => {
      expect(routersContent).toContain("membershipDiscount: z.number().default(0)");
    });

    it("should pass pointsUsed to createCheckoutSession function", () => {
      expect(routersContent).toContain("pointsUsed: input.pointsUsed");
    });

    it("should pass couponDiscount to createCheckoutSession function", () => {
      expect(routersContent).toContain("couponDiscount: input.couponDiscount");
    });

    it("should pass membershipDiscount to createCheckoutSession function", () => {
      expect(routersContent).toContain("membershipDiscount: input.membershipDiscount");
    });
  });

  describe("서버 스키마 - PayPal createPayPalOrder", () => {
    const routersContent = fs.readFileSync("server/routers.ts", "utf-8");

    it("should include pointsUsed in PayPal schema", () => {
      const paypalSection = routersContent.slice(routersContent.indexOf("createPayPalOrder"));
      expect(paypalSection).toContain("pointsUsed: z.number().default(0)");
    });

    it("should include couponDiscount in PayPal schema", () => {
      const paypalSection = routersContent.slice(routersContent.indexOf("createPayPalOrder"));
      expect(paypalSection).toContain("couponDiscount: z.number().default(0)");
    });
  });

  describe("stripe.ts - 할인 적용 로직", () => {
    const stripeContent = fs.readFileSync("server/stripe.ts", "utf-8");

    it("should accept pointsUsed parameter", () => {
      expect(stripeContent).toContain("pointsUsed?: number");
    });

    it("should accept couponDiscount parameter", () => {
      expect(stripeContent).toContain("couponDiscount?: number");
    });

    it("should accept membershipDiscount parameter", () => {
      expect(stripeContent).toContain("membershipDiscount?: number");
    });

    it("should calculate totalDiscount from all discount sources", () => {
      expect(stripeContent).toContain("const totalDiscount = pointsUsed + couponDiscount + membershipDiscount");
    });

    it("should create Stripe coupon when discount exists", () => {
      expect(stripeContent).toContain("stripe.coupons.create");
    });
  });

  describe("Checkout.tsx - 클라이언트 수정사항", () => {
    const checkoutContent = fs.readFileSync("client/src/pages/Checkout.tsx", "utf-8");

    it("should have fallback for missing Stripe URL", () => {
      expect(checkoutContent).toContain("決済ページのURLを取得できませんでした");
    });

    it("should scroll to first empty field on validation failure", () => {
      expect(checkoutContent).toContain("scrollIntoView({ behavior: 'smooth', block: 'center' })");
    });

    it("should pass couponDiscount to Stripe checkout", () => {
      const stripeSection = checkoutContent.slice(checkoutContent.indexOf("// Online payment (Stripe"));
      expect(stripeSection).toContain("couponDiscount: appliedCoupon?.discountAmount || 0");
    });

    it("should pass membershipDiscount to Stripe checkout", () => {
      const stripeSection = checkoutContent.slice(checkoutContent.indexOf("// Online payment (Stripe"));
      expect(stripeSection).toContain("membershipDiscount: membershipDiscount || 0");
    });

    it("should pass pointsUsed to PayPal checkout", () => {
      const paypalSection = checkoutContent.slice(checkoutContent.indexOf("// PayPal payment"));
      expect(paypalSection).toContain("pointsUsed: pointsToUse");
    });

    it("should pass couponDiscount to PayPal checkout", () => {
      const paypalSection = checkoutContent.slice(checkoutContent.indexOf("// PayPal payment"));
      expect(paypalSection).toContain("couponDiscount: appliedCoupon?.discountAmount || 0");
    });

    it("should have id attribute on recipientNameKanji field", () => {
      expect(checkoutContent).toContain('id="recipientNameKanji"');
    });

    it("should have id attribute on recipientNameHiragana field", () => {
      expect(checkoutContent).toContain('id="recipientNameHiragana"');
    });

    it("should have id attribute on prefecture field", () => {
      expect(checkoutContent).toContain('id="prefecture"');
    });
  });
});
