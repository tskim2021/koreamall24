import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

/**
 * 전역 컴포넌트: 관리자가 설정한 검색엔진 인증 메타태그를 <head>에 자동 삽입합니다.
 * App.tsx에서 최상위에 한 번만 렌더링됩니다.
 */
export default function SearchConsoleMetaTags() {
  const { data: tags } = trpc.searchConsole.getVerificationTags.useQuery(undefined, {
    staleTime: 1000 * 60 * 10, // 10분 캐시
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!tags) return;

    const META_MAP: Record<string, string> = {
      SEARCH_GOOGLE_VERIFICATION: "google-site-verification",
      SEARCH_BING_VERIFICATION: "msvalidate.01",
      SEARCH_YAHOO_VERIFICATION: "y_key",
      SEARCH_NAVER_VERIFICATION: "naver-site-verification",
      SEARCH_BAIDU_VERIFICATION: "baidu-site-verification",
      SEARCH_YANDEX_VERIFICATION: "yandex-verification",
    };

    // 기존에 삽입된 search-console 메타태그 제거 후 재삽입
    document.querySelectorAll("meta[data-search-console]").forEach((el) => el.remove());

    Object.entries(META_MAP).forEach(([key, metaName]) => {
      const value = tags[key];
      if (value) {
        const meta = document.createElement("meta");
        meta.setAttribute("name", metaName);
        meta.setAttribute("content", value);
        meta.setAttribute("data-search-console", "true");
        document.head.appendChild(meta);
      }
    });
  }, [tags]);

  return null;
}
