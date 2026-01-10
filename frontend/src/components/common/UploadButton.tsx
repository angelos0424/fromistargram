import { useState } from 'react';

interface UploadButtonProps {
	onClick: () => void;
}

const UploadButton = ({ onClick }: UploadButtonProps) => {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<button
			type="button"
			onClick={onClick}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			className="group relative flex w-full items-center justify-center gap-2 rounded-xl border border-[#7EC8FF] bg-gradient-to-r from-[#7EC8FF] to-[#8CE8D0] px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(126,200,255,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(126,200,255,0.5)] dark:border-brand-400 dark:from-brand-500 dark:to-brand-400 dark:shadow-lg dark:shadow-brand-500/20 dark:hover:shadow-xl dark:hover:shadow-brand-500/30"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className={`h-5 w-5 transition-transform ${isHovered ? 'scale-110' : ''}`}
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
			<span>미디어 업로드</span>
		</button>
	);
};

export default UploadButton;
