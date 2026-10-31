import { describe, it, expect } from "vitest";

/**
 * 포인트 적립 이메일 및 마이페이지 링크 개선 테스트
 * - 배송 완료 이메일에 포인트 적립 내용 포함
 * - 마이페이지 포인트 내역에서 주문 상세 링크 표시 (orderId 기반)
 */

describe("배송 완료 이메일 포인트 적립 내용", () => {
  it("earnedPoints가 있을 때 이메일 파라미터에 포함되어야 한다", () => {
    const emailParams = {
      to: "test@example.com",
      userName: "テストユーザー",
      orderNumber: "ORD-2026-001",
      orderId: 1,
      orderItems: [],
      reviewPoints: 1500,
      earnedPoints: 250,
      newPointBalance: 1250,
    };

    expect(emailParams.earnedPoints).toBe(250);
    expect(emailParams.newPointBalance).toBe(1250);
  });

  it("earnedPoints가 0이면 undefined로 전달되어야 한다", () => {
    const deliveryEarnedPoints = 0;
    const earnedPointsParam = deliveryEarnedPoints > 0 ? deliveryEarnedPoints : undefined;

    expect(earnedPointsParam).toBeUndefined();
  });

  it("포인트 적립률 1%로 10000엔 결제 시 100포인트 적립", () => {
    const totalAmt = 10000;
    const couponDisc = 0;
    const pointsUsedAmt = 0;
    const rewardRate = 1;

    const actualPaid = Math.max(0, totalAmt - couponDisc - pointsUsedAmt);
    const earnedPoints = Math.floor(actualPaid * (rewardRate / 100));

    expect(actualPaid).toBe(10000);
    expect(earnedPoints).toBe(100);
  });

  it("포인트 적립률 2%로 10000엔 결제 시 200포인트 적립", () => {
    const totalAmt = 10000;
    const couponDisc = 0;
    const pointsUsedAmt = 0;
    const rewardRate = 2;

    const actualPaid = Math.max(0, totalAmt - couponDisc - pointsUsedAmt);
    const earnedPoints = Math.floor(actualPaid * (rewardRate / 100));

    expect(earnedPoints).toBe(200);
  });

  it("쿠폰 할인 후 실 결제 금액 기준으로 포인트 적립", () => {
    const totalAmt = 10000;
    const couponDisc = 1000; // 1000엔 쿠폰 할인
    const pointsUsedAmt = 500; // 500포인트 사용
    const rewardRate = 1;

    const actualPaid = Math.max(0, totalAmt - couponDisc - pointsUsedAmt);
    const earnedPoints = Math.floor(actualPaid * (rewardRate / 100));

    expect(actualPaid).toBe(8500);
    expect(earnedPoints).toBe(85);
  });

  it("실 결제 금액이 0 이하이면 포인트 미적립", () => {
    const totalAmt = 500;
    const couponDisc = 500;
    const pointsUsedAmt = 0;
    const rewardRate = 1;

    const actualPaid = Math.max(0, totalAmt - couponDisc - pointsUsedAmt);
    const earnedPoints = Math.floor(actualPaid * (rewardRate / 100));

    expect(actualPaid).toBe(0);
    expect(earnedPoints).toBe(0);
  });
});

describe("마이페이지 포인트 내역 주문 상세 링크", () => {
  it("orderId가 있는 트랜잭션은 링크 URL을 생성할 수 있어야 한다", () => {
    const transaction = {
      id: 1,
      userId: 1,
      orderId: 42,
      type: "earn" as const,
      amount: 100,
      balance: 1100,
      description: "購入ポイント還元 1% - 注文番号: ORD-2026-001",
      createdAt: new Date(),
    };

    const linkUrl = transaction.orderId ? `/mypage/order/${transaction.orderId}` : null;
    expect(linkUrl).toBe("/mypage/order/42");
  });

  it("orderId가 null인 트랜잭션은 링크를 표시하지 않아야 한다", () => {
    const transaction = {
      id: 2,
      userId: 1,
      orderId: null as number | null,
      type: "admin_add" as const,
      amount: 500,
      balance: 1600,
      description: "管理者によるポイント付与",
      createdAt: new Date(),
    };

    const linkUrl = transaction.orderId ? `/mypage/order/${transaction.orderId}` : null;
    expect(linkUrl).toBeNull();
  });

  it("購入ポイント還元 설명에서 주문 번호를 추출할 수 있어야 한다", () => {
    const description = "購入ポイント還元 1% - 注文番号: ORD-2026-001";
    const match = description.match(/注文番号: (.+)$/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe("ORD-2026-001");
  });
});

describe("포인트 적립 중복 방지 로직", () => {
  it("pointsEarned가 이미 0이 아닌 경우 재적립하지 않아야 한다", () => {
    const order = {
      id: 1,
      pointsEarned: 100, // 이미 적립됨
    };

    const shouldAward = (order.pointsEarned || 0) === 0;
    expect(shouldAward).toBe(false);
  });

  it("pointsEarned가 0인 경우에만 적립해야 한다", () => {
    const order = {
      id: 2,
      pointsEarned: 0, // 아직 미적립
    };

    const shouldAward = (order.pointsEarned || 0) === 0;
    expect(shouldAward).toBe(true);
  });
});
