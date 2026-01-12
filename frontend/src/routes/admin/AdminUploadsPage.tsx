import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import { ADMIN_KEY } from '../../lib/api/admin/consts';
import { deleteSharedMedia, listSharedMedia, updateSharedMedia } from '../../lib/api/admin/sharedMedia';
import type { AdminSharedMedia } from '../../lib/api/admin/types';

const AdminUploadsPage = () => {
  const queryClient = useQueryClient();
  const [limit] = useState(50);

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

  return (
    <div className="space-y-6">
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
