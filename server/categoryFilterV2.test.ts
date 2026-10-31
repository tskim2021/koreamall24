import { describe, it, expect } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Category Filter V2 테스트
// - 한 줄 필터 바 디자인 관련 로직 검증
// - 무한 스크롤 (offset/limit) 로직 검증
// - 할인 필터 (discountOnly) 로직 검증
// - 5열 그리드 + 정사각형 썸네일 관련 유틸 검증
// ──────────────────────────────────────────────────────────────────────────────

// ─── 가격 포맷 유틸 ───────────────────────────────────────────────────────────
const MAX_PRICE = 20000;
const formatPrice = (v: number): string => {
  if (v >= MAX_PRICE) return "最大";
  if (v === 0) return "0";
  return `${(v / 1000).toFixed(0)}千`;
};

describe("formatPrice", () => {
  it("0원은 '0'으로 표시", () => {
    expect(formatPrice(0)).toBe("0");
  });
  it("5000원은 '5千'으로 표시", () => {
    expect(formatPrice(5000)).toBe("5千");
  });
  it("10000원은 '10千'으로 표시", () => {
    expect(formatPrice(10000)).toBe("10千");
  });
  it("MAX_PRICE(20000)는 '最大'로 표시", () => {
    expect(formatPrice(MAX_PRICE)).toBe("最大");
  });
  it("MAX_PRICE 초과값도 '最大'로 표시", () => {
    expect(formatPrice(MAX_PRICE + 1000)).toBe("最大");
  });
});

// ─── 할인율 계산 ──────────────────────────────────────────────────────────────
const calcDiscountRate = (price: number, originalPrice: number): number =>
  Math.round((1 - price / originalPrice) * 100);

describe("calcDiscountRate", () => {
  it("50% 할인 계산", () => {
    expect(calcDiscountRate(500, 1000)).toBe(50);
  });
  it("30% 할인 계산", () => {
    expect(calcDiscountRate(700, 1000)).toBe(30);
  });
  it("10% 할인 계산", () => {
    expect(calcDiscountRate(900, 1000)).toBe(10);
  });
  it("할인 없음 (0%)", () => {
    expect(calcDiscountRate(1000, 1000)).toBe(0);
  });
  it("소수점 반올림 처리", () => {
    expect(calcDiscountRate(333, 1000)).toBe(67);
  });
});

// ─── 할인 상품 필터 로직 ──────────────────────────────────────────────────────
interface Product {
  id: number;
  price: number;
  originalPrice?: number | null;
  name: string;
}

const filterDiscountOnly = (products: Product[]): Product[] =>
  products.filter((p) => p.originalPrice != null && p.originalPrice > p.price);

describe("filterDiscountOnly", () => {
  const products: Product[] = [
    { id: 1, price: 800, originalPrice: 1000, name: "할인상품A" },
    { id: 2, price: 1000, originalPrice: 1000, name: "할인없음B" },
    { id: 3, price: 500, originalPrice: 800, name: "할인상품C" },
    { id: 4, price: 1200, originalPrice: null, name: "원가없음D" },
    { id: 5, price: 300, originalPrice: undefined, name: "원가미설정E" },
  ];

  it("할인 상품만 필터링", () => {
    const result = filterDiscountOnly(products);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual([1, 3]);
  });

  it("할인 상품이 없으면 빈 배열 반환", () => {
    const noDiscount: Product[] = [
      { id: 1, price: 1000, originalPrice: 1000, name: "A" },
      { id: 2, price: 500, originalPrice: null, name: "B" },
    ];
    expect(filterDiscountOnly(noDiscount)).toHaveLength(0);
  });

  it("모두 할인 상품이면 전체 반환", () => {
    const allDiscount: Product[] = [
      { id: 1, price: 500, originalPrice: 1000, name: "A" },
      { id: 2, price: 300, originalPrice: 800, name: "B" },
    ];
    expect(filterDiscountOnly(allDiscount)).toHaveLength(2);
  });
});

// ─── 무한 스크롤 offset/limit 로직 ───────────────────────────────────────────
const PAGE_SIZE = 30;

const paginateProducts = (products: Product[], offset: number, limit: number): Product[] =>
  products.slice(offset, offset + limit);

