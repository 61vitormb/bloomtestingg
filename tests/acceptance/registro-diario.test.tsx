/**
 * Testes de validação/aceitação — cenários da perspectiva da usuária.
 * Cada cenário tem critérios de aceitação objetivos (CA) verificados no "banco"
 * e na interface. Os componentes reais são renderizados; só a nuvem é simulada.
 * Ver docs/05-casos-de-teste.md para a descrição Dado/Quando/Então de cada cenário.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { FakeSupabaseClient } from "@tests/support/fake-supabase-client";
import { MemoryBackend, type Row } from "@tests/support/memory-backend";
import { TEST_USERS } from "@tests/fixtures/factories";

const h = vi.hoisted(() => ({ client: null as unknown as FakeSupabaseClient }));
vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return h.client;
  },
}));

import { DayLogSheet } from "@/components/bloom/DayLogSheet";
import { DayDetails } from "@/components/bloom/DayDetails";
import { addDays } from "@/domain/cycle";
import { decodeSymptoms } from "@/domain/metrics";
import { todayISO } from "@/lib/format";
import { useCycleModel } from "@/hooks/useBloomData";

let backend: MemoryBackend;
let userId: string;
const today = todayISO();

function renderWithData(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function SheetHarness({ date }: { date: string }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <span data-testid="sheet-state">{open ? "aberta" : "fechada"}</span>
      <DayLogSheet date={date} open={open} onOpenChange={setOpen} />
    </>
  );
}

function DetailsHarness({ date }: { date: string }) {
  const m = useCycleModel();
  if (m.isLoading) return <p>carregando</p>;
  return (
    <DayDetails
      date={date}
      cycles={m.records}
      daily={m.dailyLogs.data?.find((d) => d.log_date === date) ?? null}
      mood={m.moodLogs.data?.find((d) => d.log_date === date) ?? null}
      status={{
        recorded: m.recorded.has(date),
        predicted: m.predicted.has(date),
        fertile: m.fertile.has(date),
        ovulation: m.ovulation.has(date),
      }}
      onEdit={() => undefined}
    />
  );
}

/** Espera o botão ficar habilitado (histórico carregado) e clica. */
async function clickWhenEnabled(name: RegExp | string) {
  const button = await screen.findByRole("button", { name });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
}

const rows = (t: "cycles" | "daily_logs" | "mood_logs"): Row[] =>
  backend.tables[t].filter((r) => r["user_id"] === userId);

beforeEach(() => {
  backend = new MemoryBackend();
  h.client = new FakeSupabaseClient(backend);
  userId = backend.createUser(TEST_USERS.ana.email, TEST_USERS.ana.password).id;
  h.client.signInAs(userId);
  vi.restoreAllMocks();
});

describe("Cenário: registrar o início da menstruação", () => {
  it("[AT-01] CA1 o início é salvo com a data do dia; CA2 o botão passa a oferecer a remoção", async () => {
    renderWithData(<SheetHarness date={today} />);
    await clickWhenEnabled(/Menstruação começou/);
    await waitFor(() => expect(rows("cycles")).toHaveLength(1));
    expect(rows("cycles")[0]).toMatchObject({ start_date: today, end_date: null });
    expect(await screen.findByRole("button", { name: /Remover início deste dia/ })).toBeTruthy();
  });

  it("[AT-02] CA a usuária não consegue registrar início em data futura", async () => {
    renderWithData(<SheetHarness date={addDays(today, 3)} />);
    expect(await screen.findByText(/Este dia ainda não chegou/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Menstruação começou/ })).toBeNull();
  });

  it("[AT-03] CA início muito próximo do anterior exige confirmação explícita antes de salvar", async () => {
    backend.insert("cycles", userId, [
      { user_id: userId, start_date: addDays(today, -10), end_date: addDays(today, -6) },
    ]);
    renderWithData(<SheetHarness date={today} />);
    await clickWhenEnabled(/Menstruação começou/);
    expect(await screen.findByText(/Confirme se é um novo ciclo/)).toBeTruthy();
    expect(rows("cycles")).toHaveLength(1); // ainda não gravou
    fireEvent.click(screen.getByRole("button", { name: "Confirmar mesmo assim" }));
    await waitFor(() => expect(rows("cycles")).toHaveLength(2));
  });

  it("[AT-04] CA data dentro de uma menstruação registrada é recusada com mensagem", async () => {
    backend.insert("cycles", userId, [
      { user_id: userId, start_date: addDays(today, -3), end_date: addDays(today, 1) },
    ]);
    renderWithData(<SheetHarness date={addDays(today, -1)} />);
    await clickWhenEnabled(/Menstruação começou/);
    expect(
      await screen.findByText("Essa data está dentro de uma menstruação já registrada."),
    ).toBeTruthy();
    expect(rows("cycles")).toHaveLength(1);
  });

  it("[AT-05] CA registrar o fim fecha o ciclo aberto na data escolhida", async () => {
    backend.insert("cycles", userId, [
      { user_id: userId, start_date: addDays(today, -4), end_date: null },
    ]);
    renderWithData(<SheetHarness date={today} />);
    await clickWhenEnabled(/Menstruação terminou/);
    await waitFor(() => expect(rows("cycles")[0]!["end_date"]).toBe(today));
  });
});

