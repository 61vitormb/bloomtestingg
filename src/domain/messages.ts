/**
 * Mensagens contextuais e acolhedoras da tela inicial.
 * Linguagem descritiva: nunca afirma o que a usuária "vai sentir" nem dá conselho médico.
 */
import type { CycleOverview } from "./cycle";

export interface ContextMessage {
  title: string;
  body: string;
}

export function contextualMessage(overview: CycleOverview, loggedToday: boolean): ContextMessage {
  if (overview.lastPeriodStart === null) {
    return {
      title: "Vamos começar pelo seu ciclo",
      body: "Registre o primeiro dia da sua última menstruação para ver estimativas personalizadas.",
    };
  }
  const days = overview.daysUntilNextPeriod;
  if (overview.phase === "menstrual") {
    return {
      title: "Cuide-se no seu ritmo",
      body: loggedToday
        ? "Seu registro de hoje já está salvo. Descanso e água costumam ajudar muita gente nesses dias."
        : "Registrar fluxo e sintomas hoje ajuda a comparar com seus próximos ciclos.",
    };
  }
  if (days !== null && days < 0) {
    return {
      title: `Previsão passou há ${Math.abs(days)} ${Math.abs(days) === 1 ? "dia" : "dias"}`,
      body: "Ciclos variam e atrasos acontecem. Se sua menstruação já começou, registre o início para atualizar as estimativas.",
    };
  }
  if (days !== null && days <= 3) {
    return {
      title: "Sua menstruação pode estar chegando",
      body: "É uma estimativa baseada nos seus registros, não uma certeza.",
    };
  }
  if (overview.phase === "ovulatory") {
    return {
      title: "Janela fértil estimada",
      body: "Estimativa calculada pelo seu histórico. O Bloom não é um método contraceptivo.",
    };
  }
  return {
    title: loggedToday ? "Registro do dia feito" : "Como você está hoje?",
    body: loggedToday
      ? "Cada registro deixa seus relatórios mais completos."
      : "Um toque para registrar humor, energia e sintomas.",
  };
}
