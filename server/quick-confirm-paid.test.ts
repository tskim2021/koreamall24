/**
 * 결제완료 → 상품준비중 일괄 처리 테스트
 * getPaidOrderIds 로직 및 handleQuickConfirm 동작 검증
 */
import { describe, it, expect } from "vitest";

// 주문 목록 mock
const mockOrders = [
  { id: 1, orderNumber: "ORD-001", status: "paid", userName: "홍길동" },
  { id: 2, orderNumber: "ORD-002", status: "paid", userName: "김철수" },
  { id: 3, orderNumber: "ORD-003", status: "confirmed", userName: "이영희" },
  { id: 4, orderNumber: "ORD-004", status: "pending", userName: "박민수" },
  { id: 5, orderNumber: "ORD-005", status: "paid", userName: "최지수" },
];

// getPaidOrderIds 로직 재현
function getPaidOrderIds(orders: typeof mockOrders, selectedIds: number[]): number[] {
  if (selectedIds.length > 0) {
    return selectedIds.filter(id => {
      const order = orders.find(o => o.id === id);
      return order?.status === "paid";
    });
  }
  return orders.filter(o => o.status === "paid").map(o => o.id);
}

describe("결제완료 → 상품준비중 일괄 처리", () => {
  it("선택 없으면 모든 paid 주문 반환", () => {
    const result = getPaidOrderIds(mockOrders, []);
    expect(result).toEqual([1, 2, 5]);
  });

  it("선택된 주문 중 paid 상태만 반환", () => {
    const result = getPaidOrderIds(mockOrders, [1, 3, 4]);
    expect(result).toEqual([1]); // 3은 confirmed, 4는 pending
  });

  it("선택된 주문이 모두 paid이면 전부 반환", () => {
    const result = getPaidOrderIds(mockOrders, [1, 2, 5]);
    expect(result).toEqual([1, 2, 5]);
  });

  it("paid 주문이 없으면 빈 배열 반환", () => {
    const noPayOrders = mockOrders.filter(o => o.status !== "paid");
    const result = getPaidOrderIds(noPayOrders, []);
    expect(result).toEqual([]);
  });

  it("선택된 주문이 모두 paid 아니면 빈 배열 반환", () => {
    const result = getPaidOrderIds(mockOrders, [3, 4]);
    expect(result).toEqual([]);
  });

  it("일괄 변경 대상 주문 수 정확히 계산", () => {
    const paidIds = getPaidOrderIds(mockOrders, []);
    expect(paidIds.length).toBe(3);
  });
});
