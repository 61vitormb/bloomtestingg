import { Link } from "@tanstack/react-router";
import { CalendarDays, Flower2, Home, Settings } from "lucide-react";

const ITEMS = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/calendario", label: "Calendário", icon: CalendarDays, exact: false },
  { to: "/app/humor", label: "Humor", icon: Flower2, exact: false },
  { to: "/app/ajustes", label: "Ajustes", icon: Settings, exact: false },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <Link
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="group flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-muted-foreground transition-colors data-[status=active]:text-primary"
            >
              <span className="flex h-8 w-12 items-center justify-center rounded-full transition-colors group-data-[status=active]:bg-secondary">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xs font-medium group-data-[status=active]:font-semibold">
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
