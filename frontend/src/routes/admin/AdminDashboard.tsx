import AdminSectionCard from '../../components/admin/AdminSectionCard';
import { useQuery } from '@tanstack/react-query';
import { listStatistics } from '../../lib/api/admin/dashboard';
import { ADMIN_KEY } from '../../lib/api/admin/consts';

const AdminDashboard = () => {
  const { data: statistics } = useQuery({
    queryFn: () => listStatistics().then((res) => res.data),
    queryKey: [ADMIN_KEY, 'statistics'],
  });

  return (
    <div className="space-y-6">
      <AdminSectionCard
        title="운영 현황 요약"
        description="현재 인덱싱된 계정 및 게시물 수치를 확인합니다."
      >
        {statistics ? (
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">전체 계정</dt>
              <dd className="mt-2 text-2xl font-semibold text-brand-200">
                {statistics.totalAccounts.toLocaleString()}
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
    </div>
  );
};

export default AdminDashboard;
