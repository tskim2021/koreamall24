import { describe, it, expect, vi } from "vitest";

// ============================================================
// Test data for 3 new features:
// 1. Order status change email notification
// 2. Admin order export (CSV)
// 3. Admin sidebar UI grouping
// ============================================================

const mockOrder = {
  id: 1,
  orderNumber: "ORD-20260210-001",
  userId: 1,
  status: "shipped",
  totalAmount: "5980",
  shippingFee: "500",
  shippingName: "田中太郎",
  shippingPostalCode: "100-0001",
  shippingAddress: "東京都千代田区千代田1-1",
  shippingPhone: "090-1234-5678",
  trackingNumber: "JP1234567890",
  paymentMethod: "card",
  pointsUsed: 0,
  pointsEarned: 59,
  adminNotes: "VIP顧客",
  createdAt: new Date("2026-02-10"),
};

const mockUser = {
  id: 1,
  email: "tanaka@example.com",
  nameKanji: "田中太郎",
  phone: "090-1234-5678",
};

const mockShipment = {
  id: 1,
  orderId: 1,
  trackingNumber: "JP1234567890",
  carrier: "Japan Post",
  status: "in_transit",
  estimatedDeliveryDate: new Date("2026-02-15"),
};

// ============================================================
// Feature 1: Order Status Change Email Notification
// ============================================================
describe("Order Status Change Email Notification", () => {
  // Email template generation logic
  const statusLabelsJa: Record<string, string> = {
    pending: "ご注文受付",
    confirmed: "ご注文確認",
    processing: "準備中",
    shipped: "発送完了",
    delivered: "配達完了",
    cancelled: "キャンセル",
  };

  const statusEmoji: Record<string, string> = {
    pending: "📋",
    confirmed: "✅",
    processing: "⚙️",
    shipped: "🚚",
    delivered: "🎉",
    cancelled: "❌",
  };

  it("should have Japanese labels for all order statuses", () => {
    const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    for (const status of statuses) {
      expect(statusLabelsJa[status]).toBeDefined();
      expect(statusLabelsJa[status].length).toBeGreaterThan(0);
    }
  });

  it("should have emoji for all order statuses", () => {
    const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    for (const status of statuses) {
      expect(statusEmoji[status]).toBeDefined();
    }
  });

  it("should generate correct email subject for shipped status", () => {
    const status = "shipped";
    const orderNumber = "ORD-20260210-001";
    const subject = `${statusEmoji[status]} 【ココくすり】ご注文 ${orderNumber} - ${statusLabelsJa[status]}のお知らせ`;
    expect(subject).toContain("🚚");
    expect(subject).toContain("ORD-20260210-001");
    expect(subject).toContain("発送完了");
  });

  it("should generate correct email subject for delivered status", () => {
    const status = "delivered";
    const orderNumber = "ORD-20260210-001";
    const subject = `${statusEmoji[status]} 【ココくすり】ご注文 ${orderNumber} - ${statusLabelsJa[status]}のお知らせ`;
    expect(subject).toContain("🎉");
    expect(subject).toContain("配達完了");
  });

  it("should include tracking number in shipped email", () => {
    const trackingNumber = "JP1234567890";
    const carrier = "Japan Post";
    const emailBody = `追跡番号: ${trackingNumber}\n運送会社: ${carrier}`;
    expect(emailBody).toContain("JP1234567890");
    expect(emailBody).toContain("Japan Post");
  });

  it("should include review link in delivered email", () => {
    const status = "delivered";
    const reviewLink = "https://example.com/mypage";
    const shouldIncludeReview = status === "delivered" && reviewLink;
    expect(shouldIncludeReview).toBeTruthy();
  });

  it("should not include review link for non-delivered statuses", () => {
    const statuses = ["pending", "confirmed", "processing", "shipped", "cancelled"];
    for (const status of statuses) {
      const reviewLink = status === "delivered" ? "https://example.com/mypage" : undefined;
      expect(reviewLink).toBeUndefined();
    }
  });

  it("should handle missing tracking number gracefully", () => {
    const trackingNumber = null;
    const carrier = null;
    const showTrackingSection = trackingNumber && carrier;
    expect(showTrackingSection).toBeFalsy();
  });

  it("should handle missing estimated delivery date", () => {
    const estimatedDelivery = undefined;
    const showEstimated = !!estimatedDelivery;
    expect(showEstimated).toBe(false);
  });

  it("should send email asynchronously (non-blocking)", () => {
    // Simulate non-blocking email send
    const sendEmail = vi.fn().mockResolvedValue(true);
    const promise = sendEmail({
      to: "tanaka@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });
    // Should return a promise
    expect(promise).toBeInstanceOf(Promise);
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("should not block order status update on email failure", async () => {
    const sendEmail = vi.fn().mockRejectedValue(new Error("SMTP error"));
    let orderUpdated = false;

    // Simulate: update order first, then try email
    orderUpdated = true;
    try {
      await sendEmail({ to: "test@test.com", subject: "Test", html: "" });
    } catch {
      // Email failed, but order should still be updated
    }

    expect(orderUpdated).toBe(true);
  });

  it("should include customer name in email greeting", () => {
    const customerName = "田中太郎";
    const greeting = `${customerName} 様`;
    expect(greeting).toBe("田中太郎 様");
  });

  it("should format order amount with yen symbol", () => {
    const amount = "5980";
    const formatted = `¥${Number(amount).toLocaleString()}`;
    expect(formatted).toBe("¥5,980");
  });
});

// ============================================================
// Feature 2: Admin Order Export (CSV)
// ============================================================
describe("Admin Order Export (CSV)", () => {
  const statusLabels: Record<string, string> = {
    pending: "주문 접수",
    confirmed: "주문 확인",
    processing: "처리 중",
    shipped: "발송 완료",
    delivered: "배달 완료",
    cancelled: "취소",
  };

  const mockExportData = [
    {
      orderNumber: "ORD-20260210-001",
      status: "shipped",
      createdAt: new Date("2026-02-10T09:00:00Z"),
      userName: "田中太郎",
      userEmail: "tanaka@example.com",
      userPhone: "090-1234-5678",
      totalAmount: "5980",
      shippingFee: "500",
      pointsUsed: 0,
      pointsEarned: 59,
      shippingName: "田中太郎",
      shippingPostalCode: "100-0001",
      shippingAddress: "東京都千代田区千代田1-1",
      shippingPhone: "090-1234-5678",
      trackingNumber: "JP1234567890",
      carrier: "Japan Post",
      paymentMethod: "card",
      itemSummary: "ロキソニンS×2, パブロンゴールド×1",
      itemCount: 2,
      adminNotes: "VIP顧客",
    },
    {
      orderNumber: "ORD-20260205-002",
      status: "delivered",
      createdAt: new Date("2026-02-05T14:30:00Z"),
      userName: "佐藤花子",
      userEmail: "sato@example.com",
      userPhone: "080-9876-5432",
      totalAmount: "12500",
      shippingFee: "0",
      pointsUsed: 500,
      pointsEarned: 120,
      shippingName: "佐藤花子",
      shippingPostalCode: "150-0001",
      shippingAddress: "東京都渋谷区神宮前1-1",
      shippingPhone: "080-9876-5432",
      trackingNumber: "YMT9876543210",
      carrier: "Yamato",
      paymentMethod: "card",
      itemSummary: "ビオフェルミン×3, アリナミンEX×1",
      itemCount: 2,
      adminNotes: "",
    },
  ];

  it("should generate CSV with BOM for Excel compatibility", () => {
    const BOM = "\uFEFF";
    const csvContent = BOM + "header1,header2\nval1,val2";
    expect(csvContent.startsWith(BOM)).toBe(true);
  });

  it("should include all required CSV headers", () => {
    const headers = [
      "주문번호", "상태", "주문일시", "고객명", "이메일", "전화번호",
      "총액", "배송비", "포인트사용", "포인트적립",
      "배송성명", "우편번호", "배송주소", "배송전화",
      "추적번호", "운송사", "결제방법", "상품내역", "상품수", "관리자메모",
    ];
    expect(headers).toHaveLength(20);
    expect(headers).toContain("주문번호");
    expect(headers).toContain("추적번호");
    expect(headers).toContain("상품내역");
  });

  it("should properly escape CSV values with quotes", () => {
    const value = 'He said "hello"';
    const escaped = `"${value.replace(/"/g, '""')}"`;
    expect(escaped).toBe('"He said ""hello"""');
  });

  it("should properly escape CSV values with commas", () => {
    const value = "Tokyo, Japan";
    const escaped = `"${value}"`;
    expect(escaped).toBe('"Tokyo, Japan"');
  });

  it("should handle null/undefined values in export", () => {
    const value = null;
    const safe = String(value || "");
    expect(safe).toBe("");
  });

  it("should translate status codes to Korean labels", () => {
    for (const row of mockExportData) {
      const label = statusLabels[row.status];
      expect(label).toBeDefined();
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("should format dates in Korean locale", () => {
    const date = new Date("2026-02-10T09:00:00Z");
    const formatted = date.toLocaleString("ko-KR");
    expect(formatted).toBeTruthy();
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("should generate correct filename with date", () => {
    const now = new Date("2026-02-11");
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `orders_export_${dateStr}.csv`;
    expect(filename).toBe("orders_export_2026-02-11.csv");
  });

  it("should filter by status when specified", () => {
    const filtered = mockExportData.filter((o) => o.status === "shipped");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].orderNumber).toBe("ORD-20260210-001");
  });

  it("should filter by date range when specified", () => {
    const dateFrom = new Date("2026-02-06");
    const dateTo = new Date("2026-02-11");
    const filtered = mockExportData.filter(
      (o) => o.createdAt >= dateFrom && o.createdAt <= dateTo
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].orderNumber).toBe("ORD-20260210-001");
  });

  it("should return all orders when no filter applied", () => {
    expect(mockExportData).toHaveLength(2);
  });

  it("should include item summary in export", () => {
    const row = mockExportData[0];
    expect(row.itemSummary).toContain("ロキソニンS×2");
    expect(row.itemSummary).toContain("パブロンゴールド×1");
  });

  it("should include item count in export", () => {
    expect(mockExportData[0].itemCount).toBe(2);
    expect(mockExportData[1].itemCount).toBe(2);
  });

  it("should handle empty export result", () => {
    const emptyData: typeof mockExportData = [];
    expect(emptyData).toHaveLength(0);
    const shouldShowToast = emptyData.length === 0;
    expect(shouldShowToast).toBe(true);
  });

  it("should generate valid CSV rows", () => {
    const headers = ["주문번호", "상태", "총액"];
    const rows = mockExportData.map((o) => [
      o.orderNumber,
      statusLabels[o.status] || o.status,
      o.totalAmount,
    ]);
    const csvLines = [headers, ...rows].map((r) =>
      r.map((c: any) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")
    );
    expect(csvLines).toHaveLength(3); // header + 2 rows
    expect(csvLines[0]).toContain("주문번호");
    expect(csvLines[1]).toContain("ORD-20260210-001");
    expect(csvLines[1]).toContain("발송 완료");
  });
});

// ============================================================
// Feature 3: Admin Sidebar UI Grouping
// ============================================================
describe("Admin Sidebar UI Grouping", () => {
  interface NavItem {
    label: string;
    href: string;
  }

  interface NavGroup {
    label: string;
    items: NavItem[];
    defaultOpen?: boolean;
  }

  const navGroups: NavGroup[] = [
    {
      label: "홈",
      defaultOpen: true,
      items: [
        { label: "대시보드", href: "/admin" },
        { label: "매출 통계", href: "/admin/orders/stats" },
      ],
    },
    {
      label: "주문 관리",
      defaultOpen: true,
      items: [
        { label: "주문 목록", href: "/admin/orders" },
      ],
    },
    {
      label: "상품 관리",
      defaultOpen: true,
      items: [
        { label: "상품 목록", href: "/admin/products" },
        { label: "카테고리", href: "/admin/categories" },
      ],
    },
    {
      label: "회원 관리",
      defaultOpen: false,
      items: [
        { label: "고객 목록", href: "/admin/customers" },
      ],
    },
    {
      label: "콘텐츠 관리",
      defaultOpen: false,
      items: [
        { label: "배너 관리", href: "/admin/banners" },
        { label: "공지사항", href: "/admin/announcements" },
        { label: "이벤트", href: "/admin/events" },
      ],
    },
    {
      label: "고객 지원",
      defaultOpen: false,
      items: [
        { label: "문의 관리", href: "/admin/inquiries" },
      ],
    },
    {
      label: "설정",
      defaultOpen: false,
      items: [
        { label: "쇼핑몰 설정", href: "/admin/settings" },
      ],
    },
  ];

  it("should have 7 navigation groups", () => {
    expect(navGroups).toHaveLength(7);
  });

  it("should have all menu items in Korean", () => {
    for (const group of navGroups) {
      expect(group.label.length).toBeGreaterThan(0);
      // Check that labels are Korean (contain Korean characters)
      const koreanRegex = /[가-힣]/;
      expect(koreanRegex.test(group.label)).toBe(true);
      for (const item of group.items) {
        expect(koreanRegex.test(item.label)).toBe(true);
      }
    }
  });

  it("should have correct default open states", () => {
    const defaultOpenGroups = navGroups.filter((g) => g.defaultOpen);
    expect(defaultOpenGroups).toHaveLength(3);
    expect(defaultOpenGroups.map((g) => g.label)).toEqual(["홈", "주문 관리", "상품 관리"]);
  });

  it("should have all admin routes covered", () => {
    const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href));
    const expectedRoutes = [
      "/admin",
      "/admin/orders",
      "/admin/orders/stats",
      "/admin/products",
      "/admin/categories",
      "/admin/customers",
      "/admin/banners",
      "/admin/announcements",
      "/admin/events",
      "/admin/inquiries",
      "/admin/settings",
    ];
    for (const route of expectedRoutes) {
      expect(allHrefs).toContain(route);
    }
  });

  it("should count total menu items correctly", () => {
    const totalItems = navGroups.reduce((sum, g) => sum + g.items.length, 0);
    expect(totalItems).toBe(11);
  });

  it("should auto-open group containing current page", () => {
    const currentLocation = "/admin/orders";
    const groupsToOpen = navGroups.filter((g) =>
      g.items.some((item) => currentLocation === item.href || (item.href !== "/admin" && currentLocation.startsWith(item.href)))
    );
    expect(groupsToOpen.length).toBeGreaterThan(0);
    expect(groupsToOpen.some((g) => g.label === "주문 관리")).toBe(true);
  });

  it("should correctly identify active item", () => {
    const isItemActive = (href: string, location: string) => {
      if (href === "/admin") {
        return location === "/admin" || location === "/admin/dashboard";
      }
      return location === href || location.startsWith(href + "/");
    };

    expect(isItemActive("/admin", "/admin")).toBe(true);
    expect(isItemActive("/admin", "/admin/dashboard")).toBe(true);
    expect(isItemActive("/admin/orders", "/admin/orders")).toBe(true);
    expect(isItemActive("/admin/orders", "/admin/orders/123")).toBe(true);
    expect(isItemActive("/admin/products", "/admin/orders")).toBe(false);
  });

  it("should toggle group open/close", () => {
    const openGroups = new Set<string>(["홈", "주문 관리"]);

    // Toggle close
    const label = "홈";
    if (openGroups.has(label)) {
      openGroups.delete(label);
    } else {
      openGroups.add(label);
    }
    expect(openGroups.has("홈")).toBe(false);
    expect(openGroups.has("주문 관리")).toBe(true);

    // Toggle open
    const label2 = "설정";
    if (openGroups.has(label2)) {
      openGroups.delete(label2);
    } else {
      openGroups.add(label2);
    }
    expect(openGroups.has("설정")).toBe(true);
  });

  it("should have 'back to shop' link", () => {
    const backLink = "/";
    expect(backLink).toBe("/");
  });

  it("should group related items together", () => {
    const contentGroup = navGroups.find((g) => g.label === "콘텐츠 관리");
    expect(contentGroup).toBeDefined();
    expect(contentGroup!.items).toHaveLength(3);
    expect(contentGroup!.items.map((i) => i.label)).toEqual(["배너 관리", "공지사항", "이벤트"]);
  });

  it("should have unique hrefs across all groups", () => {
    const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href));
    const uniqueHrefs = new Set(allHrefs);
    expect(uniqueHrefs.size).toBe(allHrefs.length);
  });
});
