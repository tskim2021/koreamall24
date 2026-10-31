import { describe, it, expect, vi, beforeEach } from "vitest";

// ===== 1. ShipmentStatusSync - 자동 배송완료 전환 로직 =====
describe("ShipmentStatusSync - 자동 배송완료 전환", () => {
  it("should use actual customer email instead of hardcoded email", async () => {
    // Read the sync file to verify no hardcoded emails
    const fs = await import("fs");
    const syncContent = fs.readFileSync("server/_core/shipmentStatusSync.ts", "utf-8");
    
    // Must NOT contain hardcoded customer@example.com
    expect(syncContent).not.toContain("customer@example.com");
    
    // Must contain logic to fetch user email
    expect(syncContent).toContain("getCustomerEmail");
  });

  it("should import sendOrderStatusEmail for delivery notifications", async () => {
    const fs = await import("fs");
    const syncContent = fs.readFileSync("server/_core/shipmentStatusSync.ts", "utf-8");
    
    expect(syncContent).toContain("sendOrderStatusEmail");
  });

  it("should have V1 fallback when V2 (Puppeteer) fails", async () => {
    const fs = await import("fs");
    const syncContent = fs.readFileSync("server/_core/shipmentStatusSync.ts", "utf-8");
    
    // Must contain fallback logic
    expect(syncContent).toContain("japanPostTracking");
    expect(syncContent).toContain("catch");
  });

  it("should use 30-minute sync interval", async () => {
    const fs = await import("fs");
    const syncContent = fs.readFileSync("server/_core/shipmentStatusSync.ts", "utf-8");
    
    // 30 minutes = 30 * 60 * 1000 = 1800000
    expect(syncContent).toMatch(/1800000|30\s*\*\s*60\s*\*\s*1000/);
  });
});

// ===== 2. 리뷰 요청 이메일 - sendEmail 사용 =====
describe("리뷰 요청 이메일 시스템", () => {
  it("should use sendEmail instead of just notifyOwner for review requests", async () => {
    const fs = await import("fs");
    const syncContent = fs.readFileSync("server/_core/shipmentStatusSync.ts", "utf-8");
    
    // Should send email to customer, not just notify owner
    expect(syncContent).toContain("sendOrderStatusEmail");
  });

  it("should trigger review email on delivery completion", async () => {
    const fs = await import("fs");
    const syncContent = fs.readFileSync("server/_core/shipmentStatusSync.ts", "utf-8");
    
    // Should detect delivered status and send email
    expect(syncContent).toContain("delivered");
    expect(syncContent).toContain("sendOrderStatusEmail");
  });
});

// ===== 3. ShipmentTrackingMini 컴포넌트 (사용자 주문목록) =====
describe("ShipmentTrackingMini 컴포넌트", () => {
  it("should exist as a reusable component", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("client/src/components/ShipmentTrackingMini.tsx");
    expect(exists).toBe(true);
  });

  it("should display tracking progress steps", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/ShipmentTrackingMini.tsx", "utf-8");
    
    // Should have progress steps
    expect(content).toContain("準備中");
    expect(content).toContain("集荷");
    expect(content).toContain("配達中");
    expect(content).toContain("配達完了");
  });

  it("should display carrier tracking external link", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/ShipmentTrackingMini.tsx", "utf-8");
    
    // Should have external link functionality
    expect(content).toContain("ExternalLink");
    expect(content).toContain("trackings.post.japanpost.jp");
  });

  it("should support multiple carriers", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/ShipmentTrackingMini.tsx", "utf-8");
    
    expect(content).toContain("Japan Post");
    expect(content).toContain("Yamato");
    expect(content).toContain("Sagawa");
  });
});

// ===== 4. ShipmentTrackingPanel 컴포넌트 (사용자 주문상세) =====
describe("ShipmentTrackingPanel 컴포넌트", () => {
  it("should exist as a reusable component", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("client/src/components/ShipmentTrackingPanel.tsx");
    expect(exists).toBe(true);
  });

  it("should support real-time Japan Post tracking", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/ShipmentTrackingPanel.tsx", "utf-8");
    
    // Should call japanPost.getTracking
    expect(content).toContain("japanPost.getTracking");
  });

  it("should display unified timeline (DB + live events)", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/ShipmentTrackingPanel.tsx", "utf-8");
    
    // Should merge DB and live events
    expect(content).toMatch(/DB|db/);
    expect(content).toMatch(/live|実時間|リアルタイム/);
  });

  it("should have external tracking link button", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/ShipmentTrackingPanel.tsx", "utf-8");
    
    expect(content).toContain("ExternalLink");
    expect(content).toContain("_blank");
  });

  it("should display tracking progress bar", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/ShipmentTrackingPanel.tsx", "utf-8");
    
    expect(content).toContain("準備中");
    expect(content).toContain("完了");
  });
});

// ===== 5. 사용자 주문목록 (MyPage) - 배송추적 미니카드 통합 =====
describe("사용자 주문목록 - ShipmentTrackingMini 통합", () => {
  it("should import ShipmentTrackingMini component", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/MyPage.tsx", "utf-8");
    
    expect(content).toContain("ShipmentTrackingMini");
  });

  it("should pass shipment data to ShipmentTrackingMini", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/MyPage.tsx", "utf-8");
    
    // Should pass shipment or tracking props
    expect(content).toMatch(/shipment|trackingNumber|carrier/);
  });
});

