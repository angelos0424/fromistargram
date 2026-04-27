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
      <label className="flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-3 py-1.5 text-xs font-semibold text-[#7B8794] shadow-[0_4px_14px_rgba(45,55,72,0.05)]">
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
          className="w-[9.5rem] bg-transparent text-sm font-medium text-[#2D3748] outline-none"
        />
      </label>
      <label className="flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-3 py-1.5 text-xs font-semibold text-[#7B8794] shadow-[0_4px_14px_rgba(45,55,72,0.05)]">
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
          className="w-[9.5rem] bg-transparent text-sm font-medium text-[#2D3748] outline-none"
        />
      </label>
      {activeAccount ? (
        <span className="rounded-full bg-gradient-to-r from-[#FFD4E5] to-[#D4E4FF] px-3 py-1.5 text-sm font-bold text-[#2D3748] shadow-[0_4px_14px_rgba(184,164,240,0.16)]">
          @{activeAccount.username ?? activeAccount.id}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onReset}
        className="h-8 rounded-full border border-white/70 bg-white/72 px-3 text-sm font-bold text-[#7B8794] shadow-[0_4px_14px_rgba(45,55,72,0.05)] transition hover:border-[#B8A4F0]/60 hover:text-[#2D3748]"
      >
        초기화
      </button>
      <button
        type="button"
        onClick={() => setIsUploadModalOpen(true)}
        className="h-8 rounded-full bg-gradient-to-r from-[#7EC8FF] to-[#8CE8D0] px-3 text-sm font-bold text-white shadow-[0_6px_18px_rgba(126,200,255,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_9px_22px_rgba(126,200,255,0.42)]"
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
