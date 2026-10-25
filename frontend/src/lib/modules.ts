import {
  LayoutDashboard,
  KanbanSquare,
  Dumbbell,
  ShoppingCart,
  Wallet,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type ModuleId = "dashboard" | "kanban" | "workouts" | "shopping" | "finance" | "settings";

export interface AppModule {
  id: ModuleId;
  label: string;
  /** URL in Portuguese: it is part of what the user sees */
  path: string;
  icon: LucideIcon;
  toggleable: boolean;
}

export const MODULES: AppModule[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, toggleable: true },
  { id: "kanban", label: "Kanban", path: "/kanban", icon: KanbanSquare, toggleable: true },
  { id: "workouts", label: "Treinos", path: "/treinos", icon: Dumbbell, toggleable: true },
  { id: "shopping", label: "Compras", path: "/compras", icon: ShoppingCart, toggleable: true },
  { id: "finance", label: "Finanças", path: "/financas", icon: Wallet, toggleable: true },
  { id: "settings", label: "Configurações", path: "/configuracoes", icon: Settings, toggleable: false },
];
