import { FormEvent, useState } from 'react';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ADMIN_KEY } from '../../lib/api/admin/consts';
import { listRuns, triggerRun } from '../../lib/api/admin/runs';
import type { ManualRunPayload, IndexerStatus } from '../../lib/api/admin/types';
import { listTargets } from '../../lib/api/admin/targets';
import { fetchIndexerStatus, requestIndexerRun } from '../../lib/api/admin/indexer';

const AdminRunsPage = () => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [sessionId, setSessionId] = useState('');
  const [bulkSessionId, setBulkSessionId] = useState('');
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const formatDateTime = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleString() : '-';

  const queryClient = useQueryClient();

  const { data: targets = [], isPending } = useQuery({
    queryKey: [ADMIN_KEY, 'targets'],
    queryFn: () => listTargets().then((res) => res.data)
  });

  const { data: runs = [] } = useQuery({
    queryKey: [ADMIN_KEY, 'runs'],
    queryFn: () => listRuns().then((res) => res.data)
  });

  const {
    data: indexerStatus,
    isPending: isIndexerStatusPending,
    isFetching: isIndexerFetching
  } = useQuery({
    queryKey: [ADMIN_KEY, 'indexer'],
    queryFn: () => fetchIndexerStatus().then(res => res.data),
    refetchInterval: (query) => {
      const data = query.state.data as IndexerStatus | undefined;
      return data?.running ? 1000 : false;
    },
    refetchIntervalInBackground: true
  });

  const { mutate: runMutate, isPending: isRunPending } = useMutation({
    mutationKey: [ADMIN_KEY, 'runs'],
    mutationFn: (payload: ManualRunPayload) => triggerRun(payload).then((res) => res.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'runs'] });
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'indexer'] });
      setSessionId('');
    }
  });

  const { mutate: runIndexerMutate, isPending: isIndexerRunPending } = useMutation({
    mutationKey: [ADMIN_KEY, 'indexer', 'run'],
    mutationFn: () => requestIndexerRun().then((res) => res.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'indexer'] });
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'runs'] });
    }
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTargetId || !sessionId.trim()) {
      return;
    }

    runMutate({ targetId: selectedTargetId, sessionId });
  };

  const handleBulkSubmit = (event: FormEvent) => {
    event.preventDefault();
    setBulkMessage(null);
    const activeCount = targets.filter((target) => target.isActive).length;
    if (!activeCount || !bulkSessionId.trim()) {
      setBulkMessage('활성화된 대상이 없거나 sessionId가 비어 있습니다.');
      return;
    }

    runMutate({ sessionId: bulkSessionId });

    setBulkMessage(`활성 대상 ${activeCount}개 실행을 요청했습니다.`);
    setBulkSessionId('');
  };

  const handleIndexerRun = () => {
    runIndexerMutate();
  };

  const indexerCardBody = () => {
    if (isIndexerStatusPending && !indexerStatus) {
      return <p className="text-sm text-slate-400">인덱서 상태를 불러오는 중입니다…</p>;
    }

    if (!indexerStatus) {
      return <p className="text-sm text-red-300">인덱서 상태를 불러오지 못했습니다.</p>;
    }

    const { status, running, lastStartedAt, lastFinishedAt, lastError } = indexerStatus;
    return (
      <>
        <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">상태</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-100">
              {running ? 'RUNNING' : status.toUpperCase()}
            </dd>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">최근 시작</dt>
            <dd className="mt-1 text-base text-slate-100">{formatDateTime(lastStartedAt)}</dd>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              최근 종료
            </dt>
            <dd className="mt-1 text-base text-slate-100">{formatDateTime(lastFinishedAt)}</dd>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              마지막 오류
            </dt>
            <dd className="mt-1 text-sm text-slate-100">{lastError ?? '-'}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleIndexerRun}
            disabled={running || isIndexerRunPending}
          >
            {running || isIndexerRunPending ? '인덱싱 중…' : '인덱싱 실행'}
          </button>
          {isIndexerFetching ? (
            <span className="text-xs text-slate-400">상태 갱신 중…</span>
          ) : null}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <AdminSectionCard
        title="인덱서 상태"
        description="다운로드된 미디어 파일을 DB에 반영합니다. 필요 시 여기에서 수동으로 동기화를 실행하세요."
      >
        {indexerCardBody()}
      </AdminSectionCard>

      <AdminSectionCard
        title="수동 크롤링 실행"
        description="세션 ID를 지정하여 즉시 크롤링을 트리거합니다."
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex flex-1 flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              대상 계정
            </span>
            <select
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-brand-400 focus:outline-none"
              value={selectedTargetId}
              onChange={(event) => setSelectedTargetId(event.target.value)}
            >
              <option value="">대상을 선택하세요</option>
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  #{target.priority} — {target.displayName} (@{target.handle})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              sessionId
            </span>
            <input
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-brand-400 focus:outline-none"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder="sessionid=..."
            />
          </label>
          <button
            type="submit"
            className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-400"
            disabled={isRunPending}
          >
            실행 요청
          </button>
        </form>
      </AdminSectionCard>

      <AdminSectionCard
        title="전체 대상 일괄 실행"
        description="활성화된 모든 계정을 순차적으로 수동 실행합니다."
      >
        <form onSubmit={handleBulkSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex flex-1 flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              활성 대상 수
            </span>
            <input
              readOnly
              value={targets.filter((target) => target.isActive).length}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200"
            />
          </label>
          <label className="flex flex-1 flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              sessionId
            </span>
            <input
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-brand-400 focus:outline-none"
              value={bulkSessionId}
              onChange={(event) => setBulkSessionId(event.target.value)}
              placeholder="sessionid=..."
            />
          </label>
          <button
            type="submit"
            className="rounded bg-brand-600 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-500"
            disabled={isRunPending}
          >
            전체 실행
          </button>
        </form>
        {bulkMessage ? (
          <p className="mt-2 text-xs text-slate-400">{bulkMessage}</p>
        ) : null}
      </AdminSectionCard>

      <AdminSectionCard
        title="실행 이력"
        description="최근 수동/자동 실행 로그를 확인하여 상태를 파악합니다."
      >
        {isPending ? (
          <p className="text-sm text-slate-400">실행 이력을 불러오는 중입니다…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left">대상</th>
                  <th className="px-4 py-2 text-left">세션</th>
                  <th className="px-4 py-2 text-left">상태</th>
                  <th className="px-4 py-2 text-left">시작</th>
                  <th className="px-4 py-2 text-left">종료</th>
                  <th className="px-4 py-2 text-left">메시지</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-900/70">
                    <td className="px-4 py-3 text-slate-100">@{run.targetHandle}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{run.sessionId}</td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'rounded-full px-3 py-1 text-xs font-semibold',
                          run.status === 'success'
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : run.status === 'failure'
                              ? 'bg-red-500/20 text-red-200'
                              : run.status === 'running'
                                ? 'bg-sky-500/20 text-sky-200'
                                : 'bg-slate-600/30 text-slate-200'
                        ].join(' ')}
                      >
                        {run.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{run.message ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
};

export default AdminRunsPage;
