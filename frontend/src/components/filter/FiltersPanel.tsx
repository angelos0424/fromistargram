import { useMemo } from 'react';
import type { Account } from '../../lib/api/types';
import type { DateRange } from '../../state/uiStore';

interface FiltersPanelProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onReset: () => void;
  activeAccount: Account | null;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));

const FiltersPanel = ({
  dateRange,
  onDateRangeChange,
  onReset,
  activeAccount
}: FiltersPanelProps) => {
  const profileHistory = useMemo(
    () =>
      activeAccount?.profilePictures
        ? [...activeAccount.profilePictures].sort(
            (a, b) =>
              new Date(b.takenAt).getTime() -
              new Date(a.takenAt).getTime()
          )
        : [],
    [activeAccount]
  );

  return (
    <div className="flex h-full flex-col gap-8">
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-white">필터</h2>
          <p className="text-xs text-slate-400">
            날짜 범위 필터를 적용해 특정 기간의 활동만 조회할 수 있습니다.
          </p>
        </header>
        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-slate-400">시작일</span>
            <input
              type="date"
              value={dateRange.from ?? ''}
              onChange={(event) =>
                onDateRangeChange({
                  from: event.target.value || null,
                  to: dateRange.to
                })
              }
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-brand-400 focus:bg-white/10"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-slate-400">종료일</span>
            <input
              type="date"
              value={dateRange.to ?? ''}
              onChange={(event) =>
                onDateRangeChange({
                  from: dateRange.from,
                  to: event.target.value || null
                })
              }
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-brand-400 focus:bg-white/10"
            />
          </label>
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400 hover:bg-brand-400/10 hover:text-white"
          >
            필터 초기화
          </button>
        </div>
      </section>
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-white">프로필 히스토리</h2>
          <p className="text-xs text-slate-400">
            선택된 계정의 프로필 이미지 변경 이력을 확인할 수 있습니다.
          </p>
        </header>
        {activeAccount ? (
          profileHistory.length > 0 ? (
            <ul className="space-y-3">
              {profileHistory.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3"
                >
                  <img
                    src={item.url}
                    alt={`${activeAccount.displayName} 프로필`}
                    className="h-12 w-12 rounded-full border border-white/10 object-cover"
                    loading="lazy"
                  />
                  <span className="text-xs text-slate-300">
                    {formatDate(item.takenAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
              아직 프로필 히스토리 데이터가 없습니다.
            </div>
          )
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
            계정을 선택하면 프로필 히스토리가 표시됩니다.
          </div>
        )}
      </section>
    </div>
  );
};

export default FiltersPanel;
