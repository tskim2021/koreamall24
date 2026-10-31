import { ENV } from "./env";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

const buildEndpointUrl = (baseUrl: string): string => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("api/v1/email/send", normalizedBase).toString();
};

/**
 * Send an email through the Manus Email Service.
 * Returns `true` if the email was sent successfully, `false` otherwise.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.warn("[Email] Email service is not configured.");
    return false;
  }

  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Email] Failed to send email (${response.status} ${response.statusText})${
          detail ? `: ${detail}` : ""
        }`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Email] Error calling email service:", error);
    return false;
  }
}

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification email with code
 */
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #e91e63 0%, #ff6b35 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
        .code { font-size: 36px; font-weight: bold; color: #e91e63; text-align: center; padding: 20px; background: #fce4ec; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
        .warning { color: #ff6b35; font-size: 14px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">ココくすり</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px;">会員登録 メール認証</p>
        </div>
        <div class="content">
          <p>ココくすりへのご登録ありがとうございます。</p>
          <p>以下の認証コードを入力して、メールアドレスの確認を完了してください。</p>
          
          <div class="code">${code}</div>
          
          <p class="warning">※このコードは10分間有効です。</p>
          <p>このメールに心当たりがない場合は、このメールを無視してください。</p>
          
          <div class="footer">
            <p>このメールは自動送信されています。返信はできません。</p>
            <p>© 2026 ココくすり All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "【ココくすり】メール認証コード",
    html,
  });
}

/**
 * Generate a secure random token for password reset
 */
export function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Send password reset email with link
 */
export async function sendPasswordResetEmail(email: string, resetToken: string, baseUrl: string): Promise<boolean> {
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #e91e63 0%, #ff6b35 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #e91e63; color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #c2185b; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
        .warning { color: #ff6b35; font-size: 14px; margin-top: 15px; }
        .link-box { background: #f5f5f5; padding: 15px; border-radius: 8px; word-break: break-all; font-size: 12px; color: #666; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">ココくすり</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px;">パスワード再設定</p>
        </div>
        <div class="content">
          <p>パスワード再設定のリクエストを受け付けました。</p>
          <p>以下のボタンをクリックして、新しいパスワードを設定してください。</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button" style="color: white;">パスワードを再設定する</a>
          </div>
          
          <p class="warning">※このリンクは1時間有効です。</p>
          
          <p>ボタンが機能しない場合は、以下のURLをブラウザにコピー＆ペーストしてください：</p>
          <div class="link-box">${resetLink}</div>
          
          <p style="margin-top: 20px;">このメールに心当たりがない場合は、このメールを無視してください。パスワードは変更されません。</p>
          
          <div class="footer">
            <p>このメールは自動送信されています。返信はできません。</p>
            <p>© 2026 ココくすり All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "【ココくすり】パスワード再設定のご案内",
    html,
  });
}
