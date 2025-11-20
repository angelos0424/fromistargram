import { fetchApi } from '../../queryClient';
import { ADMIN_RUNS_PATH } from './consts';
import { type ApiResponse, type CrawlRun, type ManualRunPayload } from './types';

export const listRuns = async (): Promise<CrawlRun[]> => {
  const res = await fetchApi.get<ApiResponse<CrawlRun[]>>(ADMIN_RUNS_PATH);
  return res.data.data;
};

export const triggerRun = async (payload: ManualRunPayload): Promise<CrawlRun> => {
  const res = await fetchApi.post<ApiResponse<CrawlRun>>(ADMIN_RUNS_PATH, payload);
  return res.data.data;
};
