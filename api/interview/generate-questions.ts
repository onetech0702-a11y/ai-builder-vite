/* OneTech AI Builder - AI 인터뷰 질문 생성 API (Vercel Serverless Function)
 * POST /api/interview/generate-questions
 * 사용자가 입력한 아이디어(및 분석 결과)에 맞는 인터뷰 질문 6개를 AI가 실시간 생성한다.
 * Claude(Anthropic) API 사용. API Key는 서버 환경변수(ANTHROPIC_API_KEY)에서만 사용한다.
 */

declare const process: { env: Record<string, string | undefined> };

interface GenerateQuestionsBody {
  idea?: string;
  analysis?: {
    category?: string;
    features?: { name: string }[];
  };
}

interface ApiRequest {
  method?: string;
  body?: GenerateQuestionsBody;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
}

interface GeneratedQuestion {
  id: string;
  label: string;
  question: string;
  type: "text" | "choice";
  multiSelect: boolean;
  placeholder: string;
  options: string[];
  help: string;
  required: boolean;
}

function cleanText(value: string): string {
  return value
    .replace(/\uFFFD/g, "")
    // eslint-disable-next-line no-control-regex -- 제어 문자 제거가 목적인 정제 로직
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function toStringArray(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map(cleanText)
    .filter((v) => v.length > 0)
    .slice(0, max);
}

const BLOCKED_KEYWORDS = [
  "도박", "피싱", "해킹", "개인정보 탈취", "금융 사기", "보이스피싱",
  "마약", "약물 거래", "성인물", "음란물", "위조", "신분증 위조",
  "불법 다운로드", "불법 스트리밍", "무기 거래", "총기", "폭탄", "혐오",
];
const SAFE_CONTEXT_KEYWORDS = ["방지", "예방", "교육", "탐지", "보안", "신고", "차단"];

function isBlockedIdea(idea: string): boolean {
  const hasBlocked = BLOCKED_KEYWORDS.some((k) => idea.includes(k));
  if (!hasBlocked) return false;
  return !SAFE_CONTEXT_KEYWORDS.some((k) => idea.includes(k));
}

const SYSTEM_PROMPT = `당신은 OneTech AI Builder의 서비스 기획 인터뷰어입니다.

사용자가 만들고 싶다고 입력한 서비스에 대해, 그 서비스를 구체화하기 위해 꼭 필요한 인터뷰 질문 6개를 생성하세요.

가장 중요한 규칙:
- 질문은 반드시 사용자가 입력한 서비스 내용과 직접 관련되어야 합니다. 일반적인 질문이 아니라, 이 서비스에 딱 맞는 질문이어야 합니다.
- 예를 들어 "반려동물 병원 예약 앱"이라면 "어떤 동물의 예약을 받나요?", "예약 외에 진료 기록도 관리하나요?" 같은 그 서비스에 특화된 질문을 만드세요.
- "AI 영어회화 앱"이라면 "어떤 학습 방식을 원하나요?(회화/문법/시험)", "음성 대화 기능이 필요한가요?" 같은 질문을 만드세요.
- 개발 용어(API, SDK, 백엔드, 서버 등)를 쓰지 말고, 서비스를 모르는 사람도 이해할 수 있는 쉬운 말로 질문하세요.

질문 구성 가이드(순서대로):
1. 이 서비스를 주로 누가 사용할지 (대상)
2. 이 서비스에서 사용자가 무엇을 하게 될지 (핵심 사용 흐름)
3~5. 이 서비스에 특화된 세부 사항 3가지 (예: 다루는 대상/항목의 종류, 필요한 세부 기능, 사용 환경, 결제·예약·기록 등 이 서비스에 맞는 것)
6. 추가로 원하는 점이나 참고사항 (자유 입력)

각 질문은 다음 두 종류 중 하나입니다:
- "text": 사용자가 자유롭게 적는 질문 (대상, 핵심 흐름, 마지막 추가 질문 등)
- "choice": 선택지에서 고르는 질문. 선택지는 이 서비스에 맞는 구체적인 항목이어야 합니다. 각 선택지는 12자 이내. 마지막에 "잘 모르겠어요" 같은 선택지 1개 포함.

choice 질문은 multiSelect 값으로 단일/다중 선택을 구분합니다:
- multiSelect: false → 하나만 고르는 질문 (예: "웹과 앱 중 무엇으로 만들까요?")
- multiSelect: true → 여러 개 고를 수 있는 질문 (예: "어떤 정보를 고려할까요?", "필요한 기능을 모두 골라주세요")
질문 내용상 여러 개를 고르는 게 자연스러우면 반드시 multiSelect를 true로 하세요. 질문 문장에 "모두", "여러", "중복" 같은 표현을 넣지 말고, multiSelect 값으로만 표현하세요. text 질문은 multiSelect를 false로 하세요.

반드시 JSON으로만 응답하세요. 마크다운이나 다른 텍스트를 붙이지 마세요.

형식:
{
  "questions": [
    {
      "id": "q1",
      "label": "짧은 제목 (예: 사용 대상)",
      "question": "실제 질문 문장",
      "type": "text",
      "multiSelect": false,
      "placeholder": "text일 때 입력 예시 (choice면 빈 문자열)",
      "options": ["choice일 때 선택지 3~4개 (text면 빈 배열)"],
      "help": "이 질문이 왜 필요한지 쉬운 한 문장 설명",
      "required": true
    }
  ]
}

조건:
- 정확히 6개의 질문을 만드세요.
- id는 q1~q6으로 하세요.
- 6번째 질문은 자유 입력(type: text)이고 required는 false로 하세요. 나머지는 required true.
- choice 질문은 최소 2개 이상 넣되, 이 서비스에 실제로 선택이 필요한 것에만 쓰세요.
- 모든 텍스트는 완전하고 올바른 한국어로, 깨진 문자나 오타 없이 작성하세요.`;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const { idea = "", analysis } = req.body ?? {};

  if (!idea.trim()) {
    res.status(400).json({ success: false, error: "idea is required" });
    return;
  }

  if (isBlockedIdea(idea)) {
    res.status(200).json({ success: false, error: "이 요청은 분석할 수 없습니다." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ success: false, error: "ANTHROPIC_API_KEY is not configured" });
    return;
  }

  // 분석 결과가 있으면 함께 전달해 질문 품질을 높인다 (선택)
  const context = {
    idea,
    category: analysis?.category ?? "",
    features: Array.isArray(analysis?.features) ? analysis.features.map((f) => f.name).slice(0, 12) : [],
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
        model: "claude-haiku-4-5",
        max_tokens: 2500,
        temperature: 0.4,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(context) }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      res.status(502).json({ success: false, error: `AI API error: ${aiResponse.status} ${errText.slice(0, 200)}` });
      return;
    }

    const data = (await aiResponse.json()) as {
      content?: { type: string; text?: string }[];
      stop_reason?: string;
    };

    if (data.stop_reason === "max_tokens") {
      res.status(502).json({ success: false, error: "AI 응답이 길이 제한으로 잘렸습니다. 다시 시도해주세요." });
      return;
    }

    const rawText = (data.content ?? [])
      .map((block) => (block.type === "text" ? block.text ?? "" : ""))
      .join("")
      .replace(/```json|```/g, "")
      .trim();
    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      res.status(502).json({ success: false, error: "AI 응답 형식 오류입니다. 다시 시도해주세요." });
      return;
    }

    let parsed: { questions?: unknown };
    try {
      parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1)) as { questions?: unknown };
    } catch {
      res.status(502).json({ success: false, error: "AI 응답 JSON 파싱 실패. 다시 시도해주세요." });
      return;
    }

    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const questions: GeneratedQuestion[] = rawQuestions
      .filter((q): q is Record<string, unknown> => typeof q === "object" && q !== null)
      .map((q, index): GeneratedQuestion => {
        const type = q.type === "choice" ? "choice" : "text";
        const options = type === "choice" ? toStringArray(q.options, 5) : [];
        const finalType: "text" | "choice" = type === "choice" && options.length < 2 ? "text" : type;
        return {
          id: typeof q.id === "string" && q.id.trim() ? cleanText(q.id) : `q${index + 1}`,
          label: typeof q.label === "string" ? cleanText(q.label) : `질문 ${index + 1}`,
          question: typeof q.question === "string" ? cleanText(q.question) : "",
          type: finalType,
          multiSelect: finalType === "choice", // 모든 선택형 질문은 여러 개 선택 가능
          placeholder: typeof q.placeholder === "string" ? cleanText(q.placeholder) : "",
          options: type === "choice" && options.length >= 2 ? options : [],
          help: typeof q.help === "string" ? cleanText(q.help) : "",
          required: q.required !== false,
        };
      })
      .filter((q) => q.question.length > 0)
      .slice(0, 6);

    // 마지막 질문은 자유 입력이고 필수가 아니도록 보정
    if (questions.length > 0) {
      const last = questions[questions.length - 1];
      last.required = false;
      if (last.type === "choice") {
        last.type = "text";
        last.options = [];
        last.multiSelect = false;
      }
    }

    if (questions.length < 3) {
      res.status(502).json({ success: false, error: "AI가 질문을 충분히 생성하지 못했습니다. 다시 시도해주세요." });
      return;
    }

    res.status(200).json({ success: true, questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
}