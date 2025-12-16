import { getTransacoesMes, getFaturasMes } from './actions';
import { getContasAtivas, getContasBancariasAtivas, getCartoesAtivos, getGastosProvisionadosAtivos, getCaixinhasAtivas } from '../cadastros/actions';
import { TransacoesClient } from './TransacoesClient';
import { Suspense } from 'react';

function TransacoesContent() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <TransacoesClientWrapper />
    </Suspense>
  );
}

async function TransacoesClientWrapper() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  const [transacoes, faturas, contas, contasBancarias, cartoes, caixinhas, gastosProvisionados] = await Promise.all([
    getTransacoesMes(mes, ano),
    getFaturasMes(mes, ano),
    getContasAtivas(),
    getContasBancariasAtivas(),
    getCartoesAtivos(),
    getCaixinhasAtivas(),
    getGastosProvisionadosAtivos()
  ]);

  return (
    <TransacoesClient 
      transacoesIniciais={transacoes}
      faturasIniciais={faturas}
      contas={contas}
      contasBancarias={contasBancarias}
      cartoes={cartoes}
      caixinhas={caixinhas}
      gastosProvisionados={gastosProvisionados}
      mesInicial={mes}
      anoInicial={ano}
    />
  );
}

export default function TransacoesPage() {
  return <TransacoesContent />;
}
