import { describe, expect, it } from "vitest";
import { buildHistoryCsv, escapeCsvCell, exportFileName, toCsv } from "@/domain/export";

const data = {
  cycles: [
    { start_date: "2026-10-01", end_date: "2026-10-05", notes: null },
    { start_date: "2026-09-03", end_date: null, notes: "início tranquilo" },
  ],
  daily_logs: [
    {
      log_date: "2026-10-01",
      flow_intensity: "heavy",
      symptoms: ["cramps", "e:anxiety", "m:energy:2", "m:sleep_hours:6.5"],
      notes: "dia; difícil",
    },
    { log_date: "2026-11-20", flow_intensity: null, symptoms: [], notes: "fora do período" },
  ],
  mood_logs: [{ log_date: "2026-10-01", moods: ["tired", "sad"], intensity: 4, notes: null }],
};

describe("exportação", () => {
  it("[UT-EXP-01] protege contra injeção de fórmula em planilhas", () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(escapeCsvCell("+1")).toBe("'+1");
    expect(escapeCsvCell("@SUM")).toBe("'@SUM");
    expect(escapeCsvCell("-2")).toBe("'-2");
  });
  it("[UT-EXP-02] escapa separador, aspas e quebra de linha", () => {
    expect(escapeCsvCell("a;b")).toBe('"a;b"');
    expect(escapeCsvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(escapeCsvCell("linha1\nlinha2")).toBe('"linha1\nlinha2"');
    expect(escapeCsvCell(null)).toBe("");
    expect(
      toCsv([
        ["a", 1],
        ["b", null],
      ]),
    ).toBe("a;1\r\nb;");
  });
  it("[UT-EXP-03] CSV do histórico traz rótulos legíveis e todas as categorias", () => {
    const csv = buildHistoryCsv(data);
    expect(csv.startsWith("﻿data;fluxo;")).toBe(true);
    const line = csv.split("\r\n").find((l) => l.startsWith("2026-10-01"))!;
    expect(line).toContain("Intenso");
    expect(line).toContain("Cólicas");
    expect(line).toContain("Ansiedade");
    expect(line).toContain("Baixa");
    expect(line).toContain("6,5 h");
    expect(line).toContain("Cansada, Triste");
    expect(line).toContain('"dia; difícil"');
    expect(csv).toContain("2026-09-03;;início tranquilo");
  });
  it("[UT-EXP-04] CSV respeita o filtro de período", () => {
    const csv = buildHistoryCsv(data, "2026-10-01", "2026-10-31");
    expect(csv).not.toContain("2026-11-20");
    expect(csv).not.toContain("2026-09-03");
  });
  it("[UT-EXP-05] CSV vazio mantém o cabeçalho", () => {
    const csv = buildHistoryCsv({ cycles: [], daily_logs: [], mood_logs: [] });
    expect(csv.split("\r\n")[0]).toContain("data;fluxo");
  });
  it("[UT-EXP-06] nome de arquivo previsível", () => {
    expect(exportFileName("json", "2026-11-11")).toBe("bloom-meus-dados-2026-11-11.json");
  });
});
