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
    <div className="mx-4 flex flex-col gap-3 border-t border-neutral-200 bg-[#f9f9f9] py-4 text-sm text-neutral-600 sm:mx-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-semibold">
        페이지 {page} / {totalPages} · 총 {total}개
      </span>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-8 rounded border border-neutral-300 bg-white px-3 text-sm font-bold text-neutral-700 transition enabled:hover:bg-neutral-50 disabled:opacity-40"
        >
          이전
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="h-8 rounded bg-neutral-950 px-3 text-sm font-bold text-white transition enabled:hover:bg-neutral-800 disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
};

export default Pagination;
