/**
 * Métricas do registro diário (cólicas, dores, energia, sono) e sintomas emocionais.
 *
 * Limitação documentada (ver docs/02-requisitos.md, LIM-01): o schema atual da tabela
 * `daily_logs` só possui `symptoms text[]`, `flow_intensity` e `notes`. Para não depender
 * de uma migração que não pode ser aplicada a partir do repositório, as métricas são
 * codificadas como tokens dentro de `symptoms`, com prefixo reservado:
 *
 *   m:<métrica>:<valor>   ex.: "m:energy:4", "m:sleep_hours:7.5"
 *   e:<sintoma emocional> ex.: "e:anxiety"
 *
 * A codificação é totalmente reversível e validada aqui; a proposta de migração para
 * colunas dedicadas está em docs/database/proposta-migracao.sql.
 */
import { EMOTIONAL_SYMPTOM_VALUES, SYMPTOM_VALUES } from "./catalog";

export const METRIC_DEFINITIONS = {
  cramps: {
    label: "Cólicas",
    min: 0,
    max: 3,
    step: 1,
    scale: ["Sem", "Leves", "Moderadas", "Fortes"],
  },
  pain: { label: "Dores", min: 0, max: 3, step: 1, scale: ["Sem", "Leves", "Moderadas", "Fortes"] },
  energy: {
    label: "Energia",
    min: 1,
    max: 5,
    step: 1,
    scale: ["", "Muito baixa", "Baixa", "Média", "Boa", "Alta"],
  },
  sleep_quality: {
    label: "Qualidade do sono",
    min: 1,
    max: 5,
    step: 1,
    scale: ["", "Péssima", "Ruim", "Regular", "Boa", "Ótima"],
  },
  sleep_hours: { label: "Horas de sono", min: 0, max: 16, step: 0.5, scale: [] as string[] },
} as const;

export type MetricKey = keyof typeof METRIC_DEFINITIONS;
export const METRIC_KEYS = Object.keys(METRIC_DEFINITIONS) as MetricKey[];

export type DayMetrics = Partial<Record<MetricKey, number>>;

export interface DecodedSymptoms {
  physical: string[];
  emotional: string[];
  metrics: DayMetrics;
}

export function isValidMetric(key: string, value: number): key is MetricKey {
  if (!(METRIC_KEYS as string[]).includes(key)) return false;
  const def = METRIC_DEFINITIONS[key as MetricKey];
  if (!Number.isFinite(value) || value < def.min || value > def.max) return false;
  // valores precisam respeitar o passo (ex.: horas de sono em meias horas)
  return Math.abs(value / def.step - Math.round(value / def.step)) < 1e-9;
}

export function metricLabel(key: MetricKey, value: number): string {
  const def = METRIC_DEFINITIONS[key];
  if (key === "sleep_hours") return `${value.toLocaleString("pt-BR")} h`;
  return def.scale[value] ?? String(value);
}

/** Converte a estrutura do formulário em lista gravável, descartando o que for inválido. */
export function encodeSymptoms(input: {
  physical?: readonly string[];
  emotional?: readonly string[];
  metrics?: DayMetrics;
}): string[] {
  const out: string[] = [];
  for (const s of input.physical ?? [])
    if (SYMPTOM_VALUES.includes(s) && !out.includes(s)) out.push(s);
  for (const e of input.emotional ?? []) {
    const token = `e:${e}`;
    if (EMOTIONAL_SYMPTOM_VALUES.includes(e) && !out.includes(token)) out.push(token);
  }
  for (const key of METRIC_KEYS) {
    const value = input.metrics?.[key];
    if (value === undefined || value === null) continue;
    if (isValidMetric(key, value)) out.push(`m:${key}:${value}`);
  }
  return out;
}

/** Lê a lista gravada. Valores desconhecidos são ignorados em vez de quebrar a tela. */
export function decodeSymptoms(stored: readonly string[] | null | undefined): DecodedSymptoms {
  const result: DecodedSymptoms = { physical: [], emotional: [], metrics: {} };
  for (const raw of stored ?? []) {
    if (typeof raw !== "string") continue;
    if (raw.startsWith("m:")) {
      const [, key, value] = raw.split(":");
      const num = Number(value);
      if (key && isValidMetric(key, num)) result.metrics[key] = num;
    } else if (raw.startsWith("e:")) {
      const value = raw.slice(2);
      if (EMOTIONAL_SYMPTOM_VALUES.includes(value) && !result.emotional.includes(value)) {
        result.emotional.push(value);
      }
    } else if (SYMPTOM_VALUES.includes(raw) && !result.physical.includes(raw)) {
      result.physical.push(raw);
    }
  }
  return result;
}

/** Normaliza uma lista vinda do cliente: mantém só tokens válidos, sem duplicar. */
export function sanitizeStoredSymptoms(values: readonly string[]): string[] {
  return encodeSymptoms(decodeSymptoms(values));
}

export function hasAnyContent(decoded: DecodedSymptoms): boolean {
  return (
    decoded.physical.length > 0 ||
    decoded.emotional.length > 0 ||
    Object.keys(decoded.metrics).length > 0
  );
}
