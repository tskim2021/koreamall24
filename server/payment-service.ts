/**
 * Unified Payment Service
 * Supports Stripe, Airwallex, 2Checkout, Payoneer, Bank Transfer
 * API keys are read from DB (paymentSettings table) at runtime.
 */
import { getPaymentSettingByProvider } from "./db";

export type PaymentProvider = "stripe" | "airwallex" | "2checkout" | "payoneer" | "paypal" | "bank_transfer" | "cookiepay";

export interface CreateSessionParams {
  provider: PaymentProvider;
  orderId: number;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface PaymentSession {
  sessionId: string;
  paymentUrl: string;
  provider: PaymentProvider;
  /** For bank_transfer and payoneer: instructions to show the user */
  instructions?: string;
  /** For bank_transfer: account details */
  bankDetails?: Record<string, string>;
}

export interface WebhookResult {
  externalPaymentId: string;
  status: "succeeded" | "failed" | "cancelled" | "refunded";
  paymentMethod?: string;
  cardLast4?: string;
  cardBrand?: string;
  metadata?: Record<string, string>;
}

// ── Stripe ──────────────────────────────────────────────
async function createStripeSession(params: CreateSessionParams): Promise<PaymentSession> {
  const settings = await getPaymentSettingByProvider("stripe");
  if (!settings?.secretKey) throw new Error("Stripe is not configured");

  const zeroDecimal = ["JPY", "KRW"].includes(params.currency.toUpperCase());
  const unitAmount = zeroDecimal ? params.amount : Math.round(params.amount * 100);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      mode: "payment",
      "payment_method_types[0]": "card",
      "line_items[0][price_data][currency]": params.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(unitAmount),
      "line_items[0][price_data][product_data][name]": params.description || `Order ${params.orderNumber}`,
      "line_items[0][quantity]": "1",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      ...(params.customerEmail ? { customer_email: params.customerEmail } : {}),
      "metadata[orderId]": String(params.orderId),
      "metadata[orderNumber]": params.orderNumber,
      allow_promotion_codes: "true",
    }),
  });
  if (!res.ok) throw new Error(`Stripe: ${(await res.json()).error?.message}`);
  const session = await res.json();
  return { sessionId: session.id, paymentUrl: session.url, provider: "stripe" };
}

// ── Airwallex ───────────────────────────────────────────
async function getAirwallexToken(clientId: string, apiKey: string, isTest: boolean) {
  const base = isTest ? "https://api-demo.airwallex.com" : "https://api.airwallex.com";
  const res = await fetch(`${base}/api/v1/authentication/login`, {
    method: "POST",
    headers: { "x-client-id": clientId, "x-api-key": apiKey, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Airwallex auth failed");
  return (await res.json()).token as string;
}

async function createAirwallexSession(params: CreateSessionParams): Promise<PaymentSession> {
  const settings = await getPaymentSettingByProvider("airwallex");
  if (!settings?.publicKey || !settings?.secretKey) throw new Error("Airwallex is not configured");
  const isTest = settings.mode === "test";
  const base = isTest ? "https://api-demo.airwallex.com" : "https://api.airwallex.com";
  const token = await getAirwallexToken(settings.publicKey, settings.secretKey, isTest);

  const intent = await (await fetch(`${base}/api/v1/pa/payment_intents/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      merchant_order_id: params.orderNumber,
      request_id: `req_${params.orderId}_${Date.now()}`,
      metadata: { orderId: String(params.orderId) },
      return_url: params.successUrl,
    }),
  })).json();

  const session = await (await fetch(`${base}/api/v1/pa/checkout/sessions/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      payment_intent_id: intent.id,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      ui_mode: "hosted",
    }),
  })).json();

  return { sessionId: intent.id, paymentUrl: session.url, provider: "airwallex" };
}

