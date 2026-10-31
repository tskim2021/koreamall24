import Stripe from "stripe";
import { ENV } from "./_core/env";
import { createCheckoutSessionRecord } from "./db";

// Initialize Stripe with secret key
const stripe = new Stripe(ENV.stripeSecretKey || "", {
  apiVersion: "2025-12-15.clover",
});

export { stripe };

// Product definitions for the store
export const SHIPPING_FEE = 500; // 500円 shipping fee
export const FREE_SHIPPING_THRESHOLD = 5000; // Free shipping over 5000円

export interface CheckoutItem {
  productId: number;
  name: string;
  nameJa: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface ShippingAddress {
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2?: string;
  phone: string;
  recipientName: string;
}

/**
 * Create a Stripe Checkout Session for the given items
 */
export async function createCheckoutSession(params: {
  items: CheckoutItem[];
  shippingAddress: ShippingAddress;
  userId: number;
  userEmail: string;
  userName: string;
  origin: string;
  cartItemIds?: number[]; // 선택 구매 시 cartItem ID 목록
  cartGroupId?: string; // Shared cart group ID (#0000000 format)
  pointsUsed?: number;
  couponDiscount?: number;
  membershipDiscount?: number;
}): Promise<{ url: string; sessionId: string }> {
  const { items, shippingAddress, userId, userEmail, userName, origin, cartItemIds, cartGroupId, pointsUsed = 0, couponDiscount = 0, membershipDiscount = 0 } = params;

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Calculate shipping
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  // Create line items for Stripe
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
    price_data: {
      currency: "KRW",
      product_data: {
        name: item.nameJa || item.name,
        description: `商品ID: ${item.productId}`,
        images: item.imageUrl && item.imageUrl.startsWith('https://') ? [item.imageUrl] : undefined,
      },
      unit_amount: item.price,
    },
    quantity: item.quantity,
  }));

  // Add shipping fee as a line item if applicable
  if (shippingFee > 0) {
    lineItems.push({
      price_data: {
        currency: "KRW",
        product_data: {
          name: "配送料",
          description: "全品送料無料",
        },
        unit_amount: shippingFee,
      },
      quantity: 1,
    });
  }

  // Apply discounts via Stripe coupon
  const totalDiscount = pointsUsed + couponDiscount + membershipDiscount;
  let stripeDiscounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  
  if (totalDiscount > 0) {
    const discountDescriptions: string[] = [];
    if (pointsUsed > 0) discountDescriptions.push(`ポイント利用: -${pointsUsed}円`);
    if (couponDiscount > 0) discountDescriptions.push(`クーポン割引: -${couponDiscount}円`);
    if (membershipDiscount > 0) discountDescriptions.push(`会員割引: -${membershipDiscount}円`);
    
    const stripeCoupon = await stripe.coupons.create({
      amount_off: totalDiscount,
      currency: 'KRW',
      duration: 'once',
      name: discountDescriptions.join(' / '),
    });
    
    stripeDiscounts = [{ coupon: stripeCoupon.id }];
  }

  // Create Stripe checkout session (minimal metadata)
  // Note: allow_promotion_codes and discounts cannot be used together in Stripe
  const sessionCreateParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${origin}/order-complete?session_id={CHECKOUT_SESSION_ID}&cart_group_id=${encodeURIComponent(cartGroupId || '')}`,
    cancel_url: `${origin}/checkout/cancel`,
    customer_email: userEmail,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      customer_email: userEmail,
      cart_group_id: cartGroupId || '',
    },
  };

  // Stripe doesn't allow both allow_promotion_codes and discounts simultaneously
  if (stripeDiscounts) {
    sessionCreateParams.discounts = stripeDiscounts;
  } else {
    sessionCreateParams.allow_promotion_codes = true;
  }

  const session = await stripe.checkout.sessions.create(sessionCreateParams);

  // Store checkout data in database (not sent to Stripe)
  const totalAmount = subtotal + shippingFee;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  
  await createCheckoutSessionRecord({
    sessionId: session.id,
    userId,
    userEmail,
    shippingName: shippingAddress.recipientName,
    shippingPostalCode: shippingAddress.postalCode,
    shippingPrefecture: shippingAddress.prefecture,
    shippingCity: shippingAddress.city,
    shippingAddress1: shippingAddress.address1,
    shippingAddress2: shippingAddress.address2,
    shippingPhone: shippingAddress.phone,
    itemsJson: JSON.stringify(items),
    cartItemIds: cartItemIds && cartItemIds.length > 0 ? JSON.stringify(cartItemIds) : null,
    cartGroupId: cartGroupId || null,
    subtotal: subtotal.toString() as any,
    shippingFee: shippingFee.toString() as any,
    totalAmount: totalAmount.toString() as any,
    status: "pending",
    expiresAt,
  });

  return {
    url: session.url!,
    sessionId: session.id,
  };
}

/**
 * Retrieve checkout session details
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "payment_intent"],
  });
}

/**
 * Verify webhook signature and construct event
 */
export function constructWebhookEvent(
  payload: Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Create a retry payment link for a failed checkout session
 */
export async function createRetryPaymentLink(params: {
  checkoutSession: {
    userId: number;
    userEmail: string;
    shippingName: string;
    shippingPostalCode: string;
    shippingPrefecture: string;
    shippingCity: string;
    shippingAddress1: string;
    shippingAddress2: string | null;
    shippingPhone: string;
    itemsJson: string;
    totalAmount: string;
  };
  origin: string;
}): Promise<{ url: string; sessionId: string }> {
  const { checkoutSession, origin } = params;

  // Parse items from JSON
  const items: CheckoutItem[] = JSON.parse(checkoutSession.itemsJson);

  // Create new checkout session
  return createCheckoutSession({
    items,
    shippingAddress: {
      postalCode: checkoutSession.shippingPostalCode,
      prefecture: checkoutSession.shippingPrefecture,
      city: checkoutSession.shippingCity,
      address1: checkoutSession.shippingAddress1,
      address2: checkoutSession.shippingAddress2 || undefined,
      phone: checkoutSession.shippingPhone,
      recipientName: checkoutSession.shippingName,
    },
    userId: checkoutSession.userId,
    userEmail: checkoutSession.userEmail,
    userName: checkoutSession.shippingName,
    origin,
  });
}
