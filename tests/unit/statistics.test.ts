import { describe, expect, it } from "vitest";
import {
  averageMetrics,
  buildPeriodReport,
  filterByDate,
  loggingStreak,
  metricSeries,
  moodFrequency,
  moodSeries,
  periodStart,
  summarize,
  summarizeCycles,
  symptomFrequency,
} from "@/domain/statistics";
import {
  CRAMP_LOGS,
  IRREGULAR_CYCLES,
  MOOD_HISTORY,
  REGULAR_CYCLES,
  dailyLog,
  moodLog,
} from "@tests/fixtures/factories";

describe("summarize (estatística descritiva)", () => {
  it("[UT-STA-01] lista vazia não inventa valores", () => {
    expect(summarize([])).toEqual({
      count: 0,
      mean: null,
      median: null,
      min: null,
      max: null,
      stdDev: null,
    });
  });
  it("[UT-STA-02] um único valor tem desvio zero", () => {
    expect(summarize([28])).toMatchObject({ count: 1, mean: 28, median: 28, stdDev: 0 });
  });
  it("[UT-STA-03] mediana com quantidade par e desvio-padrão amostral", () => {
    const s = summarize([24, 40, 31, 19]);
    expect(s.median).toBe(27.5);
    expect(s.mean).toBe(28.5);
    expect(s.min).toBe(19);
    expect(s.max).toBe(40);
    expect(s.stdDev).toBe(9.1);
  });
  it("[UT-STA-04] ignora valores não finitos", () => {
    expect(summarize([Number.NaN, 30, Number.POSITIVE_INFINITY]).count).toBe(1);
  });
});

describe("resumo por ciclo", () => {
  it("[UT-STA-05] ciclos regulares: duração, menstruação e ciclo atual em andamento", () => {
    const s = summarizeCycles(REGULAR_CYCLES);
    expect(s).toHaveLength(5);
    expect(s.slice(0, 4).every((c) => c.cycleLength === 28 && !c.irregular)).toBe(true);
    expect(s[4]).toMatchObject({
      isCurrent: true,
      cycleLength: null,
      cycleEnd: null,
      periodLength: 5,
    });
    expect(s[0]!.cycleEnd).toBe("2026-05-28");
  });

  it("[UT-STA-06] sinaliza ciclos fora da faixa de referência, com motivo descritivo", () => {
    const s = summarizeCycles(IRREGULAR_CYCLES);
    expect(s[1]).toMatchObject({
      cycleLength: 40,
      irregular: true,
      irregularReason: "Ciclo mais longo que 35 dias",
    });
    expect(s[3]).toMatchObject({
      cycleLength: 19,
      irregular: true,
      irregularReason: "Ciclo mais curto que 21 dias",
    });
  });

  it("[UT-STA-07] sinaliza sangramento maior que 8 dias", () => {
    const s = summarizeCycles([{ id: "a", start_date: "2026-01-01", end_date: "2026-01-10" }]);
    expect(s[0]!.irregularReason).toBe("Sangramento registrado por mais de 8 dias");
  });

  it("[UT-STA-08] agrega sintomas e humor dentro de cada ciclo", () => {
    const s = summarizeCycles(REGULAR_CYCLES, CRAMP_LOGS, MOOD_HISTORY);
    expect(s[0]!.topSymptoms[0]).toMatchObject({ value: "cramps", count: 2 });
    expect(s[0]!.loggedDays).toBe(3);
    expect(s[0]!.averageMoodValence).not.toBeNull();
  });
});

describe("frequências e séries", () => {
  it("[UT-STA-09] frequência de sintomas ordenada e com percentual sobre dias registrados", () => {
    const f = symptomFrequency(CRAMP_LOGS);
    expect(f[0]).toMatchObject({ value: "cramps", count: 10, share: 100 });
    expect(f[1]).toMatchObject({ value: "fatigue", count: 5, share: 50 });
  });
  it("[UT-STA-10] sem registros → frequência vazia", () => {
    expect(symptomFrequency([])).toEqual([]);
  });
  it("[UT-STA-11] série de humor ignora dias sem humor reconhecido", () => {
    const series = moodSeries([
      moodLog("2026-01-02", ["happy"]),
      moodLog("2026-01-01", ["sad", "calm"]),
      moodLog("2026-01-03", ["???"]),
    ]);
    expect(series).toEqual([
      { date: "2026-01-01", valence: -0.5, intensity: null },
      { date: "2026-01-02", valence: 2, intensity: null },
    ]);
  });
  it("[UT-STA-12] frequência de humores", () => {
    expect(moodFrequency(MOOD_HISTORY)[0]).toEqual({ value: "tired", count: 10 });
  });
  it("[UT-STA-13] séries e médias de métricas", () => {
    expect(metricSeries(CRAMP_LOGS, "cramps").slice(0, 2)).toEqual([
      { date: "2026-05-01", value: 3 },
      { date: "2026-05-02", value: 2 },
    ]);
    expect(averageMetrics(CRAMP_LOGS)).toEqual({ cramps: 2.5, energy: 2.5 });
  });
});

describe("filtros e relatório por período", () => {
  it("[UT-STA-14] início de cada período", () => {
    expect(periodStart("3m", "2026-11-11")).toBe("2026-08-12");
    expect(periodStart("all", "2026-11-11")).toBeNull();
  });
  it("[UT-STA-15] filtro por data inclui as bordas", () => {
    const rows = [dailyLog("2026-01-01"), dailyLog("2026-01-05"), dailyLog("2026-01-10")];
    expect(filterByDate(rows, "2026-01-05", "2026-01-10").map((r) => r.log_date)).toEqual([
      "2026-01-05",
      "2026-01-10",
    ]);
  });
  it("[UT-STA-16] relatório usa apenas registros do período", () => {
    const r = buildPeriodReport(REGULAR_CYCLES, CRAMP_LOGS, MOOD_HISTORY, "all", "2026-09-01");
    expect(r.cyclesStarted).toBe(5);
    expect(r.completeCycles).toBe(4);
    expect(r.cycleLength.mean).toBe(28);
    expect(r.variability).toBe(0);
    expect(r.periodLength.mean).toBe(5);
    expect(r.loggedDays).toBe(10);
    const short = buildPeriodReport(REGULAR_CYCLES, CRAMP_LOGS, MOOD_HISTORY, "3m", "2026-09-01");
    expect(short.cyclesStarted).toBeLessThan(5);
  });
  it("[UT-STA-17] relatório vazio sem dados não inventa números", () => {
    const r = buildPeriodReport([], [], [], "6m", "2026-11-11");
    expect(r.cycleLength.mean).toBeNull();
    expect(r.variability).toBeNull();
    expect(r.topSymptoms).toEqual([]);
  });
  it("[UT-STA-18] sequência de dias registrados", () => {
    expect(loggingStreak(["2026-11-11", "2026-11-10", "2026-11-08"], "2026-11-11")).toBe(2);
    expect(loggingStreak(["2026-11-10", "2026-11-09"], "2026-11-11")).toBe(2);
    expect(loggingStreak([], "2026-11-11")).toBe(0);
  });
});
