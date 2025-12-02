import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: string; // 'user' | 'admin'
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string; // 'user' | 'admin'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string; // 'user' | 'admin'
  }
}
