import { FormEvent, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import { ADMIN_KEY } from '../../lib/api/admin/consts';
import { listAccount } from '../../lib/api/client';
import { fetchIndexerStatus, requestIndexerRun } from '../../lib/api/admin/indexer';
import { deleteSharedMedia, listSharedMedia, updateSharedMedia } from '../../lib/api/admin/sharedMedia';
import { uploadAdminMedia } from '../../lib/api/admin/uploads';
import type { AdminSharedMedia } from '../../lib/api/admin/types';
import type { Account } from '../../lib/api/types';

const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

const parsePostedAt = (input: string) => {
  if (!DATETIME_REGEX.test(input)) {
    return null;
  }

  const [datePart, timePart] = input.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  const parsed = new Date(`${datePart}T${timePart}`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute ||
    parsed.getSeconds() !== second
  ) {
    return null;
  }

  return parsed;
};

const AdminUploadsPage = () => {
  const queryClient = useQueryClient();
  const [limit] = useState(50);
  const [accountId, setAccountId] = useState('');
  const [postedAt, setPostedAt] = useState('');
  const [caption, setCaption] = useState('');
  const [postType, setPostType] = useState<'Post' | 'Story'>('Post');
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const { data: accountsResponse, isPending: isAccountsPending } = useQuery({
    queryKey: [ADMIN_KEY, 'accounts'],
    queryFn: () => listAccount()
  });
  const accounts = accountsResponse?.data ?? [];

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a: Account, b: Account) =>
      (a.username ?? a.id).localeCompare(b.username ?? b.id)
    );
  }, [accounts]);

  const { data: indexerStatus } = useQuery({
    queryKey: [ADMIN_KEY, 'indexer'],
    queryFn: () => fetchIndexerStatus().then((res) => res.data)
  });

  const { mutate: runIndexerMutate, isPending: isIndexerRunPending } = useMutation({
    mutationKey: [ADMIN_KEY, 'indexer', 'run'],
    mutationFn: () => requestIndexerRun().then((res) => res.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'indexer'] });
      void queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'shared-media'] });
    }
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: [ADMIN_KEY, 'shared-media'],
      queryFn: ({ pageParam }: { pageParam?: string }) => listSharedMedia({ cursor: pageParam, limit }),
      getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined,
    });

  const mediaItems = data?.pages.flatMap((page: any) => page.data) ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, caption }: { id: string; caption: string }) =>
      updateSharedMedia({ id, patch: { caption } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'shared-media'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSharedMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'shared-media'] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: () =>
      uploadAdminMedia({
        accountId,
        postedAt,
        type: postType,
        caption: caption.trim() ? caption.trim() : undefined,
        files
      }),
    onSuccess: () => {
      setFormError(null);
      setFormSuccess('업로드가 완료되었습니다.');
      setPostedAt('');
      setCaption('');
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: [ADMIN_KEY, 'shared-media'] });
    },
    onError: (error: Error) => {
      setFormSuccess(null);
      setFormError(error.message || '업로드에 실패했습니다.');
    }
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');

  const startEdit = (item: AdminSharedMedia) => {
    setEditingId(item.id);
    setEditCaption(item.caption ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCaption('');
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({ id, caption: editCaption });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUploadSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!accountId) {
      setFormError('계정을 선택해 주세요.');
      return;
    }

    const parsedDate = parsePostedAt(postedAt);
    if (!parsedDate) {
      setFormError('게시일시는 yyyy-MM-dd hh:mm:ss 형식으로 입력해 주세요.');
      return;
    }

    if (files.length === 0) {
      setFormError('업로드할 파일을 선택해 주세요.');
      return;
    }

    uploadMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <AdminSectionCard
        title="인덱서"
        description="업로드된 미디어를 DB에 반영하기 위해 인덱서를 실행합니다."
        actions={
          <button
            type="button"
            onClick={() => runIndexerMutate()}
            className="rounded bg-brand-500/80 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-slate-600"
            disabled={isIndexerRunPending || indexerStatus?.running}
          >
            인덱서 실행
          </button>
        }
      >
        <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
          <div>
            <span className="text-xs uppercase tracking-wide text-slate-400">상태</span>
            <p className="mt-1 font-semibold text-slate-100">
              {indexerStatus?.status ?? '알 수 없음'}
              {indexerStatus?.running ? ' (실행 중)' : ''}
            </p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-slate-400">최근 실행</span>
            <p className="mt-1 text-slate-100">
              {indexerStatus?.lastFinishedAt
                ? new Date(indexerStatus.lastFinishedAt).toLocaleString()
                : '기록 없음'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">오류</span>
            <p className="mt-1 text-slate-100">
              {indexerStatus?.lastError ?? '없음'}
            </p>
          </div>
        </div>
      </AdminSectionCard>
      <AdminSectionCard
        title="수동 업로드"
        description="관리자가 직접 업로드할 콘텐츠를 등록합니다."
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              계정 선택
              <select
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-brand-400 focus:outline-none"
                disabled={isAccountsPending}
              >
                <option value="">계정을 선택하세요</option>
                {sortedAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.username ?? account.displayName ?? account.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              게시일시 (yyyy-MM-dd hh:mm:ss)
              <input
                type="text"
                value={postedAt}
                onChange={(event) => setPostedAt(event.target.value)}
                placeholder="2024-01-30 14:30:00"
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-brand-400 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              타입
              <select
                value={postType}
                onChange={(event) => setPostType(event.target.value as 'Post' | 'Story')}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-brand-400 focus:outline-none"
              >
                <option value="Post">Post</option>
                <option value="Story">Story</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              파일 선택 (이미지/비디오)
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files ?? []);
                  setFiles(selectedFiles);
                }}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 file:mr-4 file:rounded file:border-0 file:bg-slate-800 file:px-3 file:py-1 file:text-sm file:text-slate-200"
              />
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            본문
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={3}
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-brand-400 focus:outline-none"
              placeholder="캡션을 입력하세요."
            />
          </label>
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
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {uploadMutation.isPending ? '업로드 중...' : '업로드'}
            </button>
            {files.length > 0 && (
              <span className="text-xs text-slate-400">{files.length}개 파일 선택됨</span>
            )}
          </div>
        </form>
      </AdminSectionCard>
      <AdminSectionCard
        title="공유 미디어 관리"
        description="사용자가 업로드한 공유 미디어 파일을 관리합니다."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left">미디어</th>
                <th className="px-4 py-2 text-left">파일 정보</th>
                <th className="px-4 py-2 text-left">캡션</th>
                <th className="px-4 py-2 text-left">업로드 일시</th>
                <th className="px-4 py-2 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {status === 'pending' ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    불러오는 중...
                  </td>
                </tr>
              ) : mediaItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    업로드된 미디어가 없습니다.
                  </td>
                </tr>
              ) : (
                mediaItems.map((item: AdminSharedMedia) => (
                  <tr key={item.id} className="hover:bg-slate-900/70">
                    <td className="px-4 py-3">
                      <div className="h-16 w-16 overflow-hidden rounded bg-slate-800">
                        {item.thumbnailUrl || item.mediaUrl ? (
                          <img
                            src={item.thumbnailUrl || item.mediaUrl}
                            alt={item.originalName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                            No Img
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200">{item.originalName}</div>
                      <div className="text-xs text-slate-500">
                        {item.mime} • {(item.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editCaption}
                            onChange={(e) => setEditCaption(e.target.value)}
                            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 focus:border-brand-400 focus:outline-none"
                            placeholder="캡션 입력..."
                          />
                          <button
                            onClick={() => saveEdit(item.id)}
                            className="whitespace-nowrap rounded bg-brand-600 px-2 py-1 text-xs text-white hover:bg-brand-500"
                          >
                            저장
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="whitespace-nowrap rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300">{item.caption || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(item.uploadedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {editingId !== item.id && (
                          <button
                            onClick={() => startEdit(item)}
                            className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-500"
                          >
                            수정
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded border border-red-600/60 px-3 py-1 text-xs text-red-300 hover:border-red-500"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {hasNextPage && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                {isFetchingNextPage ? '로딩 중...' : '더 보기'}
              </button>
            </div>
          )}
        </div>
      </AdminSectionCard>
    </div>
  );
};

export default AdminUploadsPage;
