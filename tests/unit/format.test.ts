import { describe, expect, it } from "vitest";
import {
  formatDayMonth,
  formatLong,
  formatMonthYear,
  formatShort,
  formatWeekdayLong,
  greetingForNow,
  isoToLocalDate,
  pluralize,
  relativeDaysLabel,
  todayISO,
} from "@/lib/format";

describe("formatação de datas (fuso America/Sao_Paulo)", () => {
  it("[UT-FMT-01] o ambiente de teste está realmente em UTC-3 (pré-condição dos testes de regressão)", () => {
    // meia-noite UTC de 11/11 ainda é dia 10 no Brasil
    expect(new Date(Date.UTC(2026, 10, 11)).getDate()).toBe(10);
  });

  it("[UT-FMT-02] DEF-001: formatShort mostra o mesmo dia da data ISO", () => {
    expect(formatShort("2026-11-11")).toBe("11 de nov");
  });

  it("[UT-FMT-03] DEF-002: cabeçalho do calendário mostra o mês correto", () => {
    expect(formatMonthYear(2026, 10)).toBe("novembro de 2026");
    expect(formatMonthYear(2026, 0)).toBe("janeiro de 2026");
  });

  it("[UT-FMT-04] formatos longos, curtos e com dia da semana", () => {
    expect(formatLong("2026-01-01")).toBe("1 de janeiro de 2026");
    expect(formatWeekdayLong("2026-11-11")).toBe("quarta-feira, 11 de novembro");
    expect(formatDayMonth("2026-03-05")).toBe("05/03");
  });

  it("[UT-FMT-05] todayISO usa a data local do aparelho", () => {
    // 23h do dia 11 no Brasil já é dia 12 em UTC — deve continuar 11
    expect(todayISO(new Date(2026, 10, 11, 23, 30))).toBe("2026-11-11");
    expect(todayISO(new Date(2026, 10, 12, 0, 5))).toBe("2026-11-12");
  });

  it("[UT-FMT-06] isoToLocalDate cria data local ao meio-dia", () => {
    const d = isoToLocalDate("2026-02-28");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 1, 28, 12]);
  });
});

describe("textos auxiliares", () => {
  it.each([
    [0, "hoje"],
    [1, "amanhã"],
    [-1, "ontem"],
    [5, "em 5 dias"],
    [-3, "há 3 dias"],
  ])("[UT-FMT-07] relativeDaysLabel(%i) = %s", (n, label) => {
    expect(relativeDaysLabel(n)).toBe(label);
  });

  it("[UT-FMT-08] saudação conforme o horário, com e sem nome", () => {
    expect(greetingForNow(null, new Date(2026, 0, 1, 8))).toBe("Bom dia");
    expect(greetingForNow("Ana", new Date(2026, 0, 1, 14))).toBe("Boa tarde, Ana");
    expect(greetingForNow(undefined, new Date(2026, 0, 1, 20))).toBe("Boa noite");
    expect(greetingForNow(undefined, new Date(2026, 0, 1, 2))).toBe("Boa noite");
  });

  it("[UT-FMT-09] pluralize", () => {
    expect(pluralize(1, "dia", "dias")).toBe("1 dia");
    expect(pluralize(0, "dia", "dias")).toBe("0 dias");
  });
});
