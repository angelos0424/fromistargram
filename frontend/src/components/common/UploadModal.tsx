import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadSharedMedia, CLIENT_KEY } from '../../lib/api/client';
import FileDropZone from './upload/FileDropZone';
import PreviewGrid from './upload/PreviewGrid';
import CaptionInput from './upload/CaptionInput';

interface UploadModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
}

const UploadModal = ({ isOpen, onClose, onSuccess }: UploadModalProps) => {
	const [files, setFiles] = useState<File[]>([]);
	const [caption, setCaption] = useState('');
	const [previews, setPreviews] = useState<string[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();

	// Cleanup object URLs when component unmounts or previews change
	useEffect(() => {
		// Cleanup function that runs when previews change or component unmounts
		return () => {
			previews.forEach((url) => URL.revokeObjectURL(url));
		};
	}, [previews]);

	const uploadMutation = useMutation({
		mutationFn: () => uploadSharedMedia(files, caption || undefined),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [CLIENT_KEY, 'sharedMedia'] });
			setFiles([]);
			setCaption('');
			setPreviews([]);
			onSuccess?.();
			onClose();
		},
		onError: (error: any) => {
			alert(error?.response?.data?.message || '업로드에 실패했습니다.');
		}
	});

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(e.target.files || []);

		// Revoke old preview URLs before creating new ones
		previews.forEach((url) => URL.revokeObjectURL(url));

		setFiles(selectedFiles);

		// Create new previews
		const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
		setPreviews(newPreviews);
	};

	const handleRemoveFile = (index: number) => {
		const newFiles = files.filter((_, i) => i !== index);
		const newPreviews = previews.filter((_, i) => i !== index);

		URL.revokeObjectURL(previews[index]);
		setFiles(newFiles);
		setPreviews(newPreviews);
	};

	const handleClose = () => {
		if (!uploadMutation.isPending) {
			previews.forEach((preview) => URL.revokeObjectURL(preview));
			setFiles([]);
			setCaption('');
			setPreviews([]);
			onClose();
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (files.length > 0) {
			uploadMutation.mutate();
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={handleClose}
		>
			<div
				className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-2xl font-bold text-[#2D3748] dark:text-white">
						미디어 업로드
					</h2>
					<button
						type="button"
						onClick={handleClose}
						disabled={uploadMutation.isPending}
						className="rounded-full p-1 text-[#7B8794] transition hover:bg-black/5 hover:text-[#2D3748] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<input
							ref={fileInputRef}
							type="file"
							multiple
							accept="image/*,video/*"
							onChange={handleFileChange}
							className="hidden"
						/>

						{files.length === 0 ? (
							<FileDropZone onSelect={() => fileInputRef.current?.click()} />
						) : (
							<PreviewGrid
								files={files}
								previews={previews}
								onRemove={handleRemoveFile}
								onAddMore={() => fileInputRef.current?.click()}
							/>
						)}
					</div>

					<CaptionInput value={caption} onChange={setCaption} />

					<div className="flex gap-3">
						<button
							type="button"
							onClick={handleClose}
							disabled={uploadMutation.isPending}
							className="flex-1 rounded-xl border border-white/60 bg-white px-4 py-3 text-sm font-semibold text-[#7B8794] transition hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
						>
							취소
						</button>
						<button
							type="submit"
							disabled={files.length === 0 || uploadMutation.isPending}
							className="flex-1 rounded-xl border border-[#7EC8FF] bg-gradient-to-r from-[#7EC8FF] to-[#8CE8D0] px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(126,200,255,0.35)] transition hover:shadow-[0_6px_24px_rgba(126,200,255,0.5)] disabled:opacity-50 disabled:hover:shadow-[0_4px_16px_rgba(126,200,255,0.35)] dark:border-brand-400 dark:from-brand-500 dark:to-brand-400"
						>
							{uploadMutation.isPending ? '업로드 중...' : '업로드'}
						</button>
					</div>
				</form>

				{uploadMutation.isPending && (
					<div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20 backdrop-blur-sm">
						<div className="flex flex-col items-center gap-3">
							<div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
							<p className="text-sm font-medium text-white">업로드 중...</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default UploadModal;
