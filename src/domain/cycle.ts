/**
 * Camada de domínio do Bloom: cálculos de ciclo, fases e previsões.
 * Funções puras, sem dependência de interface ou de rede — testáveis isoladamente.
 * Todas as previsões são estimativas e devem ser apresentadas como tal.
 */

export type FlowIntensity = "none" | "light" | "moderate" | "heavy";

export interface CycleRecord {
  id: string;
  start_date: string; // ISO yyyy-MM-dd
  end_date: string | null;
}

export type CyclePhase = "menstrual" | "follicular" | "ovulatory" | "luteal";

export type ConfidenceLevel = "none" | "low" | "medium" | "high";

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;
export const MIN_PLAUSIBLE_CYCLE_LENGTH = 15;
export const MAX_PLAUSIBLE_CYCLE_LENGTH = 90;

export function toISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${date.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Interpreta uma data ISO (yyyy-MM-dd) como meio-dia UTC.
 * DEF-001: antes usava meia-noite UTC, o que em fusos negativos (ex.: America/Sao_Paulo)
 * fazia a data local cair no dia anterior. Ao meio-dia UTC, qualquer fuso entre
 * UTC-11 e UTC+11 continua no mesmo dia do calendário.
 */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
}

/** Dia da semana (0 = domingo) de uma data ISO, independente do fuso do aparelho. */
export function weekdayOf(iso: string): number {
  return parseISODate(iso).getUTCDay();
}

/** Primeiro dia (domingo) da semana que contém a data. */
export function startOfWeekISO(iso: string): string {
  return addDays(iso, -weekdayOf(iso));
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

export function diffInDays(fromISO: string, toISO: string): number {
  const ms = parseISODate(toISO).getTime() - parseISODate(fromISO).getTime();
  return Math.round(ms / 86_400_000);
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseISODate(value);
  return toISODate(date) === value;
}

export function sortCyclesAsc(cycles: readonly CycleRecord[]): CycleRecord[] {
  return [...cycles].sort((a, b) => a.start_date.localeCompare(b.start_date));
}

/** Duração de cada ciclo: primeiro dia de uma menstruação até o primeiro dia da próxima. */
export function cycleLengths(cycles: readonly CycleRecord[]): number[] {
  const sorted = sortCyclesAsc(cycles);
  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    lengths.push(diffInDays(sorted[i - 1]!.start_date, sorted[i]!.start_date));
  }
  return lengths;
}

/** Duração do sangramento — conceito distinto da duração do ciclo. */
export function periodLengths(cycles: readonly CycleRecord[]): number[] {
  return cycles
    .filter((c) => c.end_date)
    .map((c) => diffInDays(c.start_date, c.end_date as string) + 1)
    .filter((n) => n > 0);
}

