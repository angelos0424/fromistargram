import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FeedQuery, FeedResponse } from '../lib/api/types';
import { useApiClient } from '../lib/api/context';

interface UseFeedOptions {
  query: FeedQuery;
  enabled?: boolean;
}

interface UseFeedResult {
  data: FeedResponse | null;
  isLoading: boolean;
  error: Error | null;
}

const serializeQuery = (query: FeedQuery) => {
  const { accountId, from, to, page, pageSize } = query;
  return JSON.stringify({ accountId, from, to, page, pageSize });
};

export const useFeed = ({
  query,
  enabled = true
}: UseFeedOptions): UseFeedResult => {
  const client = useApiClient();
  const serializedKey = useMemo(() => serializeQuery(query), [query]);

  const result = useQuery({
    queryKey: ['feed', serializedKey],
    queryFn: () => client.fetchPosts(query),
    enabled,
    keepPreviousData: true,
    staleTime: 1000 * 15
  });

  return {
    data: result.data ?? null,
    isLoading: result.isPending,
    error: result.error instanceof Error ? result.error : result.error ? new Error('Unknown error') : null
  };
};
