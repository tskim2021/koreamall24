/**
 * PayPal payment integration
 * Uses PayPal Orders API v2 via REST API calls
 * Credentials are loaded from DB (admin payment settings)
 */
import { getPaymentSettingByProvider } from "./db";

async function getPayPalConfig(): Promise<{
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}> {
  const setting = await getPaymentSettingByProvider("paypal");
  if (!setting || !setting.isActive) {
    throw new Error("PayPal決済は現在ご利用いただけません。");
  }
  if (!setting.publicKey || !setting.secretKey) {
    throw new Error("PayPal API設定が不完全です。管理者にお問い合わせください。");
  }
  const isLive = setting.mode === "live";
  return {
    clientId: setting.publicKey,
    clientSecret: setting.secretKey,
    baseUrl: isLive
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com",
  };
}

/** Get PayPal access token */
async function getAccessToken(): Promise<{ token: string; baseUrl: string }> {
  const config = await getPayPalConfig();
  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal auth failed: ${err}`);
  }

  const data = await response.json();
  return { token: data.access_token as string, baseUrl: config.baseUrl };
}

export interface PayPalOrderItem {
  name: string;
  price: number; // in JPY (integer)
  quantity: number;
}

/**
 * Create a PayPal order and return the approval URL
 */
export async function createPayPalOrder(params: {
  items: PayPalOrderItem[];
  shippingFee: number;
  cartGroupId: string;
  userId: number;
  origin: string;
}): Promise<{ orderId: string; approvalUrl: string }> {
  const { items, shippingFee, cartGroupId, userId, origin } = params;

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal + shippingFee;

  const { token: accessToken, baseUrl } = await getAccessToken();

  const orderPayload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: cartGroupId,
        custom_id: userId.toString(),
        description: `Kusuri Mall Order ${cartGroupId}`,
        amount: {
          currency_code: "JPY",
          value: total.toString(),
          breakdown: {
            item_total: { currency_code: "JPY", value: subtotal.toString() },
            shipping: { currency_code: "JPY", value: shippingFee.toString() },
          },
        },
        items: items.map((item) => ({
          name: item.name.substring(0, 127),
          unit_amount: { currency_code: "JPY", value: item.price.toString() },
          quantity: item.quantity.toString(),
          category: "PHYSICAL_GOODS",
        })),
      },
    ],
    application_context: {
      brand_name: "Kusuri Mall",
      locale: "ja-JP",
      landing_page: "LOGIN",
      user_action: "PAY_NOW",
      return_url: `${origin}/order-complete?paypal=1&cart_group_id=${encodeURIComponent(cartGroupId)}`,
      cancel_url: `${origin}/checkout/cancel`,
    },
  };

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderPayload),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal order creation failed: ${err}`);
  }

  const data = await response.json();
  const approvalUrl = (data.links as { rel: string; href: string }[]).find(
    (l) => l.rel === "approve"
  )?.href;

  if (!approvalUrl) {
    throw new Error("PayPal approval URL not found");
  }

  return { orderId: data.id as string, approvalUrl };
}

/**
 * Capture a PayPal order after buyer approval
 */
export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  status: string;
  captureId: string;
  amount: string;
  currency: string;
}> {
  const { token: accessToken, baseUrl } = await getAccessToken();

  const response = await fetch(
    `${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal capture failed: ${err}`);
  }

  const data = await response.json();
  const capture =
    data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    status: data.status as string,
    captureId: capture?.id ?? "",
    amount: capture?.amount?.value ?? "0",
    currency: capture?.amount?.currency_code ?? "JPY",
  };
}

/**
 * Get PayPal order details
 */
export async function getPayPalOrder(paypalOrderId: string): Promise<{
  status: string;
  cartGroupId: string;
  userId: string;
}> {
  const { token: accessToken, baseUrl } = await getAccessToken();

  const response = await fetch(
    `${baseUrl}/v2/checkout/orders/${paypalOrderId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal get order failed: ${err}`);
  }

  const data = await response.json();
  const unit = data.purchase_units?.[0];

  return {
    status: data.status as string,
    cartGroupId: unit?.reference_id ?? "",
    userId: unit?.custom_id ?? "",
  };
}
