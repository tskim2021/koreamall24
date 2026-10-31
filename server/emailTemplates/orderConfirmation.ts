/**
 * Order Confirmation Email Template
 * Generates HTML email for order confirmation - Coco Kusuri Brand (pink-600)
 */

// ─── Brand Constants ───────────────────────────────────────────────────────
const BRAND_GRADIENT = 'linear-gradient(135deg, #db2777 0%, #be185d 100%)'; // pink-600 → pink-700
const SHOP_NAME = 'Coco Kusuri';
const SHOP_TAGLINE = 'ococくすり | 医薬品・健康商品の個人輸入';
const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/manus-storage/coco-favicon_c4da7071.png';

export interface OrderConfirmationEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  shippingAddress: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
}

export function generateOrderConfirmationEmail(data: OrderConfirmationEmailData): string {
  const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://cocokusuri.com';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #1f2937;">${item.productName}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: center; font-size: 14px; color: #6b7280;">${item.quantity}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: right; font-size: 14px; color: #6b7280;">${formatPrice(item.unitPrice)}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: right; font-size: 14px; font-weight: 700; color: #db2777;">${formatPrice(item.subtotal)}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ご注文確認 - ${SHOP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif;-webkit-text-size-adjust:100%;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- ===== HEADER ===== -->
          <tr>
            <td style="background:${BRAND_GRADIENT};border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
              <div style="margin-bottom:16px;">
                <img src="${LOGO_URL}" alt="${SHOP_NAME}" style="width:56px;height:56px;border-radius:12px;display:inline-block;vertical-align:middle;margin-right:10px;">
                <span style="color:white;font-size:22px;font-weight:800;letter-spacing:0.5px;vertical-align:middle;">${SHOP_NAME}</span>
              </div>
              <div style="color:rgba(255,255,255,0.8);font-size:11px;margin-bottom:18px;letter-spacing:1.5px;">${SHOP_TAGLINE}</div>
              <h1 style="margin:0;color:white;font-size:24px;font-weight:800;">ご注文ありがとうございます</h1>
              <p style="margin:8px 0 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Order Confirmation</p>
            </td>
          </tr>

          <!-- ===== GREETING ===== -->
          <tr>
            <td style="background:white;padding:32px 40px 0;">
              <p style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#1f2937;">${data.customerName} 様</p>
              <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.8;">
                いつも <strong style="color:#db2777;">${SHOP_NAME}</strong> をご利用いただきありがとうございます。<br>
                ご注文が確認されました。下記の内容をご確認ください。
              </p>
            </td>
          </tr>

          <!-- ===== ORDER INFO ===== -->
          <tr>
            <td style="background:white;padding:0 40px 24px;">
              <p style="margin:0 0 12px 0;font-size:15px;font-weight:700;color:#1f2937;padding-bottom:8px;border-bottom:2px solid #db2777;">ご注文情報</p>
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:14px;width:40%;">注文番号</td>
                  <td style="padding:8px 0;font-weight:700;color:#db2777;font-size:14px;">${data.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:14px;">ご注文日時</td>
                  <td style="padding:8px 0;font-weight:600;color:#1f2937;font-size:14px;">${data.orderDate}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== ORDER ITEMS ===== -->
          <tr>
            <td style="background:white;padding:0 40px 24px;">
              <p style="margin:0 0 12px 0;font-size:15px;font-weight:700;color:#1f2937;padding-bottom:8px;border-bottom:2px solid #db2777;">ご注文内容</p>
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:10px 16px;text-align:left;font-size:13px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">商品名</th>
                    <th style="padding:10px 16px;text-align:center;font-size:13px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;width:60px;">数量</th>
                    <th style="padding:10px 16px;text-align:right;font-size:13px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;width:100px;">単価</th>
                    <th style="padding:10px 16px;text-align:right;font-size:13px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;width:100px;">小計</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- ===== ORDER SUMMARY ===== -->
          <tr>
            <td style="background:white;padding:0 40px 24px;">
              <p style="margin:0 0 12px 0;font-size:15px;font-weight:700;color:#1f2937;padding-bottom:8px;border-bottom:2px solid #db2777;">ご請求金額</p>
              <div style="background:#f9fafb;border-radius:10px;padding:18px 20px;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:7px 0;color:#6b7280;font-size:14px;">小計</td>
                    <td style="padding:7px 0;text-align:right;color:#1f2937;font-weight:600;font-size:14px;">${formatPrice(data.subtotal)}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#6b7280;font-size:14px;">送料</td>
                    <td style="padding:7px 0;text-align:right;color:#1f2937;font-weight:600;font-size:14px;">${formatPrice(data.shippingFee)}</td>
                  </tr>
                  ${data.discount > 0 ? `
                  <tr>
                    <td style="padding:7px 0;color:#6b7280;font-size:14px;">割引</td>
                    <td style="padding:7px 0;text-align:right;color:#16a34a;font-weight:700;font-size:14px;">-${formatPrice(data.discount)}</td>
                  </tr>
                  ` : ""}
                  <tr>
                    <td style="padding:12px 0 0 0;border-top:2px solid #e5e7eb;font-size:16px;font-weight:800;color:#1f2937;">合計</td>
                    <td style="padding:12px 0 0 0;border-top:2px solid #e5e7eb;text-align:right;font-size:18px;font-weight:800;color:#db2777;">${formatPrice(data.total)}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- ===== SHIPPING ADDRESS ===== -->
          <tr>
            <td style="background:white;padding:0 40px 24px;">
              <p style="margin:0 0 12px 0;font-size:15px;font-weight:700;color:#1f2937;padding-bottom:8px;border-bottom:2px solid #db2777;">配送先住所</p>
              <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;font-size:14px;line-height:1.8;color:#374151;">
                ${data.shippingAddress.split("\n").join("<br>")}
              </div>
            </td>
          </tr>

          <!-- ===== TRACKING ===== -->
          ${data.trackingUrl ? `
          <tr>
            <td style="background:white;padding:0 40px 24px;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;border-radius:10px;padding:18px 20px;">
                <p style="margin:0 0 10px 0;font-size:14px;font-weight:700;color:#166534;">📦 配送状況を確認</p>
                <p style="margin:0 0 14px 0;font-size:14px;color:#166534;">ご注文の配送状況は以下のリンクからご確認いただけます。</p>
                <a href="${data.trackingUrl}" style="display:inline-block;background:#16a34a;color:white;padding:10px 24px;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">配送状況を確認する</a>
                ${data.estimatedDeliveryDate ? `<p style="margin:12px 0 0 0;font-size:13px;color:#166534;">予想配送日: ${data.estimatedDeliveryDate}</p>` : ""}
              </div>
            </td>
          </tr>
          ` : ""}

          <!-- ===== IMPORTANT NOTES ===== -->
          <tr>
            <td style="background:white;padding:0 40px 32px;">
              <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;">
                <p style="margin:0;font-size:14px;color:#92400e;">
                  <strong>📌 重要なお知らせ</strong><br>
                  <span style="font-size:13px;color:#b45309;">
                    • このメールは自動配信です。ご返信いただいてもお答えできません。<br>
                    • ご不明な点やご質問がございましたら、お問い合わせフォームからお気軽にお問い合わせください。
                  </span>
                </p>
              </div>

              <div style="text-align:center;margin-top:24px;">
                <a href="${frontendUrl}/mypage/orders" style="display:inline-block;background:${BRAND_GRADIENT};color:white;padding:13px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;box-shadow:0 3px 10px rgba(219,39,119,0.3);">
                  注文履歴を確認する
                </a>
              </div>
            </td>
          </tr>

          <!-- ===== FOOTER ===== -->
          <tr>
            <td style="background:#1f2937;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;color:#9ca3af;font-size:13px;">
                <a href="${frontendUrl}" style="color:#f9a8d4;text-decoration:none;font-weight:600;">${SHOP_NAME}</a>
                &nbsp;·&nbsp;
                <a href="${frontendUrl}/mypage" style="color:#9ca3af;text-decoration:none;">マイページ</a>
                &nbsp;·&nbsp;
                <a href="${frontendUrl}/contact" style="color:#9ca3af;text-decoration:none;">お問い合わせ</a>
              </p>
              <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.7;">
                このメールは自動送信されています。返信はできません。<br>
                &copy; ${new Date().getFullYear()} ${SHOP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `;
}
