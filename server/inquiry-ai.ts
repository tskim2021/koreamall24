/**
 * inquiry-ai.ts
 * 문의 AI 자동 답변 서비스
 * - siteSettings에서 AI 설정 로드 (ON/OFF, confidence 임계값, 시스템 프롬프트)
 * - FAQ/상품 정보 기반으로 자동 답변 가능 여부 판단
 * - isAiGenerated, needsReview 컬럼 활용
 */

import { invokeLLM } from "./_core/llm";

const DEFAULT_CANNOT_ANSWER_MESSAGE = `お問い合わせいただきありがとうございます。

ご質問の内容を確認いたしました。担当者が詳しく確認の上、改めてご回答いたします。
通常、1〜3営業日以内にご返答いたしますので、今しばらくお待ちください。

引き続きCoco Kusuriをよろしくお願いいたします。
Coco Kusuri カスタマーサポート`;

const DEFAULT_SYSTEM_PROMPT = `あなたはCoco Kusuri（cocokusuri.com）のカスタマーサポートAIアシスタントです。
日本の医薬品・健康食品・化粧品の個人輸入代行ショッピングモールです。

【サービス概要】
- 日本の医薬品、健康食品、化粧品の個人輸入代行
- 正規品保証、全品送料無料（条件あり）
- 韓国語・日本語対応
- ドメイン: cocokusuri.com

【回答ルール】
1. 上記のFAQや商品情報で回答できる場合は canAnswer: true とし、丁寧な日本語で回答してください。
2. 個人的な注文状況、具体的な配送追跡、処方箋が必要な医薬品の詳細、法的・医療的アドバイス、価格交渉など、情報がなくて正確に回答できない場合は canAnswer: false としてください。
3. 回答は必ず日本語で、丁寧かつ簡潔に。
4. 回答の末尾には必ず「Coco Kusuri カスタマーサポート」の署名を入れてください。
5. confidence は 0〜1 の数値で、回答の確信度を示してください（0.7以上なら自動回答推奨）。`;

export interface AISettings {
  enabled: boolean;
  confidenceThreshold: number; // 0.0 ~ 1.0
  systemPrompt: string;
  cannotAnswerMessage: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: true,
  confidenceThreshold: 0.7,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  cannotAnswerMessage: DEFAULT_CANNOT_ANSWER_MESSAGE,
};

/**
 * siteSettings에서 AI 설정 로드
 */
