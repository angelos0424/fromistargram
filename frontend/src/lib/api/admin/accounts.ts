import { fetchApi } from '../../queryClient';
import { ADMIN_ACCOUNTS_PATH } from './consts';
import {
  type ApiResponse,
  type CrawlAccount,
  type CrawlAccountPatch,
  type CrawlAccountPayload
} from './types';

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

export interface UpdateAccountInput {
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

export interface RegisterSessionInput {
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
