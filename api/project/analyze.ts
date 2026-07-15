/* OneTech AI Builder - AI 프로젝트 분석 API (Vercel Serverless Function)
 * POST /api/project/analyze
 * Claude(Anthropic) API 사용. API Key는 서버 환경변수(ANTHROPIC_API_KEY)에서만 사용한다. 프론트 노출 금지.
 */

declare const process: { env: Record<string, string | undefined> };

interface AnalyzeRequestBody {
  idea?: string;
}

interface ApiRequest {
  method?: string;
  body?: AnalyzeRequestBody;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
}

interface FeatureItem {
  name: string;
  description: string;
  recommended: boolean;
}

interface ServiceItem {
  name: string;
  role: string;
  recommended: boolean;
}

interface HardwareInfo {
  needed: boolean;
  items: string[];
  questions: string[];
  limitation: string;
}

interface Feasibility {
  score: number;
  possible: string[];
  needsMore: string[];
  limitation: string;
}

interface MvpInfo {
  screenCount: number;
  featureCount: number;
  difficulty: number;
  recommendation: string;
  items: string[];
}

interface ProjectAnalysis {
  category: string;
  categoryReason: string;
  features: FeatureItem[];
  services: ServiceItem[];
  hardware: HardwareInfo;
  feasibility: Feasibility;
  mvp: MvpInfo;
}

