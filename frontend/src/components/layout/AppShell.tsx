import type { ReactNode } from 'react';

interface AppShellProps {
  toolbar: ReactNode;
  accountStrip: ReactNode;
  filters: ReactNode;
  utilityBar: ReactNode;
  children: ReactNode;
}

const AppShell = ({
  toolbar,
  accountStrip,
  filters,
  utilityBar,
  children
}: AppShellProps) => {
  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans text-[#2D3748]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.42),rgba(255,255,255,0.12)_36%,rgba(255,255,255,0.42))]"
      />
      <Header
        toolbar={toolbar}
        accountStrip={accountStrip}
        filters={filters}
      />
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

const Header = ({
  toolbar,
  accountStrip,
  filters
}: {
  toolbar: ReactNode;
  accountStrip: ReactNode;
  filters: ReactNode;
}) => (
  <header className="sticky top-0 z-30 border-b border-white/50 bg-white/72 shadow-[0_10px_30px_rgba(45,55,72,0.08)] backdrop-blur-[12px]">
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3 px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-5">
        <div className="min-w-0">
          <h1 className="m-0 text-[1.18rem] font-extrabold tracking-normal text-[#2D3748] sm:text-[1.3rem]">
            프로미스나인 Instagram 데이터 아카이브
          </h1>
          <div className="mt-1 h-1 w-28 rounded-full bg-gradient-to-r from-[#7EC8FF] via-[#8CE8D0] to-[#B8A4F0]" />
        </div>
        {toolbar}
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-[24px] border border-white/60 bg-white/72 p-2 shadow-[0_8px_30px_rgba(45,55,72,0.08)] backdrop-blur-[8px]">
          {accountStrip}
        </div>
        <div className="rounded-[22px] border border-white/60 bg-white/58 px-3 py-2 shadow-[0_8px_24px_rgba(45,55,72,0.06)] backdrop-blur-[8px]">
          {filters}
        </div>
      </div>
    </div>
  </header>
);

export default AppShell;
