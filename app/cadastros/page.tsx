import { getCategorias, getCategoriasAtivas, getContas, getContasBancarias, getContasBancariasAtivas, getCartoes, getCaixinhas, getGastosProvisionados, getContasAtivas, getCartoesAtivos } from './actions';
import { CadastrosClient } from './CadastrosClient';
import { Suspense } from 'react';

function CadastrosContent() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <CadastrosClientWrapper />
    </Suspense>
  );
}

async function CadastrosClientWrapper() {
  const [categorias, categoriasAtivas, contas, contasBancarias, contasBancariasAtivas, cartoes, caixinhas, gastosProvisionados, contasAtivas, cartoesAtivos] = await Promise.all([
    getCategorias(),
    getCategoriasAtivas(),
    getContas(),
    getContasBancarias(),
    getContasBancariasAtivas(),
    getCartoes(),
    getCaixinhas(),
    getGastosProvisionados(),
    getContasAtivas(),
    getCartoesAtivos()
  ]);

  return <CadastrosClient 
    categorias={categorias} 
    categoriasAtivas={categoriasAtivas} 
    contas={contas}
    contasBancarias={contasBancarias}
    contasBancariasAtivas={contasBancariasAtivas}
    cartoes={cartoes}
    caixinhas={caixinhas}
    gastosProvisionados={gastosProvisionados}
    contasAtivas={contasAtivas}
    cartoesAtivos={cartoesAtivos}
  />;
}

export default function CadastrosPage() {
  return <CadastrosContent />;
}

