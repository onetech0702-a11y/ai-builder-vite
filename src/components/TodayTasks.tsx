import { useState } from "react";
import { TODAY_TASKS } from "../data/mockData";
import TaskListItem from "./TaskListItem";

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

  return (
    <section className="animate-fadeIn flex min-w-0 flex-col md:min-h-0 md:flex-1">
      <div className="flex shrink-0 items-center justify-between">
        <h2 className="text-[18px] font-bold text-ink-title">오늘 할 일</h2>
        <button onClick={onViewAll} className="flex items-center gap-0.5 text-[13px] font-medium text-primary">
          전체 보기
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <ul className="mt-3.5 divide-y divide-[#ECEEF2] overflow-hidden rounded-[24px] border border-[#ECEEF2] bg-white md:min-h-0 md:flex-1 md:overflow-y-auto">
        {tasks.map((task) => (
          <TaskListItem key={task.id} task={task} onToggle={handleToggle} />
        ))}
      </ul>
    </section>
  );
}