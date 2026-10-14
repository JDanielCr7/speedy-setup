import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Calculator,
  Download,
  History,
  LayoutDashboard,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/registrar", label: "Registrar", icon: PlusCircle },
  { to: "/historial", label: "Historial", icon: History },
  { to: "/analisis", label: "Análisis", icon: BarChart3 },
  { to: "/simulador", label: "Simulador", icon: Calculator },
  { to: "/predicciones", label: "Predicciones", icon: Sparkles },
] as const;

function NavLink({
  to,
  label,
  icon: Icon,
  vertical,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  vertical?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);

  if (vertical) {
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

export function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 border-b border-border px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Download className="hidden" />
            <span className="text-lg font-black">MC</span>
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">MotoClean</p>
            <p className="text-xs text-muted-foreground">Analytics</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} {...item} vertical />
          ))}
        </nav>
        <p className="border-t border-border p-4 text-[11px] leading-snug text-muted-foreground">
          Demo frontend — datos almacenados localmente en este dispositivo.
        </p>
      </aside>

      {/* Header móvil */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-card/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
          MC
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">MotoClean Analytics</p>
          <p className="text-[11px] text-muted-foreground">
            Registro y análisis de operaciones
          </p>
        </div>
      </header>

      <main className="pb-24 md:pb-8 md:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
          {children ?? <Outlet />}
        </div>
      </main>

      {/* Navegación móvil inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card/95 backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} {...item} />
        ))}
      </nav>
    </div>
  );
}
