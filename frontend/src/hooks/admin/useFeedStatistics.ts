import { useQuery } from '@tanstack/react-query';
import { useAdminApi } from '../../lib/api/admin/context';
import type { FeedStatistics } from '../../lib/api/admin/types';

const STATS_KEY = ['admin', 'feed-stats'];

export const useFeedStatistics = () => {
  const client = useAdminApi();
  const query = useQuery({
    queryKey: STATS_KEY,
    queryFn: () => client.fetchFeedStatistics(),
    refetchInterval: 1000 * 60 * 5
  });

  return {
    ...query,
    statistics: query.data ?? null
  };
};

export type { FeedStatistics };
