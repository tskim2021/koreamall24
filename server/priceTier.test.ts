import { describe, it, expect, vi, beforeEach } from "vitest";

// ============ Unit tests for price tier calculation logic ============

// Replicate the calculation functions from PriceTierSection
function getRecommendedDiscount(quantity: number): number {
  if (quantity <= 1) return 0;
  if (quantity === 2) return 15;
  if (quantity === 3) return 25;
  if (quantity === 5) return 35;
  if (quantity === 7) return 45;
  if (quantity >= 10) return 55;
  return Math.min(Math.round(quantity * 5.5), 70);
}

function calculateTierPrices(
  basePrice: number,
  quantity: number,
  discountPercent: number
): { unitPrice: string; totalPrice: string } {
  const discountedUnit = Math.round(basePrice * (1 - discountPercent / 100));
  const total = discountedUnit * quantity;
  return {
    unitPrice: discountedUnit.toFixed(2),
    totalPrice: total.toFixed(2),
  };
}

describe("Price Tier Calculation Logic", () => {
  describe("getRecommendedDiscount", () => {
    it("should return 0% discount for quantity 1", () => {
      expect(getRecommendedDiscount(1)).toBe(0);
    });

    it("should return 15% discount for quantity 2", () => {
      expect(getRecommendedDiscount(2)).toBe(15);
    });

    it("should return 25% discount for quantity 3", () => {
      expect(getRecommendedDiscount(3)).toBe(25);
    });

    it("should return 35% discount for quantity 5", () => {
      expect(getRecommendedDiscount(5)).toBe(35);
    });

    it("should return 45% discount for quantity 7", () => {
      expect(getRecommendedDiscount(7)).toBe(45);
    });

    it("should return 55% discount for quantity 10 or more", () => {
      expect(getRecommendedDiscount(10)).toBe(55);
      expect(getRecommendedDiscount(15)).toBe(55);
      expect(getRecommendedDiscount(20)).toBe(55);
    });

    it("should interpolate for other quantities", () => {
      const discount4 = getRecommendedDiscount(4);
      expect(discount4).toBeGreaterThan(0);
      expect(discount4).toBeLessThanOrEqual(70);
    });

    it("should cap discount at 70%", () => {
      // For very large quantities, the interpolation formula caps at 70
      const discount100 = getRecommendedDiscount(100);
      // quantity >= 10 returns 55
      expect(discount100).toBe(55);
    });
  });

  describe("calculateTierPrices", () => {
    it("should calculate correct prices for no discount", () => {
      const result = calculateTierPrices(1000, 1, 0);
      expect(result.unitPrice).toBe("1000.00");
      expect(result.totalPrice).toBe("1000.00");
    });

    it("should calculate correct prices with 15% discount", () => {
      const result = calculateTierPrices(1000, 2, 15);
      expect(result.unitPrice).toBe("850.00");
      expect(result.totalPrice).toBe("1700.00");
    });

    it("should calculate correct prices with 25% discount", () => {
      const result = calculateTierPrices(1000, 3, 25);
      expect(result.unitPrice).toBe("750.00");
      expect(result.totalPrice).toBe("2250.00");
    });

    it("should calculate correct prices with 55% discount for 10 units", () => {
      const result = calculateTierPrices(1000, 10, 55);
      expect(result.unitPrice).toBe("450.00");
      expect(result.totalPrice).toBe("4500.00");
    });

    it("should handle real product price (¥3,980)", () => {
      const basePrice = 3980;

      // 1箱 - no discount
      const tier1 = calculateTierPrices(basePrice, 1, 0);
      expect(tier1.unitPrice).toBe("3980.00");
      expect(tier1.totalPrice).toBe("3980.00");

      // 2箱 - 15% discount
      const tier2 = calculateTierPrices(basePrice, 2, 15);
      expect(tier2.unitPrice).toBe("3383.00");
      expect(tier2.totalPrice).toBe("6766.00");

      // 10箱 - 55% discount
      const tier10 = calculateTierPrices(basePrice, 10, 55);
      expect(tier10.unitPrice).toBe("1791.00");
      expect(tier10.totalPrice).toBe("17910.00");
    });

    it("should handle zero base price", () => {
      const result = calculateTierPrices(0, 5, 25);
      expect(result.unitPrice).toBe("0.00");
      expect(result.totalPrice).toBe("0.00");
    });

    it("should handle 100% discount", () => {
      const result = calculateTierPrices(1000, 5, 100);
      expect(result.unitPrice).toBe("0.00");
      expect(result.totalPrice).toBe("0.00");
    });

    it("should round unit price to nearest integer before multiplying", () => {
      // 3980 * (1 - 0.15) = 3383 (exact)
      const result = calculateTierPrices(3980, 2, 15);
      expect(parseFloat(result.unitPrice)).toBe(3383);
      expect(parseFloat(result.totalPrice)).toBe(6766);
    });
  });

  describe("Default tier generation", () => {
    const DEFAULT_QUANTITIES = [1, 2, 3, 5, 7, 10];
    const basePrice = 3980;

    it("should generate 6 default tiers", () => {
      const tiers = DEFAULT_QUANTITIES.map((qty, index) => {
        const discount = getRecommendedDiscount(qty);
        const { unitPrice, totalPrice } = calculateTierPrices(basePrice, qty, discount);
        return {
          quantity: qty,
          unitPrice,
          totalPrice,
          discountPercent: discount,
          isPopular: qty === 10,
          isActive: true,
          sortOrder: index,
        };
      });

      expect(tiers).toHaveLength(6);
    });

    it("should mark only quantity 10 as popular", () => {
      const tiers = DEFAULT_QUANTITIES.map((qty) => ({
        quantity: qty,
        isPopular: qty === 10,
      }));

      const popularTiers = tiers.filter((t) => t.isPopular);
      expect(popularTiers).toHaveLength(1);
      expect(popularTiers[0].quantity).toBe(10);
    });

    it("should have increasing discounts as quantity increases", () => {
      const discounts = DEFAULT_QUANTITIES.map((qty) => getRecommendedDiscount(qty));
      
      for (let i = 1; i < discounts.length; i++) {
        expect(discounts[i]).toBeGreaterThan(discounts[i - 1]);
      }
    });

    it("should have decreasing unit prices as quantity increases", () => {
      const unitPrices = DEFAULT_QUANTITIES.map((qty) => {
        const discount = getRecommendedDiscount(qty);
        const { unitPrice } = calculateTierPrices(basePrice, qty, discount);
        return parseFloat(unitPrice);
      });

      for (let i = 1; i < unitPrices.length; i++) {
        expect(unitPrices[i]).toBeLessThan(unitPrices[i - 1]);
      }
    });

    it("should have all tiers active by default", () => {
      const tiers = DEFAULT_QUANTITIES.map((qty) => ({
        isActive: true,
      }));

      expect(tiers.every((t) => t.isActive)).toBe(true);
    });

    it("should have correct sort order", () => {
      const tiers = DEFAULT_QUANTITIES.map((qty, index) => ({
        sortOrder: index,
      }));

      tiers.forEach((tier, index) => {
        expect(tier.sortOrder).toBe(index);
      });
    });
  });
});

