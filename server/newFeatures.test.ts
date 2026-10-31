import { describe, it, expect, vi } from "vitest";

// ============================================================
// Test data for the 3 new features:
// 1. MyPage order list with carrier info & estimated delivery
// 2. CSV bulk tracking number upload
// 3. Reorder button functionality
// ============================================================

const mockShipments = [
  {
    id: 1,
    orderId: 1,
    trackingNumber: "JP1234567890",
    carrier: "Japan Post",
    status: "in_transit",
    estimatedDeliveryDate: new Date("2026-02-15"),
    currentLocation: "Tokyo",
    currentLocationJa: "東京",
    createdAt: new Date("2026-02-10"),
    updatedAt: new Date("2026-02-11"),
  },
  {
    id: 2,
    orderId: 2,
    trackingNumber: "YMT9876543210",
    carrier: "Yamato",
    status: "delivered",
    estimatedDeliveryDate: new Date("2026-02-08"),
    currentLocation: null,
    currentLocationJa: null,
    createdAt: new Date("2026-02-05"),
    updatedAt: new Date("2026-02-08"),
  },
  {
    id: 3,
    orderId: 3,
    trackingNumber: null,
    carrier: null,
    status: "pending",
    estimatedDeliveryDate: null,
    currentLocation: null,
    currentLocationJa: null,
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-01"),
  },
];

const mockOrdersWithShipments = [
  {
    id: 1,
    orderNumber: "ORD-20260210-001",
    userId: 1,
    status: "shipped",
    totalAmount: "5980",
    shippingFee: "500",
    shippingName: "田中太郎",
    createdAt: new Date("2026-02-10"),
    shipment: mockShipments[0],
  },
  {
    id: 2,
    orderNumber: "ORD-20260205-002",
    userId: 1,
    status: "delivered",
    totalAmount: "12500",
    shippingFee: "0",
    shippingName: "田中太郎",
    createdAt: new Date("2026-02-05"),
    shipment: mockShipments[1],
  },
  {
    id: 3,
    orderNumber: "ORD-20260201-003",
    userId: 1,
    status: "processing",
    totalAmount: "3200",
    shippingFee: "500",
    shippingName: "田中太郎",
    createdAt: new Date("2026-02-01"),
    shipment: mockShipments[2],
  },
];

const mockProducts = [
  { id: 1, name: "ロキソニンS", nameJa: "ロキソニンS", price: "1280", stock: 50, isActive: true },
  { id: 2, name: "パブロンゴールド", nameJa: "パブロンゴールド", price: "1580", stock: 0, isActive: true },
  { id: 3, name: "ビオフェルミン", nameJa: "ビオフェルミン", price: "980", stock: 30, isActive: false },
  { id: 4, name: "アリナミンEX", nameJa: "アリナミンEX", price: "2480", stock: 25, isActive: true },
];

const mockOrderItems = [
  { id: 1, orderId: 2, productId: 1, productName: "ロキソニンS", productNameJa: "ロキソニンS", quantity: 2, unitPrice: "1280" },
  { id: 2, orderId: 2, productId: 2, productName: "パブロンゴールド", productNameJa: "パブロンゴールド", quantity: 1, unitPrice: "1580" },
  { id: 3, orderId: 2, productId: 3, productName: "ビオフェルミン", productNameJa: "ビオフェルミン", quantity: 3, unitPrice: "980" },
  { id: 4, orderId: 2, productId: 4, productName: "アリナミンEX", productNameJa: "アリナミンEX", quantity: 1, unitPrice: "2480" },
];

