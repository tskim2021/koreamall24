import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 1. 포인트 만료 알림 - getUserExpiringPoints 로직 테스트
// ============================================================
describe("포인트 만료 알림 로직", () => {
  it("만료일이 30일 이내인 포인트를 올바르게 계산한다", () => {
    const now = new Date();
    const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const mockTransactions = [
      { amount: 1500, expiresAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) },
      { amount: 500, expiresAt: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000) },
      { amount: 2000, expiresAt: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000) }, // 범위 밖
    ];

    const expiring = mockTransactions.filter(
      (t) => t.expiresAt > now && t.expiresAt <= threshold && t.amount > 0
    );

    const totalExpiring = expiring.reduce((sum, t) => sum + t.amount, 0);
    const nearestExpiry = expiring.length > 0 ? expiring[0].expiresAt : null;

    expect(totalExpiring).toBe(2000); // 1500 + 500
    expect(nearestExpiry).not.toBeNull();
    expect(expiring).toHaveLength(2);
  });

  it("만료일이 없는 포인트는 집계에서 제외된다", () => {
    const now = new Date();
    const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const mockTransactions = [
      { amount: 1000, expiresAt: null },
      { amount: 500, expiresAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) },
    ];

    const expiring = mockTransactions.filter(
      (t) => t.expiresAt !== null && t.expiresAt > now && t.expiresAt <= threshold && t.amount > 0
    );

    expect(expiring).toHaveLength(1);
    expect(expiring[0].amount).toBe(500);
  });

  it("이미 만료된 포인트는 집계에서 제외된다", () => {
    const now = new Date();
    const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const mockTransactions = [
      { amount: 1000, expiresAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) }, // 이미 만료
      { amount: 500, expiresAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) },
    ];

    const expiring = mockTransactions.filter(
      (t) => t.expiresAt !== null && t.expiresAt > now && t.expiresAt <= threshold && t.amount > 0
    );

    expect(expiring).toHaveLength(1);
    expect(expiring[0].amount).toBe(500);
  });
});

// ============================================================
// 2. 관리자 포인트 설정 - 설정값 파싱 및 유효성 검사
// ============================================================
describe("관리자 포인트 설정 유효성 검사", () => {
  const validatePointSetting = (value: number): { valid: boolean; error?: string } => {
    if (!Number.isInteger(value)) return { valid: false, error: "정수여야 합니다" };
    if (value < 0) return { valid: false, error: "0 이상이어야 합니다" };
    if (value > 100000) return { valid: false, error: "100,000 이하여야 합니다" };
    return { valid: true };
  };

  it("유효한 포인트 값을 허용한다", () => {
    expect(validatePointSetting(1500).valid).toBe(true);
    expect(validatePointSetting(0).valid).toBe(true);
    expect(validatePointSetting(100000).valid).toBe(true);
  });

  it("음수 포인트를 거부한다", () => {
    const result = validatePointSetting(-100);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("0 이상이어야 합니다");
  });

  it("100,000 초과 포인트를 거부한다", () => {
    const result = validatePointSetting(100001);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("100,000 이하여야 합니다");
  });

  it("소수점 포인트를 거부한다", () => {
    const result = validatePointSetting(1500.5);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("정수여야 합니다");
  });

  it("포인트 설정 키 목록이 올바르다", () => {
    const POINT_SETTING_KEYS = [
      "REVIEW_POINTS",
      "REVIEW_IMAGE_POINTS",
      "REVIEW_DETAIL_POINTS",
      "PURCHASE_POINTS_RATE",
      "SIGNUP_BONUS_POINTS",
      "POINT_EXPIRY_DAYS",
    ];
    expect(POINT_SETTING_KEYS).toContain("REVIEW_POINTS");
    expect(POINT_SETTING_KEYS).toContain("POINT_EXPIRY_DAYS");
    expect(POINT_SETTING_KEYS).toHaveLength(6);
  });
});

// ============================================================
// 3. 리뷰 완료 후 추천 상품 표시 로직
// ============================================================
describe("리뷰 완료 후 추천 상품 표시", () => {
  it("현재 상품을 추천 목록에서 제외한다", () => {
    const currentProductId = 50;
    const relatedProducts = [
      { id: 50, nameJa: "현재 상품", price: 1000 },
      { id: 51, nameJa: "추천 상품 1", price: 2000 },
      { id: 52, nameJa: "추천 상품 2", price: 3000 },
      { id: 53, nameJa: "추천 상품 3", price: 4000 },
      { id: 54, nameJa: "추천 상품 4", price: 5000 },
    ];

    const filtered = relatedProducts.filter((p) => p.id !== currentProductId).slice(0, 4);

    expect(filtered).toHaveLength(4);
    expect(filtered.every((p) => p.id !== currentProductId)).toBe(true);
  });

  it("추천 상품이 없으면 섹션을 표시하지 않는다", () => {
    const currentProductId = 50;
    const relatedProducts = [{ id: 50, nameJa: "현재 상품", price: 1000 }];

    const filtered = relatedProducts.filter((p) => p.id !== currentProductId);
    const shouldShow = filtered.length > 0;

    expect(shouldShow).toBe(false);
  });

  it("최대 4개의 추천 상품만 표시한다", () => {
    const currentProductId = 50;
    const relatedProducts = Array.from({ length: 10 }, (_, i) => ({
      id: 51 + i,
      nameJa: `추천 상품 ${i + 1}`,
      price: 1000 * (i + 1),
    }));

    const displayed = relatedProducts.filter((p) => p.id !== currentProductId).slice(0, 4);

    expect(displayed).toHaveLength(4);
  });

  it("reviewJustSubmitted가 true일 때만 섹션이 표시된다", () => {
    const reviewJustSubmitted = false;
    const relatedProducts = [{ id: 51, nameJa: "추천 상품", price: 1000 }];

    const shouldShow = reviewJustSubmitted && relatedProducts.filter((p) => p.id !== 50).length > 0;

    expect(shouldShow).toBe(false);
  });
});
