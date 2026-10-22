import { useEffect, useMemo, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import AccountStrip from '../components/account/AccountStrip';
import FiltersPanel from '../components/filter/FiltersPanel';
import AppShell from '../components/layout/AppShell';
import Pagination from '../components/feed/Pagination';
import PostGrid from '../components/feed/PostGrid';
import PostModal from '../components/feed/PostModal';
import SharedMediaGrid from '../components/shared/SharedMediaGrid';
import SharedMediaModal from '../components/shared/SharedMediaModal';
import { useFeedUiStore, type DateRange } from '../state/uiStore';
import {
  mergeFeedSearchParams,
  parseFeedSearchParams
} from '../lib/url/feedSearchParams';
import { useQuery } from '@tanstack/react-query';
import { CLIENT_KEY, detailPost, listAccount, listPost, listSharedMedia } from '../lib/api/client';
import type { SharedMedia } from '../lib/api/types';
import SeoHead from '../components/common/SeoHead';

type SortOrder = 'newest' | 'oldest';

const FeedPage = () => {

  const { data: accountsResponse, isLoading: accountsLoading } = useQuery({
    queryFn: () => listAccount(),
    queryKey: [CLIENT_KEY, 'accounts']
  });
  const accounts = accountsResponse?.data ?? [];

  const location = useLocation();
  const navigate = useNavigate();
  const { postId: routePostId } = useParams<{ postId?: string }>();
  const [
    selectedAccountId,
    setSelectedAccountId,
    dateRange,
    setDateRange,
    page,
    pageSize,
    type,
    setPage,
    setType,
    resetFilters,
    hydrateFromQuery
  ] = useFeedUiStore(
    useShallow((state) => [
      state.selectedAccountId,
      state.setSelectedAccountId,
      state.dateRange,
      state.setDateRange,
      state.page,
      state.pageSize,
      state.type,
      state.setPage,
      state.setType,
      state.resetFilters,
      state.hydrateFromQuery
    ])
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const activePostId = routePostId ?? null;
  const [activeMediaGroup, setActiveMediaGroup] = useState<SharedMedia[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [gridColumns, setGridColumns] = useState(3);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const parsedParams = useMemo(
    () => parseFeedSearchParams(searchParams),
    [searchParams]
  );

  useEffect(() => {
    hydrateFromQuery({
      selectedAccountId: parsedParams.accountId,
      dateRange: parsedParams.dateRange,
      page: parsedParams.page,
      type: parsedParams.type
    });
  }, [parsedParams, hydrateFromQuery]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = mergeFeedSearchParams(prev, {
          accountId: selectedAccountId,
          dateRange,
          page,
          type
        });

        const prevString = prev.toString();
        const nextString = next.toString();

        return nextString === prevString ? prev : next;
      },
      { replace: true }
    );
  }, [selectedAccountId, dateRange, page, type, setSearchParams]);

  useEffect(() => {
    if (!accounts.length) {
      return;
    }

    if (
      selectedAccountId &&
      !accounts.some((account) => account.id === selectedAccountId)
    ) {
      setSelectedAccountId(accounts[0]?.id ?? null);
    }
  }, [accounts, selectedAccountId, setSelectedAccountId]);

  const query = useMemo(
    () => ({
      accountId: selectedAccountId ?? undefined,
      from: dateRange.from ?? undefined,
      to: dateRange.to ?? undefined,
      page,
      pageSize,
      type: type === 'All' || type === 'Shared' ? undefined : type,
      sort: sortOrder,
      search: searchTerm.trim() || undefined
    }),
    [selectedAccountId, dateRange, page, pageSize, type, sortOrder, searchTerm]
  );

  const { data: feedResponse, isLoading: feedLoading, error: feedError, refetch: refetchFeed } = useQuery({
    queryFn: () => listPost(query),
    queryKey: [CLIENT_KEY, 'feed', query],
    enabled: type !== 'Shared'
  });

  const { data: modalPostResponse, isLoading: modalLoading } = useQuery({
    queryFn: () => detailPost(activePostId!),
    queryKey: [CLIENT_KEY, 'detailPost', activePostId],
    enabled: !!activePostId
  });
  const modalPost = modalPostResponse?.data ?? null;

  const { data: sharedMediaResponse, isLoading: sharedMediaLoading, error: sharedMediaError, refetch: refetchSharedMedia } = useQuery({
    queryFn: () => listSharedMedia({
      from: dateRange.from ?? undefined,
      limit: pageSize,
      page,
      sort: sortOrder,
      search: searchTerm.trim() || undefined,
      to: dateRange.to ?? undefined
    }),
    queryKey: [CLIENT_KEY, 'sharedMedia', {
      from: dateRange.from,
      limit: pageSize,
      page,
      sort: sortOrder,
      search: searchTerm.trim() || undefined,
      to: dateRange.to
    }],
    enabled: type === 'Shared'
  });

  const groupedSharedMedia = useMemo(() => {
    const data = sharedMediaResponse?.data ?? [];
    const groups = new Map<string, SharedMedia[]>();
    
    data.forEach(item => {
      const key = item.uploadBatchId ?? `legacy-${item.id}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    return Array.from(groups.values());
  }, [sharedMediaResponse?.data]);

  const modalAccount = useMemo(
    () =>
      modalPost
        ? accounts.find((account) => account.id === modalPost.accountId) ?? null
        : null,
    [accounts, modalPost]
  );

  const feedPosts = feedResponse?.data ?? [];
  const totalPosts = feedResponse?.meta?.total ?? 0;
  const totalSharedGroups = sharedMediaResponse?.meta?.total ?? 0;
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );

  // Search and total counts come from the same server query before pagination.
  const visibleFeedPosts = feedPosts;
  const visibleSharedGroups = groupedSharedMedia;
  const displayedTotal = type === 'Shared' ? totalSharedGroups : totalPosts;
  const listError = type === 'Shared' ? sharedMediaError : feedError;

  const handleAccountSelect = (accountId: string | null) => {
    setSelectedAccountId(accountId);
    setPage(1);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setPage(1);
  };

  const handleResetAll = () => {
    resetFilters();
    setSearchTerm('');
    setGridColumns(3);
    setSortOrder('newest');
    setPage(1);
  };

  const handleSortOrderChange = (nextSortOrder: SortOrder) => {
    setSortOrder(nextSortOrder);
    setPage(1);
  };

  const handleOpenPost = (postId: string) => {
    const search = searchParams.toString();

    navigate(
      {
        pathname: `/post/${postId}`,
        search: search ? `?${search}` : undefined
      },
      {
        state: {
          returnTo: {
            pathname: location.pathname,
            search: location.search
          }
        }
      }
    );
  };

  const handleCloseModal = () => {
    const state =
      (location.state as
        | {
          returnTo?: {
            pathname: string;
            search: string;
          };
        }
        | undefined) ?? undefined;

    if (state?.returnTo) {
      navigate(
        {
          pathname: state.returnTo.pathname,
          search: state.returnTo.search
        },
        { replace: true }
      );
      return;
    }

    navigate(
      {
        pathname: '/',
        search: location.search
      },
      { replace: true }
    );
  };

  const activeAccount =
    accounts.find((account) => account.id === selectedAccountId) ?? null;

  const seoTitle = useMemo(() => {
    if (modalPost) {
      const date = new Date(modalPost.postedAt).toLocaleDateString('ko-KR');
      return `${modalAccount?.username || 'Member'} - ${date}`;
    }
    if (activeAccount) {
      return `${activeAccount.username} Feed`;
    }
    return undefined;
  }, [modalPost, modalAccount, activeAccount]);

  const seoDescription = useMemo(() => {
    if (modalPost) {
      return modalPost.caption || 'No caption';
    }
    if (activeAccount) {
      return `${activeAccount.username}의 인스타그램 게시물을 확인하세요.`;
    }
    return undefined;
  }, [modalPost, activeAccount]);

  const seoImage = modalPost?.media?.[0]?.mediaUrl;

  const seoUrl = useMemo(() => {
    return window.location.href;
  }, [location.pathname, location.search]);

  return (
    <AppShell
      filterSummary={`${activeAccount ? `@${activeAccount.username ?? activeAccount.id}` : '전체 계정'} · ${dateRange.from || dateRange.to ? `${dateRange.from ?? '처음'} ~ ${dateRange.to ?? '최근'}` : '전체 기간'}`}
      toolbar={
        <ArchiveToolbar
          gridColumns={gridColumns}
          searchTerm={searchTerm}
          sortOrder={sortOrder}
          onGridColumnsChange={setGridColumns}
          onSearchTermChange={(value) => {
            setSearchTerm(value);
            setPage(1);
          }}
          onSortOrderChange={handleSortOrderChange}
        />
      }
      accountStrip={
        <AccountStrip
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelect={handleAccountSelect}
          isLoading={accountsLoading}
        />
      }
      filters={
        <FiltersPanel
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          onReset={handleResetAll}
          activeAccount={activeAccount}
        />
      }
      utilityBar={
        <ArchiveUtilityBar
          total={displayedTotal}
          activeType={type}
          onTypeChange={(nextType) => {
            setType(nextType);
            setPage(1);
          }}
        />
      }
    >
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        image={seoImage}
        url={seoUrl}
      />
      <div className="flex flex-col gap-3">
        {listError ? (
          <div role="alert" className="mx-4 rounded-[22px] border border-red-200/80 bg-white/95 p-6 text-sm font-semibold text-red-700 shadow-sm sm:mx-0">
            <p>{type === 'Shared' ? '공유 미디어' : '피드'}를 불러오는 중 문제가 발생했습니다.</p>
            <button type="button" className="ui-button mt-3 border border-current px-4 py-2" onClick={() => void (type === 'Shared' ? refetchSharedMedia() : refetchFeed())}>
              다시 시도
            </button>
          </div>
        ) : type === 'Shared' ? (
          <SharedMediaGrid
            columns={gridColumns}
            mediaGroups={visibleSharedGroups}
            isLoading={sharedMediaLoading}
            onGroupClick={setActiveMediaGroup}
          />
        ) : (
          <PostGrid
            columns={gridColumns}
            posts={visibleFeedPosts}
            accountsById={accountById}
            isLoading={feedLoading && !feedPosts.length}
            onOpenPost={handleOpenPost}
          />
        )}
        {!listError && <Pagination
          page={page}
          pageSize={pageSize}
          total={type === 'Shared' ? totalSharedGroups : totalPosts}
          onChange={setPage}
        />}
      </div>
      <PostModal
        post={modalPost ?? null}
        account={modalAccount}
        isOpen={Boolean(activePostId)}
        isLoading={modalLoading}
        onClose={handleCloseModal}
      />
      <SharedMediaModal
        mediaGroup={activeMediaGroup}
        isOpen={Boolean(activeMediaGroup)}
        onClose={() => setActiveMediaGroup(null)}
      />
    </AppShell>
  );
};

const ArchiveToolbar = ({
  gridColumns,
  searchTerm,
  sortOrder,
  onGridColumnsChange,
  onSearchTermChange,
  onSortOrderChange
}: {
  gridColumns: number;
  searchTerm: string;
  sortOrder: SortOrder;
  onGridColumnsChange: (columns: number) => void;
  onSearchTermChange: (value: string) => void;
  onSortOrderChange: (value: SortOrder) => void;
}) => (
  <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2 md:max-w-[720px] md:grid-cols-[1fr_auto_auto]">
    <input
      type="search"
      aria-label="본문 내용이나 계정명으로 검색"
      maxLength={200}
      value={searchTerm}
      onChange={(event) => onSearchTermChange(event.target.value)}
      placeholder="본문 내용이나 계정명으로 검색..."
      className="h-10 min-w-0 rounded-full border border-white/70 bg-white/76 px-4 text-sm font-semibold text-[#2D3748] shadow-[0_6px_18px_rgba(45,55,72,0.06)] outline-none transition placeholder:text-[#9CA3AF] focus:bg-white focus:ring-2 focus:ring-[#7EC8FF]/70"
    />
    <select
      value={gridColumns}
      onChange={(event) => onGridColumnsChange(Number(event.target.value))}
      className="hidden h-10 rounded-full border border-white/70 bg-white/76 px-3 text-sm font-bold text-[#2D3748] shadow-[0_6px_18px_rgba(45,55,72,0.06)] outline-none transition focus:ring-2 focus:ring-[#8CE8D0]/70 md:block"
      aria-label="그리드 열 수"
    >
      <option value={3}>3열 보기</option>
      <option value={4}>4열 보기</option>
      <option value={5}>5열 보기</option>
      <option value={6}>6열 보기</option>
      <option value={7}>7열 보기</option>
    </select>
    <div
      className="flex h-10 rounded-full border border-white/70 bg-white/76 p-1 text-sm font-bold text-[#2D3748] shadow-[0_6px_18px_rgba(45,55,72,0.06)]"
      role="group"
      aria-label="정렬"
    >
      {[
        { label: '최신순', value: 'newest' },
        { label: '오래된순', value: 'oldest' }
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSortOrderChange(option.value as SortOrder)}
          aria-pressed={sortOrder === option.value}
          className={`rounded-full px-3 transition ${sortOrder === option.value
            ? 'ui-pastel-action shadow-[0_4px_12px_rgba(126,200,255,0.28)]'
            : 'text-[#7B8794] hover:text-[#2D3748]'
            }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

const ArchiveTabs = ({
  activeType,
  onChange
}: {
  activeType: string;
  onChange: (type: string) => void;
}) => {
  const tabs = [
    { label: '전체', type: 'All' },
    { label: '게시물', type: 'Post' },
    { label: '스토리', type: 'Story' },
    { label: '공유 미디어', type: 'Shared' }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.label}
          type="button"
          onClick={() => onChange(tab.type)}
          aria-pressed={activeType === tab.type}
          className={`h-9 rounded-full border px-4 text-sm font-bold transition duration-200 ${activeType === tab.type
            ? 'border-white/80 ui-pastel-action shadow-[0_8px_20px_rgba(126,200,255,0.3)]'
            : 'border-white/70 bg-white/70 text-[#2D3748] shadow-[0_4px_14px_rgba(45,55,72,0.05)] hover:-translate-y-0.5 hover:border-[#7EC8FF]/70 hover:bg-white'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

const ArchiveUtilityBar = ({
  total,
  activeType,
  onTypeChange
}: {
  total: number;
  activeType: string;
  onTypeChange: (type: string) => void;
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="text-sm font-semibold text-[#7B8794] sm:text-[15px]">
      총 <b className="text-base text-[#2D3748]">{total.toLocaleString('ko-KR')}</b>개
    </div>
    <ArchiveTabs activeType={activeType} onChange={onTypeChange} />
  </div>
);

export default FeedPage;