// ── 2Checkout ───────────────────────────────────────────
async function create2CheckoutSession(params: CreateSessionParams): Promise<PaymentSession> {
  const settings = await getPaymentSettingByProvider("2checkout");
  if (!settings?.publicKey || !settings?.secretKey) throw new Error("2Checkout is not configured");
  const isTest = settings.mode === "test";
  const extra = (settings.extraConfig as any) || {};
  const sellerId = extra.sellerId || settings.publicKey;
  const base = isTest ? "https://sandbox.2checkout.com" : "https://secure.2checkout.com";

  const qs = new URLSearchParams({
    sid: sellerId,
    mode: "2CO",
    li_0_type: "product",
    li_0_name: params.description || `Order ${params.orderNumber}`,
    li_0_price: String(params.amount),
    li_0_quantity: "1",
    currency_code: params.currency.toUpperCase(),
    merchant_order_id: params.orderNumber,
    x_receipt_link_url: params.successUrl,
    purchase_step: "payment-method",
  });
  if (params.customerEmail) qs.set("email", params.customerEmail);

  return {
    sessionId: `2co_${params.orderId}_${Date.now()}`,
    paymentUrl: `${base}/checkout/purchase?${qs}`,
    provider: "2checkout",
  };
}

// ── Payoneer ────────────────────────────────────────────
async function createPayoneerSession(params: CreateSessionParams): Promise<PaymentSession> {
  const settings = await getPaymentSettingByProvider("payoneer");
  if (!settings) throw new Error("Payoneer is not configured");
  const extra = (settings.extraConfig as any) || {};
  const payoneerEmail = extra.payoneerEmail || "";
  const instructions = extra.instructions || "";

  // Payoneer does not have a hosted checkout API for direct payments.
  // We generate a "request payment" link via Payoneer's payment request URL.
  const paymentUrl = `https://www.payoneer.com/request-payment/?email=${encodeURIComponent(payoneerEmail)}&amount=${params.amount}&currency=${params.currency}&description=${encodeURIComponent(params.description || `Order ${params.orderNumber}`)}`;

  return {
    sessionId: `payoneer_${params.orderId}_${Date.now()}`,
    paymentUrl,
    provider: "payoneer",
    instructions: instructions || `Payoneer 계정(${payoneerEmail})으로 ${params.amount.toLocaleString()} ${params.currency}를 송금해 주세요. 주문번호: ${params.orderNumber}`,
  };
}

// ── PayPal ─────────────────────────────────────────────
async function createPayPalSession(params: CreateSessionParams): Promise<PaymentSession> {
  const settings = await getPaymentSettingByProvider("paypal");
  if (!settings?.publicKey || !settings?.secretKey) throw new Error("PayPal is not configured");
  const isTest = settings.mode === "test";
  const base = isTest ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

  // Get access token
  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${settings.publicKey}:${settings.secretKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) throw new Error("PayPal auth failed");
  const { access_token } = await tokenRes.json();

  // Create order
  const orderRes = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: params.orderNumber,
        amount: { currency_code: params.currency.toUpperCase(), value: params.amount.toFixed(2) },
        description: params.description || `Order ${params.orderNumber}`,
      }],
      application_context: {
        return_url: params.successUrl,
        cancel_url: params.cancelUrl,
        brand_name: "ココくすり",
        user_action: "PAY_NOW",
      },
    }),
  });
  if (!orderRes.ok) throw new Error(`PayPal order creation failed: ${await orderRes.text()}`);
  const order = await orderRes.json();
  const approvalLink = order.links?.find((l: any) => l.rel === "approve")?.href;
  return {
    sessionId: order.id,
    paymentUrl: approvalLink || params.successUrl,
    provider: "paypal",
  };
}

// ── Bank Transfer (무통장 송금) ──────────────────────────
async function createBankTransferSession(params: CreateSessionParams): Promise<PaymentSession> {
  const settings = await getPaymentSettingByProvider("bank_transfer");
  if (!settings) throw new Error("Bank transfer is not configured");
  const extra = (settings.extraConfig as any) || {};

  const bankDetails: Record<string, string> = {
    bankName: extra.bankName || "",
    accountNumber: extra.accountNumber || "",
    accountHolder: extra.accountHolder || "",
    branchName: extra.branchName || "",
  };

  const instructions = extra.instructions ||
    `아래 계좌로 ${params.amount.toLocaleString()} ${params.currency}를 입금해 주세요.\n` +
    `은행: ${bankDetails.bankName}\n` +
    `계좌번호: ${bankDetails.accountNumber}\n` +
    `예금주: ${bankDetails.accountHolder}\n` +
    `입금자명: ${params.customerName || params.orderNumber} (주문번호 포함)\n` +
    `입금 확인 후 주문이 처리됩니다.`;

  return {
    sessionId: `bank_${params.orderId}_${Date.now()}`,
    paymentUrl: params.successUrl + `?method=bank_transfer&orderId=${params.orderId}`,
    provider: "bank_transfer",
    instructions,
    bankDetails,
  };
}

