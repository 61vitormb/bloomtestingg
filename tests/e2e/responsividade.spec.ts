/**
 * [E2E-14..16] Responsividade e evidências visuais.
 * Popula uma conta fictícia com 3 ciclos, percorre todas as telas nos dois
 * tamanhos de tela, verifica a navegação adequada e a ausência de rolagem
 * horizontal, e salva capturas em reports/screenshots (evidências para o artigo).
 */
import { addDaysISO, ANA, expect, signIn, test, todayISO } from "./support/fixtures";
import { navigate } from "./support/nav";
import type { MockSupabase } from "./support/mock-supabase";

function seed(cloud: MockSupabase, userId: string) {
  const t = todayISO();
  const starts = [addDaysISO(t, -60), addDaysISO(t, -31), addDaysISO(t, -2)];
  for (const [i, s] of starts.entries()) {
    cloud.backend.insert("cycles", userId, [
      { user_id: userId, start_date: s, end_date: i < 2 ? addDaysISO(s, 4) : null },
    ]);
    cloud.backend.upsert(
      "daily_logs",
      userId,
      [
        {
          user_id: userId,
          log_date: s,
          flow_intensity: "heavy",
          symptoms: ["cramps", "fatigue", "m:cramps:3", "m:energy:2", "m:sleep_hours:6.5"],
          notes: i === 2 ? "Cólica forte de manhã, melhorou depois do almoço." : null,
        },
        {
          user_id: userId,
          log_date: addDaysISO(s, 1),
          flow_intensity: "moderate",
          symptoms: ["cramps", "bloating", "e:irritability", "m:cramps:2", "m:energy:3"],
          notes: null,
        },
      ],
      ["user_id", "log_date"],
    );
    cloud.backend.upsert(
      "mood_logs",
      userId,
      [
        { user_id: userId, log_date: s, moods: ["tired", "sensitive"], intensity: 4, notes: null },
        { user_id: userId, log_date: addDaysISO(s, 1), moods: ["calm"], intensity: 3, notes: null },
        {
          user_id: userId,
          log_date: addDaysISO(s, 12),
          moods: ["happy", "energized"],
          intensity: 4,
          notes: null,
        },
      ],
      ["user_id", "log_date"],
    );
  }
  cloud.backend.upsert(
    "daily_logs",
    userId,
    [
      {
        user_id: userId,
        log_date: addDaysISO(t, -20),
        flow_intensity: null,
        symptoms: ["acne"],
        notes: "Semana de provas, dormi pouco.",
      },
    ],
    ["user_id", "log_date"],
  );
}

const PAGES: [string, string][] = [
  ["Ciclo", "01-ciclo"],
  ["Calendário", "02-calendario"],
  ["Análise", "03-analise"],
  ["Histórico", "04-historico"],
  ["Diário", "05-diario"],
  ["Humor", "06-humor"],
  ["Conteúdo", "07-conteudo"],
  ["Ajustes", "08-ajustes"],
];

test("[E2E-14] todas as telas renderizam sem rolagem horizontal e com a navegação certa", async ({
  page,
  cloud,
}, info) => {
  const ana = await signIn(page, cloud, ANA);
  seed(cloud, ana.id);
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset["hydrated"] === "true");
  const wide = (page.viewportSize()?.width ?? 0) >= 768;

  for (const [label, file] of PAGES) {
    await navigate(page, label);
    await expect(page.locator("main h1").first()).toBeVisible();
    await page.waitForTimeout(1800); // deixa as animações de entrada terminarem para a captura
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `rolagem horizontal em ${label}`).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `reports/screenshots/${info.project.name}/${file}.png`,
      fullPage: true,
    });
  }

  const sidebar = page.getByRole("complementary", { name: "Navegação lateral" });
  const bottomMore = page.getByRole("button", { name: "Mais" });
  if (wide) {
    await expect(sidebar).toBeVisible();
    await expect(bottomMore).toBeHidden();
  } else {
    await expect(sidebar).toBeHidden();
    await expect(bottomMore).toBeVisible();
  }
});

test("[E2E-15] folha de registro: lateral no desktop, inferior no celular", async ({
  page,
  cloud,
}, info) => {
  await signIn(page, cloud, ANA);
  await page.getByRole("button", { name: "Registrar hoje" }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(700);
  const box = (await sheet.boundingBox())!;
  const vp = page.viewportSize()!;
  if (vp.width >= 768) expect(Math.round(box.x + box.width)).toBe(vp.width);
  else expect(Math.round(box.y + box.height)).toBe(vp.height);
  await page.screenshot({ path: `reports/screenshots/${info.project.name}/09-registro.png` });
});

test("[E2E-16] tela inicial pública e login", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(900);
  await page.screenshot({
    path: `reports/screenshots/${info.project.name}/00-boas-vindas.png`,
    fullPage: true,
  });
  await page.goto("/entrar?modo=login");
  await page.screenshot({ path: `reports/screenshots/${info.project.name}/00-entrar.png` });
});
