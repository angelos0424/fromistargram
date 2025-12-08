import { fetchApi } from '../../queryClient';
import { ADMIN_DB_OVERVIEW_PATH } from './consts';
import { type ApiResponse, type DatabaseOverview } from './types';

export const fetchDatabaseOverview = () =>
  fetchApi.get<ApiResponse<DatabaseOverview>>(ADMIN_DB_OVERVIEW_PATH).then((res) => res.data);
