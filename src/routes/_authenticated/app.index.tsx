import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ArrowRight, CalendarHeart, EyeOff, Sparkles } from "lucide-react";
import { CycleRing } from "@/components/bloom/CycleRing";
import { DayFlower, type FlowerSection } from "@/components/bloom/DayFlower";
import { ErrorState, LoadingBloom } from "@/components/bloom/Feedback";
import { useLogSheet } from "@/components/bloom/LogSheetContext";
import { DayCell, WEEKDAY_LETTERS } from "@/components/bloom/MiniMonth";
import { MoodShape } from "@/components/bloom/MoodShape";
import { PHASE_INFO, moodLabel } from "@/domain/catalog";
import { addDays, startOfWeekISO } from "@/domain/cycle";
import { generateInsights } from "@/domain/insights";
import { contextualMessage } from "@/domain/messages";
import { decodeSymptoms } from "@/domain/metrics";
import { filterByDate, symptomFrequency } from "@/domain/statistics";
import { useCycleModel, useProfile } from "@/hooks/useBloomData";
import { useDeviceSettings } from "@/lib/device-settings";
import { formatShort, formatWeekdayLong, greetingForNow, relativeDaysLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Seu ciclo — Bloom" },
      {
        name: "description",
        content: "Resumo do seu ciclo, previsões estimadas e registro rápido do dia.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HomeScreen,
});

const CONFIDENCE_LABEL = {
  none: "baseada no padrão informado",
  low: "pouca precisão (1 ciclo)",
  medium: "precisão moderada",
  high: "boa base de registros",
} as const;

