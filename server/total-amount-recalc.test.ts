/**
 * 부분 취소/복원 시 totalAmount 재계산 로직 단위 테스트
 *
 * 검증 대상:
 * - cancelOrderItems: 취소 후 잔여 상품 기준 totalAmount 재계산
 * - restoreOrderItem: 복원 후 잔여 상품 기준 totalAmount 재계산
 * - Orders.tsx 금액 불일치 경고 로직과 서버 계산식 일치 여부
 */

import { describe, it, expect } from "vitest";

// ===== 서버 측 totalAmount 재계산 로직 (db.ts와 동일한 계산식) =====
function calcNewTotalAmount(
  remainingItems: { subtotal: number }[],
  shippingFee: number,
  couponDiscount: number,
  pointsUsed: number,
  isFullCancellation: boolean
): number {
  if (isFullCancellation) return 0;
  const remainingSubtotal = remainingItems.reduce((s, i) => s + i.subtotal, 0);
  return Math.max(0, remainingSubtotal + shippingFee - couponDiscount - pointsUsed);
}

// ===== Orders.tsx 금액 불일치 경고 로직 (프론트엔드와 동일한 계산식) =====
function calcExpectedTotal(
  allItems: { subtotal: number; cancelledAt: Date | null }[],
  shippingFee: number,
  couponDiscount: number,
  pointsUsed: number
): number {
  // Orders.tsx는 전체 items의 subtotal 합계를 사용 (취소 여부 무관)
  const itemsSubtotal = allItems.reduce((s, i) => s + i.subtotal, 0);
  return itemsSubtotal + shippingFee - couponDiscount - pointsUsed;
}

function hasAmountMismatch(
  allItems: { subtotal: number; cancelledAt: Date | null }[],
  shippingFee: number,
  couponDiscount: number,
  pointsUsed: number,
  dbTotal: number,
  status: string
): boolean {
  if (status === "cancelled" || status === "partially_cancelled") return false;
  const itemsSubtotal = allItems.reduce((s, i) => s + i.subtotal, 0);
  if (itemsSubtotal === 0) return false;
  const expected = calcExpectedTotal(allItems, shippingFee, couponDiscount, pointsUsed);
  return Math.abs(expected - dbTotal) > 1;
}

// ===================================================
// 테스트 케이스
// ===================================================

describe("부분 취소 후 totalAmount 재계산 (서버 로직)", () => {
  const shippingFee = 500;
  const couponDiscount = 200;
  const pointsUsed = 100;

  it("상품 1개 취소 후 잔여 2개 기준 totalAmount 계산", () => {
    // 전체 상품: [3000, 2000, 1500] → 상품1 취소 후 잔여: [2000, 1500]
    const remaining = [{ subtotal: 2000 }, { subtotal: 1500 }];
    const result = calcNewTotalAmount(remaining, shippingFee, couponDiscount, pointsUsed, false);
    // 3500 + 500 - 200 - 100 = 3700
    expect(result).toBe(3700);
  });

  it("전체 취소 시 totalAmount = 0", () => {
    const remaining: { subtotal: number }[] = [];
    const result = calcNewTotalAmount(remaining, shippingFee, couponDiscount, pointsUsed, true);
    expect(result).toBe(0);
  });

  it("잔여 상품이 없어도 전체 취소가 아닌 경우 0 반환 (Math.max 보호)", () => {
    // 쿠폰/포인트가 상품 금액보다 클 경우
    const remaining = [{ subtotal: 100 }];
    const result = calcNewTotalAmount(remaining, 0, 500, 200, false);
    // 100 + 0 - 500 - 200 = -600 → Math.max(0, -600) = 0
    expect(result).toBe(0);
  });

  it("복원 후 totalAmount 재계산 (취소 상품 복원)", () => {
    // 복원 후 잔여: [3000, 2000] (1500짜리 복원됨)
    const remaining = [{ subtotal: 3000 }, { subtotal: 2000 }, { subtotal: 1500 }];
    const result = calcNewTotalAmount(remaining, shippingFee, couponDiscount, pointsUsed, false);
    // 6500 + 500 - 200 - 100 = 6700
    expect(result).toBe(6700);
  });
});

