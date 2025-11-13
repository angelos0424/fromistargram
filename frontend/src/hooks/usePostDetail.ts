import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../lib/api/context';
import type { Post } from '../lib/api/types';

interface UsePostDetailOptions {
  postId: string | null;
  enabled?: boolean;
}

interface UsePostDetailResult {
  data: Post | null;
  isLoading: boolean;
  error: Error | null;
}

export const usePostDetail = ({
  postId,
  enabled = true
}: UsePostDetailOptions): UsePostDetailResult => {
  const client = useApiClient();

  const queryResult = useQuery<Post | null>({
    queryKey: ['post-detail', postId],
    queryFn: () => client.fetchPostById(postId as string),
    enabled: Boolean(postId) && enabled,
    staleTime: 1000 * 30
  });

  return {
    data: queryResult.data ?? null,
    isLoading: queryResult.isPending,
    error:
      queryResult.error instanceof Error
        ? queryResult.error
        : queryResult.error
          ? new Error('Unknown error')
          : null
  };
};
