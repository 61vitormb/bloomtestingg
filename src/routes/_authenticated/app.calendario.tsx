import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Droplet, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayLogSheet } from "@/components/bloom/DayLogSheet";
import { flowLabel, moodLabel, symptomLabel } from "@/domain/catalog";
import { predictedPeriodDays, toISODate, type CycleRecord } from "@/domain/cycle";
import { formatMonthYear, formatWeekdayLong, todayISO } from "@/lib/format";
import { useCycles, useDailyLogs, useMoodLogs, usePreferences } from "@/hooks/useBloomData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — Bloom" },
      {
        name: "description",
        content: "Calendário menstrual com sintomas, humor e datas estimadas.",
      },
      { property: "og:title", content: "Calendário — Bloom" },
      { property: "og:description", content: "Registre e consulte cada dia do seu ciclo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarScreen,
});

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function buildMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leading = first.getUTCDay();
  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toISODate(new Date(Date.UTC(year, month, day))));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function CalendarScreen() {
  const today = todayISO();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const cycles = useCycles();
  const dailyLogs = useDailyLogs();
  const moodLogs = useMoodLogs();
  const preferences = usePreferences();

  const cycleRecords: CycleRecord[] = useMemo(
    () =>
      (cycles.data ?? []).map((c) => ({
        id: c.id,
        start_date: c.start_date,
        end_date: c.end_date,
      })),
    [cycles.data],
  );

  const predicted = useMemo(
    () =>
      new Set(
        predictedPeriodDays(cycleRecords, {
          cycleLength: preferences.data?.average_cycle_length ?? null,
          periodLength: preferences.data?.average_period_length ?? null,
        }),
      ),
    [cycleRecords, preferences.data],
  );

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const selectedDaily = dailyLogs.data?.find((log) => log.log_date === selected) ?? null;
  const selectedMood = moodLogs.data?.find((log) => log.log_date === selected) ?? null;
  const selectedCycle = cycleRecords.find(
    (c) => selected && c.start_date <= selected && (c.end_date ?? c.start_date) >= selected,
  );

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendário</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toque em um dia para ver e editar seus registros.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="min-h-11">
          <Link to="/app/historico">
            <History className="h-4 w-4" aria-hidden="true" />
            Histórico
          </Link>
        </Button>
      </header>

      <section className="rounded-3xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={() => shiftMonth(-1)}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <p className="text-base font-semibold capitalize">{formatMonthYear(year, month)}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={() => shiftMonth(1)}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((iso, index) => {
            if (!iso) return <span key={`empty-${index}`} className="h-14" aria-hidden="true" />;
            const isPeriod = cycleRecords.some(
              (c) => c.start_date <= iso && (c.end_date ?? c.start_date) >= iso,
            );
            const isStart = cycleRecords.some((c) => c.start_date === iso);
            const hasSymptoms = dailyLogs.data?.some(
              (log) => log.log_date === iso && log.symptoms.length > 0,
            );
            const hasMood = moodLogs.data?.some((log) => log.log_date === iso);
            const isPredicted = !isPeriod && predicted.has(iso);
            const isToday = iso === today;
            const descriptions = [
              isStart ? "início da menstruação" : isPeriod ? "menstruação" : null,
              isPredicted ? "menstruação estimada" : null,
              hasSymptoms ? "com sintomas" : null,
              hasMood ? "com humor" : null,
            ].filter(Boolean);

            return (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  setSelected(iso);
                }}
                aria-label={`${formatWeekdayLong(iso)}${descriptions.length ? `, ${descriptions.join(", ")}` : ""}`}
                aria-pressed={selected === iso}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border text-sm transition-colors",
                  isPeriod
                    ? "border-transparent bg-bloom-pink/80 font-semibold text-foreground"
                    : "border-border bg-background hover:bg-secondary/60",
                  isPredicted && "border-dashed border-bloom-pink",
                  selected === iso && "ring-2 ring-primary",
                  isToday && "font-bold underline decoration-2 underline-offset-4",
                )}
              >
                <span>{Number(iso.slice(-2))}</span>
                <span className="flex items-center gap-0.5" aria-hidden="true">
                  {isStart ? <Droplet className="h-3 w-3" /> : null}
                  {hasSymptoms ? <span className="text-[10px] leading-none">✦</span> : null}
                  {hasMood ? <span className="h-1.5 w-1.5 rounded-full bg-bloom-lilac" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-bloom-pink/80" aria-hidden="true" />
            Menstruação registrada (gota marca o início)
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded border border-dashed border-bloom-pink" aria-hidden="true" />
            Menstruação estimada
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true">✦</span> Sintomas registrados
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-bloom-lilac" aria-hidden="true" /> Humor registrado
          </li>
        </ul>
      </section>

      {selected ? (
        <section aria-live="polite" className="rounded-3xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold capitalize">{formatWeekdayLong(selected)}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Menstruação</dt>
              <dd>
                {selectedCycle
                  ? selectedCycle.start_date === selected
                    ? "Primeiro dia registrado"
                    : "Dia de menstruação registrado"
                  : predicted.has(selected)
                    ? "Data estimada (não registrada)"
                    : "Sem registro"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fluxo</dt>
              <dd>{flowLabel(selectedDaily?.flow_intensity) ?? "Sem registro"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sintomas</dt>
              <dd>
                {selectedDaily && selectedDaily.symptoms.length > 0
                  ? selectedDaily.symptoms.map(symptomLabel).join(", ")
                  : "Sem registro"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Humor</dt>
              <dd>
                {selectedMood && selectedMood.moods.length > 0
                  ? selectedMood.moods.map(moodLabel).join(", ")
                  : "Sem registro"}
              </dd>
            </div>
            {selectedDaily?.notes || selectedMood?.notes ? (
              <div>
                <dt className="text-muted-foreground">Observações</dt>
                <dd className="whitespace-pre-line">
                  {[selectedDaily?.notes, selectedMood?.notes].filter(Boolean).join("\n")}
                </dd>
              </div>
            ) : null}
          </dl>
          <Button className="mt-4 min-h-12 w-full" onClick={() => setSheetOpen(true)}>
            {selectedDaily || selectedMood ? "Editar registros do dia" : "Adicionar registro"}
          </Button>
        </section>
      ) : null}

      <DayLogSheet date={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
