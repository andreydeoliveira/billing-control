'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { hashPassword } from '@/lib/auth';

export async function getUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      // Nunca retornar passwordHash por segurança
    }
  });
}

/**
 * Função de exemplo para criar usuário
 * IMPORTANTE: Para cadastro real, use /auth/signup
 * Esta função não valida email, não faz rate limiting, etc.
 */
export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  if (!password || !email) {
    throw new Error('Email e senha são obrigatórios');
  }
  
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: { 
      name: name || null, 
      email: email.trim().toLowerCase(), 
      passwordHash 
    }
  });

  revalidatePath('/');
}
