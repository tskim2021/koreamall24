import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { eq, desc, asc, sql, and, gte, lte, count } from "drizzle-orm";
import { membershipTiers, referralRewards, loginHistory, referralSettings, registeredUsers, orders, tierChangeHistory } from "../../drizzle/schema";
import { sendTierUpgradeEmail } from "../_core/emailService";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { withCache, TTL_30MIN } from "../cache";

// Admin procedure helper
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
});

async function getDatabase() {
  const instance = await getDb();
  if (!instance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  return instance;
}

// openId가 'email_123' 형식이면 123을 반환, 아니면 null (OAuth 사용자)
function getRegisteredUserIdFromOpenId(openId: string): number | null {
  if (openId.startsWith('email_')) {
    const id = parseInt(openId.replace('email_', ''), 10);
    return isNaN(id) ? null : id;
  }
  return null;
}

export const membershipRouter = router({
  // ===== 회원 등급 관리 =====
  tiers: router({
    // 전체 등급 목록 조회 (공개)
    list: publicProcedure.query(async () => {
      return withCache('membership:tiers:list', TTL_30MIN, async () => {
        const d = await getDatabase();
        return d.select().from(membershipTiers).orderBy(asc(membershipTiers.sortOrder));
      });
    }),

    // 관리자: 등급 생성
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        nameKo: z.string().min(1),
        minAmount: z.number().min(0),
        discountRate: z.string(),
        pointRate: z.string(),
        color: z.string(),
        icon: z.string().optional(),
        sortOrder: z.number(),
        periodMonths: z.number().min(1).max(24).default(6),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const d = await getDatabase();
        await d.insert(membershipTiers).values({
          name: input.name,
          nameKo: input.nameKo,
          minAmount: input.minAmount,
          discountRate: input.discountRate,
          pointRate: input.pointRate,
          color: input.color,
          icon: input.icon || "Star",
          sortOrder: input.sortOrder,
          periodMonths: input.periodMonths,
          isActive: input.isActive,
        });
        return { success: true };
      }),

    // 관리자: 등급 수정
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        nameKo: z.string().min(1).optional(),
        minAmount: z.number().min(0).optional(),
        discountRate: z.string().optional(),
        pointRate: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        sortOrder: z.number().optional(),
        periodMonths: z.number().min(1).max(24).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const d = await getDatabase();
        const { id, ...updates } = input;
        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.nameKo !== undefined) updateData.nameKo = updates.nameKo;
        if (updates.minAmount !== undefined) updateData.minAmount = updates.minAmount;
        if (updates.discountRate !== undefined) updateData.discountRate = updates.discountRate;
        if (updates.pointRate !== undefined) updateData.pointRate = updates.pointRate;
        if (updates.color !== undefined) updateData.color = updates.color;
        if (updates.icon !== undefined) updateData.icon = updates.icon;
        if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
        if (updates.periodMonths !== undefined) updateData.periodMonths = updates.periodMonths;
        if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
        await d.update(membershipTiers).set(updateData).where(eq(membershipTiers.id, id));
        return { success: true };
      }),

    // 관리자: 등급 삭제
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const d = await getDatabase();
        await d.delete(membershipTiers).where(eq(membershipTiers.id, input.id));
        return { success: true };
      }),

    // 관리자: 전체 회원 등급 재산정
    recalculateAll: adminProcedure.mutation(async () => {
      const d = await getDatabase();
      const tiers = await d.select().from(membershipTiers)
        .where(eq(membershipTiers.isActive, true))
        .orderBy(desc(membershipTiers.minAmount));
      
      if (tiers.length === 0) return { success: true, updated: 0 };

      const periodMonths = tiers[0].periodMonths;
      const periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - periodMonths);

      const users = await d.select({
        id: registeredUsers.id,
      }).from(registeredUsers).where(eq(registeredUsers.isWithdrawn, false));

      let updatedCount = 0;
      for (const user of users) {
        const result = await d.select({
          total: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        }).from(orders).where(
          and(
            eq(orders.userId, user.id),
            gte(orders.createdAt, periodStart),
            sql`${orders.status} NOT IN ('cancelled', 'partially_cancelled')`
          )
        );
        const totalAmount = Math.floor(parseFloat(result[0]?.total || "0"));

        let matchedTier = tiers[tiers.length - 1];
        for (const tier of tiers) {
          if (totalAmount >= tier.minAmount) {
            matchedTier = tier;
            break;
          }
        }

        await d.update(registeredUsers).set({
          membershipTierId: matchedTier.id,
          totalPurchaseAmount: totalAmount,
          tierUpdatedAt: new Date(),
        }).where(eq(registeredUsers.id, user.id));
        updatedCount++;
      }

      return { success: true, updated: updatedCount };
    }),

    // 개별 회원 등급 재산정
    recalculateUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const d = await getDatabase();
        const tiers = await d.select().from(membershipTiers)
          .where(eq(membershipTiers.isActive, true))
          .orderBy(desc(membershipTiers.minAmount));
        
        if (tiers.length === 0) return { success: true };

        const periodMonths = tiers[0].periodMonths;
        const periodStart = new Date();
        periodStart.setMonth(periodStart.getMonth() - periodMonths);

        const result = await d.select({
          total: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        }).from(orders).where(
          and(
            eq(orders.userId, input.userId),
            gte(orders.createdAt, periodStart),
            sql`${orders.status} NOT IN ('cancelled', 'partially_cancelled')`
          )
        );
        const totalAmount = Math.floor(parseFloat(result[0]?.total || "0"));

        let matchedTier = tiers[tiers.length - 1];
        for (const tier of tiers) {
          if (totalAmount >= tier.minAmount) {
            matchedTier = tier;
            break;
          }
        }

        await d.update(registeredUsers).set({
          membershipTierId: matchedTier.id,
          totalPurchaseAmount: totalAmount,
          tierUpdatedAt: new Date(),
        }).where(eq(registeredUsers.id, input.userId));

        return { success: true, tierId: matchedTier.id, tierName: matchedTier.name, totalAmount };
      }),

    // 관리자: 수동 등급 변경
    setUserTier: adminProcedure
      .input(z.object({ userId: z.number(), tierId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const d = await getDatabase();
        const currentUser = await d.select({ membershipTierId: registeredUsers.membershipTierId })
          .from(registeredUsers).where(eq(registeredUsers.id, input.userId)).limit(1);
        const previousTierId = currentUser[0]?.membershipTierId || null;
        await d.update(registeredUsers).set({
          membershipTierId: input.tierId,
          tierUpdatedAt: new Date(),
        }).where(eq(registeredUsers.id, input.userId));
        await d.insert(tierChangeHistory).values({
          userId: input.userId,
          previousTierId,
          newTierId: input.tierId,
          changedBy: ctx.user.id,
          changeType: "manual",
          reason: input.reason || null,
        });
        // 등급 변경 알림 이메일 발송
        try {
          const userInfo = await d.select({ email: registeredUsers.email, nameKanji: registeredUsers.nameKanji })
            .from(registeredUsers).where(eq(registeredUsers.id, input.userId)).limit(1);
          const newTierInfo = await d.select().from(membershipTiers).where(eq(membershipTiers.id, input.tierId)).limit(1);
          const prevTierInfo = previousTierId
            ? await d.select().from(membershipTiers).where(eq(membershipTiers.id, previousTierId)).limit(1)
            : [{ name: "未設定" }];
          if (userInfo[0]?.email && newTierInfo[0]) {
            await sendTierUpgradeEmail({
              to: userInfo[0].email,
              userName: userInfo[0].nameKanji || "お客様",
              previousTierName: prevTierInfo[0]?.name || "未設定",
              newTierName: newTierInfo[0].name,
              newDiscountRate: parseFloat(newTierInfo[0].discountRate || "0"),
              newPointRate: parseFloat(newTierInfo[0].pointRate || "0"),
            });
          }
        } catch (emailErr) {
          console.error("[TierChange] Email notification failed:", emailErr);
        }
        return { success: true };
      }),
    // 등급 변경 이력 조회
    getTierHistory: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const d = await getDatabase();
        const history = await d.select().from(tierChangeHistory)
          .where(eq(tierChangeHistory.userId, input.userId))
          .orderBy(desc(tierChangeHistory.createdAt))
          .limit(20);
        const tiers = await d.select().from(membershipTiers);
        const tierMap = new Map(tiers.map(t => [t.id, t.name]));
        return history.map(h => ({
          ...h,
          previousTierName: h.previousTierId ? tierMap.get(h.previousTierId) || "미지정" : "미지정",
          newTierName: tierMap.get(h.newTierId) || "미지정",
        }));
      }),
  }),

  // ===== 추천인 제도 =====
  referral: router({
    // 추천 설정 조회
    getSettings: publicProcedure.query(async () => {
      const d = await getDatabase();
      const settings = await d.select().from(referralSettings).limit(1);
      if (settings.length === 0) {
        return {
          signupReferrerReward: 500,
          signupRefereeReward: 500,
          purchaseReferrerReward: 1000,
          purchaseRefereeReward: 1000,
          isActive: true,
        };
      }
      return settings[0];
    }),

    // 관리자: 추천 설정 업데이트
    updateSettings: adminProcedure
      .input(z.object({
        signupReferrerReward: z.number().min(0),
        signupRefereeReward: z.number().min(0),
        purchaseReferrerReward: z.number().min(0),
        purchaseRefereeReward: z.number().min(0),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const d = await getDatabase();
        const existing = await d.select().from(referralSettings).limit(1);
        if (existing.length === 0) {
          await d.insert(referralSettings).values(input);
        } else {
          await d.update(referralSettings).set(input).where(eq(referralSettings.id, existing[0].id));
        }
        return { success: true };
      }),

    // 내 추천 코드 조회
    getMyCode: protectedProcedure.query(async ({ ctx }) => {
      const d = await getDatabase();
      const registeredUserId = getRegisteredUserIdFromOpenId(ctx.user.openId);
      if (!registeredUserId) return null;
      const user = await d.select({
        referralCode: registeredUsers.referralCode,
      }).from(registeredUsers).where(eq(registeredUsers.id, registeredUserId)).limit(1);
      return user[0]?.referralCode || null;
    }),

    // 내 추천 현황 조회
    getMyReferrals: protectedProcedure.query(async ({ ctx }) => {
      const d = await getDatabase();
      const registeredUserId = getRegisteredUserIdFromOpenId(ctx.user.openId);
      if (!registeredUserId) {
        return { totalReferrals: 0, completedCount: 0, totalEarned: 0, rewards: [] };
      }
      const rewards = await d.select().from(referralRewards)
        .where(eq(referralRewards.referrerId, registeredUserId))
        .orderBy(desc(referralRewards.createdAt));
      
      const totalReferrals = rewards.length;
      const completedRewards = rewards.filter(r => r.status === 'completed');
      const totalEarned = completedRewards.reduce((sum, r) => sum + r.referrerReward, 0);

      return {
        totalReferrals,
        completedCount: completedRewards.length,
        totalEarned,
        rewards,
      };
    }),

    // 추천 코드로 추천인 확인
    validateCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const d = await getDatabase();
        const referrer = await d.select({
          id: registeredUsers.id,
          nameKanji: registeredUsers.nameKanji,
        }).from(registeredUsers)
          .where(eq(registeredUsers.referralCode, input.code))
          .limit(1);
        
        if (referrer.length === 0) return { valid: false, referrerName: null };
        const name = referrer[0].nameKanji;
        const masked = name.length > 1 ? name[0] + '*'.repeat(name.length - 1) : name;
        return { valid: true, referrerName: masked };
      }),

    // 관리자: 추천 보상 내역 조회
    adminGetRewards: adminProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        status: z.enum(["pending", "completed", "cancelled"]).optional(),
      }))
      .query(async ({ input }) => {
        const d = await getDatabase();
        const offset = (input.page - 1) * input.limit;
        
        let conditions: any[] = [];
        if (input.status) {
          conditions.push(eq(referralRewards.status, input.status));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const referrer = registeredUsers as any;
        const referee = registeredUsers as any;

        const [rewards, totalResult] = await Promise.all([
          d.select({
            id: referralRewards.id,
            referrerId: referralRewards.referrerId,
            refereeId: referralRewards.refereeId,
            rewardType: referralRewards.rewardType,
            referrerReward: referralRewards.referrerReward,
            refereeReward: referralRewards.refereeReward,
            status: referralRewards.status,
            createdAt: referralRewards.createdAt,
          }).from(referralRewards)
            .where(whereClause)
            .orderBy(desc(referralRewards.createdAt))
            .limit(input.limit)
            .offset(offset),
          d.select({ count: count() }).from(referralRewards).where(whereClause),
        ]);

        // referrerId/refereeId로 이메일 일괄 조회
        const idSet = new Set<number>();
        rewards.forEach(r => {
          if (r.referrerId) idSet.add(r.referrerId);
          if (r.refereeId) idSet.add(r.refereeId);
        });
        const allUserIds = Array.from(idSet);

        let emailMap: Record<number, string> = {};
        if (allUserIds.length > 0) {
          const userRows = await d.select({ id: registeredUsers.id, email: registeredUsers.email })
            .from(registeredUsers)
            .where(sql`${registeredUsers.id} IN (${sql.join(allUserIds.map(id => sql`${id}`), sql`, `)})`);
          emailMap = Object.fromEntries(userRows.map(u => [u.id, u.email]));
        }

        const rewardsWithEmail = rewards.map(r => ({
          ...r,
          referrerEmail: r.referrerId ? (emailMap[r.referrerId] ?? String(r.referrerId)) : null,
          refereeEmail: r.refereeId ? (emailMap[r.refereeId] ?? String(r.refereeId)) : null,
        }));

        return {
          rewards: rewardsWithEmail,
          total: totalResult[0]?.count || 0,
          page: input.page,
          totalPages: Math.ceil((totalResult[0]?.count || 0) / input.limit),
        };
      }),
  }),

  // ===== 접속 이력 =====
  loginHistory: router({
    // 관리자: 특정 회원 접속 이력 조회
    getByUser: adminProcedure
      .input(z.object({
        userId: z.number(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ input }) => {
        const d = await getDatabase();
        const offset = (input.page - 1) * input.limit;

        const [history, totalResult] = await Promise.all([
          d.select().from(loginHistory)
            .where(eq(loginHistory.userId, input.userId))
            .orderBy(desc(loginHistory.loginAt))
            .limit(input.limit)
            .offset(offset),
          d.select({ count: count() }).from(loginHistory)
            .where(eq(loginHistory.userId, input.userId)),
        ]);

        return {
          history,
          total: totalResult[0]?.count || 0,
          page: input.page,
          totalPages: Math.ceil((totalResult[0]?.count || 0) / input.limit),
        };
      }),

    // 관리자: 접속 통계
    getStats: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const d = await getDatabase();
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [totalResult, last7DaysResult, last30DaysResult, lastLogin, deviceStats] = await Promise.all([
          d.select({ count: count() }).from(loginHistory)
            .where(eq(loginHistory.userId, input.userId)),
          d.select({ count: count() }).from(loginHistory)
            .where(and(eq(loginHistory.userId, input.userId), gte(loginHistory.loginAt, sevenDaysAgo))),
          d.select({ count: count() }).from(loginHistory)
            .where(and(eq(loginHistory.userId, input.userId), gte(loginHistory.loginAt, thirtyDaysAgo))),
          d.select().from(loginHistory)
            .where(eq(loginHistory.userId, input.userId))
            .orderBy(desc(loginHistory.loginAt))
            .limit(1),
          d.select({
            device: loginHistory.device,
            count: count(),
          }).from(loginHistory)
            .where(eq(loginHistory.userId, input.userId))
            .groupBy(loginHistory.device),
        ]);

        return {
          totalLogins: totalResult[0]?.count || 0,
          last7Days: last7DaysResult[0]?.count || 0,
          last30Days: last30DaysResult[0]?.count || 0,
          lastLoginAt: lastLogin[0]?.loginAt || null,
          lastIp: lastLogin[0]?.ipAddress || null,
          lastDevice: lastLogin[0]?.device || null,
          lastBrowser: lastLogin[0]?.browser || null,
          deviceStats,
        };
      }),

    // 로그인 시 이력 기록 (내부 호출용)
    record: protectedProcedure
      .input(z.object({
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        device: z.string().optional(),
        browser: z.string().optional(),
        country: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const d = await getDatabase();
        await d.insert(loginHistory).values({
          userId: ctx.user.id,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          device: input.device,
          browser: input.browser,
          country: input.country,
        });
        return { success: true };
      }),
  }),

  // 관리자: 특정 회원 등급 정보 조회
  getUserTier: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const d = await getDatabase();
      const user = await d.select({
        membershipTierId: registeredUsers.membershipTierId,
        totalPurchaseAmount: registeredUsers.totalPurchaseAmount,
        tierUpdatedAt: registeredUsers.tierUpdatedAt,
        points: registeredUsers.points,
      }).from(registeredUsers).where(eq(registeredUsers.id, input.userId)).limit(1);

      if (!user[0]) return null;

      // 6개월 구매액 계산
      const periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - 6);
      const purchaseResult = await d.select({
        total: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      }).from(orders).where(
        and(
          eq(orders.userId, input.userId),
          gte(orders.createdAt, periodStart),
          sql`${orders.status} NOT IN ('cancelled', 'partially_cancelled')`
        )
      );
      const purchaseAmount6m = Math.floor(parseFloat(purchaseResult[0]?.total || "0"));

      let tierName = null;
      let discountRate = 0;
      let pointRate = 0;
      if (user[0].membershipTierId) {
        const tier = await d.select().from(membershipTiers)
          .where(eq(membershipTiers.id, user[0].membershipTierId)).limit(1);
        if (tier[0]) {
          tierName = tier[0].name;
          discountRate = parseFloat(tier[0].discountRate);
          pointRate = parseFloat(tier[0].pointRate);
        }
      }

      return {
        tierName,
        discountRate,
        pointRate,
        totalPurchaseAmount: user[0].totalPurchaseAmount,
        purchaseAmount6m,
        points: user[0].points,
      };
    }),

  // 관리자: 특정 회원 추천 정보 조회
  getUserReferrals: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const d = await getDatabase();
      const user = await d.select({
        referralCode: registeredUsers.referralCode,
        referredBy: registeredUsers.referredBy,
      }).from(registeredUsers).where(eq(registeredUsers.id, input.userId)).limit(1);

      if (!user[0]) return null;

       // 이 유저를 추천인으로 등록한 회원 목록 (referredBy는 userId int)
      const referrals = await d.select({
            id: registeredUsers.id,
            name: registeredUsers.nameKanji,
            email: registeredUsers.email,
            joinedAt: registeredUsers.createdAt,
          }).from(registeredUsers)
            .where(eq(registeredUsers.referredBy, input.userId))
            .orderBy(desc(registeredUsers.createdAt));

      // 추천한 사람 이름 조회 (referredBy는 userId int)
      let referredByName = null;
      if (user[0].referredBy) {
        const referrer = await d.select({
          name: registeredUsers.nameKanji,
        }).from(registeredUsers)
          .where(eq(registeredUsers.id, user[0].referredBy))
          .limit(1);
        referredByName = referrer[0]?.name || String(user[0].referredBy);
      }

      return {
        referralCode: user[0].referralCode,
        referredBy: referredByName,
        referralCount: referrals.length,
        referrals,
      };
    }),

  // 내 등급 정보 조회
  myTier: protectedProcedure.query(async ({ ctx }) => {
    const d = await getDatabase();
    const registeredUserId = getRegisteredUserIdFromOpenId(ctx.user.openId);
    if (!registeredUserId) {
      // OAuth 사용자는 registered_users에 없음
      return { tier: null, totalPurchaseAmount: 0, nextTier: null, isOAuthUser: true };
    }
    const user = await d.select({
      membershipTierId: registeredUsers.membershipTierId,
      totalPurchaseAmount: registeredUsers.totalPurchaseAmount,
      tierUpdatedAt: registeredUsers.tierUpdatedAt,
    }).from(registeredUsers).where(eq(registeredUsers.id, registeredUserId)).limit(1);

    if (!user[0] || !user[0].membershipTierId) {
      return { tier: null, totalPurchaseAmount: user[0]?.totalPurchaseAmount || 0, nextTier: null };
    }

    const tier = await d.select().from(membershipTiers)
      .where(eq(membershipTiers.id, user[0].membershipTierId))
      .limit(1);

    // 다음 등급 정보
    const allTiers = await d.select().from(membershipTiers)
      .where(eq(membershipTiers.isActive, true))
      .orderBy(asc(membershipTiers.sortOrder));
    
    const currentIdx = allTiers.findIndex((t: any) => t.id === user[0].membershipTierId);
    const nextTier = currentIdx < allTiers.length - 1 ? allTiers[currentIdx + 1] : null;

    return {
      tier: tier[0] || null,
      totalPurchaseAmount: user[0].totalPurchaseAmount,
      tierUpdatedAt: user[0].tierUpdatedAt,
      nextTier,
    };
  }),

  // === 회원 통계 대시보드 ===
  stats: router({
    overview: adminProcedure.query(async () => {
      const d = await getDatabase();
      const totalMembers = await d.select({ count: count() }).from(registeredUsers);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      
      const newMembersThisMonth = await d.select({ count: count() }).from(registeredUsers)
        .where(gte(registeredUsers.createdAt, thirtyDaysAgo));
      const newMembersThisWeek = await d.select({ count: count() }).from(registeredUsers)
        .where(gte(registeredUsers.createdAt, sevenDaysAgo));
      
      const activeMembers = await d.select({ count: count() }).from(registeredUsers)
        .where(gte(registeredUsers.lastSignedIn, sixMonthsAgo));
      
      const dormantMembers = await d.select({ count: count() }).from(registeredUsers)
        .where(and(
          lte(registeredUsers.lastSignedIn, sixMonthsAgo),
          sql`${registeredUsers.lastSignedIn} IS NOT NULL`
        ));
      
      const avgPurchase = await d.select({ avg: sql<string>`AVG(${registeredUsers.totalPurchaseAmount})` }).from(registeredUsers);
      
      return {
        totalMembers: totalMembers[0]?.count || 0,
        newMembersThisMonth: newMembersThisMonth[0]?.count || 0,
        newMembersThisWeek: newMembersThisWeek[0]?.count || 0,
        activeMembers: activeMembers[0]?.count || 0,
        dormantMembers: dormantMembers[0]?.count || 0,
        avgPurchaseAmount: Math.round(Number(avgPurchase[0]?.avg || 0)),
      };
    }),

    tierDistribution: adminProcedure.query(async () => {
      const d = await getDatabase();
      const tiers = await d.select().from(membershipTiers).where(eq(membershipTiers.isActive, true)).orderBy(asc(membershipTiers.sortOrder));
      
      const distribution = await Promise.all(tiers.map(async (tier) => {
        const result = await d.select({ count: count() }).from(registeredUsers)
          .where(eq(registeredUsers.membershipTierId, tier.id));
        return {
          tierId: tier.id,
          tierName: tier.name,
          tierNameKo: tier.nameKo,
          color: tier.color,
          count: result[0]?.count || 0,
        };
      }));
      
      const unassigned = await d.select({ count: count() }).from(registeredUsers)
        .where(sql`${registeredUsers.membershipTierId} IS NULL`);
      distribution.unshift({
        tierId: 0,
        tierName: 'Unassigned',
        tierNameKo: '미설정',
        color: '#9CA3AF',
        count: unassigned[0]?.count || 0,
      });
      
      return distribution;
    }),

    signupTrend: adminProcedure.input(z.object({
      period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
      days: z.number().default(30),
    }).optional()).query(async ({ input }) => {
      const d = await getDatabase();
      const period = input?.period || 'daily';
      const days = input?.days || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      let groupFormat: string;
      if (period === 'daily') groupFormat = '%Y-%m-%d';
      else if (period === 'weekly') groupFormat = '%Y-%u';
      else groupFormat = '%Y-%m';
      
      const dateExpr = sql.raw(`DATE_FORMAT(\`registered_users\`.\`createdAt\`, '${groupFormat}')`);
      const trend = await d.select({
        date: sql<string>`${dateExpr}`,
        count: count(),
      }).from(registeredUsers)
        .where(gte(registeredUsers.createdAt, startDate))
        .groupBy(dateExpr)
        .orderBy(dateExpr);
      
      return trend;
    }),

    referralStats: adminProcedure.query(async () => {
      const d = await getDatabase();
      const totalReferrals = await d.select({ count: count() }).from(referralRewards);
      
      const signupRewards = await d.select({ count: count() }).from(referralRewards)
        .where(eq(referralRewards.rewardType, 'signup'));
      const purchaseRewards = await d.select({ count: count() }).from(referralRewards)
        .where(eq(referralRewards.rewardType, 'first_purchase'));
      
      const totalRewardAmount = await d.select({
        total: sql<string>`COALESCE(SUM(${referralRewards.referrerReward}), 0)`
      }).from(referralRewards);
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const referralDateExpr = sql.raw(`DATE_FORMAT(\`referral_rewards\`.\`createdAt\`, '%Y-%m-%d')`);
      const recentTrend = await d.select({
        date: sql<string>`${referralDateExpr}`,
        count: count(),
      }).from(referralRewards)
        .where(gte(referralRewards.createdAt, thirtyDaysAgo))
        .groupBy(referralDateExpr)
        .orderBy(referralDateExpr);
      
      const membersWithReferral = await d.select({ count: count() }).from(registeredUsers)
        .where(sql`${registeredUsers.referredBy} IS NOT NULL`);
      
      return {
        totalReferrals: totalReferrals[0]?.count || 0,
        signupRewards: signupRewards[0]?.count || 0,
        purchaseRewards: purchaseRewards[0]?.count || 0,
        totalRewardAmount: Number(totalRewardAmount[0]?.total || 0),
        recentTrend,
        membersWithReferral: membersWithReferral[0]?.count || 0,
      };
    }),

    loginStats: adminProcedure.query(async () => {
      const d = await getDatabase();
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const loginLast7Days = await d.select({ count: count() }).from(loginHistory)
        .where(gte(loginHistory.loginAt, sevenDaysAgo));
      const loginLast30Days = await d.select({ count: count() }).from(loginHistory)
        .where(gte(loginHistory.loginAt, thirtyDaysAgo));
      
      const loginDateExpr = sql.raw(`DATE_FORMAT(\`login_history\`.\`loginAt\`, '%Y-%m-%d')`);
      const dailyLogins = await d.select({
        date: sql<string>`${loginDateExpr}`,
        count: count(),
      }).from(loginHistory)
        .where(gte(loginHistory.loginAt, thirtyDaysAgo))
        .groupBy(loginDateExpr)
        .orderBy(loginDateExpr);
      
      return {
        loginLast7Days: loginLast7Days[0]?.count || 0,
        loginLast30Days: loginLast30Days[0]?.count || 0,
        dailyLogins,
      };
    }),
    dormantList: adminProcedure.input(z.object({
      months: z.number().default(6),
      page: z.number().default(1),
      limit: z.number().default(20),
    }).optional()).query(async ({ input }) => {
      const { months = 6, page = 1, limit = 20 } = input || {};
      const d = await getDatabase();
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);

      const dormantUsers = await d.select({
        id: registeredUsers.id,
        email: registeredUsers.email,
        nameKanji: registeredUsers.nameKanji,
        lastSignedIn: registeredUsers.lastSignedIn,
        totalPurchaseAmount: registeredUsers.totalPurchaseAmount,
        createdAt: registeredUsers.createdAt,
      }).from(registeredUsers)
        .where(and(
          lte(registeredUsers.lastSignedIn, cutoffDate),
          sql`${registeredUsers.lastSignedIn} IS NOT NULL`
        ))
        .orderBy(asc(registeredUsers.lastSignedIn))
        .limit(limit)
        .offset((page - 1) * limit);

      const totalResult = await d.select({ count: count() }).from(registeredUsers)
        .where(and(
          lte(registeredUsers.lastSignedIn, cutoffDate),
          sql`${registeredUsers.lastSignedIn} IS NOT NULL`
        ));

      return {
        users: dormantUsers,
        total: totalResult[0]?.count || 0,
        page,
        limit,
      };
    }),
  }),
});
