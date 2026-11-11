# Defect Log — Bloom

Fonte de dados: `docs/defeitos/defeitos.json` (usada também por `npm run metrics`). O campo **Responsável** deve ser preenchido pela equipe — não foram inventados nomes.

| ID | Módulo | Descrição | Sev. | Prior. | Status | Identificado por | Evidências |
|---|---|---|---|---|---|---|---|
| DEF-001 | Formatação de datas (todas as telas) | Datas exibidas um dia antes do correto (ex.: 11/11 aparecia como '10 de nov') em fusos negativos como America/Sao_Paulo. | Alta | Alta | Corrigido | Auditoria de código (Fase 1) | UT-FMT-01, UT-FMT-02, UT-CYC-30 |
| DEF-002 | Calendário | Cabeçalho do calendário mostrava o mês anterior ('outubro de 2026' em novembro). | Alta | Alta | Corrigido | Auditoria de código (Fase 1) | UT-FMT-03, E2E-01 passo 7 |
| DEF-003 | Dashboard | Faixa semanal da Home deslocada em um dia (semana começava no sábado). | Média | Alta | Corrigido | Auditoria de código (Fase 1) | UT-CYC-31 |
| DEF-004 | Registro diário / Humor | Desmarcar todos os humores de um dia não apagava o registro de humor anterior. | Média | Média | Corrigido | Auditoria de código (Fase 1) | IT-DB-05, AT-07 |
| DEF-005 | Registro diário | Salvar o formulário diário vazio criava linhas vazias no banco, contadas como 'dia registrado'. | Baixa | Média | Corrigido | Auditoria de código (Fase 1) | IT-DB-04 |
| DEF-006 | Perfil e configurações | Itens de Ajustes sem funcionalidade ('Planos & Assinatura', 'Tema: Monocromático'). | Baixa | Média | Corrigido | Auditoria de UI (Fase 1) | E2E-12 |
| DEF-007 | Perfil e configurações | Ausência de exclusão da conta, troca de senha e gerenciamento de sessões (requisitos LGPD/edital). | Alta | Alta | Corrigido | Auditoria de requisitos (Fase 1) | IT-DEL-02, IT-CFG-03, IT-CFG-04, E2E-10, E2E-11 |
| DEF-008 | Regras de ciclo | Era possível registrar um início de menstruação dentro de outra menstruação já registrada (sobreposição). | Média | Média | Corrigido | Revisão das regras de ciclo (Fase 3) | UT-CYC-47, AT-04 |
| DEF-009 | Registro diário | Avisos de ciclo atípico eram exibidos, mas o registro era gravado mesmo assim, sem chance de cancelar. | Média | Média | Corrigido | Auditoria de código (Fase 1) | AT-03 |
| DEF-010 | Tratamento de erros | Mensagens técnicas do banco (ex.: 'violates row-level security policy') eram mostradas à usuária. | Média | Média | Corrigido | Auditoria de segurança (Fase 1) | IT-ERR-01, IT-ERR-02, IT-DB-02 |
| DEF-011 | Build / Arquitetura | Função de servidor colocada em src/server/ quebrava o build (proteção de importação do TanStack Start). | Alta | Alta | Corrigido | Build de produção (Fase 3) | vite build |
| DEF-012 | Testes (script) | Defeito no script de teste: expressão regular de 'linguagem responsável' acusava falso positivo ('procurar' contém 'cura'). | Baixa | Baixa | Corrigido | Execução dos testes unitários | UT-CNT-02 |
| DEF-013 | Conta / Senha | Ao trocar para a mesma senha, a mensagem amigável não aparecia (o Supabase responde 'should be different', não 'same'). | Baixa | Média | Corrigido | Teste de integração IT-CFG-03 | IT-CFG-03 |
| DEF-014 | Registro diário | Tocar em 'Menstruação começou' antes do histórico carregar ignorava a validação de sobreposição e intervalo. | Média | Alta | Corrigido | Testes de aceitação AT-03/AT-04 | AT-03, AT-04, AT-14 |
| DEF-015 | Onboarding / Dashboard | Após concluir ou pular o onboarding, a usuária era mandada de volta ao onboarding (cache antigo das preferências). | Alta | Alta | Corrigido | Teste E2E-01 | E2E-01 passo 2 |
| DEF-016 | Tratamento de erros | Com a nuvem fora do ar, a tela ficava carregando por muito tempo (3 novas tentativas com espera crescente). | Média | Média | Corrigido | Teste E2E-08 | E2E-08 |
| DEF-017 | Dashboard | 'Humor recente' na Home exibia registros com data futura. | Baixa | Baixa | Corrigido | Revisão visual das capturas E2E-14 | reports/screenshots/*/01-ciclo.png |
| DEF-018 | Insights | Insight exibia texto incoerente 'Entre 29 e 29 dias (diferença de 0 dias)'. | Baixa | Baixa | Corrigido | Revisão visual das capturas E2E-14 | UT-INS-07 |
| DEF-019 | Testes (configuração E2E) | Teste E2E-01 (jornada de 12 etapas) excedia o limite de 60 s por teste quando executado em paralelo com outros testes. | Baixa | Média | Corrigido | Execução completa da suíte E2E | E2E-01 |

## Detalhamento

### DEF-001

- **Descrição:** Datas exibidas um dia antes do correto (ex.: 11/11 aparecia como '10 de nov') em fusos negativos como America/Sao_Paulo.
- **Módulo:** Formatação de datas (todas as telas)
- **Passos para reprodução:**
  1. Configurar o aparelho no fuso de Brasília
  2. Registrar algo em 11/11
  3. Ver a data no calendário ou histórico
- **Resultado esperado:** Exibir '11 de nov'
- **Resultado obtido:** Exibia '10 de nov' (data ISO interpretada como meia-noite UTC e formatada no fuso local)
- **Severidade / Prioridade:** Alta / Alta
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** UT-FMT-01, UT-FMT-02, UT-CYC-30
- **Correção aplicada:** parseISODate passou a usar meio-dia UTC; formatação usa Date local (isoToLocalDate). src/domain/cycle.ts, src/lib/format.ts

### DEF-002

- **Descrição:** Cabeçalho do calendário mostrava o mês anterior ('outubro de 2026' em novembro).
- **Módulo:** Calendário
- **Passos para reprodução:**
  1. Abrir o Calendário em novembro no fuso de Brasília
- **Resultado esperado:** 'novembro de 2026'
- **Resultado obtido:** 'outubro de 2026'
- **Severidade / Prioridade:** Alta / Alta
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** UT-FMT-03, E2E-01 passo 7
- **Correção aplicada:** formatMonthYear usa new Date(ano, mês, 1, 12) local. src/lib/format.ts

### DEF-003

- **Descrição:** Faixa semanal da Home deslocada em um dia (semana começava no sábado).
- **Módulo:** Dashboard
- **Passos para reprodução:**
  1. Abrir a Home numa quarta-feira no fuso de Brasília
- **Resultado esperado:** Semana de domingo a sábado contendo hoje na posição correta
- **Resultado obtido:** getDay() local sobre data UTC devolvia o dia anterior
- **Severidade / Prioridade:** Média / Alta
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** UT-CYC-31
- **Correção aplicada:** weekdayOf/startOfWeekISO independentes de fuso. src/domain/cycle.ts

### DEF-004

- **Descrição:** Desmarcar todos os humores de um dia não apagava o registro de humor anterior.
- **Módulo:** Registro diário / Humor
- **Passos para reprodução:**
  1. Registrar 'Feliz' hoje
  2. Abrir o registro, desmarcar 'Feliz' e salvar
- **Resultado esperado:** Dia sem humor registrado
- **Resultado obtido:** O humor antigo continuava salvo
- **Severidade / Prioridade:** Média / Média
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** IT-DB-05, AT-07
- **Correção aplicada:** upsertMoodLog exclui o registro quando fica vazio. src/services/bloom.ts

### DEF-005

- **Descrição:** Salvar o formulário diário vazio criava linhas vazias no banco, contadas como 'dia registrado'.
- **Módulo:** Registro diário
- **Passos para reprodução:**
  1. Abrir o registro de um dia
  2. Clicar em Salvar sem preencher nada
- **Resultado esperado:** Nada é gravado
- **Resultado obtido:** Linha vazia em daily_logs
- **Severidade / Prioridade:** Baixa / Média
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** IT-DB-04
- **Correção aplicada:** upsertDailyLog remove o registro quando vazio. src/services/bloom.ts

### DEF-006

- **Descrição:** Itens de Ajustes sem funcionalidade ('Planos & Assinatura', 'Tema: Monocromático').
- **Módulo:** Perfil e configurações
- **Passos para reprodução:**
  1. Abrir Ajustes
  2. Tocar em 'Planos & Assinatura' ou 'Tema'
- **Resultado esperado:** Ação funcional ou item ausente
- **Resultado obtido:** Nada acontecia (viola regra 'sem botões sem funcionalidade')
- **Severidade / Prioridade:** Baixa / Média
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** E2E-12
- **Correção aplicada:** Planos removido; Tema virou seletor funcional Sistema/Claro/Escuro. src/routes/_authenticated/app.ajustes.tsx

### DEF-007

- **Descrição:** Ausência de exclusão da conta, troca de senha e gerenciamento de sessões (requisitos LGPD/edital).
- **Módulo:** Perfil e configurações
- **Passos para reprodução:**
  1. Procurar essas opções em Ajustes
- **Resultado esperado:** Funções disponíveis
- **Resultado obtido:** Inexistentes
- **Severidade / Prioridade:** Alta / Alta
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** IT-DEL-02, IT-CFG-03, IT-CFG-04, E2E-10, E2E-11
- **Correção aplicada:** Função de servidor deleteMyAccount, changePassword, signOutOtherSessions. src/functions/account.functions.ts, src/services/bloom.ts

### DEF-008

- **Descrição:** Era possível registrar um início de menstruação dentro de outra menstruação já registrada (sobreposição).
- **Módulo:** Regras de ciclo
- **Passos para reprodução:**
  1. Registrar menstruação de 01 a 05
  2. Registrar início em 03
- **Resultado esperado:** Erro de validação
- **Resultado obtido:** Registro aceito
- **Severidade / Prioridade:** Média / Média
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** UT-CYC-47, AT-04
- **Correção aplicada:** validateCycleEntry verifica sobreposição. src/domain/cycle.ts

### DEF-009

- **Descrição:** Avisos de ciclo atípico eram exibidos, mas o registro era gravado mesmo assim, sem chance de cancelar.
- **Módulo:** Registro diário
- **Passos para reprodução:**
  1. Registrar início 10 dias após o anterior
- **Resultado esperado:** Pedido de confirmação antes de gravar
- **Resultado obtido:** Gravava direto
- **Severidade / Prioridade:** Média / Média
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** AT-03
- **Correção aplicada:** Fluxo 'Confirmar mesmo assim'. src/components/bloom/DayLogSheet.tsx

### DEF-010

- **Descrição:** Mensagens técnicas do banco (ex.: 'violates row-level security policy') eram mostradas à usuária.
- **Módulo:** Tratamento de erros
- **Passos para reprodução:**
  1. Provocar erro do backend
- **Resultado esperado:** Mensagem compreensível, sem detalhes internos
- **Resultado obtido:** Texto técnico em inglês
- **Severidade / Prioridade:** Média / Média
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** IT-ERR-01, IT-ERR-02, IT-DB-02
- **Correção aplicada:** BloomServiceError + toServiceError. src/services/bloom.ts

### DEF-011

- **Descrição:** Função de servidor colocada em src/server/ quebrava o build (proteção de importação do TanStack Start).
- **Módulo:** Build / Arquitetura
- **Passos para reprodução:**
  1. npm run build
- **Resultado esperado:** Build concluído
- **Resultado obtido:** Import denied in client environment
- **Severidade / Prioridade:** Alta / Alta
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** vite build
- **Correção aplicada:** Movida para src/functions/account.functions.ts

### DEF-012

- **Descrição:** Defeito no script de teste: expressão regular de 'linguagem responsável' acusava falso positivo ('procurar' contém 'cura').
- **Módulo:** Testes (script)
- **Passos para reprodução:**
  1. npm run test:unit
- **Resultado esperado:** Teste aprovado com conteúdo correto
- **Resultado obtido:** UT-CNT-02 reprovado indevidamente
- **Severidade / Prioridade:** Baixa / Baixa
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** UT-CNT-02
- **Correção aplicada:** Regex com limites de palavra (\b). tests/unit/sound-messages-content.test.ts

### DEF-013

- **Descrição:** Ao trocar para a mesma senha, a mensagem amigável não aparecia (o Supabase responde 'should be different', não 'same').
- **Módulo:** Conta / Senha
- **Passos para reprodução:**
  1. Ajustes > Alterar senha
  2. Informar a senha atual como nova
- **Resultado esperado:** 'A nova senha precisa ser diferente da atual.'
- **Resultado obtido:** 'Não foi possível alterar a senha agora.'
- **Severidade / Prioridade:** Baixa / Média
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** IT-CFG-03
- **Correção aplicada:** Detecção por código same_password e texto. src/services/bloom.ts

### DEF-014

- **Descrição:** Tocar em 'Menstruação começou' antes do histórico carregar ignorava a validação de sobreposição e intervalo.
- **Módulo:** Registro diário
- **Passos para reprodução:**
  1. Abrir o app com conexão lenta
  2. Abrir o registro e tocar imediatamente em 'Menstruação começou'
- **Resultado esperado:** Ação indisponível até os dados carregarem
- **Resultado obtido:** Validação feita contra lista vazia
- **Severidade / Prioridade:** Média / Alta
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** AT-03, AT-04, AT-14
- **Correção aplicada:** Botões bloqueados enquanto useCycles carrega/falha. src/components/bloom/DayLogSheet.tsx

### DEF-015

- **Descrição:** Após concluir ou pular o onboarding, a usuária era mandada de volta ao onboarding (cache antigo das preferências).
- **Módulo:** Onboarding / Dashboard
- **Passos para reprodução:**
  1. Criar conta
  2. Tocar em 'Pular e ir para o app'
- **Resultado esperado:** Abrir o dashboard
- **Resultado obtido:** Volta para /onboarding
- **Severidade / Prioridade:** Alta / Alta
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** E2E-01 passo 2
- **Correção aplicada:** setQueryData com o resultado da gravação + guarda isFetching. src/hooks/useBloomData.ts, app.index.tsx

### DEF-016

- **Descrição:** Com a nuvem fora do ar, a tela ficava carregando por muito tempo (3 novas tentativas com espera crescente).
- **Módulo:** Tratamento de erros
- **Passos para reprodução:**
  1. Desconectar a rede
  2. Abrir Análise
- **Resultado esperado:** Estado de erro com 'Tentar novamente' em poucos segundos
- **Resultado obtido:** Carregamento prolongado
- **Severidade / Prioridade:** Média / Média
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** E2E-08
- **Correção aplicada:** React Query com 1 nova tentativa (800 ms). src/router.tsx

### DEF-017

- **Descrição:** 'Humor recente' na Home exibia registros com data futura.
- **Módulo:** Dashboard
- **Passos para reprodução:**
  1. Registrar humor em data futura
  2. Abrir a Home
- **Resultado esperado:** Somente os últimos 7 dias até hoje
- **Resultado obtido:** Datas futuras listadas
- **Severidade / Prioridade:** Baixa / Baixa
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** reports/screenshots/*/01-ciclo.png
- **Correção aplicada:** Filtro log_date <= hoje. src/routes/_authenticated/app.index.tsx

