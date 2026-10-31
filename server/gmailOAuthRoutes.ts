/**
 * Gmail OAuth2 Express Routes
 * Handles the OAuth2 callback to exchange code for tokens
 */
import type { Express } from "express";
import { createOAuth2Client, saveTokens, getRedirectUri } from "./gmailService";

export function registerGmailOAuthRoutes(app: Express) {
  // OAuth2 callback - exchanges authorization code for tokens
  app.get("/api/gmail/callback", async (req, res) => {
    const code = req.query.code as string;
    const error = req.query.error as string;

    if (error) {
      console.error("[Gmail OAuth] Error:", error);
      return res.redirect(`/admin/gmail-inbox?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect("/admin/gmail-inbox?error=no_code");
    }

    try {
      const origin = `${req.protocol}://${req.get("host")}`;
      const redirectUri = getRedirectUri(origin);
      const oauth2Client = createOAuth2Client(redirectUri);
      const { tokens } = await oauth2Client.getToken(code);
      await saveTokens(tokens);
      console.log("[Gmail OAuth] Tokens saved successfully");
      return res.redirect("/admin/gmail-inbox?connected=1");
    } catch (err: any) {
      console.error("[Gmail OAuth] Token exchange error:", err.message);
      return res.redirect(
        `/admin/gmail-inbox?error=${encodeURIComponent(err.message)}`
      );
    }
  });
}
