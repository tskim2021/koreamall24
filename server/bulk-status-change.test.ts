import { describe, it, expect, vi } from "vitest";

// ── 일괄 상태 변경 기능 단위 테스트 ─────────────────────────────────────────

describe("일괄 주문 상태 변경 (bulkUpdateStatus)", () => {
  // 선택된 행 키에서 고유 주문 ID 추출 로직 테스트
  describe("getSelectedOrderIds", () => {
    const getSelectedOrderIds = (selectedRows: Set<string>): number[] => {
      const ids = new Set<number>();
      Array.from(selectedRows).forEach(key => {
        const orderId = parseInt(key.split("-")[0], 10);
        if (!isNaN(orderId)) ids.add(orderId);
      });
      return Array.from(ids);
    };

    it("단일 주문 단일 상품 선택 시 주문 ID 1개 반환", () => {
      const selected = new Set(["101-0"]);
      expect(getSelectedOrderIds(selected)).toEqual([101]);
    });

    it("단일 주문 여러 상품 선택 시 주문 ID 중복 제거", () => {
      const selected = new Set(["101-0", "101-1", "101-2"]);
      const ids = getSelectedOrderIds(selected);
      expect(ids).toHaveLength(1);
      expect(ids).toContain(101);
    });

    it("여러 주문 선택 시 각 주문 ID 반환", () => {
      const selected = new Set(["101-0", "102-0", "103-1"]);
      const ids = getSelectedOrderIds(selected);
      expect(ids).toHaveLength(3);
      expect(ids).toContain(101);
      expect(ids).toContain(102);
      expect(ids).toContain(103);
    });

    it("빈 선택 시 빈 배열 반환", () => {
      const selected = new Set<string>();
      expect(getSelectedOrderIds(selected)).toEqual([]);
    });

    it("잘못된 키 형식은 무시", () => {
      const selected = new Set(["abc-0", "101-0"]);
      const ids = getSelectedOrderIds(selected);
      // "abc" → NaN → 무시됨
      expect(ids).toContain(101);
      expect(ids.some(id => isNaN(id))).toBe(false);
    });
  });

  // 상태 유효성 검증
  describe("상태 값 유효성", () => {
    const VALID_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

    it("모든 유효 상태가 포함되어 있어야 함", () => {
      expect(VALID_STATUSES).toContain("pending");
      expect(VALID_STATUSES).toContain("confirmed");
      expect(VALID_STATUSES).toContain("processing");
      expect(VALID_STATUSES).toContain("shipped");
      expect(VALID_STATUSES).toContain("delivered");
      expect(VALID_STATUSES).toContain("cancelled");
    });

    it("유효하지 않은 상태는 목록에 없어야 함", () => {
      expect(VALID_STATUSES).not.toContain("unknown");
      expect(VALID_STATUSES).not.toContain("refunded");
    });
  });

  // 일괄 처리 결과 메시지 생성
  describe("성공 메시지 생성", () => {
    const STATUS_MAP: Record<string, { label: string }> = {
      pending:    { label: "입금전" },
      confirmed:  { label: "상품 준비중" },
      processing: { label: "배송준비중" },
      shipped:    { label: "배송중" },
      delivered:  { label: "배송완료" },
      cancelled:  { label: "취소" },
    };

    const buildSuccessMessage = (count: number, status: string) =>
      `${count}개 주문 상태가 ${STATUS_MAP[status]?.label || status}(으)로 변경되었습니다.`;

    it("3개 주문 배송중 변경 메시지", () => {
      expect(buildSuccessMessage(3, "shipped")).toBe("3개 주문 상태가 배송중(으)로 변경되었습니다.");
    });

    it("1개 주문 취소 변경 메시지", () => {
      expect(buildSuccessMessage(1, "cancelled")).toBe("1개 주문 상태가 취소(으)로 변경되었습니다.");
    });

    it("알 수 없는 상태는 원본 값 사용", () => {
      expect(buildSuccessMessage(2, "unknown_status")).toBe("2개 주문 상태가 unknown_status(으)로 변경되었습니다.");
    });
  });
});
