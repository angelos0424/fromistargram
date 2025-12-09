import { useRef, useState } from 'react';
import type { Account } from '../../lib/api/types';
import HighlightList from './HighlightList';

interface AccountStripProps {
  accounts: Account[];
  selectedAccountId: string | null;
  onSelect: (accountId: string | null) => void;
  isLoading?: boolean;
}

const AccountChip = ({
  account,
  isActive,
  onClick
}: {
  account: Account;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-w-[180px] items-center gap-3 rounded-2xl border py-2 pl-2 pr-5 text-left transition-all duration-300 ${isActive
        ? 'border-brand-400/50 bg-gradient-to-br from-brand-500/10 to-brand-500/5 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/20'
        : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10 hover:shadow-md hover:shadow-black/20'
        }`}
    >
      <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 shadow-sm transition-colors ${isActive ? 'border-brand-400' : 'border-white/10 group-hover:border-white/20'
        }`}>
        {account.latestProfilePicUrl ? (
          <img
            src={account.latestProfilePicUrl ?? undefined}
            alt={account.displayName}
            className="h-full w-full rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-800">
            <span className="text-sm font-bold text-slate-400">
              {account.displayName?.[0]?.toUpperCase() ?? account.username?.[0]?.toUpperCase() ?? 'A'}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className={`truncate text-sm font-bold transition-colors ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
          {account.displayName}
        </span>
        <span className={`truncate text-xs ${isActive ? 'text-brand-200' : 'text-slate-500 group-hover:text-slate-400'}`}>
          @{account.username}
        </span>
      </div>
      {isActive && (
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-brand-400/20" />
      )}
    </button>
  );
};

const AllAccountsButton = ({
  isActive,
  onClick
}: {
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`group relative flex h-[58px] min-w-[100px] items-center justify-center rounded-2xl border transition-all duration-300 ${isActive
      ? 'border-brand-400/50 bg-gradient-to-br from-brand-500/10 to-brand-500/5 text-white shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/20'
      : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10 hover:bg-white/10 hover:text-slate-200 hover:shadow-md hover:shadow-black/20'
      }`}
  >
    <span className="text-sm font-bold">전체 보기</span>
  </button>
);

const AccountStrip = ({
  accounts,
  selectedAccountId,
  onSelect,
  isLoading
}: AccountStripProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({ startX: 0, scrollLeft: 0, isDown: false });

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    dragInfo.current = {
      startX: e.pageX - scrollRef.current.offsetLeft,
      scrollLeft: scrollRef.current.scrollLeft,
      isDown: true
    };
  };

  const onMouseUp = () => {
    dragInfo.current.isDown = false;
    setIsDragging(false);
  };

  const onMouseLeave = () => {
    dragInfo.current.isDown = false;
    setIsDragging(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragInfo.current.isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - dragInfo.current.startX) * 1.5;

    // Threshold to start treating as drag
    if (Math.abs(walk) > 5 && !isDragging) {
      setIsDragging(true);
    }

    if (Math.abs(walk) > 5) {
      scrollRef.current.scrollLeft = dragInfo.current.scrollLeft - walk;
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto py-2 scrollbar-hide">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`account-skeleton-${index}`}
            className="h-[58px] w-[180px] shrink-0 animate-pulse rounded-2xl bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-8 text-center">
        <p className="text-sm text-slate-400">
          연결된 Instagram 계정이 없습니다.<br />
          크롤러를 실행해 데이터를 수집해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={scrollRef}
        className={`flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-hide cursor-grab active:cursor-grabbing ${isDragging ? 'cursor-grabbing [&>button]:pointer-events-none' : ''}`}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
      >
        <AllAccountsButton
          isActive={selectedAccountId === null}
          onClick={() => onSelect(null)}
        />
        {accounts.map((account) => (
          <AccountChip
            key={account.id}
            account={account}
            isActive={selectedAccountId === account.id}
            onClick={() => onSelect(account.id)}
          />
        ))}
      </div>
      {selectedAccountId !== null && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <HighlightList accountId={selectedAccountId} />
        </div>
      )}
    </div>
  );
};

export default AccountStrip;
