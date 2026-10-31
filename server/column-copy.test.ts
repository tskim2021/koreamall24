import { describe, it, expect } from "vitest";

// 열 클립보드 복사 로직 테스트 (copyColumnToClipboard 함수의 텍스트 추출 로직)
describe("열 클립보드 복사 - 텍스트 추출 로직", () => {
  const STATUS_MAP: Record<string, { label: string }> = {
    pending: { label: "입금전" },
    confirmed: { label: "상품 준비중" },
    shipped: { label: "배송중" },
    delivered: { label: "배송완료" },
    cancelled: { label: "취소완료" },
  };

  // 샘플 주문 데이터
  const sampleOrders = [
    {
      id: 1,
      orderNumber: "ORD-2026-001",
      status: "confirmed",
      totalAmount: 5800,
      pointsUsed: 200,
      couponDiscount: 500,
      shippingFee: 1500,
      paymentMethod: "stripe",
      bankTransferConfirmedAt: null,
      shippingName: "홍길동",
      shippingPhone: "010-1234-5678",
      shippingAddress: "서울시 강남구",
      createdAt: new Date("2026-03-07T10:00:00Z"),
      deliveredAt: null,
      shipment: { carrier: "야마토", trackingNumber: "1234567890", shippedAt: null, estimatedDeliveryDate: null },
      itemsWithImages: [
        { id: 1, productId: 10, productNameJa: "ロキソニン", productName: "로키소닌", quantity: 2, unitPrice: 1500, subtotal: 3000, discountAmount: 0, tierName: "2개", sellerOptionCode: "OPT-001" },
        { id: 2, productId: 20, productNameJa: "バファリン", productName: "바파린", quantity: 1, unitPrice: 2800, subtotal: 2800, discountAmount: 0, tierName: "1개", sellerOptionCode: "OPT-002" },
      ],
    },
    {
      id: 2,
      orderNumber: "ORD-2026-002",
      status: "pending",
      totalAmount: 3000,
      pointsUsed: 0,
      couponDiscount: 0,
      shippingFee: 0,
      paymentMethod: "bank_transfer",
      bankTransferConfirmedAt: null,
      shippingName: "김철수",
      shippingPhone: "010-9876-5432",
      shippingAddress: "부산시 해운대구",
      createdAt: new Date("2026-03-07T11:00:00Z"),
      deliveredAt: null,
      shipment: null,
      itemsWithImages: [
        { id: 3, productId: 30, productNameJa: "パブロン", productName: "파브론", quantity: 1, unitPrice: 3000, subtotal: 3000, discountAmount: 0, tierName: "1개", sellerOptionCode: "OPT-003" },
      ],
    },
  ];

  function extractColumnValues(orders: typeof sampleOrders, colKey: string): string[] {
    const lines: string[] = [];
    orders.forEach((o) => {
      const items = o.itemsWithImages?.length > 0 ? o.itemsWithImages : [null as any];
      items.forEach((item: any, itemIdx: number) => {
        let val = "";
        switch (colKey) {
          case "status":       val = itemIdx === 0 ? (STATUS_MAP[o.status]?.label || o.status) : ""; break;
          case "orderNumber":  val = itemIdx === 0 ? (o.orderNumber || "") : ""; break;
          case "cart":         val = item ? `${o.id}-${item.productId || item.id || 0}` : String(o.id); break;
          case "carrier":      val = itemIdx === 0 ? (o.shipment?.carrier || "") : ""; break;
          case "tracking":     val = itemIdx === 0 ? (o.shipment?.trackingNumber || "") : ""; break;
          case "productName":  val = item ? (item.productNameJa || item.productName || "") : ""; break;
          case "qty":          val = item ? String(item.quantity) : ""; break;
          case "unitPrice":    val = item ? (item.unitPrice ? Number(item.unitPrice).toLocaleString() : "") : ""; break;
          case "subtotal":     val = item ? (item.subtotal ? Number(item.subtotal).toLocaleString() : "") : ""; break;
          case "customer":     val = itemIdx === 0 ? (o.shippingName || "") : ""; break;
          case "phone":        val = itemIdx === 0 ? (o.shippingPhone || "") : ""; break;
          case "finalAmount":  val = itemIdx === 0 ? Number(o.totalAmount || 0).toLocaleString() : ""; break;
          case "paymentMethod": val = itemIdx === 0 ? (o.paymentMethod === 'stripe' ? '카드결제' : o.paymentMethod === 'bank_transfer' ? (!o.bankTransferConfirmedAt ? '무통장(미확인)' : '무통장(확인완료)') : '-') : ""; break;
          default: val = "";
        }
        lines.push(val);
      });
    });
    return lines;
  }

  it("배송상태 열: 첫 행에만 상태 텍스트, 나머지 빈칸", () => {
    const lines = extractColumnValues(sampleOrders, "status");
    // 주문1 아이템2개 → ["상품 준비중", ""], 주문2 아이템1개 → ["입금전"]
    expect(lines).toEqual(["상품 준비중", "", "입금전"]);
  });

  it("주문번호 열: 첫 행에만 주문번호", () => {
    const lines = extractColumnValues(sampleOrders, "orderNumber");
    expect(lines).toEqual(["ORD-2026-001", "", "ORD-2026-002"]);
  });

  it("상품명 열: 각 아이템별 상품명", () => {
    const lines = extractColumnValues(sampleOrders, "productName");
    expect(lines).toEqual(["ロキソニン", "バファリン", "パブロン"]);
  });

  it("수량 열: 각 아이템별 수량", () => {
    const lines = extractColumnValues(sampleOrders, "qty");
    expect(lines).toEqual(["2", "1", "1"]);
  });

  it("최종결제금액 열: 첫 행에만 totalAmount", () => {
    const lines = extractColumnValues(sampleOrders, "finalAmount");
    expect(lines).toEqual(["5,800", "", "3,000"]);
  });

  it("결제수단 열: stripe=카드결제, bank_transfer 미확인=무통장(미확인)", () => {
    const lines = extractColumnValues(sampleOrders, "paymentMethod");
    expect(lines[0]).toBe("카드결제");   // 주문1 첫 행
    expect(lines[1]).toBe("");            // 주문1 두 번째 행 (빈칸)
    expect(lines[2]).toBe("무통장(미확인)"); // 주문2
  });

  it("수취인 열: 첫 행에만 이름", () => {
    const lines = extractColumnValues(sampleOrders, "customer");
    expect(lines).toEqual(["홍길동", "", "김철수"]);
  });

  it("클립보드 텍스트: 줄바꿈으로 구분", () => {
    const lines = extractColumnValues(sampleOrders, "status");
    const clipboardText = lines.join("\n");
    expect(clipboardText).toBe("상품 준비중\n\n입금전");
  });

  it("비어있지 않은 행 수 계산 (복사 완료 토스트용)", () => {
    const lines = extractColumnValues(sampleOrders, "status");
    const nonEmptyCount = lines.filter(l => l !== "").length;
    expect(nonEmptyCount).toBe(2); // 주문 2개
  });
});
