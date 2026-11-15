import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Egg, Flower2 } from "lucide-react";
import { DayLogSheet } from "@/components/bloom/DayLogSheet";
import { PHASE_INFO } from "@/domain/catalog";
import { addDays, buildCycleOverview, diffInDays, estimatedFertileWindow, lastCycle, predictedPeriodDays, toISODate, type CycleRecord } from "@/domain/cycle";
import { todayISO } from "@/lib/format";
import { useCycles, usePreferences } from "@/hooks/useBloomData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/calendario")({
  head: () => ({
    meta: [
      { title: "Ciclo menstrual — Bloom" },
      { name: "description", content: "Calendário do ciclo com menstruação, período fértil e status do ciclo." },
      { property: "og:title", content: "Ciclo menstrual — Bloom" },
      { property: "og:description", content: "Entenda melhor seu ciclo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarScreen,
});

const WEEKDAYS = ["Do", "Se", "Te", "Qu", "Qu", "Se", "Sá"];

export function buildMonthGrid(year: number, month: number): { iso: string; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(Date.UTC(year, month, 1 - first.getUTCDay()));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const total = Math.ceil((first.getUTCDay() + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(start.getTime() + i * 86400000);
    return { iso: toISODate(d), inMonth: d.getUTCMonth() === month };
  });
}

function CalendarScreen() {
  const today = todayISO();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [tab, setTab] = useState<"cal" | "phases">("cal");
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const cycles = useCycles();
  const preferences = usePreferences();

  const records: CycleRecord[] = useMemo(() => (cycles.data ?? []).map(({ id, start_date, end_date }) => ({ id, start_date, end_date })), [cycles.data]);
  const declared = { cycleLength: preferences.data?.average_cycle_length ?? null, periodLength: preferences.data?.average_period_length ?? null };
  const overview = useMemo(() => buildCycleOverview(records, today, declared), // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, today, preferences.data]);

  const { periodDays, fertileDays, ovulation } = useMemo(() => {
    const period = new Set<string>();
    records.forEach((c) => {
      const end = c.end_date ?? addDays(c.start_date, overview.periodLength.value - 1);
      for (let d = c.start_date; d <= end; d = addDays(d, 1)) period.add(d);
    });
    predictedPeriodDays(records, declared).forEach((d) => period.add(d));
    const fertile = new Set<string>();
    let ov: string | null = null;
    const win = estimatedFertileWindow(records, declared.cycleLength);
    const last = lastCycle(records);
    if (win && last) {
      const len = overview.cycleLength.value;
      for (let k = 0; k < 3; k++) {
        for (let d = addDays(win.start, k * len); d <= addDays(win.end, k * len); d = addDays(d, 1)) fertile.add(d);
      }
      ov = addDays(last.start_date, len - 14);
      while (diffInDays(today, ov) < 0) ov = addDays(ov, len);
    }
    return { periodDays: period, fertileDays: fertile, ovulation: ov };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, preferences.data, overview, today]);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1)));

  function shift(delta: number) {
    const n = new Date(Date.UTC(year, month + delta, 1));
    setYear(n.getUTCFullYear());
    setMonth(n.getUTCMonth());
  }

  const daysToOv = ovulation ? diffInDays(today, ovulation) : null;
  const phase = overview.phase ? PHASE_INFO[overview.phase].label : "—";

  return (
    <div className="space-y-5 pb-28">
      <header className="pt-2">
        <h1 className="text-[26px] font-semibold">Ciclo menstrual</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Entenda melhor seu ciclo</p>
      </header>

      <div className="flex gap-2" role="tablist">
        {([["cal", "Calendário"], ["phases", "Fases"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cn("min-h-11 rounded-full px-7 text-[15px] font-medium transition-colors", tab === k ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
            {l}
          </button>
        ))}
      </div>

      {tab === "cal" ? (
        <>
          <section className="rounded-3xl bg-card p-4 shadow-[0_4px_24px_-12px_rgb(0_0_0/0.15)]">
            <div className="flex items-center justify-between">
              <button onClick={() => shift(-1)} aria-label="Mês anterior" className="flex size-10 items-center justify-center"><ChevronLeft className="size-5" /></button>
              <h2 className="text-[17px] font-semibold">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h2>
              <button onClick={() => shift(1)} aria-label="Próximo mês" className="flex size-10 items-center justify-center"><ChevronRight className="size-5" /></button>
            </div>
            <div className="mt-3 grid grid-cols-7 text-center text-xs text-muted-foreground">
              {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-y-1.5">
              {cells.map(({ iso, inMonth }) => {
                const isPeriod = periodDays.has(iso);
                const isToday = iso === today;
                const isFertile = fertileDays.has(iso);
                const kind = [isPeriod && "menstruação", isToday && "hoje", isFertile && "período fértil", iso === ovulation && "ovulação estimada"].filter(Boolean).join(", ");
                return (
                  <button key={iso} type="button" onClick={() => setSheetDate(iso)}
                    aria-label={`${Number(iso.slice(-2))}${kind ? `, ${kind}` : ""}`}
                    className={cn("mx-auto flex size-10 items-center justify-center rounded-full text-[15px] transition-transform active:scale-95",
                      !inMonth && "text-[#cfcfcf]",
                      isPeriod && "bg-primary text-primary-foreground",
                      !isPeriod && isToday && "border-[1.5px] border-primary",
                      !isPeriod && !isToday && isFertile && "border-[1.5px] border-fertile",
                    )}>
                    {Number(iso.slice(-2))}
                  </button>
                );
              })}
            </div>
          </section>

          <ul className="flex gap-5 px-1 text-[13px] text-muted-foreground">
            <li className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-primary" />Menstruação</li>
            <li className="flex items-center gap-1.5"><span className="size-3 rounded-full border-[1.5px] border-primary" />Hoje</li>
            <li className="flex items-center gap-1.5"><span className="size-3 rounded-full border-[1.5px] border-fertile" />Período fértil</li>
          </ul>
        </>
      ) : (
        <ul className="space-y-3">
          {(Object.keys(PHASE_INFO) as (keyof typeof PHASE_INFO)[]).map((k) => (
            <li key={k} className={cn("bloom-card p-4", overview.phase === k && "border-primary")}>
              <p className="font-semibold">{PHASE_INFO[k].label}{overview.phase === k ? " · fase atual" : ""}</p>
              <p className="mt-1 text-sm text-muted-foreground">{(PHASE_INFO[k] as { description?: string }).description ?? ""}</p>
            </li>
          ))}
          <p className="text-xs text-muted-foreground">As fases são estimativas baseadas nos seus registros e não confirmam ovulação.</p>
        </ul>
      )}

      <section className="rounded-3xl bg-card p-4 shadow-[0_4px_24px_-12px_rgb(0_0_0/0.15)]">
        <h2 className="text-[17px] font-semibold">Status do ciclo</h2>
        <div className="mt-4 grid grid-cols-3 text-center">
          <Status icon={Flower2} value={overview.dayOfCycle ? `Dia ${overview.dayOfCycle}` : "—"} label={phase} />
          {overview.daysUntilNextPeriod !== null && overview.daysUntilNextPeriod < 0 ? (
            <Status icon={CalendarDays} value={-overview.daysUntilNextPeriod} label="dias de atraso estimado" />
          ) : (
            <Status icon={CalendarDays} value={overview.daysUntilNextPeriod ?? "—"} label="dias até a próxima" />
          )}
          <Status icon={Egg} value={daysToOv ?? "—"} label="dias até a ovulação" />
        </div>
      </section>

      <DayLogSheet date={sheetDate} open={sheetDate !== null} onOpenChange={(o) => setSheetDate(o ? sheetDate : null)} />
    </div>
  );
}

function Status({ icon: Icon, value, label }: { icon: typeof Egg; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-pink-faint text-primary"><Icon className="size-5" aria-hidden="true" /></span>
      <span className="mt-2 text-lg font-semibold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
