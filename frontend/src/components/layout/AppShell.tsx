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
    <div className="min-h-screen bg-[#f9f9f9] font-sans text-neutral-950">
      <Header
        toolbar={toolbar}
        accountStrip={accountStrip}
        filters={filters}
      />
      <div className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-2 sm:px-5">
          {utilityBar}
        </div>
      </div>
      <main className="mx-auto w-full max-w-[1100px] px-0 py-3 sm:px-5 sm:py-5">
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
  <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-2 px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
        <h1 className="m-0 text-[1.15rem] font-extrabold tracking-normal text-neutral-950">
          프로미스나인 Instagram 데이터 아카이브
        </h1>
        {toolbar}
      </div>
      <div className="flex flex-col gap-2">
        {accountStrip}
        {filters}
      </div>
    </div>
  </header>
);

export default AppShell;
