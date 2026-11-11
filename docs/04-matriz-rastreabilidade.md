# 04 — Matriz de rastreabilidade

Requisito → Caso de teste → Nível → Resultado → Evidência.
Resultados da execução de 11/11/2026 (ver [métricas](evidencias/metricas-execucao.md)). Evidências: `docs/evidencias/vitest-junit.xml` (UT/IT/AT), `docs/evidencias/e2e-junit.xml` (E2E), capturas em `docs/evidencias/screenshots`.

| Requisito | Casos de teste | Nível | Resultado | Evidência |
|---|---|---|---|---|
| RF-01 Criar conta | E2E-01 (passo 2), E2E-03, E2E-04 | Sistema | Aprovado | e2e-junit.xml |
| RF-02 Entrar/sair | E2E-01 (passos 3 e 12), E2E-02 | Sistema | Aprovado | e2e-junit.xml |
| RF-03 Rotas protegidas | E2E-05, E2E-01 (passo 12) | Sistema | Aprovado | e2e-junit.xml |
| RF-03 Sessão obrigatória para gravar | IT-AUTH-02 | Integração | Aprovado | vitest-junit.xml |
| RF-04 Situação, dia, fase, previsão | UT-CYC-01…18, UT-CYC-40, UT-CYC-41 | Unitário | Aprovado | vitest-junit.xml |
| RF-04 Modelo atualizado após registro | IT-HK-01, IT-HK-02 | Integração | Aprovado | vitest-junit.xml |
| RF-04/05 Dashboard renderizado | E2E-01 (passos 4–6), E2E-14 | Sistema | Aprovado | screenshots/*/01-ciclo.png |
| RF-05 Mensagem contextual | UT-MSG-01…05 | Unitário | Aprovado | vitest-junit.xml |
| RF-06 Registrar início/fim | AT-01, AT-05, E2E-01 (passo 5) | Aceitação/Sistema | Aprovado | vitest-junit.xml, e2e-junit.xml |
| RF-06 Validações de data | UT-CYC-30…34, UT-CYC-47…51, AT-02, AT-03, AT-04, AT-14 | Unitário/Aceitação | Aprovado | vitest-junit.xml |
| RF-07 Calendário e estimativas | UT-CYC-42…46, IT-CAL-01, IT-CAL-02, AT-11, E2E-01 (passo 7) | Unit./Integ./Aceit./Sistema | Aprovado | screenshots/*/02-calendario.png |
| RF-07 Mês e datas corretos (UTC-3) | UT-FMT-01…06 | Unitário | Aprovado | vitest-junit.xml |
| RF-08 Consultar/editar/excluir dia | AT-07, AT-11, AT-12, AT-13, E2E-01 (passo 9) | Aceitação/Sistema | Aprovado | vitest-junit.xml, e2e-junit.xml |
| RF-09 Registro diário completo | UT-MET-01…09, IT-DB-03, IT-DB-07, IT-DB-08, AT-06, AT-08, AT-09, E2E-01 (passo 6) | Todos | Aprovado | vitest-junit.xml |
| RF-10 Estatísticas e relatórios | UT-STA-01…18, IT-STA-01, E2E-01 (passo 8) | Unit./Integ./Sistema | Aprovado | screenshots/*/03-analise.png |
| RF-11 Histórico | IT-HIS-01, E2E-01 (passo 10) | Integração/Sistema | Aprovado | screenshots/*/04-historico.png |
| RF-12 Perfil e preferências | IT-AUTH-03, IT-CFG-01, IT-CFG-02, UT-VAL-06, UT-VAL-09, E2E-09 | Unit./Integ./Sistema | Aprovado | vitest-junit.xml |
| RF-12 Alterar senha | UT-VAL-08, IT-CFG-03, E2E-11 | Unit./Integ./Sistema | Aprovado | e2e-junit.xml |
| RF-13 Lembretes | UT-REM-01…11, UT-VAL-10 | Unitário | Aprovado | vitest-junit.xml |
| RF-14 Sons opcionais | UT-SND-01…04, AT-10, E2E-13 | Unit./Aceit./Sistema | Aprovado | vitest-junit.xml |
| RF-15 Aparência | UT-DEV-01…03, E2E-12 | Unitário/Sistema | Aprovado | e2e-junit.xml |
| RF-16 Exportação | UT-EXP-01…06, IT-EXP-01, IT-EXP-02, E2E-01 (passo 11) | Unit./Integ./Sistema | Aprovado | vitest-junit.xml |
| RF-17 Apagar registros / excluir conta | IT-DEL-01…03, E2E-10 | Integração/Sistema | Aprovado | vitest-junit.xml, e2e-junit.xml |
| RF-18 Sessões | IT-CFG-04 | Integração | Aprovado | vitest-junit.xml |
| RF-19 Insights | UT-INS-01…07 | Unitário | Aprovado | vitest-junit.xml |
| RF-20 Diário | IT-DB-09, E2E-06, E2E-14 | Integração/Sistema | Aprovado | screenshots/*/05-diario.png |
| RF-21 Conteúdo educativo | UT-CNT-01…03, E2E-14 | Unitário/Sistema | Aprovado | screenshots/*/07-conteudo.png |
| RNF-01 Isolamento (RLS) | IT-DB-01, IT-DB-02, IT-EXP-01, IT-DEL-01, E2E-06, E2E-07 | Integração/Sistema | Aprovado | vitest-junit.xml, e2e-junit.xml |
| RNF-02 Validação | UT-VAL-01…11, IT-DB-06 | Unitário/Integração | Aprovado | vitest-junit.xml |
| RNF-03 Tratamento de erros | IT-ERR-01…05, IT-HK-03, IT-HK-04, AT-09, E2E-08 | Integ./Aceit./Sistema | Aprovado | vitest-junit.xml |
| RNF-04 Fuso horário | UT-FMT-01…06, UT-CYC-30, UT-CYC-31 | Unitário | Aprovado | vitest-junit.xml |
| RNF-05 Responsividade | E2E-14, E2E-15 (desktop e mobile) | Sistema | Aprovado | screenshots/desktop, screenshots/mobile |
| RNF-07 Linguagem responsável | UT-INS-06, UT-CNT-02, UT-MSG-03, UT-MSG-05, UT-REM-06 | Unitário | Aprovado | vitest-junit.xml |
| RNF-08 Consentimento | E2E-03 | Sistema | Aprovado | e2e-junit.xml |
| RNF-10 Exportação segura | UT-EXP-01, UT-EXP-02, IT-EXP-02 | Unitário/Integração | Aprovado | vitest-junit.xml |

Requisitos validados apenas manualmente: RF-01 com Google/Apple (CT-M-02), entrega da notificação do sistema (CT-M-10), exclusão de conta no ambiente publicado (CT-M-12), RNF-06 acessibilidade com leitor de tela (CT-M-14). Ver [casos manuais](05-casos-de-teste.md).
