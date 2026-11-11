import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOUND_SETTINGS,
  SOUND_RECIPES,
  clampVolume,
  normalizeSoundSettings,
  notesFor,
} from "@/domain/sound";
import { contextualMessage } from "@/domain/messages";
import { buildCycleOverview } from "@/domain/cycle";
import { ARTICLES, CONTENT_CATEGORIES, articlesByCategory, findArticle } from "@/domain/content";
import {
  DEFAULT_DEVICE_SETTINGS,
  normalizeDeviceSettings,
  resolveTheme,
} from "@/lib/device-settings";

describe("identidade sonora", () => {
  it("[UT-SND-01] sons vêm desligados por padrão (nada toca sem consentimento)", () => {
    expect(DEFAULT_SOUND_SETTINGS.enabled).toBe(false);
    expect(notesFor("complete", DEFAULT_SOUND_SETTINGS)).toEqual([]);
  });
  it("[UT-SND-02] volume zero é silêncio; volume aplica proporcionalmente", () => {
    expect(notesFor("save", { enabled: true, volume: 0 })).toEqual([]);
    const half = notesFor("save", { enabled: true, volume: 0.5 });
    expect(half[0]!.gain).toBeCloseTo(SOUND_RECIPES.save[0]!.gain * 0.5);
  });
  it("[UT-SND-03] volume é limitado a 0–1 e valores inválidos voltam ao padrão", () => {
    expect(clampVolume(3)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(Number.NaN)).toBe(0.5);
    expect(normalizeSoundSettings({ enabled: "true", volume: "x" })).toEqual({
      enabled: false,
      volume: 0.5,
    });
  });
  it("[UT-SND-04] todos os eventos têm notas audíveis e curtas (< 1 s)", () => {
    for (const notes of Object.values(SOUND_RECIPES)) {
      expect(notes.length).toBeGreaterThan(0);
      for (const n of notes) expect(n.at + n.dur).toBeLessThan(1);
    }
  });
});

describe("mensagens contextuais", () => {
  it("[UT-MSG-01] sem registros convida a registrar", () => {
    expect(contextualMessage(buildCycleOverview([], "2026-11-11"), false).title).toBe(
      "Vamos começar pelo seu ciclo",
    );
  });
  it("[UT-MSG-02] durante a menstruação", () => {
    const o = buildCycleOverview(
      [{ id: "1", start_date: "2026-11-10", end_date: null }],
      "2026-11-11",
    );
    expect(contextualMessage(o, false).title).toBe("Cuide-se no seu ritmo");
  });
  it("[UT-MSG-03] previsão próxima é apresentada como estimativa", () => {
    const o = buildCycleOverview(
      [{ id: "1", start_date: "2026-10-16", end_date: "2026-10-20" }],
      "2026-11-11",
    );
    const m = contextualMessage(o, false);
    expect(m.title).toBe("Sua menstruação pode estar chegando");
    expect(m.body).toContain("estimativa");
  });
  it("[UT-MSG-04] previsão vencida fala de variação, sem alarmismo", () => {
    const o = buildCycleOverview(
      [{ id: "1", start_date: "2026-10-01", end_date: "2026-10-05" }],
      "2026-11-11",
    );
    expect(contextualMessage(o, false).title).toMatch(/^Previsão passou há \d+ dias$/);
  });
  it("[UT-MSG-05] janela fértil lembra que não é contraceptivo", () => {
    const o = buildCycleOverview(
      [{ id: "1", start_date: "2026-10-29", end_date: "2026-11-02" }],
      "2026-11-11",
    );
    expect(contextualMessage(o, true).body).toContain("não é um método contraceptivo");
  });
});

describe("central de informações", () => {
  it("[UT-CNT-01] todos os artigos têm categoria válida, seções e ids únicos", () => {
    const ids = new Set(ARTICLES.map((a) => a.id));
    expect(ids.size).toBe(ARTICLES.length);
    for (const a of ARTICLES) {
      expect(CONTENT_CATEGORIES.map((c) => c.value)).toContain(a.category);
      expect(a.sections.length).toBeGreaterThan(0);
    }
  });
  it("[UT-CNT-02] linguagem responsável: não promete diagnóstico nem contracepção", () => {
    const text = ARTICLES.flatMap((a) => [
      a.title,
      a.summary,
      ...a.sections.map((s) => s.body),
    ]).join(" ");
    expect(text).not.toMatch(/\bgarant(e|ido)\b|100% (seguro|eficaz)|evita a gravidez|\bcura\b/i);
    expect(
      findArticle("previsoes")!.sections.some((s) =>
        s.body.includes("não deve ser usado para evitar"),
      ),
    ).toBe(true);
  });
  it("[UT-CNT-03] filtro por categoria", () => {
    expect(articlesByCategory("all")).toHaveLength(ARTICLES.length);
    expect(articlesByCategory("bloom").every((a) => a.category === "bloom")).toBe(true);
  });
});

describe("preferências do aparelho", () => {
  it("[UT-DEV-01] padrões seguros: sons e lembretes desligados, tema do sistema", () => {
    expect(DEFAULT_DEVICE_SETTINGS.sound.enabled).toBe(false);
    expect(DEFAULT_DEVICE_SETTINGS.reminders.dailyLog.enabled).toBe(false);
    expect(DEFAULT_DEVICE_SETTINGS.theme).toBe("system");
  });
  it("[UT-DEV-02] normaliza armazenamento corrompido", () => {
    const n = normalizeDeviceSettings({
      theme: "neon",
      reduceMotion: "yes",
      sound: { enabled: true, volume: 2 },
    });
    expect(n.theme).toBe("system");
    expect(n.reduceMotion).toBe(false);
    expect(n.sound).toEqual({ enabled: true, volume: 1 });
  });
  it("[UT-DEV-03] tema resolvido a partir do sistema", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
});
