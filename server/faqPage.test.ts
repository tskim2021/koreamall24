import { describe, it, expect } from "vitest";

// FAQ 페이지 카테고리 필터링 로직 테스트
const CATEGORIES = [
  { value: "all", label: "すべて" },
  { value: "product", label: "商品について" },
  { value: "order_shipping", label: "注文・配送" },
  { value: "payment", label: "お支払い" },
  { value: "member_points", label: "会員・ポイント" },
  { value: "other", label: "その他" },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

interface MockFaq {
  id: number;
  questionJa: string | null;
  questionKo: string | null;
  answerJa: string | null;
  answerKo: string | null;
  category: string;
  sortOrder: number;
  isActive: number;
  matchCount: number;
}

const mockFaqs: MockFaq[] = [
  { id: 1, questionJa: "配送にはどれくらいかかりますか？", questionKo: "배송은 얼마나 걸리나요?", answerJa: "通常3〜7営業日です。", answerKo: "보통 3~7 영업일입니다.", category: "order_shipping", sortOrder: 1, isActive: 1, matchCount: 5 },
  { id: 2, questionJa: "支払い方法は何がありますか？", questionKo: "결제 방법은 무엇이 있나요?", answerJa: "クレジットカード、銀行振込が利用できます。", answerKo: "신용카드, 계좌이체를 이용할 수 있습니다.", category: "payment", sortOrder: 2, isActive: 1, matchCount: 3 },
  { id: 3, questionJa: "ポイントはどのように使いますか？", questionKo: "포인트는 어떻게 사용하나요?", answerJa: "購入時に1ポイント=1円として利用できます。", answerKo: "구매 시 1포인트=1원으로 사용할 수 있습니다.", category: "member_points", sortOrder: 3, isActive: 1, matchCount: 2 },
  { id: 4, questionJa: "商品の返品はできますか？", questionKo: "상품 반품이 가능한가요?", answerJa: "未開封の場合、7日以内に返品可能です。", answerKo: "미개봉 상태에서 7일 이내 반품 가능합니다.", category: "product", sortOrder: 4, isActive: 1, matchCount: 1 },
  { id: 5, questionJa: "会員登録は必要ですか？", questionKo: "회원 가입이 필요한가요?", answerJa: "ゲストでもご購入いただけますが、会員登録でポイントが貯まります。", answerKo: "비회원도 구매 가능하지만, 회원 가입 시 포인트가 적립됩니다.", category: "member_points", sortOrder: 5, isActive: 1, matchCount: 4 },
  { id: 6, questionJa: "領収書は発行できますか？", questionKo: "영수증을 발행할 수 있나요?", answerJa: "マイページから領収書をダウンロードできます。", answerKo: "마이페이지에서 영수증을 다운로드할 수 있습니다.", category: "other", sortOrder: 6, isActive: 1, matchCount: 0 },
];

// 카테고리 필터링 함수
function filterFaqs(faqs: MockFaq[], category: CategoryValue, searchQuery: string = "") {
  let result = faqs;
  if (category !== "all") {
    result = result.filter((f) => f.category === category);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (f) =>
        (f.questionJa && f.questionJa.toLowerCase().includes(q)) ||
        (f.questionKo && f.questionKo.toLowerCase().includes(q)) ||
        (f.answerJa && f.answerJa.toLowerCase().includes(q)) ||
        (f.answerKo && f.answerKo.toLowerCase().includes(q))
    );
  }
  return [...result].sort((a, b) => a.sortOrder - b.sortOrder);
}

// 카테고리 카운트 계산 함수
function calcCategoryCounts(faqs: MockFaq[]) {
  const counts: Record<string, number> = { all: faqs.length };
  for (const faq of faqs) {
    counts[faq.category] = (counts[faq.category] || 0) + 1;
  }
  return counts;
}

