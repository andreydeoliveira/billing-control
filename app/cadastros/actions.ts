'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ========== CATEGORIAS ==========
export async function getCategorias() {
  return await prisma.categoria.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function getCategoriasAtivas() {
  return await prisma.categoria.findMany({
    where: { status: 'Ativo' },
    orderBy: { nome: 'asc' }
  });
}

export async function createCategoria(formData: FormData) {
  const nome = formData.get('nome') as string;
  const observacao = formData.get('observacao') as string;
  const status = formData.get('status') as string;

  await prisma.categoria.create({
    data: { nome, observacao: observacao || null, status }
  });

  revalidatePath('/cadastros');
}

export async function updateCategoria(id: string, formData: FormData) {
  const nome = formData.get('nome') as string;
  const observacao = formData.get('observacao') as string;
  const status = formData.get('status') as string;

  await prisma.categoria.update({
    where: { id },
    data: { nome, observacao: observacao || null, status }
  });

  revalidatePath('/cadastros');
}

export async function deleteCategoria(id: string) {
  await prisma.categoria.delete({
    where: { id }
  });

  revalidatePath('/cadastros');
}

// ========== CONTAS ==========
export async function getContas() {
  return await prisma.conta.findMany({
    include: { categoria: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createConta(formData: FormData) {
  const nome = formData.get('nome') as string;
  const tipo = formData.get('tipo') as string;
  const observacao = formData.get('observacao') as string;
  const categoriaId = formData.get('categoriaId') as string;
  const status = formData.get('status') as string;

  await prisma.conta.create({
    data: { nome, tipo, observacao: observacao || null, categoriaId, status }
  });

  revalidatePath('/cadastros');
}

export async function updateConta(id: string, formData: FormData) {
  const nome = formData.get('nome') as string;
  const tipo = formData.get('tipo') as string;
  const observacao = formData.get('observacao') as string;
  const categoriaId = formData.get('categoriaId') as string;
  const status = formData.get('status') as string;

  await prisma.conta.update({
    where: { id },
    data: { nome, tipo, observacao: observacao || null, categoriaId, status }
  });

  revalidatePath('/cadastros');
}

export async function deleteConta(id: string) {
  await prisma.conta.delete({
    where: { id }
  });

  revalidatePath('/cadastros');
}

// ========== CONTAS BANCÁRIAS ==========
export async function getContasBancarias() {
  return await prisma.contaBancaria.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function createContaBancaria(formData: FormData) {
  const nomeConta = formData.get('nomeConta') as string;
  const nomeBanco = formData.get('nomeBanco') as string;
  const saldoInicial = parseFloat(formData.get('saldoInicial') as string);
  const status = formData.get('status') as string;

  await prisma.contaBancaria.create({
    data: { nomeConta, nomeBanco, saldoInicial, status }
  });

  revalidatePath('/cadastros');
}

export async function updateContaBancaria(id: string, formData: FormData) {
  const nomeConta = formData.get('nomeConta') as string;
  const nomeBanco = formData.get('nomeBanco') as string;
  const saldoInicial = parseFloat(formData.get('saldoInicial') as string);
  const status = formData.get('status') as string;

  await prisma.contaBancaria.update({
    where: { id },
    data: { nomeConta, nomeBanco, saldoInicial, status }
  });

  revalidatePath('/cadastros');
}

export async function deleteContaBancaria(id: string) {
  await prisma.contaBancaria.delete({
    where: { id }
  });

  revalidatePath('/cadastros');
}

// ========== CARTÕES ==========
export async function getCartoes() {
  return await prisma.cartao.findMany({
    include: { contaBancaria: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createCartao(formData: FormData) {
  const nome = formData.get('nome') as string;
  const diaFechamento = formData.get('diaFechamento') as string;
  const diaVencimento = formData.get('diaVencimento') as string;
  const contaBancariaId = formData.get('contaBancariaId') as string;
  const status = formData.get('status') as string;

  await prisma.cartao.create({
    data: { 
      nome, 
      diaFechamento: diaFechamento ? parseInt(diaFechamento) : null,
      diaVencimento: diaVencimento ? parseInt(diaVencimento) : null,
      contaBancariaId, 
      status 
    }
  });

  revalidatePath('/cadastros');
}

export async function updateCartao(id: string, formData: FormData) {
  const nome = formData.get('nome') as string;
  const diaFechamento = formData.get('diaFechamento') as string;
  const diaVencimento = formData.get('diaVencimento') as string;
  const contaBancariaId = formData.get('contaBancariaId') as string;
  const status = formData.get('status') as string;

  await prisma.cartao.update({
    where: { id },
    data: { 
      nome, 
      diaFechamento: diaFechamento ? parseInt(diaFechamento) : null,
      diaVencimento: diaVencimento ? parseInt(diaVencimento) : null,
      contaBancariaId, 
      status 
    }
  });

  revalidatePath('/cadastros');
}

export async function deleteCartao(id: string) {
  await prisma.cartao.delete({
    where: { id }
  });

  revalidatePath('/cadastros');
}

// ========== CAIXINHAS ==========
export async function getCaixinhas() {
  return await prisma.caixinha.findMany({
    include: { contaBancaria: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getCaixinhasAtivas() {
  return await prisma.caixinha.findMany({
    where: { status: 'Ativo' },
    include: { contaBancaria: true },
    orderBy: { nome: 'asc' }
  });
}

export async function createCaixinha(formData: FormData) {
  const nome = formData.get('nome') as string;
  const valorInicial = formData.get('valorInicial') as string;
  const contaBancariaId = formData.get('contaBancariaId') as string;
  const status = formData.get('status') as string;

  await prisma.caixinha.create({
    data: { 
      nome, 
      valorInicial: valorInicial ? parseFloat(valorInicial) : null,
      contaBancariaId, 
      status 
    }
  });

  revalidatePath('/cadastros');
}

export async function updateCaixinha(id: string, formData: FormData) {
  const nome = formData.get('nome') as string;
  const valorInicial = formData.get('valorInicial') as string;
  const contaBancariaId = formData.get('contaBancariaId') as string;
  const status = formData.get('status') as string;

  await prisma.caixinha.update({
    where: { id },
    data: { 
      nome, 
      valorInicial: valorInicial ? parseFloat(valorInicial) : null,
      contaBancariaId, 
      status 
    }
  });

  revalidatePath('/cadastros');
}

export async function deleteCaixinha(id: string) {
  await prisma.caixinha.delete({
    where: { id }
  });

  revalidatePath('/cadastros');
}

// ========== GASTOS PROVISIONADOS ==========
export async function getGastosProvisionados() {
  return await prisma.gastoProvisionado.findMany({
    include: { 
      conta: { include: { categoria: true } },
      contaBancaria: true,
      cartao: { include: { contaBancaria: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createGastoProvisionado(formData: FormData) {
  const contaId = formData.get('contaId') as string;
  const observacao = formData.get('observacao') as string;
  const valorEsperado = parseFloat(formData.get('valorEsperado') as string);
  const formaPagamento = formData.get('formaPagamento') as string;
  const contaBancariaId = formData.get('contaBancariaId') as string;
  const cartaoId = formData.get('cartaoId') as string;
  const tipoRecorrencia = formData.get('tipoRecorrencia') as string;
  const dataInicio = new Date(formData.get('dataInicio') as string);
  const dataFinal = formData.get('dataFinal') as string;
  const status = formData.get('status') as string;

  await prisma.gastoProvisionado.create({
    data: {
      contaId,
      observacao: observacao || null,
      valorEsperado,
      formaPagamento,
      contaBancariaId: formaPagamento === 'transferencia_pix' ? contaBancariaId : null,
      cartaoId: formaPagamento === 'cartao_credito' ? cartaoId : null,
      tipoRecorrencia,
      dataInicio,
      dataFinal: dataFinal ? new Date(dataFinal) : null,
      status
    }
  });

  revalidatePath('/cadastros');
}

// Verificar se gasto provisionado tem transações
export async function verificarTransacoesGastoProvisionado(id: string) {
  const count = await prisma.transacao.count({
    where: { gastoProvisionadoId: id }
  });
  return count;
}

// Atualizar gasto provisionado e suas transações
export async function updateGastoProvisionado(
  id: string, 
  formData: FormData, 
  atualizarTodos?: boolean
) {
  const contaId = formData.get('contaId') as string;
  const observacao = formData.get('observacao') as string;
  const valorEsperado = parseFloat(formData.get('valorEsperado') as string);
  const formaPagamento = formData.get('formaPagamento') as string;
  const contaBancariaId = formData.get('contaBancariaId') as string;
  const cartaoId = formData.get('cartaoId') as string;
  const tipoRecorrencia = formData.get('tipoRecorrencia') as string;
  const dataInicio = new Date(formData.get('dataInicio') as string);
  const dataFinal = formData.get('dataFinal') as string;
  const status = formData.get('status') as string;

  // Atualizar o gasto provisionado
  await prisma.gastoProvisionado.update({
    where: { id },
    data: {
      contaId,
      observacao: observacao || null,
      valorEsperado,
      formaPagamento,
      contaBancariaId: formaPagamento === 'transferencia_pix' ? contaBancariaId : null,
      cartaoId: formaPagamento === 'cartao_credito' ? cartaoId : null,
      tipoRecorrencia,
      dataInicio,
      dataFinal: dataFinal ? new Date(dataFinal) : null,
      status
    }
  });

  // Atualizar transações se solicitado
  if (atualizarTodos !== undefined) {
    const whereClause: any = {
      gastoProvisionadoId: id
    };

    // Se atualizarTodos = false, atualiza apenas pendentes
    if (!atualizarTodos) {
      whereClause.status = 'pendente';
    }

    await prisma.transacao.updateMany({
      where: whereClause,
      data: {
        contaId,
        valor: valorEsperado,
        valorEsperado,
        formaPagamento,
        contaBancariaId: formaPagamento === 'transferencia_pix' ? contaBancariaId : null,
        cartaoId: formaPagamento === 'cartao_credito' ? cartaoId : null,
        observacao: observacao || null
      }
    });
  }

  revalidatePath('/cadastros');
  revalidatePath('/transacoes');
}

export async function deleteGastoProvisionado(id: string, confirmarExclusao = false) {
  // Verificar se tem transações vinculadas
  const qtdTransacoes = await prisma.transacao.count({
    where: { gastoProvisionadoId: id }
  });

  // Se não foi confirmado e tem transações, retornar para confirmação
  if (!confirmarExclusao && qtdTransacoes > 0) {
    return {
      temTransacoes: true,
      qtdTransacoes
    };
  }

  // Se foi confirmado ou não tem transações, excluir
  if (confirmarExclusao || qtdTransacoes === 0) {
    // Primeiro excluir todas as transações vinculadas
    if (qtdTransacoes > 0) {
      await prisma.transacao.deleteMany({
        where: { gastoProvisionadoId: id }
      });
    }

    // Depois excluir o gasto provisionado
    await prisma.gastoProvisionado.delete({
      where: { id }
    });

    revalidatePath('/cadastros');
    revalidatePath('/transacoes');
    
    return {
      temTransacoes: false,
      qtdTransacoes: 0
    };
  }

  return {
    temTransacoes: false,
    qtdTransacoes: 0
  };
}

// ========== HELPERS ==========
export async function getContasBancariasAtivas() {
  return await prisma.contaBancaria.findMany({
    where: { status: 'Ativo' },
    orderBy: { nomeConta: 'asc' }
  });
}

export async function getContasAtivas() {
  return await prisma.conta.findMany({
    where: { status: 'Ativo' },
    include: { categoria: true },
    orderBy: { nome: 'asc' }
  });
}

export async function getCartoesAtivos() {
  return await prisma.cartao.findMany({
    where: { status: 'Ativo' },
    include: { contaBancaria: true },
    orderBy: { nome: 'asc' }
  });
}

export async function getGastosProvisionadosAtivos() {
  return await prisma.gastoProvisionado.findMany({
    where: { status: 'Ativo' },
    include: {
      conta: { include: { categoria: true } },
      mesesExcluidos: true,
      cartao: { select: { contaBancariaId: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}
