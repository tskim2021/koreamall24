import { describe, expect, it } from "vitest";
import { generateEmailPreviewHtml } from "./_core/emailService";

describe("generateEmailPreviewHtml", () => {
  it("should return valid HTML for test_email type", () => {
    const html = generateEmailPreviewHtml("test_email");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("テストメール");
    expect(html).toContain("Kusuri Mall");
  });

  it("should return valid HTML for delivery_completion type", () => {
    const html = generateEmailPreviewHtml("delivery_completion");
    expect(html).toContain("配達完了");
    expect(html).toContain("ORD-2024-001");
  });

  it("should return valid HTML for review_reminder_7days type", () => {
    const html = generateEmailPreviewHtml("review_reminder_7days");
    expect(html).toContain("レビュー");
    expect(html).toContain("ポイント");
  });

  it("should return valid HTML for order_cancellation type", () => {
    const html = generateEmailPreviewHtml("order_cancellation");
    expect(html).toContain("キャンセル");
  });

  it("should return valid HTML for delayed_shipment type", () => {
    const html = generateEmailPreviewHtml("delayed_shipment");
    expect(html).toContain("配送遅延");
  });

  it("should return valid HTML for inquiry_receipt type", () => {
    const html = generateEmailPreviewHtml("inquiry_receipt");
    expect(html).toContain("お問い合わせ");
  });

  it("should return valid HTML for point_expiry_alert type", () => {
    const html = generateEmailPreviewHtml("point_expiry_alert");
    expect(html).toContain("ポイント失効");
    expect(html).toContain("3,500 pt");
  });

  it("should return valid HTML for retry_payment type", () => {
    const html = generateEmailPreviewHtml("retry_payment");
    expect(html).toContain("お支払い");
  });

  it("should return fallback HTML for unknown type", () => {
    const html = generateEmailPreviewHtml("unknown_type");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("unknown_type");
  });

  it("all previews should include emailWrapper structure", () => {
    const types = [
      "test_email", "delivery_completion", "review_reminder_7days",
      "order_cancellation", "delayed_shipment", "inquiry_receipt",
      "point_expiry_alert", "retry_payment"
    ];
    for (const type of types) {
      const html = generateEmailPreviewHtml(type);
      expect(html, `${type} should have DOCTYPE`).toContain("<!DOCTYPE html>");
      expect(html, `${type} should have Kusuri Mall brand`).toContain("Kusuri Mall");
      expect(html, `${type} should have footer`).toContain("All rights reserved");
    }
  });
});
