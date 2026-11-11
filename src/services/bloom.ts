/**
 * Camada de serviços: única porta de comunicação com a nuvem.
 * - Toda entrada é validada (Zod) antes de sair do aparelho.
 * - Todas as leituras e gravações passam pelas políticas de segurança por usuário (RLS).
 * - Erros do backend são convertidos em mensagens compreensíveis (BloomServiceError).
 */
import type { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { FlowIntensity } from "@/domain/cycle";
import { sanitizeStoredSymptoms } from "@/domain/metrics";
import {
  cycleSchema,
  cyclePreferencesSchema,
  dailyLogSchema,
  firstError,
  moodLogSchema,
  passwordChangeSchema,
  profileSchema,
} from "@/domain/validation";
import { buildHistoryCsv } from "@/domain/export";

export interface Cycle {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  flow_intensity: FlowIntensity | null;
  symptoms: string[];
  notes: string | null;
}

export interface MoodLog {
  id: string;
  user_id: string;
  log_date: string;
  moods: string[];
  intensity: number | null;
  notes: string | null;
}

export interface Profile {
  id: string;
  display_name: string | null;
  locale: string;
  created_at: string;
}

export interface Preferences {
  user_id: string;
  notifications_enabled: boolean;
  temperature_unit: "celsius" | "fahrenheit";
  locale: string;
  average_cycle_length: number | null;
  average_period_length: number | null;
  onboarding_completed: boolean;
}

export type BloomErrorCode = "validation" | "auth" | "network" | "not_found" | "server";

export class BloomServiceError extends Error {
  readonly code: BloomErrorCode;
  constructor(code: BloomErrorCode, message: string) {
    super(message);
    this.name = "BloomServiceError";
    this.code = code;
  }
}

interface BackendError {
  message: string;
  code?: string | undefined;
}

/** Traduz erros do backend em mensagens claras, sem expor detalhes internos. */
export function toServiceError(error: BackendError): BloomServiceError {
  const msg = error.message ?? "";
  if (
    /jwt|token|not authenticated|permission denied|row-level security/i.test(msg) ||
    error.code === "42501"
  ) {
    return new BloomServiceError(
      "auth",
      "Sua sessão expirou ou não tem permissão. Entre novamente.",
    );
  }
  if (/fetch|network|failed to fetch|timeout/i.test(msg)) {
    return new BloomServiceError(
      "network",
      "Sem conexão com a nuvem. Seus dados no formulário foram preservados.",
    );
  }
  if (error.code === "PGRST116") {
    return new BloomServiceError("not_found", "Registro não encontrado.");
  }
  return new BloomServiceError(
    "server",
    "Não conseguimos salvar agora. Tente novamente em instantes.",
  );
}

function unwrap<T>(result: { data: T | null; error: BackendError | null }): T {
  if (result.error) throw toServiceError(result.error);
  return result.data as T;
}

function ensureArray<T>(value: unknown): T[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new BloomServiceError("server", "Resposta inesperada da nuvem.");
  }
  return value as T[];
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user)
    throw new BloomServiceError("auth", "Sessão não encontrada. Entre novamente.");
  return data.user.id;
}

function validate<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new BloomServiceError("validation", firstError(parsed.error));
  return parsed.data;
}

const CYCLE_COLUMNS = "id, user_id, start_date, end_date, notes";
const DAILY_COLUMNS = "id, user_id, log_date, flow_intensity, symptoms, notes";
const MOOD_COLUMNS = "id, user_id, log_date, moods, intensity, notes";

/* ------------------------------- leituras ------------------------------- */

export async function fetchProfile(): Promise<Profile | null> {
  return unwrap(
    await supabase.from("profiles").select("id, display_name, locale, created_at").maybeSingle(),
  );
}

export async function fetchPreferences(): Promise<Preferences | null> {
  return unwrap(
    await supabase.from("user_preferences").select("*").maybeSingle(),
  ) as Preferences | null;
}

export async function fetchCycles(): Promise<Cycle[]> {
  return ensureArray<Cycle>(
    unwrap(
      await supabase.from("cycles").select(CYCLE_COLUMNS).order("start_date", { ascending: false }),
    ),
  );
}

export async function fetchDailyLogs(): Promise<DailyLog[]> {
  const rows = ensureArray<DailyLog>(
    unwrap(
      await supabase
        .from("daily_logs")
        .select(DAILY_COLUMNS)
        .order("log_date", { ascending: false }),
    ),
  );
  return rows.map((r) => ({ ...r, symptoms: Array.isArray(r.symptoms) ? r.symptoms : [] }));
}

export async function fetchMoodLogs(): Promise<MoodLog[]> {
  const rows = ensureArray<MoodLog>(
    unwrap(
      await supabase.from("mood_logs").select(MOOD_COLUMNS).order("log_date", { ascending: false }),
    ),
  );
  return rows.map((r) => ({ ...r, moods: Array.isArray(r.moods) ? r.moods : [] }));
}

