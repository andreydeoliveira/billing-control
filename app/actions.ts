'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  await prisma.user.create({
    data: { name, email }
  });

  revalidatePath('/');
}
