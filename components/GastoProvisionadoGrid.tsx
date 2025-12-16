'use client';

import { Table, Badge, Button, Group, Text, Select } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { ActionMenu } from '@/components/ActionMenu';
import { useState } from 'react';
import { GastoProvisionadoForm } from '@/components/GastoProvisionadoForm';
import { deleteGastoProvisionado } from '../app/cadastros/actions';
import { useRouter } from 'next/navigation';
import { modals } from '@mantine/modals';
import { GastoProvisionado, Conta, Categoria, ContaBancaria, Cartao } from '@prisma/client';

interface GastoProvisionadoGridProps {
  gastosProvisionados: (GastoProvisionado & { 
    conta: Conta & { categoria: Categoria };
    contaBancaria?: ContaBancaria | null;
    cartao?: (Cartao & { contaBancaria: ContaBancaria }) | null;
  })[];
  contas: (Conta & { categoria: Categoria })[];
  contasBancarias: ContaBancaria[];
  cartoes: (Cartao & { contaBancaria: ContaBancaria })[];
}

export function GastoProvisionadoGrid({ 
  gastosProvisionados, 
  contas,
  contasBancarias,
  cartoes
}: GastoProvisionadoGridProps) {
  const router = useRouter();
  const [formOpened, setFormOpened] = useState(false);
  const [editingGasto, setEditingGasto] = useState<typeof gastosProvisionados[0] | undefined>();
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);

  const handleEdit = (gasto: typeof gastosProvisionados[0]) => {
    setEditingGasto(gasto);
    setFormOpened(true);
  };

  const handleNew = () => {
    setEditingGasto(undefined);
    setFormOpened(true);
  };

  const handleDelete = async (id: string, contaNome: string) => {
    // Verificar se tem transações vinculadas
    const resultado = await deleteGastoProvisionado(id);
    
    if (resultado.temTransacoes) {
      modals.openConfirmModal({
        title: 'Excluir transações vinculadas?',
        children: (
          <Text size="sm">
            O gasto provisionado <strong>{contaNome}</strong> possui {resultado.qtdTransacoes} transação(ões) vinculada(s).
            <br /><br />
            Deseja excluir o gasto provisionado e todas as suas transações?
          </Text>
        ),
        labels: { confirm: 'Excluir tudo', cancel: 'Cancelar' },
        confirmProps: { color: 'red' },
        onConfirm: async () => {
          await deleteGastoProvisionado(id, true);
          router.refresh();
        },
      });
    } else {
      modals.openConfirmModal({
        title: 'Confirmar exclusão',
        children: (
          <Text size="sm">
            Tem certeza que deseja excluir o gasto provisionado <strong>{contaNome}</strong>?
          </Text>
        ),
        labels: { confirm: 'Excluir', cancel: 'Cancelar' },
        confirmProps: { color: 'red' },
        onConfirm: async () => {
          await deleteGastoProvisionado(id, true);
          router.refresh();
        },
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  };

  const getFormaPagamentoLabel = (formaPagamento: string, contaBancaria?: ContaBancaria | null, cartao?: (Cartao & { contaBancaria: ContaBancaria }) | null) => {
    if (formaPagamento === 'transferencia_pix') {
      return contaBancaria ? `PIX/Transf - ${contaBancaria.nomeConta}` : 'PIX/Transferência';
    }
    return cartao ? `${cartao.contaBancaria.nomeBanco} - ${cartao.nome}` : 'Cartão de Crédito';
  };

  // Filtrar gastos por tipo
  const gastosFiltrados = filtroTipo
    ? gastosProvisionados.filter(g => g.conta.tipo === filtroTipo)
    : gastosProvisionados;

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text size="lg" fw={500}>Gastos Provisionados</Text>
        <Group>
          <Select
            placeholder="Filtrar por tipo"
            data={[
              { value: 'receita', label: 'Receita' },
              { value: 'despesa', label: 'Despesa' }
            ]}
            value={filtroTipo}
            onChange={setFiltroTipo}
            clearable
            w={180}
          />
          <Button leftSection={<IconPlus size={18} />} onClick={handleNew}>
            Novo Gasto Provisionado
          </Button>
        </Group>
      </Group>

      {gastosFiltrados.length === 0 ? (
        <Text c="dimmed">{filtroTipo ? 'Nenhum gasto provisionado encontrado para este filtro' : 'Nenhum gasto provisionado cadastrado'}</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Conta / Tipo</Table.Th>
              <Table.Th>Valor Esperado</Table.Th>
              <Table.Th>Forma de Pagamento</Table.Th>
              <Table.Th>Recorrência</Table.Th>
              <Table.Th>Data Início</Table.Th>
              <Table.Th>Data Final</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ width: '80px' }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {gastosFiltrados.map((gasto) => (
              <Table.Tr key={gasto.id}>
                <Table.Td>
                  <div>
                    <Text size="sm" fw={500}>{gasto.conta.nome}</Text>
                    <Badge size="xs" color={gasto.conta.tipo === 'receita' ? 'green' : 'red'} mb={4}>
                      {gasto.conta.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </Badge>
                    {gasto.observacao && <Text size="xs" c="dimmed">{gasto.observacao}</Text>}
                  </div>
                </Table.Td>
                <Table.Td>{formatCurrency(gasto.valorEsperado)}</Table.Td>
                <Table.Td>
                  <Text size="sm">{getFormaPagamentoLabel(gasto.formaPagamento, gasto.contaBancaria, gasto.cartao)}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light">{gasto.tipoRecorrencia}</Badge>
                </Table.Td>
                <Table.Td>{formatDate(gasto.dataInicio)}</Table.Td>
                <Table.Td>{gasto.dataFinal ? formatDate(gasto.dataFinal) : '-'}</Table.Td>
                <Table.Td>
                  <Badge color={gasto.status === 'Ativo' ? 'green' : 'gray'}>
                    {gasto.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <ActionMenu
                    onEdit={() => handleEdit(gasto)}
                    onDelete={() => handleDelete(gasto.id, gasto.conta.nome)}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <GastoProvisionadoForm
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        gastoProvisionado={editingGasto}
        contas={contas}
        contasBancarias={contasBancarias}
        cartoes={cartoes}
      />
    </>
  );
}
