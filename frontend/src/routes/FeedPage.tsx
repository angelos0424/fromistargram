import { useEffect, useMemo } from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from 'react-router-dom';
import AccountStrip from '../components/account/AccountStrip';
import FiltersPanel from '../components/filter/FiltersPanel';
import AppShell from '../components/layout/AppShell';
import Pagination from '../components/feed/Pagination';
import PostGrid from '../components/feed/PostGrid';
import PostModal from '../components/feed/PostModal';
import { useAccounts } from '../hooks/useAccounts';
import { useFeed } from '../hooks/useFeed';
import { usePostDetail } from '../hooks/usePostDetail';
import { useFeedUiStore, type DateRange } from '../state/uiStore';
import {
  mergeFeedSearchParams,
  parseFeedSearchParams
} from '../lib/url/feedSearchParams';

const FeedPage = () => {
  const { accounts, isLoading: accountsLoading } = useAccounts();
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
    setPage,
    resetFilters,
    hydrateFromQuery
  ] = useFeedUiStore((state) => [
    state.selectedAccountId,
    state.setSelectedAccountId,
    state.dateRange,
    state.setDateRange,
    state.page,
    state.pageSize,
    state.setPage,
    state.resetFilters,
    state.hydrateFromQuery
  ]);

  const [searchParams, setSearchParams] = useSearchParams();
  const activePostId = routePostId ?? null;

  const parsedParams = useMemo(
    () => parseFeedSearchParams(searchParams),
    [searchParams]
  );

  useEffect(() => {
    hydrateFromQuery({
      selectedAccountId: parsedParams.accountId,
      dateRange: parsedParams.dateRange,
      page: parsedParams.page
    });
  }, [parsedParams, hydrateFromQuery]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = mergeFeedSearchParams(prev, {
          accountId: selectedAccountId,
          dateRange,
          page
        });

        const prevString = prev.toString();
        const nextString = next.toString();

        return nextString === prevString ? prev : next;
      },
      { replace: true }
    );
  }, [selectedAccountId, dateRange, page, setSearchParams]);

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
      pageSize
    }),
    [selectedAccountId, dateRange, page, pageSize]
  );

  const { data: feedResponse, isLoading: feedLoading, error: feedError } = useFeed({
    query,
    enabled: true
  });

  const { data: modalPost, isLoading: modalLoading } = usePostDetail({
    postId: activePostId
  });

  const modalAccount = useMemo(
    () =>
      modalPost
        ? accounts.find((account) => account.id === modalPost.accountId) ?? null
        : null,
    [accounts, modalPost]
  );

  const feedPosts = feedResponse?.posts ?? [];
  const totalPosts = feedResponse?.total ?? 0;

  const handleAccountSelect = (accountId: string | null) => {
    setSelectedAccountId(accountId);
    setPage(1);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
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

  return (
    <AppShell
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
          onReset={() => {
            resetFilters();
            setPage(1);
          }}
          activeAccount={activeAccount}
        />
      }
    >
      <div className="flex flex-col gap-6">
        {feedError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            피드를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        ) : (
          <PostGrid
            posts={feedPosts}
            isLoading={feedLoading && !feedPosts.length}
            onOpenPost={handleOpenPost}
          />
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalPosts}
          onChange={setPage}
        />
      </div>
      <PostModal
        post={modalPost}
        account={modalAccount}
        isOpen={Boolean(activePostId)}
        isLoading={modalLoading}
        onClose={handleCloseModal}
      />
    </AppShell>
  );
};

export default FeedPage;
