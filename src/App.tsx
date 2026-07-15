import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import {
  Home as HomeIcon, Search as SearchIcon, User as UserIcon, Bell, Settings as SettingsIcon, LogIn, UserPlus,
  Plus, Pencil, Undo2, Redo2, GripVertical, Trash2, Sparkles, ChevronDown, X as XIcon, Check, Lightbulb,
  Minus, LayoutGrid, RefreshCw, FileText, Heart, BarChart3, ShieldCheck, MessageCircle, Calendar as CalendarIcon, Smartphone, Wand2,
} from "lucide-react";

function cn(...inputs: (string | false | null | undefined)[]) {
  return twMerge(clsx(inputs));
}
import logo from "./assets/onetech-logo.png";
import ProgressBar from "./components/ProgressBar";
import { RECENT_PROJECTS, Project } from "./data/mockData";

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
  { id: "settings", label: "설정", path: "/setting" },
];

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

/* ---------- 홈: 최근 서비스 카드 (실제 프로젝트) ---------- */

const HOME_EXAMPLES = ["AI 식단 관리", "예약 관리", "쇼핑몰", "AI 챗봇", "주식 앱", "커뮤니티"];

const SERVICE_STAGES = ["AI 인터뷰", "AI 기획", "디자인 미리보기", "코드 생성", "테스트", "배포"];

function stageIndexOf(step: string): number {
  if (step.includes("design-done") || step.includes("code")) return 3;
  if (step.includes("ui") || step.includes("design")) return 2;
  if (step.includes("planning") || step.includes("prd") || step.includes("summary")) return 1;
  return 0;
}

interface UserProjectEntry {
  id: string;
  idea?: string;
  title?: string;
  step?: string;
  progress?: number;
  updatedAt?: string;
}

function loadRecentUserProjects(): UserProjectEntry[] {
  try {
    const raw = localStorage.getItem(PROJECTS_LIST_KEY);
    const list = raw ? (JSON.parse(raw) as UserProjectEntry[]) : [];
    if (!Array.isArray(list)) return [];
    return list
      .filter((p) => typeof p.id === "string")
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
      .slice(0, 3);
  } catch {
    return [];
  }
}

function deleteUserProject(id: string) {
  try {
    const raw = localStorage.getItem(PROJECTS_LIST_KEY);
    const list = raw ? (JSON.parse(raw) as UserProjectEntry[]) : [];
    if (Array.isArray(list)) {
      localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(list.filter((p) => p.id !== id)));
    }
    // 현재 열려있는 프로젝트가 삭제 대상이면 함께 정리
    const current = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (current) {
      const parsed = JSON.parse(current) as { id?: string };
      if (parsed.id === id) localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
  } catch {
    // 삭제 실패는 무시
  }
}

function continueRoute(step: string): string {
  if (step.includes("ui") || step.includes("design")) return "/project/mockup";
  if (step.includes("planning") || step.includes("prd") || step.includes("summary")) return "/project/summary";
  return "/project/interview";
}

function openUserProject(project: UserProjectEntry, navigate: (path: string) => void) {
  try {
    localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(project));
  } catch {
    // 저장 실패 시에도 이동은 진행
  }
  navigate(continueRoute(project.step ?? ""));
}

