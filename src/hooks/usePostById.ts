import { useEffect, useState } from 'react';
import type { Post } from '../lib/api/types';
import { useApiClient } from '../lib/api/context';

interface UsePostByIdResult {
  post: Post | null;
  isLoading: boolean;
  error: Error | null;
}

export const usePostById = (postId: string | null): UsePostByIdResult => {
  const client = useApiClient();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!postId) {
      setPost(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    client
      .fetchPostById(postId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setPost(result ?? null);
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
  }, [client, postId]);

  return { post, isLoading, error };
};
