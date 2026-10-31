import { describe, it, expect } from "vitest";

interface DiscountTier {
  minQty: number;
  maxQty: number;
  discountPercent: number;
}

/**
 * 주어진 수량에 해당하는 할인 티어를 찾는 함수
 */
function findDiscountTier(quantity: number, tiers: DiscountTier[]): DiscountTier | null {
  return tiers.find(tier => quantity >= tier.minQty && quantity <= tier.maxQty) || null;
}

/**
 * 할인 티어를 기반으로 할인된 가격을 계산하는 함수
 */
function calculateDiscountedPrice(basePrice: number, quantity: number, tiers: DiscountTier[]): number {
  const tier = findDiscountTier(quantity, tiers);
  if (!tier) {
    return basePrice * quantity;
  }
  const discountRate = 1 - (tier.discountPercent / 100);
  return Math.round(basePrice * discountRate * quantity);
}

describe("할인 티어 시스템", () => {
  describe("할인 티어 찾기", () => {
    const tiers: DiscountTier[] = [
      { minQty: 1, maxQty: 2, discountPercent: 0 },
      { minQty: 3, maxQty: 5, discountPercent: 10 },
      { minQty: 6, maxQty: 9, discountPercent: 20 },
      { minQty: 10, maxQty: 999, discountPercent: 30 },
    ];

    it("수량 1은 첫 번째 티어(0% 할인)를 찾아야 함", () => {
      const tier = findDiscountTier(1, tiers);
      expect(tier).toEqual({ minQty: 1, maxQty: 2, discountPercent: 0 });
    });

    it("수량 3은 두 번째 티어(10% 할인)를 찾아야 함", () => {
      const tier = findDiscountTier(3, tiers);
      expect(tier).toEqual({ minQty: 3, maxQty: 5, discountPercent: 10 });
    });

    it("수량 6은 세 번째 티어(20% 할인)를 찾아야 함", () => {
      const tier = findDiscountTier(6, tiers);
      expect(tier).toEqual({ minQty: 6, maxQty: 9, discountPercent: 20 });
    });

    it("수량 10은 네 번째 티어(30% 할인)를 찾아야 함", () => {
      const tier = findDiscountTier(10, tiers);
      expect(tier).toEqual({ minQty: 10, maxQty: 999, discountPercent: 30 });
    });

    it("수량 100은 네 번째 티어(30% 할인)를 찾아야 함", () => {
      const tier = findDiscountTier(100, tiers);
      expect(tier).toEqual({ minQty: 10, maxQty: 999, discountPercent: 30 });
    });

    it("범위를 벗어난 수량은 null을 반환해야 함", () => {
      const tier = findDiscountTier(0, tiers);
      expect(tier).toBeNull();
    });
  });

  describe("할인된 가격 계산", () => {
    const tiers: DiscountTier[] = [
      { minQty: 1, maxQty: 2, discountPercent: 0 },
      { minQty: 3, maxQty: 5, discountPercent: 10 },
      { minQty: 6, maxQty: 9, discountPercent: 20 },
      { minQty: 10, maxQty: 999, discountPercent: 30 },
    ];

    const basePrice = 1000;

    it("수량 1: 0% 할인 = 1000엔", () => {
      const price = calculateDiscountedPrice(basePrice, 1, tiers);
      expect(price).toBe(1000);
    });

    it("수량 2: 0% 할인 = 2000엔", () => {
      const price = calculateDiscountedPrice(basePrice, 2, tiers);
      expect(price).toBe(2000);
    });

    it("수량 3: 10% 할인 = 2700엔", () => {
      const price = calculateDiscountedPrice(basePrice, 3, tiers);
      expect(price).toBe(2700);
    });

    it("수량 5: 10% 할인 = 4500엔", () => {
      const price = calculateDiscountedPrice(basePrice, 5, tiers);
      expect(price).toBe(4500);
    });

    it("수량 6: 20% 할인 = 4800엔", () => {
      const price = calculateDiscountedPrice(basePrice, 6, tiers);
      expect(price).toBe(4800);
    });

    it("수량 9: 20% 할인 = 7200엔", () => {
      const price = calculateDiscountedPrice(basePrice, 9, tiers);
      expect(price).toBe(7200);
    });

    it("수량 10: 30% 할인 = 7000엔", () => {
      const price = calculateDiscountedPrice(basePrice, 10, tiers);
      expect(price).toBe(7000);
    });

    it("수량 100: 30% 할인 = 70000엔", () => {
      const price = calculateDiscountedPrice(basePrice, 100, tiers);
      expect(price).toBe(70000);
    });
  });

  describe("실제 약국 상품 시나리오", () => {
    const tiers: DiscountTier[] = [
      { minQty: 1, maxQty: 1, discountPercent: 0 },
      { minQty: 3, maxQty: 3, discountPercent: 5 },
      { minQty: 5, maxQty: 5, discountPercent: 15 },
      { minQty: 7, maxQty: 7, discountPercent: 20 },
      { minQty: 10, maxQty: 10, discountPercent: 33 },
    ];

    const basePrice = 980;

    it("1박스: 할인 없음 = 980엔", () => {
      const price = calculateDiscountedPrice(basePrice, 1, tiers);
      expect(price).toBe(980);
    });

    it("3박스: 5% 할인 = 2793엔", () => {
      const price = calculateDiscountedPrice(basePrice, 3, tiers);
      expect(price).toBe(2793);
    });

    it("5박스: 15% 할인 = 4165엔", () => {
      const price = calculateDiscountedPrice(basePrice, 5, tiers);
      expect(price).toBe(4165);
    });

    it("7박스: 20% 할인 = 5488엔", () => {
      const price = calculateDiscountedPrice(basePrice, 7, tiers);
      expect(price).toBe(5488);
    });

    it("10박스: 33% 할인 = 6566엔", () => {
      const price = calculateDiscountedPrice(basePrice, 10, tiers);
      expect(price).toBe(6566);
    });
  });

  describe("엣지 케이스", () => {
    const tiers: DiscountTier[] = [
      { minQty: 1, maxQty: 5, discountPercent: 10 },
      { minQty: 6, maxQty: 10, discountPercent: 20 },
    ];

    it("빈 티어 배열: 할인 없음", () => {
      const price = calculateDiscountedPrice(1000, 5, []);
      expect(price).toBe(5000);
    });

    it("0% 할인 = 정가", () => {
      const tierWithNoDiscount: DiscountTier[] = [
        { minQty: 1, maxQty: 100, discountPercent: 0 },
      ];
      const price = calculateDiscountedPrice(1000, 5, tierWithNoDiscount);
      expect(price).toBe(5000);
    });

    it("100% 할인 = 0엔", () => {
      const tierWithFullDiscount: DiscountTier[] = [
        { minQty: 1, maxQty: 100, discountPercent: 100 },
      ];
      const price = calculateDiscountedPrice(1000, 5, tierWithFullDiscount);
      expect(price).toBe(0);
    });
  });
});