// ── CookiePay (Pay2Pay Global) ──────────────────────────
async function createCookiePaySession(params: CreateSessionParams): Promise<PaymentSession> {
  const settings = await getPaymentSettingByProvider("cookiepay");
  if (!settings?.publicKey) throw new Error("CookiePay is not configured");
  const isTest = settings.mode === "test";
  const domain = isTest ? "https://sandbox.cookiepayments.com" : "https://www.cookiepayments.com";
  // CookiePay uses a frontend JS library; we return the config for the client to initiate payment
  return {
    sessionId: `cookiepay_${params.orderId}_${Date.now()}`,
    paymentUrl: domain,
    provider: "cookiepay",
    instructions: JSON.stringify({
      apiId: settings.publicKey,
      domain,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      amount: params.amount,
      productName: params.description || `쿠스리몰 주문 ${params.orderNumber}`,
      buyerName: params.customerName || "",
      buyerEmail: params.customerEmail || "",
      returnUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    }),
  };
}

// ── Unified Interface ───────────────────────────────────
export async function createPaymentSession(p: CreateSessionParams): Promise<PaymentSession> {
  switch (p.provider) {
    case "stripe": return createStripeSession(p);
    case "airwallex": return createAirwallexSession(p);
    case "2checkout": return create2CheckoutSession(p);
    case "payoneer": return createPayoneerSession(p);
    case "paypal": return createPayPalSession(p);
    case "bank_transfer": return createBankTransferSession(p);
    case "cookiepay": return createCookiePaySession(p);
    default: throw new Error(`Unsupported provider: ${p.provider}`);
  }
}

export async function handleWebhook(
  provider: PaymentProvider,
  payload: string,
  _signature?: string
): Promise<WebhookResult | null> {
  const event = JSON.parse(payload);
  switch (provider) {
    case "stripe":
      if (event.type === "checkout.session.completed")
        return {
          externalPaymentId: event.data.object.payment_intent || event.data.object.id,
          status: "succeeded",
          metadata: event.data.object.metadata,
        };
      if (event.type === "payment_intent.payment_failed")
        return { externalPaymentId: event.data.object.id, status: "failed" };
      return null;
    case "airwallex":
      if (event.name === "payment_intent.succeeded")
        return { externalPaymentId: event.data.object.id, status: "succeeded", metadata: event.data.object.metadata };
      if (event.name === "payment_intent.payment_failed")
        return { externalPaymentId: event.data.object.id, status: "failed" };
      return null;
    case "2checkout":
      if (event.ORDERSTATUS === "COMPLETE" || event.message_type === "ORDER_CREATED")
        return { externalPaymentId: event.REFNO || event.sale_id, status: "succeeded" };
      if (event.ORDERSTATUS === "CANCELED")
        return { externalPaymentId: event.REFNO || event.sale_id, status: "cancelled" };
      return null;
    case "bank_transfer":
      // Bank transfer confirmations are handled manually by admin
      return null;
    case "payoneer":
      // Payoneer IPN handling
      if (event.type === "payment_completed")
        return { externalPaymentId: event.payment_id, status: "succeeded" };
      return null;
    default:
      return null;
  }
}

