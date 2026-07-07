import { useState } from "react";
import { TODAY_TASKS } from "../data/mockData";
import TaskListItem from "./TaskListItem";
import ProgressBar from "./ProgressBar";

interface TodayTasksProps {
  onViewAll: () => void;
}

export default function TodayTasks({ onViewAll }: TodayTasksProps) {
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
            <TaskListItem key={task.id} task={task} onToggle={handleToggle} />
          ))}
        </ul>
      </div>
    </section>
  );
}
