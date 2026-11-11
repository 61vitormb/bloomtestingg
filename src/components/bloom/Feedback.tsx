import { useEffect, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Carregamento próprio: uma flor que abre e fecha suavemente. */
export function LoadingBloom({
  label = "Carregando…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 py-10", className)}
    >
      <svg viewBox="-50 -50 100 100" className="size-14" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 60})`}>
            <ellipse
              cx="0"
              cy="-20"
              rx="11"
              ry="20"
              fill={
                [
                  "var(--petal-rose)",
                  "var(--petal-amber)",
                  "var(--petal-coral)",
                  "var(--petal-teal)",
                  "var(--petal-blue)",
                  "var(--petal-lilac)",
                ][i]
              }
              opacity="0.85"
              style={{
                animation: `pop 1.4s ${i * 0.12}s ease-in-out infinite`,
                transformBox: "fill-box",
                transformOrigin: "50% 100%",
              }}
            />
          </g>
        ))}
        <circle r="9" fill="var(--card)" />
      </svg>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

/** Ilustração dos estados vazios: broto com folhas, em traço suave. */
export function SproutIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={cn("h-28 w-auto", className)} aria-hidden="true">
      <ellipse cx="80" cy="108" rx="54" ry="8" fill="var(--muted)" />
      <path
        d="M80 106 C80 80 78 62 80 44"
        stroke="var(--phase-ovulatory)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M80 70 C60 66 48 52 50 38 C66 38 80 52 80 70Z"
        fill="var(--phase-ovulatory-soft)"
        stroke="var(--phase-ovulatory)"
        strokeWidth="2.5"
      />
      <path
        d="M80 60 C98 56 112 42 110 28 C92 28 80 42 80 60Z"
        fill="var(--phase-ovulatory-soft)"
        stroke="var(--phase-ovulatory)"
        strokeWidth="2.5"
      />
      <g className="origin-center animate-float" style={{ transformBox: "fill-box" }}>
        {Array.from({ length: 5 }, (_, i) => (
          <ellipse
            key={i}
            cx="80"
            cy="30"
            rx="7"
            ry="12"
            fill="var(--petal-pink)"
            opacity="0.9"
            transform={`rotate(${i * 72} 80 42)`}
          />
        ))}
        <circle cx="80" cy="42" r="6" fill="var(--petal-amber)" />
      </g>
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center px-6 py-10 text-center animate-fade-up", className)}
    >
      <SproutIllustration />
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div role="alert" className="bloom-card flex flex-col items-center gap-3 p-6 text-center">
      <p className="font-semibold">Não conseguimos carregar seus dados</p>
      <p className="text-sm text-muted-foreground">
        {message ?? "Verifique sua conexão. Nada foi perdido — seus registros continuam na nuvem."}
      </p>
      {onRetry ? (
        <Button variant="outline" className="rounded-full" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}

/** Pequena celebração ao concluir um registro: pétalas que se espalham. */
export function PetalBurst({ trigger }: { trigger: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1100);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!visible) return null;
  const colors = [
    "var(--petal-rose)",
    "var(--petal-amber)",
    "var(--petal-teal)",
    "var(--petal-lilac)",
    "var(--petal-coral)",
    "var(--petal-pink)",
  ];
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
      aria-hidden="true"
    >
      {Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const dist = 110 + (i % 3) * 30;
        return (
          <span
            key={`${trigger}-${i}`}
            className="absolute h-4 w-2.5 rounded-full"
            style={
              {
                background: colors[i % colors.length],
                "--dx": `${Math.cos(angle) * dist}px`,
                "--dy": `${Math.sin(angle) * dist}px`,
                "--rot": `${(i * 47) % 360}deg`,
                animation: "petal-burst 900ms cubic-bezier(0.2,0.8,0.2,1) forwards",
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-fade-up">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-1 text-[1.75rem] leading-tight font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatCard({
  label,
  value,
  unit,
  hint,
  accent,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("bloom-card p-4", className)}>
      <div className="flex items-center gap-2">
        {accent ? (
          <span className="size-2 rounded-full" style={{ background: accent }} aria-hidden="true" />
        ) : null}
        <p className="eyebrow">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>
        ) : null}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Escala segmentada acessível (radiogroup) usada para cólicas, dores, energia e sono. */
export function SegmentedScale({
  label,
  options,
  value,
  onChange,
  color = "var(--primary)",
}: {
  label: string;
  options: { value: number; label: string }[];
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  color?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}
      >
        {options.map((o, i) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(active ? undefined : o.value)}
              className={cn(
                "press flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl border px-1 text-[11px] font-medium transition-colors",
                active
                  ? "border-transparent text-white shadow-[var(--shadow-soft)]"
                  : "border-border bg-card hover:bg-secondary",
              )}
              style={active ? { background: color } : undefined}
            >
              <span className="flex gap-0.5" aria-hidden="true">
                {Array.from(
                  { length: Math.max(1, i + (options[0]?.value === 0 ? 0 : 1)) },
                  (_, k) => (
                    <span
                      key={k}
                      className="size-1.5 rounded-full"
                      style={{
                        background: active ? "#fff" : color,
                        opacity: options[0]?.value === 0 && i === 0 ? 0.25 : 1,
                      }}
                    />
                  ),
                )}
              </span>
              <span className="leading-tight">{o.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