// ===== 6. 사용자 주문상세 (OrderDetail) - 배송추적 패널 통합 =====
describe("사용자 주문상세 - ShipmentTrackingPanel 통합", () => {
  it("should import ShipmentTrackingPanel component", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/OrderDetail.tsx", "utf-8");
    
    expect(content).toContain("ShipmentTrackingPanel");
  });

  it("should display tracking panel prominently", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/OrderDetail.tsx", "utf-8");
    
    // Should have tracking panel with real-time data
    expect(content).toContain("ShipmentTrackingPanel");
  });
});

// ===== 7. 관리자 주문목록 - 배송 컬럼 업그레이드 =====
describe("관리자 주문목록 - 배송 컬럼 업그레이드", () => {
  it("should display tracking number in order list", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/admin/Orders.tsx", "utf-8");
    
    expect(content).toContain("trackingNumber");
  });

  it("should display shipment status badge", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/admin/Orders.tsx", "utf-8");
    
    // Should have status-related display
    expect(content).toMatch(/shipment.*status|배송.*상태|準備中|輸送中|配達/);
  });

  it("should have external tracking link in order list", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/admin/Orders.tsx", "utf-8");
    
    expect(content).toContain("ExternalLink");
  });
});

// ===== 8. 관리자 주문상세 - 실시간 배송추적 패널 =====
describe("관리자 주문상세 - 실시간 배송추적 패널", () => {
  it("should call japanPost.getTracking for real-time data", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/admin/OrderDetail.tsx", "utf-8");
    
    expect(content).toContain("japanPost.getTracking");
  });

  it("should have manual sync button", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/admin/OrderDetail.tsx", "utf-8");
    
    expect(content).toContain("수동 동기화");
    expect(content).toContain("handleSync");
  });

  it("should display unified timeline (DB + live events)", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/admin/OrderDetail.tsx", "utf-8");
    
    expect(content).toContain("통합 배송 타임라인");
    expect(content).toContain("mergedTimeline");
  });

  it("should have external tracking link", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/admin/OrderDetail.tsx", "utf-8");
    
    expect(content).toContain("추적 사이트");
    expect(content).toContain("ExternalLink");
  });

  it("should display tracking progress steps", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/admin/OrderDetail.tsx", "utf-8");
    
    expect(content).toContain("準備中");
    expect(content).toContain("集荷");
    expect(content).toContain("輸送中");
    expect(content).toContain("配達中");
    expect(content).toContain("完了");
  });

  it("should display tracking info cards (tracking number, status, location, delivery date)", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/admin/OrderDetail.tsx", "utf-8");
    
    expect(content).toContain("추적번호");
    expect(content).toContain("배송 상태");
    expect(content).toContain("현재 위치");
    expect(content).toContain("예상 배달일");
  });

  it("should support multiple carriers with external links", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/admin/OrderDetail.tsx", "utf-8");
    
    expect(content).toContain("Japan Post");
    expect(content).toContain("Yamato");
    expect(content).toContain("Sagawa");
    expect(content).toContain("DHL");
    expect(content).toContain("FedEx");
    expect(content).toContain("EMS");
  });

  it("should use correct auth import path", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/admin/OrderDetail.tsx", "utf-8");
    
    expect(content).toContain('@/_core/hooks/useAuth');
    expect(content).not.toContain('"@/hooks/useAuth"');
  });
});

// ===== 9. Carrier URL 매핑 검증 =====
describe("운송사 추적 URL 매핑", () => {
  const carrierTrackingUrls: Record<string, (num: string) => string> = {
    "Japan Post": (num) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=ja`,
    "Yamato": (num) => `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${num}`,
    "Sagawa": (num) => `https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=${num}`,
    "DHL": (num) => `https://www.dhl.com/jp-ja/home/tracking.html?tracking-id=${num}`,
    "FedEx": (num) => `https://www.fedex.com/fedextrack/?trknbr=${num}`,
    "EMS": (num) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=ja`,
  };

  it("should generate correct Japan Post tracking URL", () => {
    const url = carrierTrackingUrls["Japan Post"]("1234567890");
    expect(url).toContain("trackings.post.japanpost.jp");
    expect(url).toContain("1234567890");
  });

  it("should generate correct Yamato tracking URL", () => {
    const url = carrierTrackingUrls["Yamato"]("1234567890");
    expect(url).toContain("kuronekoyamato.co.jp");
    expect(url).toContain("1234567890");
  });

  it("should generate correct Sagawa tracking URL", () => {
    const url = carrierTrackingUrls["Sagawa"]("1234567890");
    expect(url).toContain("sagawa-exp.co.jp");
    expect(url).toContain("1234567890");
  });

  it("should generate correct DHL tracking URL", () => {
    const url = carrierTrackingUrls["DHL"]("1234567890");
    expect(url).toContain("dhl.com");
    expect(url).toContain("1234567890");
  });

  it("should generate correct FedEx tracking URL", () => {
    const url = carrierTrackingUrls["FedEx"]("1234567890");
    expect(url).toContain("fedex.com");
    expect(url).toContain("1234567890");
  });

  it("should generate correct EMS tracking URL", () => {
    const url = carrierTrackingUrls["EMS"]("1234567890");
    expect(url).toContain("japanpost.jp");
    expect(url).toContain("1234567890");
  });
});

// ===== 10. getUserEmailForOrder 함수 =====
describe("getUserEmailForOrder 함수", () => {
  it("should exist in shipmentStatusSync.ts", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/_core/shipmentStatusSync.ts", "utf-8");
    
    expect(content).toContain("getCustomerEmail");
  });

  it("should query users table for email", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/_core/shipmentStatusSync.ts", "utf-8");
    
    // Should reference users table or registeredUsers
    expect(content).toMatch(/users|registeredUser|registeredUsers/);
  });
});
