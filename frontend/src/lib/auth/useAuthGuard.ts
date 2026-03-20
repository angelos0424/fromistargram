import { useEffect } from 'react';
import { useAuth } from './context';

const LOGIN_ATTEMPTED_KEY = 'fromistargram.auth.login_attempted';

export const useAuthGuard = () => {
  const auth = useAuth();

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    // 이미 로그인 시도했으면 중복 호출 방지
    // (sessionStorage는 페이지 새로고침에도 유지됨)
    const loginAttempted = sessionStorage.getItem(LOGIN_ATTEMPTED_KEY);
    if (loginAttempted === 'true') {
      return;
    }

    if (!auth.isAuthenticated) {
      sessionStorage.setItem(LOGIN_ATTEMPTED_KEY, 'true');
      auth.login();
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.login]);

  // 인증 성공 시 플래그 제거
  useEffect(() => {
    if (auth.isAuthenticated) {
      sessionStorage.removeItem(LOGIN_ATTEMPTED_KEY);
    }
  }, [auth.isAuthenticated]);

  return {
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    error: auth.error
  };
};
