import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseISODate, toISODate } from "@/domain/cycle";

export function todayISO(): string {
  const now = new Date();
  return toISODate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function formatLong(iso: string): string {
  return format(parseISODate(iso), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatShort(iso: string): string {
  return format(parseISODate(iso), "d 'de' MMM", { locale: ptBR });
}

export function formatWeekdayLong(iso: string): string {
  return format(parseISODate(iso), "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function formatMonthYear(year: number, month: number): string {
  return format(new Date(Date.UTC(year, month, 1)), "MMMM 'de' yyyy", { locale: ptBR });
}

export function greetingForNow(name?: string | null): string {
  const hour = new Date().getHours();
  const base = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return name ? `${base}, ${name}` : base;
}

export function relativeDaysLabel(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  if (days > 1) return `em ${days} dias`;
  return `há ${Math.abs(days)} dias`;
}
