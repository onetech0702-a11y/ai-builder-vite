import { TaskItem } from "../data/mockData";
import StatusBadge from "./StatusBadge";

interface TaskListItemProps {
  task: TaskItem;
  onToggle: (id: string) => void;
}

export default function TaskListItem({ task, onToggle }: TaskListItemProps) {
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

      <div className="hidden sm:flex w-[76px] shrink-0 justify-center">
        <StatusBadge status={task.status} />
      </div>
      <div className="sm:hidden shrink-0">
        <StatusBadge status={task.status} />
      </div>

      <span className="hidden sm:inline shrink-0 w-12 text-right text-[12px] text-ink-body">
        {task.time}
      </span>

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

