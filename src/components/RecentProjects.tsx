import { RECENT_PROJECTS } from "../data/mockData";
import ProjectListItem from "./ProjectListItem";

interface RecentProjectsProps {
  onViewAll: () => void;
}

export default function RecentProjects({ onViewAll }: RecentProjectsProps) {
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
          <ProjectListItem key={project.id} project={project} />
        ))}
      </ul>
    </section>
  );
}