function cleanText(value: string): string {
  return value
    .replace(/\uFFFD/g, "")
    // eslint-disable-next-line no-control-regex -- 제어 문자 제거가 목적인 정제 로직
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function toStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map(cleanText)
    .filter((v) => v.length > 0)
    .slice(0, max);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
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

const SYSTEM_PROMPT = `당신은 OneTech AI Builder의 AI CTO이자 개발 컨설턴트, 아키텍트입니다.

사용자가 만들고 싶은 서비스를 분석하여, 개발을 전혀 모르는 사람도 이해할 수 있게 현실적인 개발 방향을 제시하세요.

가장 중요한 원칙:
- 구현이 어려운 것을 무조건 가능하다고 말하지 마세요. 솔직하고 현실적으로 판단하세요.
- 어려운 개발 용어(API, SDK, OAuth, Backend, Server 등)를 설명 없이 쓰지 마세요. 반드시 쉬운 말로 풀어서 설명하세요.
- 사용자가 가장 빠르게 서비스를 런칭할 수 있는 MVP 범위를 추천하세요.

반드시 JSON으로만 응답하세요. 마크다운 코드블록이나 다른 텍스트를 붙이지 마세요.

JSON 형식:
{
  "category": "서비스 분류 (웹 서비스 / 모바일 앱 / 게임 / AI 서비스 / ERP / CRM / 예약 / 쇼핑몰 / IoT / 자동화 / SaaS / 관리 시스템 / 기타 중 하나)",
  "categoryReason": "왜 이렇게 분류했는지 한 문장 (쉬운 말로)",
  "features": [
    { "name": "필요한 기능 이름 (예: 회원가입, 결제, 실시간 채팅, 지도, 알림, 사진 업로드, AI 기능, 검색, 관리자 화면)", "description": "이 기능이 왜 필요한지 쉬운 한 문장", "recommended": true }
  ],
  "services": [
    { "name": "외부 서비스 이름 (예: Supabase, Vercel, GitHub, Stripe, Claude, Google Maps, Firebase, Resend, Twilio)", "role": "이 서비스가 무슨 일을 하는지 쉬운 한 문장 (예: 회원가입과 데이터 저장을 담당합니다)", "recommended": true }
  ],
  "hardware": {
    "needed": false,
    "items": ["필요한 장비 목록 (없으면 빈 배열)"],
    "questions": ["장비가 필요할 때만 사용자에게 물어볼 질문 (없으면 빈 배열)"],
    "limitation": "장비 때문에 AI Builder만으로 못 하는 부분 (없으면 빈 문자열)"
  },
  "feasibility": {
    "score": 95,
    "possible": ["AI Builder로 지금 만들 수 있는 것 3~6개"],
    "needsMore": ["추가로 준비해야 하는 것 (예: Claude 계정, 결제 심사, 실제 장비)"],
    "limitation": "AI Builder만으로는 불가능한 부분을 솔직하게 한두 문장 (없으면 빈 문자열)"
  },
  "mvp": {
    "screenCount": 28,
    "featureCount": 56,
    "difficulty": 4,
    "recommendation": "MVP부터 만드는 것을 추천하는 이유 한두 문장",
    "items": ["MVP에 꼭 필요한 기능 4~6개"]
  }
}

조건:
- features는 5~9개, services는 3~6개로 사용자의 서비스에 실제로 필요한 것만 넣으세요.
- score는 AI Builder로 자동 구현 가능한 비율(0~100)입니다. 장비/인증/실물 제어가 필요하면 낮게 잡으세요.
- difficulty는 1~5 (별점)입니다.
- screenCount, featureCount는 전체 서비스를 다 만든다고 할 때의 현실적인 예상치입니다.
- 모든 텍스트는 완전하고 올바른 한국어로, 깨진 문자나 오타 없이 작성하세요.`;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const { idea = "" } = req.body ?? {};

  if (!idea.trim()) {
    res.status(400).json({ success: false, error: "idea is required" });
    return;
  }

  if (isBlockedIdea(idea)) {
    res.status(200).json({ success: false, error: "이 요청은 불법 또는 피해를 유발할 수 있어 분석할 수 없습니다." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ success: false, error: "ANTHROPIC_API_KEY is not configured" });
    return;
  }

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
        max_tokens: 4000,
        temperature: 0.4,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify({ idea }) }],
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

    let parsed: Partial<ProjectAnalysis>;
    try {
      parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1)) as Partial<ProjectAnalysis>;
    } catch {
      res.status(502).json({ success: false, error: "AI 응답 JSON 파싱 실패. 다시 시도해주세요." });
      return;
    }

    const features: FeatureItem[] = (Array.isArray(parsed.features) ? parsed.features : [])
      .filter((f): f is FeatureItem => typeof f === "object" && f !== null && typeof f.name === "string")
      .map((f) => ({
        name: cleanText(f.name),
        description: typeof f.description === "string" ? cleanText(f.description) : "",
        recommended: f.recommended !== false,
      }))
      .filter((f) => f.name.length > 0)
      .slice(0, 10);

    const services: ServiceItem[] = (Array.isArray(parsed.services) ? parsed.services : [])
      .filter((s): s is ServiceItem => typeof s === "object" && s !== null && typeof s.name === "string")
      .map((s) => ({
        name: cleanText(s.name),
        role: typeof s.role === "string" ? cleanText(s.role) : "",
        recommended: s.recommended !== false,
      }))
      .filter((s) => s.name.length > 0)
      .slice(0, 8);

    const hardwareRaw: Partial<HardwareInfo> = parsed.hardware ?? {};
    const hardware: HardwareInfo = {
      needed: hardwareRaw.needed === true,
      items: toStringArray(hardwareRaw.items, 8),
      questions: toStringArray(hardwareRaw.questions, 5),
      limitation: typeof hardwareRaw.limitation === "string" ? cleanText(hardwareRaw.limitation) : "",
    };

    const feasibilityRaw: Partial<Feasibility> = parsed.feasibility ?? {};
    const feasibility: Feasibility = {
      score: clampNumber(feasibilityRaw.score, 0, 100, 80),
      possible: toStringArray(feasibilityRaw.possible, 8),
      needsMore: toStringArray(feasibilityRaw.needsMore, 8),
      limitation: typeof feasibilityRaw.limitation === "string" ? cleanText(feasibilityRaw.limitation) : "",
    };

    const mvpRaw: Partial<MvpInfo> = parsed.mvp ?? {};
    const mvp: MvpInfo = {
      screenCount: clampNumber(mvpRaw.screenCount, 1, 200, 10),
      featureCount: clampNumber(mvpRaw.featureCount, 1, 400, 20),
      difficulty: clampNumber(mvpRaw.difficulty, 1, 5, 3),
      recommendation: typeof mvpRaw.recommendation === "string" ? cleanText(mvpRaw.recommendation) : "",
      items: toStringArray(mvpRaw.items, 8),
    };

    const analysis: ProjectAnalysis = {
      category: typeof parsed.category === "string" ? cleanText(parsed.category) : "기타",
      categoryReason: typeof parsed.categoryReason === "string" ? cleanText(parsed.categoryReason) : "",
      features,
      services,
      hardware,
      feasibility,
      mvp,
    };

    if (analysis.features.length === 0) {
      res.status(502).json({ success: false, error: "AI가 분석을 완료하지 못했습니다. 다시 시도해주세요." });
      return;
    }

    res.status(200).json({ success: true, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
}