export async function getAISettings(): Promise<AISettings> {
  try {
    const { getSiteSetting } = await import("./db");
    const [enabled, threshold, prompt, cannotMsg] = await Promise.all([
      getSiteSetting("AI_INQUIRY_ENABLED"),
      getSiteSetting("AI_INQUIRY_CONFIDENCE_THRESHOLD"),
      getSiteSetting("AI_INQUIRY_SYSTEM_PROMPT"),
      getSiteSetting("AI_INQUIRY_CANNOT_ANSWER_MESSAGE"),
    ]);

    return {
      enabled: enabled?.value !== "false",
      confidenceThreshold: threshold?.value ? parseFloat(threshold.value) : 0.7,
      systemPrompt: prompt?.value || DEFAULT_SYSTEM_PROMPT,
      cannotAnswerMessage: cannotMsg?.value || DEFAULT_CANNOT_ANSWER_MESSAGE,
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

interface AIReplyResult {
  canAnswer: boolean;
  reply: string;
  confidence: number;
}

/**
 * 문의에 대해 AI 자동 답변 생성
 */
export async function generateAIInquiryReply(
  inquiryTitle: string,
  inquiryContent: string,
  settings?: AISettings
): Promise<AIReplyResult> {
  const cfg = settings || (await getAISettings());

  try {
    const { getAllChatbotFaqs, getAllProducts } = await import("./db");

    const [faqs, products] = await Promise.all([
      getAllChatbotFaqs(true).catch(() => [] as any[]),
      getAllProducts().catch(() => [] as any[]),
    ]);

    const faqContext = (faqs as any[])
      .slice(0, 30)
      .map((f: any) => {
        const q = f.questionJa || f.question || "";
        const a = f.answerJa || f.answer || "";
        return `Q: ${q}\nA: ${a}`;
      })
      .join("\n\n");

    const productContext = (products as any[])
      .slice(0, 50)
      .map((p: any) => {
        const name = p.nameJa || p.name || "";
        const price = p.price ? `¥${p.price}` : "";
        const desc = p.descriptionJa || p.description || "";
        const shortDesc = desc.length > 100 ? desc.slice(0, 100) + "..." : desc;
        return `商品名: ${name} ${price ? `(${price})` : ""}\n説明: ${shortDesc}`;
      })
      .join("\n\n");

    const systemPrompt = `${cfg.systemPrompt}

【FAQ情報】
${faqContext || "（FAQデータなし）"}

【取扱商品情報（一部）】
${productContext || "（商品データなし）"}`;

    const userPrompt = `以下のお問い合わせに回答してください。

【件名】${inquiryTitle}
【内容】${inquiryContent}

JSON形式で回答してください:
{
  "canAnswer": true/false,
  "reply": "回答文（canAnswer=falseの場合は空文字列）",
  "confidence": 0.0〜1.0
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "inquiry_ai_reply",
          strict: true,
          schema: {
            type: "object",
            properties: {
              canAnswer: { type: "boolean" },
              reply: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["canAnswer", "reply", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : null;
    if (!content) {
      return { canAnswer: false, reply: cfg.cannotAnswerMessage, confidence: 0 };
    }

    const parsed = JSON.parse(content) as AIReplyResult;

    if (parsed.canAnswer && parsed.confidence < cfg.confidenceThreshold) {
      console.log(`[InquiryAI] Low confidence (${parsed.confidence} < ${cfg.confidenceThreshold}), switching to cannot-answer`);
      return { canAnswer: false, reply: cfg.cannotAnswerMessage, confidence: parsed.confidence };
    }

    if (!parsed.canAnswer) {
      return { canAnswer: false, reply: cfg.cannotAnswerMessage, confidence: parsed.confidence };
    }

    return parsed;
  } catch (error) {
    console.error("[InquiryAI] Error generating AI reply:", error);
    return { canAnswer: false, reply: cfg.cannotAnswerMessage, confidence: 0 };
  }
}

/**
 * 문의 생성 후 AI 자동 답변 처리 (비동기)
 */
export async function processInquiryWithAI(
  inquiryId: number,
  inquiryTitle: string,
  inquiryContent: string,
  inquiryUserId: number,
  adminUserId: number
): Promise<void> {
  try {
    // 설정 로드
    const settings = await getAISettings();

    if (!settings.enabled) {
      console.log(`[InquiryAI] AI auto-reply is disabled. Skipping inquiry #${inquiryId}`);
      return;
    }

    console.log(`[InquiryAI] Processing inquiry #${inquiryId} with AI...`);

    const result = await generateAIInquiryReply(inquiryTitle, inquiryContent, settings);

    // AI 답변 태그 추가 (AI 자동 생성 표시)
    const aiTag = result.canAnswer
      ? "\n\n---\n*この回答はAIが自動生成しました。内容に不明な点がある場合は、担当者が改めてご確認いたします。*"
      : "";

    const finalReply = result.canAnswer
      ? result.reply + aiTag
      : result.reply;

    const { createInquiryComment, updateInquiry, insertNotification } = await import("./db");

    // 코멘트 등록 (isAiGenerated=true, AI 답변이면 needsReview=true로 관리자 검토 필요)
    await createInquiryComment({
      inquiryId,
      userId: adminUserId,
      content: finalReply,
      isActive: true,
      isAiGenerated: true,
      needsReview: result.canAnswer, // AI가 자동 답변한 경우 관리자 검토 필요
    });

    // 상태를 answered로 변경
    await updateInquiry(inquiryId, { status: "answered" });

    // 인앱 알림 발송
    try {
      const notifTitle = result.canAnswer
        ? "お問い合わせに回答が届きました"
        : "お問い合わせを受け付けました";
      const notifMessage = result.canAnswer
        ? `「${inquiryTitle}」への回答が届きました。`
        : `「${inquiryTitle}」を受け付けました。担当者が確認後、改めてご回答いたします。`;

      await insertNotification({
        userId: inquiryUserId,
        type: "inquiry",
        title: notifTitle,
        message: notifMessage,
        link: `/mypage/inquiries`,
        templateName: result.canAnswer ? "inquiry_replied" : "inquiry_received",
        templateVars: { title: inquiryTitle },
      });
    } catch (notifErr) {
      console.error("[InquiryAI] Notification failed:", notifErr);
    }

    console.log(
      `[InquiryAI] Inquiry #${inquiryId} processed. canAnswer=${result.canAnswer}, confidence=${result.confidence}`
    );
  } catch (error) {
    console.error(`[InquiryAI] Failed to process inquiry #${inquiryId}:`, error);
  }
}
