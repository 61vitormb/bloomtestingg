import { describe, expect, it } from "vitest";
import {
  decodeSymptoms,
  encodeSymptoms,
  hasAnyContent,
  isValidMetric,
  metricLabel,
  sanitizeStoredSymptoms,
} from "@/domain/metrics";

describe("métricas do registro diário", () => {
  it("[UT-MET-01] codifica e decodifica sem perda (ida e volta)", () => {
    const input = {
      physical: ["cramps", "headache"],
      emotional: ["anxiety"],
      metrics: { cramps: 2, pain: 0, energy: 4, sleep_quality: 3, sleep_hours: 7.5 },
    };
    const stored = encodeSymptoms(input);
    expect(decodeSymptoms(stored)).toEqual(input);
  });

  it("[UT-MET-02] mantém compatibilidade com registros antigos (só sintomas simples)", () => {
    expect(decodeSymptoms(["cramps", "acne"])).toEqual({
      physical: ["cramps", "acne"],
      emotional: [],
      metrics: {},
    });
  });

  it("[UT-MET-03] descarta valores desconhecidos, duplicados e fora de faixa", () => {
    const decoded = decodeSymptoms([
      "cramps",
      "cramps",
      "<script>",
      "e:hacker",
      "m:energy:9",
      "m:sleep_hours:7.3",
      "m:x:1",
      "m:pain:-1",
    ]);
    expect(decoded).toEqual({ physical: ["cramps"], emotional: [], metrics: {} });
  });

  it.each([
    ["cramps", 0, true],
    ["cramps", 3, true],
    ["cramps", 4, false],
    ["energy", 0, false],
    ["energy", 5, true],
    ["sleep_hours", 0, true],
    ["sleep_hours", 16, true],
    ["sleep_hours", 16.5, false],
    ["sleep_hours", 6.5, true],
    ["sleep_hours", Number.NaN, false],
    ["unknown", 1, false],
  ])("[UT-MET-04] isValidMetric(%s, %d) = %s", (key, value, expected) => {
    expect(isValidMetric(key, value)).toBe(expected);
  });

  it("[UT-MET-05] encodeSymptoms ignora métricas inválidas e entradas vazias", () => {
    expect(encodeSymptoms({})).toEqual([]);
    expect(encodeSymptoms({ physical: ["nope"], metrics: { energy: 10 } })).toEqual([]);
  });

  it("[UT-MET-06] sanitizeStoredSymptoms normaliza listas vindas do cliente", () => {
    expect(sanitizeStoredSymptoms(["m:energy:3", "cramps", "e:stress", "lixo"])).toEqual([
      "cramps",
      "e:stress",
      "m:energy:3",
    ]);
  });

  it("[UT-MET-07] rótulos legíveis", () => {
    expect(metricLabel("energy", 5)).toBe("Alta");
    expect(metricLabel("cramps", 0)).toBe("Sem");
    expect(metricLabel("sleep_hours", 7.5)).toBe("7,5 h");
  });

  it("[UT-MET-08] hasAnyContent", () => {
    expect(hasAnyContent(decodeSymptoms([]))).toBe(false);
    expect(hasAnyContent(decodeSymptoms(["m:energy:1"]))).toBe(true);
  });

  it("[UT-MET-09] tolera entrada nula ou com tipos inesperados", () => {
    expect(decodeSymptoms(null).physical).toEqual([]);
    expect(decodeSymptoms([42 as unknown as string]).physical).toEqual([]);
  });
});
