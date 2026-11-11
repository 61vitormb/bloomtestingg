import type { ReactNode } from "react";
import { addDays, diffInDays } from "@/domain/cycle";
import { cn } from "@/lib/utils";

export interface CycleRingProps {
  /** Início do ciclo atual (ISO). Sem ele, o anel aparece vazio. */
  cycleStart: string | null;
  cycleLength: number;
  today: string;
  dayOfCycle: number | null;
  recorded: ReadonlySet<string>;
  predicted: ReadonlySet<string>;
  fertile: ReadonlySet<string>;
  ovulation: ReadonlySet<string>;
  /** Dias com algum registro, desenhados como pontinhos no interior do anel. */
  loggedDays?: ReadonlySet<string>;
  discreet?: boolean;
  label: string;
  children?: ReactNode;
  className?: string;
}

const SIZE = 320;
const C = SIZE / 2;
const R = 128;
const STROKE = 26;

function polar(angleDeg: number, radius = R) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: C + radius * Math.cos(a), y: C + radius * Math.sin(a) };
}

function arcPath(startDeg: number, endDeg: number, radius = R) {
  const sweep = Math.max(endDeg - startDeg, 0.01);
  const s = polar(startDeg, radius);
  const e = polar(startDeg + sweep, radius);
  const large = sweep > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
}

/** Agrupa os dias do ciclo (índices 0..L-1) pertencentes a um conjunto em faixas contínuas. */
function runs(cycleStart: string, length: number, set: ReadonlySet<string>): [number, number][] {
  const out: [number, number][] = [];
  let open: number | null = null;
  for (let i = 0; i < length; i += 1) {
    const inSet = set.has(addDays(cycleStart, i));
    if (inSet && open === null) open = i;
    if (!inSet && open !== null) {
      out.push([open, i - 1]);
      open = null;
    }
  }
  if (open !== null) out.push([open, length - 1]);
  return out;
}

/**
 * Anel do ciclo: cada grau do círculo é uma parte do ciclo estimado.
 * Arcos sólidos = menstruação registrada; arcos claros = estimativas;
 * arco verde-água = janela fértil estimada. O marcador mostra o dia de hoje.
 */
export function CycleRing({
  cycleStart,
  cycleLength,
  today,
  dayOfCycle,
  recorded,
  predicted,
  fertile,
  ovulation,
  loggedDays,
  discreet,
  label,
  children,
  className,
}: CycleRingProps) {
  const length = Math.max(cycleLength, dayOfCycle ?? 0, 15);
  const deg = 360 / length;
  const gap = Math.min(deg * 0.18, 2.2);
  const span = (from: number, to: number) => arcPath(from * deg + gap, (to + 1) * deg - gap);

  const nextStart = cycleStart ? addDays(cycleStart, length) : null;
  // Estimativa de menstruação no fim do anel (próximo ciclo) também aparece no ciclo atual
  const predictedRuns = cycleStart ? runs(cycleStart, length, predicted) : [];
  const recordedRuns = cycleStart ? runs(cycleStart, length, recorded) : [];
  const fertileRuns = cycleStart ? runs(cycleStart, length, fertile) : [];
  const ovulationIndex = cycleStart
    ? Array.from({ length }, (_, i) => i).find((i) => ovulation.has(addDays(cycleStart, i)))
    : undefined;
  const todayIndex = cycleStart ? diffInDays(cycleStart, today) : null;
  const marker =
    todayIndex !== null && todayIndex >= 0 && todayIndex < length
      ? polar((todayIndex + 0.5) * deg)
      : null;
  const progressDeg =
    todayIndex !== null && todayIndex >= 0 ? Math.min((todayIndex + 1) * deg, 360) : 0;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative mx-auto aspect-square w-full max-w-[340px]", className)}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ring-menstrual" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--phase-menstrual)" />
            <stop offset="100%" stopColor="var(--petal-coral)" />
          </linearGradient>
          <linearGradient id="ring-fertile" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0%" stopColor="var(--phase-ovulatory)" />
            <stop offset="100%" stopColor="var(--petal-teal)" />
          </linearGradient>
        </defs>

        {/* trilho */}
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke="var(--border)"
          strokeOpacity={0.9}
          strokeWidth={STROKE}
        />
        {/* progresso discreto até hoje */}
        {progressDeg > 0 && !discreet ? (
          <path
            d={arcPath(0, progressDeg - 0.01, R + STROKE / 2 + 9)}
            fill="none"
            stroke="var(--border)"
            strokeWidth={3}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        ) : null}

        {/* pontos de dia */}
        {Array.from({ length }, (_, i) => {
          const p = polar((i + 0.5) * deg, R - STROKE / 2 - 12);
          const logged = cycleStart && loggedDays?.has(addDays(cycleStart, i));
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={logged ? 3 : 1.6}
              fill={logged ? "var(--primary)" : "var(--border)"}
            />
          );
        })}

        {!discreet && (
          <g className="animate-fade-in">
            {predictedRuns.map(([a, b]) => (
              <path
                key={`p-${a}`}
                d={span(a, b)}
                fill="none"
                stroke="var(--phase-menstrual)"
                strokeOpacity={0.35}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray="2 7"
              />
            ))}
            {fertileRuns.map(([a, b]) => (
              <path
                key={`f-${a}`}
                d={span(a, b)}
                fill="none"
                stroke="url(#ring-fertile)"
                strokeOpacity={0.9}
                strokeWidth={STROKE}
                strokeLinecap="round"
              />
            ))}
            {recordedRuns.map(([a, b]) => (
              <path
                key={`r-${a}`}
                d={span(a, b)}
                fill="none"
                stroke="url(#ring-menstrual)"
                strokeWidth={STROKE}
                strokeLinecap="round"
              />
            ))}
            {ovulationIndex !== undefined
              ? (() => {
                  const p = polar((ovulationIndex + 0.5) * deg);
                  return (
                    <g>
                      <circle cx={p.x} cy={p.y} r={10} fill="var(--card)" />
                      <circle cx={p.x} cy={p.y} r={6} fill="var(--phase-ovulatory)" />
                    </g>
                  );
                })()
              : null}
          </g>
        )}

        {/* ícone de gota no início do ciclo */}
        <g
          transform={`translate(${polar(0, R + STROKE / 2 + 18).x - 7} ${polar(0, R + STROKE / 2 + 18).y - 9})`}
        >
          <path
            d="M7 0C9.5 4 14 8 14 12a7 7 0 0 1-14 0c0-4 4.5-8 7-12Z"
            fill="var(--phase-menstrual)"
          />
        </g>

        {marker && !discreet ? (
          <g
            style={{ transformOrigin: `${marker.x}px ${marker.y}px` }}
            className="animate-scale-in"
          >
            <circle
              cx={marker.x}
              cy={marker.y}
              r={23}
              fill="var(--card)"
              style={{ filter: "drop-shadow(0 4px 10px rgb(34 23 43 / 0.22))" }}
            />
            <text
              x={marker.x}
              y={marker.y - 6}
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="600"
              fill="var(--muted-foreground)"
            >
              Dia
            </text>
            <text
              x={marker.x}
              y={marker.y + 10}
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill="var(--foreground)"
            >
              {(todayIndex ?? 0) + 1}
            </text>
          </g>
        ) : null}
      </svg>
      <div className="absolute inset-[22%] flex flex-col items-center justify-center text-center">
        {children}
      </div>
      {nextStart ? (
        <span className="sr-only">Próximo ciclo estimado a partir de {nextStart}</span>
      ) : null}
    </div>
  );
}
