'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface Session {
  user: User;
  expires: string;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          setSession(data);
        }
      } catch (error) {
        console.error('Erro ao buscar sessão:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, []);

  return { session, loading, user: session?.user || null };
}
