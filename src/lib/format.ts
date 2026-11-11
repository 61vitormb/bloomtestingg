import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toISODate } from "@/domain/cycle";

/**
 * Formatação de datas para exibição.
 * DEF-001/DEF-002: as datas ISO são convertidas para um Date *local* (y, m, d)
 * antes de formatar. Antes, um Date em meia-noite UTC era formatado no fuso local,
 * o que exibia o dia (e o mês) anterior em fusos negativos como o do Brasil.
 */
export function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function formatLong(iso: string): string {
  return format(isoToLocalDate(iso), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatShort(iso: string): string {
  return format(isoToLocalDate(iso), "d 'de' MMM", { locale: ptBR });
}

export function formatDayMonth(iso: string): string {
  return format(isoToLocalDate(iso), "dd/MM", { locale: ptBR });
}

export function formatWeekdayLong(iso: string): string {
  return format(isoToLocalDate(iso), "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function formatWeekdayShort(iso: string): string {
  return format(isoToLocalDate(iso), "EEEEEE", { locale: ptBR });
}

export function formatMonthYear(year: number, month: number): string {
  return format(new Date(year, month, 1, 12), "MMMM 'de' yyyy", { locale: ptBR });
}

export function formatMonthShort(iso: string): string {
  return format(isoToLocalDate(iso), "MMM/yy", { locale: ptBR });
}

export function greetingForNow(name?: string | null, now: Date = new Date()): string {
  const hour = now.getHours();
  const base =
    hour < 5 ? "Boa noite" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return name ? `${base}, ${name}` : base;
}

export function relativeDaysLabel(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  if (days > 1) return `em ${days} dias`;
  return `há ${Math.abs(days)} dias`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
