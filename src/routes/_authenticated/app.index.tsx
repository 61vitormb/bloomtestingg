import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { DayLogSheet } from "@/components/bloom/DayLogSheet";
import { PHASE_INFO, moodLabel } from "@/domain/catalog";
import {
  addDays,
  buildCycleOverview,
  diffInDays,
  estimatedFertileWindow,
  parseISODate,
  type CycleRecord,
} from "@/domain/cycle";
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

const WEEK_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

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
  const declared = {
    cycleLength: preferences.data?.average_cycle_length ?? null,
    periodLength: preferences.data?.average_period_length ?? null,
  };
  const overview = useMemo(
    () => buildCycleOverview(cycleRecords, today, declared),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycleRecords, today, preferences.data],
  );
  const fertile = useMemo(
    () => estimatedFertileWindow(cycleRecords, declared.cycleLength),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycleRecords, preferences.data],
  );

  const weekStart = addDays(today, -parseISODate(today).getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const phase = overview.phase ? PHASE_INFO[overview.phase] : null;
  const todayMood = moodLogs.data?.find((log) => log.log_date === today);
  const hasTodayData = Boolean(dailyLogs.data?.some((l) => l.log_date === today) || todayMood);

  const inPeriod = overview.phase === "menstrual";
  const daysUntil = overview.daysUntilNextPeriod;
  const ringRatio =
    overview.dayOfCycle === null
      ? 0
      : Math.min(1, Math.max(0.03, overview.dayOfCycle / Math.max(overview.cycleLength.value, 1)));

  let bigNumber = "—";
  let ringLabel = "Registre sua menstruação";
  if (inPeriod && overview.dayOfCycle !== null) {
    bigNumber = String(overview.dayOfCycle);
    ringLabel = "Menstruação · dia";
  } else if (daysUntil !== null && daysUntil >= 0) {
    bigNumber = String(daysUntil);
    ringLabel = daysUntil === 1 ? "dia para a próxima menstruação" : "dias para a próxima menstruação";
  } else if (overview.dayOfCycle !== null) {
    bigNumber = String(overview.dayOfCycle);
    ringLabel = "Dia do ciclo";
  }

  const fertileLabel = !fertile
    ? "—"
    : diffInDays(today, fertile.end) < 0
      ? "Passou"
      : formatShort(fertile.start);

  const size = 200;
  const r = 92;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <h1 className="sr-only">Home</h1>

      <section aria-label="Esta semana" className="pt-1">
        <ul className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day, i) => {
            const active = day === today;
            const hasData =
              dailyLogs.data?.some((l) => l.log_date === day) || moodLogs.data?.some((l) => l.log_date === day);
            return (
              <li key={day}>
                <button
                  type="button"
                  aria-label={`Registrar ${formatShort(day)}`}
                  aria-current={active ? "date" : undefined}
                  onClick={() => setSheetDate(day)}
                  className={cn(
                    "press flex h-16 w-full flex-col items-center justify-center rounded-2xl border bg-secondary transition-colors",
                    active ? "border-2 border-neon bg-background" : "border-transparent",
                  )}
                >
                  <span className="text-[11px] font-medium text-muted-foreground">{WEEK_LETTERS[i]}</span>
                  <span className="text-base font-bold">{Number(day.slice(-2))}</span>
                  <span className={cn("mt-0.5 size-1.5 rounded-full", hasData ? "bg-neon" : "bg-transparent")} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Status do ciclo" className="flex min-h-0 flex-1 items-center justify-center py-3">
        <div
          role="img"
          aria-label={`${bigNumber} ${ringLabel}${phase ? `. Fase estimada ${phase.label}` : ""}`}
          className="relative aspect-square h-full max-h-[260px] max-w-full"
        >
          <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--neon)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - ringRatio)}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
            <span className="text-6xl leading-none font-bold">{bigNumber}</span>
            <span className="mt-2 text-sm text-muted-foreground">{ringLabel}</span>
          </div>
        </div>
      </section>

      <ul aria-label="Resumo rápido" className="grid grid-cols-3 gap-2">
        <SummaryChip label="Humor" value={todayMood?.moods[0] ? moodLabel(todayMood.moods[0]) : "—"} />
        <SummaryChip label="Fase" value={phase?.label ?? "—"} />
        <SummaryChip label="Janela fértil" value={fertileLabel} />
      </ul>

      <div className="flex flex-col items-center py-4">
        <button
          type="button"
          onClick={() => setSheetDate(today)}
          aria-label={hasTodayData ? "Editar informações de hoje" : "Adicionar informações de hoje"}
          className="press flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-neon/30 transition-transform"
        >
          <Plus className="size-7" aria-hidden="true" />
        </button>
        <span className="mt-1.5 text-xs font-medium">{hasTodayData ? "Editar hoje" : "Adicionar"}</span>
      </div>

      <p className="pb-1 text-center text-[10px] leading-tight text-muted-foreground">
        Previsões são estimativas e não substituem orientação de saúde.
      </p>
      <DayLogSheet date={sheetDate} open={sheetDate !== null} onOpenChange={(open) => setSheetDate(open ? sheetDate : null)} />
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex min-h-14 flex-col items-center justify-center rounded-full bg-secondary px-2 text-center">
      <span className="text-[10px] font-medium text-muted-foreground uppercase">{label}</span>
      <span className="truncate text-sm font-bold capitalize">{value}</span>
    </li>
  );
}
