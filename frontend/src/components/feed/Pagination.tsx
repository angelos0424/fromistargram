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
    <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 sm:bg-transparent sm:text-sm sm:font-normal sm:text-slate-300">
        <span className="hidden h-2 w-2 rounded-full bg-brand-400 shadow shadow-brand-500/40 sm:inline-block" aria-hidden />
        페이지 {page} / {totalPages} · 총 {total}개
      </span>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm transition enabled:hover:border-brand-400 enabled:hover:bg-brand-400/20 enabled:hover:text-white disabled:opacity-40"
        >
          이전
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm transition enabled:hover:border-brand-400 enabled:hover:bg-brand-400/20 enabled:hover:text-white disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
};

export default Pagination;
