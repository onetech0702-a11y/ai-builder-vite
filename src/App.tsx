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
    <main className="flex flex-1 flex-col gap-3 px-5 py-3 md:min-h-0 md:flex-row md:gap-6 md:overflow-hidden md:px-8 md:py-5 lg:gap-8 lg:px-10">
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
    <main className="flex flex-1 flex-col px-5 py-4 animate-fadeIn md:items-center md:py-10">
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

/* ---------- 페이지: AI 인터뷰 ---------- */

function InterviewPage() {
  const idea = loadCurrentIdea();
  const [answer, setAnswer] = useState("");

  const handleNext = () => {
    console.log("AI 인터뷰 - 다음 클릭:", { idea, answer });
  };

  return (
    <main className="flex flex-1 flex-col px-5 py-4 animate-fadeIn md:items-center md:py-10">
      <div className="flex w-full flex-col gap-4 md:max-w-[680px]">
        <section className="rounded-[24px] border border-[#ECEEF2] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:p-8">
          <h1 className="text-[24px] font-bold text-ink-title">AI 인터뷰</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-body">
            입력한 아이디어를 바탕으로 프로젝트 기획을 시작합니다.
          </p>

          <div className="mt-6 rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3.5">
            <h2 className="text-[13px] font-semibold text-ink-body">입력한 아이디어</h2>
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-title">
              {idea.trim().length > 0 ? idea : "아직 입력한 아이디어가 없습니다."}
            </p>
          </div>

          <div className="mt-6">
            <h2 className="text-[15px] font-semibold text-ink-title">이 서비스는 누구를 위한 서비스인가요?</h2>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="예: 초보 투자자, 미용실 사장님, 헬스장 회원 등"
              className="mt-3 min-h-[100px] w-full resize-none rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3.5 text-base leading-relaxed text-ink-title placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <button
            onClick={handleNext}
            className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            다음
          </button>
        </section>
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
    <main className="flex flex-1 flex-col gap-4 px-5 py-4 animate-fadeIn md:mx-auto md:w-full md:max-w-[640px] md:py-8">
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

/* ---------- App (라우터 구성) ---------- */

export default function App() {
  return (
    <BrowserRouter>
      <div className="mx-auto flex min-h-[100dvh] w-full flex-col bg-white md:h-[100dvh] md:overflow-hidden lg:max-w-[1440px] xl:px-4">
        <AppHeader />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/create" element={<ProjectCreatePage />} />
          <Route path="/project/interview" element={<InterviewPage />} />
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
