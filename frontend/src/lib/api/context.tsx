import {
  createContext,
  useContext,
  useMemo,
  type ReactNode
} from 'react';
import { createApiClient, type ApiClient } from './client';

const ApiClientContext = createContext<ApiClient | null>(null);

export const ApiClientProvider = ({ children }: { children: ReactNode }) => {
  const client = useMemo(() => createApiClient(), []);

  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
};

export const useApiClient = (): ApiClient => {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be used within ApiClientProvider');
  }

  return client;
};
