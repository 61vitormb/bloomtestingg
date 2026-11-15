import { Link } from "@tanstack/react-router";
import { CalendarDays, HeartPulse, Home, Settings } from "lucide-react";

const ITEMS = [
  { to: "/app", label: "Início", icon: Home, exact: true },
  { to: "/app/calendario", label: "Calendário", icon: CalendarDays, exact: false },
  { to: "/app/humor", label: "Humor", icon: HeartPulse, exact: false },
  { to: "/app/ajustes", label: "Configurações", icon: Settings, exact: false },
] as const;

export function BottomNav() {
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 px-6 pb-[max(14px,env(safe-area-inset-bottom))]">
      <ul className="mx-auto flex h-16 max-w-xs items-center justify-between rounded-full border border-white/70 bg-nav px-2 shadow-[var(--shadow-nav)] backdrop-blur-2xl backdrop-saturate-150">
        {ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <Link
              to={item.to}
              aria-label={item.label}
              activeOptions={{ exact: item.exact }}
              className="mx-auto flex size-12 items-center justify-center rounded-full text-nav-foreground transition-all duration-300 data-[status=active]:bg-white/80 data-[status=active]:text-primary data-[status=active]:shadow-[0_4px_12px_-4px_rgb(244_91_154/0.4)]"
            >
              <item.icon className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
