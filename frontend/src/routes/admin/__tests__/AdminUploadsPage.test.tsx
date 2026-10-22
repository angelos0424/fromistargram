import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import AdminUploadsPage from '../AdminUploadsPage';
import { listAccount } from '../../../lib/api/client';
import { listSharedMedia } from '../../../lib/api/admin/sharedMedia';
import { uploadAdminMedia } from '../../../lib/api/admin/uploads';
import type { AdminSharedMedia } from '../../../lib/api/admin/types';
vi.mock('../../../lib/api/client', () => ({ listAccount: vi.fn() }));
vi.mock('../../../lib/api/admin/indexer', () => ({ fetchIndexerStatus: vi.fn().mockResolvedValue({ data: {} }), fetchUploadedReconcilerStatus: vi.fn().mockResolvedValue({ data: {} }), requestIndexerRun: vi.fn(), requestUploadedReconcilerRun: vi.fn() }));
vi.mock('../../../lib/api/admin/sharedMedia', () => ({ listSharedMedia: vi.fn(), deleteSharedMedia: vi.fn(), updateSharedMedia: vi.fn() }));
vi.mock('../../../lib/api/admin/uploads', () => ({ uploadAdminMedia: vi.fn() }));
const item = (id: number): AdminSharedMedia => ({ id: String(id), filename: `${id}.jpg`, originalName: `원본${id}.jpg`, mime: 'image/jpeg', size: 1024, width: null, height: null, duration: null, mediaUrl: `/image${id}.jpg`, thumbnailUrl: null, accountName: null, caption: null, uploadBatchId: null, isDeleted: false, uploadedAt: '2026-10-23T00:00:00Z' });
const renderUploads = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><AdminUploadsPage /></QueryClientProvider>);

describe('AdminUploadsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAccount).mockResolvedValue({ success: true, data: [{ id: 'account', latestProfilePicUrl: null, createdAt: '', updatedAt: '', lastIndexedAt: null, postCount: 0 }] });
    vi.mocked(listSharedMedia).mockImplementation(async ({ cursor }) => ({ success: true, data: cursor ? [item(51)] : Array.from({ length: 50 }, (_, index) => item(index + 1)), meta: { hasMore: !cursor, nextCursor: cursor ? null : '50' } }));
    vi.mocked(uploadAdminMedia).mockResolvedValue();
  });
  it('loads the 51st item using meta.nextCursor and stops after the last page', async () => {
    renderUploads();
    fireEvent.click(await screen.findByRole('button', { name: '더 보기' }));
    expect(await screen.findByText('원본51.jpg')).toBeInTheDocument();
    expect(listSharedMedia).toHaveBeenLastCalledWith({ cursor: '50', limit: 50 });
    expect(screen.queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument();
  });
  it('starts with the current timestamp and preserves input when the server reports a collision', async () => {
    const config = { headers: new AxiosHeaders() };
    vi.mocked(uploadAdminMedia).mockRejectedValueOnce(new AxiosError('Conflict', 'ERR_BAD_REQUEST', config, undefined, { data: { error: { message: '기존 원본과 다른 파일입니다.' } }, status: 409, statusText: 'Conflict', headers: {}, config }));
    const before = Date.now();
    renderUploads();
    const timestamp = screen.getByLabelText('게시일시 (ISO 8601)') as HTMLInputElement;
    expect(Date.parse(timestamp.value)).toBeGreaterThanOrEqual(before);
    const selectedTimestamp = timestamp.value;
    await waitFor(() => expect(screen.getByLabelText('계정 선택')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('계정 선택'), { target: { value: 'account' } });
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('파일 선택 (이미지/비디오)'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: '업로드' }));
    expect(await screen.findByText('기존 원본과 다른 파일입니다.')).toBeInTheDocument();
    expect(timestamp.value).toBe(selectedTimestamp);
    fireEvent.click(screen.getByRole('button', { name: '업로드' }));
    await screen.findByText('업로드가 완료되었습니다.');
    expect(Date.parse(timestamp.value)).toBeGreaterThanOrEqual(Date.parse(selectedTimestamp));
  });
});
