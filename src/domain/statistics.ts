/**
 * Estatísticas descritivas do Bloom.
 * Regras: usar exclusivamente os registros fornecidos, nunca completar lacunas
 * com dados inventados e nunca produzir conclusões médicas.
 */
import { addDays, diffInDays, sortCyclesAsc, type CycleRecord } from "./cycle";
import { moodValence, symptomLabel } from "./catalog";
import { decodeSymptoms, type DayMetrics, type MetricKey } from "./metrics";

export interface DailyLogLike {
  log_date: string;
  flow_intensity: string | null;
  symptoms: string[];
  notes: string | null;
}

export interface MoodLogLike {
  log_date: string;
  moods: string[];
  intensity: number | null;
  notes: string | null;
}

export interface NumberSummary {
  count: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  stdDev: number | null;
}

export function summarize(values: readonly number[]): NumberSummary {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) {
    return { count: 0, mean: null, median: null, min: null, max: null, stdDev: null };
  }
  const sorted = [...clean].sort((a, b) => a - b);
  const mean = clean.reduce((s, v) => s + v, 0) / clean.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
  const variance =
    clean.length > 1 ? clean.reduce((s, v) => s + (v - mean) ** 2, 0) / (clean.length - 1) : 0;
  return {
    count: clean.length,
    mean: round1(mean),
    median: round1(median),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    stdDev: round1(Math.sqrt(variance)),
  };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type PeriodFilter = "3m" | "6m" | "12m" | "all";

export function periodStart(filter: PeriodFilter, todayISO: string): string | null {
  switch (filter) {
    case "3m":
      return addDays(todayISO, -91);
    case "6m":
      return addDays(todayISO, -182);
    case "12m":
      return addDays(todayISO, -365);
    default:
      return null;
  }
}

export function filterByDate<T extends { log_date: string }>(
  rows: readonly T[],
  fromISO: string | null,
  toISO?: string | null,
): T[] {
  return rows.filter((r) => (!fromISO || r.log_date >= fromISO) && (!toISO || r.log_date <= toISO));
}

export function filterCyclesByDate<T extends CycleRecord>(
  cycles: readonly T[],
  fromISO: string | null,
  toISO?: string | null,
): T[] {
  return cycles.filter(
    (c) => (!fromISO || c.start_date >= fromISO) && (!toISO || c.start_date <= toISO),
  );
}

/* ------------------------------ ciclos ------------------------------ */

export interface CycleSummary {
  id: string;
  index: number;
  start: string;
  end: string | null;
  /** Dia anterior ao próximo início, ou null se o ciclo está em andamento. */
  cycleEnd: string | null;
  cycleLength: number | null;
  periodLength: number | null;
  isCurrent: boolean;
  loggedDays: number;
  topSymptoms: { value: string; label: string; count: number }[];
  averageMoodValence: number | null;
  irregular: boolean;
  irregularReason: string | null;
}

export const TYPICAL_CYCLE_MIN = 21;
export const TYPICAL_CYCLE_MAX = 35;

/**
 * Resume cada ciclo registrado. A duração só existe quando há o início seguinte
 * (ciclo completo). Ciclos fora da faixa de referência são sinalizados como
 * "fora do padrão registrado" — uma descrição, não um diagnóstico.
 */
export function summarizeCycles(
  cycles: readonly CycleRecord[],
  dailyLogs: readonly DailyLogLike[] = [],
  moodLogs: readonly MoodLogLike[] = [],
): CycleSummary[] {
  const sorted = sortCyclesAsc(cycles);
  const lengths = sorted
    .map((c, i) => (sorted[i + 1] ? diffInDays(c.start_date, sorted[i + 1]!.start_date) : null))
    .filter((n): n is number => n !== null);
  const median = summarize(lengths).median;

  return sorted.map((cycle, index) => {
    const next = sorted[index + 1];
    const cycleLength = next ? diffInDays(cycle.start_date, next.start_date) : null;
    const cycleEnd = next ? addDays(next.start_date, -1) : null;
    const inRange = (date: string) =>
      date >= cycle.start_date && (cycleEnd === null || date <= cycleEnd);
    const logs = dailyLogs.filter((l) => inRange(l.log_date));
    const moods = moodLogs.filter((l) => inRange(l.log_date));
    const freq = symptomFrequency(logs).slice(0, 3);
    const valences = moods.flatMap((m) =>
      m.moods.map(moodValence).filter((v): v is number => v !== null),
    );

    let irregularReason: string | null = null;
    if (cycleLength !== null) {
      if (cycleLength < TYPICAL_CYCLE_MIN)
        irregularReason = `Ciclo mais curto que ${TYPICAL_CYCLE_MIN} dias`;
      else if (cycleLength > TYPICAL_CYCLE_MAX)
        irregularReason = `Ciclo mais longo que ${TYPICAL_CYCLE_MAX} dias`;
      else if (median !== null && Math.abs(cycleLength - median) > 7)
        irregularReason = "Diferença de mais de 7 dias em relação à sua mediana";
    }
    const periodLength = cycle.end_date ? diffInDays(cycle.start_date, cycle.end_date) + 1 : null;
    if (!irregularReason && periodLength !== null && periodLength > 8) {
      irregularReason = "Sangramento registrado por mais de 8 dias";
    }

    return {
      id: cycle.id,
      index: index + 1,
      start: cycle.start_date,
      end: cycle.end_date,
      cycleEnd,
      cycleLength,
      periodLength,
      isCurrent: !next,
      loggedDays: new Set([...logs, ...moods].map((l) => l.log_date)).size,
      topSymptoms: freq,
      averageMoodValence: valences.length
        ? round1(valences.reduce((s, v) => s + v, 0) / valences.length)
        : null,
      irregular: irregularReason !== null,
      irregularReason,
    };
  });
}

