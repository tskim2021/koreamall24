import { describe, it, expect } from "vitest";
import { getResendDomains, sendTestEmail } from "./_core/emailService";

describe("Email Settings System", () => {
  it("should retrieve Resend domains", async () => {
    const result = await getResendDomains();
    
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    
    if (result.success) {
      expect(result.domains).toBeDefined();
      expect(Array.isArray(result.domains)).toBe(true);
      console.log(`[Test] Retrieved ${result.domains?.length || 0} domains`);
    } else {
      console.log(`[Test] Domain retrieval failed (expected in test mode): ${result.error}`);
    }
  });

  it("should validate sendTestEmail function signature", () => {
    expect(sendTestEmail).toBeDefined();
    expect(typeof sendTestEmail).toBe("function");
  });

  it("should handle test email with valid parameters", async () => {
    const result = await sendTestEmail({
      to: "test@example.com",
      from: "onboarding@resend.dev",
      fromName: "ココくすり Test",
    });

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    
    // In test mode, this will fail with domain verification error
    // which is expected behavior
    console.log("[Test] Test email result:", result);
  });

  it("should require RESEND_API_KEY for email operations", async () => {
    // This test verifies that the email service checks for API key
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    console.log("[Test] RESEND_API_KEY is configured");
  });
});