function HomeScreen() {
  const navigate = useNavigate();
  const { openLog } = useLogSheet();
  const profile = useProfile();
  const device = useDeviceSettings();
  const model = useCycleModel();
  const { today, overview, preferences, dailyLogs, moodLogs } = model;
  const discreet = device.discreet;

  useEffect(() => {
    if (preferences.data?.onboarding_completed === false && !preferences.isFetching) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [preferences.data, preferences.isFetching, navigate]);

  const todayDaily = dailyLogs.data?.find((l) => l.log_date === today) ?? null;
  const todayMood = moodLogs.data?.find((l) => l.log_date === today) ?? null;
  const decodedToday = decodeSymptoms(todayDaily?.symptoms);
  const filled: Partial<Record<FlowerSection, boolean>> = {
    flow: Boolean(todayDaily?.flow_intensity) || model.recorded.has(today),
    mood: Boolean(todayMood?.moods.length),
    symptoms:
      decodedToday.physical.length + decodedToday.emotional.length > 0 ||
      decodedToday.metrics.cramps !== undefined ||
      decodedToday.metrics.pain !== undefined,
    energy: decodedToday.metrics.energy !== undefined,
    sleep:
      decodedToday.metrics.sleep_quality !== undefined ||
      decodedToday.metrics.sleep_hours !== undefined,
    notes: Boolean(todayDaily?.notes),
  };
  const loggedToday = Boolean(todayDaily || todayMood);

  const logged = useMemo(
    () => new Set([...(dailyLogs.data ?? []), ...(moodLogs.data ?? [])].map((l) => l.log_date)),
    [dailyLogs.data, moodLogs.data],
  );
  const marks = {
    recorded: model.recorded,
    predicted: model.predicted,
    fertile: model.fertile,
    ovulation: model.ovulation,
    logged,
  };

  const recentMoods = useMemo(
    () =>
      (moodLogs.data ?? [])
        .filter((m) => m.moods.length && m.log_date >= addDays(today, -6) && m.log_date <= today)
        .slice(0, 7),
    [moodLogs.data, today],
  );
  const topSymptoms = useMemo(
    () =>
      symptomFrequency(filterByDate(dailyLogs.data ?? [], addDays(today, -90), today)).slice(0, 4),
    [dailyLogs.data, today],
  );
  const insight = useMemo(
    () => generateInsights(model.records, dailyLogs.data ?? [], moodLogs.data ?? [])[0] ?? null,
    [model.records, dailyLogs.data, moodLogs.data],
  );

  if (model.isLoading)
    return <LoadingBloom label="Preparando seu ciclo…" className="min-h-[60vh]" />;
  if (model.isError) return <ErrorState onRetry={() => void model.refetch()} />;

  const message = contextualMessage(overview, loggedToday);
  const phase = overview.phase ? PHASE_INFO[overview.phase] : null;
  const days = overview.daysUntilNextPeriod;
  const inPeriod = overview.phase === "menstrual";
  const weekStart = startOfWeekISO(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  let headline: string;
  if (overview.lastPeriodStart === null) headline = "Registre sua menstruação";
  else if (discreet) headline = "Ciclo em andamento";
  else if (inPeriod) headline = `Menstruação · dia ${overview.dayOfCycle}`;
  else if (days !== null && days > 1) headline = `${days} dias até a próxima menstruação`;
  else if (days === 1) headline = "Menstruação prevista para amanhã";
  else if (days === 0) headline = "Menstruação prevista para hoje";
  else if (days !== null)
    headline = `Menstruação ${Math.abs(days)} ${Math.abs(days) === 1 ? "dia" : "dias"} após a estimativa`;
  else headline = `Dia ${overview.dayOfCycle} do ciclo`;

  const name = profile.data?.display_name;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 animate-fade-up">
        <div>
          <p className="eyebrow first-letter:uppercase">{formatWeekdayLong(today)}</p>
          <h1 className="mt-1 text-[1.75rem] leading-tight font-bold tracking-tight md:text-3xl">
            {greetingForNow(name)}
          </h1>
        </div>
        {discreet ? (
          <Link
            to="/app/ajustes"
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <EyeOff className="size-3.5" aria-hidden="true" /> Modo discreto ativo
          </Link>
        ) : null}
      </header>

      {/* Faixa da semana */}
      <section aria-label="Esta semana" className="bloom-card p-3 animate-fade-up">
        <ul className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => (
            <li key={day} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  day === today ? "text-primary" : "text-muted-foreground",
                )}
              >
                {day === today ? "Hoje" : WEEKDAY_LETTERS[i]}
              </span>
              <DayCell
                iso={day}
                marks={
                  discreet
                    ? {
                        ...marks,
                        recorded: new Set(),
                        predicted: new Set(),
                        fertile: new Set(),
                        ovulation: new Set(),
                      }
                    : marks
                }
                today={today}
                onSelect={(d) => openLog(d)}
                size="md"
              />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Anel do ciclo */}
        <section
          aria-labelledby="ring-title"
          className="bloom-card relative overflow-hidden p-5 md:p-8 animate-scale-in"
        >
          <div className="dawn grain absolute inset-0 opacity-90" aria-hidden="true" />
          <div className="relative">
            <h2 id="ring-title" className="sr-only">
              Seu ciclo atual
            </h2>
            <CycleRing
              cycleStart={overview.lastPeriodStart}
              cycleLength={overview.cycleLength.value}
              today={today}
              dayOfCycle={overview.dayOfCycle}
              recorded={model.recorded}
              predicted={model.predicted}
              fertile={model.fertile}
              ovulation={model.ovulation}
              loggedDays={logged}
              discreet={discreet}
              label={`${headline}${phase && !discreet ? `. Fase estimada: ${phase.label}` : ""}`}
            >
              <p className="text-xs font-semibold text-muted-foreground">
                Hoje, {formatShort(today)}
              </p>
              <p className="mt-1 text-xl leading-tight font-bold tracking-tight text-balance sm:text-2xl">
                {headline}
              </p>
              {phase && !discreet ? (
                <span
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap"
                  style={{ background: phase.soft, color: phase.color }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: phase.color }}
                    aria-hidden="true"
                  />
                  Fase {phase.label.toLowerCase()} · estimada
                </span>
              ) : null}
            </CycleRing>

            {overview.lastPeriodStart === null ? (
              <button
                type="button"
                onClick={() => openLog(today, "flow")}
                className="press mx-auto mt-4 flex min-h-12 items-center gap-2 rounded-full bg-ink px-5 font-semibold text-ink-foreground"
              >
                <CalendarHeart className="size-5" aria-hidden="true" /> Registrar menstruação
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openLog(today, "mood")}
                className="press mt-4 flex w-full items-center gap-3 rounded-2xl bg-accent/70 px-4 py-3 text-left"
              >
                <span
                  className="flex size-9 items-center justify-center rounded-full"
                  style={{ background: "var(--petal-amber)" }}
                  aria-hidden="true"
                >
                  <Sparkles className="size-4 text-white" />
                </span>
                <span className="flex-1 font-semibold">Como você se sente hoje?</span>
                <ArrowRight className="size-5 text-primary" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>

        <div className="space-y-6">
          {/* Mensagem contextual */}
          <section className="bloom-gradient grain overflow-hidden rounded-[1.75rem] p-5 text-white shadow-[var(--shadow-lift)] animate-fade-up">
            <div className="relative z-10">
              <p className="text-xs font-semibold tracking-wide text-white/80 uppercase">
                Para você hoje
              </p>
              <h2 className="mt-1 text-lg leading-snug font-bold">{message.title}</h2>
              <p className="mt-1 text-sm text-white/90">{message.body}</p>
            </div>
          </section>

          {/* Próxima menstruação */}
          {!discreet ? (
            <section className="grid grid-cols-2 gap-3 stagger" aria-label="Previsões">
              <div className="bloom-card p-4">
                <p className="eyebrow">Próxima menstruação</p>
                <p className="mt-2 text-xl font-bold">
                  {overview.nextPeriod ? formatShort(overview.nextPeriod.date) : "—"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {overview.nextPeriod && days !== null
                    ? `${relativeDaysLabel(days)} · estimativa`
                    : "Sem dados suficientes"}
                </p>
              </div>
              <div className="bloom-card p-4">
                <p className="eyebrow">Ciclo médio</p>
                <p className="mt-2 text-xl font-bold tabular-nums">
                  {overview.cycleLength.value}
                  <span className="ml-1 text-sm font-medium text-muted-foreground">dias</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {CONFIDENCE_LABEL[overview.cycleLength.confidence]}
                </p>
              </div>
            </section>
          ) : null}

          {/* Flor do dia */}
          <section aria-labelledby="flower-title" className="bloom-card p-5">
            <div className="flex items-center justify-between">
              <h2 id="flower-title" className="font-bold">
                Seu dia
              </h2>
              <span className="text-xs text-muted-foreground">
                {Object.values(filled).filter(Boolean).length} de 6 registrados
              </span>
            </div>
            <DayFlower
              filled={filled}
              onSelect={(s) => openLog(today, s)}
              className="mt-2 max-w-[240px]"
            />
            <p className="text-center text-xs text-muted-foreground">
              Toque em uma pétala para registrar.
            </p>
          </section>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <section aria-labelledby="moods-title" className="bloom-card p-5">
          <div className="flex items-center justify-between">
            <h2 id="moods-title" className="font-bold">
              Humor recente
            </h2>
            <Link to="/app/humor" className="text-xs font-semibold text-primary">
              Ver tudo
            </Link>
          </div>
          {recentMoods.length ? (
            <ul className="mt-4 flex flex-wrap gap-3">
              {recentMoods.map((m) => (
                <li key={m.log_date} className="flex flex-col items-center gap-1 text-center">
                  <MoodShape mood={m.moods[0]!} size={40} />
                  <span className="text-[11px] font-medium">{moodLabel(m.moods[0]!)}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatShort(m.log_date)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum humor registrado nos últimos 7 dias.
            </p>
          )}
        </section>

        <section aria-labelledby="symptoms-title" className="bloom-card p-5">
          <div className="flex items-center justify-between">
            <h2 id="symptoms-title" className="font-bold">
              Sintomas mais frequentes
            </h2>
            <span className="text-xs text-muted-foreground">90 dias</span>
          </div>
          {topSymptoms.length ? (
            <ul className="mt-4 space-y-3">
              {topSymptoms.map((s, i) => (
                <li key={s.value}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted-foreground tabular-nums">{s.count}×</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${(s.count / topSymptoms[0]!.count) * 100}%`,
                        background: [
                          "var(--petal-coral)",
                          "var(--petal-rose)",
                          "var(--petal-lilac)",
                          "var(--petal-teal)",
                        ][i],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Seus sintomas aparecerão aqui conforme você registrar.
            </p>
          )}
        </section>

        <section
          aria-labelledby="insight-title"
          className="bloom-card flex flex-col p-5 md:col-span-2 xl:col-span-1"
        >
          <h2 id="insight-title" className="font-bold">
            Insight pessoal
          </h2>
          {insight ? (
            <>
              <p className="mt-3 font-semibold">{insight.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{insight.body}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Baseado em {insight.basedOn}. Descritivo, não é diagnóstico.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Registre pelo menos dois ciclos para ver padrões descritivos dos seus dados.
            </p>
          )}
          <Link
            to="/app/analise"
            className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary"
          >
            Ver análise completa <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Previsões são estimativas calculadas a partir dos seus registros. O Bloom não é método
        contraceptivo nem ferramenta de diagnóstico.
      </p>
    </div>
  );
}
