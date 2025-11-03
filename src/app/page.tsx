'use client';

import { Container, Title, Text, Button, Group, Stack, Paper } from '@mantine/core';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <Container size="sm" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper shadow="md" p="xl" radius="md" style={{ width: '100%' }}>
        <Stack gap="xl">
          <div style={{ textAlign: 'center' }}>
            <Title order={1} mb="md">Billing Control</Title>
            <Text c="dimmed" size="lg">
              Controle financeiro pessoal
            </Text>
          </div>

          <Group grow>
            <Button 
              onClick={() => router.push('/auth/signin')} 
              size="lg" 
              variant="filled"
            >
              Entrar
            </Button>
            <Button 
              onClick={() => router.push('/auth/signup')} 
              size="lg" 
              variant="light"
            >
              Criar Conta
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}