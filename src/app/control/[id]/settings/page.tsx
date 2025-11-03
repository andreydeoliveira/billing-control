'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Paper,
  TextInput,
  Button,
  Group,
  Stack,
  Text,
  Loader,
  Center,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft } from '@tabler/icons-react';

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const controlId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nome deve ter pelo menos 2 caracteres' : null),
    },
  });

  useEffect(() => {
    const loadControl = async () => {
      try {
        const response = await fetch(`/api/financial-controls/${controlId}`);
        if (response.ok) {
          const data = await response.json();
          form.setValues({ name: data.control.name });
        }
      } catch (error) {
        console.error('Erro ao carregar controle:', error);
      } finally {
        setLoading(false);
      }
    };

    loadControl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlId]);

  const handleSubmit = async (values: typeof form.values) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso!',
          message: 'Configurações atualizadas!',
          color: 'green',
        });
        router.push(`/control/${controlId}`);
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível salvar as configurações',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => router.push(`/control/${controlId}`)}
        mb="xl"
      >
        Voltar
      </Button>

      <Paper shadow="sm" p="xl" withBorder>
        <Title order={2} mb="xl">Configurações do Controle</Title>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Nome do Controle"
              placeholder="Ex: Finanças Pessoais"
              required
              {...form.getInputProps('name')}
            />

            <Text size="sm" c="dimmed">
              Outras configurações serão adicionadas em breve.
            </Text>

            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={() => router.push(`/control/${controlId}`)}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Salvar Alterações
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
