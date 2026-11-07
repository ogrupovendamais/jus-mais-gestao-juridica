import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { toZonedTime, fromZonedTime } from "date-fns-tz"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// O armazenamento de arquivos recusa acentos/ç e símbolos no caminho ("Invalid key").
// O nome original continua salvo na tabela documentos; só o caminho interno é simplificado.
export function nomeArquivoSeguro(nome: string) {
  const limpo = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return limpo || "arquivo";
}

// Timezone de São Paulo
const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte uma data para o timezone de São Paulo e retorna no formato YYYY-MM-DD
 * Evita problemas de timezone ao salvar datas no banco
 */
export function formatDateForDatabase(date: Date | string | undefined | null): string {
  if (!date) return '';
  try {
    if (typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '';
      const zonedDate = toZonedTime(dateObj, SAO_PAULO_TIMEZONE);
      return format(zonedDate, 'yyyy-MM-dd');
    }
    if (date instanceof Date) {
      if (isNaN(date.getTime())) return '';
      const zonedDate = toZonedTime(date, SAO_PAULO_TIMEZONE);
      return format(zonedDate, 'yyyy-MM-dd');
    }
    return '';
  } catch (e) {
    console.error('Error in formatDateForDatabase:', e);
    return '';
  }
}

/**
 * Converte uma string de data do banco para um objeto Date no timezone de São Paulo
 */
export function parseDateFromDatabase(dateString: string): Date {
  // Cria uma data assumindo que a string está no timezone de São Paulo
  const date = new Date(dateString + 'T00:00:00');
  return fromZonedTime(date, SAO_PAULO_TIMEZONE);
}

/**
 * Ajusta uma data selecionada no calendário para o timezone de São Paulo
 * Evita que a data "volte um dia" devido a diferenças de timezone
 */
export function adjustDateForTimezone(date: Date): Date {
  const zonedDate = toZonedTime(date, SAO_PAULO_TIMEZONE);
  // Retorna uma nova data com o mesmo dia, mês e ano no timezone local
  return new Date(zonedDate.getFullYear(), zonedDate.getMonth(), zonedDate.getDate());
}
