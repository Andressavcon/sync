import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-bg shadow-glow enabled:hover:bg-primary-hover disabled:bg-surface disabled:text-muted disabled:shadow-none",
  secondary:
    "bg-surface-hover text-text border border-border enabled:hover:bg-white/20 disabled:text-muted",
  ghost:
    "text-muted enabled:hover:bg-surface-hover enabled:hover:text-text disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  md: "px-4 py-2 text-sm font-medium",
  icon: "p-2",
};

/** Pill buttons ("liquid glass" style). */
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
      className={`inline-flex items-center justify-center gap-2 rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/70 enabled:active:scale-[0.97] disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  );
}
