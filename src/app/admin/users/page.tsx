'use client';

import { useState, useEffect } from 'react';
import { Container, Title, Paper, Table, Badge, Button, Group, Text, Loader, Select, ActionIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { IconTrash, IconArrowLeft } from '@tabler/icons-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  emailVerified: Date | null;
  createdAt: Date;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status]);

  async function fetchUsers() {
    try {
      const response = await fetch('/api/admin/users');
      
      if (response.status === 403) {
        notifications.show({
          title: 'Acesso negado',
          message: 'Você não tem permissão para acessar esta página',
          color: 'red',
        });
        router.push('/dashboard');
        return;
      }

      if (!response.ok) {
        throw new Error('Erro ao buscar usuários');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      notifications.show({
        title: 'Erro',
        message: 'Erro ao carregar usuários',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar role');
      }

      notifications.show({
        title: 'Sucesso',
        message: 'Role atualizado com sucesso',
        color: 'green',
      });

      fetchUsers(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      notifications.show({
        title: 'Erro',
        message: 'Erro ao atualizar role do usuário',
        color: 'red',
      });
    }
  }

  async function deleteUser(userId: string, userEmail: string) {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${userEmail}?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir usuário');
      }

      notifications.show({
        title: 'Sucesso',
        message: 'Usuário excluído com sucesso',
        color: 'green',
      });

      fetchUsers(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      notifications.show({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Erro ao excluir usuário',
        color: 'red',
      });
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
        </Group>
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <Container size="xl" py="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => router.back()}
        mb="md"
      >
        Voltar
      </Button>

      <Title order={1} mb="xl">Gerenciamento de Usuários</Title>

      <Paper shadow="sm" p="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Email Verificado</Table.Th>
              <Table.Th>Cadastrado em</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>{user.name || '-'}</Table.Td>
                <Table.Td>{user.email}</Table.Td>
                <Table.Td>
                  <Badge color={user.role === 'admin' ? 'red' : 'blue'}>
                    {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={user.emailVerified ? 'green' : 'gray'}>
                    {user.emailVerified ? 'Sim' : 'Não'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Select
                      value={user.role}
                      data={[
                        { value: 'user', label: 'Usuário' },
                        { value: 'admin', label: 'Administrador' },
                      ]}
                      onChange={(value) => {
                        if (value && value !== user.role) {
                          updateUserRole(user.id, value);
                        }
                      }}
                      disabled={user.email === session?.user?.email}
                    />
                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={() => deleteUser(user.id, user.email)}
                      disabled={user.email === session?.user?.email}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {users.length === 0 && (
          <Text ta="center" c="dimmed" py="xl">
            Nenhum usuário encontrado
          </Text>
        )}
      </Paper>
    </Container>
  );
}
