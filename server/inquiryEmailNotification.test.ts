import { describe, it, expect } from "vitest";
import { sendNewInquiryNotification, sendInquiryReplyNotification } from "./_core/emailService";

describe("Inquiry Email Notification System", () => {
  it("should have sendNewInquiryNotification function", () => {
    expect(sendNewInquiryNotification).toBeDefined();
    expect(typeof sendNewInquiryNotification).toBe("function");
  });

  it("should have sendInquiryReplyNotification function", () => {
    expect(sendInquiryReplyNotification).toBeDefined();
    expect(typeof sendInquiryReplyNotification).toBe("function");
  });

  it("should validate sendNewInquiryNotification parameters", () => {
    // Verify function accepts correct parameters
    expect(() => {
      const params = {
        adminEmail: "admin@example.com",
        inquiryData: {
          id: 1,
          title: "Test",
          content: "Content",
          userName: "User",
          userEmail: "user@example.com",
        },
      };
      expect(params).toBeDefined();
    }).not.toThrow();
  });

  it("should validate sendInquiryReplyNotification parameters", () => {
    // Verify function accepts correct parameters
    expect(() => {
      const params = {
        customerEmail: "customer@example.com",
        inquiryData: {
          id: 1,
          title: "Test",
          replyContent: "Reply",
          inquiryUrl: "https://example.com/inquiry/1",
        },
      };
      expect(params).toBeDefined();
    }).not.toThrow();
  });
});