/* ------------------------------- gravações ------------------------------- */

export interface DailyLogInput {
  log_date: string;
  flow_intensity: FlowIntensity | null;
  symptoms: string[];
  notes: string | null;
}

/**
 * Salva o registro diário. Se o registro ficar vazio, ele é excluído (DEF-005:
 * antes, salvar um formulário vazio criava linhas vazias que contavam como "dia registrado").
 * Retorna null quando o registro foi removido.
 */
export async function upsertDailyLog(input: DailyLogInput): Promise<DailyLog | null> {
  const data = validate(dailyLogSchema, input);
  const symptoms = sanitizeStoredSymptoms(data.symptoms);
  const user_id = await currentUserId();
  if (!data.flow_intensity && symptoms.length === 0 && !data.notes) {
    const { error } = await supabase
      .from("daily_logs")
      .delete()
      .eq("user_id", user_id)
      .eq("log_date", data.log_date);
    if (error) throw toServiceError(error);
    return null;
  }
  return unwrap(
    await supabase
      .from("daily_logs")
      .upsert(
        {
          user_id,
          log_date: data.log_date,
          flow_intensity: data.flow_intensity,
          symptoms,
          notes: data.notes,
        },
        { onConflict: "user_id,log_date" },
      )
      .select(DAILY_COLUMNS)
      .single(),
  ) as DailyLog;
}

/** Diário: grava somente a anotação do dia, preservando fluxo e sintomas já registrados. */
export async function saveDayNote(
  input: { log_date: string; notes: string | null },
  existing?: DailyLog | null,
): Promise<DailyLog | null> {
  return upsertDailyLog({
    log_date: input.log_date,
    flow_intensity: existing?.flow_intensity ?? null,
    symptoms: existing?.symptoms ?? [],
    notes: input.notes,
  });
}

export async function deleteDailyLog(id: string): Promise<void> {
  const { error } = await supabase.from("daily_logs").delete().eq("id", id);
  if (error) throw toServiceError(error);
}

export interface MoodLogInput {
  log_date: string;
  moods: string[];
  intensity: number | null;
  notes: string | null;
}

/** DEF-004: limpar todos os humores e a observação agora exclui o registro do dia. */
export async function upsertMoodLog(input: MoodLogInput): Promise<MoodLog | null> {
  const normalized = {
    ...input,
    moods: Array.from(new Set(input.moods)),
    intensity:
      input.intensity === null || input.moods.length === 0
        ? null
        : Math.min(5, Math.max(1, Math.round(input.intensity))),
  };
  const data = validate(moodLogSchema, normalized);
  const user_id = await currentUserId();
  if (data.moods.length === 0 && !data.notes) {
    const { error } = await supabase
      .from("mood_logs")
      .delete()
      .eq("user_id", user_id)
      .eq("log_date", data.log_date);
    if (error) throw toServiceError(error);
    return null;
  }
  return unwrap(
    await supabase
      .from("mood_logs")
      .upsert(
        {
          user_id,
          log_date: data.log_date,
          moods: data.moods,
          intensity: data.intensity,
          notes: data.notes,
        },
        { onConflict: "user_id,log_date" },
      )
      .select(MOOD_COLUMNS)
      .single(),
  );
}

export async function deleteMoodLog(id: string): Promise<void> {
  const { error } = await supabase.from("mood_logs").delete().eq("id", id);
  if (error) throw toServiceError(error);
}

export async function createCycle(input: {
  start_date: string;
  end_date: string | null;
  notes: string | null;
}): Promise<Cycle> {
  const data = validate(cycleSchema, input);
  const user_id = await currentUserId();
  return unwrap(
    await supabase
      .from("cycles")
      .insert({ user_id, start_date: data.start_date, end_date: data.end_date, notes: data.notes })
      .select(CYCLE_COLUMNS)
      .single(),
  );
}

export async function updateCycle(
  id: string,
  input: { start_date?: string; end_date?: string | null; notes?: string | null },
): Promise<Cycle> {
  const payload: { start_date?: string; end_date?: string | null; notes?: string | null } = {};
  if (input.start_date !== undefined)
    payload.start_date = validate(cycleSchema.innerType().shape.start_date, input.start_date);
  if (input.end_date !== undefined)
    payload.end_date = validate(cycleSchema.innerType().shape.end_date, input.end_date);
  if (input.notes !== undefined)
    payload.notes = validate(cycleSchema.innerType().shape.notes, input.notes);
  if (payload.start_date && payload.end_date && payload.end_date < payload.start_date) {
    throw new BloomServiceError("validation", "A data de fim é anterior à de início.");
  }
  return unwrap(
    await supabase.from("cycles").update(payload).eq("id", id).select(CYCLE_COLUMNS).single(),
  );
}

