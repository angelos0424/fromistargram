import {
  createContext,
  useContext,
  useMemo,
  type ReactNode
} from 'react';
import { createMockAdminApiClient } from './mockData';
import type { AdminApiClient } from './types';

const AdminApiContext = createContext<AdminApiClient | null>(null);

export const AdminApiProvider = ({ children }: { children: ReactNode }) => {
  const client = useMemo(() => createMockAdminApiClient(), []);

  return (
    <AdminApiContext.Provider value={client}>{children}</AdminApiContext.Provider>
  );
};

export const useAdminApi = (): AdminApiClient => {
  const client = useContext(AdminApiContext);
  if (!client) {
    throw new Error('useAdminApi must be used within AdminApiProvider');
  }
  return client;
};
