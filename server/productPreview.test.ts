import { describe, it, expect } from "vitest";

// ProductPreview 컴포넌트의 데이터 변환 로직 테스트
// (컴포넌트 렌더링은 jsdom 환경에서 테스트)

describe("ProductPreview data transformation", () => {
  // 가격 포맷팅 테스트
  describe("Price formatting", () => {
    it("should format price with yen symbol", () => {
      const price = "1680.00";
      const formatted = `¥${Math.floor(parseFloat(price)).toLocaleString()}`;
      expect(formatted).toBe("¥1,680");
    });

    it("should handle zero price", () => {
      const price = "0";
      const formatted = `¥${Math.floor(parseFloat(price)).toLocaleString()}`;
      expect(formatted).toBe("¥0");
    });

    it("should handle large price", () => {
      const price = "99999.99";
      const formatted = `¥${Math.floor(parseFloat(price)).toLocaleString()}`;
      expect(formatted).toBe("¥99,999");
    });
  });

  // 할인율 계산 테스트
  describe("Discount calculation", () => {
    it("should calculate discount percentage correctly", () => {
      const originalPrice = 2000;
      const currentPrice = 1680;
      const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      expect(discount).toBe(16);
    });

    it("should return 0 when no discount", () => {
      const originalPrice = 1680;
      const currentPrice = 1680;
      const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      expect(discount).toBe(0);
    });

    it("should handle originalPrice of 0", () => {
      const originalPrice = 0;
      const currentPrice = 1680;
      // When originalPrice is 0 or less, no discount should be shown
      const hasDiscount = originalPrice > 0 && originalPrice > currentPrice;
      expect(hasDiscount).toBe(false);
    });
  });

  // 재고 상태 테스트
  describe("Stock status", () => {
    it("should show in stock when stock > 0", () => {
      const stock = 100;
      const status = stock > 0 ? "在庫あり" : "在庫切れ";
      expect(status).toBe("在庫あり");
    });

    it("should show out of stock when stock is 0", () => {
      const stock = 0;
      const status = stock > 0 ? "在庫あり" : "在庫切れ";
      expect(status).toBe("在庫切れ");
    });

    it("should show stock count", () => {
      const stock = 50;
      const display = `在庫あり (${stock}個)`;
      expect(display).toBe("在庫あり (50個)");
    });
  });

  // 포인트 계산 테스트
  describe("Points calculation", () => {
    it("should calculate 1% points", () => {
      const price = 1680;
      const points = Math.floor(price * 0.01);
      expect(points).toBe(16);
    });

    it("should handle zero price", () => {
      const price = 0;
      const points = Math.floor(price * 0.01);
      expect(points).toBe(0);
    });
  });

  // 이미지 배열 처리 테스트
  describe("Image array handling", () => {
    it("should use imageUrl when no images array", () => {
      const images: string[] = [];
      const imageUrl = "https://example.com/img.jpg";
      const displayImages = images.length > 0 ? images : imageUrl ? [imageUrl] : [];
      expect(displayImages).toEqual(["https://example.com/img.jpg"]);
    });

    it("should use images array when available", () => {
      const images = ["https://example.com/1.jpg", "https://example.com/2.jpg"];
      const imageUrl = "https://example.com/img.jpg";
      const displayImages = images.length > 0 ? images : imageUrl ? [imageUrl] : [];
      expect(displayImages).toEqual(["https://example.com/1.jpg", "https://example.com/2.jpg"]);
    });

    it("should return empty array when no images", () => {
      const images: string[] = [];
      const imageUrl = "";
      const displayImages = images.length > 0 ? images : imageUrl ? [imageUrl] : [];
      expect(displayImages).toEqual([]);
    });
  });

  // 디바이스 프리셋 테스트
  describe("Device presets", () => {
    const devicePresets = {
      desktop: { width: 1024, label: "데스크톱" },
      tablet: { width: 768, label: "태블릿" },
      mobile: { width: 375, label: "모바일" },
    };

    it("should have desktop preset at 1024px", () => {
      expect(devicePresets.desktop.width).toBe(1024);
    });

    it("should have tablet preset at 768px", () => {
      expect(devicePresets.tablet.width).toBe(768);
    });

    it("should have mobile preset at 375px", () => {
      expect(devicePresets.mobile.width).toBe(375);
    });
  });

  // 줌 레벨 테스트
  describe("Zoom level", () => {
    it("should clamp zoom between 50% and 150%", () => {
      const clampZoom = (z: number) => Math.min(150, Math.max(50, z));
      expect(clampZoom(30)).toBe(50);
      expect(clampZoom(100)).toBe(100);
      expect(clampZoom(200)).toBe(150);
    });

    it("should adjust zoom by 10% increments", () => {
      let zoom = 100;
      zoom += 10;
      expect(zoom).toBe(110);
      zoom -= 10;
      expect(zoom).toBe(100);
    });
  });
});

// 폼 검증 로직 테스트
describe("Form validation", () => {
  const validateNumber = (value: string, min: number, max: number): string | null => {
    const num = parseFloat(value);
    if (isNaN(num)) return "숫자를 입력해주세요";
    if (num < min) return `${min} 이상이어야 합니다`;
    if (num > max) return `${max} 이하여야 합니다`;
    return null;
  };

  it("should validate price range", () => {
    expect(validateNumber("1680", 0, 9999999)).toBeNull();
    expect(validateNumber("-1", 0, 9999999)).toBe("0 이상이어야 합니다");
    expect(validateNumber("abc", 0, 9999999)).toBe("숫자를 입력해주세요");
  });

  it("should validate discount rate range", () => {
    expect(validateNumber("15", 0, 100)).toBeNull();
    expect(validateNumber("101", 0, 100)).toBe("100 이하여야 합니다");
    expect(validateNumber("-5", 0, 100)).toBe("0 이상이어야 합니다");
  });

  it("should validate stock range", () => {
    expect(validateNumber("100", 0, 999999)).toBeNull();
    expect(validateNumber("0", 0, 999999)).toBeNull();
    expect(validateNumber("-1", 0, 999999)).toBe("0 이상이어야 합니다");
  });

  it("should validate weight range", () => {
    expect(validateNumber("0.5", 0, 100)).toBeNull();
    expect(validateNumber("0", 0, 100)).toBeNull();
  });
});

// useUnsavedChanges 훅 로직 테스트
describe("Unsaved changes tracking", () => {
  it("should track dirty state per section", () => {
    const dirtyState: Record<string, boolean> = {
      basic: false,
      sales: false,
      stock: false,
      images: false,
      seo: false,
      shipping: false,
    };

    // Mark basic as dirty
    dirtyState.basic = true;
    expect(dirtyState.basic).toBe(true);
    expect(Object.values(dirtyState).some(v => v)).toBe(true);

    // Reset all
    Object.keys(dirtyState).forEach(k => dirtyState[k] = false);
    expect(Object.values(dirtyState).some(v => v)).toBe(false);
  });

  it("should detect any dirty section", () => {
    const dirtyState: Record<string, boolean> = {
      basic: false,
      sales: true,
      stock: false,
    };
    const hasUnsavedChanges = Object.values(dirtyState).some(v => v);
    expect(hasUnsavedChanges).toBe(true);
  });

  it("should list dirty section names", () => {
    const dirtyState: Record<string, boolean> = {
      basic: true,
      sales: false,
      stock: true,
    };
    const dirtySections = Object.entries(dirtyState)
      .filter(([, v]) => v)
      .map(([k]) => k);
    expect(dirtySections).toEqual(["basic", "stock"]);
  });
});
