'use client';

import { useState } from 'react';
import { Container, Paper, Title, Grid, Card, Text, Badge, Group, Button, Stack } from '@mantine/core';
import { IconCreditCard, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import type { Cartao, ContaBancaria, Conta, Categoria } from '@prisma/client';

type CartaoCompleto = Cartao & {
  contaBancaria: ContaBancaria;
};

interface CartoesClientProps {
  cartoes: CartaoCompleto[];
  contas: (Conta & { categoria: Categoria })[];
  contasBancarias: ContaBancaria[];
  mesInicial: number;
  anoInicial: number;
}

export function CartoesClient({
  cartoes,
  mesInicial,
  anoInicial
}: CartoesClientProps) {
  const router = useRouter();
  const [mes, setMes] = useState(mesInicial);
  const [ano, setAno] = useState(anoInicial);

  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const mesAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const mesSeguinte = () => {
    if (mes === 12) {
      setMes(1);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Container size="100%" px="md" py="md">
      <Stack gap="md">
        {/* Header com navegação de mês */}
        <Group justify="space-between" align="center">
          <Title order={2}>Cartões de Crédito</Title>
          
          <Group gap="xs">
            <Button 
              variant="subtle" 
              size="compact-sm"
              onClick={mesAnterior}
              px="xs"
            >
              <IconChevronLeft size={16} />
            </Button>
            <Text size="lg" fw={600}>
              {mesesNomes[mes - 1]} {ano}
            </Text>
            <Button 
              variant="subtle" 
              size="compact-sm"
              onClick={mesSeguinte}
              px="xs"
            >
              <IconChevronRight size={16} />
            </Button>
          </Group>
        </Group>

        {/* Grid de Cartões */}
        <Grid>
          {cartoes.map((cartao) => (
            <Grid.Col key={cartao.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
              <Card 
                shadow="sm" 
                padding="lg" 
                radius="md" 
                withBorder
                style={{ cursor: 'pointer', height: '100%' }}
                onClick={() => router.push(`/cartoes/${cartao.id}?mes=${mes}&ano=${ano}`)}
              >
                <Stack gap="sm">
                  <Group justify="space-between">
                    <IconCreditCard size={32} />
                    <Badge color="blue" variant="light">Ativo</Badge>
                  </Group>

                  <div>
                    <Text fw={600} size="lg">{cartao.nome}</Text>
                    <Text size="sm" c="dimmed">
                      {cartao.contaBancaria.nomeConta}
                    </Text>
                  </div>



                  <Group justify="space-between" mt="xs">
                    <div>
                      <Text size="xs" c="dimmed">Fechamento</Text>
                      <Text size="sm" fw={500}>Dia {cartao.diaFechamento}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Vencimento</Text>
                      <Text size="sm" fw={500}>Dia {cartao.diaVencimento}</Text>
                    </div>
                  </Group>

                  <Button 
                    fullWidth 
                    variant="light" 
                    mt="md"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/cartoes/${cartao.id}?mes=${mes}&ano=${ano}`);
                    }}
                  >
                    Ver Fatura
                  </Button>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        {cartoes.length === 0 && (
          <Paper p="xl" withBorder>
            <Text ta="center" c="dimmed">
              Nenhum cartão cadastrado. Cadastre um cartão em Cadastros.
            </Text>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
