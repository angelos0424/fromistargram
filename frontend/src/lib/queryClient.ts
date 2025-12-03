import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const fetchApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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
