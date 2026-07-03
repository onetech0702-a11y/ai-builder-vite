export type ProjectPhase = "기획 단계" | "개발 단계" | "테스트 단계";

export interface Project {
  id: string;
  name: string;
  updatedAt: string;
  progress: number;
  phase: ProjectPhase;
  icon: "folder" | "chart" | "calendar";
  color: string;
  bg: string;
}

export const RECENT_PROJECTS: Project[] = [
  {
    id: "shopping",
    name: "AI 쇼핑몰 솔루션",
    updatedAt: "2026. 07. 02",
    progress: 75,
    phase: "기획 단계",
    icon: "folder",
    color: "#4F6BFF",
    bg: "#EEF2FF",
  },
  {
    id: "stock",
    name: "주식 분석 대시보드",
    updatedAt: "2026. 07. 01",
    progress: 45,
    phase: "개발 단계",
    icon: "chart",
    color: "#22C55E",
    bg: "#ECFDF3",
  },
  {
    id: "reservation",
    name: "예약 관리 시스템",
    updatedAt: "2026. 06. 30",
    progress: 20,
    phase: "기획 단계",
    icon: "calendar",
    color: "#8B5CF6",
    bg: "#F3EEFF",
  },
];

export type TaskStatus = "done" | "inProgress" | "pending";

export interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  time: string;
}

export const TODAY_TASKS: TaskItem[] = [
  { id: "t1", title: "홈 화면 UI 개선", status: "done", time: "10:30" },
  { id: "t2", title: "로고 적용 및 브랜드 가이드 반영", status: "done", time: "11:20" },
  { id: "t3", title: "프로젝트 생성 화면 설계", status: "inProgress", time: "13:00" },
  { id: "t4", title: "AI Builder 핵심 플로우 정의", status: "pending", time: "-" },
  { id: "t5", title: "데이터베이스 구조 설계", status: "pending", time: "-" },
];

export type NavId = "home" | "projects" | "tasks" | "settings";

export interface NavItem {
  id: NavId;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "홈" },
  { id: "projects", label: "프로젝트" },
  { id: "tasks", label: "할 일" },
  { id: "settings", label: "설정" },
];
