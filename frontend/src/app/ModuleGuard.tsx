import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { MODULES, type ModuleId } from "@/lib/modules";
import { useModulesStore } from "@/hooks/useModules";

export default function ModuleGuard({ id, children }: { id: ModuleId; children: ReactNode }) {
  const mod = MODULES.find((m) => m.id === id)!;
  const enabled = useModulesStore((s) => s.enabled[id]);
  if (mod.toggleable && !enabled) return <Navigate to="/" replace />;
  return <>{children}</>;
}