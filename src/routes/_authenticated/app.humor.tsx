import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { MOOD_OPTIONS } from "@/domain/catalog";
import { MoodShape } from "@/components/bloom/MoodShape";
import { todayISO } from "@/lib/format";
import { useMoodLogs, useSaveMoodLog } from "@/hooks/useBloomData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/humor")({
  head: () => ({
    meta: [
      { title: "Humor — Bloom" },
      { name: "description", content: "Registre seu humor de hoje com um toque." },
      { property: "og:title", content: "Humor — Bloom" },
      { property: "og:description", content: "Registre seu humor de hoje com um toque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MoodScreen,
});

function MoodScreen() {
  const today = todayISO();
  const moodLogs = useMoodLogs();
  const saveMood = useSaveMoodLog();
  const existing = moodLogs.data?.find((log) => log.log_date === today) ?? null;
  const [moods, setMoods] = useState<string[]>([]);

  useEffect(() => {
    if (moodLogs.data) setMoods(existing?.moods ?? []);
  }, [moodLogs.data, existing]);

  function toggle(value: string) {
    const next = moods.includes(value) ? moods.filter((m) => m !== value) : [...moods, value];
    setMoods(next);
    saveMood.mutate({
      log_date: today,
      moods: next,
      intensity: next.length ? existing?.intensity ?? null : null,
      notes: existing?.notes ?? "",
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-neon">Humor</h1>
        <p className="mt-1 text-sm text-muted-foreground">Toque para registrar como você está hoje.</p>
      </header>

      <ul className="grid grid-cols-3 gap-3" aria-label="Opções de humor">
        {MOOD_OPTIONS.map((option) => {
          const active = moods.includes(option.value);
          return (
            <li key={option.value}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => toggle(option.value)}
                className={cn(
                  "press relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-full transition-colors duration-200",
                  active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                )}
              >
                <MoodShape shape={option.shape} from="currentColor" to="currentColor" size={30} />
                <span className="text-sm font-medium">{option.label}</span>
                {active ? (
                  <Check className="absolute top-3 right-3 size-4 text-neon" aria-hidden="true" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-center text-xs text-muted-foreground" aria-live="polite">
        {saveMood.isPending ? "Salvando…" : saveMood.isError ? "Não foi possível salvar. Toque novamente." : moods.length ? "Salvo" : ""}
      </p>
    </div>
  );
}
