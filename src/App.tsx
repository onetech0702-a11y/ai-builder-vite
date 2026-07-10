import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import logo from "./assets/onetech-logo.png";
import HeroCard from "./components/HeroCard";
import ProgressBar from "./components/ProgressBar";
import { RECENT_PROJECTS, Project, TODAY_TASKS, TaskItem, TaskStatus } from "./data/mockData";

/* ---------------------------------------------
 * Phase 1-2: Project Create(프로젝트 생성) 기능
 * Phase 2-1: Home 실제 동작 기능
 * - 라우팅 / 데스크톱 헤더 메뉴 + 모바일 하단 탭바
 * - 아이디어 입력 (자유 입력 + Auto Resize + localStorage)
 * - AI와 함께 시작하기: 입력 없으면 비활성화, 입력값 전달
 * - Project Create / Project Detail / Placeholder 화면
 * 이 파일 하나만 교체하면 됩니다. (src/App.tsx)
 * --------------------------------------------- */

const IDEA_STORAGE_KEY = "ai-builder-draft-idea";
const PROJECT_STORAGE_KEY = "ai-builder-project";
const CURRENT_PROJECT_KEY = "ai-builder-current-project";
const PROJECTS_LIST_KEY = "ai-builder-projects";
const PROJECTS_LIST_MAX = 10;

interface UserProject {
  id: string;
  idea: string;
  title: string;
  status: string;
  step: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
}

function createUserProject(idea: string): UserProject {
  const now = new Date().toISOString();
  return {
    id: `project_${Date.now()}`,
    idea,
    title: idea,
    status: "interview",
    step: "ai-interview",
    createdAt: now,
    updatedAt: now,
    progress: 5,
  };
}

function saveUserProject(project: UserProject) {
  localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(project));

  let list: UserProject[] = [];
  try {
    list = JSON.parse(localStorage.getItem(PROJECTS_LIST_KEY) ?? "[]") as UserProject[];
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify([project, ...list].slice(0, PROJECTS_LIST_MAX)));
}

function loadCurrentProject(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function updateCurrentProject(patch: Record<string, unknown>) {
  const current = loadCurrentProject();
  localStorage.setItem(
    CURRENT_PROJECT_KEY,
    JSON.stringify({ ...current, ...patch, updatedAt: new Date().toISOString() })
  );
}

function loadCurrentIdea(): string {
  try {
    const current = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (current) {
      const parsed = JSON.parse(current) as { idea?: string };
      if (parsed.idea) return parsed.idea;
    }
    const legacy = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { idea?: string };
      if (parsed.idea) return parsed.idea;
    }
  } catch {
    return "";
  }
  return "";
}

/* ---------- Navigation 정의 ---------- */

type NavId = "home" | "projects" | "tasks" | "settings";

interface NavRoute {
  id: NavId;
  label: string;
  path: string;
}

const NAV_ROUTES: NavRoute[] = [
  { id: "home", label: "홈", path: "/" },
  { id: "projects", label: "프로젝트", path: "/projects" },
  { id: "tasks", label: "할 일", path: "/todo" },
  { id: "settings", label: "설정", path: "/setting" },
];

/* ---------- 아이디어 입력 카드 ---------- */

const PLACEHOLDER_EXAMPLES = [
  "AI 주식 앱을 만들고 싶어요",
  "예약 관리 시스템",
  "쇼핑몰 서비스",
  "운동 기록 앱",
  "가계부 앱",
];

const PLACEHOLDER_INTERVAL_MS = 2400;

