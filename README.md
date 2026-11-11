# Bloom

Aplicativo de acompanhamento menstrual, sintomas, humor e bem-estar — e objeto de estudo do **Projeto Final A3 (Garantia em Qualidade de Software, 2026b)**.

Aplicação: https://bloomtestingg.lovable.app/

> O Bloom não é método contraceptivo nem ferramenta de diagnóstico. Todas as previsões são estimativas baseadas nos registros da usuária.

## Funcionalidades

| Área | O que faz |
|---|---|
| **Ciclo (dashboard)** | Anel do ciclo com menstruação registrada, estimativas e janela fértil; dia e fase estimada; previsão e contagem regressiva; "flor do dia" com 6 categorias de registro; humor recente; sintomas frequentes; insight; mensagem contextual |
| **Calendário** | Mês completo com navegação (botões e gesto), legenda, diferenciação registrado × estimado, painel do dia com edição e exclusão |
| **Registro diário** | Início/fim da menstruação (com validação e confirmação), fluxo, humor + intensidade, cólicas, dores, energia, sono (qualidade e horas), sintomas físicos e emocionais, diário |
| **Análise** | Médias, variação, duração da menstruação, ciclos fora do padrão, gráficos animados (ciclos, humor, sintomas), comparação entre ciclos, relatórios por período (CSV e impressão), insights descritivos |
| **Histórico** | Todos os ciclos com filtro por período, detalhes por dia, edição de datas, exclusão, inclusão de ciclos anteriores, exportação CSV/JSON |
| **Diário** | Anotações privadas por data, ligadas ao dia e fase do ciclo, com busca |
| **Humor** | Registro com um toque e visão dos últimos 30 dias |
| **Conteúdo** | Central educativa (fases, sintomas, saúde menstrual, como o app calcula) |
| **Ajustes** | Perfil, senha, padrão do ciclo, lembretes (diário, previsão, sintomas, personalizados), sons (desligados por padrão, com volume), tema claro/escuro, reduzir animações, modo discreto, LGPD, exportação, apagar registros, excluir conta, sessões |

## Stack

TanStack Start + React 19 · Tailwind CSS 4 · Supabase (Lovable Cloud, Auth + Postgres com RLS) · TanStack Query · Zod · Recharts · Vitest · Playwright.

## Como rodar

```bash
npm install
npm run dev            # app em desenvolvimento
npm run build          # build de produção
```

## Testes (4 níveis do edital)

```bash
npm run test               # unitários + integração + aceitação (Vitest)
npm run test:unit          # só unitários
npm run test:integration   # só integração
npm run test:acceptance    # só aceitação
npm run test:coverage      # tudo acima + cobertura (reports/coverage)
npm run test:e2e           # testes de sistema (Playwright, desktop + mobile)
npm run test:e2e:ui        # modo visual, ideal para apresentação ao vivo
npm run test:all           # typecheck + cobertura + E2E
npm run metrics            # consolida métricas reais em docs/evidencias/metricas-execucao.md
```

Na primeira execução do E2E fora deste ambiente: `npx playwright install chromium`.

Resultado da última execução completa: **231 testes, 231 aprovados** · cobertura de linhas **86,08%** (domínio, serviços, hooks e utilitários) · **19 defeitos registrados e corrigidos**. Detalhes em [`docs/evidencias/metricas-execucao.md`](docs/evidencias/metricas-execucao.md).

## Documentação acadêmica

Índice em [`docs/README.md`](docs/README.md): auditoria, requisitos, plano de testes, matriz de rastreabilidade, casos de teste, defect log, relatório de execução, segurança/LGPD, modelo de responsabilidades/cronograma e estrutura do artigo.

## Estrutura

```
src/domain/       regras puras (ciclo, métricas, estatísticas, insights, validação, exportação, lembretes, sons)
src/services/     única porta para a nuvem (validação + tradução de erros)
src/functions/    funções de servidor (exclusão de conta)
src/hooks/        React Query + modelo derivado do ciclo
src/components/bloom/  componentes do design system Bloom
src/routes/       telas
tests/unit | integration | acceptance | e2e | fixtures | support
docs/             documentação A3, defect log, evidências
```
