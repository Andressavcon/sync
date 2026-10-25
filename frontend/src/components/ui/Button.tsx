import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-bg enabled:hover:bg-primary-hover disabled:bg-border disabled:text-muted",
  secondary:
    "bg-surface-hover text-text enabled:hover:bg-border disabled:text-muted",
  ghost:
    "text-muted enabled:hover:bg-surface-hover enabled:hover:text-text disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  md: "px-3 py-2 text-sm font-medium",
  icon: "p-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  );
}
