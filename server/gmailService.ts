/**
 * Gmail API Service
 * Handles OAuth2 authentication and Gmail operations for support@cocokusuri.com
 */
import { google, gmail_v1 } from "googleapis";
import { getSiteSetting, upsertSiteSetting } from "./db";

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID ?? "";
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET ?? "";

// Redirect URI - must match Google Cloud Console settings
const REDIRECT_URI_PROD = "https://cocokusuri.com/api/gmail/callback";
const REDIRECT_URI_DEV = "https://3000-im8g0flej66f750koqh0b-01c41023.sg1.manus.computer/api/gmail/callback";

export function getRedirectUri(origin?: string): string {
  if (origin && origin.includes("cocokusuri.com")) return REDIRECT_URI_PROD;
  if (origin && origin.includes("manus.computer")) {
    return `${origin}/api/gmail/callback`;
  }
  return process.env.NODE_ENV === "production" ? REDIRECT_URI_PROD : REDIRECT_URI_DEV;
}

export function createOAuth2Client(redirectUri?: string) {
  return new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    redirectUri ?? REDIRECT_URI_PROD
  );
}

export function getAuthUrl(redirectUri: string): string {
  const oauth2Client = createOAuth2Client(redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
    ],
  });
}

export async function saveTokens(tokens: any): Promise<void> {
  await upsertSiteSetting(
    "GMAIL_OAUTH_TOKENS",
    JSON.stringify(tokens),
    "Gmail OAuth2 access/refresh tokens for support@cocokusuri.com"
  );
}

export async function loadTokens(): Promise<any | null> {
  const setting = await getSiteSetting("GMAIL_OAUTH_TOKENS");
  if (!setting?.value) return null;
  try {
    return JSON.parse(setting.value);
  } catch {
    return null;
  }
}

export async function getAuthenticatedClient(redirectUri?: string) {
  const tokens = await loadTokens();
  if (!tokens) return null;
  const oauth2Client = createOAuth2Client(redirectUri);
  oauth2Client.setCredentials(tokens);
  // Auto-refresh token and save
  oauth2Client.on("tokens", async (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    await saveTokens(merged);
  });
  return oauth2Client;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  isRead: boolean;
  hasAttachment: boolean;
  labelIds: string[];
}

export interface GmailThread {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  snippet: string;
  date: string;
  messageCount: number;
  isRead: boolean;
  labelIds: string[];
}

function decodeBase64(encoded: string): string {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractEmailAddress(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/);
  return match ? match[1] : headerValue.trim();
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";

  // Direct body
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // Multipart: prefer text/html, fallback to text/plain
  if (payload.parts) {
    let textPlain = "";
    let textHtml = "";
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        textHtml = decodeBase64(part.body.data);
      } else if (part.mimeType === "text/plain" && part.body?.data) {
        textPlain = decodeBase64(part.body.data);
      } else if (part.mimeType?.startsWith("multipart/")) {
        const nested = extractBody(part);
        if (nested) textHtml = nested;
      }
    }
    return textHtml || textPlain;
  }

  return "";
}

function parseMessage(msg: gmail_v1.Schema$Message): GmailMessage {
  const headers = msg.payload?.headers ?? [];
  const subject = getHeader(headers, "subject") || "(제목 없음)";
  const from = getHeader(headers, "from");
  const fromEmail = extractEmailAddress(from);
  const to = getHeader(headers, "to");
  const date = getHeader(headers, "date");
  const body = extractBody(msg.payload);
  const isRead = !(msg.labelIds ?? []).includes("UNREAD");
  const hasAttachment = (msg.payload?.parts ?? []).some(
    (p) => p.filename && p.filename.length > 0
  );

  return {
    id: msg.id ?? "",
    threadId: msg.threadId ?? "",
    subject,
    from,
    fromEmail,
    to,
    date,
    snippet: msg.snippet ?? "",
    body,
    isRead,
    hasAttachment,
    labelIds: msg.labelIds ?? [],
  };
}

export async function listMessages(
  maxResults = 30,
  labelIds = ["INBOX"],
  pageToken?: string,
  query?: string
): Promise<{ messages: GmailMessage[]; nextPageToken?: string; totalCount?: number }> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Gmail not authenticated");

  const gmail = google.gmail({ version: "v1", auth });

  const listRes = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    labelIds,
    pageToken,
    q: query,
  });

  const messageIds = listRes.data.messages ?? [];
  const nextPageToken = listRes.data.nextPageToken ?? undefined;
  const totalCount = listRes.data.resultSizeEstimate ?? undefined;

  if (messageIds.length === 0) {
    return { messages: [], nextPageToken, totalCount };
  }

  // Fetch messages in parallel (batch of 10)
  const messages = await Promise.all(
    messageIds.map(async (m) => {
      const res = await gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "full",
      });
      return parseMessage(res.data);
    })
  );

  return { messages, nextPageToken, totalCount };
}

export async function getMessage(messageId: string): Promise<GmailMessage> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Gmail not authenticated");

  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  return parseMessage(res.data);
}

export async function markAsRead(messageId: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Gmail not authenticated");

  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

export async function markAsUnread(messageId: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Gmail not authenticated");

  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { addLabelIds: ["UNREAD"] },
  });
}

export async function trashMessage(messageId: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Gmail not authenticated");

  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.messages.trash({ userId: "me", id: messageId });
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
}): Promise<{ id: string; threadId: string }> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Gmail not authenticated");

  const gmail = google.gmail({ version: "v1", auth });

  const headers = [
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
  ];

  if (params.inReplyTo) headers.push(`In-Reply-To: ${params.inReplyTo}`);
  if (params.references) headers.push(`References: ${params.references}`);

  const rawEmail = [...headers, "", params.body].join("\r\n");
  const encodedEmail = Buffer.from(rawEmail)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedEmail,
      ...(params.threadId ? { threadId: params.threadId } : {}),
    },
  });

  return { id: res.data.id ?? "", threadId: res.data.threadId ?? "" };
}

export async function getUnreadCount(): Promise<number> {
  const auth = await getAuthenticatedClient();
  if (!auth) return 0;

  try {
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.labels.get({ userId: "me", id: "INBOX" });
    return res.data.messagesUnread ?? 0;
  } catch {
    return 0;
  }
}
