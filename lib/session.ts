import { cookies } from 'next/headers';
import { prisma } from './prisma';

const SESSION_COOKIE_NAME = 'session_id';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/**
 * Cria uma nova sessão para o usuário
 * @param userId - ID do usuário
 * @returns ID da sessão criada
 */
export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  // Invalidar todas as sessões antigas deste usuário (previne session fixation)
  await prisma.session.deleteMany({ 
    where: { userId } 
  });

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
    },
  });

  // Configurar cookie httpOnly
  (await cookies()).set(SESSION_COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return session.id;
}

/**
 * Valida e retorna a sessão atual
 * @returns Sessão com dados do usuário ou null
 */
export async function getSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  // Verificar se sessão existe e não expirou
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      // Limpar sessão expirada do banco
      await prisma.session.delete({ where: { id: sessionId } });
    }
    // Não deletar cookie aqui - isso deve ser feito apenas em Server Actions
    return null;
  }

  return session;
}

/**
 * Retorna apenas o usuário da sessão atual
 * @returns Usuário logado ou null
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Verifica se há um usuário autenticado
 * @returns true se há sessão válida
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Deleta a sessão atual (logout)
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    // Deletar do banco
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {
      // Sessão pode não existir mais
    });
  }

  // Deletar cookie
  await deleteSessionCookie();
}

/**
 * Remove o cookie de sessão
 */
async function deleteSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

/**
 * Limpa todas as sessões expiradas do banco (opcional - pode rodar em cron)
 */
export async function cleanExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
