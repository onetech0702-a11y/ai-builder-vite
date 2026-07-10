/* OneTech AI Builder - AI UI 목업 생성 API (Vercel Serverless Function)
 * POST /api/project/generate-ui
 * Claude(Anthropic) API 사용. API Key는 서버 환경변수(ANTHROPIC_API_KEY)에서만 사용한다. 프론트 노출 금지.
 */

declare const process: { env: Record<string, string | undefined> };

interface UIScreen {
  id: string;
  name: string;
  description: string;
  components: string[];
}

interface ProjectUI {
  theme: string;
  navigation: string;
  flow: string[];
  screens: UIScreen[];
}

interface GenerateUIRequestBody {
  project?: Record<string, unknown>;
  currentUi?: ProjectUI;
  instruction?: string;
}

interface ApiRequest {
  method?: string;
  body?: GenerateUIRequestBody;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
}

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

const SYSTEM_PROMPT = `당신은 OneTech AI Builder의 UI/UX 디자이너이자 서비스 기획자입니다.

사용자의 프로젝트 기획서를 분석하여 실제 앱에서 필요한 화면(UI 목업 구조)을 자동 설계하세요.

반드시 JSON으로만 응답하세요. JSON 앞뒤에 다른 텍스트나 마크다운 코드블록을 절대 붙이지 마세요.

JSON 형식:
{
  "theme": "앱 스타일 (토스 스타일 / 카카오 스타일 / Apple 스타일 / Material Design 중 프로젝트에 어울리는 것 하나) + 어울리는 이유 한 문장",
  "navigation": "Bottom Tab / Top Tab / Drawer / 혼합 중 하나",
  "flow": ["화면 이동 순서를 화면 이름으로, 예: 로그인", "홈", "상세", "..."],
  "screens": [
    {
      "id": "영문 소문자 id (예: home, search, detail)",
      "name": "화면 이름 (한글)",
      "description": "화면 목적 + 구성 이유 + UX 설명을 2~3문장으로",
      "components": ["이 화면에 들어갈 컴포넌트 3~7개"]
    }
  ]
}

컴포넌트는 반드시 아래 일반 명칭 중에서 고르거나 유사하게 작성하세요:
검색창, 버튼, 카드, 배너, 차트, 리스트, 프로필, 메뉴, 탭, FAB, 입력 폼, 이미지 갤러리, 캘린더, 알림 목록, 통계 카드, 체크리스트, 지도, 채팅

조건:
- 기획서의 화면 구성과 MVP를 기반으로 화면 5~10개를 설계하세요.
- 각 프로젝트의 특성이 화면 구성에 드러나야 합니다. 일반적인 설계 금지.
- 모든 텍스트는 완전하고 올바른 한국어로 작성하세요. 깨진 문자, 오타가 절대 없어야 합니다.
- currentUi와 instruction이 함께 주어지면, 기존 UI를 유지하면서 instruction 요청사항만 반영해 전체 JSON을 다시 출력하세요.`;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const { project, currentUi, instruction } = req.body ?? {};

  if (!project || typeof project !== "object") {
    res.status(400).json({ success: false, error: "project is required" });
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
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              project,
              currentUi: currentUi ?? null,
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
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      res.status(502).json({ success: false, error: `AI 응답 형식 오류: ${cleaned.slice(0, 120)}` });
      return;
    }

    let parsed: Partial<ProjectUI>;
    try {
      parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Partial<ProjectUI>;
    } catch {
      res.status(502).json({ success: false, error: "AI 응답 JSON 파싱 실패. 다시 시도해주세요." });
      return;
    }

    const screensRaw = Array.isArray(parsed.screens) ? parsed.screens : [];
    const screens: UIScreen[] = screensRaw
      .filter((s): s is UIScreen => typeof s === "object" && s !== null)
      .map((s, index) => ({
        id: typeof s.id === "string" && s.id.trim() ? cleanText(s.id).toLowerCase().replace(/[^a-z0-9-]/g, "") || `screen-${index}` : `screen-${index}`,
        name: typeof s.name === "string" ? cleanText(s.name) : `화면 ${index + 1}`,
        description: typeof s.description === "string" ? cleanText(s.description) : "",
        components: toStringArray(s.components, 10),
      }))
      .slice(0, 12);

    const ui: ProjectUI = {
      theme: typeof parsed.theme === "string" ? cleanText(parsed.theme) : "",
      navigation: typeof parsed.navigation === "string" ? cleanText(parsed.navigation) : "Bottom Tab",
      flow: toStringArray(parsed.flow, 12),
      screens,
    };

    if (ui.screens.length === 0) {
      res.status(502).json({ success: false, error: "AI가 화면을 생성하지 못했습니다. 다시 시도해주세요." });
      return;
    }

    res.status(200).json({ success: true, ui });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
}