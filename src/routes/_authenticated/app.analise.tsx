import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Lightbulb, Printer } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingBloom,
  PageHeader,
  StatCard,
} from "@/components/bloom/Feedback";
import { PeriodTabs } from "@/components/bloom/PeriodTabs";
import { moodLabel } from "@/domain/catalog";
import { generateInsights } from "@/domain/insights";
import { METRIC_DEFINITIONS, metricLabel, type MetricKey } from "@/domain/metrics";
import { buildHistoryCsv, exportFileName } from "@/domain/export";
import {
  TYPICAL_CYCLE_MAX,
  TYPICAL_CYCLE_MIN,
  buildPeriodReport,
  filterByDate,
  moodSeries,
  periodStart,
  summarizeCycles,
  type PeriodFilter,
} from "@/domain/statistics";
import { useCycleModel } from "@/hooks/useBloomData";
import { downloadText } from "@/lib/download";
import { formatDayMonth, formatShort } from "@/lib/format";
import { useDeviceSettings } from "@/lib/device-settings";

export const Route = createFileRoute("/_authenticated/app/analise")({
  head: () => ({
    meta: [
      { title: "Análise — Bloom" },
      {
        name: "description",
        content: "Estatísticas descritivas dos seus ciclos, sintomas e humor.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalysisScreen,
});

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  boxShadow: "var(--shadow-soft)",
  fontSize: 12,
  color: "var(--foreground)",
};

function AnalysisScreen() {
  const model = useCycleModel();
  const device = useDeviceSettings();
  const animate = !device.reduceMotion;
  const [filter, setFilter] = useState<PeriodFilter>("6m");
  const { today } = model;
  const daily = model.dailyLogs.data ?? [];
  const moods = model.moodLogs.data ?? [];

  const report = useMemo(
    () => buildPeriodReport(model.records, daily, moods, filter, today),
    [model.records, daily, moods, filter, today],
  );
  const from = periodStart(filter, today);
  const cycles = useMemo(
    () => summarizeCycles(model.records, daily, moods).filter((c) => !from || c.start >= from),
    [model.records, daily, moods, from],
  );
  const series = useMemo(() => moodSeries(filterByDate(moods, from, today)), [moods, from, today]);
  const insights = useMemo(
    () => generateInsights(model.records, daily, moods),
    [model.records, daily, moods],
  );

  if (model.isLoading)
    return <LoadingBloom label="Calculando suas estatísticas…" className="min-h-[60vh]" />;
  if (model.isError) return <ErrorState onRetry={() => void model.refetch()} />;

  const hasAnything = model.records.length > 0 || daily.length > 0 || moods.length > 0;
  const cycleChart = cycles
    .filter((c) => c.cycleLength !== null)
    .map((c) => ({ name: formatDayMonth(c.start), dias: c.cycleLength!, irregular: c.irregular }));

  function exportReport() {
    const csv = buildHistoryCsv(
      { cycles: model.cycles.data ?? [], daily_logs: daily, mood_logs: moods },
      from,
      today,
    );
    downloadText(csv, exportFileName("csv", today), "text/csv;charset=utf-8");
    toast.success("Relatório do período baixado.");
  }

  return (
    <div className="print:text-black">
      <PageHeader
        eyebrow="Análise"
        title="Seus padrões"
        description="Números calculados apenas com o que você registrou. São descrições, não diagnósticos."
        actions={
          <>
            <PeriodTabs value={filter} onChange={setFilter} />
            <Button
              variant="outline"
              className="rounded-full print:hidden"
              onClick={exportReport}
              disabled={!hasAnything}
            >
              <Download aria-hidden="true" /> CSV
            </Button>
            <Button
              variant="outline"
              className="rounded-full print:hidden"
              onClick={() => window.print()}
              disabled={!hasAnything}
            >
              <Printer aria-hidden="true" /> Imprimir
            </Button>
          </>
        }
      />

      {!hasAnything ? (
        <div className="bloom-card">
          <EmptyState
            title="Ainda não há o que analisar"
            description="Registre suas menstruações e alguns dias de humor e sintomas. As estatísticas aparecem automaticamente."
          />
        </div>
      ) : (
        <div className="space-y-6">
          <section
            aria-label="Resumo do período"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4 stagger"
          >
            <StatCard
              label="Ciclo médio"
              accent="var(--phase-menstrual)"
              value={report.cycleLength.mean ?? "—"}
              unit={report.cycleLength.mean ? "dias" : ""}
              hint={`${report.completeCycles} ciclos completos`}
            />
            <StatCard
              label="Variação"
              accent="var(--phase-luteal)"
              value={report.variability ?? "—"}
              unit={report.variability !== null ? "dias" : ""}
              hint={
                report.cycleLength.min !== null
                  ? `de ${report.cycleLength.min} a ${report.cycleLength.max} dias`
                  : "precisa de 2 ciclos completos"
              }
            />
            <StatCard
              label="Menstruação média"
              accent="var(--petal-coral)"
              value={report.periodLength.mean ?? "—"}
              unit={report.periodLength.mean ? "dias" : ""}
              hint={`${report.periodLength.count} com fim registrado`}
            />
            <StatCard
              label="Fora do padrão"
              accent="var(--phase-ovulatory)"
              value={report.irregularCycles}
              hint={`ciclos sinalizados de ${report.cyclesStarted}`}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard
              title="Duração dos ciclos"
              subtitle={`Faixa sombreada: ${TYPICAL_CYCLE_MIN}–${TYPICAL_CYCLE_MAX} dias (referência populacional)`}
            >
              {cycleChart.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={cycleChart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <ReferenceArea
                      y1={TYPICAL_CYCLE_MIN}
                      y2={TYPICAL_CYCLE_MAX}
                      fill="var(--phase-ovulatory-soft)"
                      fillOpacity={0.6}
                    />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                      domain={[0, (max: number) => Math.max(40, max + 5)]}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: "var(--secondary)" }}
                      formatter={(v) => [`${v} dias`, "Duração"]}
                    />
                    {report.cycleLength.mean ? (
                      <ReferenceLine
                        y={report.cycleLength.mean}
                        stroke="var(--primary)"
                        strokeDasharray="4 4"
                      />
                    ) : null}
                    <Bar
                      dataKey="dias"
                      maxBarSize={56}
                      radius={[10, 10, 4, 4]}
                      isAnimationActive={animate}
                      animationDuration={900}
                    >
                      {cycleChart.map((c) => (
                        <Cell
                          key={c.name}
                          fill={c.irregular ? "var(--petal-amber)" : "var(--phase-menstrual)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty text="Registre o início de pelo menos dois ciclos para ver as durações." />
              )}
            </ChartCard>

            <ChartCard
              title="Evolução do humor"
              subtitle="De −2 (mais difícil) a +2 (mais leve), conforme os humores escolhidos"
            >
              {series.length >= 2 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={series.map((p) => ({ ...p, name: formatDayMonth(p.date) }))}
                    margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="mood-line" x1="0" x2="1">
                        <stop offset="0%" stopColor="var(--petal-lilac)" />
                        <stop offset="100%" stopColor="var(--petal-amber)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                      minTickGap={16}
                    />
                    <YAxis
                      domain={[-2, 2]}
                      ticks={[-2, -1, 0, 1, 2]}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                    />
                    <ReferenceLine y={0} stroke="var(--border)" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Humor"]} />
                    <Line
                      type="monotone"
                      dataKey="valence"
                      stroke="url(#mood-line)"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "var(--card)", strokeWidth: 2 }}
                      isAnimationActive={animate}
                      animationDuration={1100}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty text="Registre o humor em pelo menos dois dias do período." />
              )}
            </ChartCard>

            <ChartCard
              title="Frequência de sintomas"
              subtitle={`Dias com cada sintoma, entre ${report.loggedDays} dias registrados`}
            >
              {report.topSymptoms.length ? (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(160, report.topSymptoms.length * 44)}
                >
                  <BarChart
                    layout="vertical"
                    data={report.topSymptoms}
                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                  >
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={130}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      stroke="var(--foreground)"
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: "var(--secondary)" }}
                      formatter={(v) => [`${v} dias`, "Registros"]}
                    />
                    <Bar
                      dataKey="count"
                      maxBarSize={34}
                      radius={[6, 12, 12, 6]}
                      isAnimationActive={animate}
                      animationDuration={900}
                    >
                      {report.topSymptoms.map((s, i) => (
                        <Cell
                          key={s.value}
                          fill={
                            [
                              "var(--petal-coral)",
                              "var(--petal-rose)",
                              "var(--petal-lilac)",
                              "var(--petal-teal)",
                              "var(--petal-amber)",
                            ][i % 5]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty text="Nenhum sintoma registrado no período." />
              )}
            </ChartCard>

            <ChartCard
              title="Corpo, energia e sono"
              subtitle="Médias do período, quando registradas"
            >
              <ul className="grid grid-cols-2 gap-3">
                {(Object.keys(METRIC_DEFINITIONS) as MetricKey[]).map((k) => {
                  const v = report.metrics[k];
                  return (
                    <li key={k} className="rounded-2xl bg-secondary/60 p-3">
                      <p className="text-xs text-muted-foreground">{METRIC_DEFINITIONS[k].label}</p>
                      <p className="mt-1 text-lg font-bold tabular-nums">
                        {v === undefined
                          ? "—"
                          : k === "sleep_hours"
                            ? metricLabel(k, v)
                            : `${v} / ${METRIC_DEFINITIONS[k].max}`}
                      </p>
                    </li>
                  );
                })}
              </ul>
              {report.topMoods.length ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Humores mais registrados:{" "}
                  <strong className="text-foreground">
                    {report.topMoods
                      .slice(0, 3)
                      .map((m) => `${moodLabel(m.value)} (${m.count})`)
                      .join(", ")}
                  </strong>
                </p>
              ) : null}
            </ChartCard>
          </div>

          <section aria-labelledby="compare-title" className="bloom-card overflow-hidden">
            <div className="p-5 pb-3">
              <h2 id="compare-title" className="font-bold">
                Comparação entre ciclos
              </h2>
              <p className="text-xs text-muted-foreground">
                "Fora do padrão" descreve seus registros; converse com um profissional se algo te
                preocupar.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Início
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Duração
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Menstruação
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Dias registrados
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Sintomas principais
                    </th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Observação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...cycles].reverse().map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-5 py-3 font-semibold">{formatShort(c.start)}</td>
                      <td className="px-3 py-3 tabular-nums">
                        {c.cycleLength
                          ? `${c.cycleLength} dias`
                          : c.isCurrent
                            ? "Em andamento"
                            : "—"}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {c.periodLength ? `${c.periodLength} dias` : "—"}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{c.loggedDays}</td>
                      <td className="px-3 py-3">
                        {c.topSymptoms.map((s) => s.label).join(", ") || "—"}
                      </td>
                      <td className="px-5 py-3">
                        {c.irregular ? (
                          <span className="rounded-full bg-phase-follicular-soft px-2 py-0.5 text-xs font-semibold text-phase-follicular">
                            {c.irregularReason}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="insights-title">
            <h2 id="insights-title" className="mb-3 flex items-center gap-2 font-bold">
              <Lightbulb
                className="size-5 text-petal-amber"
                style={{ color: "var(--petal-amber)" }}
                aria-hidden="true"
              />{" "}
              Insights pessoais
            </h2>
            {insights.length ? (
              <ul className="grid gap-3 md:grid-cols-2 stagger">
                {insights.map((i) => (
                  <li key={i.id} className="bloom-card p-5">
                    <p className="font-semibold">{i.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{i.body}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Baseado em {i.basedOn}.
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="bloom-card p-5 text-sm text-muted-foreground">
                Os insights aparecem quando houver registros suficientes (2 ciclos completos ou 3
                registros de um mesmo sintoma).
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bloom-card p-5 animate-fade-up">
      <h2 className="font-bold">{title}</h2>
      {subtitle ? <p className="mb-4 text-xs text-muted-foreground">{subtitle}</p> : null}
      {children}
    </section>
  );
}

function ChartEmpty({ text }: { text: string }) {
  return (
    <p className="flex h-40 items-center justify-center rounded-2xl bg-secondary/50 px-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
