'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Button,
  Text,
  Stack,
  Group,
  TextInput,
  Badge,
  Alert,
  Loader,
  ActionIcon,
  Table,
} from '@mantine/core';
import { IconArrowLeft, IconTrash, IconUserPlus, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface Member {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  isOwner: boolean;
  isPending: boolean;
  addedAt: string;
}

interface ControlInfo {
  name: string;
  isOwner: boolean;
}

export default function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const controlId = params.id as string;

  const [control, setControl] = useState<ControlInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');

  const loadMembers = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/members`);
      if (response.ok) {
        const data = await response.json();
        setControl(data.control);
        setMembers(data.members);
      } else {
        notifications.show({
          title: 'Erro',
          message: 'Não foi possível carregar os membros',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      notifications.show({
        title: 'Erro',
        message: 'Erro ao carregar os membros',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlId]);

  const handleInvite = async () => {
    const emailTrimmed = email.trim();
    
    if (!emailTrimmed) {
      notifications.show({
        title: 'Atenção',
        message: 'Digite um email válido',
        color: 'orange',
      });
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      notifications.show({
        title: 'Atenção',
        message: 'Digite um email válido (exemplo: usuario@email.com)',
        color: 'orange',
      });
      return;
    }

    setInviting(true);
    try {
      console.log('Enviando requisição para adicionar membro:', emailTrimmed);
      
      const response = await fetch(`/api/financial-controls/${controlId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        notifications.show({
          title: 'Sucesso',
          message: result.message || 'Membro adicionado com sucesso',
          color: 'green',
        });
        setEmail('');
        loadMembers();
      } else {
        // Tentar ler como JSON, se falhar, usar texto
        let errorMessage = 'Não foi possível adicionar o membro';
        try {
          const data = await response.json();
          console.error('Erro da API (JSON):', data);
          errorMessage = data.error || errorMessage;
        } catch (parseError) {
          const textError = await response.text();
          console.error('Erro da API (Text):', textError);
          console.error('Parse error:', parseError);
          errorMessage = textError || errorMessage;
        }
        
        notifications.show({
          title: 'Erro',
          message: errorMessage,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      notifications.show({
        title: 'Erro',
        message: 'Erro ao adicionar o membro. Verifique o console.',
        color: 'red',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) {
      return;
    }

    try {
      const response = await fetch(`/api/financial-controls/${controlId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Membro removido com sucesso',
          color: 'green',
        });
        loadMembers();
      } else {
        const data = await response.json();
        notifications.show({
          title: 'Erro',
          message: data.error || 'Não foi possível remover o membro',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      notifications.show({
        title: 'Erro',
        message: 'Erro ao remover o membro',
        color: 'red',
      });
    }
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Loader />
      </Container>
    );
  }

  if (!control) {
    return null;
  }

  return (
    <Container size="md" py="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => router.push(`/control/${controlId}`)}
        mb="xl"
      >
        Voltar
      </Button>

      <Paper shadow="sm" p="xl" withBorder>
        <Title order={2} mb="md">Membros do Controle</Title>
        <Text c="dimmed" mb="xl" size="sm">
          {control.name}
        </Text>

        {control.isOwner ? (
          <>
            <Stack gap="md" mb="xl">
              <Text size="sm" fw={500}>Adicionar Novo Membro</Text>
              <Group>
                <TextInput
                  placeholder="Email do usuário"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleInvite();
                    }
                  }}
                />
                <Button
                  leftSection={<IconUserPlus size={16} />}
                  onClick={handleInvite}
                  loading={inviting}
                >
                  Adicionar
                </Button>
              </Group>
            </Stack>

            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nome</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Função</Table.Th>
                  <Table.Th>Adicionado em</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {members.map((member) => (
                  <Table.Tr key={member.id} opacity={member.isPending ? 0.6 : 1}>
                    <Table.Td>
                      {member.isPending ? (
                        <Text c="dimmed" fs="italic">Convite pendente</Text>
                      ) : (
                        member.userName || 'Sem nome'
                      )}
                    </Table.Td>
                    <Table.Td>{member.userEmail}</Table.Td>
                    <Table.Td>
                      {member.isOwner ? (
                        <Badge color="blue">Proprietário</Badge>
                      ) : member.isPending ? (
                        <Badge color="orange">Pendente</Badge>
                      ) : (
                        <Badge color="gray">Membro</Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {new Date(member.addedAt).toLocaleDateString('pt-BR')}
                    </Table.Td>
                    <Table.Td>
                      {!member.isOwner && (
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => handleRemove(member.id)}
                          title={member.isPending ? 'Cancelar convite' : 'Remover membro'}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {members.length === 0 && (
              <Text c="dimmed" ta="center" mt="md">
                Nenhum membro adicionado ainda
              </Text>
            )}
          </>
        ) : (
          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            Apenas o proprietário pode gerenciar membros deste controle.
          </Alert>
        )}
      </Paper>
    </Container>
  );
}
