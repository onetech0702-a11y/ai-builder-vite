/* OneTech AI Builder - AI 인터뷰 추천 API (Vercel Serverless Function)
 * POST /api/interview/recommend
 * Claude(Anthropic) API 사용. API Key는 서버 환경변수(ANTHROPIC_API_KEY)에서만 사용한다. 프론트 노출 금지.
 */

declare const process: { env: Record<string, string | undefined> };

interface RecommendAnswers {
  targetUser?: string;
  coreFeatures?: string;
  platform?: string;
  auth?: string;
  payment?: string;
  additional?: string;
}

interface RecommendRequestBody {
  idea?: string;
  currentStep?: number;
  question?: string;
  options?: string[];
  answers?: RecommendAnswers;
  mode?: "brand-names" | "idea-suggestions" | "idea-discovery" | "question-options";
  discovery?: Record<string, string>;
  field?: string;
}

interface ApiRequest {
  method?: string;
  body?: RecommendRequestBody;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
}

interface Recommendation {
  answer: string;
  reason: string;
  applyValue: string;
  extraQuestions: string[];
}

const BLOCKED_KEYWORDS = [
  "도박", "피싱", "해킹", "개인정보 탈취", "금융 사기", "보이스피싱",
  "마약", "약물 거래", "성인물", "음란물", "위조", "신분증 위조",
  "불법 다운로드", "불법 스트리밍", "무기 거래", "총기", "폭탄", "혐오",
];

// 예방/교육 목적 키워드가 함께 있으면 AI 판단에 맡긴다
const SAFE_CONTEXT_KEYWORDS = ["방지", "예방", "교육", "탐지", "보안", "신고", "차단"];

function isBlockedIdea(idea: string): boolean {
  const hasBlocked = BLOCKED_KEYWORDS.some((k) => idea.includes(k));
  if (!hasBlocked) return false;
  const hasSafeContext = SAFE_CONTEXT_KEYWORDS.some((k) => idea.includes(k));
  return !hasSafeContext;
}

const REFUSAL_RECOMMENDATION: Recommendation = {
  answer: "이 요청은 불법 또는 피해를 유발할 수 있어 제작을 도와드릴 수 없습니다.",
  reason: "AI Builder는 합법적이고 안전한 서비스만 제작할 수 있습니다.",
  applyValue: "",
  extraQuestions: ["합법적인 방향으로 바꿔볼까요?", "예방/탐지/교육용 서비스로 전환할까요?"],
};

