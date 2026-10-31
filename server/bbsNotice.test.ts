import { describe, it, expect } from "vitest";

/**
 * 공지사항 게시판 한국형 스타일 로직 테스트
 * - 고정글 상단 정렬
 * - 번호 계산 (고정글 제외 역순)
 * - 날짜 포맷 (한국형 YYYY-MM-DD)
 * - 페이지네이션
 */

interface Notice {
  id: number;
  titleJa: string;
  isPinned: boolean;
  isActive: boolean;
  viewCount: number;
  createdAt: Date;
}

// 고정글 상단 정렬 함수
function sortNotices(notices: Notice[]): Notice[] {
  return [...notices].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

// 번호 계산 함수 (고정글 제외, 역순)
function getRowNumber(notices: Notice[], noticeId: number): number | null {
  const notice = notices.find(n => n.id === noticeId);
  if (!notice || notice.isPinned) return null;

  const nonPinned = notices.filter(n => !n.isPinned);
  const nonPinnedCount = nonPinned.length;
  const indexInNonPinned = nonPinned.findIndex(n => n.id === noticeId);
  return nonPinnedCount - indexInNonPinned;
}

// 날짜 포맷 함수
function formatDateKorean(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\. /g, "-").replace(/\.$/, "");
}

describe("공지사항 고정글 상단 정렬", () => {
  const notices: Notice[] = [
    { id: 1, titleJa: "일반 공지 1", isPinned: false, isActive: true, viewCount: 10, createdAt: new Date("2026-01-01") },
    { id: 2, titleJa: "고정 공지", isPinned: true, isActive: true, viewCount: 50, createdAt: new Date("2025-12-01") },
    { id: 3, titleJa: "일반 공지 2", isPinned: false, isActive: true, viewCount: 5, createdAt: new Date("2026-02-01") },
    { id: 4, titleJa: "고정 공지 2", isPinned: true, isActive: true, viewCount: 30, createdAt: new Date("2026-01-15") },
  ];

  it("고정글이 일반글보다 먼저 표시되어야 한다", () => {
    const sorted = sortNotices(notices);
    expect(sorted[0].isPinned).toBe(true);
    expect(sorted[1].isPinned).toBe(true);
    expect(sorted[2].isPinned).toBe(false);
    expect(sorted[3].isPinned).toBe(false);
  });

  it("고정글끼리는 최신순으로 정렬되어야 한다", () => {
    const sorted = sortNotices(notices);
    const pinnedNotices = sorted.filter(n => n.isPinned);
    expect(pinnedNotices[0].id).toBe(4); // 2026-01-15 (더 최신)
    expect(pinnedNotices[1].id).toBe(2); // 2025-12-01
  });

  it("일반글끼리는 최신순으로 정렬되어야 한다", () => {
    const sorted = sortNotices(notices);
    const normalNotices = sorted.filter(n => !n.isPinned);
    expect(normalNotices[0].id).toBe(3); // 2026-02-01 (더 최신)
    expect(normalNotices[1].id).toBe(1); // 2026-01-01
  });
});

describe("공지사항 번호 계산", () => {
  const notices: Notice[] = [
    { id: 1, titleJa: "고정 공지", isPinned: true, isActive: true, viewCount: 50, createdAt: new Date("2026-01-01") },
    { id: 2, titleJa: "일반 공지 1 (최신)", isPinned: false, isActive: true, viewCount: 10, createdAt: new Date("2026-02-01") },
    { id: 3, titleJa: "일반 공지 2", isPinned: false, isActive: true, viewCount: 5, createdAt: new Date("2026-01-15") },
    { id: 4, titleJa: "일반 공지 3 (가장 오래됨)", isPinned: false, isActive: true, viewCount: 3, createdAt: new Date("2026-01-01") },
  ];

  const sorted = sortNotices(notices);

  it("고정글은 번호가 null이어야 한다", () => {
    expect(getRowNumber(sorted, 1)).toBeNull();
  });

  it("가장 최신 일반글이 가장 높은 번호를 가져야 한다", () => {
    const num = getRowNumber(sorted, 2);
    expect(num).toBe(3); // 일반글 3개 중 첫 번째
  });

  it("가장 오래된 일반글이 번호 1이어야 한다", () => {
    const num = getRowNumber(sorted, 4);
    expect(num).toBe(1);
  });
});

describe("날짜 포맷 (한국형)", () => {
  it("YYYY-MM-DD 형식으로 포맷되어야 한다", () => {
    const date = new Date("2026-03-18");
    const formatted = formatDateKorean(date);
    // 한국형 날짜 포맷: 2026-03-18
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("월과 일이 두 자리로 표시되어야 한다", () => {
    // UTC 시간대 문제를 피하기 위해 로컬 시간으로 생성
    const date = new Date(2026, 0, 15); // 2026년 1월 15일 (로컬 시간)
    const formatted = formatDateKorean(date);
    expect(formatted).toContain("01");
    expect(formatted).toContain("15");
  });
});

describe("페이지네이션 계산", () => {
  const ITEMS_PER_PAGE = 15;
  const PAGE_GROUP_SIZE = 10;

  it("15개 이하 게시글은 1페이지만 있어야 한다", () => {
    const totalCount = 10;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    expect(totalPages).toBe(1);
  });

  it("16개 게시글은 2페이지가 있어야 한다", () => {
    const totalCount = 16;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    expect(totalPages).toBe(2);
  });

  it("페이지 그룹이 올바르게 계산되어야 한다", () => {
    const currentPage = 11;
    const currentGroup = Math.ceil(currentPage / PAGE_GROUP_SIZE);
    const groupStart = (currentGroup - 1) * PAGE_GROUP_SIZE + 1;
    const groupEnd = Math.min(groupStart + PAGE_GROUP_SIZE - 1, 20);

    expect(currentGroup).toBe(2);
    expect(groupStart).toBe(11);
    expect(groupEnd).toBe(20);
  });

  it("현재 페이지 게시글 슬라이싱이 올바르게 동작해야 한다", () => {
    const items = Array.from({ length: 20 }, (_, i) => i + 1);
    const page = 2;
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const pageItems = items.slice(startIdx, endIdx);

    expect(pageItems).toHaveLength(5);
    expect(pageItems[0]).toBe(16);
    expect(pageItems[4]).toBe(20);
  });
});