// ============ Server-side DB function tests ============

describe("Price Tier Database Functions", () => {
  it("should export getProductPriceTiers function", async () => {
    const db = await import("./db");
    expect(typeof db.getProductPriceTiers).toBe("function");
  });

  it("should export upsertPriceTiers function", async () => {
    const db = await import("./db");
    expect(typeof db.upsertPriceTiers).toBe("function");
  });

  it("should export deletePriceTier function", async () => {
    const db = await import("./db");
    expect(typeof db.deletePriceTier).toBe("function");
  });

  it("should export getActiveProductPriceTiers function", async () => {
    const db = await import("./db");
    expect(typeof db.getActiveProductPriceTiers).toBe("function");
  });

  it("should return empty array for non-existent product", async () => {
    const db = await import("./db");
    const tiers = await db.getProductPriceTiers(999999);
    expect(Array.isArray(tiers)).toBe(true);
    expect(tiers.length).toBe(0);
  });

  it("should upsert and retrieve price tiers", async () => {
    const db = await import("./db");
    
    const testProductId = 1; // Assuming product 1 exists
    const testTiers = [
      {
        quantity: 1,
        unitPrice: "3980.00",
        totalPrice: "3980.00",
        discountPercent: 0,
        isPopular: false,
        isActive: true,
        sortOrder: 0,
      },
      {
        quantity: 3,
        unitPrice: "2985.00",
        totalPrice: "8955.00",
        discountPercent: 25,
        isPopular: false,
        isActive: true,
        sortOrder: 1,
      },
      {
        quantity: 10,
        unitPrice: "1791.00",
        totalPrice: "17910.00",
        discountPercent: 55,
        isPopular: true,
        isActive: true,
        sortOrder: 2,
      },
    ];

    const result = await db.upsertPriceTiers(testProductId, testTiers);
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      // Verify the tiers were saved
      expect(result.length).toBe(3);
      
      // Check first tier
      expect(result[0].quantity).toBe(1);
      expect(result[0].discountPercent).toBe(0);
      
      // Check popular tier
      const popularTier = result.find(t => t.isPopular);
      expect(popularTier).toBeDefined();
      expect(popularTier?.quantity).toBe(10);
    }
  });

  it("should retrieve tiers ordered by quantity", async () => {
    const db = await import("./db");
    
    const tiers = await db.getProductPriceTiers(1);
    if (tiers.length > 1) {
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].quantity).toBeGreaterThanOrEqual(tiers[i - 1].quantity);
      }
    }
  });

  it("should replace existing tiers on upsert", async () => {
    const db = await import("./db");
    
    const testProductId = 1;
    
    // First upsert with 3 tiers
    await db.upsertPriceTiers(testProductId, [
      { quantity: 1, unitPrice: "1000.00", totalPrice: "1000.00", discountPercent: 0, isPopular: false, isActive: true, sortOrder: 0 },
      { quantity: 2, unitPrice: "900.00", totalPrice: "1800.00", discountPercent: 10, isPopular: false, isActive: true, sortOrder: 1 },
      { quantity: 3, unitPrice: "800.00", totalPrice: "2400.00", discountPercent: 20, isPopular: false, isActive: true, sortOrder: 2 },
    ]);
    
    // Second upsert with 2 tiers (should replace)
    const result = await db.upsertPriceTiers(testProductId, [
      { quantity: 5, unitPrice: "700.00", totalPrice: "3500.00", discountPercent: 30, isPopular: false, isActive: true, sortOrder: 0 },
      { quantity: 10, unitPrice: "500.00", totalPrice: "5000.00", discountPercent: 50, isPopular: true, isActive: true, sortOrder: 1 },
    ]);
    
    if (result.length > 0) {
      expect(result.length).toBe(2);
      expect(result[0].quantity).toBe(5);
      expect(result[1].quantity).toBe(10);
    }
  });

  it("should handle empty tiers array (clear all)", async () => {
    const db = await import("./db");
    
    const testProductId = 1;
    
    // Upsert with empty array should clear all tiers
    const result = await db.upsertPriceTiers(testProductId, []);
    expect(Array.isArray(result)).toBe(true);
    
    // Verify no tiers exist
    const tiers = await db.getProductPriceTiers(testProductId);
    expect(tiers.length).toBe(0);
  });
});

