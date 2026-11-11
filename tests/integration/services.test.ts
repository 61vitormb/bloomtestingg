/**
 * Integração: camada de serviços ⇄ "banco" (MemoryBackend com RLS) ⇄ regras de domínio.
 * O cliente Supabase real é substituído pelo adaptador em memória — mesma interface.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeSupabaseClient } from "@tests/support/fake-supabase-client";
import { MemoryBackend } from "@tests/support/memory-backend";
import { TEST_USERS } from "@tests/fixtures/factories";

const h = vi.hoisted(() => ({
  client: null as unknown as FakeSupabaseClient,
  deleteMyAccount: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return h.client;
  },
}));
vi.mock("@/functions/account.functions", () => ({ deleteMyAccount: h.deleteMyAccount }));

import * as svc from "@/services/bloom";
import { BloomServiceError } from "@/services/bloom";
import { decodeSymptoms } from "@/domain/metrics";
import { buildCycleOverview, recordedPeriodDays } from "@/domain/cycle";
import { buildPeriodReport, summarizeCycles } from "@/domain/statistics";

let backend: MemoryBackend;
let ana: { id: string };
let bia: { id: string };

beforeEach(() => {
  backend = new MemoryBackend();
  h.client = new FakeSupabaseClient(backend);
  ana = backend.createUser(TEST_USERS.ana.email, TEST_USERS.ana.password, TEST_USERS.ana.name);
  bia = backend.createUser(TEST_USERS.bia.email, TEST_USERS.bia.password, TEST_USERS.bia.name);
  h.client.signInAs(ana.id);
  h.deleteMyAccount.mockReset();
});

async function expectServiceError(p: Promise<unknown>, code: string, message?: RegExp) {
  await expect(p).rejects.toBeInstanceOf(BloomServiceError);
  await p.catch((e: BloomServiceError) => {
    expect(e.code).toBe(code);
    if (message) expect(e.message).toMatch(message);
  });
}

describe("autenticação ⇄ perfil", () => {
  it("[IT-AUTH-01] conta nova tem perfil e preferências padrão acessíveis só por ela", async () => {
    const profile = await svc.fetchProfile();
    const prefs = await svc.fetchPreferences();
    expect(profile).toMatchObject({ id: ana.id, display_name: TEST_USERS.ana.name });
    expect(prefs).toMatchObject({
      user_id: ana.id,
      onboarding_completed: false,
      notifications_enabled: false,
    });
  });

  it("[IT-AUTH-02] sem sessão, gravações são bloqueadas com mensagem clara", async () => {
    h.client.signInAs(null);
    await expectServiceError(
      svc.createCycle({ start_date: "2026-11-01", end_date: null, notes: null }),
      "auth",
      /Entre novamente/,
    );
    expect(await svc.fetchCycles()).toEqual([]); // leitura anônima não vê nada (RLS)
  });

  it("[IT-AUTH-03] atualizar perfil grava na conta autenticada", async () => {
    await svc.updateProfile({ display_name: "  Aninha  " });
    expect((await svc.fetchProfile())?.display_name).toBe("Aninha");
  });
});

describe("frontend ⇄ banco (isolamento por usuária)", () => {
  it("[IT-DB-01] Bia não enxerga nem altera os ciclos da Ana", async () => {
    const cycle = await svc.createCycle({ start_date: "2026-10-01", end_date: null, notes: null });
    h.client.signInAs(bia.id);
    expect(await svc.fetchCycles()).toEqual([]);
    await expectServiceError(svc.updateCycle(cycle.id, { end_date: "2026-10-05" }), "not_found");
    await svc.deleteCycle(cycle.id); // não gera erro, mas não apaga nada
    h.client.signInAs(ana.id);
    expect(await svc.fetchCycles()).toHaveLength(1);
  });

  it("[IT-DB-02] tentativa de gravar com user_id alheio é barrada pela política (RLS)", async () => {
    const res = await h.client
      .from("cycles")
      .insert({ user_id: bia.id, start_date: "2026-10-01" })
      .select("*")
      .single();
    expect(res.error?.code).toBe("42501");
    expect(svc.toServiceError(res.error!).code).toBe("auth");
  });

  it("[IT-DB-03] registro diário: um por dia, edição sobrescreve sem duplicar", async () => {
    await svc.upsertDailyLog({
      log_date: "2026-11-10",
      flow_intensity: "light",
      symptoms: ["cramps", "m:energy:2"],
      notes: "a",
    });
    await svc.upsertDailyLog({
      log_date: "2026-11-10",
      flow_intensity: "heavy",
      symptoms: ["cramps", "m:energy:4", "e:stress"],
      notes: "b",
    });
    const logs = await svc.fetchDailyLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ flow_intensity: "heavy", notes: "b" });
    expect(decodeSymptoms(logs[0]!.symptoms)).toEqual({
      physical: ["cramps"],
      emotional: ["stress"],
      metrics: { energy: 4 },
    });
  });

  it("[IT-DB-04] DEF-005: salvar registro vazio remove o registro existente", async () => {
    await svc.upsertDailyLog({
      log_date: "2026-11-10",
      flow_intensity: "light",
      symptoms: [],
      notes: null,
    });
    const removed = await svc.upsertDailyLog({
      log_date: "2026-11-10",
      flow_intensity: null,
      symptoms: [],
      notes: "  ",
    });
    expect(removed).toBeNull();
    expect(await svc.fetchDailyLogs()).toEqual([]);
  });

  it("[IT-DB-05] DEF-004: limpar todos os humores remove o registro de humor do dia", async () => {
    await svc.upsertMoodLog({
      log_date: "2026-11-10",
      moods: ["happy"],
      intensity: 3,
      notes: null,
    });
    await svc.upsertMoodLog({ log_date: "2026-11-10", moods: [], intensity: 3, notes: null });
    expect(await svc.fetchMoodLogs()).toEqual([]);
  });

  it("[IT-DB-06] dados inválidos são barrados antes de chegar ao banco", async () => {
    await expectServiceError(
      svc.upsertMoodLog({
        log_date: "2026-11-10",
        moods: ["inventado"],
        intensity: null,
        notes: null,
      }),
      "validation",
      /Humor inválido/,
    );
    await expectServiceError(
      svc.createCycle({ start_date: "2026-11-10", end_date: "2026-11-01", notes: null }),
      "validation",
    );
    await expectServiceError(
      svc.upsertDailyLog({
        log_date: "31/12/2026",
        flow_intensity: null,
        symptoms: [],
        notes: null,
      }),
      "validation",
    );
    expect(backend.log.filter((l) => l.op !== "select")).toEqual([]);
  });

  it("[IT-DB-07] tokens de sintomas desconhecidos são descartados na gravação", async () => {
    const saved = await svc.upsertDailyLog({
      log_date: "2026-11-10",
      flow_intensity: null,
      symptoms: ["cramps", "<img onerror=x>", "m:energy:99"],
      notes: null,
    });
    expect(saved?.symptoms).toEqual(["cramps"]);
  });

  it("[IT-DB-08] intensidade do humor é normalizada e zerada quando não há humor", async () => {
    const saved = await svc.upsertMoodLog({
      log_date: "2026-11-10",
      moods: ["calm", "calm"],
      intensity: 4.4,
      notes: null,
    });
    expect(saved).toMatchObject({ moods: ["calm"], intensity: 4 });
  });

  it("[IT-DB-09] diário preserva fluxo e sintomas ao salvar só a anotação", async () => {
    const existing = await svc.upsertDailyLog({
      log_date: "2026-11-10",
      flow_intensity: "moderate",
      symptoms: ["acne"],
      notes: null,
    });
    await svc.saveDayNote({ log_date: "2026-11-10", notes: "Dia longo." }, existing);
    expect((await svc.fetchDailyLogs())[0]).toMatchObject({
      flow_intensity: "moderate",
      symptoms: ["acne"],
      notes: "Dia longo.",
    });
  });
});

describe("registro menstrual ⇄ histórico ⇄ calendário ⇄ estatísticas", () => {
  async function seedThreeCycles() {
    await svc.createCycle({ start_date: "2026-08-01", end_date: "2026-08-05", notes: null });
    await svc.createCycle({ start_date: "2026-08-29", end_date: "2026-09-02", notes: null });
    await svc.createCycle({ start_date: "2026-09-26", end_date: "2026-09-30", notes: null });
  }

  it("[IT-HIS-01] ciclos registrados aparecem no histórico em ordem e com durações", async () => {
    await seedThreeCycles();
    const cycles = await svc.fetchCycles();
    expect(cycles.map((c) => c.start_date)).toEqual(["2026-09-26", "2026-08-29", "2026-08-01"]);
    const s = summarizeCycles(cycles);
    expect(s.map((c) => c.cycleLength)).toEqual([28, 28, null]);
  });

  it("[IT-CAL-01] calendário reflete o registro: dias registrados e próxima previsão", async () => {
    await seedThreeCycles();
    const cycles = await svc.fetchCycles();
    const o = buildCycleOverview(cycles, "2026-10-10");
    expect(o.nextPeriod?.date).toBe("2026-10-24");
    expect(o.dayOfCycle).toBe(15);
    expect(recordedPeriodDays(cycles, "2026-10-10").has("2026-09-30")).toBe(true);
  });

  it("[IT-CAL-02] editar o fim da menstruação atualiza o cálculo", async () => {
    await seedThreeCycles();
    const last = (await svc.fetchCycles())[0]!;
    await svc.updateCycle(last.id, { end_date: "2026-10-02" });
    const days = recordedPeriodDays(await svc.fetchCycles(), "2026-10-10");
    expect(days.has("2026-10-02")).toBe(true);
  });

  it("[IT-STA-01] registros diários alimentam as estatísticas do período", async () => {
    await seedThreeCycles();
    await svc.upsertDailyLog({
      log_date: "2026-09-26",
      flow_intensity: "heavy",
      symptoms: ["cramps", "m:cramps:3"],
      notes: null,
    });
    await svc.upsertDailyLog({
      log_date: "2026-08-29",
      flow_intensity: "heavy",
      symptoms: ["cramps", "m:cramps:2"],
      notes: null,
    });
    await svc.upsertMoodLog({
      log_date: "2026-09-26",
      moods: ["tired"],
      intensity: 3,
      notes: null,
    });
    const r = buildPeriodReport(
      await svc.fetchCycles(),
      await svc.fetchDailyLogs(),
      await svc.fetchMoodLogs(),
      "all",
      "2026-10-10",
    );
    expect(r.cycleLength.mean).toBe(28);
    expect(r.topSymptoms[0]).toMatchObject({ value: "cramps", count: 2 });
    expect(r.metrics.cramps).toBe(2.5);
    expect(r.moodDays).toBe(1);
  });
});

describe("exportação de dados", () => {
  it("[IT-EXP-01] exporta somente os dados da própria usuária, em formato documentado", async () => {
    await svc.createCycle({ start_date: "2026-10-01", end_date: null, notes: null });
    h.client.signInAs(bia.id);
    await svc.createCycle({ start_date: "2026-09-01", end_date: null, notes: null });
    h.client.signInAs(ana.id);
    const payload = await svc.exportAllData();
    expect(payload).toMatchObject({ app: "Bloom", format_version: 2 });
    expect(payload.cycles.map((c) => c.user_id)).toEqual([ana.id]);
    expect(payload.profile?.id).toBe(ana.id);
  });

  it("[IT-EXP-02] CSV do histórico gerado a partir da nuvem", async () => {
    await svc.upsertDailyLog({
      log_date: "2026-10-01",
      flow_intensity: "light",
      symptoms: ["acne"],
      notes: "=cmd",
    });
    const csv = await svc.exportHistoryCsv();
    expect(csv).toContain("2026-10-01;Leve;Acne");
    expect(csv).toContain("'=cmd");
  });
});

describe("configurações e persistência", () => {
  it("[IT-CFG-01] preferências do ciclo persistem e são relidas", async () => {
    await svc.updatePreferences({
      average_cycle_length: 30,
      average_period_length: 6,
      notifications_enabled: true,
    });
    expect(await svc.fetchPreferences()).toMatchObject({
      average_cycle_length: 30,
      average_period_length: 6,
      notifications_enabled: true,
    });
  });

  it("[IT-CFG-02] valores fora dos limites não são gravados", async () => {
    await expectServiceError(
      svc.updatePreferences({ average_cycle_length: 100 }),
      "validation",
      /15 e 90/,
    );
    await expectServiceError(
      svc.updatePreferences({ temperature_unit: "kelvin" as "celsius" }),
      "validation",
    );
    expect((await svc.fetchPreferences())?.average_cycle_length).toBeNull();
  });

  it("[IT-CFG-03] troca de senha valida a regra e trata a senha repetida", async () => {
    await expectServiceError(
      svc.changePassword({ password: "curta1", confirm: "curta1" }),
      "validation",
    );
    await expectServiceError(
      svc.changePassword({ password: TEST_USERS.ana.password, confirm: TEST_USERS.ana.password }),
      "server",
      /diferente/,
    );
    await svc.changePassword({ password: "NovaSenha789", confirm: "NovaSenha789" });
    expect(h.client.passwordUpdates).toEqual(["NovaSenha789"]);
  });

  it("[IT-CFG-04] encerrar outras sessões mantém a sessão atual", async () => {
    await svc.signOutOtherSessions();
    expect(h.client.signOutCalls).toEqual(["others"]);
    expect(h.client.currentUserId).toBe(ana.id);
  });
});

describe("exclusão de dados", () => {
  it("[IT-DEL-01] apagar registros remove ciclos, diários e humores da usuária — e só dela", async () => {
    await svc.createCycle({ start_date: "2026-10-01", end_date: null, notes: null });
    await svc.upsertDailyLog({
      log_date: "2026-10-01",
      flow_intensity: "light",
      symptoms: [],
      notes: null,
    });
    await svc.upsertMoodLog({
      log_date: "2026-10-01",
      moods: ["calm"],
      intensity: null,
      notes: null,
    });
    h.client.signInAs(bia.id);
    await svc.createCycle({ start_date: "2026-09-01", end_date: null, notes: null });
    h.client.signInAs(ana.id);
    await svc.deleteAllRecords();
    expect(await svc.fetchCycles()).toEqual([]);
    expect(await svc.fetchDailyLogs()).toEqual([]);
    expect(await svc.fetchMoodLogs()).toEqual([]);
    expect(await svc.fetchProfile()).not.toBeNull(); // conta continua
    expect(backend.tables.cycles.filter((c) => c["user_id"] === bia.id)).toHaveLength(1);
  });

  it("[IT-DEL-02] excluir conta chama a função de servidor e encerra a sessão local", async () => {
    h.deleteMyAccount.mockResolvedValue({ deleted: true });
    await svc.deleteAccount();
    expect(h.deleteMyAccount).toHaveBeenCalledTimes(1);
    expect(h.client.signOutCalls).toEqual(["local"]);
  });

  it("[IT-DEL-03] falha na exclusão da conta não encerra a sessão e informa a usuária", async () => {
    h.deleteMyAccount.mockRejectedValue(new Error("boom"));
    await expectServiceError(svc.deleteAccount(), "server", /Não foi possível excluir a conta/);
    expect(h.client.signOutCalls).toEqual([]);
  });
});

describe("falhas de comunicação e respostas inválidas", () => {
  it("[IT-ERR-01] queda de rede vira mensagem amigável que preserva o formulário", async () => {
    backend.failNext("cycles", { message: "TypeError: Failed to fetch" });
    await expectServiceError(svc.fetchCycles(), "network", /formulário foram preservados/);
  });

  it("[IT-ERR-02] erro interno do servidor não expõe detalhes técnicos", async () => {
    backend.failNext("daily_logs", {
      status: 500,
      code: "XX000",
      message: "relation daily_logs: internal stack trace",
    });
    const p = svc.upsertDailyLog({
      log_date: "2026-11-10",
      flow_intensity: "light",
      symptoms: [],
      notes: null,
    });
    await expectServiceError(p, "server");
    await p.catch((e: Error) => expect(e.message).not.toContain("stack"));
  });

  it("[IT-ERR-03] resposta em formato inesperado é rejeitada", async () => {
    h.client.rawResponse = { not: "an array" };
    await expectServiceError(svc.fetchCycles(), "server", /Resposta inesperada/);
  });

  it("[IT-ERR-04] sintomas nulos vindos do banco são tratados como lista vazia", async () => {
    await svc.upsertDailyLog({
      log_date: "2026-11-10",
      flow_intensity: "light",
      symptoms: [],
      notes: null,
    });
    backend.tables.daily_logs[0]!["symptoms"] = null;
    expect((await svc.fetchDailyLogs())[0]!.symptoms).toEqual([]);
  });

  it("[IT-ERR-05] menstruação duplicada no mesmo dia é recusada pelo banco", async () => {
    await svc.createCycle({ start_date: "2026-10-01", end_date: null, notes: null });
    await expectServiceError(
      svc.createCycle({ start_date: "2026-10-01", end_date: null, notes: null }),
      "server",
    );
  });
});
