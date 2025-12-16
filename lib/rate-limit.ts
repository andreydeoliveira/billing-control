/**
 * Rate Limiting simples em memória
 * Para produção, considere usar Redis/Vercel KV
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Limpar entradas antigas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Verifica se um identificador ultrapassou o limite de tentativas
 * @param identifier - Email, IP, etc
 * @param maxAttempts - Número máximo de tentativas (padrão: 5)
 * @param windowMs - Janela de tempo em ms (padrão: 60000 = 1 minuto)
 * @returns true se dentro do limite, false se excedeu
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    // Primeira tentativa ou janela expirou
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }
  
  if (entry.count >= maxAttempts) {
    return false; // Limite excedido
  }
  
  // Incrementar contador
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return true;
}

/**
 * Reseta o rate limit para um identificador (útil após login bem-sucedido)
 * @param identifier - Email, IP, etc
 */
export function resetRateLimit(identifier: string): void {
  const key = `rate_limit:${identifier}`;
  rateLimitStore.delete(key);
}
