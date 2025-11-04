import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');

  // Permitir rotas de autenticação da API
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // Se está logado e tenta acessar página de auth, redireciona para dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Se não está logado e tenta acessar página protegida, redireciona para login
  if (!isLoggedIn && !isAuthPage && req.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
