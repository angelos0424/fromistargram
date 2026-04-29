import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import { CLIENT_KEY } from '../../lib/api/client';
import { ADMIN_KEY } from '../../lib/api/admin/consts';
import {
  createDatabaseAccount,
  deleteDatabaseAccount,
  fetchDatabaseOverview
} from '../../lib/api/admin/database';
import type { TablePreview } from '../../lib/api/admin/types';

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed) && value.includes('T')) {
      return new Date(parsed).toLocaleString();
    }
    return value;
  }

  if (typeof value === 'boolean') {
    return value ? '예' : '아니오';
  }

  if (Array.isArray(value)) {
    return value.length ? JSON.stringify(value) : '[]';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const TablePreviewCard = ({ table }: { table: TablePreview }) => {
  const queryClient = useQueryClient();

  const { mutate: deleteAccount } = useMutation({
    mutationFn: deleteDatabaseAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'database', 'overview'] });
    }
  });

  const columns = useMemo(() => {
    const keys = new Set<string>();
    table.latestRows.forEach((row) => {
      Object.keys(row).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [table.latestRows]);

  const handleDelete = (id: unknown) => {
    if (typeof id !== 'string') return;
    if (window.confirm('정말 이 계정을 삭제하시겠습니까? (관련된 모든 데이터가 삭제됩니다)')) {
      deleteAccount(id);
    }
  };

  return (
    <AdminSectionCard
      title={`${table.label} (${table.count.toLocaleString()}건)`}
      description="최근 업데이트된 레코드 5개를 확인합니다."
    >
      {table.latestRows.length === 0 ? (
        <p className="text-sm text-slate-400">아직 저장된 데이터가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/60">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {column}
                  </th>
                ))}
                {table.key === 'accounts' && (
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                    관리
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {table.latestRows.map((row) => (
                <tr key={JSON.stringify(row)} className="hover:bg-slate-900/40">
                  {columns.map((column) => (
                    <td key={column} className="px-3 py-2 align-top text-slate-100">
                      {formatValue((row as Record<string, unknown>)[column])}
                    </td>
                  ))}
                  {table.key === 'accounts' && (
                    <td className="px-3 py-2 align-top text-slate-100">
                      <button
                        onClick={() => handleDelete((row as Record<string, unknown>).id)}
                        className="rounded bg-red-900/50 px-2 py-1 text-xs text-red-200 hover:bg-red-900 hover:text-white"
                      >
                        삭제
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminSectionCard>
  );
};

const getMutationErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const data = (error as { response?: { data?: { error?: { message?: string } } } }).response
      ?.data;
    if (data?.error?.message) {
      return data.error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const AccountCreateCard = () => {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const createAccountMutation = useMutation({
    mutationFn: createDatabaseAccount,
    onSuccess: (response) => {
      setAccountId('');
      setFormError(null);
      setFormSuccess(`${response.data.id} 계정을 추가했습니다.`);
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'database', 'overview'] });
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'accounts'] });
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'statistics'] });
      void queryClient.invalidateQueries({ queryKey: [CLIENT_KEY, 'accounts'] });
    },
    onError: (error) => {
      setFormSuccess(null);
      setFormError(getMutationErrorMessage(error, '계정 추가에 실패했습니다.'));
    }
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const trimmed = accountId.trim();
    if (!trimmed) {
      setFormError('계정 ID를 입력해 주세요.');
      return;
    }

    createAccountMutation.mutate(trimmed);
  };

  return (
    <AdminSectionCard
      title="계정 추가"
      description="수동 업로드와 인덱서가 사용할 계정을 미리 등록합니다."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          계정 ID
          <input
            type="text"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            placeholder="fromis_9"
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-brand-400 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={createAccountMutation.isPending}
            className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createAccountMutation.isPending ? '추가 중...' : '계정 추가'}
          </button>
          <span className="text-xs text-slate-400">
            영문, 숫자, 점, 밑줄, 하이픈을 사용할 수 있습니다.
          </span>
        </div>
        {formError && (
          <div className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {formError}
          </div>
        )}
        {formSuccess && (
          <div className="rounded border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {formSuccess}
          </div>
        )}
      </form>
    </AdminSectionCard>
  );
};

const AdminDatabasePage = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: [ADMIN_KEY, 'database', 'overview'],
    queryFn: () => fetchDatabaseOverview().then((res) => res.data)
  });

  if (isPending) {
    return <p className="text-sm text-slate-400">DB 정보를 불러오는 중입니다…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-red-300">DB 정보를 불러오지 못했습니다.</p>;
  }

  return (
    <div className="space-y-6">
      <AdminSectionCard
        title="데이터베이스 미리보기"
        description="주요 테이블에서 최근 데이터와 전체 건수를 확인합니다."
      >
        <p className="text-sm text-slate-300">
          총 {data.tables.length}개 테이블의 상태를 확인할 수 있습니다.
        </p>
      </AdminSectionCard>

      <AccountCreateCard />

      {data.tables.map((table) => (
        <TablePreviewCard key={table.key} table={table} />
      ))}
    </div>
  );
};

export default AdminDatabasePage;
