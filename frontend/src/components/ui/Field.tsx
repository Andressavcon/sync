import type { ReactNode } from "react";

/** Rótulo + campo (+ dica) de formulário. */
export default function Field({
  rotulo,
  dica,
  children,
}: {
  rotulo: string;
  dica?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{rotulo}</span>
      {children}
      {dica && <span className="text-xs text-muted">{dica}</span>}
    </label>
  );
}
