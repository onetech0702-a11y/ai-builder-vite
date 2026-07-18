/* OneTech AI Builder - AI 기획서(PRD) 생성 API (Vercel Serverless Function)
 * POST /api/project/generate-prd
 * Claude(Anthropic) API 사용. API Key는 서버 환경변수(ANTHROPIC_API_KEY)에서만 사용한다. 프론트 노출 금지.
 */

declare const process: { env: Record<string, string | undefined> };

interface PRDAnswers {
  targetUser?: string;
  coreFeatures?: string;
  platform?: string;
  auth?: string;
  payment?: string;
  additional?: string;
}

interface QAItem {
  question: string;
  answer: string;
}

interface PRDRequestBody {
  idea?: string;
  brandName?: string;
  answers?: PRDAnswers;
  qa?: QAItem[];
  instruction?: string;
  currentPrd?: Record<string, unknown>;
}

interface ApiRequest {
  method?: string;
  body?: PRDRequestBody;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
}

interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  deploy: string;
}

interface ProjectPRD {
  title: string;
  summary: string;
  problem: string;
  solution: string;
  targetUsers: string[];
  coreFeatures: string[];
  userFlow: string[];
  screens: string[];
  database: string[];
  apis: string[];
  adminFeatures: string[];
  developmentOrder: string[];
  mvp: string[];
  futureFeatures: string[];
  techStack: TechStack;
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

const SYSTEM_PROMPT = `당신은 OneTech AI Builder의 CTO이자 서비스 기획자, PM입니다.

사용자의 아이디어와 인터뷰 답변을 분석하여 실제 개발 가능한 수준의 프로젝트 기획서(PRD)를 작성하세요.

실제 스타트업 기획서를 작성하는 수준으로, 절대 짧거나 두루뭉술하게 작성하지 않습니다.
모든 항목은 사용자의 아이디어와 인터뷰 답변이 구체적으로 반영되어야 합니다.

반드시 JSON으로만 응답하세요. JSON 앞뒤에 다른 텍스트나 마크다운 코드블록을 절대 붙이지 마세요.

JSON 형식:
{
  "title": "프로젝트명 (한글, 기억하기 쉽게)",
  "summary": "한줄 소개",
  "problem": "해결하려는 문제 (2~4문장, 구체적으로)",
  "solution": "서비스 설명 / 해결 방법 (2~4문장, 구체적으로)",
  "targetUsers": ["대상 사용자 2~4개"],
  "coreFeatures": ["핵심 기능 5~8개, 각 기능은 '기능명: 설명' 형태"],
  "userFlow": ["사용자 플로우를 순서대로, 예: 회원가입", "로그인", "홈", "..."],
  "screens": ["필요한 화면 목록, 각 항목은 '화면명: 역할' 형태"],
  "database": ["DB 테이블 목록, 각 항목은 '테이블명: 주요 컬럼' 형태"],
  "apis": ["API 목록, 예: POST /api/login - 로그인"],
  "adminFeatures": ["관리자 기능 목록"],
  "developmentOrder": ["개발 순서를 단계별로"],
  "mvp": ["MVP에 반드시 필요한 기능만"],
  "futureFeatures": ["추후 업데이트 기능"],
  "techStack": {
    "frontend": "추천 프론트엔드 스택과 이유",
    "backend": "추천 백엔드 스택과 이유",
    "database": "추천 DB와 이유",
    "deploy": "추천 배포 방법과 이유"
  }
}

조건:
- 인터뷰 답변(대상 사용자, 핵심 기능, 플랫폼, 로그인, 결제, 추가 요청)을 반드시 반영하세요.
- 결제가 "필요 없습니다"면 결제 관련 기능/API/DB를 넣지 마세요.
- 로그인이 "필요 없습니다"면 회원 관련 기능을 최소화하세요.
- 플랫폼 답변에 맞는 기술스택을 추천하세요.
- 각 항목은 구체적이되 간결하게 작성하세요. 항목당 설명은 1문장이면 충분합니다.
- 모든 텍스트는 완전하고 올바른 한국어로 작성하세요. 깨진 문자, 이상한 기호, 오타가 절대 없어야 합니다.
- 기술명은 반드시 정확한 공식 표기를 사용하세요. 예: React, React Native, Next.js, Express.js, Node.js, PostgreSQL, MySQL, MongoDB, Supabase, Firebase, Redis, AWS S3, Vercel, Docker. 임의로 줄이거나 변형하지 마세요.
- 외래어는 관례적 한글 표기(프리미엄, 커뮤니티, 타임라인 등)를 정확히 쓰세요.
- brandName이 주어지면 반드시 그 이름을 title로 그대로 사용하세요.
- brandName이 주어지면 반드시 그 이름을 title(프로젝트명)로 사용하세요. 임의로 바꾸지 마세요.
- brandName이 주어지면 반드시 그 이름을 title로 사용하세요.
- currentPrd와 instruction이 함께 주어지면, 기존 기획서를 유지하면서 instruction 요청사항만 반영해 전체 기획서 JSON을 다시 출력하세요.
- 불법이거나 피해를 유발하는 서비스는 기획서를 작성하지 말고 title에 "제작 불가"라고 쓰세요.`;

// 깨진 문자(�), 제어 문자 제거
function cleanText(value: string): string {
  return value
    .replace(/\uFFFD/g, "")
    // eslint-disable-next-line no-control-regex -- 제어 문자 제거가 목적인 정제 로직
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function toStringArray(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map(cleanText)
    .filter((v) => v.length > 0)
    .slice(0, max);
}

function toCleanString(value: unknown): string {
  return typeof value === "string" ? cleanText(value) : "";
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const { idea = "", answers = {}, qa, instruction, currentPrd, brandName } = req.body ?? {};

  const hasQA = Array.isArray(qa) && qa.length > 0;
  if (!idea && !answers.targetUser && !answers.coreFeatures && !hasQA) {
    res.status(400).json({ success: false, error: "idea or answers required" });
    return;
  }

  if (isBlockedIdea(idea)) {
    res.status(200).json({ success: false, error: "이 요청은 불법 또는 피해를 유발할 수 있어 기획서를 생성할 수 없습니다." });
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
        model: "claude-haiku-4-5",  // 기획서는 60초 제한 안에 생성돼야 하므로 빠른 모델 사용
        max_tokens: 6000,
        temperature: 0.4,  // 표기 오류를 줄이기 위해 낮은 온도 사용
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              idea,
              brandName: brandName ? cleanText(brandName) : null,
              // 인터뷰 질문/답변 (AI가 아이디어별로 생성한 질문과 사용자의 답변)
              interview: hasQA
                ? qa.map((item) => ({
                    question: typeof item.question === "string" ? cleanText(item.question) : "",
                    answer: typeof item.answer === "string" ? cleanText(item.answer) : "",
                  }))
                : answers,
              currentPrd: currentPrd ?? null,
              instruction: instruction ? cleanText(instruction) : null,
            }),
          },
        ],
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
      .trim();

    // JSON 본문만 안전하게 추출 (앞뒤에 다른 텍스트가 붙어도 파싱)
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      res.status(502).json({ success: false, error: `AI 응답 형식 오류: ${cleaned.slice(0, 120)}` });
      return;
    }
    const jsonText = cleaned.slice(firstBrace, lastBrace + 1);

    let parsed: Partial<ProjectPRD> & { techStack?: Partial<TechStack> };
    try {
      parsed = JSON.parse(jsonText) as Partial<ProjectPRD> & { techStack?: Partial<TechStack> };
    } catch {
      res.status(502).json({ success: false, error: "AI 응답 JSON 파싱 실패. 다시 시도해주세요." });
      return;
    }

    const project: ProjectPRD = {
      title: toCleanString(parsed.title),
      summary: toCleanString(parsed.summary),
      problem: toCleanString(parsed.problem),
      solution: toCleanString(parsed.solution),
      targetUsers: toStringArray(parsed.targetUsers),
      coreFeatures: toStringArray(parsed.coreFeatures),
      userFlow: toStringArray(parsed.userFlow),
      screens: toStringArray(parsed.screens),
      database: toStringArray(parsed.database),
      apis: toStringArray(parsed.apis, 30),
      adminFeatures: toStringArray(parsed.adminFeatures),
      developmentOrder: toStringArray(parsed.developmentOrder),
      mvp: toStringArray(parsed.mvp),
      futureFeatures: toStringArray(parsed.futureFeatures),
      techStack: {
        frontend: toCleanString(parsed.techStack?.frontend),
        backend: toCleanString(parsed.techStack?.backend),
        database: toCleanString(parsed.techStack?.database),
        deploy: toCleanString(parsed.techStack?.deploy),
      },
    };

    if (!project.title || project.title === "제작 불가") {
      res.status(200).json({ success: false, error: "이 아이디어로는 기획서를 생성할 수 없습니다." });
      return;
    }

    res.status(200).json({ success: true, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
}