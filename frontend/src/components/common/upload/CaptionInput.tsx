interface CaptionInputProps {
	value: string;
	onChange: (value: string) => void;
}

const CaptionInput = ({ value, onChange }: CaptionInputProps) => {
	return (
		<div>
			<label htmlFor="caption" className="mb-1 block text-sm font-medium text-[#2D3748] dark:text-white">
				본문 (선택사항)
			</label>
			<textarea
				id="caption"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="본문을 입력하세요..."
				rows={4}
				className="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-sm text-[#2D3748] outline-none transition focus:border-[#7EC8FF] focus:bg-white focus:shadow-[0_0_12px_rgba(126,200,255,0.3)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-brand-400 dark:focus:bg-white/10 dark:placeholder:text-slate-500"
			/>
		</div>
	);
};

export default CaptionInput;
