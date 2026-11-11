/**
 * Dados de teste 100% fictícios. Nenhum dado real de usuária é usado em testes.
 * As fábricas geram históricos determinísticos para cenários repetíveis.
 */
import { addDays, type CycleRecord } from "@/domain/cycle";
import type { DailyLogLike, MoodLogLike } from "@/domain/statistics";

export const TEST_USERS = {
  ana: { email: "ana.teste@bloom.test", password: "SenhaTeste123", name: "Ana Teste" },
  bia: { email: "bia.teste@bloom.test", password: "OutraSenha456", name: "Bia Teste" },
} as const;

/** Ciclos com início a cada `lengths[i]` dias e menstruação de `period` dias. */
export function makeCycles(firstStart: string, lengths: number[], period = 5): CycleRecord[] {
  const out: CycleRecord[] = [];
  let start = firstStart;
  for (let i = 0; i <= lengths.length; i += 1) {
    out.push({ id: `c${i + 1}`, start_date: start, end_date: addDays(start, period - 1) });
    if (i < lengths.length) start = addDays(start, lengths[i]!);
  }
  return out;
}

export const REGULAR_CYCLES = makeCycles("2026-05-01", [28, 28, 28, 28]); // 5 inícios
export const IRREGULAR_CYCLES = makeCycles("2026-03-01", [24, 40, 31, 19]);

export function dailyLog(log_date: string, partial: Partial<DailyLogLike> = {}): DailyLogLike {
  return { log_date, flow_intensity: null, symptoms: [], notes: null, ...partial };
}

export function moodLog(
  log_date: string,
  moods: string[],
  intensity: number | null = null,
): MoodLogLike {
  return { log_date, moods, intensity, notes: null };
}

/** Cólicas nos dias 1 e 2 de cada ciclo regular + cansaço no dia 1. */
export const CRAMP_LOGS: DailyLogLike[] = REGULAR_CYCLES.flatMap((c) => [
  dailyLog(c.start_date, {
    flow_intensity: "heavy",
    symptoms: ["cramps", "fatigue", "m:cramps:3", "m:energy:2"],
  }),
  dailyLog(addDays(c.start_date, 1), {
    flow_intensity: "moderate",
    symptoms: ["cramps", "m:cramps:2", "m:energy:3"],
  }),
]);

export const MOOD_HISTORY: MoodLogLike[] = REGULAR_CYCLES.flatMap((c) => [
  moodLog(c.start_date, ["tired", "sensitive"], 4),
  moodLog(addDays(c.start_date, 1), ["tired"], 3),
  moodLog(addDays(c.start_date, 10), ["happy", "energized"], 4),
]);