/* ------------------------------ sintomas ------------------------------ */

export function symptomFrequency(
  logs: readonly DailyLogLike[],
): { value: string; label: string; count: number; share: number }[] {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const decoded = decodeSymptoms(log.symptoms);
    for (const s of [...decoded.physical, ...decoded.emotional]) {
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  const total = logs.length;
  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      label: symptomLabel(value),
      count,
      share: total ? round1((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/* ------------------------------ humor ------------------------------ */

export function moodFrequency(logs: readonly MoodLogLike[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const log of logs) for (const m of log.moods) counts.set(m, (counts.get(m) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

export interface MoodPoint {
  date: string;
  valence: number;
  intensity: number | null;
}

/** Série diária de humor (valência média dos humores do dia). Dias sem registro não entram. */
export function moodSeries(logs: readonly MoodLogLike[]): MoodPoint[] {
  return [...logs]
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .map((log) => {
      const values = log.moods.map(moodValence).filter((v): v is number => v !== null);
      if (values.length === 0) return null;
      return {
        date: log.log_date,
        valence: round1(values.reduce((s, v) => s + v, 0) / values.length),
        intensity: log.intensity,
      };
    })
    .filter((p): p is MoodPoint => p !== null);
}

/* ------------------------------ métricas ------------------------------ */

export function metricSeries(
  logs: readonly DailyLogLike[],
  key: MetricKey,
): { date: string; value: number }[] {
  return [...logs]
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .map((l) => ({ date: l.log_date, value: decodeSymptoms(l.symptoms).metrics[key] }))
    .filter((p): p is { date: string; value: number } => p.value !== undefined);
}

export function averageMetrics(logs: readonly DailyLogLike[]): DayMetrics {
  const sums = new Map<MetricKey, number[]>();
  for (const log of logs) {
    const { metrics } = decodeSymptoms(log.symptoms);
    for (const [k, v] of Object.entries(metrics) as [MetricKey, number][]) {
      sums.set(k, [...(sums.get(k) ?? []), v]);
    }
  }
  const out: DayMetrics = {};
  for (const [k, values] of sums)
    out[k] = round1(values.reduce((s, v) => s + v, 0) / values.length);
  return out;
}

/* ------------------------------ relatório ------------------------------ */

export interface PeriodReport {
  from: string | null;
  to: string;
  cyclesStarted: number;
  completeCycles: number;
  cycleLength: NumberSummary;
  periodLength: NumberSummary;
  variability: number | null;
  irregularCycles: number;
  loggedDays: number;
  moodDays: number;
  topSymptoms: { value: string; label: string; count: number; share: number }[];
  topMoods: { value: string; count: number }[];
  metrics: DayMetrics;
}

export function buildPeriodReport(
  cycles: readonly CycleRecord[],
  dailyLogs: readonly DailyLogLike[],
  moodLogs: readonly MoodLogLike[],
  filter: PeriodFilter,
  todayISO: string,
): PeriodReport {
  const from = periodStart(filter, todayISO);
  const allSummaries = summarizeCycles(cycles, dailyLogs, moodLogs);
  const summaries = allSummaries.filter((s) => !from || s.start >= from);
  const lengths = summaries.map((s) => s.cycleLength).filter((n): n is number => n !== null);
  const periods = summaries.map((s) => s.periodLength).filter((n): n is number => n !== null);
  const logs = filterByDate(dailyLogs, from, todayISO);
  const moods = filterByDate(moodLogs, from, todayISO);
  return {
    from,
    to: todayISO,
    cyclesStarted: summaries.length,
    completeCycles: lengths.length,
    cycleLength: summarize(lengths),
    periodLength: summarize(periods),
    variability: lengths.length >= 2 ? Math.max(...lengths) - Math.min(...lengths) : null,
    irregularCycles: summaries.filter((s) => s.irregular).length,
    loggedDays: new Set(logs.map((l) => l.log_date)).size,
    moodDays: new Set(moods.map((l) => l.log_date)).size,
    topSymptoms: symptomFrequency(logs).slice(0, 5),
    topMoods: moodFrequency(moods).slice(0, 5),
    metrics: averageMetrics(logs),
  };
}

/** Sequência atual de dias consecutivos com algum registro, terminando hoje ou ontem. */
export function loggingStreak(dates: readonly string[], todayISO: string): number {
  const set = new Set(dates);
  let cursor = set.has(todayISO) ? todayISO : addDays(todayISO, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
