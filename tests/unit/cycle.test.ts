import { describe, expect, it } from "vitest";
import {
  addDays,
  cycleDayForDate,
  isValidISODate,
  parseISODate,
  projectCycles,
  recordedPeriodDays,
  startOfWeekISO,
  weekdayOf,
  buildCycleOverview,
  periodLengths,
  MAX_PLAUSIBLE_CYCLE_LENGTH,
  MIN_PLAUSIBLE_CYCLE_LENGTH,
  averageCycleLength,
  averagePeriodLength,
  cycleLengths,
  cycleVariability,
  currentCycleDay,
  diffInDays,
  estimatePhase,
  predictNextPeriod,
  predictedPeriodDays,
  validateCycleEntry,
  type CycleRecord,
} from "@/domain/cycle";

const cycles: CycleRecord[] = [
  { id: "1", start_date: "2024-01-01", end_date: "2024-01-05" },
  { id: "2", start_date: "2024-01-29", end_date: "2024-02-02" },
  { id: "3", start_date: "2024-02-26", end_date: "2024-03-01" },
];

describe("datas", () => {
  it("[UT-CYC-01] soma dias atravessando o mês", () => {
    expect(addDays("2024-01-30", 3)).toBe("2024-02-02");
  });

  it("[UT-CYC-02] conta a diferença em dias", () => {
    expect(diffInDays("2024-01-01", "2024-01-29")).toBe(28);
  });
});

describe("médias do ciclo", () => {
  it("[UT-CYC-03] calcula as durações entre menstruações", () => {
    expect(cycleLengths(cycles)).toEqual([28, 28]);
  });

  it("[UT-CYC-04] usa os ciclos registrados em vez do valor de referência", () => {
    const average = averageCycleLength(cycles, 30);
    expect(average.value).toBe(28);
    expect(average.isFallback).toBe(false);
  });

  it("[UT-CYC-05] volta para o valor informado quando não há ciclos", () => {
    const average = averageCycleLength([], 31);
    expect(average.value).toBe(31);
    expect(average.isFallback).toBe(true);
  });

  it("[UT-CYC-06] calcula a duração média do sangramento", () => {
    expect(averagePeriodLength(cycles, null).value).toBe(5);
  });

  it("[UT-CYC-07] mede a variação entre ciclos", () => {
    expect(cycleVariability(cycles)).toBe(0);
  });
});

describe("previsões", () => {
  it("[UT-CYC-08] prevê a próxima menstruação a partir do último início", () => {
    expect(predictNextPeriod(cycles, null)?.date).toBe("2024-03-25");
  });

  it("[UT-CYC-09] marca os dias estimados de menstruação", () => {
    const days = predictedPeriodDays(cycles, { cycleLength: null, periodLength: null }, 1);
    expect(days[0]).toBe("2024-03-25");
    expect(days).toHaveLength(5);
  });

  it("[UT-CYC-10] calcula o dia atual do ciclo", () => {
    expect(currentCycleDay(cycles, "2024-03-01")).toBe(5);
  });

  it("[UT-CYC-11] não devolve previsão sem nenhum ciclo", () => {
    expect(predictNextPeriod([], null)).toBeNull();
  });
});

describe("fases", () => {
  it("[UT-CYC-12] classifica o primeiro dia como menstrual", () => {
    expect(estimatePhase(1, 28, 5)).toBe("menstrual");
  });

  it("[UT-CYC-13] classifica a fase lútea depois da ovulação", () => {
    expect(estimatePhase(24, 28, 5)).toBe("luteal");
  });

  it("[UT-CYC-14] classifica a janela ovulatória estimada", () => {
    expect(estimatePhase(14, 28, 5)).toBe("ovulatory");
  });
});

