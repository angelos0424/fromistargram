import { FormEvent, useMemo, useState } from 'react';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import {ADMIN_KEY} from "../../lib/api/admin/consts";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createTarget, deleteTarget, listTargets, updateTarget, UpdateTargetInput} from "../../lib/api/admin/targets";
import type {CrawlTargetPayload} from "../../lib/api/admin/types";

interface FormState {
  handle: string;
  displayName: string;
  isFeatured: boolean;
  isActive: boolean;
}

const initialFormState: FormState = {
  handle: '',
  displayName: '',
  isFeatured: false,
  isActive: true
};

const AdminTargetsPage = () => {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: targets = [], isPending} = useQuery({
    queryKey: [ADMIN_KEY, 'targets'],
    queryFn: () => listTargets().then(res => res.data),
  })

  const { mutate: createMutate, isPending: isCreatePending } = useMutation({
    mutationKey: [ADMIN_KEY, 'targets', 'create'],
    mutationFn: (payload: CrawlTargetPayload) => createTarget(payload),
    onSuccess: () => {
      setForm(initialFormState)
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'targets']})
    }
  })

  const { mutate: updateMutate, isPending: isUpdatePending } = useMutation({
    mutationKey: [ADMIN_KEY, 'targets', 'update'],
    mutationFn: (payload: UpdateTargetInput) => updateTarget(payload),
    onSuccess: () => {
      setEditingId(null);
      setForm(initialFormState);
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'targets']})
    }
  })

  const { mutate: deleteMutate } = useMutation({
    mutationKey: [ADMIN_KEY, 'targets', 'delete'],
    mutationFn: (id: string) => deleteTarget(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'targets']})
    }
  })

  const sortedTargets = useMemo(
    () => [...targets].sort((a, b) => a.priority - b.priority),
    [targets]
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.handle.trim()) {
      return;
    }

    if (editingId) {

      updateMutate({
        id: editingId,
        patch: {
          displayName: form.displayName,
          isFeatured: form.isFeatured,
          isActive: form.isActive
        }
      });
      return;
    }

    createMutate(
      {
        handle: form.handle,
        displayName: form.displayName,
        isFeatured: form.isFeatured,
        isActive: form.isActive
      }
    )
  };

  const startEdit = (id: string) => {
    const target = targets.find((item) => item.id === id);
    if (!target) {
      return;
    }

    setEditingId(id);
    setForm({
      handle: target.handle,
      displayName: target.displayName,
      isFeatured: target.isFeatured,
      isActive: target.isActive
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(initialFormState);
  };

  return (
    <div className="space-y-6">
      <AdminSectionCard
        title="크롤링 대상 추가"
        description="Instagram ID를 등록하여 주기적인 인덱싱을 수행합니다."
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Instagram Handle
            </span>
            <input
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-brand-400 focus:outline-none"
              value={form.handle}
              onChange={(event) => setForm((prev) => ({ ...prev, handle: event.target.value }))}
              placeholder="fromis_9"
              disabled={Boolean(editingId)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              표시 이름
            </span>
            <input
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-brand-400 focus:outline-none"
              value={form.displayName}
              onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              placeholder="fromis_9 공식"
            />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border border-slate-600 bg-slate-950 accent-brand-400"
              checked={form.isFeatured}
              onChange={(event) => setForm((prev) => ({ ...prev, isFeatured: event.target.checked }))}
            />
            <span>피드 상단에 노출</span>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border border-slate-600 bg-slate-950 accent-brand-400"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            <span>크롤링 활성화</span>
          </label>
          <div className="col-span-full flex items-center gap-2">
            <button
              type="submit"
              className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-400"
              disabled={ isCreatePending || isUpdatePending }
            >
              {editingId ? '대상 수정' : '대상 추가'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
              >
                취소
              </button>
            ) : null}
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard
        title="등록된 크롤링 대상"
        description="활성 여부 및 피쳐드 토글을 조정해 노출 대상을 관리합니다."
      >
        {isPending ? (
          <p className="text-sm text-slate-400">대상 목록을 불러오는 중입니다…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left">우선순위</th>
                  <th className="px-4 py-2 text-left">Handle</th>
                  <th className="px-4 py-2 text-left">표시 이름</th>
                  <th className="px-4 py-2 text-center">피쳐드</th>
                  <th className="px-4 py-2 text-center">활성</th>
                  <th className="px-4 py-2 text-left">최근 동기화</th>
                  <th className="px-4 py-2 text-left">게시물 수</th>
                  <th className="px-4 py-2 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedTargets.map((target) => (
                  <tr key={target.id} className="hover:bg-slate-900/70">
                    <td className="px-4 py-3 text-xs text-slate-400">#{target.priority}</td>
                    <td className="px-4 py-3 font-mono text-slate-100">@{target.handle}</td>
                    <td className="px-4 py-3 text-slate-100">{target.displayName}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="size-4 rounded border border-slate-600 bg-slate-950 accent-brand-400"
                        checked={target.isFeatured}
                        onChange={(event) =>
                          updateMutate({
                            id: target.id,
                            patch: { isFeatured: event.target.checked }
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="size-4 rounded border border-slate-600 bg-slate-950 accent-brand-400"
                        checked={target.isActive}
                        onChange={(event) =>
                          updateMutate({
                            id: target.id,
                            patch: { isActive: event.target.checked }
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {target.lastSyncedAt ? new Date(target.lastSyncedAt).toLocaleString() : '기록 없음'}
                    </td>
                    <td className="px-4 py-3 text-slate-100">{target.postCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(target.id)}
                          className="rounded border border-slate-700 px-3 py-1 text-xs hover:border-slate-500"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutate(target.id)}
                          className="rounded border border-red-600/60 px-3 py-1 text-xs text-red-300 hover:border-red-500"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
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

export default AdminTargetsPage;
