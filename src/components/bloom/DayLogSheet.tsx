import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Droplet, Minus, Plus, Trash2 } from "lucide-react";
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
import {
  EMOTIONAL_SYMPTOM_OPTIONS,
  FLOW_OPTIONS,
  INTENSITY_LABELS,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
} from "@/domain/catalog";
import {
  cycleDayForDate,
  validateCycleEntry,
  type CycleRecord,
  type FlowIntensity,
} from "@/domain/cycle";
import {
  METRIC_DEFINITIONS,
  decodeSymptoms,
  encodeSymptoms,
  type DayMetrics,
  type MetricKey,
} from "@/domain/metrics";
import { NOTES_MAX } from "@/domain/validation";
import { formatWeekdayLong, todayISO } from "@/lib/format";
import {
  errorMessage,
  useCreateCycle,
  useCycles,
  useDailyLogs,
  useDeleteCycle,
  useMoodLogs,
  useSaveDailyLog,
  useSaveMoodLog,
  useUpdateCycle,
} from "@/hooks/useBloomData";
import { useIsMobile } from "@/hooks/use-mobile";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { MoodShape } from "./MoodShape";
import { SegmentedScale } from "./Feedback";
import type { FlowerSection } from "./DayFlower";
import { toast } from "sonner";

interface DayLogSheetProps {
  date: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusSection?: FlowerSection | null;
  onSaved?: () => void;
}

type PendingAction = { kind: "start" | "end"; warnings: string[] } | null;

const scaleOptions = (key: MetricKey) => {
  const def = METRIC_DEFINITIONS[key];
  const out: { value: number; label: string }[] = [];
  for (let v = def.min; v <= def.max; v += def.step)
    out.push({ value: v, label: def.scale[v] ?? String(v) });
  return out;
};

