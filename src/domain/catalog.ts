import type { CyclePhase, FlowIntensity } from "./cycle";

/**
 * Catálogo do Bloom: opções que a usuária pode registrar.
 * Os valores (value) são gravados na nuvem e nunca devem mudar; os rótulos podem.
 */

export const FLOW_OPTIONS: { value: FlowIntensity; label: string; drops: number }[] = [
  { value: "none", label: "Ausente", drops: 0 },
  { value: "light", label: "Leve", drops: 1 },
  { value: "moderate", label: "Moderado", drops: 2 },
  { value: "heavy", label: "Intenso", drops: 3 },
];

export const FLOW_VALUES = FLOW_OPTIONS.map((f) => f.value) as readonly string[];

/** Sintomas físicos. Os 9 primeiros já existiam e são preservados. */
export const SYMPTOM_OPTIONS = [
  { value: "cramps", label: "Cólicas" },
  { value: "headache", label: "Dor de cabeça" },
  { value: "breast_tenderness", label: "Sensibilidade nos seios" },
  { value: "bloating", label: "Inchaço" },
  { value: "fatigue", label: "Cansaço" },
  { value: "acne", label: "Acne" },
  { value: "sleep_changes", label: "Alterações no sono" },
  { value: "nausea", label: "Náusea" },
  { value: "other", label: "Outros" },
  { value: "back_pain", label: "Dor nas costas" },
  { value: "cravings", label: "Desejos alimentares" },
  { value: "dizziness", label: "Tontura" },
  { value: "digestive", label: "Alteração intestinal" },
  { value: "spotting", label: "Escape" },
] as const;

export type SymptomValue = (typeof SYMPTOM_OPTIONS)[number]["value"];
export const SYMPTOM_VALUES = SYMPTOM_OPTIONS.map((s) => s.value) as readonly string[];

/** Sintomas emocionais — distintos do humor (estado geral) por descreverem algo específico. */
export const EMOTIONAL_SYMPTOM_OPTIONS = [
  { value: "anxiety", label: "Ansiedade" },
  { value: "irritability", label: "Irritabilidade" },
  { value: "mood_swings", label: "Oscilações de humor" },
  { value: "low_focus", label: "Pouca concentração" },
  { value: "crying", label: "Vontade de chorar" },
  { value: "low_libido", label: "Libido baixa" },
  { value: "high_libido", label: "Libido alta" },
  { value: "stress", label: "Estresse" },
] as const;

export const EMOTIONAL_SYMPTOM_VALUES = EMOTIONAL_SYMPTOM_OPTIONS.map(
  (s) => s.value,
) as readonly string[];

export function symptomLabel(value: string): string {
  return (
    SYMPTOM_OPTIONS.find((s) => s.value === value)?.label ??
    EMOTIONAL_SYMPTOM_OPTIONS.find((s) => s.value === value)?.label ??
    value
  );
}

export function flowLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return FLOW_OPTIONS.find((f) => f.value === value)?.label ?? value;
}

/**
 * Humores. `valence` é usado apenas para desenhar a evolução do humor
 * (de -2 a +2) — é uma convenção visual, não uma medida psicológica.
 */
export const MOOD_OPTIONS = [
  { value: "happy", label: "Feliz", color: "var(--petal-amber)", valence: 2, shape: "petal" },
  { value: "calm", label: "Tranquila", color: "var(--petal-teal)", valence: 1, shape: "wave" },
  {
    value: "energized",
    label: "Energizada",
    color: "var(--petal-coral)",
    valence: 2,
    shape: "burst",
  },
  { value: "neutral", label: "Neutra", color: "var(--petal-sand)", valence: 0, shape: "circle" },
  { value: "anxious", label: "Ansiosa", color: "var(--petal-lilac)", valence: -1, shape: "ripple" },
  { value: "sad", label: "Triste", color: "var(--petal-blue)", valence: -2, shape: "drop" },
  {
    value: "irritated",
    label: "Irritada",
    color: "var(--petal-rose)",
    valence: -1,
    shape: "burst",
  },
  {
    value: "sensitive",
    label: "Sensível",
    color: "var(--petal-pink)",
    valence: -1,
    shape: "petal",
  },
  { value: "tired", label: "Cansada", color: "var(--petal-slate)", valence: -1, shape: "wave" },
] as const;

export type MoodValue = (typeof MOOD_OPTIONS)[number]["value"];
export type MoodShapeKind = (typeof MOOD_OPTIONS)[number]["shape"];

export const MOOD_VALUES = MOOD_OPTIONS.map((m) => m.value) as readonly string[];

export function moodOption(value: string) {
  return MOOD_OPTIONS.find((m) => m.value === value);
}

export function moodLabel(value: string): string {
  return moodOption(value)?.label ?? value;
}

export function moodValence(value: string): number | null {
  return moodOption(value)?.valence ?? null;
}

export const INTENSITY_LABELS: Record<number, string> = {
  1: "Muito leve",
  2: "Leve",
  3: "Média",
  4: "Forte",
  5: "Muito forte",
};

export const PHASE_INFO: Record<
  CyclePhase,
  { label: string; description: string; color: string; soft: string }
> = {
  menstrual: {
    label: "Menstrual",
    description: "Dias de sangramento registrados por você.",
    color: "var(--phase-menstrual)",
    soft: "var(--phase-menstrual-soft)",
  },
  follicular: {
    label: "Folicular",
    description: "Período entre o fim do sangramento e a janela ovulatória estimada.",
    color: "var(--phase-follicular)",
    soft: "var(--phase-follicular-soft)",
  },
  ovulatory: {
    label: "Ovulatória",
    description: "Janela ovulatória estimada. Não é uma confirmação de ovulação.",
    color: "var(--phase-ovulatory)",
    soft: "var(--phase-ovulatory-soft)",
  },
  luteal: {
    label: "Lútea",
    description: "Fase estimada entre a janela ovulatória e a próxima menstruação.",
    color: "var(--phase-luteal)",
    soft: "var(--phase-luteal-soft)",
  },
};
