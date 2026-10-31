import { notifyOwner } from "./notification";

/**
 * Shipment status change email templates
 */

// ─── Brand Constants ───────────────────────────────────────────────────────
const BRAND_GRADIENT = 'linear-gradient(135deg, #db2777 0%, #be185d 100%)'; // pink-600 → pink-700
const SHOP_NAME = 'Coco Kusuri';
const SHOP_TAGLINE = 'ococくすり | 医薬品・健康商品の個人輸入';
const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/manus-storage/coco-favicon_c4da7071.png';

const emailTemplates = {
  picked_up: {
    subject: "配送準備完了 - ご注文の荷物が発送準備中です",
    titleJa: "配送準備完了",
    titleKo: "배송 준비 완료",
    messageJa: "ご注文の荷物が発送準備中です。間もなく発送されます。",
    messageKo: "주문하신 상품이 배송 준비 중입니다. 곧 발송될 예정입니다.",
    iconEmoji: "📦",
    color: "#d97706",
  },
  in_transit: {
    subject: "配送中 - ご注文の荷物が配送中です",
    titleJa: "配送中",
    titleKo: "배송 중",
    messageJa: "ご注文の荷物が配送中です。追跡番号で配送状況を確認できます。",
    messageKo: "주문하신 상품이 배송 중입니다. 추적번호로 배송 상태를 확인할 수 있습니다.",
    iconEmoji: "🚚",
    color: "#2563eb",
  },
  out_for_delivery: {
    subject: "配送予定 - ご注文の荷物が配送予定です",
    titleJa: "配送予定",
    titleKo: "배송 예정",
    messageJa: "ご注文の荷物が配送予定です。本日中に配送される予定です。",
    messageKo: "주문하신 상품이 배송 예정입니다. 오늘 중에 배송될 예정입니다.",
    iconEmoji: "🏠",
    color: "#db2777",
  },
  delivered: {
    subject: "配達完了 - ご注文の荷物が配達されました",
    titleJa: "配達完了",
    titleKo: "배송 완료",
    messageJa: "ご注文の荷物が配達されました。ご確認ください。",
    messageKo: "주문하신 상품이 배송 완료되었습니다. 확인해주세요.",
    iconEmoji: "🎉",
    color: "#16a34a",
  },
  failed: {
    subject: "配達失敗 - ご注文の荷物が配達失敗しました",
    titleJa: "配達失敗",
    titleKo: "배송 실패",
    messageJa: "ご注文の荷物が配達失敗しました。配送業者にお問い合わせください。",
    messageKo: "주문하신 상품 배송이 실패했습니다. 배송사에 문의해주세요.",
    iconEmoji: "❌",
    color: "#dc2626",
  },
  returned: {
    subject: "返送中 - ご注文の荷物が返送中です",
    titleJa: "返送中",
    titleKo: "반송 중",
    messageJa: "ご注文の荷物が返送中です。",
    messageKo: "주문하신 상품이 반송 중입니다.",
    iconEmoji: "↩️",
    color: "#6b7280",
  },
};

/**
 * Send shipment status change email to customer
 */
export async function sendShipmentStatusEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  trackingNumber: string | null,
  status: string,
  currentLocation?: string,
  currentLocationJa?: string
): Promise<boolean> {
  try {
    const template = emailTemplates[status as keyof typeof emailTemplates];
    if (!template) {
      console.warn(`[Email] No template found for status: ${status}`);
      return false;
    }

    // Build email content
    const emailContent = buildEmailContent(
      customerName,
      orderNumber,
      trackingNumber,
      status,
      template,
      currentLocation,
      currentLocationJa
    );

    // Send notification to owner (can be extended to send to customer email)
    const result = await notifyOwner({
      title: `배송 알림: ${orderNumber}`,
      content: emailContent,
    });

    if (result) {
      console.log(`[Email] Shipment notification sent to owner for order ${orderNumber}`);
    }

    return result;
  } catch (error) {
    console.error("[Email] Failed to send shipment status email:", error);
    return false;
  }
}

/**
 * Build email content HTML
 */
