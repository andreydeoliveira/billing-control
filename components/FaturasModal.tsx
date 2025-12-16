'use client';

import { Modal, Table, Badge, Button, Group, Text, Paper, Stack } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useState } from 'react';
import { pagarFatura } from '../app/transacoes/actions';
import { useRouter } from 'next/navigation';
import { FaturaCartao, Cartao, ContaBancaria, Transacao, Conta, Categoria } from '@prisma/client';
import { SearchableSelect } from './SearchableSelect';

type FaturaCompleta = FaturaCartao & {
  cartao: Cartao & { contaBancaria: ContaBancaria };
  transacoes: (Transacao & {
    conta?: (Conta & { categoria: Categoria }) | null;
  })[];
  contaBancariaPagto?: ContaBancaria | null;
};

interface FaturasModalProps {
  opened: boolean;
  onClose: () => void;
  faturas: FaturaCompleta[];
  contasBancarias: ContaBancaria[];
}

export function FaturasModal({ 
  opened, 
  onClose, 
  faturas,
  contasBancarias
}: FaturasModalProps) {
  const router = useRouter();
  const [faturaExpandida, setFaturaExpandida] = useState<string | null>(null);
  const [contaBancariaPagto, setContaBancariaPagto] = useState<string>('');
  const [dataPagamento, setDataPagamento] = useState<Date>(new Date());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  };

  const handlePagarFatura = async (faturaId: string) => {
    if (!contaBancariaPagto) {
      alert('Selecione a conta bancária para pagamento');
      return;
    }

    await pagarFatura(faturaId, contaBancariaPagto, dataPagamento);
    setFaturaExpandida(null);
    setContaBancariaPagto('');
    router.refresh();
  };

  const contaBancariaOptions = contasBancarias.map(cb => ({
    value: cb.id,
    label: `${cb.nomeConta} - ${cb.nomeBanco}`
  }));

  return (
    <Modal opened={opened} onClose={onClose} title="Faturas de Cartão" size="lg">
      {faturas.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          Nenhuma fatura encontrada para este mês
        </Text>
      ) : (
        <Stack gap="md">
          {faturas.map((fatura) => (
            <Paper key={fatura.id} shadow="xs" p="md" withBorder>
              <Group justify="space-between" mb="sm">
                <div>
                  <Text size="lg" fw={500}>{fatura.cartao.nome}</Text>
                  <Text size="sm" c="dimmed">
                    {fatura.cartao.contaBancaria.nomeConta} - {fatura.cartao.contaBancaria.nomeBanco}
                  </Text>
                </div>
                <Badge size="lg" color={
                  fatura.status === 'paga' ? 'green' :
                  fatura.status === 'fechada' ? 'yellow' : 'blue'
                }>
                  {fatura.status === 'paga' ? 'Paga' :
                   fatura.status === 'fechada' ? 'Fechada' : 'Aberta'}
                </Badge>
              </Group>

              <Group justify="space-between" mb="sm">
                <div>
                  <Text size="xs" c="dimmed">Fechamento</Text>
                  <Text size="sm">{formatDate(fatura.dataFechamento)}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Vencimento</Text>
                  <Text size="sm">{formatDate(fatura.dataVencimento)}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Valor Total</Text>
                  <Text size="lg" fw={700} c="red">{formatCurrency(fatura.valorTotal)}</Text>
                </div>
              </Group>

              {faturaExpandida === fatura.id ? (
                <>
                  <Text size="sm" fw={500} mt="md" mb="xs">Lançamentos:</Text>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Descrição</Table.Th>
                        <Table.Th>Categoria</Table.Th>
                        <Table.Th>Valor</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {fatura.transacoes.map((transacao) => (
                        <Table.Tr key={transacao.id}>
                          <Table.Td>{transacao.descricao}</Table.Td>
                          <Table.Td>
                            {transacao.conta?.categoria.nome}
                          </Table.Td>
                          <Table.Td>{formatCurrency(transacao.valor)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>

                  {fatura.status !== 'paga' && (
                    <Stack gap="sm" mt="md">
                      <SearchableSelect
                        label="Conta Bancária para Pagamento"
                        placeholder="Selecione a conta"
                        data={contaBancariaOptions}
                        value={contaBancariaPagto}
                        onChange={(value) => setContaBancariaPagto(value || '')}
                      />

                      <DateInput
                        label="Data do Pagamento"
                        placeholder="Selecione a data"
                        valueFormat="DD/MM/YYYY"
                        value={dataPagamento}
                        onChange={(value) => setDataPagamento(value || new Date())}
                      />

                      <Group justify="flex-end">
                        <Button 
                          variant="subtle" 
                          onClick={() => setFaturaExpandida(null)}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={() => handlePagarFatura(fatura.id)}
                        >
                          Confirmar Pagamento
                        </Button>
                      </Group>
                    </Stack>
                  )}

                  {fatura.status === 'paga' && (
                    <Paper bg="gray.0" p="sm" mt="md">
                      <Text size="sm" c="dimmed">
                        Paga em {formatDate(fatura.dataPagamento!)} via {fatura.contaBancariaPagto?.nomeConta}
                      </Text>
                    </Paper>
                  )}
                </>
              ) : (
                <Group justify="flex-end" mt="sm">
                  <Button 
                    variant="light" 
                    size="sm"
                    onClick={() => setFaturaExpandida(fatura.id)}
                  >
                    Ver Detalhes
                  </Button>
                </Group>
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </Modal>
  );
}
