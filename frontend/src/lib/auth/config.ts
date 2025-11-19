export interface AuthentikConfig {
  issuerUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  audience?: string;
  logoutRedirectUri?: string;
}

const requiredEnv = [
  'VITE_AUTHENTIK_ISSUER_URL',
  'VITE_AUTHENTIK_CLIENT_ID',
  'VITE_AUTHENTIK_REDIRECT_URI',
  'VITE_AUTHENTIK_SCOPE'
] as const;

type RequiredEnvKey = (typeof requiredEnv)[number];

const getEnv = (key: RequiredEnvKey): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const loadAuthentikConfig = (): AuthentikConfig => {
  const [issuerUrl, clientId, redirectUri, scope] = requiredEnv.map((key) => getEnv(key));

  const optional: Partial<AuthentikConfig> = {};

  if (import.meta.env.VITE_AUTHENTIK_AUDIENCE) {
    optional.audience = import.meta.env.VITE_AUTHENTIK_AUDIENCE;
  }

  if (import.meta.env.VITE_AUTHENTIK_LOGOUT_REDIRECT_URI) {
    optional.logoutRedirectUri = import.meta.env.VITE_AUTHENTIK_LOGOUT_REDIRECT_URI;
  }

  return {
    issuerUrl,
    clientId,
    redirectUri,
    scope,
    ...optional
  };
};
