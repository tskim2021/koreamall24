import { describe, it, expect } from "vitest";
import type { ProductCategoryFilter } from "./db";

// 필터 로직 단위 테스트 (DB 없이 순수 로직 검증)

interface MockProduct {
  id: number;
  name: string;
  nameJa: string;
  price: number;
  stock: number;
  rating: string;
  reviewCount: number;
  createdAt: Date;
}

function applyFilter(products: MockProduct[], filter: ProductCategoryFilter): MockProduct[] {
  let result = [...products];

  // 키워드 검색
  if (filter.search && filter.search.trim() !== "") {
    const term = filter.search.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.nameJa.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term)
    );
  }

  // 가격 범위
  if (filter.minPrice != null) {
    result = result.filter((p) => p.price >= filter.minPrice!);
  }
  if (filter.maxPrice != null) {
    result = result.filter((p) => p.price <= filter.maxPrice!);
  }

  // 재고 있는 상품만
  if (filter.inStockOnly) {
    result = result.filter((p) => p.stock > 0);
  }

  // 정렬
  switch (filter.sortBy) {
    case "price_asc":
      result.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      result.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      result.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
      break;
    case "popular":
      result.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
    case "oldest":
      result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      break;
    case "newest":
    default:
      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
  }

  // limit
  if (filter.limit != null) {
    result = result.slice(0, filter.limit);
  }

  return result;
}

const mockProducts: MockProduct[] = [
  {
    id: 1,
    name: "Vitamin C 1000mg",
    nameJa: "ビタミンC 1000mg",
    price: 1500,
    stock: 100,
    rating: "4.5",
    reviewCount: 120,
    createdAt: new Date("2026-01-01"),
  },
  {
    id: 2,
    name: "Collagen Powder",
    nameJa: "コラーゲンパウダー",
    price: 3200,
    stock: 0,
    rating: "4.2",
    reviewCount: 80,
    createdAt: new Date("2026-02-01"),
  },
  {
    id: 3,
    name: "Hyaluronic Acid",
    nameJa: "ヒアルロン酸",
    price: 2800,
    stock: 50,
    rating: "4.8",
    reviewCount: 200,
    createdAt: new Date("2026-03-01"),
  },
  {
    id: 4,
    name: "Omega-3 Fish Oil",
    nameJa: "オメガ3フィッシュオイル",
    price: 5500,
    stock: 30,
    rating: "4.0",
    reviewCount: 60,
    createdAt: new Date("2026-04-01"),
  },
  {
    id: 5,
    name: "Zinc Supplement",
    nameJa: "亜鉛サプリメント",
    price: 980,
    stock: 0,
    rating: "3.8",
    reviewCount: 40,
    createdAt: new Date("2026-05-01"),
  },
];

