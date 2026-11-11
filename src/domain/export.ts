/**
 * Exportação dos dados da usuária (portabilidade — LGPD art. 18, V).
 * Gera JSON completo e CSV legível em planilhas, com proteção contra
 * "CSV injection" (células iniciadas por = + - @ são prefixadas).
 */
import { flowLabel, moodLabel, symptomLabel } from "./catalog";
import { decodeSymptoms, metricLabel, type MetricKey } from "./metrics";

export interface ExportCycle {
  start_date: string;
  end_date: string | null;
  notes: string | null;
}
export interface ExportDaily {
  log_date: string;
  flow_intensity: string | null;
  symptoms: string[];
  notes: string | null;
}
export interface ExportMood {
  log_date: string;
  moods: string[];
  intensity: number | null;
  notes: string | null;
}

export interface ExportData {
  cycles: ExportCycle[];
  daily_logs: ExportDaily[];
  mood_logs: ExportMood[];
}

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",;\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: readonly (readonly unknown[])[], separator = ";"): string {
  return rows.map((r) => r.map(escapeCsvCell).join(separator)).join("\r\n");
}

/** Uma linha por dia com qualquer registro, mais as menstruações. */
export function buildHistoryCsv(
  data: ExportData,
  fromISO?: string | null,
  toISO?: string | null,
): string {
  const inRange = (d: string) => (!fromISO || d >= fromISO) && (!toISO || d <= toISO);
  const dates = new Set<string>();
  for (const l of data.daily_logs) if (inRange(l.log_date)) dates.add(l.log_date);
  for (const l of data.mood_logs) if (inRange(l.log_date)) dates.add(l.log_date);

  const header = [
    "data",
    "fluxo",
    "sintomas_fisicos",
    "sintomas_emocionais",
    "colicas",
    "dores",
    "energia",
    "qualidade_sono",
    "horas_sono",
    "humor",
    "intensidade_humor",
    "observacoes_dia",
    "observacoes_humor",
  ];
  const metric = (m: Partial<Record<MetricKey, number>>, k: MetricKey) =>
    m[k] === undefined ? "" : metricLabel(k, m[k]!);

  const rows: unknown[][] = [header];
  for (const date of [...dates].sort()) {
    const daily = data.daily_logs.find((l) => l.log_date === date);
    const mood = data.mood_logs.find((l) => l.log_date === date);
    const decoded = decodeSymptoms(daily?.symptoms ?? []);
    rows.push([
      date,
      flowLabel(daily?.flow_intensity) ?? "",
      decoded.physical.map(symptomLabel).join(", "),
      decoded.emotional.map(symptomLabel).join(", "),
      metric(decoded.metrics, "cramps"),
      metric(decoded.metrics, "pain"),
      metric(decoded.metrics, "energy"),
      metric(decoded.metrics, "sleep_quality"),
      metric(decoded.metrics, "sleep_hours"),
      (mood?.moods ?? []).map(moodLabel).join(", "),
      mood?.intensity ?? "",
      daily?.notes ?? "",
      mood?.notes ?? "",
    ]);
  }

  const cycleRows: unknown[][] = [[], ["menstruacao_inicio", "menstruacao_fim", "observacoes"]];
  for (const c of [...data.cycles].sort((a, b) => a.start_date.localeCompare(b.start_date))) {
    if (inRange(c.start_date)) cycleRows.push([c.start_date, c.end_date ?? "", c.notes ?? ""]);
  }
  // BOM para o Excel reconhecer UTF-8 (acentos)
  return `\uFEFF${toCsv([...rows, ...cycleRows])}`;
}

export function exportFileName(kind: "json" | "csv", todayISO: string): string {
  return `bloom-meus-dados-${todayISO}.${kind}`;
}