// 깨진 문자(�), 제어 문자 제거
function cleanText(value: string): string {
  return value
    .replace(/\uFFFD/g, "")
    // eslint-disable-next-line no-control-regex -- 제어 문자 제거가 목적인 정제 로직
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const SYSTEM_PROMPT = `당신은 OneTech AI Builder의 전문 IT 서비스 기획자입니다.

사용자가 만들고 싶은 웹/앱 아이디어를 분석하고, 현재 인터뷰 질문에 맞는 가장 적절한 추천 답변을 작성하세요.

답변은 초보자도 이해할 수 있게 작성하세요.

반드시 JSON으로만 응답하세요. JSON 앞뒤에 다른 텍스트나 마크다운 코드블록을 절대 붙이지 마세요.

JSON 형식:
{
  "answer": "추천 답변",
  "reason": "추천 이유",
  "applyValue": "입력창에 자동 적용할 값",
  "extraQuestions": ["추가 질문1", "추가 질문2"]
}

조건:
- 사용자의 idea를 반드시 반영하세요. 아이디어 내용이 답변에 구체적으로 드러나야 합니다.
- 현재 질문에만 집중해서 답하세요.
- 너무 일반적이거나 추상적인 답변은 금지합니다.
- 실제 앱 기능/사용자/플랫폼/로그인/결제 결정에 도움이 되게 구체적으로 답하세요.
- 선택지(options)가 주어진 질문이면 applyValue는 반드시 선택지 중 하나와 정확히 일치해야 합니다.
- 선택지가 없는 질문이면 applyValue는 입력창에 바로 넣을 수 있는 구체적인 문장으로 작성하세요.
- extraQuestions는 사용자가 추가로 생각해보면 좋은 질문 1~2개를 제안하세요.
- 모든 텍스트는 완전하고 올바른 한국어로 작성하세요. 깨진 문자, 이상한 기호, 오타가 절대 없어야 합니다. 기술명은 정확한 공식 표기(React, React Native, PostgreSQL 등)를 사용하세요.
- 불법 도박, 피싱, 해킹, 개인정보 탈취, 금융 사기, 마약, 불법 성인물, 위조, 저작권 침해, 폭력/혐오 조장, 불법 무기 거래 등 불법이거나 피해를 유발하는 서비스 제작은 거부하세요. 거부 시 answer에 "이 요청은 불법 또는 피해를 유발할 수 있어 제작을 도와드릴 수 없습니다."라고 쓰고 applyValue는 빈 문자열로 두세요.`;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const { idea = "", currentStep = 1, question = "", options, answers = {}, mode, discovery, field } = req.body ?? {};

  // 특수 모드: 질문 선택지 생성
  if (mode === "question-options") {
    const optKey = process.env.ANTHROPIC_API_KEY;
    if (!optKey) {
      res.status(500).json({ success: false, error: "ANTHROPIC_API_KEY is not configured" });
      return;
    }
    try {
      const optResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": optKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 400,
          temperature: 0.3,
          system: '당신은 서비스 기획 인터뷰의 선택지를 만드는 도우미입니다. 주어진 프로젝트 아이디어와 질문에 맞는 현실적인 선택지 3~4개를 만드세요. 선택지는 그 질문과 프로젝트에 실제로 어울려야 합니다. 각 선택지는 12자 이내로 짧고 명확하게. 마지막에 애매할 때 고를 수 있는 선택지("잘 모르겠습니다" 등)를 1개 포함하세요. 반드시 JSON으로만 응답하세요: {"options":["선택지1","선택지2","선택지3","잘 모르겠습니다"]} 완전하고 올바른 한국어만 사용하세요.',
          messages: [{ role: "user", content: JSON.stringify({ idea, field: field ?? "", question }) }],
        }),
      });
      if (!optResp.ok) {
        res.status(502).json({ success: false, error: `AI API error: ${optResp.status}` });
        return;
      }
      const od = (await optResp.json()) as { content?: { type: string; text?: string }[] };
      const oraw = (od.content ?? []).map((b) => (b.type === "text" ? b.text ?? "" : "")).join("").replace(/```json|```/g, "").trim();
      const ofb = oraw.indexOf("{");
      const olb = oraw.lastIndexOf("}");
      const oparsed = JSON.parse(oraw.slice(ofb, olb + 1)) as { options?: unknown };
      const olist = Array.isArray(oparsed.options)
        ? oparsed.options.filter((v): v is string => typeof v === "string").map(cleanText).filter((v) => v.length > 0).slice(0, 4)
        : [];
      if (olist.length < 2) {
        res.status(502).json({ success: false, error: "선택지를 생성하지 못했습니다." });
        return;
      }
      res.status(200).json({ success: true, options: olist });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
    return;
  }

  // 특수 모드: 브랜드명 추천 / 아이디어 추천
  if (mode === "brand-names" || mode === "idea-suggestions" || mode === "idea-discovery") {
    const apiKeySpecial = process.env.ANTHROPIC_API_KEY;
    if (!apiKeySpecial) {
      res.status(500).json({ success: false, error: "ANTHROPIC_API_KEY is not configured" });
      return;
    }
    const isBrand = mode === "brand-names";
    const systemSpecial = isBrand
      ? `당신은 브랜드 네이밍 전문가입니다. 주어진 서비스 아이디어에 어울리는 브랜드명 5개를 제안하세요. 짧고 기억하기 쉬운 이름(영문 또는 한글)으로 만드세요. 반드시 JSON으로만 응답하세요: {"names":["이름1","이름2","이름3","이름4","이름5"]}`
      : `당신은 IT 서비스 기획자입니다. 사용자가 인터뷰에서 답한 내용을 기반으로, 사용자가 실제로 만들고 싶어하는 것에 맞는 웹/앱 서비스 아이디어 5개를 제안하세요.

입력으로 다음 정보가 주어집니다:
- category: 관심 분야
- who: 사용할 대상
- problem: 해결하고 싶은 문제 (가장 중요! 사용자가 직접 쓴 내용)
- revenue: 수익화 희망 여부
- platform: 웹/앱 선호

가장 중요한 규칙:
- problem 필드에 사용자가 쓴 내용이 있으면, 그 내용을 반드시 최우선으로 반영하세요. 예를 들어 problem이 "자동으로 엑셀 작업하는 걸 만들고 싶어"라면, 엑셀 자동화/문서 자동화와 직접 관련된 아이디어(예: 엑셀 자동 정리 도구, 반복 업무 자동화 앱, 보고서 자동 생성기)를 제안해야 합니다.
- category나 다른 분야로 엉뚱하게 확장하지 마세요. 사용자가 쓴 problem에서 벗어나지 마세요.
- 각 아이디어는 15자 이내의 짧은 서비스명 형태로 작성하세요.
- 5개 아이디어는 서로 다른 각도여야 하지만 모두 사용자의 problem과 연결되어야 합니다.
- 불법이거나 유해한 아이디어는 금지합니다.

반드시 JSON으로만 응답하세요: {"ideas":["아이디어1","아이디어2","아이디어3","아이디어4","아이디어5"]}`;
    try {
      const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKeySpecial, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 500,
          temperature: 0.8,
          system: systemSpecial,
          messages: [{
            role: "user",
            content: JSON.stringify(
              isBrand
                ? { idea }
                : {
                    category: discovery?.category ?? "",
                    who: discovery?.who ?? "",
                    problem: discovery?.problem ?? "",
                    revenue: discovery?.revenue ?? "",
                    platform: discovery?.platform ?? "",
                  }
            ),
          }],
        }),
      });
      if (!aiResp.ok) {
        res.status(502).json({ success: false, error: `AI API error: ${aiResp.status}` });
        return;
      }
      const d = (await aiResp.json()) as { content?: { type: string; text?: string }[] };
      const raw = (d.content ?? []).map((b) => (b.type === "text" ? b.text ?? "" : "")).join("").replace(/```json|```/g, "").trim();
      const fb = raw.indexOf("{");
      const lb = raw.lastIndexOf("}");
      const parsedSpecial = JSON.parse(raw.slice(fb, lb + 1)) as { names?: unknown; ideas?: unknown };
      const items = (isBrand ? parsedSpecial.names : parsedSpecial.ideas) as unknown;
      const list = Array.isArray(items)
        ? items.filter((v): v is string => typeof v === "string").map(cleanText).filter((v) => v.length > 0).slice(0, 5)
        : [];
      if (list.length === 0) {
        res.status(502).json({ success: false, error: "AI가 추천을 생성하지 못했습니다." });
        return;
      }
      res.status(200).json(isBrand ? { success: true, names: list } : { success: true, ideas: list });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
    return;
  }

  if (!question) {
    res.status(400).json({ success: false, error: "question is required" });
    return;
  }

  // Safety Guard: AI 호출 전 아이디어 검사
  if (isBlockedIdea(idea)) {
    res.status(200).json({ success: true, recommendation: REFUSAL_RECOMMENDATION });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ success: false, error: "ANTHROPIC_API_KEY is not configured" });
    return;
  }

  const userPayload = {
    idea,
    currentStep,
    question,
    options: options ?? null,
    previousAnswers: answers,
  };

  try {
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(userPayload) }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      res.status(502).json({ success: false, error: `AI API error: ${aiResponse.status} ${errText.slice(0, 200)}` });
      return;
    }

    const data = (await aiResponse.json()) as {
      content?: { type: string; text?: string }[];
    };
    const rawText = (data.content ?? [])
      .map((block) => (block.type === "text" ? block.text ?? "" : ""))
      .join("")
      .trim();

    // 혹시 코드블록으로 감싸서 응답한 경우 제거 후 파싱
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<Recommendation>;

    const recommendation: Recommendation = {
      answer: typeof parsed.answer === "string" ? cleanText(parsed.answer) : "",
      reason: typeof parsed.reason === "string" ? cleanText(parsed.reason) : "",
      applyValue: typeof parsed.applyValue === "string" ? cleanText(parsed.applyValue) : "",
      extraQuestions: Array.isArray(parsed.extraQuestions)
        ? parsed.extraQuestions
            .filter((q): q is string => typeof q === "string")
            .map(cleanText)
            .filter((q) => q.length > 0)
            .slice(0, 3)
        : [],
    };

    if (!recommendation.answer) {
      res.status(502).json({ success: false, error: "AI response missing answer" });
      return;
    }

    res.status(200).json({ success: true, recommendation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
}