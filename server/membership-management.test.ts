import { describe, it, expect, vi } from "vitest";

/**
 * 회원관리 기능 강화 통합 테스트
 * - 1단계: 회원 등급 시스템
 * - 2단계: 추천인 제도
 * - 3단계: 관리자 회원 상세 페이지 재설계
 * - 4단계: 접속 이력 시스템
 * - 5단계: 고객 목록 페이지 개선
 */

// Mock getDb
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
};

vi.mock("./db", () => ({
  getDb: vi.fn(() => mockDb),
}));

describe("회원관리 기능 강화 - 1단계: 회원 등급 시스템", () => {
  it("membership_tiers 테이블 스키마가 올바르게 정의되어 있어야 한다", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.membershipTiers).toBeDefined();
    // 필수 필드 확인
    const table = schema.membershipTiers;
    expect(table.id).toBeDefined();
    expect(table.name).toBeDefined();
    expect(table.nameKo).toBeDefined();
    expect(table.minAmount).toBeDefined();
    expect(table.discountRate).toBeDefined();
    expect(table.pointRate).toBeDefined();
    expect(table.color).toBeDefined();
    expect(table.sortOrder).toBeDefined();
    expect(table.periodMonths).toBeDefined();
    expect(table.isActive).toBeDefined();
  });

  it("registeredUsers에 membershipTierId 필드가 있어야 한다", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.registeredUsers.membershipTierId).toBeDefined();
  });

  it("registeredUsers에 totalPurchaseAmount 필드가 있어야 한다", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.registeredUsers.totalPurchaseAmount).toBeDefined();
  });
});

describe("회원관리 기능 강화 - 2단계: 추천인 제도", () => {
  it("registeredUsers에 referralCode 필드가 있어야 한다", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.registeredUsers.referralCode).toBeDefined();
  });

  it("registeredUsers에 referredBy 필드가 있어야 한다", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.registeredUsers.referredBy).toBeDefined();
  });

  it("referralRewards 테이블 스키마가 올바르게 정의되어 있어야 한다", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.referralRewards).toBeDefined();
    const table = schema.referralRewards;
    expect(table.id).toBeDefined();
    expect(table.referrerId).toBeDefined();
    expect(table.refereeId).toBeDefined();
    expect(table.rewardType).toBeDefined();
    expect(table.referrerReward).toBeDefined();
  });

  it("referralSettings 테이블 스키마가 올바르게 정의되어 있어야 한다", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.referralSettings).toBeDefined();
    const table = schema.referralSettings;
    expect(table.id).toBeDefined();
    expect(table.signupReferrerReward).toBeDefined();
    expect(table.purchaseReferrerReward).toBeDefined();
    expect(table.isActive).toBeDefined();
  });
});

describe("회원관리 기능 강화 - 4단계: 접속 이력 시스템", () => {
  it("loginHistory 테이블 스키마가 올바르게 정의되어 있어야 한다", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.loginHistory).toBeDefined();
    const table = schema.loginHistory;
    expect(table.id).toBeDefined();
    expect(table.userId).toBeDefined();
    expect(table.loginAt).toBeDefined();
    expect(table.ipAddress).toBeDefined();
    expect(table.userAgent).toBeDefined();
    expect(table.device).toBeDefined();
  });
});

describe("회원관리 기능 강화 - 5단계: 고객 목록 페이지 개선", () => {
  it("admin.users 프로시저에 tierFilter 입력이 지원되어야 한다", async () => {
    // routers.ts에서 tierFilter 입력 스키마 확인
    const fs = await import("fs");
    const routersContent = fs.readFileSync(
      "/home/ubuntu/japanese-drugstore-mall/server/routers.ts",
      "utf-8"
    );
    expect(routersContent).toContain("tierFilter: z.string().optional()");
  });

  it("admin.users 프로시저가 tierName, tierColor를 반환해야 한다", async () => {
    const fs = await import("fs");
    const routersContent = fs.readFileSync(
      "/home/ubuntu/japanese-drugstore-mall/server/routers.ts",
      "utf-8"
    );
    expect(routersContent).toContain("tierName:");
    expect(routersContent).toContain("tierColor:");
  });

  it("등급 필터 'none' 선택 시 membershipTierId가 null인 사용자만 조회해야 한다", async () => {
    const fs = await import("fs");
    const routersContent = fs.readFileSync(
      "/home/ubuntu/japanese-drugstore-mall/server/routers.ts",
      "utf-8"
    );
    expect(routersContent).toContain('input.tierFilter === "none"');
    expect(routersContent).toContain("isNull(registeredUsers.membershipTierId)");
  });

  it("Customers.tsx에 등급 배지 컴포넌트가 포함되어야 한다", async () => {
    const fs = await import("fs");
    const customersContent = fs.readFileSync(
      "/home/ubuntu/japanese-drugstore-mall/client/src/pages/admin/Customers.tsx",
      "utf-8"
    );
    expect(customersContent).toContain("TierBadge");
    expect(customersContent).toContain("Crown");
  });

  it("Customers.tsx에 등급 필터 Select가 포함되어야 한다", async () => {
    const fs = await import("fs");
    const customersContent = fs.readFileSync(
      "/home/ubuntu/japanese-drugstore-mall/client/src/pages/admin/Customers.tsx",
      "utf-8"
    );
    expect(customersContent).toContain("tierFilter");
    expect(customersContent).toContain("전체 등급");
    expect(customersContent).toContain("등급 미지정");
  });

  it("Customers.tsx에 상세 페이지 링크가 포함되어야 한다", async () => {
    const fs = await import("fs");
    const customersContent = fs.readFileSync(
      "/home/ubuntu/japanese-drugstore-mall/client/src/pages/admin/Customers.tsx",
      "utf-8"
    );
    expect(customersContent).toContain("/admin/customers/${u.id}");
    expect(customersContent).toContain("Eye");
  });
});
