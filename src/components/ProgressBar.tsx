interface ProgressBarProps {
  progress: number;
  colorClassName?: string;
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="h-1.5 w-full rounded-badge bg-[#ECEEF2] overflow-hidden">
      <div
        className="h-full rounded-badge bg-primary transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