function buildEmailContent(
  customerName: string,
  orderNumber: string,
  trackingNumber: string | null,
  status: string,
  template: any,
  currentLocation?: string,
  currentLocationJa?: string
): string {
  const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://cocokusuri.com';
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

              <!-- HEADER -->
              <tr>
                <td style="background:${BRAND_GRADIENT};border-radius:16px 16px 0 0;padding:30px 40px;text-align:center;">
                  <div style="margin-bottom:12px;">
                    <img src="${LOGO_URL}" alt="${SHOP_NAME}" style="width:48px;height:48px;border-radius:10px;display:inline-block;vertical-align:middle;margin-right:8px;">
                    <span style="color:white;font-size:20px;font-weight:800;vertical-align:middle;">${SHOP_NAME}</span>
                  </div>
                  <div style="color:rgba(255,255,255,0.8);font-size:11px;letter-spacing:1.5px;">${SHOP_TAGLINE}</div>
                </td>
              </tr>

              <!-- STATUS -->
              <tr>
                <td style="background:white;padding:32px 40px;text-align:center;">
                  <div style="font-size:48px;margin-bottom:12px;">${template.iconEmoji}</div>
                  <h2 style="color:${template.color};margin:0 0 8px 0;font-size:22px;font-weight:800;">${template.titleJa}</h2>
                  <p style="color:#6b7280;margin:0;font-size:14px;line-height:1.7;">${template.messageJa}</p>
                </td>
              </tr>

              <!-- ORDER INFO -->
              <tr>
                <td style="background:white;padding:0 40px 32px;">
                  <div style="background:#f9fafb;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
                    <table style="width:100%;border-collapse:collapse;">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;width:120px;font-size:14px;">お客様名</td>
                        <td style="padding:6px 0;font-weight:700;color:#1f2937;font-size:14px;">${customerName} 様</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">注文番号</td>
                        <td style="padding:6px 0;font-weight:700;color:#db2777;font-size:14px;">${orderNumber}</td>
                      </tr>
                      ${trackingNumber ? `<tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">追跡番号</td>
                        <td style="padding:6px 0;font-weight:700;color:#1f2937;font-size:14px;font-family:monospace;">${trackingNumber}</td>
                      </tr>` : ""}
                      ${currentLocationJa ? `<tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">現在地</td>
                        <td style="padding:6px 0;color:#374151;font-size:14px;">${currentLocationJa}</td>
                      </tr>` : ""}
                    </table>
                  </div>

                  <div style="text-align:center;">
                    <a href="${frontendUrl}/mypage/orders" style="display:inline-block;background:${BRAND_GRADIENT};color:white;padding:13px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;box-shadow:0 3px 10px rgba(219,39,119,0.3);">
                      注文履歴を確認する
                    </a>
                  </div>
                </td>
              </tr>

              <!-- FOOTER -->
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

/**
 * Send review request email after delivery
 */
export async function sendReviewRequestEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  reviewLink: string
): Promise<boolean> {
  const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://cocokusuri.com';
  try {
    const emailContent = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

                <!-- HEADER -->
                <tr>
                  <td style="background:${BRAND_GRADIENT};border-radius:16px 16px 0 0;padding:30px 40px;text-align:center;">
                    <div style="margin-bottom:12px;">
                      <img src="${LOGO_URL}" alt="${SHOP_NAME}" style="width:48px;height:48px;border-radius:10px;display:inline-block;vertical-align:middle;margin-right:8px;">
                      <span style="color:white;font-size:20px;font-weight:800;vertical-align:middle;">${SHOP_NAME}</span>
                    </div>
                    <div style="color:rgba(255,255,255,0.8);font-size:11px;letter-spacing:1.5px;">${SHOP_TAGLINE}</div>
                  </td>
                </tr>

                <!-- BODY -->
                <tr>
                  <td style="background:white;padding:32px 40px;">
                    <div style="text-align:center;margin-bottom:24px;">
                      <div style="font-size:48px;margin-bottom:12px;">⭐</div>
                      <h2 style="color:#db2777;margin:0 0 8px 0;font-size:22px;font-weight:800;">レビューをお願いします</h2>
                      <p style="color:#6b7280;margin:0;font-size:14px;">ご購入いただきありがとうございます</p>
                    </div>

                    <p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 16px 0;">${customerName} 様</p>
                    <p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 24px 0;">
                      いつも ${SHOP_NAME} をご利用いただき、誠にありがとうございます。<br>
                      ご注文いただいた商品が配達されました。<br>
                      ぜひ商品のご感想をレビューでお聞かせください！
                    </p>

                    <div style="background:linear-gradient(135deg,#fdf2f8 0%,#fce7f3 100%);border:1px solid #f9a8d4;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
                      <p style="margin:0 0 6px 0;font-size:16px;font-weight:700;color:#9d174d;">🎁 レビュー投稿でポイントプレゼント！</p>
                      <p style="color:#be185d;margin:0 0 18px 0;font-size:14px;">写真付きレビューには追加ポイントも！</p>
                      <a href="${reviewLink}" style="display:inline-block;background:${BRAND_GRADIENT};color:white;padding:13px 32px;text-decoration:none;border-radius:30px;font-weight:700;font-size:15px;box-shadow:0 3px 10px rgba(219,39,119,0.35);">
                        レビューを書く ✍️
                      </a>
                    </div>

                    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">注文番号: ${orderNumber}</p>
                  </td>
                </tr>

                <!-- FOOTER -->
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

    const result = await notifyOwner({
      title: `レビュー依頼: ${orderNumber}`,
      content: emailContent,
    });

    if (result) {
      console.log(`[Email] Review request email sent for order ${orderNumber}`);
    }

    return result;
  } catch (error) {
    console.error("[Email] Failed to send review request email:", error);
    return false;
  }
}
