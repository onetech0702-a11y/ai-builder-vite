import { TaskStatus } from "../data/mockData";

const STATUS_MAP: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  done: { label: "완료", bg: "#DCFCE7", text: "#16A34A" },
  inProgress: { label: "진행중", bg: "#DBEAFE", text: "#2563EB" },
  pending: { label: "대기", bg: "#F3F4F6", text: "#6B7280" },
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUS_MAP[status];
  return (
    <span
      className="shrink-0 rounded-badge px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}
