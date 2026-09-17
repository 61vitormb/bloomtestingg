import { PHASE_INFO } from "@/domain/catalog";
import type { CyclePhase } from "@/domain/cycle";

interface CycleRingProps {
  dayOfCycle: number | null;
  cycleLength: number;
  phase: CyclePhase | null;
  label: string;
  helper?: string;
}

/**
 * Visualização circular da posição estimada no ciclo.
 * O anel indica posição, não uma medida clínica de progresso.
 */
export function CycleRing({
  dayOfCycle,
  cycleLength,
  phase,
  label,
  helper,
}: CycleRingProps) {
  const size = 260;
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const ratio =
    dayOfCycle === null ? 0 : Math.min(1, Math.max(0.02, dayOfCycle / Math.max(cycleLength, 1)));
  const info = phase ? PHASE_INFO[phase] : null;

  return (
    <div
      className="relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center"
      role="img"
      aria-label={
        dayOfCycle === null
          ? `Ciclo sem registros. ${label}`
          : `Dia ${dayOfCycle} do ciclo, fase estimada ${info?.label ?? "indefinida"}. ${label}`
      }
    >
      <div
        className="absolute inset-8 rounded-full blur-2xl transition-all duration-700"
        style={{ background: info?.gradientVar ?? "var(--gradient-follicular)", opacity: 0.85 }}
      />
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="6"
          strokeDasharray="2 8"
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={info?.accent ?? "var(--bloom-green)"}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="relative z-10 px-8 text-center">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {dayOfCycle === null ? "Sem registros" : `Dia ${dayOfCycle} do ciclo`}
        </p>
        <p className="mt-2 text-3xl leading-tight font-bold text-foreground">{label}</p>
        {helper ? <p className="mt-2 text-sm text-muted-foreground">{helper}</p> : null}
      </div>
    </div>
  );
}
