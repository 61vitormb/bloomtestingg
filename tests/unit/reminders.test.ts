import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMINDER_SETTINGS,
  dueReminders,
  normalizeReminderSettings,
  pruneFiredKeys,
  timeToMinutes,
  type ReminderSettings,
} from "@/domain/reminders";

const on: ReminderSettings = {
  dailyLog: { enabled: true, time: "20:00" },
  periodForecast: { enabled: true, daysBefore: 2, time: "09:00" },
  symptomCheck: { enabled: true, time: "13:00" },
  updates: { enabled: false },
  custom: [{ id: "agua", title: "Beber água", time: "10:00", days: [3], enabled: true }],
};
const ctx = {
  todayISO: "2026-11-11",
  nextPeriodDate: "2026-11-13",
  inPeriod: false,
  loggedToday: false,
};
// 11/11/2026 é quarta-feira (3)
const at = (h: number, m = 0) => new Date(2026, 10, 11, h, m);

describe("lembretes", () => {
  it("[UT-REM-01] tudo desligado por padrão", () => {
    expect(dueReminders(at(23), DEFAULT_REMINDER_SETTINGS, ctx, new Set())).toEqual([]);
  });
  it("[UT-REM-02] dispara somente depois do horário configurado", () => {
    expect(dueReminders(at(8, 59), on, ctx, new Set()).map((r) => r.key)).toEqual([]);
    expect(dueReminders(at(9, 0), on, ctx, new Set()).map((r) => r.key)).toEqual([
      "period-forecast:2026-11-11",
    ]);
  });
  it("[UT-REM-03] às 20h: registro diário, previsão e lembrete personalizado do dia", () => {
    const keys = dueReminders(at(20), on, ctx, new Set()).map((r) => r.key);
    expect(keys).toEqual([
      "daily-log:2026-11-11",
      "period-forecast:2026-11-11",
      "custom-agua:2026-11-11",
    ]);
  });
  it("[UT-REM-04] não repete lembretes já disparados no dia", () => {
    const fired = new Set([
      "daily-log:2026-11-11",
      "period-forecast:2026-11-11",
      "custom-agua:2026-11-11",
    ]);
    expect(dueReminders(at(21), on, ctx, fired)).toEqual([]);
  });
  it("[UT-REM-05] não lembra de registrar quem já registrou hoje", () => {
    const keys = dueReminders(at(21), on, { ...ctx, loggedToday: true }, new Set()).map(
      (r) => r.key,
    );
    expect(keys).not.toContain("daily-log:2026-11-11");
  });
  it("[UT-REM-06] previsão fora da antecedência não dispara; previsão no dia dispara com texto próprio", () => {
    expect(
      dueReminders(at(10), on, { ...ctx, nextPeriodDate: "2026-11-20" }, new Set()).some((r) =>
        r.key.startsWith("period"),
      ),
    ).toBe(false);
    const today = dueReminders(
      at(10),
      on,
      { ...ctx, nextPeriodDate: "2026-11-11" },
      new Set(),
    ).find((r) => r.key.startsWith("period"));
    expect(today?.title).toBe("Sua menstruação pode começar hoje");
    expect(today?.body).toContain("estimativa");
  });
  it("[UT-REM-07] sintomas só durante a menstruação", () => {
    expect(dueReminders(at(14), on, ctx, new Set()).some((r) => r.key.startsWith("symptom"))).toBe(
      false,
    );
    expect(
      dueReminders(at(14), on, { ...ctx, inPeriod: true }, new Set()).some((r) =>
        r.key.startsWith("symptom"),
      ),
    ).toBe(true);
  });
  it("[UT-REM-08] lembrete personalizado respeita o dia da semana", () => {
    const thursday = new Date(2026, 10, 12, 11);
    expect(
      dueReminders(thursday, on, { ...ctx, todayISO: "2026-11-12" }, new Set()).some((r) =>
        r.key.startsWith("custom"),
      ),
    ).toBe(false);
  });
  it.each([
    ["00:00", 0],
    ["23:59", 1439],
    ["24:00", null],
    ["9:00", null],
    ["aa:bb", null],
  ])("[UT-REM-09] timeToMinutes(%s) = %s", (t, v) => {
    expect(timeToMinutes(t)).toBe(v);
  });
  it("[UT-REM-10] normaliza configurações corrompidas sem quebrar", () => {
    expect(normalizeReminderSettings(null)).toEqual(DEFAULT_REMINDER_SETTINGS);
    const n = normalizeReminderSettings({
      dailyLog: { enabled: "sim", time: "99:99" },
      periodForecast: { enabled: true, daysBefore: 50, time: "08:00" },
      custom: [
        { id: "x", title: "", time: "10:00", days: [1] },
        { id: "y", title: "Ok", time: "10:00", days: [1, 9], enabled: 1 },
      ],
    });
    expect(n.dailyLog).toEqual({ enabled: true, time: "20:00" });
    expect(n.periodForecast.daysBefore).toBe(2);
    expect(n.custom).toEqual([{ id: "y", title: "Ok", time: "10:00", days: [1], enabled: true }]);
  });
  it("[UT-REM-11] limpeza das chaves antigas", () => {
    expect(pruneFiredKeys(["a:2026-11-01", "b:2026-11-10", "lixo"], "2026-11-11")).toEqual([
      "b:2026-11-10",
    ]);
  });
});
