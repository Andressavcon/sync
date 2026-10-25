import type { ReactNode } from "react";

interface Props {
  title?: string;
  description?: string;
  children: ReactNode;
}

/** Glass panel. */
export default function Card({ title, description, children }: Props) {
  return (
    <section className="glass rounded-3xl p-5 lg:p-6">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
