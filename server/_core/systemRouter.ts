import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { send7DayReviewReminders, send30DayReviewReminders, runReviewReminderChecks } from "../reviewReminderScheduler";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  // Review reminder system
  sendReviewReminders: adminProcedure
    .input(
      z.object({
        type: z.enum(['7days', '30days', 'all']),
      })
    )
    .mutation(async ({ input }) => {
      try {
        if (input.type === '7days') {
          const result = await send7DayReviewReminders();
          return result;
        } else if (input.type === '30days') {
          const result = await send30DayReviewReminders();
          return result;
        } else {
          const results = await runReviewReminderChecks();
          return {
            success: true,
            results,
          };
        }
      } catch (error) {
        console.error('[System] Error sending review reminders:', error);
        return {
          success: false,
          error: String(error),
        };
      }
    }),
});