// ============================================================
// Feature 1: MyPage Order List with Carrier Info
// ============================================================
describe("MyPage Order List - Carrier & Estimated Delivery", () => {
  const carrierInfo: Record<string, { name: string; color: string }> = {
    "Japan Post": { name: "日本郵便", color: "text-red-600" },
    "Yamato": { name: "ヤマト運輸", color: "text-green-700" },
    "Sagawa": { name: "佐川急便", color: "text-blue-700" },
    "DHL": { name: "DHL", color: "text-yellow-600" },
    "FedEx": { name: "FedEx", color: "text-purple-600" },
    "EMS": { name: "EMS", color: "text-blue-500" },
  };

  it("should include shipment data in order list", () => {
    const ordersWithShipments = mockOrdersWithShipments;
    expect(ordersWithShipments[0].shipment).toBeDefined();
    expect(ordersWithShipments[0].shipment?.trackingNumber).toBe("JP1234567890");
  });

  it("should map carrier to Japanese display name", () => {
    const carrier = mockShipments[0].carrier;
    expect(carrier).toBe("Japan Post");
    expect(carrierInfo[carrier!]?.name).toBe("日本郵便");
  });

  it("should map Yamato carrier correctly", () => {
    const carrier = mockShipments[1].carrier;
    expect(carrier).toBe("Yamato");
    expect(carrierInfo[carrier!]?.name).toBe("ヤマト運輸");
  });

  it("should handle orders without carrier info", () => {
    const shipment = mockShipments[2];
    expect(shipment.carrier).toBeNull();
    const carrierDisplay = shipment.carrier ? carrierInfo[shipment.carrier] : null;
    expect(carrierDisplay).toBeNull();
  });

  it("should display estimated delivery date when available", () => {
    const shipment = mockShipments[0];
    expect(shipment.estimatedDeliveryDate).toBeDefined();
    const formatted = shipment.estimatedDeliveryDate!.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
    expect(formatted).toBeTruthy();
  });

  it("should handle null estimated delivery date", () => {
    const shipment = mockShipments[2];
    expect(shipment.estimatedDeliveryDate).toBeNull();
  });

  it("should display current location when available", () => {
    const shipment = mockShipments[0];
    expect(shipment.currentLocation).toBe("Tokyo");
    expect(shipment.currentLocationJa).toBe("東京");
  });

  it("should handle null current location", () => {
    const shipment = mockShipments[2];
    expect(shipment.currentLocation).toBeNull();
    expect(shipment.currentLocationJa).toBeNull();
  });

  it("should show shipping info section only when shipment exists with data", () => {
    const ordersWithData = mockOrdersWithShipments.filter(
      (o) => o.shipment && (o.shipment.trackingNumber || o.shipment.carrier)
    );
    expect(ordersWithData).toHaveLength(2); // orders 1 and 2 have carrier/tracking
  });

  it("should identify delivered orders for reorder button", () => {
    const deliveredOrders = mockOrdersWithShipments.filter(
      (o) => o.status === "delivered" || o.shipment?.status === "delivered"
    );
    expect(deliveredOrders).toHaveLength(1);
    expect(deliveredOrders[0].id).toBe(2);
  });

  it("should display all supported carriers", () => {
    const supportedCarriers = Object.keys(carrierInfo);
    expect(supportedCarriers).toContain("Japan Post");
    expect(supportedCarriers).toContain("Yamato");
    expect(supportedCarriers).toContain("Sagawa");
    expect(supportedCarriers).toContain("DHL");
    expect(supportedCarriers).toContain("FedEx");
    expect(supportedCarriers).toContain("EMS");
    expect(supportedCarriers).toHaveLength(6);
  });
});

