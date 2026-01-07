interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

const Pagination = ({
  page,
  pageSize,
  total,
  onChange
}: PaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-white/60 bg-white/85 px-4 py-3 text-sm text-[#2D3748] backdrop-blur-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center sm:justify-between">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 sm:bg-transparent sm:text-sm sm:font-normal sm:text-slate-300">
        <span className="hidden h-2 w-2 rounded-full bg-[#7EC8FF] shadow-[0_0_8px_rgba(126,200,255,0.6)] sm:inline-block" aria-hidden />
        페이지 {page} / {totalPages} · 총 {total}개
      </span>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-full border border-white/60 bg-gradient-to-r from-[#7EC8FF] to-[#B8A4F0] px-3 py-1 text-sm text-white shadow-[0_0_8px_rgba(126,200,255,0.3)] transition enabled:hover:shadow-[0_0_12px_rgba(126,200,255,0.5)] disabled:opacity-40"
        >
          이전
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-full border border-white/60 bg-gradient-to-r from-[#7EC8FF] to-[#B8A4F0] px-3 py-1 text-sm text-white shadow-[0_0_8px_rgba(126,200,255,0.3)] transition enabled:hover:shadow-[0_0_12px_rgba(126,200,255,0.5)] disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
};

export default Pagination;
