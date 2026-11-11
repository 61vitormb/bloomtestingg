import { test as base, expect, type Page } from "@playwright/test";
import { MockSupabase } from "./mock-supabase";
import { TEST_USERS } from "../../fixtures/factories";

export { expect };

/**
 * Cada teste recebe um backend novo e isolado (`cloud`) já instalado na página.
 * Nenhum dado real: usuárias e registros são fictícios e descartados ao final.
 */
export const test = base.extend<{ cloud: MockSupabase }>({
  cloud: async ({ page }, provide) => {
    const cloud = new MockSupabase();
    await cloud.install(page);
    // Fontes externas são bloqueadas no ambiente de teste: responde vazio para não poluir o console
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) =>
      r.fulfill({ status: 200, body: "" }),
    );
    await provide(cloud);
  },
  page: async ({ page }, provide) => {
    // Toda navegação espera a hidratação do React antes de interagir
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const res = await goto(url, options);
      await page.waitForFunction(
        () => document.documentElement.dataset["hydrated"] === "true",
        null,
        { timeout: 30_000 },
      );
      return res;
    };
    await provide(page);
  },
});

export const ANA = TEST_USERS.ana;
export const BIA = TEST_USERS.bia;

/** Cria uma conta já com onboarding concluído e entra pelo formulário real. */
export async function signIn(
  page: Page,
  cloud: MockSupabase,
  user = ANA,
  opts: { onboarded?: boolean } = {},
) {
  let account = cloud.backend.users.find((u) => u.email === user.email);
  if (!account) account = cloud.backend.createUser(user.email, user.password, user.name);
  if (opts.onboarded !== false) {
    const prefs = cloud.backend.tables.user_preferences.find((p) => p["user_id"] === account!.id)!;
    prefs["onboarding_completed"] = true;
  }
  await page.goto("/entrar?modo=login");
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  return account;
}

/** Data ISO local de hoje, no fuso configurado para os testes. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days, 12));
  return date.toISOString().slice(0, 10);
}
