import { useMemo, useState } from 'react';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import { useFeedStatistics } from '../../hooks/admin/useFeedStatistics';
import {
  useCrawlTargets,
  useReorderTargets
} from '../../hooks/admin/useCrawlTargets';

const AdminDashboard = () => {
  const { statistics } = useFeedStatistics();
  const { targets } = useCrawlTargets();
  const reorder = useReorderTargets();
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const orderedTargets = useMemo(() => {
    const data = [...targets].sort((a, b) => a.priority - b.priority);
    if (localOrder) {
      const map = new Map(data.map((item) => [item.id, item] as const));
      return localOrder
        .map((id) => map.get(id))
        .filter((value): value is typeof data[number] => Boolean(value))
        .concat(data.filter((item) => !localOrder.includes(item.id)));
    }
    return data;
  }, [targets, localOrder]);

  const applyOrder = () => {
    const ids = (localOrder ?? orderedTargets.map((item) => item.id));
    reorder.mutate(ids, {
      onSuccess: () => {
        setLocalOrder(null);
      }
    });
  };

  const moveItem = (id: string, direction: -1 | 1) => {
    setLocalOrder((prev) => {
      const source = prev ?? orderedTargets.map((item) => item.id);
      const index = source.indexOf(id);
      if (index < 0) {
        return source;
      }
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= source.length) {
        return source;
      }
      const next = [...source];
      const [removed] = next.splice(index, 1);
      next.splice(targetIndex, 0, removed);
      return next;
    });
  };

  const resetOrder = () => setLocalOrder(null);

  return (
    <div className="space-y-6">
      <AdminSectionCard
        title="운영 현황 요약"
        description="현재 인덱싱된 계정 및 게시물 수치를 확인합니다."
      >
        {statistics ? (
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">전체 계정</dt>
              <dd className="mt-2 text-2xl font-semibold text-brand-200">
                {statistics.totalTargets.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">활성 계정</dt>
              <dd className="mt-2 text-2xl font-semibold text-brand-200">
                {statistics.activeTargets.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">피쳐드 계정</dt>
              <dd className="mt-2 text-2xl font-semibold text-brand-200">
                {statistics.featuredTargets.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">총 게시물 수</dt>
              <dd className="mt-2 text-2xl font-semibold text-brand-200">
                {statistics.totalPosts.toLocaleString()}
              </dd>
              <p className="mt-1 text-xs text-slate-400">
                마지막 동기화: {statistics.lastIndexedAt ? new Date(statistics.lastIndexedAt).toLocaleString() : '기록 없음'}
              </p>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-400">통계 데이터를 불러오는 중입니다…</p>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="피드 노출 순서"
        description="드래그 대신 순서 버튼으로 정렬한 뒤 저장합니다."
        actions={
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={resetOrder}
              className="rounded border border-slate-700 px-3 py-1 transition hover:border-slate-500"
              disabled={!localOrder}
            >
              되돌리기
            </button>
            <button
              type="button"
              onClick={applyOrder}
              className="rounded bg-brand-500/80 px-3 py-1 font-semibold text-slate-950 transition hover:bg-brand-400"
              disabled={reorder.isPending}
            >
              순서 저장
            </button>
          </div>
        }
      >
        <ul className="space-y-2">
          {orderedTargets.map((target, index) => (
            <li
              key={target.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  #{index + 1} — {target.displayName}
                </p>
                <p className="text-xs text-slate-400">@{target.handle}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveItem(target.id, -1)}
                  className="rounded border border-slate-700 px-2 py-1 text-xs hover:border-slate-500"
                >
                  위로
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(target.id, 1)}
                  className="rounded border border-slate-700 px-2 py-1 text-xs hover:border-slate-500"
                >
                  아래로
                </button>
              </div>
            </li>
          ))}
        </ul>
      </AdminSectionCard>
    </div>
  );
};

export default AdminDashboard;