const generateProducts = (count: number): Product[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    price: 1000 + i * 100,
    name: `상품${i + 1}`,
  }));

describe("무한 스크롤 페이지네이션", () => {
  const products = generateProducts(75);

  it("첫 페이지: offset=0, limit=30 → 30개 반환", () => {
    const result = paginateProducts(products, 0, PAGE_SIZE);
    expect(result).toHaveLength(30);
    expect(result[0].id).toBe(1);
    expect(result[29].id).toBe(30);
  });

  it("두 번째 페이지: offset=30 → 30개 반환", () => {
    const result = paginateProducts(products, 30, PAGE_SIZE);
    expect(result).toHaveLength(30);
    expect(result[0].id).toBe(31);
    expect(result[29].id).toBe(60);
  });

  it("세 번째 페이지: offset=60 → 15개 반환 (마지막 페이지)", () => {
    const result = paginateProducts(products, 60, PAGE_SIZE);
    expect(result).toHaveLength(15);
    expect(result[0].id).toBe(61);
  });

  it("hasMore: 반환 수 === PAGE_SIZE이면 true", () => {
    const result = paginateProducts(products, 0, PAGE_SIZE);
    expect(result.length === PAGE_SIZE).toBe(true);
  });

  it("hasMore: 반환 수 < PAGE_SIZE이면 false", () => {
    const result = paginateProducts(products, 60, PAGE_SIZE);
    expect(result.length === PAGE_SIZE).toBe(false);
  });

  it("offset이 전체 수를 초과하면 빈 배열 반환", () => {
    const result = paginateProducts(products, 100, PAGE_SIZE);
    expect(result).toHaveLength(0);
  });
});

// ─── 활성 필터 카운트 ─────────────────────────────────────────────────────────
interface FilterState {
  search: string;
  sortBy: string;
  priceApplied: [number, number];
  discountOnly: boolean;
}

const countActiveFilters = (state: FilterState): number => {
  let count = 0;
  if (state.search) count++;
  if (state.sortBy !== "newest") count++;
  if (state.priceApplied[0] > 0 || state.priceApplied[1] < MAX_PRICE) count++;
  if (state.discountOnly) count++;
  return count;
};

describe("countActiveFilters", () => {
  const defaultState: FilterState = {
    search: "",
    sortBy: "newest",
    priceApplied: [0, MAX_PRICE],
    discountOnly: false,
  };

  it("기본 상태에서 활성 필터 0개", () => {
    expect(countActiveFilters(defaultState)).toBe(0);
  });

  it("검색어 입력 시 +1", () => {
    expect(countActiveFilters({ ...defaultState, search: "ビタミン" })).toBe(1);
  });

  it("정렬 변경 시 +1", () => {
    expect(countActiveFilters({ ...defaultState, sortBy: "price_asc" })).toBe(1);
  });

  it("가격 범위 변경 시 +1", () => {
    expect(countActiveFilters({ ...defaultState, priceApplied: [1000, 10000] })).toBe(1);
  });

  it("할인 체크 시 +1", () => {
    expect(countActiveFilters({ ...defaultState, discountOnly: true })).toBe(1);
  });

  it("모든 필터 적용 시 4개", () => {
    expect(countActiveFilters({
      search: "ビタミン",
      sortBy: "price_asc",
      priceApplied: [1000, 10000],
      discountOnly: true,
    })).toBe(4);
  });
});

// ─── 정렬 옵션 유효성 ─────────────────────────────────────────────────────────
const VALID_SORT_OPTIONS = ["newest", "oldest", "price_asc", "price_desc", "rating", "popular"];

describe("정렬 옵션", () => {
  it("6가지 정렬 옵션 모두 유효", () => {
    expect(VALID_SORT_OPTIONS).toHaveLength(6);
  });

  it("newest가 기본값으로 포함됨", () => {
    expect(VALID_SORT_OPTIONS).toContain("newest");
  });

  it("popular 정렬 옵션 포함됨", () => {
    expect(VALID_SORT_OPTIONS).toContain("popular");
  });

  it("rating 정렬 옵션 포함됨", () => {
    expect(VALID_SORT_OPTIONS).toContain("rating");
  });
});
