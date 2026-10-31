import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { getDb } from "../db";
import { loginHistory, registeredUsers, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // 로그인 이력 기록
      try {
        const database = await getDb();
        if (database) {
          const userAgent = req.headers["user-agent"] || "";
          const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "";
          const device = /Mobile|Android|iPhone/i.test(userAgent) ? "Mobile" : "Desktop";
          const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)[/\s]([\d.]+)/);
          const browser = browserMatch ? browserMatch[1] : "Unknown";

          // users 테이블에서 openId로 user 조회 후, email로 registeredUsers 매칭
          const [authUser] = await database.select({ id: users.id, email: users.email })
            .from(users)
            .where(eq(users.openId, userInfo.openId))
            .limit(1);

          if (authUser?.email) {
            const [regUser] = await database.select({ id: registeredUsers.id })
              .from(registeredUsers)
              .where(eq(registeredUsers.email, authUser.email))
              .limit(1);

            if (regUser) {
              await database.insert(loginHistory).values({
                userId: regUser.id,
                ipAddress,
                userAgent,
                device,
                browser,
                country: null,
              });
            }
          }
        }
      } catch (loginHistoryErr) {
        console.error("[OAuth] Login history recording failed", loginHistoryErr);
      }

      return res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      return res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
