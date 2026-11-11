import { Link, useLocation } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  BookHeart,
  CalendarDays,
  CircleDot,
  History,
  LibraryBig,
  Menu,
  Plus,
  Settings,
  Smile,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useBloomData";
import { todayISO } from "@/lib/format";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { BloomMark } from "./BloomLogo";
import { useLogSheet } from "./LogSheetContext";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { to: "/app", label: "Ciclo", icon: CircleDot, exact: true },
  { to: "/app/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/app/analise", label: "Análise", icon: BarChart3 },
];

export const SECONDARY_NAV: NavItem[] = [
  { to: "/app/historico", label: "Histórico", icon: History },
  { to: "/app/diario", label: "Diário", icon: BookHeart },
  { to: "/app/humor", label: "Humor", icon: Smile },
  { to: "/app/conteudo", label: "Conteúdo", icon: LibraryBig },
  { to: "/app/ajustes", label: "Ajustes", icon: Settings },
];

/**
 * Casca do app autenticado.
 * - Desktop/tablet (≥ 768px): barra lateral com todas as áreas e atalho de registro.
 * - Smartphone: barra inferior com ação central "Registrar" e menu "Mais".
 */
export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div className="min-h-dvh bg-background md:grid md:grid-cols-[248px_1fr] lg:grid-cols-[272px_1fr]">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-ink-foreground"
      >
        Pular para o conteúdo
      </a>
      <Sidebar />
      <main
        id="conteudo"
        className="min-w-0 px-4 pt-[max(18px,env(safe-area-inset-top))] pb-32 sm:px-6 md:px-8 md:pt-8 md:pb-12 lg:px-12"
      >
        <div key={location.pathname} className="mx-auto w-full max-w-6xl animate-page">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Sidebar() {
  const { openLog } = useLogSheet();
  const { user } = useAuth();
  const profile = useProfile();
  const name = profile.data?.display_name || user?.email?.split("@")[0] || "Você";
  return (
    <aside
      className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex"
      aria-label="Navegação lateral"
    >
      <Link to="/app" className="flex items-center gap-2.5 px-2 text-xl font-bold tracking-tight">
        <BloomMark animated className="size-9" /> Bloom
      </Link>
      <button
        type="button"
        onClick={() => {
          playSound("tap");
          openLog(todayISO());
        }}
        className="press mt-6 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-shadow hover:shadow-[var(--shadow-lift)]"
      >
        <Plus className="size-5" aria-hidden="true" /> Registrar hoje
      </button>
      <nav className="mt-6 flex-1 space-y-6" aria-label="Navegação principal">
        <NavList items={PRIMARY_NAV} />
        <div>
          <p className="eyebrow px-3 pb-2">Você</p>
          <NavList items={SECONDARY_NAV} />
        </div>
      </nav>
      <Link
        to="/app/ajustes"
        className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-sidebar-accent"
      >
        <span
          className="flex size-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-ink-foreground"
          aria-hidden="true"
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">Perfil e privacidade</span>
        </span>
      </Link>
    </aside>
  );
}

function NavList({ items }: { items: NavItem[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.to}>
          <Link
            to={item.to}
            activeOptions={{ exact: item.exact ?? false }}
            className="group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-semibold data-[status=active]:text-sidebar-accent-foreground"
          >
            <item.icon
              className="size-[18px] transition-transform group-hover:scale-110"
              aria-hidden="true"
            />
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BottomNav() {
  const { openLog } = useLogSheet();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const inSecondary = SECONDARY_NAV.some((i) => location.pathname.startsWith(i.to));
  const [first, second, third] = PRIMARY_NAV as [NavItem, NavItem, NavItem];

  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <ul className="mx-auto grid h-[72px] max-w-lg grid-cols-5 items-center border-t border-border bg-nav/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-nav)] backdrop-blur-xl">
        <BottomItem item={first} />
        <BottomItem item={second} />
        <li className="flex justify-center">
          <button
            type="button"
            aria-label="Registrar hoje"
            onClick={() => {
              playSound("tap");
              openLog(todayISO());
            }}
            className="press -mt-5 flex h-12 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            <Plus className="size-6" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </li>
        <BottomItem item={third} />
        <li>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className={cn(
              "flex min-h-12 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-nav-foreground transition-colors",
              inSecondary && "text-primary",
            )}
          >
            <Menu className="size-[22px]" aria-hidden="true" />
            Mais
          </button>
        </li>
      </ul>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[2rem] border-border px-4 pb-[max(20px,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Mais no Bloom</SheetTitle>
            <SheetDescription>Seu histórico, diário, conteúdos e ajustes.</SheetDescription>
          </SheetHeader>
          <ul className="mt-2 grid grid-cols-2 gap-2 stagger">
            {SECONDARY_NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="press flex min-h-20 flex-col justify-between rounded-2xl border border-border bg-card p-3 text-sm font-semibold data-[status=active]:border-primary data-[status=active]:text-primary"
                >
                  <item.icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

function BottomItem({ item }: { item: NavItem }) {
  return (
    <li>
      <Link
        to={item.to}
        activeOptions={{ exact: item.exact ?? false }}
        className="group flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] font-medium text-nav-foreground transition-colors data-[status=active]:text-primary"
      >
        <item.icon
          className="size-[22px] transition-transform group-data-[status=active]:scale-110"
          aria-hidden="true"
        />
        {item.label}
      </Link>
    </li>
  );
}