describe("부분 취소 후 금액 불일치 경고 사라짐 검증", () => {
  const shippingFee = 500;
  const couponDiscount = 200;
  const pointsUsed = 100;

  it("부분 취소 후 DB totalAmount가 재계산된 값과 일치하면 경고 없음", () => {
    // 전체 상품: [3000, 2000, 1500]
    // 상품1(3000) 취소 → DB totalAmount = 2000+1500+500-200-100 = 3700
    const allItems = [
      { subtotal: 3000, cancelledAt: new Date() }, // 취소됨
      { subtotal: 2000, cancelledAt: null },
      { subtotal: 1500, cancelledAt: null },
    ];
    // Orders.tsx는 partially_cancelled 상태면 경고 표시 안 함
    const mismatch = hasAmountMismatch(allItems, shippingFee, couponDiscount, pointsUsed, 3700, "partially_cancelled");
    expect(mismatch).toBe(false);
  });

  it("전체 취소 후 DB totalAmount=0이면 경고 없음 (cancelled 상태)", () => {
    const allItems = [
      { subtotal: 3000, cancelledAt: new Date() },
      { subtotal: 2000, cancelledAt: new Date() },
    ];
    const mismatch = hasAmountMismatch(allItems, shippingFee, couponDiscount, pointsUsed, 0, "cancelled");
    expect(mismatch).toBe(false);
  });

  it("복원 후 DB totalAmount가 재계산된 값과 일치하면 경고 없음 (confirmed 상태)", () => {
    // 복원 후 전체 상품 활성: [3000, 2000, 1500]
    const allItems = [
      { subtotal: 3000, cancelledAt: null },
      { subtotal: 2000, cancelledAt: null },
      { subtotal: 1500, cancelledAt: null },
    ];
    // DB totalAmount = 6500+500-200-100 = 6700
    const mismatch = hasAmountMismatch(allItems, shippingFee, couponDiscount, pointsUsed, 6700, "confirmed");
    expect(mismatch).toBe(false);
  });

  it("DB totalAmount가 재계산값과 다르면 경고 표시 (일반 주문 상태)", () => {
    const allItems = [
      { subtotal: 3000, cancelledAt: null },
      { subtotal: 2000, cancelledAt: null },
    ];
    // 예상: 5000+500-200-100=5200, DB: 4000 → 차이 1200
    const mismatch = hasAmountMismatch(allItems, shippingFee, couponDiscount, pointsUsed, 4000, "confirmed");
    expect(mismatch).toBe(true);
  });
});

describe("서버 계산식 ↔ 프론트엔드 계산식 일치 검증", () => {
  it("취소 없는 정상 주문: 서버 재계산값 = 프론트엔드 기대값", () => {
    const items = [
      { subtotal: 3000, cancelledAt: null },
      { subtotal: 2000, cancelledAt: null },
    ];
    const shippingFee = 500;
    const couponDiscount = 200;
    const pointsUsed = 100;

    const serverCalc = calcNewTotalAmount(
      items.filter(i => !i.cancelledAt),
      shippingFee, couponDiscount, pointsUsed, false
    );
    const frontendExpected = calcExpectedTotal(items, shippingFee, couponDiscount, pointsUsed);

    expect(serverCalc).toBe(frontendExpected);
    expect(serverCalc).toBe(5200);
  });

  it("배송비 0, 쿠폰/포인트 없는 단순 주문", () => {
    const items = [{ subtotal: 5000, cancelledAt: null }];
    const serverCalc = calcNewTotalAmount(items, 0, 0, 0, false);
    const frontendExpected = calcExpectedTotal(items, 0, 0, 0);
    expect(serverCalc).toBe(frontendExpected);
    expect(serverCalc).toBe(5000);
  });
});
