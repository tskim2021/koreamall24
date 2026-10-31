/**
 * Image Optimizer Module
 * 
 * Provides image optimization pipeline for product images:
 * - WebP conversion for smaller file sizes
 * - Multiple size variants (original, medium, thumbnail)
 * - Blur placeholder (base64 tiny image) for progressive loading
 * - Quality optimization while maintaining visual fidelity
 */

import sharp from "sharp";

/** Image size variant definitions */
export interface ImageVariant {
  suffix: string;
  width: number;
  height: number;
  quality: number;
}

/** Result of optimizing a single image */
export interface OptimizedImageResult {
  /** WebP buffer of the optimized image */
  buffer: Buffer;
  /** Content type (always image/webp) */
  contentType: string;
  /** Width of the output image */
  width: number;
  /** Height of the output image */
  height: number;
  /** File size in bytes */
  size: number;
}

/** Full optimization result with all variants */
export interface ImageOptimizationResult {
  /** Original-size WebP (max 1200px wide) */
  original: OptimizedImageResult;
  /** Medium-size WebP (max 600px wide, for product cards) */
  medium: OptimizedImageResult;
  /** Thumbnail WebP (max 200px wide, for small previews) */
  thumbnail: OptimizedImageResult;
  /** Base64-encoded tiny blur placeholder (~20px wide) */
  blurDataUrl: string;
  /** Original image metadata */
  metadata: {
    originalWidth: number;
    originalHeight: number;
    originalFormat: string;
    originalSize: number;
  };
}

/** Predefined size variants */
export const IMAGE_VARIANTS: Record<string, ImageVariant> = {
  original: { suffix: "", width: 1200, height: 1200, quality: 82 },
  medium: { suffix: "-md", width: 600, height: 600, quality: 80 },
  thumbnail: { suffix: "-thumb", width: 200, height: 200, quality: 75 },
};

/**
 * Convert and resize an image buffer to WebP format
 */
export async function convertToWebP(
  inputBuffer: Buffer,
  maxWidth: number,
  maxHeight: number,
  quality: number = 80
): Promise<OptimizedImageResult> {
  const result = await sharp(inputBuffer)
    .resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    contentType: "image/webp",
    width: result.info.width,
    height: result.info.height,
    size: result.info.size,
  };
}

/**
 * Generate a tiny blur placeholder as a base64 data URL
 * Creates a ~20px wide image that can be used as a CSS background
 * while the full image loads
 */
export async function generateBlurPlaceholder(
  inputBuffer: Buffer
): Promise<string> {
  const tinyBuffer = await sharp(inputBuffer)
    .resize(20, 20, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 20 })
    .toBuffer();

  return `data:image/webp;base64,${tinyBuffer.toString("base64")}`;
}

/**
 * Get metadata from an image buffer
 */
export async function getImageMetadata(inputBuffer: Buffer) {
  const metadata = await sharp(inputBuffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
    size: inputBuffer.length,
  };
}

/**
 * Full image optimization pipeline
 * Takes a raw image buffer and produces:
 * 1. Original-size WebP (max 1200px)
 * 2. Medium-size WebP (max 600px)
 * 3. Thumbnail WebP (max 200px)
 * 4. Blur placeholder (base64 data URL)
 */
export async function optimizeImage(
  inputBuffer: Buffer
): Promise<ImageOptimizationResult> {
  // Get original metadata
  const meta = await getImageMetadata(inputBuffer);

  // Run all optimizations in parallel
  const [original, medium, thumbnail, blurDataUrl] = await Promise.all([
    convertToWebP(
      inputBuffer,
      IMAGE_VARIANTS.original.width,
      IMAGE_VARIANTS.original.height,
      IMAGE_VARIANTS.original.quality
    ),
    convertToWebP(
      inputBuffer,
      IMAGE_VARIANTS.medium.width,
      IMAGE_VARIANTS.medium.height,
      IMAGE_VARIANTS.medium.quality
    ),
    convertToWebP(
      inputBuffer,
      IMAGE_VARIANTS.thumbnail.width,
      IMAGE_VARIANTS.thumbnail.height,
      IMAGE_VARIANTS.thumbnail.quality
    ),
    generateBlurPlaceholder(inputBuffer),
  ]);

  return {
    original,
    medium,
    thumbnail,
    blurDataUrl,
    metadata: {
      originalWidth: meta.width,
      originalHeight: meta.height,
      originalFormat: meta.format,
      originalSize: meta.size,
    },
  };
}

/**
 * Generate a WebP file key from the original file key
 * e.g., "products/100/image.jpg" → "products/100/image.webp"
 *        "products/100/image.jpg" + "-md" → "products/100/image-md.webp"
 */
export function getWebPFileKey(originalKey: string, suffix: string = ""): string {
  const lastDot = originalKey.lastIndexOf(".");
  const baseName = lastDot > 0 ? originalKey.substring(0, lastDot) : originalKey;
  return `${baseName}${suffix}.webp`;
}
