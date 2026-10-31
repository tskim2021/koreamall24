import { Resend } from 'resend';
import { getEmailTemplateByKey } from '../db';

const resend = new Resend(process.env.RESEND_API_KEY || '');

// Helper function to replace template variables
function replaceTemplateVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

// ─── Shared Email Template Helpers ───────────────────────────────────────────
const BRAND_COLOR = '#D30046';
const BRAND_GRADIENT = 'linear-gradient(135deg, #D30046 0%, #a8003a 100%)';
const BRAND_LIGHT = '#FFF0F3'; // 연한 배경용
const SHOP_NAME = 'Coco Kusuri';
const SHOP_TAGLINE = '医薬品・健康商品の個人輸入';
const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663287886477/UQKFprxuYdKrk4tZ9zXFHM/email-assets/logo_color.png';
const LOGO_WHITE_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/manus-storage/Group4_%ED%9D%B0%EC%83%89_092a3239.png';

function emailHeader(title: string, subtitle?: string): string {
  return `
  <tr>
    <td style="padding: 0;">
      <!-- Thin brand accent bar -->
      <div style="height: 4px; background: ${BRAND_COLOR};"></div>
      <!-- Header content -->
      <div class="email-header-cell" style="padding: 28px 30px 24px; text-align: center; border-bottom: 1px solid #f0f0f0;">
        <div class="email-header-logo" style="margin-bottom: 14px;">
          <img src="${LOGO_URL}" alt="Coco Kusuri" style="height: 66px; display: inline-block; vertical-align: middle; max-width: 220px;">
        </div>
        <h1 class="email-h1" style="margin: 0; color: #1a1a1a; font-size: 20px; font-weight: 700; line-height: 1.4;">${title}</h1>
        ${subtitle ? `<p style="margin: 8px 0 0 0; color: #666; font-size: 13px;">${subtitle}</p>` : ''}
      </div>
    </td>
  </tr>`;
}

function emailFooter(): string {
  const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://cocokusuri.com';
  return `
  <tr>
    <td style="padding: 0;">
      <div class="email-footer-cell" style="border-top: 1px solid #eee; padding: 24px 30px; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #999; font-size: 12px;">
          <a href="${frontendUrl}" style="color: ${BRAND_COLOR}; text-decoration: none; font-weight: 600;">${SHOP_NAME}</a>
          &nbsp;·&nbsp;
          <a href="${frontendUrl}/mypage" style="color: #999; text-decoration: none;">マイページ</a>
          &nbsp;·&nbsp;
          <a href="${frontendUrl}/contact" style="color: #999; text-decoration: none;">お問い合わせ</a>
        </p>
        <p style="margin: 0; color: #bbb; font-size: 10px; line-height: 1.6;">
          このメールは自動送信されています。返信はできません。<br>
          &copy; ${new Date().getFullYear()} ${SHOP_NAME}. All rights reserved.
        </p>
      </div>
    </td>
  </tr>`;
}

