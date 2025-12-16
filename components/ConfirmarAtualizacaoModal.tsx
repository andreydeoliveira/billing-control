'use client';

import { Modal, Text, Button, Group, Stack, Radio } from '@mantine/core';
import { useState } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';

interface ConfirmarAtualizacaoModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (atualizarTodos: boolean) => void;
  transacoesExistentes: number;
}

export function ConfirmarAtualizacaoModal({ 
  opened, 
  onClose, 
  onConfirm,
  transacoesExistentes 
}: ConfirmarAtualizacaoModalProps) {
  const [opcao, setOpcao] = useState<'futuros' | 'todos'>('futuros');

  const handleConfirm = () => {
    onConfirm(opcao === 'todos');
    setOpcao('futuros'); // Reset para próxima vez
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Atualizar Transações Existentes?"
      size="md"
    >
      <Stack gap="md">
        <Group gap="xs">
          <IconAlertCircle size={20} color="orange" />
          <Text size="sm" fw={500}>
            Existem {transacoesExistentes} transação(ões) já lançada(s) deste gasto provisionado
          </Text>
        </Group>

        <Text size="sm" c="dimmed">
          Este gasto provisionado já possui transações criadas. 
          Como deseja proceder com as alterações?
        </Text>

        <Radio.Group
          value={opcao}
          onChange={(value) => setOpcao(value as 'futuros' | 'todos')}
        >
          <Stack gap="sm" mt="sm">
            <Radio
              value="futuros"
              label="Atualizar apenas transações futuras (pendentes)"
              description="Mantém as transações confirmadas/pagas como estão"
            />
            <Radio
              value="todos"
              label="Atualizar TODAS as transações"
              description="Atualiza valor, forma de pagamento, etc. em todas as transações (incluindo confirmadas)"
            />
          </Stack>
        </Radio.Group>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
