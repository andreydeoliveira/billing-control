import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

/**
 * Parser para campos de data que aceita formato brasileiro (DD/MM/YYYY)
 * Converte entrada manual do usuário para objeto Date
 */
export function parseBrazilianDate(value: string): Date | null {
  if (!value) return null;

  // Remover caracteres não numéricos
  const cleanValue = value.replace(/[^\d]/g, '');

  // Tentar diferentes formatos
  let parsed: dayjs.Dayjs | null = null;

  // Formato completo: DD/MM/YYYY (8 dígitos)
  if (cleanValue.length === 8) {
    const day = cleanValue.substring(0, 2);
    const month = cleanValue.substring(2, 4);
    const year = cleanValue.substring(4, 8);
    parsed = dayjs(`${day}/${month}/${year}`, 'DD/MM/YYYY', true);
  }
  // Formato com separadores: DD/MM/YYYY
  else if (value.includes('/')) {
    parsed = dayjs(value, 'DD/MM/YYYY', true);
  }
  // Formato parcial: DDMM (assumir ano atual)
  else if (cleanValue.length === 4) {
    const day = cleanValue.substring(0, 2);
    const month = cleanValue.substring(2, 4);
    const year = new Date().getFullYear();
    parsed = dayjs(`${day}/${month}/${year}`, 'DD/MM/YYYY', true);
  }

  // Validar se a data é válida
  if (parsed && parsed.isValid()) {
    return parsed.toDate();
  }

  // Se não conseguiu parsear, retornar null
  return null;
}
