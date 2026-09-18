import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight, Flower2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CycleRing } from "@/components/bloom/CycleRing";
import { DayLogSheet } from "@/components/bloom/DayLogSheet";
import { MoodShape } from "@/components/bloom/MoodShape";
import { OrganicField } from "@/components/bloom/OrganicField";
import { PHASE_INFO, flowLabel, moodLabel, symptomLabel } from "@/domain/catalog";
import { addDays, buildCycleOverview, diffInDays, type CycleRecord } from "@/domain/cycle";
import { formatLong, formatShort, greetingForNow, relativeDaysLabel, todayISO } from "@/lib/format";
import {
  useCycles,
  useDailyLogs,
  useMoodLogs,
  usePreferences,
  useProfile,
} from "@/hooks/useBloomData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Home — Bloom" },
      { name: "description", content: "Resumo do seu ciclo, fase estimada e registros recentes." },
      { property: "og:title", content: "Home — Bloom" },
      { property: "og:description", content: "Resumo do ciclo e registro rápido do dia." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HomeScreen,
});

function HomeScreen() {
  const navigate = useNavigate();
  const today = todayISO();
  const profile = useProfile();
  const preferences = usePreferences();
  const cycles = useCycles();
  const dailyLogs = useDailyLogs();
  const moodLogs = useMoodLogs();

  const [sheetDate, setSheetDate] = useState<string | null>(null);

  useEffect(() => {
    if (preferences.data && preferences.data.onboarding_completed === false) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [preferences.data, navigate]);

  const cycleRecords: CycleRecord[] = useMemo(
    () =>
      (cycles.data ?? []).map((c) => ({
        id: c.id,
        start_date: c.start_date,
        end_date: c.end_date,
      })),
    [cycles.data],
  );

  const overview = useMemo(
    () =>
      buildCycleOverview(cycleRecords, today, {
        cycleLength: preferences.data?.average_cycle_length ?? null,
        periodLength: preferences.data?.average_period_length ?? null,
      }),
    [cycleRecords, today, preferences.data],
  );

  const lastMood = moodLogs.data?.[0] ?? null;
  const lastSymptomLog = dailyLogs.data?.find((log) => log.symptoms.length > 0) ?? null;
  const loading = cycles.isLoading || preferences.isLoading;
  const phaseInfo = overview.phase ? PHASE_INFO[overview.phase] : null;

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(today, index - 3)),
    [today],
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{greetingForNow(profile.data?.display_name)}</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
            <Flower2 className="h-5 w-5 text-primary" aria-hidden="true" />
            Bloom
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatLong(today)}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full"
          asChild
          aria-label="Preferências de notificações"
        >
          <Link to="/app/ajustes">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
      </header>

      {loading ? (
        <Skeleton className="h-72 w-full rounded-3xl" />
      ) : (
        <section
          aria-label="Estado atual do ciclo"
          className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-4"
        >
          <div className="absolute inset-x-0 top-0 h-24 opacity-50">
            <OrganicField variant={overview.phase === "menstrual" ? "petals" : "garden"} />
          </div>
          <div className="relative">
            <CycleRing
              dayOfCycle={overview.dayOfCycle}
              cycleLength={overview.cycleLength.value}
              phase={overview.phase}
              label={phaseInfo ? `Fase ${phaseInfo.label.toLowerCase()}` : "Vamos começar"}
              helper={
                phaseInfo
                  ? "Fase estimada com base nos seus registros."
                  : "Registre sua última menstruação para ver estimativas."
              }
            />
          </div>

          <div className="relative mt-2 space-y-2 rounded-3xl bg-secondary/50 p-4 text-sm">
            {overview.lastPeriodStart ? (
              <p>
                Última menstruação começou em{" "}
                <strong className="font-semibold">{formatLong(overview.lastPeriodStart)}</strong>.
              </p>
            ) : (
              <p>Você ainda não registrou uma menstruação.</p>
            )}
            {overview.nextPeriod ? (
              <p>
                Próxima menstruação estimada para{" "}
                <strong className="font-semibold">{formatLong(overview.nextPeriod.date)}</strong>{" "}
                ({relativeDaysLabel(diffInDays(today, overview.nextPeriod.date))}).
              </p>
            ) : (
              <p>Registre seus ciclos para o Bloom estimar as próximas datas.</p>
            )}
            <p className="text-xs text-muted-foreground">
              {overview.hasEnoughHistory
                ? `Estimativa aproximada, calculada com ${overview.nextPeriod?.basedOnCycles ?? 0} ciclo(s) anteriores.`
                : "Estimativa aproximada e inicial: ainda há poucos ciclos registrados."}
            </p>
          </div>
        </section>
      )}

      <section aria-label="Semana atual" className="rounded-3xl border border-border bg-card p-4">
        <ul className="flex items-end justify-between gap-1">
          {weekDays.map((day) => {
            const isToday = day === today;
            const hasPeriod = cycleRecords.some(
              (c) => c.start_date <= day && (c.end_date ?? c.start_date) >= day,
            );
            const hasMood = moodLogs.data?.some((m) => m.log_date === day);
            return (
              <li key={day} className="flex flex-col items-center gap-1">
                <span className="text-[11px] text-muted-foreground">{formatShort(day).split(" ")[0]}</span>
                <button
                  type="button"
                  onClick={() => setSheetDate(day)}
                  aria-label={`Registrar ${formatLong(day)}`}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                    hasPeriod
                      ? "border-transparent bg-bloom-pink text-primary-foreground"
                      : "border-border bg-background",
                    isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                  )}
                >
                  {Number(day.slice(-2))}
                </button>
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    hasMood ? "bg-bloom-lilac" : "bg-transparent",
                  )}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <Button className="min-h-14 w-full text-base" onClick={() => setSheetDate(today)}>
        <Plus className="h-5 w-5" aria-hidden="true" />
        Registrar hoje
      </Button>

      <section aria-label="Resumo dos registros" className="grid grid-cols-2 gap-3">
        <SummaryCard
          title="Próxima menstruação"
          value={overview.nextPeriod ? formatShort(overview.nextPeriod.date) : "Sem estimativa"}
          hint={overview.nextPeriod ? "estimativa" : "faltam registros"}
        />
        <SummaryCard
          title="Desde o último início"
          value={
            overview.lastPeriodStart
              ? `${diffInDays(overview.lastPeriodStart, today)} dias`
              : "—"
          }
          hint={overview.lastPeriodStart ? "registrado por você" : "sem registro"}
        />
        <div className="bloom-card col-span-2 flex items-center gap-3 p-4">
          {lastMood && lastMood.moods[0] ? (
            <MoodShape mood={lastMood.moods[0]} size={44} />
          ) : (
            <div className="h-11 w-11 rounded-full bg-muted" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Último humor registrado</p>
            <p className="truncate font-semibold">
              {lastMood ? lastMood.moods.map(moodLabel).join(", ") : "Nenhum ainda"}
            </p>
            {lastMood ? (
              <p className="text-xs text-muted-foreground">{formatShort(lastMood.log_date)}</p>
            ) : null}
          </div>
          <Link
            to="/app/humor"
            className="flex min-h-11 items-center gap-1 text-sm font-medium text-primary"
          >
            Humor
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="bloom-card col-span-2 p-4">
          <p className="text-xs text-muted-foreground">Últimos sintomas registrados</p>
          {lastSymptomLog ? (
            <>
              <p className="mt-1 font-semibold">
                {lastSymptomLog.symptoms.map(symptomLabel).join(", ")}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatShort(lastSymptomLog.log_date)}
                {flowLabel(lastSymptomLog.flow_intensity)
                  ? ` · fluxo ${flowLabel(lastSymptomLog.flow_intensity)?.toLowerCase()}`
                  : ""}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Nada registrado ainda. Use “Registrar hoje” quando quiser.
            </p>
          )}
        </div>
      </section>

      <p className="pb-2 text-xs leading-relaxed text-muted-foreground">
        As fases e previsões do Bloom são estimativas baseadas nos seus registros. O app não
        confirma ovulação, não serve como método contraceptivo e não substitui avaliação de saúde.
      </p>

      <DayLogSheet
        date={sheetDate}
        open={sheetDate !== null}
        onOpenChange={(open) => setSheetDate(open ? sheetDate : null)}
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bloom-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
