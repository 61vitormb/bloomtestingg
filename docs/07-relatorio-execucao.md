# 07 — Relatório de execução

## Ambiente

| Item | Valor |
|---|---|
| Data | 11/11/2026 |
| Sistema | Linux (contêiner), Node.js 22.23 |
| Vitest | 5.1.0 + @vitest/coverage-v8 5.1.0 |
| Playwright | 1.65.0, Chromium (Google Chrome do sistema) |
| Fuso dos testes | America/Sao_Paulo |
| Dispositivos E2E | Desktop 1440×900; Pixel 7 (412×915, toque) |
| Backend | Simulado em memória (Auth + PostgREST + RLS) — ver LIM-05 |

## Comandos executados

```bash
npm run typecheck        # sem erros
npm run test:coverage    # 12 arquivos, 199 testes
npm run test:e2e         # 32 execuções (16 cenários × 2 dispositivos)
npm run metrics
```

## Resultado consolidado

| Nível | Total | Aprovados | Reprovados | Ignorados | Aprovação |
|---|---:|---:|---:|---:|---:|
| Unitário | 151 | 151 | 0 | 0 | 100% |
| Integração | 34 | 34 | 0 | 0 | 100% |
| Aceitação | 14 | 14 | 0 | 0 | 100% |
| E2E desktop | 16 | 16 | 0 | 0 | 100% |
| E2E mobile | 16 | 16 | 0 | 0 | 100% |
| **Total** | **231** | **231** | **0** | **0** | **100%** |

Cobertura (escopo `src/domain`, `src/services`, `src/lib`, `src/hooks`): **linhas 86,08%** (631/733), instruções 84,83%, ramos 82,78%, funções 85,93%. Por arquivo: [`evidencias/cobertura-por-arquivo.txt`](evidencias/cobertura-por-arquivo.txt). A camada de domínio sozinha tem 97,21% de linhas.

Duração aproximada: Vitest ≈ 5 s; Playwright ≈ 4,6 min com 3 workers.

## Histórico honesto da execução

Os 100% acima são da **execução final**. Durante o ciclo, os testes reprovaram e revelaram defeitos, todos registrados no [Defect Log](defeitos/defect-log.md):

| Momento | Teste que reprovou | Causa | Defeito |
|---|---|---|---|
| Unitários | UT-CNT-02 | Erro no próprio script (regex) | DEF-012 |
| Integração | IT-CFG-03 | Mensagem de "mesma senha" não reconhecida | DEF-013 |
| Aceitação | AT-03, AT-04 | Validação ignorada antes do histórico carregar | DEF-014 |
| Aceitação | AT-11 | Seletor ambíguo no teste (texto "Cólicas" aparece 2×) — ajuste do teste, não defeito do produto | — |
| E2E | E2E-01 | Usuária devolvida ao onboarding | DEF-015 |
| E2E | E2E-01 | Teste agia antes da hidratação do React — sincronização adicionada (`data-hydrated`) | — |
| E2E | E2E-08 | Carregamento prolongado com a nuvem fora do ar | DEF-016 |
| E2E | E2E-01 (paralelo) | Tempo-limite do teste | DEF-019 |
| Revisão visual (E2E-14) | — | Humor futuro na Home; texto do insight | DEF-017, DEF-018 |

## Defeitos

19 identificados · 19 corrigidos · 0 pendentes. Distribuição por origem: 9 pela auditoria (Fase 1), 1 pela revisão das regras de ciclo, 1 pelo build, 8 pelos testes automatizados e revisão das evidências.

## Como reproduzir

Siga os comandos acima; os relatórios aparecem em `reports/` e as métricas são regeneradas em `docs/evidencias/metricas-execucao.md`. No GitHub, o workflow "Testes do Bloom" executa tudo e anexa os relatórios ao run.