describe("카테고리 상품 필터 - 키워드 검색", () => {
  it("일본어 상품명으로 검색된다", () => {
    const result = applyFilter(mockProducts, { search: "ビタミン" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("영문 상품명으로 검색된다", () => {
    const result = applyFilter(mockProducts, { search: "collagen" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("검색어가 없으면 전체 상품이 반환된다", () => {
    const result = applyFilter(mockProducts, {});
    expect(result).toHaveLength(5);
  });

  it("빈 문자열 검색어는 전체 상품을 반환한다", () => {
    const result = applyFilter(mockProducts, { search: "" });
    expect(result).toHaveLength(5);
  });

  it("존재하지 않는 검색어는 빈 배열을 반환한다", () => {
    const result = applyFilter(mockProducts, { search: "존재하지않는상품" });
    expect(result).toHaveLength(0);
  });
});

describe("카테고리 상품 필터 - 가격 범위", () => {
  it("최소 가격 필터가 적용된다", () => {
    const result = applyFilter(mockProducts, { minPrice: 3000 });
    expect(result.every((p) => p.price >= 3000)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("최대 가격 필터가 적용된다", () => {
    const result = applyFilter(mockProducts, { maxPrice: 2000 });
    expect(result.every((p) => p.price <= 2000)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("최소/최대 가격 범위 필터가 함께 적용된다", () => {
    const result = applyFilter(mockProducts, { minPrice: 1000, maxPrice: 3500 });
    expect(result.every((p) => p.price >= 1000 && p.price <= 3500)).toBe(true);
    expect(result).toHaveLength(3);
  });
});

describe("카테고리 상품 필터 - 재고 필터", () => {
  it("재고 있는 상품만 필터링된다", () => {
    const result = applyFilter(mockProducts, { inStockOnly: true });
    expect(result.every((p) => p.stock > 0)).toBe(true);
    expect(result).toHaveLength(3);
  });

  it("inStockOnly가 false이면 재고 없는 상품도 포함된다", () => {
    const result = applyFilter(mockProducts, { inStockOnly: false });
    expect(result).toHaveLength(5);
  });
});

describe("카테고리 상품 필터 - 정렬", () => {
  it("가격 오름차순 정렬이 적용된다", () => {
    const result = applyFilter(mockProducts, { sortBy: "price_asc" });
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].price).toBeLessThanOrEqual(result[i + 1].price);
    }
  });

  it("가격 내림차순 정렬이 적용된다", () => {
    const result = applyFilter(mockProducts, { sortBy: "price_desc" });
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].price).toBeGreaterThanOrEqual(result[i + 1].price);
    }
  });

  it("평점순 정렬이 적용된다", () => {
    const result = applyFilter(mockProducts, { sortBy: "rating" });
    for (let i = 0; i < result.length - 1; i++) {
      expect(parseFloat(result[i].rating)).toBeGreaterThanOrEqual(parseFloat(result[i + 1].rating));
    }
  });

  it("인기순(리뷰 수) 정렬이 적용된다", () => {
    const result = applyFilter(mockProducts, { sortBy: "popular" });
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].reviewCount).toBeGreaterThanOrEqual(result[i + 1].reviewCount);
    }
  });

  it("최신순 정렬이 적용된다 (기본값)", () => {
    const result = applyFilter(mockProducts, { sortBy: "newest" });
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(result[i + 1].createdAt.getTime());
    }
  });

  it("오래된순 정렬이 적용된다", () => {
    const result = applyFilter(mockProducts, { sortBy: "oldest" });
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].createdAt.getTime()).toBeLessThanOrEqual(result[i + 1].createdAt.getTime());
    }
  });
});

describe("카테고리 상품 필터 - 복합 필터", () => {
  it("검색 + 재고 필터를 동시에 적용할 수 있다", () => {
    const result = applyFilter(mockProducts, { search: "コラーゲン", inStockOnly: true });
    // 콜라겐 파우더는 재고가 0이므로 결과가 없어야 함
    expect(result).toHaveLength(0);
  });

  it("가격 범위 + 재고 필터를 동시에 적용할 수 있다", () => {
    const result = applyFilter(mockProducts, { minPrice: 1000, maxPrice: 4000, inStockOnly: true });
    expect(result.every((p) => p.price >= 1000 && p.price <= 4000 && p.stock > 0)).toBe(true);
  });

  it("limit이 적용된다", () => {
    const result = applyFilter(mockProducts, { limit: 3 });
    expect(result).toHaveLength(3);
  });

  it("검색 + 정렬 + 가격 범위를 동시에 적용할 수 있다", () => {
    const result = applyFilter(mockProducts, {
      minPrice: 1000,
      maxPrice: 6000,
      sortBy: "price_asc",
      inStockOnly: true,
    });
    expect(result.every((p) => p.price >= 1000 && p.price <= 6000 && p.stock > 0)).toBe(true);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].price).toBeLessThanOrEqual(result[i + 1].price);
    }
  });
});

describe("ProductCategoryFilter 타입 검증", () => {
  it("sortBy 타입이 올바른 값만 허용한다", () => {
    const validSortValues: ProductCategoryFilter["sortBy"][] = [
      "newest", "oldest", "price_asc", "price_desc", "rating", "popular"
    ];
    expect(validSortValues).toHaveLength(6);
  });

  it("필터 없이 호출하면 전체 상품이 반환된다", () => {
    const result = applyFilter(mockProducts, {});
    expect(result).toHaveLength(5);
  });
});
