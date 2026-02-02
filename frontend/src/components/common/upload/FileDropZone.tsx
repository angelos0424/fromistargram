interface FileDropZoneProps {
	onSelect: () => void;
}

const FileDropZone = ({ onSelect }: FileDropZoneProps) => {
	return (
		<button
			type="button"
			onClick={onSelect}
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
	);
};

export default FileDropZone;
