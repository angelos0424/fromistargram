import { useState, type ReactNode } from 'react';

interface AppShellProps {
  accountStrip: ReactNode;
  filters: ReactNode;
  children: ReactNode;
}

const AppShell = ({ accountStrip, filters, children }: AppShellProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(251,178,68,0.08),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(46,196,182,0.06),transparent_25%),linear-gradient(to_bottom,#0b1224,transparent_40%)]"
      />
      <div className="relative flex min-h-screen flex-col">
        <Header
          accountStrip={accountStrip}
          onOpenFilters={() => setFiltersOpen(true)}
        />
        <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:py-10">
          <aside className="hidden w-full shrink-0 lg:block lg:w-80">
            <div className="sticky top-8 rounded-2xl border border-white/5 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40 backdrop-blur">
              {filters}
            </div>
          </aside>
          <section className="flex-1">{children}</section>
        </main>
      </div>

      <MobileFilters
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      >
        {filters}
      </MobileFilters>
    </div>
  );
};

const Header = ({
  accountStrip,
  onOpenFilters
}: {
  accountStrip: ReactNode;
  onOpenFilters: () => void;
}) => (
  <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-900/70 backdrop-blur">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:gap-6 lg:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Fromistargram</h1>
          <p className="text-sm text-slate-400">
            Instaloader로 수집한 데이터를 기반으로 여러 계정의 활동을 한눈에 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onOpenFilters}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm transition hover:border-brand-400 hover:bg-brand-400/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 lg:hidden"
          >
            <span className="h-2 w-2 rounded-full bg-brand-400" aria-hidden />
            필터 열기
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 p-3 shadow-lg shadow-slate-950/40">
        {accountStrip}
      </div>
    </div>
  </header>
);

const MobileFilters = ({
  children,
  isOpen,
  onClose
}: {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}) => (
  <div
    className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
      isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
    }`}
    aria-hidden={!isOpen}
  >
    <div
      className={`absolute inset-x-0 bottom-0 transform transition-transform duration-200 ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-6xl rounded-t-3xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Filters</p>
            <h2 className="text-lg font-semibold text-white">조건 설정</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-slate-100 transition hover:border-brand-400 hover:bg-brand-400/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            닫기
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  </div>
);

export default AppShell;
