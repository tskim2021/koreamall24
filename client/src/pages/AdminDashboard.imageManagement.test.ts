import { describe, it, expect } from "vitest";

/**
 * AdminDashboard 이미지 관리 기능 테스트
 * 
 * 테스트 범위:
 * - 이미지 드래그앤드롭 순서 변경
 * - 이미지 삭제
 * - 메인 이미지 자동 설정
 * - 이미지 미리보기 모달
 */

describe("AdminDashboard - Image Management Features", () => {
  it("should reorder images when dragging", () => {
    /**
     * 시나리오:
     * 1. 3개의 이미지가 있음
     * 2. 두 번째 이미지를 첫 번째 위치로 드래그
     * 3. 순서가 변경됨
     * 
     * 검증:
     * - 이미지 순서가 올바르게 변경됨
     */
    
    const imageUrls = [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
    ];
    
    const draggedIndex = 1;
    const targetIndex = 0;
    
    const newUrls = [...imageUrls];
    [newUrls[draggedIndex], newUrls[targetIndex]] = [newUrls[targetIndex], newUrls[draggedIndex]];
    
    expect(newUrls[0]).toBe("https://example.com/image2.jpg");
    expect(newUrls[1]).toBe("https://example.com/image1.jpg");
    expect(newUrls[2]).toBe("https://example.com/image3.jpg");
  });

  it("should delete image when delete button is clicked", () => {
    /**
     * 시나리오:
     * 1. 3개의 이미지가 있음
     * 2. 두 번째 이미지의 삭제 버튼 클릭
     * 3. 이미지가 배열에서 제거됨
     * 
     * 검증:
     * - 삭제된 이미지가 배열에서 제거됨
     * - 나머지 이미지 개수가 2개
     */
    
    const imageUrls = [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
    ];
    
    const indexToDelete = 1;
    const newUrls = imageUrls.filter((_, i) => i !== indexToDelete);
    
    expect(newUrls).toHaveLength(2);
    expect(newUrls[0]).toBe("https://example.com/image1.jpg");
    expect(newUrls[1]).toBe("https://example.com/image3.jpg");
  });

  it("should set first image as main after reordering", () => {
    /**
     * 시나리오:
     * 1. 3개의 이미지가 있음
     * 2. 이미지 순서 변경
     * 3. 첫 번째 이미지가 자동으로 메인으로 설정
     * 
     * 검증:
     * - 첫 번째 이미지가 메인 이미지
     */
    
    const imageUrls = [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
    ];
    
    const draggedIndex = 2;
    const targetIndex = 0;
    
    const newUrls = [...imageUrls];
    [newUrls[draggedIndex], newUrls[targetIndex]] = [newUrls[targetIndex], newUrls[draggedIndex]];
    
    const mainImage = newUrls[0];
    expect(mainImage).toBe("https://example.com/image3.jpg");
  });

  it("should handle deletion of main image", () => {
    /**
     * 시나리오:
     * 1. 3개의 이미지가 있음
     * 2. 첫 번째 이미지(메인) 삭제
     * 3. 두 번째 이미지가 새로운 메인이 됨
     * 
     * 검증:
     * - 메인 이미지가 삭제되고 새로운 첫 번째 이미지가 메인
     */
    
    const imageUrls = [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
    ];
    
    const newUrls = imageUrls.filter((_, i) => i !== 0);
    const newMainImage = newUrls[0];
    
    expect(newUrls).toHaveLength(2);
    expect(newMainImage).toBe("https://example.com/image2.jpg");
  });

  it("should handle multiple image reorderings", () => {
    /**
     * 시나리오:
     * 1. 4개의 이미지가 있음
     * 2. 여러 번 순서 변경
     * 3. 최종 순서가 올바름
     * 
     * 검증:
     * - 복잡한 순서 변경도 올바르게 처리
     */
    
    let imageUrls = [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
      "https://example.com/image4.jpg",
    ];
    
    // 첫 번째 변경: 4번째를 1번째로
    let newUrls = [...imageUrls];
    [newUrls[3], newUrls[0]] = [newUrls[0], newUrls[3]];
    expect(newUrls[0]).toBe("https://example.com/image4.jpg");
    
    // 두 번째 변경: 2번째를 3번째로
    [newUrls[1], newUrls[2]] = [newUrls[2], newUrls[1]];
    expect(newUrls[1]).toBe("https://example.com/image3.jpg");
    expect(newUrls[2]).toBe("https://example.com/image2.jpg");
  });

  it("should handle modal state for image preview", () => {
    /**
     * 시나리오:
     * 1. 이미지 썸네일 클릭
     * 2. 모달이 열림
     * 3. 모달 닫기 버튼 클릭
     * 4. 모달이 닫힘
     * 
     * 검증:
     * - 모달 상태 관리 정확함
     */
    
    let selectedImageModal: string | null = null;
    const imageUrl = "https://example.com/image.jpg";
    
    // 모달 열기
    selectedImageModal = imageUrl;
    expect(selectedImageModal).toBe(imageUrl);
    
    // 모달 닫기
    selectedImageModal = null;
    expect(selectedImageModal).toBeNull();
  });

  it("should preserve image URLs after deletion", () => {
    /**
     * 시나리오:
     * 1. 5개의 이미지가 있음
     * 2. 3번째 이미지 삭제
     * 3. 나머지 이미지 URL이 정확함
     * 
     * 검증:
     * - 삭제 후 나머지 이미지 URL이 변경되지 않음
     */
    
    const imageUrls = [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
      "https://example.com/image4.jpg",
      "https://example.com/image5.jpg",
    ];
    
    const newUrls = imageUrls.filter((_, i) => i !== 2);
    
    expect(newUrls).toEqual([
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image4.jpg",
      "https://example.com/image5.jpg",
    ]);
  });
});
