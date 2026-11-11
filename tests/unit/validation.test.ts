import { describe, expect, it } from "vitest";
import {
  credentialsSchema,
  cyclePreferencesSchema,
  cycleSchema,
  dailyLogSchema,
  firstError,
  moodLogSchema,
  parseOptionalInt,
  passwordChangeSchema,
  profileSchema,
  reminderSchema,
} from "@/domain/validation";

describe("validação de formulários", () => {
  it("[UT-VAL-01] registro diário válido normaliza observações vazias para null", () => {
    const r = dailyLogSchema.parse({
      log_date: "2026-11-11",
      flow_intensity: "light",
      symptoms: [],
      notes: "   ",
    });
    expect(r.notes).toBeNull();
  });
  it("[UT-VAL-02] registro diário rejeita data e fluxo inválidos", () => {
    expect(
      dailyLogSchema.safeParse({
        log_date: "2026-02-30",
        flow_intensity: null,
        symptoms: [],
        notes: null,
      }).success,
    ).toBe(false);
    expect(
      dailyLogSchema.safeParse({
        log_date: "2026-02-10",
        flow_intensity: "torrencial",
        symptoms: [],
        notes: null,
      }).success,
    ).toBe(false);
  });
  it("[UT-VAL-03] observações: 2000 caracteres aceitos, 2001 rejeitados", () => {
    const base = { log_date: "2026-11-11", flow_intensity: null, symptoms: [] };
    expect(dailyLogSchema.safeParse({ ...base, notes: "a".repeat(2000) }).success).toBe(true);
    const fail = dailyLogSchema.safeParse({ ...base, notes: "a".repeat(2001) });
    expect(fail.success).toBe(false);
    if (!fail.success) expect(firstError(fail.error)).toBe("Use no máximo 2000 caracteres.");
  });
  it("[UT-VAL-04] humor: valores fora do catálogo e intensidade fora de 1–5 são rejeitados", () => {
    expect(
      moodLogSchema.safeParse({
        log_date: "2026-11-11",
        moods: ["happy"],
        intensity: 5,
        notes: null,
      }).success,
    ).toBe(true);
    expect(
      moodLogSchema.safeParse({
        log_date: "2026-11-11",
        moods: ["furiosa"],
        intensity: null,
        notes: null,
      }).success,
    ).toBe(false);
    expect(
      moodLogSchema.safeParse({
        log_date: "2026-11-11",
        moods: ["happy"],
        intensity: 6,
        notes: null,
      }).success,
    ).toBe(false);
    expect(
      moodLogSchema.safeParse({
        log_date: "2026-11-11",
        moods: ["happy"],
        intensity: 0,
        notes: null,
      }).success,
    ).toBe(false);
    expect(
      moodLogSchema.safeParse({
        log_date: "2026-11-11",
        moods: ["happy"],
        intensity: 2.5,
        notes: null,
      }).success,
    ).toBe(false);
  });
  it("[UT-VAL-05] ciclo: fim antes do início é rejeitado", () => {
    const r = cycleSchema.safeParse({
      start_date: "2026-11-10",
      end_date: "2026-11-01",
      notes: null,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstError(r.error)).toBe("A data de fim é anterior à de início.");
  });
  it("[UT-VAL-06] preferências de ciclo: limites 15/90 e 1/15", () => {
    expect(
      cyclePreferencesSchema.safeParse({ average_cycle_length: 15, average_period_length: 1 })
        .success,
    ).toBe(true);
    expect(
      cyclePreferencesSchema.safeParse({ average_cycle_length: 90, average_period_length: 15 })
        .success,
    ).toBe(true);
    expect(
      cyclePreferencesSchema.safeParse({ average_cycle_length: 14, average_period_length: 5 })
        .success,
    ).toBe(false);
    expect(
      cyclePreferencesSchema.safeParse({ average_cycle_length: 91, average_period_length: 5 })
        .success,
    ).toBe(false);
    expect(
      cyclePreferencesSchema.safeParse({ average_cycle_length: 28, average_period_length: 16 })
        .success,
    ).toBe(false);
    expect(
      cyclePreferencesSchema.safeParse({ average_cycle_length: 28.5, average_period_length: 5 })
        .success,
    ).toBe(false);
    expect(
      cyclePreferencesSchema.safeParse({ average_cycle_length: null, average_period_length: null })
        .success,
    ).toBe(true);
  });
  it("[UT-VAL-07] credenciais: e-mail inválido e senha curta", () => {
    expect(credentialsSchema.safeParse({ email: "ana@", password: "12345678" }).success).toBe(
      false,
    );
    expect(
      credentialsSchema.safeParse({ email: "ana@bloom.test", password: "1234567" }).success,
    ).toBe(false);
    expect(
      credentialsSchema.safeParse({ email: " ana@bloom.test ", password: "12345678" }).success,
    ).toBe(true);
    expect(
      credentialsSchema.safeParse({ email: "ana@bloom.test", password: "x".repeat(73) }).success,
    ).toBe(false);
  });
  it("[UT-VAL-08] troca de senha exige letras, números e confirmação igual", () => {
    expect(
      passwordChangeSchema.safeParse({ password: "abcdefgh", confirm: "abcdefgh" }).success,
    ).toBe(false);
    expect(
      passwordChangeSchema.safeParse({ password: "abc12345", confirm: "abc12346" }).success,
    ).toBe(false);
    expect(
      passwordChangeSchema.safeParse({ password: "abc12345", confirm: "abc12345" }).success,
    ).toBe(true);
  });
  it("[UT-VAL-09] perfil: nome vazio vira null; nome longo é rejeitado", () => {
    expect(profileSchema.parse({ display_name: "   " }).display_name).toBeNull();
    expect(profileSchema.safeParse({ display_name: "a".repeat(81) }).success).toBe(false);
  });
  it("[UT-VAL-10] lembrete personalizado: horário, título e dias", () => {
    const ok = { id: "r1", title: "Água", time: "09:30", days: [1, 3], enabled: true };
    expect(reminderSchema.safeParse(ok).success).toBe(true);
    expect(reminderSchema.safeParse({ ...ok, time: "24:00" }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...ok, title: " " }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...ok, days: [] }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...ok, days: [7] }).success).toBe(false);
  });
  it("[UT-VAL-11] parseOptionalInt", () => {
    expect(parseOptionalInt("")).toBeNull();
    expect(parseOptionalInt(" 28 ")).toBe(28);
    expect(parseOptionalInt("abc")).toBeNaN();
  });
});
