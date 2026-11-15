import type { CyclePhase, FlowIntensity } from "./cycle";

export const FLOW_OPTIONS: { value: FlowIntensity; label: string }[] = [
  { value: "none", label: "Ausente" },
  { value: "light", label: "Leve" },
  { value: "moderate", label: "Moderado" },
  { value: "heavy", label: "Intenso" },
];

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
] as const;

export type SymptomValue = (typeof SYMPTOM_OPTIONS)[number]["value"];

export const SYMPTOM_VALUES = SYMPTOM_OPTIONS.map((s) => s.value) as readonly string[];

export function symptomLabel(value: string): string {
  return SYMPTOM_OPTIONS.find((s) => s.value === value)?.label ?? value;
}

export function flowLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return FLOW_OPTIONS.find((f) => f.value === value)?.label ?? value;
}

/** Cada humor tem uma forma orgânica e um par de cores próprios — nada de emojis. */
export const MOOD_OPTIONS = [
  { value: "happy", label: "Feliz", from: "var(--foreground)", to: "var(--muted-foreground)", shape: "petal" },
  { value: "calm", label: "Tranquila", from: "var(--foreground)", to: "var(--muted)", shape: "wave" },
  { value: "loving", label: "Amorosa", from: "var(--foreground)", to: "var(--muted)", shape: "petal" },
  { value: "excited", label: "Animada", from: "var(--foreground)", to: "var(--border)", shape: "burst" },
  { value: "energized", label: "Energizada", from: "var(--foreground)", to: "var(--border)", shape: "burst" },
  { value: "neutral", label: "Neutra", from: "var(--muted-foreground)", to: "var(--muted)", shape: "circle" },
  { value: "anxious", label: "Ansiosa", from: "var(--foreground)", to: "var(--muted-foreground)", shape: "ripple" },
  { value: "sad", label: "Triste", from: "var(--muted-foreground)", to: "var(--foreground)", shape: "drop" },
  { value: "irritated", label: "Irritada", from: "var(--foreground)", to: "var(--border)", shape: "burst" },
  { value: "sensitive", label: "Sensível", from: "var(--muted)", to: "var(--foreground)", shape: "petal" },
  { value: "tired", label: "Cansada", from: "var(--border)", to: "var(--muted-foreground)", shape: "wave" },
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

export const INTENSITY_LABELS: Record<number, string> = {
  1: "Muito leve",
  2: "Leve",
  3: "Média",
  4: "Forte",
  5: "Muito forte",
};

export const PHASE_INFO: Record<
  CyclePhase,
  { label: string; description: string; gradientVar: string; accent: string }
> = {
  menstrual: {
    label: "Menstrual",
    description: "Dias de sangramento registrados por você.",
    gradientVar: "var(--gradient-menstrual)",
    accent: "var(--bloom-pink)",
  },
  follicular: {
    label: "Folicular",
    description: "Período entre o fim do sangramento e a janela ovulatória estimada.",
    gradientVar: "var(--gradient-follicular)",
    accent: "var(--bloom-yellow)",
  },
  ovulatory: {
    label: "Ovulatória",
    description: "Janela ovulatória estimada. Não é uma confirmação de ovulação.",
    gradientVar: "var(--gradient-ovulatory)",
    accent: "var(--bloom-green)",
  },
  luteal: {
    label: "Lútea",
    description: "Fase estimada entre a janela ovulatória e a próxima menstruação.",
    gradientVar: "var(--gradient-luteal)",
    accent: "var(--bloom-lilac)",
  },
};
