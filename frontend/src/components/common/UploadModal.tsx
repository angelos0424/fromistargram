import { useState, useRef, useEffect } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadSharedMedia, CLIENT_KEY } from '../../lib/api/client';
import FileDropZone from './upload/FileDropZone';
import PreviewGrid from './upload/PreviewGrid';
import CaptionInput from './upload/CaptionInput';
import Dialog from './Dialog';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
interface Selection { file: File; preview: string }
const fileKey = (file: File) => JSON.stringify([file.name, file.size, file.type, file.lastModified]);

const UploadModal = ({ isOpen, onClose, onSuccess }: UploadModalProps) => {
  const [selection, setSelection] = useState<Selection[]>([]);
  const selectionRef = useRef<Selection[]>([]);
  const [accountName, setAccountName] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const replaceSelection = (next: Selection[]) => {
    selectionRef.current = next;
    setSelection(next);
  };
  const resetForm = () => {
    selectionRef.current.forEach(({ preview }) => URL.revokeObjectURL(preview));
    replaceSelection([]);
    setAccountName('');
    setCaption('');
    setError(null);
  };
  useEffect(() => () => {
    selectionRef.current.forEach(({ preview }) => URL.revokeObjectURL(preview));
  }, []);
  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  const uploadMutation = useMutation({
    mutationFn: () => uploadSharedMedia(selection.map(({ file }) => file), caption || undefined, accountName || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CLIENT_KEY, 'sharedMedia'] });
      resetForm();
      onSuccess?.();
      onClose();
    },
    onError: (cause: unknown) => {
      setError(isAxiosError(cause) ? cause.response?.data?.error?.message ?? '업로드에 실패했습니다.' : '업로드에 실패했습니다.');
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const knownFiles = new Set(selectionRef.current.map(({ file }) => fileKey(file)));
    const additions: File[] = [];
    for (const file of selectedFiles) {
      const key = fileKey(file);
      if (knownFiles.has(key)) continue;
      knownFiles.add(key);
      additions.push(file);
    }
    event.target.value = '';
    if (!additions.length) return;
    const combined = [...selectionRef.current.map(({ file }) => file), ...additions];
    if (combined.length > 10 || combined.reduce((total, file) => total + file.size, 0) > 200 * 1024 * 1024) {
      setError('한 번에 최대 10개, 파일 용량 합계 200MB까지 선택할 수 있습니다.');
      return;
    }
    if (additions.some((file) => file.type.startsWith('image/') && file.size > 30 * 1024 * 1024)) {
      setError('이미지는 파일당 30MB까지 선택할 수 있습니다.');
      return;
    }
    setError(null);
    replaceSelection([...selectionRef.current, ...additions.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  };
  const handleRemoveFile = (index: number) => {
    URL.revokeObjectURL(selectionRef.current[index].preview);
    replaceSelection(selectionRef.current.filter((_, i) => i !== index));
  };
  const handleClose = () => {
    if (uploadMutation.isPending) return;
    resetForm();
    onClose();
  };
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selection.length > 0 && !uploadMutation.isPending) {
      setError(null);
      uploadMutation.mutate();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} labelledBy="upload-dialog-title">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
        <h2 id="upload-dialog-title" className="text-xl font-bold text-[#2D3748] dark:text-white">미디어 업로드</h2>
        <button type="button" onClick={handleClose} disabled={uploadMutation.isPending} aria-label="미디어 업로드 닫기" className="ui-button min-h-11 min-w-11 text-2xl dark:text-white">×</button>
      </header>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col" aria-busy={uploadMutation.isPending}>
        <div className="min-h-0 overflow-y-auto p-4">
        <fieldset disabled={uploadMutation.isPending} className="min-w-0 space-y-4">
          <div>
            <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm" onChange={handleFileChange} aria-label="업로드할 파일" className="hidden" />
            {selection.length === 0 ? <FileDropZone onSelect={() => fileInputRef.current?.click()} /> : (
              <PreviewGrid files={selection.map(({ file }) => file)} previews={selection.map(({ preview }) => preview)} onRemove={handleRemoveFile} onAddMore={() => fileInputRef.current?.click()} />
            )}
          </div>
          <div>
            <label htmlFor="accountName" className="mb-1 block text-sm font-medium text-[#2D3748] dark:text-white">계정명 (선택사항)</label>
            <input id="accountName" type="text" value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="계정명을 입력하세요..." className="ui-input w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-[#2D3748] dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
          </div>
          <CaptionInput value={caption} onChange={setCaption} />
          {error && <p role="alert" className="ui-error">{error}</p>}
        </fieldset>
        </div>
        <footer className="flex shrink-0 gap-3 border-t border-slate-200 p-4 dark:border-slate-700">
          <button type="button" onClick={handleClose} disabled={uploadMutation.isPending} className="ui-button flex-1 border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-[#2D3748] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">취소</button>
          <button type="submit" disabled={selection.length === 0 || uploadMutation.isPending} className="ui-button ui-pastel-action flex-1 px-4 py-3 text-sm font-semibold">{uploadMutation.isPending ? '업로드 중...' : '업로드'}</button>
        </footer>
      </form>
    </Dialog>
  );
};

export default UploadModal;