/** Provider display info for UI */
export const PROVIDER_INFO: Record<string, {
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  logo: string;
  fields: Array<{ key: string; label: string; labelKo: string; placeholder?: string; required?: boolean; secret?: boolean; extraKey?: string }>;
  defaultCurrencies: string[];
  isManual?: boolean;
}> = {
  stripe: {
    name: "Stripe",
    nameKo: "스트라이프",
    description: "Global payment platform",
    descriptionKo: "글로벌 카드 결제 플랫폼",
    logo: "💳",
    fields: [
      { key: "publicKey", label: "Publishable Key", labelKo: "공개 키", placeholder: "pk_test_...", required: true },
      { key: "secretKey", label: "Secret Key", labelKo: "비밀 키", placeholder: "sk_test_...", required: true, secret: true },
      { key: "webhookSecret", label: "Webhook Secret", labelKo: "웹훅 시크릿", placeholder: "whsec_...", secret: true },
    ],
    defaultCurrencies: ["KRW", "JPY", "USD", "EUR"],
  },
  airwallex: {
    name: "Airwallex",
    nameKo: "에어월렉스",
    description: "Cross-border payment platform",
    descriptionKo: "크로스보더 결제 플랫폼",
    logo: "🌐",
    fields: [
      { key: "publicKey", label: "Client ID", labelKo: "클라이언트 ID", required: true },
      { key: "secretKey", label: "API Key", labelKo: "API 키", required: true, secret: true },
      { key: "webhookSecret", label: "Webhook Secret", labelKo: "웹훅 시크릿", secret: true },
    ],
    defaultCurrencies: ["KRW", "JPY", "USD", "EUR", "CNY"],
  },
  "2checkout": {
    name: "2Checkout (Verifone)",
    nameKo: "2체크아웃",
    description: "Digital commerce platform",
    descriptionKo: "디지털 커머스 결제 플랫폼",
    logo: "🔢",
    fields: [
      { key: "publicKey", label: "Merchant Code", labelKo: "머천트 코드", required: true },
      { key: "secretKey", label: "Secret Key", labelKo: "비밀 키", required: true, secret: true },
      { key: "webhookSecret", label: "IPN Secret", labelKo: "IPN 시크릿", secret: true },
      { key: "extraConfig", extraKey: "sellerId", label: "Seller ID", labelKo: "셀러 ID", required: true },
    ],
    defaultCurrencies: ["USD", "EUR", "JPY"],
  },
  payoneer: {
    name: "Payoneer",
    nameKo: "페이오니아",
    description: "Global payment service for freelancers and businesses",
    descriptionKo: "글로벌 송금 서비스 (프리랜서/기업)",
    logo: "💰",
    isManual: true,
    fields: [
      { key: "extraConfig", extraKey: "payoneerEmail", label: "Payoneer Email", labelKo: "페이오니아 이메일", required: true },
      { key: "extraConfig", extraKey: "instructions", label: "Payment Instructions", labelKo: "결제 안내 메시지" },
    ],
    defaultCurrencies: ["USD", "EUR", "KRW", "JPY"],
  },
  paypal: {
    name: "PayPal",
    nameKo: "페이팔",
    description: "PayPal account / credit card payment (global)",
    descriptionKo: "PayPal 계정 / 신용카드 결제 (글로벌)",
    logo: "🅙",
    fields: [
      { key: "publicKey", label: "Client ID", labelKo: "Client ID", placeholder: "AXxxxxxx...", required: true },
      { key: "secretKey", label: "Client Secret", labelKo: "Client Secret", placeholder: "Client Secret", required: true, secret: true },
    ],
    defaultCurrencies: ["USD", "EUR", "JPY", "KRW"],
  },
  bank_transfer: {
    name: "Bank Transfer",
    nameKo: "무통장 송금",
    description: "Direct bank account transfer",
    descriptionKo: "계좌이체 / 무통장 입금",
    logo: "🏦",
    isManual: true,
    fields: [
      { key: "extraConfig", extraKey: "bankName", label: "Bank Name", labelKo: "은행명", required: true },
      { key: "extraConfig", extraKey: "accountNumber", label: "Account Number", labelKo: "계좌번호", required: true },
      { key: "extraConfig", extraKey: "accountHolder", label: "Account Holder", labelKo: "예금주", required: true },
      { key: "extraConfig", extraKey: "branchName", label: "Branch Name", labelKo: "지점명" },
      { key: "extraConfig", extraKey: "instructions", label: "Payment Instructions", labelKo: "입금 안내 메시지" },
    ],
    defaultCurrencies: ["KRW", "JPY"],
  },
  cookiepay: {
    name: "CookiePay (Pay2Pay Global)",
    nameKo: "쿠키페이 (페이투페이글로벌)",
    description: "Korean PG payment via CookiePay",
    descriptionKo: "한국 PG 결제 (쿠키페이 / 페이투페이글로벌)",
    logo: "🍪",
    isManual: false,
    fields: [
      { key: "publicKey", label: "API ID", labelKo: "연동 ID (API ID)", placeholder: "abcde12345", required: true },
      { key: "secretKey", label: "Secret Key", labelKo: "시크릿 키", placeholder: "••••••••••", required: true, secret: true },
    ],
    defaultCurrencies: ["KRW"],
  },
};