function average(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export interface Estimate {
  value: number;
  confidence: ConfidenceLevel;
  sampleSize: number;
  /** true quando o valor vem de um padrão informado ou de um valor de referência. */
  isFallback: boolean;
}

export function averageCycleLength(
  cycles: readonly CycleRecord[],
  declaredLength?: number | null,
): Estimate {
  const lengths = cycleLengths(cycles).filter(
    (n) => n >= MIN_PLAUSIBLE_CYCLE_LENGTH && n <= MAX_PLAUSIBLE_CYCLE_LENGTH,
  );
  if (lengths.length === 0) {
    return {
      value: declaredLength ?? DEFAULT_CYCLE_LENGTH,
      confidence: "none",
      sampleSize: 0,
      isFallback: true,
    };
  }
  const recent = lengths.slice(-6);
  const value = Math.round(average(recent));
  const confidence: ConfidenceLevel =
    recent.length >= 4 ? "high" : recent.length >= 2 ? "medium" : "low";
  return { value, confidence, sampleSize: recent.length, isFallback: false };
}

export function averagePeriodLength(
  cycles: readonly CycleRecord[],
  declaredLength?: number | null,
): Estimate {
  const lengths = periodLengths(cycles).slice(-6);
  if (lengths.length === 0) {
    return {
      value: declaredLength ?? DEFAULT_PERIOD_LENGTH,
      confidence: "none",
      sampleSize: 0,
      isFallback: true,
    };
  }
  return {
    value: Math.round(average(lengths)),
    confidence: lengths.length >= 3 ? "high" : "low",
    sampleSize: lengths.length,
    isFallback: false,
  };
}

/** Variação entre o menor e o maior ciclo registrado. Útil para comunicar irregularidade. */
export function cycleVariability(cycles: readonly CycleRecord[]): number | null {
  const lengths = cycleLengths(cycles);
  if (lengths.length < 2) return null;
  return Math.max(...lengths) - Math.min(...lengths);
}

export function lastCycle(cycles: readonly CycleRecord[]): CycleRecord | null {
  const sorted = sortCyclesAsc(cycles);
  return sorted.length > 0 ? sorted[sorted.length - 1]! : null;
}

/** Dia do ciclo atual (1 = primeiro dia da última menstruação registrada). */
export function currentCycleDay(cycles: readonly CycleRecord[], todayISO: string): number | null {
  const last = lastCycle(cycles);
  if (!last) return null;
  const delta = diffInDays(last.start_date, todayISO);
  if (delta < 0) return null;
  return delta + 1;
}

export interface PredictionResult {
  /** Data estimada do primeiro dia da próxima menstruação. */
  date: string;
  confidence: ConfidenceLevel;
  basedOnCycles: number;
  cycleLength: number;
}

export function predictNextPeriod(
  cycles: readonly CycleRecord[],
  declaredCycleLength?: number | null,
): PredictionResult | null {
  const last = lastCycle(cycles);
  if (!last) return null;
  const estimate = averageCycleLength(cycles, declaredCycleLength);
  return {
    date: addDays(last.start_date, estimate.value),
    confidence: estimate.confidence,
    basedOnCycles: estimate.sampleSize,
    cycleLength: estimate.value,
  };
}

/**
 * Fase estimada a partir do dia do ciclo.
 * A janela ovulatória é uma estimativa e nunca uma confirmação de ovulação.
 */
export function estimatePhase(
  dayOfCycle: number,
  cycleLength: number = DEFAULT_CYCLE_LENGTH,
  periodLength: number = DEFAULT_PERIOD_LENGTH,
): CyclePhase {
  const safeCycle = Math.max(cycleLength, 15);
  const safePeriod = Math.min(Math.max(periodLength, 1), safeCycle - 4);
  if (dayOfCycle <= safePeriod) return "menstrual";
  const ovulationDay = safeCycle - 14;
  if (dayOfCycle >= ovulationDay - 2 && dayOfCycle <= ovulationDay + 1) return "ovulatory";
  if (dayOfCycle < ovulationDay - 2) return "follicular";
  return "luteal";
}

export interface CycleOverview {
  dayOfCycle: number | null;
  phase: CyclePhase | null;
  lastPeriodStart: string | null;
  nextPeriod: PredictionResult | null;
  cycleLength: Estimate;
  periodLength: Estimate;
  variability: number | null;
  daysUntilNextPeriod: number | null;
  hasEnoughHistory: boolean;
}

export function buildCycleOverview(
  cycles: readonly CycleRecord[],
  todayISO: string,
  declared?: { cycleLength?: number | null; periodLength?: number | null },
): CycleOverview {
  const cycleLength = averageCycleLength(cycles, declared?.cycleLength ?? null);
  const periodLength = averagePeriodLength(cycles, declared?.periodLength ?? null);
  const dayOfCycle = currentCycleDay(cycles, todayISO);
  const nextPeriod = predictNextPeriod(cycles, declared?.cycleLength ?? null);
  const last = lastCycle(cycles);
  return {
    dayOfCycle,
    phase:
      dayOfCycle === null ? null : estimatePhase(dayOfCycle, cycleLength.value, periodLength.value),
    lastPeriodStart: last?.start_date ?? null,
    nextPeriod,
    cycleLength,
    periodLength,
    variability: cycleVariability(cycles),
    daysUntilNextPeriod: nextPeriod ? diffInDays(todayISO, nextPeriod.date) : null,
    hasEnoughHistory: cycleLengths(cycles).length >= 2,
  };
}

/** Dias estimados (não confirmados) da próxima menstruação, para marcar no calendário. */
export function predictedPeriodDays(
  cycles: readonly CycleRecord[],
  declared?: { cycleLength?: number | null; periodLength?: number | null },
  cyclesAhead = 3,
): string[] {
  const prediction = predictNextPeriod(cycles, declared?.cycleLength ?? null);
  if (!prediction) return [];
  const periodLength = averagePeriodLength(cycles, declared?.periodLength ?? null).value;
  const days: string[] = [];
  for (let cycle = 0; cycle < cyclesAhead; cycle += 1) {
    const start = addDays(prediction.date, cycle * prediction.cycleLength);
    for (let day = 0; day < periodLength; day += 1) days.push(addDays(start, day));
  }
  return days;
}

/** Janela fértil estimada. Não serve como método contraceptivo. */
export function estimatedFertileWindow(
  cycles: readonly CycleRecord[],
  declaredCycleLength?: number | null,
): { start: string; end: string } | null {
  const last = lastCycle(cycles);
  if (!last) return null;
  const length = averageCycleLength(cycles, declaredCycleLength).value;
  const ovulationDay = length - 14;
  if (ovulationDay < 6) return null;
  return {
    start: addDays(last.start_date, ovulationDay - 5),
    end: addDays(last.start_date, ovulationDay + 1),
  };
}

export interface CycleValidationIssue {
  level: "error" | "warning";
  message: string;
}

/**
 * Valida um registro de menstruação sem descartar ciclos irregulares legítimos:
 * erros bloqueiam datas impossíveis, avisos apenas pedem confirmação.
 */
export function validateCycleEntry(
  entry: { start_date: string; end_date?: string | null },
  existingCycles: readonly CycleRecord[],
  todayISO: string,
  ignoreCycleId?: string,
): CycleValidationIssue[] {
  const issues: CycleValidationIssue[] = [];
  if (!isValidISODate(entry.start_date)) {
    issues.push({ level: "error", message: "A data de início não é válida." });
    return issues;
  }
  if (diffInDays(todayISO, entry.start_date) > 0) {
    issues.push({ level: "error", message: "A data de início não pode estar no futuro." });
  }
  if (entry.end_date) {
    if (!isValidISODate(entry.end_date)) {
      issues.push({ level: "error", message: "A data de fim não é válida." });
    } else if (diffInDays(entry.start_date, entry.end_date) < 0) {
      issues.push({ level: "error", message: "A data de fim é anterior à de início." });
    } else if (diffInDays(entry.start_date, entry.end_date) > 14) {
      issues.push({
        level: "warning",
        message: "Esse sangramento durou mais de 15 dias. Confira as datas registradas.",
      });
    }
  }
  const others = existingCycles.filter((c) => c.id !== ignoreCycleId);
  if (others.some((c) => c.start_date === entry.start_date)) {
    issues.push({ level: "error", message: "Já existe uma menstruação registrada nesse dia." });
  } else if (
    others.some(
      (c) => c.end_date && c.start_date < entry.start_date && entry.start_date <= c.end_date,
    )
  ) {
    issues.push({
      level: "error",
      message: "Essa data está dentro de uma menstruação já registrada.",
    });
  }
  const previous = sortCyclesAsc(others)
    .filter((c) => c.start_date < entry.start_date)
    .pop();
  if (previous) {
    const gap = diffInDays(previous.start_date, entry.start_date);
    if (gap < MIN_PLAUSIBLE_CYCLE_LENGTH) {
      issues.push({
        level: "warning",
        message: `Esse início ficou ${gap} dias após o anterior. Confirme se é um novo ciclo.`,
      });
    } else if (gap > MAX_PLAUSIBLE_CYCLE_LENGTH) {
      issues.push({
        level: "warning",
        message: "Há um intervalo longo desde o ciclo anterior. Alguns registros podem faltar.",
      });
    }
  }
  return issues;
}

/* ------------------------------------------------------------------------- */
/* Projeções para o calendário                                               */
/* ------------------------------------------------------------------------- */

/**
 * Dias de menstruação registrados (confirmados pela usuária).
 * Um ciclo sem data de fim é considerado em andamento: marca do início até hoje,
 * limitado à duração média do sangramento, para não pintar semanas inteiras.
 */
export function recordedPeriodDays(
  cycles: readonly CycleRecord[],
  todayISO: string,
  fallbackPeriodLength: number = DEFAULT_PERIOD_LENGTH,
): Set<string> {
  const days = new Set<string>();
  for (const cycle of cycles) {
    let end: string;
    if (cycle.end_date) {
      end = cycle.end_date;
    } else {
      const capped = addDays(cycle.start_date, Math.max(fallbackPeriodLength, 1) - 1);
      end = capped < todayISO ? capped : todayISO;
      if (end < cycle.start_date) end = cycle.start_date;
    }
    const length = Math.min(diffInDays(cycle.start_date, end), 30);
    for (let i = 0; i <= length; i += 1) days.add(addDays(cycle.start_date, i));
  }
  return days;
}

/** Dia do ciclo para uma data qualquer, com base no início mais recente anterior a ela. */
export function cycleDayForDate(cycles: readonly CycleRecord[], dateISO: string): number | null {
  const previous = sortCyclesAsc(cycles)
    .filter((c) => c.start_date <= dateISO)
    .pop();
  if (!previous) return null;
  return diffInDays(previous.start_date, dateISO) + 1;
}

export interface CycleProjection {
  /** Início estimado da menstruação. */
  start: string;
  periodDays: string[];
  fertileDays: string[];
  ovulationDay: string;
}

/**
 * Projeções futuras (estimativas) de menstruação, janela fértil e ovulação.
 * O ciclo atual também é projetado para mostrar a janela fértil estimada em andamento.
 * Nunca deve ser usado como método contraceptivo.
 */
export function projectCycles(
  cycles: readonly CycleRecord[],
  declared?: { cycleLength?: number | null; periodLength?: number | null },
  cyclesAhead = 3,
): CycleProjection[] {
  const last = lastCycle(cycles);
  if (!last) return [];
  const cycleLength = averageCycleLength(cycles, declared?.cycleLength ?? null).value;
  const periodLength = averagePeriodLength(cycles, declared?.periodLength ?? null).value;
  const projections: CycleProjection[] = [];
  for (let k = 0; k <= cyclesAhead; k += 1) {
    const cycleStart = addDays(last.start_date, k * cycleLength);
    const ovulationOffset = cycleLength - 14;
    const fertileDays: string[] = [];
    if (ovulationOffset >= 6) {
      for (let d = ovulationOffset - 5; d <= ovulationOffset + 1; d += 1) {
        fertileDays.push(addDays(cycleStart, d));
      }
    }
    const periodDays =
      k === 0 ? [] : Array.from({ length: periodLength }, (_, i) => addDays(cycleStart, i));
    projections.push({
      start: cycleStart,
      periodDays,
      fertileDays,
      ovulationDay: addDays(cycleStart, Math.max(ovulationOffset, 0)),
    });
  }
  return projections;
}
