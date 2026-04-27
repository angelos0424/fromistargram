import type { Account } from '../../lib/api/types';

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
      className={`group inline-flex min-h-14 min-w-[160px] shrink-0 items-center gap-3 rounded-full border py-2 pl-2 pr-4 text-left transition duration-200 ${isActive
        ? 'border-white/80 bg-gradient-to-r from-[#7EC8FF] via-[#8CE8D0] to-[#B8A4F0] text-white shadow-[0_10px_26px_rgba(126,200,255,0.36)]'
        : 'border-white/70 bg-white/78 text-[#2D3748] shadow-[0_5px_18px_rgba(45,55,72,0.06)] hover:-translate-y-0.5 hover:border-[#7EC8FF]/70 hover:bg-white hover:shadow-[0_10px_26px_rgba(126,200,255,0.18)]'
        }`}
    >
      <div
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-white/70 transition ${isActive
          ? 'border-white shadow-[0_0_0_3px_rgba(255,255,255,0.28)]'
          : 'border-white group-hover:border-[#7EC8FF]/50'
          }`}
      >
        {account.latestProfilePicUrl ? (
          <img
            src={account.latestProfilePicUrl ?? undefined}
            alt={account.displayName ?? account.username ?? account.id}
            className="h-full w-full rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#FFD4E5] to-[#D4E4FF]">
            <span className="text-sm font-bold text-[#2D3748]">
              {account.displayName?.[0]?.toUpperCase() ?? account.username?.[0]?.toUpperCase() ?? 'A'}
            </span>
          </div>
        )}
      </div>
      <span className="flex min-w-0 flex-col">
        <span className={`max-w-[7rem] truncate text-sm font-extrabold ${isActive ? 'text-white' : 'text-[#2D3748]'}`}>
          {account.displayName ?? account.username ?? account.id}
        </span>
        <span className={`max-w-[7rem] truncate text-xs font-semibold ${isActive ? 'text-white/78' : 'text-[#7B8794]'}`}>
          @{account.username ?? account.id}
        </span>
      </span>
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
    className={`inline-flex min-h-14 shrink-0 items-center gap-3 rounded-full border py-2 pl-2 pr-4 text-left transition duration-200 ${isActive
      ? 'border-white/80 bg-gradient-to-r from-[#7EC8FF] via-[#8CE8D0] to-[#B8A4F0] text-white shadow-[0_10px_26px_rgba(126,200,255,0.36)]'
      : 'border-white/70 bg-white/78 text-[#2D3748] shadow-[0_5px_18px_rgba(45,55,72,0.06)] hover:-translate-y-0.5 hover:border-[#7EC8FF]/70 hover:bg-white hover:shadow-[0_10px_26px_rgba(126,200,255,0.18)]'
      }`}
  >
    <span
      className={`grid h-10 w-10 shrink-0 grid-cols-2 gap-0.5 rounded-full border-2 p-1 ${isActive
        ? 'border-white bg-white/20'
        : 'border-white bg-white/70'
        }`}
      aria-hidden
    >
      <span className="rounded-full bg-[#feda75]" />
      <span className="rounded-full bg-[#fa7e1e]" />
      <span className="rounded-full bg-[#d62976]" />
      <span className="rounded-full bg-[#4f5bd5]" />
    </span>
    <span className="flex flex-col">
      <span className={`text-sm font-extrabold ${isActive ? 'text-white' : 'text-[#2D3748]'}`}>
        전체 멤버
      </span>
      <span className={`text-xs font-semibold ${isActive ? 'text-white/78' : 'text-[#7B8794]'}`}>
        all accounts
      </span>
    </span>
  </button>
);

const AccountStrip = ({
  accounts,
  selectedAccountId,
  onSelect,
  isLoading
}: AccountStripProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={`account-skeleton-${index}`}
            className="h-14 w-40 animate-pulse rounded-full bg-white/60 shadow-[0_6px_18px_rgba(45,55,72,0.06)]"
          />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/58 px-4 py-3 text-center shadow-[0_8px_24px_rgba(45,55,72,0.06)]">
        <p className="text-sm text-[#7B8794]">
          연결된 Instagram 계정이 없습니다.<br />
          관리자에서 계정 데이터를 먼저 준비해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap md:overflow-visible">
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
  );
};

export default AccountStrip;
