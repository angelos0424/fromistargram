import { useQuery } from '@tanstack/react-query';
import type { Post } from '../lib/api/types';
import { useApiClient } from '../lib/api/context';

interface UsePostByIdOptions {
  id: string | null;
}

interface UsePostByIdResult {
  data: Post | null;
  isLoading: boolean;
  error: Error | null;
}

export const usePostById = ({ id }: UsePostByIdOptions): UsePostByIdResult => {
  const client = useApiClient();

  const result = useQuery({
    queryKey: ['post', id],
    queryFn: () => client.fetchPostById(id as string),
    enabled: Boolean(id)
  });

  return {
    data: result.data ?? null,
    isLoading: result.isPending,
    error: result.error instanceof Error ? result.error : result.error ? new Error('Unknown error') : null
  };
};
