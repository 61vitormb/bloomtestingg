import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { INTENSITY_LABELS, MOOD_OPTIONS } from "@/domain/catalog";
import { todayISO } from "@/lib/format";
import { useMoodLogs, useSaveMoodLog } from "@/hooks/useBloomData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/humor")({
  head: () => ({
    meta: [
      { title: "Humor — Bloom" },
      { name: "description", content: "Registre seu humor de hoje de forma simples." },
      { property: "og:title", content: "Humor — Bloom" },
      { property: "og:description", content: "Registre seu humor de hoje de forma simples." },
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
  const [hydrated, setHydrated] = useState(false);
  const [moods, setMoods] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  if (moodLogs.data && !hydrated) {
    setHydrated(true);
    setMoods(existing?.moods ?? []);
    setIntensity(existing?.intensity ?? null);
    setNotes(existing?.notes ?? "");
  }

  const toggleMood = (value: string) => setMoods((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Registro diário</p>
        <h1 className="text-3xl font-bold text-neon">Humor</h1>
        <p className="mt-1 text-sm text-muted-foreground">Selecione tudo o que representa você hoje.</p>
      </header>

      <section aria-labelledby="mood-title">
        <h2 id="mood-title" className="sr-only">Opções de humor</h2>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((option) => {
            const active = moods.includes(option.value);
            return (
              <Button
                key={option.value}
                type="button"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                onClick={() => toggleMood(option.value)}
                className="min-h-12 rounded-full px-4 shadow-none"
              >
                {active ? <Check className="size-4" aria-hidden="true" /> : null}
                {option.label}
              </Button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-secondary p-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="mood-intensity" className="font-semibold">Intensidade</Label>
          <span className="text-sm text-muted-foreground">{INTENSITY_LABELS[intensity ?? 3]}</span>
        </div>
        <Slider id="mood-intensity" className="mt-4" min={1} max={5} step={1} value={[intensity ?? 3]} onValueChange={(value) => setIntensity(value[0] ?? 3)} />
      </section>

      <div>
        <Label htmlFor="mood-note" className="font-semibold">Notas</Label>
        <Textarea
          id="mood-note"
          className="mt-2 min-h-28 rounded-2xl bg-secondary"
          maxLength={2000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Escreva como foi seu dia..."
        />
      </div>

      <Button
        className="min-h-12 w-full rounded-full"
        disabled={saveMood.isPending}
        onClick={() => saveMood.mutate({ log_date: today, moods, intensity: moods.length ? intensity ?? 3 : null, notes })}
      >
        {saveMood.isPending ? "Salvando…" : existing ? "Atualizar humor" : "Salvar humor"}
      </Button>
      <p className={cn("text-center text-xs text-muted-foreground", !existing && "invisible")} aria-live="polite">
        Seu registro de hoje pode ser alterado quando quiser.
      </p>
    </div>
  );
}