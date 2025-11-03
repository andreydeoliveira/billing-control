'use client';

import { useState, useEffect } from 'react';
import { 
  Container, 
  Title, 
  Button, 
  Card, 
  Text, 
  Stack, 
  Group,
  Modal,
  TextInput,
  Loader,
  Center,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

interface FinancialControl {
  id: string;
  name: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [controls, setControls] = useState<FinancialControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nome deve ter pelo menos 2 caracteres' : null),
    },
  });

  const loadControls = async () => {
    try {
      const response = await fetch('/api/financial-controls');
      if (response.ok) {
        const data = await response.json();
        setControls(data.controls);
        setLoading(false);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao carregar controles:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadControls();
  }, []);

  const handleCreateControl = async (values: typeof form.values) => {
    setCreateLoading(true);
    try {
      const response = await fetch('/api/financial-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso!',
          message: 'Controle financeiro criado com sucesso!',
          color: 'green',
        });
        setModalOpened(false);
        form.reset();
        loadControls();
      } else {
        const data = await response.json();
        notifications.show({
          title: 'Erro',
          message: data.error || 'Erro ao criar controle',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Erro ao criar controle. Tente novamente.',
        color: 'red',
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenControl = (controlId: string) => {
    router.push(`/control/${controlId}`);
  };

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="lg" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <Group justify="space-between" mb="xl">
        <Title order={1}>Meus Controles Financeiros</Title>
        <Button onClick={() => setModalOpened(true)}>
          Criar Novo Controle
        </Button>
      </Group>

      {controls.length === 0 ? (
        <Card shadow="sm" padding="xl" radius="md">
          <Stack align="center" gap="md">
            <Text size="lg" c="dimmed">
              Você ainda não tem nenhum controle financeiro
            </Text>
            <Button onClick={() => setModalOpened(true)}>
              Criar Meu Primeiro Controle
            </Button>
          </Stack>
        </Card>
      ) : (
        <Stack gap="md">
          {controls.map((control) => (
            <Card 
              key={control.id} 
              shadow="sm" 
              padding="lg" 
              radius="md" 
              style={{ cursor: 'pointer' }}
              onClick={() => handleOpenControl(control.id)}
            >
              <Group justify="space-between">
                <div>
                  <Text fw={500} size="lg">
                    {control.name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Criado em {new Date(control.createdAt).toLocaleDateString('pt-BR')}
                  </Text>
                </div>
                <Button variant="light">Abrir</Button>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Criar Novo Controle Financeiro"
      >
        <form onSubmit={form.onSubmit(handleCreateControl)}>
          <Stack gap="md">
            <TextInput
              label="Nome do Controle"
              placeholder="Ex: Finanças da Família"
              required
              {...form.getInputProps('name')}
            />

            <Button type="submit" fullWidth loading={createLoading}>
              Criar Controle
            </Button>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
