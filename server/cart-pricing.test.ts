import { describe, it, expect } from "vitest";

interface SetPricing {
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  discountPercent: number;
  isPopular?: boolean;
}

describe("Cart Pricing Calculation", () => {
  // Mock getItemPrice function
  const getItemPrice = (product: any, quantity: number): number => {
    const basePrice = parseFloat(product.price);

    // setPricing이 있으면 해당 수량에 맞는 세트 옵션 가격 찾기
    if (product.setPricing) {
      try {
        const setPricing = JSON.parse(product.setPricing);
        const matchedSet = setPricing.find((set: any) => set.quantity === quantity);
        if (matchedSet) {
          return matchedSet.totalPrice; // 세트 옵션의 총 가격 반환
        }
      } catch {
        // JSON 파싱 실패 시 기본 가격 사용
      }
    }

    // 세트 옵션이 없거나 수량이 맞지 않으면 기본 가격 × 수량
    return basePrice * quantity;
  };

  describe("Set Option Pricing", () => {
    it("should return set option total price when quantity matches", () => {
      const setPricingData: SetPricing[] = [
        { quantity: 10, pricePerUnit: 1973, totalPrice: 19730, discountPercent: 67, isPopular: true },
        { quantity: 7, pricePerUnit: 2213, totalPrice: 15488, discountPercent: 63 },
        { quantity: 5, pricePerUnit: 2452, totalPrice: 12259, discountPercent: 59 },
      ];

      const product = {
        price: "5980",
        setPricing: JSON.stringify(setPricingData),
      };

      // 10박스 세트 선택
      const price10 = getItemPrice(product, 10);
      expect(price10).toBe(19730);

      // 7박스 세트 선택
      const price7 = getItemPrice(product, 7);
      expect(price7).toBe(15488);

      // 5박스 세트 선택
      const price5 = getItemPrice(product, 5);
      expect(price5).toBe(12259);
    });

    it("should return base price × quantity when quantity does not match any set option", () => {
      const setPricingData: SetPricing[] = [
        { quantity: 10, pricePerUnit: 1973, totalPrice: 19730, discountPercent: 67 },
        { quantity: 5, pricePerUnit: 2452, totalPrice: 12259, discountPercent: 59 },
      ];

      const product = {
        price: "5980",
        setPricing: JSON.stringify(setPricingData),
      };

      // 3개 구매 (세트 옵션 없음)
      const price3 = getItemPrice(product, 3);
      expect(price3).toBe(5980 * 3); // 17940

      // 1개 구매 (세트 옵션 없음)
      const price1 = getItemPrice(product, 1);
      expect(price1).toBe(5980);
    });

    it("should handle products without set pricing", () => {
      const product = {
        price: "5980",
        setPricing: null,
      };

      // 10개 구매
      const price10 = getItemPrice(product, 10);
      expect(price10).toBe(5980 * 10); // 59800

      // 1개 구매
      const price1 = getItemPrice(product, 1);
      expect(price1).toBe(5980);
    });

    it("should handle invalid JSON in setPricing", () => {
      const product = {
        price: "5980",
        setPricing: "invalid json",
      };

      // 10개 구매 (JSON 파싱 실패 → 기본 가격 사용)
      const price10 = getItemPrice(product, 10);
      expect(price10).toBe(5980 * 10); // 59800
    });
  });

  describe("Cart Subtotal Calculation", () => {
    it("should calculate correct subtotal with set options", () => {
      const setPricingData: SetPricing[] = [
        { quantity: 10, pricePerUnit: 1973, totalPrice: 19730, discountPercent: 67, isPopular: true },
      ];

      const product = {
        price: "5980",
        setPricing: JSON.stringify(setPricingData),
      };

      // 세트 옵션 선택 (10박스)
      const cartItems = [
        { product, cartItem: { quantity: 10 } },
        { product, cartItem: { quantity: 1 } }, // 추가로 1개 구매
      ];

      const subtotal = cartItems.reduce(
        (sum, item) => sum + getItemPrice(item.product, item.cartItem.quantity),
        0
      );

      expect(subtotal).toBe(19730 + 5980); // 25710
    });

    it("should calculate correct subtotal with multiple different set options", () => {
      const setPricingData: SetPricing[] = [
        { quantity: 10, pricePerUnit: 1973, totalPrice: 19730, discountPercent: 67, isPopular: true },
        { quantity: 5, pricePerUnit: 2452, totalPrice: 12259, discountPercent: 59 },
      ];

      const product = {
        price: "5980",
        setPricing: JSON.stringify(setPricingData),
      };

      const cartItems = [
        { product, cartItem: { quantity: 10 } },
        { product, cartItem: { quantity: 5 } },
        { product, cartItem: { quantity: 3 } }, // 세트 옵션 없음
      ];

      const subtotal = cartItems.reduce(
        (sum, item) => sum + getItemPrice(item.product, item.cartItem.quantity),
        0
      );

      expect(subtotal).toBe(19730 + 12259 + 17940); // 49929
    });
  });

  describe("Discount Calculation", () => {
    it("should show correct discount percentage for set options", () => {
      const setPricingData: SetPricing[] = [
        { quantity: 10, pricePerUnit: 1973, totalPrice: 19730, discountPercent: 67, isPopular: true },
        { quantity: 1, pricePerUnit: 5980, totalPrice: 5980, discountPercent: 0 },
      ];

      const product = {
        price: "5980",
        setPricing: JSON.stringify(setPricingData),
      };

      // 10박스 세트: 67% 할인
      const setOption10 = JSON.parse(product.setPricing)[0];
      expect(setOption10.discountPercent).toBe(67);

      // 1개: 0% 할인
      const setOption1 = JSON.parse(product.setPricing)[1];
      expect(setOption1.discountPercent).toBe(0);
    });

    it("should calculate actual savings from discount", () => {
      const basePrice = 5980;
      const setPrice = 19730;
      const setQuantity = 10;

      const regularPrice = basePrice * setQuantity; // 59800
      const savings = regularPrice - setPrice; // 40070
      const discountPercent = Math.round((savings / regularPrice) * 100); // 67%

      expect(discountPercent).toBe(67);
      expect(savings).toBe(40070);
    });
  });
});
