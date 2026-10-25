import type { ReactNode } from "react";

interface Props {
  title?: string;
  description?: string;
  children: ReactNode;
}

export default function Card({ title, description, children }: Props) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 lg:p-5">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}