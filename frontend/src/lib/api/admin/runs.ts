import { fetchApi } from '../../queryClient';
import { type CrawlRun, type ManualRunPayload } from './types';

interface ApiResponse<T> {
  data: T;
}

const ADMIN_RUNS_PATH = '/admin/runs';

export const listRuns = async (): Promise<CrawlRun[]> => {
  const res = await fetchApi.get<ApiResponse<CrawlRun[]>>(ADMIN_RUNS_PATH);
  return res.data.data;
};

export const triggerRun = async (payload: ManualRunPayload): Promise<CrawlRun> => {
  const res = await fetchApi.post<ApiResponse<CrawlRun>>(ADMIN_RUNS_PATH, payload);
  return res.data.data;
};
