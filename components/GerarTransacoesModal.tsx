'use client';

import { Modal, Button, Group, Text, Select, Paper, Alert } from '@mantine/core';
import { useState, useEffect } from 'react';
import { gerarTransacoesProvisionadas } from '@/app/transacoes/actions';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';

interface GerarTransacoesModalProps {
  opened: boolean;
  onClose: () => void;
}

export function GerarTransacoesModal({ opened, onClose }: GerarTransacoesModalProps) {
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  
  const [mesInicio, setMesInicio] = useState<string>(mesAtual.toString());
  const [anoInicio, setAnoInicio] = useState<string>(anoAtual.toString());
  const [mesFim, setMesFim] = useState<string>('12');
  const [anoFim, setAnoFim] = useState<string>((anoAtual + 4).toString());
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    transacoesCriadas: number;
    mesesExcluidos: string[];
  } | null>(null);

  // Preencher automaticamente quando abrir o modal
  useEffect(() => {
    if (opened) {
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const anoAtual = hoje.getFullYear();
      
      setMesInicio(mesAtual.toString());
      setAnoInicio(anoAtual.toString());
      setMesFim('12');
      setAnoFim((anoAtual + 4).toString());
      setResultado(null);
    }
  }, [opened]);

  const meses = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  const anos = Array.from({ length: 5 }, (_v, i) => ({
    value: String(anoAtual + i),
    label: String(anoAtual + i)
  }));

  const handleGerar = async () => {
    if (!mesInicio || !anoInicio || !mesFim || !anoFim) {
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const resultado = await gerarTransacoesProvisionadas(
        parseInt(mesInicio),
        parseInt(anoInicio),
        parseInt(mesFim),
        parseInt(anoFim)
      );

      setResultado(resultado);
    } catch (error) {
      console.error('Erro ao gerar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMesInicio('');
    setAnoInicio('');
    setMesFim('');
    setAnoFim('');
    setResultado(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Gerar Transações de Gastos Provisionados"
      size="md"
    >
      <Text size="sm" c="dimmed" mb="lg">
        Selecione o período para gerar as transações dos gastos provisionados ativos.
        Transações já existentes não serão duplicadas.
      </Text>

      <Paper p="md" withBorder mb="md">
        <Text size="sm" fw={500} mb="xs">Período Inicial</Text>
        <Group grow>
          <Select
            label="Mês"
            placeholder="Selecione"
            data={meses}
            value={mesInicio}
            onChange={(value) => setMesInicio(value || '')}
            required
          />
          <Select
            label="Ano"
            placeholder="Selecione"
            data={anos}
            value={anoInicio}
            onChange={(value) => setAnoInicio(value || '')}
            required
          />
        </Group>
      </Paper>

      <Paper p="md" withBorder mb="md">
        <Text size="sm" fw={500} mb="xs">Período Final</Text>
        <Group grow>
          <Select
            label="Mês"
            placeholder="Selecione"
            data={meses}
            value={mesFim}
            onChange={(value) => setMesFim(value || '')}
            required
          />
          <Select
            label="Ano"
            placeholder="Selecione"
            data={anos}
            value={anoFim}
            onChange={(value) => setAnoFim(value || '')}
            required
          />
        </Group>
      </Paper>

      {resultado && (
        <Alert 
          icon={<IconCheck size={16} />} 
          title="Transações Geradas" 
          color="green"
          mb="md"
        >
          <Text size="sm">
            {resultado.transacoesCriadas} transação(ões) criada(s) com sucesso!
          </Text>
          {resultado.mesesExcluidos.length > 0 && (
            <Text size="xs" c="dimmed" mt="xs">
              Meses excluídos previamente: {resultado.mesesExcluidos.join(', ')}
            </Text>
          )}
        </Alert>
      )}

      <Group justify="flex-end" mt="lg">
        <Button variant="subtle" onClick={handleClose}>
          Cancelar
        </Button>
        <Button 
          onClick={handleGerar}
          loading={loading}
          disabled={!mesInicio || !anoInicio || !mesFim || !anoFim}
        >
          Gerar Transações
        </Button>
      </Group>

      <Alert 
        icon={<IconAlertCircle size={16} />} 
        color="blue"
        mt="lg"
      >
        <Text size="xs">
          <strong>Importante:</strong> Se você excluir uma transação provisionada, 
          ela não será gerada novamente neste mês. Para editar um gasto provisionado,
          vá em Cadastros → Gastos Provisionados.
        </Text>
      </Alert>
    </Modal>
  );
}
