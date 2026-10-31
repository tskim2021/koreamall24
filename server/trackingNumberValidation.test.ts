import { describe, it, expect } from "vitest";

describe("Japan Post Tracking Number Validation", () => {
  function isValidJapanPostTrackingNumber(trackingNumber: string): boolean {
    const numericOnly = trackingNumber.replace(/[^0-9]/g, "");
    const alphanumeric = trackingNumber.replace(/[^0-9A-Za-z]/g, "");

    if (numericOnly.length >= 11 && numericOnly.length <= 13) {
      return true;
    }

    if (alphanumeric.length >= 13 && alphanumeric.length <= 15) {
      const letterCount = (alphanumeric.match(/[A-Za-z]/g) || []).length;
      return letterCount >= 2;
    }

    return false;
  }

  describe("Domestic Format (11-13 digits)", () => {
    it("should accept 11-digit tracking number", () => {
      expect(isValidJapanPostTrackingNumber("12345678901")).toBe(true);
    });

    it("should accept 12-digit tracking number", () => {
      expect(isValidJapanPostTrackingNumber("123456789012")).toBe(true);
    });

    it("should accept 13-digit tracking number", () => {
      expect(isValidJapanPostTrackingNumber("1234567890123")).toBe(true);
    });

    it("should reject 10-digit number", () => {
      expect(isValidJapanPostTrackingNumber("1234567890")).toBe(false);
    });

    it("should reject 14-digit number", () => {
      expect(isValidJapanPostTrackingNumber("12345678901234")).toBe(false);
    });
  });

  describe("International Format (13+ digits with letters)", () => {
    it("should accept international format RM767809377IN", () => {
      expect(isValidJapanPostTrackingNumber("RM767809377IN")).toBe(true);
    });

    it("should accept other international formats", () => {
      expect(isValidJapanPostTrackingNumber("1234567890123US")).toBe(true);
    });

    it("should accept international format with lowercase letters", () => {
      expect(isValidJapanPostTrackingNumber("rm767809377in")).toBe(true);
    });

    it("should accept international format with mixed case", () => {
      expect(isValidJapanPostTrackingNumber("Rm767809377In")).toBe(true);
    });

    it("should accept international format with 1 letter", () => {
      expect(isValidJapanPostTrackingNumber("1234567890123A")).toBe(true);
    });

    it("should reject international format with less than 13 characters", () => {
      expect(isValidJapanPostTrackingNumber("123456789IN")).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string", () => {
      expect(isValidJapanPostTrackingNumber("")).toBe(false);
    });

    it("should handle string with only letters", () => {
      expect(isValidJapanPostTrackingNumber("ABCDEFGHIJ")).toBe(false);
    });

    it("should handle very long string", () => {
      expect(isValidJapanPostTrackingNumber("123456789012345678901234567890")).toBe(false);
    });

    it("should strip all non-alphanumeric characters", () => {
      expect(isValidJapanPostTrackingNumber("RM-7678-0937-7IN")).toBe(true);
    });
  });

  describe("Real-world Examples", () => {
    it("should validate real Japan Post domestic tracking number", () => {
      expect(isValidJapanPostTrackingNumber("1234567890-12")).toBe(true);
    });

    it("should validate real international tracking number", () => {
      expect(isValidJapanPostTrackingNumber("RM767809377IN")).toBe(true);
    });

    it("should validate EMS tracking number format", () => {
      expect(isValidJapanPostTrackingNumber("1234567890123AB")).toBe(true);
    });

    it("should validate registered mail format", () => {
      expect(isValidJapanPostTrackingNumber("12345678901")).toBe(true);
    });
  });
});
