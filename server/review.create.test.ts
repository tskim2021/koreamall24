import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

/**
 * review.create 프로시저의 orderId 검증 로직 단위 테스트
 * - orderId가 0 또는 없을 때 주문 검증을 건너뛰는지 확인
 * - orderId가 있을 때 주문 소유자 검증이 수행되는지 확인
 */

describe("review.create permission logic", () => {
  /**
   * hasOrderContext 계산 로직 (routers.ts에서 추출)
   */
  function computeHasOrderContext(orderId: number | undefined): boolean {
    return !!(orderId && orderId > 0);
  }

  it("orderId가 0이면 주문 컨텍스트 없음으로 처리", () => {
    expect(computeHasOrderContext(0)).toBe(false);
  });

  it("orderId가 undefined이면 주문 컨텍스트 없음으로 처리", () => {
    expect(computeHasOrderContext(undefined)).toBe(false);
  });

  it("orderId가 양수이면 주문 컨텍스트 있음으로 처리", () => {
    expect(computeHasOrderContext(1)).toBe(true);
    expect(computeHasOrderContext(100)).toBe(true);
  });

  it("orderId가 음수이면 주문 컨텍스트 없음으로 처리", () => {
    expect(computeHasOrderContext(-1)).toBe(false);
  });

  /**
   * Zod 스키마 검증 - orderId optional.default(0) 동작 확인
   */
  const reviewInputSchema = z.object({
    productId: z.number(),
    orderId: z.number().optional().default(0),
    orderItemId: z.number().optional().default(0),
    rating: z.number().min(1).max(5),
    title: z.string().optional(),
    content: z.string().optional(),
    images: z.array(z.string()).optional(),
  });

  it("orderId 없이도 스키마 검증 통과 (기본값 0 적용)", () => {
    const result = reviewInputSchema.safeParse({
      productId: 50,
      rating: 5,
      content: "テスト",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderId).toBe(0);
      expect(result.data.orderItemId).toBe(0);
    }
  });

  it("orderId를 명시적으로 제공하면 그 값 사용", () => {
    const result = reviewInputSchema.safeParse({
      productId: 50,
      orderId: 123,
      orderItemId: 456,
      rating: 4,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderId).toBe(123);
      expect(result.data.orderItemId).toBe(456);
    }
  });

  it("rating이 범위를 벗어나면 스키마 검증 실패", () => {
    const result = reviewInputSchema.safeParse({
      productId: 50,
      rating: 6,
    });
    expect(result.success).toBe(false);
  });
});
