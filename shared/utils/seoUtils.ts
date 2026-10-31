/**
 * SEO utility functions for product pages
 * Shared between frontend and backend - no DOM/browser APIs
 */

export interface PriceTier {
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  discountPercent: number;
  stock?: number;
  isPopular?: boolean;
}

/**
 * Parse setPricing JSON string into PriceTier array
 */
export function parsePriceTiers(setPricing: string | null | undefined): PriceTier[] {
  if (!setPricing) return [];
  try {
    const parsed = typeof setPricing === "string" ? JSON.parse(setPricing) : setPricing;
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Calculate the lowest unit price from price tiers
 * Returns the base price if no tiers exist
 */
export function getLowestPrice(
  tiers: PriceTier[],
  basePrice: number
): number {
  if (!tiers || tiers.length === 0) return basePrice;
  const prices = tiers.map((t) => Number(t.pricePerUnit)).filter((p) => p > 0);
  if (prices.length === 0) return basePrice;
  return Math.min(...prices);
}

/**
 * Calculate the highest unit price from price tiers
 */
export function getHighestPrice(
  tiers: PriceTier[],
  basePrice: number
): number {
  if (!tiers || tiers.length === 0) return basePrice;
  const prices = tiers.map((t) => Number(t.pricePerUnit)).filter((p) => p > 0);
  if (prices.length === 0) return basePrice;
  return Math.max(...prices);
}

/**
 * Get the best (highest) discount percent from price tiers
 */
export function getBestDiscount(
  tiers: PriceTier[],
  basePrice: number,
  originalPrice?: number | null
): number {
  // Check tiers first
  if (tiers && tiers.length > 0) {
    const discounts = tiers.map((t) => Number(t.discountPercent ?? 0));
    const maxTierDiscount = Math.max(...discounts);
    if (maxTierDiscount > 0) return Math.round(maxTierDiscount);
  }
  // Fallback to originalPrice comparison
  if (originalPrice && originalPrice > basePrice) {
    return Math.round((1 - basePrice / originalPrice) * 100);
  }
  return 0;
}

/**
 * Format price in Japanese style: 7,760円
 */
export function formatPriceJa(price: number): string {
  if (isNaN(price) || price <= 0) return "0円";
  return `${Math.round(price).toLocaleString("ja-JP")}円`;
}

/**
 * Format price with 〜 suffix for range display: 7,760円〜
 */
export function formatPriceRange(lowestPrice: number, hasTiers: boolean): string {
  const base = formatPriceJa(lowestPrice);
  return hasTiers ? `${base}〜` : base;
}

/**
 * Strip HTML tags from text
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Generate SEO title for product detail page
 * Priority: seoTitle (custom) > auto-generated
 * Format: 商品名 最安値 7,760円〜｜14%OFF | ココくすり
 */
export function generateProductSeoTitle(params: {
  nameJa: string;
  lowestPrice: number;
  hasTiers: boolean;
  bestDiscount: number;
  seoTitle?: string | null;
  siteName?: string;
}): string {
  const { nameJa, lowestPrice, hasTiers, bestDiscount, seoTitle, siteName = "正規品保証・送料無料" } = params;

  if (seoTitle) return `${seoTitle} | ${siteName}`;

  const priceStr = formatPriceRange(lowestPrice, hasTiers);
  const discountStr = bestDiscount > 0 ? `｜${bestDiscount}%OFF` : "";
  const title = `${nameJa} 最安値 ${priceStr}${discountStr}`;
  return `${title} | ${siteName}`;
}

/**
 * Generate SEO meta description for product detail page
 * Priority: seoDescription (custom) > auto-generated
 */
export function generateProductSeoDescription(params: {
  nameJa: string;
  lowestPrice: number;
  hasTiers: boolean;
  bestDiscount: number;
  descriptionJa?: string | null;
  brandJa?: string | null;
  seoDescription?: string | null;
}): string {
  const { nameJa, lowestPrice, hasTiers, bestDiscount, descriptionJa, brandJa, seoDescription } = params;

  if (seoDescription) return seoDescription;

  const priceStr = formatPriceRange(lowestPrice, hasTiers);
  const discountStr = bestDiscount > 0 ? `${bestDiscount}%OFF、` : "";
  const brandStr = brandJa ? `${brandJa}の` : "";
  const plainDesc = stripHtml(descriptionJa);
  const shortDesc = plainDesc ? plainDesc.slice(0, 60) : "日本医薬品・健康商品の個人輸入代行";

  return `${brandStr}${nameJa}を${priceStr}で販売中。${discountStr}まとめ買い対応。${shortDesc}。正規品保証・全品送料無料。`;
}

/**
 * Generate alt text for product images
 * Format: 商品名 ブランド名 7,760円〜
 */
export function generateImageAlt(params: {
  nameJa: string;
  brandJa?: string | null;
  lowestPrice: number;
  hasTiers: boolean;
}): string {
  const { nameJa, brandJa, lowestPrice, hasTiers } = params;
  const brandStr = brandJa ? ` ${brandJa}` : "";
  const priceStr = formatPriceRange(lowestPrice, hasTiers);
  return `${nameJa}${brandStr} ${priceStr}`;
}
