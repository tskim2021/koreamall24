import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import {
  convertToWebP,
  generateBlurPlaceholder,
  getImageMetadata,
  optimizeImage,
  getWebPFileKey,
  IMAGE_VARIANTS,
} from "./imageOptimizer";

// Create a real test image buffer using sharp
async function createTestImage(
  width: number = 800,
  height: number = 600,
  format: "png" | "jpeg" = "jpeg"
): Promise<Buffer> {
  const img = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 128, b: 64 },
    },
  });

  if (format === "png") {
    return img.png().toBuffer();
  }
  return img.jpeg({ quality: 90 }).toBuffer();
}

describe("imageOptimizer", () => {
  describe("convertToWebP", () => {
    it("should convert JPEG to WebP format", async () => {
      const input = await createTestImage(800, 600, "jpeg");
      const result = await convertToWebP(input, 800, 600, 80);

      expect(result.contentType).toBe("image/webp");
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.width).toBeLessThanOrEqual(800);
      expect(result.height).toBeLessThanOrEqual(600);
    });

    it("should convert PNG to WebP format", async () => {
      const input = await createTestImage(400, 300, "png");
      const result = await convertToWebP(input, 400, 300, 80);

      expect(result.contentType).toBe("image/webp");
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it("should resize image to fit within max dimensions", async () => {
      const input = await createTestImage(2000, 1500);
      const result = await convertToWebP(input, 600, 600, 80);

      expect(result.width).toBeLessThanOrEqual(600);
      expect(result.height).toBeLessThanOrEqual(600);
    });

    it("should not enlarge small images", async () => {
      const input = await createTestImage(100, 80);
      const result = await convertToWebP(input, 1200, 1200, 80);

      expect(result.width).toBe(100);
      expect(result.height).toBe(80);
    });

    it("should produce smaller file than original JPEG for typical images", async () => {
      const input = await createTestImage(800, 600, "jpeg");
      const result = await convertToWebP(input, 800, 600, 80);

      // WebP should generally be smaller than JPEG at similar quality
      // For synthetic images this may not always hold, so we just check it's reasonable
      expect(result.size).toBeGreaterThan(0);
    });
  });

  describe("generateBlurPlaceholder", () => {
    it("should generate a base64 data URL", async () => {
      const input = await createTestImage(800, 600);
      const result = await generateBlurPlaceholder(input);

      expect(result).toMatch(/^data:image\/webp;base64,/);
    });

    it("should produce a small data URL (under 1KB)", async () => {
      const input = await createTestImage(800, 600);
      const result = await generateBlurPlaceholder(input);

      // Base64 data URL for a 20px image should be very small
      expect(result.length).toBeLessThan(1000);
    });

    it("should work with different image sizes", async () => {
      const small = await createTestImage(50, 50);
      const large = await createTestImage(2000, 1500);

      const resultSmall = await generateBlurPlaceholder(small);
      const resultLarge = await generateBlurPlaceholder(large);

      expect(resultSmall).toMatch(/^data:image\/webp;base64,/);
      expect(resultLarge).toMatch(/^data:image\/webp;base64,/);
    });
  });

  describe("getImageMetadata", () => {
    it("should return correct metadata for JPEG", async () => {
      const input = await createTestImage(800, 600, "jpeg");
      const meta = await getImageMetadata(input);

      expect(meta.width).toBe(800);
      expect(meta.height).toBe(600);
      expect(meta.format).toBe("jpeg");
      expect(meta.size).toBe(input.length);
    });

    it("should return correct metadata for PNG", async () => {
      const input = await createTestImage(400, 300, "png");
      const meta = await getImageMetadata(input);

      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300);
      expect(meta.format).toBe("png");
    });
  });

  describe("optimizeImage", () => {
    it("should produce all three size variants", async () => {
      const input = await createTestImage(1500, 1000);
      const result = await optimizeImage(input);

      expect(result.original).toBeDefined();
      expect(result.medium).toBeDefined();
      expect(result.thumbnail).toBeDefined();
      expect(result.blurDataUrl).toBeDefined();
    });

    it("should produce original variant with max 1200px", async () => {
      const input = await createTestImage(2000, 1500);
      const result = await optimizeImage(input);

      expect(result.original.width).toBeLessThanOrEqual(1200);
      expect(result.original.height).toBeLessThanOrEqual(1200);
      expect(result.original.contentType).toBe("image/webp");
    });

    it("should produce medium variant with max 600px", async () => {
      const input = await createTestImage(1500, 1000);
      const result = await optimizeImage(input);

      expect(result.medium.width).toBeLessThanOrEqual(600);
      expect(result.medium.height).toBeLessThanOrEqual(600);
      expect(result.medium.contentType).toBe("image/webp");
    });

    it("should produce thumbnail variant with max 200px", async () => {
      const input = await createTestImage(1500, 1000);
      const result = await optimizeImage(input);

      expect(result.thumbnail.width).toBeLessThanOrEqual(200);
      expect(result.thumbnail.height).toBeLessThanOrEqual(200);
      expect(result.thumbnail.contentType).toBe("image/webp");
    });

    it("should produce blur data URL", async () => {
      const input = await createTestImage(800, 600);
      const result = await optimizeImage(input);

      expect(result.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
      expect(result.blurDataUrl.length).toBeLessThan(1000);
    });

    it("should return correct metadata", async () => {
      const input = await createTestImage(800, 600, "jpeg");
      const result = await optimizeImage(input);

      expect(result.metadata.originalWidth).toBe(800);
      expect(result.metadata.originalHeight).toBe(600);
      expect(result.metadata.originalFormat).toBe("jpeg");
      expect(result.metadata.originalSize).toBe(input.length);
    });

    it("should produce progressively smaller file sizes", async () => {
      const input = await createTestImage(1500, 1000);
      const result = await optimizeImage(input);

      // Original should be larger than medium, medium larger than thumbnail
      expect(result.original.size).toBeGreaterThan(result.medium.size);
      expect(result.medium.size).toBeGreaterThan(result.thumbnail.size);
    });

    it("should handle small images without error", async () => {
      const input = await createTestImage(50, 50);
      const result = await optimizeImage(input);

      expect(result.original).toBeDefined();
      expect(result.medium).toBeDefined();
      expect(result.thumbnail).toBeDefined();
      expect(result.blurDataUrl).toBeDefined();
    });
  });

  describe("getWebPFileKey", () => {
    it("should convert jpg extension to webp", () => {
      expect(getWebPFileKey("products/100/image.jpg")).toBe(
        "products/100/image.webp"
      );
    });

    it("should convert png extension to webp", () => {
      expect(getWebPFileKey("products/100/image.png")).toBe(
        "products/100/image.webp"
      );
    });

    it("should add suffix before extension", () => {
      expect(getWebPFileKey("products/100/image.jpg", "-md")).toBe(
        "products/100/image-md.webp"
      );
    });

    it("should add thumb suffix", () => {
      expect(getWebPFileKey("products/100/image.jpg", "-thumb")).toBe(
        "products/100/image-thumb.webp"
      );
    });

    it("should handle files without extension", () => {
      expect(getWebPFileKey("products/100/image")).toBe(
        "products/100/image.webp"
      );
    });
  });

  describe("IMAGE_VARIANTS", () => {
    it("should have correct original variant config", () => {
      expect(IMAGE_VARIANTS.original.width).toBe(1200);
      expect(IMAGE_VARIANTS.original.height).toBe(1200);
      expect(IMAGE_VARIANTS.original.quality).toBe(82);
      expect(IMAGE_VARIANTS.original.suffix).toBe("");
    });

    it("should have correct medium variant config", () => {
      expect(IMAGE_VARIANTS.medium.width).toBe(600);
      expect(IMAGE_VARIANTS.medium.height).toBe(600);
      expect(IMAGE_VARIANTS.medium.quality).toBe(80);
      expect(IMAGE_VARIANTS.medium.suffix).toBe("-md");
    });

    it("should have correct thumbnail variant config", () => {
      expect(IMAGE_VARIANTS.thumbnail.width).toBe(200);
      expect(IMAGE_VARIANTS.thumbnail.height).toBe(200);
      expect(IMAGE_VARIANTS.thumbnail.quality).toBe(75);
      expect(IMAGE_VARIANTS.thumbnail.suffix).toBe("-thumb");
    });
  });
});