describe("validação de registros", () => {
  it("[UT-CYC-15] rejeita datas futuras", () => {
    const issues = validateCycleEntry(
      { start_date: "2024-04-10", end_date: null },
      cycles,
      "2024-03-10",
    );
    expect(issues.some((issue) => issue.level === "error")).toBe(true);
  });

  it("[UT-CYC-16] rejeita fim antes do início", () => {
    const issues = validateCycleEntry(
      { start_date: "2024-03-05", end_date: "2024-03-01" },
      [],
      "2024-03-10",
    );
    expect(issues.some((issue) => issue.level === "error")).toBe(true);
  });

  it("[UT-CYC-17] rejeita duas menstruações no mesmo dia", () => {
    const issues = validateCycleEntry(
      { start_date: "2024-02-26", end_date: null },
      cycles,
      "2024-03-10",
    );
    expect(issues.some((issue) => issue.level === "error")).toBe(true);
  });

  it("[UT-CYC-18] aceita ciclos irregulares apenas com aviso", () => {
    const issues = validateCycleEntry(
      { start_date: "2024-03-08", end_date: "2024-03-12" },
      [{ id: "a", start_date: "2024-01-01", end_date: "2024-01-05" }],
      "2024-03-20",
    );
    expect(issues.some((issue) => issue.level === "error")).toBe(false);
  });
});

