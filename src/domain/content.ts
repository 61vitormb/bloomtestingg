/**
 * Central de informações — conteúdo educativo geral, escrito em linguagem acessível.
 * Não é aconselhamento médico individual. Cada artigo termina com orientação para
 * procurar profissional de saúde quando houver dúvida ou preocupação.
 */

export type ContentCategory = "fases" | "sintomas" | "saude" | "bloom";

export interface Article {
  id: string;
  category: ContentCategory;
  title: string;
  summary: string;
  readingMinutes: number;
  sections: { heading: string; body: string }[];
}

export const CONTENT_CATEGORIES: { value: ContentCategory; label: string }[] = [
  { value: "fases", label: "Fases do ciclo" },
  { value: "sintomas", label: "Sintomas" },
  { value: "saude", label: "Saúde menstrual" },
  { value: "bloom", label: "Usando o Bloom" },
];

export const CONTENT_DISCLAIMER =
  "Conteúdo educativo e geral. Não substitui consulta, diagnóstico ou tratamento por profissional de saúde.";

export const ARTICLES: Article[] = [
  {
    id: "fases-do-ciclo",
    category: "fases",
    title: "As quatro fases do ciclo menstrual",
    summary: "Menstrual, folicular, ovulatória e lútea: o que costuma acontecer em cada uma.",
    readingMinutes: 4,
    sections: [
      {
        heading: "Fase menstrual",
        body: "Começa no primeiro dia de sangramento, que é contado como o dia 1 do ciclo. O revestimento interno do útero (endométrio) é eliminado. Costuma durar de 2 a 7 dias.",
      },
      {
        heading: "Fase folicular",
        body: "Também começa no dia 1 e vai até a ovulação. O hormônio FSH estimula folículos nos ovários e o estrogênio sobe aos poucos, fazendo o endométrio voltar a crescer. É a fase cuja duração mais varia de pessoa para pessoa.",
      },
      {
        heading: "Fase ovulatória",
        body: "Um pico do hormônio LH leva à liberação de um óvulo. Em ciclos de 28 dias isso costuma acontecer perto do dia 14, mas o momento varia — inclusive entre ciclos da mesma pessoa. Por isso o Bloom sempre chama essa janela de estimativa.",
      },
      {
        heading: "Fase lútea",
        body: "Vai da ovulação até a próxima menstruação e tende a ser mais estável, em torno de 12 a 14 dias. A progesterona predomina. Algumas pessoas notam inchaço, sensibilidade nos seios ou mudanças de humor nesses dias.",
      },
    ],
  },
  {
    id: "ciclo-regular",
    category: "fases",
    title: "O que é um ciclo “regular”?",
    summary:
      "Faixas de referência, variação entre ciclos e por que médias não contam a história toda.",
    readingMinutes: 3,
    sections: [
      {
        heading: "Faixa de referência",
        body: "Para adultas, ciclos entre 21 e 35 dias costumam ser considerados dentro da faixa esperada. Na adolescência e perto da menopausa, ciclos mais variáveis são comuns.",
      },
      {
        heading: "Variação é normal",
        body: "Pequenas diferenças de um ciclo para outro são esperadas. Estresse, viagens, mudanças de rotina, sono e alguns medicamentos podem alterar o ciclo.",
      },
      {
        heading: "Quando vale conversar com um profissional",
        body: "Se seus ciclos mudam muito de repente, ficam frequentemente fora da faixa de referência ou a menstruação para por mais de três meses sem gestação, vale buscar avaliação.",
      },
    ],
  },
  {
    id: "colicas",
    category: "sintomas",
    title: "Cólicas menstruais",
    summary: "Por que acontecem, medidas de conforto conhecidas e sinais de alerta.",
    readingMinutes: 3,
    sections: [
      {
        heading: "Por que acontecem",
        body: "Substâncias chamadas prostaglandinas fazem o útero se contrair para eliminar o endométrio. Em muitas pessoas isso causa dor no baixo ventre, às vezes irradiando para costas e coxas, principalmente nos primeiros dias.",
      },
      {
        heading: "Medidas de conforto",
        body: "Calor local, movimento leve e descanso ajudam muita gente. Analgésicos e anti-inflamatórios devem ser usados conforme orientação de profissional de saúde.",
      },
      {
        heading: "Sinais de alerta",
        body: "Dor que impede atividades do dia a dia, que piora a cada ciclo ou que vem acompanhada de febre merece avaliação profissional.",
      },
    ],
  },
  {
    id: "humor-e-ciclo",
    category: "sintomas",
    title: "Humor, energia e o ciclo",
    summary: "Como as mudanças hormonais podem se relacionar a humor, sono e disposição.",
    readingMinutes: 3,
    sections: [
      {
        heading: "Cada pessoa é única",
        body: "Algumas pessoas percebem mudanças de humor, energia ou sono em certas fases; outras não percebem diferença. Registrar ajuda você a enxergar o seu próprio padrão — sem comparação com ninguém.",
      },
      {
        heading: "Sintomas pré-menstruais",
        body: "Irritabilidade, sensibilidade, cansaço e inchaço nos dias que antecedem a menstruação são relatados com frequência e costumam melhorar quando o sangramento começa.",
      },
      {
        heading: "Quando procurar ajuda",
        body: "Se mudanças de humor interferem no trabalho, nos estudos ou nas relações, ou se você tiver pensamentos de se machucar, procure um profissional de saúde. No Brasil, o CVV atende 24h pelo telefone 188.",
      },
    ],
  },
  {
    id: "fluxo",
    category: "saude",
    title: "Observando o fluxo menstrual",
    summary: "Volume, duração e quando um sangramento intenso merece atenção.",
    readingMinutes: 2,
    sections: [
      {
        heading: "Como registrar",
        body: "No Bloom, o fluxo é descrito como leve, moderado ou intenso. Não existe uma medida exata — o importante é ser consistente na sua própria percepção.",
      },
      {
        heading: "Sinais de atenção",
        body: "Precisar trocar absorvente ou coletor a cada uma ou duas horas por várias horas seguidas, sangramento por mais de 7 dias, coágulos grandes frequentes ou tontura e cansaço intensos são motivos para procurar avaliação.",
      },
    ],
  },
  {
    id: "quando-procurar",
    category: "saude",
    title: "Quando procurar atendimento",
    summary: "Uma lista de situações que merecem avaliação profissional.",
    readingMinutes: 2,
    sections: [
      {
        heading: "Procure atendimento se",
        body: "A menstruação não vem há mais de 90 dias sem gestação; há sangramento entre menstruações ou após relações; a dor é intensa e piora com o tempo; o sangramento é muito intenso; ou você notou qualquer mudança que te preocupa.",
      },
      {
        heading: "Procure atendimento de urgência se",
        body: "Houver sangramento muito intenso com tontura ou desmaio, dor abdominal súbita e forte ou febre alta junto com dor pélvica.",
      },
    ],
  },
  {
    id: "previsoes",
    category: "bloom",
    title: "Como o Bloom calcula as previsões",
    summary: "Médias dos seus ciclos, nível de confiança e por que não é contraceptivo.",
    readingMinutes: 3,
    sections: [
      {
        heading: "A conta",
        body: "A próxima menstruação é estimada somando a duração média dos seus últimos ciclos (até 6) ao início da última menstruação. Sem ciclos completos, o Bloom usa o valor que você informou ou 28 dias como referência.",
      },
      {
        heading: "Janela fértil",
        body: "A ovulação é estimada cerca de 14 dias antes da próxima menstruação prevista, e a janela fértil inclui alguns dias antes e um depois. Isso é estatística, não medição.",
      },
      {
        heading: "Não é contraceptivo",
        body: "O Bloom não mede hormônios nem temperatura e não deve ser usado para evitar ou planejar gravidez. Converse com um profissional sobre métodos adequados para você.",
      },
    ],
  },
  {
    id: "privacidade",
    category: "bloom",
    title: "Seus dados no Bloom",
    summary: "O que coletamos, onde fica e como exportar ou apagar tudo.",
    readingMinutes: 2,
    sections: [
      {
        heading: "Coleta mínima",
        body: "O Bloom guarda apenas e-mail, nome (opcional), preferências e os registros que você decide fazer. Nada é obrigatório e não há rastreamento publicitário.",
      },
      {
        heading: "Isolamento",
        body: "Os registros ficam na nuvem com políticas de acesso por usuária: cada conta só consegue ler e alterar os próprios dados.",
      },
      {
        heading: "Seus direitos (LGPD)",
        body: "Em Ajustes você pode exportar tudo (JSON ou CSV), apagar todos os registros ou excluir a conta definitivamente.",
      },
    ],
  },
];

export function articlesByCategory(category: ContentCategory | "all"): Article[] {
  return category === "all" ? ARTICLES : ARTICLES.filter((a) => a.category === category);
}

export function findArticle(id: string): Article | undefined {
  return ARTICLES.find((a) => a.id === id);
}
