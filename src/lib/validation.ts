/**
 * Utilitários de validação e sanitização para APIs
 */

/**
 * Valida e converte string para número
 * @throws Error se valor inválido
 */
export const parseAmount = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === '') {
    throw new Error('Valor não pode ser vazio');
  }

  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsed)) {
    throw new Error('Valor numérico inválido');
  }

  if (parsed < 0) {
    throw new Error('Valor não pode ser negativo');
  }

  return parsed;
};

/**
 * Valida formato de data YYYY-MM-DD
 * @throws Error se data inválida
 */
export const validateDate = (dateString: string | null | undefined): string | null => {
  if (!dateString) {
    return null;
  }

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    throw new Error('Data deve estar no formato YYYY-MM-DD');
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Data inválida');
  }

  // Verificar se data não é muito antiga (antes de 1900) ou muito futura (depois de 2100)
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) {
    throw new Error('Data fora do intervalo permitido (1900-2100)');
  }

  return dateString;
};

/**
 * Sanitiza string removendo caracteres perigosos e limitando tamanho
 */
export const sanitizeString = (
  input: string | null | undefined,
  maxLength: number = 255
): string | null => {
  if (!input) {
    return null;
  }

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove < e > para evitar HTML injection
};

/**
 * Valida que uma string não está vazia
 * @throws Error se vazia
 */
export const validateRequired = (value: string | null | undefined, fieldName: string): string => {
  if (!value || value.trim() === '') {
    throw new Error(`${fieldName} é obrigatório`);
  }
  return value.trim();
};

/**
 * Valida tipo de transação
 * @throws Error se inválido
 */
export const validateTransactionType = (type: string): 'income' | 'expense' => {
  if (type !== 'income' && type !== 'expense') {
    throw new Error('Tipo de transação inválido. Use "income" ou "expense"');
  }
  return type;
};

/**
 * Valida UUID
 * @throws Error se inválido
 */
export const validateUUID = (uuid: string | null | undefined, fieldName: string): string => {
  if (!uuid) {
    throw new Error(`${fieldName} é obrigatório`);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error(`${fieldName} inválido`);
  }

  return uuid;
};

/**
 * Valida mês no formato YYYY-MM
 * @throws Error se inválido
 */
export const validateMonth = (month: string | null | undefined): string => {
  if (!month) {
    throw new Error('Mês é obrigatório');
  }

  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(month)) {
    throw new Error('Mês deve estar no formato YYYY-MM');
  }

  const [year, monthNum] = month.split('-').map(Number);
  
  if (year < 1900 || year > 2100) {
    throw new Error('Ano fora do intervalo permitido (1900-2100)');
  }

  if (monthNum < 1 || monthNum > 12) {
    throw new Error('Mês inválido (1-12)');
  }

  return month;
};

/**
 * Valida número de parcelas
 */
export const validateInstallments = (installments: number | null | undefined): number | null => {
  if (installments === null || installments === undefined) {
    return null;
  }

  if (!Number.isInteger(installments)) {
    throw new Error('Número de parcelas deve ser um inteiro');
  }

  if (installments < 1 || installments > 120) {
    throw new Error('Número de parcelas deve estar entre 1 e 120');
  }

  return installments;
};
