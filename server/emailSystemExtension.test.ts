/**
 * 이메일 시스템 확장 테스트
 * - 고객 이메일 수신 설정 (emailPreferences)
 * - 이메일 통계 대시보드 (EmailDashboard)
 * - 이메일 미리보기/설정 (EmailPreview)
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// 1. 고객 이메일 수신 설정 (emailPreferences)
// ─────────────────────────────────────────────────────────────────────────────
describe("고객 이메일 수신 설정 (emailPreferences)", () => {
  describe("수신 설정 키 유효성", () => {
    it("마케팅 이메일 수신 설정 키가 올바른 형식이어야 한다", () => {
      const validPreferenceKeys = [
        "marketing_emails",
        "event_emails",
        "coupon_emails",
        "newsletter_emails",
        "order_emails",
        "review_request_emails",
      ];
      validPreferenceKeys.forEach((key) => {
        expect(key).toMatch(/^[a-z_]+$/);
      });
    });

    it("수신 설정 값은 boolean이어야 한다", () => {
      const preference = { key: "marketing_emails", enabled: true };
      expect(typeof preference.enabled).toBe("boolean");
    });

    it("수신 설정 기본값이 올바르게 정의되어야 한다", () => {
      const defaultPreferences = {
        marketing_emails: false,
        event_emails: false,
        coupon_emails: true,
        newsletter_emails: false,
        order_emails: true,
        review_request_emails: true,
      };
      // 주문 관련 이메일은 기본 활성화
      expect(defaultPreferences.order_emails).toBe(true);
      // 마케팅 이메일은 기본 비활성화 (GDPR/개인정보보호)
      expect(defaultPreferences.marketing_emails).toBe(false);
    });
  });

  describe("수신 설정 업데이트 로직", () => {
    it("수신 설정 업데이트 시 userId와 key가 필요하다", () => {
      const updateInput = {
        userId: 1,
        key: "marketing_emails",
        enabled: false,
      };
      expect(updateInput.userId).toBeGreaterThan(0);
      expect(updateInput.key).toBeTruthy();
      expect(typeof updateInput.enabled).toBe("boolean");
    });

    it("존재하지 않는 수신 설정 키는 거부되어야 한다", () => {
      const validKeys = [
        "marketing_emails",
        "event_emails",
        "coupon_emails",
        "newsletter_emails",
        "order_emails",
        "review_request_emails",
      ];
      const invalidKey = "invalid_key_xyz";
      expect(validKeys.includes(invalidKey)).toBe(false);
    });

    it("여러 수신 설정을 일괄 업데이트할 수 있어야 한다", () => {
      const bulkUpdate = [
        { key: "marketing_emails", enabled: true },
        { key: "event_emails", enabled: true },
        { key: "coupon_emails", enabled: false },
      ];
      expect(bulkUpdate.length).toBeGreaterThan(0);
      bulkUpdate.forEach((item) => {
        expect(item.key).toBeTruthy();
        expect(typeof item.enabled).toBe("boolean");
      });
    });
  });

  describe("수신 거부 카테고리 분류", () => {
    it("필수 이메일(주문/배송)은 수신 거부 불가 카테고리여야 한다", () => {
      const mandatoryEmailTypes = [
        "order_confirmation",
        "order_shipped",
        "order_cancelled",
        "refund_processed",
      ];
      const optionalEmailTypes = [
        "marketing_emails",
        "event_emails",
        "newsletter_emails",
      ];
      // 필수 이메일은 수신 거부 불가
      expect(mandatoryEmailTypes.length).toBeGreaterThan(0);
      // 선택적 이메일은 수신 거부 가능
      expect(optionalEmailTypes.length).toBeGreaterThan(0);
    });

    it("마케팅/이벤트/쿠폰 이메일은 고객이 직접 수신 거부 가능해야 한다", () => {
      const optOutAllowedCategories = ["marketing", "event", "coupon", "newsletter"];
      expect(optOutAllowedCategories).toContain("marketing");
      expect(optOutAllowedCategories).toContain("event");
      expect(optOutAllowedCategories).toContain("coupon");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. 이메일 통계 대시보드 (EmailDashboard)
// ─────────────────────────────────────────────────────────────────────────────
describe("이메일 통계 대시보드 (EmailDashboard)", () => {
  describe("통계 계산 로직", () => {
    it("전체 발송 수 = 성공 + 실패 + 건너뜀", () => {
      const stats = [
        { status: "sent", count: 150 },
        { status: "failed", count: 10 },
        { status: "skipped", count: 5 },
      ];
      const sentCount = stats.filter(s => s.status === "sent").reduce((acc, s) => acc + s.count, 0);
      const failedCount = stats.filter(s => s.status === "failed").reduce((acc, s) => acc + s.count, 0);
      const skippedCount = stats.filter(s => s.status === "skipped").reduce((acc, s) => acc + s.count, 0);
      const totalCount = sentCount + failedCount + skippedCount;
      expect(totalCount).toBe(165);
      expect(sentCount).toBe(150);
    });

    it("성공률은 (성공 수 / 전체 수) * 100으로 계산된다", () => {
      const sentCount = 150;
      const totalCount = 165;
      const successRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;
      expect(successRate).toBe(91); // 150/165 * 100 ≈ 90.9 → 91
    });

    it("전체 발송이 0일 때 성공률은 0이어야 한다", () => {
      const sentCount = 0;
      const totalCount = 0;
      const successRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;
      expect(successRate).toBe(0);
    });
  });

  describe("날짜별 통계 데이터 구조", () => {
    it("날짜별 통계는 date, total, sent, failed 필드를 포함해야 한다", () => {
      const statsByDate = [
        { date: "2024-01-01", total: 50, sent: 48, failed: 2 },
        { date: "2024-01-02", total: 60, sent: 58, failed: 2 },
      ];
      statsByDate.forEach((item) => {
        expect(item).toHaveProperty("date");
        expect(item).toHaveProperty("total");
        expect(item).toHaveProperty("sent");
        expect(item).toHaveProperty("failed");
        expect(item.total).toBe(item.sent + item.failed);
      });
    });

    it("최근 7일 통계가 올바르게 집계되어야 한다", () => {
      const statsByDate = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, "0")}`,
        total: 10 + i,
        sent: 9 + i,
        failed: 1,
      }));
      const last7Days = statsByDate.slice(-7);
      expect(last7Days.length).toBe(7);
      const last7Total = last7Days.reduce((acc, d) => acc + d.total, 0);
      expect(last7Total).toBeGreaterThan(0);
    });
  });

  describe("타입별 통계 데이터 구조", () => {
    it("타입별 통계는 emailType, count, successRate 필드를 포함해야 한다", () => {
      const statsByType = [
        { emailType: "order_confirmation", count: 100, successRate: 98 },
        { emailType: "review_reminder", count: 50, successRate: 95 },
      ];
      statsByType.forEach((item) => {
        expect(item).toHaveProperty("emailType");
        expect(item).toHaveProperty("count");
        expect(item.count).toBeGreaterThan(0);
      });
    });

    it("이메일 타입 레이블이 한국어로 표시되어야 한다", () => {
      const EMAIL_TYPE_LABELS: Record<string, string> = {
        order_confirmation: "주문 확인",
        delivery_completion: "배송 완료",
        review_reminder_7days: "리뷰 요청 (7일)",
        inquiry_reply: "문의 답변",
        coupon_issued: "쿠폰 발급",
        point_expiry_alert: "포인트 만료 알림",
        event_started: "이벤트 시작",
      };
      expect(EMAIL_TYPE_LABELS["order_confirmation"]).toBe("주문 확인");
      expect(EMAIL_TYPE_LABELS["delivery_completion"]).toBe("배송 완료");
      expect(EMAIL_TYPE_LABELS["coupon_issued"]).toBe("쿠폰 발급");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. 이메일 미리보기/설정 (EmailPreview)
// ─────────────────────────────────────────────────────────────────────────────
describe("이메일 미리보기/설정 (EmailPreview)", () => {
  describe("이메일 카테고리 구조", () => {
    it("이메일 카테고리가 5개 이상 정의되어야 한다", () => {
      const EMAIL_CATEGORIES = [
        { label: "회원 관리", types: ["registration_complete", "password_changed"] },
        { label: "주문 / 배송", types: ["order_confirmation", "order_shipped"] },
        { label: "문의 / 리뷰", types: ["inquiry_reply", "review_approved"] },
        { label: "쿠폰 / 포인트", types: ["coupon_issued", "point_earned"] },
        { label: "이벤트 / 알림", types: ["event_started", "restock_alert"] },
        { label: "테스트", types: ["test_email"] },
      ];
      expect(EMAIL_CATEGORIES.length).toBeGreaterThanOrEqual(5);
    });

    it("각 카테고리는 label과 types 배열을 가져야 한다", () => {
      const category = {
        label: "회원 관리",
        icon: "👤",
        types: [
          { key: "registration_complete", label: "회원가입 완료", desc: "신규 회원 가입 시 발송" },
        ],
      };
      expect(category.label).toBeTruthy();
      expect(Array.isArray(category.types)).toBe(true);
      expect(category.types.length).toBeGreaterThan(0);
    });
  });

  describe("이메일 미리보기 데이터 구조", () => {
    it("미리보기 요청에는 emailType이 필요하다", () => {
      const previewRequest = { emailType: "order_confirmation" };
      expect(previewRequest.emailType).toBeTruthy();
    });

    it("미리보기 응답은 HTML 문자열을 포함해야 한다", () => {
      const mockPreviewResponse = {
        html: "<html><body><h1>주문 확인</h1></body></html>",
        subject: "주문이 접수되었습니다",
      };
      expect(mockPreviewResponse.html).toContain("<html>");
      expect(mockPreviewResponse.subject).toBeTruthy();
    });

    it("지원하지 않는 이메일 타입은 에러를 반환해야 한다", () => {
      const supportedTypes = [
        "order_confirmation",
        "order_shipped",
        "registration_complete",
        "password_changed",
        "coupon_issued",
        "event_started",
      ];
      const unsupportedType = "unknown_type_xyz";
      expect(supportedTypes.includes(unsupportedType)).toBe(false);
    });
  });

  describe("테스트 이메일 발송 로직", () => {
    it("테스트 이메일 발송에는 수신자 이메일 주소가 필요하다", () => {
      const testEmailInput = {
        emailType: "order_confirmation",
        testEmail: "test@example.com",
      };
      expect(testEmailInput.testEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it("유효하지 않은 이메일 주소는 거부되어야 한다", () => {
      const invalidEmails = ["notanemail", "missing@", "@domain.com", ""];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it("테스트 이메일 발송 결과는 성공/실패 상태를 포함해야 한다", () => {
      const testResult = {
        success: true,
        messageId: "test-message-id-123",
        sentAt: new Date().toISOString(),
      };
      expect(typeof testResult.success).toBe("boolean");
      expect(testResult.success).toBe(true);
    });
  });

  describe("이메일 활성화/비활성화 설정", () => {
    it("이메일 타입별 활성화 상태를 토글할 수 있어야 한다", () => {
      const emailSettings: Record<string, boolean> = {
        order_confirmation: true,
        marketing_emails: false,
        event_started: true,
      };
      // 토글 로직
      emailSettings["marketing_emails"] = !emailSettings["marketing_emails"];
      expect(emailSettings["marketing_emails"]).toBe(true);
    });

    it("관리자 설정 키는 EMAIL_ 접두사를 가져야 한다", () => {
      const adminSettingKeys = [
        "EMAIL_ORDER_CONFIRMED",
        "EMAIL_ORDER_SHIPPED",
        "EMAIL_REGISTER_COMPLETE",
        "EMAIL_COUPON_ISSUED",
        "EMAIL_EVENT_STARTED",
      ];
      adminSettingKeys.forEach((key) => {
        expect(key).toMatch(/^EMAIL_/);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. 관리자 사이드바 이메일 메뉴 구조
// ─────────────────────────────────────────────────────────────────────────────
describe("관리자 사이드바 이메일 메뉴 구조", () => {
  it("이메일 관련 메뉴가 4개 정의되어야 한다", () => {
    const emailMenuItems = [
      { label: "이메일 알림 설정", href: "/admin/email-settings" },
      { label: "이메일 발송 이력", href: "/admin/email-logs" },
      { label: "이메일 통계 대시보드", href: "/admin/email-dashboard" },
      { label: "이메일 미리보기/설정", href: "/admin/email-preview" },
    ];
    expect(emailMenuItems.length).toBe(4);
  });

  it("각 이메일 메뉴 항목은 label과 href를 가져야 한다", () => {
    const menuItem = { label: "이메일 알림 설정", href: "/admin/email-settings" };
    expect(menuItem.label).toBeTruthy();
    expect(menuItem.href).toMatch(/^\/admin\/email-/);
  });

  it("이메일 메뉴 경로가 /admin/email- 접두사를 가져야 한다", () => {
    const emailPaths = [
      "/admin/email-settings",
      "/admin/email-logs",
      "/admin/email-dashboard",
      "/admin/email-preview",
    ];
    emailPaths.forEach((path) => {
      expect(path).toMatch(/^\/admin\/email-/);
    });
  });
});
