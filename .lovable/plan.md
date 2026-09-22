# Redesign monocromático do Bloom

## Objetivo
Reformular as quatro áreas principais usando as referências enviadas: interface branca e preta, títulos em rosa neon, navegação inferior compacta e uso exclusivo de DM Sans.

## O que será alterado
- **Navegação:** barra inferior em formato cápsula, com ícones e aba ativa branca/preta, mantendo Home, Calendário, Humor e Ajustes.
- **Home:** remover saudação, data e sino; condensar ciclo, semana e resumo em uma única tela sem rolagem; adicionar botão central de inclusão rápida que abre o registro completo do dia.
- **Registro rápido:** reorganizar o painel para fluxo, sintomas, humor, intensidade e notas em controles compactos, arredondados e acessíveis.
- **Calendário:** aproximar a composição da terceira referência, com mês em destaque, faixa semanal, resumo do ciclo e agenda do dia; preservar navegação mensal, estimativas e acesso aos registros.
- **Humor:** remover gráfico e histórico; manter apenas as opções de humor, intensidade e observação em uma experiência curta e arredondada.
- **Ajustes:** reorganizar como a quarta referência, com cabeçalho de perfil e grupos claros para dados pessoais, ciclo, preferências, privacidade e conta.
- **Visual:** substituir a paleta atual por branco, preto e cinzas neutros, usando rosa neon somente em títulos e estados importantes.

## Acessibilidade e qualidade
- Manter alvos de toque de pelo menos 44 px, nomes acessíveis em botões de ícone, foco visível e contraste alto.
- Preservar autenticação, sincronização, previsões, exportação e exclusão de dados existentes.
- Validar em tela móvel, conferir ausência de sobreposição e executar os testes existentes.

## Detalhes técnicos
- Atualizar tokens globais, layout autenticado e os componentes/telas envolvidos, sem alterar o banco de dados.
- A Home usará altura dinâmica disponível e `overflow-hidden`; o painel de registro continuará rolável quando o conteúdo exceder a tela.
