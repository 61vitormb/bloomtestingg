/**
 * Camada de serviços: única porta de comunicação com a nuvem.
 * Todas as leituras e gravações passam pelas políticas de segurança por usuário.
 */
import { supabase } from "@/integrations/supabase/client";
import { MOOD_VALUES, SYMPTOM_VALUES } from "@/domain/catalog";
import type { FlowIntensity } from "@/domain/cycle";

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

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão não encontrada. Entre novamente.");
  return data.user.id;
}

const NOTES_MAX = 2000;

function sanitizeNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const trimmed = notes.trim().slice(0, NOTES_MAX);
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeList(values: readonly string[], allowed: readonly string[]): string[] {
  return Array.from(new Set(values.filter((v) => allowed.includes(v))));
}

/* ------------------------------- leituras ------------------------------- */

export async function fetchProfile(): Promise<Profile | null> {
  return unwrap(
    await supabase
      .from("profiles")
      .select("id, display_name, locale, created_at")
      .maybeSingle(),
  );
}

export async function fetchPreferences(): Promise<Preferences | null> {
  return unwrap(await supabase.from("user_preferences").select("*").maybeSingle());
}

export async function fetchCycles(): Promise<Cycle[]> {
  return (
    unwrap(
      await supabase
        .from("cycles")
        .select("id, user_id, start_date, end_date, notes")
        .order("start_date", { ascending: false }),
    ) ?? []
  );
}

export async function fetchDailyLogs(): Promise<DailyLog[]> {
  const rows =
    unwrap(
      await supabase
        .from("daily_logs")
        .select("id, user_id, log_date, flow_intensity, symptoms, notes")
        .order("log_date", { ascending: false }),
    ) ?? [];
  return rows as DailyLog[];
}

export async function fetchMoodLogs(): Promise<MoodLog[]> {
  return (
    unwrap(
      await supabase
        .from("mood_logs")
        .select("id, user_id, log_date, moods, intensity, notes")
        .order("log_date", { ascending: false }),
    ) ?? []
  );
}

/* ------------------------------- gravações ------------------------------- */

export async function upsertDailyLog(input: {
  log_date: string;
  flow_intensity: FlowIntensity | null;
  symptoms: string[];
  notes: string | null;
}): Promise<DailyLog> {
  const user_id = await currentUserId();
  return unwrap(
    await supabase
      .from("daily_logs")
      .upsert(
        {
          user_id,
          log_date: input.log_date,
          flow_intensity: input.flow_intensity,
          symptoms: sanitizeList(input.symptoms, SYMPTOM_VALUES),
          notes: sanitizeNotes(input.notes),
        },
        { onConflict: "user_id,log_date" },
      )
      .select("id, user_id, log_date, flow_intensity, symptoms, notes")
      .single(),
  ) as DailyLog;
}

export async function deleteDailyLog(id: string): Promise<void> {
  const { error } = await supabase.from("daily_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertMoodLog(input: {
  log_date: string;
  moods: string[];
  intensity: number | null;
  notes: string | null;
}): Promise<MoodLog> {
  const user_id = await currentUserId();
  const intensity =
    input.intensity === null ? null : Math.min(5, Math.max(1, Math.round(input.intensity)));
  return unwrap(
    await supabase
      .from("mood_logs")
      .upsert(
        {
          user_id,
          log_date: input.log_date,
          moods: sanitizeList(input.moods, MOOD_VALUES),
          intensity,
          notes: sanitizeNotes(input.notes),
        },
        { onConflict: "user_id,log_date" },
      )
      .select("id, user_id, log_date, moods, intensity, notes")
      .single(),
  );
}

export async function deleteMoodLog(id: string): Promise<void> {
  const { error } = await supabase.from("mood_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createCycle(input: {
  start_date: string;
  end_date: string | null;
  notes: string | null;
}): Promise<Cycle> {
  const user_id = await currentUserId();
  return unwrap(
    await supabase
      .from("cycles")
      .insert({
        user_id,
        start_date: input.start_date,
        end_date: input.end_date,
        notes: sanitizeNotes(input.notes),
      })
      .select("id, user_id, start_date, end_date, notes")
      .single(),
  );
}

export async function updateCycle(
  id: string,
  input: { start_date?: string; end_date?: string | null; notes?: string | null },
): Promise<Cycle> {
  const payload: Record<string, unknown> = {};
  if (input.start_date !== undefined) payload["start_date"] = input.start_date;
  if (input.end_date !== undefined) payload["end_date"] = input.end_date;
  if (input.notes !== undefined) payload["notes"] = sanitizeNotes(input.notes);
  return unwrap(
    await supabase
      .from("cycles")
      .update(payload)
      .eq("id", id)
      .select("id, user_id, start_date, end_date, notes")
      .single(),
  );
}

export async function deleteCycle(id: string): Promise<void> {
  const { error } = await supabase.from("cycles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateProfile(input: { display_name: string | null }): Promise<Profile> {
  const id = await currentUserId();
  return unwrap(
    await supabase
      .from("profiles")
      .upsert({ id, display_name: input.display_name?.trim() || null })
      .select("id, display_name, locale, created_at")
      .single(),
  );
}

export async function updatePreferences(input: Partial<Preferences>): Promise<Preferences> {
  const user_id = await currentUserId();
  return unwrap(
    await supabase
      .from("user_preferences")
      .upsert({ user_id, ...input }, { onConflict: "user_id" })
      .select("*")
      .single(),
  );
}

/* --------------------------- privacidade e dados --------------------------- */

export interface ExportPayload {
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
    exported_at: new Date().toISOString(),
    profile,
    preferences,
    cycles,
    daily_logs,
    mood_logs,
  };
}

/** Apaga todos os registros pessoais da nuvem, mantendo a conta ativa. */
export async function deleteAllRecords(): Promise<void> {
  const user_id = await currentUserId();
  for (const table of ["daily_logs", "mood_logs", "cycles"] as const) {
    const { error } = await supabase.from(table).delete().eq("user_id", user_id);
    if (error) throw new Error(error.message);
  }
}
