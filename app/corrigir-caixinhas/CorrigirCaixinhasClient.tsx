'use client';

import { Container, Title, Text, Button, Stack, Alert } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { corrigirSaldoCaixinhas } from '../cadastros/actions';

export function CorrigirCaixinhasClient() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ corrigidas: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleCorrigir = async () => {
    setLoading(true);
    setErro(null);
    setResultado(null);

    try {
      const result = await corrigirSaldoCaixinhas();
      setResultado(result);
    } catch (error) {
      setErro('Erro ao corrigir caixinhas: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={2}>Corrigir Saldo das Caixinhas</Title>
        
        <Alert icon={<IconAlertCircle size={20} />} title="Atenção" color="blue">
          <Text size="sm">
            Esta página corrige o saldo das caixinhas que foram criadas antes da correção.
            O saldo será atualizado para o mesmo valor do valor inicial.
          </Text>
        </Alert>

        <Button 
          onClick={handleCorrigir} 
          loading={loading}
          size="lg"
        >
          Corrigir Caixinhas
        </Button>

        {resultado && (
          <Alert icon={<IconCheck size={20} />} title="Sucesso!" color="green">
            <Text size="sm">
              {resultado.corrigidas} caixinha(s) foram corrigidas com sucesso!
            </Text>
          </Alert>
        )}

        {erro && (
          <Alert icon={<IconAlertCircle size={20} />} title="Erro" color="red">
            <Text size="sm">{erro}</Text>
          </Alert>
        )}

        <Text size="sm" c="dimmed">
          Após corrigir, você pode acessar a página de Cadastros para verificar se os saldos estão corretos.
          Esta página pode ser excluída após a correção.
        </Text>
      </Stack>
    </Container>
  );
}