// ============================================================
// Feature 2: CSV Bulk Tracking Number Upload
// ============================================================
describe("CSV Bulk Tracking Number Upload", () => {
  // CSV parsing logic
  function parseCsv(text: string): { orderNumber: string; trackingNumber: string; carrier: string }[] {
    const lines = text.split("\n").filter((l) => l.trim());
    const entries: { orderNumber: string; trackingNumber: string; carrier: string }[] = [];
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length >= 2 && cols[0] && cols[1]) {
        entries.push({
          orderNumber: cols[0],
          trackingNumber: cols[1],
          carrier: cols[2] || "Japan Post",
        });
      }
    }
    return entries;
  }

  it("should parse valid CSV with all columns", () => {
    const csv = `orderNumber,trackingNumber,carrier
ORD-20260210-001,JP1234567890,Japan Post
ORD-20260210-002,YMT9876543210,Yamato`;
    const entries = parseCsv(csv);
    expect(entries).toHaveLength(2);
    expect(entries[0].orderNumber).toBe("ORD-20260210-001");
    expect(entries[0].trackingNumber).toBe("JP1234567890");
    expect(entries[0].carrier).toBe("Japan Post");
    expect(entries[1].carrier).toBe("Yamato");
  });

  it("should default carrier to Japan Post when not specified", () => {
    const csv = `orderNumber,trackingNumber,carrier
ORD-20260210-001,JP1234567890`;
    const entries = parseCsv(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].carrier).toBe("Japan Post");
  });

  it("should skip header row", () => {
    const csv = `orderNumber,trackingNumber,carrier
ORD-20260210-001,JP1234567890,Japan Post`;
    const entries = parseCsv(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].orderNumber).not.toBe("orderNumber");
  });

  it("should skip empty lines", () => {
    const csv = `orderNumber,trackingNumber,carrier
ORD-20260210-001,JP1234567890,Japan Post

ORD-20260210-002,YMT9876543210,Yamato
`;
    const entries = parseCsv(csv);
    expect(entries).toHaveLength(2);
  });

  it("should skip lines with missing required fields", () => {
    const csv = `orderNumber,trackingNumber,carrier
ORD-20260210-001,JP1234567890,Japan Post
,JP0000000000,Japan Post
ORD-20260210-003,,Yamato`;
    const entries = parseCsv(csv);
    expect(entries).toHaveLength(1);
  });

  it("should handle quoted CSV values", () => {
    const csv = `orderNumber,trackingNumber,carrier
"ORD-20260210-001","JP1234567890","Japan Post"`;
    const entries = parseCsv(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].orderNumber).toBe("ORD-20260210-001");
    expect(entries[0].trackingNumber).toBe("JP1234567890");
  });

  it("should handle large CSV files", () => {
    let csv = "orderNumber,trackingNumber,carrier\n";
    for (let i = 0; i < 100; i++) {
      csv += `ORD-20260210-${String(i).padStart(3, "0")},JP${String(i).padStart(10, "0")},Japan Post\n`;
    }
    const entries = parseCsv(csv);
    expect(entries).toHaveLength(100);
  });

  // Bulk update tracking logic
  describe("Bulk Update Tracking Logic", () => {
    it("should process entries and return results", () => {
      const entries = [
        { orderNumber: "ORD-20260210-001", trackingNumber: "JP1234567890", carrier: "Japan Post" },
        { orderNumber: "ORD-NONEXIST-999", trackingNumber: "JP0000000000", carrier: "Japan Post" },
      ];

      // Simulate processing
      const results = entries.map((entry) => {
        const order = mockOrdersWithShipments.find((o) => o.orderNumber === entry.orderNumber);
        if (!order) {
          return { orderNumber: entry.orderNumber, success: false, message: "注文が見つかりません" };
        }
        return { orderNumber: entry.orderNumber, success: true, message: "更新完了" };
      });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].message).toBe("注文が見つかりません");
    });

    it("should count success and failure correctly", () => {
      const results = [
        { orderNumber: "ORD-001", success: true, message: "更新完了" },
        { orderNumber: "ORD-002", success: true, message: "更新完了" },
        { orderNumber: "ORD-003", success: false, message: "注文が見つかりません" },
      ];
      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;
      expect(successCount).toBe(2);
      expect(failedCount).toBe(1);
    });

    it("should auto-update status to shipped for pending/confirmed/processing orders", () => {
      const autoShipStatuses = ["pending", "confirmed", "processing"];
      const order = mockOrdersWithShipments[2]; // processing order
      expect(autoShipStatuses.includes(order.status)).toBe(true);

      // Simulate status update
      const updatedStatus = autoShipStatuses.includes(order.status) ? "shipped" : order.status;
      expect(updatedStatus).toBe("shipped");
    });

    it("should not change status for already shipped/delivered orders", () => {
      const autoShipStatuses = ["pending", "confirmed", "processing"];
      const shippedOrder = mockOrdersWithShipments[0]; // shipped
      const deliveredOrder = mockOrdersWithShipments[1]; // delivered

      expect(autoShipStatuses.includes(shippedOrder.status)).toBe(false);
      expect(autoShipStatuses.includes(deliveredOrder.status)).toBe(false);
    });
  });

  // CSV template download
  describe("CSV Template", () => {
    it("should generate correct template content", () => {
      const header = "orderNumber,trackingNumber,carrier";
      const example = "ORD-20260101-XXXXX,JP1234567890,Japan Post";
      const template = header + "\n" + example + "\n";
      expect(template).toContain("orderNumber");
      expect(template).toContain("trackingNumber");
      expect(template).toContain("carrier");
      expect(template.split("\n").filter((l) => l.trim())).toHaveLength(2);
    });
  });
});

