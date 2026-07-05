import { useEffect, useState } from "react";

const PLACEHOLDER_EXAMPLES = [
  "AI 주식 앱을 만들고 싶어요",
  "예약 관리 시스템",
  "쇼핑몰 서비스",
  "운동 기록 앱",
  "가계부 앱",
];

const PLACEHOLDER_INTERVAL_MS = 2400;

interface IdeaInputCardProps {
  onStartWithAI: () => void;
}

export default function IdeaInputCard({ onStartWithAI }: IdeaInputCardProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, PLACEHOLDER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="flex animate-slideUp flex-col rounded-b-[32px] bg-white p-6">
      <h2 className="text-[16px] font-bold text-ink-title">무엇을 만들고 싶나요?</h2>

      <textarea
        readOnly
        placeholder={`예: ${PLACEHOLDER_EXAMPLES[placeholderIndex]}`}
        key={placeholderIndex}
        className="mt-3 h-[104px] w-full resize-none rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3 text-[14px] text-ink-title placeholder:text-ink-body placeholder:transition-opacity placeholder:duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <button
        onClick={onStartWithAI}
        className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
        </svg>
        AI와 함께 시작하기
      </button>
    </section>
  );
}
