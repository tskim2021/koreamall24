/**
 * Brevo (구 Sendinblue) API 연동 서비스
 * 대량 메일 발송, 연락처 관리, 케인 통계 조회를 담당합니다.
 */
import { getSiteSetting } from "./db";

const BREVO_API_BASE = "https://api.brevo.com/v3";

/**
 * API 키 조회: DB 우선, 환경변수 폴백
 * 관리자 페이지에서 저장한 키가 있으면 우선 사용
 */
export async function getBrevoApiKey(): Promise<string> {
  const dbSetting = await getSiteSetting("BREVO_API_KEY").catch(() => undefined);
  if (dbSetting?.value) return dbSetting.value;
  const envKey = process.env.BREVO_API_KEY;
  if (envKey) return envKey;
  throw new Error("Brevo API 키가 설정되지 않았습니다. 관리자 페이지에서 API 키를 입력해 주세요.");
}

async function brevoRequest<T = any>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: object
): Promise<T> {
  const apiKey = await getBrevoApiKey();
  const res = await fetch(`${BREVO_API_BASE}${path}`, {
    method,
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMsg = `Brevo API 오류 (${res.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMsg = errorJson.message || errorMsg;
    } catch { /* ignore */ }
    throw new Error(errorMsg);
  }

  // 204 No Content
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

// ── 계정 정보 ─────────────────────────────────────────────────────────────────

export interface BrevoAccountInfo {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  plan: { type: string; creditsType: string; credits: number }[];
}

export async function getBrevoAccountInfo(): Promise<BrevoAccountInfo> {
  return brevoRequest<BrevoAccountInfo>("GET", "/account");
}

// ── 연락처 목록 조회 ──────────────────────────────────────────────────────────

export interface BrevoContact {
  id: number;
  email: string;
  emailBlacklisted: boolean;
  smsBlacklisted: boolean;
  createdAt: string;
  modifiedAt: string;
  attributes: Record<string, any>;
}

export interface BrevoContactsResponse {
  contacts: BrevoContact[];
  count: number;
}

export async function getBrevoContacts(limit = 50, offset = 0): Promise<BrevoContactsResponse> {
  return brevoRequest<BrevoContactsResponse>("GET", `/contacts?limit=${limit}&offset=${offset}`);
}

// ── 연락처 목록(리스트) 조회 ──────────────────────────────────────────────────

export interface BrevoList {
  id: number;
  name: string;
  totalBlacklisted: number;
  totalSubscribers: number;
  folderId: number;
  createdAt: string;
  campaignStats: any[];
  dynamicList: boolean;
  uniqueSubscribers: number;
}

export interface BrevoListsResponse {
  lists: BrevoList[];
  count: number;
}

export async function getBrevoLists(): Promise<BrevoListsResponse> {
  return brevoRequest<BrevoListsResponse>("GET", "/contacts/lists?limit=50&offset=0");
}

// ── 연락처 일괄 추가 (importContacts) ────────────────────────────────────────

export interface BrevoImportContact {
  email: string;
  attributes?: {
    FIRSTNAME?: string;
    LASTNAME?: string;
    [key: string]: any;
  };
}

export async function importContactsToBrevo(
  contacts: BrevoImportContact[],
  listIds?: number[]
): Promise<{ createdCount: number; updatedCount: number; processId: number }> {
  const payload: any = {
    jsonBody: contacts,
    emailBlacklist: false,
    smsBlacklist: false,
    updateExistingContacts: true,
    emptyContactsAttributes: false,
  };
  if (listIds && listIds.length > 0) {
    payload.listIds = listIds;
  }
  return brevoRequest("POST", "/contacts/import", payload);
}

// ── 캠페인 생성 ───────────────────────────────────────────────────────────────

export interface BrevoCreateCampaignParams {
  name: string;
  subject: string;
  previewText?: string;
  sender: { name: string; email: string };
  type: "classic" | "trigger";
  htmlContent?: string;
  textContent?: string;
  templateId?: number;
  recipients: {
    listIds?: number[];
    exclusionListIds?: number[];
  };
  scheduledAt?: string; // ISO 8601 UTC
  replyTo?: string;
  toField?: string;
  header?: string;
  footer?: string;
  inlineImageActivation?: boolean;
  mirrorActive?: boolean;
  recurring?: boolean;
  utmCampaign?: string;
}

export interface BrevoCreateCampaignResponse {
  id: number;
}

export async function createBrevoCampaign(
  params: BrevoCreateCampaignParams
): Promise<BrevoCreateCampaignResponse> {
  return brevoRequest<BrevoCreateCampaignResponse>("POST", "/emailCampaigns", params);
}

// ── 캠페인 즉시 발송 ──────────────────────────────────────────────────────────

export async function sendBrevoCampaignNow(campaignId: number): Promise<void> {
  await brevoRequest("POST", `/emailCampaigns/${campaignId}/sendNow`);
}

// ── 캠페인 발송 테스트 ────────────────────────────────────────────────────────

export async function sendBrevoCampaignTest(
  campaignId: number,
  emails: string[]
): Promise<void> {
  await brevoRequest("POST", `/emailCampaigns/${campaignId}/sendTest`, { emailTo: emails });
}

// ── 캠페인 목록 조회 ──────────────────────────────────────────────────────────

export interface BrevoCampaign {
  id: number;
  name: string;
  subject: string;
  type: string;
  status: string;
  scheduledAt?: string;
  sentDate?: string;
  statistics?: {
    globalStats?: {
      uniqueClicks: number;
      clickers: number;
      complaints: number;
      delivered: number;
      sent: number;
      softBounces: number;
      hardBounces: number;
      uniqueViews: number;
      unsubscriptions: number;
      viewed: number;
    };
  };
}

export interface BrevoCampaignsResponse {
  campaigns: BrevoCampaign[];
  count: number;
}

export async function getBrevoCampaigns(
  status?: "draft" | "queued" | "suspended" | "sent" | "archive",
  limit = 20,
  offset = 0
): Promise<BrevoCampaignsResponse> {
  const statusParam = status ? `&status=${status}` : "";
  return brevoRequest<BrevoCampaignsResponse>(
    "GET",
    `/emailCampaigns?limit=${limit}&offset=${offset}${statusParam}`
  );
}

// ── 캠페인 통계 조회 ──────────────────────────────────────────────────────────

export async function getBrevoCampaignStats(campaignId: number): Promise<BrevoCampaign> {
  return brevoRequest<BrevoCampaign>("GET", `/emailCampaigns/${campaignId}`);
}

// ── 캠페인 삭제 ───────────────────────────────────────────────────────────────

export async function deleteBrevoCampaign(campaignId: number): Promise<void> {
  await brevoRequest("DELETE", `/emailCampaigns/${campaignId}`);
}

// ── 트랜잭셔널 메일 발송 (개별 발송) ─────────────────────────────────────────

export interface BrevoSendEmailParams {
  to: { email: string; name?: string }[];
  sender: { email: string; name: string };
  subject: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: number;
  params?: Record<string, any>;
  replyTo?: { email: string; name?: string };
  headers?: Record<string, string>;
}

export interface BrevoSendEmailResponse {
  messageId: string;
}

export async function sendBrevoTransactionalEmail(
  params: BrevoSendEmailParams
): Promise<BrevoSendEmailResponse> {
  return brevoRequest<BrevoSendEmailResponse>("POST", "/smtp/email", params);
}

// ── API 키 유효성 검사 ────────────────────────────────────────────────────────

export async function validateBrevoApiKey(): Promise<{
  valid: boolean;
  email?: string;
  plan?: string;
  error?: string;
}> {
  try {
    const account = await getBrevoAccountInfo();
    const planType = account.plan?.[0]?.type || "unknown";
    return { valid: true, email: account.email, plan: planType };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
