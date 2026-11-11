# Bloom — roadmap

## Concluído (transformação A3 2026b)
- [x] Auditoria do projeto e correção de defeitos (docs/01-auditoria.md, docs/defeitos/)
- [x] Nova identidade visual floral, modo escuro, animações com respeito a "reduzir movimento"
- [x] Navegação desktop (barra lateral) e mobile (barra inferior + Mais)
- [x] Dashboard, calendário, registro diário completo, análise, histórico, diário, humor, conteúdo, ajustes
- [x] Lembretes, sons opcionais, exportação JSON/CSV, exclusão de conta, troca de senha, sessões
- [x] Testes unitários, integração, aceitação e E2E + cobertura + CI

## Próximos passos
- [ ] Aplicar docs/database/proposta-migracao.sql no Lovable Cloud (conferir RLS e constraints)
- [ ] Executar os casos manuais CT-M-01…15 no ambiente publicado
- [ ] Notificações push com o app fechado (exige servidor de push)
- [ ] Migrar métricas (energia, sono, dores) para colunas próprias
