import { useState } from 'react';
import type { Account } from '../../lib/api/types';
import type { DateRange } from '../../state/uiStore';
import UploadModal from '../common/UploadModal';

interface FiltersPanelProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onReset: () => void;
  activeAccount: Account | null;
}

const FiltersPanel = ({
  dateRange,
  onDateRangeChange,
  onReset,
  activeAccount
}: FiltersPanelProps) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-600">
        시작
        <input
          type="date"
          value={dateRange.from ?? ''}
          onChange={(event) =>
            onDateRangeChange({
              from: event.target.value || null,
              to: dateRange.to
            })
          }
          className="w-[9.5rem] bg-transparent text-sm font-medium text-neutral-900 outline-none"
        />
      </label>
      <label className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-600">
        종료
        <input
          type="date"
          value={dateRange.to ?? ''}
          onChange={(event) =>
            onDateRangeChange({
              from: dateRange.from,
              to: event.target.value || null
            })
          }
          className="w-[9.5rem] bg-transparent text-sm font-medium text-neutral-900 outline-none"
        />
      </label>
      {activeAccount ? (
        <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-700">
          @{activeAccount.username ?? activeAccount.id}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onReset}
        className="h-8 rounded-full border border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-700 transition hover:border-red-200 hover:text-red-600"
      >
        초기화
      </button>
      <button
        type="button"
        onClick={() => setIsUploadModalOpen(true)}
        className="h-8 rounded-full bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700"
      >
        업로드
      </button>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
};

export default FiltersPanel;
