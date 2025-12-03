/**
 * Utilitário para adicionar timeout em requisições de API
 * Previne travamentos indefinidos quando o banco de dados está lento
 */

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operação excedeu timeout de ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Wrapper para handlers de API que automaticamente aborta após timeout
 */
export function withApiTimeout(
  handler: (req: any) => Promise<Response>,
  timeoutMs: number = 30000
) {
  return async (req: any) => {
    try {
      return await withTimeout(handler(req), timeoutMs);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        console.error('[API TIMEOUT]', error.message);
        return new Response(
          JSON.stringify({
            error: 'A requisição demorou muito tempo. Por favor tente novamente.',
            code: 'TIMEOUT',
          }),
          { status: 504, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }
  };
}
