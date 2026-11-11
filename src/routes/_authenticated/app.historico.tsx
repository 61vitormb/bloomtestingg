import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Download, FileJson, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState, LoadingBloom, PageHeader } from "@/components/bloom/Feedback";
import { useLogSheet } from "@/components/bloom/LogSheetContext";
import { MoodShape } from "@/components/bloom/MoodShape";
import { flowLabel, symptomLabel } from "@/domain/catalog";
import { validateCycleEntry } from "@/domain/cycle";
import { buildHistoryCsv, exportFileName } from "@/domain/export";
import { decodeSymptoms } from "@/domain/metrics";
import { summarizeCycles } from "@/domain/statistics";
import {
  useCreateCycle,
  useCycleModel,
  useDeleteCycle,
  useUpdateCycle,
} from "@/hooks/useBloomData";
import { downloadText } from "@/lib/download";
import { formatLong, formatShort } from "@/lib/format";
import { exportAllData } from "@/services/bloom";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Bloom" },
      {
        name: "description",
        content: "Todos os seus ciclos e registros, com filtros, edição e exportação.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryScreen,
});

function HistoryScreen() {
  const model = useCycleModel();
  const { today } = model;
  const { openLog } = useLogSheet();
  const updateCycle = useUpdateCycle();
  const deleteCycle = useDeleteCycle();
  const createCycle = useCreateCycle();
  const daily = model.dailyLogs.data ?? [];
  const moods = model.moodLogs.data ?? [];

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; start: string; end: string } | null>(null);
  const [adding, setAdding] = useState<{ start: string; end: string } | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  const summaries = useMemo(
    () =>
      summarizeCycles(model.records, daily, moods)
        .filter((c) => (!from || (c.cycleEnd ?? today) >= from) && (!to || c.start <= to))
        .reverse(),
    [model.records, daily, moods, from, to, today],
  );

  if (model.isLoading)
    return <LoadingBloom label="Abrindo seu histórico…" className="min-h-[60vh]" />;
  if (model.isError) return <ErrorState onRetry={() => void model.refetch()} />;

  async function saveEdit() {
    if (!editing) return;
    const found = validateCycleEntry(
      { start_date: editing.start, end_date: editing.end || null },
      model.records,
      today,
      editing.id,
    );
    const errors = found.filter((i) => i.level === "error");
    if (errors.length) {
      setIssues(errors.map((e) => e.message));
      return;
    }
    setIssues(found.map((i) => i.message));
    await updateCycle.mutateAsync({
      id: editing.id,
      start_date: editing.start,
      end_date: editing.end || null,
    });
    setEditing(null);
  }

  async function saveNew() {
    if (!adding) return;
    const found = validateCycleEntry(
      { start_date: adding.start, end_date: adding.end || null },
      model.records,
      today,
    );
    const errors = found.filter((i) => i.level === "error");
    if (errors.length) {
      setIssues(errors.map((e) => e.message));
      return;
    }
    setIssues(found.map((i) => i.message));
    await createCycle.mutateAsync({
      start_date: adding.start,
      end_date: adding.end || null,
      notes: null,
    });
    setAdding(null);
  }

  async function exportCsv() {
    const csv = buildHistoryCsv(
      { cycles: model.cycles.data ?? [], daily_logs: daily, mood_logs: moods },
      from || null,
      to || null,
    );
    downloadText(csv, exportFileName("csv", today), "text/csv;charset=utf-8");
    toast.success("Histórico exportado em CSV.");
  }
  async function exportJson() {
    try {
      const payload = await exportAllData();
      downloadText(
        JSON.stringify(payload, null, 2),
        exportFileName("json", today),
        "application/json",
      );
      toast.success("Arquivo completo (JSON) gerado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível exportar agora.");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Histórico"
        title="Seus ciclos"
        description="Consulte, filtre, edite e exporte tudo o que você registrou."
        actions={
          <>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={exportCsv}
              disabled={!model.records.length && !daily.length}
            >
              <Download aria-hidden="true" /> CSV
            </Button>
            <Button variant="outline" className="rounded-full" onClick={exportJson}>
              <FileJson aria-hidden="true" /> JSON
            </Button>
            <Button className="rounded-full" onClick={() => setAdding({ start: "", end: "" })}>
              <Plus aria-hidden="true" /> Ciclo anterior
            </Button>
          </>
        }
      />

      <section
        aria-label="Filtro por período"
        className="bloom-card mb-6 flex flex-wrap items-end gap-3 p-4"
      >
        <div>
          <Label htmlFor="filter-from" className="text-xs">
            De
          </Label>
          <Input
            id="filter-from"
            type="date"
            max={today}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 h-11 w-44 rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor="filter-to" className="text-xs">
            Até
          </Label>
          <Input
            id="filter-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 h-11 w-44 rounded-xl"
          />
        </div>
        {from || to ? (
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Limpar filtro
          </Button>
        ) : null}
        <p className="ml-auto text-sm text-muted-foreground">
          {summaries.length} {summaries.length === 1 ? "ciclo" : "ciclos"}
        </p>
      </section>

      {issues.length ? (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-border bg-accent/50 p-3 text-sm"
        >
          <ul className="space-y-1">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {adding ? (
        <section className="bloom-card mb-6 p-5 animate-scale-in" aria-labelledby="add-title">
          <h2 id="add-title" className="font-bold">
            Adicionar menstruação anterior
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="add-start">Início</Label>
              <Input
                id="add-start"
                type="date"
                max={today}
                value={adding.start}
                onChange={(e) => setAdding({ ...adding, start: e.target.value })}
                className="mt-1 h-11 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="add-end">Fim (opcional)</Label>
              <Input
                id="add-end"
                type="date"
                max={today}
                value={adding.end}
                onChange={(e) => setAdding({ ...adding, end: e.target.value })}
                className="mt-1 h-11 rounded-xl"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              className="rounded-full"
              onClick={saveNew}
              disabled={!adding.start || createCycle.isPending}
            >
              Salvar
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => {
                setAdding(null);
                setIssues([]);
              }}
            >
              Cancelar
            </Button>
          </div>
        </section>
      ) : null}

      {summaries.length === 0 ? (
        <div className="bloom-card">
          <EmptyState
            title={
              model.records.length ? "Nenhum ciclo neste período" : "Seu histórico começa aqui"
            }
            description={
              model.records.length
                ? "Ajuste as datas do filtro para ver outros ciclos."
                : "Registre o início da sua menstruação no calendário ou adicione um ciclo anterior."
            }
            action={
              !model.records.length ? (
                <Button className="rounded-full" onClick={() => openLog(today, "flow")}>
                  Registrar menstruação
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ol className="space-y-3 stagger">
          {summaries.map((c) => {
            const open = expanded === c.id;
            const end = c.cycleEnd ?? today;
            const days = daily
              .filter((l) => l.log_date >= c.start && l.log_date <= end)
              .sort((a, b) => a.log_date.localeCompare(b.log_date));
            const moodDays = moods.filter((l) => l.log_date >= c.start && l.log_date <= end);
            const isEditing = editing?.id === c.id;
            return (
              <li key={c.id} className="bloom-card overflow-hidden">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setExpanded(open ? null : c.id)}
                  className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-secondary/40 md:p-5"
                >
                  <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-phase-menstrual-soft text-phase-menstrual">
                    <span className="text-lg leading-none font-bold">
                      {Number(c.start.slice(8, 10))}
                    </span>
                    <span className="text-[10px] font-semibold uppercase">
                      {formatShort(c.start).split(" ").pop()}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {c.isCurrent ? "Ciclo atual" : `Ciclo de ${c.cycleLength} dias`}
                      {c.irregular ? (
                        <span className="ml-2 rounded-full bg-phase-follicular-soft px-2 py-0.5 text-[11px] font-semibold text-phase-follicular">
                          Fora do padrão
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {formatLong(c.start)} ·{" "}
                      {c.periodLength
                        ? `menstruação de ${c.periodLength} dias`
                        : c.end
                          ? ""
                          : "fim da menstruação não registrado"}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-5 text-muted-foreground transition-transform",
                      open && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>

                {open ? (
                  <div className="space-y-4 border-t border-border p-4 animate-fade-in md:p-5">
                    {isEditing ? (
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <div>
                          <Label htmlFor={`s-${c.id}`}>Início</Label>
                          <Input
                            id={`s-${c.id}`}
                            type="date"
                            max={today}
                            value={editing.start}
                            onChange={(e) => setEditing({ ...editing, start: e.target.value })}
                            className="mt-1 h-11 rounded-xl"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`e-${c.id}`}>Fim</Label>
                          <Input
                            id={`e-${c.id}`}
                            type="date"
                            max={today}
                            value={editing.end}
                            onChange={(e) => setEditing({ ...editing, end: e.target.value })}
                            className="mt-1 h-11 rounded-xl"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="rounded-full"
                            onClick={saveEdit}
                            disabled={updateCycle.isPending}
                          >
                            Salvar
                          </Button>
                          <Button
                            variant="ghost"
                            className="rounded-full"
                            onClick={() => {
                              setEditing(null);
                              setIssues([]);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setEditing({ id: c.id, start: c.start, end: c.end ?? "" })}
                        >
                          <Pencil aria-hidden="true" /> Editar datas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-destructive hover:text-destructive"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Excluir esta menstruação? Os registros diários continuam salvos.",
                              )
                            )
                              deleteCycle.mutate(c.id);
                          }}
                        >
                          <Trash2 aria-hidden="true" /> Excluir ciclo
                        </Button>
                      </div>
                    )}

                    {days.length || moodDays.length ? (
                      <ul className="divide-y divide-border rounded-2xl border border-border">
                        {[
                          ...new Set([
                            ...days.map((d) => d.log_date),
                            ...moodDays.map((m) => m.log_date),
                          ]),
                        ]
                          .sort()
                          .map((date) => {
                            const d = days.find((x) => x.log_date === date);
                            const m = moodDays.find((x) => x.log_date === date);
                            const decoded = decodeSymptoms(d?.symptoms);
                            const parts = [
                              d?.flow_intensity
                                ? `Fluxo ${flowLabel(d.flow_intensity)?.toLowerCase()}`
                                : null,
                              ...decoded.physical.map(symptomLabel),
                              ...decoded.emotional.map(symptomLabel),
                            ].filter(Boolean);
                            return (
                              <li key={date}>
                                <button
                                  type="button"
                                  onClick={() => openLog(date)}
                                  className="flex w-full items-start gap-3 p-3 text-left text-sm hover:bg-secondary/40"
                                >
                                  <span className="w-16 shrink-0 font-semibold">
                                    {formatShort(date)}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block">
                                      {parts.join(" · ") || (m ? "" : "Registro")}
                                    </span>
                                    {d?.notes ? (
                                      <span className="mt-0.5 block truncate text-muted-foreground italic">
                                        “{d.notes}”
                                      </span>
                                    ) : null}
                                  </span>
                                  {m?.moods[0] ? <MoodShape mood={m.moods[0]} size={24} /> : null}
                                </button>
                              </li>
                            );
                          })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum registro diário neste ciclo.
                      </p>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
