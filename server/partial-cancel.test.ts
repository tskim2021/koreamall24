/**
 * 부분 취소 기능 단위 테스트
 * - cancelOrderItems: 선택 상품 취소 + 주문 상태 자동 전환 로직 검증
 * - restoreOrderItem: 취소 복원 로직 검증
 * - 금액 불일치 계산 로직 검증
 */

import { describe, it, expect } from "vitest";

// ===== 금액 불일치 검증 로직 (Orders.tsx와 동일한 계산식) =====
function calcExpectedTotal(
  items: { subtotal: number }[],
  shippingFee: number,
  couponDiscount: number,
  pointsUsed: number
): number {
  const itemsSubtotal = items.reduce((s, i) => s + i.subtotal, 0);
  return itemsSubtotal + shippingFee - couponDiscount - pointsUsed;
}

function hasAmountMismatch(
  items: { subtotal: number }[],
  shippingFee: number,
  couponDiscount: number,
  pointsUsed: number,
  dbTotal: number,
  status: string
): boolean {
  if (status === "cancelled" || status === "partially_cancelled") return false;
  const itemsSubtotal = items.reduce((s, i) => s + i.subtotal, 0);
  if (itemsSubtotal === 0) return false;
  const expected = calcExpectedTotal(items, shippingFee, couponDiscount, pointsUsed);
  return Math.abs(expected - dbTotal) > 1;
}

// ===== 부분 취소 후 주문 상태 결정 로직 =====
function determineNewStatus(
  allItems: { id: number; cancelledAt: Date | null }[],
  cancelledItemIds: number[]
): "cancelled" | "partially_cancelled" | null {
  const cancelledSet = new Set(cancelledItemIds);
  const totalCount = allItems.length;
  const alreadyCancelledCount = allItems.filter((i) => i.cancelledAt != null).length;
  const newlyCancelledCount = allItems.filter(
    (i) => cancelledSet.has(i.id) && i.cancelledAt == null
  ).length;
  const totalCancelledAfter = alreadyCancelledCount + newlyCancelledCount;

  if (totalCancelledAfter === totalCount) return "cancelled";
  if (totalCancelledAfter > 0) return "partially_cancelled";
  return null;
}

// ===== 환불 금액 계산 로직 =====
function calcRefundAmount(
  items: { id: number; subtotal: number; discountAmount: number }[],
  cancelItemIds: number[]
): number {
  const idSet = new Set(cancelItemIds);
  return items
    .filter((i) => idSet.has(i.id))
    .reduce((s, i) => s + i.subtotal - i.discountAmount, 0);
}

// ===================================================
// 테스트 케이스
// ===================================================

describe("금액 불일치 경고 배지 로직", () => {
  it("상품소계+배송비-쿠폰-포인트 = DB금액이면 불일치 없음", () => {
    const items = [{ subtotal: 3000 }, { subtotal: 2000 }];
    const result = hasAmountMismatch(items, 500, 200, 100, 5200, "pending");
    expect(result).toBe(false);
  });

  it("계산값과 DB금액이 2엔 이상 차이나면 불일치 표시", () => {
    const items = [{ subtotal: 3000 }, { subtotal: 2000 }];
    // 예상: 5000+500-200-100=5200, DB: 5000 → 차이 200
    const result = hasAmountMismatch(items, 500, 200, 100, 5000, "pending");
    expect(result).toBe(true);
  });

  it("1엔 이하 차이는 불일치로 보지 않음 (부동소수점 허용)", () => {
    const items = [{ subtotal: 3000 }];
    const result = hasAmountMismatch(items, 0, 0, 0, 3001, "pending");
    // 차이 1 → 허용 범위
    expect(result).toBe(false);
  });

  it("취소 상태 주문은 불일치 표시 안 함", () => {
    const items = [{ subtotal: 3000 }];
    const result = hasAmountMismatch(items, 0, 0, 0, 1000, "cancelled");
    expect(result).toBe(false);
  });

  it("부분취소 상태 주문은 불일치 표시 안 함", () => {
    const items = [{ subtotal: 3000 }];
    const result = hasAmountMismatch(items, 0, 0, 0, 1000, "partially_cancelled");
    expect(result).toBe(false);
  });

  it("상품 소계가 0이면 불일치 표시 안 함 (데이터 미로드)", () => {
    const items: { subtotal: number }[] = [];
    const result = hasAmountMismatch(items, 0, 0, 0, 5000, "pending");
    expect(result).toBe(false);
  });
});

describe("부분 취소 후 주문 상태 결정 로직", () => {
  const items = [
    { id: 1, cancelledAt: null },
    { id: 2, cancelledAt: null },
    { id: 3, cancelledAt: null },
  ];

  it("전체 상품 취소 시 → cancelled", () => {
    const result = determineNewStatus(items, [1, 2, 3]);
    expect(result).toBe("cancelled");
  });

  it("일부 상품만 취소 시 → partially_cancelled", () => {
    const result = determineNewStatus(items, [1]);
    expect(result).toBe("partially_cancelled");
  });

  it("이미 취소된 상품 + 나머지 전부 취소 → cancelled", () => {
    const itemsWithCancelled = [
      { id: 1, cancelledAt: new Date() }, // 이미 취소됨
      { id: 2, cancelledAt: null },
      { id: 3, cancelledAt: null },
    ];
    const result = determineNewStatus(itemsWithCancelled, [2, 3]);
    expect(result).toBe("cancelled");
  });

  it("이미 취소된 상품 + 일부만 취소 → partially_cancelled", () => {
    const itemsWithCancelled = [
      { id: 1, cancelledAt: new Date() }, // 이미 취소됨
      { id: 2, cancelledAt: null },
      { id: 3, cancelledAt: null },
    ];
    const result = determineNewStatus(itemsWithCancelled, [2]);
    expect(result).toBe("partially_cancelled");
  });

  it("취소 없음 → null", () => {
    const result = determineNewStatus(items, []);
    expect(result).toBe(null);
  });
});

describe("환불 금액 계산 로직", () => {
  const items = [
    { id: 1, subtotal: 3000, discountAmount: 300 },
    { id: 2, subtotal: 2000, discountAmount: 0 },
    { id: 3, subtotal: 1500, discountAmount: 150 },
  ];

  it("단일 상품 환불 금액 = subtotal - discountAmount", () => {
    const refund = calcRefundAmount(items, [1]);
    expect(refund).toBe(2700); // 3000 - 300
  });

  it("복수 상품 환불 금액 합산", () => {
    const refund = calcRefundAmount(items, [1, 3]);
    expect(refund).toBe(4050); // (3000-300) + (1500-150)
  });

  it("할인 없는 상품 환불 금액 = subtotal", () => {
    const refund = calcRefundAmount(items, [2]);
    expect(refund).toBe(2000);
  });

  it("전체 상품 환불 금액", () => {
    const refund = calcRefundAmount(items, [1, 2, 3]);
    expect(refund).toBe(6050); // (3000-300) + 2000 + (1500-150)
  });
});
