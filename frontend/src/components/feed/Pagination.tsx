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
    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-300">
      <span>
        페이지 {page} / {totalPages} · 총 {total}개
      </span>
      <div className="flex gap-2">
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
