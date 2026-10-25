import {
  LayoutDashboard,
  KanbanSquare,
  Dumbbell,
  ShoppingCart,
  Wallet,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type ModuleId =
  | "dashboard"
  | "kanban"
  | "treinos"
  | "compras"
  | "financas"
  | "configuracoes";

export interface AppModule {
  id: ModuleId;
  label: string;
  path: string;
  icon: LucideIcon;
  toggleable: boolean;
}

export const MODULES: AppModule[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, toggleable: true },
  { id: "kanban", label: "Kanban", path: "/kanban", icon: KanbanSquare, toggleable: true },
  { id: "treinos", label: "Treinos", path: "/treinos", icon: Dumbbell, toggleable: true },
  { id: "compras", label: "Compras", path: "/compras", icon: ShoppingCart, toggleable: true },
  { id: "financas", label: "Finanças", path: "/financas", icon: Wallet, toggleable: true },
  { id: "configuracoes", label: "Configurações", path: "/configuracoes", icon: Settings, toggleable: false },
];