function emailWrapper(innerRows: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-header-cell { padding: 20px 16px 18px !important; }
      .email-header-logo img { height: 54px !important; max-width: 160px !important; }
      .email-h1 { font-size: 17px !important; }
      .email-body-cell { padding: 24px 16px !important; }
      .email-footer-cell { padding: 18px 16px !important; }
      td[width="80"] { width: 64px !important; }
      td[width="80"] img { width: 64px !important; height: 64px !important; }
      a[style*="display: inline-block"] { display: block !important; text-align: center !important; }
      table[width="100%"] { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7f7f8;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f7f7f8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="560" class="email-container" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
          ${innerRows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all domains from Resend
 */
export async function getResendDomains(): Promise<{ success: boolean; domains?: any[]; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not configured');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const result = await resend.domains.list();

    if (result.error) {
      console.error('[Email] Failed to get domains:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] Retrieved ${result.data?.data?.length || 0} domains`);
    return { success: true, domains: result.data?.data || [] };
  } catch (error) {
    console.error('[Email] Error getting domains:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send test email
 */
export async function sendTestEmail(params: {
  to: string;
  from: string;
  fromName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not configured, skipping email send');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const { to, from, fromName } = params;
    const fromAddress = fromName ? `${fromName} <${from}>` : from;

    // Try to load test email template from DB
    let subject = `テストメール - ${SHOP_NAME}`;
    let bodyText = `これは ${SHOP_NAME} のメール設定テストメッセージです。\nこのメールが届いた場合、メールシステムは正常に動作しています。`;
    
    const template = await getEmailTemplateByKey('test_email');
    if (template) {
      subject = template.subject || subject;
      bodyText = template.bodyText || bodyText;
    }

    const emailHtml = emailWrapper(
      emailHeader('テストメール', 'メール設定の確認') +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
          こんにちは！
        </p>
        <p style="font-size: 14px; color: #666; margin-bottom: 20px; line-height: 1.8;">
          ${bodyText.replace(/\n/g, '<br>')}
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">送信者</p>
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #D30046;">${fromAddress}</p>
        </div>
        <p style="font-size: 12px; color: #999; margin: 0;">
          このメールはテスト目的で送信されました。
        </p>
      </td></tr>` +
      emailFooter()
    );

    const result = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: subject,
      html: emailHtml,
    });

    if (result.error) {
      console.error('[Email] Failed to send test email:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] Test email sent to ${to}, email ID: ${result.data?.id}`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending test email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send retry payment email to customer
 */
export async function sendRetryPaymentEmail(params: {
  to: string;
  customerName: string;
  orderAmount: string;
  retryPaymentUrl: string;
  failureReason?: string;
  from?: string;
  fromName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not configured, skipping email send');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const { to, customerName, orderAmount, retryPaymentUrl, failureReason, from, fromName } = params;
    const fromAddress = from && fromName ? `${fromName} <${from}>` : (from || `${SHOP_NAME} <noreply@cocokusuri.com>`);

    const emailHtml = emailWrapper(
      emailHeader('お支払い再手続きのお願い', 'お支払いが完了していません') +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
          <strong>${customerName}</strong> 様
        </p>
        <p style="font-size: 14px; color: #666; margin-bottom: 20px; line-height: 1.8;">
          ご注文のお支払いが完了していません。${failureReason ? `（理由: ${failureReason}）` : ''}
        </p>
        <div style="background: #FFF0F3; border: 1px solid #ffb3c6; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #8a0030;">ご注文金額</p>
          <p style="margin: 0; font-size: 28px; font-weight: 800; color: #D30046;">${orderAmount}</p>
        </div>
        <p style="font-size: 14px; color: #666; margin-bottom: 25px; line-height: 1.8;">
          下記ボタンよりお支払い手続きをお願いいたします。<br>
          お支払いリンクは24時間有効です。
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${retryPaymentUrl}" style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(220,38,38,0.3);">
            お支払いを再試行する
          </a>
        </div>
        <p style="font-size: 12px; color: #999; margin: 0; text-align: center;">
          このメールは自動送信されています。ご不明な点はお問い合わせください。
        </p>
      </td></tr>` +
      emailFooter()
    );

    const result = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: `【お支払い再手続き】${SHOP_NAME}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('[Email] Failed to send retry payment email:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] Retry payment email sent to ${to}, email ID: ${result.data?.id}`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending retry payment email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send new inquiry notification email to admin
 */
export async function sendNewInquiryNotification(
  adminEmail: string,
  inquiryData: {
    id: number;
    title: string;
    content: string;
    userName: string;
    userEmail: string;
  },
  from?: string,
  fromName?: string
) {
  const emailFrom = from || 'noreply@cocokusuri.com';
  const emailFromName = fromName || SHOP_NAME;
  const adminUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';

  const htmlContent = emailWrapper(
    emailHeader('🔔 新規お問い合わせが届きました', `お問い合わせ番号 #${inquiryData.id}`) +
    `<tr><td class="email-body-cell" style="padding: 40px 30px;">
      <div style="background: #f9fafb; border-left: 4px solid #D30046; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>お問い合わせ番号:</strong> #${inquiryData.id}</p>
        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>件名:</strong> ${inquiryData.title}</p>
        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>お客様名:</strong> ${inquiryData.userName}</p>
        <p style="margin: 0; color: #374151; font-size: 14px;"><strong>メールアドレス:</strong> ${inquiryData.userEmail}</p>
      </div>
      <div style="background: white; border: 1px solid #e5e7eb; padding: 16px 20px; margin-bottom: 24px; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">お問い合わせ内容:</p>
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${inquiryData.content}</p>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${adminUrl}/admin/inquiries"
           style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 8px rgba(220,38,38,0.3);">
          お問い合わせ管理ページへ
        </a>
      </div>
      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
        このメールはお客様がお問い合わせを送信した際に自動送信されます。
      </p>
    </td></tr>` +
    emailFooter()
  );

  try {
    const response = await resend.emails.send({
      from: `${emailFromName} <${emailFrom}>`,
      to: adminEmail,
      subject: `[${SHOP_NAME}] 新規お問い合わせ: ${inquiryData.title}`,
      html: htmlContent,
    });
    return response;
  } catch (error) {
    console.error('[Email] Failed to send new inquiry notification:', error);
    throw error;
  }
}

/**
 * Send inquiry reply notification email to customer
 */
export async function sendInquiryReplyNotification(
  customerEmail: string,
  inquiryData: {
    id: number;
    title: string;
    replyContent: string;
    inquiryUrl: string;
  },
  from?: string,
  fromName?: string
) {
  const emailFrom = from || 'noreply@cocokusuri.com';
  const emailFromName = fromName || SHOP_NAME;

  const htmlContent = emailWrapper(
    emailHeader('💬 お問い合わせへの回答が届きました', `お問い合わせ番号 #${inquiryData.id}`) +
    `<tr><td class="email-body-cell" style="padding: 40px 30px;">
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.8;">
        この度はお問い合わせいただきありがとうございます。<br>
        以下の内容でご回答いたします。
      </p>
      <div style="background: #f9fafb; border-left: 4px solid #D30046; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>受付番号:</strong> #${inquiryData.id}</p>
        <p style="margin: 0; color: #374151; font-size: 14px;"><strong>件名:</strong> ${inquiryData.title}</p>
      </div>
      <div style="background: white; border: 1px solid #e5e7eb; padding: 16px 20px; margin-bottom: 24px; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">回答内容:</p>
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${inquiryData.replyContent}</p>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${inquiryData.inquiryUrl}"
           style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 8px rgba(220,38,38,0.3);">
          お問い合わせ履歴を確認する
        </a>
      </div>
      <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
        追加のご質問がございましたら、いつでもお問い合わせください。
      </p>
    </td></tr>` +
    emailFooter()
  );

  try {
    const response = await resend.emails.send({
      from: `${emailFromName} <${emailFrom}>`,
      to: customerEmail,
      subject: `[${SHOP_NAME}] お問い合わせへの回答: ${inquiryData.title}`,
      html: htmlContent,
    });
    return response;
  } catch (error) {
    console.error('[Email] Failed to send inquiry reply notification:', error);
    throw error;
  }
}

/**
 * Send delivery completion email with review invitation
 */
export async function sendDeliveryCompletionEmail(params: {
  to: string;
  userName: string;
  orderNumber: string;
  orderId: number;
  orderItems: Array<{
    productId: number;
    productNameJa: string;
    productImageUrl: string | null;
    orderItemId: number;
  }>;
  reviewPoints: number;
  earnedPoints?: number;      // 이번 주문으로 적립된 포인트
  newPointBalance?: number;   // 적립 후 누적 포인트 잔액
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not configured, skipping delivery completion email');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const { to, userName, orderNumber, orderId, orderItems, reviewPoints, earnedPoints, newPointBalance } = params;
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';

    // Generate product list HTML
    const productListHtml = orderItems.map(item => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #f3f4f6;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="80" style="padding-right: 15px;">
                ${item.productImageUrl ? `<img src="${item.productImageUrl}" alt="${item.productNameJa}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">` : ''}
              </td>
              <td style="vertical-align: top;">
                <div style="font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 8px;">${item.productNameJa}</div>
                <a href="${frontendUrl}/mypage/order/${orderId}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(249,115,22,0.3);">
                  ⭐ レビューを書いて${reviewPoints}P獲得
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('');

    const emailHtml = emailWrapper(
      emailHeader('🎉 配達完了しました！', 'ご注文ありがとうございました') +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
          ${userName}様
        </p>
        <p style="margin: 0 0 30px 0; font-size: 15px; color: #666; line-height: 1.8;">
          ご注文番号 <strong style="color: #D30046;">${orderNumber}</strong> の商品が無事に配達されました。<br>
          商品はお手元に届きましたでしょうか？
        </p>

        <!-- Point Reward Notification (shown only when points were earned) -->
        ${earnedPoints && earnedPoints > 0 ? `
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 22px; margin-bottom: 24px; border-left: 4px solid #10b981;">
          <h2 style="margin: 0 0 10px 0; font-size: 17px; color: #065f46; font-weight: 700;">
            🎁 購入ポイントが付与されました！
          </h2>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding: 6px 0;">
                <span style="font-size: 14px; color: #047857;">今回の付与ポイント</span>
              </td>
              <td style="text-align: right; padding: 6px 0;">
                <strong style="font-size: 18px; color: #065f46;">+${earnedPoints.toLocaleString()}pt</strong>
              </td>
            </tr>
            ${newPointBalance !== undefined ? `
            <tr>
              <td style="padding: 6px 0; border-top: 1px solid #a7f3d0;">
                <span style="font-size: 14px; color: #047857;">累計保有ポイント</span>
              </td>
              <td style="text-align: right; padding: 6px 0; border-top: 1px solid #a7f3d0;">
                <strong style="font-size: 16px; color: #065f46;">${newPointBalance.toLocaleString()}pt</strong>
              </td>
            </tr>` : ''}
          </table>
          <p style="margin: 12px 0 0 0; font-size: 13px; color: #6ee7b7;">
            ※ ポイントは次回のご注文時にご利用いただけます。
          </p>
        </div>` : ''}

        <!-- Review Invitation -->
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
          <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #92400e; font-weight: 700;">
            💎 レビューを書いて${reviewPoints}ポイント獲得！
          </h2>
          <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.7;">
            ご購入いただいた商品のレビューを書いていただくと、<strong>${reviewPoints}ポイント</strong>をプレゼント！<br>
            写真付きレビューや詳細なレビューには追加ポイントもございます。
          </p>
        </div>

        <!-- Product List -->
        <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #111827; font-weight: 700;">ご注文商品</h3>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          ${productListHtml}
        </table>

        <div style="margin-top: 28px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
          <p style="margin: 0 0 10px 0; font-size: 13px; color: #6b7280; line-height: 1.7;">
            ※ レビューは配達完了後90日以内に投稿してください。<br>
            ※ ポイントはレビュー投稿後、即座にアカウントに付与されます。
          </p>
          <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
            ご不明な点がございましたら、お気軽にお問い合わせください。
          </p>
        </div>
      </td></tr>` +
      emailFooter()
    );

    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to,
      subject: `【配達完了】ご注文 ${orderNumber} が配達されました 🎉`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('[Email] Failed to send delivery completion email:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] Delivery completion email sent to ${to} for order ${orderNumber}`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending delivery completion email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send review reminder email to customer
 */
export async function sendReviewReminderEmail(params: {
  to: string;
  userName: string;
  orderNumber: string;
  orderId: number;
  orderDate: Date;
  orderItems: Array<{
    productId: number;
    productNameJa: string;
    productImageUrl: string | null;
    orderItemId: number;
  }>;
  reviewPoints: number;
  reminderType: '7days' | '30days';
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not configured, skipping review reminder email');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const { to, userName, orderNumber, orderId, orderDate, orderItems, reviewPoints, reminderType } = params;
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';

    const reminderTitle = reminderType === '7days'
      ? 'ご購入いただいた商品のレビューをお待ちしております'
      : `【最終リマインダー】レビュー作成で${reviewPoints}Pプレゼント！`;

    const reminderMessage = reminderType === '7days'
      ? `${orderDate.toLocaleDateString('ja-JP')}にご注文いただいた商品の配達が完了してから7日が経過しました。`
      : `${orderDate.toLocaleDateString('ja-JP')}にご注文いただいた商品の配達が完了してから30日が経過しました。レビュー作成期限（90日）まで残りわずかです。`;

    // Generate product list HTML
    const productListHtml = orderItems.map(item => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #f3f4f6;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="80" style="padding-right: 15px;">
                ${item.productImageUrl ? `<img src="${item.productImageUrl}" alt="${item.productNameJa}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">` : ''}
              </td>
              <td style="vertical-align: top;">
                <div style="font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 8px;">${item.productNameJa}</div>
                <a href="${frontendUrl}/mypage/order/${orderId}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(249,115,22,0.3);">
                  ⭐ レビューを書く
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('');

    const emailHtml = emailWrapper(
      emailHeader(reminderTitle, reminderType === '30days' ? '⏰ 期限まで残りわずか！' : undefined) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
          ${userName}様
        </p>

        <p style="margin: 0 0 20px 0; font-size: 15px; color: #666; line-height: 1.8;">
          ${reminderMessage}
        </p>

        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <p style="margin: 0; font-size: 16px; color: #92400e; line-height: 1.6;">
            <strong>💰 レビュー作成で${reviewPoints}Pプレゼント！</strong><br>
            <span style="font-size: 14px;">商品のレビューを書いていただくと、次回のお買い物で使える${reviewPoints}ポイントを差し上げます。</span>
          </p>
        </div>

        <p style="margin: 20px 0; font-size: 15px; color: #666; line-height: 1.8;">
          ご購入いただいた商品のレビューをぜひお聞かせください。
        </p>

        <!-- Products List -->
        <h3 style="margin: 24px 0 16px 0; font-size: 16px; color: #111827; font-weight: 700; border-bottom: 2px solid #D30046; padding-bottom: 10px;">
          ご注文商品
        </h3>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          ${productListHtml}
        </table>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${frontendUrl}/mypage/order/${orderId}"
             style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(220,38,38,0.3);">
            注文詳細を見る
          </a>
        </div>

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #374151; font-weight: 700;">📝 レビュー作成のポイント</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #6b7280; line-height: 1.9;">
            <li>商品の使用感や効果について</li>
            <li>サイズ感や品質について</li>
            <li>配送や梱包について</li>
            <li>写真を添付すると+${Math.round(reviewPoints * 0.33)}P追加！</li>
            <li>詳しいレビュー（100文字以上）で+${Math.round(reviewPoints * 0.13)}P追加！</li>
          </ul>
        </div>

        <p style="margin: 16px 0 0 0; font-size: 12px; color: #9ca3af; line-height: 1.7;">
          ※ レビューは配達完了から90日以内に作成してください。<br>
          ※ このメールは配達完了から${reminderType === '7days' ? '7' : '30'}日後に自動送信されています。
        </p>
      </td></tr>` +
      emailFooter()
    );

    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to,
      subject: reminderTitle,
      html: emailHtml,
    });

    if (result.error) {
      console.error('[Email] Failed to send review reminder email:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] Review reminder (${reminderType}) sent to ${to} for order ${orderNumber}`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending review reminder email:', error);
    return { success: false, error: String(error) };
  }
}

// ============ 취소 이메일 알림 ============

/**
 * 부분/전체 취소 시 고객에게 취소 확인 + 환불 안내 이메일 발송
 */
export async function sendOrderCancellationEmail(params: {
  to: string;
  userName: string;
  orderNumber: string;
  orderId: number;
  cancelledItems: Array<{
    productName: string;
    productNameJa: string;
    quantity: number;
    refundAmount: number;
  }>;
  totalRefundAmount: number;
  cancelReason?: string;
  paymentMethod: string; // 'stripe' | 'bank_transfer' | 'cod'
  isFullCancellation: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not configured, skipping cancellation email');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const { to, userName, orderNumber, orderId, cancelledItems, totalRefundAmount, cancelReason, paymentMethod, isFullCancellation } = params;
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';

    const cancellationType = isFullCancellation ? 'ご注文のキャンセル' : 'ご注文の一部キャンセル';
    const subjectLabel = isFullCancellation ? '【キャンセル完了】' : '【一部キャンセル完了】';

    // 환불 방법 안내
    let refundMethodHtml = '';
    if (paymentMethod === 'stripe') {
      refundMethodHtml = `
        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <div style="font-size: 14px; font-weight: 700; color: #166534; margin-bottom: 6px;">💳 クレジットカード返金について</div>
          <div style="font-size: 13px; color: #15803d; line-height: 1.6;">
            ご登録のクレジットカードへ自動的に返金処理を行いました。<br>
            カード会社の処理により、返金反映まで<strong>3〜10営業日</strong>程度かかる場合があります。
          </div>
        </div>`;
    } else if (paymentMethod === 'bank_transfer') {
      refundMethodHtml = `
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <div style="font-size: 14px; font-weight: 700; color: #92400e; margin-bottom: 6px;">🏦 銀行振込返金について</div>
          <div style="font-size: 13px; color: #b45309; line-height: 1.6;">
            銀行振込でのご返金となります。<br>
            担当者よりご連絡いたしますので、返金先口座をご準備ください。<br>
            返金処理まで<strong>3〜5営業日</strong>程度かかる場合があります。
          </div>
        </div>`;
    }

    // 취소 상품 목록 HTML
    const itemsHtml = cancelledItems.map(item => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
          <div style="font-size: 14px; font-weight: 600; color: #111827;">${item.productNameJa || item.productName}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">数量: ${item.quantity}点</div>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: right; white-space: nowrap;">
          <div style="font-size: 14px; font-weight: 700; color: #ef4444;">${item.refundAmount.toLocaleString()}円</div>
        </td>
      </tr>
    `).join('');

    const emailHtml = emailWrapper(
      emailHeader(`${cancellationType}のお知らせ`, `${userName} 様`) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.8;">
          下記のご注文について、${cancellationType}の手続きが完了いたしました。
        </p>

        <!-- Order Number -->
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">注文番号</div>
          <div style="font-size: 16px; font-weight: 700; color: #111827;">${orderNumber}</div>
          ${cancelReason ? `<div style="font-size: 12px; color: #6b7280; margin-top: 8px;">キャンセル理由: ${cancelReason}</div>` : ''}
        </div>

        <!-- Cancelled Items -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 14px; font-weight: 700; color: #374151; margin-bottom: 12px;">キャンセル商品</div>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">商品名</th>
                <th style="padding: 10px 16px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">返金金額</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #FFF0F3;">
                <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #111827;">合計返金金額</td>
                <td style="padding: 12px 16px; text-align: right; font-size: 16px; font-weight: 800; color: #ef4444;">${totalRefundAmount.toLocaleString()}円</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Refund Method -->
        ${refundMethodHtml}

        <!-- CTA -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${frontendUrl}/mypage/order/${orderId}" style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 8px rgba(220,38,38,0.3);">
            注文詳細を確認する
          </a>
        </div>

        <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
          ご不明な点がございましたら、お気軽にお問い合わせください。
        </p>
      </td></tr>` +
      emailFooter()
    );

    const { Resend: ResendClass } = await import('resend');
    const resendClient = new ResendClass(process.env.RESEND_API_KEY);
    const result = await resendClient.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to,
      subject: `${subjectLabel} ご注文番号 ${orderNumber}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('[Email] Failed to send cancellation email:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] Cancellation email sent to ${to} for order ${orderNumber}`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending cancellation email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send delayed shipment notification email to customer
 */
export async function sendDelayedShipmentNotificationEmail(params: {
  to: string;
  userName: string;
  orderNumber: string;
  daysDelayed: number;
  trackingNumber?: string;
  carrierName?: string;
  trackingUrl?: string;
  shippedAt?: Date | null;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, orderNumber, daysDelayed, trackingNumber, carrierName, trackingUrl, shippedAt } = params;
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not configured, skipping delayed shipment email');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
    const shippedDateStr = shippedAt
      ? new Date(shippedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
      : '発送日不明';

    const trackingSection = trackingNumber
      ? `<div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0369a1; font-weight: 700;">📦 配送追跡情報</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #555; width: 100px;">配送業者</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; font-weight: 600;">${carrierName || '配送業者情報なし'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #555;">追跡番号</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; font-weight: 600; font-family: monospace;">${trackingNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #555;">発送日</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333;">${shippedDateStr}</td>
            </tr>
          </table>
          ${trackingUrl ? `<div style="margin-top: 16px; text-align: center;"><a href="${trackingUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">🔍 配送状況を確認する</a></div>` : ''}
        </div>`
      : `<div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #854d0e;">⚠️ 現在、追跡番号情報を確認中です。しばらくお待ちください。</p>
        </div>`;

    const emailHtml = emailWrapper(
      emailHeader('配送遅延のお知らせ', `ご注文番号: ${orderNumber}`) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #333; line-height: 1.7;">
          <strong>${userName}</strong> 様
        </p>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #555; line-height: 1.8;">
          いつも ${SHOP_NAME} をご利用いただき、誠にありがとうございます。<br>
          お客様のご注文 <strong style="color: #D30046;">${orderNumber}</strong> が発送されてから
          <strong style="color: #D30046;">${daysDelayed}日</strong>が経過しておりますが、
          まだ配達が完了していません。
        </p>

        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #9a3412; line-height: 1.7;">
            国際配送の場合、通関手続きや現地配送事情により、予定より時間がかかる場合があります。<br>
            ご不便をおかけし、誠に申し訳ございません。
          </p>
        </div>

        ${trackingSection}

        <div style="text-align: center; margin: 28px 0;">
          <a href="${frontendUrl}/mypage/orders" style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 8px rgba(220,38,38,0.3);">
            注文履歴を確認する
          </a>
        </div>

        <div style="background: #f9fafb; border-radius: 8px; padding: 16px 20px; margin-top: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151; font-weight: 600;">📞 カスタマーサポート</p>
          <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.7;">
            配送に関するご不明な点は、お問い合わせフォームよりご連絡ください。<br>
            迅速に対応いたします。
          </p>
        </div>
      </td></tr>` +
      emailFooter()
    );

    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to,
      subject: `【配送遅延のお知らせ】ご注文番号 ${orderNumber}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('[Email] Failed to send delayed shipment email:', result.error);
      return { success: false, error: result.error.message };
    }
    console.log(`[Email] Delayed shipment email sent to ${to} for order ${orderNumber} (${daysDelayed} days delayed)`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending delayed shipment email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send new product question notification email to admin
 */
export async function sendNewProductQuestionNotification(
  adminEmail: string,
  questionData: {
    id: number;
    productName: string;
    question: string;
    userName: string;
    userEmail: string;
  },
  from?: string,
  fromName?: string
) {
  const emailFrom = from || 'noreply@cocokusuri.com';
  const emailFromName = fromName || SHOP_NAME;
  const adminUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';

  const htmlContent = emailWrapper(
    emailHeader('🔔 新規商品Q&Aが届きました', `Q&A番号 #${questionData.id}`) +
    `<tr><td class="email-body-cell" style="padding: 40px 30px;">
      <div style="background: #f9fafb; border-left: 4px solid #D30046; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Q&A番号:</strong> #${questionData.id}</p>
        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>商品名:</strong> ${questionData.productName}</p>
        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>お客様名:</strong> ${questionData.userName}</p>
        <p style="margin: 0; color: #374151; font-size: 14px;"><strong>メールアドレス:</strong> ${questionData.userEmail}</p>
      </div>
      <div style="background: white; border: 1px solid #e5e7eb; padding: 16px 20px; margin-bottom: 24px; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">質問内容:</p>
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${questionData.question}</p>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${adminUrl}/admin/product-questions"
           style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 8px rgba(220,38,38,0.3);">
          商品Q&A管理ページへ
        </a>
      </div>
      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
        このメールはお客様が商品Q&Aを送信した際に自動送信されます。
      </p>
    </td></tr>` +
    emailFooter()
  );

  try {
    const response = await resend.emails.send({
      from: `${emailFromName} <${emailFrom}>`,
      to: adminEmail,
      subject: `[${SHOP_NAME}] 新規商品Q&A: ${questionData.productName}`,
      html: htmlContent,
    });
    return response;
  } catch (error) {
    console.error('[Email] Failed to send new product question notification:', error);
    throw error;
  }
}

// ============ Customer Inquiry Receipt Confirmation ============
export async function sendInquiryReceiptConfirmation(
  customerEmail: string,
  inquiryData: {
    id: number;
    title: string;
    content: string;
    inquiryUrl: string;
  },
  from?: string,
  fromName?: string
) {
  const emailFrom = from || 'noreply@cocokusuri.com';
  const emailFromName = fromName || SHOP_NAME;

  const htmlContent = emailWrapper(
    emailHeader('📩 お問い合わせを受け付けました', `受付番号 #${inquiryData.id}`) +
    `<tr><td class="email-body-cell" style="padding: 40px 30px;">
      <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 0 0 20px 0;">
        この度はお問い合わせいただき、ありがとうございます。<br>
        以下の内容でお問い合わせを受け付けました。<br>
        担当者が確認次第、折り返しご連絡いたします。
      </p>
      <div style="background: #f9fafb; border-left: 4px solid #D30046; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>受付番号:</strong> #${inquiryData.id}</p>
        <p style="margin: 0; color: #374151; font-size: 14px;"><strong>件名:</strong> ${inquiryData.title}</p>
      </div>
      <div style="background: white; border: 1px solid #e5e7eb; padding: 16px 20px; margin-bottom: 24px; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">お問い合わせ内容:</p>
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${inquiryData.content}</p>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${inquiryData.inquiryUrl}"
           style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 8px rgba(220,38,38,0.3);">
          お問い合わせ履歴を確認する
        </a>
      </div>
      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
        このメールはお問い合わせ受付時に自動送信されます。返信はできませんのでご了承ください。
      </p>
    </td></tr>` +
    emailFooter()
  );

  try {
    const response = await resend.emails.send({
      from: `${emailFromName} <${emailFrom}>`,
      to: customerEmail,
      subject: `[${SHOP_NAME}] お問い合わせ受付確認 #${inquiryData.id}`,
      html: htmlContent,
    });
    return response;
  } catch (error) {
    console.error('[Email] Failed to send inquiry receipt confirmation:', error);
    throw error;
  }
}

// ============================================================
// ポイント有効期限アラートメール (만료 30일 전 발송)
// ============================================================
export async function sendPointExpiryAlertEmail(params: {
  to: string;
  userName: string;
  expiringPoints: number;
  expiryDate: Date;
  shopName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not configured, skipping point expiry alert');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const { to, userName, expiringPoints, expiryDate, shopName = SHOP_NAME } = params;
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
    const pointsPageUrl = `${frontendUrl}/mypage/points`;
    const shopPageUrl = `${frontendUrl}/products`;

    const expiryDateStr = expiryDate.toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    // ポイント有効期限メールは特別なデザインを維持
    const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ポイント有効期限のお知らせ - ${shopName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif;-webkit-text-size-adjust:100%;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${expiringPoints.toLocaleString()}ptが${expiryDateStr}に失効します。失効前にご利用ください。
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f8;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- ===== HEADER / LOGO ===== -->
          <tr>
            <td style="background:${BRAND_GRADIENT};border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <div style="margin-bottom:14px;">
                <img src="${LOGO_URL}" alt="Coco Kusuri" style="width:48px;height:48px;border-radius:10px;display:inline-block;vertical-align:middle;margin-right:8px;">
                <span style="color:white;font-size:20px;font-weight:800;letter-spacing:0.5px;vertical-align:middle;">${shopName}</span>
              </div>
              <div style="color:rgba(255,255,255,0.8);font-size:11px;margin-bottom:18px;letter-spacing:1.5px;">${SHOP_TAGLINE}</div>
            </td>
          </tr>

          <!-- ===== ALERT BANNER ===== -->
          <tr>
            <td style="background:#fff3cd;border-left:4px solid #f6ad55;border-right:4px solid #f6ad55;padding:14px 40px;text-align:center;">
              <span style="font-size:13px;font-weight:700;color:#92400e;letter-spacing:0.5px;">⚠️ &nbsp;ポイント有効期限のお知らせ &nbsp;⚠️</span>
            </td>
          </tr>

          <!-- ===== MAIN BODY ===== -->
          <tr>
            <td style="background:#ffffff;padding:40px;">

              <!-- Greeting -->
              <p style="margin:0 0 20px 0;font-size:16px;color:#2d3748;font-weight:600;">${userName} 様</p>
              <p style="margin:0 0 28px 0;font-size:15px;color:#4
a5568;line-height:1.8;">
                いつも <strong style="color:#c53030;">${shopName}</strong> をご利用いただき、誠にありがとうございます。<br>
                お客様の保有ポイントの一部が間もなく失効します。<br>
                失効前にぜひご活用ください。
              </p>

              <!-- ===== POINT HIGHLIGHT BOX ===== -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#FFF0F3 0%,#FFE0E8 100%);border:2px solid #ffb3c6;border-radius:12px;padding:28px 24px;text-align:center;">
                    <div style="font-size:12px;font-weight:700;color:#9d174d;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">失効予定ポイント</div>
                    <div style="font-size:52px;font-weight:900;color:#D30046;line-height:1;margin-bottom:8px;letter-spacing:-2px;">
                      ${expiringPoints.toLocaleString()}
                      <span style="font-size:24px;font-weight:700;">pt</span>
                    </div>
                    <div style="display:inline-block;background:#D30046;color:white;font-size:13px;font-weight:700;padding:6px 18px;border-radius:20px;margin-top:12px;">
                      失効日：${expiryDateStr}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Info text -->
              <p style="margin:0 0 12px 0;font-size:14px;color:#4a5568;line-height:1.8;">
                ポイントはお買い物時に <strong>1pt = 1円</strong> としてご利用いただけます。<br>
                失効してしまうともったいないので、ぜひお早めにご使用ください。
              </p>

              <!-- Tip box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                <tr>
                  <td style="background:#f0fff4;border-left:4px solid #48bb78;border-radius:0 8px 8px 0;padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#276749;line-height:1.7;">
                      💡 <strong>ポイント活用のヒント</strong><br>
                      お気に入りの商品をカートに入れて、決済時にポイントを適用するだけ！<br>
                      複数のポイントをまとめて使うこともできます。
                    </p>
                  </td>
                </tr>
              </table>

              <!-- ===== CTA BUTTONS ===== -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <a href="${shopPageUrl}"
                       style="display:inline-block;background:${BRAND_GRADIENT};color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;padding:16px 48px;border-radius:50px;box-shadow:0 4px 15px rgba(219,39,119,0.4);letter-spacing:0.5px;">
                      🛒️ &nbsp;今すぐショッピングする
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${pointsPageUrl}"
                       style="display:inline-block;background:#ffffff;color:#D30046;font-size:14px;font-weight:700;text-decoration:none;padding:12px 36px;border-radius:50px;border:2px solid #D30046;letter-spacing:0.3px;">
                      📋 &nbsp;ポイント残高を確認する
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ===== FOOTER ===== -->
          <tr>
            <td style="background:#1f2937;border-radius:0 0 16px 16px;padding:28px 40px;text-align:center;">
              <p style="margin:0 0 10px 0;color:#9ca3af;font-size:13px;">
                <a href="${frontendUrl}" style="color:#ffb3c6;text-decoration:none;font-weight:600;">${shopName}</a>
                &nbsp;·&nbsp;
                <a href="${frontendUrl}/mypage" style="color:#9ca3af;text-decoration:none;">マイページ</a>
                &nbsp;·&nbsp;
                <a href="${frontendUrl}/contact" style="color:#9ca3af;text-decoration:none;">お問い合わせ</a>
              </p>
              <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.7;">
                このメールはポイント有効期限の30日前に自動送信されます。返信はできません。<br>
                &copy; ${new Date().getFullYear()} ${shopName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

    const result = await resend.emails.send({
      from: `${shopName} <noreply@cocokusuri.com>`,
      to,
      subject: `【重要】${expiringPoints.toLocaleString()}ptが${expiryDateStr}に失効します`,
      html: htmlContent,
    });

    if (result.error) {
      console.error('[Email] Failed to send point expiry alert:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] Point expiry alert sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending point expiry alert:', error);
    return { success: false, error: String(error) };
  }
}


/**
 * Generate preview HTML for a given email type (no actual sending)
 */
export function generateEmailPreviewHtml(emailType: string): string {
  const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
  const userName = 'テストユーザー 様';
  const orderNumber = 'ORD-2024-001';
  const reviewPoints = 1500;

  switch (emailType) {
    case 'test_email':
    case 'sendTestEmail':
      return emailWrapper(
        emailHeader('テストメール', 'メール設定の確認') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">こんにちは！</p>
          <p style="font-size: 14px; color: #666; margin-bottom: 20px; line-height: 1.8;">
            これは ${SHOP_NAME} のメール設定テストメッセージです。<br>
            このメールが届いた場合、メールシステムは正常に動作しています。
          </p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">送信者</p>
            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #D30046;">Kusuri Mall &lt;noreply@cocokusuri.com&gt;</p>
          </div>
          <p style="font-size: 12px; color: #999; margin: 0;">このメールはテスト目的で送信されました。</p>
        </td></tr>` +
        emailFooter()
      );

    case 'delivery_completion':
    case 'test_delivery':
      return emailWrapper(
        emailHeader('🎉 配達完了しました！', 'ご注文ありがとうございました') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="margin: 0 0 30px 0; font-size: 15px; color: #666; line-height: 1.8;">
            ご注文番号 <strong style="color: #D30046;">${orderNumber}</strong> の商品が無事に配達されました。
          </p>
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #92400e; font-weight: 700;">💎 レビューを書いて${reviewPoints}ポイント獲得！</h2>
            <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.7;">
              ご購入いただいた商品のレビューを書いていただくと、<strong>${reviewPoints}ポイント</strong>をプレゼント！
            </p>
          </div>
          <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #111827; font-weight: 700;">ご注文商品</h3>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <tr><td style="padding: 15px; border-bottom: 1px solid #f3f4f6;">
              <div style="font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 8px;">サンプル商品 A</div>
              <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">⭐ レビューを書いて${reviewPoints}P獲得</a>
            </td></tr>
          </table>
        </td></tr>` +
        emailFooter()
      );

    case 'review_reminder':
    case 'review_reminder_7days':
    case 'test_review_reminder':
      return emailWrapper(
        emailHeader('⭐ レビューをお忘れではないですか？', `ご注文から7日が経過しました`) +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="margin: 0 0 30px 0; font-size: 15px; color: #666; line-height: 1.8;">
            ご注文番号 <strong style="color: #D30046;">${orderNumber}</strong> の商品はいかがでしたか？<br>
            ぜひレビューをお聞かせください！
          </p>
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #92400e; font-weight: 700;">💎 今すぐレビューで${reviewPoints}ポイント！</h2>
            <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.7;">
              写真付きレビューには追加ポイントもございます。
            </p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${frontendUrl}/mypage/reviews" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">⭐ レビューを書く</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'order_cancellation':
      return emailWrapper(
        emailHeader('❌ ご注文がキャンセルされました', 'キャンセル完了のお知らせ') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="margin: 0 0 30px 0; font-size: 15px; color: #666; line-height: 1.8;">
            ご注文番号 <strong style="color: #D30046;">${orderNumber}</strong> がキャンセルされました。
          </p>
          <div style="background: #FFF0F3; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #D30046;">
            <p style="margin: 0; font-size: 14px; color: #8a0030; line-height: 1.7;">
              キャンセル理由: <strong>お客様のご要望によるキャンセル</strong><br>
              返金は3〜5営業日以内に処理されます。
            </p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 14px 36px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 15px;">🛍️ ショッピングを続ける</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'delayed_shipment':
      return emailWrapper(
        emailHeader('⚠️ 配送遅延のお知らせ', 'ご不便をおかけして申し訳ございません') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="margin: 0 0 30px 0; font-size: 15px; color: #666; line-height: 1.8;">
            ご注文番号 <strong style="color: #D30046;">${orderNumber}</strong> の配送が遅延しております。
          </p>
          <div style="background: #fffbeb; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.7;">
              現在、配送業者の都合により遅延が発生しております。<br>
              ご不便をおかけして大変申し訳ございません。
            </p>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'inquiry_receipt':
      return emailWrapper(
        emailHeader('📩 お問い合わせを受け付けました', 'ご連絡ありがとうございます') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="margin: 0 0 30px 0; font-size: 15px; color: #666; line-height: 1.8;">
            お問い合わせを受け付けました。<br>
            担当者が確認次第、2〜3営業日以内にご返答いたします。
          </p>
          <div style="background: #f0f9ff; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #0ea5e9;">
            <p style="margin: 0; font-size: 14px; color: #0c4a6e; line-height: 1.7;">
              <strong>お問い合わせ内容</strong><br>
              サンプルのお問い合わせ内容がここに表示されます。
            </p>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'point_expiry_alert':
    case 'test_point_expiry':
      return emailWrapper(
        emailHeader('⚠️ ポイント失効のお知らせ', '大切なポイントが失効します') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400e;">失効予定ポイント</p>
            <p style="margin: 0; font-size: 36px; font-weight: 800; color: #D30046;">3,500 pt</p>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #78350f;">失効日: 2024年12月31日</p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">🛍️ 今すぐショッピングする</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'retry_payment':
      return emailWrapper(
        emailHeader('💳 お支払いの再試行をお願いします', '決済が完了していません') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="margin: 0 0 30px 0; font-size: 15px; color: #666; line-height: 1.8;">
            ご注文番号 <strong style="color: #D30046;">${orderNumber}</strong> のお支払いが完了していません。
          </p>
          <div style="background: #FFF0F3; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #D30046;">
            <p style="margin: 0; font-size: 14px; color: #8a0030; line-height: 1.7;">
              決済金額: <strong>¥12,800</strong><br>
              有効期限: 24時間以内
            </p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">💳 お支払いを完了する</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'order_confirmation':
      return emailWrapper(
        emailHeader('🛒 ご注文ありがとうございます', `注文番号: ${orderNumber}`) +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">ご注文いただきありがとうございます。以下の内容でご注文を承りました。</p>
          <div style="background: #FFF0F3; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #D30046;">
            <p style="margin: 0; font-size: 14px; color: #9d174d; line-height: 1.8;">
              注文番号: <strong>${orderNumber}</strong><br>
              注文日時: 2024年1月15日 14:30<br>
              お支払い方法: クレジットカード
            </p>
          </div>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #FFF0F3;">
                <th style="padding: 12px 16px; text-align: left; font-size: 13px; color: #D30046;">商品名</th>
                <th style="padding: 12px 16px; text-align: center; font-size: 13px; color: #D30046;">数量</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 13px; color: #D30046;">小計</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #1f2937;">ロートCキューブ プレミアム点眼液</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: center; font-size: 14px; color: #6b7280;">2</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: right; font-size: 14px; font-weight: 700; color: #D30046;">¥3,200</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #1f2937;">第一三共ヘルスケア ロキソニンS</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: center; font-size: 14px; color: #6b7280;">1</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: right; font-size: 14px; font-weight: 700; color: #D30046;">¥1,580</td>
              </tr>
            </tbody>
          </table>
          <div style="text-align: right; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #6b7280; margin: 4px 0;">小計: ¥4,780</p>
            <p style="font-size: 14px; color: #6b7280; margin: 4px 0;">送料: ¥800</p>
            <p style="font-size: 18px; font-weight: 700; color: #D30046; margin: 8px 0;">合計: ¥5,580</p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${frontendUrl}/orders" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">📦 注文詳細を確認する</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'order_shipped':
      return emailWrapper(
        emailHeader('🚚 ご注文が発送されました', `注文番号: ${orderNumber}`) +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">ご注文の商品が発送されました。以下の追跡番号でお荷物の状況をご確認いただけます。</p>
          <div style="background: #FFF0F3; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #D30046;">
            <p style="margin: 0; font-size: 14px; color: #9d174d; line-height: 1.8;">
              追跡番号: <strong>JP123456789</strong><br>
              配送業者: ヤマト運輸<br>
              お届け予定: 2024年1月17日〜18日
            </p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">📍 配送状況を確認する</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'coupon_issued':
    case 'birthday_coupon':
    case 'first_purchase_coupon':
      return emailWrapper(
        emailHeader('🎁 クーポンが発行されました', emailType === 'birthday_coupon' ? '🎂 お誕生日おめでとうございます！' : 'ご利用ありがとうございます') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">特別クーポンをプレゼントします！ぜひご利用ください。</p>
          <div style="background: linear-gradient(135deg, #FFF0F3 0%, #FFE0E8 100%); border-radius: 16px; padding: 30px; margin-bottom: 24px; text-align: center; border: 2px dashed #D30046;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #9d174d; text-transform: uppercase; letter-spacing: 1px;">クーポンコード</p>
            <p style="margin: 0 0 16px 0; font-size: 32px; font-weight: 900; color: #D30046; letter-spacing: 4px;">WELCOME10</p>
            <p style="margin: 0; font-size: 14px; color: #9d174d;">10% OFF · 有効期限: 2024年2月15日</p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">🛒 今すぐショッピング</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'coupon_expiry_warning':
      return emailWrapper(
        emailHeader('⏰ クーポンの有効期限が近づいています', '期限切れ前にご利用ください') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">お持ちのクーポンの有効期限が <strong style="color: #D30046;">3日後</strong> に迫っています。お忘れなくご利用ください！</p>
          <div style="background: #FFF0F3; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 28px; font-weight: 900; color: #D30046;">SAVE15</p>
            <p style="margin: 0; font-size: 14px; color: #9d174d;">15% OFF · 有効期限: 2024年1月18日</p>
          </div>
          <div style="text-align: center;">
            <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">🛒 クーポンを使う</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'point_earned':
      return emailWrapper(
        emailHeader('⭐ ポイントが積立されました', 'ポイント積立のお知らせ') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">ご購入によりポイントが積立されました。</p>
          <div style="background: linear-gradient(135deg, #FFF0F3 0%, #FFE0E8 100%); border-radius: 16px; padding: 30px; margin-bottom: 24px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #9d174d;">今回の積立ポイント</p>
            <p style="margin: 0 0 8px 0; font-size: 48px; font-weight: 900; color: #D30046;">+250</p>
            <p style="margin: 0; font-size: 14px; color: #9d174d;">累計ポイント: 3,580 pt</p>
          </div>
          <div style="text-align: center;">
            <a href="${frontendUrl}/mypage/points" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">💰 ポイント残高を確認する</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'registration_complete':
      return emailWrapper(
        emailHeader('🎉 会員登録が完了しました', 'Coco Kusuriへようこそ！') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">Coco Kusuriへのご登録ありがとうございます！日本の医薬品・健康商品を安心してお買い物いただけます。</p>
          <div style="background: #FFF0F3; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; color: #D30046; font-size: 15px;">🌸 会員特典</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 2;">
              <li>全商品ポイント還元 (1%〜5%)</li>
              <li>会員限定セール・クーポン</li>
              <li>注文履歴・配送状況の確認</li>
              <li>お気に入りリスト機能</li>
            </ul>
          </div>
          <div style="text-align: center;">
            <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">🛒 ショッピングを始める</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'inquiry_reply':
      return emailWrapper(
        emailHeader('💬 お問い合わせへの回答', 'サポートチームより') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">お問い合わせいただきありがとうございます。以下の通りご回答いたします。</p>
          <div style="background: #FFF0F3; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #D30046;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #9d174d; text-transform: uppercase;">お問い合わせ内容</p>
            <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.7;">商品の在庫について確認したいのですが...</p>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">サポートからの回答</p>
            <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.8;">お問い合わせありがとうございます。ご指定の商品は現在在庫がございます。ご安心してご注文いただけます。</p>
          </div>
          <div style="text-align: center;">
            <a href="${frontendUrl}/bbs/inquiry" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">💬 問い合わせ一覧を見る</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'restock_alert':
      return emailWrapper(
        emailHeader('🔔 再入荷のお知らせ', 'ウィッシュリストの商品が入荷しました') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">お待たせしました！ウィッシュリストに登録されていた商品が再入荷しました。</p>
          <div style="background: #FFF0F3; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #1f2937;">ロートCキューブ プレミアム点眼液 13mL×3本</p>
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #D30046;">¥1,600</p>
          </div>
          <div style="text-align: center;">
            <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">🛒 今すぐ購入する</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'announcement':
    case 'event_started':
    case 'event_ending_soon':
      return emailWrapper(
        emailHeader('📢 Coco Kusuriからのお知らせ', emailType === 'event_ending_soon' ? '⏰ セール終了まであと1日！' : '🎉 新着情報') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <div style="background: linear-gradient(135deg, #FFF0F3 0%, #FFE0E8 100%); border-radius: 16px; padding: 30px; margin-bottom: 24px; text-align: center;">
            <p style="margin: 0 0 12px 0; font-size: 24px; font-weight: 900; color: #D30046;">🌸 春の健康フェア開催中！</p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #9d174d;">全商品最大20% OFF · 2024年1月15日〜31日</p>
          </div>
          <div style="text-align: center;">
            <a href="${frontendUrl}/sale" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">🎁 セールを見る</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'price_drop':
      return emailWrapper(
        emailHeader('💰 価格が下がりました！', 'ウィッシュリストの商品が値下がりしました') +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">ウィッシュリストに登録されていた商品の価格が下がりました！</p>
          <div style="background: #FFF0F3; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #1f2937;">第一三共ヘルスケア ロキソニンS 12錠</p>
            <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
              <p style="margin: 0; font-size: 14px; color: #9ca3af; text-decoration: line-through;">¥1,980</p>
              <p style="margin: 0; font-size: 22px; font-weight: 900; color: #D30046;">¥1,580</p>
              <span style="background: #D30046; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;">-20%</span>
            </div>
          </div>
          <div style="text-align: center;">
            <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">🛒 今すぐ購入する</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'review_approved':
    case 'review_rejected':
    case 'new_product_question':
    case 'review_reminder_30days':
      return emailWrapper(
        emailHeader(
          emailType === 'review_approved' ? '✅ レビューが承認されました' :
          emailType === 'review_rejected' ? '❌ レビューが却下されました' :
          emailType === 'new_product_question' ? '❓ 商品Q&Aが届きました' :
          '⭐ レビューをお願いします',
          emailType === 'review_approved' ? 'レビューありがとうございます' :
          emailType === 'review_rejected' ? 'ご確認ください' :
          emailType === 'new_product_question' ? '新しい質問があります' :
          'ご購入から30日が経ちました'
        ) +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">
            ${
              emailType === 'review_approved' ? 'ご投稿いただいたレビューが承認され、サイトに公開されました。ありがとうございます！' :
              emailType === 'review_rejected' ? 'ご投稿いただいたレビューは、ガイドラインに沿わない内容が含まれているため、公開できませんでした。' :
              emailType === 'new_product_question' ? '商品に新しいQ&Aが投稿されました。ご確認ください。' :
              'ご購入いただいた商品のレビューをお願いします。'
            }
          </p>
          <div style="text-align: center;">
            <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">⭐ レビューを書く</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    case 'password_changed':
    case 'profile_updated':
      return emailWrapper(
        emailHeader(
          emailType === 'password_changed' ? '🔒 パスワードが変更されました' : '✏️ プロフィールが更新されました',
          emailType === 'password_changed' ? 'セキュリティのお知らせ' : 'アカウント情報の更新'
        ) +
        `<tr><td class="email-body-cell" style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">${userName}</p>
          <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">
            ${emailType === 'password_changed'
              ? 'アカウントのパスワードが変更されました。ご自身で変更された場合は、このメールを無視してください。'
              : 'アカウントのプロフィール情報が更新されました。'
            }
          </p>
          <div style="background: #FFF0F3; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #D30046;">
            <p style="margin: 0; font-size: 14px; color: #9d174d; line-height: 1.8;">
              変更日時: 2024年1月15日 14:30<br>
              IPアドレス: 192.168.1.xxx
            </p>
          </div>
          <div style="text-align: center;">
            <a href="${frontendUrl}/mypage" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">👤 マイページを確認する</a>
          </div>
        </td></tr>` +
        emailFooter()
      );

    default:
      return emailWrapper(
        emailHeader('📧 メールプレビュー', emailType) +
        `<tr><td style="padding: 40px 30px; text-align: center; color: #6b7280;">
          <p>このメールタイプ (${emailType}) のプレビューは利用できません。</p>
        </td></tr>` +
        emailFooter()
      );
  }
}

/**
 * Send membership tier upgrade notification email
 */
export async function sendTierUpgradeEmail(params: {
  to: string;
  userName: string;
  previousTierName: string;
  newTierName: string;
  newDiscountRate: number;
  newPointRate: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }
    const { to, userName, previousTierName, newTierName, newDiscountRate, newPointRate } = params;
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
    const emailHtml = emailWrapper(
      emailHeader('🎉 ランクアップおめでとうございます！', `${previousTierName} → ${newTierName}`) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${userName} 様</p>
        <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">
          いつもご利用いただきありがとうございます。<br>
          お客様の会員ランクが <strong>${previousTierName}</strong> から <strong style="color: #D30046;">${newTierName}</strong> にアップグレードされました！
        </p>
        <div style="background: #FFF0F3; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px 0; color: #D30046; font-size: 16px;">✨ 新しい特典</h3>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #ffb3c6; color: #555; font-size: 14px;">お買い物割引</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #ffb3c6; text-align: right; font-weight: bold; color: #D30046; font-size: 16px;">${newDiscountRate}% OFF</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #555; font-size: 14px;">ポイント還元率</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #D30046; font-size: 16px;">${newPointRate}%</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${frontendUrl}/mypage/membership" style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
            マイページで確認する
          </a>
        </div>
      </td></tr>` +
      emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】おめでとうございます！会員ランクが${newTierName}にアップしました`,
      html: emailHtml,
    });
    if (result.error) {
      console.error('[Email] Failed to send tier upgrade email:', result.error);
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending tier upgrade email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send referral success notification email
 */
export async function sendReferralSuccessEmail(params: {
  to: string;
  referrerName: string;
  refereeName: string;
  rewardType: 'signup' | 'first_purchase';
  rewardPoints: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }
    const { to, referrerName, refereeName, rewardType, rewardPoints } = params;
    const typeLabel = rewardType === 'signup' ? '会員登録' : '初回購入';
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
    const emailHtml = emailWrapper(
      emailHeader('🎁 紹介報酬のお知らせ', `${rewardPoints.toLocaleString()}ポイント獲得！`) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${referrerName} 様</p>
        <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">
          お友達の <strong>${refereeName}</strong> 様が${typeLabel}を完了しました！<br>
          紹介報酬として <strong style="color: #D30046;">${rewardPoints.toLocaleString()}ポイント</strong> が付与されました。
        </p>
        <div style="background: #FFF0F3; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">獲得ポイント</p>
          <p style="margin: 0; font-size: 32px; font-weight: 800; color: #D30046;">+${rewardPoints.toLocaleString()} pt</p>
        </div>
        <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">
          引き続きお友達をご紹介いただくと、さらにポイントを獲得できます。
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${frontendUrl}/mypage/membership" style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
            マイページで確認する
          </a>
        </div>
      </td></tr>` +
      emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】紹介報酬 ${rewardPoints.toLocaleString()}ポイントが付与されました`,
      html: emailHtml,
    });
    if (result.error) {
      console.error('[Email] Failed to send referral success email:', result.error);
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending referral success email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send custom email from admin to customer
 */
export async function sendCustomEmailToCustomer(params: {
  to: string;
  userName: string;
  subject: string;
  content: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }
    const { to, userName, subject, content } = params;
    const emailHtml = emailWrapper(
      emailHeader(subject) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${userName} 様</p>
        <div style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px; white-space: pre-wrap;">${content}</div>
        <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          このメールは${SHOP_NAME}からお送りしています。<br>
          ご不明な点がございましたら、お問い合わせページよりご連絡ください。
        </p>
      </td></tr>` +
      emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】${subject}`,
      html: emailHtml,
    });
    if (result.error) {
      console.error('[Email] Failed to send custom email:', result.error);
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending custom email:', error);
    return { success: false, error: String(error) };
  }
}

// ─── Phase 1: 핵심 이메일 함수 ───────────────────────────────────────────────

/**
 * 1-1: 회원가입 완료 이메일
 */
export async function sendWelcomeEmail(params: {
  to: string;
  userName: string;
  loginUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, userName, loginUrl } = params;
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
    const url = loginUrl || `${frontendUrl}/login`;
    const emailHtml = emailWrapper(
      emailHeader('ご登録ありがとうございます！', 'Kusuri Mall へようこそ') +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${userName} 様</p>
        <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">
          この度はKusuri Mallにご登録いただき、誠にありがとうございます。<br>
          日本の高品質な健康・医薬品をお届けするため、スタッフ一同心よりお待ちしております。
        </p>
        <div style="background: #FFF0F3; border-left: 4px solid #D30046; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #333; font-weight: 600;">🎁 新規会員特典</p>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">初回のご注文で使えるウェルカムクーポンをお送りしました。ぜひご利用ください！</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">ショッピングを始める</a>
        </div>
      </td></tr>` +
      emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】ご登録ありがとうございます！`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendWelcomeEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 1-4: 비밀번호 변경 완료 이메일
 */
export async function sendPasswordChangedEmail(params: {
  to: string;
  userName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, userName } = params;
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
    const emailHtml = emailWrapper(
      emailHeader('パスワードが変更されました', 'セキュリティのお知らせ') +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${userName} 様</p>
        <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">
          お客様のアカウントのパスワードが正常に変更されました。
        </p>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #333; font-weight: 600;">⚠️ ご注意</p>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">もし心当たりのない変更の場合は、すぐにお問い合わせください。</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}/contact" style="display: inline-block; background: #f59e0b; color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">お問い合わせ</a>
        </div>
      </td></tr>` +
      emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】パスワードが変更されました`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendPasswordChangedEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 2-12/13: 환불 완료 / 부분 취소 알림 이메일
 */
export async function sendRefundEmail(params: {
  to: string;
  userName: string;
  orderId: number;
  refundAmount: number;
  cancelledItems: Array<{ name: string; quantity: number; price: number }>;
  isPartial: boolean;
  orderUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, userName, orderId, refundAmount, cancelledItems, isPartial, orderUrl } = params;
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
    const url = orderUrl || `${frontendUrl}/mypage/orders/${orderId}`;
    const title = isPartial ? '一部商品のキャンセル・返金のお知らせ' : 'ご注文キャンセル・返金のお知らせ';
    const itemsHtml = cancelledItems.map(item =>
      `<tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #333;">${item.name}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #666; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #333; text-align: right;">¥${item.price.toLocaleString()}</td>
      </tr>`
    ).join('');
    const emailHtml = emailWrapper(
      emailHeader(title) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${userName} 様</p>
        <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">
          ご注文番号 <strong>#${orderId}</strong> の${isPartial ? '一部商品' : ''}キャンセル処理が完了しました。
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
          <thead><tr style="background: #f9fafb;">
            <th style="padding: 10px; text-align: left; font-size: 13px; color: #666;">商品名</th>
            <th style="padding: 10px; text-align: center; font-size: 13px; color: #666;">数量</th>
            <th style="padding: 10px; text-align: right; font-size: 13px; color: #666;">金額</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 15px; color: #166534; font-weight: 600;">返金金額: ¥${refundAmount.toLocaleString()}</p>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #166534;">ご利用の決済方法により、返金まで3〜10営業日かかる場合がございます。</p>
        </div>
        <div style="text-align: center;">
          <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">注文詳細を確認</a>
        </div>
      </td></tr>` +
      emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】${title}（注文番号: #${orderId}）`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendRefundEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 3-5: 상품 Q&A 답변 알림 이메일
 */
export async function sendProductQAAnswerEmail(params: {
  to: string;
  userName: string;
  productName: string;
  question: string;
  answer: string;
  productUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, userName, productName, question, answer, productUrl } = params;
    const emailHtml = emailWrapper(
      emailHeader('商品Q&Aへの回答が届きました', productName) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${userName} 様</p>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af; font-weight: 600;">ご質問</p>
          <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.7;">${question}</p>
        </div>
        <div style="background: #FFF0F3; border-left: 4px solid #D30046; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #D30046; font-weight: 600;">回答</p>
          <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.7;">${answer}</p>
        </div>
        ${productUrl ? `<div style="text-align: center;"><a href="${productUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">商品ページを確認</a></div>` : ''}
      </td></tr>` +
      emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】商品Q&Aへの回答が届きました`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendProductQAAnswerEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 3-8/9: 리뷰 승인/반려 알림 이메일
 */
export async function sendReviewStatusEmail(params: {
  to: string;
  userName: string;
  productName: string;
  status: 'approved' | 'rejected';
  rejectReason?: string;
  reviewUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, userName, productName, status, rejectReason, reviewUrl } = params;
    const isApproved = status === 'approved';
    const title = isApproved ? 'レビューが承認されました' : 'レビューが非承認となりました';
    const emailHtml = emailWrapper(
      emailHeader(title, productName) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${userName} 様</p>
        <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">「${productName}」へのレビューが${isApproved ? '承認されました' : '非承認となりました'}。</p>
        ${isApproved
          ? `<div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;"><p style="margin: 0; font-size: 14px; color: #166534;">✅ レビューが公開されました。ご投稿ありがとうございます！</p></div>`
          : `<div style="background: #FFF0F3; border-left: 4px solid #D30046; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;"><p style="margin: 0 0 8px 0; font-size: 14px; color: #8a0030; font-weight: 600;">❌ 非承認の理由</p><p style="margin: 0; font-size: 14px; color: #555;">${rejectReason || '利用規約に違反する内容が含まれていたため、非承認となりました。'}</p></div>`
        }
        ${reviewUrl ? `<div style="text-align: center;"><a href="${reviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">レビューを確認</a></div>` : ''}
      </td></tr>` +
      emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】${title}`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendReviewStatusEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 4-1: 쿠폰 발급 알림 이메일
 */
export async function sendCouponIssuedEmail(params: {
  to: string;
  userName: string;
  couponCode: string;
  couponName: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  expiresAt?: Date;
  minOrderAmount?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, userName, couponCode, couponName, discountType, discountValue, expiresAt, minOrderAmount } = params;
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
    const discountText = discountType === 'percentage' ? `${discountValue}%OFF` : `¥${discountValue.toLocaleString()}OFF`;
    const expiryText = expiresAt ? `有効期限: ${new Date(expiresAt).toLocaleDateString('ja-JP')}` : '有効期限なし';
    const emailHtml = emailWrapper(
      emailHeader('クーポンが発行されました！', discountText) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${userName} 様</p>
        <div style="background: linear-gradient(135deg, #FFF0F3 0%, #fff7ed 100%); border: 2px dashed #D30046; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af;">${couponName}</p>
          <p style="margin: 0 0 12px 0; font-size: 36px; font-weight: 800; color: #D30046; letter-spacing: 2px;">${couponCode}</p>
          <p style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #333;">${discountText}</p>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">${expiryText}${minOrderAmount ? ` | ¥${minOrderAmount.toLocaleString()}以上のご注文で使用可能` : ''}</p>
        </div>
        <div style="text-align: center;">
          <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">今すぐショッピング</a>
        </div>
      </td></tr>` +
      emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】クーポンが発行されました（${discountText}）`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendCouponIssuedEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 5-1: 이벤트 시작 안내 이메일
 */
export async function sendEventStartEmail(params: {
  to: string;
  userName: string;
  eventTitle: string;
  eventDescription: string;
  eventImageUrl?: string;
  startDate: Date;
  endDate: Date;
  eventUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, userName, eventTitle, eventDescription, eventImageUrl, startDate, endDate, eventUrl } = params;
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
    const url = eventUrl || `${frontendUrl}/events`;
    const startStr = new Date(startDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const endStr = new Date(endDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const emailHtml = emailWrapper(
      emailHeader('🎉 イベント開催のお知らせ', eventTitle) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${userName} 様</p>
        ${eventImageUrl ? `<img src="${eventImageUrl}" alt="${eventTitle}" style="width: 100%; border-radius: 8px; margin-bottom: 20px;">` : ''}
        <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #D30046;">${eventTitle}</h2>
        <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 20px;">${eventDescription}</p>
        <div style="background: #FFF0F3; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #333;">📅 開催期間: <strong>${startStr} 〜 ${endStr}</strong></p>
        </div>
        <div style="text-align: center;">
          <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">イベントを見る</a>
        </div>
      </td></tr>` +
      emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】🎉 イベント開催のお知らせ: ${eventTitle}`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendEventStartEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 5-6: 재입고 알림 이메일
 */
export async function sendRestockAlertEmail(params: {
  to: string;
  userName: string;
  productName: string;
  productImageUrl?: string;
  productUrl?: string;
  stock: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, userName, productName, productImageUrl, productUrl, stock } = params;
    const emailHtml = emailWrapper(
      emailHeader('入荷のお知らせ', productName) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${userName} 様</p>
        <p style="font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px;">お待たせいたしました！ご希望の商品が入荷いたしました。</p>
        ${productImageUrl ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${productImageUrl}" alt="${productName}" style="max-width: 200px; border-radius: 8px;"></div>` : ''}
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 15px; color: #166534; font-weight: 600;">✅ ${productName}</p>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #166534;">在庫数: ${stock}点</p>
        </div>
        <p style="font-size: 13px; color: #9ca3af; margin-bottom: 24px;">※ 在庫に限りがございます。お早めにご購入ください。</p>
        ${productUrl ? `<div style="text-align: center;"><a href="${productUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">商品ページへ</a></div>` : ''}
      </td></tr>` +
      emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】入荷のお知らせ: ${productName}`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendRestockAlertEmail error:', error);
    return { success: false, error: String(error) };
  }
}


// ============================================================
// Phase 2: 보조 이메일 함수들
// ============================================================

/** 프로필 수정 확인 이메일 */
export async function sendProfileUpdatedEmail(params: {
  to: string;
  userName: string;
  updatedFields: string[];
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, updatedFields } = params;
  try {
    const emailHtml = emailWrapper(
      emailHeader('会員情報を更新しました') +
      `<tr><td style="padding: 32px 40px 24px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">以下の会員情報が更新されました。</p>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
            ${updatedFields.map(f => `<li style="margin-bottom: 4px;">${f}</li>`).join('')}
          </ul>
        </div>
        <p style="font-size: 13px; color: #6b7280;">ご自身で変更した覚えがない場合は、すぐにパスワードを変更し、カスタマーサポートまでご連絡ください。</p>
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】会員情報更新のお知らせ`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendProfileUpdatedEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/** 쿠폰 만료 예정 알림 이메일 */
export async function sendCouponExpiryReminderEmail(params: {
  to: string;
  userName: string;
  couponCode: string;
  couponName: string;
  discountText: string;
  expiresAt: Date;
  shopUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, couponCode, couponName, discountText, expiresAt, shopUrl } = params;
  try {
    const expiryStr = expiresAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const emailHtml = emailWrapper(
      emailHeader('クーポン有効期限のお知らせ', `${expiryStr}まで`) +
      `<tr><td style="padding: 32px 40px 24px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">お持ちのクーポンの有効期限が近づいています。お早めにご利用ください。</p>
        <div style="background: #FFF0F3; border: 1px solid #ffb3c6; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">クーポン名</p>
          <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1f2937;">${couponName}</p>
          <p style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: #D30046;">${discountText}</p>
          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #374151; letter-spacing: 2px; background: #fff; border: 2px dashed #D30046; border-radius: 4px; padding: 8px 16px; display: inline-block;">${couponCode}</p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #D30046; font-weight: 600;">有効期限: ${expiryStr}まで</p>
        </div>
        ${shopUrl ? `<div style="text-align: center;"><a href="${shopUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">今すぐショッピングへ</a></div>` : ''}
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】クーポン有効期限のお知らせ（${expiryStr}まで）`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendCouponExpiryReminderEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/** 생일 쿠폰 이메일 */
export async function sendBirthdayCouponEmail(params: {
  to: string;
  userName: string;
  couponCode: string;
  discountText: string;
  expiresAt: Date;
  shopUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, couponCode, discountText, expiresAt, shopUrl } = params;
  try {
    const expiryStr = expiresAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const emailHtml = emailWrapper(
      emailHeader('🎂 お誕生日おめでとうございます！', '特別クーポンをプレゼント') +
      `<tr><td style="padding: 32px 40px 24px; text-align: center;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 24px; font-size: 15px; color: #374151;">日頃のご愛顧に感謝して、お誕生日特別クーポンをプレゼントします🎁</p>
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #92400e;">バースデークーポン</p>
          <p style="margin: 0 0 12px; font-size: 28px; font-weight: 800; color: #D30046;">${discountText}</p>
          <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #374151; letter-spacing: 3px; background: #fff; border-radius: 6px; padding: 10px 20px; display: inline-block;">${couponCode}</p>
          <p style="margin: 8px 0 0; font-size: 12px; color: #92400e;">有効期限: ${expiryStr}まで</p>
        </div>
        ${shopUrl ? `<a href="${shopUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">プレゼントを使う</a>` : ''}
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】🎂 お誕生日おめでとうございます！特別クーポンをプレゼント`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendBirthdayCouponEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/** 포인트 적립 알림 이메일 */
export async function sendPointsEarnedEmail(params: {
  to: string;
  userName: string;
  earnedPoints: number;
  totalPoints: number;
  reason: string;
  shopUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, earnedPoints, totalPoints, reason, shopUrl } = params;
  try {
    const emailHtml = emailWrapper(
      emailHeader('ポイントが付与されました', `+${earnedPoints.toLocaleString()}pt`) +
      `<tr><td style="padding: 32px 40px 24px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">ポイントが付与されました。</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;">${reason}</p>
          <p style="margin: 0 0 8px; font-size: 32px; font-weight: 800; color: #16a34a;">+${earnedPoints.toLocaleString()}pt</p>
          <p style="margin: 0; font-size: 14px; color: #374151;">現在の保有ポイント: <strong>${totalPoints.toLocaleString()}pt</strong></p>
        </div>
        <p style="font-size: 13px; color: #6b7280; margin-bottom: 24px;">ポイントは1pt = 1円としてお買い物にご利用いただけます。</p>
        ${shopUrl ? `<div style="text-align: center;"><a href="${shopUrl}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">ポイントを使う</a></div>` : ''}
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】${earnedPoints.toLocaleString()}ポイントが付与されました`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendPointsEarnedEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/** 이벤트 종료 임박 알림 이메일 */
export async function sendEventEndingSoonEmail(params: {
  to: string;
  userName: string;
  eventTitle: string;
  eventDescription: string;
  eventImageUrl?: string;
  endDate: Date;
  eventUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, eventTitle, eventDescription, eventImageUrl, endDate, eventUrl } = params;
  try {
    const endDateStr = endDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const emailHtml = emailWrapper(
      emailHeader('⏰ イベント終了まであとわずか！', eventTitle) +
      `<tr><td style="padding: 32px 40px 24px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">開催中のイベントが間もなく終了します。お見逃しなく！</p>
        ${eventImageUrl ? `<img src="${eventImageUrl}" alt="${eventTitle}" style="width: 100%; border-radius: 8px; margin-bottom: 16px;">` : ''}
        <div style="background: #FFF0F3; border: 1px solid #ffb3c6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 8px; font-size: 18px; color: #1f2937;">${eventTitle}</h3>
          <p style="margin: 0 0 12px; font-size: 14px; color: #374151;">${eventDescription}</p>
          <p style="margin: 0; font-size: 14px; color: #D30046; font-weight: 600;">終了日時: ${endDateStr}</p>
        </div>
        ${eventUrl ? `<div style="text-align: center;"><a href="${eventUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">イベントを確認する</a></div>` : ''}
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】⏰ 「${eventTitle}」終了まであとわずか！`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendEventEndingSoonEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/** 가격 인하 알림 이메일 (위시리스트 상품) */
export async function sendPriceDropEmail(params: {
  to: string;
  userName: string;
  productName: string;
  originalPrice: number;
  newPrice: number;
  discountRate: number;
  productUrl?: string;
  productImageUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, productName, originalPrice, newPrice, discountRate, productUrl, productImageUrl } = params;
  try {
    const emailHtml = emailWrapper(
      emailHeader('💰 お気に入り商品が値下がりしました！', `${discountRate}% OFF`) +
      `<tr><td style="padding: 32px 40px 24px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">ウィッシュリストに追加された商品の価格が下がりました。</p>
        ${productImageUrl ? `<img src="${productImageUrl}" alt="${productName}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 16px; display: block; margin-left: auto; margin-right: auto;">` : ''}
        <div style="background: #FFF0F3; border: 1px solid #ffb3c6; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <h3 style="margin: 0 0 12px; font-size: 16px; color: #1f2937;">${productName}</h3>
          <p style="margin: 0 0 4px; font-size: 14px; color: #9ca3af; text-decoration: line-through;">¥${originalPrice.toLocaleString()}</p>
          <p style="margin: 0 0 4px; font-size: 28px; font-weight: 800; color: #D30046;">¥${newPrice.toLocaleString()}</p>
          <span style="background: #D30046; color: white; font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 4px;">${discountRate}% OFF</span>
        </div>
        ${productUrl ? `<div style="text-align: center;"><a href="${productUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">商品を見る</a></div>` : ''}
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】💰 「${productName}」が${discountRate}%値下がりしました！`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendPriceDropEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/** 주문 접수 관리자 알림 이메일 */
export async function sendNewOrderAdminNotification(params: {
  to: string;
  orderId: number;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  paymentMethod: string;
  adminOrderUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, orderId, orderNumber, customerName, totalAmount, itemCount, paymentMethod, adminOrderUrl } = params;
  try {
    const emailHtml = emailWrapper(
      emailHeader('🛒 新しい注文が入りました', `注文番号 #${orderNumber}`) +
      `<tr><td style="padding: 32px 40px 24px;">
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #6b7280; width: 40%;">注文番号</td><td style="padding: 6px 0; color: #1f2937; font-weight: 600;">${orderNumber}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">注文者</td><td style="padding: 6px 0; color: #1f2937;">${customerName}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">合計金額</td><td style="padding: 6px 0; color: #D30046; font-weight: 700; font-size: 16px;">¥${totalAmount.toLocaleString()}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">商品数</td><td style="padding: 6px 0; color: #1f2937;">${itemCount}点</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">支払方法</td><td style="padding: 6px 0; color: #1f2937;">${paymentMethod}</td></tr>
          </table>
        </div>
        ${adminOrderUrl ? `<div style="text-align: center;"><a href="${adminOrderUrl}" style="display: inline-block; background: linear-gradient(135deg, #1f2937 0%, #374151 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">注文を確認する</a></div>` : ''}
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【管理者通知】新しい注文 #${orderNumber}`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendNewOrderAdminNotification error:', error);
    return { success: false, error: String(error) };
  }
}

/** 리뷰 포인트 적립 알림 이메일 */
export async function sendReviewPointsEmail(params: {
  to: string;
  userName: string;
  productName: string;
  earnedPoints: number;
  totalPoints: number;
  shopUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, productName, earnedPoints, totalPoints, shopUrl } = params;
  try {
    const emailHtml = emailWrapper(
      emailHeader('レビューポイントが付与されました', `+${earnedPoints.toLocaleString()}pt`) +
      `<tr><td style="padding: 32px 40px 24px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">「${productName}」のレビューを投稿いただきありがとうございます。ポイントを付与しました。</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;">レビュー投稿ポイント</p>
          <p style="margin: 0 0 8px; font-size: 32px; font-weight: 800; color: #16a34a;">+${earnedPoints.toLocaleString()}pt</p>
          <p style="margin: 0; font-size: 14px; color: #374151;">現在の保有ポイント: <strong>${totalPoints.toLocaleString()}pt</strong></p>
        </div>
        ${shopUrl ? `<div style="text-align: center;"><a href="${shopUrl}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">ショッピングへ</a></div>` : ''}
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】レビュー投稿ポイント ${earnedPoints.toLocaleString()}pt 付与のお知らせ`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendReviewPointsEmail error:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================================
// Phase 3: 부가 이메일 함수들
// ============================================================

/** 로그인 이상 감지 알림 이메일 */
export async function sendSuspiciousLoginEmail(params: {
  to: string;
  userName: string;
  loginTime: Date;
  ipAddress?: string;
  deviceInfo?: string;
  changePasswordUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, loginTime, ipAddress, deviceInfo, changePasswordUrl } = params;
  try {
    const loginTimeStr = loginTime.toLocaleString('ja-JP');
    const emailHtml = emailWrapper(
      emailHeader('⚠️ 不審なログインを検知しました', 'セキュリティアラート') +
      `<tr><td style="padding: 32px 40px 24px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">お客様のアカウントに通常とは異なるログインが検知されました。</p>
        <div style="background: #FFF0F3; border: 1px solid #ffb3c6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #374151;"><strong>ログイン日時:</strong> ${loginTimeStr}</p>
          ${ipAddress ? `<p style="margin: 0 0 8px; font-size: 14px; color: #374151;"><strong>IPアドレス:</strong> ${ipAddress}</p>` : ''}
          ${deviceInfo ? `<p style="margin: 0; font-size: 14px; color: #374151;"><strong>デバイス:</strong> ${deviceInfo}</p>` : ''}
        </div>
        <p style="font-size: 14px; color: #374151; margin-bottom: 24px;">ご自身でログインした場合は、このメールを無視してください。心当たりがない場合は、すぐにパスワードを変更してください。</p>
        ${changePasswordUrl ? `<div style="text-align: center;"><a href="${changePasswordUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">パスワードを変更する</a></div>` : ''}
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】⚠️ セキュリティアラート: 不審なログインを検知しました`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendSuspiciousLoginEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/** 회원 탈퇴 확인 이메일 */
export async function sendAccountDeletionEmail(params: {
  to: string;
  userName: string;
  deletedAt: Date;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, deletedAt } = params;
  try {
    const deletedAtStr = deletedAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const emailHtml = emailWrapper(
      emailHeader('退会処理が完了しました') +
      `<tr><td style="padding: 32px 40px 24px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${deletedAtStr}をもちまして、退会処理が完了いたしました。</p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">これまでのご利用、誠にありがとうございました。またのご利用をお待ちしております。</p>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; color: #6b7280;">※ 退会後のデータは復元できません。ご了承ください。</p>
        </div>
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】退会処理完了のお知らせ`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendAccountDeletionEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/** 이벤트 당첨 알림 이메일 */
export async function sendEventWinnerEmail(params: {
  to: string;
  userName: string;
  eventTitle: string;
  prize: string;
  claimDeadline?: Date;
  claimUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, eventTitle, prize, claimDeadline, claimUrl } = params;
  try {
    const deadlineStr = claimDeadline ? claimDeadline.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const emailHtml = emailWrapper(
      emailHeader('🎉 おめでとうございます！当選しました！', eventTitle) +
      `<tr><td style="padding: 32px 40px 24px; text-align: center;">
        <p style="font-size: 40px; margin: 0 0 8px;">🏆</p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">「${eventTitle}」に当選されました！おめでとうございます！</p>
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #92400e;">当選賞品</p>
          <p style="margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #1f2937;">${prize}</p>
          ${deadlineStr ? `<p style="margin: 8px 0 0; font-size: 12px; color: #92400e;">受取期限: ${deadlineStr}まで</p>` : ''}
        </div>
        ${claimUrl ? `<a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">賞品を受け取る</a>` : ''}
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】🎉 おめでとうございます！「${eventTitle}」に当選しました！`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendEventWinnerEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/** 신상품 알림 이메일 (뉴스레터) */
export async function sendNewProductNewsletterEmail(params: {
  to: string;
  userName: string;
  products: Array<{ name: string; price: number; imageUrl?: string; productUrl?: string; description?: string }>;
  shopUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, products, shopUrl } = params;
  try {
    const productCards = products.map(p => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" style="width: 100%; height: 160px; object-fit: cover;">` : ''}
        <div style="padding: 16px;">
          <h3 style="margin: 0 0 8px; font-size: 15px; color: #1f2937;">${p.name}</h3>
          ${p.description ? `<p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">${p.description}</p>` : ''}
          <p style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #D30046;">¥${p.price.toLocaleString()}</p>
          ${p.productUrl ? `<a href="${p.productUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600;">詳細を見る</a>` : ''}
        </div>
      </div>
    `).join('');
    const emailHtml = emailWrapper(
      emailHeader('✨ 新商品のご案内', '最新の商品をチェック！') +
      `<tr><td style="padding: 32px 40px 24px;">
        <p style="margin: 0 0 24px; font-size: 15px; color: #374151;">${userName} 様、新しい商品が入荷しました！</p>
        ${productCards}
        ${shopUrl ? `<div style="text-align: center; margin-top: 24px;"><a href="${shopUrl}" style="display: inline-block; background: linear-gradient(135deg, #D30046 0%, #a8003a 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">全商品を見る</a></div>` : ''}
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】✨ 新商品のご案内`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendNewProductNewsletterEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/** 포인트 차감 알림 이메일 */
export async function sendPointsDeductedEmail(params: {
  to: string;
  userName: string;
  deductedPoints: number;
  remainingPoints: number;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, deductedPoints, remainingPoints, reason } = params;
  try {
    const emailHtml = emailWrapper(
      emailHeader('ポイントが使用されました', `-${deductedPoints.toLocaleString()}pt`) +
      `<tr><td style="padding: 32px 40px 24px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">ポイントが使用されました。</p>
        <div style="background: #FFF0F3; border: 1px solid #ffb3c6; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;">${reason}</p>
          <p style="margin: 0 0 8px; font-size: 32px; font-weight: 800; color: #D30046;">-${deductedPoints.toLocaleString()}pt</p>
          <p style="margin: 0; font-size: 14px; color: #374151;">残りポイント: <strong>${remainingPoints.toLocaleString()}pt</strong></p>
        </div>
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】${deductedPoints.toLocaleString()}ポイントが使用されました`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendPointsDeductedEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/** 첫 구매 감사 쿠폰 이메일 */
export async function sendFirstPurchaseCouponEmail(params: {
  to: string;
  userName: string;
  couponCode: string;
  discountText: string;
  expiresAt: Date;
  shopUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, couponCode, discountText, expiresAt, shopUrl } = params;
  try {
    const expiryStr = expiresAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const emailHtml = emailWrapper(
      emailHeader('🎁 初回ご購入ありがとうございます！', '次回使えるクーポンをプレゼント') +
      `<tr><td style="padding: 32px 40px 24px; text-align: center;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 24px; font-size: 15px; color: #374151;">初めてのご購入、誠にありがとうございます！次回のお買い物にお使いいただけるクーポンをプレゼントします。</p>
        <div style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #5b21b6;">初回購入特典クーポン</p>
          <p style="margin: 0 0 12px; font-size: 28px; font-weight: 800; color: #D30046;">${discountText}</p>
          <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #374151; letter-spacing: 3px; background: #fff; border-radius: 6px; padding: 10px 20px; display: inline-block;">${couponCode}</p>
          <p style="margin: 8px 0 0; font-size: 12px; color: #5b21b6;">有効期限: ${expiryStr}まで</p>
        </div>
        ${shopUrl ? `<a href="${shopUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">ショッピングへ</a>` : ''}
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】🎁 初回ご購入ありがとうございます！次回使えるクーポンをプレゼント`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendFirstPurchaseCouponEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/** 장기 미구매 고객 재방문 쿠폰 이메일 */
export async function sendWinBackCouponEmail(params: {
  to: string;
  userName: string;
  couponCode: string;
  discountText: string;
  expiresAt: Date;
  lastPurchaseDate?: Date;
  shopUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, couponCode, discountText, expiresAt, lastPurchaseDate, shopUrl } = params;
  try {
    const expiryStr = expiresAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const lastPurchaseStr = lastPurchaseDate ? lastPurchaseDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const emailHtml = emailWrapper(
      emailHeader('お久しぶりです！特別クーポンをご用意しました', 'またのご来店をお待ちしております') +
      `<tr><td style="padding: 32px 40px 24px; text-align: center;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">${userName} 様</p>
        <p style="margin: 0 0 8px; font-size: 15px; color: #374151;">しばらくのご無沙汰ですね。${lastPurchaseStr ? `最後のご購入から時間が経ちました。` : ''}またのご来店をお待ちしておりました！</p>
        <p style="margin: 0 0 24px; font-size: 15px; color: #374151;">感謝の気持ちを込めて、特別クーポンをご用意しました。</p>
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #065f46;">カムバッククーポン</p>
          <p style="margin: 0 0 12px; font-size: 28px; font-weight: 800; color: #D30046;">${discountText}</p>
          <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #374151; letter-spacing: 3px; background: #fff; border-radius: 6px; padding: 10px 20px; display: inline-block;">${couponCode}</p>
          <p style="margin: 8px 0 0; font-size: 12px; color: #065f46;">有効期限: ${expiryStr}まで</p>
        </div>
        ${shopUrl ? `<a href="${shopUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: 600;">ショッピングへ戻る</a>` : ''}
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】お久しぶりです！特別クーポンをご用意しました`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendWinBackCouponEmail error:', error);
    return { success: false, error: String(error) };
  }
}

// ─── 발송지연 알림 이메일 ─────────────────────────────────────────────────────
export async function sendShipmentDelayNotificationEmail(params: {
  to: string;
  userName: string;
  orderNumber: string;
  delayReason: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, orderNumber, delayReason } = params;
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not configured, skipping shipment delay email');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://localhost:3000';
    const emailHtml = emailWrapper(
      emailHeader('発送遅延のお知らせ', `ご注文番号: ${orderNumber}`) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #333; line-height: 1.7;">
          <strong>${userName}</strong> 様
        </p>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #555; line-height: 1.8;">
          いつも ${SHOP_NAME} をご利用いただき、誠にありがとうございます。<br>
          ご注文 <strong style="color: #D30046;">${orderNumber}</strong> につきまして、発送が遅延していることをお知らせいたします。
        </p>
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #9a3412;">⚠️ 遅延理由</p>
          <p style="margin: 0; font-size: 14px; color: #7c2d12; line-height: 1.8; white-space: pre-line;">${delayReason}</p>
        </div>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #555; line-height: 1.8;">
          ご不便をおかけし、誠に申し訳ございません。準備が整い次第、速やかに発送いたします。
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${frontendUrl}/mypage/orders" style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
            注文履歴を確認する
          </a>
        </div>
      </td></tr>` + emailFooter()
    );
    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to: [to],
      subject: `【${SHOP_NAME}】発送遅延のお知らせ - ご注文番号: ${orderNumber}`,
      html: emailHtml,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (error) {
    console.error('[Email] sendShipmentDelayNotificationEmail error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send customs inquiry notification email to customer
 * 세관 조회 문제 발생 시 고객 안내 이메일
 */
export async function sendCustomsInquiryEmail(params: {
  to: string;
  userName: string;
  orderNumber: string;
  trackingNumber?: string;
  carrierName?: string;
  trackingUrl?: string;
  customMessage?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, orderNumber, trackingNumber, carrierName, trackingUrl, customMessage } = params;
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not configured, skipping customs inquiry email');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://cocokusuri.com';

    const trackingSection = trackingNumber
      ? `<div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0369a1; font-weight: 700;">📦 配送追跡情報</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #555; width: 100px;">配送業者</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; font-weight: 600;">${carrierName || '配送業者情報なし'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #555;">追跡番号</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; font-weight: 600; font-family: monospace;">${trackingNumber}</td>
            </tr>
          </table>
          ${trackingUrl ? `<div style="margin-top: 16px; text-align: center;"><a href="${trackingUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">🔍 配送状況を確認する</a></div>` : ''}
        </div>`
      : '';

    const customMessageSection = customMessage
      ? `<div style="background: #fef3c7; border: 1px solid #fcd34d; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #92400e; font-weight: 700;">📋 担当者からのメッセージ</p>
          <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.7;">${customMessage.replace(/\n/g, '<br>')}</p>
        </div>`
      : '';

    const emailHtml = emailWrapper(
      emailHeader('税関照会のお知らせ', `ご注文番号: ${orderNumber}`) +
      `<tr><td class="email-body-cell" style="padding: 40px 30px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #333; line-height: 1.7;">
          <strong>${userName}</strong> 様
        </p>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #555; line-height: 1.8;">
          いつも ${SHOP_NAME} をご利用いただき、誠にありがとうございます。<br>
          お客様のご注文 <strong style="color: #D30046;">${orderNumber}</strong> について、
          現在 <strong style="color: #d97706;">税関から名宛人への照会</strong> が発生していることをお知らせいたします。
        </p>

        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #9a3412; font-weight: 700;">⚠️ 税関照会とは？</h3>
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #7c2d12; line-height: 1.8;">
            税関照会とは、輸入通関の審査過程で税関当局が荷受人（お客様）に対して
            商品の内容・用途・価格などの確認を求める手続きです。
          </p>
          <p style="margin: 0; font-size: 14px; color: #7c2d12; line-height: 1.8;">
            お客様から税関への回答が完了すると、通関手続きが再開され、配達が進みます。
          </p>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #166534; font-weight: 700;">✅ お客様にお願いしたいこと</h3>
          <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #15803d; line-height: 2;">
            <li>税関から郵便または電話で連絡が届く場合があります</li>
            <li>連絡が届いた場合は、指示に従って必要書類をご提出ください</li>
            <li>ご不明な点は、下記のカスタマーサポートまでお問い合わせください</li>
          </ol>
        </div>

        ${customMessageSection}
        ${trackingSection}

        <div style="text-align: center; margin: 28px 0;">
          <a href="${frontendUrl}/mypage/orders" style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 8px rgba(220,38,38,0.3);">
            注文履歴を確認する
          </a>
        </div>

        <div style="background: #f9fafb; border-radius: 8px; padding: 16px 20px; margin-top: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151; font-weight: 600;">📞 カスタマーサポート</p>
          <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.7;">
            税関照会に関するご不明な点は、お問い合わせフォームよりご連絡ください。<br>
            担当者が迅速に対応いたします。
          </p>
          <div style="margin-top: 10px;">
            <a href="${frontendUrl}/contact" style="display: inline-block; background: #f3f4f6; color: #374151; padding: 8px 20px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; border: 1px solid #e5e7eb;">お問い合わせフォームへ</a>
          </div>
        </div>
      </td></tr>` +
      emailFooter()
    );

    const result = await resend.emails.send({
      from: `${SHOP_NAME} <noreply@cocokusuri.com>`,
      to,
      subject: `【重要】税関照会のお知らせ - ご注文番号 ${orderNumber}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('[Email] Failed to send customs inquiry email:', result.error);
      return { success: false, error: result.error.message };
    }
    console.log(`[Email] Customs inquiry email sent to ${to} for order ${orderNumber}`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending customs inquiry email:', error);
    return { success: false, error: String(error) };
  }
}
