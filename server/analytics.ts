import { getDb } from "./db";
import { pageViews, analyticsEvents, analyticsessions, dailyStats, countryStats, searchKeywords } from "../drizzle/schema";
import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";
import type { InsertPageView, InsertAnalyticsEvent, InsertAnalyticsSession } from "../drizzle/schema";

// ─── Page Views ──────────────────────────────────────────────────────────────
export async function trackPageView(data: InsertPageView) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(pageViews).values(data);
}

export async function getPageViewsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(pageViews)
    .where(and(gte(pageViews.timestamp, startDate), lte(pageViews.timestamp, endDate)))
    .orderBy(desc(pageViews.timestamp));
}

// ─── Analytics Events ────────────────────────────────────────────────────────
export async function trackEvent(data: InsertAnalyticsEvent) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(analyticsEvents).values(data);
}

export async function getSearchKeywordEvents(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.eventType, "search"),
        gte(analyticsEvents.timestamp, startDate),
        lte(analyticsEvents.timestamp, endDate)
      )
    )
    .orderBy(desc(analyticsEvents.timestamp));
}

// ─── Sessions ────────────────────────────────────────────────────────────────
export async function createSession(data: InsertAnalyticsSession) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(analyticsessions).values(data);
}

export async function updateSession(sessionId: string, data: Partial<InsertAnalyticsSession>) {
  const db = await getDb();
  if (!db) return null;
  return db.update(analyticsessions).set(data).where(eq(analyticsessions.sessionId, sessionId));
}

export async function getSessionById(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(analyticsessions).where(eq(analyticsessions.sessionId, sessionId)).limit(1);
}

// ─── Daily Stats (집계) ───────────────────────────────────────────────────────
export async function getDailyStats(date: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyStats).where(eq(dailyStats.date, date)).limit(1);
}

export async function getDailyStatsRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(dailyStats)
    .where(and(gte(dailyStats.date, startDate), lte(dailyStats.date, endDate)))
    .orderBy(desc(dailyStats.date));
}

// ─── Country Stats (국가별 통계) ──────────────────────────────────────────────
export async function getCountryStats(date: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(countryStats).where(eq(countryStats.date, date)).orderBy(desc(countryStats.sessions));
}

// ─── Search Keywords (검색 키워드) ────────────────────────────────────────────
export async function trackSearchKeyword(keyword: string, date: string) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db
    .select()
    .from(searchKeywords)
    .where(and(eq(searchKeywords.keyword, keyword), eq(searchKeywords.date, date)))
    .limit(1);

  if (existing.length > 0) {
    return db
      .update(searchKeywords)
      .set({ count: sql`count + 1` })
      .where(and(eq(searchKeywords.keyword, keyword), eq(searchKeywords.date, date)));
  } else {
    return db.insert(searchKeywords).values({ keyword, date, count: 1 });
  }
}

export async function getSearchKeywordStats(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(searchKeywords)
    .where(and(gte(searchKeywords.date, startDate), lte(searchKeywords.date, endDate)))
    .orderBy(desc(searchKeywords.count));
}

// ─── Analytics Summary ───────────────────────────────────────────────────────
export async function getAnalyticsSummary(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) {
    return {
      totalSessions: 0,
      totalPageViews: 0,
      totalEvents: 0,
      uniqueVisitors: 0,
      topCountries: [],
      topPages: [],
      topSearchKeywords: [],
    };
  }

  const dateStr = startDate.toISOString().split("T")[0];

  const totalSessions = await db
    .select({ count: count() })
    .from(analyticsessions)
    .where(and(gte(analyticsessions.startedAt, startDate), lte(analyticsessions.startedAt, endDate)));

  const totalPageViews = await db
    .select({ count: count() })
    .from(pageViews)
    .where(and(gte(pageViews.timestamp, startDate), lte(pageViews.timestamp, endDate)));

  const totalEvents = await db
    .select({ count: count() })
    .from(analyticsEvents)
    .where(and(gte(analyticsEvents.timestamp, startDate), lte(analyticsEvents.timestamp, endDate)));

  const uniqueVisitors = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${analyticsessions.sessionId})` })
    .from(analyticsessions)
    .where(and(gte(analyticsessions.startedAt, startDate), lte(analyticsessions.startedAt, endDate)));

  const topCountries = await db
    .select({
      country: pageViews.country,
      countryName: pageViews.countryName,
      count: count(),
    })
    .from(pageViews)
    .where(and(gte(pageViews.timestamp, startDate), lte(pageViews.timestamp, endDate)))
    .groupBy(pageViews.country, pageViews.countryName)
    .orderBy(desc(count()))
    .limit(10);

  const topPages = await db
    .select({
      page: pageViews.page,
      count: count(),
    })
    .from(pageViews)
    .where(and(gte(pageViews.timestamp, startDate), lte(pageViews.timestamp, endDate)))
    .groupBy(pageViews.page)
    .orderBy(desc(count()))
    .limit(10);

  const topSearchKeywords = await db
    .select()
    .from(searchKeywords)
    .where(and(gte(searchKeywords.date, dateStr), lte(searchKeywords.date, dateStr)))
    .orderBy(desc(searchKeywords.count))
    .limit(10);

  return {
    totalSessions: Number(totalSessions[0]?.count) || 0,
    totalPageViews: Number(totalPageViews[0]?.count) || 0,
    totalEvents: Number(totalEvents[0]?.count) || 0,
    uniqueVisitors: Number(uniqueVisitors[0]?.count) || 0,
    topCountries,
    topPages,
    topSearchKeywords,
  };
}
