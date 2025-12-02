'use client';

import { useState } from 'react';
import { Container, Paper, Title, TextInput, Button, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

export default function SignInPage() {
  const router = useRouter();
  const { setUser } = useUser();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value) => (value.length < 6 ? 'Senha deve ter pelo menos 6 caracteres' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: 'Sucesso!',
          message: 'Login realizado com sucesso!',
          color: 'green',
        });
        setUser(data.user);
        
        // Verificar quantos controles o usuário tem (com timeout)
        try {
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 5000); // 5s timeout
          
          const controlsResponse = await fetch('/api/financial-controls', {
            signal: abortController.signal,
          });
          clearTimeout(timeoutId);
          
          if (controlsResponse.ok) {
            const controlsData = await controlsResponse.json();
            
            if (controlsData.controls.length === 1) {
              // Tem apenas 1 controle, vai direto para ele
              router.push(`/control/${controlsData.controls[0].id}`);
            } else {
              // Tem 0 ou vários, vai para dashboard
              router.push('/dashboard');
            }
          } else {
            router.push('/dashboard');
          }
        } catch (err) {
          // Se falhar, só vai pro dashboard mesmo (sem erro)
          console.warn('Erro ao buscar controles:', err);
          router.push('/dashboard');
        }
      } else {
        notifications.show({
          title: 'Erro',
          message: data.error || 'Erro ao fazer login',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Erro ao fazer login. Tente novamente.',
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
          Entrar
        </Title>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="seu@email.com"
              required
              type="email"
              {...form.getInputProps('email')}
            />

            <TextInput
              label="Senha"
              placeholder="Sua senha"
              required
              type="password"
              {...form.getInputProps('password')}
            />

            <Button type="submit" fullWidth loading={loading} mt="md">
              Entrar
            </Button>

            <Text size="sm" ta="center" mt="md">
              Não tem uma conta?{' '}
              <Text component={Link} href="/auth/signup" c="blue" span>
                Criar conta
              </Text>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
