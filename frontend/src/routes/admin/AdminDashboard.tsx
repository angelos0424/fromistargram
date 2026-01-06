import { useMemo, useState } from 'react';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {listStatistics} from "../../lib/api/admin/dashboard";
import {ADMIN_KEY} from "../../lib/api/admin/consts";
import {listTargets, reorderTargets} from "../../lib/api/admin/targets";

const AdminDashboard = () => {
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const queryClient = useQueryClient();
  const { data: statistics } = useQuery({
    queryFn: () => listStatistics().then(res => res.data),
    queryKey: [ADMIN_KEY, 'statistics'],
  })

  const { data: targets = [] } = useQuery({
    queryFn: () => listTargets().then(res => res.data),
    queryKey: [ADMIN_KEY, 'targets'],
  })

  const { mutate: reorderMutate, isPending } = useMutation({
    mutationFn: (idsInOrder: string[]) => reorderTargets(idsInOrder),
    mutationKey: [ADMIN_KEY, 'targets', 'reorder'],
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'targets'] });
      setLocalOrder(null);
    }
  })

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
    reorderMutate(ids);
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
            <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white/90 via-[#eef5ff]/85 to-[#ffeef8]/85 p-4 shadow-[0_10px_28px_rgba(124,180,255,0.22),0_4px_12px_rgba(255,184,212,0.18)] backdrop-blur-lg">
              <dt className="text-xs uppercase tracking-wide text-slate-600">전체 계정</dt>
              <dd className="mt-2 text-3xl font-semibold text-[#7ec8ff]">
                {statistics.totalTargets}
              </dd>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white/90 via-[#eef5ff]/85 to-[#ffeef8]/85 p-4 shadow-[0_10px_28px_rgba(124,180,255,0.22),0_4px_12px_rgba(255,184,212,0.18)] backdrop-blur-lg">
              <dt className="text-xs uppercase tracking-wide text-slate-600">활성 계정</dt>
              <dd className="mt-2 text-3xl font-semibold text-[#8ce8d0]">
                {statistics.activeTargets}
              </dd>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white/90 via-[#eef5ff]/85 to-[#ffeef8]/85 p-4 shadow-[0_10px_28px_rgba(124,180,255,0.22),0_4px_12px_rgba(255,184,212,0.18)] backdrop-blur-lg">
              <dt className="text-xs uppercase tracking-wide text-slate-600">피쳐드 계정</dt>
              <dd className="mt-2 text-3xl font-semibold text-[#b8a4f0]">
                {statistics.featuredTargets.toLocaleString()}
              </dd>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white/90 via-[#eef5ff]/85 to-[#ffeef8]/85 p-4 shadow-[0_10px_28px_rgba(124,180,255,0.22),0_4px_12px_rgba(255,184,212,0.18)] backdrop-blur-lg">
              <dt className="text-xs uppercase tracking-wide text-slate-600">총 게시물 수</dt>
              <dd className="mt-2 text-3xl font-semibold text-[#ffb8d4]">
                {statistics.totalPosts.toLocaleString()}
              </dd>
              <p className="mt-1 text-xs text-slate-600">
                마지막 동기화: {statistics.lastIndexedAt ? new Date(statistics.lastIndexedAt).toLocaleString() : '기록 없음'}
              </p>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-600">통계 데이터를 불러오는 중입니다…</p>
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
              className="rounded-xl border border-white/70 bg-white/60 px-3 py-1 text-slate-600 shadow-[0_6px_16px_rgba(168,216,255,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(168,216,255,0.32)] disabled:opacity-60 disabled:shadow-none"
              disabled={!localOrder}
            >
              되돌리기
            </button>
            <button
              type="button"
              onClick={applyOrder}
              className="rounded-xl bg-[linear-gradient(135deg,#7EC8FF_0%,#B8A4F0_50%,#8CE8D0_100%)] px-3 py-1 font-semibold text-slate-900 shadow-[0_10px_28px_rgba(126,200,255,0.35),0_4px_12px_rgba(140,232,208,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(126,200,255,0.45),0_6px_16px_rgba(140,232,208,0.35)] disabled:opacity-60"
              disabled={isPending}
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
              className="flex items-center justify-between rounded-2xl border border-white/70 bg-gradient-to-r from-white/90 via-[#f5f0ff]/85 to-[#e8f9f3]/85 px-4 py-3 shadow-[0_10px_26px_rgba(126,200,255,0.2),0_4px_10px_rgba(255,184,212,0.16)] backdrop-blur-lg"
            >
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  #{index + 1} — {target.displayName}
                </p>
                <p className="text-xs text-slate-600">@{target.handle}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveItem(target.id, -1)}
                  className="rounded-xl border border-white/70 bg-white/70 px-2 py-1 text-xs text-slate-600 shadow-[0_6px_16px_rgba(184,164,240,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(184,164,240,0.32)]"
                >
                  위로
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(target.id, 1)}
                  className="rounded-xl border border-white/70 bg-white/70 px-2 py-1 text-xs text-slate-600 shadow-[0_6px_16px_rgba(255,184,212,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(255,184,212,0.3)]"
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
