import { addDays, toISODate, weekdayOf } from "@/domain/cycle";
import { formatWeekdayLong } from "@/lib/format";
import { cn } from "@/lib/utils";

export const WEEKDAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstISO = toISODate(new Date(Date.UTC(year, month, 1, 12)));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: weekdayOf(firstISO) }, () => null);
  for (let day = 0; day < daysInMonth; day += 1) cells.push(addDays(firstISO, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export interface DayMarks {
  recorded: ReadonlySet<string>;
  predicted: ReadonlySet<string>;
  fertile: ReadonlySet<string>;
  ovulation: ReadonlySet<string>;
  logged: ReadonlySet<string>;
}

/** Célula de dia com a mesma linguagem visual em todo o app. */
export function DayCell({
  iso,
  marks,
  today,
  selected,
  onSelect,
  size = "md",
}: {
  iso: string;
  marks: DayMarks;
  today: string;
  selected?: boolean;
  onSelect?: (iso: string) => void;
  size?: "sm" | "md" | "lg";
}) {
  const isRecorded = marks.recorded.has(iso);
  const isPredicted = !isRecorded && marks.predicted.has(iso);
  const isFertile = !isRecorded && !isPredicted && marks.fertile.has(iso);
  const isOvulation = marks.ovulation.has(iso) && isFertile;
  const isToday = iso === today;
  const status = [
    isRecorded && "menstruação registrada",
    isPredicted && "menstruação estimada",
    isOvulation ? "ovulação estimada" : isFertile && "janela fértil estimada",
    marks.logged.has(iso) && "com registro",
  ]
    .filter(Boolean)
    .join(", ");
  const dim =
    size === "sm"
      ? "size-8 text-xs"
      : size === "lg"
        ? "size-11 text-sm md:size-14 md:text-base"
        : "size-10 text-sm";
  return (
    <button
      type="button"
      onClick={() => onSelect?.(iso)}
      aria-pressed={selected}
      aria-current={isToday ? "date" : undefined}
      aria-label={`${formatWeekdayLong(iso)}${status ? `: ${status}` : ""}`}
      data-day={iso}
      data-kind={
        isRecorded ? "recorded" : isPredicted ? "predicted" : isFertile ? "fertile" : "none"
      }
      className={cn(
        "press relative mx-auto flex items-center justify-center rounded-full font-semibold tabular-nums transition-all duration-200",
        dim,
        isRecorded && "bg-phase-menstrual text-white",
        isPredicted && "border-2 border-dashed border-phase-menstrual text-phase-menstrual",
        isFertile && "bg-phase-ovulatory-soft text-phase-ovulatory",
        isOvulation && "ring-2 ring-phase-ovulatory ring-offset-1 ring-offset-background",
        !isRecorded && !isPredicted && !isFertile && "hover:bg-secondary",
        isToday && !isRecorded && "outline-2 outline-offset-2 outline-foreground",
        selected &&
          "scale-105 shadow-[var(--shadow-lift)] ring-2 ring-ink ring-offset-2 ring-offset-background",
      )}
    >
      {Number(iso.slice(-2))}
      {marks.logged.has(iso) ? (
        <span
          className={cn(
            "absolute -bottom-1 size-1.5 rounded-full",
            isRecorded ? "bg-white" : "bg-primary",
          )}
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}

export function CalendarLegend({ className }: { className?: string }) {
  const items = [
    {
      label: "Menstruação registrada",
      el: <span className="size-3.5 rounded-full bg-phase-menstrual" />,
    },
    {
      label: "Menstruação estimada",
      el: <span className="size-3.5 rounded-full border-2 border-dashed border-phase-menstrual" />,
    },
    {
      label: "Janela fértil estimada",
      el: (
        <span className="size-3.5 rounded-full bg-phase-ovulatory-soft ring-1 ring-phase-ovulatory/40" />
      ),
    },
    {
      label: "Ovulação estimada",
      el: <span className="size-3.5 rounded-full ring-2 ring-phase-ovulatory" />,
    },
    { label: "Dia com registro", el: <span className="size-1.5 rounded-full bg-primary" /> },
  ];
  return (
    <ul
      className={cn("flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground", className)}
      aria-label="Legenda do calendário"
    >
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="flex size-4 items-center justify-center" aria-hidden="true">
            {i.el}
          </span>
          {i.label}
        </li>
      ))}
    </ul>
  );
}
