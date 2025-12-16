import bcrypt from 'bcryptjs';

/**
 * Gera um hash seguro da senha usando bcrypt
 * @param password - Senha em texto plano
 * @returns Hash da senha
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verifica se a senha fornecida corresponde ao hash armazenado
 * @param password - Senha em texto plano
 * @param hash - Hash armazenado no banco
 * @returns true se a senha corresponder, false caso contrário
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Valida formato do email
 * @param email - Email a ser validado
 * @returns true se o email for válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida requisitos mínimos da senha
 * @param password - Senha a ser validada
 * @returns true se a senha atender aos requisitos
 */
export function isValidPassword(password: string): boolean {
  // Mínimo 12 caracteres
  if (password.length < 12) return false;
  
  // Verificar complexidade básica
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  return hasLower && hasUpper && hasNumber;
}
