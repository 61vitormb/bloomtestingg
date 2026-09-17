import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Droplet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MoodShape } from "@/components/bloom/MoodShape";
import { FLOW_OPTIONS, INTENSITY_LABELS, MOOD_OPTIONS, SYMPTOM_OPTIONS } from "@/domain/catalog";
import { validateCycleEntry, type CycleRecord, type FlowIntensity } from "@/domain/cycle";
import { formatWeekdayLong, todayISO } from "@/lib/format";
import {
  useCreateCycle,
  useCycles,
  useDailyLogs,
  useDeleteCycle,
  useDeleteDailyLog,
  useDeleteMoodLog,
  useMoodLogs,
  useSaveDailyLog,
  useSaveMoodLog,
  useUpdateCycle,
} from "@/hooks/useBloomData";
import { cn } from "@/lib/utils";

interface DayLogSheetProps {
  date: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NOTES_MAX = 2000;

export function DayLogSheet({ date, open, onOpenChange }: DayLogSheetProps) {
  const { data: dailyLogs } = useDailyLogs();
  const { data: moodLogs } = useMoodLogs();
  const { data: cycles } = useCycles();

  const saveDaily = useSaveDailyLog();
  const removeDaily = useDeleteDailyLog();
  const saveMood = useSaveMoodLog();
  const removeMood = useDeleteMoodLog();
  const createCycle = useCreateCycle();
  const updateCycle = useUpdateCycle();
  const deleteCycle = useDeleteCycle();

  const existingDaily = useMemo(
    () => dailyLogs?.find((log) => log.log_date === date) ?? null,
    [dailyLogs, date],
  );
  const existingMood = useMemo(
    () => moodLogs?.find((log) => log.log_date === date) ?? null,
    [moodLogs, date],
  );
  const cycleStartingHere = useMemo(
    () => cycles?.find((c) => c.start_date === date) ?? null,
    [cycles, date],
  );
  const openCycle = useMemo(
    () =>
      cycles
        ?.filter((c) => !c.end_date && date && c.start_date <= date)
        .sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null,
    [cycles, date],
  );

  const [flow, setFlow] = useState<FlowIntensity | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [dayNotes, setDayNotes] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [moodNotes, setMoodNotes] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  // Recarrega o formulário quando o dia muda; alterações não salvas de outro dia não vazam.
  useEffect(() => {
    if (!open || !date) return;
    setFlow(existingDaily?.flow_intensity ?? null);
    setSymptoms(existingDaily?.symptoms ?? []);
    setDayNotes(existingDaily?.notes ?? "");
    setMoods(existingMood?.moods ?? []);
    setIntensity(existingMood?.intensity ?? null);
    setMoodNotes(existingMood?.notes ?? "");
    setWarnings([]);
  }, [open, date, existingDaily, existingMood]);

  if (!date) return null;

  const cycleRecords: CycleRecord[] = (cycles ?? []).map((c) => ({
    id: c.id,
    start_date: c.start_date,
    end_date: c.end_date,
  }));

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  async function handleSave() {
    if (!date) return;
    await saveDaily.mutateAsync({
      log_date: date,
      flow_intensity: flow,
      symptoms,
      notes: dayNotes,
    });
    if (moods.length > 0 || moodNotes.trim().length > 0 || intensity !== null) {
      await saveMood.mutateAsync({
        log_date: date,
        moods,
        intensity: moods.length > 0 ? intensity : null,
        notes: moodNotes,
      });
    }
    onOpenChange(false);
  }

  async function handleMarkStart() {
    const issues = validateCycleEntry({ start_date: date! }, cycleRecords, todayISO());
    const errors = issues.filter((i) => i.level === "error");
    setWarnings(issues.filter((i) => i.level === "warning").map((i) => i.message));
    if (errors.length > 0) {
      setWarnings(errors.map((i) => i.message));
      return;
    }
    await createCycle.mutateAsync({ start_date: date!, end_date: null, notes: null });
  }

  async function handleMarkEnd() {
    if (!openCycle) return;
    const issues = validateCycleEntry(
      { start_date: openCycle.start_date, end_date: date! },
      cycleRecords,
      todayISO(),
      openCycle.id,
    );
    const errors = issues.filter((i) => i.level === "error");
    setWarnings(issues.filter((i) => i.level === "warning").map((i) => i.message));
    if (errors.length > 0) {
      setWarnings(errors.map((i) => i.message));
      return;
    }
    await updateCycle.mutateAsync({ id: openCycle.id, end_date: date! });
  }

  const saving =
    saveDaily.isPending ||
    saveMood.isPending ||
    createCycle.isPending ||
    updateCycle.isPending ||
    deleteCycle.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl border-border px-5 pb-10"
      >
        <SheetHeader className="px-0 text-left">
          <SheetTitle className="text-xl font-semibold">Registro do dia</SheetTitle>
          <SheetDescription className="capitalize">{formatWeekdayLong(date)}</SheetDescription>
        </SheetHeader>

        {warnings.length > 0 ? (
          <div
            role="status"
            className="mb-4 flex gap-2 rounded-2xl border border-border bg-accent/60 p-3 text-sm text-foreground"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <ul className="space-y-1">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Menstruação</h3>
          <div className="flex flex-wrap gap-2">
            {cycleStartingHere ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteCycle.mutate(cycleStartingHere.id)}
                disabled={saving}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remover início deste dia
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleMarkStart} disabled={saving}>
                <Droplet className="h-4 w-4" aria-hidden="true" />
                Marcar início
              </Button>
            )}
            {openCycle && !cycleStartingHere ? (
              <Button variant="outline" size="sm" onClick={handleMarkEnd} disabled={saving}>
                Marcar fim
              </Button>
            ) : null}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm text-muted-foreground">Intensidade do fluxo</legend>
            <div className="flex flex-wrap gap-2">
              {FLOW_OPTIONS.map((option) => {
                const active = flow === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFlow(active ? null : option.value)}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-sm transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-secondary",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </section>

        <section className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold">Sintomas físicos</h3>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_OPTIONS.map((option) => {
              const active = symptoms.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSymptoms((prev) => toggle(prev, option.value))}
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-sm transition-colors",
                    active
                      ? "border-primary bg-secondary font-medium text-secondary-foreground"
                      : "border-border bg-card text-foreground hover:bg-secondary",
                  )}
                >
                  {active ? "✓ " : ""}
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold">Como você está se sentindo?</h3>
          <div className="grid grid-cols-3 gap-2">
            {MOOD_OPTIONS.map((option) => {
              const active = moods.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMoods((prev) => toggle(prev, option.value))}
                  className={cn(
                    "flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border p-2 transition-all",
                    active
                      ? "border-primary bg-secondary/70 shadow-[var(--shadow-petal)]"
                      : "border-border bg-card hover:bg-secondary/40",
                  )}
                >
                  <MoodShape mood={option.value} size={40} />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>

          {moods.length > 0 ? (
            <div className="pt-2">
              <Label htmlFor="intensity" className="text-sm text-muted-foreground">
                Intensidade (opcional)
                {intensity ? ` — ${INTENSITY_LABELS[intensity]}` : ""}
              </Label>
              <Slider
                id="intensity"
                className="mt-3"
                min={1}
                max={5}
                step={1}
                value={[intensity ?? 3]}
                onValueChange={(value) => setIntensity(value[0] ?? 3)}
              />
            </div>
          ) : null}

          <Label htmlFor="mood-notes" className="mt-2 block text-sm text-muted-foreground">
            Observações sobre o humor (opcional)
          </Label>
          <Textarea
            id="mood-notes"
            value={moodNotes}
            maxLength={NOTES_MAX}
            onChange={(event) => setMoodNotes(event.target.value)}
            placeholder="Escreva com suas palavras."
            className="min-h-20"
          />
        </section>

        <section className="mt-6 space-y-2">
          <Label htmlFor="day-notes" className="text-sm font-semibold">
            Observações do dia (opcional)
          </Label>
          <Textarea
            id="day-notes"
            value={dayNotes}
            maxLength={NOTES_MAX}
            onChange={(event) => setDayNotes(event.target.value)}
            className="min-h-20"
          />
        </section>

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={handleSave} disabled={saving} className="min-h-12">
            {saving ? "Salvando na nuvem…" : "Salvar registro"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          {existingDaily || existingMood ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={saving}
              onClick={async () => {
                if (!window.confirm("Excluir os registros deste dia? Essa ação não pode ser desfeita.")) return;
                if (existingDaily) await removeDaily.mutateAsync(existingDaily.id);
                if (existingMood) await removeMood.mutateAsync(existingMood.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Excluir registros deste dia
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
