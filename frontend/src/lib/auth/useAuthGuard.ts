import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './context';

export const useAuthGuard = () => {
  const auth = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    if (!auth.isAuthenticated) {
      auth.login({ force: true });
    }
  }, [auth, location]);

  return {
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    error: auth.error
  };
};
