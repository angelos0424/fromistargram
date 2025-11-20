import { fetchApi } from '../../queryClient';
import {
  type CrawlAccount,
  type CrawlAccountPatch,
  type CrawlAccountPayload
} from './types';

interface ApiResponse<T> {
  data: T;
}

const ADMIN_ACCOUNTS_PATH = '/admin/accounts';

export const listAccount = async (): Promise<CrawlAccount[]> => {
  const res = await fetchApi.get<ApiResponse<CrawlAccount[]>>(ADMIN_ACCOUNTS_PATH);
  return res.data.data;
};

export const createAccount = async (
  payload: CrawlAccountPayload
): Promise<CrawlAccount> => {
  const res = await fetchApi.post<ApiResponse<CrawlAccount>>(ADMIN_ACCOUNTS_PATH, payload);
  return res.data.data;
};

interface UpdateAccountInput {
  id: string;
  patch: CrawlAccountPatch;
}

export const updateAccount = async ({
  id,
  patch
}: UpdateAccountInput): Promise<CrawlAccount> => {
  const res = await fetchApi.patch<ApiResponse<CrawlAccount>>(
    `${ADMIN_ACCOUNTS_PATH}/${id}`,
    patch
  );
  return res.data.data;
};

export const deleteAccount = async (id: string): Promise<void> => {
  await fetchApi.delete(`${ADMIN_ACCOUNTS_PATH}/${id}`);
};

interface RegisterSessionInput {
  id: string;
  sessionId: string;
}

export const registerSession = async ({
  id,
  sessionId
}: RegisterSessionInput): Promise<CrawlAccount> => {
  const res = await fetchApi.post<ApiResponse<CrawlAccount>>(
    `${ADMIN_ACCOUNTS_PATH}/${id}/session`,
    { sessionId }
  );
  return res.data.data;
};
