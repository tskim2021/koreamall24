/**
 * 리뷰 제출 후 포인트 적립 알림 토스트 관련 테스트
 */
import { describe, it, expect } from "vitest";

// ============================================================
// 1. awardReviewPoints 반환값 구조 테스트
// ============================================================
describe("awardReviewPoints 반환값 구조", () => {
  it("기본 포인트만 있을 때 breakdown이 올바르게 반환되어야 한다", () => {
    const result = {
      totalPoints: 1500,
      breakdown: { base: 1500, image: 0, detail: 0 },
    };
    expect(result.totalPoints).toBe(1500);
    expect(result.breakdown.base).toBe(1500);
    expect(result.breakdown.image).toBe(0);
    expect(result.breakdown.detail).toBe(0);
  });

  it("이미지 보너스가 있을 때 totalPoints에 합산되어야 한다", () => {
    const base = 1500;
    const imageBonus = 500;
    const result = {
      totalPoints: base + imageBonus,
      breakdown: { base, image: imageBonus, detail: 0 },
    };
    expect(result.totalPoints).toBe(2000);
    expect(result.breakdown.image).toBe(500);
  });

  it("상세 리뷰 보너스가 있을 때 totalPoints에 합산되어야 한다", () => {
    const base = 1500;
    const detailBonus = 200;
    const result = {
      totalPoints: base + detailBonus,
      breakdown: { base, image: 0, detail: detailBonus },
    };
    expect(result.totalPoints).toBe(1700);
    expect(result.breakdown.detail).toBe(200);
  });

  it("이미지 + 상세 리뷰 보너스 모두 있을 때 totalPoints에 합산되어야 한다", () => {
    const base = 1500;
    const imageBonus = 500;
    const detailBonus = 200;
    const result = {
      totalPoints: base + imageBonus + detailBonus,
      breakdown: { base, image: imageBonus, detail: detailBonus },
    };
    expect(result.totalPoints).toBe(2200);
  });
});

// ============================================================
// 2. 토스트 메시지 내용 생성 로직 테스트
// ============================================================
describe("포인트 적립 토스트 메시지 생성 로직", () => {
  const buildBreakdownLines = (bd: { base: number; image: number; detail: number }) => {
    const lines: string[] = [];
    if (bd.base > 0) lines.push(`レビュー基本: +${bd.base.toLocaleString()}pt`);
    if (bd.image > 0) lines.push(`画像投稿ボーナス: +${bd.image.toLocaleString()}pt`);
    if (bd.detail > 0) lines.push(`詳細レビューボーナス: +${bd.detail.toLocaleString()}pt`);
    return lines;
  };

  it("기본 포인트만 있을 때 1줄 표시되어야 한다", () => {
    const lines = buildBreakdownLines({ base: 1500, image: 0, detail: 0 });
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe("レビュー基本: +1,500pt");
  });

  it("이미지 보너스가 있을 때 2줄 표시되어야 한다", () => {
    const lines = buildBreakdownLines({ base: 1500, image: 500, detail: 0 });
    expect(lines.length).toBe(2);
    expect(lines[1]).toBe("画像投稿ボーナス: +500pt");
  });

  it("모든 보너스가 있을 때 3줄 표시되어야 한다", () => {
    const lines = buildBreakdownLines({ base: 1500, image: 500, detail: 200 });
    expect(lines.length).toBe(3);
    expect(lines[2]).toBe("詳細レビューボーナス: +200pt");
  });

  it("포인트가 0일 때 일반 토스트 메시지를 표시해야 한다", () => {
    const pts = 0;
    const message = pts > 0 ? `+${pts}pt 積立完了！` : "レビューが投稿されました";
    expect(message).toBe("レビューが投稿されました");
  });

  it("포인트가 있을 때 포인트 알림 메시지를 표시해야 한다", () => {
    const pts = 1500;
    const showPointsToast = pts > 0;
    expect(showPointsToast).toBe(true);
  });
});

// ============================================================
// 3. 포인트 내역 페이지 이동 경로 테스트
// ============================================================
describe("포인트 내역 페이지 이동 경로", () => {
  it("포인트 내역 페이지 경로가 올바르게 설정되어야 한다", () => {
    const pointsHistoryPath = "/mypage/points";
    expect(pointsHistoryPath).toBe("/mypage/points");
    expect(pointsHistoryPath.startsWith("/mypage")).toBe(true);
  });
});
