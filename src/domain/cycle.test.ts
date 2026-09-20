import { describe, expect, it } from "vitest";
import {
  addDays,
  averageCycleLength,
  averagePeriodLength,
  cycleLengths,
  currentCycleDay,
  cycleVariability,
  diffInDays,
  nextPeriodPrediction,
  phaseForCycleDay,
  predictedPeriodDays,
  validateCycleEntry,
  type CycleRecord,
} from "./cycle";

const cycles: CycleRecord[] = [
  { id: "1", start_date: "2024-01-01", end_date: "2024-01-05" },
  { id: "2", start_date: "2024-01-29", end_date: "2024-02-02" },
  { id: "3", start_date: "2024-02-26", end_date: "2024-03-01" },
];

describe("datas", () => {
  it("soma dias atravessando o mês", () => {
    expect(addDays("2024-01-30", 3)).toBe("2024-02-02");
  });

  it("conta a diferença em dias", () => {
    expect(diffInDays("2024-01-01", "2024-01-29")).toBe(28);
  });
});

describe("médias do ciclo", () => {
  it("calcula as durações entre menstruações", () => {
    expect(cycleLengths(cycles)).toEqual([28, 28]);
  });

  it("usa os ciclos registrados em vez do valor de referência", () => {
    const average = averageCycleLength(cycles, 30);
    expect(average.value).toBe(28);
    expect(average.isFallback).toBe(false);
  });

  it("volta para o valor informado quando não há ciclos", () => {
    const average = averageCycleLength([], 31);
    expect(average.value).toBe(31);
    expect(average.isFallback).toBe(true);
  });

  it("calcula a duração média do sangramento", () => {
    expect(averagePeriodLength(cycles, null).value).toBe(5);
  });

  it("mede a variação entre ciclos", () => {
    expect(cycleVariability(cycles)).toBe(0);
  });
});

describe("previsões", () => {
  it("prevê a próxima menstruação a partir do último início", () => {
    const prediction = nextPeriodPrediction(cycles, {
      cycleLength: null,
      periodLength: null,
    });
    expect(prediction?.startDate).toBe("2024-03-25");
  });

  it("marca os dias estimados de menstruação", () => {
    const days = predictedPeriodDays(cycles, { cycleLength: null, periodLength: null });
    expect(days[0]).toBe("2024-03-25");
    expect(days).toHaveLength(5);
  });

  it("calcula o dia atual do ciclo", () => {
    expect(currentCycleDay(cycles, "2024-03-01")).toBe(5);
  });

  it("não devolve previsão sem nenhum ciclo", () => {
    expect(nextPeriodPrediction([], { cycleLength: null, periodLength: null })).toBeNull();
  });
});

describe("fases", () => {
  it("classifica o primeiro dia como menstrual", () => {
    expect(phaseForCycleDay(1, 28, 5)).toBe("menstrual");
  });

  it("classifica a fase lútea depois da ovulação", () => {
    expect(phaseForCycleDay(24, 28, 5)).toBe("luteal");
  });
});

describe("validação de registros", () => {
  it("rejeita datas futuras", () => {
    const issues = validateCycleEntry(
      { start_date: "2024-04-10", end_date: null },
      cycles,
      "2024-03-10",
    );
    expect(issues.some((issue) => issue.level === "error")).toBe(true);
  });

  it("rejeita fim antes do início", () => {
    const issues = validateCycleEntry(
      { start_date: "2024-03-05", end_date: "2024-03-01" },
      [],
      "2024-03-10",
    );
    expect(issues.some((issue) => issue.level === "error")).toBe(true);
  });

  it("aceita ciclos irregulares apenas com aviso", () => {
    const issues = validateCycleEntry(
      { start_date: "2024-03-08", end_date: "2024-03-12" },
      [{ id: "a", start_date: "2024-01-01", end_date: "2024-01-05" }],
      "2024-03-20",
    );
    expect(issues.some((issue) => issue.level === "error")).toBe(false);
  });
});
