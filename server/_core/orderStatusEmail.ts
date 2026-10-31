import { sendEmail } from "./email";
import { notifyOwner } from "./notification";

/**
 * Order status change email templates
 * Sends email to customer when order status changes
 */

type OrderItem = {
  productName: string;
  quantity: number;
  price: number;
  tierName?: string | null;
  imageUrl?: string | null;
};

type OrderStatusEmailData = {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
  reviewLink?: string;
  orderItems?: OrderItem[];
  totalAmount?: number;
};

// ─── Brand Constants ───────────────────────────────────────────────────────
const BRAND_GRADIENT = 'linear-gradient(135deg, #db2777 0%, #be185d 100%)'; // pink-600 → pink-700
const SHOP_NAME = 'Coco Kusuri';
const SHOP_TAGLINE = 'ococくすり | 医薬品・健康商品の個人輸入';
const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/manus-storage/coco-favicon_c4da7071.png';

const statusTemplates: Record<string, {
  subjectJa: string;
  titleJa: string;
  messageJa: string;
  iconEmoji: string;
  color: string;
  badgeBg: string;
}> = {
  confirmed: {
    subjectJa: "ご注文が確定されました",
    titleJa: "ご注文確定",
    messageJa: "ご注文が確定されました。商品の準備を開始いたします。",
    iconEmoji: "✅",
    color: "#16a34a",
    badgeBg: "#f0fdf4",
  },
  processing: {
    subjectJa: "ご注文の準備中です",
    titleJa: "準備中",
    messageJa: "ご注文の商品を準備しております。発送まで今しばらくお待ちください。",
    iconEmoji: "📦",
    color: "#d97706",
    badgeBg: "#fffbeb",
  },
  shipped: {
    subjectJa: "ご注文の商品が発送されました",
    titleJa: "発送完了",
    messageJa: "ご注文の商品が発送されました。追跡番号で配送状況をご確認いただけます。",
    iconEmoji: "🚚",
    color: "#2563eb",
    badgeBg: "#eff6ff",
  },
  delivered: {
    subjectJa: "ご注文の商品が配達されました",
    titleJa: "配達完了",
    messageJa: "ご注文の商品が配達されました。ご確認ください。商品のレビューをお待ちしております。",
    iconEmoji: "🎉",
    color: "#db2777",
    badgeBg: "#fdf2f8",
  },
  cancelled: {
    subjectJa: "ご注文がキャンセルされました",
    titleJa: "注文キャンセル",
    messageJa: "ご注文がキャンセルされました。ご不明な点がございましたら、お問い合わせください。",
    iconEmoji: "❌",
    color: "#dc2626",
    badgeBg: "#fef2f2",
  },
  bank_transfer_confirmed: {
    subjectJa: "お振込みが確認されました",
    titleJa: "入金確認完了",
    messageJa: "ご入金が確認されました。商品の準備を開始いたします。発送準備が整い次第、発送完了メールをお送りいたします。",
    iconEmoji: "💰",
    color: "#16a34a",
    badgeBg: "#f0fdf4",
  },
  bank_transfer_cancelled: {
    subjectJa: "ご注文が自動キャンセルされました",
    titleJa: "入金期限超過による自動キャンセル",
    messageJa: "入金期限を超過したため、ご注文が自動的にキャンセルされました。再度ご注文いただく場合は、お手数ですが新規注文をお願いいたします。",
    iconEmoji: "⏰",
    color: "#d97706",
    badgeBg: "#fffbeb",
  },
};

