import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import logo from "./assets/onetech-logo.png";
import HeroCard from "./components/HeroCard";
import RecentProjects from "./components/RecentProjects";
import TodayTasks from "./components/TodayTasks";

/* ---------------------------------------------
 * 기능 1: 라우팅 기반 구축
 * 기능 2: 아이디어 입력창 (자유 입력 + Auto Resize + localStorage)
 * 개선: 웹(PC) 반응형 — 데스크톱은 헤더 메뉴, 모바일은 하단 탭바
 * 이 파일 하나만 교체하면 됩니다. (src/App.tsx)
 * --------------------------------------------- */

const IDEA_STORAGE_KEY = "ai-builder:idea-draft";

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

/* ---------- 아이디어 입력 카드 (기능 2) ---------- */

const PLACEHOLDER_EXAMPLES = [
  "AI 주식 앱을 만들고 싶어요",
  "예약 관리 시스템",
  "쇼핑몰 서비스",
  "운동 기록 앱",
  "가계부 앱",
];

const PLACEHOLDER_INTERVAL_MS = 2400;

function IdeaInputSection({ onStartWithAI }: { onStartWithAI: () => void }) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [idea, setIdea] = useState(() => localStorage.getItem(IDEA_STORAGE_KEY) ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        className="mt-3 min-h-[100px] w-full resize-none overflow-hidden rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3.5 text-[14px] text-ink-title placeholder:text-ink-body placeholder:transition-opacity placeholder:duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
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

/* ---------- 페이지: Home ---------- */

function HomePage() {
  const navigate = useNavigate();

  const handleCreateProject = () => navigate("/project/create");
  const handleStartWithAI = () => navigate("/project/create");
  const handleViewAll = () => console.log("view all");

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
          <RecentProjects onViewAll={handleViewAll} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col md:min-h-0">
          <TodayTasks onViewAll={handleViewAll} />
        </div>
      </div>
    </main>
  );
}

/* ---------- 페이지: Placeholder (신규 화면 공통) ---------- */

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
          <Route path="/project/create" element={<PlaceholderPage title="프로젝트 만들기" description="프로젝트 생성 화면을 준비 중입니다." />} />
          <Route path="/projects" element={<PlaceholderPage title="프로젝트" description="프로젝트 목록 화면을 준비 중입니다." />} />
          <Route path="/todo" element={<PlaceholderPage title="할 일" description="할 일 화면을 준비 중입니다." />} />
          <Route path="/setting" element={<PlaceholderPage title="설정" description="설정 화면을 준비 중입니다." />} />
        </Routes>

        <AppBottomNavigation />
      </div>
    </BrowserRouter>
  );
}
