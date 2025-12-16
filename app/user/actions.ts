'use server';

import { getCurrentUser } from '@/lib/session';

export async function getUserData() {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
