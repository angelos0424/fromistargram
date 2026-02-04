import { QueryClient } from '@tanstack/react-query';
import axios, { AxiosHeaders } from 'axios';
import { AUTH_STORAGE_KEY } from './auth/context';

export const fetchApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

fetchApi.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return config;
    }
    const parsed = JSON.parse(raw) as { accessToken?: string };
    if (parsed.accessToken) {
      if (config.headers && config.headers instanceof AxiosHeaders) {
        config.headers.set('Authorization', `Bearer ${parsed.accessToken}`);
      } else {
        config.headers = {
          ...(config.headers ?? {}),
          Authorization: `Bearer ${parsed.accessToken}`
        };
      }
    }
  } catch {
    // ignore malformed session storage
  }

  return config;
});


export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30,
        refetchOnWindowFocus: false,
        retry: 1
      }
    }
  });
}

export const queryClient = createQueryClient();
