import { useEffect, useRef } from 'react';
import { useAuth } from './context';

export const useAuthGuard = () => {
  const auth = useAuth();
  const loginAttemptedRef = useRef(false);

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    // 이미 로그인 시도 중이면 중복 호출 방지
    if (loginAttemptedRef.current) {
      return;
    }

    if (!auth.isAuthenticated) {
      loginAttemptedRef.current = true;
      auth.login({ force: true });
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.login]);

  return {
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    error: auth.error
  };
};