### DEF-018

- **Descrição:** Insight exibia texto incoerente 'Entre 29 e 29 dias (diferença de 0 dias)'.
- **Módulo:** Insights
- **Passos para reprodução:**
  1. Ter ciclos com a mesma duração
  2. Abrir Análise
- **Resultado esperado:** Frase natural
- **Resultado obtido:** Texto redundante
- **Severidade / Prioridade:** Baixa / Baixa
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** UT-INS-07
- **Correção aplicada:** Texto específico para variação zero. src/domain/insights.ts

### DEF-019

- **Descrição:** Teste E2E-01 (jornada de 12 etapas) excedia o limite de 60 s por teste quando executado em paralelo com outros testes.
- **Módulo:** Testes (configuração E2E)
- **Passos para reprodução:**
  1. npm run test:e2e com 3 workers
- **Resultado esperado:** Jornada aprovada também em execução paralela
- **Resultado obtido:** Timeout na etapa 11 (Exportar) — aprovada quando executada isoladamente
- **Severidade / Prioridade:** Baixa / Média
- **Status:** Corrigido
- **Responsável:** A preencher pela equipe
- **Evidências:** E2E-01
- **Correção aplicada:** test.setTimeout(120_000) apenas na jornada completa. tests/e2e/jornada-completa.spec.ts