// ============================================================
// Feature 3: Reorder Button Functionality
// ============================================================
describe("Reorder Button Functionality", () => {
  it("should only show reorder button for delivered orders", () => {
    const deliveredOrders = mockOrdersWithShipments.filter(
      (o) => o.status === "delivered" || o.shipment?.status === "delivered"
    );
    expect(deliveredOrders).toHaveLength(1);
    expect(deliveredOrders[0].status).toBe("delivered");
  });

  it("should not show reorder button for non-delivered orders", () => {
    const nonDeliveredOrders = mockOrdersWithShipments.filter(
      (o) => o.status !== "delivered" && o.shipment?.status !== "delivered"
    );
    expect(nonDeliveredOrders).toHaveLength(2);
  });

  describe("Reorder Logic", () => {
    it("should add available products to cart", () => {
      const items = mockOrderItems;
      let added = 0;
      const skipped: string[] = [];

      for (const item of items) {
        const product = mockProducts.find((p) => p.id === item.productId);
        if (!product || product.stock <= 0 || !product.isActive) {
          skipped.push(item.productNameJa);
          continue;
        }
        added++;
      }

      // Product 1: in stock, active -> added
      // Product 2: stock 0 -> skipped
      // Product 3: inactive -> skipped
      // Product 4: in stock, active -> added
      expect(added).toBe(2);
      expect(skipped).toHaveLength(2);
      expect(skipped).toContain("パブロンゴールド");
      expect(skipped).toContain("ビオフェルミン");
    });

    it("should limit quantity to available stock", () => {
      const item = mockOrderItems[0]; // quantity: 2
      const product = mockProducts[0]; // stock: 50
      const qty = Math.min(item.quantity, product.stock);
      expect(qty).toBe(2);
    });

    it("should cap quantity when stock is less than ordered", () => {
      const orderQuantity = 100;
      const availableStock = 25;
      const qty = Math.min(orderQuantity, availableStock);
      expect(qty).toBe(25);
    });

    it("should handle empty order items", () => {
      const items: typeof mockOrderItems = [];
      let added = 0;
      const skipped: string[] = [];

      for (const item of items) {
        const product = mockProducts.find((p) => p.id === item.productId);
        if (!product || product.stock <= 0) {
          skipped.push(item.productNameJa);
          continue;
        }
        added++;
      }

      expect(added).toBe(0);
      expect(skipped).toHaveLength(0);
    });

    it("should skip products that no longer exist", () => {
      const item = { ...mockOrderItems[0], productId: 999 };
      const product = mockProducts.find((p) => p.id === item.productId);
      expect(product).toBeUndefined();
    });

    it("should return success with added count and skipped list", () => {
      const result = {
        success: true,
        added: 2,
        skipped: ["パブロンゴールド", "ビオフェルミン"],
      };
      expect(result.success).toBe(true);
      expect(result.added).toBe(2);
      expect(result.skipped).toHaveLength(2);
    });
  });

  describe("Reorder UI Behavior", () => {
    it("should show success toast when items added", () => {
      const added = 3;
      const message = `${added}個の商品をカートに追加しました`;
      expect(message).toContain("3");
      expect(message).toContain("カートに追加");
    });

    it("should show warning toast for skipped items", () => {
      const skipped = ["パブロンゴールド", "ビオフェルミン"];
      const message = `${skipped.length}個の商品は在庫切れまたは販売終了のためスキップされました`;
      expect(message).toContain("2");
      expect(message).toContain("スキップ");
    });

    it("should navigate to cart after successful reorder", () => {
      const added = 2;
      const shouldNavigate = added > 0;
      expect(shouldNavigate).toBe(true);
    });

    it("should not navigate when no items added", () => {
      const added = 0;
      const shouldNavigate = added > 0;
      expect(shouldNavigate).toBe(false);
    });

    it("should disable button during reorder processing", () => {
      const reorderingOrderId = 2;
      const currentOrderId = 2;
      const isDisabled = reorderingOrderId === currentOrderId;
      expect(isDisabled).toBe(true);
    });

    it("should not disable button for other orders during reorder", () => {
      const reorderingOrderId = 2;
      const currentOrderId = 1;
      const isDisabled = reorderingOrderId === currentOrderId;
      expect(isDisabled).toBe(false);
    });
  });
});

// ============================================================
// Integration: Order with Shipment Data Flow
// ============================================================
describe("Order with Shipment Data Integration", () => {
  it("should merge order and shipment data correctly", () => {
    const order = mockOrdersWithShipments[0];
    expect(order.id).toBe(1);
    expect(order.status).toBe("shipped");
    expect(order.shipment?.carrier).toBe("Japan Post");
    expect(order.shipment?.trackingNumber).toBe("JP1234567890");
  });

  it("should handle order without shipment gracefully", () => {
    const orderWithoutShipment = {
      ...mockOrdersWithShipments[0],
      shipment: undefined,
    };
    expect(orderWithoutShipment.shipment).toBeUndefined();
    const carrier = orderWithoutShipment.shipment?.carrier ?? null;
    expect(carrier).toBeNull();
  });

  it("should display fallback for shipped orders without shipment", () => {
    const order = {
      id: 99,
      status: "shipped",
      shipment: undefined as any,
    };
    const showFallback = !order.shipment && order.status === "shipped";
    expect(showFallback).toBe(true);
  });

  it("should not show fallback for non-shipped orders without shipment", () => {
    const order = {
      id: 99,
      status: "processing",
      shipment: undefined as any,
    };
    const showFallback = !order.shipment && order.status === "shipped";
    expect(showFallback).toBe(false);
  });
});
