import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { loadAuthentikConfig, type AuthentikConfig } from './config';
import {
  decodeJwt,
  isTokenExpired,
  parseIdToken,
  type ParsedIdToken,
  exchangeCodeForTokens,
  refreshAccessToken
} from './token';
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce';

type StoredSession = {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
};

export interface AuthContextValue {
  config: AuthentikConfig;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  idToken: ParsedIdToken | null;
  login: (options?: { prompt?: 'login' | 'consent'; force?: boolean }) => void;
  logout: () => void;
  error: string | null;
}

export const AUTH_STORAGE_KEY = 'fromistargram.auth.session';
const STATE_KEY = 'fromistargram.auth.state';
const NONCE_KEY = 'fromistargram.auth.nonce';
const CODE_VERIFIER_KEY = 'fromistargram.auth.code_verifier';

const AuthContext = createContext<AuthContextValue | null>(null);

const resolveExpiresAt = (expiresIn: number): number => {
  return Date.now() + expiresIn * 1000;
};

const tryParseAuthorizationCode = (
  search: string
): { code: string; state?: string } | null => {
  if (!search) {
    return null;
  }

  const params = new URLSearchParams(search);
  const code = params.get('code');

  if (!code) {
    return null;
  }

  return {
    code,
    state: params.get('state') ?? undefined
  };
};

