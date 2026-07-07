import { Project } from "../data/mockData";
import ProgressBar from "./ProgressBar";

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

export default function ProjectListItem({ project }: { project: Project }) {
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
