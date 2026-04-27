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
      className={`group inline-flex min-h-14 min-w-[160px] shrink-0 items-center gap-3 rounded-full border py-2 pl-2 pr-4 text-left transition ${isActive
        ? 'border-neutral-950 bg-neutral-950 text-white shadow-[0_8px_18px_rgba(0,0,0,0.12)]'
        : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)]'
        }`}
    >
      <div
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-neutral-200 transition ${isActive
          ? 'border-white'
          : 'border-neutral-100 group-hover:border-neutral-200'
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
          <div className="flex h-full w-full items-center justify-center rounded-full bg-neutral-300">
            <span className="text-sm font-bold text-neutral-700">
              {account.displayName?.[0]?.toUpperCase() ?? account.username?.[0]?.toUpperCase() ?? 'A'}
            </span>
          </div>
        )}
      </div>
      <span className="flex min-w-0 flex-col">
        <span className={`max-w-[7rem] truncate text-sm font-extrabold ${isActive ? 'text-white' : 'text-neutral-950'}`}>
          {account.displayName ?? account.username ?? account.id}
        </span>
        <span className={`max-w-[7rem] truncate text-xs font-semibold ${isActive ? 'text-white/70' : 'text-neutral-500'}`}>
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
    className={`inline-flex min-h-14 shrink-0 items-center gap-3 rounded-full border py-2 pl-2 pr-4 text-left transition ${isActive
      ? 'border-neutral-950 bg-neutral-950 text-white shadow-[0_8px_18px_rgba(0,0,0,0.12)]'
      : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)]'
      }`}
  >
    <span
      className={`grid h-10 w-10 shrink-0 grid-cols-2 gap-0.5 rounded-full border-2 p-1 ${isActive
        ? 'border-white bg-white/15'
        : 'border-neutral-100 bg-neutral-100'
        }`}
      aria-hidden
    >
      <span className="rounded-full bg-[#feda75]" />
      <span className="rounded-full bg-[#fa7e1e]" />
      <span className="rounded-full bg-[#d62976]" />
      <span className="rounded-full bg-[#4f5bd5]" />
    </span>
    <span className="flex flex-col">
      <span className={`text-sm font-extrabold ${isActive ? 'text-white' : 'text-neutral-950'}`}>
        전체 멤버
      </span>
      <span className={`text-xs font-semibold ${isActive ? 'text-white/70' : 'text-neutral-500'}`}>
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
            className="h-14 w-40 animate-pulse rounded-full bg-neutral-100"
          />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3 text-center">
        <p className="text-sm text-neutral-500">
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
