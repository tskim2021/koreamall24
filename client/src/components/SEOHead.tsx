import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  canonicalUrl?: string;
  /** JSON-LD structured data object or array (e.g. Product + BreadcrumbList schema) */
  jsonLd?: object | object[];
  /** If true, title is used as-is without appending site name */
  rawTitle?: boolean;
  /** Product price for og:price:amount (product pages only) */
  ogPrice?: string;
  /** Product price currency for og:price:currency (default: JPY) */
  ogPriceCurrency?: string;
  /** Product availability for og:availability */
  ogAvailability?: "instock" | "oos" | "pending";
}

/** Convert a relative URL to an absolute URL (required for og:image / twitter:image) */
function toAbsoluteUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (typeof window !== "undefined") {
    return window.location.origin + (url.startsWith("/") ? url : "/" + url);
  }
  return url;
}

export function SEOHead({
  title,
  description,
  keywords,
  ogImage,
  ogType = "website",
  canonicalUrl,
  jsonLd,
  rawTitle = false,
  ogPrice,
  ogPriceCurrency = "JPY",
  ogAvailability,
}: SEOHeadProps) {
  const { data: brandSettings } = trpc.admin.siteSettings.getBrandSettings.useQuery();

  const siteName = "正規品保証・送料無料";
  const defaultDescription =
    brandSettings?.ogDefaultDescription ||
    "日本医薬品・健康商品の個人輸入代行サービス。正規品保証、24時間対応、送料無料。";
  const defaultImage = brandSettings?.ogDefaultImage || "/og-image.jpg";
  const fullTitle = rawTitle
    ? title || siteName
    : title
    ? `${title} | ${siteName}`
    : (brandSettings?.ogDefaultTitle || siteName);
  const finalDescription = description || defaultDescription;
  // Convert to absolute URL so Google/Twitter can crawl the image
  const finalImage = toAbsoluteUrl(ogImage || defaultImage);
  const finalUrl =
    canonicalUrl ||
    (typeof window !== "undefined" ? window.location.href : "");

  // Update favicon dynamically
  useEffect(() => {
    if (brandSettings?.favicon) {
      let link = document.querySelector("link[rel~=\"icon\"]") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = brandSettings.favicon;
    }
  }, [brandSettings?.favicon]);

  useEffect(() => {
    // Update document title
    document.title = fullTitle;
    // Helper: update or create meta tag
    const updateMetaTag = (
      name: string,
      content: string,
      isProperty = false
    ) => {
      const attribute = isProperty ? "property" : "name";
      let element = document.querySelector(
        `meta[${attribute}="${name}"]`
      ) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };
    // Basic meta tags
    updateMetaTag("description", finalDescription);
    if (keywords) {
      updateMetaTag("keywords", keywords);
    }
    // Open Graph tags
    updateMetaTag("og:title", fullTitle, true);
    updateMetaTag("og:description", finalDescription, true);
    updateMetaTag("og:image", finalImage, true);
    updateMetaTag("og:type", ogType, true);
    updateMetaTag("og:url", finalUrl, true);
    updateMetaTag("og:site_name", siteName, true);
    // Product-specific Open Graph tags (og:price, og:availability)
    if (ogPrice) {
      updateMetaTag("og:price:amount", ogPrice, true);
      updateMetaTag("og:price:currency", ogPriceCurrency, true);
    } else {
      document.querySelector('meta[property="og:price:amount"]')?.remove();
      document.querySelector('meta[property="og:price:currency"]')?.remove();
    }
    if (ogAvailability) {
      updateMetaTag("og:availability", ogAvailability, true);
    } else {
      document.querySelector('meta[property="og:availability"]')?.remove();
    }
    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", fullTitle);
    updateMetaTag("twitter:description", finalDescription);
    updateMetaTag("twitter:image", finalImage);
    // Canonical URL
    let linkElement = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (canonicalUrl) {
      if (!linkElement) {
        linkElement = document.createElement("link");
        linkElement.rel = "canonical";
        document.head.appendChild(linkElement);
      }
      linkElement.href = canonicalUrl;
    } else if (linkElement) {
      linkElement.remove();
    }
    // JSON-LD structured data
    // Remove all existing seo-jsonld-* script tags first
    document.querySelectorAll('script[id^="seo-jsonld"]').forEach((el) => el.remove());
    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      items.forEach((item, index) => {
        const scriptElement = document.createElement("script");
        scriptElement.id = index === 0 ? "seo-jsonld" : `seo-jsonld-${index}`;
        scriptElement.type = "application/ld+json";
        scriptElement.textContent = JSON.stringify(item);
        document.head.appendChild(scriptElement);
      });
    }
  }, [fullTitle, finalDescription, keywords, finalImage, ogType, finalUrl, canonicalUrl, jsonLd, ogPrice, ogPriceCurrency, ogAvailability]);
  return null;
}
