/* OneTech AI Builder - 동적 인터뷰: 다음 질문 생성 API (Vercel Serverless Function)
 * POST /api/interview/next-question
 *
 * 고정 질문 목록을 순서대로 보여주지 않는다. 사용자의 답변 기록과 현재 프로젝트 상태를 받아,
 * AI가 (1) 프로젝트 상태를 갱신하고 (2) 가장 필요한 다음 질문 1개를 생성하며 (3) 이해도를 계산한다.
 * Claude(Anthropic) API 사용. API Key는 서버 환경변수(ANTHROPIC_API_KEY)에서만 사용한다.
 */

declare const process: { env: Record<string, string | undefined> };

interface QAHistoryItem {
  question: string;
  answer: string;
}

interface ProjectState {
  projectSummary: string;
  serviceType: string;
  targetUsers: string[];
  userProblems: string[];
  coreGoal: string;
  coreFeatures: string[];
  confirmedDecisions: string[];
  rejectedDecisions: string[];
  unknownItems: string[];
}

interface NextQuestionBody {
  idea?: string;
  analysis?: { category?: string; features?: { name: string }[] };
  history?: QAHistoryItem[];
  projectState?: Partial<ProjectState>;
  // 사용자가 "잘 모르겠어요" 등으로 추천을 원할 때 true
  wantRecommendation?: boolean;
}

interface ApiRequest {
  method?: string;
  body?: NextQuestionBody;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
}

