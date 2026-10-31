/**
 * Payment Error Handler
 * Maps payment provider errors to user-friendly messages
 */

export type PaymentProvider = "stripe" | "airwallex" | "2checkout" | "payoneer" | "bank_transfer" | "cookiepay" | "paypal";

export interface PaymentErrorInfo {
  title: string;
  message: string;
  retryable: boolean;
  provider: PaymentProvider;
  originalError?: string;
}

/**
 * Stripe error codes mapping
 */
const STRIPE_ERROR_MAP: Record<string, string> = {
  card_declined: "カードが拒否されました。別のカードをお試しください。",
  expired_card: "カードの有効期限が切れています。",
  incorrect_cvc: "セキュリティコード（CVC）が正しくありません。",
  processing_error: "処理中にエラーが発生しました。しばらく待ってから再度お試しください。",
  rate_limit: "リクエストが多すぎます。しばらく待ってから再度お試しください。",
  authentication_error: "認証に失敗しました。カード情報を確認してください。",
  invalid_request_error: "リクエストが無効です。入力内容を確認してください。",
  api_connection_error: "サーバーに接続できません。インターネット接続を確認してください。",
  api_error: "決済サーバーでエラーが発生しました。しばらく待ってから再度お試しください。",
};

/**
 * Airwallex error codes mapping
 */
const AIRWALLEX_ERROR_MAP: Record<string, string> = {
  insufficient_funds: "残高不足です。別のカードをお試しください。",
  card_declined: "カードが拒否されました。別のカードをお試しください。",
  expired_card: "カードの有効期限が切れています。",
  invalid_card: "カード情報が無効です。確認してください。",
  processing_error: "処理中にエラーが発生しました。しばらく待ってから再度お試しください。",
  timeout: "リクエストがタイムアウトしました。インターネット接続を確認してください。",
  authentication_failed: "認証に失敗しました。カード情報を確認してください。",
};

/**
 * 2Checkout error codes mapping
 */
const TWOCHECKOUT_ERROR_MAP: Record<string, string> = {
  card_declined: "カードが拒否されました。別のカードをお試しください。",
  invalid_card: "カード情報が無効です。確認してください。",
  expired_card: "カードの有効期限が切れています。",
  insufficient_funds: "残高不足です。別のカードをお試しください。",
  processing_error: "処理中にエラーが発生しました。しばらく待ってから再度お試しください。",
  timeout: "リクエストがタイムアウトしました。インターネット接続を確認してください。",
};

/**
 * PayPal error codes mapping
 */
const PAYPAL_ERROR_MAP: Record<string, string> = {
  INSTRUMENT_DECLINED: "支払い方法が拒否されました。別の支払い方法をお試しください。",
  INSUFFICIENT_FUNDS: "残高不足です。別の支払い方法をお試しください。",
  TRANSACTION_REFUSED: "取引が拒否されました。PayPalアカウントを確認してください。",
  AUTHORIZATION_FAILED: "認可に失敗しました。しばらく待ってから再度お試しください。",
  TIMEOUT: "リクエストがタイムアウトしました。インターネット接続を確認してください。",
  CONNECTION_ERROR: "PayPalに接続できません。インターネット接続を確認してください。",
};

/**
 * Bank transfer error codes mapping
 */
const BANK_TRANSFER_ERROR_MAP: Record<string, string> = {
  invalid_account: "口座情報が無効です。管理者に確認してください。",
  account_not_found: "指定された口座が見つかりません。管理者に確認してください。",
  invalid_amount: "金額が無効です。確認してください。",
  timeout: "リクエストがタイムアウトしました。インターネット接続を確認してください。",
};

/**
 * CookiePay error codes mapping
 */
const COOKIEPAY_ERROR_MAP: Record<string, string> = {
  card_declined: "カードが拒否されました。別のカードをお試しください。",
  invalid_card: "カード情報が無効です。確認してください。",
  processing_error: "処理中にエラーが発生しました。しばらく待ってから再度お試しください。",
  timeout: "リクエストがタイムアウトしました。インターネット接続を確認してください。",
  authentication_error: "認証に失敗しました。カード情報を確認してください。",
};

/**
 * Get error map for payment provider
 */
function getErrorMap(provider: PaymentProvider): Record<string, string> {
  switch (provider) {
    case "stripe":
      return STRIPE_ERROR_MAP;
    case "airwallex":
      return AIRWALLEX_ERROR_MAP;
    case "2checkout":
      return TWOCHECKOUT_ERROR_MAP;
    case "payoneer":
      return PAYPAL_ERROR_MAP;
    case "bank_transfer":
      return BANK_TRANSFER_ERROR_MAP;
    case "cookiepay":
      return COOKIEPAY_ERROR_MAP;
    default:
      return {};
  }
}

/**
 * Determine if error is retryable
 */
function isRetryableError(errorCode: string, provider: PaymentProvider): boolean {
  // Temporary errors that can be retried
  const retryableErrors = [
    "processing_error",
    "rate_limit",
    "api_connection_error",
    "timeout",
    "TIMEOUT",
    "CONNECTION_ERROR",
  ];

  // Permanent errors that cannot be retried
  const nonRetryableErrors = [
    "card_declined",
    "expired_card",
    "incorrect_cvc",
    "insufficient_funds",
    "invalid_card",
    "authentication_error",
    "authentication_failed",
    "INSTRUMENT_DECLINED",
    "INSUFFICIENT_FUNDS",
    "invalid_account",
  ];

  if (retryableErrors.includes(errorCode)) {
    return true;
  }

  if (nonRetryableErrors.includes(errorCode)) {
    return false;
  }

  // Default: retryable for temporary/unknown errors
  return true;
}

/**
 * Parse payment error and return user-friendly message
 */
export function parsePaymentError(
  error: any,
  provider: PaymentProvider
): PaymentErrorInfo {
  let errorCode = "";
  let originalError = "";

  // Extract error code from different error formats
  if (typeof error === "string") {
    originalError = error;
    errorCode = error.toLowerCase();
  } else if (error?.code) {
    errorCode = error.code;
    originalError = error.message || error.code;
  } else if (error?.message) {
    originalError = error.message;
    errorCode = error.message.toLowerCase();
  } else {
    originalError = JSON.stringify(error);
  }

  const errorMap = getErrorMap(provider);
  const userMessage = errorMap[errorCode] || errorMap[originalError.toLowerCase()] || "決済処理中にエラーが発生しました。しばらく待ってから再度お試しください。";

  return {
    title: "決済エラー",
    message: userMessage,
    retryable: isRetryableError(errorCode, provider),
    provider,
    originalError,
  };
}

/**
 * Get retry-friendly message
 */
export function getRetryMessage(errorInfo: PaymentErrorInfo): string {
  if (errorInfo.retryable) {
    return "もう一度お試しいただくか、別の支払い方法をお選びください。";
  }
  return "別の支払い方法をお選びください。";
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(errorInfo: PaymentErrorInfo): string {
  return `[${errorInfo.provider}] ${errorInfo.title}: ${errorInfo.message} (Original: ${errorInfo.originalError})`;
}
