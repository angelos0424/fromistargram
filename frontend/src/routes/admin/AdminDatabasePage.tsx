import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import { ADMIN_KEY } from '../../lib/api/admin/consts';
import { fetchDatabaseOverview } from '../../lib/api/admin/database';
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
  const columns = useMemo(() => {
    const keys = new Set<string>();
    table.latestRows.forEach((row) => {
      Object.keys(row).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [table.latestRows]);

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

      {data.tables.map((table) => (
        <TablePreviewCard key={table.key} table={table} />
      ))}
    </div>
  );
};

export default AdminDatabasePage;