const loadStoredSession = (): StoredSession | null => {
  const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.accessToken || !parsed.idToken || !parsed.expiresAt) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('Failed to parse stored session', error);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const persistSession = (session: StoredSession | null) => {
  if (!session) {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

const cleanOAuthParamsFromUrl = () => {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('code');
  cleanUrl.searchParams.delete('state');
  cleanUrl.searchParams.delete('session_state');
  const cleanPath = cleanUrl.pathname + (cleanUrl.search || '');
  window.history.replaceState({}, document.title, cleanPath);
};

const buildAuthorizeUrl = (
  config: AuthentikConfig,
  state: string,
  nonce: string,
  codeChallenge: string
) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  if (config.audience) {
    params.set('audience', config.audience);
  }

  return `${config.issuerUrl.replace(/\/$/, '')}/application/o/authorize/?${params.toString()}`;
};

const buildLogoutUrl = (config: AuthentikConfig, redirectUri: string) => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    post_logout_redirect_uri: redirectUri
  });

  return `${config.issuerUrl.replace(/\/$/, '')}/application/o/logout/?${params.toString()}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const configRef = useRef<AuthentikConfig | null>(null);
  const [state, setState] = useState<{
    token: string | null;
    idToken: ParsedIdToken | null;
    expiresAt: number | null;
    isLoading: boolean;
    error: string | null;
  }>({
    token: null,
    idToken: null,
    expiresAt: null,
    isLoading: true,
    error: null
  });

  if (!configRef.current) {
    configRef.current = loadAuthentikConfig();
  }

  const config = configRef.current;

  const logout = useCallback(() => {
    persistSession(null);
    setState((prev) => ({
      ...prev,
      token: null,
      idToken: null,
      expiresAt: null
    }));

    const redirectUri = config.logoutRedirectUri ?? config.redirectUri;
    const logoutUrl = buildLogoutUrl(config, redirectUri);
    window.location.assign(logoutUrl);
  }, [config]);

  const login = useCallback(
    async (options?: { prompt?: 'login' | 'consent'; force?: boolean }) => {
      const stateValue = generateState();
      const nonceValue = generateState();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      const authorizeUrl = new URL(
        buildAuthorizeUrl(config, stateValue, nonceValue, codeChallenge)
      );

      if (options?.prompt) {
        authorizeUrl.searchParams.set('prompt', options.prompt);
      }

      if (options?.force) {
        authorizeUrl.searchParams.set('max_age', '0');
      }

      sessionStorage.setItem(STATE_KEY, stateValue);
      sessionStorage.setItem(NONCE_KEY, nonceValue);
      sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
      window.location.assign(authorizeUrl.toString());
    },
    [config]
  );

  useEffect(() => {
    const handleAuthorizationCode = async () => {
      const codeResponse = tryParseAuthorizationCode(window.location.search);

      if (codeResponse) {
        const stateValue = sessionStorage.getItem(STATE_KEY);
        const nonceValue = sessionStorage.getItem(NONCE_KEY);
        const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);

        if (codeResponse.state && codeResponse.state !== stateValue) {
          cleanOAuthParamsFromUrl();
          setState((prev) => ({
            ...prev,
            error: '인증 상태값이 일치하지 않습니다.',
            isLoading: false
          }));
          sessionStorage.removeItem(STATE_KEY);
          sessionStorage.removeItem(NONCE_KEY);
          sessionStorage.removeItem(CODE_VERIFIER_KEY);
          return;
        }

        if (!codeVerifier) {
          cleanOAuthParamsFromUrl();
          setState((prev) => ({
            ...prev,
            error: 'PKCE code verifier를 찾을 수 없습니다.',
            isLoading: false
          }));
          return;
        }

        try {
          const tokenResponse = await exchangeCodeForTokens(
            config.issuerUrl,
            config.clientId,
            config.redirectUri,
            codeResponse.code,
            codeVerifier
          );

          const expiresAt = resolveExpiresAt(tokenResponse.expires_in);
          const parsed = parseIdToken(tokenResponse.id_token);

          if (!parsed) {
            cleanOAuthParamsFromUrl();
            persistSession(null);
            sessionStorage.removeItem(STATE_KEY);
            sessionStorage.removeItem(NONCE_KEY);
            sessionStorage.removeItem(CODE_VERIFIER_KEY);
            setState((prev) => ({
              ...prev,
              error: 'ID 토큰을 파싱할 수 없습니다.',
              isLoading: false
            }));
            return;
          }

          if (nonceValue && parsed.nonce && parsed.nonce !== nonceValue) {
            cleanOAuthParamsFromUrl();
            persistSession(null);
            sessionStorage.removeItem(STATE_KEY);
            sessionStorage.removeItem(NONCE_KEY);
            sessionStorage.removeItem(CODE_VERIFIER_KEY);
            setState((prev) => ({
              ...prev,
              error: '인증 nonce 값이 일치하지 않습니다.',
              isLoading: false
            }));
            return;
          }

          const session: StoredSession = {
            accessToken: tokenResponse.access_token,
            idToken: tokenResponse.id_token,
            refreshToken: tokenResponse.refresh_token,
            expiresAt,
            scope: tokenResponse.scope,
            tokenType: tokenResponse.token_type
          };

          persistSession(session);
          sessionStorage.removeItem(STATE_KEY);
          sessionStorage.removeItem(NONCE_KEY);
          sessionStorage.removeItem(CODE_VERIFIER_KEY);
          cleanOAuthParamsFromUrl();

          setState({
            token: tokenResponse.access_token,
            idToken: parsed,
            expiresAt,
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Token exchange failed:', error);
          cleanOAuthParamsFromUrl();
          sessionStorage.removeItem(STATE_KEY);
          sessionStorage.removeItem(NONCE_KEY);
          sessionStorage.removeItem(CODE_VERIFIER_KEY);
          const errorMessage = error instanceof Error ? error.message : '토큰 교환에 실패했습니다.';
          setState((prev) => ({
            ...prev,
            error: errorMessage,
            isLoading: false
          }));
        }
        return;
      }

      const stored = loadStoredSession();

      if (!stored || stored.expiresAt <= Date.now() || isTokenExpired(stored.idToken)) {
        // Try to refresh token if refresh token exists
        if (stored?.refreshToken) {
          try {
            const tokenResponse = await refreshAccessToken(
              config.issuerUrl,
              config.clientId,
              stored.refreshToken
            );

            const expiresAt = resolveExpiresAt(tokenResponse.expires_in);
            const parsed = parseIdToken(tokenResponse.id_token);

            if (parsed) {
              const session: StoredSession = {
                accessToken: tokenResponse.access_token,
                idToken: tokenResponse.id_token,
                refreshToken: tokenResponse.refresh_token ?? stored.refreshToken,
                expiresAt,
                scope: tokenResponse.scope,
                tokenType: tokenResponse.token_type
              };

              persistSession(session);
              setState({
                token: tokenResponse.access_token,
                idToken: parsed,
                expiresAt,
                isLoading: false,
                error: null
              });
              return;
            }
          } catch (error) {
            console.error('Token refresh failed:', error);
          }
        }

        persistSession(null);
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const parsed = parseIdToken(stored.idToken);
      if (!parsed) {
        persistSession(null);
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      setState({
        token: stored.accessToken,
        idToken: parsed,
        expiresAt: stored.expiresAt,
        isLoading: false,
        error: null
      });
    };

    handleAuthorizationCode();
  }, [config]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!state.token || !state.expiresAt) {
      return;
    }

    const stored = loadStoredSession();
    if (!stored?.refreshToken) {
      return;
    }

    const timeUntilExpiry = state.expiresAt - Date.now();
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0); // 5 minutes before expiry

    const timer = setTimeout(async () => {
      try {
        const tokenResponse = await refreshAccessToken(
          config.issuerUrl,
          config.clientId,
          stored.refreshToken!
        );

        const expiresAt = resolveExpiresAt(tokenResponse.expires_in);
        const parsed = parseIdToken(tokenResponse.id_token);

        if (parsed) {
          const session: StoredSession = {
            accessToken: tokenResponse.access_token,
            idToken: tokenResponse.id_token,
            refreshToken: tokenResponse.refresh_token ?? stored.refreshToken,
            expiresAt,
            scope: tokenResponse.scope,
            tokenType: tokenResponse.token_type
          };

          persistSession(session);
          setState((prev) => ({
            ...prev,
            token: tokenResponse.access_token,
            idToken: parsed,
            expiresAt
          }));
        }
      } catch (error) {
        console.error('Auto token refresh failed:', error);
        // Token refresh failed, user will need to re-authenticate
        logout();
      }
    }, refreshTime);

    return () => clearTimeout(timer);
  }, [state.token, state.expiresAt, config, logout]);

  const isAuthenticated = useMemo(() => {
    if (!state.token || !state.idToken || !state.expiresAt) {
      return false;
    }

    if (state.expiresAt <= Date.now()) {
      return false;
    }

    return !isTokenExpired(state.idToken.raw);
  }, [state.token, state.idToken, state.expiresAt]);

  const value = useMemo<AuthContextValue>(
    () => ({
      config,
      isLoading: state.isLoading,
      isAuthenticated,
      token: state.token,
      idToken: state.idToken,
      login,
      logout,
      error: state.error
    }),
    [config, state, isAuthenticated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
