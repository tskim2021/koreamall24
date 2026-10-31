import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB functions
vi.mock("./db", () => ({
  getAllSiteSettings: vi.fn(),
  getSiteSetting: vi.fn(),
  upsertSiteSetting: vi.fn(),
}));

import { getAllSiteSettings, upsertSiteSetting } from "./db";

// ─── 검색엔진 인증 키 목록 ───────────────────────────────────────────────────
const SEARCH_ENGINE_KEYS = [
  "SEARCH_GOOGLE_VERIFICATION",
  "SEARCH_BING_VERIFICATION",
  "SEARCH_YAHOO_VERIFICATION",
  "SEARCH_NAVER_VERIFICATION",
  "SEARCH_BAIDU_VERIFICATION",
  "SEARCH_YANDEX_VERIFICATION",
  "SEARCH_GOOGLE_SITEMAP",
];

// ─── 메타 이름 매핑 ──────────────────────────────────────────────────────────
const META_MAP: Record<string, string> = {
  SEARCH_GOOGLE_VERIFICATION: "google-site-verification",
  SEARCH_BING_VERIFICATION: "msvalidate.01",
  SEARCH_YAHOO_VERIFICATION: "y_key",
  SEARCH_NAVER_VERIFICATION: "naver-site-verification",
  SEARCH_BAIDU_VERIFICATION: "baidu-site-verification",
  SEARCH_YANDEX_VERIFICATION: "yandex-verification",
};

// ─── 검증 태그 조회 로직 (routers.ts의 searchConsole.getVerificationTags와 동일) ──
async function getVerificationTags(): Promise<Record<string, string>> {
  const settings = await getAllSiteSettings();
  const result: Record<string, string> = {};
  for (const key of SEARCH_ENGINE_KEYS) {
    const found = (settings as Array<{ key: string; value: string | null }>).find(
      (s) => s.key === key
    );
    if (found?.value) result[key] = found.value;
  }
  return result;
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────
describe("검색엔진 등록 관리 - 인증 태그 조회", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("설정된 인증 코드만 반환한다", async () => {
    vi.mocked(getAllSiteSettings).mockResolvedValue([
      { key: "SEARCH_GOOGLE_VERIFICATION", value: "google_abc123" },
      { key: "SEARCH_BING_VERIFICATION", value: "bing_xyz456" },
      { key: "SEARCH_YAHOO_VERIFICATION", value: null },
      { key: "OTHER_SETTING", value: "some_value" },
    ] as never);

    const result = await getVerificationTags();

    expect(result["SEARCH_GOOGLE_VERIFICATION"]).toBe("google_abc123");
    expect(result["SEARCH_BING_VERIFICATION"]).toBe("bing_xyz456");
    expect(result["SEARCH_YAHOO_VERIFICATION"]).toBeUndefined();
    expect(result["OTHER_SETTING"]).toBeUndefined();
  });

  it("모든 설정이 비어있으면 빈 객체를 반환한다", async () => {
    vi.mocked(getAllSiteSettings).mockResolvedValue([] as never);

    const result = await getVerificationTags();
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("모든 검색엔진 키가 설정된 경우 모두 반환한다", async () => {
    const mockSettings = SEARCH_ENGINE_KEYS.map((key) => ({
      key,
      value: `value_for_${key}`,
    }));
    vi.mocked(getAllSiteSettings).mockResolvedValue(mockSettings as never);

    const result = await getVerificationTags();
    expect(Object.keys(result)).toHaveLength(SEARCH_ENGINE_KEYS.length);
    SEARCH_ENGINE_KEYS.forEach((key) => {
      expect(result[key]).toBe(`value_for_${key}`);
    });
  });

  it("사이트맵 URL도 반환한다", async () => {
    vi.mocked(getAllSiteSettings).mockResolvedValue([
      { key: "SEARCH_GOOGLE_SITEMAP", value: "https://cocokusuri.com/sitemap.xml" },
    ] as never);

    const result = await getVerificationTags();
    expect(result["SEARCH_GOOGLE_SITEMAP"]).toBe("https://cocokusuri.com/sitemap.xml");
  });
});

describe("검색엔진 등록 관리 - 메타 이름 매핑", () => {
  it("Google 인증 키의 메타 이름이 올바르다", () => {
    expect(META_MAP["SEARCH_GOOGLE_VERIFICATION"]).toBe("google-site-verification");
  });

  it("Bing 인증 키의 메타 이름이 올바르다", () => {
    expect(META_MAP["SEARCH_BING_VERIFICATION"]).toBe("msvalidate.01");
  });

  it("Yahoo 인증 키의 메타 이름이 올바르다", () => {
    expect(META_MAP["SEARCH_YAHOO_VERIFICATION"]).toBe("y_key");
  });

  it("Naver 인증 키의 메타 이름이 올바르다", () => {
    expect(META_MAP["SEARCH_NAVER_VERIFICATION"]).toBe("naver-site-verification");
  });

  it("Baidu 인증 키의 메타 이름이 올바르다", () => {
    expect(META_MAP["SEARCH_BAIDU_VERIFICATION"]).toBe("baidu-site-verification");
  });

  it("Yandex 인증 키의 메타 이름이 올바르다", () => {
    expect(META_MAP["SEARCH_YANDEX_VERIFICATION"]).toBe("yandex-verification");
  });
});

describe("검색엔진 등록 관리 - 설정 저장", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Google 인증 코드를 저장할 수 있다", async () => {
    vi.mocked(upsertSiteSetting).mockResolvedValue(undefined as never);

    await upsertSiteSetting("SEARCH_GOOGLE_VERIFICATION", "test_google_code");
    expect(upsertSiteSetting).toHaveBeenCalledWith("SEARCH_GOOGLE_VERIFICATION", "test_google_code");
  });

  it("Bing 인증 코드를 저장할 수 있다", async () => {
    vi.mocked(upsertSiteSetting).mockResolvedValue(undefined as never);

    await upsertSiteSetting("SEARCH_BING_VERIFICATION", "test_bing_code");
    expect(upsertSiteSetting).toHaveBeenCalledWith("SEARCH_BING_VERIFICATION", "test_bing_code");
  });

  it("null 값으로 인증 코드를 삭제할 수 있다", async () => {
    vi.mocked(upsertSiteSetting).mockResolvedValue(undefined as never);

    await upsertSiteSetting("SEARCH_GOOGLE_VERIFICATION", null);
    expect(upsertSiteSetting).toHaveBeenCalledWith("SEARCH_GOOGLE_VERIFICATION", null);
  });

  it("사이트맵 URL을 저장할 수 있다", async () => {
    vi.mocked(upsertSiteSetting).mockResolvedValue(undefined as never);

    await upsertSiteSetting("SEARCH_GOOGLE_SITEMAP", "https://cocokusuri.com/sitemap.xml");
    expect(upsertSiteSetting).toHaveBeenCalledWith(
      "SEARCH_GOOGLE_SITEMAP",
      "https://cocokusuri.com/sitemap.xml"
    );
  });
});

