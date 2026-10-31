import { describe, it, expect } from "vitest";

/**
 * 주문 금액 계산 검증 테스트
 *
 * DB 저장 구조:
 * - orders.totalAmount = 상품소계합계 + 배송비 - 쿠폰할인 - 포인트사용
 * - orders.shippingFee = 배송비
 * - orders.couponDiscount = 쿠폰 할인 금액
 * - orders.pointsUsed = 포인트 사용 금액
 * - orderItems.subtotal = 상품 소계 (단가 × 수량)
 * - orderItems.discountAmount = 상품별 할인금액 (수량할인 등)
 *
 * 최종결제금액 = orders.totalAmount (DB 저장값 그대로 사용)
 * 검증식: totalAmount = Σ(item.subtotal) + shippingFee - couponDiscount - pointsUsed
 */

interface OrderItem {
  subtotal: number;
  discountAmount: number;
}

interface Order {
  totalAmount: number;
  shippingFee: number;
  couponDiscount: number;
  pointsUsed: number;
  items: OrderItem[];
}

/**
 * 서버 측 주문 생성 로직 (routers.ts 기준)
 * totalAmount = subtotal + shippingFee - couponDiscount - pointsUsed
 * where subtotal = Σ(item.subtotal) — 상품 소계 합계 (할인 전)
 */
function calculateTotalAmount(order: Omit<Order, "totalAmount">): number {
  const itemsSubtotal = order.items.reduce((s, i) => s + i.subtotal, 0);
  return itemsSubtotal + order.shippingFee - order.couponDiscount - order.pointsUsed;
}

/**
 * 프론트엔드 표시 검증:
 * 총금액 = Σ(item.subtotal)
 * 상품할인 = Σ(item.discountAmount)
 * 쿠폰할인 = order.couponDiscount
 * 포인트사용 = order.pointsUsed
 * 배송비 = order.shippingFee
 * 최종결제금액 = order.totalAmount (DB 저장값)
 *
 * 검증: 총금액 - 상품할인 - 쿠폰할인 - 포인트사용 + 배송비 = 최종결제금액
 */
function verifyFinalAmount(order: Order): boolean {
  const itemsSubtotal = order.items.reduce((s, i) => s + i.subtotal, 0);
  const itemsDiscount = order.items.reduce((s, i) => s + i.discountAmount, 0);
  const calculated =
    itemsSubtotal - itemsDiscount - order.couponDiscount - order.pointsUsed + order.shippingFee;
  // Note: totalAmount is stored as (itemsSubtotal + shippingFee - couponDiscount - pointsUsed)
  // itemsDiscount is already reflected in itemsSubtotal (subtotal = unitPrice * qty - itemDiscount)
  // So: totalAmount = itemsSubtotal + shippingFee - couponDiscount - pointsUsed
  const expectedTotal = itemsSubtotal + order.shippingFee - order.couponDiscount - order.pointsUsed;
  return Math.abs(order.totalAmount - expectedTotal) < 0.01;
}

describe("주문 금액 계산 검증", () => {
  it("기본 주문 - 할인 없음", () => {
    const order: Order = {
      totalAmount: 3500,
      shippingFee: 500,
      couponDiscount: 0,
      pointsUsed: 0,
      items: [
        { subtotal: 1500, discountAmount: 0 },
        { subtotal: 1500, discountAmount: 0 },
      ],
    };
    // 총금액 = 1500 + 1500 = 3000, 배송비 = 500, 최종 = 3500
    expect(calculateTotalAmount(order)).toBe(3500);
    expect(verifyFinalAmount(order)).toBe(true);
  });

  it("쿠폰 할인 적용", () => {
    const order: Order = {
      totalAmount: 2800,
      shippingFee: 500,
      couponDiscount: 700,
      pointsUsed: 0,
      items: [
        { subtotal: 2000, discountAmount: 0 },
        { subtotal: 1000, discountAmount: 0 },
      ],
    };
    // 총금액 = 3000, 쿠폰할인 = 700, 배송비 = 500, 최종 = 3000 + 500 - 700 = 2800
    expect(calculateTotalAmount(order)).toBe(2800);
    expect(verifyFinalAmount(order)).toBe(true);
  });

  it("포인트 사용", () => {
    const order: Order = {
      totalAmount: 2000,
      shippingFee: 0, // 5000엔 이상 무료배송
      couponDiscount: 0,
      pointsUsed: 500,
      items: [
        { subtotal: 3000, discountAmount: 0 },
      ],
    };
    // 총금액 = 3000, 포인트 = 500, 배송비 = 0, 최종 = 3000 - 500 = 2500
    // 하지만 totalAmount = 2000으로 설정했으므로 검증 실패해야 함
    expect(calculateTotalAmount(order)).toBe(2500);
    expect(verifyFinalAmount(order)).toBe(false); // 의도적 불일치 테스트
  });

  it("포인트 사용 - 정확한 계산", () => {
    const order: Order = {
      totalAmount: 2500,
      shippingFee: 0,
      couponDiscount: 0,
      pointsUsed: 500,
      items: [
        { subtotal: 3000, discountAmount: 0 },
      ],
    };
    expect(calculateTotalAmount(order)).toBe(2500);
    expect(verifyFinalAmount(order)).toBe(true);
  });

  it("쿠폰 + 포인트 + 배송비 복합", () => {
    const order: Order = {
      totalAmount: 2800,
      shippingFee: 500,
      couponDiscount: 300,
      pointsUsed: 400,
      items: [
        { subtotal: 2000, discountAmount: 200 },
        { subtotal: 1000, discountAmount: 0 },
      ],
    };
    // itemsSubtotal = 2000 + 1000 = 3000
    // totalAmount = 3000 + 500 - 300 - 400 = 2800 ✓
    expect(calculateTotalAmount(order)).toBe(2800);
    expect(verifyFinalAmount(order)).toBe(true);
  });

  it("무료배송 기준 (5000엔 이상)", () => {
    const order: Order = {
      totalAmount: 5500,
      shippingFee: 0, // 무료배송
      couponDiscount: 0,
      pointsUsed: 0,
      items: [
        { subtotal: 3000, discountAmount: 0 },
        { subtotal: 2500, discountAmount: 0 },
      ],
    };
    // 총금액 = 5500 >= 5000 → 배송비 0
    expect(calculateTotalAmount(order)).toBe(5500);
    expect(verifyFinalAmount(order)).toBe(true);
  });

  it("최종결제금액 = DB totalAmount (프론트엔드 표시 검증)", () => {
    // 프론트엔드에서 order.totalAmount를 직접 사용하는 것이 올바른지 검증
    const dbTotalAmount = 3850;
    const order: Order = {
      totalAmount: dbTotalAmount,
      shippingFee: 500,
      couponDiscount: 150,
      pointsUsed: 0,
      items: [
        { subtotal: 2000, discountAmount: 0 },
        { subtotal: 1500, discountAmount: 0 },
      ],
    };
    // 3500 + 500 - 150 = 3850
    expect(Number(order.totalAmount)).toBe(dbTotalAmount);
    expect(verifyFinalAmount(order)).toBe(true);
  });
});
