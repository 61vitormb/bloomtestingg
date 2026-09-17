import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as bloom from "@/services/bloom";

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

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Não conseguimos falar com a nuvem. Seus dados no formulário foram preservados.";
}

/** Mutação padrão do Bloom: só avisa sucesso depois da confirmação da nuvem. */
function useBloomMutation<TInput, TResult>(
  fn: (input: TInput) => Promise<TResult>,
  options: { invalidate: readonly (readonly unknown[])[]; successMessage: string },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all(
        options.invalidate.map((key) => queryClient.invalidateQueries({ queryKey: key })),
      );
      toast.success(options.successMessage);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useSaveDailyLog() {
  return useBloomMutation(bloom.upsertDailyLog, {
    invalidate: [bloomKeys.dailyLogs],
    successMessage: "Registro do dia salvo na nuvem.",
  });
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
    successMessage: "Humor salvo na nuvem.",
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
    successMessage: "Menstruação registrada.",
  });
}

export function useUpdateCycle() {
  return useBloomMutation(
    (input: { id: string; start_date?: string; end_date?: string | null; notes?: string | null }) =>
      bloom.updateCycle(input.id, input),
    { invalidate: [bloomKeys.cycles], successMessage: "Menstruação atualizada." },
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
    successMessage: "Perfil atualizado.",
  });
}

export function useUpdatePreferences() {
  return useBloomMutation(bloom.updatePreferences, {
    invalidate: [bloomKeys.preferences],
    successMessage: "Preferências salvas.",
  });
}

export function useDeleteAllRecords() {
  return useBloomMutation(bloom.deleteAllRecords, {
    invalidate: [bloomKeys.cycles, bloomKeys.dailyLogs, bloomKeys.moodLogs],
    successMessage: "Todos os seus registros foram excluídos.",
  });
}
