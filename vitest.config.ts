/**
 * Configuração dos testes automatizados (Vitest).
 * Projetos separados por nível de teste, para execução e relatório independentes:
 *   unit        → funções puras de domínio e utilitários (node)
 *   integration → serviços + "banco" em memória com RLS, hooks + React Query (jsdom)
 *   acceptance  → cenários da perspectiva da usuária com critérios objetivos (jsdom)
 * Os testes de sistema (E2E) usam Playwright — ver playwright.config.ts.
 */
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));
const tests = fileURLToPath(new URL("./tests", import.meta.url));

const shared = {
  resolve: { alias: { "@": src, "@tests": tests } },
};

export default defineConfig({
  ...shared,
  plugins: [react()],
  test: {
    // Fuso fixo de Brasília: reproduz o ambiente real das usuárias e o DEF-001
    env: { TZ: "America/Sao_Paulo" },
    reporters: [
      "default",
      ["junit", { outputFile: "reports/vitest/junit.xml" }],
      ["json", { outputFile: "reports/vitest/results.json" }],
    ],
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "jsdom",
          include: ["tests/integration/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/support/setup-dom.ts"],
        },
      },
      {
        test: {
          name: "acceptance",
          environment: "jsdom",
          include: ["tests/acceptance/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/support/setup-dom.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "reports/coverage",
      reporter: ["text-summary", "text", "html", "json-summary", "lcov"],
      include: ["src/domain/**", "src/services/**", "src/lib/**", "src/hooks/**"],
      exclude: [
        "src/lib/lovable-error-reporting.ts",
        "src/lib/error-capture.ts",
        "src/lib/error-page.ts",
        "src/hooks/use-mobile.tsx",
      ],
    },
  },
});
