import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminApi } from '../../lib/api/admin/context';
import type { CrawlRun, ManualRunPayload } from '../../lib/api/admin/types';

const RUNS_KEY = ['admin', 'runs'];

export const useCrawlRuns = () => {
  const client = useAdminApi();
  const query = useQuery({
    queryKey: RUNS_KEY,
    queryFn: () => client.listRuns()
  });

  return {
    ...query,
    runs: query.data ?? []
  };
};

export const useTriggerRun = () => {
  const client = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ManualRunPayload) => client.triggerRun(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RUNS_KEY });
    }
  });
};

export type { CrawlRun };
