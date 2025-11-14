import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const session = await auth();
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!session?.user;

  // Rotas de API de autenticação (sempre permitidas)
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Rotas protegidas que requerem autenticação
  const isProtectedRoute = 
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/control') ||
    pathname.startsWith('/api/financial-controls') ||
    pathname.startsWith('/api/users');

  // Se não está logado e tenta acessar rota protegida
  if (!isLoggedIn && isProtectedRoute) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // Se está logado e tenta acessar página de login/cadastro
  if (isLoggedIn && (pathname === '/auth/signin' || pathname === '/auth/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Se está logado e acessa a raiz, vai para dashboard
  if (isLoggedIn && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Se não está logado e acessa a raiz, vai para login
  if (!isLoggedIn && pathname === '/') {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder images
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
