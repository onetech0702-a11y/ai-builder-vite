import { Project } from "../data/mockData";
import ProgressBar from "./ProgressBar";

function ProjectIcon({ type }: { type: Project["icon"] }) {
  const common = {
    width: 20,
    height: 20,
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

export default function ProjectListItem({ project }: { project: Project }) {
  return (
    <li className="flex h-[92px] items-center gap-3.5 px-5">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[0_6px_14px_-4px_rgba(79,107,255,0.4)]"
        style={{ background: `linear-gradient(135deg, ${project.colorFrom}, ${project.colorTo})` }}
      >
        <ProjectIcon type={project.icon} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate whitespace-nowrap text-[15px] font-semibold text-ink-title">{project.name}</h3>
        <p className="mt-0.5 truncate whitespace-nowrap text-[13px] text-[#6B7280]">마지막 수정 {project.updatedAt}</p>
      </div>

      <div className="flex w-[170px] shrink-0 items-center justify-end gap-3 sm:w-[220px]">
        <div className="w-20 shrink-0 sm:w-28">
          <span className="block text-right text-[13px] font-bold text-primary">{project.progress}%</span>
          <ProgressBar progress={project.progress} />
        </div>

        <span className="hidden shrink-0 justify-center whitespace-nowrap rounded-badge bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-medium text-ink-body sm:inline-flex sm:w-[76px]">
          {project.phase}
        </span>

        <button
          aria-label="더보기"
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-ink-body hover:bg-[#F3F4F6]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </button>
      </div>
    </li>
  );
}
