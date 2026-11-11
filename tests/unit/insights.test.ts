import { describe, expect, it } from "vitest";
import { generateInsights } from "@/domain/insights";
import {
  CRAMP_LOGS,
  IRREGULAR_CYCLES,
  MOOD_HISTORY,
  REGULAR_CYCLES,
} from "@tests/fixtures/factories";

const FORBIDDEN =
  /diagn[oó]stic|doen[cç]a|s[ií]ndrome|tratamento|voc[eê] tem\b|endometriose|ovário policístico|sop\b/i;

describe("insights pessoais", () => {
  it("[UT-INS-01] sem dados não gera insights", () => {
    expect(generateInsights([], [], [])).toEqual([]);
  });

  it("[UT-INS-02] ciclos regulares: comparação, variação, sintoma recorrente e humor por fase", () => {
    const ids = generateInsights(REGULAR_CYCLES, CRAMP_LOGS, MOOD_HISTORY).map((i) => i.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "cycle-compare",
        "cycle-variation",
        "symptom-cramps",
        "mood-period",
        "habit-logs",
      ]),
    );
  });

  it("[UT-INS-03] sintoma recorrente informa a faixa de dias do ciclo", () => {
    const i = generateInsights(REGULAR_CYCLES, CRAMP_LOGS, MOOD_HISTORY).find(
      (x) => x.id === "symptom-cramps",
    )!;
    expect(i.body).toContain("entre o dia 1 e o dia 2");
  });

  it("[UT-INS-04] ciclos irregulares geram aviso de variação alta", () => {
    const v = generateInsights(IRREGULAR_CYCLES, [], []).find((x) => x.id === "cycle-variation")!;
    expect(v.title).toBe("Seus ciclos variam bastante");
    expect(v.body).toContain("Entre 19 e 40 dias");
  });

  it("[UT-INS-05] um único ciclo completo não gera padrão", () => {
    expect(generateInsights(REGULAR_CYCLES.slice(0, 2), [], [])).toEqual([]);
  });

  it("[UT-INS-06] nenhum insight usa linguagem de diagnóstico e todos informam a base", () => {
    for (const i of generateInsights(IRREGULAR_CYCLES, CRAMP_LOGS, MOOD_HISTORY)) {
      expect(`${i.title} ${i.body}`).not.toMatch(FORBIDDEN);
      expect(i.basedOn.length).toBeGreaterThan(0);
    }
  });
});

describe("regressão de texto", () => {
  it("[UT-INS-07] ciclos de mesma duração não geram texto 'entre 28 e 28 dias'", () => {
    const v = generateInsights(REGULAR_CYCLES, [], []).find((x) => x.id === "cycle-variation")!;
    expect(v.body).toContain("Todos os 4 ciclos completos duraram 28 dias.");
    expect(v.body).not.toContain("Entre 28 e 28");
  });
});
