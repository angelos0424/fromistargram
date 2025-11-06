import { useEffect, useMemo, useState } from 'react';
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
  const [data, setData] = useState<FeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const key = useMemo(() => serializeQuery(query), [query]);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    client
      .fetchPosts(query)
      .then((response) => {
        if (cancelled) {
          return;
        }

        setData(response);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        setError(err instanceof Error ? err : new Error('Unknown error'));
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, key, query, enabled]);

  return { data, isLoading, error };
};