function buildOrderStatusEmailHtml(data: OrderStatusEmailData): string {
  const template = statusTemplates[data.status];
  if (!template) return "";

  const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://cocokusuri.com';

  const trackingSection = data.trackingNumber
    ? `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 18px 20px; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; font-weight: 700; color: #1d4ed8; font-size: 14px;">📍 配送情報</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #6b7280; width: 120px; font-size: 13px;">追跡番号:</td>
            <td style="padding: 5px 0; font-weight: 700; color: #1f2937; font-size: 13px; font-family: monospace;">${data.trackingNumber}</td>
          </tr>
          ${data.carrier ? `<tr><td style="padding: 5px 0; color: #6b7280; font-size: 13px;">配送業者:</td><td style="padding: 5px 0; color: #374151; font-size: 13px;">${data.carrier}</td></tr>` : ""}
          ${data.estimatedDelivery ? `<tr><td style="padding: 5px 0; color: #6b7280; font-size: 13px;">配送予定日:</td><td style="padding: 5px 0; color: #374151; font-size: 13px;">${data.estimatedDelivery}</td></tr>` : ""}
        </table>
      </div>
    `
    : "";

  const reviewSection = data.status === "delivered" && data.reviewLink
    ? `
      <div style="background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border: 1px solid #f9a8d4; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: #9d174d;">⭐ レビューを書いてポイントゲット！</p>
        <p style="color: #be185d; margin: 0 0 18px 0; font-size: 14px;">ご購入いただいた商品のご感想をお聞かせください</p>
        <a href="${data.reviewLink}" style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 13px 32px; text-decoration: none; border-radius: 30px; font-weight: 700; font-size: 15px; box-shadow: 0 3px 10px rgba(219,39,119,0.35);">
          レビューを書く ✍️
        </a>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.subjectJa} - ${SHOP_NAME}</title>
    </head>
    <body style="margin: 0; padding: 0; background: #f3f4f6; font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; -webkit-text-size-adjust: 100%;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f3f4f6;">
        <tr>
          <td align="center" style="padding: 32px 16px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

              <!-- ===== HEADER ===== -->
              <tr>
                <td style="background: ${BRAND_GRADIENT}; border-radius: 16px 16px 0 0; padding: 32px 40px; text-align: center;">
                  <div style="margin-bottom: 14px;">
                    <img src="${LOGO_URL}" alt="${SHOP_NAME}" style="width: 52px; height: 52px; border-radius: 11px; display: inline-block; vertical-align: middle; margin-right: 10px;">
                    <span style="color: white; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; vertical-align: middle;">${SHOP_NAME}</span>
                  </div>
                  <div style="color: rgba(255,255,255,0.8); font-size: 11px; letter-spacing: 1.5px;">${SHOP_TAGLINE}</div>
                </td>
              </tr>

              <!-- ===== STATUS BADGE ===== -->
              <tr>
                <td style="background: white; padding: 32px 40px 0;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background: ${template.badgeBg}; border: 2px solid ${template.color}20; border-radius: 50%; width: 72px; height: 72px; line-height: 72px; font-size: 36px; margin-bottom: 14px;">${template.iconEmoji}</div>
                    <h2 style="color: ${template.color}; margin: 0 0 8px 0; font-size: 22px; font-weight: 800;">${template.titleJa}</h2>
                    <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.7;">${template.messageJa}</p>
                  </div>
                </td>
              </tr>

              <!-- ===== ORDER INFO ===== -->
              <tr>
                <td style="background: white; padding: 0 40px;">
                  <div style="background: #f9fafb; border-radius: 10px; padding: 18px 20px; margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; width: 120px; font-size: 14px;">お客様名</td>
                        <td style="padding: 6px 0; font-weight: 700; color: #1f2937; font-size: 14px;">${data.customerName} 様</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">注文番号</td>
                        <td style="padding: 6px 0; font-weight: 700; color: #db2777; font-size: 14px;">${data.orderNumber}</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>

              ${data.orderItems && data.orderItems.length > 0 ? `
              <!-- ===== ORDER ITEMS ===== -->
              <tr>
                <td style="background: white; padding: 0 40px;">
                  <p style="font-weight: 700; color: #1f2937; margin: 0 0 12px 0; font-size: 15px;">ご注文商品</p>
                  ${data.orderItems.map((item: OrderItem) => `
                    <div style="background: #f9fafb; border-radius: 8px; padding: 14px 16px; margin-bottom: 8px;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          ${item.imageUrl ? `<td style="width: 64px; vertical-align: top; padding-right: 12px;"><img src="${item.imageUrl}" alt="${item.productName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;"></td>` : ""}
                          <td style="vertical-align: top;">
                            <p style="margin: 0 0 4px 0; font-weight: 700; color: #1f2937; font-size: 14px;">${item.productName}</p>
                            ${item.tierName ? `<p style="margin: 0 0 4px 0; color: #2563eb; font-size: 12px;">${item.tierName}</p>` : ""}
                            <p style="margin: 0; color: #6b7280; font-size: 13px;">数量: ${item.quantity}</p>
                          </td>
                          <td style="vertical-align: top; text-align: right; white-space: nowrap;">
                            <p style="margin: 0; font-weight: 700; color: #db2777; font-size: 15px;">¥${Math.round(item.price).toLocaleString()}</p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  `).join("")}
                  ${data.totalAmount ? `
                    <div style="text-align: right; margin-top: 14px; padding-top: 14px; border-top: 2px solid #e5e7eb;">
                      <p style="margin: 0; font-size: 17px; font-weight: 800; color: #1f2937;">合計: <span style="color: #db2777;">¥${Math.round(data.totalAmount).toLocaleString()}</span></p>
                    </div>
                  ` : ""}
                </td>
              </tr>
              ` : ""}

              <!-- ===== TRACKING / REVIEW ===== -->
              <tr>
                <td style="background: white; padding: 0 40px 32px;">
                  ${trackingSection}
                  ${reviewSection}

                  <div style="text-align: center; margin-top: 24px;">
                    <a href="${frontendUrl}/mypage/orders" style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 13px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 3px 10px rgba(219,39,119,0.3);">
                      注文履歴を確認する
                    </a>
                  </div>
                </td>
              </tr>

              <!-- ===== FOOTER ===== -->
              <tr>
                <td style="background: #1f2937; border-radius: 0 0 16px 16px; padding: 24px 40px; text-align: center;">
                  <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 13px;">
                    <a href="${frontendUrl}" style="color: #f9a8d4; text-decoration: none; font-weight: 600;">${SHOP_NAME}</a>
                    &nbsp;·&nbsp;
                    <a href="${frontendUrl}/mypage" style="color: #9ca3af; text-decoration: none;">マイページ</a>
                    &nbsp;·&nbsp;
                    <a href="${frontendUrl}/contact" style="color: #9ca3af; text-decoration: none;">お問い合わせ</a>
                  </p>
                  <p style="margin: 0; color: #6b7280; font-size: 11px; line-height: 1.7;">
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
 * Send order status change email to customer
 */
export async function sendOrderStatusEmail(data: OrderStatusEmailData): Promise<boolean> {
  const template = statusTemplates[data.status];
  if (!template) {
    console.warn(`[OrderEmail] No template for status: ${data.status}`);
    return false;
  }

  try {
    const html = buildOrderStatusEmailHtml(data);
    if (!html) return false;

    // Send email to customer
    const emailSent = await sendEmail({
      to: data.customerEmail,
      subject: `【${SHOP_NAME}】${template.subjectJa} - ${data.orderNumber}`,
      html,
    });

    // Also notify owner
    await notifyOwner({
      title: `注文状態変更: ${data.orderNumber} → ${data.status}`,
      content: `お客様 ${data.customerName} の注文 ${data.orderNumber} が「${template.titleJa}」に変更されました。${data.trackingNumber ? ` 追跡番号: ${data.trackingNumber}` : ""}`,
    });

    if (emailSent) {
      console.log(`[OrderEmail] Status email sent to ${data.customerEmail} for order ${data.orderNumber} (${data.status})`);
    } else {
      console.warn(`[OrderEmail] Failed to send email to ${data.customerEmail} for order ${data.orderNumber}`);
    }

    return emailSent;
  } catch (error) {
    console.error("[OrderEmail] Error sending order status email:", error);
    return false;
  }
}

export { statusTemplates };
