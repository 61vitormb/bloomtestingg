# 09 — Estrutura do artigo científico (8–12 páginas, modelo SBC)

> Modelo para preencher. Campos entre colchetes são da equipe. Dados de resultados já vêm da execução real — mantenha-os sincronizados com `docs/evidencias/metricas-execucao.md` se re-executar.
> Template oficial SBC: https://www.sbc.org.br/documentos-da-sbc/summary/169-templates-para-artigos-e-capitulos-de-livros/878-modelosparapublicaodeartigos

## Título (sugestão)

**Garantia de qualidade em um aplicativo de saúde menstrual: estratégia de testes em quatro níveis para o Bloom**

Autores: [Nome 1], [Nome 2], [Nome 3], [Nome 4] — [Curso], [UNISUL], [e-mails]

## Resumo (≈ 150 palavras) — rascunho

Aplicativos de acompanhamento menstrual tratam dados pessoais sensíveis e oferecem estimativas que influenciam decisões das usuárias, o que exige rigor em correção e privacidade. Este trabalho apresenta a estratégia de garantia de qualidade aplicada ao Bloom, aplicação web de acompanhamento do ciclo, sintomas e humor, construída com React/TanStack Start e Supabase. Foram implementados testes automatizados em quatro níveis — unidade, integração, aceitação e sistema — com Vitest e Playwright, apoiados por um backend simulado com controle de acesso por linha. A suíte final contém 231 casos (151 unitários, 34 de integração, 14 de aceitação e 32 execuções E2E em desktop e mobile), todos aprovados, com 86,08% de cobertura de linhas nas camadas de regra de negócio. O processo registrou 19 defeitos, entre eles erros de fuso horário, falhas de validação por condição de corrida e um redirecionamento indevido após o cadastro, todos corrigidos. [Ajustar.]

**Abstract:** [tradução]

**Palavras-chave:** testes de software; garantia de qualidade; Playwright; Vitest; saúde digital; LGPD.

## 1. Introdução

- Contexto: femtech, uso de apps menstruais, sensibilidade dos dados [referências].
- Problema: como garantir correção das estimativas e proteção dos dados num app real?
- Objetivo e contribuições: (i) arquitetura testável; (ii) suíte em quatro níveis; (iii) backend simulado com RLS para testes determinísticos; (iv) gestão de defeitos e métricas.
- Organização do artigo.

## 2. Fundamentação teórica

- Qualidade de software: ISO/IEC 25010 (adequação funcional, confiabilidade, segurança, usabilidade).
- Níveis de teste e pirâmide de testes [Cohn 2009; ISTQB].
- Técnicas: particionamento de equivalência, valores-limite, testes negativos, regressão, injeção de falhas.
- Testes E2E e dublês de teste (stubs/fakes) [Meszaros 2007].
- LGPD e dados sensíveis de saúde [Lei 13.709/2018].
- Trabalhos relacionados: estudos sobre privacidade de apps menstruais [referências a pesquisar].

## 3. O sistema Bloom

- Funcionalidades (tabela de `docs/02-requisitos.md`).
- Arquitetura: domínio puro → serviços → hooks → telas; função de servidor para exclusão de conta. [Inserir diagrama.]
- Capturas: `docs/evidencias/screenshots/desktop/01-ciclo.png`, `.../mobile/09-registro.png`.

## 4. Metodologia e estratégia de testes

- Plano (resumo de `docs/03-plano-de-testes.md`); escolha e justificativa das ferramentas.
- Backend em memória com RLS: mesmo núcleo para integração (adaptador do cliente) e E2E (interceptação HTTP).
- Dados fictícios, fuso fixo (America/Sao_Paulo), dois perfis de dispositivo.
- Rastreabilidade requisito → caso → nível (tabela resumida de `docs/04-matriz-rastreabilidade.md`).
- CI no GitHub Actions.

## 5. Resultados e discussão

**Tabela 1 — Execução final (11/11/2026)**

| Nível | Casos | Aprovados | Aprovação |
|---|---:|---:|---:|
| Unitário | 151 | 151 | 100% |
| Integração | 34 | 34 | 100% |
| Aceitação | 14 | 14 | 100% |
| Sistema (E2E, 16 cenários × 2 dispositivos) | 32 | 32 | 100% |
| Total | 231 | 231 | 100% |

**Tabela 2 — Cobertura (V8):** linhas 86,08%; ramos 82,78%; funções 85,93%; domínio 97,21% de linhas.

**Tabela 3 — Defeitos por origem:** auditoria 9; revisão de regras 1; build 1; testes automatizados e revisão de evidências 8 (unidade 1, integração 1, aceitação 1, E2E 3, revisão visual 2). Severidade: [contar em `defeitos.json`].

Discussão sugerida:
- Cada nível encontrou defeitos que os outros não encontrariam (ex.: DEF-014 só aparece com o componente real e dados assíncronos; DEF-015 só na navegação completa).
- O fuso horário (DEF-001/002/003) mostra o valor de fixar o ambiente de teste no fuso real das usuárias.
- Limitações: backend simulado (LIM-05), casos manuais pendentes no ambiente publicado, cobertura não inclui telas.

## 6. Aspectos éticos e responsabilidade técnica

Resumo de `docs/08-seguranca-lgpd.md`: dados sensíveis, consentimento, minimização, exclusão efetiva, linguagem não diagnóstica, uso de dados fictícios nos testes, uso de IA no desenvolvimento [declarar conforme regras da disciplina].

## 7. Conclusão

[Síntese, contribuições, trabalhos futuros: push notifications, migração das métricas para colunas próprias, testes de acessibilidade automatizados, testes de carga.]

## 8. Referências (sugestões a conferir e formatar)

- BRASIL. Lei nº 13.709, de 14 de agosto de 2018 (LGPD).
- ISO/IEC 25010:2023 — Systems and software Quality Requirements and Evaluation (SQuaRE).
- ISTQB. Certified Tester Foundation Level Syllabus, v4.0, 2023.
- MYERS, G.; SANDLER, C.; BADGETT, T. The Art of Software Testing. 3. ed. Wiley, 2011.
- MESZAROS, G. xUnit Test Patterns. Addison-Wesley, 2007.
- COHN, M. Succeeding with Agile. Addison-Wesley, 2009.
- Documentação: Vitest (vitest.dev), Playwright (playwright.dev), Supabase Row Level Security (supabase.com/docs).