describe("datas — limites e fuso horário", () => {
  it("[UT-CYC-30] DEF-001: data ISO interpretada ao meio-dia UTC não muda de dia em UTC-3", () => {
    const d = parseISODate("2026-11-11");
    expect(d.getUTCHours()).toBe(12);
    // em America/Sao_Paulo (configurado no Vitest) o dia local continua 11
    expect(d.getDate()).toBe(11);
  });

  it("[UT-CYC-31] DEF-003: dia da semana independe do fuso (11/11/2026 é quarta-feira)", () => {
    expect(weekdayOf("2026-11-11")).toBe(3);
    expect(startOfWeekISO("2026-11-11")).toBe("2026-11-08");
  });

  it("[UT-CYC-32] soma dias atravessando ano bissexto", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("[UT-CYC-33] diferença negativa quando a data final é anterior", () => {
    expect(diffInDays("2026-03-10", "2026-03-01")).toBe(-9);
  });

  it.each([
    ["2026-02-30", false],
    ["2026-13-01", false],
    ["26-01-01", false],
    ["2026-1-1", false],
    ["", false],
    ["abc", false],
    ["2028-02-29", true],
    ["2026-02-29", false],
  ])("[UT-CYC-34] isValidISODate(%s) = %s", (value, expected) => {
    expect(isValidISODate(value)).toBe(expected);
  });
});

describe("durações — casos limite", () => {
  it("[UT-CYC-35] menstruação de um único dia tem duração 1", () => {
    expect(periodLengths([{ id: "x", start_date: "2026-01-01", end_date: "2026-01-01" }])).toEqual([
      1,
    ]);
  });

  it("[UT-CYC-36] ciclos fora da faixa plausível (15–90) não entram na média", () => {
    const records: CycleRecord[] = [
      { id: "1", start_date: "2026-01-01", end_date: null },
      { id: "2", start_date: "2026-01-11", end_date: null }, // 10 dias: implausível
      { id: "3", start_date: "2026-02-08", end_date: null }, // 28 dias
    ];
    const avg = averageCycleLength(records);
    expect(avg.value).toBe(28);
    expect(avg.sampleSize).toBe(1);
  });

  it("[UT-CYC-37] limites exatos 15 e 90 são aceitos na média", () => {
    expect(MIN_PLAUSIBLE_CYCLE_LENGTH).toBe(15);
    expect(MAX_PLAUSIBLE_CYCLE_LENGTH).toBe(90);
    const records: CycleRecord[] = [
      { id: "1", start_date: "2026-01-01", end_date: null },
      { id: "2", start_date: "2026-01-16", end_date: null }, // 15
      { id: "3", start_date: "2026-04-16", end_date: null }, // 90
    ];
    expect(averageCycleLength(records).sampleSize).toBe(2);
  });

  it("[UT-CYC-38] usa só os 6 ciclos mais recentes na média", () => {
    const starts = [
      "2025-01-01",
      "2025-03-02",
      "2025-03-30",
      "2025-04-27",
      "2025-05-25",
      "2025-06-22",
      "2025-07-20",
      "2025-08-17",
    ];
    const records = starts.map((s, i) => ({ id: String(i), start_date: s, end_date: null }));
    const avg = averageCycleLength(records);
    expect(avg.sampleSize).toBe(6);
    expect(avg.value).toBe(28); // o primeiro intervalo (60 dias) foi descartado
    expect(avg.confidence).toBe("high");
  });

  it("[UT-CYC-39] confiança cresce com o número de ciclos", () => {
    expect(averageCycleLength(cycles.slice(0, 2)).confidence).toBe("low");
    expect(averageCycleLength(cycles).confidence).toBe("medium");
  });
});

describe("visão geral e projeções", () => {
  it("[UT-CYC-40] overview sem registros não inventa dia do ciclo nem fase", () => {
    const o = buildCycleOverview([], "2026-11-11");
    expect(o.dayOfCycle).toBeNull();
    expect(o.phase).toBeNull();
    expect(o.nextPeriod).toBeNull();
    expect(o.cycleLength.isFallback).toBe(true);
  });

  it("[UT-CYC-41] overview usa o padrão declarado quando não há ciclos completos", () => {
    const o = buildCycleOverview(
      [{ id: "1", start_date: "2026-11-01", end_date: null }],
      "2026-11-11",
      { cycleLength: 32 },
    );
    expect(o.nextPeriod?.date).toBe("2026-12-03");
    expect(o.daysUntilNextPeriod).toBe(22);
    expect(o.dayOfCycle).toBe(11);
  });

  it("[UT-CYC-42] dias registrados: ciclo em aberto é limitado à duração média e a hoje", () => {
    const set = recordedPeriodDays(
      [{ id: "1", start_date: "2026-11-09", end_date: null }],
      "2026-11-11",
      5,
    );
    expect([...set].sort()).toEqual(["2026-11-09", "2026-11-10", "2026-11-11"]);
    const capped = recordedPeriodDays(
      [{ id: "1", start_date: "2026-10-01", end_date: null }],
      "2026-11-11",
      5,
    );
    expect(capped.size).toBe(5);
  });

  it("[UT-CYC-43] dias registrados incluem início e fim", () => {
    const set = recordedPeriodDays(cycles, "2024-04-01");
    expect(set.has("2024-01-01")).toBe(true);
    expect(set.has("2024-01-05")).toBe(true);
    expect(set.has("2024-01-06")).toBe(false);
  });

  it("[UT-CYC-44] dia do ciclo para datas passadas usa o início anterior mais próximo", () => {
    expect(cycleDayForDate(cycles, "2024-02-01")).toBe(4);
    expect(cycleDayForDate(cycles, "2023-12-31")).toBeNull();
  });

  it("[UT-CYC-45] projeções: janela fértil de 7 dias e ovulação 14 dias antes do próximo ciclo", () => {
    const [current, next] = projectCycles(cycles, {}, 2);
    expect(current!.periodDays).toEqual([]);
    expect(current!.fertileDays).toHaveLength(7);
    expect(current!.ovulationDay).toBe("2024-03-11");
    expect(next!.start).toBe("2024-03-25");
    expect(next!.periodDays).toHaveLength(5);
  });

  it("[UT-CYC-46] projeções vazias sem nenhum registro", () => {
    expect(projectCycles([], {}, 3)).toEqual([]);
  });
});

describe("validação — sobreposição e avisos", () => {
  it("[UT-CYC-47] rejeita início dentro de uma menstruação já registrada", () => {
    const issues = validateCycleEntry({ start_date: "2024-01-03" }, cycles, "2024-03-10");
    expect(issues).toContainEqual({
      level: "error",
      message: "Essa data está dentro de uma menstruação já registrada.",
    });
  });

  it("[UT-CYC-48] avisa (sem bloquear) sangramento maior que 15 dias", () => {
    const issues = validateCycleEntry(
      { start_date: "2024-05-01", end_date: "2024-05-20" },
      [],
      "2024-06-01",
    );
    expect(issues.map((i) => i.level)).toEqual(["warning"]);
  });

  it("[UT-CYC-49] avisa intervalo longo desde o ciclo anterior", () => {
    const issues = validateCycleEntry({ start_date: "2024-08-01" }, cycles, "2024-08-02");
    expect(issues.some((i) => i.level === "warning" && i.message.includes("intervalo longo"))).toBe(
      true,
    );
  });

  it("[UT-CYC-50] data de início inválida interrompe a validação com erro", () => {
    expect(validateCycleEntry({ start_date: "2024-02-31" }, [], "2024-03-01")).toEqual([
      { level: "error", message: "A data de início não é válida." },
    ]);
  });

  it("[UT-CYC-51] ao editar, o próprio ciclo é ignorado na checagem de duplicidade", () => {
    const issues = validateCycleEntry(
      { start_date: "2024-02-26", end_date: "2024-03-01" },
      cycles,
      "2024-03-10",
      "3",
    );
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });
});
