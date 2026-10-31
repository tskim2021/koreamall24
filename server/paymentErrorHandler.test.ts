/**
 * Payment Error Handler Tests
 * Tests for error message mapping and retry logic
 */

import { describe, it, expect } from "vitest";
import {
  parsePaymentError,
  getRetryMessage,
  formatErrorForLogging,
  type PaymentErrorInfo,
} from "../shared/utils/paymentErrorHandler";

describe("Payment Error Handler", () => {
  describe("parsePaymentError", () => {
    it("should map Stripe card_declined error to user-friendly message", () => {
      const error = { code: "card_declined", message: "Card was declined" };
      const result = parsePaymentError(error, "stripe");

      expect(result.title).toBe("決済エラー");
      expect(result.message).toContain("カードが拒否されました");
      expect(result.retryable).toBe(false);
      expect(result.provider).toBe("stripe");
    });

    it("should map Stripe processing_error as retryable", () => {
      const error = { code: "processing_error", message: "Processing error" };
      const result = parsePaymentError(error, "stripe");

      expect(result.message).toContain("処理中にエラーが発生しました");
      expect(result.retryable).toBe(true);
    });

    it("should map Airwallex insufficient_funds error", () => {
      const error = { code: "insufficient_funds" };
      const result = parsePaymentError(error, "airwallex");

      expect(result.message).toContain("残高不足です");
      expect(result.retryable).toBe(false);
      expect(result.provider).toBe("airwallex");
    });

    it("should map 2Checkout expired_card error", () => {
      const error = { code: "expired_card" };
      const result = parsePaymentError(error, "2checkout");

      expect(result.message).toContain("有効期限が切れています");
      expect(result.retryable).toBe(false);
    });

    it("should map PayPal INSTRUMENT_DECLINED error", () => {
      const error = { code: "INSTRUMENT_DECLINED" };
      const result = parsePaymentError(error, "payoneer");

      expect(result.message).toContain("支払い方法が拒否されました");
      expect(result.retryable).toBe(false);
    });

    it("should map bank transfer timeout as retryable", () => {
      const error = { code: "timeout" };
      const result = parsePaymentError(error, "bank_transfer");

      expect(result.message).toContain("タイムアウト");
      expect(result.retryable).toBe(true);
    });

    it("should handle string error input", () => {
      const result = parsePaymentError("card_declined", "stripe");

      expect(result.message).toContain("カードが拒否されました");
      expect(result.originalError).toBe("card_declined");
    });

    it("should handle unknown error codes with default message", () => {
      const error = { code: "unknown_error_code" };
      const result = parsePaymentError(error, "stripe");

      expect(result.message).toContain("決済処理中にエラーが発生しました");
      expect(result.retryable).toBe(true); // Default: retryable
    });

    it("should handle CookiePay authentication_error", () => {
      const error = { code: "authentication_error" };
      const result = parsePaymentError(error, "cookiepay");

      expect(result.message).toContain("認証に失敗しました");
      expect(result.retryable).toBe(false);
    });
  });

  describe("getRetryMessage", () => {
    it("should return retry-friendly message for retryable errors", () => {
      const errorInfo: PaymentErrorInfo = {
        title: "決済エラー",
        message: "処理中にエラーが発生しました",
        retryable: true,
        provider: "stripe",
      };

      const message = getRetryMessage(errorInfo);
      expect(message).toContain("もう一度お試しいただくか");
      expect(message).toContain("別の支払い方法");
    });

    it("should return non-retry message for non-retryable errors", () => {
      const errorInfo: PaymentErrorInfo = {
        title: "決済エラー",
        message: "カードが拒否されました",
        retryable: false,
        provider: "stripe",
      };

      const message = getRetryMessage(errorInfo);
      expect(message).toContain("別の支払い方法をお選びください");
      expect(message).not.toContain("もう一度お試し");
    });
  });

  describe("formatErrorForLogging", () => {
    it("should format error info for logging", () => {
      const errorInfo: PaymentErrorInfo = {
        title: "決済エラー",
        message: "カードが拒否されました",
        retryable: false,
        provider: "stripe",
        originalError: "card_declined",
      };

      const formatted = formatErrorForLogging(errorInfo);

      expect(formatted).toContain("[stripe]");
      expect(formatted).toContain("決済エラー");
      expect(formatted).toContain("カードが拒否されました");
      expect(formatted).toContain("card_declined");
    });
  });

  describe("Error categorization", () => {
    it("should categorize card errors as non-retryable", () => {
      const cardErrors = [
        "card_declined",
        "expired_card",
        "incorrect_cvc",
        "invalid_card",
      ];

      cardErrors.forEach((errorCode) => {
        const result = parsePaymentError({ code: errorCode }, "stripe");
        expect(result.retryable).toBe(false);
      });
    });

    it("should categorize temporary errors as retryable", () => {
      const tempErrors = [
        "processing_error",
        "rate_limit",
        "api_connection_error",
        "timeout",
      ];

      tempErrors.forEach((errorCode) => {
        const result = parsePaymentError({ code: errorCode }, "stripe");
        expect(result.retryable).toBe(true);
      });
    });

    it("should categorize fund errors as non-retryable", () => {
      const fundErrors = ["insufficient_funds", "INSUFFICIENT_FUNDS"];

      fundErrors.forEach((errorCode) => {
        const result = parsePaymentError({ code: errorCode }, "stripe");
        expect(result.retryable).toBe(false);
      });
    });
  });

  describe("Multi-provider error handling", () => {
    it("should handle same error code differently across providers", () => {
      const error = { code: "timeout" };

      const stripeResult = parsePaymentError(error, "stripe");
      const airwallexResult = parsePaymentError(error, "airwallex");

      // Both should be retryable but may have different messages
      expect(stripeResult.retryable).toBe(true);
      expect(airwallexResult.retryable).toBe(true);
      expect(stripeResult.provider).toBe("stripe");
      expect(airwallexResult.provider).toBe("airwallex");
    });

    it("should preserve provider information in error info", () => {
      const providers = ["stripe", "airwallex", "2checkout", "payoneer", "bank_transfer", "cookiepay"] as const;

      providers.forEach((provider) => {
        const result = parsePaymentError({ code: "test_error" }, provider);
        expect(result.provider).toBe(provider);
      });
    });
  });
});