function IdeaInputSection({ onStartWithAI }: { onStartWithAI: (idea: string) => void }) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [idea, setIdea] = useState(() => localStorage.getItem(IDEA_STORAGE_KEY) ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = idea.trim().length === 0;

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, PLACEHOLDER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Auto Resize: 내용에 맞춰 높이 자동 조절 (최소 100px)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 100)}px`;
  }, [idea]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIdea(e.target.value);
    localStorage.setItem(IDEA_STORAGE_KEY, e.target.value);
  };

  return (
    <section className="flex flex-1 flex-col border-t border-[#ECEEF2] bg-white p-6 md:p-7 animate-slideUp">
      <h2 className="text-[17px] font-bold text-ink-title">무엇을 만들고 싶나요?</h2>

      <textarea
        ref={textareaRef}
        value={idea}
        onChange={handleChange}
        rows={1}
        placeholder={`예: ${PLACEHOLDER_EXAMPLES[placeholderIndex]}`}
        className="mt-3 min-h-[100px] w-full resize-none overflow-hidden rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3.5 text-base text-ink-title placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <button
        onClick={() => onStartWithAI(idea.trim())}
        disabled={isEmpty}
        className="mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-white transition-all duration-200 enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
        </svg>
        AI와 함께 시작하기
      </button>
    </section>
  );
}

/* ---------- 최근 프로젝트 (카드 클릭 → 상세 이동) ---------- */

function ProjectIcon({ type }: { type: Project["icon"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "#FFFFFF",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (type) {
    case "folder":
      return (
        <svg {...common}>
          <path d="M4 7a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 16l5-5 4 4 7-8" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2.5" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
  }
}

function ProjectListItem({ project, onSelect }: { project: Project; onSelect: (id: string) => void }) {
  return (
    <li
      onClick={() => onSelect(project.id)}
      className="flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-[#F8FAFC] active:bg-[#F3F4F6]"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-[0_6px_14px_-4px_rgba(79,107,255,0.4)]"
        style={{ background: `linear-gradient(135deg, ${project.colorFrom}, ${project.colorTo})` }}
      >
        <ProjectIcon type={project.icon} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-ink-title truncate">{project.name}</h3>
          <button
            aria-label="더보기"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-ink-body hover:bg-[#F3F4F6]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          </button>
        </div>
        <p className="mt-0.5 text-[11px] text-ink-body">마지막 수정 {project.updatedAt}</p>

        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1">
            <ProgressBar progress={project.progress} />
          </div>
          <span className="shrink-0 text-[11px] font-bold text-primary">{project.progress}%</span>
          <span className="shrink-0 rounded-badge bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-ink-body">
            {project.phase}
          </span>
        </div>
      </div>
    </li>
  );
}

function RecentProjectsSection({ onViewAll, onSelect }: { onViewAll: () => void; onSelect: (id: string) => void }) {
  return (
    <section className="animate-fadeIn min-w-0">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-ink-title">최근 프로젝트</h2>
        <button onClick={onViewAll} className="flex items-center gap-0.5 text-[13px] font-medium text-primary">
          전체 보기
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <ul className="mt-3.5 divide-y divide-[#ECEEF2] overflow-hidden rounded-[24px] border border-[#ECEEF2] bg-white">
        {RECENT_PROJECTS.slice(0, 3).map((project) => (
          <ProjectListItem key={project.id} project={project} onSelect={onSelect} />
        ))}
      </ul>
    </section>
  );
}

/* ---------- 오늘 할 일 (시간 표시 없음) ---------- */

const TASK_STATUS_MAP: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  done: { label: "완료", bg: "#DCFCE7", text: "#16A34A" },
  inProgress: { label: "진행중", bg: "#DBEAFE", text: "#2563EB" },
  pending: { label: "대기", bg: "#F3F4F6", text: "#6B7280" },
};

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const s = TASK_STATUS_MAP[status];
  return (
    <span className="shrink-0 rounded-badge px-2.5 py-1 text-[11px] font-semibold" style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

function TaskRow({ task, onToggle }: { task: TaskItem; onToggle: (id: string) => void }) {
  return (
    <li className="flex min-h-[48px] items-center gap-3 px-4 py-2 transition-colors duration-200 hover:bg-[#FAFBFC] lg:min-h-[39px] lg:py-1.5">
      <button
        onClick={() => onToggle(task.id)}
        aria-label="할 일 완료 처리"
        className={
          "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border transition-colors " +
          (task.status === "done" ? "bg-primary border-primary" : "bg-white border-[#D1D5DB]")
        }
      >
        {task.status === "done" && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <span
        className={
          "min-w-0 flex-1 truncate text-[14px] " +
          (task.status === "done" ? "text-ink-body" : "text-ink-title font-medium")
        }
      >
        {task.title}
      </span>

      <TaskStatusBadge status={task.status} />

      <button
        aria-label="더보기"
        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-ink-body hover:bg-[#ECEEF2]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
    </li>
  );
}

function TodayTasksSection({ onViewAll }: { onViewAll: () => void }) {
  const [tasks, setTasks] = useState(TODAY_TASKS);

  const handleToggle = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === "done" ? "pending" : "done" } : t))
    );
  };

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const totalCount = tasks.length;
  const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  return (
    <section className="animate-fadeIn flex flex-col md:min-h-0 md:flex-1">
      <div className="flex shrink-0 items-center justify-between">
        <h2 className="text-[18px] font-bold text-ink-title">오늘 할 일</h2>
        <button onClick={onViewAll} className="flex items-center gap-0.5 text-[13px] font-medium text-primary">
          전체 보기
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="mt-3.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-[#ECEEF2] bg-white md:min-h-0">
        <div className="shrink-0 border-b border-[#ECEEF2] px-4 py-3">
          <div className="flex items-center justify-between text-[12px] text-ink-body">
            <span>
              {doneCount}/{totalCount} 완료
            </span>
            <span className="font-bold text-primary">{percent}%</span>
          </div>
          <div className="mt-1.5">
            <ProgressBar progress={percent} />
          </div>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-[#ECEEF2] overflow-y-auto">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={handleToggle} />
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- 페이지: Home ---------- */

function HomePage() {
  const navigate = useNavigate();

  const handleCreateProject = () => navigate("/project/create");
  const handleStartWithAI = (idea: string) => {
    saveUserProject(createUserProject(idea));
    navigate("/project/interview");
  };
  const handleSelectProject = (id: string) => navigate(`/project/${id}`);
  const handleViewAll = () => navigate("/projects");

  return (
    <main className="flex flex-1 flex-col gap-3 px-5 py-3 pb-[90px] md:h-[calc(100dvh-5rem)] md:min-h-0 md:flex-row md:gap-6 md:overflow-hidden md:px-8 md:py-5 md:pb-5 lg:gap-8 lg:px-10">
      {/* 좌측 65%(Desktop): Hero + 입력카드를 하나의 연결된 카드로 */}
      <div className="flex shrink-0 flex-col md:min-h-0 md:w-[58%] md:shrink-0 lg:w-[65%]">
        <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-[#ECEEF2] shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <HeroCard onCreateProject={handleCreateProject} />
          <IdeaInputSection onStartWithAI={handleStartWithAI} />
        </div>
      </div>

      {/* 우측 35%(Desktop): 최근 프로젝트 + 오늘 할 일 */}
      <div className="flex flex-col gap-3 md:min-h-0 md:w-[42%] md:flex-1 lg:w-[35%]">
        <div className="flex min-h-0 flex-1 flex-col md:min-h-0">
          <RecentProjectsSection onViewAll={handleViewAll} onSelect={handleSelectProject} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col md:min-h-0">
          <TodayTasksSection onViewAll={() => navigate("/todo")} />
        </div>
      </div>
    </main>
  );
}

/* ---------- 공통: 뒤로가기 버튼 ---------- */

function BackButton({ label }: { label: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/")}
      className="flex items-center gap-1 text-[14px] font-medium text-ink-body transition-colors hover:text-ink-title"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      {label}
    </button>
  );
}

/* ---------- 페이지: Project Create ---------- */

type ProjectType = "idea" | "no-idea";

const CREATE_PLACEHOLDER =
  "예)\n주식 초보를 위한 앱\n예약관리 시스템\nAI 가계부\n반려동물 커뮤니티";

function ProjectCreatePage() {
  const navigate = useNavigate();
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [idea, setIdea] = useState("");

  const isStartDisabled = projectType === "idea" && idea.trim().length === 0;

  const handleStart = () => {
    if (!projectType || isStartDisabled) return;

    const trimmedIdea = projectType === "idea" ? idea.trim() : "";

    const project = {
      projectType,
      idea: trimmedIdea,
      createdAt: new Date().toISOString(),
      status: "interview",
      step: 1,
    };
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    saveUserProject(createUserProject(trimmedIdea));
    navigate("/project/interview");
  };

  const options: { value: ProjectType; label: string }[] = [
    { value: "idea", label: "있어요" },
    { value: "no-idea", label: "없어요" },
  ];

  return (
    <main className="flex flex-1 flex-col px-5 pt-4 pb-[140px] animate-fadeIn md:items-center md:pt-10 md:pb-12">
      <div className="flex w-full flex-col gap-4 md:max-w-[680px]">
        <section className="rounded-[24px] border border-[#ECEEF2] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:p-8">
          <h1 className="text-[24px] font-bold text-ink-title">새 프로젝트 만들기</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-body">
            AI가 질문을 하면서
            <br />
            서비스를 함께 기획합니다.
          </p>

          {/* 질문: 아이디어가 있으신가요? */}
          <fieldset className="mt-6">
            <legend className="text-[15px] font-semibold text-ink-title">아이디어가 있으신가요?</legend>
            <div className="mt-3 flex gap-3">
              {options.map((option) => {
                const isSelected = projectType === option.value;
                return (
                  <label
                    key={option.value}
                    className={
                      "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-[15px] font-medium transition-colors duration-200 " +
                      (isSelected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-[#E5E8EB] bg-white text-ink-body hover:border-[#D1D5DB]")
                    }
                  >
                    <input
                      type="radio"
                      name="projectType"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setProjectType(option.value)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={
                        "flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 transition-colors duration-200 " +
                        (isSelected ? "border-primary" : "border-[#D1D5DB]")
                      }
                    >
                      {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* CASE 1: 있어요 → 입력창 + AI 인터뷰 시작 */}
          {projectType === "idea" && (
            <div className="mt-5 animate-fadeIn">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder={CREATE_PLACEHOLDER}
                className="min-h-[130px] w-full resize-none rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3.5 text-base leading-relaxed text-ink-title placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleStart}
                disabled={isStartDisabled}
                className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)] transition-all duration-200 enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                AI 인터뷰 시작
              </button>
            </div>
          )}

          {/* CASE 2: 없어요 → 아이디어 함께 찾기 */}
          {projectType === "no-idea" && (
            <button
              onClick={handleStart}
              className="mt-5 flex h-[52px] w-full animate-fadeIn items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              아이디어 함께 찾기
            </button>
          )}
        </section>
      </div>
    </main>
  );
}

/* ---------- AI 인터뷰: 단계 정의 ---------- */

interface InterviewAnswers {
  targetUser: string;
  coreFeatures: string;
  platform: string;
  auth: string;
  payment: string;
  additional: string;
}

type InterviewField = keyof InterviewAnswers;

const EMPTY_ANSWERS: InterviewAnswers = {
  targetUser: "",
  coreFeatures: "",
  platform: "",
  auth: "",
  payment: "",
  additional: "",
};

interface InterviewStepDef {
  field: InterviewField;
  label: string;
  question: string;
  type: "text" | "choice";
  placeholder?: string;
  options?: string[];
  required: boolean;
  help: string;
}

const INTERVIEW_STEPS: InterviewStepDef[] = [
  {
    field: "targetUser",
    label: "대상 사용자",
    question: "이 서비스는 누구를 위한 서비스인가요?",
    type: "text",
    placeholder: "예: 초보 투자자, 미용실 사장님, 헬스장 회원 등",
    required: true,
    help: "대상 사용자는 이 서비스를 가장 자주 쓰는 사람입니다. 대상 사용자가 명확해야 기능과 디자인 방향을 정할 수 있습니다.",
  },
  {
    field: "coreFeatures",
    label: "핵심 기능",
    question: "이 서비스에서 꼭 필요한 핵심 기능은 무엇인가요?",
    type: "text",
    placeholder: "예: 예약 관리, 고객 관리, 알림, 결제, 관리자 페이지 등",
    required: true,
    help: "핵심 기능은 이 서비스가 반드시 해결해야 하는 주요 기능입니다. 처음부터 많은 기능을 넣기보다 MVP에 필요한 기능만 정하는 것이 좋습니다.",
  },
  {
    field: "platform",
    label: "사용 플랫폼",
    question: "사용자는 이 서비스를 어디에서 주로 사용하나요?",
    type: "choice",
    options: ["모바일 앱", "모바일 웹", "PC 웹", "모두 필요"],
    required: true,
    help: "플랫폼은 사용자가 서비스를 사용하는 환경입니다. 빠른 출시가 목표라면 모바일 웹부터 시작하는 것이 좋습니다.",
  },
  {
    field: "auth",
    label: "로그인 필요 여부",
    question: "로그인이나 회원가입이 필요한가요?",
    type: "choice",
    options: ["필요합니다", "필요 없습니다", "잘 모르겠습니다"],
    required: true,
    help: "로그인은 사용자별 데이터를 저장해야 할 때 필요합니다. 기록, 즐겨찾기, 결제, 알림 기능이 있으면 로그인을 추천합니다.",
  },
  {
    field: "payment",
    label: "결제 필요 여부",
    question: "결제 기능이 필요한가요?",
    type: "choice",
    options: ["필요합니다", "필요 없습니다", "나중에 추가할 예정입니다", "잘 모르겠습니다"],
    required: true,
    help: "결제는 수익화와 관련된 기능입니다. MVP 단계에서는 결제를 나중으로 미루는 것이 더 빠르게 출시할 수 있습니다.",
  },
  {
    field: "additional",
    label: "추가 요청사항",
    question: "추가로 원하는 기능이나 참고하고 싶은 서비스가 있나요?",
    type: "text",
    placeholder: "예: 토스처럼 깔끔하게, 카카오톡 알림, 관리자 통계, 참고 사이트 URL 등",
    required: false,
    help: "추가 기능은 서비스 완성도를 높이는 보조 기능입니다. 알림, 통계, 관리자 페이지, 문의하기 등이 여기에 해당합니다.",
  },
];

const INTERVIEW_PROGRESS = [16, 33, 50, 66, 83, 100];

/* ---------- Mock AI Recommendation Engine ----------
 * idea 키워드 + 현재 step을 기반으로 추천을 생성한다.
 * 추후 AI 연결 시 getMockRecommendation(idea, step)을
 * getAIRecommendation(idea, step, answers) API 호출로 교체하면 된다.
 * 반환 형태(AIRecommendation)는 유지한다.
 */

interface AIRecommendation {
  answer: string;           // 화면에 표시하는 추천 답변
  applyValue: string;       // 추천 적용 시 실제 입력/선택되는 값
  reasons: string[];        // 추천 이유
  extraQuestions?: string[]; // AI가 제안하는 추가 질문
}

type RecommendationSet = Record<InterviewField, AIRecommendation>;

function rec(answer: string, reasons: string[], applyValue?: string): AIRecommendation {
  return { answer, applyValue: applyValue ?? answer, reasons };
}

const RECOMMENDATION_PRESETS: { keywords: string[]; set: RecommendationSet }[] = [
  {
    keywords: ["독서", "북클럽", "책 기록"],
    set: {
      targetUser: rec("책을 꾸준히 읽고 싶은 사람, 독서 습관을 만들고 싶은 사용자", [
        "독서앱은 읽은 책을 기록하고 독서 루틴을 만드는 사용자가 주로 사용합니다",
      ]),
      coreFeatures: rec("독서 기록, 읽은 책 목록, 독서 목표 설정, 메모, 책 추천", [
        "읽은 책을 기록으로 남기는 것이 독서앱의 핵심 가치입니다",
        "목표와 메모가 있으면 독서 습관이 이어집니다",
      ]),
      platform: rec("모바일 앱", [
        "독서 기록은 책을 읽은 직후 바로 작성하는 경우가 많아 모바일 앱이 적합합니다",
      ]),
      auth: rec("필요합니다", ["사용자의 독서 기록, 메모, 목표를 저장해야 하기 때문입니다"]),
      payment: rec("나중에 추가할 예정입니다", [
        "초기에는 무료 기록 기능으로 사용자를 모으고, 이후 프리미엄 책 추천이나 통계 기능으로 수익화하는 것이 좋습니다",
      ]),
      additional: rec("월간 독서 리포트, 독서 streak, 인상 깊은 문장 저장, AI 책 추천", [
        "기록이 쌓일수록 가치가 커지는 기능들입니다",
      ]),
    },
  },
  {
    keywords: ["주식", "투자"],
    set: {
      targetUser: rec("초보 투자자, 미국주식에 관심 있는 개인 투자자", [
        "정보가 어려워 진입하지 못하는 초보 투자자가 가장 큰 잠재 사용자층입니다",
      ]),
      coreFeatures: rec("관심종목, 종목 검색, 뉴스 요약, 용어 설명, 포트폴리오 기록", [
        "초보 투자자는 어려운 정보를 쉽게 정리해주는 기능을 가장 필요로 합니다",
      ]),
      platform: rec("모바일 웹 또는 모바일 앱", [
        "시세 확인과 기록은 이동 중 모바일 사용 비중이 높습니다",
        "모바일 웹으로 시작하면 더 빠르게 출시할 수 있습니다",
      ], "모바일 웹"),
      auth: rec("필요합니다", ["관심종목, 포트폴리오 기록을 사용자별로 저장해야 합니다"]),
      payment: rec("나중에 추가할 예정입니다", [
        "먼저 무료 기능으로 사용자를 확보한 후 프리미엄 분석 기능으로 수익화하는 것이 좋습니다",
      ]),
      additional: rec("AI 뉴스 요약, 초보자용 투자 용어 설명, 관심종목 알림", [
        "초보 투자자의 재방문을 만드는 대표 기능들입니다",
      ]),
    },
  },
  {
    keywords: ["예약"],
    set: {
      targetUser: rec("1인샵 사장님, 미용실/네일샵/속눈썹샵 운영자", [
        "예약 관리가 가장 절실한 사용자는 혼자 매장을 운영하는 사장님입니다",
      ]),
      coreFeatures: rec("예약 등록, 예약 변경, 고객 관리, 알림, 관리자 페이지", [
        "예약의 등록·변경·알림이 서비스의 핵심 흐름입니다",
      ]),
      platform: rec("모바일 웹", [
        "사장님과 고객 모두 설치 없이 링크로 바로 사용할 수 있습니다",
      ]),
      auth: rec("필요합니다", ["매장별 예약과 고객 정보를 구분해서 저장해야 합니다"]),
      payment: rec("필요 없습니다", [
        "예약 자체는 결제 없이 운영하는 매장이 많고, 현장 결제로 시작할 수 있습니다",
      ]),
      additional: rec("카카오톡 알림, 예약 리마인더, 고객 메모, 노쇼 관리", [
        "예약 서비스의 만족도를 결정하는 운영 기능들입니다",
      ]),
    },
  },
  {
    keywords: ["운동", "헬스", "피트니스"],
    set: {
      targetUser: rec("운동 기록을 남기고 싶은 일반 사용자", [
        "전문 선수보다 습관을 만들고 싶은 일반 사용자가 훨씬 많습니다",
      ]),
      coreFeatures: rec("운동 기록, 루틴 관리, 목표 설정, 체중 변화 기록, 통계", [
        "기록과 루틴이 운동앱 사용을 지속시키는 핵심입니다",
      ]),
      platform: rec("모바일 앱", ["운동 직후 바로 기록하는 사용 패턴에 모바일 앱이 적합합니다"]),
      auth: rec("필요합니다", ["운동 기록과 체중 변화를 사용자별로 저장해야 합니다"]),
      payment: rec("나중에 추가할 예정입니다", [
        "무료 기록 기능으로 시작하고 프리미엄 루틴 추천으로 수익화하는 것이 좋습니다",
      ]),
      additional: rec("운동 루틴 추천, 주간 리포트, 사진 기록", [
        "변화를 눈으로 확인하게 해주는 기능이 지속 사용을 만듭니다",
      ]),
    },
  },
  {
    keywords: ["가계부", "지출", "소비"],
    set: {
      targetUser: rec("지출을 관리하고 싶은 직장인, 사회초년생", [
        "고정 수입이 생기면서 지출 관리를 시작하는 시기의 사용자입니다",
      ]),
      coreFeatures: rec("수입/지출 기록, 카테고리 분류, 월간 통계, 예산 설정", [
        "기록 → 분류 → 통계가 가계부의 기본 흐름입니다",
      ]),
      platform: rec("모바일 앱", ["지출 직후 바로 기록하는 사용 패턴에 모바일 앱이 적합합니다"]),
      auth: rec("필요합니다", ["개인 금융 기록을 안전하게 저장해야 합니다"]),
      payment: rec("나중에 추가할 예정입니다", [
        "무료 기록 기능으로 시작하고 소비 리포트 등 프리미엄 기능으로 확장하는 것이 좋습니다",
      ]),
      additional: rec("고정지출 관리, 카드값 계산, 소비 리포트", [
        "매달 반복되는 관리 부담을 줄여주는 기능들입니다",
      ]),
    },
  },
  {
    keywords: ["쇼핑몰", "쇼핑", "커머스", "판매"],
    set: {
      targetUser: rec("온라인으로 상품을 판매하려는 소상공인", [
        "자체 판매 채널이 필요한 소상공인이 핵심 사용자입니다",
      ]),
      coreFeatures: rec("상품 등록, 장바구니, 주문 관리, 결제, 관리자 페이지", [
        "상품 등록부터 주문·결제까지가 쇼핑몰의 필수 흐름입니다",
      ]),
      platform: rec("모바일 웹과 PC 웹 모두 필요", [
        "구매는 모바일, 상품 관리 등 운영은 PC에서 주로 이뤄집니다",
      ], "모두 필요"),
      auth: rec("필요합니다", ["주문 내역과 배송 정보를 사용자별로 관리해야 합니다"]),
      payment: rec("필요합니다", ["상품 판매에는 결제가 필수 기능입니다"]),
      additional: rec("재고 관리, 쿠폰, 리뷰, 배송 조회", [
        "판매와 재구매를 늘리는 대표 커머스 기능들입니다",
      ]),
    },
  },
  {
    keywords: ["배달"],
    set: {
      targetUser: rec("음식점 사장님과 배달 주문을 원하는 고객", [
        "주문을 받는 사장님과 주문하는 고객, 양쪽이 모두 사용자입니다",
      ]),
      coreFeatures: rec("메뉴 등록, 주문, 결제, 배달 상태, 관리자 페이지", [
        "주문 접수부터 배달 완료까지의 흐름이 핵심입니다",
      ]),
      platform: rec("모바일 앱", ["주문과 배달 상태 확인 모두 모바일 사용 비중이 압도적입니다"]),
      auth: rec("필요합니다", ["주문 내역과 배달 주소를 사용자별로 저장해야 합니다"]),
      payment: rec("필요합니다", ["배달 주문은 선결제가 기본 흐름입니다"]),
      additional: rec("주문 알림, 배달 상태 추적, 리뷰, 쿠폰", [
        "주문 경험과 재주문율을 높이는 기능들입니다",
      ]),
    },
  },
];

const DEFAULT_RECOMMENDATIONS: RecommendationSet = {
  targetUser: rec("이 서비스를 가장 자주 사용할 핵심 사용자", [
    "대상이 좁고 명확할수록 기능 우선순위가 분명해집니다",
    "초기 피드백을 빠르게 받아 개선할 수 있습니다",
  ]),
  coreFeatures: rec("사용자 문제를 해결하는 핵심 기능 3~5개", [
    "MVP는 없으면 서비스가 성립하지 않는 기능만 담는 것이 좋습니다",
  ]),
  platform: rec("모바일 웹", [
    "가장 빠르게 출시할 수 있고 모바일과 PC 모두 대응 가능합니다",
    "추후 앱으로 전환할 수 있습니다",
  ]),
  auth: rec("잘 모르겠습니다", [
    "핵심 기능이 정해지면 로그인 필요 여부가 자연스럽게 결정됩니다",
    "지금은 보류하고 기획 단계에서 다시 검토해도 됩니다",
  ]),
  payment: rec("나중에 추가할 예정입니다", [
    "먼저 사용자를 확보한 후 수익화 기능을 붙이는 것이 안전합니다",
  ]),
  additional: rec("관리자 페이지, 알림, 통계, 문의하기", [
    "대부분의 서비스에서 공통으로 필요한 보조 기능들입니다",
  ]),
};

interface RecommendApiResponse {
  success: boolean;
  recommendation?: {
    answer: string;
    reason: string;
    applyValue: string;
    extraQuestions: string[];
  };
  error?: string;
}

async function fetchAIRecommendation(
  idea: string,
  step: number,
  answers: InterviewAnswers
): Promise<AIRecommendation> {
  const stepDef = INTERVIEW_STEPS[step];
  const response = await fetch("/api/interview/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idea,
      currentStep: step + 1,
      question: stepDef.question,
      options: stepDef.type === "choice" ? stepDef.options : undefined,
      answers,
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = (await response.json()) as RecommendApiResponse;
  if (!data.success || !data.recommendation) throw new Error(data.error ?? "AI 추천 실패");

  const { answer, reason, applyValue, extraQuestions } = data.recommendation;
  return {
    answer,
    applyValue: applyValue || answer,
    reasons: reason ? [reason] : [],
    extraQuestions: extraQuestions ?? [],
  };
}

function getMockRecommendation(idea: string, step: number): AIRecommendation {
  const field = INTERVIEW_STEPS[step].field;
  const normalized = idea.trim();
  const preset = RECOMMENDATION_PRESETS.find((p) => p.keywords.some((k) => normalized.includes(k)));
  return (preset ? preset.set : DEFAULT_RECOMMENDATIONS)[field];
}

/* ---------- 페이지: AI 인터뷰 (단계형 플로우) ---------- */

function loadInterviewState(): { step: number; answers: InterviewAnswers } {
  const project = loadCurrentProject();
  const savedStep = typeof project.interviewStep === "number" ? project.interviewStep : 1;
  const savedAnswers =
    typeof project.interviewAnswers === "object" && project.interviewAnswers !== null
      ? (project.interviewAnswers as Partial<InterviewAnswers>)
      : {};
  const step = Math.min(Math.max(savedStep, 1), INTERVIEW_STEPS.length);
  return { step, answers: { ...EMPTY_ANSWERS, ...savedAnswers } };
}

function InterviewPage() {
  const navigate = useNavigate();
  const idea = loadCurrentIdea();

  const initial = loadInterviewState();
  const [stepIndex, setStepIndex] = useState(initial.step - 1);
  const [answers, setAnswers] = useState<InterviewAnswers>(initial.answers);
  const [showHelp, setShowHelp] = useState(false);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendNotice, setRecommendNotice] = useState("");

  const step = INTERVIEW_STEPS[stepIndex];
  const isLastStep = stepIndex === INTERVIEW_STEPS.length - 1;
  const value = answers[step.field];
  const isNextDisabled = step.required && value.trim().length === 0;

  const setValue = (v: string) => setAnswers((prev) => ({ ...prev, [step.field]: v }));

  const persist = (nextStep: number, nextAnswers: InterviewAnswers) => {
    updateCurrentProject({
      progress: 15,
      interviewStep: nextStep,
      interviewAnswers: nextAnswers,
    });
  };

  const moveTo = (nextIndex: number) => {
    persist(nextIndex + 1, answers);
    setStepIndex(nextIndex);
    setShowHelp(false);
    setRecommendation(null);
    setRecommendNotice("");
    window.scrollTo(0, 0);
  };

  const handleNext = () => {
    if (isNextDisabled) return;
    if (isLastStep) {
      updateCurrentProject({
        status: "planning",
        step: "planning-summary",
        progress: 25,
        interviewStep: INTERVIEW_STEPS.length,
        interviewAnswers: answers,
        prd: null, // 답변이 바뀌었을 수 있으므로 기획서는 새로 생성
      });
      navigate("/project/summary");
      return;
    }
    moveTo(stepIndex + 1);
  };

  const handlePrev = () => {
    if (stepIndex === 0) return;
    moveTo(stepIndex - 1);
  };

  const handleShowHelp = () => setShowHelp(true);

  const handleRecommend = async () => {
    if (isRecommending) return;
    setIsRecommending(true);
    setRecommendation(null);
    setRecommendNotice("");
    try {
      const result = await fetchAIRecommendation(idea, stepIndex, answers);
      setRecommendation(result);
    } catch {
      // Fallback: API 실패 시 Mock 추천 표시
      setRecommendation(getMockRecommendation(idea, stepIndex));
      setRecommendNotice("AI 추천 연결에 실패했습니다. 임시 추천을 표시합니다.");
    } finally {
      setIsRecommending(false);
    }
  };

  const handleApplyRecommendation = () => {
    if (!recommendation) return;

    let valueToApply = recommendation.applyValue;
    if (step.type === "choice" && step.options && !step.options.includes(valueToApply)) {
      const matched = step.options.find(
        (option) => valueToApply.includes(option) || recommendation.answer.includes(option)
      );
      if (matched) valueToApply = matched;
    }
    if (valueToApply.trim().length === 0) return; // 거부 응답(applyValue 없음)은 적용하지 않음

    const applied = { ...answers, [step.field]: valueToApply };
    setAnswers(applied);
    persist(stepIndex + 1, applied);
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-4 pb-[140px] animate-fadeIn md:items-center md:pt-10 md:pb-12">
      <div className="flex w-full flex-col gap-4 md:max-w-[680px]">
        <section className="rounded-[24px] border border-[#ECEEF2] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:p-8">
          <h1 className="text-[24px] font-bold text-ink-title">AI 인터뷰</h1>

          {idea.trim().length > 0 && (
            <div className="mt-3 rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3">
              <h2 className="text-[12px] font-semibold text-ink-body">입력한 아이디어</h2>
              <p className="mt-0.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-title">{idea}</p>
            </div>
          )}

          {/* 진행률 */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-ink-body">
                {stepIndex + 1} / {INTERVIEW_STEPS.length}
              </span>
              <span className="font-bold text-primary">{INTERVIEW_PROGRESS[stepIndex]}%</span>
            </div>
            <div className="mt-2">
              <ProgressBar progress={INTERVIEW_PROGRESS[stepIndex]} />
            </div>
          </div>

          {/* 질문 */}
          <h2 className="mt-6 text-[17px] font-bold leading-snug text-ink-title">{step.question}</h2>

          {/* 입력 영역 */}
          {step.type === "text" ? (
            <textarea
              key={step.field}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={step.placeholder}
              className="mt-4 min-h-[110px] w-full resize-none rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3.5 text-base leading-relaxed text-ink-title placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {step.options?.map((option) => {
                const isSelected = value === option;
                return (
                  <button
                    key={option}
                    onClick={() => setValue(option)}
                    className={
                      "flex items-center justify-center rounded-2xl border px-4 py-3.5 text-[15px] font-medium transition-colors duration-200 " +
                      (isSelected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-[#E5E8EB] bg-white text-ink-body hover:border-[#D1D5DB]")
                    }
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {/* 잘 모르겠습니다 / AI 추천받기 */}
          <div className="mt-3 flex gap-2.5">
            <button
              onClick={handleShowHelp}
              className="flex h-[42px] flex-1 items-center justify-center rounded-2xl border border-[#E5E8EB] bg-white text-[13px] font-medium text-ink-body transition-colors duration-200 hover:border-[#D1D5DB] hover:text-ink-title"
            >
              잘 모르겠습니다
            </button>
            <button
              onClick={handleRecommend}
              disabled={isRecommending}
              className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/5 text-[13px] font-semibold text-primary transition-colors duration-200 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
              </svg>
              AI 추천받기
            </button>
          </div>

          {/* 안내 (잘 모르겠습니다) */}
          {showHelp && (
            <div className="mt-3 animate-fadeIn rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3.5">
              <h3 className="text-[12px] font-semibold text-ink-body">안내</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-title">{step.help}</p>
            </div>
          )}

          {/* AI 추천 로딩 */}
          {isRecommending && (
            <div className="mt-3 animate-fadeIn rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3.5">
              <p className="flex items-center gap-2 text-[13px] font-medium text-primary">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden="true" />
                AI가 추천을 만드는 중입니다...
              </p>
            </div>
          )}

          {/* AI 추천 실패 안내 */}
          {recommendNotice && (
            <div className="mt-3 animate-fadeIn rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3">
              <p className="text-[13px] leading-relaxed text-ink-body">{recommendNotice}</p>
            </div>
          )}

          {/* AI 추천 */}
          {recommendation && (
            <div className="mt-3 animate-fadeIn rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3.5">
              <h3 className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
                </svg>
                AI 추천
              </h3>
              <p className="mt-1.5 text-[14px] font-semibold text-ink-title">추천: {recommendation.answer}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {recommendation.reasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-1.5 text-[13px] leading-relaxed text-ink-body">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {reason}
                  </li>
                ))}
              </ul>
              {recommendation.extraQuestions && recommendation.extraQuestions.length > 0 && (
                <div className="mt-3 border-t border-primary/15 pt-3">
                  <h4 className="text-[12px] font-semibold text-ink-body">추가로 생각해볼 질문</h4>
                  <ul className="mt-1 flex flex-col gap-1">
                    {recommendation.extraQuestions.map((q) => (
                      <li key={q} className="text-[13px] leading-relaxed text-ink-title">· {q}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={handleApplyRecommendation}
                className="mt-3 flex h-[42px] w-full items-center justify-center rounded-2xl bg-primary text-[13px] font-semibold text-white transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
              >
                추천 적용
              </button>
            </div>
          )}

          {/* 이전 / 다음 */}
          <div className="mt-6 flex gap-3">
            {stepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="flex h-[52px] flex-1 items-center justify-center rounded-2xl border border-[#E5E8EB] bg-white text-[15px] font-semibold text-ink-body transition-colors duration-200 hover:border-[#D1D5DB] hover:text-ink-title"
              >
                이전
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isNextDisabled}
              className="flex h-[52px] flex-[2] items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)] transition-all duration-200 enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLastStep ? "인터뷰 완료" : "다음"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ---------- AI 기획서(PRD) ---------- */

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

interface GeneratePRDResponse {
  success: boolean;
  project?: ProjectPRD;
  error?: string;
}

async function fetchGeneratePRD(
  idea: string,
  answers: InterviewAnswers,
  instruction?: string,
  currentPrd?: ProjectPRD
): Promise<ProjectPRD> {
  const response = await fetch("/api/project/generate-prd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, answers, instruction, currentPrd }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = (await response.json()) as GeneratePRDResponse;
  if (!data.success || !data.project) throw new Error(data.error ?? "기획서 생성 실패");
  return data.project;
}

function loadSavedPRD(): ProjectPRD | null {
  const project = loadCurrentProject();
  if (typeof project.prd === "object" && project.prd !== null) {
    return project.prd as ProjectPRD;
  }
  return null;
}

function savePRD(prd: ProjectPRD) {
  // 현재 프로젝트에 저장
  updateCurrentProject({ prd, title: prd.title, status: "planned", step: "prd" });

  // 프로젝트 목록에도 저장
  try {
    const current = loadCurrentProject();
    const id = typeof current.id === "string" ? current.id : "";
    if (!id) return;
    const raw = localStorage.getItem(PROJECTS_LIST_KEY);
    const list = raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];
    if (!Array.isArray(list)) return;
    const updated = list.map((p) =>
      p.id === id ? { ...p, prd, title: prd.title, status: "planned", step: "prd", updatedAt: new Date().toISOString() } : p
    );
    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(updated));
  } catch {
    // 목록 저장 실패는 무시 (현재 프로젝트에는 저장됨)
  }
}

/* ---------- AI UI 목업 ---------- */

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

interface GenerateUIResponse {
  success: boolean;
  ui?: ProjectUI;
  error?: string;
}

async function fetchGenerateUI(prd: ProjectPRD, instruction?: string, currentUi?: ProjectUI): Promise<ProjectUI> {
  const response = await fetch("/api/project/generate-ui", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project: {
        title: prd.title,
        summary: prd.summary,
        targetUsers: prd.targetUsers,
        coreFeatures: prd.coreFeatures,
        screens: prd.screens,
        database: prd.database,
        apis: prd.apis,
        mvp: prd.mvp,
      },
      instruction,
      currentUi,
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = (await response.json()) as GenerateUIResponse;
  if (!data.success || !data.ui) throw new Error(data.error ?? "UI 생성 실패");
  return data.ui;
}

function loadSavedUI(): ProjectUI | null {
  const project = loadCurrentProject();
  if (typeof project.ui === "object" && project.ui !== null) {
    return project.ui as ProjectUI;
  }
  return null;
}

function saveUI(ui: ProjectUI) {
  updateCurrentProject({ ui, status: "mockup", step: "ui-mockup" });

  try {
    const current = loadCurrentProject();
    const id = typeof current.id === "string" ? current.id : "";
    if (!id) return;
    const raw = localStorage.getItem(PROJECTS_LIST_KEY);
    const list = raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];
    if (!Array.isArray(list)) return;
    const updated = list.map((p) =>
      p.id === id ? { ...p, ui, status: "mockup", step: "ui-mockup", updatedAt: new Date().toISOString() } : p
    );
    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(updated));
  } catch {
    // 목록 저장 실패는 무시 (현재 프로젝트에는 저장됨)
  }
}

/* ---------- 페이지: AI 기획서 화면 ---------- */

function PRDSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[#ECEEF2] pt-4">
      <h2 className="text-[15px] font-bold text-ink-title">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function PRDList({ items, numbered = false }: { items: string[]; numbered?: boolean }) {
  if (items.length === 0) return <p className="text-[14px] text-ink-body">-</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <li key={item} className="flex items-start gap-2 text-[14px] leading-relaxed text-ink-title">
          {numbered ? (
            <span className="mt-[1px] shrink-0 text-[13px] font-bold text-primary">{index + 1}.</span>
          ) : (
            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          )}
          {item}
        </li>
      ))}
    </ul>
  );
}

type PRDStatus = "ready" | "loading" | "error";

function SummaryPage() {
  const [idea] = useState(() => loadCurrentIdea());
  const [answers] = useState<InterviewAnswers>(() => {
    const project = loadCurrentProject();
    const saved =
      typeof project.interviewAnswers === "object" && project.interviewAnswers !== null
        ? (project.interviewAnswers as Partial<InterviewAnswers>)
        : {};
    return { ...EMPTY_ANSWERS, ...saved };
  });
  const [prd, setPrd] = useState<ProjectPRD | null>(() => loadSavedPRD());
  const [status, setStatus] = useState<PRDStatus>(() => (loadSavedPRD() ? "ready" : "loading"));
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRequest, setEditRequest] = useState("");
  const pendingEditRef = useRef<{ instruction: string; prd: ProjectPRD } | null>(null);

  useEffect(() => {
    if (prd || status !== "loading") return;
    let cancelled = false;

    (async () => {
      try {
        const pending = pendingEditRef.current;
        pendingEditRef.current = null;
        const generated = await fetchGeneratePRD(idea, answers, pending?.instruction, pending?.prd);
        if (cancelled) return;
        savePRD(generated);
        setPrd(generated);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prd, status, idea, answers]);

  const handleRetry = () => setStatus("loading");

  const navigate = useNavigate();

  // 기획서 수정: 요청사항 입력 후 AI 재생성
  const handleEditRegenerate = () => {
    if (!prd || editRequest.trim().length === 0) return;
    pendingEditRef.current = { instruction: editRequest.trim(), prd };
    setIsEditOpen(false);
    setEditRequest("");
    setPrd(null);
    setStatus("loading");
    window.scrollTo(0, 0);
  };

  // 인터뷰 다시하기: 기존 답변 유지, 1단계부터
  const handleRedoInterview = () => {
    updateCurrentProject({ interviewStep: 1 });
    navigate("/project/interview");
  };

  // 생성 중 화면
  if (status === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pt-4 pb-[140px] animate-fadeIn md:pb-12">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" aria-hidden="true" />
        <div className="text-center">
          <p className="text-[16px] font-semibold text-ink-title">AI가 프로젝트를 분석하고 있습니다.</p>
          <p className="mt-1 text-[14px] text-ink-body">기획서를 생성하는 중입니다. (예상 5~15초)</p>
        </div>
      </main>
    );
  }

  // 실패 화면
  if (status === "error" || !prd) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pt-4 pb-[140px] animate-fadeIn md:pb-12">
        <p className="text-[16px] font-semibold text-ink-title">생성 실패</p>
        <p className="text-[14px] text-ink-body">기획서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
        <button
          onClick={handleRetry}
          className="flex h-[48px] w-full max-w-[280px] items-center justify-center rounded-2xl bg-primary text-[15px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          다시 시도
        </button>
      </main>
    );
  }

  // 기획서 화면
  return (
    <main className="flex flex-1 flex-col px-5 pt-4 pb-[140px] animate-fadeIn md:items-center md:pt-10 md:pb-12">
      <div className="flex w-full flex-col gap-4 md:max-w-[680px]">
        <section className="flex flex-col gap-4 rounded-[24px] border border-[#ECEEF2] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:p-8">
          <div>
            <span className="text-[12px] font-semibold text-primary">AI 기획서</span>
            <h1 className="mt-1 text-[24px] font-bold leading-snug text-ink-title">{prd.title}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-body">{prd.summary}</p>
          </div>

          <PRDSection title="해결하려는 문제">
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-title">{prd.problem}</p>
          </PRDSection>

          <PRDSection title="서비스 설명">
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-title">{prd.solution}</p>
          </PRDSection>

          <PRDSection title="대상 사용자">
            <PRDList items={prd.targetUsers} />
          </PRDSection>

          <PRDSection title="핵심 기능">
            <PRDList items={prd.coreFeatures} />
          </PRDSection>

          {prd.userFlow.length > 0 && (
            <PRDSection title="사용자 플로우">
              <div className="flex flex-wrap items-center gap-y-1.5 rounded-2xl bg-[#F8FAFC] px-4 py-3">
                {prd.userFlow.map((flow, index) => (
                  <span key={flow + index} className="flex items-center text-[13px] font-medium text-ink-title">
                    {flow}
                    {index < prd.userFlow.length - 1 && <span className="mx-1.5 text-primary" aria-hidden="true">→</span>}
                  </span>
                ))}
              </div>
            </PRDSection>
          )}

          <PRDSection title="화면 구성">
            <PRDList items={prd.screens} />
          </PRDSection>

          <PRDSection title="DB 구조">
            <PRDList items={prd.database} />
          </PRDSection>

          <PRDSection title="API 목록">
            <ul className="flex flex-col gap-1.5 rounded-2xl bg-[#F8FAFC] px-4 py-3">
              {prd.apis.length === 0 && <li className="text-[13px] text-ink-body">-</li>}
              {prd.apis.map((api) => (
                <li key={api} className="break-all font-mono text-[12.5px] leading-relaxed text-ink-title">
                  {api}
                </li>
              ))}
            </ul>
          </PRDSection>

          <PRDSection title="관리자 기능">
            <PRDList items={prd.adminFeatures} />
          </PRDSection>

          <PRDSection title="개발 순서">
            <PRDList items={prd.developmentOrder} numbered />
          </PRDSection>

          <PRDSection title="MVP 범위">
            <PRDList items={prd.mvp} />
          </PRDSection>

          <PRDSection title="추후 업데이트">
            <PRDList items={prd.futureFeatures} />
          </PRDSection>

          <PRDSection title="추천 기술스택">
            <ul className="flex flex-col divide-y divide-[#ECEEF2] overflow-hidden rounded-2xl border border-[#E5E8EB]">
              {[
                { label: "Frontend", value: prd.techStack.frontend },
                { label: "Backend", value: prd.techStack.backend },
                { label: "Database", value: prd.techStack.database },
                { label: "Deploy", value: prd.techStack.deploy },
              ].map((row) => (
                <li key={row.label} className="bg-[#F8FAFC] px-4 py-3">
                  <h3 className="text-[12px] font-semibold text-ink-body">{row.label}</h3>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-ink-title">{row.value || "-"}</p>
                </li>
              ))}
            </ul>
          </PRDSection>
        </section>

        {/* 다음 단계 버튼 */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => navigate("/project/mockup")}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="3" width="16" height="18" rx="2.5" />
              <path d="M4 8h16M9 21V8" />
            </svg>
            UI 목업 생성
          </button>

          <button
            onClick={() => setIsEditOpen((prev) => !prev)}
            className="flex h-[48px] w-full items-center justify-center rounded-2xl border border-[#E5E8EB] bg-white text-[14px] font-semibold text-ink-title transition-colors duration-200 hover:border-[#D1D5DB]"
          >
            기획서 수정
          </button>

          {isEditOpen && (
            <div className="animate-fadeIn rounded-[20px] border border-[#E5E8EB] bg-white p-4">
              <h3 className="text-[13px] font-semibold text-ink-title">어떻게 수정할까요?</h3>
              <textarea
                value={editRequest}
                onChange={(e) => setEditRequest(e.target.value)}
                placeholder="예: 결제 기능 빼줘 / 커뮤니티 기능 추가해줘 / MVP를 더 작게 줄여줘"
                className="mt-2 min-h-[80px] w-full resize-none rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3 text-base leading-relaxed text-ink-title placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleEditRegenerate}
                disabled={editRequest.trim().length === 0}
                className="mt-2 flex h-[44px] w-full items-center justify-center rounded-2xl bg-primary text-[14px] font-semibold text-white transition-all duration-200 enabled:hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
              >
                AI 재생성
              </button>
            </div>
          )}

          <button
            onClick={handleRedoInterview}
            className="flex h-[48px] w-full items-center justify-center rounded-2xl border border-[#E5E8EB] bg-white text-[14px] font-semibold text-ink-body transition-colors duration-200 hover:border-[#D1D5DB] hover:text-ink-title"
          >
            인터뷰 다시하기
          </button>
        </div>
      </div>
    </main>
  );
}

/* ---------- 페이지: UI 목업 ---------- */

// 컴포넌트 이름을 목업 블록으로 변환
function MockBlock({ label }: { label: string }) {
  const has = (...keys: string[]) => keys.some((k) => label.includes(k));

  if (has("검색")) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-xl bg-[#F3F4F6] px-3">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="text-[11px] text-[#9CA3AF]">{label}</span>
      </div>
    );
  }
  if (has("배너")) {
    return <div className="flex h-16 items-center justify-center rounded-xl bg-gradient-to-r from-primary/70 to-accent/60 text-[11px] font-semibold text-white">{label}</div>;
  }
  if (has("차트", "그래프", "통계")) {
    return (
      <div className="rounded-xl border border-[#ECEEF2] p-3">
        <p className="text-[10px] font-semibold text-ink-body">{label}</p>
        <div className="mt-2 flex h-14 items-end gap-1.5">
          {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    );
  }
  if (has("카드")) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-[#ECEEF2] p-2.5">
            <div className="h-10 rounded-lg bg-[#F3F4F6]" />
            <div className="mt-1.5 h-2 w-3/4 rounded bg-[#E5E8EB]" />
            <div className="mt-1 h-2 w-1/2 rounded bg-[#F3F4F6]" />
          </div>
        ))}
      </div>
    );
  }
  if (has("리스트", "목록", "알림", "체크")) {
    return (
      <div className="divide-y divide-[#ECEEF2] rounded-xl border border-[#ECEEF2]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2">
            <div className="h-6 w-6 shrink-0 rounded-lg bg-[#F3F4F6]" />
            <div className="min-w-0 flex-1">
              <div className="h-2 w-2/3 rounded bg-[#E5E8EB]" />
              <div className="mt-1 h-2 w-1/3 rounded bg-[#F3F4F6]" />
            </div>
          </div>
        ))}
        <p className="px-3 py-1.5 text-[9px] text-ink-body">{label}</p>
      </div>
    );
  }
  if (has("프로필")) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-[#ECEEF2] p-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-[#E5E8EB]" />
        <div className="min-w-0 flex-1">
          <div className="h-2.5 w-1/2 rounded bg-[#E5E8EB]" />
          <div className="mt-1.5 h-2 w-2/3 rounded bg-[#F3F4F6]" />
        </div>
      </div>
    );
  }
  if (has("이미지", "사진", "갤러리")) {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="aspect-square rounded-lg bg-[#F3F4F6]" />
        ))}
      </div>
    );
  }
  if (has("캘린더", "달력", "일정")) {
    return (
      <div className="rounded-xl border border-[#ECEEF2] p-3">
        <p className="text-[10px] font-semibold text-ink-body">{label}</p>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {Array.from({ length: 21 }).map((_, i) => (
            <div key={i} className={"aspect-square rounded " + (i === 9 ? "bg-primary/70" : "bg-[#F3F4F6]")} />
          ))}
        </div>
      </div>
    );
  }
  if (has("탭")) {
    return (
      <div className="flex gap-1 rounded-xl bg-[#F3F4F6] p-1">
        {["탭 1", "탭 2", "탭 3"].map((t, i) => (
          <div key={t} className={"flex-1 rounded-lg py-1.5 text-center text-[10px] font-medium " + (i === 0 ? "bg-white text-ink-title shadow-sm" : "text-ink-body")}>{t}</div>
        ))}
      </div>
    );
  }
  if (has("입력", "폼")) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-9 rounded-xl border border-[#E5E8EB] bg-[#F8FAFC] px-3 py-2.5 text-[10px] text-[#9CA3AF]">{label}</div>
        <div className="h-9 rounded-xl border border-[#E5E8EB] bg-[#F8FAFC]" />
      </div>
    );
  }
  if (has("지도")) {
    return (
      <div className="relative h-20 overflow-hidden rounded-xl bg-[#E8F0E9]">
        <div className="absolute left-1/4 top-1/3 h-2 w-2 rounded-full bg-primary" />
        <div className="absolute left-2/3 top-1/2 h-2 w-2 rounded-full bg-accent" />
        <p className="absolute bottom-1 right-2 text-[9px] text-ink-body">{label}</p>
      </div>
    );
  }
  if (has("채팅")) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="max-w-[70%] self-start rounded-2xl rounded-tl-sm bg-[#F3F4F6] px-3 py-1.5 text-[10px] text-ink-body">메시지</div>
        <div className="max-w-[70%] self-end rounded-2xl rounded-tr-sm bg-primary/80 px-3 py-1.5 text-[10px] text-white">답장</div>
      </div>
    );
  }
  if (has("FAB")) {
    return (
      <div className="flex justify-end">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </div>
      </div>
    );
  }
  if (has("버튼")) {
    return <div className="flex h-10 items-center justify-center rounded-xl bg-primary text-[11px] font-semibold text-white">{label}</div>;
  }
  if (has("메뉴", "설정")) {
    return (
      <div className="divide-y divide-[#ECEEF2] rounded-xl border border-[#ECEEF2]">
        {[label, "항목", "항목"].map((t, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 text-[10px] text-ink-title">
            {t}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </div>
        ))}
      </div>
    );
  }
  return <div className="flex h-10 items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] text-[10px] text-ink-body">{label}</div>;
}

type MockupStatus = "ready" | "loading" | "error";

function MockupPage() {
  const navigate = useNavigate();
  const [prd] = useState<ProjectPRD | null>(() => loadSavedPRD());
  const [ui, setUi] = useState<ProjectUI | null>(() => loadSavedUI());
  const [status, setStatus] = useState<MockupStatus>(() => (loadSavedUI() ? "ready" : "loading"));
  const [selectedId, setSelectedId] = useState<string>(() => loadSavedUI()?.screens[0]?.id ?? "");
  const [instruction, setInstruction] = useState("");
  const pendingInstructionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!prd || status !== "loading") return;
    let cancelled = false;

    (async () => {
      try {
        const pending = pendingInstructionRef.current;
        pendingInstructionRef.current = undefined;
        const generated = await fetchGenerateUI(prd, pending, pending ? ui ?? undefined : undefined);
        if (cancelled) return;
        saveUI(generated);
        setUi(generated);
        setSelectedId((prev) => (generated.screens.some((sc) => sc.id === prev) ? prev : generated.screens[0]?.id ?? ""));
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prd, status, ui]);

  // 기획서가 없으면 목업을 만들 수 없음
  if (!prd) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-5 pt-4 pb-[140px] animate-fadeIn md:pb-12">
        <p className="text-[15px] text-ink-body">먼저 인터뷰를 완료하고 기획서를 생성해주세요.</p>
        <button
          onClick={() => navigate("/project/summary")}
          className="flex h-[48px] w-full max-w-[280px] items-center justify-center rounded-2xl bg-primary text-[15px] font-semibold text-white"
        >
          기획서 화면으로
        </button>
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pt-4 pb-[140px] animate-fadeIn md:pb-12">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" aria-hidden="true" />
        <div className="text-center">
          <p className="text-[16px] font-semibold text-ink-title">AI가 화면을 설계하고 있습니다.</p>
          <p className="mt-1 text-[14px] text-ink-body">UI 목업을 생성하는 중입니다. (예상 5~15초)</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !ui) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pt-4 pb-[140px] animate-fadeIn md:pb-12">
        <p className="text-[16px] font-semibold text-ink-title">생성 실패</p>
        <p className="text-[14px] text-ink-body">UI 목업 생성에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
        <button
          onClick={() => setStatus("loading")}
          className="flex h-[48px] w-full max-w-[280px] items-center justify-center rounded-2xl bg-primary text-[15px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          다시 시도
        </button>
      </main>
    );
  }

  const selected = ui.screens.find((sc) => sc.id === selectedId) ?? ui.screens[0];
  const isBottomTab = ui.navigation.includes("Bottom") || ui.navigation.includes("혼합");

  const handleModify = () => {
    if (instruction.trim().length === 0) return;
    pendingInstructionRef.current = instruction.trim();
    setInstruction("");
    setStatus("loading");
    window.scrollTo(0, 0);
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-4 pb-[140px] animate-fadeIn md:items-center md:pt-8 md:pb-12">
      <div className="flex w-full flex-col gap-4 md:max-w-[1080px]">
        <div>
          <span className="text-[12px] font-semibold text-primary">AI UI 목업</span>
          <h1 className="mt-1 text-[22px] font-bold text-ink-title">{prd.title}</h1>
          <p className="mt-1 text-[13px] text-ink-body">
            스타일: {ui.theme || "-"} · 내비게이션: {ui.navigation || "-"}
          </p>
        </div>

        {ui.flow.length > 0 && (
          <div className="flex flex-wrap items-center gap-y-1.5 rounded-2xl border border-[#ECEEF2] bg-white px-4 py-3">
            {ui.flow.map((f, index) => (
              <span key={f + index} className="flex items-center text-[12px] font-medium text-ink-title">
                {f}
                {index < ui.flow.length - 1 && <span className="mx-1.5 text-primary" aria-hidden="true">→</span>}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {/* 왼쪽: 화면 목록 */}
          <nav className="shrink-0 md:w-[180px]" aria-label="화면 목록">
            <ul className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
              {ui.screens.map((screen) => {
                const isActive = screen.id === selected.id;
                return (
                  <li key={screen.id} className="shrink-0 md:shrink">
                    <button
                      onClick={() => setSelectedId(screen.id)}
                      className={
                        "w-full whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-[13px] transition-colors duration-200 md:whitespace-normal " +
                        (isActive
                          ? "bg-primary/10 font-semibold text-primary"
                          : "bg-white font-medium text-ink-body border border-[#ECEEF2] hover:border-[#D1D5DB]")
                      }
                    >
                      {screen.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* 가운데: 미리보기 (폰 프레임) */}
          <div className="flex flex-1 justify-center">
            <div className="w-full max-w-[300px] overflow-hidden rounded-[28px] border-[6px] border-[#111827] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
              <div className="flex h-8 items-center justify-center border-b border-[#ECEEF2] bg-white">
                <span className="truncate px-4 text-[11px] font-bold text-ink-title">{selected.name}</span>
              </div>
              <div className="flex min-h-[380px] flex-col gap-2.5 bg-[#F8FAFC] p-3">
                {selected.components.length === 0 && (
                  <p className="py-10 text-center text-[11px] text-ink-body">구성 컴포넌트가 없습니다.</p>
                )}
                {selected.components.map((component, index) => (
                  <MockBlock key={component + index} label={component} />
                ))}
              </div>
              {isBottomTab && (
                <div className="flex items-center justify-around border-t border-[#ECEEF2] bg-white py-1.5">
                  {ui.screens.slice(0, 4).map((screen) => (
                    <button key={screen.id} onClick={() => setSelectedId(screen.id)} className="flex flex-col items-center gap-0.5 px-1">
                      <span className={"h-4 w-4 rounded " + (screen.id === selected.id ? "bg-primary" : "bg-[#D1D5DB]")} aria-hidden="true" />
                      <span className={"max-w-[52px] truncate text-[8.5px] " + (screen.id === selected.id ? "font-semibold text-primary" : "text-[#9CA3AF]")}>{screen.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: AI 설명 + 수정 요청 */}
          <div className="flex flex-col gap-3 md:w-[300px] md:shrink-0">
            <section className="rounded-2xl border border-[#ECEEF2] bg-white p-4">
              <h2 className="text-[13px] font-bold text-ink-title">AI 설명</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-body">{selected.description || "-"}</p>
              {selected.components.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.components.map((component, index) => (
                    <span key={component + index} className="rounded-badge bg-[#F3F4F6] px-2 py-0.5 text-[10.5px] font-medium text-ink-body">
                      {component}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
                </svg>
                AI로 수정하기
              </h2>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="예: 홈에 차트 추가 / 검색창 제거 / 채팅 화면 추가 / 토스 느낌으로"
                className="mt-2 min-h-[80px] w-full resize-none rounded-xl border border-[#E5E8EB] bg-white px-3 py-2.5 text-base leading-relaxed text-ink-title placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleModify}
                disabled={instruction.trim().length === 0}
                className="mt-2 flex h-[42px] w-full items-center justify-center rounded-xl bg-primary text-[13px] font-semibold text-white transition-all duration-200 enabled:hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
              >
                AI 수정 요청
              </button>
            </section>

            <button
              onClick={() => navigate("/project/summary")}
              className="flex h-[44px] w-full items-center justify-center rounded-xl border border-[#E5E8EB] bg-white text-[13px] font-semibold text-ink-body transition-colors duration-200 hover:border-[#D1D5DB] hover:text-ink-title"
            >
              기획서로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------- 페이지: Project Detail ---------- */

function ProjectDetailPage() {
  const { projectId } = useParams();
  const project = RECENT_PROJECTS.find((p) => p.id === projectId);

  if (!project) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-3 animate-fadeIn">
        <p className="text-[15px] text-ink-body">프로젝트를 찾을 수 없습니다.</p>
        <BackButton label="Home으로 돌아가기" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-[140px] animate-fadeIn md:mx-auto md:w-full md:max-w-[640px] md:pt-8 md:pb-10">
      <BackButton label="Home으로 돌아가기" />

      <section className="rounded-[24px] border border-[#ECEEF2] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-[0_6px_14px_-4px_rgba(79,107,255,0.4)]"
            style={{ background: `linear-gradient(135deg, ${project.colorFrom}, ${project.colorTo})` }}
          >
            <ProjectIcon type={project.icon} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-bold text-ink-title">{project.name}</h1>
            <p className="mt-0.5 text-[12px] text-ink-body">마지막 수정 {project.updatedAt}</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink-body">진행률</span>
            <span className="text-[13px] font-bold text-primary">{project.progress}%</span>
          </div>
          <div className="mt-2">
            <ProgressBar progress={project.progress} />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-ink-body">현재 단계</span>
          <span className="rounded-badge bg-[#F3F4F6] px-3 py-1 text-[12px] font-medium text-ink-title">
            {project.phase}
          </span>
        </div>
      </section>
    </main>
  );
}

/* ---------- 페이지: Placeholder (프로젝트 목록 / 오늘 할 일 / 설정) ---------- */

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-3 animate-fadeIn">
      <h1 className="text-[22px] font-bold text-ink-title">{title}</h1>
      <p className="text-[14px] text-ink-body">{description}</p>
    </main>
  );
}

/* ---------- Header (데스크톱: 상단 메뉴 포함) ---------- */

function AppHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <header className="h-[76px] md:h-20 shrink-0 flex items-center justify-between px-5 md:px-8 lg:px-10 border-b border-[#E5E8EB] animate-slideDown bg-white">
      <div className="flex items-center gap-2">
        <img src={logo} alt="OneTech" className="h-12 w-12 shrink-0 object-contain animate-logoIn" />
        <span className="flex items-center text-[24px] md:text-[26px] font-bold text-ink-title tracking-tight leading-none">
          AI Builder
        </span>
      </div>

      {/* 데스크톱 전용 네비게이션 (모바일은 하단 탭바 사용) */}
      <nav className="hidden md:block" aria-label="주 메뉴">
        <ul className="flex items-center gap-2 lg:gap-4">
          {NAV_ROUTES.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.path)}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    "rounded-badge px-4 py-2 text-[15px] transition-colors duration-200 " +
                    (isActive
                      ? "bg-primary/10 font-semibold text-primary"
                      : "font-medium text-ink-body hover:bg-[#F3F4F6] hover:text-ink-title")
                  }
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        aria-label="프로필"
        className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-[#F3F4F6] flex items-center justify-center text-ink-title"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
      </button>
    </header>
  );
}

/* ---------- Bottom Navigation (모바일 전용, 라우팅 연동) ---------- */

function NavIcon({ id, active }: { id: NavId; active: boolean }) {
  const color = active ? "#4F6BFF" : "#9CA3AF";
  const size = active ? 24 : 22;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "transition-all duration-200",
  };
  switch (id) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 11.5L12 5l8 6.5" />
          <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
        </svg>
      );
    case "projects":
      return (
        <svg {...common}>
          <path d="M4 7a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...common}>
          <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
          <path d="M8.5 12.5l2.2 2.2 4.5-4.9" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5a1.7 1.7 0 0 0 1.04-1.56V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.5a1.7 1.7 0 0 0 1.56 1.04H19.5a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04z" />
        </svg>
      );
  }
}

function AppBottomNavigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="sticky bottom-0 z-20 shrink-0 animate-fadeIn md:hidden">
      <div className="h-[68px] w-full bg-white/90 backdrop-blur-md border-t border-[#ECEEF2] shadow-[0_-4px_12px_rgba(15,23,42,0.04)] px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
        <ul className="flex h-full items-center justify-between">
          {NAV_ROUTES.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.id} className="flex-1">
                <button
                  onClick={() => navigate(item.path)}
                  className="group flex w-full flex-col items-center gap-1 py-1 transition-colors duration-200 active:scale-95"
                  aria-current={isActive ? "page" : undefined}
                >
                  <NavIcon id={item.id} active={isActive} />
                  <span
                    className={
                      "text-[11px] transition-colors duration-200 " +
                      (isActive
                        ? "text-primary font-semibold"
                        : "text-[#9CA3AF] font-medium group-hover:text-[#6B7280]")
                    }
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/* ---------- 페이지 이동 시 스크롤 맨 위로 ---------- */

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

/* ---------- App (라우터 구성) ---------- */

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="mx-auto flex min-h-[100dvh] w-full flex-col bg-white lg:max-w-[1440px] xl:px-4">
        <AppHeader />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/create" element={<ProjectCreatePage />} />
          <Route path="/project/interview" element={<InterviewPage />} />
          <Route path="/project/summary" element={<SummaryPage />} />
          <Route path="/project/mockup" element={<MockupPage />} />
          <Route path="/project/:projectId" element={<ProjectDetailPage />} />
          <Route path="/projects" element={<PlaceholderPage title="프로젝트 목록" description="프로젝트 목록 화면을 준비 중입니다." />} />
          <Route path="/todo" element={<PlaceholderPage title="오늘 할 일" description="할 일 화면을 준비 중입니다." />} />
          <Route path="/setting" element={<PlaceholderPage title="설정" description="설정 화면을 준비 중입니다." />} />
        </Routes>

        <AppBottomNavigation />
      </div>
    </BrowserRouter>
  );
}
