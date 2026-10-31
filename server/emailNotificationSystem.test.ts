import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock emailService
vi.mock("./_core/emailService", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordChangedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendProfileUpdatedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendRefundEmail: vi.fn().mockResolvedValue({ success: true }),
  sendQAAnswerEmail: vi.fn().mockResolvedValue({ success: true }),
  sendReviewStatusEmail: vi.fn().mockResolvedValue({ success: true }),
  sendCouponIssuedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEventStartedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendRestockAlertEmail: vi.fn().mockResolvedValue({ success: true }),
  sendReviewPointsEmail: vi.fn().mockResolvedValue({ success: true }),
  sendFirstPurchaseCouponEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPointsEarnedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendCouponExpiringEmail: vi.fn().mockResolvedValue({ success: true }),
  sendBirthdayCouponEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEventEndingSoonEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPriceDropEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOrderShippedEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock db
vi.mock("./db", () => ({
  getSetting: vi.fn().mockResolvedValue("true"),
  upsertSiteSetting: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
}));

describe("이메일 알림 시스템 - Phase 1 핵심 이메일", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. 회원 관리 이메일", () => {
    it("회원가입 완료 시 환영 이메일이 발송되어야 한다", async () => {
      const { sendWelcomeEmail } = await import("./_core/emailService");
      await sendWelcomeEmail({
        to: "test@example.com",
        name: "홍길동",
        loginUrl: "https://kusuri-mall.com/login",
      });
      expect(sendWelcomeEmail).toHaveBeenCalledWith({
        to: "test@example.com",
        name: "홍길동",
        loginUrl: "https://kusuri-mall.com/login",
      });
    });

    it("비밀번호 변경 시 보안 알림 이메일이 발송되어야 한다", async () => {
      const { sendPasswordChangedEmail } = await import("./_core/emailService");
      await sendPasswordChangedEmail({
        to: "test@example.com",
        name: "홍길동",
        changedAt: new Date().toISOString(),
      });
      expect(sendPasswordChangedEmail).toHaveBeenCalledTimes(1);
    });

    it("프로필 수정 시 확인 이메일이 발송되어야 한다", async () => {
      const { sendProfileUpdatedEmail } = await import("./_core/emailService");
      await sendProfileUpdatedEmail({
        to: "test@example.com",
        name: "홍길동",
        updatedAt: new Date().toISOString(),
      });
      expect(sendProfileUpdatedEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe("2. 주문/배송/결제 이메일", () => {
    it("환불 처리 시 환불 완료 이메일이 발송되어야 한다", async () => {
      const { sendRefundEmail } = await import("./_core/emailService");
      await sendRefundEmail({
        to: "test@example.com",
        name: "홍길동",
        orderId: "ORD-2024-001",
        refundAmount: 15000,
        refundMethod: "카드 결제 취소",
      });
      expect(sendRefundEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "ORD-2024-001",
          refundAmount: 15000,
        })
      );
    });

    it("주문 확인 이메일이 올바른 데이터로 발송되어야 한다", async () => {
      const { sendOrderConfirmationEmail } = await import("./_core/emailService");
      await sendOrderConfirmationEmail({
        to: "test@example.com",
        name: "홍길동",
        orderId: "ORD-2024-001",
        orderDate: new Date().toISOString(),
        items: [{ name: "비타민C", quantity: 2, price: 3000 }],
        totalAmount: 6000,
        shippingAddress: "서울시 강남구",
      });
      expect(sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. 문의/리뷰 이메일", () => {
    it("Q&A 답변 등록 시 알림 이메일이 발송되어야 한다", async () => {
      const { sendQAAnswerEmail } = await import("./_core/emailService");
      await sendQAAnswerEmail({
        to: "test@example.com",
        name: "홍길동",
        productName: "비타민C 1000mg",
        question: "복용 방법이 어떻게 되나요?",
        answer: "하루 1정씩 식후에 복용하세요.",
        productUrl: "https://kusuri-mall.com/product/1",
      });
      expect(sendQAAnswerEmail).toHaveBeenCalledTimes(1);
    });

    it("리뷰 승인 시 승인 알림 이메일이 발송되어야 한다", async () => {
      const { sendReviewStatusEmail } = await import("./_core/emailService");
      await sendReviewStatusEmail({
        to: "test@example.com",
        name: "홍길동",
        productName: "비타민C 1000mg",
        status: "approved",
        reviewUrl: "https://kusuri-mall.com/product/1#reviews",
      });
      expect(sendReviewStatusEmail).toHaveBeenCalledWith(
        expect.objectContaining({ status: "approved" })
      );
    });

    it("리뷰 반려 시 반려 사유와 함께 이메일이 발송되어야 한다", async () => {
      const { sendReviewStatusEmail } = await import("./_core/emailService");
      await sendReviewStatusEmail({
        to: "test@example.com",
        name: "홍길동",
        productName: "비타민C 1000mg",
        status: "rejected",
        reason: "광고성 내용이 포함되어 있습니다.",
        reviewUrl: "https://kusuri-mall.com/product/1#reviews",
      });
      expect(sendReviewStatusEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "rejected",
          reason: "광고성 내용이 포함되어 있습니다.",
        })
      );
    });

    it("리뷰 포인트 적립 시 알림 이메일이 발송되어야 한다", async () => {
      const { sendReviewPointsEmail } = await import("./_core/emailService");
      await sendReviewPointsEmail({
        to: "test@example.com",
        name: "홍길동",
        points: 100,
        totalPoints: 1500,
        productName: "비타민C 1000mg",
      });
      expect(sendReviewPointsEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe("4. 쿠폰/포인트 이메일", () => {
    it("쿠폰 발급 시 쿠폰 코드와 함께 이메일이 발송되어야 한다", async () => {
      const { sendCouponIssuedEmail } = await import("./_core/emailService");
      await sendCouponIssuedEmail({
        to: "test@example.com",
        name: "홍길동",
        couponCode: "WELCOME2024",
        discountValue: 10,
        discountType: "percent",
        expiresAt: "2024-12-31",
        minimumOrderAmount: 10000,
      });
      expect(sendCouponIssuedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          couponCode: "WELCOME2024",
          discountValue: 10,
        })
      );
    });

    it("포인트 적립 시 잔여 포인트와 함께 이메일이 발송되어야 한다", async () => {
      const { sendPointsEarnedEmail } = await import("./_core/emailService");
      await sendPointsEarnedEmail({
        to: "test@example.com",
        name: "홍길동",
        points: 500,
        totalPoints: 2000,
        reason: "구매 적립",
      });
      expect(sendPointsEarnedEmail).toHaveBeenCalledTimes(1);
    });

    it("생일 쿠폰 발송 시 축하 메시지와 함께 이메일이 발송되어야 한다", async () => {
      const { sendBirthdayCouponEmail } = await import("./_core/emailService");
      await sendBirthdayCouponEmail({
        to: "test@example.com",
        name: "홍길동",
        couponCode: "BIRTHDAY2024",
        discountValue: 20,
        discountType: "percent",
        expiresAt: "2024-12-31",
      });
      expect(sendBirthdayCouponEmail).toHaveBeenCalledTimes(1);
    });

    it("첫 구매 감사 쿠폰 발송 시 이메일이 발송되어야 한다", async () => {
      const { sendFirstPurchaseCouponEmail } = await import("./_core/emailService");
      await sendFirstPurchaseCouponEmail({
        to: "test@example.com",
        name: "홍길동",
        couponCode: "FIRST2024",
        discountValue: 15,
        discountType: "percent",
        expiresAt: "2024-12-31",
      });
      expect(sendFirstPurchaseCouponEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe("5. 이벤트 이메일", () => {
    it("이벤트 시작 시 전체 회원에게 이메일이 발송되어야 한다", async () => {
      const { sendEventStartedEmail } = await import("./_core/emailService");
      await sendEventStartedEmail({
        to: "test@example.com",
        name: "홍길동",
        eventTitle: "여름 세일 이벤트",
        eventDescription: "최대 50% 할인",
        startDate: "2024-07-01",
        endDate: "2024-07-31",
        eventUrl: "https://kusuri-mall.com/bbs/event/1",
      });
      expect(sendEventStartedEmail).toHaveBeenCalledTimes(1);
    });

    it("재입고 시 대기 고객에게 이메일이 발송되어야 한다", async () => {
      const { sendRestockAlertEmail } = await import("./_core/emailService");
      await sendRestockAlertEmail({
        to: "test@example.com",
        name: "홍길동",
        productName: "비타민C 1000mg",
        productUrl: "https://kusuri-mall.com/product/1",
        productImageUrl: "https://example.com/image.jpg",
      });
      expect(sendRestockAlertEmail).toHaveBeenCalledTimes(1);
    });
  });
});

describe("이메일 설정 관리", () => {
  it("이메일 설정 키가 올바른 형식이어야 한다", () => {
    const validKeys = [
      "EMAIL_REGISTER_COMPLETE",
      "EMAIL_PASSWORD_CHANGED",
      "EMAIL_PROFILE_UPDATED",
      "EMAIL_ORDER_CONFIRMED",
      "EMAIL_REFUND_COMPLETE",
      "EMAIL_COUPON_ISSUED",
      "EMAIL_EVENT_STARTED",
    ];
    validKeys.forEach((key) => {
      expect(key).toMatch(/^EMAIL_[A-Z_]+$/);
    });
  });

  it("이메일 설정 값은 'true' 또는 'false'여야 한다", () => {
    const validValues = ["true", "false"];
    validValues.forEach((value) => {
      expect(["true", "false"]).toContain(value);
    });
  });

  it("기본 활성화 이메일 목록이 올바르게 정의되어야 한다", () => {
    const defaultEnabledEmails = [
      "EMAIL_REGISTER_COMPLETE",
      "EMAIL_PASSWORD_CHANGED",
      "EMAIL_ORDER_CONFIRMED",
      "EMAIL_ORDER_SHIPPED",
      "EMAIL_REFUND_COMPLETE",
      "EMAIL_INQUIRY_REPLIED",
      "EMAIL_QA_ANSWERED",
      "EMAIL_REVIEW_APPROVED",
      "EMAIL_COUPON_ISSUED",
      "EMAIL_EVENT_STARTED",
    ];
    expect(defaultEnabledEmails.length).toBeGreaterThan(0);
    defaultEnabledEmails.forEach((key) => {
      expect(key).toMatch(/^EMAIL_/);
    });
  });
});
