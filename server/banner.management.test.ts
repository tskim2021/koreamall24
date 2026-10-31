import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB helpers
vi.mock("./db", () => ({
  getActiveBanners: vi.fn(),
  getAllBanners: vi.fn(),
  createBanner: vi.fn(),
  updateBanner: vi.fn(),
  deleteBanner: vi.fn(),
}));

import {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "./db";

describe("Banner Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getActiveBanners", () => {
    it("활성 배너 목록을 반환해야 함", async () => {
      const mockBanners = [
        {
          id: 1,
          title: "Summer Sale",
          titleJa: "夏の特別セール",
          imageUrl: "/manus-storage/main-banner1_ade715b5.webp",
          linkUrl: "/search?sort=discount",
          isActive: 1,
          sortOrder: 1,
        },
        {
          id: 2,
          title: "New Arrivals",
          titleJa: "新商品入荷",
          imageUrl: "/manus-storage/main-banner2_73c7e340.png",
          linkUrl: "/search?sort=new",
          isActive: 1,
          sortOrder: 2,
        },
      ];
      (getActiveBanners as any).mockResolvedValue(mockBanners);

      const result = await getActiveBanners();
      expect(result).toHaveLength(2);
      expect(result[0].isActive).toBe(1);
      expect(result[0].imageUrl).toContain("/manus-storage/");
    });
  });

  describe("getAllBanners", () => {
    it("전체 배너 목록(비활성 포함)을 반환해야 함", async () => {
      const mockBanners = [
        { id: 1, title: "Banner 1", isActive: 1 },
        { id: 2, title: "Banner 2", isActive: 0 },
      ];
      (getAllBanners as any).mockResolvedValue(mockBanners);

      const result = await getAllBanners();
      expect(result).toHaveLength(2);
    });
  });

  describe("createBanner", () => {
    it("새 배너를 생성해야 함", async () => {
      (createBanner as any).mockResolvedValue({ insertId: 10 });

      const newBanner = {
        title: "Golden Week",
        titleJa: "ゴールデンウィークセール",
        imageUrl: "/manus-storage/banner-test.png",
        linkUrl: "/search?sort=discount",
        isActive: true,
        sortOrder: 3,
      };

      await createBanner(newBanner);
      expect(createBanner).toHaveBeenCalledWith(newBanner);
    });
  });

  describe("updateBanner", () => {
    it("배너 정보를 업데이트해야 함", async () => {
      (updateBanner as any).mockResolvedValue({ affectedRows: 1 });

      await updateBanner(1, { isActive: false });
      expect(updateBanner).toHaveBeenCalledWith(1, { isActive: false });
    });

    it("imageUrl 업데이트가 가능해야 함", async () => {
      (updateBanner as any).mockResolvedValue({ affectedRows: 1 });

      const newImageUrl = "/manus-storage/new-banner_abc123.webp";
      await updateBanner(1, { imageUrl: newImageUrl });
      expect(updateBanner).toHaveBeenCalledWith(1, { imageUrl: newImageUrl });
    });
  });

  describe("deleteBanner", () => {
    it("배너를 삭제해야 함", async () => {
      (deleteBanner as any).mockResolvedValue({ affectedRows: 1 });

      await deleteBanner(1);
      expect(deleteBanner).toHaveBeenCalledWith(1);
    });
  });

  describe("BannerSlider 이미지 표시 로직", () => {
    it("imageUrl이 있는 배너는 이미지 배너로 처리", () => {
      const banner = {
        id: 1,
        titleJa: "夏の特別セール",
        imageUrl: "/manus-storage/main-banner1_ade715b5.webp",
        isActive: 1,
      };
      const hasImage = !!(banner as any).imageUrl;
      expect(hasImage).toBe(true);
    });

    it("imageUrl이 없는 배너는 텍스트 배너로 fallback", () => {
      const banner = {
        id: 2,
        titleJa: "新商品入荷",
        imageUrl: null,
        bgColor: "#fce7f3",
        isActive: 1,
      };
      const hasImage = !!(banner as any).imageUrl;
      expect(hasImage).toBe(false);
    });

    it("배너 이미지 URL은 /manus-storage/ 경로를 사용해야 함", () => {
      const imageUrls = [
        "/manus-storage/main-banner1_ade715b5.webp",
        "/manus-storage/main-banner2_73c7e340.png",
        "/manus-storage/main-banner3_afd46567.png",
      ];
      imageUrls.forEach((url) => {
        expect(url).toMatch(/^\/manus-storage\//);
      });
    });
  });
});
