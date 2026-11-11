# 03 — Plano de testes

## 1. Objetivo

Verificar e validar o Bloom nos quatro níveis exigidos — unidade, integração, validação/aceitação e sistema (E2E) — com testes automatizados, executáveis ao vivo e com evidências reais.

## 2. Escopo

Dentro: regras de ciclo, previsões e validação; métricas e estatísticas; insights; exportação; lembretes; sons; serviços de dados e seu isolamento por usuária; fluxos de interface (cadastro, login, registro, calendário, análise, histórico, diário, ajustes, exportação, exclusão, logout); responsividade.

Fora (com justificativa): login social Google/Apple (depende de provedores externos — validação manual CT-M-02); disparo de notificação do sistema operacional (API do navegador — lógica testada em unidade, entrega validada manualmente CT-M-10); infraestrutura do Lovable Cloud.

## 3. Estratégia por nível

| Nível | Pergunta respondida | Ferramenta | Onde | Ambiente |
|---|---|---|---|---|
| Unitário | Cada regra isolada está correta, inclusive nos limites e com entradas inválidas? | Vitest | `tests/unit` | Node, fuso America/Sao_Paulo |
| Integração | Serviços, banco (com RLS), regras e hooks funcionam juntos? E com falhas de rede e respostas inválidas? | Vitest + Testing Library | `tests/integration` | jsdom + backend em memória |
| Aceitação | A usuária consegue realizar cada tarefa, segundo critérios objetivos? | Vitest + Testing Library (componentes reais) | `tests/acceptance` | jsdom + backend em memória |
| Sistema (E2E) | A aplicação inteira, no navegador, cumpre as jornadas completas e trata erros e permissões? | Playwright (Chromium) | `tests/e2e` | App real (Vite) + Auth/REST simulados por interceptação HTTP; desktop 1440×900 e Pixel 7 |

### Técnicas aplicadas

- **Particionamento de equivalência e valores-limite:** duração de ciclo 14/15/90/91, menstruação 1/15/16, notas 2000/2001 caracteres, intensidade 0/1/5/6/2,5, horas de sono 16/16,5, horários 23:59/24:00, datas impossíveis (30/02, mês 13, 29/02 em ano não bissexto).
- **Testes de regressão** com ID do defeito no título (DEF-001…).
- **Injeção de falhas:** `MemoryBackend.failNext()` e `MockSupabase.offline` simulam queda de rede, erro 500, resposta malformada.
- **Testes negativos de permissão:** tentativa de ler/alterar/criar dados de outra usuária, inclusive por requisição forjada no navegador (E2E-07).
- **Dados de teste:** somente fictícios (`tests/fixtures/factories.ts`, domínio `bloom.test`); cada teste recebe banco novo e isolado.

## 4. Seleção das ferramentas

| Ferramenta | Motivo da escolha |
|---|---|
| **Vitest** | Já presente no projeto; usa a mesma configuração do Vite (aliases, TS, JSX), rápido, suporta projetos separados por nível, cobertura V8 e relatórios JUnit/JSON. Jest exigiria transformadores extras para ESM/TS. |
| **Testing Library** | Testa componentes pela perspectiva da usuária (papéis e rótulos acessíveis), ideal para aceitação. |
| **Playwright** | Navegador real, emulação de dispositivos (desktop e mobile), fuso e idioma configuráveis, interceptação de rede para backend determinístico, rastros (trace) e modo UI para apresentação ao vivo. |
| **Backend em memória próprio** | O Supabase real não é acessível no ambiente de testes e não deve receber dados de teste. O simulador reproduz PostgREST/Auth e RLS, e é o mesmo para integração e E2E. |

Nenhuma ferramenta além dessas foi adicionada.

## 5. Critérios

- **Entrada:** build de tipos sem erros (`npm run typecheck`).
- **Aprovação de um nível:** 100% dos testes do nível aprovados.
- **Cobertura mínima-alvo:** 80% de linhas no escopo `src/domain`, `src/services`, `src/lib`, `src/hooks`.
- **Saída:** todos os níveis aprovados, nenhum defeito de severidade Alta pendente, métricas regeneradas com `npm run metrics`.

## 6. Execução

Local: comandos no [README](../README.md#testes-4-níveis-do-edital). Contínua: [`.github/workflows/testes.yml`](../.github/workflows/testes.yml) em todo push para `main` e pull request, publicando `reports/` como artefato.

## 7. Relatórios gerados

| Relatório | Caminho |
|---|---|
| Cobertura HTML/LCOV/JSON | `reports/coverage/` |
| Vitest JUnit / JSON | `reports/vitest/` |
| Playwright HTML / JUnit / JSON / traces | `reports/playwright/` |
| Capturas de tela por dispositivo | `reports/screenshots/` (cópia em `docs/evidencias/screenshots`) |
| Métricas consolidadas | `docs/evidencias/metricas-execucao.md` |

## 8. Roteiro para demonstração ao vivo (≈ 5 min)

1. `npm run test:unit` — mostrar testes de limite e a regressão DEF-001 (fuso).
2. `npm run test:integration` — mostrar IT-DB-01/IT-DB-02 (isolamento e RLS) e IT-ERR-* (falhas).
3. `npm run test:e2e:ui` — executar **E2E-01** passo a passo no navegador; depois **E2E-07** (requisição forjada recusada).
4. Abrir `reports/coverage/index.html` e `docs/evidencias/metricas-execucao.md`.
5. Abrir o Defect Log e mostrar um defeito encontrado por teste (DEF-014 ou DEF-015).
