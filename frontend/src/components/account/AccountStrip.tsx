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
      className={`group relative flex min-w-[180px] items-center gap-3 rounded-[20px] border py-2 pl-2 pr-5 text-left transition-all duration-300 ${isActive
        ? 'border-white/60 bg-gradient-to-br from-[rgba(126,200,255,0.15)] to-[rgba(184,164,240,0.1)] shadow-[0_8px_24px_rgba(126,200,255,0.15)] backdrop-blur-[8px]'
        : 'border-white/60 bg-white/85 hover:shadow-[0_0_16px_rgba(126,200,255,0.3)] backdrop-blur-[8px]'
        }`}
    >
      <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 shadow-sm transition-colors ${isActive ? 'border-[#7EC8FF] shadow-[0_0_8px_rgba(126,200,255,0.4)]' : 'border-white/40 group-hover:border-[#7EC8FF]'
        }`}>
        {account.latestProfilePicUrl ? (
          <img
            src={account.latestProfilePicUrl ?? undefined}
            alt={account.displayName}
            className="h-full w-full rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#B8A4F0] to-[#8CE8D0]">
            <span className="text-sm font-bold text-white">
              {account.displayName?.[0]?.toUpperCase() ?? account.username?.[0]?.toUpperCase() ?? 'A'}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className={`truncate text-sm font-bold transition-colors ${isActive ? 'text-[#2D3748]' : 'text-[#7B8794]'}`}>
          {account.displayName}
        </span>
        <span className={`truncate text-xs ${isActive ? 'text-[#7EC8FF]' : 'text-[#9CA3AF]'}`}>
          @{account.username}
        </span>
      </div>
      {isActive && (
        <div className="absolute inset-0 rounded-[20px] ring-1 ring-inset ring-[#7EC8FF]/30" />
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
    className={`group relative flex h-[58px] min-w-[100px] items-center justify-center rounded-[20px] border transition-all duration-300 ${isActive
      ? 'border-white/60 bg-gradient-to-br from-[rgba(126,200,255,0.15)] to-[rgba(184,164,240,0.1)] text-[#2D3748] shadow-[0_8px_24px_rgba(126,200,255,0.15)] backdrop-blur-[8px]'
      : 'border-white/60 bg-white/85 text-[#7B8794] hover:shadow-[0_0_16px_rgba(126,200,255,0.3)] backdrop-blur-[8px]'
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
            className="h-[58px] w-[180px] shrink-0 animate-pulse rounded-[20px] bg-gradient-to-r from-white/60 via-[rgba(126,200,255,0.2)] to-white/60 backdrop-blur-[8px]"
          />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex w-full items-center justify-center rounded-[20px] border border-dashed border-white/60 bg-white/85 px-6 py-8 text-center backdrop-blur-[8px]">
        <p className="text-sm text-[#7B8794]">
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
