/**
 * Gmail Router
 * Admin-only tRPC procedures for Gmail inbox management
 */
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  listMessages,
  getMessage,
  markAsRead,
  markAsUnread,
  trashMessage,
  sendEmail,
  getUnreadCount,
  loadTokens,
  getAuthUrl,
  getRedirectUri,
} from "../gmailService";

function adminOnly(ctx: any) {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
  }
}

export const gmailRouter = router({
  /** Check if Gmail is connected (tokens exist) */
  isConnected: protectedProcedure.query(async ({ ctx }) => {
    adminOnly(ctx);
    const tokens = await loadTokens();
    return { connected: !!tokens };
  }),

  /** Get OAuth2 auth URL for connecting Gmail */
  getAuthUrl: protectedProcedure
    .input(z.object({ origin: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx);
      const redirectUri = getRedirectUri(input.origin);
      const url = getAuthUrl(redirectUri);
      return { url, redirectUri };
    }),

  /** Get unread count */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    adminOnly(ctx);
    try {
      const count = await getUnreadCount();
      return { count };
    } catch {
      return { count: 0 };
    }
  }),

  /** List messages in inbox */
  listMessages: protectedProcedure
    .input(
      z.object({
        maxResults: z.number().min(1).max(50).default(20),
        labelIds: z.array(z.string()).default(["INBOX"]),
        pageToken: z.string().optional(),
        query: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      adminOnly(ctx);
      try {
        return await listMessages(
          input.maxResults,
          input.labelIds,
          input.pageToken,
          input.query
        );
      } catch (e: any) {
        if (e.message === "Gmail not authenticated") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Gmail 연동이 필요합니다." });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e.message });
      }
    }),

  /** Get single message */
  getMessage: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx);
      try {
        const msg = await getMessage(input.messageId);
        // Auto mark as read
        await markAsRead(input.messageId).catch(() => {});
        return msg;
      } catch (e: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e.message });
      }
    }),

  /** Mark message as read */
  markAsRead: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      await markAsRead(input.messageId);
      return { success: true };
    }),

  /** Mark message as unread */
  markAsUnread: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      await markAsUnread(input.messageId);
      return { success: true };
    }),

  /** Move message to trash */
  trashMessage: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      await trashMessage(input.messageId);
      return { success: true };
    }),

  /** Send or reply to email */
  sendEmail: protectedProcedure
    .input(
      z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        body: z.string().min(1),
        inReplyTo: z.string().optional(),
        references: z.string().optional(),
        threadId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      try {
        const result = await sendEmail(input);
        return { success: true, ...result };
      } catch (e: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e.message });
      }
    }),
});
