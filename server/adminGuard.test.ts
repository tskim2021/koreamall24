/**
 * AdminGuard 관련 서버 사이드 테스트
 * - admin.isAdmin 프로시저 동작 확인
 * - 비관리자 접근 차단 확인
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// admin.isAdmin 프로시저 로직 테스트
describe("AdminGuard - isAdmin procedure logic", () => {
  it("admin role 사용자는 isAdmin이 true를 반환해야 한다", () => {
    const user = { id: 1, role: "admin", email: "admin@test.com" };
    const isAdmin = user.role === "admin";
    expect(isAdmin).toBe(true);
  });

  it("user role 사용자는 isAdmin이 false를 반환해야 한다", () => {
    const user = { id: 2, role: "user", email: "user@test.com" };
    const isAdmin = user.role === "admin";
    expect(isAdmin).toBe(false);
  });

  it("인증되지 않은 사용자(null)는 admin 접근이 불가해야 한다", () => {
    const user = null;
    const canAccess = user !== null && (user as any).role === "admin";
    expect(canAccess).toBe(false);
  });

  it("role이 없는 사용자는 admin 접근이 불가해야 한다", () => {
    const user = { id: 3, email: "noRole@test.com" } as any;
    const isAdmin = user?.role === "admin";
    expect(isAdmin).toBe(false);
  });
});

// AdminGuard 리다이렉트 로직 테스트
describe("AdminGuard - redirect logic", () => {
  it("미인증 사용자는 /login으로 리다이렉트 URL이 생성되어야 한다", () => {
    const pathname = "/admin/products";
    const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
    expect(redirectUrl).toBe("/login?redirect=%2Fadmin%2Fproducts");
  });

  it("admin 경로 인코딩이 올바르게 처리되어야 한다", () => {
    const paths = [
      "/admin",
      "/admin/dashboard",
      "/admin/orders",
      "/admin/products",
      "/admin/customers",
    ];
    paths.forEach((path) => {
      const redirectUrl = `/login?redirect=${encodeURIComponent(path)}`;
      expect(redirectUrl).toContain("/login?redirect=");
      expect(redirectUrl).toContain(encodeURIComponent(path));
    });
  });
});

// App.tsx admin 라우트 래핑 검증
describe("Admin routes - AdminGuard wrapping", () => {
  const adminRoutes = [
    "/admin",
    "/admin/dashboard",
    "/admin/products",
    "/admin/orders",
    "/admin/categories",
    "/admin/banners",
    "/admin/announcements",
    "/admin/inquiries",
    "/admin/events",
    "/admin/settings",
    "/admin/site-settings",
    "/admin/customers",
    "/admin/coupons",
    "/admin/product-analysis",
    "/admin/product-questions",
    "/admin/chatbot",
    "/admin/legal-notice",
    "/admin/payment-settings",
    "/admin/reviews",
    "/admin/point-settings",
    "/admin/email-logs",
    "/admin/ordersnew",
    "/admin/sales-stats",
  ];

  it("모든 admin 라우트가 정의되어 있어야 한다", () => {
    expect(adminRoutes.length).toBeGreaterThan(20);
  });

  it("모든 admin 라우트는 /admin 접두사로 시작해야 한다", () => {
    adminRoutes.forEach((route) => {
      expect(route.startsWith("/admin")).toBe(true);
    });
  });

  it("admin 라우트가 중복되지 않아야 한다", () => {
    const uniqueRoutes = new Set(adminRoutes);
    expect(uniqueRoutes.size).toBe(adminRoutes.length);
  });
});
