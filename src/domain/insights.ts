/**
 * Insights pessoais: frases descritivas geradas a partir dos registros.
 * Nunca diagnosticam, nunca recomendam tratamento e só aparecem quando há
 * dados suficientes — cada insight informa em quantos registros se baseia.
 */
import { cycleDayForDate, type CycleRecord } from "./cycle";
import { moodLabel, symptomLabel } from "./catalog";
import { decodeSymptoms } from "./metrics";
import {
  moodFrequency,
  summarize,
  summarizeCycles,
  type DailyLogLike,
  type MoodLogLike,
} from "./statistics";

export type InsightKind = "cycle" | "symptom" | "mood" | "habit";

export interface Insight {
  id: string;
  kind: InsightKind;
  title: string;
  body: string;
  basedOn: string;
}

export const MIN_CYCLES_FOR_PATTERN = 2;
export const MIN_LOGS_FOR_PATTERN = 3;

export function generateInsights(
  cycles: readonly CycleRecord[],
  dailyLogs: readonly DailyLogLike[],
  moodLogs: readonly MoodLogLike[],
): Insight[] {
  const insights: Insight[] = [];
  const summaries = summarizeCycles(cycles, dailyLogs, moodLogs);
  const complete = summaries.filter((s) => s.cycleLength !== null);

  // 1. Comparação do último ciclo completo com a média dos anteriores
  if (complete.length >= MIN_CYCLES_FOR_PATTERN + 1) {
    const last = complete[complete.length - 1]!;
    const previous = summarize(complete.slice(0, -1).map((c) => c.cycleLength!));
    const diff = last.cycleLength! - (previous.mean ?? 0);
    const rounded = Math.round(Math.abs(diff));
    insights.push({
      id: "cycle-compare",
      kind: "cycle",
      title:
        rounded === 0
          ? "Seu último ciclo seguiu sua média"
          : `Seu último ciclo foi ${rounded} ${rounded === 1 ? "dia" : "dias"} ${diff > 0 ? "mais longo" : "mais curto"}`,
      body: `O último ciclo completo durou ${last.cycleLength} dias; a média dos ${previous.count} anteriores é ${previous.mean} dias.`,
      basedOn: `${complete.length} ciclos completos`,
    });
  }

  // 2. Variação entre ciclos
  if (complete.length >= MIN_CYCLES_FOR_PATTERN) {
    const s = summarize(complete.map((c) => c.cycleLength!));
    const range = (s.max ?? 0) - (s.min ?? 0);
    insights.push({
      id: "cycle-variation",
      kind: "cycle",
      title: range <= 7 ? "Seus ciclos têm duração parecida" : "Seus ciclos variam bastante",
      body: `${
        range === 0
          ? `Todos os ${complete.length} ciclos completos duraram ${s.min} dias.`
          : `Entre ${s.min} e ${s.max} dias (diferença de ${range} ${range === 1 ? "dia" : "dias"}) nos ciclos registrados.`
      } ${
        range > 7
          ? "Previsões ficam menos precisas quando a variação é grande."
          : "Isso deixa as estimativas mais estáveis."
      }`,
      basedOn: `${complete.length} ciclos completos`,
    });
  }

  // 3. Sintoma recorrente e em que dias do ciclo costuma aparecer
  const byDay = new Map<string, number[]>();
  for (const log of dailyLogs) {
    const day = cycleDayForDate(cycles, log.log_date);
    const decoded = decodeSymptoms(log.symptoms);
    for (const s of [...decoded.physical, ...decoded.emotional]) {
      if (day !== null) byDay.set(s, [...(byDay.get(s) ?? []), day]);
    }
  }
  const recurring = [...byDay.entries()]
    .filter(([, days]) => days.length >= MIN_LOGS_FOR_PATTERN)
    .sort((a, b) => b[1].length - a[1].length)[0];
  if (recurring) {
    const [symptom, days] = recurring;
    const s = summarize(days);
    insights.push({
      id: `symptom-${symptom}`,
      kind: "symptom",
      title: `${symptomLabel(symptom)} é o seu registro mais frequente`,
      body: `Apareceu em ${days.length} dias registrados, geralmente entre o dia ${s.min} e o dia ${s.max} do ciclo (mediana: dia ${s.median?.toLocaleString("pt-BR")}).`,
      basedOn: `${days.length} registros`,
    });
  }

  // 4. Humor mais comum por fase (menstruação x restante)
  const periodMoods = moodLogs.filter((m) => {
    const day = cycleDayForDate(cycles, m.log_date);
    return day !== null && day <= 5;
  });
  if (periodMoods.length >= MIN_LOGS_FOR_PATTERN) {
    const top = moodFrequency(periodMoods)[0];
    if (top) {
      insights.push({
        id: "mood-period",
        kind: "mood",
        title: `Nos primeiros dias do ciclo, você registrou mais "${moodLabel(top.value)}"`,
        body: `Em ${top.count} de ${periodMoods.length} registros de humor feitos entre os dias 1 e 5 do ciclo.`,
        basedOn: `${periodMoods.length} registros de humor`,
      });
    }
  }

  // 5. Constância de registro
  const loggedDays = new Set([...dailyLogs, ...moodLogs].map((l) => l.log_date)).size;
  if (loggedDays >= 7) {
    insights.push({
      id: "habit-logs",
      kind: "habit",
      title: `Você já registrou ${loggedDays} dias`,
      body: "Quanto mais dias registrados, mais completos ficam seus relatórios e comparações.",
      basedOn: `${loggedDays} dias com registro`,
    });
  }

  return insights;
}
