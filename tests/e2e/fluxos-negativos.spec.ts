/**
 * Testes de sistema — fluxos negativos, erros e permissões.
 */
import { addDaysISO, ANA, BIA, expect, signIn, test, todayISO } from "./support/fixtures";
import { navigate } from "./support/nav";
import { supabaseUrl } from "./support/mock-supabase";

test.describe("autenticação", () => {
  test("[E2E-02] senha incorreta mostra erro e não entra", async ({ page, cloud }) => {
    cloud.backend.createUser(ANA.email, ANA.password);
    await page.goto("/entrar?modo=login");
    await page.getByLabel("E-mail").fill(ANA.email);
    await page.getByLabel("Senha", { exact: true }).fill("SenhaErrada999");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("E-mail ou senha incorretos.");
    await expect(page).toHaveURL(/\/entrar/);
  });

  test("[E2E-03] cadastro valida e-mail, senha curta e consentimento antes de enviar", async ({
    page,
    cloud,
  }) => {
    await page.goto("/entrar?modo=cadastro");
    await page.getByLabel("E-mail").fill("nao-e-email");
    await page.getByLabel("Senha", { exact: true }).fill("12345678");
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("Informe um e-mail válido.");

    await page.getByLabel("E-mail").fill("nova@bloom.test");
    await page.getByLabel("Senha", { exact: true }).fill("123");
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("A senha precisa de pelo menos 8 caracteres.");

    await page.getByLabel("Senha", { exact: true }).fill("SenhaBoa123");
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "confirme que leu como seus dados são tratados",
    );
    expect(cloud.backend.users).toHaveLength(0);
  });

  test("[E2E-04] e-mail já cadastrado é informado com clareza", async ({ page, cloud }) => {
    cloud.backend.createUser(ANA.email, ANA.password);
    await page.goto("/entrar?modo=cadastro");
    await page.getByLabel("E-mail").fill(ANA.email);
    await page.getByLabel("Senha", { exact: true }).fill("OutraSenha123");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Já existe uma conta com esse e-mail. Tente entrar.",
    );
  });

  test("[E2E-05] rotas protegidas redirecionam para o login sem sessão", async ({ page }) => {
    for (const path of [
      "/app",
      "/app/calendario",
      "/app/analise",
      "/app/ajustes",
      "/app/historico",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/entrar\?modo=login/);
    }
  });
});

test.describe("permissões e isolamento de dados", () => {
  test("[E2E-06] uma usuária nunca vê os registros de outra", async ({ page, cloud }) => {
    const bia = cloud.backend.createUser(BIA.email, BIA.password, BIA.name);
    cloud.backend.insert("cycles", bia.id, [
      { user_id: bia.id, start_date: addDaysISO(todayISO(), -2), end_date: null },
    ]);
    cloud.backend.upsert(
      "daily_logs",
      bia.id,
      [
        {
          user_id: bia.id,
          log_date: todayISO(),
          flow_intensity: "heavy",
          symptoms: [],
          notes: "segredo da Bia",
        },
      ],
      ["user_id", "log_date"],
    );

    await signIn(page, cloud, ANA);
    await expect(page.getByRole("img", { name: /Registre sua menstruação/ })).toBeVisible();
    await navigate(page, "Diário");
    await expect(page.getByText("Seu diário está em branco")).toBeVisible();
    await expect(page.getByText("segredo da Bia")).toHaveCount(0);
  });

  test("[E2E-07] requisição forjada com user_id de outra pessoa é recusada pelo banco (RLS)", async ({
    page,
    cloud,
  }) => {
    const bia = cloud.backend.createUser(BIA.email, BIA.password);
    await signIn(page, cloud, ANA);
    // Requisição maliciosa feita pelo próprio navegador, com o token válido da Ana
    const result = await page.evaluate(
      async ({ biaId, rest }) => {
        const key = Object.keys(localStorage).find((k) => k.includes("auth-token"))!;
        const token = JSON.parse(localStorage.getItem(key)!).access_token as string;
        const r = await fetch(`${rest}/rest/v1/cycles?select=*`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: "x",
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({ user_id: biaId, start_date: "2026-01-01" }),
        });
        return { status: r.status, body: await r.json() };
      },
      { biaId: bia.id, rest: supabaseUrl() },
    );
    expect(result.status).toBe(403);
    expect(result.body.code).toBe("42501");
    expect(cloud.backend.tables.cycles).toHaveLength(0);
  });
});

