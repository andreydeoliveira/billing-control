'use client';

import { logout } from '@/app/auth/actions';
import { getUserData } from '@/app/user/actions';
import { useEffect, useState } from 'react';
import { Button, Menu } from '@mantine/core';
import { usePathname, useRouter } from 'next/navigation';

export default function UserInfo() {
  const [user, setUser] = useState<{ name: string | null; email: string } | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  
  // Não carregar em páginas de auth
  const isAuthPage = pathname?.startsWith('/auth');

  useEffect(() => {
    if (isAuthPage) return;
    
    // Usar Server Action
    getUserData().then(setUser).catch(() => setUser(null));
  }, [isAuthPage]);

  if (isAuthPage || !user) {
    return null;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" size="xs">
            <span style={{ opacity: 0.7 }}>👤 </span>
            {user.name || user.email}
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Conta</Menu.Label>
          <Menu.Item onClick={() => router.push('/auth/change-password')}>
            🔑 Trocar Senha
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item 
            color="red"
            onClick={() => {
              const form = document.createElement('form');
              form.action = '/auth/login';
              form.method = 'POST';
              logout();
            }}
          >
            🚪 Sair
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}
