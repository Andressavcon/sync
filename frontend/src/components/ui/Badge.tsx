import type { ReactNode } from "react";

type Variant = "neutral" | "primary";

const estilos: Record<Variant, string> = {
  neutral: "bg-surface-hover text-muted",
  primary: "bg-primary/15 text-primary",
};

export default function Badge({
  variant = "neutral",
  children,
}: {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estilos[variant]}`}
    >
      {children}
    </span>
  );
}
