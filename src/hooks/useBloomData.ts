import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import * as bloom from "@/services/bloom";
import {
  buildCycleOverview,
  projectCycles,
  recordedPeriodDays,
  type CycleRecord,
} from "@/domain/cycle";
import { todayISO } from "@/lib/format";
import { playSound } from "@/lib/sound";
import type { SoundEvent } from "@/domain/sound";

export const bloomKeys = {
  profile: ["bloom", "profile"] as const,
  preferences: ["bloom", "preferences"] as const,
  cycles: ["bloom", "cycles"] as const,
  dailyLogs: ["bloom", "daily-logs"] as const,
  moodLogs: ["bloom", "mood-logs"] as const,
};

export function useProfile() {
  return useQuery({ queryKey: bloomKeys.profile, queryFn: bloom.fetchProfile });
}

export function usePreferences() {
  return useQuery({ queryKey: bloomKeys.preferences, queryFn: bloom.fetchPreferences });
}

export function useCycles() {
  return useQuery({ queryKey: bloomKeys.cycles, queryFn: bloom.fetchCycles });
}

export function useDailyLogs() {
  return useQuery({ queryKey: bloomKeys.dailyLogs, queryFn: bloom.fetchDailyLogs });
}

export function useMoodLogs() {
  return useQuery({ queryKey: bloomKeys.moodLogs, queryFn: bloom.fetchMoodLogs });
}

/** Dados derivados do ciclo, compartilhados por Home, Calendário e Análise. */
export function useCycleModel() {
  const cycles = useCycles();
  const preferences = usePreferences();
  const dailyLogs = useDailyLogs();
  const moodLogs = useMoodLogs();
  const today = todayISO();

  const model = useMemo(() => {
    const records: CycleRecord[] = (cycles.data ?? []).map(({ id, start_date, end_date }) => ({
      id,
      start_date,
      end_date,
    }));
    const declared = {
      cycleLength: preferences.data?.average_cycle_length ?? null,
      periodLength: preferences.data?.average_period_length ?? null,
    };
    const overview = buildCycleOverview(records, today, declared);
    const projections = projectCycles(records, declared, 4);
    const recorded = recordedPeriodDays(records, today, overview.periodLength.value);
    const predicted = new Set(
      projections.flatMap((p) => p.periodDays).filter((d) => !recorded.has(d)),
    );
    const fertile = new Set(projections.flatMap((p) => p.fertileDays));
    const ovulation = new Set(projections.map((p) => p.ovulationDay));
    return { records, declared, overview, projections, recorded, predicted, fertile, ovulation };
  }, [cycles.data, preferences.data, today]);

  return {
    ...model,
    today,
    cycles,
    preferences,
    dailyLogs,
    moodLogs,
    isLoading:
      cycles.isLoading || preferences.isLoading || dailyLogs.isLoading || moodLogs.isLoading,
    isError: cycles.isError || dailyLogs.isError || moodLogs.isError,
    refetch: () =>
      Promise.all([
        cycles.refetch(),
        dailyLogs.refetch(),
        moodLogs.refetch(),
        preferences.refetch(),
      ]),
  };
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Não conseguimos falar com a nuvem. Seus dados no formulário foram preservados.";
}

/** Mutação padrão do Bloom: só avisa sucesso depois da confirmação da nuvem. */
function useBloomMutation<TInput, TResult>(
  fn: (input: TInput) => Promise<TResult>,
  options: {
    invalidate: readonly (readonly unknown[])[];
    successMessage: string | null;
    sound?: SoundEvent;
    /** Grava o resultado direto no cache (evita ler dado antigo antes do refetch). */
    setDataKey?: readonly unknown[];
  },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (result) => {
      if (options.setDataKey && result !== undefined)
        queryClient.setQueryData(options.setDataKey, result);
      await Promise.all(
        options.invalidate.map((key) => queryClient.invalidateQueries({ queryKey: key })),
      );
      if (options.sound) playSound(options.sound);
      if (options.successMessage) toast.success(options.successMessage);
    },
    onError: (error) => {
      playSound("error");
      toast.error(errorMessage(error));
    },
  });
}

export function useSaveDailyLog() {
  return useBloomMutation(bloom.upsertDailyLog, {
    invalidate: [bloomKeys.dailyLogs],
    successMessage: null,
  });
}

export function useSaveDayNote() {
  return useBloomMutation(
    (input: { log_date: string; notes: string | null; existing: bloom.DailyLog | null }) =>
      bloom.saveDayNote(input, input.existing),
    {
      invalidate: [bloomKeys.dailyLogs],
      successMessage: "Anotação salva no seu diário.",
      sound: "save",
    },
  );
}

export function useDeleteDailyLog() {
  return useBloomMutation(bloom.deleteDailyLog, {
    invalidate: [bloomKeys.dailyLogs],
    successMessage: "Registro do dia excluído.",
  });
}

export function useSaveMoodLog() {
  return useBloomMutation(bloom.upsertMoodLog, {
    invalidate: [bloomKeys.moodLogs],
    successMessage: null,
  });
}

export function useDeleteMoodLog() {
  return useBloomMutation(bloom.deleteMoodLog, {
    invalidate: [bloomKeys.moodLogs],
    successMessage: "Registro de humor excluído.",
  });
}

export function useCreateCycle() {
  return useBloomMutation(bloom.createCycle, {
    invalidate: [bloomKeys.cycles],
    successMessage: "Início da menstruação registrado.",
    sound: "complete",
  });
}

export function useUpdateCycle() {
  return useBloomMutation(
    (input: { id: string; start_date?: string; end_date?: string | null; notes?: string | null }) =>
      bloom.updateCycle(input.id, input),
    { invalidate: [bloomKeys.cycles], successMessage: "Menstruação atualizada.", sound: "save" },
  );
}

export function useDeleteCycle() {
  return useBloomMutation(bloom.deleteCycle, {
    invalidate: [bloomKeys.cycles],
    successMessage: "Menstruação excluída.",
  });
}

export function useUpdateProfile() {
  return useBloomMutation(bloom.updateProfile, {
    invalidate: [bloomKeys.profile],
    setDataKey: bloomKeys.profile,
    successMessage: "Perfil atualizado.",
    sound: "save",
  });
}

export function useUpdatePreferences() {
  // DEF-015: sem gravar no cache, a Home lia as preferências antigas (onboarding pendente)
  // logo após o onboarding e mandava a usuária de volta para ele.
  return useBloomMutation(bloom.updatePreferences, {
    invalidate: [bloomKeys.preferences],
    successMessage: "Preferências salvas.",
    sound: "toggle",
    setDataKey: bloomKeys.preferences,
  });
}

export function useDeleteAllRecords() {
  return useBloomMutation(bloom.deleteAllRecords, {
    invalidate: [bloomKeys.cycles, bloomKeys.dailyLogs, bloomKeys.moodLogs],
    successMessage: "Todos os seus registros foram excluídos.",
  });
}

export function useChangePassword() {
  return useBloomMutation(bloom.changePassword, {
    invalidate: [],
    successMessage: "Senha alterada.",
    sound: "save",
  });
}

export function useSignOutOthers() {
  return useBloomMutation(bloom.signOutOtherSessions, {
    invalidate: [],
    successMessage: "Sessões nos outros aparelhos encerradas.",
  });
}
