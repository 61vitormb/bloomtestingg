import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayLogSheet } from "@/components/bloom/DayLogSheet";
import { PHASE_INFO } from "@/domain/catalog";
import { addDays, buildCycleOverview, diffInDays, type CycleRecord } from "@/domain/cycle";
import { formatShort, todayISO } from "@/lib/format";
import { useCycles, useDailyLogs, useMoodLogs, usePreferences } from "@/hooks/useBloomData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Home — Bloom" },
      { name: "description", content: "Resumo do seu ciclo e registro rápido do dia." },
      { property: "og:title", content: "Home — Bloom" },
      { property: "og:description", content: "Resumo do ciclo e registro rápido do dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HomeScreen,
});

function HomeScreen() {
  const navigate = useNavigate();
  const today = todayISO();
  const preferences = usePreferences();
  const cycles = useCycles();
  const dailyLogs = useDailyLogs();
  const moodLogs = useMoodLogs();
  const [sheetDate, setSheetDate] = useState<string | null>(null);

  useEffect(() => {
    if (preferences.data?.onboarding_completed === false) navigate({ to: "/onboarding", replace: true });
  }, [preferences.data, navigate]);

  const cycleRecords: CycleRecord[] = useMemo(
    () => (cycles.data ?? []).map(({ id, start_date, end_date }) => ({ id, start_date, end_date })),
    [cycles.data],
  );
  const overview = useMemo(
    () => buildCycleOverview(cycleRecords, today, {
      cycleLength: preferences.data?.average_cycle_length ?? null,
      periodLength: preferences.data?.average_period_length ?? null,
    }),
    [cycleRecords, today, preferences.data],
  );
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(today, index - 3)), [today]);
  const phase = overview.phase ? PHASE_INFO[overview.phase] : null;
  const todayLog = dailyLogs.data?.find((log) => log.log_date === today);
  const todayMood = moodLogs.data?.find((log) => log.log_date === today);
  const hasTodayData = Boolean(todayLog || todayMood);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex items-center justify-between py-1">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Seu ciclo</p>
          <h1 className="text-3xl font-bold text-neon">Bloom</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Hoje</p>
          <p className="font-semibold capitalize">{formatShort(today)}</p>
        </div>
      </header>

      <section aria-label="Resumo do ciclo" className="mt-3 grid grid-cols-[1fr_auto] items-center gap-4 border-y border-border py-4">
        <div>
          <p className="text-sm text-muted-foreground">Fase estimada</p>
          <h2 className="mt-1 text-2xl font-bold">{phase?.label ?? "Comece seu ciclo"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {overview.nextPeriod
              ? `Próxima menstruação em ${diffInDays(today, overview.nextPeriod.date)} dias`
              : "Adicione sua última menstruação"}
          </p>
        </div>
        <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-full border-[7px] border-foreground text-center">
          <span className="text-2xl font-bold">{overview.dayOfCycle ?? "—"}</span>
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">dia</span>
        </div>
      </section>

      <section aria-labelledby="week-title" className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="week-title" className="text-sm font-bold">Esta semana</h2>
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <ul className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => {
            const active = day === today;
            const hasData = dailyLogs.data?.some((log) => log.log_date === day) || moodLogs.data?.some((log) => log.log_date === day);
            return (
              <li key={day}>
                <Button
                  type="button"
                  variant={active ? "default" : "outline"}
                  aria-label={`Registrar ${formatShort(day)}`}
                  onClick={() => setSheetDate(day)}
                  className={cn("h-16 w-full flex-col gap-0 rounded-2xl px-0 shadow-none", active && "border-foreground")}
                >
                  <span className="text-[10px] uppercase opacity-70">{formatShort(day).split(" ")[0]}</span>
                  <span className="text-base font-bold">{Number(day.slice(-2))}</span>
                  <span className={cn("mt-0.5 size-1 rounded-full", hasData ? "bg-neon" : "bg-transparent")} aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-4 flex min-h-0 flex-1 flex-col justify-center" aria-label="Registro rápido">
        <div className="rounded-2xl bg-secondary p-4 text-center">
          <p className="text-sm font-semibold">{hasTodayData ? "Hoje já tem registros" : "Como foi seu dia?"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Fluxo, sintomas, humor e observações em um só lugar.</p>
          <Button
            size="icon"
            className="mx-auto mt-4 size-16 rounded-full shadow-[var(--shadow-nav)]"
            onClick={() => setSheetDate(today)}
            aria-label={hasTodayData ? "Editar informações de hoje" : "Adicionar informações de hoje"}
          >
            <Plus className="size-7" aria-hidden="true" />
          </Button>
          <p className="mt-2 text-xs font-semibold">{hasTodayData ? "Editar hoje" : "Adicionar hoje"}</p>
        </div>
      </section>

      <p className="pb-1 text-center text-[10px] leading-tight text-muted-foreground">
        Previsões são estimativas e não substituem orientação de saúde.
      </p>
      <DayLogSheet date={sheetDate} open={sheetDate !== null} onOpenChange={(open) => setSheetDate(open ? sheetDate : null)} />
    </div>
  );
}