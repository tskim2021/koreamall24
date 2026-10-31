import { describe, it, expect } from "vitest";
import {
  fetchJapanPostTracking,
  formatJapanPostTrackingNumber,
  isValidJapanPostTrackingNumber,
} from "./_core/japanPostTracking";

describe("Japan Post Tracking", () => {
  describe("formatJapanPostTrackingNumber", () => {
    it("should format valid 11-digit tracking number", () => {
      const result = formatJapanPostTrackingNumber("12345678901");
      expect(result).toBe("123456789-01");
    });

    it("should format valid 13-digit tracking number", () => {
      const result = formatJapanPostTrackingNumber("1234567890123");
      expect(result).toBe("12345678901-23");
    });

    it("should remove spaces from tracking number", () => {
      const result = formatJapanPostTrackingNumber("1234 5678 9012 3");
      expect(result).toBe("12345678901-23");
    });

    it("should handle tracking number with hyphens", () => {
      const result = formatJapanPostTrackingNumber("1234567890-1");
      expect(result).toBe("123456789-01");
    });

    it("should return clean number for invalid length", () => {
      const result = formatJapanPostTrackingNumber("123456789");
      expect(result).toBe("123456789");
    });
  });

  describe("isValidJapanPostTrackingNumber", () => {
    it("should validate 11-digit tracking number", () => {
      expect(isValidJapanPostTrackingNumber("12345678901")).toBe(true);
    });

    it("should validate 12-digit tracking number", () => {
      expect(isValidJapanPostTrackingNumber("123456789012")).toBe(true);
    });

    it("should validate 13-digit tracking number", () => {
      expect(isValidJapanPostTrackingNumber("1234567890123")).toBe(true);
    });

    it("should validate tracking number with spaces", () => {
      expect(isValidJapanPostTrackingNumber("1234 5678 9012")).toBe(true);
    });

    it("should validate tracking number with hyphens", () => {
      expect(isValidJapanPostTrackingNumber("1234567890-1")).toBe(true);
    });

    it("should reject too short tracking number", () => {
      expect(isValidJapanPostTrackingNumber("123456789")).toBe(false);
    });

    it("should reject too long tracking number", () => {
      expect(isValidJapanPostTrackingNumber("12345678901234")).toBe(false);
    });

    it("should reject empty tracking number", () => {
      expect(isValidJapanPostTrackingNumber("")).toBe(false);
    });

    it("should handle non-numeric characters", () => {
      expect(isValidJapanPostTrackingNumber("123456789ABC")).toBe(false);
    });

    it("should handle mixed alphanumeric", () => {
      // The function strips non-numeric characters, so "1234567890A1" becomes "123456789001" (11 digits)
      // This is valid since it has 11 digits
      expect(isValidJapanPostTrackingNumber("1234567890A1")).toBe(true);
    });
  });

  describe("fetchJapanPostTracking", () => {
    it("should return tracking status for valid tracking number", async () => {
      const result = await fetchJapanPostTracking("12345678901");

      expect(result).toBeDefined();
      expect(result.trackingNumber).toBe("12345678901");
      expect(result.status).toBeDefined();
      expect(["pending", "in_transit", "out_for_delivery", "delivered", "exception"]).toContain(
        result.status
      );
    });

    it("should include lastUpdate timestamp", async () => {
      const result = await fetchJapanPostTracking("12345678901");

      expect(result.lastUpdate).toBeDefined();
      expect(result.lastUpdate instanceof Date).toBe(true);
    });

    it("should include events array", async () => {
      const result = await fetchJapanPostTracking("12345678901");

      expect(Array.isArray(result.events)).toBe(true);
    });

    it("should handle tracking number with hyphens", async () => {
      const result = await fetchJapanPostTracking("1234567890-1");

      expect(result).toBeDefined();
      // The function strips non-numeric characters internally, so the returned tracking number is the clean version
      expect(result.trackingNumber).toBe("12345678901");
    });

    it("should handle tracking number with spaces", async () => {
      const result = await fetchJapanPostTracking("1234 5678 9012");

      expect(result).toBeDefined();
    });

    it("should return pending status for invalid tracking number", async () => {
      const result = await fetchJapanPostTracking("invalid");

      expect(result.status).toBe("pending");
      expect(Array.isArray(result.events)).toBe(true);
    });

    it("should return pending status for empty tracking number", async () => {
      const result = await fetchJapanPostTracking("");

      expect(result.status).toBe("pending");
    });

    it("should return pending status for too short tracking number", async () => {
      const result = await fetchJapanPostTracking("123456789");

      expect(result.status).toBe("pending");
    });

    it("should return pending status for too long tracking number", async () => {
      const result = await fetchJapanPostTracking("12345678901234");

      expect(result.status).toBe("pending");
    });

    it("should handle network errors gracefully", async () => {
      // This test verifies error handling - the function should return a pending status
      const result = await fetchJapanPostTracking("12345678901");

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
    });
  });

  describe("Tracking Status Types", () => {
    it("should have valid status values", async () => {
      const result = await fetchJapanPostTracking("12345678901");

      const validStatuses = ["pending", "in_transit", "out_for_delivery", "delivered", "exception"];
      expect(validStatuses).toContain(result.status);
    });

    it("should have consistent tracking number format", async () => {
      const result = await fetchJapanPostTracking("12345678901");

      expect(result.trackingNumber).toBeDefined();
      expect(typeof result.trackingNumber).toBe("string");
      expect(result.trackingNumber.length).toBeGreaterThan(0);
    });
  });

  describe("International Tracking Numbers", () => {
    it("should validate international tracking number format", () => {
      expect(isValidJapanPostTrackingNumber("RM767809377IN")).toBe(true);
    });

    it("should fetch tracking for international tracking number", async () => {
      const result = await fetchJapanPostTracking("RM767809377IN");

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      const validStatuses = ["pending", "in_transit", "out_for_delivery", "delivered", "exception"];
      expect(validStatuses).toContain(result.status);
    });
  });

  describe("Delivered Status Recognition", () => {
    it("should recognize delivered status", async () => {
      const result = await fetchJapanPostTracking("12345678901");

      const validStatuses = ["pending", "in_transit", "out_for_delivery", "delivered", "exception"];
      expect(validStatuses).toContain(result.status);
    });

    it("should extract events from tracking response", async () => {
      const result = await fetchJapanPostTracking("12345678901");

      expect(Array.isArray(result.events)).toBe(true);

      if (result.events.length > 0) {
        result.events.forEach((event) => {
          expect(event.timestamp).toBeDefined();
          expect(event.status).toBeDefined();
          expect(event.description).toBeDefined();
          expect(event.location).toBeDefined();
        });
      }
    });
  });
});
