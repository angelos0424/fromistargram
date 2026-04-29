import { fetchApi } from '../../queryClient';
import { ADMIN_DB_OVERVIEW_PATH } from './consts';
import { type ApiResponse, type DatabaseOverview } from './types';
import { type AccountResponse } from '../types';

export const fetchDatabaseOverview = () =>
  fetchApi.get<ApiResponse<DatabaseOverview>>(ADMIN_DB_OVERVIEW_PATH).then((res) => res.data);

export const createDatabaseAccount = (id: string) =>
  fetchApi.post<AccountResponse>('/admin/db/accounts', { id }).then((res) => res.data);

export const deleteDatabaseAccount = (id: string) =>
  fetchApi.delete(`/admin/db/accounts/${id}`);
