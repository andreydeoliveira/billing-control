import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    try {
      await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      return NextResponse.json(
        { 
          message: 'Login realizado com sucesso',
          success: true,
        },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: 'Credenciais inválidas' },
          { status: 401 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    );
  }
}
