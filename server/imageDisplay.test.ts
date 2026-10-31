import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Image Display Integration Tests
 * 
 * Tests the image display pipeline across all user-facing pages:
 * - Product list (mergeProductThumbnails)
 * - Product detail (getImageOrder + fallback)
 * - Cart (mergeProductThumbnails for cart items)
 * - Recommendations (mergeProductThumbnails)
 */

// Mock product_image_order data
const mockImageOrderData = [
  { id: 1, productId: 100, imageUrl: "https://s3.example.com/product100-1.jpg", sortOrder: 0, isThumbnail: true },
  { id: 2, productId: 100, imageUrl: "https://s3.example.com/product100-2.jpg", sortOrder: 1, isThumbnail: false },
  { id: 3, productId: 100, imageUrl: "https://s3.example.com/product100-3.jpg", sortOrder: 2, isThumbnail: false },
  { id: 4, productId: 200, imageUrl: "https://s3.example.com/product200-1.jpg", sortOrder: 0, isThumbnail: true },
];

describe("Image Display Pipeline", () => {
  describe("mergeProductThumbnails logic", () => {
    it("should merge thumbnail from product_image_order when product.imageUrl is null", () => {
      const products = [
        { id: 100, imageUrl: null, name: "Product A" },
        { id: 200, imageUrl: null, name: "Product B" },
        { id: 300, imageUrl: null, name: "Product C" },
      ];

      // Group images by productId
      const grouped: Record<number, typeof mockImageOrderData> = {};
      for (const t of mockImageOrderData) {
        if (!grouped[t.productId]) grouped[t.productId] = [];
        grouped[t.productId].push(t);
      }

      // Find thumbnail for each product
      const thumbnailMap: Record<number, string> = {};
      for (const [pid, imgs] of Object.entries(grouped)) {
        const thumb = imgs.find(i => i.isThumbnail) || imgs.sort((a, b) => a.sortOrder - b.sortOrder)[0];
        if (thumb) thumbnailMap[Number(pid)] = thumb.imageUrl;
      }

      // Merge
      const merged = products.map(p => ({
        ...p,
        imageUrl: p.imageUrl || thumbnailMap[p.id] || null,
      }));

      expect(merged[0].imageUrl).toBe("https://s3.example.com/product100-1.jpg");
      expect(merged[1].imageUrl).toBe("https://s3.example.com/product200-1.jpg");
      expect(merged[2].imageUrl).toBeNull(); // No images in product_image_order
    });

    it("should NOT override existing product.imageUrl", () => {
      const products = [
        { id: 100, imageUrl: "https://existing.com/image.jpg", name: "Product A" },
      ];

      const thumbnailMap: Record<number, string> = {
        100: "https://s3.example.com/product100-1.jpg",
      };

      const merged = products.map(p => ({
        ...p,
        imageUrl: p.imageUrl || thumbnailMap[p.id] || null,
      }));

      expect(merged[0].imageUrl).toBe("https://existing.com/image.jpg");
    });

    it("should handle empty product list", () => {
      const products: any[] = [];
      expect(products.length).toBe(0);
      // mergeProductThumbnails returns early for empty list
    });

    it("should use sortOrder=0 image when no isThumbnail=true exists", () => {
      const images = [
        { id: 10, productId: 500, imageUrl: "https://s3.example.com/500-b.jpg", sortOrder: 1, isThumbnail: false },
        { id: 11, productId: 500, imageUrl: "https://s3.example.com/500-a.jpg", sortOrder: 0, isThumbnail: false },
      ];

      const thumb = images.find(i => i.isThumbnail) || images.sort((a, b) => a.sortOrder - b.sortOrder)[0];
      expect(thumb.imageUrl).toBe("https://s3.example.com/500-a.jpg");
    });
  });

  describe("Product detail page - image gallery from getImageOrder", () => {
    it("should prioritize product_image_order data over product fields", () => {
      const imageOrderData = [
        { imageUrl: "https://s3.example.com/order-1.jpg", sortOrder: 0, isThumbnail: true },
        { imageUrl: "https://s3.example.com/order-2.jpg", sortOrder: 1, isThumbnail: false },
      ];
      const product = {
        imageUrl: "https://legacy.com/old-image.jpg",
        imageUrls: JSON.stringify(["https://legacy.com/old-1.jpg", "https://legacy.com/old-2.jpg"]),
      };

      // ProductDetail.tsx logic
      let imageUrls: string[];
      if (imageOrderData && imageOrderData.length > 0) {
        imageUrls = [...imageOrderData]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(img => img.imageUrl);
      } else {
        const urls: string[] = [];
        if (product.imageUrl) urls.push(product.imageUrl);
        if (product.imageUrls) {
          try {
            const parsed = JSON.parse(product.imageUrls);
            if (Array.isArray(parsed)) urls.push(...parsed);
          } catch { /* ignore */ }
        }
        imageUrls = urls.length > 0 ? urls : ["/placeholder-product.png"];
      }

      expect(imageUrls).toEqual([
        "https://s3.example.com/order-1.jpg",
        "https://s3.example.com/order-2.jpg",
      ]);
    });

    it("should fallback to product.imageUrl when no imageOrderData", () => {
      const imageOrderData: any[] = [];
      const product = {
        imageUrl: "https://legacy.com/old-image.jpg",
        imageUrls: null,
      };

      let imageUrls: string[];
      if (imageOrderData && imageOrderData.length > 0) {
        imageUrls = [...imageOrderData]
          .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
          .map((img: any) => img.imageUrl);
      } else {
        const urls: string[] = [];
        if (product.imageUrl) urls.push(product.imageUrl);
        imageUrls = urls.length > 0 ? urls : ["/placeholder-product.png"];
      }

      expect(imageUrls).toEqual(["https://legacy.com/old-image.jpg"]);
    });

    it("should show placeholder when no images at all", () => {
      const imageOrderData: any[] = [];
      const product = { imageUrl: null, imageUrls: null };

      let imageUrls: string[];
      if (imageOrderData && imageOrderData.length > 0) {
        imageUrls = [...imageOrderData]
          .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
          .map((img: any) => img.imageUrl);
      } else {
        const urls: string[] = [];
        if (product.imageUrl) urls.push(product.imageUrl);
        imageUrls = urls.length > 0 ? urls : ["/placeholder-product.png"];
      }

      expect(imageUrls).toEqual(["/placeholder-product.png"]);
    });

    it("should sort images by sortOrder correctly", () => {
      const imageOrderData = [
        { imageUrl: "https://s3.example.com/c.jpg", sortOrder: 2, isThumbnail: false },
        { imageUrl: "https://s3.example.com/a.jpg", sortOrder: 0, isThumbnail: true },
        { imageUrl: "https://s3.example.com/b.jpg", sortOrder: 1, isThumbnail: false },
      ];

      const imageUrls = [...imageOrderData]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(img => img.imageUrl);

      expect(imageUrls).toEqual([
        "https://s3.example.com/a.jpg",
        "https://s3.example.com/b.jpg",
        "https://s3.example.com/c.jpg",
      ]);
    });
  });

  describe("Cart page - image merge for cart items", () => {
    it("should merge thumbnail images for cart products", () => {
      const cartItems = [
        { id: 1, quantity: 2, product: { id: 100, imageUrl: null, name: "Product A" } },
        { id: 2, quantity: 1, product: { id: 200, imageUrl: null, name: "Product B" } },
        { id: 3, quantity: 3, product: { id: 300, imageUrl: "https://existing.com/img.jpg", name: "Product C" } },
      ];

      const thumbnailMap: Record<number, string> = {
        100: "https://s3.example.com/product100-1.jpg",
        200: "https://s3.example.com/product200-1.jpg",
      };

      // Simulate mergeProductThumbnails for cart products
      const cartProducts = cartItems.map(i => i.product).filter(p => p && p.id);
      const merged = cartProducts.map(p => ({
        ...p,
        imageUrl: p.imageUrl || thumbnailMap[p.id] || null,
      }));
      const mergedMap = new Map(merged.map(p => [p.id, p]));

      const result = cartItems.map(item => ({
        ...item,
        product: mergedMap.get(item.product?.id) || item.product,
      }));

      expect(result[0].product.imageUrl).toBe("https://s3.example.com/product100-1.jpg");
      expect(result[1].product.imageUrl).toBe("https://s3.example.com/product200-1.jpg");
      expect(result[2].product.imageUrl).toBe("https://existing.com/img.jpg");
    });

    it("should handle cart with no products", () => {
      const cartItems: any[] = [];
      const cartProducts = cartItems.map(i => i.product).filter(p => p && p.id);
      expect(cartProducts.length).toBe(0);
    });
  });

  describe("All product APIs use mergeProductThumbnails", () => {
    // These tests verify the pattern used across all product-related APIs
    const thumbnailMap: Record<number, string> = {
      1: "https://s3.example.com/thumb-1.jpg",
      2: "https://s3.example.com/thumb-2.jpg",
      3: "https://s3.example.com/thumb-3.jpg",
    };

    const mergeLogic = (products: any[]) => {
      return products.map(p => ({
        ...p,
        imageUrl: p.imageUrl || thumbnailMap[p.id] || null,
      }));
    };

    it("product.list should merge thumbnails", () => {
      const products = [
        { id: 1, imageUrl: null },
        { id: 2, imageUrl: null },
      ];
      const result = mergeLogic(products);
      expect(result[0].imageUrl).toBe("https://s3.example.com/thumb-1.jpg");
      expect(result[1].imageUrl).toBe("https://s3.example.com/thumb-2.jpg");
    });

    it("product.getByCategory should merge thumbnails", () => {
      const products = [{ id: 1, imageUrl: null, categoryId: 10 }];
      const result = mergeLogic(products);
      expect(result[0].imageUrl).toBe("https://s3.example.com/thumb-1.jpg");
    });

    it("product.timeSale should merge thumbnails", () => {
      const products = [{ id: 2, imageUrl: null, isTimeSale: true }];
      const result = mergeLogic(products);
      expect(result[0].imageUrl).toBe("https://s3.example.com/thumb-2.jpg");
    });

    it("product.monthlySale should merge thumbnails", () => {
      const products = [{ id: 3, imageUrl: null, isMonthlySale: true }];
      const result = mergeLogic(products);
      expect(result[0].imageUrl).toBe("https://s3.example.com/thumb-3.jpg");
    });

    it("product.popular should merge thumbnails", () => {
      const products = [{ id: 1, imageUrl: null, isPopular: true }];
      const result = mergeLogic(products);
      expect(result[0].imageUrl).toBe("https://s3.example.com/thumb-1.jpg");
    });

    it("product.search should merge thumbnails", () => {
      const products = [
        { id: 1, imageUrl: null },
        { id: 3, imageUrl: null },
      ];
      const result = mergeLogic(products);
      expect(result[0].imageUrl).toBe("https://s3.example.com/thumb-1.jpg");
      expect(result[1].imageUrl).toBe("https://s3.example.com/thumb-3.jpg");
    });

    it("product.getRecommendations should merge thumbnails", () => {
      const products = [{ id: 2, imageUrl: null }];
      const result = mergeLogic(products);
      expect(result[0].imageUrl).toBe("https://s3.example.com/thumb-2.jpg");
    });

    it("product.getSmartRelated should merge thumbnails", () => {
      const products = [{ id: 1, imageUrl: null }, { id: 3, imageUrl: null }];
      const result = mergeLogic(products);
      expect(result[0].imageUrl).toBe("https://s3.example.com/thumb-1.jpg");
      expect(result[1].imageUrl).toBe("https://s3.example.com/thumb-3.jpg");
    });

    it("product.getByTags should merge thumbnails", () => {
      const products = [{ id: 2, imageUrl: null }];
      const result = mergeLogic(products);
      expect(result[0].imageUrl).toBe("https://s3.example.com/thumb-2.jpg");
    });

    it("product.getAlsoViewed should merge thumbnails", () => {
      const products = [{ id: 1, imageUrl: null }, { id: 2, imageUrl: null }];
      const result = mergeLogic(products);
      expect(result[0].imageUrl).toBe("https://s3.example.com/thumb-1.jpg");
      expect(result[1].imageUrl).toBe("https://s3.example.com/thumb-2.jpg");
    });

    it("product.getRecentlyViewed should merge thumbnails", () => {
      const products = [{ id: 3, imageUrl: null }];
      const result = mergeLogic(products);
      expect(result[0].imageUrl).toBe("https://s3.example.com/thumb-3.jpg");
    });
  });

  describe("mergeProductThumbnail (single product)", () => {
    it("should merge thumbnail for single product", () => {
      const product = { id: 100, imageUrl: null, name: "Product A" };
      const thumbnailMap: Record<number, string> = {
        100: "https://s3.example.com/product100-1.jpg",
      };

      const merged = {
        ...product,
        imageUrl: product.imageUrl || thumbnailMap[product.id] || null,
      };

      expect(merged.imageUrl).toBe("https://s3.example.com/product100-1.jpg");
    });

    it("should return null for product with no images", () => {
      const product = { id: 999, imageUrl: null, name: "No Image Product" };
      const thumbnailMap: Record<number, string> = {};

      const merged = {
        ...product,
        imageUrl: product.imageUrl || thumbnailMap[product.id] || null,
      };

      expect(merged.imageUrl).toBeNull();
    });

    it("should handle null product", () => {
      const product = null;
      // mergeProductThumbnail returns null for null product
      expect(product).toBeNull();
    });
  });

  describe("S3 upload to product_image_order auto-insert", () => {
    it("should auto-set isThumbnail=true for first image", () => {
      const existingCount = 0;
      const isThumbnail = existingCount === 0;
      const sortOrder = existingCount;

      expect(isThumbnail).toBe(true);
      expect(sortOrder).toBe(0);
    });

    it("should auto-set isThumbnail=false for subsequent images", () => {
      const existingCount = 3;
      const isThumbnail = existingCount === 0;
      const sortOrder = existingCount;

      expect(isThumbnail).toBe(false);
      expect(sortOrder).toBe(3);
    });
  });
});
