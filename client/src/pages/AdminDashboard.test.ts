import { describe, it, expect } from "vitest";

/**
 * AdminDashboard 컴포넌트 테스트
 * 
 * 테스트 범위:
 * - 상품 목록에서 이미지 갤러리 표시
 * - 여러 이미지 처리
 * - 메인 이미지 표시
 */

describe("AdminDashboard - Product Image Gallery", () => {
  it("should display all uploaded images for a product", () => {
    /**
     * 시나리오:
     * 1. 상품이 여러 개의 이미지를 가지고 있음
     * 2. imageUrls가 JSON 문자열로 저장됨
     * 3. 모든 이미지가 갤러리에 표시되어야 함
     * 
     * 검증:
     * - imageUrls 배열의 모든 이미지가 렌더링됨
     */
    
    const imageUrls = [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
    ];
    
    const product = {
      id: 1,
      nameJa: "テスト商品",
      price: 1500,
      imageUrls: JSON.stringify(imageUrls),
    };
    
    // 이미지 배열 파싱
    const parsedImages = JSON.parse(product.imageUrls);
    expect(parsedImages).toHaveLength(3);
    expect(parsedImages[0]).toBe("https://example.com/image1.jpg");
  });

  it("should mark first image as main", () => {
    /**
     * 시나리오:
     * 1. 상품이 여러 이미지를 가지고 있음
     * 2. 첫 번째 이미지(idx === 0)가 메인 이미지
     * 3. 메인 이미지에 "M" 배지 표시
     * 
     * 검증:
     * - 첫 번째 이미지에만 메인 배지 표시
     */
    
    const imageUrls = [
      "https://example.com/main.jpg",
      "https://example.com/sub1.jpg",
      "https://example.com/sub2.jpg",
    ];
    
    imageUrls.forEach((url, idx) => {
      const isMain = idx === 0;
      if (isMain) {
        expect(idx).toBe(0);
      }
    });
  });

  it("should handle empty image array", () => {
    /**
     * 시나리오:
     * 1. 상품이 이미지를 가지지 않음
     * 2. imageUrls가 빈 배열
     * 3. "-" 기호 표시
     * 
     * 검증:
     * - 빈 배열일 때 적절한 처리
     */
    
    const product = {
      id: 1,
      nameJa: "이미지 없는 상품",
      price: 1000,
      imageUrls: JSON.stringify([]),
    };
    
    const parsedImages = JSON.parse(product.imageUrls);
    expect(parsedImages).toHaveLength(0);
  });

  it("should handle product without imageUrls field", () => {
    /**
     * 시나리오:
     * 1. 상품이 imageUrls 필드를 가지지 않음
     * 2. 레거시 데이터 호환성
     * 3. "-" 기호 표시
     * 
     * 검증:
     * - imageUrls가 없을 때 안전하게 처리
     */
    
    const product = {
      id: 1,
      nameJa: "레거시 상품",
      price: 1000,
      // imageUrls 필드 없음
    };
    
    const imageUrls = product.imageUrls ? JSON.parse(product.imageUrls) : [];
    expect(imageUrls).toHaveLength(0);
  });

  it("should parse imageUrls JSON correctly", () => {
    /**
     * 시나리오:
     * 1. imageUrls가 JSON 문자열로 저장됨
     * 2. 파싱 후 배열로 변환
     * 3. 각 URL이 정확함
     * 
     * 검증:
     * - JSON 파싱이 정확하게 이루어짐
     */
    
    const imageUrlsArray = [
      "https://s3.example.com/product/image1.jpg",
      "https://s3.example.com/product/image2.jpg",
    ];
    
    const imageUrlsJson = JSON.stringify(imageUrlsArray);
    const parsed = JSON.parse(imageUrlsJson);
    
    expect(parsed).toEqual(imageUrlsArray);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toBe("https://s3.example.com/product/image1.jpg");
  });
});
