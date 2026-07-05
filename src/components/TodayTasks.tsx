import { useState } from "react";
import { TODAY_TASKS } from "../data/mockData";
import TaskListItem from "./TaskListItem";

interface TodayTasksProps {
  onViewAll: () => void;
}

export default function TodayTasks({ onViewAll }: TodayTasksProps) {
  const [tasks, setTasks] = useState(TODAY_TASKS);
  const visibleTasks = tasks.slice(0, 5);
  const completedCount = visibleTasks.filter((task) => task.status === "done").length;
  const completionRate = Math.round((completedCount / visibleTasks.length) * 100);

  const handleToggle = (id: string) => {
    console.log("toggle task", id);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === "done" ? "pending" : "done" } : t))
    );
  };

  return (
    <section className="animate-fadeIn flex h-full min-w-0 flex-col md:min-h-0">
      <div className="flex shrink-0 items-center justify-between">
        <h2 className="text-[18px] font-bold text-ink-title">오늘 할 일</h2>
        <button onClick={onViewAll} className="flex items-center gap-0.5 text-[13px] font-medium text-primary">
          전체 보기
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="mt-3 rounded-t-[24px] border border-b-0 border-[#ECEEF2] bg-white px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold text-ink-title">전체 진행률</span>
          <span className="shrink-0 text-[13px] font-bold text-primary">
            {completedCount}/{visibleTasks.length} 완료, {completionRate}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ECEEF2]">
          <div className="h-full rounded-full bg-primary" style={{ width: `${completionRate}%` }} />
        </div>
      </div>

      <ul className="flex-1 divide-y divide-[#ECEEF2] overflow-hidden rounded-b-[24px] border border-[#ECEEF2] bg-white">
        {visibleTasks.map((task) => (
          <TaskListItem key={task.id} task={task} onToggle={handleToggle} />
        ))}
      </ul>
    </section>
  );
}
