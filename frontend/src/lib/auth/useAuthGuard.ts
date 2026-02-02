import { useEffect } from 'react';
import { useAuth } from './context';

export const useAuthGuard = () => {
  const auth = useAuth();

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    if (!auth.isAuthenticated) {
      auth.login({ force: true });
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.login]);

  return {
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    error: auth.error
  };
};
