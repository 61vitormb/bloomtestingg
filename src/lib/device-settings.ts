/**
 * Preferências deste aparelho (aparência, sons, lembretes, privacidade na tela).
 * Ficam no armazenamento local porque dizem respeito ao dispositivo, não à conta,
 * e não contêm dados de saúde. A preferência mestre de notificações também é
 * sincronizada na nuvem (user_preferences.notifications_enabled).
 */
import { useSyncExternalStore } from "react";
import {
  DEFAULT_REMINDER_SETTINGS,
  normalizeReminderSettings,
  type ReminderSettings,
} from "@/domain/reminders";
import { DEFAULT_SOUND_SETTINGS, normalizeSoundSettings, type SoundSettings } from "@/domain/sound";

export type ThemeMode = "system" | "light" | "dark";

export interface DeviceSettings {
  theme: ThemeMode;
  reduceMotion: boolean;
  /** Oculta números do ciclo na tela inicial (útil em locais públicos). */
  discreet: boolean;
  sound: SoundSettings;
  reminders: ReminderSettings;
  /** Registro do consentimento de tratamento de dados (LGPD). */
  consentAt: string | null;
}

export const DEFAULT_DEVICE_SETTINGS: DeviceSettings = {
  theme: "system",
  reduceMotion: false,
  discreet: false,
  sound: DEFAULT_SOUND_SETTINGS,
  reminders: DEFAULT_REMINDER_SETTINGS,
  consentAt: null,
};

const STORAGE_KEY = "bloom:device-settings:v1";

export function normalizeDeviceSettings(raw: unknown): DeviceSettings {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_DEVICE_SETTINGS);
  const r = raw as Partial<DeviceSettings>;
  return {
    theme: r.theme === "light" || r.theme === "dark" ? r.theme : "system",
    reduceMotion: r.reduceMotion === true,
    discreet: r.discreet === true,
    sound: normalizeSoundSettings(r.sound),
    reminders: normalizeReminderSettings(r.reminders),
    consentAt: typeof r.consentAt === "string" ? r.consentAt : null,
  };
}

let cache: DeviceSettings | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readDeviceSettings(): DeviceSettings {
  if (cache) return cache;
  const raw = storage()?.getItem(STORAGE_KEY);
  try {
    cache = normalizeDeviceSettings(raw ? JSON.parse(raw) : null);
  } catch {
    cache = structuredClone(DEFAULT_DEVICE_SETTINGS);
  }
  return cache;
}

export function writeDeviceSettings(update: Partial<DeviceSettings>): DeviceSettings {
  const next = normalizeDeviceSettings({ ...readDeviceSettings(), ...update });
  cache = next;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* armazenamento indisponível (modo privado): mantém só em memória */
  }
  applyAppearance(next);
  listeners.forEach((l) => l());
  return next;
}

export function resetDeviceSettings(): void {
  cache = null;
  try {
    storage()?.removeItem(STORAGE_KEY);
    storage()?.removeItem("bloom:fired-reminders");
  } catch {
    /* ignora */
  }
  applyAppearance(readDeviceSettings());
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverSnapshot = DEFAULT_DEVICE_SETTINGS;

export function useDeviceSettings(): DeviceSettings {
  return useSyncExternalStore(subscribe, readDeviceSettings, () => serverSnapshot);
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): "light" | "dark" {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}

export function applyAppearance(settings: DeviceSettings = readDeviceSettings()): void {
  if (typeof document === "undefined") return;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const theme = resolveTheme(settings.theme, prefersDark);
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("reduce-motion", settings.reduceMotion);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#120c16" : "#fbf7f4");
}
