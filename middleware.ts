import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const SESSION_COOKIE_NAME = 'session_id';

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = ['/auth/login', '/auth/signup'];

// Rotas de autenticação que usuários logados não devem acessar
const AUTH_ROUTES = ['/auth/login', '/auth/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verificar se há cookie de sessão E validar no banco
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  let isAuthenticated = false;
  if (sessionId) {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { expiresAt: true }
      });
      isAuthenticated = !!session && session.expiresAt > new Date();
    } catch (error) {
      // Em caso de erro, considerar não autenticado
      isAuthenticated = false;
    }
  }

  // Se estiver em rota pública e não autenticado, permitir acesso
  if (PUBLIC_ROUTES.includes(pathname) && !isAuthenticated) {
    return NextResponse.next();
  }

  // Se estiver autenticado e tentar acessar páginas de auth, redirecionar para home
  if (AUTH_ROUTES.includes(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Se não estiver autenticado e tentar acessar rota privada, redirecionar para login
  if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)',
  ],
};
