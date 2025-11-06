import { Navigate, Outlet } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../lib/auth/context';
import { useAuthGuard } from '../../lib/auth/useAuthGuard';

const AdminGate = () => {
  const auth = useAuth();
  const guard = useAuthGuard();

  if (auth.isLoading || guard.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="space-y-3 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          <p className="text-sm">Authentik 인증 정보를 확인 중입니다…</p>
        </div>
      </div>
    );
  }

  if (!guard.isAuthenticated || !guard.hasAdminRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="space-y-2 text-center">
          <p className="text-lg font-semibold">관리자 인증이 필요합니다.</p>
          <p className="text-sm text-slate-400">Authentik 로그인 화면으로 이동합니다…</p>
        </div>
      </div>
    );
  }

  if (!auth.hasAdminRole) {
    return <Navigate to="/" replace />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
};

export default AdminGate;
