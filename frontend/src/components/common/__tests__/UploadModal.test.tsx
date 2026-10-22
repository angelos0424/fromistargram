import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UploadModal from '../UploadModal';
import { uploadSharedMedia } from '../../../lib/api/client';
vi.mock('../../../lib/api/client', () => ({ CLIENT_KEY: 'client', uploadSharedMedia: vi.fn() }));

describe('UploadModal', () => {
  beforeEach(() => {
    vi.mocked(uploadSharedMedia).mockResolvedValue({ success: true, data: [] });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn((file: File) => `blob:${file.name}`) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });
  it('appends files, ignores duplicate selections/cancel, and revokes only removed previews', async () => {
    const onClose = vi.fn();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><UploadModal isOpen onClose={onClose} /></QueryClientProvider>);
    const input = screen.getByLabelText('업로드할 파일');
    const first = new File(['first'], 'A.jpg', { type: 'image/jpeg', lastModified: 10 });
    const second = new File(['second'], 'B.jpg', { type: 'image/jpeg', lastModified: 20 });
    fireEvent.change(input, { target: { files: [first] } });
    fireEvent.change(input, { target: { files: [second] } });
    fireEvent.change(input, { target: { files: [first] } });
    fireEvent.change(input, { target: { files: [] } });
    expect(screen.getByAltText('A.jpg')).toHaveAttribute('src', 'blob:A.jpg');
    expect(screen.getByAltText('B.jpg')).toHaveAttribute('src', 'blob:B.jpg');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'B.jpg 삭제' }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:B.jpg');
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:A.jpg');
    expect(screen.getByRole('button', { name: 'A.jpg 삭제' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '업로드' }));
    await waitFor(() => expect(uploadSharedMedia).toHaveBeenCalledWith([first], undefined, undefined));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:A.jpg');
  });
});
