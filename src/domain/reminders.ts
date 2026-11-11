/**
 * Lembretes e notificações (todos opcionais e desligados por padrão).
 *
 * Funcionamento: o app verifica periodicamente quais lembretes venceram e os
 * dispara como notificação do sistema (se a usuária permitir) ou aviso dentro do app.
 * Limitação documentada (LIM-03): sem um servidor de push, os lembretes só disparam
 * enquanto o Bloom estiver aberto (inclusive em segundo plano no navegador).
 */
import { diffInDays } from "./cycle";

export interface CustomReminder {
  id: string;
  title: string;
  time: string; // HH:mm
  days: number[]; // 0 = domingo
  enabled: boolean;
}

export interface ReminderSettings {
  dailyLog: { enabled: boolean; time: string };
  periodForecast: { enabled: boolean; daysBefore: number; time: string };
  symptomCheck: { enabled: boolean; time: string };
  updates: { enabled: boolean };
  custom: CustomReminder[];
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  dailyLog: { enabled: false, time: "20:00" },
  periodForecast: { enabled: false, daysBefore: 2, time: "09:00" },
  symptomCheck: { enabled: false, time: "13:00" },
  updates: { enabled: false },
  custom: [],
};

export interface ReminderContext {
  todayISO: string;
  /** Data estimada da próxima menstruação, se houver. */
  nextPeriodDate: string | null;
  inPeriod: boolean;
  loggedToday: boolean;
}

export interface DueReminder {
  key: string;
  title: string;
  body: string;
}

export function timeToMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Mescla configurações salvas com o padrão, descartando valores inválidos. */
export function normalizeReminderSettings(raw: unknown): ReminderSettings {
  const base = structuredClone(DEFAULT_REMINDER_SETTINGS);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<ReminderSettings>;
  const validTime = (t: unknown, fallback: string) =>
    typeof t === "string" && timeToMinutes(t) !== null ? t : fallback;
  if (r.dailyLog) {
    base.dailyLog = {
      enabled: Boolean(r.dailyLog.enabled),
      time: validTime(r.dailyLog.time, base.dailyLog.time),
    };
  }
  if (r.periodForecast) {
    const d = Number(r.periodForecast.daysBefore);
    base.periodForecast = {
      enabled: Boolean(r.periodForecast.enabled),
      daysBefore: Number.isInteger(d) && d >= 0 && d <= 7 ? d : base.periodForecast.daysBefore,
      time: validTime(r.periodForecast.time, base.periodForecast.time),
    };
  }
  if (r.symptomCheck) {
    base.symptomCheck = {
      enabled: Boolean(r.symptomCheck.enabled),
      time: validTime(r.symptomCheck.time, base.symptomCheck.time),
    };
  }
  if (r.updates) base.updates = { enabled: Boolean(r.updates.enabled) };
  if (Array.isArray(r.custom)) {
    base.custom = r.custom
      .filter(
        (c): c is CustomReminder =>
          !!c &&
          typeof c.id === "string" &&
          typeof c.title === "string" &&
          c.title.trim().length > 0 &&
          timeToMinutes(c.time) !== null &&
          Array.isArray(c.days),
      )
      .slice(0, 20)
      .map((c) => ({
        id: c.id,
        title: c.title.trim().slice(0, 60),
        time: c.time,
        days: c.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        enabled: Boolean(c.enabled),
      }));
  }
  return base;
}

/**
 * Lista os lembretes que devem disparar agora. `fired` contém as chaves já
 * disparadas, para que cada lembrete apareça no máximo uma vez por dia.
 */
export function dueReminders(
  now: Date,
  settings: ReminderSettings,
  ctx: ReminderContext,
  fired: ReadonlySet<string>,
): DueReminder[] {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const weekday = now.getDay();
  const reached = (time: string) => {
    const m = timeToMinutes(time);
    return m !== null && minutesNow >= m;
  };
  const out: DueReminder[] = [];
  const push = (key: string, title: string, body: string) => {
    const full = `${key}:${ctx.todayISO}`;
    if (!fired.has(full)) out.push({ key: full, title, body });
  };

  if (settings.dailyLog.enabled && reached(settings.dailyLog.time) && !ctx.loggedToday) {
    push("daily-log", "Como foi seu dia?", "Leva menos de um minuto registrar humor e sintomas.");
  }

  if (
    settings.periodForecast.enabled &&
    ctx.nextPeriodDate &&
    reached(settings.periodForecast.time)
  ) {
    const days = diffInDays(ctx.todayISO, ctx.nextPeriodDate);
    if (days >= 0 && days <= settings.periodForecast.daysBefore) {
      push(
        "period-forecast",
        days === 0
          ? "Sua menstruação pode começar hoje"
          : `Sua menstruação pode começar em ${days} ${days === 1 ? "dia" : "dias"}`,
        "É só uma estimativa baseada nos seus registros.",
      );
    }
  }

  if (settings.symptomCheck.enabled && ctx.inPeriod && reached(settings.symptomCheck.time)) {
    push(
      "symptom-check",
      "Registro de sintomas",
      "Que tal anotar fluxo, cólicas e energia de hoje?",
    );
  }

  for (const c of settings.custom) {
    if (c.enabled && c.days.includes(weekday) && reached(c.time)) {
      push(`custom-${c.id}`, c.title, "Lembrete personalizado do Bloom.");
    }
  }
  return out;
}

/** Mantém só as chaves dos últimos dias para o armazenamento não crescer sem limite. */
export function pruneFiredKeys(keys: readonly string[], todayISO: string, keepDays = 3): string[] {
  return keys.filter((k) => {
    const date = k.slice(-10);
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && diffInDays(date, todayISO) <= keepDays;
  });
}
