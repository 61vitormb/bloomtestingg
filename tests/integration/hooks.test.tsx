/**
 * Integração: hooks React Query ⇄ serviços ⇄ banco em memória.
 * Verifica que gravar algo invalida o cache e que as telas recebem o modelo recalculado.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FakeSupabaseClient } from "@tests/support/fake-supabase-client";
import { MemoryBackend } from "@tests/support/memory-backend";
import { TEST_USERS } from "@tests/fixtures/factories";

const h = vi.hoisted(() => ({ client: null as unknown as FakeSupabaseClient }));
vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return h.client;
  },
}));
const toastSpy = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), toastSpy) }));

import {
  useCreateCycle,
  useCycleModel,
  useSaveDailyLog,
  useUpdatePreferences,
} from "@/hooks/useBloomData";
import { todayISO } from "@/lib/format";
import { addDays } from "@/domain/cycle";

let backend: MemoryBackend;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function useBoth() {
  return {
    model: useCycleModel(),
    create: useCreateCycle(),
    save: useSaveDailyLog(),
    prefs: useUpdatePreferences(),
  };
}

beforeEach(() => {
  backend = new MemoryBackend();
  h.client = new FakeSupabaseClient(backend);
  const ana = backend.createUser(TEST_USERS.ana.email, TEST_USERS.ana.password);
  h.client.signInAs(ana.id);
  toastSpy.success.mockReset();
  toastSpy.error.mockReset();
});

describe("hooks do Bloom", () => {
  it("[IT-HK-01] registrar menstruação atualiza o modelo do ciclo (calendário e dashboard)", async () => {
    const { result } = renderHook(useBoth, { wrapper });
    await waitFor(() => expect(result.current.model.isLoading).toBe(false));
    expect(result.current.model.overview.lastPeriodStart).toBeNull();

    const start = addDays(todayISO(), -2);
    await act(() =>
      result.current.create.mutateAsync({ start_date: start, end_date: null, notes: null }),
    );

    await waitFor(() => expect(result.current.model.overview.lastPeriodStart).toBe(start));
    expect(result.current.model.overview.dayOfCycle).toBe(3);
    expect(result.current.model.recorded.has(start)).toBe(true);
    expect(result.current.model.predicted.size).toBeGreaterThan(0);
    expect(toastSpy.success).toHaveBeenCalledWith("Início da menstruação registrado.");
  });

  it("[IT-HK-02] padrão declarado nas preferências muda a previsão", async () => {
    const { result } = renderHook(useBoth, { wrapper });
    await waitFor(() => expect(result.current.model.isLoading).toBe(false));
    const start = addDays(todayISO(), -1);
    await act(() =>
      result.current.create.mutateAsync({ start_date: start, end_date: null, notes: null }),
    );
    await act(() => result.current.prefs.mutateAsync({ average_cycle_length: 35 }));
    await waitFor(() =>
      expect(result.current.model.overview.nextPeriod?.date).toBe(addDays(start, 35)),
    );
  });

  it("[IT-HK-03] falha de rede na gravação mostra erro e não altera o modelo", async () => {
    const { result } = renderHook(useBoth, { wrapper });
    await waitFor(() => expect(result.current.model.isLoading).toBe(false));
    backend.failNext("daily_logs", { message: "Failed to fetch" });
    await act(async () => {
      await result.current.save
        .mutateAsync({ log_date: todayISO(), flow_intensity: "light", symptoms: [], notes: null })
        .catch(() => undefined);
    });
    expect(toastSpy.error).toHaveBeenCalledWith(expect.stringContaining("Sem conexão"));
    expect(result.current.model.dailyLogs.data).toEqual([]);
  });

  it("[IT-HK-04] erro de leitura é exposto para a tela mostrar o estado de erro", async () => {
    backend.failNext("cycles", { message: "Failed to fetch" });
    const { result } = renderHook(useBoth, { wrapper });
    await waitFor(() => expect(result.current.model.isError).toBe(true));
  });
});
