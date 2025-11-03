'use client';

import { useState } from 'react';
import { Container, Paper, Title, TextInput, Button, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

export default function SignUpPage() {
  const router = useRouter();
  const { setUser } = useUser();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nome deve ter pelo menos 2 caracteres' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value) => (value.length < 6 ? 'Senha deve ter pelo menos 6 caracteres' : null),
      confirmPassword: (value, values) =>
        value !== values.password ? 'As senhas não coincidem' : null,
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: 'Sucesso!',
          message: 'Conta criada com sucesso!',
          color: 'green',
        });
        setUser(data.user);
        router.push('/dashboard');
      } else {
        notifications.show({
          title: 'Erro',
          message: data.error || 'Erro ao criar conta',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Erro ao criar conta. Tente novamente.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" style={{ paddingTop: '5rem' }}>
      <Paper shadow="md" p="xl" radius="md">
        <Title order={2} ta="center" mb="xl">
          Criar Conta
        </Title>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Nome"
              placeholder="Seu nome completo"
              required
              {...form.getInputProps('name')}
            />

            <TextInput
              label="Email"
              placeholder="seu@email.com"
              required
              type="email"
              {...form.getInputProps('email')}
            />

            <TextInput
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              required
              type="password"
              {...form.getInputProps('password')}
            />

            <TextInput
              label="Confirmar Senha"
              placeholder="Digite a senha novamente"
              required
              type="password"
              {...form.getInputProps('confirmPassword')}
            />

            <Button type="submit" fullWidth loading={loading} mt="md">
              Criar Conta
            </Button>

            <Text size="sm" ta="center" mt="md">
              Já tem uma conta?{' '}
              <Text component={Link} href="/auth/signin" c="blue" span>
                Fazer login
              </Text>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
