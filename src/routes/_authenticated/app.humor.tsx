import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoodShape } from "@/components/bloom/MoodShape";
import { OrganicField } from "@/components/bloom/OrganicField";
import { INTENSITY_LABELS, MOOD_OPTIONS, moodLabel } from "@/domain/catalog";
import { diffInDays } from "@/domain/cycle";
import { formatLong, formatShort, todayISO } from "@/lib/format";
import { useDeleteMoodLog, useMoodLogs, useSaveMoodLog } from "@/hooks/useBloomData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/humor")({
  head: () => ({
    meta: [
      { title: "Humor — Bloom" },
      { name: "description", content: "Registre e acompanhe seu humor sem julgamentos." },
      { property: "og:title", content: "Humor — Bloom" },
      { property: "og:description", content: "Estados emocionais, intensidade e observações." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MoodScreen,
});

const PERIODS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
] as const;

function MoodScreen() {
  const today = todayISO();
  const moodLogs = useMoodLogs();
  const saveMood = useSaveMoodLog();
  const removeMood = useDeleteMoodLog();

  const existing = moodLogs.data?.find((log) => log.log_date === today) ?? null;
  const [moods, setMoods] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("30");

  // Preenche o formulário com o registro de hoje uma única vez por dia carregado.
  if (moodLogs.data && hydratedFor !== today) {
    setHydratedFor(today);
    setMoods(existing?.moods ?? []);
    setIntensity(existing?.intensity ?? null);
    setNotes(existing?.notes ?? "");
  }

  const filtered = useMemo(() => {
    const days = Number(period);
    return (moodLogs.data ?? []).filter((log) => diffInDays(log.log_date, today) < days);
  }, [moodLogs.data, period, today]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of filtered) {
      for (const mood of log.moods) map.set(mood, (map.get(mood) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([mood, total]) => ({ mood, label: moodLabel(mood), total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const topMood = counts[0];

  async function handleSave() {
    await saveMood.mutateAsync({
      log_date: today,
      moods,
      intensity: moods.length > 0 ? intensity : null,
      notes,
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Humor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha quantos estados quiser. Nenhum humor é certo ou errado.
        </p>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-4">
        <div className="absolute inset-x-0 top-0 h-20 opacity-40">
          <OrganicField variant="petals" />
        </div>
        <div className="relative">
          <h2 className="text-sm font-semibold">Como você está hoje?</h2>
          <p className="text-xs text-muted-foreground">{formatLong(today)}</p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {MOOD_OPTIONS.map((option) => {
              const active = moods.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setMoods((prev) =>
                      prev.includes(option.value)
                        ? prev.filter((v) => v !== option.value)
                        : [...prev, option.value],
                    )
                  }
                  className={cn(
                    "flex min-h-26 flex-col items-center justify-center gap-1 rounded-2xl border p-2 transition-all",
                    active
                      ? "border-primary bg-secondary/70 shadow-[var(--shadow-petal)]"
                      : "border-border bg-card hover:bg-secondary/40",
                  )}
                >
                  <MoodShape mood={option.value} size={44} />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>

          {moods.length > 0 ? (
            <div className="mt-5">
              <Label htmlFor="mood-intensity" className="text-sm text-muted-foreground">
                Intensidade (opcional){intensity ? ` — ${INTENSITY_LABELS[intensity]}` : ""}
              </Label>
              <Slider
                id="mood-intensity"
                className="mt-3"
                min={1}
                max={5}
                step={1}
                value={[intensity ?? 3]}
                onValueChange={(value) => setIntensity(value[0] ?? 3)}
              />
            </div>
          ) : null}

          <Label htmlFor="mood-note" className="mt-5 block text-sm text-muted-foreground">
            Quer descrever como se sente? (opcional)
          </Label>
          <Textarea
            id="mood-note"
            className="mt-2 min-h-24"
            maxLength={2000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

          <Button
            className="mt-4 min-h-12 w-full"
            onClick={handleSave}
            disabled={saveMood.isPending}
          >
            {saveMood.isPending ? "Salvando na nuvem…" : existing ? "Atualizar humor de hoje" : "Salvar humor"}
          </Button>
        </div>
      </section>

      <section aria-label="Histórico de humor" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Histórico</h2>
          <Tabs value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
            <TabsList>
              {PERIODS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {moodLogs.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando seus registros…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Nenhum registro de humor neste período.
          </p>
        ) : (
          <>
            {topMood ? (
              <p className="rounded-3xl bg-secondary/60 p-4 text-sm">
                Você registrou {topMood.label.toLowerCase()} em {topMood.total} dia(s) neste período.
              </p>
            ) : null}

            {counts.length > 1 ? (
              <div className="rounded-3xl border border-border bg-card p-3">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={counts} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 16,
                          border: "1px solid var(--border)",
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [`${value} dia(s)`, "Registros"]}
                      />
                      <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="var(--bloom-lilac)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Contagem dos seus registros. O Bloom não interpreta causas nem faz diagnósticos.
                </p>
              </div>
            ) : null}

            <ul className="space-y-2">
              {filtered.map((log) => (
                <li key={log.id} className="bloom-card flex items-center gap-3 p-3">
                  {log.moods[0] ? <MoodShape mood={log.moods[0]} size={40} /> : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {log.moods.map(moodLabel).join(", ") || "Sem humor selecionado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatShort(log.log_date)}
                      {log.intensity ? ` · ${INTENSITY_LABELS[log.intensity]}` : ""}
                    </p>
                    {log.notes ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{log.notes}</p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-muted-foreground"
                    aria-label={`Excluir registro de ${formatShort(log.log_date)}`}
                    onClick={() => {
                      if (!window.confirm("Excluir este registro de humor?")) return;
                      removeMood.mutate(log.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
