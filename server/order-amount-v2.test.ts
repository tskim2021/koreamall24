import { describe, it, expect } from "vitest";

// 부분 취소 후 totalAmount 재계산 로직 테스트
describe("부분 취소 후 totalAmount 재계산", () => {
  it("전체 취소 시 totalAmount = 0", () => {
    const remainingItems: { subtotal: number }[] = [];
    const shippingFee = 1500;
    const couponDiscount = 500;
    const pointsUsed = 200;
    const newStatus = "cancelled";

    let newTotalAmount: number;
    if (newStatus === "cancelled") {
      newTotalAmount = 0;
    } else {
      const remainingSubtotal = remainingItems.reduce((s, i) => s + i.subtotal, 0);
      newTotalAmount = Math.max(0, remainingSubtotal + shippingFee - couponDiscount - pointsUsed);
    }

    expect(newTotalAmount).toBe(0);
  });

  it("부분 취소 시 잔여 상품 기준으로 재계산", () => {
    const remainingItems = [
      { subtotal: 3000 },
      { subtotal: 2000 },
    ];
    const shippingFee = 1500;
    const couponDiscount = 500;
    const pointsUsed = 200;
    const newStatus = "partially_cancelled";

    const remainingSubtotal = remainingItems.reduce((s, i) => s + i.subtotal, 0); // 5000
    const newTotalAmount = Math.max(0, remainingSubtotal + shippingFee - couponDiscount - pointsUsed);
    // 5000 + 1500 - 500 - 200 = 5800

    expect(newTotalAmount).toBe(5800);
  });

  it("재계산 결과가 음수가 되지 않도록 보호", () => {
    const remainingItems = [{ subtotal: 100 }];
    const shippingFee = 0;
    const couponDiscount = 1000; // 쿠폰이 잔여 상품보다 큰 경우
    const pointsUsed = 500;
    const newStatus = "partially_cancelled";

    const remainingSubtotal = remainingItems.reduce((s, i) => s + i.subtotal, 0); // 100
    const newTotalAmount = Math.max(0, remainingSubtotal + shippingFee - couponDiscount - pointsUsed);
    // 100 + 0 - 1000 - 500 = -1400 → 0

    expect(newTotalAmount).toBe(0);
  });
});

// 금액 불일치 검증 로직 테스트
describe("금액 불일치 경고 배지 로직", () => {
  it("정상 주문: 불일치 없음", () => {
    const items = [{ subtotal: 3000 }, { subtotal: 2000 }];
    const shippingFee = 1500;
    const couponDiscount = 500;
    const pointsUsed = 200;
    const dbTotalAmount = 5800; // 5000 + 1500 - 500 - 200

    const itemsSubtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const expectedTotal = itemsSubtotal + shippingFee - couponDiscount - pointsUsed;
    const hasAmountMismatch = Math.abs(expectedTotal - dbTotalAmount) > 1;

    expect(hasAmountMismatch).toBe(false);
  });

  it("비정상 주문: 불일치 감지", () => {
    const items = [{ subtotal: 3000 }, { subtotal: 2000 }];
    const shippingFee = 1500;
    const couponDiscount = 500;
    const pointsUsed = 200;
    const dbTotalAmount = 9999; // 잘못된 값

    const itemsSubtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const expectedTotal = itemsSubtotal + shippingFee - couponDiscount - pointsUsed;
    const hasAmountMismatch = Math.abs(expectedTotal - dbTotalAmount) > 1;

    expect(hasAmountMismatch).toBe(true);
  });

  it("취소 주문은 불일치 경고 표시 안 함", () => {
    const status = "cancelled";
    const dbTotalAmount = 0;
    const expectedTotal = 5800;

    // 취소 주문은 status 체크로 경고 제외
    const hasAmountMismatch =
      Math.abs(expectedTotal - dbTotalAmount) > 1 &&
      status !== "cancelled" &&
      status !== "partially_cancelled";

    expect(hasAmountMismatch).toBe(false);
  });
});

// 결제수단 배지 로직 테스트
describe("결제수단 배지 표시 로직", () => {
  it("Stripe 결제: 카드결제 배지", () => {
    const paymentMethod = "stripe";
    const label = paymentMethod === "stripe" ? "카드결제" : paymentMethod === "bank_transfer" ? "무통장" : "-";
    expect(label).toBe("카드결제");
  });

  it("무통장 미확인: ⚠️ 표시", () => {
    const paymentMethod = "bank_transfer";
    const bankTransferConfirmedAt = null;
    const label =
      paymentMethod === "bank_transfer"
        ? !bankTransferConfirmedAt
          ? "⚠️ 무통장 (미확인)"
          : "✅ 무통장 (확인완료)"
        : "-";
    expect(label).toBe("⚠️ 무통장 (미확인)");
    expect(label.includes("⚠️")).toBe(true);
  });

  it("무통장 확인완료: ✅ 표시", () => {
    const paymentMethod = "bank_transfer";
    const bankTransferConfirmedAt = new Date();
    const label =
      paymentMethod === "bank_transfer"
        ? !bankTransferConfirmedAt
          ? "⚠️ 무통장 (미확인)"
          : "✅ 무통장 (확인완료)"
        : "-";
    expect(label).toBe("✅ 무통장 (확인완료)");
    expect(label.includes("⚠️")).toBe(false);
  });
});
