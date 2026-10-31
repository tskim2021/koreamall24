/**
 * Email Router
 * Handles email-related tRPC procedures
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { sendOrderConfirmationEmail } from "../services/emailService";
import { getDb } from "../db";
import { orders, orderItems, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const emailRouter = router({
  /**
   * Send order confirmation email
   * Called after successful payment
   */
  sendOrderConfirmation: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, error: "Database connection failed" };
        }

        // Get order details
        const order = await db
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId))
          .limit(1);

        if (!order || order.length === 0) {
          return { success: false, error: "Order not found" };
        }

        const orderData = order[0];

        // Verify ownership
        if (orderData.userId !== ctx.user.id) {
          return { success: false, error: "Unauthorized" };
        }

        // Get user details
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);

        if (!user || user.length === 0) {
          return { success: false, error: "User not found" };
        }

        const userData = user[0];

        // Get order items
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, input.orderId));

        // Format items for email
        const emailItems = items.map((item) => ({
          productName: item.productNameJa || item.productName,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice.toString()),
          subtotal: parseFloat(item.subtotal.toString()),
        }));

        // Format order date
        const orderDate = new Intl.DateTimeFormat("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(orderData.createdAt);

        // Send email
        const result = await sendOrderConfirmationEmail(
          ctx.user.id,
          input.orderId,
          userData.email || "",
          userData.nameKanji || userData.name || "お客様",
          {
            orderNumber: orderData.orderNumber,
            customerName: userData.nameKanji || userData.name || "お客様",
            customerEmail: userData.email || "",
            orderDate,
            items: emailItems,
            subtotal: parseFloat(orderData.totalAmount.toString()) - parseFloat(orderData.shippingFee.toString()) + parseFloat(orderData.couponDiscount.toString()) + parseFloat(orderData.membershipDiscount.toString()),
            shippingFee: parseFloat(orderData.shippingFee.toString()),
            discount: parseFloat(orderData.couponDiscount.toString()) + parseFloat(orderData.membershipDiscount.toString()),
            total: parseFloat(orderData.totalAmount.toString()),
            shippingAddress: `${orderData.shippingName}\n${orderData.shippingPostalCode}\n${orderData.shippingAddress}`,
            estimatedDeliveryDate: "3-5営業日以内",
          }
        );

        return {
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        };
      } catch (error) {
        console.error("Failed to send order confirmation email:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
});
