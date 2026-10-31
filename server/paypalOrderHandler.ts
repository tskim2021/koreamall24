/**
 * PayPal order completion handler
 * Creates orders in the database after PayPal payment is captured
 */
import type { CheckoutSession } from "../drizzle/schema";
import { createOrder, saveOrderItems, clearCart, removeCartItemsByIds, getDb } from "./db";
import type { InsertOrder } from "../drizzle/schema";
import { sql } from "drizzle-orm";

export async function handlePayPalOrderCompletion(
  checkoutSession: CheckoutSession,
  userId: number
): Promise<{ orderId: number; orderNumber: string; cartGroupId: string }[]> {
  // Parse items from database
  let itemsData: { productId: number; name: string; nameJa: string; price: number; quantity: number; imageUrl?: string }[] = [];
  try {
    itemsData = JSON.parse(checkoutSession.itemsJson);
  } catch (e) {
    throw new Error("Failed to parse items from checkout session");
  }

  const items = itemsData.map((item) => ({
    productId: item.productId,
    productName: item.name,
    productNameJa: item.nameJa,
    productImageUrl: item.imageUrl || null,
    quantity: item.quantity,
    unitPrice: item.price.toString(),
  }));

  const generateOrderNumber = () => {
    const now = new Date();
    const dateStr =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0");
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
    return dateStr + randomNum;
  };

  const totalSubtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
    0
  );
  const shippingFee = totalSubtotal >= 5000 ? 0 : 500;
  const cartGroupId =
    checkoutSession.cartGroupId ||
    `#${Math.floor(Math.random() * 10000000).toString().padStart(7, "0")}`;

  const shippingAddress = `${checkoutSession.shippingPrefecture}${checkoutSession.shippingCity}${checkoutSession.shippingAddress1}${checkoutSession.shippingAddress2 ? " " + checkoutSession.shippingAddress2 : ""}`;

  const createdOrders: { orderId: number; orderNumber: string; cartGroupId: string }[] = [];
  let parentOrderId: number | undefined;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const itemSubtotal = parseFloat(item.unitPrice) * item.quantity;
    const itemShipping = createdOrders.length === 0 ? shippingFee : 0;
    const itemTotal = itemSubtotal + itemShipping;

    const orderData: InsertOrder = {
      userId,
      orderNumber: generateOrderNumber(),
      status: "paid",
      shippingName: checkoutSession.shippingName,
      shippingPostalCode: checkoutSession.shippingPostalCode,
      shippingAddress,
      shippingPhone: checkoutSession.shippingPhone,
      totalAmount: itemTotal.toString(),
      shippingFee: itemShipping.toString(),
      paymentMethod: "paypal",
      paymentStatus: "paid",
      parentOrderId,
      cartGroupId,
    };

    const order = await createOrder(orderData);
    if (!order) {
      throw new Error("Failed to create order");
    }

    if (parentOrderId === undefined) parentOrderId = order.id;

    await saveOrderItems(order.id, [
      {
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
      },
    ]);

    createdOrders.push({ orderId: order.id, orderNumber: order.orderNumber, cartGroupId });
  }

  // Award points
  if (createdOrders.length > 0) {
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
          orderId: createdOrders[0].orderId,
          type: "earn",
          amount: pointsEarned,
          balance: newBalance,
          description: `注文 ${createdOrders[0].orderNumber} のポイント獲得`,
          createdAt: new Date(),
        });
      }
    }
  }

  // Clear cart
  if (checkoutSession.cartItemIds) {
    try {
      const cartItemIdsList: number[] = JSON.parse(checkoutSession.cartItemIds);
      if (cartItemIdsList.length > 0) {
        await removeCartItemsByIds(userId, cartItemIdsList);
      } else {
        await clearCart(userId);
      }
    } catch {
      await clearCart(userId);
    }
  } else {
    await clearCart(userId);
  }

  return createdOrders;
}
