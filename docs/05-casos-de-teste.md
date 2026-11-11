# 05 — Casos de teste

## A. Cenários de aceitação automatizados (Dado / Quando / Então)

Arquivo: `tests/acceptance/registro-diario.test.tsx`. Os componentes reais são renderizados; apenas a nuvem é simulada.

| ID | Dado | Quando | Então (critérios de aceitação objetivos) |
|---|---|---|---|
| AT-01 | Usuária autenticada sem ciclos | toca em "Menstruação começou" hoje | CA1: existe 1 ciclo com início = hoje e fim vazio; CA2: o botão vira "Remover início deste dia" |
| AT-02 | Registro aberto para daqui a 3 dias | — | aviso "Este dia ainda não chegou" e nenhum botão de início |
| AT-03 | Ciclo iniciado há 10 dias | registra novo início hoje | aparece "Confirme se é um novo ciclo"; nada é gravado até "Confirmar mesmo assim"; depois, 2 ciclos |
| AT-04 | Menstruação de −3 a +1 dia | tenta início em −1 | mensagem "Essa data está dentro de uma menstruação já registrada."; continua 1 ciclo |
| AT-05 | Ciclo aberto há 4 dias | toca em "Menstruação terminou" hoje | fim do ciclo = hoje |
| AT-06 | Registro de hoje vazio | marca fluxo, humor, cólicas, energia, sintoma físico e emocional, sono e diário e salva | todas as categorias gravadas exatamente; a folha fecha só após a confirmação |
| AT-07 | Registro existente | abre o dia | campos pré-marcados; após alterar e salvar, há 1 registro com os novos valores |
| AT-08 | — | marca algo e cancela | nada gravado |
| AT-09 | Nuvem falha na gravação | salva | folha continua aberta com os dados preenchidos |
| AT-10 | Configuração padrão | salva um registro | nenhum `AudioContext` criado (sons desligados) |
| AT-11 | Ciclo registrado há 28 dias | consulta o dia de início e o dia previsto | "Menstruação registrada" no primeiro; "Menstruação estimada" (e não registrada) no segundo |
| AT-12 | Registros em 2 dias | exclui o dia de hoje e confirma | só o registro de ontem permanece |
| AT-13 | Registro hoje | exclui e cancela a confirmação | registro mantido |
| AT-14 | Histórico ainda indisponível | toca em "Menstruação começou" | botão desabilitado; nada gravado (regressão DEF-014) |

## B. Cenários de sistema automatizados (E2E)

| ID | Cenário | Dispositivos |
|---|---|---|
| E2E-01 | Jornada completa de 12 passos (acessar → criar conta → login → dashboard → registrar menstruação → sintomas/humor → calendário → estatísticas → editar → histórico → exportar → logout) | desktop, mobile |
| E2E-02 | Senha incorreta | desktop, mobile |
| E2E-03 | Validações do cadastro (e-mail, senha, consentimento) | desktop, mobile |
| E2E-04 | E-mail já cadastrado | desktop, mobile |
| E2E-05 | Rotas protegidas sem sessão | desktop, mobile |
| E2E-06 | Isolamento: uma usuária não vê dados de outra | desktop, mobile |
| E2E-07 | Requisição forjada com `user_id` alheio → 403/42501 | desktop, mobile |
| E2E-08 | Nuvem indisponível → estado de erro → recuperação | desktop, mobile |
| E2E-09 | Preferência de ciclo inválida não é salva | desktop, mobile |
| E2E-10 | Exclusão de conta exige "EXCLUIR"; apagar registros | desktop, mobile |
| E2E-11 | Troca de senha com confirmação | desktop, mobile |
| E2E-12 | Tema escuro e modo discreto persistem | desktop, mobile |
| E2E-13 | Sons desligados por padrão | desktop, mobile |
| E2E-14 | Todas as telas sem rolagem horizontal + navegação adequada + capturas | desktop, mobile |
| E2E-15 | Folha de registro lateral (desktop) / inferior (mobile) | desktop, mobile |
| E2E-16 | Telas públicas | desktop, mobile |

## C. Casos de teste manuais (para o ambiente publicado)

Preencha "Resultado", "Executado por" e "Data" ao executar. Use apenas contas de teste.

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Resultado | Executado por | Data |
|---|---|---|---|---|---|---|---|
| CT-M-01 | RF-01 | Nenhuma | Criar conta com e-mail de teste em https://bloomtestingg.lovable.app | Conta criada; onboarding exibido | | | |
| CT-M-02 | RF-01 | Conta Google de teste | "Continuar com Google" | Entra no app | | | |
| CT-M-03 | RF-02 | Conta criada | Esqueci minha senha → abrir e-mail → nova senha | Login com a nova senha funciona | | | |
| CT-M-04 | RF-06 | Logada | Registrar início hoje e fim amanhã | Calendário mostra os 2 dias em vermelho sólido | | | |
| CT-M-05 | RF-09 | Logada | Registrar todas as categorias do dia | Dados reaparecem após recarregar a página | | | |
| CT-M-06 | RNF-01 | 2 contas de teste | Registrar com a conta A; entrar com B | B não vê nada de A | | | |
| CT-M-07 | RF-16 | Com registros | Exportar JSON e CSV | Arquivos abrem; CSV com acentos corretos no Excel | | | |
| CT-M-08 | RNF-05 | — | Abrir no celular, tablet e desktop | Navegação adequada; sem rolagem horizontal | | | |
| CT-M-09 | RF-15 | — | Ativar "reduzir movimento" no sistema operacional | Animações desligadas | | | |
| CT-M-10 | RF-13 | Notificações permitidas | Lembrete personalizado para daqui a 2 min com o app em segundo plano | Notificação do sistema aparece | | | |
| CT-M-11 | RF-14 | — | Ligar sons, ajustar volume, salvar registro | Som curto no volume escolhido; nada toca ao abrir o app | | | |
| CT-M-12 | RF-17 | Conta descartável | Ajustes → Excluir minha conta → "EXCLUIR" | Volta à tela inicial; login com a conta falha | | | |
| CT-M-13 | RF-18 | Logada em 2 navegadores | "Encerrar sessões nos outros aparelhos" | O outro navegador perde a sessão ao recarregar | | | |
| CT-M-14 | RNF-06 | Leitor de tela (NVDA/VoiceOver) | Navegar pelo registro diário | Todos os controles têm nome e estado anunciados | | | |
| CT-M-15 | Banco | Acesso ao SQL do projeto | Rodar as consultas de verificação de `database/proposta-migracao.sql` | RLS ativo e políticas por usuária nas 5 tabelas | | | |
