import { FormEvent, useMemo, useState } from 'react';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import {
  useCreateAccount,
  useDeleteAccount,
  useRegisterSession,
  useUpdateAccount,
} from '../../hooks/admin/useCrawlAccounts';
import { useQuery } from '@tanstack/react-query';
import { ADMIN_KEY } from '../../lib/api/admin/types';
import { listAccount } from '../../lib/api/admin/accounts';

interface AccountFormState {
  username: string;
  note: string;
}

const initialAccountForm: AccountFormState = {
  username: '',
  note: ''
};

const AdminAccountsPage = () => {

  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const registerSession = useRegisterSession();
  const [form, setForm] = useState<AccountFormState>(initialAccountForm);
  const [sessionInput, setSessionInput] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const { data: accounts = [], isPending } = useQuery({
    queryFn: () => listAccount(),
    queryKey: [ADMIN_KEY, 'accounts']
  });


  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => a.username.localeCompare(b.username));
  }, [accounts]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.username.trim()) {
      return;
    }

    createAccount.mutate(form, {
      onSuccess: () => setForm(initialAccountForm)
    });
  };

  const handleStatusChange = (id: string, status: 'ready' | 'error' | 'disabled') => {
    updateAccount.mutate({ id, patch: { status } });
  };

  const handleSessionSubmit = (id: string, sessionId: string) => {
    if (!sessionId.trim()) {
      return;
    }

    registerSession.mutate({ id, sessionId }, {
      onSuccess: () =>
        setSessionInput((prev) => ({
          ...prev,
          [id]: ''
        }))
    });
  };

  const handleNoteSave = (id: string) => {
    const draft = noteDrafts[id];
    updateAccount.mutate({
      id,
      patch: {
        note: draft ?? ''
      }
    });
  };

  const resolveNoteDraft = (id: string, fallback?: string | null) => {
    const draft = noteDrafts[id];
    if (draft !== undefined) {
      return draft;
    }
    return fallback ?? '';
  };

  return (
    <div className="space-y-6">
      <AdminSectionCard
        title="로그인 계정 등록"
        description="instaloader 세션 생성을 위한 인증 계정을 관리합니다."
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Instagram 로그인 ID
            </span>
            <input
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-brand-400 focus:outline-none"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="crawler_main"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              비고
            </span>
            <input
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-brand-400 focus:outline-none"
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="2FA 토큰 위치 등"
            />
          </label>
          <div className="col-span-full">
            <button
              type="submit"
              className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-400"
              disabled={createAccount.isPending}
            >
              계정 추가
            </button>
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard
        title="등록된 로그인 계정"
        description="세션 갱신 및 상태 전환을 통해 크롤러 실행 계정을 유지합니다."
      >
        {isPending ? (
          <p className="text-sm text-slate-400">계정 정보를 불러오는 중입니다…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left">로그인 ID</th>
                  <th className="px-4 py-2 text-left">상태</th>
                  <th className="px-4 py-2 text-left">최근 세션 갱신</th>
                  <th className="px-4 py-2 text-left">비고</th>
                  <th className="px-4 py-2 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-slate-900/70">
                    <td className="px-4 py-3 font-mono text-slate-100">{account.username}</td>
                    <td className="px-4 py-3 text-slate-200">
                      <select
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                        value={account.status}
                        onChange={(event) =>
                          handleStatusChange(
                            account.id,
                            event.target.value as 'ready' | 'error' | 'disabled'
                          )
                        }
                      >
                        <option value="ready">정상</option>
                        <option value="error">오류</option>
                        <option value="disabled">비활성</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {account.lastSessionAt
                        ? new Date(account.lastSessionAt).toLocaleString()
                        : '기록 없음'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <textarea
                        className="h-16 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                        value={resolveNoteDraft(account.id, account.note)}
                        onChange={(event) =>
                          setNoteDrafts((prev) => ({
                            ...prev,
                            [account.id]: event.target.value
                          }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            className="w-40 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                            placeholder="sessionid=..."
                            value={sessionInput[account.id] ?? ''}
                            onChange={(event) =>
                              setSessionInput((prev) => ({
                                ...prev,
                                [account.id]: event.target.value
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="rounded border border-brand-400/80 px-3 py-1 text-xs text-brand-200 hover:border-brand-300"
                            onClick={() =>
                              handleSessionSubmit(account.id, sessionInput[account.id] ?? '')
                            }
                          >
                            세션 등록
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleNoteSave(account.id)}
                            className="rounded border border-slate-700 px-3 py-1 text-xs hover:border-slate-500"
                          >
                            비고 저장
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAccount.mutate(account.id)}
                            className="rounded border border-red-600/70 px-3 py-1 text-xs text-red-300 hover:border-red-500"
                          >
                            삭제
                          </button>
                        </div>
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

export default AdminAccountsPage;
