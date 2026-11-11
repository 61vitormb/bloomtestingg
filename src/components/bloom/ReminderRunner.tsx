import { useEffect } from "react";
import { toast } from "sonner";
import { dueReminders, pruneFiredKeys } from "@/domain/reminders";
import { useCycleModel, usePreferences } from "@/hooks/useBloomData";
import { readDeviceSettings, useDeviceSettings } from "@/lib/device-settings";

const FIRED_KEY = "bloom:fired-reminders";

function readFired(): string[] {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Verifica a cada minuto os lembretes vencidos e os entrega como notificação do
 * sistema (com permissão) ou como aviso dentro do app. Respeita a chave mestre
 * de notificações salva na nuvem.
 */
export function ReminderRunner() {
  const settings = useDeviceSettings();
  const preferences = usePreferences();
  const model = useCycleModel();
  const enabledInCloud = preferences.data?.notifications_enabled ?? false;
  const { today, overview } = model;
  const loggedToday = Boolean(
    model.dailyLogs.data?.some((l) => l.log_date === today) ||
    model.moodLogs.data?.some((l) => l.log_date === today),
  );

  useEffect(() => {
    if (!enabledInCloud) return;
    const run = () => {
      const fired = readFired();
      const due = dueReminders(
        new Date(),
        readDeviceSettings().reminders,
        {
          todayISO: today,
          nextPeriodDate: overview.nextPeriod?.date ?? null,
          inPeriod: overview.phase === "menstrual",
          loggedToday,
        },
        new Set(fired),
      );
      if (due.length === 0) return;
      for (const r of due) {
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted" &&
          document.visibilityState !== "visible"
        ) {
          try {
            new Notification(r.title, { body: r.body, icon: "/favicon.ico", tag: r.key });
          } catch {
            toast(r.title, { description: r.body });
          }
        } else {
          toast(r.title, { description: r.body, duration: 8000 });
        }
      }
      try {
        localStorage.setItem(
          FIRED_KEY,
          JSON.stringify(pruneFiredKeys([...fired, ...due.map((d) => d.key)], today)),
        );
      } catch {
        /* ignora */
      }
    };
    run();
    const id = window.setInterval(run, 60_000);
    return () => window.clearInterval(id);
  }, [
    enabledInCloud,
    settings.reminders,
    today,
    overview.nextPeriod?.date,
    overview.phase,
    loggedToday,
  ]);

  return null;
}