export async function deleteCycle(id: string): Promise<void> {
  const { error } = await supabase.from("cycles").delete().eq("id", id);
  if (error) throw toServiceError(error);
}

export async function updateProfile(input: { display_name: string | null }): Promise<Profile> {
  const data = validate(profileSchema, input);
  const id = await currentUserId();
  return unwrap(
    await supabase
      .from("profiles")
      .upsert({ id, display_name: data.display_name })
      .select("id, display_name, locale, created_at")
      .single(),
  );
}

export async function updatePreferences(
  input: Partial<Omit<Preferences, "user_id">>,
): Promise<Preferences> {
  const payload: Partial<Omit<Preferences, "user_id">> = { ...input };
  if ("average_cycle_length" in input || "average_period_length" in input) {
    validate(cyclePreferencesSchema.partial(), {
      ...("average_cycle_length" in input
        ? { average_cycle_length: input.average_cycle_length }
        : {}),
      ...("average_period_length" in input
        ? { average_period_length: input.average_period_length }
        : {}),
    });
  }
  if (input.temperature_unit && !["celsius", "fahrenheit"].includes(input.temperature_unit)) {
    throw new BloomServiceError("validation", "Unidade de temperatura inválida.");
  }
  const user_id = await currentUserId();
  return unwrap(
    await supabase
      .from("user_preferences")
      .upsert({ user_id, ...payload }, { onConflict: "user_id" })
      .select("*")
      .single(),
  ) as Preferences;
}

/* ------------------------------ conta e sessão ------------------------------ */

export async function changePassword(input: { password: string; confirm: string }): Promise<void> {
  const data = validate(passwordChangeSchema, input);
  const { error } = await supabase.auth.updateUser({ password: data.password });
  if (error) {
    // DEF-013: o Supabase responde "New password should be different from the old password."
    // (código same_password) — a checagem antiga procurava apenas a palavra "same".
    const code = (error as { code?: string }).code;
    const samePassword =
      code === "same_password" || /same|different from the old/i.test(error.message);
    const needsReauth = code === "reauthentication_needed" || /reauth|recent/i.test(error.message);
    throw new BloomServiceError(
      needsReauth ? "auth" : "server",
      samePassword
        ? "A nova senha precisa ser diferente da atual."
        : needsReauth
          ? "Por segurança, entre novamente antes de trocar a senha."
          : "Não foi possível alterar a senha agora.",
    );
  }
}

/** Encerra a sessão nos outros aparelhos, mantendo este conectado. */
export async function signOutOtherSessions(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) throw toServiceError(error);
}

export async function signOutEverywhere(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) throw toServiceError(error);
}

/* --------------------------- privacidade e dados --------------------------- */

export interface ExportPayload {
  app: "Bloom";
  format_version: 2;
  exported_at: string;
  profile: Profile | null;
  preferences: Preferences | null;
  cycles: Cycle[];
  daily_logs: DailyLog[];
  mood_logs: MoodLog[];
}

export async function exportAllData(): Promise<ExportPayload> {
  const [profile, preferences, cycles, daily_logs, mood_logs] = await Promise.all([
    fetchProfile(),
    fetchPreferences(),
    fetchCycles(),
    fetchDailyLogs(),
    fetchMoodLogs(),
  ]);
  return {
    app: "Bloom",
    format_version: 2,
    exported_at: new Date().toISOString(),
    profile,
    preferences,
    cycles,
    daily_logs,
    mood_logs,
  };
}

export async function exportHistoryCsv(
  fromISO?: string | null,
  toISO?: string | null,
): Promise<string> {
  const payload = await exportAllData();
  return buildHistoryCsv(payload, fromISO ?? null, toISO ?? null);
}

/** Apaga todos os registros pessoais da nuvem, mantendo a conta ativa. */
export async function deleteAllRecords(): Promise<void> {
  const user_id = await currentUserId();
  for (const table of ["daily_logs", "mood_logs", "cycles"] as const) {
    const { error } = await supabase.from(table).delete().eq("user_id", user_id);
    if (error) throw toServiceError(error);
  }
}

/** Exclusão definitiva da conta e de todos os dados (executada no servidor). */
export async function deleteAccount(): Promise<void> {
  const { deleteMyAccount } = await import("@/functions/account.functions");
  try {
    await deleteMyAccount();
  } catch (error) {
    throw new BloomServiceError(
      "server",
      error instanceof Error && error.message
        ? "Não foi possível excluir a conta agora. Nenhum dado foi exposto; tente novamente."
        : "Não foi possível excluir a conta agora.",
    );
  }
  await supabase.auth.signOut({ scope: "local" });
}
