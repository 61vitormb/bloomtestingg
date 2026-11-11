#!/usr/bin/env node
/**
 * Consolida as métricas REAIS da última execução dos testes:
 *  - reports/vitest/results.json      (unitários, integração, aceitação)
 *  - reports/playwright/results.json  (E2E)
 *  - reports/coverage/coverage-summary.json
 *  - docs/defeitos/defeitos.json      (Defect Log)
 * e grava docs/evidencias/metricas-execucao.md (+ .json).
 * Nada é estimado: se um relatório não existir, a métrica aparece como "não executado".
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const vitest = read("reports/vitest/results.json");
const pw = read("reports/playwright/results.json");
const cov = read("reports/coverage/coverage-summary.json");
const defects = read("docs/defeitos/defeitos.json") ?? [];

const levels = {};
function add(level, status) {
  levels[level] ??= { total: 0, passed: 0, failed: 0, skipped: 0 };
  levels[level].total += 1;
  if (status === "passed") levels[level].passed += 1;
  else if (status === "failed") levels[level].failed += 1;
  else levels[level].skipped += 1;
}

if (vitest) {
  for (const file of vitest.testResults) {
    const level = file.name.includes("/tests/unit/")
      ? "Unitário"
      : file.name.includes("/tests/integration/")
        ? "Integração"
        : file.name.includes("/tests/acceptance/")
          ? "Aceitação"
          : "Outros";
    for (const t of file.assertionResults)
      add(level, t.status === "pending" || t.status === "todo" ? "skipped" : t.status);
  }
}
if (pw) {
  const walk = (suite) => {
    for (const spec of suite.specs ?? [])
      for (const t of spec.tests) {
        const r = t.results.at(-1);
        add(
          `E2E (${t.projectName})`,
          t.status === "skipped"
            ? "skipped"
            : r?.status === "passed" || t.status === "expected" || t.status === "flaky"
              ? "passed"
              : "failed",
        );
      }
    for (const s of suite.suites ?? []) walk(s);
  };
  for (const s of pw.suites) walk(s);
}

const total = Object.values(levels).reduce(
  (a, l) => ({
    total: a.total + l.total,
    passed: a.passed + l.passed,
    failed: a.failed + l.failed,
    skipped: a.skipped + l.skipped,
  }),
  { total: 0, passed: 0, failed: 0, skipped: 0 },
);
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : "—");
const c = cov?.total;
const fixedStatuses = ["Corrigido", "Verificado", "Fechado"];
const defectStats = {
  identificados: defects.length,
  corrigidos: defects.filter((d) => fixedStatuses.includes(d.status)).length,
  pendentes: defects.filter((d) => !fixedStatuses.includes(d.status)).length,
};

const generatedAt = new Date().toISOString();
const lines = [
  "# Métricas reais de execução",
  "",
  `Gerado automaticamente por \`npm run metrics\` em ${generatedAt}.`,
  `Fontes: ${[vitest && "reports/vitest/results.json", pw && "reports/playwright/results.json", cov && "reports/coverage/coverage-summary.json"].filter(Boolean).join(", ") || "nenhum relatório encontrado"}.`,
  "",
  "## Testes por nível",
  "",
  "| Nível | Total | Aprovados | Reprovados | Ignorados | Aprovação |",
  "|---|---:|---:|---:|---:|---:|",
  ...Object.entries(levels).map(
    ([k, l]) =>
      `| ${k} | ${l.total} | ${l.passed} | ${l.failed} | ${l.skipped} | ${pct(l.passed, l.total)} |`,
  ),
  `| **Total** | **${total.total}** | **${total.passed}** | **${total.failed}** | **${total.skipped}** | **${pct(total.passed, total.total)}** |`,
  "",
  "## Cobertura de código (Vitest + V8)",
  "",
  c
    ? [
        "| Métrica | Cobertos/Total | % |",
        "|---|---:|---:|",
        ...["statements", "branches", "functions", "lines"].map(
          (k) => `| ${k} | ${c[k].covered}/${c[k].total} | ${c[k].pct}% |`,
        ),
      ].join("\n")
    : "_Cobertura não executada (rode `npm run test:coverage`)._",
  "",
  "Escopo da cobertura: `src/domain`, `src/services`, `src/lib`, `src/hooks` (regras de negócio e integração). Telas React são cobertas pelos testes de aceitação e E2E, que não entram neste percentual.",
  "",
  "## Defeitos",
  "",
  "| Identificados | Corrigidos | Pendentes |",
  "|---:|---:|---:|",
  `| ${defectStats.identificados} | ${defectStats.corrigidos} | ${defectStats.pendentes} |`,
  "",
];
if (!pw)
  lines.push(
    "> E2E não executado nesta máquina — rode `npm run test:e2e` antes de `npm run metrics`.",
    "",
  );

mkdirSync("docs/evidencias", { recursive: true });
writeFileSync("docs/evidencias/metricas-execucao.md", lines.join("\n"));
writeFileSync(
  "docs/evidencias/metricas-execucao.json",
  JSON.stringify(
    { generatedAt, levels, total, coverage: c ?? null, defects: defectStats },
    null,
    2,
  ),
);
console.log(lines.join("\n"));
