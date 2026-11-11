import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Lock, PenLine, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, LoadingBloom, PageHeader } from "@/components/bloom/Feedback";
import { MoodShape } from "@/components/bloom/MoodShape";
import { PHASE_INFO } from "@/domain/catalog";
import { cycleDayForDate, estimatePhase } from "@/domain/cycle";
import { NOTES_MAX } from "@/domain/validation";
import { useCycleModel, useSaveDayNote } from "@/hooks/useBloomData";
import { formatMonthYear, formatWeekdayLong } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/diario")({
  head: () => ({
    meta: [
      { title: "Diário — Bloom" },
      {
        name: "description",
        content: "Seu espaço privado de anotações, organizado por data e dia do ciclo.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JournalScreen,
});

function JournalScreen() {
  const model = useCycleModel();
  const { today, overview } = model;
  const saveNote = useSaveDayNote();
  const daily = model.dailyLogs.data ?? [];
  const moods = model.moodLogs.data ?? [];
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<{ date: string; text: string } | null>(null);

  const entries = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return daily
      .filter((d) => d.notes)
      .filter((d) => !q || d.notes!.toLocaleLowerCase("pt-BR").includes(q))
      .sort((a, b) => b.log_date.localeCompare(a.log_date));
  }, [daily, query]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of entries) {
      const key = e.log_date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()];
  }, [entries]);

  if (model.isLoading) return <LoadingBloom label="Abrindo seu diário…" className="min-h-[60vh]" />;
  if (model.isError) return <ErrorState onRetry={() => void model.refetch()} />;

  async function save() {
    if (!draft) return;
    const existing = daily.find((d) => d.log_date === draft.date) ?? null;
    await saveNote.mutateAsync({ log_date: draft.date, notes: draft.text, existing });
    setDraft(null);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Diário"
        title="Seu espaço privado"
        description="Anotações ligadas ao dia do ciclo. Só você tem acesso."
        actions={
          <Button
            className="rounded-full"
            onClick={() =>
              setDraft({ date: today, text: daily.find((d) => d.log_date === today)?.notes ?? "" })
            }
          >
            <PenLine aria-hidden="true" /> Nova anotação
          </Button>
        }
      />

      {draft ? (
        <section aria-labelledby="draft-title" className="bloom-card mb-6 p-5 animate-scale-in">
          <h2 id="draft-title" className="font-bold">
            Escrever no diário
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr]">
            <div>
              <Label htmlFor="journal-date">Data</Label>
              <Input
                id="journal-date"
                type="date"
                max={today}
                value={draft.date}
                onChange={(e) =>
                  setDraft({
                    date: e.target.value,
                    text: daily.find((d) => d.log_date === e.target.value)?.notes ?? "",
                  })
                }
                className="mt-1 h-11 rounded-xl"
              />
              {draft.date ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {cycleDayForDate(model.records, draft.date)
                    ? `Dia ${cycleDayForDate(model.records, draft.date)} do ciclo`
                    : "Sem ciclo registrado"}
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="journal-text">Anotação</Label>
              <Textarea
                id="journal-text"
                maxLength={NOTES_MAX}
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                className="mt-1 min-h-36 rounded-2xl"
                placeholder="O que você quer lembrar sobre este dia?"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
                {draft.text.length}/{NOTES_MAX}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              className="rounded-full"
              onClick={save}
              disabled={!draft.date || saveNote.isPending}
            >
              {saveNote.isPending ? "Salvando…" : "Salvar anotação"}
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
          </div>
        </section>
      ) : null}

      <div className="relative mb-6">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Buscar no diário"
          placeholder="Buscar nas anotações"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 rounded-full bg-card pl-11"
        />
      </div>

      {groups.length === 0 ? (
        <div className="bloom-card">
          <EmptyState
            title={query ? "Nada encontrado" : "Seu diário está em branco"}
            description={
              query
                ? "Tente outra palavra."
                : "Escreva sobre seu dia, sentimentos ou qualquer coisa que queira lembrar."
            }
          />
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([month, list]) => (
            <section
              key={month}
              aria-label={formatMonthYear(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1)}
            >
              <h2 className="eyebrow mb-3 first-letter:uppercase">
                {formatMonthYear(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1)}
              </h2>
              <ol className="relative space-y-3 border-l-2 border-border pl-5 stagger">
                {list.map((e) => {
                  const day = cycleDayForDate(model.records, e.log_date);
                  const phase = day
                    ? PHASE_INFO[
                        estimatePhase(day, overview.cycleLength.value, overview.periodLength.value)
                      ]
                    : null;
                  const mood = moods.find((m) => m.log_date === e.log_date);
                  return (
                    <li key={e.id} className="relative">
                      <span
                        className="absolute top-5 -left-[27px] size-3 rounded-full border-2 border-background"
                        style={{ background: phase?.color ?? "var(--border)" }}
                        aria-hidden="true"
                      />
                      <article className="bloom-card p-4">
                        <header className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold first-letter:uppercase">
                            {formatWeekdayLong(e.log_date)}
                          </h3>
                          {day ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{ background: phase?.soft, color: phase?.color }}
                            >
                              Dia {day} · {phase?.label.toLowerCase()} (estim.)
                            </span>
                          ) : null}
                          {mood?.moods[0] ? (
                            <MoodShape mood={mood.moods[0]} size={22} className="ml-auto" />
                          ) : null}
                        </header>
                        <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                          {e.notes}
                        </p>
                        <div className="mt-3 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full"
                            onClick={() => setDraft({ date: e.log_date, text: e.notes ?? "" })}
                          >
                            <PenLine aria-hidden="true" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full text-destructive hover:text-destructive"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Apagar esta anotação? Os demais registros do dia continuam salvos.",
                                )
                              ) {
                                saveNote.mutate({ log_date: e.log_date, notes: null, existing: e });
                              }
                            }}
                          >
                            <Trash2 aria-hidden="true" /> Apagar
                          </Button>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" aria-hidden="true" /> Anotações protegidas por acesso individual
        na nuvem.
      </p>
    </div>
  );
}
