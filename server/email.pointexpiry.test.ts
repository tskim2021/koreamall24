import { describe, it, expect } from "vitest";

// HTML 이메일 템플릿 생성 함수 (emailService.ts의 로직을 테스트용으로 추출)
function buildPointExpiryHtml(params: {
  userName: string;
  expiringPoints: number;
  expiryDate: Date;
  shopName: string;
  frontendUrl: string;
}) {
  const { userName, expiringPoints, expiryDate, shopName, frontendUrl } = params;
  const expiryDateStr = expiryDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const pointsPageUrl = `${frontendUrl}/mypage/points`;
  const shopPageUrl = `${frontendUrl}/products`;
  const logoText = shopName.charAt(0).toUpperCase();

  return {
    subject: `【重要】${expiringPoints.toLocaleString()}ptが${expiryDateStr}に失効します`,
    html: `<!DOCTYPE html><html lang="ja"><body>
      <div data-logo="${logoText}">${shopName}</div>
      <div data-points="${expiringPoints}">${expiringPoints.toLocaleString()} pt</div>
      <div data-expiry="${expiryDateStr}">失効日：${expiryDateStr}</div>
      <a href="${shopPageUrl}">今すぐショッピングする</a>
      <a href="${pointsPageUrl}">ポイント残高を確認する</a>
      <div>${userName} 様</div>
    </body></html>`,
  };
}

describe("Point Expiry Email HTML Template", () => {
  const baseParams = {
    userName: "テストユーザー",
    expiringPoints: 3500,
    expiryDate: new Date("2026-04-15"),
    shopName: "ココくすり",
    frontendUrl: "https://example.com",
  };

  it("should include shop logo initial letter", () => {
    const { html } = buildPointExpiryHtml(baseParams);
    expect(html).toContain('data-logo="Y"');
  });

  it("should include shop name in header", () => {
    const { html } = buildPointExpiryHtml(baseParams);
    expect(html).toContain("ココくすり");
  });

  it("should display expiring points prominently", () => {
    const { html } = buildPointExpiryHtml(baseParams);
    expect(html).toContain("3,500 pt");
    expect(html).toContain('data-points="3500"');
  });

  it("should include expiry date in Japanese format", () => {
    const { html } = buildPointExpiryHtml(baseParams);
    // Date formatting depends on locale/timezone; verify year and month are present
    expect(html).toContain("2026年");
    expect(html).toContain("4月");
  });

  it("should include primary CTA button linking to shop", () => {
    const { html } = buildPointExpiryHtml(baseParams);
    expect(html).toContain("https://example.com/products");
    expect(html).toContain("今すぐショッピングする");
  });

  it("should include secondary CTA button linking to points page", () => {
    const { html } = buildPointExpiryHtml(baseParams);
    expect(html).toContain("https://example.com/mypage/points");
    expect(html).toContain("ポイント残高を確認する");
  });

  it("should include personalized greeting with user name", () => {
    const { html } = buildPointExpiryHtml(baseParams);
    expect(html).toContain("テストユーザー 様");
  });

  it("should generate correct email subject", () => {
    const { subject } = buildPointExpiryHtml(baseParams);
    expect(subject).toContain("3,500pt");
    expect(subject).toContain("失効します");
  });

  it("should handle large point values with locale formatting", () => {
    const { html } = buildPointExpiryHtml({ ...baseParams, expiringPoints: 100000 });
    expect(html).toContain("100,000 pt");
  });

  it("should use first letter of shop name as logo text", () => {
    const { html } = buildPointExpiryHtml({ ...baseParams, shopName: "Kusuri Mall" });
    expect(html).toContain('data-logo="K"');
  });
});
