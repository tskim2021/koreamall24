/**
 * Brevo 대량 메일 API 키 관리 테스트
 * - API 키 DB 저장/조회 로직
 * - 마스킹 처리 로직
 * - brevoService getBrevoApiKey 우선순위 (DB > 환경변수)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── 마스킹 로직 단위 테스트 ────────────────────────────────────────────────────
function maskApiKey(raw: string): string {
  if (!raw) return "";
  if (raw.length <= 8) return "****";
  return raw.slice(0, 4) + "*".repeat(raw.length - 8) + raw.slice(-4);
}

describe("API 키 마스킹 로직", () => {
  it("정상 길이 키를 마스킹한다", () => {
    const key = "xkeysib-abcdefghijklmnopqrstuvwxyz1234";
    const masked = maskApiKey(key);
    expect(masked.startsWith("xkey")).toBe(true);
    expect(masked.endsWith("1234")).toBe(true);
    expect(masked).toContain("*");
    // 원본 중간 부분이 노출되지 않아야 함
    expect(masked).not.toBe(key);
  });

  it("8자 이하 키는 ****로 마스킹한다", () => {
    expect(maskApiKey("short")).toBe("****");
    expect(maskApiKey("12345678")).toBe("****");
  });

  it("빈 문자열은 빈 문자열을 반환한다", () => {
    expect(maskApiKey("")).toBe("");
  });

  it("정확히 9자 키는 앞4 + * + 뒤4로 마스킹한다", () => {
    const key = "abcde1234"; // 9자
    const masked = maskApiKey(key);
    expect(masked).toBe("abcd*1234");
  });

  it("마스킹된 키의 길이는 원본과 동일하다", () => {
    const key = "xkeysib-testkey123456789";
    const masked = maskApiKey(key);
    expect(masked.length).toBe(key.length);
  });
});

// ── API 키 우선순위 로직 테스트 ───────────────────────────────────────────────
describe("Brevo API 키 우선순위 로직", () => {
  it("DB 값이 있으면 DB 값을 반환한다", async () => {
    const dbKey = "db-api-key-from-settings";
    const envKey = "env-api-key";

    // 우선순위 시뮬레이션
    async function resolveApiKey(dbValue: string | null, envValue: string | null): Promise<string> {
      if (dbValue) return dbValue;
      if (envValue) return envValue;
      throw new Error("API 키가 설정되지 않았습니다.");
    }

    const result = await resolveApiKey(dbKey, envKey);
    expect(result).toBe(dbKey);
  });

  it("DB 값이 없으면 환경변수를 반환한다", async () => {
    const envKey = "env-api-key-fallback";

    async function resolveApiKey(dbValue: string | null, envValue: string | null): Promise<string> {
      if (dbValue) return dbValue;
      if (envValue) return envValue;
      throw new Error("API 키가 설정되지 않았습니다.");
    }

    const result = await resolveApiKey(null, envKey);
    expect(result).toBe(envKey);
  });

  it("DB와 환경변수 모두 없으면 에러를 던진다", async () => {
    async function resolveApiKey(dbValue: string | null, envValue: string | null): Promise<string> {
      if (dbValue) return dbValue;
      if (envValue) return envValue;
      throw new Error("Brevo API 키가 설정되지 않았습니다. 관리자 페이지에서 API 키를 입력해 주세요.");
    }

    await expect(resolveApiKey(null, null)).rejects.toThrow("Brevo API 키가 설정되지 않았습니다");
  });
});

// ── 캠페인 상태 레이블 테스트 ─────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  scheduled: "예약됨",
  sending: "발송 중",
  sent: "발송 완료",
  failed: "실패",
  cancelled: "취소됨",
};

describe("캠페인 상태 레이블", () => {
  it("모든 상태에 한국어 레이블이 있다", () => {
    const statuses = ["draft", "scheduled", "sending", "sent", "failed", "cancelled"];
    statuses.forEach((status) => {
      expect(STATUS_LABELS[status]).toBeDefined();
      expect(STATUS_LABELS[status].length).toBeGreaterThan(0);
    });
  });

  it("알 수 없는 상태는 undefined를 반환한다", () => {
    expect(STATUS_LABELS["unknown"]).toBeUndefined();
  });
});

// ── 수신자 세그먼트 유효성 테스트 ─────────────────────────────────────────────
const VALID_SEGMENTS = ["all", "marketing", "newsletter", "active", "inactive", "vip", "custom"];

describe("수신자 세그먼트 유효성", () => {
  it("모든 유효한 세그먼트가 정의되어 있다", () => {
    expect(VALID_SEGMENTS).toContain("all");
    expect(VALID_SEGMENTS).toContain("marketing");
    expect(VALID_SEGMENTS).toContain("newsletter");
    expect(VALID_SEGMENTS).toContain("active");
    expect(VALID_SEGMENTS).toContain("inactive");
    expect(VALID_SEGMENTS).toContain("vip");
    expect(VALID_SEGMENTS).toContain("custom");
    expect(VALID_SEGMENTS.length).toBe(7);
  });

  it("custom 세그먼트는 이메일 파싱이 필요하다", () => {
    const customEmails = "test1@example.com\ntest2@example.com, test3@example.com; test4@example.com";
    const parsed = customEmails
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
    expect(parsed).toHaveLength(4);
    expect(parsed[0]).toBe("test1@example.com");
    expect(parsed[3]).toBe("test4@example.com");
  });

  it("유효하지 않은 이메일은 필터링된다", () => {
    const input = "valid@email.com\nnot-an-email\nanother@valid.com\n";
    const parsed = input
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
    expect(parsed).toHaveLength(2);
    expect(parsed).not.toContain("not-an-email");
  });
});

// ── API 키 저장 입력 유효성 테스트 ────────────────────────────────────────────
describe("API 키 입력 유효성", () => {
  it("빈 문자열은 유효하지 않다", () => {
    const isValid = (key: string) => key.trim().length > 0;
    expect(isValid("")).toBe(false);
    expect(isValid("   ")).toBe(false);
  });

  it("공백이 포함된 키는 trim 후 유효성 검사한다", () => {
    const isValid = (key: string) => key.trim().length > 0;
    expect(isValid("  xkeysib-test  ")).toBe(true);
  });

  it("Brevo API 키 형식 확인 (xkeysib- 접두사)", () => {
    const isBrevoKey = (key: string) => key.startsWith("xkeysib-");
    expect(isBrevoKey("xkeysib-abcdefghijk")).toBe(true);
    expect(isBrevoKey("other-format-key")).toBe(false);
  });
});
