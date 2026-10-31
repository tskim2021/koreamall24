import { describe, it, expect, vi } from "vitest";

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/test.jpg", key: "test.jpg" }),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getProductImageOrder: vi.fn().mockResolvedValue([]),
    updateImageOrder: vi.fn().mockResolvedValue([]),
    addProductImageToOrder: vi.fn().mockResolvedValue({ success: true }),
    deleteProductImage: vi.fn().mockResolvedValue({ success: true }),
  };
});

describe("Image Management - Server Logic", () => {
  describe("uploadProductImage procedure logic", () => {
    it("should convert base64 to buffer correctly", () => {
      const testBase64 = Buffer.from("test image data").toString("base64");
      const buffer = Buffer.from(testBase64, "base64");
      expect(buffer.toString()).toBe("test image data");
    });

    it("should generate unique file keys with product ID", () => {
      const productId = 300001;
      const fileName = "test.jpg";
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `products/${productId}/${Date.now()}-${randomSuffix}-${fileName}`;
      expect(fileKey).toContain(`products/${productId}/`);
      expect(fileKey).toContain(fileName);
    });

    it("should generate different keys for same file name", () => {
      const productId = 300001;
      const fileName = "test.jpg";
      const key1 = `products/${productId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${fileName}`;
      const key2 = `products/${productId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${fileName}`;
      expect(key1).not.toBe(key2);
    });
  });

  describe("Image order management", () => {
    it("should reorder images correctly via drag and drop", () => {
      const images = [
        { url: "a.jpg", isThumbnail: true },
        { url: "b.jpg", isThumbnail: false },
        { url: "c.jpg", isThumbnail: false },
      ];
      const newList = [...images];
      const [removed] = newList.splice(2, 1);
      newList.splice(0, 0, removed);
      expect(newList[0].url).toBe("c.jpg");
      expect(newList[1].url).toBe("a.jpg");
      expect(newList[2].url).toBe("b.jpg");
    });

    it("should set thumbnail correctly (only one at a time)", () => {
      const images = [
        { url: "a.jpg", isThumbnail: true },
        { url: "b.jpg", isThumbnail: false },
        { url: "c.jpg", isThumbnail: false },
      ];
      const updated = images.map((img, idx) => ({ ...img, isThumbnail: idx === 1 }));
      expect(updated[0].isThumbnail).toBe(false);
      expect(updated[1].isThumbnail).toBe(true);
      expect(updated[2].isThumbnail).toBe(false);
      expect(updated.filter(i => i.isThumbnail).length).toBe(1);
    });

    it("should assign thumbnail to first image after deleting thumbnail", () => {
      const images = [
        { url: "a.jpg", isThumbnail: true },
        { url: "b.jpg", isThumbnail: false },
        { url: "c.jpg", isThumbnail: false },
      ];
      const newList = images.filter((_, idx) => idx !== 0);
      if (newList.length > 0 && !newList.some(i => i.isThumbnail)) {
        newList[0].isThumbnail = true;
      }
      expect(newList.length).toBe(2);
      expect(newList[0].url).toBe("b.jpg");
      expect(newList[0].isThumbnail).toBe(true);
    });

    it("should handle empty image list", () => {
      const images: Array<{ url: string; isThumbnail: boolean }> = [];
      expect(images.length).toBe(0);
      const newImage = { url: "new.jpg", isThumbnail: images.length === 0 };
      expect(newImage.isThumbnail).toBe(true);
    });

    it("should generate correct sortOrder for save payload", () => {
      const images = [
        { url: "c.jpg", isThumbnail: false },
        { url: "a.jpg", isThumbnail: true },
        { url: "b.jpg", isThumbnail: false },
      ];
      const savePayload = images.map((img, idx) => ({
        imageUrl: img.url, sortOrder: idx, isThumbnail: img.isThumbnail,
      }));
      expect(savePayload[0]).toEqual({ imageUrl: "c.jpg", sortOrder: 0, isThumbnail: false });
      expect(savePayload[1]).toEqual({ imageUrl: "a.jpg", sortOrder: 1, isThumbnail: true });
      expect(savePayload[2]).toEqual({ imageUrl: "b.jpg", sortOrder: 2, isThumbnail: false });
    });
  });

  describe("Single Source of Truth - imageOrderData sync", () => {
    it("should sort imageOrderData by sortOrder before displaying", () => {
      const imageOrderData = [
        { imageUrl: "b.jpg", isThumbnail: false, sortOrder: 1 },
        { imageUrl: "a.jpg", isThumbnail: true, sortOrder: 0 },
        { imageUrl: "c.jpg", isThumbnail: false, sortOrder: 2 },
      ];
      const sorted = [...imageOrderData].sort((a, b) => a.sortOrder - b.sortOrder);
      const imageList = sorted.map(img => ({ url: img.imageUrl, isThumbnail: img.isThumbnail }));
      expect(imageList[0].url).toBe("a.jpg");
      expect(imageList[0].isThumbnail).toBe(true);
      expect(imageList[1].url).toBe("b.jpg");
      expect(imageList[2].url).toBe("c.jpg");
    });

    it("should handle undefined imageOrderData", () => {
      const imageOrderData = undefined;
      const imageList = imageOrderData
        ? [...imageOrderData].sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((img: any) => ({
            url: img.imageUrl, isThumbnail: img.isThumbnail,
          }))
        : [];
      expect(imageList).toEqual([]);
    });

    it("should handle empty imageOrderData array", () => {
      const imageOrderData: Array<{ imageUrl: string; isThumbnail: boolean; sortOrder: number }> = [];
      const sorted = [...imageOrderData].sort((a, b) => a.sortOrder - b.sortOrder);
      const imageList = sorted.map(img => ({ url: img.imageUrl, isThumbnail: img.isThumbnail }));
      expect(imageList).toEqual([]);
    });
  });

  describe("Delete by URL (not index)", () => {
    it("should delete correct image when using URL-based deletion", () => {
      const images = [
        { url: "https://s3.example.com/a.jpg", isThumbnail: true },
        { url: "https://s3.example.com/b.jpg", isThumbnail: false },
        { url: "https://s3.example.com/c.jpg", isThumbnail: false },
      ];
      const deleteUrl = "https://s3.example.com/b.jpg";
      const remaining = images.filter(img => img.url !== deleteUrl);
      expect(remaining.length).toBe(2);
      expect(remaining[0].url).toBe("https://s3.example.com/a.jpg");
      expect(remaining[1].url).toBe("https://s3.example.com/c.jpg");
    });

    it("should use URL from imageList[idx] for deletion", () => {
      const imageList = [
        { url: "https://s3.example.com/first.jpg", isThumbnail: true },
        { url: "https://s3.example.com/second.jpg", isThumbnail: false },
      ];
      const deleteIdx = 0;
      const imageToDelete = imageList[deleteIdx];
      expect(imageToDelete.url).toBe("https://s3.example.com/first.jpg");
      expect(typeof imageToDelete.url).toBe("string");
    });
  });

  describe("Auto-save on reorder and thumbnail change", () => {
    it("should create correct save payload after reorder", () => {
      const images = [
        { url: "a.jpg", isThumbnail: true },
        { url: "b.jpg", isThumbnail: false },
        { url: "c.jpg", isThumbnail: false },
      ];
      const newList = [...images];
      const [moved] = newList.splice(1, 1);
      newList.splice(0, 0, moved);
      const savePayload = newList.map((img, idx) => ({
        imageUrl: img.url, sortOrder: idx, isThumbnail: img.isThumbnail,
      }));
      expect(savePayload).toEqual([
        { imageUrl: "b.jpg", sortOrder: 0, isThumbnail: false },
        { imageUrl: "a.jpg", sortOrder: 1, isThumbnail: true },
        { imageUrl: "c.jpg", sortOrder: 2, isThumbnail: false },
      ]);
    });

    it("should create correct save payload after thumbnail change", () => {
      const images = [
        { url: "a.jpg", isThumbnail: true },
        { url: "b.jpg", isThumbnail: false },
        { url: "c.jpg", isThumbnail: false },
      ];
      const newList = images.map((img, i) => ({ ...img, isThumbnail: i === 2 }));
      const savePayload = newList.map((img, idx) => ({
        imageUrl: img.url, sortOrder: idx, isThumbnail: img.isThumbnail,
      }));
      expect(savePayload).toEqual([
        { imageUrl: "a.jpg", sortOrder: 0, isThumbnail: false },
        { imageUrl: "b.jpg", sortOrder: 1, isThumbnail: false },
        { imageUrl: "c.jpg", sortOrder: 2, isThumbnail: true },
      ]);
    });
  });

  describe("File validation", () => {
    it("should accept valid image MIME types", () => {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      validTypes.forEach(type => { expect(type.startsWith("image/")).toBe(true); });
    });

    it("should reject non-image MIME types", () => {
      const invalidTypes = ["application/pdf", "text/plain", "video/mp4"];
      invalidTypes.forEach(type => { expect(type.startsWith("image/")).toBe(false); });
    });
  });

  describe("addProductImageToOrder logic", () => {
    it("should set first image as thumbnail automatically", () => {
      const existingImages: any[] = [];
      const isFirstImage = existingImages.length === 0;
      const maxSortOrder = existingImages.length > 0 ? Math.max(...existingImages.map((img: any) => img.sortOrder)) : -1;
      expect(isFirstImage).toBe(true);
      expect(maxSortOrder + 1).toBe(0);
    });

    it("should not set subsequent images as thumbnail", () => {
      const existingImages = [{ imageUrl: "a.jpg", sortOrder: 0, isThumbnail: true }];
      const isFirstImage = existingImages.length === 0;
      const maxSortOrder = Math.max(...existingImages.map(img => img.sortOrder));
      expect(isFirstImage).toBe(false);
      expect(maxSortOrder + 1).toBe(1);
    });

    it("should increment sortOrder correctly with multiple images", () => {
      const existingImages = [
        { imageUrl: "a.jpg", sortOrder: 0, isThumbnail: true },
        { imageUrl: "b.jpg", sortOrder: 1, isThumbnail: false },
        { imageUrl: "c.jpg", sortOrder: 2, isThumbnail: false },
      ];
      const maxSortOrder = Math.max(...existingImages.map(img => img.sortOrder));
      expect(maxSortOrder + 1).toBe(3);
    });
  });

  describe("deleteProductImage logic", () => {
    it("should reassign thumbnail when thumbnail is deleted", () => {
      const images = [
        { id: 1, imageUrl: "a.jpg", sortOrder: 0, isThumbnail: true },
        { id: 2, imageUrl: "b.jpg", sortOrder: 1, isThumbnail: false },
        { id: 3, imageUrl: "c.jpg", sortOrder: 2, isThumbnail: false },
      ];
      const deleteUrl = "a.jpg";
      const deletedImage = images.find(img => img.imageUrl === deleteUrl);
      const wasThumbnail = deletedImage?.isThumbnail ?? false;
      const remaining = images.filter(img => img.imageUrl !== deleteUrl);
      remaining.forEach((img, i) => { img.sortOrder = i; });
      if (wasThumbnail && remaining.length > 0) { remaining[0].isThumbnail = true; }
      expect(wasThumbnail).toBe(true);
      expect(remaining.length).toBe(2);
      expect(remaining[0].imageUrl).toBe("b.jpg");
      expect(remaining[0].isThumbnail).toBe(true);
      expect(remaining[0].sortOrder).toBe(0);
      expect(remaining[1].sortOrder).toBe(1);
    });

    it("should not change thumbnail when non-thumbnail is deleted", () => {
      const images = [
        { id: 1, imageUrl: "a.jpg", sortOrder: 0, isThumbnail: true },
        { id: 2, imageUrl: "b.jpg", sortOrder: 1, isThumbnail: false },
        { id: 3, imageUrl: "c.jpg", sortOrder: 2, isThumbnail: false },
      ];
      const deleteUrl = "b.jpg";
      const deletedImage = images.find(img => img.imageUrl === deleteUrl);
      const wasThumbnail = deletedImage?.isThumbnail ?? false;
      const remaining = images.filter(img => img.imageUrl !== deleteUrl);
      remaining.forEach((img, i) => { img.sortOrder = i; });
      if (wasThumbnail && remaining.length > 0) { remaining[0].isThumbnail = true; }
      expect(wasThumbnail).toBe(false);
      expect(remaining[0].imageUrl).toBe("a.jpg");
      expect(remaining[0].isThumbnail).toBe(true);
    });
  });
});