test.describe("falhas e validações na interface", () => {
  test("[E2E-08] nuvem indisponível: estado de erro com opção de tentar novamente", async ({
    page,
    cloud,
  }) => {
    await signIn(page, cloud, ANA);
    cloud.offline = true;
    await navigate(page, "Análise");
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset["hydrated"] === "true");
    await expect(page.getByText("Não conseguimos carregar seus dados")).toBeVisible({
      timeout: 20_000,
    });
    cloud.offline = false;
    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByRole("heading", { name: "Seus padrões" })).toBeVisible();
  });

  test("[E2E-09] preferências de ciclo inválidas não são salvas", async ({ page, cloud }) => {
    await signIn(page, cloud, ANA);
    await navigate(page, "Ajustes");
    await page.locator("summary", { hasText: "Padrão do ciclo" }).click();
    await page.getByLabel("Duração média do ciclo (dias)").fill("120");
    await page.getByRole("button", { name: "Salvar ciclo" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "entre 15 e 90 dias" })).toBeVisible();
    const prefs = cloud.backend.tables.user_preferences[0]!;
    expect(prefs["average_cycle_length"]).toBeNull();
  });

  test("[E2E-10] excluir conta exige digitar EXCLUIR; apagar registros remove tudo", async ({
    page,
    cloud,
  }) => {
    const ana = await signIn(page, cloud, ANA);
    cloud.backend.insert("cycles", ana.id, [
      { user_id: ana.id, start_date: addDaysISO(todayISO(), -3), end_date: null },
    ]);
    await navigate(page, "Ajustes");

    await page.getByRole("button", { name: "Excluir minha conta" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("button", { name: "Excluir conta" })).toBeDisabled();
    await dialog.getByLabel(/Digite/).fill("excluir sim");
    await expect(dialog.getByRole("button", { name: "Excluir conta" })).toBeDisabled();
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    expect(cloud.backend.users).toHaveLength(1);

    await page.getByRole("button", { name: "Apagar todos os registros" }).click();
    await page
      .getByRole("alertdialog")
      .getByLabel(/Digite/)
      .fill("EXCLUIR");
    await page.getByRole("alertdialog").getByRole("button", { name: "Apagar registros" }).click();
    await expect(page.getByText("Todos os seus registros foram excluídos.")).toBeVisible();
    expect(cloud.backend.tables.cycles).toHaveLength(0);
    expect(cloud.backend.users).toHaveLength(1);
  });

  test("[E2E-11] troca de senha valida a confirmação e grava a nova senha", async ({
    page,
    cloud,
  }) => {
    await signIn(page, cloud, ANA);
    await navigate(page, "Ajustes");
    await page.locator("summary", { hasText: "Alterar senha" }).click();
    await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha2026");
    await page.getByLabel("Confirmar nova senha").fill("NovaSenha2025");
    await page.getByRole("button", { name: "Alterar senha" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "As senhas não coincidem." }),
    ).toBeVisible();
    await page.getByLabel("Confirmar nova senha").fill("NovaSenha2026");
    await page.getByRole("button", { name: "Alterar senha" }).click();
    await expect(page.getByText("Senha alterada.")).toBeVisible();
    expect(cloud.backend.users[0]!.password).toBe("NovaSenha2026");
  });
});

test.describe("configurações persistentes", () => {
  test("[E2E-12] tema escuro e modo discreto persistem após recarregar", async ({
    page,
    cloud,
  }) => {
    await signIn(page, cloud, ANA);
    await navigate(page, "Ajustes");
    await page.getByRole("radio", { name: "Escuro" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("switch", { name: "Modo discreto" }).click();
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset["hydrated"] === "true");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await navigate(page, "Ciclo");
    await expect(page.getByText("Modo discreto ativo")).toBeVisible();
  });

  test("[E2E-13] sons começam desligados e o controle de volume só funciona com eles ligados", async ({
    page,
    cloud,
  }) => {
    await signIn(page, cloud, ANA);
    await navigate(page, "Ajustes");
    await expect(page.getByRole("switch", { name: "Sons do Bloom" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(page.getByRole("button", { name: "Concluir" })).toBeDisabled();
    await page.getByRole("switch", { name: "Sons do Bloom" }).click();
    await expect(page.getByRole("button", { name: "Concluir" })).toBeEnabled();
  });
});
