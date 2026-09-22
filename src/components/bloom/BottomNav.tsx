import { Link } from "@tanstack/react-router";
import { CalendarDays, HeartPulse, Home, Settings } from "lucide-react";

const ITEMS = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/calendario", label: "Calendário", icon: CalendarDays, exact: false },
  { to: "/app/humor", label: "Humor", icon: HeartPulse, exact: false },
  { to: "/app/ajustes", label: "Ajustes", icon: Settings, exact: false },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))]"
    >
      <ul className="mx-auto flex h-16 max-w-md items-center justify-between rounded-full border border-border bg-nav px-1.5 shadow-[var(--shadow-nav)]">
        {ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <Link
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="group flex min-h-12 items-center justify-center gap-2 rounded-full px-3 text-nav-foreground transition-colors data-[status=active]:bg-background data-[status=active]:text-foreground"
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span className="hidden text-xs font-semibold group-data-[status=active]:inline">
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
