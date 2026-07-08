import { useEffect, useState } from "react";
import logo from "./assets/onetech-logo.png";

//================================================================
// Types & Mock Data
//================================================================
type ProjectPhase = "기획 단계" | "개발 단계" | "테스트 단계";

interface Project {
  id: string;
  name: string;
  updatedAt: string;
  progress: number;
  phase: ProjectPhase;
  icon: "folder" | "chart" | "calendar";
  colorFrom: string;
  colorTo: string;
}

const RECENT_PROJECTS: Project[] = [
  {
    id: "shopping",
    name: "AI 쇼핑몰 솔루션",
    updatedAt: "2026. 07. 02",
    progress: 75,
    phase: "기획 단계",
    icon: "folder",
    colorFrom: "#6D7CFF",
    colorTo: "#4F6BFF",
  },
  {
    id: "stock",
    name: "주식 분석 대시보드",
    updatedAt: "2026. 07. 01",
    progress: 45,
    phase: "개발 단계",
    icon: "chart",
    colorFrom: "#34D399",
    colorTo: "#22C55E",
  },
  {
    id: "reservation",
    name: "예약 관리 시스템",
    updatedAt: "2026. 06. 30",
    progress: 20,
    phase: "기획 단계",
    icon: "calendar",
    colorFrom: "#A78BFA",
    colorTo: "#8B5CF6",
  },
];

type TaskStatus = "done" | "inProgress" | "pending";

interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  time: string;
}

const TODAY_TASKS: TaskItem[] = [
  { id: "t1", title: "홈 화면 UI 개선", status: "done", time: "10:30" },
  { id: "t2", title: "로고 적용 및 브랜드 가이드 반영", status: "done", time: "11:20" },
  { id: "t3", title: "프로젝트 생성 화면 설계", status: "inProgress", time: "13:00" },
  { id: "t4", title: "AI Builder 핵심 플로우 정의", status: "pending", time: "-" },
  { id: "t5", title: "데이터베이스 구조 설계", status: "pending", time: "-" },
];

type NavId = "home" | "projects" | "tasks" | "settings";

interface NavItem {
  id: NavId;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "홈" },
  { id: "projects", label: "프로젝트" },
  { id: "tasks", label: "할 일" },
  { id: "settings", label: "설정" },
];

const PLACEHOLDER_EXAMPLES = [
  "AI 주식 앱을 만들고 싶어요",
  "예약 관리 시스템",
  "쇼핑몰 서비스",
  "운동 기록 앱",
  "가계부 앱",
];
const PLACEHOLDER_INTERVAL_MS = 2400;

