import { createBrowserRouter, type RouteObject } from "react-router-dom";
import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import ModulePage from "@/components/ui/ModulePage";
import { MODULES, type ModuleId } from "@/lib/modules";
import ModuleGuard from "./ModuleGuard";
import HomeRedirect from "./HomeRedirect";
import ConfiguracoesPage from "@/features/configuracoes/ConfiguracoesPage";
import ComprasPage from "@/features/compras/ComprasPage";
import KanbanPage from "@/features/kanban/KanbanPage";
import TreinosPage from "@/features/treinos/TreinosPage";
import FinancasPage from "@/features/financas/FinancasPage";

const pages: Partial<Record<ModuleId, ReactNode>> = {
	configuracoes: <ConfiguracoesPage />,
	compras: <ComprasPage />,
	kanban: <KanbanPage />,
	treinos: <TreinosPage />,
	financas: <FinancasPage />,
};

const moduleRoutes: RouteObject[] = MODULES.map((m) => ({
	path: m.path,
	element: (
		<ModuleGuard id={m.id}>
			{pages[m.id] ?? <ModulePage title={m.label} />}
		</ModuleGuard>
	),
}));

export const router = createBrowserRouter([
	{
		element: <AppShell />,
		children: [{ index: true, element: <HomeRedirect /> }, ...moduleRoutes],
	},
]);
