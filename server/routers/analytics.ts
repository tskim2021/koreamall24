import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getAnalyticsSummary,
  getDailyStatsRange,
  getCountryStats,
  getSearchKeywordStats,
  getPageViewsByDateRange,
} from "../analytics";
import { TRPCError } from "@trpc/server";

export const analyticsRouter = router({
  // 관리자 전용: 애널리틱스 요약
  getSummary: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getAnalyticsSummary(input.startDate, input.endDate);
    }),

  // 관리자 전용: 일일 통계
  getDailyStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getDailyStatsRange(input.startDate, input.endDate);
    }),

  // 관리자 전용: 국가별 통계
  getCountryStats: protectedProcedure
    .input(
      z.object({
        date: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getCountryStats(input.date);
    }),

  // 관리자 전용: 검색 키워드 통계
  getSearchKeywords: protectedProcedure
    .input(
      z.object({
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(), // YYYY-MM-DD
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const data = await getSearchKeywordStats(input.startDate, input.endDate);
      return data.slice(0, input.limit);
    }),

  // 관리자 전용: 세션 데이터 (페이지뷰 기반으로 대체)
  getSessions: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // getSessionsByDateRange가 없으므로 빈 배열 반환
      return [] as any[];
    }),

  // 관리자 전용: 페이지 뷰 데이터
  getPageViews: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        page: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      let data = await getPageViewsByDateRange(input.startDate, input.endDate);

      if (input.page) {
        data = data.filter((pv: any) => pv.page.includes(input.page));
      }
      if (input.country) {
        data = data.filter((pv: any) => pv.country === input.country);
      }

      return data.slice(0, input.limit);
    }),
});
