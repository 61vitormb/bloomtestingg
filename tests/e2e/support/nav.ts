import type { Page } from "@playwright/test";

const PRIMARY = ["Ciclo", "Calendário", "Análise"];

/**
 * Navega pelo menu real: barra lateral no desktop/tablet (≥ 768px) e, no celular,
 * barra inferior (Ciclo, Calendário, Análise) + menu "Mais" para as demais áreas.
 */
export async function navigate(page: Page, label: string) {
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  const wide = (page.viewportSize()?.width ?? 1280) >= 768;
  if (wide || PRIMARY.includes(label)) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    return;
  }
  await nav.getByRole("button", { name: "Mais" }).click();
  await page.getByRole("dialog").getByRole("link", { name: label, exact: true }).click();
}
