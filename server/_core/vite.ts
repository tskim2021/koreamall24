import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getSiteSetting } from "../db";
import { withCache, TTL_30MIN, TTL_10MIN, TTL_5MIN } from "../cache";

const BASE_URL = "https://koreamall24.com";

/** HTML 특수문자 이스케이프 (메타태그 인젝션 방지) */
function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** JSON-LD 스크립트 태그 생성 */
function jsonLdScript(data: object): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `<script type="application/ld+json">${json}</script>`;
}

/** 공통 메타태그 치환 헬퍼 */
function injectMeta(html: string, opts: {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: string;
  jsonLd?: object | object[];
}): string {
  const { title, description, image, url, type = 'website', jsonLd } = opts;
  const safeTitle = escHtml(title);
  const safeDesc = escHtml(description.slice(0, 160));
  const safeImage = image ? escHtml(image) : '';
  const safeUrl = escHtml(url);

  html = html.replace(/(<title>)[^<]*(<\/title>)/, `$1${safeTitle}$2`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*("|\/>)/, `$1${safeTitle}$2`);
  html = html.replace(/(<meta name="description" content=")[^"]*("|\/>)/, `$1${safeDesc}$2`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*("|\/>)/, `$1${safeDesc}$2`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*("|\/>)/, `$1${safeTitle}$2`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*("|\/>)/, `$1${safeDesc}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*("|\/>)/, `$1${safeUrl}$2`);
  html = html.replace(/(<meta property="og:type" content=")[^"]*("|\/>)/, `$1${type}$2`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*("|\/>)/, `$1${safeUrl}$2`);
  if (safeImage) {
    html = html.replace(/(<meta property="og:image" content=")[^"]*("|\/>)/, `$1${safeImage}$2`);
    html = html.replace(/(<meta name="twitter:image" content=")[^"]*("|\/>)/, `$1${safeImage}$2`);
  }
  if (jsonLd) {
    const schemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    const scripts = schemas.map(s => jsonLdScript(s)).join('\n');
    html = html.replace('</head>', `${scripts}\n</head>`);
  }
  return html;
}

/** 페이지별 동적 메타태그 주입 (production용) */
async function injectPageMeta(html: string, url: string): Promise<string> {
  const path_ = url.split('?')[0].replace(/\/$/, '') || '/';
  const defaultOgImage = "https://d2xsxph8kpxj0f.cloudfront.net/310519663287886477/UQKFprxuYdKrk4tZ9zXFHM/brand/ogDefaultImage/1778498030484-yz3xnvug57a.png";

  try {
    // ── 상품 상세 페이지 /product/:id ──────────────────────────────────────
    const productMatch = path_.match(/^\/product\/(\d+)$/);
    if (productMatch) {
      const productId = parseInt(productMatch[1], 10);
      const { getProductById, mergeProductThumbnail } = await import('../db');
      const rawProduct = await getProductById(productId);
      const product = rawProduct ? await mergeProductThumbnail(rawProduct) : null;
      if (product) {
        const productImage = (product as any).seoImage || product.imageUrl || defaultOgImage;
        const productTitle = `${product.nameJa} | koreamall24`;
        // description 정제: HTML 태그 제거 후 공백 없이 붙은 텍스트는 의미없는 키워드로 판단
        const rawDesc = (product as any).descriptionJa
          ? String((product as any).descriptionJa).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
          : '';
        // 공백 없이 붙은 텍스트 감지: 전체 길이 대비 공백 비율이 2% 미만이면 의미없는 텍스트로 판단
        const spaceRatio = rawDesc.length > 0 ? (rawDesc.split(' ').length - 1) / rawDesc.length : 0;
        const isGibberish = rawDesc.length > 10 && spaceRatio < 0.02;
        const catName = (product as any).categoryName || '';
        const productDesc = (!rawDesc || isGibberish)
          ? `${product.nameJa}。${catName ? catName + 'の' : ''}医薬品・健康商品をkoreamall24で個人輸入。正規品保証・送料無料・24時間対応。`
          : rawDesc.slice(0, 160);
        const productUrl = `${BASE_URL}/product/${productId}`;
        const productPrice = (product as any).price || (product as any).basePrice || 0;
        const jsonLd = [
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.nameJa,
            "description": productDesc,
            "image": productImage,
            "url": productUrl,
            "brand": { "@type": "Brand", "name": "koreamall24" },
            "offers": {
              "@type": "Offer",
              "priceCurrency": "JPY",
              "price": productPrice,
              "availability": "https://schema.org/InStock",
              "url": productUrl,
              "seller": { "@type": "Organization", "name": "koreamall24" }
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "ホーム", "item": BASE_URL },
              { "@type": "ListItem", "position": 2, "name": "商品一覧", "item": `${BASE_URL}/products` },
              { "@type": "ListItem", "position": 3, "name": product.nameJa, "item": productUrl }
            ]
          }
        ];
        return injectMeta(html, { title: productTitle, description: productDesc, image: productImage, url: productUrl, type: 'product', jsonLd });
      }
      return html;
    }

    // ── 카테고리 페이지 /category/:slug ───────────────────────────────────
    const categoryMatch = path_.match(/^\/category\/([^/]+)$/);
    if (categoryMatch) {
      const slug = categoryMatch[1];
      const { getCategoryBySlug } = await import('../db');
      const category = await getCategoryBySlug(slug);
      if (category) {
        const catTitle = `${category.nameJa} | koreamall24`;
        const catDesc = `${category.nameJa}の商品一覧。koreamall24で日本医薬品・健康商品を個人輸入。正規品保証・送料無料・24時間対応。`;
        const catUrl = `${BASE_URL}/category/${slug}`;
        const jsonLd = [
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": catTitle,
            "description": catDesc,
            "url": catUrl
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "ホーム", "item": BASE_URL },
              { "@type": "ListItem", "position": 2, "name": category.nameJa, "item": catUrl }
            ]
          }
        ];
        return injectMeta(html, { title: catTitle, description: catDesc, url: catUrl, jsonLd });
      }
    }

    // ── 정적 페이지별 메타태그 ─────────────────────────────────────────────
    const staticMeta: Record<string, { title: string; description: string; jsonLdType?: string }> = {
      '/': {
        title: 'koreamall24｜医薬品・健康商品の個人輸入代行サイト',
        description: '医薬品・健康商品の個人輸入代行サービス。正規品保証・送料無料・24時間対応。AGA・育毛、ダイエット、美容・スキンケア、ピル・避妊薬、感染症対策など幅広い商品を取り揃えています。',
      },
      '/products': {
        title: '商品一覧 | koreamall24',
        description: '日本医薬品・健康商品の個人輸入代行。AGA・育毛、ダイエット、美容・スキンケア、ピル・避妊薬、感染症対策など幅広い商品を取り揃えています。',
      },
      '/ranking': {
        title: '売れ筋ランキングTOP100 | koreamall24',
        description: 'koreamall24で最も売れている医薬品・健康商品のランキング。人気商品TOP100を随時更新中。',
      },
      '/sale': {
        title: 'セール商品 | koreamall24',
        description: 'koreamall24のセール・割引商品一覧。お得な価格で日本医薬品・健康商品を個人輸入。',
      },
      '/new': {
        title: '新着商品 | koreamall24',
        description: 'koreamall24の新着商品一覧。最新の日本医薬品・健康商品を随時入荷中。',
      },
      '/bbs/notice': {
        title: 'お知らせ | koreamall24',
        description: 'koreamall24からのお知らせ・公告事項一覧。',
      },
      '/bbs/event': {
        title: 'イベント・キャンペーン | koreamall24',
        description: 'koreamall24のイベント・キャンペーン情報。お得なセール情報をいち早くお届けします。',
      },
      '/first-time-customer': {
        title: 'はじめてのお客様へ | koreamall24',
        description: 'koreamall24をはじめてご利用の方へ。ご注文方法・支払い・配送・個人輸入についてご説明します。',
      },
      '/terms-of-service': {
        title: '利用規約 | koreamall24',
        description: 'koreamall24利用規約。サービス利用に関する規約をご確認ください。',
      },
      '/privacy-policy': {
        title: 'プライバシーポリシー | koreamall24',
        description: 'koreamall24プライバシーポリシー。個人情報の取り扱いについてご確認ください。',
      },
      '/legal-notice': {
        title: '特定商取引法に基づく表記 | koreamall24',
        description: 'koreamall24特定商取引法に基づく表記。販売業者・連絡先・返品ポリシーなどをご確認ください。',
      },
      '/contact': {
        title: 'お問い合わせ | koreamall24',
        description: 'koreamall24へのお問い合わせ。ご質問・ご意見はこちらからお気軽にどうぞ。',
      },
    };

    const pageMeta = staticMeta[path_];
    if (pageMeta) {
      const pageUrl = `${BASE_URL}${path_ === '/' ? '' : path_}`;
      const siteJsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "koreamall24",
        "url": BASE_URL,
        "description": "医薬品・健康商品の個人輸入代行サービス",
        "potentialAction": {
          "@type": "SearchAction",
          "target": { "@type": "EntryPoint", "urlTemplate": `${BASE_URL}/products?q={search_term_string}` },
          "query-input": "required name=search_term_string"
        }
      };
      const orgJsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "koreamall24",
        "url": BASE_URL,
        "logo": "https://d2xsxph8kpxj0f.cloudfront.net/310519663287886477/UQKFprxuYdKrk4tZ9zXFHM/brand/ogDefaultImage/1778498030484-yz3xnvug57a.png",
        "sameAs": []
      };
      return injectMeta(html, {
        title: pageMeta.title,
        description: pageMeta.description,
        url: pageUrl || BASE_URL,
        jsonLd: path_ === '/' ? [siteJsonLd, orgJsonLd] : undefined,
      });
    }

    // ── 공지사항 상세 /bbs/notice/:id ─────────────────────────────────────
    const noticeMatch = path_.match(/^\/bbs\/notice\/(\d+)$/);
    if (noticeMatch) {
      const noticeId = parseInt(noticeMatch[1], 10);
      const { getAnnouncementById } = await import('../db').catch(() => ({ getAnnouncementById: undefined })) as any;
      if (getAnnouncementById) {
        const notice = await getAnnouncementById(noticeId).catch(() => null);
        if (notice) {
          const noticeTitle = `${notice.titleJa} | koreamall24 お知らせ`;
          const noticeDesc = notice.contentJa
            ? String(notice.contentJa).replace(/<[^>]*>/g, '').slice(0, 160)
            : `koreamall24からのお知らせ: ${notice.titleJa}`;
          return injectMeta(html, { title: noticeTitle, description: noticeDesc, url: `${BASE_URL}/bbs/notice/${noticeId}` });
        }
      }
    }

    // ── 기본값: DB에서 가져온 OG 설정 ────────────────────────────────────
    const [ogTitleSetting, ogDescSetting, ogImageSetting] = await Promise.all([
      getSiteSetting('ogDefaultTitle'),
      getSiteSetting('ogDefaultDescription'),
      getSiteSetting('ogDefaultImage'),
    ]);
    const defTitle = ogTitleSetting?.value || 'koreamall24｜医薬品・健康商品の個人輸入代行サイト';
    const defDesc = ogDescSetting?.value || '医薬品・健康商品の個人輸入代行サービス。正規品保証・送料無料・24時間対応。';
    const defImage = ogImageSetting?.value || defaultOgImage;
    const canonicalUrl = `${BASE_URL}${path_ === '/' ? '' : path_}`;
    return injectMeta(html, { title: defTitle, description: defDesc, image: defImage, url: canonicalUrl || BASE_URL });

  } catch (e) {
    console.error('[SEO] injectPageMeta error:', e);
    return html;
  }
}

/**
 * Inject all home page critical data into HTML as window.__INITIAL_DATA__
 * so React can hydrate instantly without any API round-trips.
 * 
 * Includes: banners, weeklyBest, categories, timeSale, monthlySale,
 *           popular, newArrivals, hitProducts, recommended, todayBest,
 *           allProducts, reviews, announcements, events
 */
async function injectInitialData(html: string, reqPath: string = '/'): Promise<string> {
  try {
    const db = await import('../db');
    const {
      getActiveBanners,
      getWeeklyBestProducts,
      mergeProductThumbnails,
      getAllCategories,
      getTimeSaleProducts,
      getMonthlySaleProducts,
      getPopularProducts,
      getNewProducts,
      getHitProducts,
      getRecommendedProducts,
      getTodayBestSellingProducts,
      getAllProducts,
      getLatestReviews,
      getAllAnnouncements,
      getAllEvents,
      getAllReviews,
    } = db;

    const cleanPath = reqPath.split('?')[0].replace(/\/$/, '') || '/';
    // 홈페이지에만 전체 데이터 주입, 나머지 페이지는 최소 데이터만
    const isHomePage = cleanPath === '/';
    const categoryPageMatch = cleanPath.match(/^\/category\/([^/]+)$/);
    const isCategoryPage = !!categoryPageMatch;

    // 모든 페이지에 공통으로 필요한 데이터 (banners, categories)
    const [banners, categories, announcements, events] = await Promise.allSettled([
      withCache('banner:main', TTL_30MIN, () => getActiveBanners('main')),
      withCache('category:list', TTL_30MIN, () => getAllCategories()),
      withCache('announcements:all', TTL_10MIN, () => getAllAnnouncements()),
      withCache('events:all', TTL_10MIN, () => getAllEvents()),
    ]);

    const getValue = <T>(result: PromiseSettledResult<T>, fallback: T): T =>
      result.status === 'fulfilled' ? result.value : fallback;

    const bannersData = getValue(banners, []);

    let initialData: Record<string, unknown> = {
      banners: bannersData,
      categories: getValue(categories, []),
      announcements: getValue(announcements, []),
      events: getValue(events, []),
    };

    // 상품 상세 페이지: 상품 데이터 주입 (초기 로딩 스켈레톤 제거)
    const productPageMatch = cleanPath.match(/^\/product\/(\d+)$/);
    if (productPageMatch) {
      const productId = parseInt(productPageMatch[1], 10);
      try {
        const { getProductById, mergeProductThumbnail, getProductImageOrder, getActiveProductPriceTiers } = await import('../db');
        const [productRaw, imageOrder, priceTiers] = await Promise.allSettled([
          withCache(`product:detail:${productId}`, TTL_10MIN, () => getProductById(productId)),
          withCache(`product:imageOrder:${productId}`, TTL_10MIN, () => getProductImageOrder(productId).catch(() => [])),
          withCache(`product:priceTiers:${productId}`, TTL_10MIN, () => getActiveProductPriceTiers(productId)),
        ]);
        const rawProduct = productRaw.status === 'fulfilled' ? productRaw.value : null;
        const product = rawProduct ? await mergeProductThumbnail(rawProduct) : null;
        if (product) {
          initialData = {
            ...initialData,
            productDetail: product,
            productImageOrder: imageOrder.status === 'fulfilled' ? imageOrder.value : [],
            productPriceTiers: priceTiers.status === 'fulfilled' ? priceTiers.value : [],
          };
        }
      } catch (e) {
        console.error('[SEO] product data inject error:', e);
      }
    }

    // 카테고리 페이지: 상품 목록 데이터 주입 (Soft 404 방지)
    if (isCategoryPage && categoryPageMatch) {
      const slug = categoryPageMatch[1];
      try {
        const { getCategoryBySlug, getProductsByCategory, mergeProductThumbnails } = await import('../db');
        const category = await getCategoryBySlug(slug);
        if (category) {
          const catProducts = await withCache(
            `product:category:${category.id}:24`,
            TTL_30MIN,
            async () => mergeProductThumbnails((await getProductsByCategory(category.id)).slice(0, 24))
          );
          initialData = {
            ...initialData,
            categoryProducts: { [slug]: catProducts },
            currentCategory: category,
          };
        }
      } catch (e) {
        console.error('[SEO] category data inject error:', e);
      }
    }

    // 랭킹 페이지: 인기 상품 100개 주입
    const isRankingPage = cleanPath === '/ranking';
    if (isRankingPage) {
      try {
        const [popularRaw] = await Promise.allSettled([
          withCache('product:popular:100', TTL_5MIN, async () =>
            mergeProductThumbnails(await getPopularProducts())
          ),
        ]);
        initialData = {
          ...initialData,
          rankingProducts: getValue(popularRaw, []),
        };
      } catch (e) {
        console.error('[SEO] ranking data inject error:', e);
      }
    }

    // 세일 페이지: 타임세일 + 월간세일 주입
    const isSalePage = cleanPath === '/sale';
    if (isSalePage) {
      try {
        const [timeSaleRaw, monthlySaleRaw] = await Promise.allSettled([
          withCache('product:timeSale', TTL_5MIN, async () =>
            mergeProductThumbnails(await getTimeSaleProducts())
          ),
          withCache('product:monthlySale', TTL_5MIN, async () =>
            mergeProductThumbnails(await getMonthlySaleProducts())
          ),
        ]);
        initialData = {
          ...initialData,
          timeSaleProducts: getValue(timeSaleRaw, []),
          monthlySaleProducts: getValue(monthlySaleRaw, []),
        };
      } catch (e) {
        console.error('[SEO] sale data inject error:', e);
      }
    }

    // 신상품 페이지: 신상품 100개 주입
    const isNewArrivalsPage = cleanPath === '/new-arrivals';
    if (isNewArrivalsPage) {
      try {
        const [newRaw] = await Promise.allSettled([
          withCache('product:newArrivals:100', TTL_5MIN, async () =>
            mergeProductThumbnails(await getNewProducts())
          ),
        ]);
        initialData = {
          ...initialData,
          newArrivalProducts: getValue(newRaw, []),
        };
      } catch (e) {
        console.error('[SEO] new-arrivals data inject error:', e);
      }
    }

    // 리뷰 페이지: 최신 리뷰 20개 주입
    const isReviewsPage = cleanPath === '/reviews';
    if (isReviewsPage) {
      try {
        const [reviewsRaw] = await Promise.allSettled([
          withCache('review:all:20', TTL_10MIN, () => getAllReviews(20, 0)),
        ]);
        initialData = {
          ...initialData,
          reviews: getValue(reviewsRaw, []),
        };
      } catch (e) {
        console.error('[SEO] reviews data inject error:', e);
      }
    }

    // 추천 페이지: 추천 상품 주입
    const isRecommendedPage = cleanPath === '/recommended';
    if (isRecommendedPage) {
      try {
        const [recRaw] = await Promise.allSettled([
          withCache('product:recommended:30', TTL_5MIN, async () =>
            mergeProductThumbnails(await getRecommendedProducts(30))
          ),
        ]);
        initialData = {
          ...initialData,
          recommendedProducts: getValue(recRaw, []),
        };
      } catch (e) {
        console.error('[SEO] recommended data inject error:', e);
      }
    }

    if (isHomePage) {
      // 홈페이지에만 추가 데이터 주입
      const [
        weeklyBestRaw, timeSaleRaw, monthlySaleRaw, popularRaw,
        newArrivalsRaw, hitProductsRaw, recommendedRaw, todayBestRaw,
        allProductsRaw, reviews,
      ] = await Promise.allSettled([
        withCache('product:weeklyBest:6', TTL_5MIN, async () =>
          mergeProductThumbnails(await getWeeklyBestProducts(6))
        ),
        withCache('product:timeSale', TTL_5MIN, async () =>
          mergeProductThumbnails(await getTimeSaleProducts())
        ),
        withCache('product:monthlySale', TTL_5MIN, async () =>
          mergeProductThumbnails(await getMonthlySaleProducts())
        ),
        withCache('product:popular', TTL_5MIN, async () =>
          mergeProductThumbnails(await getPopularProducts())
        ),
        withCache('product:newArrivals', TTL_5MIN, async () =>
          mergeProductThumbnails(await getNewProducts())
        ),
        withCache('product:hitProducts:10', TTL_5MIN, async () =>
          mergeProductThumbnails(await getHitProducts(10))
        ),
        withCache('product:recommended:12', TTL_5MIN, async () =>
          mergeProductThumbnails(await getRecommendedProducts(12))
        ),
        withCache('product:todayBest:10', TTL_5MIN, async () =>
          mergeProductThumbnails(await getTodayBestSellingProducts(10))
        ),
        withCache('product:list:12', TTL_5MIN, async () => {
          const list = await getAllProducts();
          return mergeProductThumbnails(list.slice(0, 12));
        }),
        withCache('review:latest:8', TTL_10MIN, () => getLatestReviews(8)),
      ]);
      initialData = {
        ...initialData,
        weeklyBest: getValue(weeklyBestRaw, []),
        timeSale: getValue(timeSaleRaw, []),
        monthlySale: getValue(monthlySaleRaw, []),
        popular: getValue(popularRaw, []),
        newArrivals: getValue(newArrivalsRaw, []),
        hitProducts: getValue(hitProductsRaw, []),
        recommended: getValue(recommendedRaw, []),
        todayBest: getValue(todayBestRaw, []),
        allProducts: getValue(allProductsRaw, []),
        reviews: getValue(reviews, []),
      };
    }

    // 카테고리 페이지: SEO용 숨겨진 상품 목록 HTML 주입 (구글봇이 텍스트 콘텐츠를 인식하도록)
    let seoHtmlBlock = '';
    if (isCategoryPage && (initialData as any).categoryProducts) {
      const slug = categoryPageMatch![1];
      const catProds = ((initialData as any).categoryProducts[slug] || []) as any[];
      const category = (initialData as any).currentCategory as any;
      if (catProds.length > 0) {
        const productItems = catProds.map((p: any) => {
          const name = escHtml(p.nameJa || p.name || '');
          const desc = p.descriptionJa ? escHtml(String(p.descriptionJa).replace(/<[^>]*>/g, '').slice(0, 100)) : '';
          const price = p.price || p.basePrice || 0;
          const url = `${BASE_URL}/product/${p.id}`;
          return `<li><a href="${url}"><strong>${name}</strong>${desc ? ` - ${desc}` : ''} ¥${price.toLocaleString()}</a></li>`;
        }).join('');
        const catName = escHtml(category?.nameJa || slug);
        seoHtmlBlock = `<div id="__seo_content" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden" aria-hidden="true"><h1>${catName}</h1><ul>${productItems}</ul></div>`;
      }
    }

    const safeJson = JSON.stringify(initialData)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
    const script = `<script>window.__INITIAL_DATA__ = ${safeJson};</script>`;

    // SEO HTML block을 body에 주입
    if (seoHtmlBlock) {
      html = html.replace('<div id="root"></div>', `<div id="root"></div>${seoHtmlBlock}`);
    }

    // Preload critical images so browser starts downloading immediately
    let preloadTags = '';

    // 상품 페이지: 메인 상품 이미지 preload (LCP 개선)
    const productDetail = (initialData as any).productDetail;
    if (productDetail) {
      const mainImg = productDetail.imageUrl || productDetail.imageUrlThumb;
      if (mainImg) {
        // 이미지 프록시 URL로 변환 (nginx 이미지 프록시 경로)
        const proxyImg = `/api/img-proxy?url=${encodeURIComponent(mainImg)}&w=800&q=85`;
        preloadTags += `<link rel="preload" as="image" href="${proxyImg}" fetchpriority="high">`;
      }
    } else {
      // 홈페이지: 첫 번째 배너 이미지 preload
      const firstBannerImg = (bannersData[0] as any)?.imageUrl;
      if (firstBannerImg) {
        preloadTags += `<link rel="preload" as="image" href="${firstBannerImg}" fetchpriority="high">`;
      }
    }

    return html.replace('</head>', `${preloadTags}\n${script}\n</head>`);
  } catch {
    return html;
  }
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const viteConfig = await import("../../vite.config").then(m => m.default ?? m);
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      // Dynamically inject page-specific meta tags, canonical, and JSON-LD
      template = await injectPageMeta(template, req.originalUrl || req.path);

      // Inject initial data for instant rendering
      template = await injectInitialData(template, req.originalUrl || req.path);

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// HTML 페이지 캐시 (상품/카테고리 페이지 TTFB 개선)
const htmlPageCache = new Map<string, { html: string; expiresAt: number }>();
const HTML_CACHE_TTL = 30 * 60 * 1000; // 30분 (TiDB 레이턴시 고려)

function getHtmlCache(key: string): string | undefined {
  const entry = htmlPageCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { htmlPageCache.delete(key); return undefined; }
  return entry.html;
}

function setHtmlCache(key: string, html: string): void {
  // 캐시 크기 제한 (최대 500개)
  if (htmlPageCache.size >= 500) {
    const firstKey = htmlPageCache.keys().next().value;
    if (firstKey) htmlPageCache.delete(firstKey);
  }
  htmlPageCache.set(key, { html, expiresAt: Date.now() + HTML_CACHE_TTL });
}

export function invalidateHtmlCache(prefix?: string): void {
  if (!prefix) { htmlPageCache.clear(); return; }
  for (const key of Array.from(htmlPageCache.keys())) {
    if (key.startsWith(prefix)) htmlPageCache.delete(key);
  }
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (req, res) => {
    try {
      const reqPath = (req.originalUrl || req.path).split('?')[0];
      let statusCode = 200;

      // 캐시 가능한 페이지 판별 (상품/카테고리/홈/랭킹/세일/신상품 페이지)
      const productMatch404 = reqPath.match(/^\/product\/(\d+)$/);
      const categoryMatch = reqPath.match(/^\/category\/([^/]+)$/);
      const staticPageMatch = /^(\/?|\/(ranking|sale|new|new-arrivals|products|events|bbs\/notice|reviews|recommended))$/.test(reqPath);
      const isCacheable = !!(productMatch404 || categoryMatch || staticPageMatch);
      const cacheKey = `html:${reqPath}`;

      // 캐시 HIT: 즉시 반환
      if (isCacheable) {
        const cached = getHtmlCache(cacheKey);
        if (cached) {
          res.status(200).set({ "Content-Type": "text/html", "X-Cache": "HIT" }).send(cached);
          return;
        }
      }

      // Soft 404 방지: 존재하지 않는 상품 페이지는 404 반환
      if (productMatch404) {
        try {
          const { getProductById } = await import('../db');
          const product = await getProductById(parseInt(productMatch404[1], 10));
          if (!product) statusCode = 404;
        } catch { /* DB unavailable, serve 200 */ }
      }

      let html = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf-8");

      // Inject page-specific meta tags, canonical, and JSON-LD
      html = await injectPageMeta(html, req.originalUrl || req.path);

      // Inject initial data for instant rendering
      html = await injectInitialData(html, req.originalUrl || req.path);

      // 상품/카테고리 페이지 HTML 캐시 저장 (200 응답만)
      if (isCacheable && statusCode === 200) {
        setHtmlCache(cacheKey, html);
      }

      res.status(statusCode).set({ "Content-Type": "text/html" }).send(html);
    } catch {
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });
}
