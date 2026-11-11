# 02 — Proposta do sistema e requisitos

## Proposta

O Bloom é um aplicativo web responsivo (desktop, tablet e smartphone) para registrar e compreender o ciclo menstrual, sintomas, humor e bem-estar, com dados na nuvem isolados por usuária. Entrega estimativas transparentes (nunca certezas), estatísticas descritivas (nunca diagnósticos) e controle total dos dados (exportar, corrigir, excluir).

## Requisitos funcionais

| ID | Requisito | Módulo |
|---|---|---|
| RF-01 | Criar conta (e-mail/senha com consentimento; Google/Apple) | Autenticação |
| RF-02 | Entrar, sair e recuperar senha | Autenticação |
| RF-03 | Bloquear telas internas sem sessão | Autenticação |
| RF-04 | Dashboard com situação do ciclo, dia, fase estimada, previsão e contagem regressiva | Dashboard |
| RF-05 | Dashboard com resumo de registros, humor recente, sintomas frequentes, atalhos, semana e mensagem contextual | Dashboard |
| RF-06 | Registrar início e fim da menstruação com validação (datas futuras, sobreposição, intervalos atípicos com confirmação) | Calendário/Registro |
| RF-07 | Calendário mensal navegável, com legenda, diferenciando registrado × estimado, janela fértil e ovulação estimadas | Calendário |
| RF-08 | Consultar, editar e excluir os registros de um dia | Calendário |
| RF-09 | Registro diário: humor, cólicas, dores, energia, sono, fluxo, sintomas físicos e emocionais, observações | Registro |
| RF-10 | Estatísticas: duração média e variação dos ciclos, duração da menstruação, irregularidades, frequência de sintomas, evolução do humor, comparação entre ciclos, relatórios por período | Análise |
| RF-11 | Histórico com filtro por período, consulta de ciclos, edição, exclusão e exportação | Histórico |
| RF-12 | Perfil: nome, senha, padrão do ciclo, preferências | Ajustes |
| RF-13 | Notificações e lembretes opcionais configuráveis (diário, previsão, sintomas, personalizados) | Lembretes |
| RF-14 | Sons opcionais, desligados por padrão, com volume | Ajustes |
| RF-15 | Aparência: tema claro/escuro/sistema e redução de movimento | Ajustes |
| RF-16 | Exportar todos os dados (JSON e CSV) | Privacidade |
| RF-17 | Apagar todos os registros e excluir a conta | Privacidade |
| RF-18 | Gerenciar sessões (encerrar outros aparelhos / todos) | Ajustes |
| RF-19 | Insights pessoais descritivos com base informada | Insights |
| RF-20 | Diário pessoal organizado por data e dia do ciclo | Diário |
| RF-21 | Central de informações educativas | Conteúdo |

## Requisitos de qualidade (não funcionais)

| ID | Requisito |
|---|---|
| RNF-01 | Isolamento dos dados por usuária (RLS) |
| RNF-02 | Validação de dados no frontend e antes do envio ao backend |
| RNF-03 | Tratamento de erros com mensagens compreensíveis, sem detalhes internos, preservando o formulário |
| RNF-04 | Datas corretas em qualquer fuso (em especial UTC-3) |
| RNF-05 | Responsividade: navegação própria no desktop (barra lateral) e no celular (barra inferior), sem rolagem horizontal |
| RNF-06 | Acessibilidade: rótulos, papéis ARIA, foco visível, respeito a "reduzir movimento" |
| RNF-07 | Linguagem responsável: estimativas como estimativas; sem diagnóstico; aviso de que não é contraceptivo |
| RNF-08 | Minimização e transparência (LGPD), consentimento no cadastro |
| RNF-09 | Testabilidade: regras em funções puras, serviços com interface substituível |
| RNF-10 | Exportação segura (gerada no aparelho, CSV protegido contra injeção de fórmulas) |

## Limitações técnicas documentadas

| ID | Limitação | Solução adotada |
|---|---|---|
| LIM-01 | O schema não tem colunas para energia, sono, cólicas e dores, e migrações não podem ser aplicadas a partir do repositório | Métricas codificadas de forma reversível em `daily_logs.symptoms` (`m:energy:4`, `e:anxiety`) e validadas em `src/domain/metrics.ts`; migração futura proposta em `database/proposta-migracao.sql` |
| LIM-02 | Políticas RLS não visíveis no repositório | RLS emulada e testada no backend em memória; script idempotente para conferir/aplicar |
| LIM-03 | Sem servidor de push, lembretes só disparam com o app aberto (inclusive em segundo plano) | Avisado na interface; lógica de agendamento pura e testada (`reminders.ts`) |
| LIM-04 | Um registro diário e um de humor por dia (chave única do banco) | Edição posterior sempre disponível; anotações livres no diário |
| LIM-05 | O backend real (Lovable Cloud) não é acessível pela rede do ambiente de testes | Integração e E2E rodam contra um backend simulado fiel (PostgREST/Auth + RLS); roteiro manual para validar no ambiente real |
| LIM-06 | Exclusão de conta depende da variável `SUPABASE_SERVICE_ROLE_KEY` no servidor do Lovable Cloud | Função de servidor pronta; validar manualmente no ambiente publicado (caso CT-M-12) |