export function DayLogSheet({ date, open, onOpenChange, focusSection, onSaved }: DayLogSheetProps) {
  const isMobile = useIsMobile();
  const { data: dailyLogs } = useDailyLogs();
  const { data: moodLogs } = useMoodLogs();
  // DEF-014: ações de menstruação ficam bloqueadas até o histórico carregar;
  // antes, um toque rápido validava contra uma lista vazia e ignorava sobreposições.
  const { data: cycles, isLoading: cyclesLoading, isError: cyclesError } = useCycles();

  const saveDaily = useSaveDailyLog();
  const saveMood = useSaveMoodLog();
  const createCycle = useCreateCycle();
  const updateCycle = useUpdateCycle();
  const deleteCycle = useDeleteCycle();

  const existingDaily = useMemo(
    () => dailyLogs?.find((l) => l.log_date === date) ?? null,
    [dailyLogs, date],
  );
  const existingMood = useMemo(
    () => moodLogs?.find((l) => l.log_date === date) ?? null,
    [moodLogs, date],
  );
  const cycleRecords: CycleRecord[] = useMemo(
    () => (cycles ?? []).map((c) => ({ id: c.id, start_date: c.start_date, end_date: c.end_date })),
    [cycles],
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
  const cycleEndingHere = useMemo(
    () => cycles?.find((c) => c.end_date === date) ?? null,
    [cycles, date],
  );

  const [flow, setFlow] = useState<FlowIntensity | null>(null);
  const [physical, setPhysical] = useState<string[]>([]);
  const [emotional, setEmotional] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<DayMetrics>({});
  const [dayNotes, setDayNotes] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [moodNotes, setMoodNotes] = useState("");
  const [messages, setMessages] = useState<{ level: "error" | "warning"; text: string }[]>([]);
  const [pending, setPending] = useState<PendingAction>(null);
  const [lastToggled, setLastToggled] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Recarrega o formulário quando o dia muda; alterações não salvas de outro dia não vazam.
  useEffect(() => {
    if (!open || !date) return;
    const decoded = decodeSymptoms(existingDaily?.symptoms);
    setFlow(existingDaily?.flow_intensity ?? null);
    setPhysical(decoded.physical);
    setEmotional(decoded.emotional);
    setMetrics(decoded.metrics);
    setDayNotes(existingDaily?.notes ?? "");
    setMoods(existingMood?.moods ?? []);
    setIntensity(existingMood?.intensity ?? null);
    setMoodNotes(existingMood?.notes ?? "");
    setMessages([]);
    setPending(null);
  }, [open, date, existingDaily, existingMood]);

  useEffect(() => {
    if (!open || !focusSection) return;
    const t = setTimeout(() => {
      document
        .getElementById(`log-section-${focusSection}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
    return () => clearTimeout(t);
  }, [open, focusSection]);

  if (!date) return null;

  const isFuture = date > todayISO();
  const cycleDay = cycleDayForDate(cycleRecords, date);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const tick = (value: string) => {
    setLastToggled(value);
    playSound("tap");
  };
  const setMetric = (key: MetricKey, value: number | undefined) =>
    setMetrics((m) => {
      const next = { ...m };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });

  async function handleSave() {
    if (!date) return;
    try {
      await saveDaily.mutateAsync({
        log_date: date,
        flow_intensity: flow,
        symptoms: encodeSymptoms({ physical, emotional, metrics }),
        notes: dayNotes,
      });
      if (existingMood || moods.length > 0 || moodNotes.trim()) {
        await saveMood.mutateAsync({
          log_date: date,
          moods,
          intensity: moods.length > 0 ? intensity : null,
          notes: moodNotes,
        });
      }
      playSound("complete");
      toast.success("Registro salvo na nuvem.");
      onSaved?.();
      onOpenChange(false);
    } catch {
      /* mensagem já exibida pela mutação; o formulário é preservado */
    }
  }

  function check(kind: "start" | "end") {
    if (!date) return null;
    const issues =
      kind === "start"
        ? validateCycleEntry({ start_date: date }, cycleRecords, todayISO())
        : validateCycleEntry(
            { start_date: openCycle!.start_date, end_date: date },
            cycleRecords,
            todayISO(),
            openCycle!.id,
          );
    const errors = issues.filter((i) => i.level === "error");
    if (errors.length) {
      setMessages(errors.map((e) => ({ level: "error", text: e.message })));
      playSound("error");
      return null;
    }
    return issues.filter((i) => i.level === "warning").map((i) => i.message);
  }

  async function runPeriodAction(kind: "start" | "end", confirmed = false) {
    if (!date || periodLocked) return;
    setMessages([]);
    const warnings = check(kind);
    if (warnings === null) return;
    if (warnings.length && !confirmed) {
      setPending({ kind, warnings });
      return;
    }
    setPending(null);
    try {
      if (kind === "start") {
        await createCycle.mutateAsync({ start_date: date, end_date: null, notes: null });
        if (!flow) setFlow("moderate");
      } else if (openCycle) {
        await updateCycle.mutateAsync({ id: openCycle.id, end_date: date });
      }
    } catch (error) {
      setMessages([{ level: "error", text: errorMessage(error) }]);
    }
  }

  const periodLocked = cyclesLoading || cyclesError;
  const saving =
    saveDaily.isPending ||
    saveMood.isPending ||
    createCycle.isPending ||
    updateCycle.isPending ||
    deleteCycle.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 border-border bg-background p-0",
          isMobile ? "max-h-[94dvh] rounded-t-[2rem]" : "w-full sm:max-w-lg",
        )}
      >
        {isMobile ? (
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
        ) : null}
        <SheetHeader className="px-6 pt-5 pb-3 text-left">
          <p className="eyebrow">{cycleDay ? `Dia ${cycleDay} do ciclo` : "Registro diário"}</p>
          <SheetTitle className="text-2xl font-bold first-letter:uppercase">
            {formatWeekdayLong(date)}
          </SheetTitle>
          <SheetDescription>Registre só o que fizer sentido. Nada é obrigatório.</SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 pb-4">
          {isFuture ? (
            <p role="status" className="rounded-2xl bg-secondary p-3 text-sm text-muted-foreground">
              Este dia ainda não chegou. Você pode deixar anotações, mas não registrar o início da
              menstruação.
            </p>
          ) : null}

          {messages.length > 0 ? (
            <div
              role="alert"
              className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <ul className="space-y-1">
                {messages.map((m) => (
                  <li key={m.text}>{m.text}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <LogSection id="flow" title="Menstruação" accent="var(--phase-menstrual)">
            <div className="flex flex-wrap gap-2">
              {cycleStartingHere ? (
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={saving}
                  onClick={() => {
                    if (window.confirm("Remover o início de menstruação registrado neste dia?"))
                      deleteCycle.mutate(cycleStartingHere.id);
                  }}
                >
                  <Trash2 aria-hidden="true" /> Remover início deste dia
                </Button>
              ) : !isFuture ? (
                <Button
                  className="rounded-full bg-phase-menstrual text-white hover:bg-phase-menstrual/90"
                  disabled={saving || periodLocked}
                  onClick={() => runPeriodAction("start")}
                >
                  <Droplet aria-hidden="true" /> Menstruação começou
                </Button>
              ) : null}
              {openCycle && !cycleStartingHere && !isFuture ? (
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={saving || periodLocked}
                  onClick={() => runPeriodAction("end")}
                >
                  Menstruação terminou
                </Button>
              ) : null}
              {cycleEndingHere ? (
                <Button
                  variant="ghost"
                  className="rounded-full"
                  disabled={saving}
                  onClick={() => updateCycle.mutate({ id: cycleEndingHere.id, end_date: null })}
                >
                  Desfazer fim neste dia
                </Button>
              ) : null}
            </div>
            {pending ? (
              <div
                role="alert"
                className="mt-3 rounded-2xl border border-border bg-card p-3 text-sm"
              >
                <ul className="space-y-1">
                  {pending.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => runPeriodAction(pending.kind, true)}
                  >
                    Confirmar mesmo assim
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => setPending(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-medium">Fluxo</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {FLOW_OPTIONS.map((o) => {
                  const active = flow === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        playSound("tap");
                        setFlow(active ? null : o.value);
                      }}
                      className={cn(
                        "press flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-medium transition-all",
                        active
                          ? "border-transparent bg-phase-menstrual text-white shadow-[var(--shadow-soft)]"
                          : "border-border bg-card hover:bg-secondary",
                      )}
                    >
                      <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
                        {o.drops === 0 ? (
                          <span
                            className="size-2.5 rounded-full border-2"
                            style={{ borderColor: active ? "#fff" : "var(--phase-menstrual)" }}
                          />
                        ) : (
                          Array.from({ length: o.drops }, (_, i) => (
                            <Droplet
                              key={i}
                              className="size-3.5"
                              fill={active ? "#fff" : "var(--phase-menstrual)"}
                              stroke="none"
                            />
                          ))
                        )}
                      </span>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </LogSection>

          <LogSection id="mood" title="Humor" accent="var(--petal-amber)">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
              {MOOD_OPTIONS.map((o) => {
                const active = moods.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      tick(o.value);
                      setMoods((prev) => toggle(prev, o.value));
                    }}
                    className={cn(
                      "press flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 text-xs font-medium transition-all",
                      active
                        ? "border-foreground/80 bg-card shadow-[var(--shadow-soft)]"
                        : "border-transparent bg-secondary/60 hover:bg-secondary",
                    )}
                  >
                    <span className={cn(active && lastToggled === o.value && "animate-pop")}>
                      <MoodShape mood={o.value} size={34} />
                    </span>
                    {o.label}
                  </button>
                );
              })}
            </div>
            {moods.length > 0 ? (
              <div className="mt-4 animate-fade-up">
                <SegmentedScale
                  label={`Intensidade${intensity ? ` — ${INTENSITY_LABELS[intensity]}` : " (opcional)"}`}
                  options={[1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }))}
                  value={intensity ?? undefined}
                  onChange={(v) => setIntensity(v ?? null)}
                  color="var(--petal-amber)"
                />
              </div>
            ) : null}
            <Label htmlFor="mood-notes" className="mt-4 mb-2 block text-sm font-medium">
              Sobre o seu humor{" "}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="mood-notes"
              value={moodNotes}
              maxLength={NOTES_MAX}
              onChange={(e) => setMoodNotes(e.target.value)}
              placeholder="Escreva com suas palavras."
              className="min-h-16 rounded-2xl bg-card"
            />
          </LogSection>

          <LogSection id="symptoms" title="Corpo e sintomas" accent="var(--petal-coral)">
            <div className="space-y-4">
              <SegmentedScale
                label="Cólicas"
                options={scaleOptions("cramps")}
                value={metrics.cramps}
                onChange={(v) => setMetric("cramps", v)}
                color="var(--petal-coral)"
              />
              <SegmentedScale
                label="Outras dores"
                options={scaleOptions("pain")}
                value={metrics.pain}
                onChange={(v) => setMetric("pain", v)}
                color="var(--petal-rose)"
              />
              <ChipGroup
                legend="Sintomas físicos"
                options={SYMPTOM_OPTIONS}
                selected={physical}
                onToggle={(v) => {
                  tick(v);
                  setPhysical((p) => toggle(p, v));
                }}
              />
              <ChipGroup
                legend="Sintomas emocionais"
                options={EMOTIONAL_SYMPTOM_OPTIONS}
                selected={emotional}
                onToggle={(v) => {
                  tick(v);
                  setEmotional((p) => toggle(p, v));
                }}
              />
            </div>
          </LogSection>

          <LogSection id="energy" title="Energia" accent="var(--petal-teal)">
            <SegmentedScale
              label="Como está sua energia?"
              options={scaleOptions("energy")}
              value={metrics.energy}
              onChange={(v) => setMetric("energy", v)}
              color="var(--petal-teal)"
            />
          </LogSection>

          <LogSection id="sleep" title="Sono" accent="var(--petal-blue)">
            <SegmentedScale
              label="Qualidade do sono"
              options={scaleOptions("sleep_quality")}
              value={metrics.sleep_quality}
              onChange={(v) => setMetric("sleep_quality", v)}
              color="var(--petal-blue)"
            />
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
              <span className="text-sm font-medium" id="sleep-hours-label">
                Horas dormidas
              </span>
              <div
                className="flex items-center gap-2"
                role="group"
                aria-labelledby="sleep-hours-label"
              >
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-10 rounded-full"
                  aria-label="Diminuir meia hora"
                  onClick={() =>
                    setMetric("sleep_hours", Math.max(0, (metrics.sleep_hours ?? 7.5) - 0.5))
                  }
                >
                  <Minus aria-hidden="true" />
                </Button>
                <output
                  aria-live="polite"
                  className="w-16 text-center text-lg font-bold tabular-nums"
                >
                  {metrics.sleep_hours !== undefined
                    ? `${metrics.sleep_hours.toLocaleString("pt-BR")} h`
                    : "—"}
                </output>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-10 rounded-full"
                  aria-label="Aumentar meia hora"
                  onClick={() =>
                    setMetric("sleep_hours", Math.min(16, (metrics.sleep_hours ?? 7) + 0.5))
                  }
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            </div>
            {metrics.sleep_hours !== undefined ? (
              <button
                type="button"
                className="mt-2 text-xs text-muted-foreground underline"
                onClick={() => setMetric("sleep_hours", undefined)}
              >
                Limpar horas
              </button>
            ) : null}
          </LogSection>

          <LogSection id="notes" title="Diário do dia" accent="var(--petal-lilac)">
            <Label htmlFor="day-notes" className="sr-only">
              Observações pessoais
            </Label>
            <Textarea
              id="day-notes"
              value={dayNotes}
              maxLength={NOTES_MAX}
              onChange={(e) => setDayNotes(e.target.value)}
              placeholder="Como foi seu dia? Só você vê o que escrever aqui."
              className="min-h-28 rounded-2xl bg-card"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
              {dayNotes.length}/{NOTES_MAX}
            </p>
          </LogSection>
        </div>

        <div className="flex gap-2 border-t border-border bg-background/95 px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur">
          <Button
            variant="ghost"
            className="min-h-12 rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-h-12 flex-1 rounded-full text-base shadow-[var(--shadow-glow)]"
          >
            {saving ? "Salvando na nuvem…" : "Salvar registro"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LogSection({
  id,
  title,
  accent,
  children,
}: {
  id: FlowerSection;
  title: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <section
      id={`log-section-${id}`}
      aria-labelledby={`log-title-${id}`}
      className="scroll-mt-4 rounded-3xl bg-surface/70 p-4"
    >
      <h3 id={`log-title-${id}`} className="mb-3 flex items-center gap-2 text-sm font-bold">
        <span className="size-2.5 rounded-full" style={{ background: accent }} aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function ChipGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: readonly { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected.includes(o.value)}
            onClick={() => onToggle(o.value)}
            className="bloom-chip"
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
