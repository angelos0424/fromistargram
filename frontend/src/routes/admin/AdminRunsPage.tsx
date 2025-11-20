import { FormEvent, useState } from 'react';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {ADMIN_KEY} from "../../lib/api/admin/consts";
import {listRuns, triggerRun} from "../../lib/api/admin/runs";
import type {ManualRunPayload} from "../../lib/api/admin/types";
import {listTargets} from "../../lib/api/admin/targets";

const AdminRunsPage = () => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [sessionId, setSessionId] = useState('');

  const queryClient = useQueryClient();

  const { data: targets = [], isPending } = useQuery({
    queryKey: [ADMIN_KEY, 'targets'],
    queryFn: () => listTargets().then(res => res.data),
  })

  const { data: runs = []} = useQuery({
    queryKey: [ADMIN_KEY, 'runs'],
    queryFn: () => listRuns().then(res => res.data),
  })

  const { mutate: runMutate, isPending: isRunPending } = useMutation({
    mutationKey: [ADMIN_KEY, 'runs'],
    mutationFn: (payload:ManualRunPayload) => triggerRun(payload).then(res=>res.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'runs']})
      setSessionId('')
    }
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTargetId || !sessionId.trim()) {
      return;
    }

    runMutate({ targetId: selectedTargetId, sessionId });
  };

  return (
    <div className="space-y-6">
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
