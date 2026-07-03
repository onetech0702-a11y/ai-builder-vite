interface IdeaInputCardProps {
  onStartWithAI: () => void;
}

export default function IdeaInputCard({ onStartWithAI }: IdeaInputCardProps) {
  return (
    <section className="animate-slideUp rounded-[24px] border border-[#E5E8EB] bg-white p-5 md:p-8 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <h2 className="text-[18px] font-bold text-ink-title">무엇을 만들고 싶나요?</h2>

      <textarea
        readOnly
        placeholder="아이디어를 입력하세요..."
        className="mt-3.5 h-[120px] md:h-[130px] w-full resize-none rounded-2xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 py-3.5 text-[14px] text-ink-title placeholder:text-ink-body focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <div className="mt-3.5 flex md:justify-end">
        <button
          onClick={onStartWithAI}
          className="flex h-[52px] w-full md:w-auto md:px-8 items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
          </svg>
          AI와 함께 시작하기
        </button>
      </div>
    </section>
  );
}