//================================================================
// AppContainer - Header/Main/BottomNav 공통 정렬 컨테이너
//================================================================
function AppContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full px-5 md:max-w-[820px] md:px-6 dt:max-w-[1240px] dt:px-8 ${className}`}>
      {children}
    </div>
  );
}

//================================================================
// ProgressBar
//================================================================
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1.5 w-full rounded-badge bg-[#ECEEF2] overflow-hidden">
      <div
        className="h-full rounded-badge bg-primary transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

//================================================================
// StatusBadge
//================================================================
const STATUS_MAP: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  done: { label: "완료", bg: "#DCFCE7", text: "#16A34A" },
  inProgress: { label: "진행중", bg: "#DBEAFE", text: "#2563EB" },
  pending: { label: "대기", bg: "#F3F4F6", text: "#6B7280" },
};

function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUS_MAP[status];
  return (
    <span className="shrink-0 rounded-badge px-2.5 py-1 text-[11px] font-semibold" style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

//================================================================
// Header
//================================================================
function Header() {
  return (
    <header className="shrink-0 border-b border-[#E5E8EB] bg-white animate-slideDown">
      <AppContainer className="h-[76px] md:h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="OneTech" className="h-12 w-12 shrink-0 object-contain animate-logoIn" />
          <span className="flex items-center text-[24px] md:text-[26px] font-bold text-ink-title tracking-tight leading-none">
            AI Builder
          </span>
        </div>

        <button
          aria-label="프로필"
          className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-[#F3F4F6] flex items-center justify-center text-ink-title"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
          </svg>
        </button>
      </AppContainer>
    </header>
  );
}

//================================================================
// HeroCard
//================================================================
function HeroCard({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <section className="w-full shrink-0 animate-slideUp bg-gradient-to-br from-[#F8FAFC] to-[#EEF6FF] p-7 md:p-8">
      <span className="text-[14px] font-semibold text-primary">AI Builder</span>

      <h1 className="mt-2.5 text-[29px] md:text-[32px] font-bold leading-[1.25] text-ink-title tracking-tight">
        AI 하나로
        <br />
        IT 서비스를 런칭하세요.
      </h1>

      <p className="mt-3 text-[15px] text-ink-body leading-relaxed">
        아이디어를 현실로 만들고,
        <br />
        더 빠르게 시장에 출시하세요.
      </p>

      <button
        onClick={onCreateProject}
        className="mt-5 flex h-[60px] w-full items-center justify-center gap-2 rounded-[17px] bg-primary px-8 text-[16px] font-bold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_8px_20px_-2px_rgba(79,107,255,0.55)] active:scale-[0.98]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        새 프로젝트 만들기
      </button>
    </section>
  );
}

//================================================================
// IdeaInputCard
//================================================================
function IdeaInputCard({ onStartWithAI }: { onStartWithAI: () => void }) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, PLACEHOLDER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="flex flex-1 flex-col border-t border-[#ECEEF2] bg-white p-6 md:p-7 animate-slideUp">
      <h2 className="text-[17px] font-bold text-ink-title">무엇을 만들고 싶나요?</h2>

      <textarea
        readOnly
        placeholder={`예: ${PLACEHOLDER_EXAMPLES[placeholderIndex]}`}
        key={placeholderIndex}
        className="mt-3 h-[100px] w-full resize-none rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3.5 text-[14px] text-ink-title placeholder:text-ink-body placeholder:transition-opacity placeholder:duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <button
        onClick={onStartWithAI}
        className="mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
        </svg>
        AI와 함께 시작하기
      </button>
    </section>
  );
}

//================================================================
// ProjectListItem (RecentProjects 내부)
//================================================================
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

function ProjectListItem({ project }: { project: Project }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3.5">
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

//================================================================
// RecentProjects
//================================================================
function RecentProjects({ onViewAll }: { onViewAll: () => void }) {
  return (
    <section className="animate-fadeIn">
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
        {RECENT_PROJECTS.map((project) => (
          <ProjectListItem key={project.id} project={project} />
        ))}
      </ul>
    </section>
  );
}

//================================================================
// TaskListItem (TodayTasks 내부)
//================================================================
function TaskListItem({ task, onToggle }: { task: TaskItem; onToggle: (id: string) => void }) {
  return (
    <li className="flex min-h-[60px] items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-[#FAFBFC]">
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

      <div className="hidden sm:flex w-[76px] shrink-0 justify-center">
        <StatusBadge status={task.status} />
      </div>
      <div className="sm:hidden shrink-0">
        <StatusBadge status={task.status} />
      </div>

      <span className="hidden sm:inline shrink-0 w-12 text-right text-[12px] text-ink-body">{task.time}</span>

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

//================================================================
// TodayTasks
//================================================================
function TodayTasks({ onViewAll }: { onViewAll: () => void }) {
  const [tasks, setTasks] = useState(TODAY_TASKS);

  const handleToggle = (id: string) => {
    console.log("toggle task", id);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === "done" ? "pending" : "done" } : t))
    );
  };

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const totalCount = tasks.length;
  const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  return (
    <section className="animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-ink-title">오늘 할 일</h2>
        <button onClick={onViewAll} className="flex items-center gap-0.5 text-[13px] font-medium text-primary">
          전체 보기
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="mt-3.5 overflow-hidden rounded-[24px] border border-[#ECEEF2] bg-white">
        <div className="border-b border-[#ECEEF2] px-4 py-3">
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

        <ul className="divide-y divide-[#ECEEF2]">
          {tasks.map((task) => (
            <TaskListItem key={task.id} task={task} onToggle={handleToggle} />
          ))}
        </ul>
      </div>
    </section>
  );
}

//================================================================
// BottomNavigation
//================================================================
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

function BottomNavigation() {
  const [active, setActive] = useState<NavId>("home");

  return (
    <nav className="sticky bottom-0 z-20 shrink-0 border-t border-[#ECEEF2] bg-white/90 backdrop-blur-md shadow-[0_-4px_12px_rgba(15,23,42,0.04)] animate-fadeIn">
      <AppContainer className="h-[68px] md:h-20 pb-[env(safe-area-inset-bottom)] pt-1.5">
        <ul className="flex h-full items-center justify-between">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.id;
            return (
              <li key={item.id} className="flex-1 dt:flex-none dt:w-20">
                <button
                  onClick={() => setActive(item.id)}
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
      </AppContainer>
    </nav>
  );
}

//================================================================
// App
//================================================================
export default function App() {
  const handleCreateProject = () => console.log("create project");
  const handleStartWithAI = () => console.log("start with ai");
  const handleViewAll = () => console.log("view all");

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <Header />

      <main className="flex-1">
        <AppContainer className="flex flex-col gap-6 py-4 dt:grid dt:grid-cols-[minmax(0,1fr)_minmax(420px,440px)] dt:items-start dt:gap-8 dt:py-8">
          <div className="flex flex-col overflow-hidden rounded-[28px] border border-[#ECEEF2] shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <HeroCard onCreateProject={handleCreateProject} />
            <IdeaInputCard onStartWithAI={handleStartWithAI} />
          </div>

          <div className="flex flex-col gap-6">
            <RecentProjects onViewAll={handleViewAll} />
            <TodayTasks onViewAll={handleViewAll} />
          </div>
        </AppContainer>
      </main>

      <BottomNavigation />
    </div>
  );
}
