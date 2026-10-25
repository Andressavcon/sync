import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { createBrowserRouter, type RouteObject } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import ModulePage from "@/components/ui/ModulePage";
import { MODULES, type ModuleId } from "@/lib/modules";
import HomeRedirect from "./HomeRedirect";
import ModuleGuard from "./ModuleGuard";

// Each page is its own file, downloaded only when it is opened (smaller first load)
const pages: Partial<Record<ModuleId, LazyExoticComponent<ComponentType>>> = {
  dashboard: lazy(() => import("@/features/dashboard/DashboardPage")),
  kanban: lazy(() => import("@/features/kanban/KanbanPage")),
  workouts: lazy(() => import("@/features/workouts/WorkoutsPage")),
  shopping: lazy(() => import("@/features/shopping/ShoppingPage")),
  finance: lazy(() => import("@/features/finance/FinancePage")),
  settings: lazy(() => import("@/features/settings/SettingsPage")),
};

const loading = <p className="py-10 text-center text-muted">Carregando…</p>;

const moduleRoutes: RouteObject[] = MODULES.map((m) => {
  const Page = pages[m.id];
  return {
    path: m.path,
    element: (
      <ModuleGuard id={m.id}>
        {Page ? (
          <Suspense fallback={loading}>
            <Page />
          </Suspense>
        ) : (
          <ModulePage title={m.label} />
        )}
      </ModuleGuard>
    ),
  };
});

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [{ index: true, element: <HomeRedirect /> }, ...moduleRoutes],
  },
]);
