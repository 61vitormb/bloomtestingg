/**
 * [E2E-01] Jornada completa da usuária (edital: testes de sistema).
 * Acessar → criar conta → login → dashboard → registrar menstruação → registrar
 * sintomas e humor → calendário → estatísticas → editar → histórico → exportar → logout.
 */
import { readFile } from "node:fs/promises";
import { ANA, expect, test, todayISO } from "./support/fixtures";
import { navigate } from "./support/nav";

test("[E2E-01] jornada completa: da criação da conta ao logout", async ({ page, cloud }) => {
  test.setTimeout(120_000); // 12 etapas em sequência; folga para execução paralela
  const today = todayISO();

  await test.step("1. Acessar o Bloom", async () => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Seu ciclo, acompanhado com calma." }),
    ).toBeVisible();
  });

  await test.step("2. Criar uma conta de teste (com consentimento)", async () => {
    await page.getByRole("link", { name: "Criar minha conta" }).click();
    await expect(page.getByRole("heading", { name: "Criar conta no Bloom" })).toBeVisible();
    await page.getByLabel("Como quer ser chamada? (opcional)").fill(ANA.name);
    await page.getByLabel("E-mail").fill(ANA.email);
    await page.getByLabel("Senha", { exact: true }).fill(ANA.password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByRole("button", { name: "Pular e ir para o app" }).click();
    await expect(page).toHaveURL(/\/app$/);
    expect(cloud.backend.users).toHaveLength(1);
  });

  await test.step("Sair para testar o login", async () => {
    await navigate(page, "Ajustes");
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/entrar/);
  });

  await test.step("3. Fazer login", async () => {
    await page.getByLabel("E-mail").fill(ANA.email);
    await page.getByLabel("Senha", { exact: true }).fill(ANA.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/app$/);
  });

  await test.step("4. Acessar o dashboard", async () => {
    await expect(page.getByRole("heading", { name: /Ana Teste/ })).toBeVisible();
    await expect(page.getByRole("img", { name: /Registre sua menstruação/ })).toBeVisible();
  });

  await test.step("5. Registrar uma menstruação", async () => {
    await page.getByRole("button", { name: "Registrar hoje" }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: "Menstruação começou" }).click();
    await expect(sheet.getByRole("button", { name: "Remover início deste dia" })).toBeVisible();
    expect(cloud.backend.tables.cycles).toHaveLength(1);
    expect(cloud.backend.tables.cycles[0]).toMatchObject({ start_date: today });
  });

  await test.step("6. Registrar sintomas e humor", async () => {
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: /Feliz/ }).click();
    await sheet
      .getByRole("radiogroup", { name: "Cólicas" })
      .getByRole("radio", { name: /Moderadas/ })
      .click();
    await sheet.getByRole("button", { name: "Inchaço" }).click();
    await sheet.getByLabel("Observações pessoais").fill("Primeiro dia, tranquilo.");
    await sheet.getByRole("button", { name: "Salvar registro" }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText("Registro salvo na nuvem.")).toBeVisible();
    await expect(page.getByRole("img", { name: /Menstruação · dia 1/ })).toBeVisible();
    expect(cloud.backend.tables.mood_logs[0]).toMatchObject({ moods: ["happy"] });
  });

  await test.step("7. Consultar o calendário", async () => {
    await navigate(page, "Calendário");
    await expect(page.getByRole("heading", { name: "Seu mês" })).toBeVisible();
    const cell = page.locator(`[data-day="${today}"]`).last();
    await expect(cell).toHaveAttribute("data-kind", "recorded");
    // estimativas aparecem diferenciadas: janela fértil neste ciclo e próxima menstruação no futuro
    await expect(page.locator('[data-kind="fertile"]').first()).toBeAttached();
    await page.getByRole("button", { name: "Próximo mês" }).click();
    await expect(page.locator('[data-kind="predicted"]').first()).toBeAttached();
    await page.getByRole("button", { name: "Ir para hoje" }).click();
    await expect(page.getByTestId("day-details").getByText("Menstruação registrada")).toBeVisible();
    await expect(
      page.getByTestId("day-details").getByText("Primeiro dia, tranquilo."),
    ).toBeVisible();
  });

  await test.step("8. Consultar estatísticas", async () => {
    await navigate(page, "Análise");
    await expect(page.getByRole("heading", { name: "Seus padrões" })).toBeVisible();
    await expect(page.getByText("Frequência de sintomas")).toBeVisible();
    await expect(
      page.getByRole("img", { name: /./ }).or(page.locator(".recharts-wrapper")).first(),
    ).toBeVisible();
  });

  await test.step("9. Editar um registro", async () => {
    await navigate(page, "Calendário");
    await page.getByTestId("day-details").getByRole("button", { name: "Editar registro" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("button", { name: "Moderado" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await sheet.getByRole("button", { name: "Intenso" }).click();
    await sheet.getByRole("button", { name: "Salvar registro" }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByTestId("day-details").getByText("Intenso")).toBeVisible();
    expect(cloud.backend.tables.daily_logs).toHaveLength(1);
    expect(cloud.backend.tables.daily_logs[0]).toMatchObject({ flow_intensity: "heavy" });
  });

  await test.step("10. Consultar o histórico", async () => {
    await navigate(page, "Histórico");
    await expect(page.getByRole("heading", { name: "Seus ciclos" })).toBeVisible();
    await page.getByRole("button", { name: /Ciclo atual/ }).click();
    await expect(page.getByText("“Primeiro dia, tranquilo.”")).toBeVisible();
  });

  await test.step("11. Exportar os dados", async () => {
    await navigate(page, "Ajustes");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar tudo (JSON)" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`bloom-meus-dados-${today}.json`);
    const payload = JSON.parse(await readFile((await download.path())!, "utf8"));
    expect(payload).toMatchObject({ app: "Bloom", format_version: 2 });
    expect(payload.cycles).toHaveLength(1);
    expect(payload.daily_logs[0].flow_intensity).toBe("heavy");
    expect(payload.profile.display_name).toBe(ANA.name);
  });

  await test.step("12. Fazer logout", async () => {
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/entrar/);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/entrar/);
  });
});
