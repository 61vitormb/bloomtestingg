import type { PeriodFilter } from "@/domain/statistics";
import { cn } from "@/lib/utils";

const OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "12m", label: "12 meses" },
  { value: "all", label: "Tudo" },
];

export function PeriodTabs({
  value,
  onChange,
}: {
  value: PeriodFilter;
  onChange: (v: PeriodFilter) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Período"
      className="inline-flex rounded-full bg-secondary p-1"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-9 rounded-full px-3.5 text-sm font-medium transition-all",
            value === o.value
              ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
