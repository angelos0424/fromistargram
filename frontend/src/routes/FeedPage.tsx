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
import type { Post, SharedMedia } from '../lib/api/types';
import SeoHead from '../components/common/SeoHead';

type SortOrder = 'newest' | 'oldest' | 'media';

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
      type: type === 'All' || type === 'Shared' ? undefined : type
    }),
    [selectedAccountId, dateRange, page, pageSize, type]
  );

  const { data: feedResponse, isLoading: feedLoading, error: feedError } = useQuery({
    queryFn: () => listPost(query),
    queryKey: [CLIENT_KEY, 'feed', query]
  });

  const { data: modalPostResponse, isLoading: modalLoading } = useQuery({
    queryFn: () => detailPost(activePostId!),
    queryKey: [CLIENT_KEY, 'detailPost', activePostId],
    enabled: !!activePostId
  });
  const modalPost = modalPostResponse?.data ?? null;

  const { data: sharedMediaResponse, isLoading: sharedMediaLoading } = useQuery({
    queryFn: () => listSharedMedia({ limit: pageSize }),
    queryKey: [CLIENT_KEY, 'sharedMedia', { limit: pageSize }],
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
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );

  const searchNeedle = searchTerm.trim().toLowerCase();

  const visibleFeedPosts = useMemo(() => {
    const filtered = searchNeedle
      ? feedPosts.filter((post) => {
          const account = accountById.get(post.accountId);
          const accountLabel = [
            account?.displayName,
            account?.username,
            post.accountId
          ].filter(Boolean).join(' ');
          const haystack = [
            post.caption,
            post.textContent,
            post.tags.join(' '),
            accountLabel
          ].filter(Boolean).join(' ').toLowerCase();

          return haystack.includes(searchNeedle);
        })
      : feedPosts;

    return [...filtered].sort((a, b) => comparePosts(a, b, sortOrder));
  }, [accountById, feedPosts, searchNeedle, sortOrder]);

  const visibleSharedGroups = useMemo(() => {
    const filtered = searchNeedle
      ? groupedSharedMedia.filter((group) => {
          const haystack = group
            .map((item) =>
              [
                item.caption,
                item.accountName,
                item.originalName,
                item.filename
              ].filter(Boolean).join(' ')
            )
            .join(' ')
            .toLowerCase();

          return haystack.includes(searchNeedle);
        })
      : groupedSharedMedia;

    return [...filtered].sort((a, b) => compareSharedGroups(a, b, sortOrder));
  }, [groupedSharedMedia, searchNeedle, sortOrder]);

  const displayedTotal =
    type === 'Shared'
      ? visibleSharedGroups.length
      : searchNeedle
        ? visibleFeedPosts.length
        : totalPosts;

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

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Fromistargram', url });
        return;
      } catch {
        // Fall back to clipboard if the share sheet is dismissed or unavailable.
      }
    }

    await navigator.clipboard?.writeText(url);
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
      toolbar={
        <ArchiveToolbar
          gridColumns={gridColumns}
          searchTerm={searchTerm}
          sortOrder={sortOrder}
          onGridColumnsChange={setGridColumns}
          onSearchTermChange={setSearchTerm}
          onSortOrderChange={setSortOrder}
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
          onReset={handleResetAll}
          onShare={handleShare}
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
        <ArchiveTabs activeType={type} onChange={setType} />

        {type === 'Shared' ? (
          <SharedMediaGrid
            columns={gridColumns}
            mediaGroups={visibleSharedGroups}
            isLoading={sharedMediaLoading}
            onGroupClick={setActiveMediaGroup}
          />
        ) : feedError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            피드를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        ) : (
          <PostGrid
            columns={gridColumns}
            posts={visibleFeedPosts}
            isLoading={feedLoading && !feedPosts.length}
            onOpenPost={handleOpenPost}
          />
        )}
        {type !== 'Shared' && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={totalPosts}
            onChange={setPage}
          />
        )}
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

const comparePosts = (a: Post, b: Post, sortOrder: SortOrder) => {
  if (sortOrder === 'oldest') {
    return new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime();
  }

  if (sortOrder === 'media') {
    return b.media.length - a.media.length;
  }

  return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
};

const compareSharedGroups = (
  a: SharedMedia[],
  b: SharedMedia[],
  sortOrder: SortOrder
) => {
  if (sortOrder === 'oldest') {
    return new Date(a[0]?.uploadedAt ?? 0).getTime() - new Date(b[0]?.uploadedAt ?? 0).getTime();
  }

  if (sortOrder === 'media') {
    return b.length - a.length;
  }

  return new Date(b[0]?.uploadedAt ?? 0).getTime() - new Date(a[0]?.uploadedAt ?? 0).getTime();
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
  <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2 md:max-w-[700px] md:grid-cols-[1fr_auto_auto]">
    <input
      type="search"
      value={searchTerm}
      onChange={(event) => onSearchTermChange(event.target.value)}
      placeholder="본문 내용이나 계정명으로 검색..."
      className="h-9 min-w-0 rounded-full border-0 bg-neutral-100 px-4 text-sm font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:bg-neutral-50 focus:ring-2 focus:ring-neutral-300"
    />
    <select
      value={gridColumns}
      onChange={(event) => onGridColumnsChange(Number(event.target.value))}
      className="hidden h-9 rounded-full border-0 bg-neutral-100 px-3 text-sm font-bold text-neutral-800 outline-none md:block"
      aria-label="그리드 열 수"
    >
      <option value={3}>3열 보기</option>
      <option value={4}>4열 보기</option>
      <option value={5}>5열 보기</option>
      <option value={6}>6열 보기</option>
      <option value={7}>7열 보기</option>
    </select>
    <select
      value={sortOrder}
      onChange={(event) => onSortOrderChange(event.target.value as SortOrder)}
      className="h-9 w-[112px] rounded-full border-0 bg-neutral-100 px-3 text-sm font-bold text-neutral-800 outline-none md:w-auto"
      aria-label="정렬"
    >
      <option value="newest">최신순</option>
      <option value="oldest">오래된순</option>
      <option value="media">미디어순</option>
    </select>
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
    { label: '전체보기', type: 'All' },
    { label: 'Post', type: 'Post' },
    { label: 'Story', type: 'Story' },
    { label: 'Other', type: 'Shared' }
  ];

  return (
    <div className="flex flex-wrap gap-2 px-4 sm:px-0">
      {tabs.map((tab) => (
        <button
          key={tab.label}
          type="button"
          onClick={() => onChange(tab.type)}
          className={`h-8 rounded-full border px-3 text-sm font-bold transition ${activeType === tab.type
            ? 'border-neutral-950 bg-neutral-950 text-white'
            : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'
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
  onReset,
  onShare
}: {
  total: number;
  onReset: () => void;
  onShare: () => void;
}) => (
  <div className="grid grid-cols-3 items-center gap-2 sm:flex sm:justify-end">
    <div className="col-span-3 text-sm font-semibold text-neutral-500 sm:mr-auto sm:text-[15px]">
      총 <b className="text-base text-neutral-950">{total.toLocaleString('ko-KR')}</b>개
    </div>
    <button
      type="button"
      onClick={onShare}
      className="h-8 rounded bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700"
    >
      공유
    </button>
    <button
      type="button"
      onClick={onReset}
      className="h-8 rounded border border-red-200 bg-white px-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
    >
      초기화
    </button>
    <a
      href="/"
      className="flex h-8 items-center justify-center rounded border border-neutral-300 bg-white px-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50"
    >
      메인으로
    </a>
  </div>
);

export default FeedPage;