interface KeywordOption {
  label: string;
  recommended: boolean;
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

const SYSTEM_PROMPT = `당신은 OneTech AI Builder의 서비스 기획 인터뷰어입니다. 개발을 전혀 모르는 사람과 대화하며, 그 사람이 만들고 싶은 서비스를 구체화합니다.

당신은 고정된 설문지를 순서대로 읽는 것이 아닙니다. 사용자의 이전 답변을 모두 기억하고, 지금까지 파악한 프로젝트 상태를 바탕으로 "지금 가장 필요한 질문 하나"를 새로 만들어야 합니다.

매 호출마다 다음을 수행하세요:
1. 사용자의 최초 아이디어와 지금까지의 질문/답변(history)을 읽습니다.
2. 현재 프로젝트 상태(projectState)를 갱신합니다. 확정된 것(confirmedDecisions), 사용자가 제외한 것(rejectedDecisions), 아직 모르는 것(unknownItems)을 구분합니다.
3. 아직 정해지지 않은 가장 중요한 항목을 하나 골라 질문 1개를 만듭니다.
4. 프로젝트 이해도(0~100)를 계산합니다.

질문 생성 규칙:
- 한 번에 질문은 딱 1개만 만듭니다. 여러 개를 동시에 묻지 않습니다.
- 이미 답변한 내용을 다시 묻지 않습니다.
- 사용자가 제외한 기능(rejectedDecisions)을 다시 추천하거나 묻지 않습니다.
- 이전 답변과 모순되는 선택이 새로 들어오면, 임의로 결정하지 말고 "확인 질문"을 만드세요. (예: "앞에서는 결제가 필요 없다고 하셨는데, 방금 고른 예약금 기능은 결제가 필요합니다. 예약금을 뺄까요, 결제를 넣을까요?")
- 개발 용어(API, SDK, 백엔드, 서버 등)를 쓰지 말고 쉬운 말로 질문합니다.
- 질문 문장에 "모두", "여러 개", "중복" 같은 표현을 넣지 말고, allowMultiple 값으로만 표현하세요.

질문 우선순위 (위에서부터):
- 가장 먼저: 서비스 목적과 해결하려는 문제
- 그 다음: 대상 사용자, 핵심 사용 흐름, 꼭 필요한 핵심 기능
- 그 다음: 회원가입, 결제, 알림, 관리자 기능, 데이터 저장
- 나중에: 세부 디자인, 부가 기능
- 프로토타입 제작에 필요한 정보를 우선합니다. 운영·확장 질문은 뒤로 미룹니다.

선택 키워드 규칙:
- 질문과 직접 관련된 선택지만 3~5개 만듭니다.
- 서로 의미가 겹치지 않게 합니다.
- 추천하는 선택지가 있으면 recommended를 true로 표시할 수 있습니다.
- 사용자가 자유롭게 적을 수도 있으므로(allowDirectInput은 항상 true) 선택지에 "직접 입력"을 넣지 마세요.

이해도(confidence) 계산:
- 질문 개수가 아니라 다음 항목의 결정 여부로 계산합니다: 서비스 목적, 대상 사용자, 해결하려는 문제, 핵심 사용 흐름, 핵심 기능, 필수 데이터, 회원/권한, 결제 필요 여부, 관리자 기능, 프로토타입에 필요한 화면 정보.
- 해당 서비스에 불필요한 항목은 결정된 것으로 간주합니다(억지로 묻지 않음).
- 아래 Critical 항목이 모두 확정되고 이해도가 85 이상이면 readyForPlanning을 true로 하세요: 서비스 목적, 대상 사용자, 해결하려는 문제, 핵심 기능, 핵심 사용 흐름, 웹/앱 방향.
- readyForPlanning이 true가 되면 굳이 새 질문을 만들지 않아도 됩니다(그래도 nextQuestion은 채워서 보내되, 마지막 정리 질문 정도로).

추천(recommendation):
- 사용자가 "잘 모르겠어요", "추천해줘", "아무거나" 같은 답을 했거나 wantRecommendation이 true면, 현재 프로젝트 상황을 근거로 구체적인 추천을 만들고 recommendation.enabled를 true로 하세요.
- 추천에는 이유(reason)를 함께 담으세요.

반드시 아래 JSON 형식으로만 응답하세요. 마크다운이나 다른 텍스트를 붙이지 마세요:
{
  "projectState": {
    "projectSummary": "지금까지 파악한 서비스 한 줄 요약",
    "serviceType": "서비스 유형",
    "targetUsers": ["대상 사용자"],
    "userProblems": ["해결하려는 문제"],
    "coreGoal": "핵심 목표",
    "coreFeatures": ["핵심 기능"],
    "confirmedDecisions": ["확정된 결정"],
    "rejectedDecisions": ["사용자가 제외한 것"],
    "unknownItems": ["아직 모르는 항목"]
  },
  "nextQuestion": {
    "id": "q_고유값",
    "label": "짧은 제목",
    "question": "실제 질문 문장 1개",
    "reason": "이 질문을 지금 하는 이유(쉬운 말)",
    "keywords": [{ "label": "선택지", "recommended": false }],
    "allowMultiple": false,
    "allowDirectInput": true,
    "placeholder": "직접 입력 안내 문구"
  },
  "recommendation": {
    "enabled": false,
    "content": "",
    "reason": ""
  },
  "confidence": {
    "score": 0,
    "missingCriticalItems": [],
    "readyForPlanning": false
  }
}

모든 텍스트는 완전하고 올바른 한국어로, 깨진 문자나 오타 없이 작성하세요.`;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const { idea = "", analysis, history = [], projectState, wantRecommendation } = req.body ?? {};

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

  const cleanHistory = (Array.isArray(history) ? history : [])
    .filter((h): h is QAHistoryItem => typeof h === "object" && h !== null)
    .map((h) => ({
      question: typeof h.question === "string" ? cleanText(h.question) : "",
      answer: typeof h.answer === "string" ? cleanText(h.answer) : "",
    }))
    .filter((h) => h.question.length > 0)
    .slice(0, 30);

