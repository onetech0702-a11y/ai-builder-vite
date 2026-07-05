interface HeroCardProps {
  onCreateProject: () => void;
}

export default function HeroCard({ onCreateProject }: HeroCardProps) {
  return (
    <section className="w-full animate-slideUp rounded-t-[32px] border-b border-[#ECEEF2] bg-gradient-to-br from-[#F8FAFC] to-[#EEF6FF] p-7 md:p-8">
      <span className="text-[13px] font-semibold text-primary">AI Builder</span>

      <h1 className="mt-2.5 text-[29px] font-bold leading-[1.25] text-ink-title tracking-tight md:text-[32px]">
        AI 하나로
        <br />
        IT 서비스를 런칭하세요.
      </h1>

      <p className="mt-3 text-[14px] text-ink-body leading-relaxed md:text-[15px]">
        아이디어를 현실로 만들고,
        <br />
        더 빠르게 시장에 출시하세요.
      </p>

      <button
        onClick={onCreateProject}
        className="mt-5 flex h-[62px] w-full items-center justify-center gap-2 rounded-[18px] bg-primary px-8 text-[15px] font-bold text-white shadow-[0_6px_16px_-2px_rgba(79,107,255,0.45)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_8px_20px_-2px_rgba(79,107,255,0.55)] active:scale-[0.98]"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        새 프로젝트 만들기
      </button>
    </section>
  );
}
