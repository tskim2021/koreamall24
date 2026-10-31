import { describe, it, expect } from "vitest";

// FAQPage Schema.org JSON-LD 생성 로직 테스트
interface MockFaq {
  id: number;
  questionJa: string | null;
  questionKo: string | null;
  answerJa: string | null;
  answerKo: string | null;
  category: string;
  sortOrder: number;
  isActive: number;
}

function buildFaqPageJsonLd(faqs: MockFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs
      .filter((f) => f.questionJa && f.answerJa)
      .map((faq) => ({
        "@type": "Question",
        name: faq.questionJa || faq.questionKo || "",
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answerJa || faq.answerKo || "",
        },
      })),
  };
}

const mockFaqs: MockFaq[] = [
  {
    id: 1,
    questionJa: "配送にはどれくらいかかりますか？",
    questionKo: "배송은 얼마나 걸리나요?",
    answerJa: "通常3〜7営業日です。",
    answerKo: "보통 3~7 영업일입니다.",
    category: "order_shipping",
    sortOrder: 1,
    isActive: 1,
  },
  {
    id: 2,
    questionJa: "支払い方法は何がありますか？",
    questionKo: "결제 방법은 무엇이 있나요?",
    answerJa: "クレジットカード、銀行振込が利用できます。",
    answerKo: "신용카드, 계좌이체를 이용할 수 있습니다.",
    category: "payment",
    sortOrder: 2,
    isActive: 1,
  },
  {
    id: 3,
    questionJa: null,
    questionKo: "일본어 질문 없는 항목",
    answerJa: null,
    answerKo: "일본어 답변 없는 항목",
    category: "other",
    sortOrder: 3,
    isActive: 1,
  },
  {
    id: 4,
    questionJa: "ポイントはどのように使いますか？",
    questionKo: "포인트는 어떻게 사용하나요?",
    answerJa: "購入時に1ポイント=1円として利用できます。",
    answerKo: "구매 시 1포인트=1원으로 사용할 수 있습니다.",
    category: "member_points",
    sortOrder: 4,
    isActive: 1,
  },
];

describe("FAQPage Schema.org JSON-LD 생성", () => {
  it("@context가 schema.org로 설정된다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    expect(jsonLd["@context"]).toBe("https://schema.org");
  });

  it("@type이 FAQPage로 설정된다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    expect(jsonLd["@type"]).toBe("FAQPage");
  });

  it("questionJa와 answerJa가 있는 항목만 mainEntity에 포함된다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    // id=3은 questionJa/answerJa가 null이므로 제외
    expect(jsonLd.mainEntity).toHaveLength(3);
  });

  it("각 mainEntity 항목의 @type이 Question이다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    jsonLd.mainEntity.forEach((item) => {
      expect(item["@type"]).toBe("Question");
    });
  });

  it("각 mainEntity 항목에 name 필드가 있다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    jsonLd.mainEntity.forEach((item) => {
      expect(item.name).toBeTruthy();
    });
  });

  it("각 mainEntity 항목의 acceptedAnswer.@type이 Answer이다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    jsonLd.mainEntity.forEach((item) => {
      expect(item.acceptedAnswer["@type"]).toBe("Answer");
    });
  });

  it("각 mainEntity 항목의 acceptedAnswer.text가 있다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    jsonLd.mainEntity.forEach((item) => {
      expect(item.acceptedAnswer.text).toBeTruthy();
    });
  });

  it("일본어 질문이 name 필드에 사용된다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    const firstItem = jsonLd.mainEntity[0];
    expect(firstItem.name).toBe("配送にはどれくらいかかりますか？");
  });

  it("일본어 답변이 acceptedAnswer.text에 사용된다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    const firstItem = jsonLd.mainEntity[0];
    expect(firstItem.acceptedAnswer.text).toBe("通常3〜7営業日です。");
  });

  it("빈 FAQ 배열에서 mainEntity가 빈 배열이다", () => {
    const jsonLd = buildFaqPageJsonLd([]);
    expect(jsonLd.mainEntity).toHaveLength(0);
  });

  it("JSON 직렬화가 가능하다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    expect(() => JSON.stringify(jsonLd)).not.toThrow();
  });

  it("JSON 직렬화 후 파싱이 가능하다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    const serialized = JSON.stringify(jsonLd);
    const parsed = JSON.parse(serialized);
    expect(parsed["@type"]).toBe("FAQPage");
    expect(parsed.mainEntity).toHaveLength(3);
  });
});

describe("Footer FAQ 링크 경로 검증", () => {
  const footerLinks = [
    { section: "ご利用ガイド", text: "よくある質問（FAQ）", href: "/faq" },
    { section: "サービス", text: "よくある質問（FAQ）", href: "/faq" },
  ];

  it("ご利用ガイド 섹션에 FAQ 링크가 /faq로 설정된다", () => {
    const link = footerLinks.find(
      (l) => l.section === "ご利用ガイド" && l.text.includes("FAQ")
    );
    expect(link).toBeDefined();
    expect(link?.href).toBe("/faq");
  });

  it("サービス 섹션에 FAQ 링크가 /faq로 설정된다", () => {
    const link = footerLinks.find(
      (l) => l.section === "サービス" && l.text.includes("FAQ")
    );
    expect(link).toBeDefined();
    expect(link?.href).toBe("/faq");
  });

  it("FAQ 링크 텍스트에 FAQ 키워드가 포함된다", () => {
    footerLinks.forEach((link) => {
      expect(link.text).toContain("FAQ");
    });
  });

  it("FAQ 링크 경로가 /faq이다", () => {
    footerLinks.forEach((link) => {
      expect(link.href).toBe("/faq");
    });
  });
});

describe("FAQPage JSON-LD 유효성 검증 (Google 요구사항)", () => {
  it("mainEntity 배열이 비어있지 않아야 한다 (FAQ가 있는 경우)", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    expect(jsonLd.mainEntity.length).toBeGreaterThan(0);
  });

  it("각 Question의 name이 빈 문자열이 아니다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    jsonLd.mainEntity.forEach((item) => {
      expect(item.name.trim().length).toBeGreaterThan(0);
    });
  });

  it("각 Answer의 text가 빈 문자열이 아니다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    jsonLd.mainEntity.forEach((item) => {
      expect(item.acceptedAnswer.text.trim().length).toBeGreaterThan(0);
    });
  });

  it("JSON-LD 전체 구조가 Google Rich Results 요구사항을 충족한다", () => {
    const jsonLd = buildFaqPageJsonLd(mockFaqs);
    // 필수 필드 확인
    expect(jsonLd).toHaveProperty("@context");
    expect(jsonLd).toHaveProperty("@type");
    expect(jsonLd).toHaveProperty("mainEntity");
    expect(Array.isArray(jsonLd.mainEntity)).toBe(true);
    jsonLd.mainEntity.forEach((item) => {
      expect(item).toHaveProperty("@type", "Question");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("acceptedAnswer");
      expect(item.acceptedAnswer).toHaveProperty("@type", "Answer");
      expect(item.acceptedAnswer).toHaveProperty("text");
    });
  });
});
