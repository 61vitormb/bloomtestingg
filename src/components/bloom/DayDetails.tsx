import { Droplet, NotebookPen, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { flowLabel, moodLabel, symptomLabel } from "@/domain/catalog";
import { cycleDayForDate, type CycleRecord } from "@/domain/cycle";
import { decodeSymptoms, metricLabel, METRIC_DEFINITIONS, type MetricKey } from "@/domain/metrics";
import { useDeleteDailyLog, useDeleteMoodLog } from "@/hooks/useBloomData";
import { formatWeekdayLong } from "@/lib/format";
import type { DailyLog, MoodLog } from "@/services/bloom";
import { MoodShape } from "./MoodShape";

/** Painel de consulta de um dia: mostra registros e diferencia dados registrados de estimativas. */
export function DayDetails({
  date,
  cycles,
  daily,
  mood,
  status,
  onEdit,
}: {
  date: string;
  cycles: readonly CycleRecord[];
  daily: DailyLog | null;
  mood: MoodLog | null;
  status: { recorded: boolean; predicted: boolean; fertile: boolean; ovulation: boolean };
  onEdit: () => void;
}) {
  const removeDaily = useDeleteDailyLog();
  const removeMood = useDeleteMoodLog();
  const decoded = decodeSymptoms(daily?.symptoms);
  const cycleDay = cycleDayForDate(cycles, date);
  const hasRecords = Boolean(daily || mood);

  return (
    <div className="space-y-4" data-testid="day-details">
      <div>
        <p className="eyebrow">
          {cycleDay ? `Dia ${cycleDay} do ciclo` : "Fora de um ciclo registrado"}
        </p>
        <h2 className="mt-1 text-xl font-bold first-letter:uppercase">{formatWeekdayLong(date)}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {status.recorded ? (
            <Badge color="var(--phase-menstrual)" solid>
              Menstruação registrada
            </Badge>
          ) : null}
          {status.predicted ? (
            <Badge color="var(--phase-menstrual)">Menstruação estimada</Badge>
          ) : null}
          {status.ovulation ? (
            <Badge color="var(--phase-ovulatory)">Ovulação estimada</Badge>
          ) : status.fertile ? (
            <Badge color="var(--phase-ovulatory)">Janela fértil estimada</Badge>
          ) : null}
        </div>
      </div>

      {hasRecords ? (
        <ul className="space-y-2 stagger">
          {daily?.flow_intensity ? (
            <Row
              icon={<Droplet className="size-4 text-phase-menstrual" aria-hidden="true" />}
              label="Fluxo"
              value={flowLabel(daily.flow_intensity) ?? ""}
            />
          ) : null}
          {mood?.moods.length ? (
            <li className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3">
              <div className="flex -space-x-2">
                {mood.moods.slice(0, 3).map((m) => (
                  <MoodShape key={m} mood={m} size={28} />
                ))}
              </div>
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{mood.moods.map(moodLabel).join(", ")}</p>
                {mood.intensity ? (
                  <p className="text-xs text-muted-foreground">Intensidade {mood.intensity}/5</p>
                ) : null}
              </div>
            </li>
          ) : null}
          {(Object.keys(decoded.metrics) as MetricKey[]).map((k) => (
            <Row
              key={k}
              label={METRIC_DEFINITIONS[k].label}
              value={metricLabel(k, decoded.metrics[k]!)}
            />
          ))}
          {decoded.physical.length ? (
            <Row label="Sintomas físicos" value={decoded.physical.map(symptomLabel).join(", ")} />
          ) : null}
          {decoded.emotional.length ? (
            <Row
              label="Sintomas emocionais"
              value={decoded.emotional.map(symptomLabel).join(", ")}
            />
          ) : null}
          {daily?.notes ? (
            <li className="rounded-2xl border border-border p-3 text-sm">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <NotebookPen className="size-3.5" aria-hidden="true" /> Diário
              </p>
              <p className="whitespace-pre-wrap">{daily.notes}</p>
            </li>
          ) : null}
          {mood?.notes ? (
            <li className="rounded-2xl border border-border p-3 text-sm">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Sobre o humor</p>
              <p className="whitespace-pre-wrap">{mood.notes}</p>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
          Nenhum registro neste dia.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11 flex-1 rounded-full" onClick={onEdit}>
          <Pencil aria-hidden="true" /> {hasRecords ? "Editar registro" : "Registrar este dia"}
        </Button>
        {hasRecords ? (
          <Button
            variant="outline"
            className="min-h-11 rounded-full text-destructive hover:text-destructive"
            disabled={removeDaily.isPending || removeMood.isPending}
            onClick={async () => {
              if (
                !window.confirm("Excluir os registros deste dia? Essa ação não pode ser desfeita.")
              )
                return;
              if (daily) await removeDaily.mutateAsync(daily.id);
              if (mood) await removeMood.mutateAsync(mood.id);
            }}
          >
            <Trash2 aria-hidden="true" /> Excluir
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right font-semibold">{value}</span>
    </li>
  );
}

function Badge({
  children,
  color,
  solid,
}: {
  children: React.ReactNode;
  color: string;
  solid?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={
        solid
          ? { background: color, color: "#fff" }
          : { color, boxShadow: `inset 0 0 0 1.5px ${color}` }
      }
    >
      {children}
    </span>
  );
}
