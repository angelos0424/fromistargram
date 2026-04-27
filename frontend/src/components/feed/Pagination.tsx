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
    <div className="mx-4 mt-4 flex flex-col gap-3 rounded-[22px] border border-white/60 bg-white/62 px-4 py-3 text-sm text-[#7B8794] shadow-[0_10px_28px_rgba(45,55,72,0.08)] backdrop-blur-[8px] sm:mx-0 sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span className="font-bold">
        페이지 <b className="text-[#2D3748]">{page}</b> / {totalPages} · 총{' '}
        <b className="text-[#2D3748]">{total.toLocaleString('ko-KR')}</b>개
      </span>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-9 rounded-full border border-white/70 bg-white/76 px-4 text-sm font-bold text-[#2D3748] shadow-[0_4px_14px_rgba(45,55,72,0.05)] transition enabled:hover:-translate-y-0.5 enabled:hover:border-[#B8A4F0]/70 enabled:hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          이전
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="h-9 rounded-full bg-gradient-to-r from-[#7EC8FF] to-[#B8A4F0] px-4 text-sm font-bold text-white shadow-[0_6px_18px_rgba(126,200,255,0.32)] transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_9px_22px_rgba(126,200,255,0.42)] disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45"
        >
          다음
        </button>
      </div>
    </div>
  );
};

export default Pagination;
