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
  type ParsedIdToken
} from './token';

type TokenResponse = {
  access_token: string;
  id_token: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  state?: string;
};

type StoredSession = {
  accessToken: string;
  idToken: string;
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

const STORAGE_KEY = 'fromistargram.auth.session';
const STATE_KEY = 'fromistargram.auth.state';
const NONCE_KEY = 'fromistargram.auth.nonce';

const AuthContext = createContext<AuthContextValue | null>(null);

const parseHashParams = (hash: string): URLSearchParams => {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(trimmed);
};

const resolveExpiresAt = (token: string, expiresIn?: number): number => {
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) {
    return Date.now() + expiresIn * 1000;
  }

  const payload = decodeJwt(token);
  if (!payload?.exp) {
    return Date.now();
  }

  return payload.exp * 1000;
};

const tryParseTokenResponse = (hash: string): TokenResponse | null => {
  if (!hash) {
    return null;
  }

  const params = parseHashParams(hash);
  const accessToken = params.get('access_token');
  const idToken = params.get('id_token');

  if (!accessToken || !idToken) {
    return null;
  }

  const expiresInRaw = params.get('expires_in');
  const expiresIn = expiresInRaw ? Number.parseInt(expiresInRaw, 10) : undefined;

  return {
    access_token: accessToken,
    id_token: idToken,
    expires_in: Number.isNaN(expiresIn) ? undefined : expiresIn,
    token_type: params.get('token_type') ?? undefined,
    scope: params.get('scope') ?? undefined,
    state: params.get('state') ?? undefined
  };
};

const loadStoredSession = (): StoredSession | null => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
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
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const persistSession = (session: StoredSession | null) => {
  if (!session) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

const generateState = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 10);
};

const buildAuthorizeUrl = (config: AuthentikConfig, state: string, nonce: string) => {
  const params = new URLSearchParams({
    response_type: 'id_token token',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
    nonce
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
    (options?: { prompt?: 'login' | 'consent'; force?: boolean }) => {
      const stateValue = generateState();
      const nonceValue = generateState();
      const authorizeUrl = new URL(buildAuthorizeUrl(config, stateValue, nonceValue));

      if (options?.prompt) {
        authorizeUrl.searchParams.set('prompt', options.prompt);
      }

      if (options?.force) {
        authorizeUrl.searchParams.set('max_age', '0');
      }

      sessionStorage.setItem(STATE_KEY, stateValue);
      sessionStorage.setItem(NONCE_KEY, nonceValue);
      window.location.assign(authorizeUrl.toString());
    },
    [config]
  );

  useEffect(() => {
    const hashResponse = tryParseTokenResponse(window.location.hash);

    if (hashResponse) {
      const stateValue = sessionStorage.getItem(STATE_KEY);
      const nonceValue = sessionStorage.getItem(NONCE_KEY);
      if (hashResponse.state && hashResponse.state !== stateValue) {
        setState((prev) => ({
          ...prev,
          error: '인증 상태값이 일치하지 않습니다.',
          isLoading: false
        }));
        sessionStorage.removeItem(STATE_KEY);
        sessionStorage.removeItem(NONCE_KEY);
        return;
      }

      const expiresAt = resolveExpiresAt(hashResponse.id_token, hashResponse.expires_in);
      const parsed = parseIdToken(hashResponse.id_token);
      if (!parsed) {
        persistSession(null);
        sessionStorage.removeItem(STATE_KEY);
        sessionStorage.removeItem(NONCE_KEY);
        setState((prev) => ({
          ...prev,
          error: 'ID 토큰을 파싱할 수 없습니다.',
          isLoading: false
        }));
        return;
      }

      if (nonceValue && parsed.nonce && parsed.nonce !== nonceValue) {
        persistSession(null);
        sessionStorage.removeItem(STATE_KEY);
        sessionStorage.removeItem(NONCE_KEY);
        setState((prev) => ({
          ...prev,
          error: '인증 nonce 값이 일치하지 않습니다.',
          isLoading: false
        }));
        return;
      }

      const session: StoredSession = {
        accessToken: hashResponse.access_token,
        idToken: hashResponse.id_token,
        expiresAt,
        scope: hashResponse.scope,
        tokenType: hashResponse.token_type
      };

      persistSession(session);
      sessionStorage.removeItem(STATE_KEY);
      sessionStorage.removeItem(NONCE_KEY);
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      setState({
        token: hashResponse.access_token,
        idToken: parsed,
        expiresAt,
        isLoading: false,
        error: null
      });
      return;
    }

    const stored = loadStoredSession();

    if (!stored || stored.expiresAt <= Date.now() || isTokenExpired(stored.idToken)) {
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
  }, []);

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
