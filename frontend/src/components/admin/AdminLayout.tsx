import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../lib/auth/context';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: '/admin', label: '대시보드', end: true },
  { to: '/admin/targets', label: '크롤링 대상' },
  { to: '/admin/accounts', label: '로그인 계정' },
  { to: '/admin/runs', label: '실행 이력' },
  { to: '/admin/db', label: 'DB 내용' }
];

interface AdminLayoutProps {
  children?: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { idToken, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/75 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-brand-300">Fromistargram Admin</h1>
            <p className="text-sm text-slate-400">
              Authentik 연동된 운영자 전용 제어판
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{idToken?.name ?? idToken?.username ?? '관리자'}</p>
            <p className="text-xs text-slate-400">{idToken?.email ?? 'no-email@fromistargram'}</p>
            <button
              type="button"
              onClick={logout}
              className="mt-2 rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-brand-400 hover:text-brand-200"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-6">
        <nav className="w-56 flex-shrink-0">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'block rounded-md px-3 py-2 text-sm font-medium transition',
                      isActive
                        ? 'bg-brand-500/20 text-brand-200 shadow'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 space-y-6 pb-12">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
