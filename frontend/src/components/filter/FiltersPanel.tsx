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
          <h2 className="text-lg font-semibold text-[#2D3748] dark:text-white">필터</h2>
          <p className="text-xs text-[#7B8794] dark:text-slate-400">
            날짜 범위 필터를 적용해 특정 기간의 활동만 조회할 수 있습니다.
          </p>
        </header>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-[#7B8794] dark:text-slate-400">시작일</span>
              <input
                type="date"
                value={dateRange.from ?? ''}
                onChange={(event) =>
                  onDateRangeChange({
                    from: event.target.value || null,
                    to: dateRange.to
                  })
                }
                className="rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm text-[#2D3748] outline-none transition focus:border-[#7EC8FF] focus:shadow-[0_0_12px_rgba(126,200,255,0.3)] backdrop-blur-[8px] dark:rounded-lg dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-brand-400 dark:focus:bg-white/10"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-[#7B8794] dark:text-slate-400">종료일</span>
              <input
                type="date"
                value={dateRange.to ?? ''}
                onChange={(event) =>
                  onDateRangeChange({
                    from: dateRange.from,
                    to: event.target.value || null
                  })
                }
                className="rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm text-[#2D3748] outline-none transition focus:border-[#7EC8FF] focus:shadow-[0_0_12px_rgba(126,200,255,0.3)] backdrop-blur-[8px] dark:rounded-lg dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-brand-400 dark:focus:bg-white/10"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onReset}
              className="flex-1 rounded-xl border border-white/60 bg-gradient-to-r from-[#7EC8FF] to-[#8CE8D0] px-3 py-2 text-sm font-medium text-white shadow-[0_4px_16px_rgba(126,200,255,0.35)] transition hover:shadow-[0_6px_20px_rgba(126,200,255,0.45)] dark:rounded-lg dark:border-white/10 dark:bg-white/5 dark:shadow-sm dark:hover:border-brand-400 dark:hover:bg-brand-400/10"
            >
              필터 초기화
            </button>
            <div className="flex-1 rounded-xl border border-dashed border-white/60 bg-white/85 px-3 py-2 text-xs text-[#7B8794] backdrop-blur-[8px] dark:rounded-lg dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              선택된 필터가 자동으로 피드에 반영됩니다.
            </div>
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-[#2D3748] dark:text-white">프로필 히스토리</h2>
          <p className="text-xs text-[#7B8794] dark:text-slate-400">
            선택된 계정의 프로필 이미지 변경 이력을 확인할 수 있습니다.
          </p>
        </header>
        {activeAccount ? (
          profileHistory.length > 0 ? (
            <ul className="space-y-3">
              {profileHistory.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-[18px] border border-white/60 bg-white/85 p-3 backdrop-blur-[8px] dark:rounded-xl dark:border-white/5 dark:bg-white/5"
                >
                  <img
                    src={item.url}
                    alt={`${activeAccount.displayName} 프로필`}
                    className="h-12 w-12 rounded-full border border-white/60 object-cover shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:border-white/10"
                    loading="lazy"
                  />
                  <span className="text-xs text-[#7B8794] dark:text-slate-300">
                    {formatDate(item.takenAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[18px] border border-dashed border-white/60 bg-white/85 px-4 py-6 text-sm text-[#7B8794] backdrop-blur-[8px] dark:rounded-xl dark:border-white/10 dark:bg-transparent dark:text-slate-400">
              아직 프로필 히스토리 데이터가 없습니다.
            </div>
          )
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/60 bg-white/85 px-4 py-6 text-sm text-[#7B8794] backdrop-blur-[8px] dark:rounded-xl dark:border-white/10 dark:bg-transparent dark:text-slate-400">
            계정을 선택하면 프로필 히스토리가 표시됩니다.
          </div>
        )}
      </section>
    </div>
  );
};

export default FiltersPanel;
