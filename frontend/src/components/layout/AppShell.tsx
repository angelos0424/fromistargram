import type { ReactNode } from 'react';

interface AppShellProps {
  toolbar: ReactNode;
  accountStrip: ReactNode;
  filters: ReactNode;
  utilityBar: ReactNode;
  filterSummary: string;
  children: ReactNode;
}

const AppShell = ({
  toolbar,
  accountStrip,
  filters,
  utilityBar,
  filterSummary,
  children
}: AppShellProps) => {
  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans text-[#2D3748]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.42),rgba(255,255,255,0.12)_36%,rgba(255,255,255,0.42))]"
      />
      <Header toolbar={toolbar} filterSummary={filterSummary} />
      <section aria-label="계정 및 날짜 필터" className="relative mx-auto flex w-full max-w-[1120px] flex-col gap-3 px-4 py-3 sm:px-5">
        <div className="rounded-[24px] border border-white/60 bg-white/80 p-2 shadow-sm">{accountStrip}</div>
        <div className="rounded-[22px] border border-white/60 bg-white/80 px-3 py-2 shadow-sm">{filters}</div>
      </section>
      <div className="relative border-b border-white/50 bg-white/55 shadow-[0_8px_28px_rgba(126,200,255,0.12)] backdrop-blur-[10px]">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-3 sm:px-5">
          {utilityBar}
        </div>
      </div>
      <main className="relative mx-auto w-full max-w-[1120px] px-0 py-4 sm:px-5 sm:py-6">
        {children}
      </main>
    </div>
  );
};

const Header = ({ toolbar, filterSummary }: { toolbar: ReactNode; filterSummary: string }) => (
  <header className="sticky top-0 z-30 border-b border-white/50 bg-white/95 shadow-sm backdrop-blur-[12px]">
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-2 px-4 py-2 sm:px-5 md:flex-row md:items-center md:justify-between md:gap-5">
      <div className="min-w-0">
        <h1 className="m-0 text-base font-extrabold text-[#2D3748] sm:text-lg">프로미스나인 Instagram 데이터 아카이브</h1>
        <p className="mt-1 text-xs text-[var(--ui-muted)]" aria-label="현재 필터">{filterSummary}</p>
      </div>
      {toolbar}
    </div>
  </header>
);

export default AppShell;
