import { Check } from "lucide-react";

interface Props {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	label: string;
}

export default function Checkbox({
	checked,
	onChange,
	disabled,
	label,
}: Props) {
	return (
		<label className={disabled ? "cursor-not-allowed" : "cursor-pointer"}>
			<input
				type="checkbox"
				className="peer sr-only"
				checked={checked}
				disabled={disabled}
				aria-label={label}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<span
				className={[
					"flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
					"peer-focus-visible:ring-2 peer-focus-visible:ring-primary",
					"peer-disabled:opacity-50",
					checked
						? "border-primary bg-primary text-bg"
						: "border-border bg-surface",
				].join(" ")}
			>
				{checked && <Check size={16} strokeWidth={3} />}
			</span>
		</label>
	);
}
