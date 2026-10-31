/**
 * Payment Settings & Processing Router
 * - Admin: configure payment providers (Stripe, Airwallex, 2Checkout, Payoneer, Bank Transfer)
 * - Public: list active providers for checkout
 * - Protected: create payment session, confirm manual payment, view history
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";

const providerEnum = z.enum(["stripe", "airwallex", "2checkout", "payoneer", "paypal", "bank_transfer", "cookiepay"]);

export const paymentRouter = router({
  // ─── Admin: Get all payment settings (secrets masked) ─────────────────────
  adminList: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const { getAllPaymentSettings } = await import("../db");
    const settings = await getAllPaymentSettings();
    return settings.map(s => ({
      ...s,
      secretKey: s.secretKey ? "••••••••" + s.secretKey.slice(-4) : null,
      webhookSecret: s.webhookSecret ? "••••••••" + s.webhookSecret.slice(-4) : null,
    }));
  }),

  // ─── Admin: Save/update a payment provider config ──────────────────────────
  adminSave: protectedProcedure
    .input(z.object({
      provider: providerEnum,
      displayName: z.string().optional(),
      publicKey: z.string().optional(),
      secretKey: z.string().optional(),
      webhookSecret: z.string().optional(),
      extraConfig: z.record(z.string(), z.any()).optional(),
      mode: z.enum(["test", "live"]).optional(),
      supportedCurrencies: z.array(z.string()).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { getPaymentSettingByProvider, upsertPaymentSetting } = await import("../db");
      const existing = await getPaymentSettingByProvider(input.provider);
      const data: Record<string, any> = {
        provider: input.provider,
        mode: input.mode ?? existing?.mode ?? "test",
        sortOrder: input.sortOrder ?? existing?.sortOrder ?? 0,
        isActive: existing?.isActive ?? 0,
      };
      if (input.displayName !== undefined) data.displayName = input.displayName;
      if (input.supportedCurrencies !== undefined) data.supportedCurrencies = input.supportedCurrencies;
      if (input.publicKey !== undefined) data.publicKey = input.publicKey;
      // Only update secret if value is not masked
      if (input.secretKey && !input.secretKey.startsWith("••••")) data.secretKey = input.secretKey;
      if (input.webhookSecret && !input.webhookSecret.startsWith("••••")) data.webhookSecret = input.webhookSecret;
      if (input.extraConfig !== undefined) data.extraConfig = input.extraConfig;
      await upsertPaymentSetting(data as any);
      return { success: true };
    }),

  // ─── Admin: Toggle provider active/inactive ────────────────────────────────
  adminToggle: protectedProcedure
    .input(z.object({
      provider: providerEnum,
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { togglePaymentProvider } = await import("../db");
      await togglePaymentProvider(input.provider, input.isActive);
      return { success: true };
    }),

  // ─── Admin: Get payment transactions ──────────────────────────────────────
  adminPayments: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
      status: z.string().optional(),
      provider: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { getAdminPayments } = await import("../db");
      return await getAdminPayments(input);
    }),

  // ─── Public: Get active payment providers (for checkout page) ─────────────
  providers: publicProcedure.query(async () => {
    const { getActivePaymentSettings } = await import("../db");
    const { PROVIDER_INFO } = await import("../payment-service");
    const settings = await getActivePaymentSettings();
    return settings.map(s => {
      const extra = (s.extraConfig as Record<string, string>) || {};
      const result: Record<string, any> = {
        provider: s.provider,
        displayName: s.displayName || PROVIDER_INFO[s.provider as keyof typeof PROVIDER_INFO]?.nameKo || s.provider,
        logo: PROVIDER_INFO[s.provider as keyof typeof PROVIDER_INFO]?.logo || "💳",
        isManual: PROVIDER_INFO[s.provider as keyof typeof PROVIDER_INFO]?.isManual || false,
        supportedCurrencies: (s.supportedCurrencies as string[]) || [],
      };
      // For bank_transfer: expose account info (no secrets)
      if (s.provider === "bank_transfer") {
        result.bankName = extra.bankName || null;
        result.accountNumber = extra.accountNumber || null;
        result.accountHolder = extra.accountHolder || null;
        result.branchName = extra.branchName || null;
        result.swiftCode = extra.swiftCode || null;
        result.instructions = extra.instructions || null;
        result.paymentDeadlineDays = extra.paymentDeadlineDays ? parseInt(extra.paymentDeadlineDays, 10) : null;
      }
      // For payoneer: expose instructions only
      if (s.provider === "payoneer") {
        result.payoneerEmail = extra.payoneerEmail || null;
        result.instructions = extra.instructions || null;
      }
      return result;
    });
  }),

  // ─── Protected: Create a payment session for an order ─────────────────────
  createSession: protectedProcedure
    .input(z.object({
      orderId: z.number(),
      provider: providerEnum,
      currency: z.string().default("KRW"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getOrderById, createPayment } = await import("../db");
      const { createPaymentSession } = await import("../payment-service");
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "주문을 찾을 수 없습니다." });
      if (order.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const origin = (ctx.req as any).headers?.origin || "http://localhost:3000";
      const session = await createPaymentSession({
        provider: input.provider,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: Number(order.totalAmount),
        currency: input.currency,
        customerEmail: ctx.user.email || undefined,
        customerName: ctx.user.name || undefined,
        description: `쿠스리몰 주문 ${order.orderNumber}`,
        successUrl: `${origin}/payment/success?orderId=${order.id}`,
        cancelUrl: `${origin}/payment/cancel?orderId=${order.id}`,
        metadata: { userId: String(ctx.user.id), orderNumber: order.orderNumber },
      });
      // Record payment attempt
      await createPayment({
        orderId: order.id,
        userId: ctx.user.id,
        provider: input.provider,
        status: "pending",
        amount: String(order.totalAmount) as any,
        currency: input.currency,
        externalSessionId: session.sessionId,
        metadata: session as any,
      });
      return session;
    }),

  // ─── Protected: Confirm manual payment (bank transfer / payoneer) ──────────
  confirmManual: protectedProcedure
    .input(z.object({
      orderId: z.number(),
      provider: z.enum(["bank_transfer", "payoneer"]),
      depositorName: z.string().optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getOrderById, createPayment } = await import("../db");
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (order.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await createPayment({
        orderId: order.id,
        userId: ctx.user.id,
        provider: input.provider,
        status: "processing",
        amount: String(order.totalAmount) as any,
        currency: "KRW",
        metadata: { depositorName: input.depositorName, note: input.note } as any,
      });
      return { success: true };
    }),

  // ─── Admin: Confirm bank transfer payment ───────────────────────────────────
  confirmBankTransfer: protectedProcedure
    .input(z.object({
      orderId: z.number(),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { getOrderById } = await import("../db");
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "주문을 찾을 수 없습니다." });
      if (order.paymentMethod !== "bank_transfer") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "무통장 송금 주문이 아닙니다." });
      }
      // Update order: paymentStatus → paid, bankTransferConfirmedAt, bankTransferConfirmedBy
      const { getDb } = await import("../db");
      const { orders } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB 연결 실패" });
      await db.update(orders).set({
        paymentStatus: "paid",
        status: "confirmed",
        bankTransferConfirmedAt: new Date(),
        bankTransferConfirmedBy: ctx.user.id,
        adminNotes: input.note
          ? (order.adminNotes ? order.adminNotes + "\n" + input.note : input.note)
          : order.adminNotes,
      }).where(eq(orders.id, input.orderId));
      // Send confirmation email to customer
      const userEmail = (order as any).userEmail;
      if (userEmail) {
        try {
          const { sendOrderStatusEmail } = await import("../_core/orderStatusEmail");
          await sendOrderStatusEmail({
            customerEmail: userEmail,
            customerName: order.shippingName || "お客様",
            orderNumber: order.orderNumber || String(order.id),
            status: "bank_transfer_confirmed",
          });
          console.log(`[PaymentRouter] Bank transfer confirmation email sent to ${userEmail}`);
        } catch (emailErr) {
          console.warn("[PaymentRouter] Failed to send confirmation email:", emailErr);
          // Email failure should not block the confirmation
        }
      }
      return { success: true };
    }),

  // ─── Admin: Cancel bank transfer confirmation ─────────────────────────────
  cancelBankTransferConfirmation: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { getDb } = await import("../db");
      const { orders } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB 연결 실패" });
      await db.update(orders).set({
        paymentStatus: "pending",
        status: "pending",
        bankTransferConfirmedAt: null,
        bankTransferConfirmedBy: null,
      }).where(eq(orders.id, input.orderId));
      return { success: true };
    }),

  // ─── Protected: Payment history for current user ───────────────────────────
  history: protectedProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const { getPaymentsByUserId } = await import("../db");
      return await getPaymentsByUserId(ctx.user.id, input.limit ?? 20, input.offset ?? 0);
    }),
});
