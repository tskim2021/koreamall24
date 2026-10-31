/**
 * 배송 완료 시 포인트 자동 적립 로직 단위 테스트
 *
 * 테스트 대상: 실 결제 금액 기준 포인트 계산 로직
 * - 실 결제 금액 = totalAmount - couponDiscount - pointsUsed
 * - 적립 포인트 = Math.floor(실결제금액 * (rewardRate / 100))
 */

import { describe, it, expect } from "vitest";

// ─── 순수 계산 함수 (routers.ts 내 로직을 추출하여 테스트) ───────────────────
function calcEarnedPoints(
  totalAmount: number,
  couponDiscount: number,
  pointsUsed: number,
  rewardRate: number
): number {
  const actualPaid = Math.max(0, totalAmount - couponDiscount - pointsUsed);
  return Math.floor(actualPaid * (rewardRate / 100));
}

// ─── 테스트 스위트 ────────────────────────────────────────────────────────────
describe("배송 완료 포인트 자동 적립 계산 로직", () => {
  it("1% 적립률 - 할인 없는 10,000원 주문 → 100pt", () => {
    expect(calcEarnedPoints(10000, 0, 0, 1)).toBe(100);
  });

  it("2% 적립률 - 할인 없는 10,000원 주문 → 200pt", () => {
    expect(calcEarnedPoints(10000, 0, 0, 2)).toBe(200);
  });

  it("1% 적립률 - 쿠폰 1,000원 할인 후 9,000원 실결제 → 90pt", () => {
    expect(calcEarnedPoints(10000, 1000, 0, 1)).toBe(90);
  });

  it("1% 적립률 - 포인트 500pt 사용 후 9,500원 실결제 → 95pt", () => {
    expect(calcEarnedPoints(10000, 0, 500, 1)).toBe(95);
  });

  it("1% 적립률 - 쿠폰 1,000원 + 포인트 500pt 사용 → 85pt", () => {
    expect(calcEarnedPoints(10000, 1000, 500, 1)).toBe(85);
  });

  it("소수점 버림: 1% 적립률 - 9,999원 주문 → 99pt (소수점 버림)", () => {
    expect(calcEarnedPoints(9999, 0, 0, 1)).toBe(99);
  });

  it("0% 적립률 설정 시 포인트 0pt", () => {
    expect(calcEarnedPoints(10000, 0, 0, 0)).toBe(0);
  });

  it("할인이 주문금액보다 클 경우 실결제 0원 → 0pt", () => {
    expect(calcEarnedPoints(5000, 6000, 0, 1)).toBe(0);
  });

  it("대금액 주문: 2% 적립률 - 100,000원 주문 → 2,000pt", () => {
    expect(calcEarnedPoints(100000, 0, 0, 2)).toBe(2000);
  });

  it("복합 할인: 2% 적립률 - 50,000원 주문, 쿠폰 5,000원, 포인트 2,000pt 사용 → 860pt", () => {
    // 실결제 = 50000 - 5000 - 2000 = 43000
    // 포인트 = floor(43000 * 0.02) = 860
    expect(calcEarnedPoints(50000, 5000, 2000, 2)).toBe(860);
  });
});
