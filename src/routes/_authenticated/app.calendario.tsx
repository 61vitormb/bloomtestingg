import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayLogSheet } from "@/components/bloom/DayLogSheet";
import { flowLabel, moodLabel, symptomLabel } from "@/domain/catalog";
import { addDays, predictedPeriodDays, toISODate, type CycleRecord } from "@/domain/cycle";
import { formatMonthYear, formatShort, formatWeekdayLong, todayISO } from "@/lib/format";
import { useCycles, useDailyLogs, useMoodLogs, usePreferences } from "@/hooks/useBloomData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — Bloom" },
      { name: "description", content: "Calendário menstrual com sintomas, humor e datas estimadas." },
      { property: "og:title", content: "Calendário — Bloom" },
      { property: "og:description", content: "Registre e consulte cada dia do seu ciclo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarScreen,
});

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function buildMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: first.getUTCDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(toISODate(new Date(Date.UTC(year, month, day))));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function CalendarScreen() {
  const today = todayISO();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(today);
  const [sheetOpen, setSheetOpen] = useState(false);
  const cycles = useCycles();
  const dailyLogs = useDailyLogs();
  const moodLogs = useMoodLogs();
  const preferences = usePreferences();

  const cycleRecords: CycleRecord[] = useMemo(
    () => (cycles.data ?? []).map(({ id, start_date, end_date }) => ({ id, start_date, end_date })),
    [cycles.data],
  );
  const predicted = useMemo(
    () => new Set(predictedPeriodDays(cycleRecords, {
      cycleLength: preferences.data?.average_cycle_length ?? null,
      periodLength: preferences.data?.average_period_length ?? null,
    })),
    [cycleRecords, preferences.data],
  );
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(selected, index - 3)), [selected]);
  const selectedDaily = dailyLogs.data?.find((log) => log.log_date === selected) ?? null;
  const selectedMood = moodLogs.data?.find((log) => log.log_date === selected) ?? null;
  const selectedCycle = cycleRecords.find((cycle) => cycle.start_date <= selected && (cycle.end_date ?? cycle.start_date) >= selected);

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
    setSelected(toISODate(next));
  }

  const agendaItems = [
    selectedCycle ? (selectedCycle.start_date === selected ? "Início da menstruação" : "Menstruação registrada") : predicted.has(selected) ? "Menstruação estimada" : null,
    selectedDaily?.flow_intensity ? `Fluxo ${flowLabel(selectedDaily.flow_intensity)?.toLowerCase()}` : null,
    selectedDaily?.symptoms.length ? selectedDaily.symptoms.map(symptomLabel).join(", ") : null,
    selectedMood?.moods.length ? selectedMood.moods.map(moodLabel).join(", ") : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Button variant="ghost" size="icon" className="size-11 rounded-full" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
          <ChevronLeft aria-hidden="true" />
        </Button>
        <h1 className="text-center text-3xl font-bold capitalize text-neon">{formatMonthYear(year, month)}</h1>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="size-11 rounded-full" onClick={() => shiftMonth(1)} aria-label="Próximo mês"><ChevronRight aria-hidden="true" /></Button>
          <Button variant="default" size="icon" className="size-11 rounded-full" onClick={() => setSheetOpen(true)} aria-label={`Adicionar registro em ${formatShort(selected)}`}><Plus aria-hidden="true" /></Button>
        </div>
      </header>

      <section aria-label="Semana selecionada">
        <ul className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => {
            const active = day === selected;
            const hasRecord = dailyLogs.data?.some((log) => log.log_date === day) || moodLogs.data?.some((log) => log.log_date === day);
            return (
              <li key={day}>
                <Button
                  type="button"
                  variant={active ? "default" : "ghost"}
                  className="h-16 w-full flex-col gap-0 rounded-2xl px-0 shadow-none"
                  aria-pressed={active}
                  aria-label={formatWeekdayLong(day)}
                  onClick={() => setSelected(day)}
                >
                  <span className="text-[10px] uppercase opacity-70">{formatShort(day).split(" ")[0]}</span>
                  <span className="text-base font-bold">{Number(day.slice(-2))}</span>
                  <span className={cn("mt-0.5 size-1 rounded-full", hasRecord ? "bg-neon" : "bg-transparent")} aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid grid-cols-[1fr_auto] items-center border-y border-border py-4" aria-label="Resumo do dia">
        <div>
          <p className="text-xs text-muted-foreground">Registros do dia</p>
          <p className="mt-1 text-2xl font-bold">{agendaItems.length}</p>
        </div>
        <div className="flex size-16 items-center justify-center rounded-full border-[6px] border-foreground text-sm font-bold">
          {agendaItems.length ? "100%" : "0%"}
        </div>
      </section>

      <section aria-labelledby="agenda-title">
        <div className="flex items-center justify-between">
          <h2 id="agenda-title" className="font-bold">Agenda do dia</h2>
          <span className="text-xs text-muted-foreground">{agendaItems.length} {agendaItems.length === 1 ? "item" : "itens"}</span>
        </div>
        <div className="mt-3 rounded-2xl border border-border p-4">
          {agendaItems.length ? (
            <ul className="space-y-2">
              {agendaItems.map((item) => <li key={item} className="flex items-start gap-2 text-sm"><span className="mt-1 size-2 shrink-0 rounded-full bg-neon" aria-hidden="true" />{item}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma informação adicionada neste dia.</p>
          )}
          <Button className="mt-4 min-h-11 w-full rounded-full" onClick={() => setSheetOpen(true)}>
            {agendaItems.length ? "Editar dia" : "Adicionar informações"}
          </Button>
        </div>
      </section>

      <details className="rounded-2xl border border-border p-4">
        <summary className="cursor-pointer font-semibold">Ver mês completo</summary>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((iso, index) => iso ? (
            <Button
              key={iso}
              type="button"
              variant={selected === iso ? "default" : "ghost"}
              size="icon"
              className={cn("size-10 rounded-full", predicted.has(iso) && selected !== iso && "border border-dashed border-foreground")}
              aria-label={formatWeekdayLong(iso)}
              aria-pressed={selected === iso}
              onClick={() => setSelected(iso)}
            >
              {Number(iso.slice(-2))}
            </Button>
          ) : <span key={`empty-${index}`} className="size-10" aria-hidden="true" />)}
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" asChild className="min-h-11 rounded-full">
            <Link to="/app/historico"><History aria-hidden="true" />Histórico de ciclos</Link>
          </Button>
        </div>
      </details>

      <DayLogSheet date={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}