function ServiceCard({ project, showStages, navigate, onDelete }: { project: UserProjectEntry; showStages: boolean; navigate: (p: string) => void; onDelete: (id: string) => void }) {
  const name = (project.title && project.title.trim()) || (project.idea && project.idea.trim()) || "이름 없는 서비스";
  const progress = Math.min(100, Math.max(0, project.progress ?? 10));
  const stageIndex = stageIndexOf(project.step ?? "");

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-[20px] border border-[#ECEEF2] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-bold text-ink-title">{name}</h3>
          <p className="mt-0.5 text-[12.5px] text-ink-body">
            현재 <span className="font-semibold text-primary">{SERVICE_STAGES[stageIndex]}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="text-[14px] font-bold text-primary">{progress}%</span>
          <button
            onClick={() => onDelete(project.id)}
            aria-label={`${name} 삭제`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-body transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar progress={progress} />
      </div>

      {showStages && (
        <ul className="mt-3.5 flex flex-wrap gap-x-3 gap-y-1.5">
          {SERVICE_STAGES.map((stage, index) => (
            <li key={stage} className="flex items-center gap-1 text-[11.5px]">
              {index < stageIndex ? (
                <Check className="h-3 w-3 text-[#16A34A]" />
              ) : index === stageIndex ? (
                <span className="text-[11px]" aria-hidden="true">⏳</span>
              ) : (
                <span className="h-2.5 w-2.5 rounded-[3px] border border-[#D1D5DB]" aria-hidden="true" />
              )}
              <span className={index < stageIndex ? "text-[#16A34A]" : index === stageIndex ? "font-semibold text-ink-title" : "text-ink-body"}>{stage}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => openUserProject(project, navigate)}
        className="mt-4 flex h-[42px] w-full items-center justify-center rounded-xl bg-primary/10 text-[13.5px] font-semibold text-primary transition-colors hover:bg-primary/15"
      >
        계속 만들기
      </button>
    </motion.article>
  );
}

/* ---------- 페이지: 홈 ---------- */

function HomePage() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState<string>(() => {
    try {
      return localStorage.getItem(IDEA_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [recentProjects, setRecentProjects] = useState<UserProjectEntry[]>(() => loadRecentUserProjects());
  const [deleteTarget, setDeleteTarget] = useState<UserProjectEntry | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const persistDraft = (value: string) => {
    setIdea(value);
    try {
      localStorage.setItem(IDEA_STORAGE_KEY, value);
    } catch {
      // 무시
    }
  };

  const handleStart = () => {
    if (idea.trim().length === 0) return;
    saveUserProject(createUserProject(idea.trim()));
    try {
      localStorage.removeItem(IDEA_STORAGE_KEY);
    } catch {
      // 무시
    }
    navigate("/project/analyze");
  };

  // 아이디어가 없는 사용자: AI가 아이디어를 함께 찾는 인터뷰로 시작
  const handleUnknown = () => {
    saveUserProject(createUserProject(""));
    navigate("/project/interview");
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteUserProject(deleteTarget.id);
    setRecentProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const latest = recentProjects[0];
  const latestStage = latest ? SERVICE_STAGES[stageIndexOf(latest.step ?? "")] : "";

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-6 pb-[110px] md:px-8 md:py-10 md:pb-16">
      <div className="flex w-full flex-col gap-8 md:max-w-[640px]">
        {/* 메인 문구 + 입력 */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="pt-4 text-center md:pt-10"
        >
          <h1 className="text-[28px] font-bold leading-snug text-ink-title md:text-[34px]">
            아이디어 하나면
            <br className="md:hidden" /> 충분합니다.
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-body md:text-[15.5px]">
            AI와 대화만 하면
            <br className="md:hidden" /> 기획부터 디자인, 개발, 테스트, 배포까지 함께합니다.
          </p>

          <div className="mt-7 rounded-[24px] border border-[#ECEEF2] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:p-5">
            <textarea
              ref={inputRef}
              value={idea}
              onChange={(e) => persistDraft(e.target.value)}
              placeholder="무엇을 만들고 싶으신가요?"
              rows={2}
              className="min-h-[64px] w-full resize-none rounded-2xl bg-[#F8FAFC] px-4 py-3.5 text-base leading-relaxed text-ink-title placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleStart}
              disabled={idea.trim().length === 0}
              className="mt-3 flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[16px] font-bold text-white shadow-[0_8px_20px_-4px_rgba(79,107,255,0.5)] transition-all duration-200 enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              AI와 시작하기
            </button>
            <button
              onClick={handleUnknown}
              className="mt-2.5 text-[13px] font-medium text-ink-body underline-offset-2 transition-colors hover:text-primary hover:underline"
            >
              잘 모르겠어요
            </button>

            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {HOME_EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    persistDraft(example);
                    inputRef.current?.focus();
                  }}
                  className="rounded-badge border border-[#E5E8EB] bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-body transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </motion.section>

        {/* AI 추천 */}
        {latest && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-primary/25 bg-primary/5 px-5 py-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-primary">AI가 추천합니다</p>
                <p className="truncate text-[13.5px] font-medium text-ink-title">
                  지난번 작업을 이어서 <span className="font-bold">{latestStage}</span> 단계를 진행해보세요.
                </p>
              </div>
            </div>
            <button
              onClick={() => openUserProject(latest, navigate)}
              className="h-9 shrink-0 rounded-xl bg-primary px-4 text-[13px] font-semibold text-white transition-transform hover:scale-[1.02]"
            >
              이어서 만들기
            </button>
          </motion.section>
        )}

        {/* 최근 작업 중인 서비스 */}
        {recentProjects.length > 0 && (
          <section>
            <h2 className="px-1 text-[16px] font-bold text-ink-title">최근 작업 중인 서비스</h2>
            <div className="mt-3 flex flex-col gap-3">
              {recentProjects.map((project, index) => (
                <ServiceCard key={project.id} project={project} showStages={index === 0} navigate={navigate} onDelete={() => setDeleteTarget(project)} />
              ))}
            </div>
          </section>
        )}

        {/* OneTech Promise */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          className="rounded-[24px] border border-[#ECEEF2] bg-white p-6 text-center shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
        >
          <ul className="inline-flex flex-col items-start gap-2 text-left">
            {["코딩 몰라도 됩니다.", "디자인 몰라도 됩니다.", "배포 몰라도 됩니다.", "AI와 대화만 하세요."].map((line) => (
              <li key={line} className="flex items-center gap-2 text-[14.5px] font-medium text-ink-title">
                <Check className="h-4 w-4 shrink-0 text-[#16A34A]" />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[15px] font-bold text-ink-title">
            10분 후, <span className="text-primary">당신의 서비스</span>를 직접 실행할 수 있습니다.
          </p>
        </motion.section>

        {/* 삭제 확인 모달 */}
        <AnimatePresence>
          {deleteTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
              onClick={() => setDeleteTarget(null)}
            >
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[320px] rounded-[22px] bg-white p-6 text-center shadow-[0_16px_48px_rgba(15,23,42,0.24)]"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </span>
                <p className="mt-3 text-[16px] font-bold text-ink-title">이 서비스를 삭제할까요?</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-body">
                  '{(deleteTarget.title && deleteTarget.title.trim()) || (deleteTarget.idea && deleteTarget.idea.trim()) || "이름 없는 서비스"}'의 모든 작업 내용이 사라집니다.
                  <br />
                  이 작업은 되돌릴 수 없습니다.
                </p>
                <div className="mt-5 flex gap-2.5">
                  <button onClick={() => setDeleteTarget(null)} className="h-[46px] flex-1 rounded-xl border border-[#E5E8EB] bg-white text-[14px] font-semibold text-ink-body transition-colors hover:border-[#D1D5DB]">
                    취소
                  </button>
                  <button onClick={handleConfirmDelete} className="h-[46px] flex-1 rounded-xl bg-red-500 text-[14px] font-semibold text-white transition-colors hover:bg-red-600">
                    삭제
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 서비스 제작 과정 */}
        <section className="pb-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-y-1.5">
            {["아이디어", "AI 인터뷰", "AI 기획", "실행형 프로토타입", "수정", "코드 생성", "배포"].map((step, index, arr) => (
              <span key={step} className="flex items-center text-[12px] font-medium text-ink-body">
                {step}
                {index < arr.length - 1 && <span className="mx-1.5 text-primary" aria-hidden="true">→</span>}
              </span>
            ))}
          </div>
        </section>
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

/* ---------- 브랜드명 추천 / 아이디어 발굴 API ---------- */

async function fetchBrandNames(idea: string): Promise<string[]> {
  const response = await fetch("/api/interview/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "brand-names", idea }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = (await response.json()) as { success: boolean; names?: string[]; error?: string };
  if (!data.success || !data.names || data.names.length === 0) throw new Error(data.error ?? "브랜드명 추천 실패");
  return data.names;
}

async function fetchIdeaSuggestions(discovery: Record<string, string>): Promise<string[]> {
  const response = await fetch("/api/interview/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "idea-discovery", discovery }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = (await response.json()) as { success: boolean; ideas?: string[]; error?: string };
  if (!data.success || !data.ideas || data.ideas.length === 0) throw new Error(data.error ?? "아이디어 추천 실패");
  return data.ideas;
}

async function fetchQuestionOptionsOnce(idea: string, field: string, question: string): Promise<string[]> {
  const response = await fetch("/api/interview/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "question-options", idea, field, question }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = (await response.json()) as { success: boolean; options?: string[]; error?: string };
  if (!data.success || !data.options || data.options.length < 2) throw new Error(data.error ?? "선택지 생성 실패");
  return data.options;
}

// AI가 일시적으로 못 불러오는 경우가 있어, 최대 3번까지 자동 재시도한다
async function fetchQuestionOptions(idea: string, field: string, question: string, retries = 2): Promise<string[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchQuestionOptionsOnce(idea, field, question);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        // 점점 간격을 늘려 재시도 (0.6s, 1.2s)
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("선택지 생성 실패");
}

const FALLBACK_IDEAS = ["AI 식단 관리 앱", "예약관리 시스템", "AI 운동 기록 앱", "AI 가계부", "AI 독서 관리 앱"];

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

/* ---------- AI 프로젝트 분석 (Phase 4-1) ---------- */

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

interface HardwareQuestion {
  question: string;
  options: string[];
}

interface HardwareInfo {
  needed: boolean;
  items: string[];
  questions: HardwareQuestion[];
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

// 사용자가 확정한 분석 결과
interface AnalysisChoice {
  category: string;
  features: string[];
  services: string[];
  hardwareAnswers: Record<string, string>;
  mvpMode: "recommended" | "full" | "custom";
  mvpItems: string[];
  connections: string[];
}

const CATEGORY_OPTIONS = [
  "웹 서비스", "모바일 앱", "게임", "AI 서비스", "ERP", "CRM",
  "예약", "쇼핑몰", "IoT", "자동화", "SaaS", "관리 시스템", "기타",
];

async function fetchAnalyze(idea: string): Promise<ProjectAnalysis> {
  const response = await fetch("/api/project/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = (await response.json()) as { success: boolean; analysis?: ProjectAnalysis; error?: string };
  if (!data.success || !data.analysis) throw new Error(data.error ?? "분석 실패");
  return data.analysis;
}

function loadSavedAnalysis(): { analysis: ProjectAnalysis | null; choice: AnalysisChoice | null } {
  const project = loadCurrentProject();
  const analysis =
    typeof project.analysis === "object" && project.analysis !== null ? (project.analysis as ProjectAnalysis) : null;
  const choice =
    typeof project.analysisChoice === "object" && project.analysisChoice !== null
      ? (project.analysisChoice as AnalysisChoice)
      : null;
  return { analysis, choice };
}

function Stars({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <span className="text-[14px] tracking-tight text-[#F59E0B]" aria-label={`${count}점 (5점 만점)`}>
      {"★".repeat(Math.min(max, count))}
      <span className="text-[#E5E8EB]">{"★".repeat(Math.max(0, max - count))}</span>
    </span>
  );
}

const ANALYZE_STEPS = ["서비스 분석", "기술 분석", "외부 서비스", "장비 분석", "구현 가능 여부", "MVP 추천"];

type AnalyzeStatus = "loading" | "ready" | "error";

/* ---------- 페이지: AI 프로젝트 분석 ---------- */

function AnalyzePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [idea] = useState(() => loadCurrentIdea());
  const saved = loadSavedAnalysis();

  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(saved.analysis);
  const [status, setStatus] = useState<AnalyzeStatus>(saved.analysis ? "ready" : "loading");
  // 현재 단계는 URL(?s=번호)에서 읽는다 → 브라우저 뒤로가기가 단계 이동으로 동작
  const stepIndex = Math.max(0, Number(searchParams.get("s") ?? "0")) || 0;
  const goStep = (next: number) => {
    setSearchParams(next <= 0 ? {} : { s: String(next) });
    window.scrollTo(0, 0);
  };

  const [category, setCategory] = useState(saved.choice?.category ?? "");
  const [isCategoryEdit, setIsCategoryEdit] = useState(false);
  const [checkedFeatures, setCheckedFeatures] = useState<string[]>(saved.choice?.features ?? []);
  const [extraFeature, setExtraFeature] = useState("");
  const [checkedServices, setCheckedServices] = useState<string[]>(saved.choice?.services ?? []);
  const [hardwareAnswers, setHardwareAnswers] = useState<Record<string, string>>(saved.choice?.hardwareAnswers ?? {});
  const [mvpMode, setMvpMode] = useState<AnalysisChoice["mvpMode"]>(saved.choice?.mvpMode ?? "recommended");
  const [customMvp, setCustomMvp] = useState<string[]>(saved.choice?.mvpItems ?? []);

  // 아이디어가 없으면 인터뷰(아이디어 발굴)로 보냄
  useEffect(() => {
    if (idea.trim().length === 0) navigate("/project/interview", { replace: true });
  }, [idea, navigate]);

  useEffect(() => {
    if (analysis || status !== "loading" || idea.trim().length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const result = await fetchAnalyze(idea);
        if (cancelled) return;
        setAnalysis(result);
        setCategory((prev) => prev || result.category);
        setCheckedFeatures((prev) => (prev.length > 0 ? prev : result.features.filter((f) => f.recommended).map((f) => f.name)));
        setCheckedServices((prev) => (prev.length > 0 ? prev : result.services.filter((s) => s.recommended).map((s) => s.name)));
        setCustomMvp((prev) => (prev.length > 0 ? prev : result.mvp.items));
        updateCurrentProject({ analysis: result });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analysis, status, idea]);

  const toggle = (list: string[], setList: (next: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  if (status === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pt-4 pb-[140px] animate-fadeIn md:pb-12">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" aria-hidden="true" />
        <div className="text-center">
          <p className="text-[16px] font-semibold text-ink-title">AI가 서비스를 분석하고 있습니다.</p>
          <p className="mt-1 text-[14px] text-ink-body">무엇이 필요한지, 무엇이 가능한지 살펴보는 중입니다. (예상 5~15초)</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !analysis) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pt-4 pb-[140px] animate-fadeIn md:pb-12">
        <p className="text-[16px] font-semibold text-ink-title">분석 실패</p>
        <p className="text-[14px] text-ink-body">잠시 후 다시 시도해주세요.</p>
        <button onClick={() => setStatus("loading")} className="flex h-[48px] w-full max-w-[280px] items-center justify-center rounded-2xl bg-primary text-[15px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)]">
          다시 시도
        </button>
      </main>
    );
  }

  const hardwareNeeded = analysis.hardware.needed && analysis.hardware.questions.length > 0;
  // 장비가 필요 없으면 장비 단계는 건너뛴다
  const visibleSteps = hardwareNeeded ? ANALYZE_STEPS : ANALYZE_STEPS.filter((s) => s !== "장비 분석");
  const safeStepIndex = Math.min(stepIndex, visibleSteps.length - 1);
  const currentStep = visibleSteps[safeStepIndex];
  const isLast = stepIndex === visibleSteps.length - 1;

  const finalMvpItems = mvpMode === "full" ? analysis.features.map((f) => f.name) : mvpMode === "custom" ? customMvp : analysis.mvp.items;

  const handleNext = () => {
    if (!isLast) {
      goStep(stepIndex + 1);
      return;
    }
    // 분석 확정 → 인터뷰 시작
    const choice: AnalysisChoice = {
      category,
      features: checkedFeatures,
      services: checkedServices,
      hardwareAnswers,
      mvpMode,
      mvpItems: finalMvpItems,
      connections: checkedServices,
    };
    updateCurrentProject({ analysis, analysisChoice: choice, status: "analyzed", step: "analysis-done", progress: 15 });
    navigate("/project/interview");
  };

  const handleBack = () => {
    if (stepIndex === 0) {
      navigate("/");
      return;
    }
    navigate(-1); // 브라우저 뒤로가기와 동일하게 동작
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-4 pb-[140px] animate-fadeIn md:items-center md:pt-8 md:pb-12">
      <div className="flex w-full flex-col gap-4 md:max-w-[680px]">
        {/* 헤더 + 진행률 */}
        <div>
          <span className="text-[12px] font-semibold text-primary">AI 프로젝트 분석</span>
          <h1 className="mt-1 text-[22px] font-bold text-ink-title">{idea}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleSteps.map((step, index) => (
              <span
                key={step}
                className={cn(
                  "rounded-badge px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  index < stepIndex ? "bg-[#16A34A]/10 text-[#16A34A]" : index === stepIndex ? "bg-primary/10 font-bold text-primary" : "bg-[#F3F4F6] text-ink-body"
                )}
              >
                {index < stepIndex ? "✔ " : ""}{step}
              </span>
            ))}
          </div>
          <div className="mt-3">
            <ProgressBar progress={Math.round(((stepIndex + 1) / visibleSteps.length) * 100)} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.section
            key={currentStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="rounded-[24px] border border-[#ECEEF2] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:p-7"
          >
            {/* STEP 1: 서비스 분석 */}
            {currentStep === "서비스 분석" && (
              <div>
                <h2 className="text-[17px] font-bold text-ink-title">어떤 서비스인지 확인해주세요</h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-body">{analysis.categoryReason}</p>

                {isCategoryEdit ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CATEGORY_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => { setCategory(option); setIsCategoryEdit(false); }}
                        className={cn("rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-colors", category === option ? "border-primary bg-primary/5 text-primary" : "border-[#E5E8EB] bg-white text-ink-body hover:border-[#D1D5DB]")}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-4">
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-semibold text-primary">AI가 분류한 서비스 종류</p>
                      <p className="mt-0.5 text-[17px] font-bold text-ink-title">{category}</p>
                    </div>
                    <button onClick={() => setIsCategoryEdit(true)} className="flex h-9 shrink-0 items-center gap-1 rounded-xl border border-[#E5E8EB] bg-white px-3 text-[12.5px] font-semibold text-ink-title hover:border-[#D1D5DB]">
                      <Pencil className="h-3.5 w-3.5" /> 수정
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: 기술 분석 */}
            {currentStep === "기술 분석" && (
              <div>
                <h2 className="text-[17px] font-bold text-ink-title">이런 기능들이 필요해요</h2>
                <p className="mt-1.5 text-[13.5px] text-ink-body">필요 없는 기능은 체크를 해제하고, 원하는 기능은 아래에서 추가할 수 있어요.</p>

                <ul className="mt-4 flex flex-col gap-2">
                  {analysis.features.map((feature) => {
                    const checked = checkedFeatures.includes(feature.name);
                    return (
                      <li key={feature.name}>
                        <button
                          onClick={() => toggle(checkedFeatures, setCheckedFeatures, feature.name)}
                          className={cn("flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors", checked ? "border-primary/40 bg-primary/5" : "border-[#E5E8EB] bg-white hover:border-[#D1D5DB]")}
                        >
                          <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors", checked ? "border-primary bg-primary text-white" : "border-[#D1D5DB] bg-white")}>
                            {checked && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[14px] font-semibold text-ink-title">{feature.name}</span>
                            {feature.description && <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-body">{feature.description}</span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {checkedFeatures
                    .filter((name) => !analysis.features.some((f) => f.name === name))
                    .map((name) => (
                      <li key={name}>
                        <button onClick={() => toggle(checkedFeatures, setCheckedFeatures, name)} className="flex w-full items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 text-left">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-primary bg-primary text-white"><Check className="h-3.5 w-3.5" /></span>
                          <span className="text-[14px] font-semibold text-ink-title">{name}</span>
                        </button>
                      </li>
                    ))}
                </ul>

                <div className="mt-3 flex gap-2">
                  <input
                    value={extraFeature}
                    onChange={(e) => setExtraFeature(e.target.value)}
                    placeholder="원하는 기능 추가 (예: 출석 체크)"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-[#E5E8EB] bg-[#F8FAFC] px-3 text-base text-ink-title placeholder:text-[13px] placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={() => {
                      const name = extraFeature.trim();
                      if (!name || checkedFeatures.includes(name)) return;
                      setCheckedFeatures([...checkedFeatures, name]);
                      setExtraFeature("");
                    }}
                    disabled={extraFeature.trim().length === 0}
                    className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-primary px-4 text-[13px] font-semibold text-white disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" /> 추가
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: 외부 서비스 */}
            {currentStep === "외부 서비스" && (
              <div>
                <h2 className="text-[17px] font-bold text-ink-title">이런 도움을 받으면 좋아요</h2>
                <p className="mt-1.5 text-[13.5px] text-ink-body">직접 만들지 않아도 되는 부분은 검증된 서비스의 도움을 받습니다. 지금 가입할 필요는 없어요.</p>

                <ul className="mt-4 flex flex-col gap-2">
                  {analysis.services.map((service) => {
                    const checked = checkedServices.includes(service.name);
                    return (
                      <li key={service.name}>
                        <button
                          onClick={() => toggle(checkedServices, setCheckedServices, service.name)}
                          className={cn("flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors", checked ? "border-primary/40 bg-primary/5" : "border-[#E5E8EB] bg-white hover:border-[#D1D5DB]")}
                        >
                          <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors", checked ? "border-primary bg-primary text-white" : "border-[#D1D5DB] bg-white")}>
                            {checked && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[14px] font-semibold text-ink-title">{service.name}</span>
                            {service.role && <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-body">{service.role}</span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* STEP 4: 장비 분석 (필요할 때만) */}
            {currentStep === "장비 분석" && (
              <div>
                <h2 className="text-[17px] font-bold text-ink-title">장비에 대해 확인할게요</h2>
                {analysis.hardware.items.length > 0 && (
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-body">
                    이 서비스에는 <span className="font-semibold text-ink-title">{analysis.hardware.items.join(", ")}</span> 같은 실제 장비가 필요할 수 있어요.
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-4">
                  {analysis.hardware.questions.map((item) => {
                    // 선택지가 짧고 3개 이하면 가로, 길거나 많으면 세로 배치
                    const isWide = item.options.length <= 3 && item.options.every((o) => o.length <= 6);
                    return (
                      <div key={item.question}>
                        <p className="text-[13.5px] font-semibold text-ink-title">{item.question}</p>
                        <div className={cn("mt-1.5 gap-2", isWide ? "flex" : "grid grid-cols-1 sm:grid-cols-2")}>
                          {item.options.map((option) => (
                            <button
                              key={option}
                              onClick={() => setHardwareAnswers({ ...hardwareAnswers, [item.question]: option })}
                              className={cn(
                                "rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-colors",
                                isWide ? "flex-1" : "text-left",
                                hardwareAnswers[item.question] === option ? "border-primary bg-primary/5 text-primary" : "border-[#E5E8EB] bg-white text-ink-body hover:border-[#D1D5DB]"
                              )}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {analysis.hardware.limitation && (
                  <p className="mt-4 rounded-2xl bg-[#FEF3C7] px-4 py-3 text-[12.5px] leading-relaxed text-[#92400E]">{analysis.hardware.limitation}</p>
                )}
              </div>
            )}

            {/* STEP 5: 구현 가능 여부 */}
            {currentStep === "구현 가능 여부" && (
              <div>
                <h2 className="text-[17px] font-bold text-ink-title">어디까지 만들 수 있을까요?</h2>

                <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 text-center">
                  <p className="text-[12px] font-semibold text-primary">AI Builder로 바로 만들 수 있는 범위</p>
                  <p className="mt-1 text-[32px] font-bold leading-tight text-ink-title">{analysis.feasibility.score}%</p>
                  <Stars count={Math.max(1, Math.round(analysis.feasibility.score / 20))} />
                </div>

                {analysis.feasibility.possible.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[13px] font-bold text-ink-title">지금 바로 만들 수 있어요</p>
                    <ul className="mt-1.5 flex flex-col gap-1.5">
                      {analysis.feasibility.possible.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-title">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.feasibility.needsMore.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[13px] font-bold text-ink-title">추가로 준비하면 좋아요</p>
                    <ul className="mt-1.5 flex flex-col gap-1.5">
                      {analysis.feasibility.needsMore.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-body">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.feasibility.limitation && (
                  <div className="mt-4 rounded-2xl bg-[#FEF3C7] px-4 py-3.5">
                    <p className="text-[12.5px] font-bold text-[#92400E]">솔직하게 말씀드릴게요</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[#92400E]">{analysis.feasibility.limitation}</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 6: MVP 추천 */}
            {currentStep === "MVP 추천" && (
              <div>
                <h2 className="text-[17px] font-bold text-ink-title">먼저 이만큼만 만들어볼까요?</h2>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: "예상 화면", value: `${analysis.mvp.screenCount}개` },
                    { label: "예상 기능", value: `${analysis.mvp.featureCount}개` },
                    { label: "예상 난이도", value: "" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-[#F8FAFC] px-3 py-3 text-center">
                      <p className="text-[11px] font-medium text-ink-body">{item.label}</p>
                      {item.value ? (
                        <p className="mt-0.5 text-[16px] font-bold text-ink-title">{item.value}</p>
                      ) : (
                        <p className="mt-1"><Stars count={analysis.mvp.difficulty} /></p>
                      )}
                    </div>
                  ))}
                </div>

                {analysis.mvp.recommendation && (
                  <p className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-[13px] leading-relaxed text-ink-title">
                    {analysis.mvp.recommendation}
                  </p>
                )}

                <p className="mt-4 text-[13px] font-bold text-ink-title">어떻게 진행할까요?</p>
                <div className="mt-2 flex flex-col gap-2">
                  {([
                    { id: "recommended", title: "추천대로 진행", desc: "가장 빠르게 서비스를 실행해볼 수 있어요." },
                    { id: "full", title: "전체 기능 진행", desc: "시간이 더 걸리지만 모든 기능을 담습니다." },
                    { id: "custom", title: "직접 선택", desc: "필요한 기능만 골라서 만듭니다." },
                  ] as const).map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setMvpMode(option.id)}
                      className={cn("rounded-2xl border px-4 py-3 text-left transition-colors", mvpMode === option.id ? "border-primary bg-primary/5" : "border-[#E5E8EB] bg-white hover:border-[#D1D5DB]")}
                    >
                      <p className={cn("text-[14px] font-semibold", mvpMode === option.id ? "text-primary" : "text-ink-title")}>{option.title}</p>
                      <p className="mt-0.5 text-[12.5px] text-ink-body">{option.desc}</p>
                    </button>
                  ))}
                </div>

                {mvpMode === "custom" ? (
                  <div className="mt-3">
                    <p className="text-[12.5px] font-semibold text-ink-body">넣을 기능을 골라주세요</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {checkedFeatures.map((name) => {
                        const on = customMvp.includes(name);
                        return (
                          <button
                            key={name}
                            onClick={() => toggle(customMvp, setCustomMvp, name)}
                            className={cn("rounded-badge px-3 py-1.5 text-[12.5px] font-medium transition-colors", on ? "bg-primary text-white" : "bg-[#F3F4F6] text-ink-body hover:bg-[#ECEEF2]")}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl bg-[#F8FAFC] px-4 py-3">
                    <p className="text-[12px] font-semibold text-ink-body">{mvpMode === "full" ? "전체 기능" : "MVP 구성"}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {finalMvpItems.map((item) => (
                        <span key={item} className="rounded-badge bg-white px-2.5 py-1 text-[12px] font-medium text-ink-title">{item}</span>
                      ))}
                    </div>
                  </div>
                )}

                {checkedServices.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-[#ECEEF2] px-4 py-3">
                    <p className="text-[12.5px] font-bold text-ink-title">나중에 연결할 목록</p>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {checkedServices.map((service) => (
                        <li key={service} className="flex items-center gap-2 text-[12.5px] text-ink-body">
                          <span className="h-3 w-3 rounded-[3px] border border-[#D1D5DB]" aria-hidden="true" />
                          {service}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11.5px] text-ink-body">지금은 목록만 만들어둡니다. 필요한 순간에 안내해드릴게요.</p>
                  </div>
                )}
              </div>
            )}
          </motion.section>
        </AnimatePresence>

        {/* 하단 버튼 */}
        <div className="flex gap-2.5">
          <button onClick={handleBack} className="flex h-[52px] flex-1 items-center justify-center rounded-2xl border border-[#E5E8EB] bg-white text-[14px] font-semibold text-ink-body transition-colors hover:border-[#D1D5DB] hover:text-ink-title">
            이전
          </button>
          <button onClick={handleNext} className="flex h-[52px] flex-[2] items-center justify-center rounded-2xl bg-primary text-[15px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
            {isLast ? "이대로 시작하기" : "다음"}
          </button>
        </div>
      </div>
    </main>
  );
}


type InterviewPhase = "discover" | "brand" | "questions";

const DISCOVERY_STEPS: { key: string; question: string; type: "choice" | "text"; options?: string[]; placeholder?: string }[] = [
  { key: "category", question: "어떤 분야에 관심이 있으신가요?", type: "choice", options: ["음식", "운동", "여행", "금융", "병원", "쇼핑", "교육", "생산성", "AI", "기타"] },
  { key: "who", question: "누가 사용할 서비스인가요?", type: "choice", options: ["개인", "사장님", "회사", "학생", "모두"] },
  { key: "problem", question: "어떤 문제를 해결하고 싶으신가요?", type: "text", placeholder: "예: 매번 손으로 예약을 관리하는 게 힘들어요" },
  { key: "revenue", question: "수익을 만들고 싶으신가요?", type: "choice", options: ["예", "아니오"] },
  { key: "platform", question: "웹과 앱 중 어디로 만들고 싶으신가요?", type: "choice", options: ["웹", "앱", "둘 다"] },
];

function InterviewPage() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState(() => loadCurrentIdea());

  // 시작 단계 결정: 아이디어 없으면 발굴 → 브랜드명 → 질문
  const [phase, setPhase] = useState<InterviewPhase>(() => {
    const project = loadCurrentProject();
    const hasBrand = typeof project.brandName === "string" && (project.brandName as string).trim().length > 0;
    const progressed = typeof project.interviewStep === "number" && (project.interviewStep as number) > 1;
    if (loadCurrentIdea().trim().length === 0 && !progressed) return "discover";
    if (!hasBrand && !progressed) return "brand";
    return "questions";
  });

  // ---- 아이디어 발굴 상태 ----
  const [dStep, setDStep] = useState(0);
  const [dAnswers, setDAnswers] = useState<Record<string, string>>({ category: "", who: "", problem: "", revenue: "", platform: "" });
  const [ideaOptions, setIdeaOptions] = useState<string[] | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const handleDiscoveryNext = async () => {
    if (dStep < DISCOVERY_STEPS.length - 1) {
      setDStep(dStep + 1);
      window.scrollTo(0, 0);
      return;
    }
    setIsDiscovering(true);
    try {
      setIdeaOptions(await fetchIdeaSuggestions(dAnswers));
    } catch {
      setIdeaOptions(FALLBACK_IDEAS);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handlePickIdea = (picked: string) => {
    updateCurrentProject({ idea: picked, title: picked, ideaGenerated: true, ideaCategory: dAnswers.category });
    setIdea(picked);
    setPhase("brand");
    window.scrollTo(0, 0);
  };

  // ---- 브랜드명 상태 ----
  const [brandChoice, setBrandChoice] = useState<"direct" | "ai" | null>(null);
  const [brandInput, setBrandInput] = useState("");
  const [brandOptions, setBrandOptions] = useState<string[] | null>(null);
  const [isBrandLoading, setIsBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState("");

  const saveBrand = (name: string, source: "직접" | "AI") => {
    if (name.trim().length === 0) return;
    updateCurrentProject({ brandName: name.trim(), brandSource: source });
    setPhase("questions");
    window.scrollTo(0, 0);
  };

  const handleBrandAI = async () => {
    setBrandChoice("ai");
    setBrandError("");
    setBrandOptions(null);
    setIsBrandLoading(true);
    try {
      setBrandOptions(await fetchBrandNames(idea));
    } catch {
      setBrandError("AI 추천에 실패했습니다. 직접 입력해주세요.");
      setBrandChoice("direct");
    } finally {
      setIsBrandLoading(false);
    }
  };

  const initial = loadInterviewState();
  const [searchParams, setSearchParams] = useSearchParams();
  // 질문 단계는 URL(?q=번호)에서 읽는다 → 브라우저 뒤로가기가 이전 질문으로 이동
  const qParam = searchParams.get("q");
  const stepIndex = qParam !== null ? Math.min(Math.max(0, Number(qParam) || 0), INTERVIEW_STEPS.length - 1) : initial.step - 1;
  // 질문별 AI 선택지 캐시 (field 기준). 로딩 전에는 기본 선택지 사용
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, string[]>>({});
  const [optionsLoadingField, setOptionsLoadingField] = useState<string | null>(null);
  const [optionsFailedField, setOptionsFailedField] = useState<string | null>(null);
  const [optionsRetryKey, setOptionsRetryKey] = useState(0);
  const [answers, setAnswers] = useState<InterviewAnswers>(initial.answers);
  const [showHelp, setShowHelp] = useState(false);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendNotice, setRecommendNotice] = useState("");

  const step = INTERVIEW_STEPS[stepIndex];
  const isLastStep = stepIndex === INTERVIEW_STEPS.length - 1;
  const value = answers[step.field];
  const isNextDisabled = step.required && value.trim().length === 0;

  // 현재 질문에 쓸 선택지: AI 생성분이 있으면 그것, 없으면 기본 선택지
  const currentOptions = step.type === "choice" ? dynamicOptions[step.field] ?? step.options ?? [] : [];

  // 선택형 질문에 도달하면 프로젝트에 맞는 선택지를 AI로 생성 (자동 재시도 포함)
  useEffect(() => {
    if (step.type !== "choice" || phase !== "questions") return;
    if (dynamicOptions[step.field] || optionsLoadingField === step.field) return;
    if (idea.trim().length === 0) return;
    let cancelled = false;
    (async () => {
      setOptionsLoadingField(step.field);
      setOptionsFailedField((prev) => (prev === step.field ? null : prev));
      try {
        const opts = await fetchQuestionOptions(idea, step.field, step.question);
        if (!cancelled) setDynamicOptions((prev) => ({ ...prev, [step.field]: opts }));
      } catch {
        // 자동 재시도까지 실패하면 실패 상태 표시 → 사용자가 직접 다시 시도 가능
        if (!cancelled) setOptionsFailedField(step.field);
      } finally {
        if (!cancelled) setOptionsLoadingField((prev) => (prev === step.field ? null : prev));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.field, step.type, phase, idea, optionsRetryKey]);

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
    setSearchParams({ q: String(nextIndex) });
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
    if (stepIndex === 0) {
      navigate(-1);
      return;
    }
    navigate(-1);
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
    if (step.type === "choice" && currentOptions.length > 0 && !currentOptions.includes(valueToApply)) {
      const matched = currentOptions.find(
        (option) => valueToApply.includes(option) || recommendation.answer.includes(option)
      );
      if (matched) valueToApply = matched;
    }
    if (valueToApply.trim().length === 0) return; // 거부 응답(applyValue 없음)은 적용하지 않음

    // 텍스트 질문: 사용자가 쓴 내용을 절대 지우지 않고, 한 줄 띄우고 AI 추천을 덧붙임
    if (step.type === "text") {
      const existing = answers[step.field].trimEnd();
      if (existing.length > 0) {
        const bulletItems = valueToApply
          .split(/[,、]/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
        const bullets = (bulletItems.length > 0 ? bulletItems : [valueToApply.trim()])
          .map((item) => `• ${item}`)
          .join("\n");
        valueToApply = `${existing}\n\nAI 추천\n${bullets}`;
      }
    }

    const applied = { ...answers, [step.field]: valueToApply };
    setAnswers(applied);
    persist(stepIndex + 1, applied);
  };

  // ===== 아이디어 발굴 화면 =====
  if (phase === "discover") {
    const ds = DISCOVERY_STEPS[dStep];
    const dv = dAnswers[ds.key];
    const dNextDisabled = dv.trim().length === 0;
    return (
      <main className="flex flex-1 flex-col px-5 pt-4 pb-[140px] animate-fadeIn md:items-center md:pt-10 md:pb-12">
        <div className="flex w-full flex-col gap-4 md:max-w-[680px]">
          <section className="rounded-[24px] border border-[#ECEEF2] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:p-8">
            <span className="text-[12px] font-semibold text-primary">아이디어 함께 찾기</span>
            {isDiscovering ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" aria-hidden="true" />
                <p className="text-[14px] text-ink-body">답변을 바탕으로 아이디어를 만드는 중입니다...</p>
              </div>
            ) : ideaOptions ? (
              <>
                <h1 className="mt-1 text-[20px] font-bold text-ink-title">이런 서비스는 어떠세요?</h1>
                <p className="mt-1 text-[13px] text-ink-body">마음에 드는 아이디어를 선택하면 인터뷰를 시작합니다.</p>
                <div className="mt-4 flex flex-col gap-2.5">
                  {ideaOptions.map((option, index) => (
                    <button
                      key={option}
                      onClick={() => handlePickIdea(option)}
                      className="flex items-center gap-2.5 rounded-2xl border border-[#E5E8EB] bg-white px-4 py-3.5 text-left text-[15px] font-medium text-ink-title transition-colors duration-200 hover:border-primary hover:bg-primary/5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">{index + 1}</span>
                      {option}
                    </button>
                  ))}
                </div>
                <button onClick={() => setIdeaOptions(null)} className="mt-4 text-[13px] font-medium text-ink-body hover:text-ink-title">
                  ← 답변 다시 하기
                </button>
              </>
            ) : (
              <>
                <h1 className="mt-1 text-[20px] font-bold leading-snug text-ink-title">{ds.question}</h1>
                <p className="mt-1 text-[13px] text-ink-body">
                  {dStep + 1} / {DISCOVERY_STEPS.length}
                </p>
                {ds.type === "choice" ? (
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {ds.options?.map((option) => (
                      <button
                        key={option}
                        onClick={() => setDAnswers((prev) => ({ ...prev, [ds.key]: option }))}
                        className={
                          "flex items-center justify-center rounded-2xl border px-4 py-3.5 text-[15px] font-medium transition-colors duration-200 " +
                          (dv === option ? "border-primary bg-primary/5 text-primary" : "border-[#E5E8EB] bg-white text-ink-body hover:border-[#D1D5DB]")
                        }
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={dv}
                    onChange={(e) => setDAnswers((prev) => ({ ...prev, [ds.key]: e.target.value }))}
                    placeholder={ds.placeholder}
                    className="mt-4 min-h-[100px] w-full resize-none rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3.5 text-base leading-relaxed text-ink-title placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                )}
                <div className="mt-5 flex gap-3">
                  {dStep > 0 && (
                    <button
                      onClick={() => setDStep(dStep - 1)}
                      className="flex h-[52px] flex-1 items-center justify-center rounded-2xl border border-[#E5E8EB] bg-white text-[15px] font-semibold text-ink-body transition-colors duration-200 hover:border-[#D1D5DB] hover:text-ink-title"
                    >
                      이전
                    </button>
                  )}
                  <button
                    onClick={() => void handleDiscoveryNext()}
                    disabled={dNextDisabled}
                    className="flex h-[52px] flex-[2] items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)] transition-all duration-200 enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {dStep === DISCOVERY_STEPS.length - 1 ? "아이디어 추천받기" : "다음"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    );
  }

  // ===== 브랜드명 화면 =====
  if (phase === "brand") {
    return (
      <main className="flex flex-1 flex-col px-5 pt-4 pb-[140px] animate-fadeIn md:items-center md:pt-10 md:pb-12">
        <div className="flex w-full flex-col gap-4 md:max-w-[680px]">
          <section className="rounded-[24px] border border-[#ECEEF2] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:p-8">
            <button
              onClick={() => {
                if (idea.trim().length > 0) {
                  navigate("/project/analyze");
                } else {
                  // 아이디어 발굴을 통해 왔으면 발굴 마지막 단계로 되돌아간다
                  setPhase("discover");
                  setDStep(DISCOVERY_STEPS.length - 1);
                  window.scrollTo(0, 0);
                }
              }}
              className="mb-3 flex items-center gap-1 text-[13px] font-medium text-ink-body transition-colors hover:text-ink-title"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
              이전
            </button>
            <span className="text-[12px] font-semibold text-primary">시작하기 전에</span>
            <h1 className="mt-1 text-[20px] font-bold text-ink-title">브랜드명을 직접 정하시겠습니까?</h1>
            {idea.trim().length > 0 && <p className="mt-1 text-[13px] text-ink-body">아이디어: {idea}</p>}

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setBrandChoice("direct");
                  setBrandError("");
                }}
                className={
                  "flex flex-1 items-center justify-center rounded-2xl border px-4 py-3.5 text-[15px] font-medium transition-colors duration-200 " +
                  (brandChoice === "direct" ? "border-primary bg-primary/5 text-primary" : "border-[#E5E8EB] bg-white text-ink-body hover:border-[#D1D5DB]")
                }
              >
                직접 입력
              </button>
              <button
                onClick={() => void handleBrandAI()}
                className={
                  "flex flex-1 items-center justify-center gap-1.5 rounded-2xl border px-4 py-3.5 text-[15px] font-medium transition-colors duration-200 " +
                  (brandChoice === "ai" ? "border-primary bg-primary/5 text-primary" : "border-[#E5E8EB] bg-white text-ink-body hover:border-[#D1D5DB]")
                }
              >
                AI에게 추천받기
              </button>
            </div>

            {brandError && <p className="mt-3 text-[13px] text-ink-body">{brandError}</p>}

            {brandChoice === "direct" && (
              <div className="mt-4 animate-fadeIn">
                <input
                  value={brandInput}
                  onChange={(e) => setBrandInput(e.target.value)}
                  placeholder="예: OneStock"
                  className="h-[50px] w-full rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 text-base text-ink-title placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={() => saveBrand(brandInput, "직접")}
                  disabled={brandInput.trim().length === 0}
                  className="mt-3 flex h-[52px] w-full items-center justify-center rounded-2xl bg-primary text-[15px] font-semibold text-white transition-all duration-200 enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  저장하고 인터뷰 시작
                </button>
              </div>
            )}

            {brandChoice === "ai" && (
              <div className="mt-4 animate-fadeIn">
                {isBrandLoading && (
                  <p className="flex items-center gap-2 text-[13px] font-medium text-primary">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden="true" />
                    AI가 브랜드명을 만드는 중입니다...
                  </p>
                )}
                {brandOptions && !isBrandLoading && (
                  <div className="flex flex-col gap-2">
                    {brandOptions.map((name) => (
                      <button
                        key={name}
                        onClick={() => saveBrand(name, "AI")}
                        className="flex items-center justify-between rounded-2xl border border-[#E5E8EB] bg-white px-4 py-3 text-[15px] font-semibold text-ink-title transition-colors duration-200 hover:border-primary hover:bg-primary/5"
                      >
                        {name}
                        <span className="text-[12px] font-medium text-primary">선택</span>
                      </button>
                    ))}
                    <button
                      onClick={() => void handleBrandAI()}
                      className="mt-1 flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#D1D5DB] bg-white px-4 py-3 text-[13.5px] font-semibold text-ink-body transition-colors duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    >
                      <RefreshCw className="h-4 w-4" />
                      마음에 드는 이름이 없어요, 다시 추천받기
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

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
                STEP {stepIndex + 1} <span className="mx-1 text-[#D1D5DB]" aria-hidden="true">·</span> {step.label}
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
            <div className="mt-4">
              {optionsLoadingField === step.field && !dynamicOptions[step.field] ? (
                // 선택지 생성 중
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E8EB] py-10">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden="true" />
                  <p className="text-[13px] font-medium text-ink-body">이 서비스에 맞는 선택지를 준비하고 있어요...</p>
                </div>
              ) : (
              <>
              {optionsFailedField === step.field && !dynamicOptions[step.field] && (
                // 자동 재시도까지 실패 → 다시 시도 버튼 + 아래에 기본 선택지 제공 (막히지 않게)
                <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-[#FDE68A] bg-[#FEF9C3] px-3.5 py-2.5">
                  <p className="text-[12.5px] font-medium text-[#92400E]">맞춤 선택지를 못 불러왔어요. 아래 기본 선택지를 쓰거나 다시 시도해보세요.</p>
                  <button
                    onClick={() => { setOptionsFailedField(null); setOptionsRetryKey((k) => k + 1); }}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#92400E] px-2.5 text-[12px] font-semibold text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    다시 시도
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {currentOptions.map((option) => {
                  const isSelected = value === option;
                  return (
                    <button
                      key={option}
                      onClick={() => setValue(option)}
                      className={
                        "flex items-center justify-center rounded-2xl border px-4 py-3.5 text-center text-[15px] font-medium transition-colors duration-200 " +
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
              </>
              )}
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
  const project = loadCurrentProject();
  const brandName = typeof project.brandName === "string" ? project.brandName : "";
  const response = await fetch("/api/project/generate-prd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, brandName, answers, instruction, currentPrd }),
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
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
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

  // 브랜드명(제목) 직접 수정
  const handleSaveTitle = () => {
    if (!prd || titleDraft.trim().length === 0) return;
    const updated = { ...prd, title: titleDraft.trim() };
    savePRD(updated);
    updateCurrentProject({ brandName: titleDraft.trim(), brandSource: "직접" });
    setPrd(updated);
    setIsTitleEditing(false);
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
            {isTitleEditing ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="h-[44px] min-w-0 flex-1 rounded-xl border border-primary/40 bg-white px-3 text-[18px] font-bold text-ink-title focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={titleDraft.trim().length === 0}
                  className="flex h-[44px] shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  저장
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <h1 className="text-[24px] font-bold leading-snug text-ink-title">{prd.title}</h1>
                <button
                  aria-label="브랜드명 수정"
                  onClick={() => {
                    setTitleDraft(prd.title);
                    setIsTitleEditing(true);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-body transition-colors hover:bg-[#F3F4F6] hover:text-ink-title"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </button>
              </div>
            )}
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
            앱 디자인 미리보기 만들기
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

/* ---------- 페이지: 앱 디자인 편집기 (Phase 5) ---------- */

interface UIDesign {
  style: string;
  color: string;
  font: "기본" | "둥근" | "깔끔" | "고급";
  button: "각짐" | "둥근" | "라운드";
  dark: boolean;
}

const DEFAULT_DESIGN: UIDesign = { style: "심플", color: "#4F6BFF", font: "기본", button: "둥근", dark: false };
const COLOR_OPTIONS = ["#4F6BFF", "#8B5CF6", "#22C55E", "#111827", "#EF4444", "#F97316", "#EAB308"];

interface ElementEdit {
  label?: string;
  color?: string;
  size?: "작게" | "보통" | "크게";
  radius?: "각짐" | "둥근" | "라운드";
  weight?: "보통" | "굵게";
  align?: "left" | "center" | "right";
  scale?: number; // 80 ~ 130 (%)
}

type UIOverrides = Record<string, ElementEdit>;

interface EditorState {
  ui: ProjectUI;
  design: UIDesign;
  overrides: UIOverrides;
}

interface UIVersion {
  id: number;
  savedAt: string;
  note: string;
  state: EditorState;
}

function radiusClass(radius: ElementEdit["radius"], base: UIDesign["button"]): string {
  const r = radius ?? base;
  if (r === "각짐") return "rounded-md";
  if (r === "라운드") return "rounded-3xl";
  return "rounded-xl";
}

function fontClass(font: UIDesign["font"]): string {
  if (font === "둥근") return "tracking-wide";
  if (font === "깔끔") return "tracking-tight";
  if (font === "고급") return "font-serif";
  return "";
}

function loadEditorState(): { ui: ProjectUI | null; design: UIDesign; overrides: UIOverrides; versions: UIVersion[] } {
  const project = loadCurrentProject();
  const ui = typeof project.ui === "object" && project.ui !== null ? (project.ui as ProjectUI) : null;
  const design =
    typeof project.uiDesign === "object" && project.uiDesign !== null
      ? { ...DEFAULT_DESIGN, ...(project.uiDesign as Partial<UIDesign>) }
      : { ...DEFAULT_DESIGN };
  const overrides =
    typeof project.uiOverrides === "object" && project.uiOverrides !== null ? (project.uiOverrides as UIOverrides) : {};
  const versions = Array.isArray(project.uiVersions) ? (project.uiVersions as UIVersion[]) : [];
  return { ui, design, overrides, versions };
}

function persistEditor(state: EditorState, versions: UIVersion[]) {
  updateCurrentProject({
    ui: state.ui,
    uiDesign: state.design,
    uiOverrides: state.overrides,
    uiVersions: versions.slice(0, 10),
    status: "mockup",
    step: "ui-mockup",
  });
  try {
    const current = loadCurrentProject();
    const id = typeof current.id === "string" ? current.id : "";
    if (!id) return;
    const raw = localStorage.getItem(PROJECTS_LIST_KEY);
    const list = raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];
    if (!Array.isArray(list)) return;
    localStorage.setItem(
      PROJECTS_LIST_KEY,
      JSON.stringify(list.map((p) => (p.id === id ? { ...p, ui: state.ui, status: "mockup", updatedAt: new Date().toISOString() } : p)))
    );
  } catch {
    // 목록 저장 실패는 무시
  }
}

function screenGroup(screen: UIScreen): "필수 화면" | "추가 화면" | "관리 화면" {
  const key = screen.id + screen.name;
  if (/(admin|관리|통계|설정|setting|stat|대시보드)/i.test(key)) return "관리 화면";
  if (/(home|홈|login|로그인|signup|회원|가입|메인|온보딩|onboard)/i.test(key)) return "필수 화면";
  return "추가 화면";
}

function screenIcon(screen: UIScreen) {
  const key = screen.id + screen.name;
  const cls = "h-4 w-4";
  if (/(home|홈|메인)/i.test(key)) return <HomeIcon className={cls} />;
  if (/(login|로그인)/i.test(key)) return <LogIn className={cls} />;
  if (/(signup|회원|가입)/i.test(key)) return <UserPlus className={cls} />;
  if (/(search|검색)/i.test(key)) return <SearchIcon className={cls} />;
  if (/(my|마이|프로필|profile)/i.test(key)) return <UserIcon className={cls} />;
  if (/(alarm|알림|notification)/i.test(key)) return <Bell className={cls} />;
  if (/(setting|설정)/i.test(key)) return <SettingsIcon className={cls} />;
  if (/(관리|admin|대시보드)/i.test(key)) return <ShieldCheck className={cls} />;
  if (/(통계|stat|chart|차트|분석)/i.test(key)) return <BarChart3 className={cls} />;
  if (/(찜|즐겨|관심|favorite|heart)/i.test(key)) return <Heart className={cls} />;
  if (/(chat|채팅|메시지)/i.test(key)) return <MessageCircle className={cls} />;
  if (/(calendar|캘린더|일정|예약)/i.test(key)) return <CalendarIcon className={cls} />;
  if (/(상세|detail|정보)/i.test(key)) return <FileText className={cls} />;
  return <LayoutGrid className={cls} />;
}

/* ---------- 목업 블록 ---------- */

function MockBlock({
  label,
  design,
  edit,
  selected,
  onSelect,
}: {
  label: string;
  design: UIDesign;
  edit: ElementEdit;
  selected: boolean;
  onSelect: () => void;
}) {
  const has = (...keys: string[]) => keys.some((k) => label.includes(k));
  const color = edit.color ?? design.color;
  const text = edit.label ?? label;
  const rc = radiusClass(edit.radius, design.button);
  const scale = (edit.scale ?? 100) / 100;
  const pad = edit.size === "작게" ? "py-1.5" : edit.size === "크게" ? "py-4" : "py-2.5";
  const fontSize = `${Math.round(11 * scale * (edit.size === "작게" ? 0.9 : edit.size === "크게" ? 1.2 : 1))}px`;
  const cardBg = design.dark ? "bg-[#1F2937] border-[#374151]" : "bg-white border-[#ECEEF2]";
  const softBg = design.dark ? "bg-[#374151]" : "bg-[#F3F4F6]";
  const lineBg = design.dark ? "bg-[#4B5563]" : "bg-[#E5E8EB]";
  const bodyText = design.dark ? "text-[#D1D5DB]" : "text-ink-body";
  const titleText = design.dark ? "text-white" : "text-ink-title";
  const textStyle: React.CSSProperties = {
    fontSize,
    fontWeight: edit.weight === "굵게" ? 700 : undefined,
    textAlign: edit.align,
  };

  let inner: React.ReactNode;

  if (has("검색")) {
    inner = (
      <div className={cn("flex h-9 items-center gap-2 px-3", rc, softBg)}>
        <SearchIcon className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
        <span className="min-w-0 flex-1 truncate text-[#9CA3AF]" style={textStyle}>{text}</span>
      </div>
    );
  } else if (has("배너", "공지")) {
    inner = (
      <div className={cn("flex h-16 items-center justify-center px-3 font-semibold text-white", rc)} style={{ background: `linear-gradient(90deg, ${color}CC, ${color}88)`, ...textStyle }}>
        {text}
      </div>
    );
  } else if (has("차트", "그래프", "통계")) {
    inner = (
      <div className={cn("border p-3", rc, cardBg)}>
        <p className={cn("font-semibold", bodyText)} style={textStyle}>{text}</p>
        <div className="mt-2 flex h-14 items-end gap-1.5">
          {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `${color}B3` }} />
          ))}
        </div>
      </div>
    );
  } else if (has("카드")) {
    inner = (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map((i) => (
          <div key={i} className={cn("border px-2.5", rc, cardBg, pad)}>
            <div className={cn("h-10 rounded-lg", softBg)} />
            <div className={cn("mt-1.5 h-2 w-3/4 rounded", lineBg)} />
            <div className={cn("mt-1 h-2 w-1/2 rounded", softBg)} />
          </div>
        ))}
      </div>
    );
  } else if (has("리스트", "목록", "알림", "체크", "내역")) {
    inner = (
      <div className={cn("border", rc, cardBg, design.dark ? "divide-y divide-[#374151]" : "divide-y divide-[#ECEEF2]")}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("flex items-center gap-2 px-3", pad)}>
            <div className={cn("h-6 w-6 shrink-0 rounded-lg", softBg)} />
            <div className="min-w-0 flex-1">
              <div className={cn("h-2 w-2/3 rounded", lineBg)} />
              <div className={cn("mt-1 h-2 w-1/3 rounded", softBg)} />
            </div>
          </div>
        ))}
        <p className={cn("px-3 py-1.5", bodyText)} style={{ ...textStyle, fontSize: `${Math.round(9 * scale)}px` }}>{text}</p>
      </div>
    );
  } else if (has("프로필")) {
    inner = (
      <div className={cn("flex items-center gap-2.5 border p-3", rc, cardBg)}>
        <div className={cn("h-10 w-10 shrink-0 rounded-full", lineBg)} />
        <div className="min-w-0 flex-1">
          <div className={cn("h-2.5 w-1/2 rounded", lineBg)} />
          <div className={cn("mt-1.5 h-2 w-2/3 rounded", softBg)} />
        </div>
      </div>
    );
  } else if (has("이미지", "사진", "갤러리")) {
    inner = (
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={cn("aspect-square rounded-lg", softBg)} />
        ))}
      </div>
    );
  } else if (has("캘린더", "달력", "일정")) {
    inner = (
      <div className={cn("border p-3", rc, cardBg)}>
        <p className={cn("font-semibold", bodyText)} style={textStyle}>{text}</p>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {Array.from({ length: 21 }).map((_, i) => (
            <div key={i} className={cn("aspect-square rounded", i === 9 ? "" : softBg)} style={i === 9 ? { background: color } : undefined} />
          ))}
        </div>
      </div>
    );
  } else if (has("탭") && !has("탭바")) {
    inner = (
      <div className={cn("flex gap-1 p-1", rc, softBg)}>
        {["탭 1", "탭 2", "탭 3"].map((t, i) => (
          <div key={t} className={cn("flex-1 rounded-lg py-1.5 text-center font-medium", i === 0 ? (design.dark ? "bg-[#111827] text-white" : "bg-white text-ink-title shadow-sm") : bodyText)} style={{ fontSize: `${Math.round(10 * scale)}px` }}>{t}</div>
        ))}
      </div>
    );
  } else if (has("입력", "폼")) {
    inner = (
      <div className="flex flex-col gap-2">
        <div className={cn("h-9 border px-3 py-2.5 text-[#9CA3AF]", rc, design.dark ? "border-[#374151] bg-[#1F2937]" : "border-[#E5E8EB] bg-[#F8FAFC]")} style={textStyle}>{text}</div>
        <div className={cn("h-9 border", rc, design.dark ? "border-[#374151] bg-[#1F2937]" : "border-[#E5E8EB] bg-[#F8FAFC]")} />
      </div>
    );
  } else if (has("지도")) {
    inner = (
      <div className={cn("relative h-20 overflow-hidden", rc, design.dark ? "bg-[#374151]" : "bg-[#E8F0E9]")}>
        <div className="absolute left-1/4 top-1/3 h-2 w-2 rounded-full" style={{ background: color }} />
        <div className="absolute left-2/3 top-1/2 h-2 w-2 rounded-full bg-accent" />
        <p className={cn("absolute bottom-1 right-2", bodyText)} style={{ fontSize: `${Math.round(9 * scale)}px` }}>{text}</p>
      </div>
    );
  } else if (has("채팅")) {
    inner = (
      <div className="flex flex-col gap-1.5">
        <div className={cn("max-w-[70%] self-start rounded-2xl rounded-tl-sm px-3 py-1.5", softBg, bodyText)} style={textStyle}>메시지</div>
        <div className="max-w-[70%] self-end rounded-2xl rounded-tr-sm px-3 py-1.5 text-white" style={{ background: `${color}D9`, ...textStyle }}>답장</div>
      </div>
    );
  } else if (has("FAB")) {
    inner = (
      <div className="flex justify-end">
        <div className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg" style={{ background: color }}>
          <Plus className="h-4 w-4" />
        </div>
      </div>
    );
  } else if (has("버튼")) {
    inner = (
      <div className={cn("flex items-center justify-center font-semibold text-white", rc, pad)} style={{ background: color, ...textStyle }}>
        {text}
      </div>
    );
  } else if (has("메뉴", "설정")) {
    inner = (
      <div className={cn("border", rc, cardBg, design.dark ? "divide-y divide-[#374151]" : "divide-y divide-[#ECEEF2]")}>
        {[text, "항목", "항목"].map((t, i) => (
          <div key={i} className={cn("flex items-center justify-between px-3", pad, titleText)} style={textStyle}>
            {t}
            <ChevronDown className="h-3 w-3 -rotate-90 text-[#9CA3AF]" />
          </div>
        ))}
      </div>
    );
  } else if (has("텍스트", "제목", "인사")) {
    inner = (
      <p className={cn("px-0.5 font-bold", titleText)} style={{ ...textStyle, fontSize: `${Math.round(16 * scale)}px` }}>{text}</p>
    );
  } else {
    inner = <div className={cn("flex h-10 items-center justify-center border border-dashed", rc, design.dark ? "border-[#4B5563]" : "border-[#D1D5DB]", bodyText)} style={textStyle}>{text}</div>;
  }

  return (
    <motion.button
      type="button"
      layout
      onClick={onSelect}
      aria-label={`${text} 편집`}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "block w-full rounded-lg text-left transition-shadow duration-150",
        selected ? "ring-2 ring-primary ring-offset-2" : "hover:ring-2 hover:ring-primary/30"
      )}
    >
      <div className={fontClass(design.font)}>{inner}</div>
    </motion.button>
  );
}

/* ---------- 드래그 가능한 화면 목록 아이템 ---------- */

function SortableScreenItem({
  screen,
  active,
  onSelect,
  onDelete,
}: {
  screen: UIScreen;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: screen.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: DndCSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-1 rounded-xl", isDragging && "z-10 opacity-80 shadow-lg")}
    >
      <button
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition-colors",
          active ? "bg-primary/10 font-semibold text-primary" : "font-medium text-ink-body hover:bg-[#F8FAFC]"
        )}
      >
        <span className={cn("shrink-0", active ? "text-primary" : "text-[#9CA3AF]")}>{screenIcon(screen)}</span>
        <span className="truncate">{screen.name}</span>
      </button>
      {active && (
        <button onClick={onDelete} aria-label="화면 삭제" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-body hover:bg-red-50 hover:text-red-500">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      <span {...attributes} {...listeners} aria-label="순서 변경" className="flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-[#C4C9D1] active:cursor-grabbing">
        <GripVertical className="h-4 w-4" />
      </span>
    </li>
  );
}

/* ---------- 앱 디자인 편집기 페이지 ---------- */

type EditorPhase = "setup" | "loading" | "ready" | "error" | "done";
type EditorTab = "preview" | "element" | "ai";

const QUICK_GROUPS: { title: string; items: string[] }[] = [
  { title: "추가하기", items: ["카드 추가", "버튼 추가", "검색창 추가", "배너 추가", "차트 추가", "아이콘 추가", "목록 추가", "탭 추가", "하단 메뉴 추가", "상단 메뉴 추가", "공지사항 추가"] },
  { title: "디자인", items: ["더 심플하게", "더 깔끔하게", "더 현대적으로", "더 고급스럽게", "더 귀엽게", "더 세련되게", "간격 넓게", "간격 좁게", "글자 크게", "글자 작게", "더 밝게", "애니메이션 추가"] },
  { title: "기능", items: ["로그인 추가", "검색 기능 추가", "즐겨찾기 추가", "알림 추가", "공유 기능 추가", "설정 추가"] },
];


function MockupPage() {
  const navigate = useNavigate();
  const [prd, setPrd] = useState<ProjectPRD | null>(() => loadSavedPRD());
  const savedEditor = loadEditorState();

  const [ui, setUi] = useState<ProjectUI | null>(savedEditor.ui);
  const [design, setDesign] = useState<UIDesign>(savedEditor.design);
  const [overrides, setOverrides] = useState<UIOverrides>(savedEditor.overrides);
  const [versions, setVersions] = useState<UIVersion[]>(savedEditor.versions);
  const [phase, setPhase] = useState<EditorPhase>(savedEditor.ui ? "ready" : "setup");
  const [tab, setTab] = useState<EditorTab>("preview");

  const [selectedScreenId, setSelectedScreenId] = useState<string>(savedEditor.ui?.screens[0]?.id ?? "");
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [instruction, setInstruction] = useState("");
  const [setupStyleInput, setSetupStyleInput] = useState("");
  const [newScreenName, setNewScreenName] = useState("");
  const [isAddingScreen, setIsAddingScreen] = useState(false);
  const [compare, setCompare] = useState<EditorState | null>(null);
  const [isTitleEdit, setIsTitleEdit] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [savedNotice, setSavedNotice] = useState("저장됨");

  const undoStack = useRef<EditorState[]>([]);
  const redoStack = useRef<EditorState[]>([]);
  const pendingInstructionRef = useRef<string | undefined>(undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const currentState = (): EditorState => ({ ui: ui as ProjectUI, design, overrides });

  const flashSaved = () => {
    setSavedNotice("저장 중...");
    window.setTimeout(() => setSavedNotice("저장됨"), 500);
  };

  const save = (next: Partial<EditorState>, versionNote?: string) => {
    const state: EditorState = { ui: (next.ui ?? ui) as ProjectUI, design: next.design ?? design, overrides: next.overrides ?? overrides };
    let nextVersions = versions;
    if (versionNote) {
      nextVersions = [{ id: Date.now(), savedAt: new Date().toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit" }), note: versionNote, state }, ...versions].slice(0, 10);
      setVersions(nextVersions);
    }
    persistEditor(state, nextVersions);
    flashSaved();
  };

  const pushHistory = () => {
    if (!ui) return;
    undoStack.current = [...undoStack.current.slice(-19), currentState()];
    redoStack.current = [];
  };

  const applyState = (state: EditorState) => {
    setUi(state.ui);
    setDesign(state.design);
    setOverrides(state.overrides);
    if (!state.ui.screens.some((sc) => sc.id === selectedScreenId)) {
      setSelectedScreenId(state.ui.screens[0]?.id ?? "");
    }
    setSelectedElement(null);
    persistEditor(state, versions);
    flashSaved();
  };

  const handleUndo = () => {
    const prev = undoStack.current.pop();
    if (!prev || !ui) return;
    redoStack.current.push(currentState());
    applyState(prev);
  };

  const handleRedo = () => {
    const next = redoStack.current.pop();
    if (!next || !ui) return;
    undoStack.current.push(currentState());
    applyState(next);
  };

  // ---- AI 생성/수정 ----
  useEffect(() => {
    if (!prd || phase !== "loading") return;
    let cancelled = false;

    (async () => {
      try {
        const pending = pendingInstructionRef.current;
        pendingInstructionRef.current = undefined;
        const generated = await fetchGenerateUI(prd, pending, pending && ui ? ui : undefined);
        if (cancelled) return;
        if (ui) {
          setCompare({ ui, design, overrides });
          pushHistory();
        }
        setUi(generated);
        setOverrides({});
        setSelectedElement(null);
        setSelectedScreenId((prev) => (generated.screens.some((sc) => sc.id === prev) ? prev : generated.screens[0]?.id ?? ""));
        save({ ui: generated, overrides: {} }, pending ? `AI 수정: ${pending.slice(0, 16)}` : "첫 디자인 생성");
        setPhase("ready");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, prd]);

  const runAI = (text: string) => {
    if (!text.trim()) return;
    pendingInstructionRef.current = `${text.trim()} (스타일: ${design.style}, 메인 색상: ${design.color})`;
    setPhase("loading");
    window.scrollTo(0, 0);
  };

  const setToken = <K extends keyof UIDesign>(key: K, value: UIDesign[K]) => {
    pushHistory();
    const nextDesign = { ...design, [key]: value };
    setDesign(nextDesign);
    save({ design: nextDesign });
  };

  // ---- 요소 편집 ----
  const overrideKey = (screenId: string, index: number) => `${screenId}:${index}`;

  const updateElement = (patch: ElementEdit) => {
    if (!ui || selectedElement === null) return;
    pushHistory();
    const key = overrideKey(selectedScreenId, selectedElement);
    const nextOverrides = { ...overrides, [key]: { ...overrides[key], ...patch } };
    setOverrides(nextOverrides);
    save({ overrides: nextOverrides });
  };

  const resetElement = () => {
    if (!ui || selectedElement === null) return;
    pushHistory();
    const key = overrideKey(selectedScreenId, selectedElement);
    const nextOverrides = { ...overrides };
    delete nextOverrides[key];
    setOverrides(nextOverrides);
    save({ overrides: nextOverrides });
  };

  const deleteElement = () => {
    if (!ui || selectedElement === null) return;
    pushHistory();
    const nextScreens = ui.screens.map((sc) =>
      sc.id === selectedScreenId ? { ...sc, components: sc.components.filter((_, i) => i !== selectedElement) } : sc
    );
    const nextUi = { ...ui, screens: nextScreens };
    setUi(nextUi);
    setSelectedElement(null);
    save({ ui: nextUi });
    setTab("preview");
  };

  // ---- 화면 관리 ----
  const handleAddScreen = () => {
    if (!newScreenName.trim()) return;
    runAI(`'${newScreenName.trim()}' 화면을 새로 추가해줘. 기존 화면은 유지해줘.`);
    setNewScreenName("");
    setIsAddingScreen(false);
  };

  const handleDeleteScreen = (id: string) => {
    if (!ui || ui.screens.length <= 1) return;
    pushHistory();
    const nextUi = { ...ui, screens: ui.screens.filter((sc) => sc.id !== id) };
    setUi(nextUi);
    if (selectedScreenId === id) setSelectedScreenId(nextUi.screens[0].id);
    save({ ui: nextUi });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!ui) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ui.screens.findIndex((sc) => sc.id === active.id);
    const newIndex = ui.screens.findIndex((sc) => sc.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    pushHistory();
    const nextUi = { ...ui, screens: arrayMove(ui.screens, oldIndex, newIndex) };
    setUi(nextUi);
    save({ ui: nextUi });
  };

  // ---- 브랜드명 수정 ----
  const handleSaveTitle = () => {
    if (!prd || titleInput.trim().length === 0) return;
    const nextPrd = { ...prd, title: titleInput.trim() };
    setPrd(nextPrd);
    savePRD(nextPrd);
    updateCurrentProject({ brandName: titleInput.trim() });
    setIsTitleEdit(false);
    flashSaved();
  };

  // ---- AI 추천 개선사항 (화면 분석 기반) ----
  const buildSuggestions = (screen: UIScreen): { text: string; action: string }[] => {
    const all = screen.components.join(" ");
    const suggestions: { text: string; action: string }[] = [];
    if (!all.includes("검색")) suggestions.push({ text: "검색창을 추가하면 사용성이 좋아집니다.", action: "검색창 추가" });
    if (!all.includes("버튼")) suggestions.push({ text: "이동을 유도하는 버튼을 추가하는 것을 추천합니다.", action: "버튼 추가" });
    else suggestions.push({ text: "버튼을 조금 더 크게 하면 누르기 쉬워집니다.", action: "버튼을 더 크게" });
    if (!all.includes("차트") && !all.includes("통계")) suggestions.push({ text: "차트를 추가하면 정보가 한눈에 들어옵니다.", action: "차트 추가" });
    if (all.includes("카드")) suggestions.push({ text: "카드 간격을 넓히면 가독성이 좋아집니다.", action: "카드 간격을 넓게" });
    suggestions.push({ text: "하단 메뉴 아이콘을 더 직관적으로 바꿔보세요.", action: "하단 메뉴 아이콘을 더 직관적으로" });
    return suggestions.slice(0, 4);
  };

  const handleRevertCompare = () => {
    if (!compare) return;
    applyState(compare);
    setCompare(null);
  };

  const handleConfirmDesign = () => {
    if (!ui) return;
    save({}, "디자인 확정");
    updateCurrentProject({ status: "design-confirmed", step: "design-done", progress: 60 });
    setPhase("done");
    window.scrollTo(0, 0);
  };

  // ================= 분기 화면 =================

  if (!prd) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-5 pt-4 pb-[140px] animate-fadeIn md:pb-12">
        <p className="text-[15px] text-ink-body">먼저 인터뷰를 완료하고 기획서를 만들어주세요.</p>
        <button onClick={() => navigate("/project/summary")} className="flex h-[48px] w-full max-w-[280px] items-center justify-center rounded-2xl bg-primary text-[15px] font-semibold text-white">
          기획서 화면으로
        </button>
      </main>
    );
  }

  if (phase === "setup") {
    const startWithStyle = (styleText: string) => {
      const nextDesign = { ...design, style: styleText };
      setDesign(nextDesign);
      persistEditor({ ui: { theme: "", navigation: "", flow: [], screens: [] }, design: nextDesign, overrides: {} }, versions);
      runAI(styleText === "AI 추천" ? "이 서비스에 가장 어울리는 스타일로 앱 디자인을 만들어줘" : `${styleText} 느낌으로 앱 디자인을 만들어줘`);
    };

    return (
      <main className="flex flex-1 flex-col px-5 pt-4 pb-[140px] animate-fadeIn md:items-center md:pt-10 md:pb-12">
        <div className="flex w-full flex-col gap-4 md:max-w-[560px]">
          <section className="rounded-[24px] border border-[#ECEEF2] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:p-8">
            <button
              onClick={() => navigate("/project/summary")}
              className="mb-3 flex items-center gap-1 text-[13px] font-medium text-ink-body transition-colors hover:text-ink-title"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
              이전
            </button>

            <span className="text-[12px] font-semibold text-primary">앱 디자인 미리보기</span>
            <h1 className="mt-1 text-[22px] font-bold text-ink-title">어떤 느낌으로 만들까요?</h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-body">원하는 분위기를 자유롭게 적어주세요. 어렵다면 AI가 알아서 어울리게 만들어드릴게요.</p>

            <textarea
              value={setupStyleInput}
              onChange={(e) => setSetupStyleInput(e.target.value)}
              placeholder="예: 깔끔하고 심플하게 / 토스처럼 세련되게 / 따뜻하고 귀여운 느낌으로"
              className="mt-4 min-h-[92px] w-full resize-none rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3.5 text-base leading-relaxed text-ink-title placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
            />

            <h2 className="mt-6 text-[15px] font-semibold text-ink-title">메인 색상</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              {COLOR_OPTIONS.map((color) => (
                <button key={color} onClick={() => setDesign((d) => ({ ...d, color }))} aria-label={`색상 ${color}`} className={cn("h-9 w-9 rounded-full transition-transform", design.color === color ? "scale-110 ring-2 ring-primary ring-offset-2" : "hover:scale-105")} style={{ background: color }} />
              ))}
              <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-badge border border-[#E5E8EB] px-3 text-[12px] font-medium text-ink-body">
                직접 선택
                <input type="color" value={design.color} onChange={(e) => setDesign((d) => ({ ...d, color: e.target.value }))} className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" />
              </label>
            </div>

            <button
              onClick={() => startWithStyle(setupStyleInput.trim() || "심플")}
              className="mt-6 flex h-[52px] w-full items-center justify-center rounded-2xl bg-primary text-[15px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              디자인 미리보기 만들기
            </button>

            <button
              onClick={() => startWithStyle("AI 추천")}
              className="mt-2.5 flex h-[48px] w-full items-center justify-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/5 text-[14px] font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              <Sparkles className="h-4 w-4" />
              그냥 AI가 어울리게 추천해줘
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (phase === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pt-4 pb-[140px] animate-fadeIn md:pb-12">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" aria-hidden="true" />
        <div className="text-center">
          <p className="text-[16px] font-semibold text-ink-title">AI가 디자인을 만들고 있습니다.</p>
          <p className="mt-1 text-[14px] text-ink-body">잠시만 기다려주세요. (예상 5~15초)</p>
        </div>
      </main>
    );
  }

  if (phase === "error" || !ui) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pt-4 pb-[140px] animate-fadeIn md:pb-12">
        <p className="text-[16px] font-semibold text-ink-title">생성 실패</p>
        <p className="text-[14px] text-ink-body">디자인 생성에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
        <button onClick={() => setPhase(ui ? "loading" : "setup")} className="flex h-[48px] w-full max-w-[280px] items-center justify-center rounded-2xl bg-primary text-[15px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)]">
          다시 시도
        </button>
      </main>
    );
  }

  if (phase === "done") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pt-4 pb-[140px] text-center animate-fadeIn md:pb-12">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-7 w-7 text-primary" />
        </span>
        <div>
          <p className="text-[18px] font-bold text-ink-title">디자인이 완료되었습니다.</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-body">다음으로 React 코드 생성을 진행합니다.<br />코드 생성 기능은 다음 단계에서 열립니다.</p>
        </div>
        <button onClick={() => setPhase("ready")} className="flex h-[48px] w-full max-w-[280px] items-center justify-center rounded-2xl border border-[#E5E8EB] bg-white text-[14px] font-semibold text-ink-title hover:border-[#D1D5DB]">
          디자인 다시 수정하기
        </button>
      </main>
    );
  }

  const selectedScreen = ui.screens.find((sc) => sc.id === selectedScreenId) ?? ui.screens[0];
  const selectedEdit = selectedElement !== null ? overrides[overrideKey(selectedScreen.id, selectedElement)] ?? {} : null;
  const isBottomTab = ui.navigation.includes("Bottom") || ui.navigation.includes("혼합");
  const groupNames: ("필수 화면" | "추가 화면" | "관리 화면")[] = ["필수 화면", "추가 화면", "관리 화면"];
  const suggestions = buildSuggestions(selectedScreen);

  /* ---------- 공용 조각 ---------- */

  const phonePreview = (
    <div className={cn("relative w-full max-w-[300px] overflow-hidden rounded-[34px] border-[7px] border-[#111827] shadow-[0_16px_40px_rgba(15,23,42,0.18)]", design.dark ? "bg-[#111827]" : "bg-white")}>
      {/* 상태바 + 노치 */}
      <div className={cn("relative flex h-9 items-end justify-between px-5 pb-1", design.dark ? "bg-[#111827]" : "bg-white")}>
        <span className={cn("text-[10px] font-bold", design.dark ? "text-white" : "text-ink-title")}>9:41</span>
        <span className="absolute left-1/2 top-0 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-[#111827]" aria-hidden="true" />
        <span className={cn("flex items-center gap-1 text-[9px]", design.dark ? "text-white" : "text-ink-title")} aria-hidden="true">▮▮▮ ⏻</span>
      </div>
      <div className={cn("flex h-8 items-center justify-center border-b", design.dark ? "border-[#374151]" : "border-[#ECEEF2]")}>
        <span className={cn("truncate px-4 text-[11.5px] font-bold", design.dark ? "text-white" : "text-ink-title")}>{selectedScreen.name}</span>
      </div>
      <div className={cn("flex min-h-[380px] flex-col gap-2.5 p-3", design.dark ? "bg-[#0B1220]" : "bg-[#F8FAFC]")}>
        {selectedScreen.components.length === 0 && (
          <p className="py-10 text-center text-[11px] text-ink-body">구성 요소가 없습니다. AI 수정으로 추가해보세요.</p>
        )}
        {selectedScreen.components.map((component, index) => (
          <MockBlock
            key={component + index}
            label={component}
            design={design}
            edit={overrides[overrideKey(selectedScreen.id, index)] ?? {}}
            selected={selectedElement === index}
            onSelect={() => {
              setSelectedElement((prev) => (prev === index ? null : index));
              if (selectedElement !== index) setTab("element");
            }}
          />
        ))}
      </div>
      {isBottomTab && (
        <div className={cn("flex items-center justify-around border-t py-1.5", design.dark ? "border-[#374151] bg-[#111827]" : "border-[#ECEEF2] bg-white")}>
          {ui.screens.slice(0, 5).map((screen) => (
            <button key={screen.id} onClick={() => { setSelectedScreenId(screen.id); setSelectedElement(null); }} className="flex flex-col items-center gap-0.5 px-1">
              <span style={{ color: screen.id === selectedScreen.id ? design.color : "#9CA3AF" }}>{screenIcon(screen)}</span>
              <span className={cn("max-w-[48px] truncate text-[8.5px]", screen.id === selectedScreen.id ? "font-semibold" : "text-[#9CA3AF]")} style={screen.id === selectedScreen.id ? { color: design.color } : undefined}>{screen.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const screenListPanel = (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[14px] font-bold text-ink-title">화면 목록</h2>
        <button onClick={() => setIsAddingScreen((v) => !v)} className="flex h-8 items-center gap-1 rounded-xl border border-[#E5E8EB] bg-white px-2.5 text-[12px] font-semibold text-ink-title hover:border-[#D1D5DB]">
          <Plus className="h-3.5 w-3.5" /> 새 화면
        </button>
      </div>

      <AnimatePresence>
        {isAddingScreen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-2xl border border-dashed border-[#D1D5DB] p-2.5">
              <input
                value={newScreenName}
                onChange={(e) => setNewScreenName(e.target.value)}
                placeholder="예: 채팅"
                className="h-10 w-full rounded-xl border border-[#E5E8EB] bg-[#F8FAFC] px-3 text-base text-ink-title placeholder:text-[13px] placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button onClick={handleAddScreen} disabled={newScreenName.trim().length === 0} className="mt-1.5 flex h-9 w-full items-center justify-center rounded-xl bg-primary text-[12.5px] font-semibold text-white transition-colors disabled:opacity-40">
                + 새 화면 추가 (AI)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ui.screens.map((sc) => sc.id)} strategy={verticalListSortingStrategy}>
          {groupNames.map((group) => {
            const items = ui.screens.filter((sc) => screenGroup(sc) === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="rounded-2xl border border-[#ECEEF2] bg-white p-2">
                <p className="px-2 py-1.5 text-[11.5px] font-bold text-ink-body">{group}</p>
                <ul className="flex flex-col gap-0.5">
                  {items.map((screen) => (
                    <SortableScreenItem
                      key={screen.id}
                      screen={screen}
                      active={screen.id === selectedScreen.id}
                      onSelect={() => { setSelectedScreenId(screen.id); setSelectedElement(null); }}
                      onDelete={() => handleDeleteScreen(screen.id)}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );

  const elementPanel =
    selectedEdit !== null && selectedElement !== null ? (
      <section className="rounded-2xl border border-primary/40 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[13.5px] font-bold text-ink-title">선택된 요소</h2>
          <div className="flex items-center gap-2">
            <button onClick={deleteElement} className="flex items-center gap-1 text-[12px] font-semibold text-red-500 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
            <button onClick={() => setSelectedElement(null)} aria-label="선택 해제" className="text-ink-body hover:text-ink-title">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
            <Smartphone className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-ink-body">화면 구성 요소</p>
            <p className="truncate text-[13.5px] font-semibold text-ink-title">{selectedEdit.label ?? selectedScreen.components[selectedElement]}</p>
          </div>
        </div>

        <label className="mt-4 block text-[12px] font-semibold text-ink-body">
          내용
          <input
            value={selectedEdit.label ?? selectedScreen.components[selectedElement]}
            onChange={(e) => updateElement({ label: e.target.value })}
            className="mt-1 h-10 w-full rounded-xl border border-[#E5E8EB] bg-[#F8FAFC] px-3 text-base text-ink-title focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <p className="mt-4 text-[12px] font-semibold text-ink-body">글자 크기</p>
        <div className="mt-1.5 flex gap-1.5">
          {(["작게", "보통", "크게"] as const).map((size) => (
            <button key={size} onClick={() => updateElement({ size })} className={cn("flex-1 rounded-xl py-2 text-[12.5px] transition-colors", (selectedEdit.size ?? "보통") === size ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/40" : "bg-[#F3F4F6] text-ink-body hover:bg-[#ECEEF2]")}>{size}</button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <button onClick={() => updateElement({ scale: Math.max(80, (selectedEdit.scale ?? 100) - 10) })} aria-label="작게" className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E8EB] text-ink-body"><Minus className="h-3.5 w-3.5" /></button>
          <input
            type="range" min={80} max={130} step={5}
            value={selectedEdit.scale ?? 100}
            onChange={(e) => updateElement({ scale: Number(e.target.value) })}
            className="h-1.5 flex-1 cursor-pointer accent-[#4F6BFF]"
            aria-label="글자 크기 조절"
          />
          <button onClick={() => updateElement({ scale: Math.min(130, (selectedEdit.scale ?? 100) + 10) })} aria-label="크게" className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E8EB] text-ink-body"><Plus className="h-3.5 w-3.5" /></button>
        </div>

        <p className="mt-4 text-[12px] font-semibold text-ink-body">색상</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {COLOR_OPTIONS.map((color) => (
            <button key={color} onClick={() => updateElement({ color })} aria-label={`색상 ${color}`} className={cn("flex h-7 w-7 items-center justify-center rounded-full transition-transform", (selectedEdit.color ?? design.color) === color ? "scale-110 ring-2 ring-primary ring-offset-1" : "hover:scale-110")} style={{ background: color }}>
              {(selectedEdit.color ?? design.color) === color && <Check className="h-3.5 w-3.5 text-white" />}
            </button>
          ))}
          <input type="color" value={selectedEdit.color ?? design.color} onChange={(e) => updateElement({ color: e.target.value })} aria-label="색상 직접 선택" className="h-7 w-8 cursor-pointer rounded border border-[#E5E8EB] bg-transparent p-0" />
        </div>

        <p className="mt-4 text-[12px] font-semibold text-ink-body">굵기</p>
        <div className="mt-1.5 flex gap-1.5">
          {(["보통", "굵게"] as const).map((weight) => (
            <button key={weight} onClick={() => updateElement({ weight })} className={cn("flex-1 rounded-xl py-2 text-[12.5px] transition-colors", (selectedEdit.weight ?? "보통") === weight ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/40" : "bg-[#F3F4F6] text-ink-body hover:bg-[#ECEEF2]", weight === "굵게" && "font-bold")}>{weight}</button>
          ))}
        </div>

        <p className="mt-4 text-[12px] font-semibold text-ink-body">정렬</p>
        <div className="mt-1.5 flex gap-1.5">
          {([["left", "왼쪽"], ["center", "가운데"], ["right", "오른쪽"]] as const).map(([align, label]) => (
            <button key={align} onClick={() => updateElement({ align })} className={cn("flex-1 rounded-xl py-2 text-[12.5px] transition-colors", (selectedEdit.align ?? "left") === align ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/40" : "bg-[#F3F4F6] text-ink-body hover:bg-[#ECEEF2]")}>{label}</button>
          ))}
        </div>

        <p className="mt-4 text-[12px] font-semibold text-ink-body">모서리</p>
        <div className="mt-1.5 flex gap-1.5">
          {(["각짐", "둥근", "라운드"] as const).map((radius) => (
            <button key={radius} onClick={() => updateElement({ radius })} className={cn("flex-1 py-2 text-[12.5px] transition-colors", radius === "각짐" ? "rounded-md" : radius === "둥근" ? "rounded-xl" : "rounded-badge", (selectedEdit.radius ?? design.button) === radius ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/40" : "bg-[#F3F4F6] text-ink-body hover:bg-[#ECEEF2]")}>{radius}</button>
          ))}
        </div>

        <button onClick={resetElement} className="mt-5 flex h-10 w-full items-center justify-center rounded-xl border border-[#E5E8EB] bg-white text-[12.5px] font-semibold text-ink-body hover:border-[#D1D5DB]">
          변경 초기화
        </button>
      </section>
    ) : (
      <section className="rounded-2xl border border-[#ECEEF2] bg-white p-5 text-center">
        <Smartphone className="mx-auto h-7 w-7 text-[#C4C9D1]" />
        <p className="mt-2 text-[13.5px] font-semibold text-ink-title">수정할 요소를 선택해주세요</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-body">미리보기 화면에서 텍스트, 버튼, 카드 등을 누르면 여기에서 바로 수정할 수 있어요.</p>
      </section>
    );

  const aiPanel = (
    <div className="flex flex-col gap-3">
      <section className="rounded-2xl border border-[#ECEEF2] bg-white p-4">
        <h2 className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink-title">
          <Wand2 className="h-4 w-4 text-primary" /> 빠른 수정
        </h2>
        <p className="mt-0.5 text-[11.5px] text-ink-body">버튼을 누르면 아래 요청창에 자동으로 입력돼요.</p>
        {QUICK_GROUPS.map((group) => (
          <div key={group.title} className="mt-3">
            <p className="text-[11.5px] font-bold text-primary">{group.title}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <button key={item} onClick={() => setInstruction(item)} className="rounded-badge border border-[#E5E8EB] bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-ink-title transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-3">
          <p className="text-[11.5px] font-bold text-primary">색상</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {COLOR_OPTIONS.map((color) => (
              <button key={color} onClick={() => setToken("color", color)} aria-label={`메인 색상 ${color}`} className={cn("h-7 w-7 rounded-full transition-transform", design.color === color ? "scale-110 ring-2 ring-primary ring-offset-1" : "hover:scale-110")} style={{ background: color }} />
            ))}
            <input type="color" value={design.color} onChange={(e) => setToken("color", e.target.value)} aria-label="메인 색상 직접 선택" className="h-7 w-8 cursor-pointer rounded border border-[#E5E8EB] bg-transparent p-0" />
            <button onClick={() => setToken("dark", !design.dark)} className={cn("rounded-badge px-3 py-1.5 text-[11.5px] font-semibold transition-colors", design.dark ? "bg-ink-title text-white" : "bg-[#F3F4F6] text-ink-body hover:bg-[#ECEEF2]")}>다크모드</button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <h2 className="flex items-center gap-1.5 text-[13.5px] font-bold text-primary">
          <Sparkles className="h-4 w-4" /> AI에게 직접 요청하기
        </h2>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="원하는 디자인을 입력하세요..."
          className="mt-2 min-h-[68px] w-full resize-none rounded-xl border border-[#E5E8EB] bg-white px-3 py-2.5 text-base leading-relaxed text-ink-title placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="mt-1 text-[11px] leading-relaxed text-ink-body">예) 홈 화면을 토스처럼 만들어줘 · 검색창을 위로 올려줘 · 차트를 크게 만들어줘</p>
        <button
          onClick={() => { runAI(instruction); setInstruction(""); }}
          disabled={instruction.trim().length === 0}
          className="mt-2 flex h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-[13.5px] font-semibold text-white transition-all duration-200 enabled:hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" /> AI로 수정하기
        </button>
      </section>

      <section className="rounded-2xl border border-[#ECEEF2] bg-white p-4">
        <h2 className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink-title">
          <Lightbulb className="h-4 w-4 text-[#F59E0B]" /> AI가 추천하는 개선사항
        </h2>
        <ul className="mt-2 flex flex-col gap-2">
          {suggestions.map((suggestion) => (
            <li key={suggestion.text} className="flex items-center justify-between gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2.5">
              <p className="min-w-0 text-[12.5px] leading-snug text-ink-title">{suggestion.text}</p>
              <button onClick={() => runAI(suggestion.action)} className="shrink-0 rounded-lg border border-primary/40 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-primary hover:bg-primary/5">적용</button>
            </li>
          ))}
        </ul>
      </section>

      {versions.length > 0 && (
        <section className="rounded-2xl border border-[#ECEEF2] bg-white p-4">
          <h2 className="text-[13.5px] font-bold text-ink-title">버전 관리</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {versions.map((version, index) => (
              <li key={version.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-ink-title">{index === 0 ? "현재 버전" : `버전 ${versions.length - index}`} · {version.note}</p>
                  <p className="text-[10.5px] text-ink-body">{version.savedAt}</p>
                </div>
                {index !== 0 && (
                  <button onClick={() => { pushHistory(); applyState(version.state); }} className="shrink-0 rounded-lg bg-[#F3F4F6] px-2.5 py-1 text-[11.5px] font-semibold text-ink-body hover:bg-primary/10 hover:text-primary">복원</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <button onClick={handleConfirmDesign} className="flex h-[48px] w-full items-center justify-center rounded-2xl bg-[#16A34A] text-[14px] font-semibold text-white shadow-[0_6px_16px_-2px_rgba(22,163,74,0.45)] transition-transform hover:scale-[1.01]">
        디자인 완료
      </button>
    </div>
  );

  const TAB_ITEMS: { id: EditorTab; label: string }[] = [
    { id: "preview", label: "미리보기" },
    { id: "element", label: "요소 편집" },
    { id: "ai", label: "AI 빠른 수정" },
  ];
  const tabIndex = TAB_ITEMS.findIndex((t) => t.id === tab);

  return (
    <main className="flex flex-1 flex-col px-5 pt-4 pb-[140px] animate-fadeIn md:items-center md:pt-6 md:pb-12">
      <div className="flex w-full flex-col gap-4 md:max-w-[1240px]">
        {/* 상단 바 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0">
              <span className="rounded-badge bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold text-primary">프로젝트</span>
              {isTitleEdit ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="h-9 w-[180px] rounded-xl border border-primary/40 bg-white px-3 text-base font-bold text-ink-title focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button onClick={handleSaveTitle} aria-label="저장" className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setIsTitleEdit(false)} aria-label="취소" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E8EB] text-ink-body"><XIcon className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="mt-0.5 flex items-center gap-1.5">
                  <h1 className="truncate text-[20px] font-bold text-ink-title">{prd.title}</h1>
                  <button onClick={() => { setTitleInput(prd.title); setIsTitleEdit(true); }} aria-label="브랜드명 수정" className="text-ink-body hover:text-primary">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[12px] font-medium text-ink-body sm:block">{savedNotice}</span>
            <button onClick={handleUndo} aria-label="되돌리기" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E8EB] bg-white text-ink-body hover:border-[#D1D5DB]"><Undo2 className="h-4 w-4" /></button>
            <button onClick={handleRedo} aria-label="다시 실행" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E8EB] bg-white text-ink-body hover:border-[#D1D5DB]"><Redo2 className="h-4 w-4" /></button>
            <button onClick={handleConfirmDesign} className="hidden h-9 items-center justify-center rounded-xl bg-primary px-4 text-[13px] font-semibold text-white shadow-[0_4px_12px_-2px_rgba(79,107,255,0.45)] transition-transform hover:scale-[1.02] md:flex">
              디자인 완료
            </button>
          </div>
        </div>

        {/* AI 수정 비교 배너 */}
        <AnimatePresence>
          {compare && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3">
              <p className="text-[13px] font-medium text-ink-title">AI 수정이 적용되었습니다. 이전 디자인으로 되돌릴 수 있어요.</p>
              <div className="flex gap-2">
                <button onClick={handleRevertCompare} className="h-8 rounded-lg border border-[#E5E8EB] bg-white px-3 text-[12px] font-semibold text-ink-body hover:border-[#D1D5DB]">되돌리기</button>
                <button onClick={() => setCompare(null)} className="h-8 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white">적용하기</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 모바일: 3탭 슬라이드 */}
        <div className="md:hidden">
          <div className="flex gap-1 rounded-2xl bg-[#F3F4F6] p-1" role="tablist" aria-label="편집기 화면">
            {TAB_ITEMS.map((item) => (
              <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={cn("relative flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-colors", tab === item.id ? "text-primary" : "text-ink-body")}>
                {tab === item.id && <motion.span layoutId="editor-tab" className="absolute inset-0 rounded-xl bg-white shadow-sm" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />}
                <span className="relative">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -32 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -70 && tabIndex < TAB_ITEMS.length - 1) setTab(TAB_ITEMS[tabIndex + 1].id);
                  if (info.offset.x > 70 && tabIndex > 0) setTab(TAB_ITEMS[tabIndex - 1].id);
                }}
              >
                {tab === "preview" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-center">{phonePreview}</div>
                    {screenListPanel}
                  </div>
                )}
                {tab === "element" && elementPanel}
                {tab === "ai" && aiPanel}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* 데스크톱: 3단 레이아웃 */}
        <div className="hidden gap-4 md:flex md:items-start">
          <nav className="w-[220px] shrink-0" aria-label="화면 목록">{screenListPanel}</nav>
          <div className="flex flex-1 justify-center pt-2">{phonePreview}</div>
          <div className="flex w-[320px] shrink-0 flex-col gap-3">
            {elementPanel}
            {aiPanel}
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
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col bg-white md:max-w-none lg:max-w-[1440px] xl:px-4">
        <AppHeader />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/create" element={<ProjectCreatePage />} />
          <Route path="/project/analyze" element={<AnalyzePage />} />
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
