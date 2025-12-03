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
      className={`group flex min-w-[7rem] items-center gap-3 rounded-full border px-4 py-2 text-left transition ${isActive
        ? 'border-brand-400 bg-brand-400/10 text-white shadow-lg shadow-brand-400/30'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'
        }`}
    >
      <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-md shadow-black/40">
        {account.latestProfilePicUrl ? (
          <img
            src={account.latestProfilePicUrl ?? undefined}
            alt={account.displayName}
            className="h-full w-full rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-sm font-semibold text-white">
            {account.displayName?.[0]?.toUpperCase() ?? account.username?.[0]?.toUpperCase() ?? '계'}
          </span>
        )}
        <span className="absolute inset-0 rounded-full border border-white/10" />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold tracking-tight">
          {account.displayName}
        </span>
        <span className="text-xs text-slate-400">@{account.username}</span>
      </span>
    </button>
  )
};

const AccountStrip = ({
  accounts,
  selectedAccountId,
  onSelect,
  isLoading
}: AccountStripProps) => {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`account-skeleton-${index}`}
            className="h-14 w-40 animate-pulse rounded-full bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-full border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
        연결된 Instagram 계정이 없습니다. 크롤러를 실행해 데이터를 수집해 주세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`flex items-center rounded-full border px-4 py-2 text-sm font-medium transition ${selectedAccountId === null
            ? 'border-brand-400 bg-brand-400/10 text-white shadow-lg shadow-brand-400/30'
            : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'
            }`}
        >
          전체 계정
        </button>
        {accounts.map((account) => (
          <AccountChip
            key={account.id}
            account={account}
            isActive={selectedAccountId === account.id}
            onClick={() => onSelect(account.id)}
          />
        ))}
      </div>
      {selectedAccountId !== null && <HighlightList accountId={selectedAccountId} />}
    </div>
  );
};

export default AccountStrip;