  const context = {
    idea,
    category: analysis?.category ?? "",
    expectedFeatures: Array.isArray(analysis?.features) ? analysis.features.map((f) => f.name).slice(0, 12) : [],
    history: cleanHistory,
    currentProjectState: projectState ?? {},
    wantRecommendation: wantRecommendation === true,
    answeredCount: cleanHistory.length,
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
        max_tokens: 2000,
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

    let parsed: {
      projectState?: Record<string, unknown>;
      nextQuestion?: Record<string, unknown>;
      recommendation?: Record<string, unknown>;
      confidence?: Record<string, unknown>;
    };
    try {
      parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
    } catch {
      res.status(502).json({ success: false, error: "AI 응답 JSON 파싱 실패. 다시 시도해주세요." });
      return;
    }

    // ---- projectState 정제 ----
    const ps = parsed.projectState ?? {};
    const projectStateOut: ProjectState = {
      projectSummary: typeof ps.projectSummary === "string" ? cleanText(ps.projectSummary) : "",
      serviceType: typeof ps.serviceType === "string" ? cleanText(ps.serviceType) : "",
      targetUsers: toStringArray(ps.targetUsers, 8),
      userProblems: toStringArray(ps.userProblems, 8),
      coreGoal: typeof ps.coreGoal === "string" ? cleanText(ps.coreGoal) : "",
      coreFeatures: toStringArray(ps.coreFeatures, 12),
      confirmedDecisions: toStringArray(ps.confirmedDecisions, 20),
      rejectedDecisions: toStringArray(ps.rejectedDecisions, 20),
      unknownItems: toStringArray(ps.unknownItems, 20),
    };

    // ---- nextQuestion 정제 ----
    const nq = parsed.nextQuestion ?? {};
    const rawKeywords = Array.isArray(nq.keywords) ? nq.keywords : [];
    const keywords: KeywordOption[] = rawKeywords
      .map((k): KeywordOption | null => {
        if (typeof k === "string") {
          const label = cleanText(k);
          return label ? { label, recommended: false } : null;
        }
        if (typeof k === "object" && k !== null) {
          const obj = k as Record<string, unknown>;
          const label = typeof obj.label === "string" ? cleanText(obj.label) : "";
          return label ? { label, recommended: obj.recommended === true } : null;
        }
        return null;
      })
      .filter((k): k is KeywordOption => k !== null)
      .slice(0, 6);

    const questionText = typeof nq.question === "string" ? cleanText(nq.question) : "";
    const nextQuestion = {
      id: typeof nq.id === "string" && nq.id.trim() ? cleanText(nq.id) : `q_${Date.now()}`,
      label: typeof nq.label === "string" ? cleanText(nq.label) : "질문",
      question: questionText,
      reason: typeof nq.reason === "string" ? cleanText(nq.reason) : "",
      keywords,
      allowMultiple: nq.allowMultiple === true,
      allowDirectInput: nq.allowDirectInput !== false,
      placeholder: typeof nq.placeholder === "string" ? cleanText(nq.placeholder) : "",
    };

    // ---- recommendation 정제 ----
    const rec = parsed.recommendation ?? {};
    const recommendation = {
      enabled: rec.enabled === true && typeof rec.content === "string" && cleanText(rec.content).length > 0,
      content: typeof rec.content === "string" ? cleanText(rec.content) : "",
      reason: typeof rec.reason === "string" ? cleanText(rec.reason) : "",
    };

    // ---- confidence 정제 ----
    const conf = parsed.confidence ?? {};
    const confidence = {
      score: clampNumber(conf.score, 0, 100, Math.min(90, context.answeredCount * 15)),
      missingCriticalItems: toStringArray(conf.missingCriticalItems, 10),
      readyForPlanning: conf.readyForPlanning === true,
    };

    // 질문이 없고 아직 준비도 안 됐으면 오류 (더미 대체 금지)
    if (questionText.length === 0 && !confidence.readyForPlanning) {
      res.status(502).json({ success: false, error: "AI가 다음 질문을 만들지 못했습니다. 다시 시도해주세요." });
      return;
    }

    res.status(200).json({
      success: true,
      projectState: projectStateOut,
      nextQuestion,
      recommendation,
      confidence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
}