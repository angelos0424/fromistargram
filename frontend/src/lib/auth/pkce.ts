/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0
 * @see https://datatracker.ietf.org/doc/html/rfc7636
 */

/**
 * Generate a cryptographically random code verifier
 */
export const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
};

/**
 * Generate code challenge from verifier using SHA-256
 */
export const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
};

/**
 * Base64 URL encode without padding
 */
const base64UrlEncode = (buffer: Uint8Array): string => {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Generate random state value
 */
export const generateState = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
};
