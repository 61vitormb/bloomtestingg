# 01 — Auditoria do projeto (Fase 1)

Data: 11/11/2026 · Repositório: `61vitormb/bloomtestingg` (commit base `d21fd17`).

## Tecnologias encontradas

| Camada | Tecnologia |
|---|---|
| Framework | TanStack Start (React 19, roteamento por arquivos, SSR) sobre Vite 8 |
| Estilo | Tailwind CSS 4 + componentes Radix (shadcn/ui) |
| Dados | Supabase via Lovable Cloud (Auth + Postgres), cliente `@supabase/supabase-js` 2.x |
| Estado remoto | TanStack Query 5 |
| Validação | Zod 3 |
| Gráficos | Recharts 2 (instalado, sem uso antes da reformulação) |
| Testes | Vitest 5 com 1 arquivo (18 testes unitários de `cycle.ts`) |

## Banco de dados (pelos tipos gerados em `src/integrations/supabase/types.ts`)

| Tabela | Colunas principais | Chave de unicidade usada pelo app |
|---|---|---|
| `cycles` | start_date, end_date, notes | id |
| `daily_logs` | log_date, flow_intensity, symptoms text[], notes | (user_id, log_date) |
| `mood_logs` | log_date, moods text[], intensity, notes | (user_id, log_date) |
| `profiles` | id (= auth uid), display_name, locale | id |
| `user_preferences` | user_id, notifications_enabled, temperature_unit, average_cycle_length, average_period_length, onboarding_completed | user_id |

As migrações e políticas RLS **não estão versionadas** no repositório (pasta `supabase/` contém apenas `config.toml`). O app pressupõe RLS por usuária; o script [`database/proposta-migracao.sql`](database/proposta-migracao.sql) documenta e reforça essas políticas.

## Autenticação

E-mail/senha (Supabase Auth) e OAuth Google/Apple (Lovable Cloud Auth). Rotas autenticadas protegidas em `src/routes/_authenticated/route.tsx` via `supabase.auth.getUser()` no `beforeLoad`, com `ssr: false`.

## Funcionalidades existentes (preservadas)

Landing, cadastro/login/recuperação de senha, onboarding opcional, Home com anel e semana, calendário mensal com dias estimados, folha de registro (fluxo, 9 sintomas, 9 humores, intensidade, observações), tela de humor, histórico com edição/exclusão de ciclos, ajustes (nome, padrão de ciclo, lembretes on/off, unidade de temperatura, exportar JSON, excluir registros, sair).

## Problemas identificados na auditoria

Ver [Defect Log](defeitos/defect-log.md), itens DEF-001 a DEF-010 (identificados na Fase 1). Os mais graves: datas exibidas um dia antes e mês errado no calendário em fuso UTC-3; ausência de exclusão de conta, troca de senha e sessões; botões sem função em Ajustes; mensagens técnicas do banco expostas.

## Arquitetura e segurança

Pontos positivos já presentes: camada de domínio pura, serviços centralizados, sanitização de listas e notas, chave de serviço apenas em código de servidor. Lacunas: validação de entrada inconsistente, tratamento de erros genérico, sem testes de integração/aceitação/E2E, sem CI.

## Mapeamento para o edital

| Exigência | Situação inicial | Situação após o projeto |
|---|---|---|
| Testes unitários | 18 testes | 151 testes |
| Testes de integração | inexistentes | 34 testes (serviços + banco com RLS + hooks) |
| Testes de aceitação | inexistentes | 14 cenários automatizados + casos manuais |
| Testes de sistema (E2E) | inexistentes | 16 cenários × 2 dispositivos = 32 execuções |
| Cobertura / relatórios / CI | inexistentes | V8 + JUnit/JSON/HTML + GitHub Actions |
| Defect log, rastreabilidade, métricas | inexistentes | `docs/` |
