import { useQuery } from '@tanstack/react-query';
import type { Account } from '../lib/api/types';
import { useApiClient } from '../lib/api/context';

interface UseAccountsResult {
  accounts: Account[];
  isLoading: boolean;
  error: Error | null;
}

export const useAccounts = (): UseAccountsResult => {
  const client = useApiClient();
  const query = useQuery({
    queryKey: ['accounts'],
    queryFn: () => client.fetchAccounts(),
    staleTime: 1000 * 60 * 5
  });

  return {
    accounts: query.data ?? [],
    isLoading: query.isPending,
    error: query.error instanceof Error ? query.error : query.error ? new Error('Unknown error') : null
  };
};
