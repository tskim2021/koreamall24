import { describe, it, expect } from "vitest";
import { Resend } from "resend";

describe("Resend API Key Validation", () => {
  it("should validate RESEND_API_KEY by checking API key info", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");

    const resend = new Resend(apiKey);

    try {
      // Try to get API key info to validate the key
      // This is a lightweight operation that doesn't send emails
      const response = await resend.apiKeys.list();
      
      // If we get here without error, the API key is valid
      expect(response).toBeDefined();
      console.log("[Test] Resend API key is valid");
    } catch (error: any) {
      console.error("[Test] Resend API key validation failed:", error);
      throw new Error(`Invalid RESEND_API_KEY: ${error.message}`);
    }
  });
});