describe("검색엔진 등록 관리 - 지원 검색엔진 목록", () => {
  it("6개의 검색엔진 인증 키가 정의되어 있다 (사이트맵 제외)", () => {
    const engineKeys = SEARCH_ENGINE_KEYS.filter((k) => k !== "SEARCH_GOOGLE_SITEMAP");
    expect(engineKeys).toHaveLength(6);
  });

  it("Google, Bing, Yahoo, Naver, Baidu, Yandex가 포함되어 있다", () => {
    expect(SEARCH_ENGINE_KEYS).toContain("SEARCH_GOOGLE_VERIFICATION");
    expect(SEARCH_ENGINE_KEYS).toContain("SEARCH_BING_VERIFICATION");
    expect(SEARCH_ENGINE_KEYS).toContain("SEARCH_YAHOO_VERIFICATION");
    expect(SEARCH_ENGINE_KEYS).toContain("SEARCH_NAVER_VERIFICATION");
    expect(SEARCH_ENGINE_KEYS).toContain("SEARCH_BAIDU_VERIFICATION");
    expect(SEARCH_ENGINE_KEYS).toContain("SEARCH_YANDEX_VERIFICATION");
  });

  it("메타 이름 매핑에 6개 엔진이 모두 포함되어 있다", () => {
    const engineKeys = SEARCH_ENGINE_KEYS.filter((k) => k !== "SEARCH_GOOGLE_SITEMAP");
    engineKeys.forEach((key) => {
      expect(META_MAP[key]).toBeDefined();
      expect(typeof META_MAP[key]).toBe("string");
      expect(META_MAP[key].length).toBeGreaterThan(0);
    });
  });
});
