import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminApi } from '../../lib/api/admin/context';
import type {
  CrawlTarget,
  CrawlTargetPatch,
  CrawlTargetPayload
} from '../../lib/api/admin/types';

const TARGETS_KEY = ['admin', 'targets'];

export const useCrawlTargets = () => {
  const client = useAdminApi();

  const query = useQuery({
    queryKey: TARGETS_KEY,
    queryFn: () => client.listTargets()
  });

  return {
    ...query,
    targets: query.data ?? []
  };
};

export const useCreateTarget = () => {
  const client = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CrawlTargetPayload) => client.createTarget(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TARGETS_KEY });
    }
  });
};

export const useUpdateTarget = () => {
  const client = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CrawlTargetPatch }) =>
      client.updateTarget(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TARGETS_KEY });
    }
  });
};

export const useDeleteTarget = () => {
  const client = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.deleteTarget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TARGETS_KEY });
    }
  });
};

export const useReorderTargets = () => {
  const client = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => client.reorderTargets(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TARGETS_KEY });
    }
  });
};

export type { CrawlTarget };
