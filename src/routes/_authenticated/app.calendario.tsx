import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayDetails } from "@/components/bloom/DayDetails";
import { ErrorState, LoadingBloom, PageHeader } from "@/components/bloom/Feedback";
import { useLogSheet } from "@/components/bloom/LogSheetContext";
import {
  CalendarLegend,
  DayCell,
  WEEKDAY_LETTERS,
  buildMonthGrid,
} from "@/components/bloom/MiniMonth";
import { useCycleModel } from "@/hooks/useBloomData";
import { formatMonthYear } from "@/lib/format";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — Bloom" },
      {
        name: "description",
        content: "Calendário menstrual com registros, estimativas e janela fértil estimada.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarScreen,
});

function CalendarScreen() {
  const model = useCycleModel();
  const { today, dailyLogs, moodLogs } = model;
  const { openLog } = useLogSheet();
  const [cursor, setCursor] = useState(() => ({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  }));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selected, setSelected] = useState(today);
  const touchX = useRef<number | null>(null);

  const cells = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const logged = useMemo(
    () => new Set([...(dailyLogs.data ?? []), ...(moodLogs.data ?? [])].map((l) => l.log_date)),
    [dailyLogs.data, moodLogs.data],
  );
  const marks = {
    recorded: model.recorded,
    predicted: model.predicted,
    fertile: model.fertile,
    ovulation: model.ovulation,
    logged,
  };

  function shiftMonth(delta: 1 | -1) {
    playSound("tap");
    setDirection(delta);
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }
  function goToday() {
    setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 });
    setSelected(today);
  }

  if (model.isLoading)
    return <LoadingBloom label="Montando seu calendário…" className="min-h-[60vh]" />;
  if (model.isError) return <ErrorState onRetry={() => void model.refetch()} />;

  const selectedDaily = dailyLogs.data?.find((l) => l.log_date === selected) ?? null;
  const selectedMood = moodLogs.data?.find((l) => l.log_date === selected) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Calendário"
        title="Seu mês"
        description="Toque em um dia para consultar ou registrar. Tracejado e verde-água são estimativas."
        actions={
          <Button variant="outline" asChild className="rounded-full">
            <Link to="/app/historico">
              <History aria-hidden="true" /> Histórico de ciclos
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <section aria-labelledby="month-title" className="bloom-card overflow-hidden p-4 md:p-6">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-full"
              onClick={() => shiftMonth(-1)}
              aria-label="Mês anterior"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <div className="text-center">
              <h2
                id="month-title"
                aria-live="polite"
                className="text-xl font-bold first-letter:uppercase"
              >
                {formatMonthYear(cursor.year, cursor.month)}
              </h2>
              <button
                type="button"
                onClick={goToday}
                className="text-xs font-semibold text-primary"
              >
                Ir para hoje
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-full"
              onClick={() => shiftMonth(1)}
              aria-label="Próximo mês"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>

          <div
            className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground"
            aria-hidden="true"
          >
            {WEEKDAY_LETTERS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div
            key={`${cursor.year}-${cursor.month}`}
            className="mt-2 grid grid-cols-7 gap-y-2"
            style={{
              animation: `${direction === 1 ? "fade-up" : "fade-in"} 360ms cubic-bezier(0.2,0.8,0.2,1) both`,
            }}
            onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
              if (Math.abs(dx) > 60) shiftMonth(dx < 0 ? 1 : -1);
              touchX.current = null;
            }}
            role="grid"
            aria-label={formatMonthYear(cursor.year, cursor.month)}
          >
            {cells.map((iso, i) =>
              iso ? (
                <div key={iso} role="gridcell" className={cn("flex justify-center")}>
                  <DayCell
                    iso={iso}
                    marks={marks}
                    today={today}
                    selected={selected === iso}
                    onSelect={setSelected}
                    size="lg"
                  />
                </div>
              ) : (
                <span key={`e-${i}`} aria-hidden="true" />
              ),
            )}
          </div>
          <CalendarLegend className="mt-6 border-t border-border pt-4" />
        </section>

        <aside aria-label="Dia selecionado" className="bloom-card h-fit p-5 lg:sticky lg:top-8">
          <DayDetails
            key={selected}
            date={selected}
            cycles={model.records}
            daily={selectedDaily}
            mood={selectedMood}
            status={{
              recorded: model.recorded.has(selected),
              predicted: model.predicted.has(selected),
              fertile: model.fertile.has(selected),
              ovulation: model.ovulation.has(selected),
            }}
            onEdit={() => openLog(selected)}
          />
        </aside>
      </div>
      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Janela fértil e ovulação são estimativas estatísticas e não servem como método
        contraceptivo.
      </p>
    </div>
  );
}
