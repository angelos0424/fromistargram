import type { ReactNode } from 'react';

interface AppShellProps {
  accountStrip: ReactNode;
  filters: ReactNode;
  children: ReactNode;
}

const AppShell = ({ accountStrip, filters, children }: AppShellProps) => (
  <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
    <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Fromistargram Viewer
          </h1>
          <p className="text-sm text-slate-400">
            Instaloader로 수집한 데이터를 기반으로 여러 계정의 활동을 한눈에 확인하세요.
          </p>
        </div>
        <div>{accountStrip}</div>
      </div>
    </header>
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8 lg:flex-row">
      <aside className="w-full shrink-0 rounded-2xl border border-white/5 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40 backdrop-blur lg:w-80">
        {filters}
      </aside>
      <section className="flex-1">{children}</section>
    </main>
  </div>
);

export default AppShell;
