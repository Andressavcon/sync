import { createBrowserRouter, type RouteObject } from "react-router-dom";
import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import ModulePage from "@/components/ui/ModulePage";
import { MODULES, type ModuleId } from "@/lib/modules";
import ModuleGuard from "./ModuleGuard";
import HomeRedirect from "./HomeRedirect";
import SettingsPage from "@/features/settings/SettingsPage";
import ShoppingPage from "@/features/shopping/ShoppingPage";
import KanbanPage from "@/features/kanban/KanbanPage";
import WorkoutsPage from "@/features/workouts/WorkoutsPage";
import FinancePage from "@/features/finance/FinancePage";

const pages: Partial<Record<ModuleId, ReactNode>> = {
  settings: <SettingsPage />,
  shopping: <ShoppingPage />,
  kanban: <KanbanPage />,
  workouts: <WorkoutsPage />,
  finance: <FinancePage />,
};

const moduleRoutes: RouteObject[] = MODULES.map((m) => ({
  path: m.path,
  element: <ModuleGuard id={m.id}>{pages[m.id] ?? <ModulePage title={m.label} />}</ModuleGuard>,
}));

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [{ index: true, element: <HomeRedirect /> }, ...moduleRoutes],
  },
]);
