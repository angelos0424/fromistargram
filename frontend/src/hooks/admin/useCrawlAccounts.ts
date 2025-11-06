import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminApi } from '../../lib/api/admin/context';
import type {
  CrawlAccount,
  CrawlAccountPatch,
  CrawlAccountPayload
} from '../../lib/api/admin/types';

const ACCOUNTS_KEY = ['admin', 'accounts'];

export const useCrawlAccounts = () => {
  const client = useAdminApi();
  const query = useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: () => client.listAccounts()
  });

  return {
    ...query,
    accounts: query.data ?? []
  };
};

export const useCreateAccount = () => {
  const client = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CrawlAccountPayload) => client.createAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    }
  });
};

export const useUpdateAccount = () => {
  const client = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CrawlAccountPatch }) =>
      client.updateAccount(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    }
  });
};

export const useDeleteAccount = () => {
  const client = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    }
  });
};

export const useRegisterSession = () => {
  const client = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, sessionId }: { id: string; sessionId: string }) =>
      client.registerSession(id, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    }
  });
};

export type { CrawlAccount };
