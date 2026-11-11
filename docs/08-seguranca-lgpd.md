# 08 — Segurança, privacidade e LGPD

Dados menstruais, emocionais e de saúde são **dados pessoais sensíveis** (LGPD, art. 5º, II). As medidas abaixo estão implementadas e, quando indicado, verificadas por testes.

| Medida | Implementação | Verificação |
|---|---|---|
| Autenticação | Supabase Auth (senha ≥ 8, OAuth Google/Apple); rotas internas exigem `getUser()` | E2E-02, E2E-05 |
| Isolamento por usuária | RLS no Postgres (script de conferência em `database/proposta-migracao.sql`); serviços nunca enviam `user_id` de terceiros | IT-DB-01, IT-DB-02, E2E-06, E2E-07 |
| Validação dupla | Zod no formulário e na camada de serviços; constraints propostas no banco | UT-VAL-*, IT-DB-06 |
| Erros sem vazamento | `BloomServiceError` traduz erros; detalhes internos não chegam à tela | IT-ERR-02, IT-DB-02 |
| Chave de serviço protegida | Usada só em função de servidor (`src/functions/account.functions.ts`); o id excluído vem do token validado, nunca do corpo | Revisão de código; proteção de importação do build (DEF-011) |
| Sessões | Renovação automática; encerrar outros aparelhos ou todos | IT-CFG-04 |
| Exclusão efetiva | Apagar registros (mantém conta) e excluir conta (dados + usuário no Auth) com confirmação digitada | IT-DEL-01…03, E2E-10 |
| Portabilidade | Exportação JSON completa e CSV, geradas no aparelho | IT-EXP-01, E2E-01 |
| Exportação segura | CSV com proteção contra injeção de fórmulas | UT-EXP-01 |
| Consentimento e transparência | Caixa de consentimento obrigatória no cadastro; seção "Como tratamos seus dados" em Ajustes | E2E-03 |
| Minimização | Só e-mail, nome opcional, preferências e o que a usuária registrar; sem analytics ou publicidade | Revisão de código |
| Privacidade no uso | Modo discreto esconde números e fases da tela inicial | E2E-12 |
| Dados de teste | Somente fictícios, banco isolado por teste; nenhum teste toca o backend real | `tests/fixtures/factories.ts` |

## Responsabilidade técnica e ética

- O app não é apresentado como contraceptivo nem diagnóstico (avisos na Home, calendário, conteúdo, previsões; testes UT-MSG-05, UT-CNT-02).
- Insights são descritivos, informam a base de dados e passam por teste de linguagem proibida (UT-INS-06).
- Conteúdo educativo orienta a procurar profissional e cita o CVV (188) no artigo sobre humor.

## Pontos a verificar no ambiente real

1. Rodar as consultas de verificação de `database/proposta-migracao.sql` (CT-M-15).
2. Confirmar que `SUPABASE_SERVICE_ROLE_KEY` está configurada no Lovable Cloud para a exclusão de conta (CT-M-12).
3. Avaliar política de retenção de backups do provedor para completar a exclusão definitiva.