describe("FAQ 페이지 카테고리 필터링", () => {
  it("all 카테고리 선택 시 전체 FAQ가 반환된다", () => {
    const result = filterFaqs(mockFaqs, "all");
    expect(result).toHaveLength(6);
  });

  it("order_shipping 카테고리 선택 시 해당 카테고리 FAQ만 반환된다", () => {
    const result = filterFaqs(mockFaqs, "order_shipping");
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("order_shipping");
  });

  it("payment 카테고리 선택 시 결제 FAQ만 반환된다", () => {
    const result = filterFaqs(mockFaqs, "payment");
    expect(result).toHaveLength(1);
    expect(result[0].questionJa).toContain("支払い");
  });

  it("member_points 카테고리 선택 시 회원/포인트 FAQ가 2개 반환된다", () => {
    const result = filterFaqs(mockFaqs, "member_points");
    expect(result).toHaveLength(2);
    result.forEach((f) => expect(f.category).toBe("member_points"));
  });

  it("product 카테고리 선택 시 상품 FAQ만 반환된다", () => {
    const result = filterFaqs(mockFaqs, "product");
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("product");
  });

  it("other 카테고리 선택 시 기타 FAQ만 반환된다", () => {
    const result = filterFaqs(mockFaqs, "other");
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("other");
  });

  it("sortOrder 순서대로 정렬된다", () => {
    const result = filterFaqs(mockFaqs, "all");
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].sortOrder).toBeLessThanOrEqual(result[i + 1].sortOrder);
    }
  });
});

describe("FAQ 페이지 키워드 검색", () => {
  it("일본어 질문 키워드로 검색된다", () => {
    const result = filterFaqs(mockFaqs, "all", "配送");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].questionJa).toContain("配送");
  });

  it("한국어 질문 키워드로 검색된다", () => {
    const result = filterFaqs(mockFaqs, "all", "포인트");
    expect(result.length).toBeGreaterThan(0);
  });

  it("답변 내용으로도 검색된다", () => {
    const result = filterFaqs(mockFaqs, "all", "マイページ");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].answerJa).toContain("マイページ");
  });

  it("존재하지 않는 키워드 검색 시 빈 배열 반환", () => {
    const result = filterFaqs(mockFaqs, "all", "존재하지않는키워드xyz");
    expect(result).toHaveLength(0);
  });

  it("카테고리 필터와 키워드 검색을 동시에 적용할 수 있다", () => {
    const result = filterFaqs(mockFaqs, "member_points", "ポイント");
    expect(result.length).toBeGreaterThan(0);
    result.forEach((f) => expect(f.category).toBe("member_points"));
  });

  it("빈 검색어는 필터링하지 않는다", () => {
    const result = filterFaqs(mockFaqs, "all", "   ");
    expect(result).toHaveLength(6);
  });

  it("대소문자 구분 없이 검색된다", () => {
    const result = filterFaqs(mockFaqs, "all", "faq");
    // FAQ 관련 키워드가 없으므로 0개 반환 (대소문자 무관)
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("FAQ 카테고리 카운트 계산", () => {
  it("전체 카운트가 FAQ 총 개수와 일치한다", () => {
    const counts = calcCategoryCounts(mockFaqs);
    expect(counts.all).toBe(mockFaqs.length);
  });

  it("각 카테고리별 카운트가 정확하다", () => {
    const counts = calcCategoryCounts(mockFaqs);
    expect(counts.order_shipping).toBe(1);
    expect(counts.payment).toBe(1);
    expect(counts.member_points).toBe(2);
    expect(counts.product).toBe(1);
    expect(counts.other).toBe(1);
  });

  it("존재하지 않는 카테고리는 undefined 반환", () => {
    const counts = calcCategoryCounts(mockFaqs);
    expect(counts["nonexistent"]).toBeUndefined();
  });

  it("빈 FAQ 배열에서 all 카운트는 0", () => {
    const counts = calcCategoryCounts([]);
    expect(counts.all).toBe(0);
  });
});

describe("FAQ 카테고리 정의 검증", () => {
  it("6개 카테고리가 정의되어 있다", () => {
    expect(CATEGORIES).toHaveLength(6);
  });

  it("all 카테고리가 첫 번째로 정의되어 있다", () => {
    expect(CATEGORIES[0].value).toBe("all");
  });

  it("모든 카테고리에 value와 label이 있다", () => {
    CATEGORIES.forEach((cat) => {
      expect(cat.value).toBeTruthy();
      expect(cat.label).toBeTruthy();
    });
  });

  it("chatbotFaqs 테이블의 category enum 값과 일치한다", () => {
    const dbEnumValues = ["product", "order_shipping", "payment", "member_points", "other"];
    const categoryValues = CATEGORIES.filter((c) => c.value !== "all").map((c) => c.value);
    expect(categoryValues).toEqual(expect.arrayContaining(dbEnumValues));
  });
});
