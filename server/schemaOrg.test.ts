/**
 * Schema.org Product 구조화 데이터 (JSON-LD) 생성 로직 단위 테스트
 * ProductDetail.tsx에서 사용하는 JSON-LD 빌드 로직을 서버 측에서 검증합니다.
 */
import { describe, it, expect } from "vitest";

// ── 헬퍼: ProductDetail.tsx의 JSON-LD 빌드 로직을 순수 함수로 추출 ──────────
interface MockProduct {
  id: number;
  name: string;
  nameJa: string;
  price: number;
  originalPrice?: number;
  stock: number;
  trackInventory: boolean;
  rating: string;
  reviewCount: number;
  brandJa?: string;
  deliveryDays?: string;
  setPricing?: string;
}

function buildProductJsonLd(
  product: MockProduct,
  siteOrigin: string,
  categoryName: string | null,
  imageUrl?: string,
  description?: string
) {
  const availability =
    product.stock > 0 || !product.trackInventory
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  const canonicalUrl = `${siteOrigin}/product/${product.id}`;

  const sellerLd = {
    "@type": "Organization",
    name: "ココくすり",
    url: siteOrigin,
  };

  const deliveryDays = product.deliveryDays || "10-14";
  const deliveryMin = parseInt(deliveryDays.split("-")[0]) || 10;
  const deliveryMax = parseInt(deliveryDays.split("-")[1] || deliveryDays) || 14;

  const shippingDetailsLd = {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "JPY" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "JP" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: deliveryMin, maxValue: deliveryMax, unitCode: "DAY" },
    },
  };

  const priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // 가격 옵션 파싱 (setPricing JSON)
  let priceTiers: any[] = [];
  if (product.setPricing) {
    try { priceTiers = JSON.parse(product.setPricing); } catch { /* ignore */ }
  }
  const hasTiers = priceTiers.length > 1;
  const lowestPrice = hasTiers
    ? Math.min(...priceTiers.map((t: any) => t.pricePerUnit))
    : product.price;
  const highestPrice = hasTiers
    ? Math.max(...priceTiers.map((t: any) => t.pricePerUnit))
    : product.price;

  const offersLd = hasTiers
    ? {
        "@type": "AggregateOffer",
        priceCurrency: "JPY",
        lowPrice: String(lowestPrice),
        highPrice: String(highestPrice),
        offerCount: String(priceTiers.length),
        availability,
        url: canonicalUrl,
        seller: sellerLd,
        itemCondition: "https://schema.org/NewCondition",
        shippingDetails: shippingDetailsLd,
        priceValidUntil,
      }
    : {
        "@type": "Offer",
        priceCurrency: "JPY",
        price: String(lowestPrice),
        availability,
        url: canonicalUrl,
        seller: sellerLd,
        itemCondition: "https://schema.org/NewCondition",
        shippingDetails: shippingDetailsLd,
        priceValidUntil,
      };

  const ratingValue = parseFloat(product.rating || "0");
  const reviewCount = product.reviewCount || 0;
  const aggregateRatingLd =
    reviewCount > 0 && ratingValue > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: ratingValue.toFixed(1),
          reviewCount: String(reviewCount),
          bestRating: "5",
          worstRating: "1",
        }
      : null;

  const productLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nameJa,
    ...(product.name ? { alternateName: product.name } : {}),
    ...(imageUrl ? { image: [imageUrl] } : {}),
    ...(description ? { description } : {}),
    ...(product.brandJa ? { brand: { "@type": "Brand", name: product.brandJa } } : {}),
    sku: String(product.id),
    mpn: String(product.id),
    ...(aggregateRatingLd ? { aggregateRating: aggregateRatingLd } : {}),
    offers: offersLd,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${siteOrigin}/` },
      ...(categoryName
        ? [{ "@type": "ListItem", position: 2, name: categoryName, item: `${siteOrigin}/products?category=1` }]
        : []),
      {
        "@type": "ListItem",
        position: categoryName ? 3 : 2,
        name: product.nameJa,
        item: canonicalUrl,
      },
    ],
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ココくすり",
    url: `${siteOrigin}/`,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteOrigin}/products?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  return [productLd, websiteLd, breadcrumbLd];
}

// ── 테스트 픽스처 ─────────────────────────────────────────────────────────────
const SITE_ORIGIN = "https://cocokusuri.com";

const baseProduct: MockProduct = {
  id: 42,
  name: "Test Product",
  nameJa: "テスト商品",
  price: 2980,
  stock: 10,
  trackInventory: true,
  rating: "4.5",
  reviewCount: 23,
  brandJa: "テストブランド",
  deliveryDays: "10-14",
};

// ── Product 스키마 기본 구조 ───────────────────────────────────────────────────
describe("Product JSON-LD 기본 구조", () => {
  it("@context, @type이 올바르게 설정되어야 한다", () => {
    const [productLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    expect(productLd["@context"]).toBe("https://schema.org");
    expect(productLd["@type"]).toBe("Product");
  });

  it("name, alternateName이 올바르게 설정되어야 한다", () => {
    const [productLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    expect(productLd.name).toBe("テスト商品");
    expect(productLd.alternateName).toBe("Test Product");
  });

  it("sku, mpn이 상품 ID로 설정되어야 한다", () => {
    const [productLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    expect(productLd.sku).toBe("42");
    expect(productLd.mpn).toBe("42");
  });

  it("brand가 올바르게 설정되어야 한다", () => {
    const [productLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    expect(productLd.brand).toEqual({ "@type": "Brand", name: "テストブランド" });
  });

  it("brandJa가 없으면 brand 필드가 없어야 한다", () => {
    const p = { ...baseProduct, brandJa: undefined };
    const [productLd] = buildProductJsonLd(p, SITE_ORIGIN, null);
    expect(productLd.brand).toBeUndefined();
  });
});

// ── AggregateRating 검증 ──────────────────────────────────────────────────────
describe("AggregateRating 구조화 데이터", () => {
  it("리뷰가 있으면 aggregateRating이 포함되어야 한다", () => {
    const [productLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    expect(productLd.aggregateRating).toBeDefined();
    expect(productLd.aggregateRating["@type"]).toBe("AggregateRating");
    expect(productLd.aggregateRating.ratingValue).toBe("4.5");
    expect(productLd.aggregateRating.reviewCount).toBe("23");
    expect(productLd.aggregateRating.bestRating).toBe("5");
    expect(productLd.aggregateRating.worstRating).toBe("1");
  });

  it("리뷰가 0개이면 aggregateRating이 없어야 한다", () => {
    const p = { ...baseProduct, reviewCount: 0, rating: "0.0" };
    const [productLd] = buildProductJsonLd(p, SITE_ORIGIN, null);
    expect(productLd.aggregateRating).toBeUndefined();
  });

  it("rating이 0.0이면 aggregateRating이 없어야 한다", () => {
    const p = { ...baseProduct, rating: "0.0", reviewCount: 5 };
    const [productLd] = buildProductJsonLd(p, SITE_ORIGIN, null);
    expect(productLd.aggregateRating).toBeUndefined();
  });
});

// ── Offer 구조 검증 ───────────────────────────────────────────────────────────
describe("Offer 구조화 데이터 (단일 가격)", () => {
  it("단일 가격 상품은 Offer 타입이어야 한다", () => {
    const [productLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    expect(productLd.offers["@type"]).toBe("Offer");
  });

  it("가격, 통화, 재고 상태가 올바르게 설정되어야 한다", () => {
    const [productLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    const offer = productLd.offers;
    expect(offer.priceCurrency).toBe("JPY");
    expect(offer.price).toBe("2980");
    expect(offer.availability).toBe("https://schema.org/InStock");
  });

  it("seller가 Organization 타입으로 설정되어야 한다", () => {
    const [productLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    expect(productLd.offers.seller["@type"]).toBe("Organization");
    expect(productLd.offers.seller.name).toBe("ココくすり");
  });

  it("itemCondition이 NewCondition이어야 한다", () => {
    const [productLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    expect(productLd.offers.itemCondition).toBe("https://schema.org/NewCondition");
  });

  it("재고 없을 때 OutOfStock이어야 한다", () => {
    const p = { ...baseProduct, stock: 0, trackInventory: true };
    const [productLd] = buildProductJsonLd(p, SITE_ORIGIN, null);
    expect(productLd.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("trackInventory=false이면 항상 InStock이어야 한다", () => {
    const p = { ...baseProduct, stock: 0, trackInventory: false };
    const [productLd] = buildProductJsonLd(p, SITE_ORIGIN, null);
    expect(productLd.offers.availability).toBe("https://schema.org/InStock");
  });
});

// ── AggregateOffer 검증 (다중 가격 옵션) ─────────────────────────────────────
describe("AggregateOffer 구조화 데이터 (다중 가격 옵션)", () => {
  const multiTierProduct: MockProduct = {
    ...baseProduct,
    setPricing: JSON.stringify([
      { quantity: 1, pricePerUnit: 2980, totalPrice: 2980, discountPercent: 0 },
      { quantity: 3, pricePerUnit: 2500, totalPrice: 7500, discountPercent: 16 },
      { quantity: 6, pricePerUnit: 2200, totalPrice: 13200, discountPercent: 26 },
    ]),
  };

  it("다중 가격 옵션 상품은 AggregateOffer 타입이어야 한다", () => {
    const [productLd] = buildProductJsonLd(multiTierProduct, SITE_ORIGIN, null);
    expect(productLd.offers["@type"]).toBe("AggregateOffer");
  });

  it("lowPrice, highPrice, offerCount가 올바르게 설정되어야 한다", () => {
    const [productLd] = buildProductJsonLd(multiTierProduct, SITE_ORIGIN, null);
    const offer = productLd.offers;
    expect(offer.lowPrice).toBe("2200");
    expect(offer.highPrice).toBe("2980");
    expect(offer.offerCount).toBe("3");
  });
});

// ── 배송 정보 검증 ────────────────────────────────────────────────────────────
describe("OfferShippingDetails 구조화 데이터", () => {
  it("무료 배송으로 설정되어야 한다", () => {
    const [productLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    const shipping = productLd.offers.shippingDetails;
    expect(shipping["@type"]).toBe("OfferShippingDetails");
    expect(shipping.shippingRate.value).toBe("0");
    expect(shipping.shippingRate.currency).toBe("JPY");
  });

  it("배송 목적지가 JP이어야 한다", () => {
    const [productLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    const shipping = productLd.offers.shippingDetails;
    expect(shipping.shippingDestination.addressCountry).toBe("JP");
  });

  it("deliveryDays가 올바르게 파싱되어야 한다 (10-14)", () => {
    const [productLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    const transitTime = productLd.offers.shippingDetails.deliveryTime.transitTime;
    expect(transitTime.minValue).toBe(10);
    expect(transitTime.maxValue).toBe(14);
    expect(transitTime.unitCode).toBe("DAY");
  });

  it("deliveryDays가 없으면 기본값 10-14가 사용되어야 한다", () => {
    const p = { ...baseProduct, deliveryDays: undefined };
    const [productLd] = buildProductJsonLd(p, SITE_ORIGIN, null);
    const transitTime = productLd.offers.shippingDetails.deliveryTime.transitTime;
    expect(transitTime.minValue).toBe(10);
    expect(transitTime.maxValue).toBe(14);
  });
});

// ── BreadcrumbList 검증 ───────────────────────────────────────────────────────
describe("BreadcrumbList 구조화 데이터", () => {
  it("카테고리 없을 때 2개 항목이어야 한다", () => {
    const [, , breadcrumb] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    expect(breadcrumb.itemListElement).toHaveLength(2);
    expect(breadcrumb.itemListElement[0].name).toBe("ホーム");
    expect(breadcrumb.itemListElement[1].name).toBe("テスト商品");
  });

  it("카테고리 있을 때 3개 항목이어야 한다", () => {
    const [, , breadcrumb] = buildProductJsonLd(baseProduct, SITE_ORIGIN, "健康食品");
    expect(breadcrumb.itemListElement).toHaveLength(3);
    expect(breadcrumb.itemListElement[1].name).toBe("健康食品");
    expect(breadcrumb.itemListElement[2].position).toBe(3);
  });

  it("상품 URL이 canonical URL과 일치해야 한다", () => {
    const [, , breadcrumb] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    const lastItem = breadcrumb.itemListElement[breadcrumb.itemListElement.length - 1];
    expect(lastItem.item).toBe(`${SITE_ORIGIN}/product/42`);
  });
});

// ── WebSite 스키마 검증 ───────────────────────────────────────────────────────
describe("WebSite 구조화 데이터", () => {
  it("WebSite 타입이 포함되어야 한다", () => {
    const [, websiteLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    expect(websiteLd["@type"]).toBe("WebSite");
    expect(websiteLd.name).toBe("ココくすり");
  });

  it("SearchAction이 포함되어야 한다", () => {
    const [, websiteLd] = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    expect(websiteLd.potentialAction["@type"]).toBe("SearchAction");
    expect(websiteLd.potentialAction["query-input"]).toBe("required name=search_term_string");
  });
});

// ── JSON 직렬화 검증 ──────────────────────────────────────────────────────────
describe("JSON-LD 직렬화", () => {
  it("JSON.stringify가 오류 없이 실행되어야 한다", () => {
    const jsonLd = buildProductJsonLd(baseProduct, SITE_ORIGIN, "健康食品", "https://example.com/img.jpg", "説明文");
    expect(() => JSON.stringify(jsonLd)).not.toThrow();
  });

  it("직렬화된 JSON이 유효한 JSON이어야 한다", () => {
    const jsonLd = buildProductJsonLd(baseProduct, SITE_ORIGIN, null);
    const serialized = JSON.stringify(jsonLd);
    expect(() => JSON.parse(serialized)).not.toThrow();
  });

  it("undefined 값이 직렬화에서 제외되어야 한다", () => {
    const p = { ...baseProduct, brandJa: undefined };
    const [productLd] = buildProductJsonLd(p, SITE_ORIGIN, null);
    const serialized = JSON.stringify(productLd);
    expect(serialized).not.toContain("undefined");
  });
});
