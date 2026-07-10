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

  const { idea = "", currentStep = 1, question = "", options, answers = {} } = req.body ?? {};

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