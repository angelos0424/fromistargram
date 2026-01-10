import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadSharedMedia, CLIENT_KEY } from '../../lib/api/client';

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
		setFiles(selectedFiles);

		// Create previews
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
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#7EC8FF] bg-gradient-to-br from-[#7EC8FF]/5 to-[#8CE8D0]/5 py-12 transition hover:border-[#8CE8D0] hover:from-[#7EC8FF]/10 hover:to-[#8CE8D0]/10 dark:border-brand-400/50 dark:from-brand-500/10 dark:to-brand-400/10 dark:hover:border-brand-400"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="mb-3 h-12 w-12 text-[#7EC8FF] dark:text-brand-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
									/>
								</svg>
								<p className="text-sm font-medium text-[#2D3748] dark:text-white">
									클릭하여 파일 선택
								</p>
								<p className="mt-1 text-xs text-[#7B8794] dark:text-slate-400">
									이미지 (최대 30MB) 또는 비디오 (최대 50MB)
								</p>
							</button>
						) : (
							<div className="space-y-3">
								<div className="grid grid-cols-3 gap-3">
									{previews.map((preview, index) => (
										<div key={index} className="group relative aspect-square overflow-hidden rounded-lg">
											{files[index].type.startsWith('image/') ? (
												<img
													src={preview}
													alt={`Preview ${index + 1}`}
													className="h-full w-full object-cover"
												/>
											) : (
												<video
													src={preview}
													className="h-full w-full object-cover"
												/>
											)}
											<button
												type="button"
												onClick={() => handleRemoveFile(index)}
												className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													className="h-4 w-4"
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
									))}
								</div>
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="w-full rounded-lg border border-[#7EC8FF] bg-white/50 px-3 py-2 text-sm font-medium text-[#2D3748] transition hover:bg-[#7EC8FF]/10 dark:border-brand-400 dark:bg-white/5 dark:text-white dark:hover:bg-brand-400/10"
								>
									파일 추가
								</button>
							</div>
						)}
					</div>

					<div>
						<label htmlFor="caption" className="mb-1 block text-sm font-medium text-[#2D3748] dark:text-white">
							본문 (선택사항)
						</label>
						<textarea
							id="caption"
							value={caption}
							onChange={(e) => setCaption(e.target.value)}
							placeholder="본문을 입력하세요..."
							rows={4}
							className="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-sm text-[#2D3748] outline-none transition focus:border-[#7EC8FF] focus:bg-white focus:shadow-[0_0_12px_rgba(126,200,255,0.3)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-brand-400 dark:focus:bg-white/10 dark:placeholder:text-slate-500"
						/>
					</div>

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
