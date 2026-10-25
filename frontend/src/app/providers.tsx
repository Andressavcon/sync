import type { ReactNode } from "react";

// Ponto único para providers globais (ex.: contexto de usuário, depois do login).
export default function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
