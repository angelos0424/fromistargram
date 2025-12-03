import { fetchApi } from '../../queryClient';
import { ADMIN_RUNS_PATH } from './consts';
import { type ApiResponse, type CrawlRun, type ManualRunPayload } from './types';

export const listRuns =  () => fetchApi.get<ApiResponse<CrawlRun[]>>(ADMIN_RUNS_PATH).then(res => res.data);

export const triggerRun = (payload: ManualRunPayload) => fetchApi.post<ApiResponse<CrawlRun>>(ADMIN_RUNS_PATH, payload).then(res=>res.data);
