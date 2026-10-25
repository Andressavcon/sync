// Placeholder temporário: cada módulo troca isto pela sua própria página.
export default function ModulePage({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">Em construção.</p>
    </section>
  );
}
