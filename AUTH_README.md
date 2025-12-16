# Sistema de Autenticação

## 📋 Arquivos Criados

```
prisma/
  schema.prisma          # Models User e Session

lib/
  auth.ts                # Funções de hash e validação
  session.ts             # Gerenciamento de sessões

app/
  auth/
    actions.ts           # Server Actions (login, signup, logout)
    login/
      page.tsx
      LoginClient.tsx
    signup/
      page.tsx
      SignupClient.tsx

components/
  UserInfo.tsx           # Componente para mostrar usuário logado

middleware.ts            # Proteção de rotas
```

## 🚀 Próximos Passos

### 1. Executar as migrações do Prisma

```bash
npx prisma migrate dev --name add_auth_system
```

### 2. Gerar o Prisma Client

```bash
npx prisma generate
```

### 3. Testar o sistema

Acesse:
- `http://localhost:3000/auth/signup` - Criar conta
- `http://localhost:3000/auth/login` - Fazer login

### 4. Usar o componente UserInfo (opcional)

Em qualquer Server Component:

```tsx
import UserInfo from '@/components/UserInfo';

export default function Page() {
  return (
    <div>
      <UserInfo />
      {/* resto do conteúdo */}
    </div>
  );
}
```

### 5. Verificar usuário logado em Server Components

```tsx
import { getCurrentUser } from '@/lib/session';

export default async function Page() {
  const user = await getCurrentUser();
  
  if (!user) {
    return <div>Não autenticado</div>;
  }
  
  return <div>Olá, {user.name || user.email}!</div>;
}
```

### 6. Verificar autenticação em Server Actions

```tsx
'use server';

import { getCurrentUser } from '@/lib/session';

export async function minhaAction() {
  const user = await getCurrentUser();
  
  if (!user) {
    return { error: 'Não autenticado' };
  }
  
  // lógica da action...
}
```

## 🔒 Recursos de Segurança

✅ Senhas com hash bcrypt (12 rounds)  
✅ Sessões no banco de dados  
✅ Cookies httpOnly, secure, sameSite  
✅ Expiração de sessão (30 dias)  
✅ Mensagens genéricas contra enumeração  
✅ Middleware para proteção de rotas  
✅ Sem JWT ou localStorage  
✅ Autenticação apenas no backend  

## 🎯 Personalização

### Alterar duração da sessão

Em [lib/session.ts](lib/session.ts#L5):
```tsx
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
```

### Adicionar rotas públicas

Em [middleware.ts](middleware.ts#L7):
```tsx
const PUBLIC_ROUTES = ['/auth/login', '/auth/signup', '/about'];
```

### Requisitos de senha mais fortes

Em [lib/auth.ts](lib/auth.ts#L40):
```tsx
export function isValidPassword(password: string): boolean {
  // Mínimo 12 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 especial
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
  return regex.test(password);
}
```
