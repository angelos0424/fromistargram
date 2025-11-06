import { useEffect, useState } from 'react';
import type { Account } from '../lib/api/types';
import { useApiClient } from '../lib/api/context';

interface UseAccountsResult {
  accounts: Account[];
  isLoading: boolean;
  error: Error | null;
}

export const useAccounts = (): UseAccountsResult => {
  const client = useApiClient();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    client
      .fetchAccounts()
      .then((data) => {
        if (cancelled) {
          return;
        }
        setAccounts(data);
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
  }, [client]);

  return { accounts, isLoading, error };
};
