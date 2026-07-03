interface HeroCardProps {
  onCreateProject: () => void;
}

export default function HeroCard({ onCreateProject }: HeroCardProps) {
  return (
    <section className="mt-5 animate-slideUp rounded-[28px] border border-[#ECEEF2] bg-gradient-to-br from-[#F8FAFC] to-[#EEF6FF] p-6 md:p-8 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <span className="text-[13px] font-semibold text-primary">AI Builder</span>

      <h1 className="mt-2 text-[28px] md:text-[36px] font-bold leading-[1.25] text-ink-title tracking-tight">
        AI 하나로
        <br />
        IT 서비스를 런칭하세요.
      </h1>

      <p className="mt-3 text-[14px] md:text-[15px] text-ink-body leading-relaxed">
        아이디어를 현실로 만들고,
        <br />
        더 빠르게 시장에 출시하세요.
      </p>

      <button
        onClick={onCreateProject}
        className="mt-5 flex h-[54px] w-full md:w-auto md:px-8 items-center justify-center gap-2 rounded-[17px] bg-primary text-[15px] font-semibold text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        새 프로젝트 만들기
      </button>
    </section>
  );
}
