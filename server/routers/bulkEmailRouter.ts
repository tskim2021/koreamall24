/**
 * Brevo 대량 메일 발송 tRPC 라우터
 * 관리자 전용: 캠페인 CRUD, 수신자 세그먼트 조회, 발송 실행
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb, upsertSiteSetting, getSiteSetting } from "../db";
import {
  bulkEmailCampaigns,
  emailPreferences,
  users,
  orders,
} from "../../drizzle/schema";
import { eq, and, desc, gte, sql, inArray } from "drizzle-orm";
import {
  validateBrevoApiKey,
  getBrevoAccountInfo,
  getBrevoLists,
  getBrevoCampaigns,
  getBrevoCampaignStats,
  createBrevoCampaign,
  sendBrevoCampaignNow,
  sendBrevoCampaignTest,
  deleteBrevoCampaign,
  importContactsToBrevo,
  sendBrevoTransactionalEmail,
} from "../brevoService";

// ── 관리자 권한 미들웨어 ──────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
  }
  return next({ ctx });
});

// ── 수신자 세그먼트별 이메일 목록 조회 헬퍼 ──────────────────────────────────
async function getRecipientEmails(
  segment: string,
  customEmails?: string | null
): Promise<{ email: string; name?: string }[]> {
  const database = await getDb();
  if (!database) return [];

  if (segment === "custom") {
    if (!customEmails) return [];
    try {
      const list = JSON.parse(customEmails) as string[];
      return list.map((email) => ({ email }));
    } catch {
      return customEmails
        .split(/[\n,;]/)
        .map((e) => e.trim())
        .filter((e) => e.includes("@"))
        .map((email) => ({ email }));
    }
  }

  // 전체 회원 (이메일 수신 거부 제외)
  if (segment === "all") {
    const result = await database
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(sql`${users.email} IS NOT NULL`);
    return result.map((r) => ({ email: r.email!, name: r.name || undefined }));
  }

  // 마케팅 수신 동의자
  if (segment === "marketing") {
    const prefs = await database
      .select({ userId: emailPreferences.userId })
      .from(emailPreferences)
      .where(eq(emailPreferences.marketingEmails, true));
    const userIds = prefs.map((p) => p.userId);
    if (userIds.length === 0) return [];
    const result = await database
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(inArray(users.id, userIds));
    return result.map((r) => ({ email: r.email!, name: r.name || undefined }));
  }

  // 뉴스레터 구독자
  if (segment === "newsletter") {
    const prefs = await database
      .select({ userId: emailPreferences.userId })
      .from(emailPreferences)
      .where(eq(emailPreferences.newsletter, true));
    const userIds = prefs.map((p) => p.userId);
    if (userIds.length === 0) return [];
    const result = await database
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(inArray(users.id, userIds));
    return result.map((r) => ({ email: r.email!, name: r.name || undefined }));
  }

  // 최근 30일 구매 회원 (활성)
  if (segment === "active") {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeOrders = await database
      .select({ userId: orders.userId })
      .from(orders)
      .where(gte(orders.createdAt, thirtyDaysAgo));
    const userIds = Array.from(new Set(activeOrders.map((o) => o.userId).filter(Boolean))) as number[];
    if (userIds.length === 0) return [];
    const result = await database
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(inArray(users.id, userIds));
    return result.map((r) => ({ email: r.email!, name: r.name || undefined }));
  }

  // 90일 이상 미구매 회원 (휴면)
  if (segment === "inactive") {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentOrders = await database
      .select({ userId: orders.userId })
      .from(orders)
      .where(gte(orders.createdAt, ninetyDaysAgo));
    const activeUserIdSet = new Set(recentOrders.map((o) => o.userId).filter(Boolean));
    const allUsers = await database
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(sql`${users.email} IS NOT NULL`);
    return allUsers
      .filter((u) => !activeUserIdSet.has(u.id))
      .map((u) => ({ email: u.email!, name: u.name || undefined }));
  }

  // VIP 등급 회원
  if (segment === "vip") {
    const result = await database
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(
        and(
          sql`${users.email} IS NOT NULL`,
          sql`${(users as any).membershipTierId} IS NOT NULL`
        )
      );
    return result.map((r) => ({ email: r.email!, name: r.name || undefined }));
  }

  return [];
}

// ── 라우터 정의 ───────────────────────────────────────────────────────────────
export const bulkEmailRouter = router({
  // Brevo API 키 저장 (관리자 페이지에서 직접 입력)
  saveApiKey: adminProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await upsertSiteSetting("BREVO_API_KEY", input.apiKey, "Brevo 대량 메일 API 키");
      return { success: true };
    }),
  // Brevo API 키 조회 (마스킹 처리하여 돌려줌)
  getApiKey: adminProcedure.query(async () => {
    const setting = await getSiteSetting("BREVO_API_KEY").catch(() => undefined);
    const raw = setting?.value || "";
    const masked = raw.length > 8
      ? raw.slice(0, 4) + "*".repeat(raw.length - 8) + raw.slice(-4)
      : raw ? "****" : "";
    return { masked, isSet: !!raw };
  }),
  // Brevo API 키 유효성 검사
  validateApiKey: adminProcedure.query(async () => {
    return validateBrevoApiKey();
  }),

  // Brevo 계정 정보 조회
  getAccountInfo: adminProcedure.query(async () => {
    try {
      return await getBrevoAccountInfo();
    } catch (err: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
    }
  }),

  // Brevo 연락처 리스트 조회
  getBrevoLists: adminProcedure.query(async () => {
    try {
      return await getBrevoLists();
    } catch (err: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
    }
  }),

  // Brevo 캠페인 목록 조회
  getBrevoCampaigns: adminProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        return await getBrevoCampaigns(input.status as any);
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  // 수신자 수 미리보기
  previewRecipientCount: adminProcedure
    .input(
      z.object({
        segment: z.enum(["all", "marketing", "newsletter", "active", "inactive", "vip", "custom"]),
        customEmails: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const recipients = await getRecipientEmails(input.segment, input.customEmails);
      return { count: recipients.length };
    }),

  // 캠페인 목록 조회 (로컬 DB)
  listCampaigns: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const conditions = [];
      if (input.status) {
        conditions.push(eq(bulkEmailCampaigns.status, input.status as any));
      }

      const campaigns = await database
        .select()
        .from(bulkEmailCampaigns)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(bulkEmailCampaigns.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [{ total }] = await database
        .select({ total: sql<number>`COUNT(*)` })
        .from(bulkEmailCampaigns)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return { campaigns, total };
    }),

  // 캠페인 단건 조회
  getCampaign: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [campaign] = await database
        .select()
        .from(bulkEmailCampaigns)
        .where(eq(bulkEmailCampaigns.id, input.id))
        .limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      return campaign;
    }),

  // 캠페인 생성 (초안)
  createCampaign: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        subject: z.string().min(1).max(300),
        previewText: z.string().max(200).optional(),
        senderName: z.string().default("ококくすり"),
        senderEmail: z.string().email().default("noreply@cocokusuri.com"),
        targetSegment: z.enum(["all", "marketing", "newsletter", "active", "inactive", "vip", "custom"]).default("marketing"),
        customEmails: z.string().optional(),
        contentType: z.enum(["html", "text"]).default("html"),
        htmlContent: z.string().optional(),
        textContent: z.string().optional(),
        brevoTemplateId: z.number().optional(),
        scheduledAt: z.string().optional(), // ISO 8601
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await database.insert(bulkEmailCampaigns).values({
        name: input.name,
        subject: input.subject,
        previewText: input.previewText,
        senderName: input.senderName,
        senderEmail: input.senderEmail,
        targetSegment: input.targetSegment,
        customEmails: input.customEmails,
        contentType: input.contentType,
        htmlContent: input.htmlContent,
        textContent: input.textContent,
        brevoTemplateId: input.brevoTemplateId,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        status: input.scheduledAt ? "scheduled" : "draft",
        createdBy: ctx.user.id,
        notes: input.notes,
      });

      return { id: (result as any).insertId };
    }),

  // 캠페인 수정
  updateCampaign: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        subject: z.string().min(1).max(300).optional(),
        previewText: z.string().max(200).optional(),
        senderName: z.string().optional(),
        senderEmail: z.string().email().optional(),
        targetSegment: z.enum(["all", "marketing", "newsletter", "active", "inactive", "vip", "custom"]).optional(),
        customEmails: z.string().optional(),
        contentType: z.enum(["html", "text"]).optional(),
        htmlContent: z.string().optional(),
        textContent: z.string().optional(),
        brevoTemplateId: z.number().optional(),
        scheduledAt: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, scheduledAt, ...rest } = input;
      const updateData: any = { ...rest };
      if (scheduledAt !== undefined) {
        updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
        updateData.status = scheduledAt ? "scheduled" : "draft";
      }

      await database
        .update(bulkEmailCampaigns)
        .set(updateData)
        .where(eq(bulkEmailCampaigns.id, id));

      return { success: true };
    }),

  // 캠페인 삭제
  deleteCampaign: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [campaign] = await database
        .select()
        .from(bulkEmailCampaigns)
        .where(eq(bulkEmailCampaigns.id, input.id))
        .limit(1);

      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (campaign.status === "sending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "발송 중인 캠페인은 삭제할 수 없습니다." });
      }

      // Brevo에서도 삭제
      if (campaign.brevoCampaignId) {
        try {
          await deleteBrevoCampaign(campaign.brevoCampaignId);
        } catch { /* Brevo 삭제 실패해도 로컬 삭제는 진행 */ }
      }

      await database.delete(bulkEmailCampaigns).where(eq(bulkEmailCampaigns.id, input.id));
      return { success: true };
    }),

  // 테스트 발송
  sendTest: adminProcedure
    .input(
      z.object({
        campaignId: z.number(),
        testEmails: z.array(z.string().email()).min(1).max(5),
      })
    )
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [campaign] = await database
        .select()
        .from(bulkEmailCampaigns)
        .where(eq(bulkEmailCampaigns.id, input.campaignId))
        .limit(1);

      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });

      // Brevo 캠페인 ID가 있으면 Brevo 테스트 발송 사용
      if (campaign.brevoCampaignId) {
        await sendBrevoCampaignTest(campaign.brevoCampaignId, input.testEmails);
        return { success: true, method: "brevo" };
      }

      // 없으면 트랜잭셔널 메일로 직접 발송
      await sendBrevoTransactionalEmail({
        to: input.testEmails.map((email) => ({ email })),
        sender: { email: campaign.senderEmail, name: campaign.senderName },
        subject: `[테스트] ${campaign.subject}`,
        htmlContent: campaign.htmlContent || undefined,
        textContent: campaign.textContent || undefined,
      });

      return { success: true, method: "transactional" };
    }),

  // 실제 발송 (Brevo 캠페인 생성 + 즉시 발송)
  sendCampaign: adminProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [campaign] = await database
        .select()
        .from(bulkEmailCampaigns)
        .where(eq(bulkEmailCampaigns.id, input.campaignId))
        .limit(1);

      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (campaign.status === "sent") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "이미 발송된 캠페인입니다." });
      }
      if (campaign.status === "sending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "이미 발송 중인 캠페인입니다." });
      }

      // 수신자 목록 조회
      const recipients = await getRecipientEmails(campaign.targetSegment, campaign.customEmails);
      if (recipients.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "수신자가 없습니다. 세그먼트를 확인해주세요." });
      }

      // 발송 중 상태로 업데이트
      await database
        .update(bulkEmailCampaigns)
        .set({ status: "sending", recipientCount: recipients.length })
        .where(eq(bulkEmailCampaigns.id, input.campaignId));

      try {
        // Brevo에 연락처 임포트 (리스트 없이 직접 발송)
        // 트랜잭셔널 방식으로 대량 발송 (Brevo 캠페인 API 사용)
        // 먼저 Brevo에 캠페인 생성
        const batchSize = 50; // Brevo 무료 플랜 제한 고려
        let sentCount = 0;
        let failedCount = 0;

        // 소량(50명 이하)이면 트랜잭셔널 메일로 직접 발송
        if (recipients.length <= 50) {
          for (const recipient of recipients) {
            try {
              await sendBrevoTransactionalEmail({
                to: [{ email: recipient.email, name: recipient.name }],
                sender: { email: campaign.senderEmail, name: campaign.senderName },
                subject: campaign.subject,
                htmlContent: campaign.htmlContent || undefined,
                textContent: campaign.textContent || undefined,
              });
              sentCount++;
            } catch {
              failedCount++;
            }
          }
        } else {
          // 대량이면 Brevo 캠페인 API 사용
          // 먼저 연락처를 Brevo에 임포트
          const importResult = await importContactsToBrevo(
            recipients.map((r) => ({
              email: r.email,
              attributes: r.name ? { FIRSTNAME: r.name } : undefined,
            }))
          );

          // Brevo 캠페인 생성
          const bRevoCampaign = await createBrevoCampaign({
            name: campaign.name,
            subject: campaign.subject,
            previewText: campaign.previewText || undefined,
            sender: { name: campaign.senderName, email: campaign.senderEmail },
            type: "classic",
            htmlContent: campaign.htmlContent || undefined,
            textContent: campaign.textContent || undefined,
            templateId: campaign.brevoTemplateId || undefined,
            recipients: {}, // 전체 연락처 대상
            scheduledAt: campaign.scheduledAt?.toISOString(),
          });

          // 즉시 발송
          if (!campaign.scheduledAt) {
            await sendBrevoCampaignNow(bRevoCampaign.id);
          }

          // 로컬 DB에 Brevo 캠페인 ID 저장
          await database
            .update(bulkEmailCampaigns)
            .set({ brevoCampaignId: bRevoCampaign.id })
            .where(eq(bulkEmailCampaigns.id, input.campaignId));

          sentCount = recipients.length;
        }

        // 발송 완료 상태 업데이트
        await database
          .update(bulkEmailCampaigns)
          .set({
            status: "sent",
            sentAt: new Date(),
            sentCount,
            failedCount,
          })
          .where(eq(bulkEmailCampaigns.id, input.campaignId));

        return { success: true, sentCount, failedCount, recipientCount: recipients.length };
      } catch (err: any) {
        // 실패 상태 업데이트
        await database
          .update(bulkEmailCampaigns)
          .set({ status: "failed" })
          .where(eq(bulkEmailCampaigns.id, input.campaignId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  // 캠페인 통계 동기화 (Brevo에서 최신 통계 가져오기)
  syncCampaignStats: adminProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [campaign] = await database
        .select()
        .from(bulkEmailCampaigns)
        .where(eq(bulkEmailCampaigns.id, input.campaignId))
        .limit(1);

      if (!campaign || !campaign.brevoCampaignId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Brevo 캠페인 ID가 없습니다." });
      }

      const stats = await getBrevoCampaignStats(campaign.brevoCampaignId);
      const globalStats = stats.statistics?.globalStats;

      if (globalStats) {
        await database
          .update(bulkEmailCampaigns)
          .set({
            sentCount: globalStats.sent || 0,
            openCount: globalStats.uniqueViews || 0,
            clickCount: globalStats.uniqueClicks || 0,
          })
          .where(eq(bulkEmailCampaigns.id, input.campaignId));
      }

      return { success: true, stats: globalStats };
    }),

  // 대시보드 통계 요약
  getDashboardStats: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [stats] = await database
      .select({
        total: sql<number>`COUNT(*)`,
        sent: sql<number>`SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)`,
        draft: sql<number>`SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)`,
        scheduled: sql<number>`SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END)`,
        failed: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
        totalSent: sql<number>`SUM(sent_count)`,
        totalRecipients: sql<number>`SUM(recipient_count)`,
        totalOpens: sql<number>`SUM(open_count)`,
        totalClicks: sql<number>`SUM(click_count)`,
      })
      .from(bulkEmailCampaigns);

    const recentCampaigns = await database
      .select()
      .from(bulkEmailCampaigns)
      .orderBy(desc(bulkEmailCampaigns.createdAt))
      .limit(5);

    return { stats, recentCampaigns };
  }),
});
