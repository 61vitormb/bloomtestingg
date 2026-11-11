/**
 * Validação de entrada — compartilhada pelo frontend (formulários) e pela camada de
 * serviços (antes de gravar). O banco aplica, além disso, as políticas por usuário.
 */
import { z } from "zod";
import { FLOW_VALUES, MOOD_VALUES } from "./catalog";
import { isValidISODate } from "./cycle";

export const NOTES_MAX = 2000;
export const NAME_MAX = 80;

export const isoDateSchema = z.string().refine(isValidISODate, { message: "Data inválida." });

const notesSchema = z
  .string()
  .max(NOTES_MAX, `Use no máximo ${NOTES_MAX} caracteres.`)
  .nullable()
  .optional()
  .transform((v) => {
    const trimmed = (v ?? "").trim();
    return trimmed.length ? trimmed : null;
  });

export const dailyLogSchema = z.object({
  log_date: isoDateSchema,
  flow_intensity: z
    .string()
    .nullable()
    .refine((v) => v === null || FLOW_VALUES.includes(v), "Intensidade de fluxo inválida."),
  symptoms: z.array(z.string().max(40)).max(60),
  notes: notesSchema,
});

export const moodLogSchema = z.object({
  log_date: isoDateSchema,
  moods: z
    .array(z.string())
    .max(MOOD_VALUES.length)
    .refine((list) => list.every((m) => MOOD_VALUES.includes(m)), "Humor inválido."),
  intensity: z.number().int().min(1).max(5).nullable(),
  notes: notesSchema,
});

export const cycleSchema = z
  .object({
    start_date: isoDateSchema,
    end_date: isoDateSchema.nullable(),
    notes: notesSchema,
  })
  .refine((c) => !c.end_date || c.end_date >= c.start_date, {
    message: "A data de fim é anterior à de início.",
    path: ["end_date"],
  });

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .max(NAME_MAX, `Use no máximo ${NAME_MAX} caracteres.`)
    .nullable()
    .transform((v) => (v && v.length ? v : null)),
});

export const cyclePreferencesSchema = z.object({
  average_cycle_length: z
    .number()
    .int("Use um número inteiro.")
    .min(15, "A duração do ciclo deve ficar entre 15 e 90 dias.")
    .max(90, "A duração do ciclo deve ficar entre 15 e 90 dias.")
    .nullable(),
  average_period_length: z
    .number()
    .int("Use um número inteiro.")
    .min(1, "A duração do sangramento deve ficar entre 1 e 15 dias.")
    .max(15, "A duração do sangramento deve ficar entre 1 e 15 dias.")
    .nullable(),
});

export const credentialsSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(72),
  displayName: z.string().trim().max(NAME_MAX).optional(),
});

export const passwordChangeSchema = z
  .object({
    password: z
      .string()
      .min(8, "A senha precisa de pelo menos 8 caracteres.")
      .max(72, "Use no máximo 72 caracteres.")
      .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Use letras e números."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  });

export const reminderSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "Dê um nome ao lembrete.").max(60),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido."),
  days: z.array(z.number().int().min(0).max(6)).min(1, "Escolha ao menos um dia."),
  enabled: z.boolean(),
});

/** Converte texto de input numérico em número ou null (campo vazio). */
export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Confira os dados informados.";
}
