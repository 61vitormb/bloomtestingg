import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  averageCycleLength,
  averagePeriodLength,
  cycleLengths,
  cycleVariability,
  diffInDays,
  sortCyclesAsc,
  validateCycleEntry,
  type CycleRecord,
} from "@/domain/cycle";
import { formatLong, todayISO } from "@/lib/format";
import { useCycles, useDeleteCycle, usePreferences, useUpdateCycle } from "@/hooks/useBloomData";

export const Route = createFileRoute("/_authenticated/app/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de ciclos — Bloom" },
      { name: "description", content: "Consulte, edite e exclua os ciclos que você registrou." },
      { property: "og:title", content: "Histórico de ciclos — Bloom" },
      { property: "og:description", content: "Duração dos ciclos e do sangramento." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryScreen,
});

function HistoryScreen() {
  const today = todayISO();
  const cycles = useCycles();
  const preferences = usePreferences();
  const updateCycle = useUpdateCycle();
  const deleteCycle = useDeleteCycle();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [issues, setIssues] = useState<string[]>([]);

  const records: CycleRecord[] = useMemo(
    () =>
      (cycles.data ?? []).map((c) => ({
        id: c.id,
        start_date: c.start_date,
        end_date: c.end_date,
      })),
    [cycles.data],
  );

  const ordered = useMemo(() => sortCyclesAsc(records).reverse(), [records]);
  const lengths = cycleLengths(records);
  const avgCycle = averageCycleLength(records, preferences.data?.average_cycle_length ?? null);
  const avgPeriod = averagePeriodLength(records, preferences.data?.average_period_length ?? null);
  const variability = cycleVariability(records);

  async function handleSaveEdit(id: string) {
    setIssues([]);
    const found = validateCycleEntry(
      { start_date: startDate, end_date: endDate || null },
      records,
      today,
      id,
    );
    const errors = found.filter((i) => i.level === "error");
    if (errors.length > 0) {
      setIssues(errors.map((i) => i.message));
      return;
    }
    setIssues(found.map((i) => i.message));
    await updateCycle.mutateAsync({ id, start_date: startDate, end_date: endDate || null });
    setEditingId(null);
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2 min-h-11">
          <Link to="/app/calendario">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Calendário
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Histórico de ciclos</h1>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="bloom-card p-4">
          <p className="text-xs text-muted-foreground">Duração média do ciclo</p>
          <p className="mt-1 text-lg font-semibold">{avgCycle.value} dias</p>
          <p className="text-xs text-muted-foreground">
            {avgCycle.isFallback ? "valor de referência" : `com ${avgCycle.sampleSize} ciclo(s)`}
          </p>
        </div>
        <div className="bloom-card p-4">
          <p className="text-xs text-muted-foreground">Duração média do sangramento</p>
          <p className="mt-1 text-lg font-semibold">{avgPeriod.value} dias</p>
          <p className="text-xs text-muted-foreground">
            {avgPeriod.isFallback ? "valor de referência" : `com ${avgPeriod.sampleSize} registro(s)`}
          </p>
        </div>
        {variability !== null ? (
          <div className="bloom-card col-span-2 p-4">
            <p className="text-xs text-muted-foreground">Variação entre seus ciclos</p>
            <p className="mt-1 text-lg font-semibold">{variability} dias</p>
            <p className="text-xs text-muted-foreground">
              Ciclos com durações diferentes são comuns e são registrados como você informou.
            </p>
          </div>
        ) : null}
      </section>

      {issues.length > 0 ? (
        <ul role="status" className="space-y-1 rounded-2xl bg-accent/70 p-3 text-sm">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Ciclos registrados</h2>
        {cycles.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : ordered.length === 0 ? (
          <p className="rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Nenhuma menstruação registrada ainda. Registre pelo calendário.
          </p>
        ) : (
          <ul className="space-y-3">
            {ordered.map((cycle, index) => {
              const lengthIndex = lengths.length - 1 - index;
              const length = lengths[lengthIndex];
              const isEditing = editingId === cycle.id;
              return (
                <li key={cycle.id} className="bloom-card p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`start-${cycle.id}`}>Início</Label>
                        <Input
                          id={`start-${cycle.id}`}
                          type="date"
                          max={today}
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="min-h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`end-${cycle.id}`}>Fim (opcional)</Label>
                        <Input
                          id={`end-${cycle.id}`}
                          type="date"
                          max={today}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="min-h-12"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="min-h-11 flex-1"
                          disabled={updateCycle.isPending}
                          onClick={() => handleSaveEdit(cycle.id)}
                        >
                          Salvar
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-11"
                          onClick={() => {
                            setEditingId(null);
                            setIssues([]);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold">{formatLong(cycle.start_date)}</p>
                      <p className="text-sm text-muted-foreground">
                        {cycle.end_date
                          ? `Sangramento de ${diffInDays(cycle.start_date, cycle.end_date) + 1} dia(s), até ${formatLong(cycle.end_date)}`
                          : "Fim não registrado"}
                      </p>
                      {length ? (
                        <p className="text-sm text-muted-foreground">
                          Ciclo com {length} dias até a menstruação seguinte
                        </p>
                      ) : null}
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-11"
                          onClick={() => {
                            setEditingId(cycle.id);
                            setStartDate(cycle.start_date);
                            setEndDate(cycle.end_date ?? "");
                            setIssues([]);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-11 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (!window.confirm("Excluir este ciclo? Essa ação não pode ser desfeita.")) return;
                            deleteCycle.mutate(cycle.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Excluir
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