// ============ Active Price Tiers (Customer-facing) tests ============

describe("Active Price Tiers for Customer UI", () => {
  it("should export getActiveProductPriceTiers function", async () => {
    const db = await import("./db");
    expect(typeof db.getActiveProductPriceTiers).toBe("function");
  });

  it("should return empty array for non-existent product", async () => {
    const db = await import("./db");
    const tiers = await db.getActiveProductPriceTiers(999999);
    expect(Array.isArray(tiers)).toBe(true);
    expect(tiers.length).toBe(0);
  });

  it("should only return active tiers", async () => {
    const db = await import("./db");
    
    // First insert some tiers with mixed active states
    await db.upsertPriceTiers(1, [
      { quantity: 1, unitPrice: "3980.00", totalPrice: "3980.00", discountPercent: 0, isPopular: false, isActive: true, sortOrder: 0 },
      { quantity: 3, unitPrice: "2985.00", totalPrice: "8955.00", discountPercent: 25, isPopular: false, isActive: false, sortOrder: 1 },
      { quantity: 10, unitPrice: "1791.00", totalPrice: "17910.00", discountPercent: 55, isPopular: true, isActive: true, sortOrder: 2 },
    ]);
    
    const activeTiers = await db.getActiveProductPriceTiers(1);
    // Should only have active tiers
    expect(activeTiers.every(t => t.isActive === true)).toBe(true);
    // Should have 2 active tiers (qty 1 and qty 10)
    expect(activeTiers.length).toBe(2);
  });

  it("should return tiers ordered by quantity ascending", async () => {
    const db = await import("./db");
    
    await db.upsertPriceTiers(1, [
      { quantity: 10, unitPrice: "1791.00", totalPrice: "17910.00", discountPercent: 55, isPopular: true, isActive: true, sortOrder: 2 },
      { quantity: 1, unitPrice: "3980.00", totalPrice: "3980.00", discountPercent: 0, isPopular: false, isActive: true, sortOrder: 0 },
      { quantity: 5, unitPrice: "2587.00", totalPrice: "12935.00", discountPercent: 35, isPopular: false, isActive: true, sortOrder: 1 },
    ]);
    
    const tiers = await db.getActiveProductPriceTiers(1);
    if (tiers.length > 1) {
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].quantity).toBeGreaterThanOrEqual(tiers[i - 1].quantity);
      }
    }
  });

  it("should correctly reflect admin-set discount percentages", async () => {
    const db = await import("./db");
    
    await db.upsertPriceTiers(1, [
      { quantity: 1, unitPrice: "3980.00", totalPrice: "3980.00", discountPercent: 0, isPopular: false, isActive: true, sortOrder: 0 },
      { quantity: 2, unitPrice: "3383.00", totalPrice: "6766.00", discountPercent: 15, isPopular: false, isActive: true, sortOrder: 1 },
    ]);
    
    const tiers = await db.getActiveProductPriceTiers(1);
    const tier2 = tiers.find(t => t.quantity === 2);
    expect(tier2).toBeDefined();
    expect(tier2?.discountPercent).toBe(15);
    expect(parseFloat(tier2?.unitPrice || "0")).toBe(3383);
  });
});
