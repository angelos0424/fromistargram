import { Outlet } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../lib/auth/context';

const AdminGate = () => {
  const auth = useAuth();

  // 로딩 중
  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="space-y-3 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          <p className="text-sm">Authentik 인증 정보를 확인 중입니다…</p>
        </div>
      </div>
    );
  }

  // 미인증 시 로그인 버튼 표시 (자동 리다이렉트 대신)
  if (!auth.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="space-y-4 text-center">
          <p className="text-lg font-semibold">관리자 인증이 필요합니다.</p>
          {auth.error && (
            <p className="text-sm text-red-400">{auth.error}</p>
          )}
          <button
            onClick={() => auth.login()}
            className="rounded-lg bg-brand-500 px-6 py-2 text-white hover:bg-brand-600"
          >
            Authentik으로 로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
};

export default AdminGate;
