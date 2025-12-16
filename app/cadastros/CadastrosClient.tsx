'use client';

import { Select, Box, Stack, NavLink } from '@mantine/core';
import { IconBuildingBank, IconReceipt, IconClockDollar } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Categoria, Conta, ContaBancaria, Cartao, Caixinha, GastoProvisionado } from '@prisma/client';
import { ContaGrid } from '@/components/ContaGrid';
import { ContaBancariaGrid } from '@/components/ContaBancariaGrid';
import { GastoProvisionadoGrid } from '@/components/GastoProvisionadoGrid';

interface CadastrosClientProps {
  categorias: Categoria[];
  categoriasAtivas: Categoria[];
  contas: (Conta & { categoria: Categoria })[];
  contasBancarias: ContaBancaria[];
  contasBancariasAtivas: ContaBancaria[];
  cartoes: (Cartao & { contaBancaria: ContaBancaria })[];
  caixinhas: (Caixinha & { contaBancaria: ContaBancaria })[];
  gastosProvisionados: (GastoProvisionado & { conta: Conta & { categoria: Categoria }; contaBancaria?: ContaBancaria | null; cartao?: (Cartao & { contaBancaria: ContaBancaria }) | null })[];
  contasAtivas: (Conta & { categoria: Categoria })[];
  cartoesAtivos: (Cartao & { contaBancaria: ContaBancaria })[];
}

export function CadastrosClient({ categorias, categoriasAtivas, contas, contasBancarias, contasBancariasAtivas, cartoes, caixinhas, gastosProvisionados, contasAtivas, cartoesAtivos }: CadastrosClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'contas';

  const handleTabChange = (tab: string) => {
    router.push(`/cadastros?tab=${tab}`);
  };

  const menuItems = [
    { value: 'contas-bancarias', label: 'Contas Bancárias', icon: IconBuildingBank },
    { value: 'contas', label: 'Contas', icon: IconReceipt },
    { value: 'gastos-provisionados', label: 'Gastos Provisionados', icon: IconClockDollar },
  ];

  return (
    <div>
      {/* Mobile - Select */}
      <Select
        value={activeTab}
        onChange={(value) => handleTabChange(value || 'contas-bancarias')}
        data={menuItems.map(item => ({ value: item.value, label: item.label }))}
        mb="md"
        placeholder="Selecione um cadastro"
        hiddenFrom="sm"
      />

      {/* Desktop - Flex com menu lateral */}
      <Box visibleFrom="sm" style={{ display: 'flex', gap: '1.5rem' }}>
        <Stack gap="xs" style={{ minWidth: '220px' }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.value}
              label={item.label}
              leftSection={<item.icon size={20} />}
              active={activeTab === item.value}
              onClick={() => handleTabChange(item.value)}
            />
          ))}
        </Stack>
        
        <Box style={{ flex: 1 }}>
          {activeTab === 'contas-bancarias' && (
            <ContaBancariaGrid 
              contasBancarias={contasBancarias} 
              contasBancariasAtivas={contasBancariasAtivas}
              cartoes={cartoes}
              caixinhas={caixinhas}
            />
          )}

          {activeTab === 'contas' && (
            <ContaGrid contas={contas} categorias={categorias} categoriasAtivas={categoriasAtivas} />
          )}

          {activeTab === 'gastos-provisionados' && (
            <GastoProvisionadoGrid 
              gastosProvisionados={gastosProvisionados}
              contas={contasAtivas}
              contasBancarias={contasBancariasAtivas}
              cartoes={cartoesAtivos}
            />
          )}
        </Box>
      </Box>

      {/* Mobile - Conteúdo */}
      <Box hiddenFrom="sm">
        {activeTab === 'contas-bancarias' && (
          <ContaBancariaGrid 
            contasBancarias={contasBancarias} 
            contasBancariasAtivas={contasBancariasAtivas}
            cartoes={cartoes}
            caixinhas={caixinhas}
          />
        )}

        {activeTab === 'contas' && (
          <ContaGrid contas={contas} categorias={categorias} categoriasAtivas={categoriasAtivas} />
        )}

        {activeTab === 'gastos-provisionados' && (
          <GastoProvisionadoGrid 
            gastosProvisionados={gastosProvisionados}
            contas={contasAtivas}
            contasBancarias={contasBancariasAtivas}
            cartoes={cartoesAtivos}
          />
        )}
      </Box>
    </div>
  );
}
