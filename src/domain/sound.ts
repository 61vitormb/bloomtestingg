/**
 * Identidade sonora do Bloom: pequenos timbres sintetizados (sem arquivos de áudio),
 * inspirados em sinos de vento e gotas. Sons são opcionais e desligados por padrão.
 * Nenhum som toca ao abrir o app — apenas em resposta a uma ação da usuária.
 */

export type SoundEvent = "tap" | "toggle" | "save" | "complete" | "milestone" | "error";

export interface SoundSettings {
  enabled: boolean;
  /** 0 a 1 */
  volume: number;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = { enabled: false, volume: 0.5 };

export interface Note {
  /** Frequência em Hz */
  freq: number;
  /** Início relativo, em segundos */
  at: number;
  /** Duração, em segundos */
  dur: number;
  /** Ganho relativo (0–1) */
  gain: number;
  type: "sine" | "triangle";
}

// Escala pentatônica em Dó (soa sempre "consonante" — sem notas que se chocam)
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;
const E6 = 1318.51;

export const SOUND_RECIPES: Record<SoundEvent, Note[]> = {
  tap: [{ freq: E6, at: 0, dur: 0.06, gain: 0.25, type: "sine" }],
  toggle: [{ freq: A5, at: 0, dur: 0.08, gain: 0.3, type: "sine" }],
  save: [
    { freq: E5, at: 0, dur: 0.18, gain: 0.45, type: "sine" },
    { freq: G5, at: 0.09, dur: 0.24, gain: 0.4, type: "sine" },
  ],
  complete: [
    { freq: C5, at: 0, dur: 0.22, gain: 0.4, type: "triangle" },
    { freq: E5, at: 0.08, dur: 0.22, gain: 0.38, type: "sine" },
    { freq: G5, at: 0.16, dur: 0.32, gain: 0.36, type: "sine" },
  ],
  milestone: [
    { freq: C5, at: 0, dur: 0.25, gain: 0.35, type: "triangle" },
    { freq: E5, at: 0.1, dur: 0.25, gain: 0.35, type: "sine" },
    { freq: G5, at: 0.2, dur: 0.25, gain: 0.35, type: "sine" },
    { freq: C6, at: 0.3, dur: 0.5, gain: 0.32, type: "sine" },
  ],
  error: [
    { freq: D5, at: 0, dur: 0.14, gain: 0.35, type: "triangle" },
    { freq: C5, at: 0.12, dur: 0.22, gain: 0.3, type: "triangle" },
  ],
};

export function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) return DEFAULT_SOUND_SETTINGS.volume;
  return Math.min(1, Math.max(0, volume));
}

export function normalizeSoundSettings(raw: unknown): SoundSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SOUND_SETTINGS };
  const r = raw as Partial<SoundSettings>;
  return { enabled: r.enabled === true, volume: clampVolume(Number(r.volume)) };
}

/** Notas a tocar para um evento, já com o volume aplicado. Lista vazia = silêncio. */
export function notesFor(event: SoundEvent, settings: SoundSettings): Note[] {
  if (!settings.enabled || settings.volume <= 0) return [];
  const volume = clampVolume(settings.volume);
  return SOUND_RECIPES[event].map((n) => ({ ...n, gain: n.gain * volume }));
}