describe("Cenário: registrar sintomas e humor", () => {
  it("[AT-06] CA1 todas as categorias escolhidas são salvas; CA2 a folha fecha após a confirmação da nuvem", async () => {
    renderWithData(<SheetHarness date={today} />);
    fireEvent.click(await screen.findByRole("button", { name: "Moderado" }));
    fireEvent.click(screen.getByRole("button", { name: /Feliz/ }));
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Cólicas" })).getByRole("radio", {
        name: /Moderadas/,
      }),
    );
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: /Como está sua energia/ })).getByRole("radio", {
        name: /Alta/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Dor de cabeça" }));
    fireEvent.click(screen.getByRole("button", { name: "Ansiedade" }));
    fireEvent.click(screen.getByRole("button", { name: "Aumentar meia hora" }));
    fireEvent.change(screen.getByLabelText("Observações pessoais"), {
      target: { value: "Dia corrido." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar registro" }));

    await waitFor(() => expect(screen.getByTestId("sheet-state").textContent).toBe("fechada"));
    const daily = rows("daily_logs")[0]!;
    expect(daily).toMatchObject({
      log_date: today,
      flow_intensity: "moderate",
      notes: "Dia corrido.",
    });
    expect(decodeSymptoms(daily["symptoms"] as string[])).toEqual({
      physical: ["headache"],
      emotional: ["anxiety"],
      metrics: { cramps: 2, energy: 5, sleep_hours: 7.5 },
    });
    expect(rows("mood_logs")[0]).toMatchObject({ moods: ["happy"] });
  });

  it("[AT-07] CA editar um registro existente: campos vêm preenchidos e a alteração substitui o anterior", async () => {
    backend.upsert(
      "daily_logs",
      userId,
      [
        {
          user_id: userId,
          log_date: today,
          flow_intensity: "light",
          symptoms: ["acne", "m:energy:2"],
          notes: "antes",
        },
      ],
      ["user_id", "log_date"],
    );
    backend.upsert(
      "mood_logs",
      userId,
      [{ user_id: userId, log_date: today, moods: ["sad"], intensity: 2, notes: null }],
      ["user_id", "log_date"],
    );
    renderWithData(<SheetHarness date={today} />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Leve" }).getAttribute("aria-pressed")).toBe(
        "true",
      ),
    );
    expect(screen.getByRole("button", { name: "Acne" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Triste/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: /Triste/ })); // desmarca
    fireEvent.click(screen.getByRole("button", { name: /Tranquila/ }));
    fireEvent.change(screen.getByLabelText("Observações pessoais"), {
      target: { value: "depois" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar registro" }));

    await waitFor(() => expect(rows("daily_logs")[0]!["notes"]).toBe("depois"));
    expect(rows("daily_logs")).toHaveLength(1);
    expect(rows("mood_logs")[0]!["moods"]).toEqual(["calm"]);
  });

  it("[AT-08] CA cancelar não grava nada", async () => {
    renderWithData(<SheetHarness date={today} />);
    fireEvent.click(await screen.findByRole("button", { name: "Intenso" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByTestId("sheet-state").textContent).toBe("fechada");
    expect(rows("daily_logs")).toHaveLength(0);
  });

  it("[AT-09] CA falha de conexão mantém a folha aberta com os dados preenchidos", async () => {
    renderWithData(<SheetHarness date={today} />);
    fireEvent.click(await screen.findByRole("button", { name: "Intenso" }));
    backend.failNext("daily_logs", { message: "Failed to fetch" });
    fireEvent.click(screen.getByRole("button", { name: "Salvar registro" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salvar registro" })).toBeTruthy(),
    );
    expect(screen.getByTestId("sheet-state").textContent).toBe("aberta");
    expect(screen.getByRole("button", { name: "Intenso" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("[AT-10] CA sons são opcionais: nenhum áudio é criado com a configuração padrão", async () => {
    const audioCtor = vi.fn();
    vi.stubGlobal("AudioContext", audioCtor);
    renderWithData(<SheetHarness date={today} />);
    fireEvent.click(await screen.findByRole("button", { name: "Leve" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar registro" }));
    await waitFor(() => expect(rows("daily_logs")).toHaveLength(1));
    expect(audioCtor).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("Cenário: consultar, diferenciar estimativas e excluir um dia", () => {
  it("[AT-11] CA o dia mostra os registros e diferencia menstruação registrada de estimada", async () => {
    const start = addDays(today, -28);
    backend.insert("cycles", userId, [
      { user_id: userId, start_date: start, end_date: addDays(start, 4) },
    ]);
    backend.upsert(
      "daily_logs",
      userId,
      [
        {
          user_id: userId,
          log_date: start,
          flow_intensity: "heavy",
          symptoms: ["cramps", "m:cramps:3"],
          notes: "pesado",
        },
      ],
      ["user_id", "log_date"],
    );
    const { unmount } = renderWithData(<DetailsHarness date={start} />);
    expect(await screen.findByText("Menstruação registrada")).toBeTruthy();
    expect(screen.getByText("Intenso")).toBeTruthy();
    expect(screen.getAllByText("Cólicas")).toHaveLength(2); // métrica e sintoma
    expect(screen.getByText("pesado")).toBeTruthy();
    unmount();

    renderWithData(<DetailsHarness date={addDays(start, 28)} />);
    expect(await screen.findByText("Menstruação estimada")).toBeTruthy();
    expect(screen.queryByText("Menstruação registrada")).toBeNull();
  });

  it("[AT-12] CA excluir os registros do dia pede confirmação e remove apenas aquele dia", async () => {
    backend.upsert(
      "daily_logs",
      userId,
      [
        { user_id: userId, log_date: today, flow_intensity: "light", symptoms: [], notes: null },
        {
          user_id: userId,
          log_date: addDays(today, -1),
          flow_intensity: "light",
          symptoms: [],
          notes: null,
        },
      ],
      ["user_id", "log_date"],
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithData(<DetailsHarness date={today} />);
    fireEvent.click(await screen.findByRole("button", { name: /Excluir/ }));
    expect(confirm).toHaveBeenCalled();
    await waitFor(() =>
      expect(rows("daily_logs").map((r) => r["log_date"])).toEqual([addDays(today, -1)]),
    );
  });

  it("[AT-13] CA se a usuária desiste na confirmação, nada é apagado", async () => {
    backend.upsert(
      "daily_logs",
      userId,
      [{ user_id: userId, log_date: today, flow_intensity: "light", symptoms: [], notes: null }],
      ["user_id", "log_date"],
    );
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWithData(<DetailsHarness date={today} />);
    fireEvent.click(await screen.findByRole("button", { name: /Excluir/ }));
    expect(rows("daily_logs")).toHaveLength(1);
  });
});

describe("Regressão DEF-014", () => {
  it("[AT-14] CA ações de menstruação ficam desabilitadas enquanto o histórico carrega", async () => {
    backend.failNext("cycles", { message: "Failed to fetch" });
    renderWithData(<SheetHarness date={today} />);
    const button = await screen.findByRole("button", { name: /Menstruação começou/ });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(true));
    fireEvent.click(button);
    expect(rows("cycles")).toHaveLength(0);
  });
});
