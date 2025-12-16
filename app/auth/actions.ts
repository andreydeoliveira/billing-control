'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, isValidEmail, isValidPassword } from '@/lib/auth';
import { createSession, deleteSession } from '@/lib/session';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action para cadastro de novo usuário
 */
export async function signup(formData: FormData): Promise<AuthResult> {
  const emailRaw = formData.get('email') as string;
  const password = formData.get('password') as string;
  const nameRaw = formData.get('name') as string;
  
  // Sanitizar inputs
  const email = emailRaw?.trim().toLowerCase();
  const name = nameRaw?.trim();

  // Validações
  if (!email || !password) {
    return { success: false, error: 'Email e senha são obrigatórios' };
  }

  if (!isValidEmail(email)) {
    return { success: false, error: 'Email inválido' };
  }

  if (!isValidPassword(password)) {
    return { success: false, error: 'A senha deve ter no mínimo 12 caracteres, incluindo maiúsculas, minúsculas e números' };
  }
  
  // Rate limiting
  if (!checkRateLimit(email, 3, 60000)) { // 3 tentativas por minuto
    return { success: false, error: 'Muitas tentativas. Aguarde 1 minuto.' };
  }

  try {
    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Mensagem genérica para evitar enumeração de usuários
      return { success: false, error: 'Não foi possível criar a conta' };
    }

    // Criar hash da senha
    const passwordHash = await hashPassword(password);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
      },
    });

    // Criar sessão
    await createSession(user.id);
    
    // Resetar rate limit após sucesso
    resetRateLimit(email);

    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao criar usuário:', error);
    } else {
      console.error('Erro ao criar usuário');
    }
    return { success: false, error: 'Erro ao criar conta. Tente novamente.' };
  }
}

/**
 * Server Action para login
 */
export async function login(formData: FormData): Promise<AuthResult> {
  const emailRaw = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  // Sanitizar inputs
  const email = emailRaw?.trim().toLowerCase();

  // Validações básicas
  if (!email || !password) {
    return { success: false, error: 'Email e senha são obrigatórios' };
  }
  
  // Rate limiting - 5 tentativas por minuto
  if (!checkRateLimit(email, 5, 60000)) {
    return { success: false, error: 'Muitas tentativas. Aguarde 1 minuto.' };
  }

  try {
    // Buscar usuário por email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // SEMPRE executar verify mesmo se user não existe (proteção contra timing attacks)
    // Hash dummy com mesmo custo computacional do bcrypt
    const passwordHash = user?.passwordHash || 
      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLhvKqLa';
    
    const isPasswordValid = await verifyPassword(password, passwordHash);

    // Mensagem genérica para evitar enumeração de usuários
    if (!user || !isPasswordValid) {
      return { success: false, error: 'Email ou senha incorretos' };
    }

    // Criar sessão
    await createSession(user.id);
    
    // Resetar rate limit após sucesso
    resetRateLimit(email);

    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao fazer login:', error);
    } else {
      console.error('Erro ao fazer login');
    }
    return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
  }
}

/**
 * Server Action para logout
 */
export async function logout() {
  await deleteSession();
  redirect('/auth/login');
}

/**
 * Server Action para trocar senha
 */
export async function changePassword(formData: FormData): Promise<AuthResult> {
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // Validações
  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: 'Todos os campos são obrigatórios' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'As senhas não coincidem' };
  }

  if (!isValidPassword(newPassword)) {
    return { success: false, error: 'A nova senha deve ter no mínimo 12 caracteres, incluindo maiúsculas, minúsculas e números' };
  }

  try {
    // Obter usuário atual
    const session = await prisma.session.findFirst({
      where: {
        expiresAt: { gt: new Date() }
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!session?.user) {
      return { success: false, error: 'Sessão inválida. Faça login novamente.' };
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await verifyPassword(currentPassword, session.user.passwordHash);

    if (!isCurrentPasswordValid) {
      return { success: false, error: 'Senha atual incorreta' };
    }

    // Criar hash da nova senha
    const newPasswordHash = await hashPassword(newPassword);

    // Atualizar senha no banco
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newPasswordHash }
    });

    // Invalidar todas as sessões antigas (força re-login em outros dispositivos)
    await prisma.session.deleteMany({
      where: { userId: session.user.id }
    });

    // Criar nova sessão
    await createSession(session.user.id);

    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao trocar senha:', error);
    } else {
      console.error('Erro ao trocar senha');
    }
    return { success: false, error: 'Erro ao trocar senha. Tente novamente.' };
  }
}
