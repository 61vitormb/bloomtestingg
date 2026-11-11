/**
 * Testes de sistema (E2E) com Playwright.
 * - Sobe o app real (vite dev) e dirige um navegador Chromium/Chrome de verdade.
 * - A nuvem é simulada por interceptação HTTP (tests/e2e/support/mock-supabase.ts),
 *   então os testes são determinísticos e nunca usam dados reais.
 * - Projetos desktop e mobile validam as duas navegações (barra lateral x barra inferior).
 *
 * Navegador: em CI usa o Chromium baixado pelo Playwright. Localmente, se
 * PLAYWRIGHT_CHROME_PATH (ou /usr/bin/google-chrome) existir, ele é usado.
 */
import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = Number(process.env["E2E_PORT"] ?? 4173);
const chromePath =
  process.env["PLAYWRIGHT_CHROME_PATH"] ??
  (existsSync("/usr/bin/google-chrome") && !process.env["CI"]
    ? "/usr/bin/google-chrome"
    : undefined);
const launchOptions = chromePath ? { executablePath: chromePath } : {};

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "reports/playwright/artifacts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  workers: process.env["CI"] ? 2 : 3,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "reports/playwright/html", open: "never" }],
    ["junit", { outputFile: "reports/playwright/junit.xml" }],
    ["json", { outputFile: "reports/playwright/results.json" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: process.env["E2E_VIDEO"] ? "on" : "off",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], launchOptions },
    },
  ],
  webServer: {
    command: `npx vite dev --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
