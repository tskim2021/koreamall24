import express, { Express, Request, Response } from "express";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import { createOrder, clearCart, removeCartItemsByIds, getProductById, getDb, getCheckoutSessionBySessionId, updateCheckoutSessionStatus } from "./db";
import type { InsertOrder } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

const stripe = new Stripe(ENV.stripeSecretKey || "", {
  apiVersion: "2025-12-15.clover",
});

export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", 
    (req, res, next) => {
      // Use express.raw for Stripe webhook signature verification
      if (req.headers["stripe-signature"]) {
        return express.raw({ type: "application/json" })(req, res, next);
      }
      next();
    },
    async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
      console.log("[Webhook] Missing stripe-signature header");
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        ENV.stripeWebhookSecret
      );
    } catch (err: any) {
      console.log(`[Webhook] Signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutSessionCompleted(session);
          break;
        }
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`[Webhook] Payment succeeded: ${paymentIntent.id}`);
          break;
        }
        case "checkout.session.expired": {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutSessionExpired(session);
          break;
        }
        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentIntentFailed(paymentIntent);
          break;
        }
        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error(`[Webhook] Error processing event: ${err.message}`);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`[Webhook] Processing checkout.session.completed: ${session.id}`);

  // Get checkout session data from database
  const checkoutSession = await getCheckoutSessionBySessionId(session.id);
  if (!checkoutSession) {
    console.error(`[Webhook] No checkout session found for ${session.id}`);
    return;
  }

  const userId = checkoutSession.userId;

  // Parse shipping info from database
  const shippingInfo = {
    name: checkoutSession.shippingName,
    postalCode: checkoutSession.shippingPostalCode,
    address: `${checkoutSession.shippingPrefecture}${checkoutSession.shippingCity}${checkoutSession.shippingAddress1}${checkoutSession.shippingAddress2 ? " " + checkoutSession.shippingAddress2 : ""}`,
    phone: checkoutSession.shippingPhone,
  };

  // Parse items from database
  let itemsData: { productId: number; name: string; nameJa: string; price: number; quantity: number; imageUrl?: string }[] = [];
  try {
    itemsData = JSON.parse(checkoutSession.itemsJson);
  } catch (e) {
    console.error("[Webhook] Failed to parse items_json from database");
    return;
  }

  // Prepare items for order creation
  const items = itemsData.map((item) => ({
    productId: item.productId,
    productName: item.name,
    productNameJa: item.nameJa,
    productImageUrl: item.imageUrl || null,
    quantity: item.quantity,
    unitPrice: item.price.toString(),
  }));

  // Create one order per item (per-item order numbers)
  const generateStripeOrderNumber = () => {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return dateStr + randomNum;
  };

  const totalSubtotal = items.reduce((sum, item) => sum + (parseFloat(item.unitPrice) * item.quantity), 0);
  const shippingFee = totalSubtotal >= 5000 ? 0 : 500;
  // Use cartGroupId from checkout session (stored when session was created)
  const stripeCartGroupId = checkoutSession.cartGroupId || `#${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;

  try {
    const stripeCreatedOrders: { orderId: number; orderNumber: string }[] = [];
    let stripeParentOrderId: number | undefined;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const itemSubtotal = parseFloat(item.unitPrice) * item.quantity;
      const itemShipping = stripeCreatedOrders.length === 0 ? shippingFee : 0;
      const itemTotal = itemSubtotal + itemShipping;

      const orderData: InsertOrder = {
        userId,
        orderNumber: generateStripeOrderNumber(),
        status: "paid",
        shippingName: shippingInfo.name,
        shippingPostalCode: shippingInfo.postalCode,
        shippingAddress: shippingInfo.address,
        shippingPhone: shippingInfo.phone,
        totalAmount: itemTotal.toString(),
        shippingFee: itemShipping.toString(),
        paymentMethod: "stripe",
        paymentStatus: "paid",
        parentOrderId: stripeParentOrderId,
        cartGroupId: stripeCartGroupId,
      };

      const order = await createOrder(orderData);
      if (!order) {
        console.error("[Webhook] Failed to create order - returned null");
        continue;
      }

      if (stripeParentOrderId === undefined) stripeParentOrderId = order.id;

      // Save single item for this order
      const { saveOrderItems } = await import("./db");
      await saveOrderItems(order.id, [{
        productId: item.productId,
        productName: item.productName,
        productNameJa: item.productNameJa,
        productImageUrl: item.productImageUrl,
        priceTierId: null,
        tierName: null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: itemSubtotal.toString(),
        discountAmount: "0",
      }]);

      stripeCreatedOrders.push({ orderId: order.id, orderNumber: order.orderNumber });
      console.log(`[Webhook] Order created: ${order.orderNumber}`);
    }

    // Award points based on total order amount
    if (stripeCreatedOrders.length > 0) {
      const pointsEarned = Math.floor(totalSubtotal * 0.01);
      if (pointsEarned > 0) {
        const db = await getDb();
        if (db) {
          const { pointTransactions } = await import("../drizzle/schema");
          const balanceResult = await db.execute(sql`
            SELECT COALESCE(SUM(CASE WHEN type IN ('earn', 'admin_add') THEN amount ELSE -amount END), 0) as balance
            FROM point_transactions WHERE userId = ${userId}
          `);
          const currentBalance = (balanceResult as any[])[0]?.balance || 0;
          const newBalance = currentBalance + pointsEarned;
          await db.insert(pointTransactions).values({
            userId,
            orderId: stripeCreatedOrders[0].orderId,
            type: "earn",
            amount: pointsEarned,
            balance: newBalance,
            description: `注文 ${stripeCreatedOrders[0].orderNumber} のポイント獲得`,
            createdAt: new Date(),
          });
          console.log(`[Webhook] Awarded ${pointsEarned} points to user ${userId}`);
        }
      }
    }

    // Clear cart after successful order
    // 선택 구매인 경우 해당 상품만 삭제, 전체 구매인 경우 전체 삭제
    if (checkoutSession.cartItemIds) {
      try {
        const cartItemIdsList: number[] = JSON.parse(checkoutSession.cartItemIds);
        if (cartItemIdsList.length > 0) {
          await removeCartItemsByIds(userId, cartItemIdsList);
          console.log(`[Webhook] Removed ${cartItemIdsList.length} selected cart items for user: ${userId}`);
        } else {
          await clearCart(userId);
          console.log(`[Webhook] Cart cleared for user: ${userId}`);
        }
      } catch (e) {
        // JSON 파싱 실패 시 전체 삭제
        await clearCart(userId);
        console.log(`[Webhook] Cart cleared for user: ${userId} (fallback)`);
      }
    } else {
      await clearCart(userId);
      console.log(`[Webhook] Cart cleared for user: ${userId}`);
    }

    // Mark checkout session as completed
    await updateCheckoutSessionStatus(session.id, "completed");
    console.log(`[Webhook] Checkout session marked as completed: ${session.id}`);
  } catch (err: any) {
    console.error(`[Webhook] Failed to create order: ${err.message}`);
    throw err;
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  console.log(`[Webhook] Processing checkout.session.expired: ${session.id}`);

  try {
    await updateCheckoutSessionStatus(session.id, "expired", "Checkout session expired");
    console.log(`[Webhook] Checkout session ${session.id} marked as expired`);
  } catch (error) {
    console.error(`[Webhook] Error handling expired checkout session ${session.id}:`, error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Webhook] Processing payment_intent.payment_failed: ${paymentIntent.id}`);

  try {
    // Get the checkout session ID from payment intent metadata
    const sessionId = paymentIntent.metadata?.session_id;
    if (!sessionId) {
      console.warn(`[Webhook] No session_id in payment intent ${paymentIntent.id} metadata`);
      return;
    }

    // Get failure reason
    const failureReason = paymentIntent.last_payment_error?.message || "Payment failed";
    
    await updateCheckoutSessionStatus(sessionId, "failed", failureReason);
    console.log(`[Webhook] Checkout session ${sessionId} marked as failed: ${failureReason}`);
  } catch (error) {
    console.error(`[Webhook] Error handling failed payment intent ${paymentIntent.id}:`, error);
  }
}
