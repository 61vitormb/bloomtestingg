import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { MOOD_OPTIONS, moodLabel } from "@/domain/catalog";
import { addDays } from "@/domain/cycle";
import { moodFrequency } from "@/domain/statistics";
import { MoodShape } from "@/components/bloom/MoodShape";
import { ErrorState, LoadingBloom, PageHeader } from "@/components/bloom/Feedback";
import { formatShort, todayISO } from "@/lib/format";
import { useMoodLogs, useSaveMoodLog } from "@/hooks/useBloomData";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/humor")({
  head: () => ({
    meta: [
      { title: "Humor — Bloom" },
      { name: "description", content: "Registre seu humor de hoje com um toque." },
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
  const [justSaved, setJustSaved] = useState<string | null>(null);

  useEffect(() => {
    if (moodLogs.data) setMoods(existing?.moods ?? []);
  }, [moodLogs.data, existing]);

  const last30 = useMemo(() => {
    const from = addDays(today, -29);
    return (moodLogs.data ?? []).filter((m) => m.log_date >= from);
  }, [moodLogs.data, today]);
  const freq = useMemo(() => moodFrequency(last30), [last30]);

  if (moodLogs.isLoading) return <LoadingBloom className="min-h-[60vh]" />;
  if (moodLogs.isError) return <ErrorState onRetry={() => void moodLogs.refetch()} />;

  function toggle(value: string) {
    const next = moods.includes(value) ? moods.filter((m) => m !== value) : [...moods, value];
    setMoods(next);
    playSound(next.includes(value) ? "save" : "tap");
    setJustSaved(value);
    saveMood.mutate({
      log_date: today,
      moods: next,
      intensity: next.length ? (existing?.intensity ?? null) : null,
      notes: existing?.notes ?? "",
    });
  }

  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));

  return (
    <div>
      <PageHeader
        eyebrow="Humor"
        title="Como você está hoje?"
        description="Toque para registrar. Pode escolher mais de um. Salva automaticamente."
      />

      <ul
        className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-9 stagger"
        aria-label="Opções de humor"
      >
        {MOOD_OPTIONS.map((option) => {
          const active = moods.includes(option.value);
          return (
            <li key={option.value}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => toggle(option.value)}
                className={cn(
                  "press relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[2rem] border transition-all duration-300",
                  active
                    ? "border-transparent bg-card shadow-[var(--shadow-lift)]"
                    : "border-border bg-card/60 hover:bg-card",
                )}
                style={
                  active
                    ? { boxShadow: `0 0 0 2px ${option.color}, var(--shadow-lift)` }
                    : undefined
                }
              >
                <span
                  className={cn(
                    "transition-transform duration-300",
                    active && "scale-110",
                    active && justSaved === option.value && "animate-pop",
                  )}
                >
                  <MoodShape mood={option.value} size={44} />
                </span>
                <span className="text-sm font-semibold">{option.label}</span>
                {active ? (
                  <span
                    className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full text-white animate-scale-in"
                    style={{ background: option.color }}
                  >
                    <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 h-5 text-center text-xs text-muted-foreground" aria-live="polite">
        {saveMood.isPending
          ? "Salvando…"
          : saveMood.isError
            ? "Não foi possível salvar. Toque novamente."
            : moods.length
              ? "Salvo na nuvem"
              : ""}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="mood-month" className="bloom-card p-5">
          <h2 id="mood-month" className="font-bold">
            Últimos 30 dias
          </h2>
          <ul className="mt-4 grid grid-cols-10 gap-2">
            {days.map((d) => {
              const log = last30.find((m) => m.log_date === d);
              const first = log?.moods[0];
              return (
                <li
                  key={d}
                  className="flex aspect-square items-center justify-center rounded-xl bg-secondary/50"
                  title={`${formatShort(d)}${first ? `: ${log!.moods.map(moodLabel).join(", ")}` : ""}`}
                >
                  {first ? (
                    <MoodShape mood={first} size={22} />
                  ) : (
                    <span className="size-1.5 rounded-full bg-border" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {formatShort(d)}:{" "}
                    {first ? log!.moods.map(moodLabel).join(", ") : "sem registro"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-labelledby="mood-freq" className="bloom-card p-5">
          <h2 id="mood-freq" className="font-bold">
            Mais registrados
          </h2>
          {freq.length ? (
            <ul className="mt-4 space-y-3">
              {freq.slice(0, 5).map((f) => (
                <li key={f.value} className="flex items-center gap-3">
                  <MoodShape mood={f.value} size={28} />
                  <span className="flex-1 text-sm font-medium">{moodLabel(f.value)}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {f.count} {f.count === 1 ? "dia" : "dias"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Seus humores dos últimos 30 dias aparecerão aqui.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
