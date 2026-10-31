/**
 * Email Service
 * Handles email sending using Resend API
 */

import { Resend } from "resend";
import { getDb } from "../db";
import { emailLogs, InsertEmailLog } from "../../drizzle/schema";
import { generateOrderConfirmationEmail, OrderConfirmationEmailData } from "../emailTemplates/orderConfirmation";
import { eq } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_EMAIL = "noreply@cocokusuri.com";
const SENDER_NAME = "Coco Kusuri";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  userId?: number;
  orderId?: number;
  emailType: string;
  metadata?: Record<string, any>;
}

/**
 * Send email and log the result
 */
export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Send email via Resend
    const response = await resend.emails.send({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (response.error) {
    // Log failed email
    await logEmail({
      emailType: options.emailType,
      to: options.to,
      subject: options.subject,
      status: "failed" as any,
      errorMessage: response.error.message,
      userId: options.userId,
      orderId: options.orderId,
      metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
    });

      return {
        success: false,
        error: response.error.message,
      };
    }

    // Log successful email
    await logEmail({
      emailType: options.emailType,
      to: options.to,
      subject: options.subject,
      status: "sent" as any,
      userId: options.userId,
      orderId: options.orderId,
      metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
      sentAt: new Date(),
    });

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log error
    await logEmail({
      emailType: options.emailType,
      to: options.to,
      subject: options.subject,
      status: "failed" as any,
      errorMessage,
      userId: options.userId,
      orderId: options.orderId,
      metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  userId: number,
  orderId: number,
  customerEmail: string,
  customerName: string,
  emailData: OrderConfirmationEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = generateOrderConfirmationEmail(emailData);

  return sendEmail({
    to: customerEmail,
    subject: `ご注文確認 - 注文番号: ${emailData.orderNumber}`,
    html,
    userId,
    orderId,
    emailType: "order_confirmation",
    metadata: {
      orderNumber: emailData.orderNumber,
      customerName,
    },
  });
}

/**
 * Send order shipped email
 */
export async function sendOrderShippedEmail(
  userId: number,
  orderId: number,
  customerEmail: string,
  orderNumber: string,
  trackingNumber?: string,
  trackingUrl?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://cocokusuri.com';
  const brandGradient = 'linear-gradient(135deg, #db2777 0%, #be185d 100%)';
  const logoUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/manus-storage/coco-favicon_c4da7071.png';

  const trackingInfo = trackingNumber
    ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0 0 10px 0;font-weight:700;color:#1d4ed8;font-size:14px;">📍 配送追跡情報</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;width:100px;">追跡番号</td><td style="padding:5px 0;font-weight:700;color:#1f2937;font-size:13px;font-family:monospace;">${trackingNumber}</td></tr>
        ${trackingUrl ? `<tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">追跡URL</td><td style="padding:5px 0;font-size:13px;"><a href="${trackingUrl}" style="color:#2563eb;text-decoration:none;font-weight:600;">配送状況を確認する →</a></td></tr>` : ''}
      </table>
    </div>
  `
    : "";

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>配送のお知らせ - Coco Kusuri</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:${brandGradient};border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <div style="margin-bottom:14px;">
                <img src="${logoUrl}" alt="Coco Kusuri" style="width:52px;height:52px;border-radius:11px;display:inline-block;vertical-align:middle;margin-right:10px;">
                <span style="color:white;font-size:21px;font-weight:800;vertical-align:middle;">Coco Kusuri</span>
              </div>
              <div style="color:rgba(255,255,255,0.8);font-size:11px;letter-spacing:1.5px;">ococくすり | 医薬品・健康商品の個人輸入</div>
            </td>
          </tr>
          <tr>
            <td style="background:white;padding:32px 40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:12px;">🚚</div>
              <h2 style="color:#db2777;margin:0 0 8px 0;font-size:22px;font-weight:800;">配送のお知らせ</h2>
              <p style="color:#6b7280;margin:0;font-size:14px;">ご注文の商品が発送されました</p>
            </td>
          </tr>
          <tr>
            <td style="background:white;padding:0 40px 32px;">
              <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.8;">
                いつも <strong style="color:#db2777;">Coco Kusuri</strong> をご利用いただきありがとうございます。<br>
                ご注文いただいた商品が発送されました。
              </p>
              <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
                <p style="margin:0;font-size:14px;color:#6b7280;">注文番号: <strong style="color:#db2777;">${orderNumber}</strong></p>
              </div>
              ${trackingInfo}
              <div style="text-align:center;margin-top:20px;">
                <a href="${frontendUrl}/mypage/orders" style="display:inline-block;background:${brandGradient};color:white;padding:13px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;box-shadow:0 3px 10px rgba(219,39,119,0.3);">注文履歴を確認する</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#1f2937;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;color:#9ca3af;font-size:13px;">
                <a href="${frontendUrl}" style="color:#f9a8d4;text-decoration:none;font-weight:600;">Coco Kusuri</a>
                &nbsp;·&nbsp;
                <a href="${frontendUrl}/mypage" style="color:#9ca3af;text-decoration:none;">マイページ</a>
                &nbsp;·&nbsp;
                <a href="${frontendUrl}/contact" style="color:#9ca3af;text-decoration:none;">お問い合わせ</a>
              </p>
              <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.7;">
                このメールは自動送信されています。返信はできません。<br>
                &copy; ${new Date().getFullYear()} Coco Kusuri. All rights reserved.
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

  return sendEmail({
    to: customerEmail,
    subject: `配送のお知らせ - 注文番号: ${orderNumber}`,
    html,
    userId,
    orderId,
    emailType: "order_shipped",
    metadata: {
      orderNumber,
      trackingNumber,
    },
  });
}

/**
 * Send review reminder email
 */
export async function sendReviewReminderEmail(
  userId: number,
  orderId: number,
  customerEmail: string,
  orderNumber: string,
  reviewUrl?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const frontendUrl2 = process.env.VITE_FRONTEND_URL || 'https://cocokusuri.com';
  const brandGradient2 = 'linear-gradient(135deg, #db2777 0%, #be185d 100%)';
  const logoUrl2 = 'https://d2xsxph8kpxj0f.cloudfront.net/manus-storage/coco-favicon_c4da7071.png';

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>レビューをお願いします - Coco Kusuri</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:${brandGradient2};border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <div style="margin-bottom:14px;">
                <img src="${logoUrl2}" alt="Coco Kusuri" style="width:52px;height:52px;border-radius:11px;display:inline-block;vertical-align:middle;margin-right:10px;">
                <span style="color:white;font-size:21px;font-weight:800;vertical-align:middle;">Coco Kusuri</span>
              </div>
              <div style="color:rgba(255,255,255,0.8);font-size:11px;letter-spacing:1.5px;">ococくすり | 医薬品・健康商品の個人輸入</div>
            </td>
          </tr>
          <tr>
            <td style="background:white;padding:32px 40px;">
              <div style="text-align:center;margin-bottom:24px;">
                <div style="font-size:48px;margin-bottom:12px;">⭐</div>
                <h2 style="color:#db2777;margin:0 0 8px 0;font-size:22px;font-weight:800;">レビューをお願いします</h2>
                <p style="color:#6b7280;margin:0;font-size:14px;">ご購入いただきありがとうございます</p>
              </div>
              <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.8;">
                ご注文いただいた商品をお受け取りいただけましたか？<br>
                ご購入いただいた商品について、ぜひレビューをお聞かせください。
              </p>
              <div style="background:linear-gradient(135deg,#fdf2f8 0%,#fce7f3 100%);border:1px solid #f9a8d4;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
                <p style="margin:0 0 6px 0;font-size:16px;font-weight:700;color:#9d174d;">🎁 レビュー投稿でポイントプレゼント！</p>
                <p style="color:#be185d;margin:0 0 6px 0;font-size:14px;">注文番号: <strong>${orderNumber}</strong></p>
                ${reviewUrl ? `<p style="margin:0 0 18px 0;font-size:13px;color:#be185d;">写真付きレビューには追加ポイントも！</p><a href="${reviewUrl}" style="display:inline-block;background:${brandGradient2};color:white;padding:13px 32px;text-decoration:none;border-radius:30px;font-weight:700;font-size:15px;box-shadow:0 3px 10px rgba(219,39,119,0.35);">レビューを書く ✍️</a>` : ''}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#1f2937;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;color:#9ca3af;font-size:13px;">
                <a href="${frontendUrl2}" style="color:#f9a8d4;text-decoration:none;font-weight:600;">Coco Kusuri</a>
                &nbsp;·&nbsp;
                <a href="${frontendUrl2}/mypage" style="color:#9ca3af;text-decoration:none;">マイページ</a>
                &nbsp;·&nbsp;
                <a href="${frontendUrl2}/contact" style="color:#9ca3af;text-decoration:none;">お問い合わせ</a>
              </p>
              <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.7;">
                このメールは自動送信されています。返信はできません。<br>
                &copy; ${new Date().getFullYear()} Coco Kusuri. All rights reserved.
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

  return sendEmail({
    to: customerEmail,
    subject: `レビューをお願いします - 注文番号: ${orderNumber}`,
    html,
    userId,
    orderId,
    emailType: "review_reminder",
    metadata: {
      orderNumber,
    },
  });
}

/**
 * Log email sending
 */
async function logEmail(data: Partial<InsertEmailLog>): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(emailLogs).values({
      emailType: data.emailType || "unknown",
      to: data.to || "",
      subject: data.subject || "",
      status: (data.status as any) || "sent",
      errorMessage: data.errorMessage,
      userId: data.userId,
      orderId: data.orderId,
      metadata: data.metadata,
      sentAt: data.sentAt,
    });
  } catch (error) {
    console.error("Failed to log email:", error);
  }
}

/**
 * Get email logs for a user
 */
export async function getEmailLogs(userId: number, limit = 10): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.userId, userId))
      .limit(limit)
      .orderBy((table: any) => table.sentAt);
  } catch (error) {
    console.error("Failed to get email logs:", error);
    return [];
  }
}

/**
 * Get email logs for an order
 */
export async function getOrderEmailLogs(orderId: number): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.orderId, orderId))
      .orderBy((table: any) => table.sentAt);
  } catch (error) {
    console.error("Failed to get order email logs:", error);
    return [];
  }
}

/**
 * Retry failed emails
 */
export async function retryFailedEmails(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const failedEmails = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.status, "failed" as any))
      .limit(10);

    for (const email of failedEmails) {
      // Retry sending email
      // Note: This is a simplified version. In production, you'd want to reconstruct the original email content
      console.log(`Retrying email: ${email.id}`);
    }
  } catch (error) {
    console.error("Failed to retry emails:", error);
  }
}
