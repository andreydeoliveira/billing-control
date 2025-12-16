'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ========== HELPER: REGISTRO DE EXTRATO ==========

/**
 * Registra um lançamento no extrato (audit trail) para rastreabilidade
 * Todos as modificações de saldo DEVEM passar por esta função
 */
async function registrarLancamentoExtrato({
  contaBancariaId,
  caixinhaId,
  transacaoId,
  descricao,
  saldoAnterior,
  valorMovimento, // Positivo = crédito, Negativo = débito
  tipo, // 'receita' | 'despesa' | 'transferencia_saida' | 'transferencia_entrada' | 'aporte' | 'resgate'
  data
}: {
  contaBancariaId?: string;
  caixinhaId?: string;
  transacaoId?: string;
  descricao: string;
  saldoAnterior: number;
  valorMovimento: number;
  tipo: string;
  data: Date;
}) {
  const saldoNovo = saldoAnterior + valorMovimento;

  await prisma.lancamentoExtrato.create({
    data: {
      contaBancariaId,
      caixinhaId,
      transacaoId,
      descricao,
      saldoAnterior,
      valorMovimento,
      saldoNovo,
      tipo,
      data
    }
  });

  return saldoNovo;
}

/**
 * Recalcula o saldo de uma conta bancária ou caixinha a partir do extrato
 * Útil para verificar integridade dos dados
 * @returns { saldoAtual, saldoCalculado, divergencia }
 */
export async function recalcularSaldoFromExtrato(
  entidadeId: string,
  tipo: 'contaBancaria' | 'caixinha'
) {
  // Buscar saldo inicial
  let saldoInicial = 0;
  let saldoAtual = 0;

  if (tipo === 'contaBancaria') {
    const conta = await prisma.contaBancaria.findUnique({
      where: { id: entidadeId }
    });
    if (!conta) throw new Error('Conta bancária não encontrada');
    saldoInicial = conta.saldoInicial;
    saldoAtual = conta.saldo;
  } else {
    const caixinha = await prisma.caixinha.findUnique({
      where: { id: entidadeId }
    });
    if (!caixinha) throw new Error('Caixinha não encontrada');
    saldoInicial = 0; // Caixinhas começam com saldo zero
    saldoAtual = caixinha.saldo;
  }

  // Buscar todos os lançamentos do extrato ordenados por data
  const lancamentos = await prisma.lancamentoExtrato.findMany({
    where: tipo === 'contaBancaria' 
      ? { contaBancariaId: entidadeId }
      : { caixinhaId: entidadeId },
    orderBy: { data: 'asc' }
  });

  // Calcular saldo somando movimentos
  let saldoCalculado = saldoInicial;
  for (const lanc of lancamentos) {
    saldoCalculado += lanc.valorMovimento;
  }

  return {
    saldoAtual,
    saldoCalculado,
    divergencia: saldoAtual - saldoCalculado,
    totalLancamentos: lancamentos.length
  };
}

// ========== GASTOS PROVISIONADOS ==========

// Gerar transações de gastos provisionados para um período
export async function gerarTransacoesProvisionadas(
  mesInicio: number,
  anoInicio: number,
  mesFim: number,
  anoFim: number
) {
  // Sempre começar do mês atual
  const hoje = new Date();
  const mesAtualReal = hoje.getMonth() + 1;
  const anoAtualReal = hoje.getFullYear();

  // Buscar gastos provisionados ativos
  const gastosProvisionados = await prisma.gastoProvisionado.findMany({
    where: {
      status: 'Ativo'
    },
    include: {
      conta: {
        include: { categoria: true }
      },
      mesesExcluidos: true
    }
  });

  const transacoesCriadas = [];
  const mesesExcluidos = [];

  for (const gasto of gastosProvisionados) {
    // Processar cada mês no período - começar do mês atual
    let mesAtual = mesAtualReal;
    let anoAtual = anoAtualReal;

    while (
      anoAtual < anoFim || 
      (anoAtual === anoFim && mesAtual <= mesFim)
    ) {
      // Verificar se este mês foi excluído manualmente
      const mesExcluido = gasto.mesesExcluidos.find(
        me => me.mes === mesAtual && me.ano === anoAtual
      );

      // Verificar se está dentro do período do gasto provisionado
      const dataInicioGasto = new Date(gasto.dataInicio);
      const anoInicioGasto = dataInicioGasto.getFullYear();
      const mesInicioGasto = dataInicioGasto.getMonth() + 1;
      
      // Verificar data início: ano/mês atual >= ano/mês início
      const dentroDataInicio = (anoAtual > anoInicioGasto) || 
                               (anoAtual === anoInicioGasto && mesAtual >= mesInicioGasto);
      
      // Verificar data fim se existir
      let dentroDataFim = true;
      if (gasto.dataFinal) {
        const dataFinalGasto = new Date(gasto.dataFinal);
        const anoFinalGasto = dataFinalGasto.getFullYear();
        const mesFinalGasto = dataFinalGasto.getMonth() + 1;
        dentroDataFim = (anoAtual < anoFinalGasto) || 
                        (anoAtual === anoFinalGasto && mesAtual <= mesFinalGasto);
      }

      // Verificar se deve gerar baseado no tipo de recorrência
      let deveGerar = false;
      
      if (gasto.tipoRecorrencia === 'mensal') {
        deveGerar = true;
      } else if (gasto.tipoRecorrencia === 'anual') {
        deveGerar = mesAtual === mesInicioGasto;
      } else if (gasto.tipoRecorrencia.endsWith('x')) {
        // Parcelado - calcular qual parcela seria
        const numeroParcelas = parseInt(gasto.tipoRecorrencia.replace('x', ''));
        const mesesDiferenca = (anoAtual - anoInicioGasto) * 12 + (mesAtual - mesInicioGasto);
        deveGerar = mesesDiferenca >= 0 && mesesDiferenca < numeroParcelas;
      }

      // Permitir gerar mesmo que já exista (exceto se foi excluído manualmente)
      if (
        !mesExcluido && 
        dentroDataInicio && 
        dentroDataFim &&
        deveGerar
      ) {
        // Verificar se já existe antes de criar
        const transacaoExistente = await prisma.transacao.findFirst({
          where: {
            gastoProvisionadoId: gasto.id,
            mes: mesAtual,
            ano: anoAtual
          }
        });

        // Se já existe, pular
        if (transacaoExistente) {
          // Avançar para o próximo mês
          mesAtual++;
          if (mesAtual > 12) {
            mesAtual = 1;
            anoAtual++;
          }
          continue;
        }
        // Criar transação - usar dia do mês da data início, mas limitado ao máximo do mês
        const dataInicioGasto = new Date(gasto.dataInicio);
        const diaDoMes = dataInicioGasto.getDate();
        const ultimoDiaDoMes = new Date(anoAtual, mesAtual, 0).getDate();
        const diaFinal = Math.min(diaDoMes, ultimoDiaDoMes);
        const dataTransacao = new Date(anoAtual, mesAtual - 1, diaFinal);
        
        // Se for cartão de crédito, criar/buscar fatura e vincular
        let faturaCartaoId = null;
        if (gasto.formaPagamento === 'cartao_credito' && gasto.cartaoId) {
          const fatura = await getOrCreateFatura(gasto.cartaoId, mesAtual, anoAtual);
          faturaCartaoId = fatura.id;
        }
        
        const transacao = await prisma.transacao.create({
          data: {
            data: dataTransacao,
            mes: mesAtual,
            ano: anoAtual,
            descricao: gasto.conta.nome,
            valor: gasto.valorEsperado,
            tipo: gasto.conta.tipo, // Usar o tipo da conta (receita ou despesa)
            contaId: gasto.contaId,
            formaPagamento: gasto.formaPagamento,
            contaBancariaId: gasto.contaBancariaId,
            cartaoId: gasto.cartaoId,
            faturaCartaoId: faturaCartaoId,
            status: 'pendente',
            valorEsperado: gasto.valorEsperado,
            gastoProvisionadoId: gasto.id,
            observacao: gasto.observacao
          }
        });

        transacoesCriadas.push(transacao);
      } else if (mesExcluido) {
        mesesExcluidos.push(`${mesAtual}/${anoAtual}`);
      }

      // Avançar para o próximo mês
      mesAtual++;
      if (mesAtual > 12) {
        mesAtual = 1;
        anoAtual++;
      }
    }
  }

  revalidatePath('/transacoes');
  
  return {
    sucesso: true,
    transacoesCriadas: transacoesCriadas.length,
    mesesExcluidos: mesesExcluidos
  };
}

// Excluir transação e marcar mês como excluído
export async function excluirTransacaoProvisionada(transacaoId: string) {
  const transacao = await prisma.transacao.findUnique({
    where: { id: transacaoId },
    include: { gastoProvisionado: true }
  });

  if (!transacao || !transacao.gastoProvisionadoId) {
    throw new Error('Transação não encontrada ou não é provisionada');
  }

  // Criar registro de mês excluído
  await prisma.mesExcluido.create({
    data: {
      gastoProvisionadoId: transacao.gastoProvisionadoId,
      mes: transacao.mes,
      ano: transacao.ano
    }
  });

  // Deletar a transação
  await prisma.transacao.delete({
    where: { id: transacaoId }
  });

  revalidatePath('/transacoes');
  
  return { sucesso: true };
}

// Buscar gastos provisionados ativos
export async function getGastosProvisionadosAtivos() {
  return await prisma.gastoProvisionado.findMany({
    where: { status: 'Ativo' },
    include: {
      conta: {
        include: { categoria: true }
      },
      contaBancaria: true,
      cartao: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

// ========== TRANSAÇÕES ==========

// Buscar transações de um mês específico
export async function getTransacoesMes(mes: number, ano: number) {
  return await prisma.transacao.findMany({
    where: {
      mes,
      ano,
      // NÃO mostrar transações que são de cartão de crédito (dentro de faturas)
      // Essas aparecem apenas na aba de cartões
      faturaCartaoId: null
    },
    include: {
      conta: {
        include: {
          categoria: true
        }
      },
      contaBancaria: true,
      cartao: true,
      caixinha: true,
      gastoProvisionado: true,
      faturaCartao: true,
      contaBancariaOrigem: true,
      contaBancariaDestino: true
    },
    orderBy: { data: 'desc' }
  });
}

// Criar transação manual
export async function createTransacao(formData: FormData) {
  const data = new Date(formData.get('data') as string);
  const descricao = formData.get('descricao') as string;
  const valor = parseFloat(formData.get('valor') as string);
  const tipo = formData.get('tipo') as string;
  const contaId = formData.get('contaId') as string || null;
  const formaPagamento = (formData.get('formaPagamento') as string) || null;
  const contaBancariaId = (formData.get('contaBancariaId') as string) || null;
  const cartaoId = (formData.get('cartaoId') as string) || null;
  const caixinhaId = (formData.get('caixinhaId') as string) || null;
  const observacao = (formData.get('observacao') as string) || null;
  const status = formData.get('status') as string;

  const novaTransacao = await prisma.transacao.create({
    data: {
      data,
      mes: data.getMonth() + 1,
      ano: data.getFullYear(),
      descricao,
      valor,
      tipo,
      contaId: contaId || undefined,
      formaPagamento: formaPagamento || undefined,
      contaBancariaId: contaBancariaId || undefined,
      cartaoId: cartaoId || undefined,
      observacao: observacao || undefined,
      status
    }
  });

  // Se criou já confirmada, processar saldos
  if (status === 'confirmado') {
    await processarSaldosConfirmacao(novaTransacao.id);
    
    // Se tem caixinha, criar transação de aporte/resgate automaticamente
    if (caixinhaId && contaBancariaId) {
      const caixinha = await prisma.caixinha.findUnique({ where: { id: caixinhaId } });
      
      if (caixinha) {
        if (tipo === 'receita') {
          // RECEITA: criar aporte (conta -> caixinha)
          const aporteTransacao = await prisma.transacao.create({
            data: {
              data,
              mes: data.getMonth() + 1,
              ano: data.getFullYear(),
              tipo: 'transferencia',
              descricao: `Aporte em ${caixinha.nome}`,
              valor,
              formaPagamento: 'transferencia_pix',
              contaBancariaOrigemId: contaBancariaId,
              caixinhaId: caixinhaId,
              status: 'confirmado',
              observacao: `Aporte referente a: ${descricao}`
            }
          });
          
          // Processar saldos do aporte
          await processarSaldosConfirmacao(aporteTransacao.id);
        } else if (tipo === 'despesa') {
          // DESPESA: criar resgate (caixinha -> conta)
          const resgateTransacao = await prisma.transacao.create({
            data: {
              data,
              mes: data.getMonth() + 1,
              ano: data.getFullYear(),
              tipo: 'transferencia',
              descricao: `Resgate de ${caixinha.nome}`,
              valor,
              formaPagamento: 'transferencia_pix',
              caixinhaId: caixinhaId,
              contaBancariaDestinoId: contaBancariaId,
              status: 'confirmado',
              observacao: `Resgate para pagamento de: ${descricao}`
            }
          });
          
          // Processar saldos do resgate
          await processarSaldosConfirmacao(resgateTransacao.id);
        }
      }
    }
  }

  revalidatePath('/transacoes');
}

// Atualizar transação
export async function updateTransacao(id: string, formData: FormData) {
  const transacaoAntiga = await prisma.transacao.findUnique({ where: { id } });
  if (!transacaoAntiga) throw new Error('Transação não encontrada');

  const data = new Date(formData.get('data') as string);
  const descricao = formData.get('descricao') as string;
  const valor = parseFloat(formData.get('valor') as string);
  const tipo = formData.get('tipo') as string;
  const contaId = (formData.get('contaId') as string) || null;
  const formaPagamento = (formData.get('formaPagamento') as string) || null;
  const contaBancariaId = (formData.get('contaBancariaId') as string) || null;
  const cartaoId = (formData.get('cartaoId') as string) || null;
  const caixinhaId = (formData.get('caixinhaId') as string) || null;
  const observacao = (formData.get('observacao') as string) || null;
  const status = formData.get('status') as string;

  // Se estava confirmada e mudou algo, reverter saldos
  if (transacaoAntiga.status === 'confirmado') {
    await reverterSaldosTransacao(id);
  }

  await prisma.transacao.update({
    where: { id },
    data: {
      data,
      mes: data.getMonth() + 1,
      ano: data.getFullYear(),
      descricao,
      valor,
      tipo,
      contaId: contaId || undefined,
      formaPagamento: formaPagamento || undefined,
      contaBancariaId: contaBancariaId || undefined,
      cartaoId: cartaoId || undefined,
      caixinhaId: caixinhaId || undefined,
      observacao: observacao || undefined,
      status
    }
  });

  // Se ficou confirmada, processar novamente
  if (status === 'confirmado') {
    await processarSaldosConfirmacao(id);
  }

  revalidatePath('/transacoes');
}

// Confirmar transação (mudar status para confirmado e processar saldos)
export async function confirmarTransacao(
  id: string, 
  valorReal?: number, 
  caixinhaId?: string,
  formaPagamento?: string,
  contaBancariaId?: string,
  cartaoId?: string
) {
  const transacao = await prisma.transacao.findUnique({ where: { id } });
  if (!transacao) throw new Error('Transação não encontrada');

  // Se não passou caixinhaId mas tinha antes (buscar de aporte relacionado pendente)
  if (!caixinhaId && transacao.tipo === 'receita') {
    const aporteRelacionado = await prisma.transacao.findFirst({
      where: {
        tipo: 'transferencia',
        contaBancariaOrigemId: transacao.contaBancariaId,
        caixinhaId: { not: null },
        observacao: { contains: transacao.descricao },
        status: 'pendente'
      }
    });
    
    if (aporteRelacionado) {
      caixinhaId = aporteRelacionado.caixinhaId!;
    }
  }

  // Se já estava confirmado, reverter saldos primeiro
  if (transacao.status === 'confirmado') {
    await reverterSaldosTransacao(id);
  }

  // Atualizar status, valor, forma de pagamento e relacionamentos
  const dataToUpdate: {
    status: string;
    valor: number;
    caixinhaId?: string | null;
    formaPagamento?: string;
    contaBancariaId?: string | null;
    cartaoId?: string | null;
  } = {
    status: 'confirmado',
    valor: valorReal !== undefined ? valorReal : transacao.valor
  };

  // Atualizar forma de pagamento se fornecido
  if (formaPagamento) {
    dataToUpdate.formaPagamento = formaPagamento;
  }

  // Atualizar conta bancária se fornecido
  if (contaBancariaId !== undefined) {
    dataToUpdate.contaBancariaId = contaBancariaId || null;
  }

  // Atualizar cartão se fornecido
  if (cartaoId !== undefined) {
    dataToUpdate.cartaoId = cartaoId || null;
  }

  // Só atualizar caixinhaId se foi fornecido um valor válido e a caixinha existe
  if (caixinhaId && caixinhaId.trim() !== '') {
    const caixinhaExiste = await prisma.caixinha.findUnique({ 
      where: { id: caixinhaId } 
    });
    
    if (caixinhaExiste) {
      dataToUpdate.caixinhaId = caixinhaId;
    }
  } else {
    // Limpar caixinha se não foi selecionada
    dataToUpdate.caixinhaId = null;
  }

  await prisma.transacao.update({
    where: { id },
    data: dataToUpdate
  });

  // Usar os valores atualizados para processar saldos
  const valorFinal = valorReal !== undefined ? valorReal : transacao.valor;
  const contaFinal = contaBancariaId !== undefined ? contaBancariaId : transacao.contaBancariaId;

  // Processar saldos da transação principal
  if (transacao.tipo === 'receita' && contaFinal) {
    // Receita: creditar na conta
    const conta = await prisma.contaBancaria.findUnique({ where: { id: contaFinal } });
    if (conta) {
      await prisma.contaBancaria.update({
        where: { id: contaFinal },
        data: { saldo: conta.saldo + valorFinal }
      });
    }
  } else if (transacao.tipo === 'despesa' && contaFinal) {
    // Despesa: debitar da conta
    const conta = await prisma.contaBancaria.findUnique({ where: { id: contaFinal } });
    if (conta) {
      await prisma.contaBancaria.update({
        where: { id: contaFinal },
        data: { saldo: conta.saldo - valorFinal }
      });
    }
  }

  // Se tem caixinha, criar transação de aporte/resgate
  if (caixinhaId && contaFinal) {
    const caixinha = await prisma.caixinha.findUnique({ where: { id: caixinhaId } });
    
    if (caixinha) {
      if (transacao.tipo === 'receita') {
        // RECEITA: criar aporte (conta -> caixinha)
        await prisma.transacao.create({
          data: {
            data: transacao.data,
            mes: transacao.mes,
            ano: transacao.ano,
            tipo: 'transferencia',
            descricao: `Aporte em ${caixinha.nome}`,
            valor: valorFinal,
            formaPagamento: 'transferencia_pix',
            contaBancariaOrigemId: contaFinal,
            caixinhaId: caixinhaId,
            status: 'confirmado',
            observacao: `Aporte referente a: ${transacao.descricao}`
          }
        });
        
        // Debitar conta e creditar caixinha
        const conta = await prisma.contaBancaria.findUnique({ where: { id: contaFinal } });
        if (conta) {
          await prisma.contaBancaria.update({
            where: { id: contaFinal },
            data: { saldo: conta.saldo - valorFinal }
          });
        }
        
        await prisma.caixinha.update({
          where: { id: caixinhaId },
          data: { saldo: caixinha.saldo + valorFinal }
        });
      } else if (transacao.tipo === 'despesa') {
        // DESPESA: criar resgate (caixinha -> conta)
        await prisma.transacao.create({
          data: {
            data: transacao.data,
            mes: transacao.mes,
            ano: transacao.ano,
            tipo: 'transferencia',
            descricao: `Resgate de ${caixinha.nome}`,
            valor: valorFinal,
            formaPagamento: 'transferencia_pix',
            caixinhaId: caixinhaId,
            contaBancariaDestinoId: contaFinal,
            status: 'confirmado',
            observacao: `Resgate para pagamento de: ${transacao.descricao}`
          }
        });
        
        // Debitar caixinha e creditar conta
        await prisma.caixinha.update({
          where: { id: caixinhaId },
          data: { saldo: caixinha.saldo - valorFinal }
        });
        
        const conta = await prisma.contaBancaria.findUnique({ where: { id: contaFinal } });
        if (conta) {
          await prisma.contaBancaria.update({
            where: { id: contaFinal },
            data: { saldo: conta.saldo + valorFinal }
          });
        }
      }
    }
  }

  revalidatePath('/transacoes');
}

// Desconfirmar transação (voltar para pendente e reverter saldos)
export async function desconfirmarTransacao(id: string) {
  const transacao = await prisma.transacao.findUnique({
    where: { id },
    include: {
      contaBancaria: true,
      caixinha: true
    }
  });
  
  if (!transacao || transacao.status !== 'confirmado') return;

  // Se tinha caixinha vinculada, buscar e excluir transações de aporte/resgate relacionadas
  if (transacao.caixinhaId && transacao.tipo !== 'transferencia') {
    // Buscar transações de transferência (aporte ou resgate) criadas para esta transação
    const transacoesRelacionadas = await prisma.transacao.findMany({
      where: {
        caixinhaId: transacao.caixinhaId,
        tipo: 'transferencia',
        data: transacao.data,
        mes: transacao.mes,
        ano: transacao.ano,
        OR: [
          { descricao: { contains: 'Aporte' } },
          { descricao: { contains: 'Resgate' } }
        ],
        observacao: { contains: transacao.descricao }
      }
    });

    // Reverter e excluir as transações relacionadas
    for (const tr of transacoesRelacionadas) {
      if (tr.status === 'confirmado') {
        await reverterSaldosTransacao(tr.id);
      }
      await prisma.transacao.delete({ where: { id: tr.id } });
    }
  }

  // Reverter saldos da transação principal
  if (transacao.tipo === 'receita' && transacao.contaBancariaId) {
    const conta = await prisma.contaBancaria.findUnique({ where: { id: transacao.contaBancariaId } });
    if (conta) {
      await prisma.contaBancaria.update({
        where: { id: transacao.contaBancariaId },
        data: { saldo: conta.saldo - transacao.valor }
      });
    }
  } else if (transacao.tipo === 'despesa' && transacao.contaBancariaId) {
    const conta = await prisma.contaBancaria.findUnique({ where: { id: transacao.contaBancariaId } });
    if (conta) {
      await prisma.contaBancaria.update({
        where: { id: transacao.contaBancariaId },
        data: { saldo: conta.saldo + transacao.valor }
      });
    }
  } else if (transacao.tipo === 'transferencia') {
    // Reverter transferência/aporte/resgate
    if (transacao.contaBancariaOrigemId && transacao.caixinhaId) {
      // Aporte: devolver pra conta, tirar da caixinha
      const origem = await prisma.contaBancaria.findUnique({ where: { id: transacao.contaBancariaOrigemId } });
      const caixinha = await prisma.caixinha.findUnique({ where: { id: transacao.caixinhaId } });
      
      if (origem) {
        await prisma.contaBancaria.update({
          where: { id: transacao.contaBancariaOrigemId },
          data: { saldo: origem.saldo + transacao.valor }
        });
      }
      
      if (caixinha) {
        await prisma.caixinha.update({
          where: { id: transacao.caixinhaId },
          data: { saldo: caixinha.saldo - transacao.valor }
        });
      }
    } else if (transacao.contaBancariaDestinoId && transacao.caixinhaId) {
      // Resgate: devolver pra caixinha, tirar da conta
      const destino = await prisma.contaBancaria.findUnique({ where: { id: transacao.contaBancariaDestinoId } });
      const caixinha = await prisma.caixinha.findUnique({ where: { id: transacao.caixinhaId } });
      
      if (caixinha) {
        await prisma.caixinha.update({
          where: { id: transacao.caixinhaId },
          data: { saldo: caixinha.saldo + transacao.valor }
        });
      }
      
      if (destino) {
        await prisma.contaBancaria.update({
          where: { id: transacao.contaBancariaDestinoId },
          data: { saldo: destino.saldo - transacao.valor }
        });
      }
    }
  }

  // Atualizar status
  await prisma.transacao.update({
    where: { id },
    data: { status: 'pendente' }
  });

  revalidatePath('/transacoes');
}

// Excluir transação
export async function deleteTransacao(id: string) {
  const transacao = await prisma.transacao.findUnique({ where: { id } });
  
  if (!transacao) return;

  // Se tinha caixinha vinculada, buscar e excluir transações de aporte/resgate relacionadas
  if (transacao.caixinhaId && transacao.tipo !== 'transferencia') {
    // Buscar transações de transferência (aporte ou resgate) criadas para esta transação
    const transacoesRelacionadas = await prisma.transacao.findMany({
      where: {
        caixinhaId: transacao.caixinhaId,
        tipo: 'transferencia',
        data: transacao.data,
        mes: transacao.mes,
        ano: transacao.ano,
        OR: [
          { descricao: { contains: 'Aporte' } },
          { descricao: { contains: 'Resgate' } }
        ],
        observacao: { contains: transacao.descricao }
      }
    });

    // Reverter e excluir as transações relacionadas
    for (const tr of transacoesRelacionadas) {
      if (tr.status === 'confirmado') {
        await reverterSaldosTransacao(tr.id);
      }
      await prisma.transacao.delete({ where: { id: tr.id } });
    }
  }

  // Se for transação provisionada, marcar mês como excluído
  if (transacao.gastoProvisionadoId) {
    // Verificar se já existe o mês excluído
    const mesExcluidoExistente = await prisma.mesExcluido.findUnique({
      where: {
        gastoProvisionadoId_mes_ano: {
          gastoProvisionadoId: transacao.gastoProvisionadoId,
          mes: transacao.mes,
          ano: transacao.ano
        }
      }
    });

    // Criar registro de mês excluído se não existir
    if (!mesExcluidoExistente) {
      await prisma.mesExcluido.create({
        data: {
          gastoProvisionadoId: transacao.gastoProvisionadoId,
          mes: transacao.mes,
          ano: transacao.ano
        }
      });
    }
  }
  
  // Se estava confirmada, reverter saldos usando a função padronizada
  if (transacao.status === 'confirmado') {
    await reverterSaldosTransacao(id);
  }

  await prisma.transacao.delete({
    where: { id }
  });

  revalidatePath('/transacoes');
}

// ========== HELPERS DE SALDO ==========

async function processarSaldosConfirmacao(transacaoId: string) {
  const transacao = await prisma.transacao.findUnique({
    where: { id: transacaoId },
    include: {
      contaBancaria: true,
      caixinha: true,
      contaBancariaOrigem: true,
      contaBancariaDestino: true
    }
  });

  if (!transacao || transacao.status !== 'confirmado') return;

  // Transação normal com conta bancária
  if (transacao.contaBancariaId && !transacao.contaBancariaOrigemId && !transacao.contaBancariaDestinoId) {
    const contaBancaria = await prisma.contaBancaria.findUnique({
      where: { id: transacao.contaBancariaId }
    });
    if (!contaBancaria) return;

    const saldoAnterior = contaBancaria.saldo;
    let valorMovimento = 0;
    
    if (transacao.tipo === 'receita') {
      valorMovimento = transacao.valor; // Positivo = crédito
    } else if (transacao.tipo === 'despesa') {
      valorMovimento = -transacao.valor; // Negativo = débito
    }

    const novoSaldo = await registrarLancamentoExtrato({
      contaBancariaId: transacao.contaBancariaId,
      transacaoId: transacao.id,
      descricao: transacao.descricao,
      saldoAnterior,
      valorMovimento,
      tipo: transacao.tipo,
      data: transacao.data
    });

    await prisma.contaBancaria.update({
      where: { id: transacao.contaBancariaId },
      data: { saldo: novoSaldo }
    });
  }

  // Transferência entre contas bancárias
  if (transacao.contaBancariaOrigemId && transacao.contaBancariaDestinoId) {
    // Debitar origem
    const origem = await prisma.contaBancaria.findUnique({
      where: { id: transacao.contaBancariaOrigemId }
    });
    if (origem) {
      const novoSaldoOrigem = await registrarLancamentoExtrato({
        contaBancariaId: transacao.contaBancariaOrigemId,
        transacaoId: transacao.id,
        descricao: `Transferência para ${transacao.caixinhaId ? 'caixinha' : 'conta'}: ${transacao.descricao}`,
        saldoAnterior: origem.saldo,
        valorMovimento: -transacao.valor, // Débito
        tipo: 'transferencia_saida',
        data: transacao.data
      });

      await prisma.contaBancaria.update({
        where: { id: transacao.contaBancariaOrigemId },
        data: { saldo: novoSaldoOrigem }
      });
    }

    // Creditar destino (se não for caixinha)
    if (!transacao.caixinhaId) {
      const destino = await prisma.contaBancaria.findUnique({
        where: { id: transacao.contaBancariaDestinoId }
      });
      if (destino) {
        const novoSaldoDestino = await registrarLancamentoExtrato({
          contaBancariaId: transacao.contaBancariaDestinoId,
          transacaoId: transacao.id,
          descricao: `Transferência de conta: ${transacao.descricao}`,
          saldoAnterior: destino.saldo,
          valorMovimento: transacao.valor, // Crédito
          tipo: 'transferencia_entrada',
          data: transacao.data
        });

        await prisma.contaBancaria.update({
          where: { id: transacao.contaBancariaDestinoId },
          data: { saldo: novoSaldoDestino }
        });
      }
    }
  }

  // Caixinha - registrar no extrato da caixinha
  if (transacao.caixinhaId && transacao.contaBancariaOrigemId && !transacao.contaBancariaDestinoId) {
    // É um aporte - debitar origem e creditar caixinha
    
    // Debitar conta origem
    const origem = await prisma.contaBancaria.findUnique({
      where: { id: transacao.contaBancariaOrigemId }
    });
    if (origem) {
      const novoSaldoOrigem = await registrarLancamentoExtrato({
        contaBancariaId: transacao.contaBancariaOrigemId,
        transacaoId: transacao.id,
        descricao: `Aporte em caixinha: ${transacao.descricao}`,
        saldoAnterior: origem.saldo,
        valorMovimento: -transacao.valor, // Débito
        tipo: 'transferencia_saida',
        data: transacao.data
      });

      await prisma.contaBancaria.update({
        where: { id: transacao.contaBancariaOrigemId },
        data: { saldo: novoSaldoOrigem }
      });
    }
    
    // Creditar caixinha
    const caixinha = await prisma.caixinha.findUnique({
      where: { id: transacao.caixinhaId }
    });
    if (caixinha) {
      const novoSaldoCaixinha = await registrarLancamentoExtrato({
        caixinhaId: transacao.caixinhaId,
        transacaoId: transacao.id,
        descricao: `Aporte: ${transacao.descricao}`,
        saldoAnterior: caixinha.saldo,
        valorMovimento: transacao.valor, // Crédito
        tipo: 'aporte',
        data: transacao.data
      });

      await prisma.caixinha.update({
        where: { id: transacao.caixinhaId },
        data: { saldo: novoSaldoCaixinha }
      });
    }
  } else if (transacao.caixinhaId && transacao.contaBancariaDestinoId && !transacao.contaBancariaOrigemId) {
    // É um resgate - debitar da caixinha
    const caixinha = await prisma.caixinha.findUnique({
      where: { id: transacao.caixinhaId }
    });
    if (caixinha) {
      const novoSaldoCaixinha = await registrarLancamentoExtrato({
        caixinhaId: transacao.caixinhaId,
        transacaoId: transacao.id,
        descricao: `Resgate: ${transacao.descricao}`,
        saldoAnterior: caixinha.saldo,
        valorMovimento: -transacao.valor, // Débito
        tipo: 'resgate',
        data: transacao.data
      });

      await prisma.caixinha.update({
        where: { id: transacao.caixinhaId },
        data: { saldo: novoSaldoCaixinha }
      });

      // Creditar na conta de destino
      const destino = await prisma.contaBancaria.findUnique({
        where: { id: transacao.contaBancariaDestinoId }
      });
      if (destino) {
        const novoSaldoDestino = await registrarLancamentoExtrato({
          contaBancariaId: transacao.contaBancariaDestinoId,
          transacaoId: transacao.id,
          descricao: `Resgate de caixinha: ${transacao.descricao}`,
          saldoAnterior: destino.saldo,
          valorMovimento: transacao.valor, // Crédito
          tipo: 'transferencia_entrada',
          data: transacao.data
        });

        await prisma.contaBancaria.update({
          where: { id: transacao.contaBancariaDestinoId },
          data: { saldo: novoSaldoDestino }
        });
      }
    }
  }
}

async function reverterSaldosTransacao(transacaoId: string) {
  const transacao = await prisma.transacao.findUnique({
    where: { id: transacaoId }
  });

  if (!transacao || transacao.status !== 'confirmado') return;

  // Transação normal com conta bancária
  if (transacao.contaBancariaId && !transacao.contaBancariaOrigemId && !transacao.contaBancariaDestinoId) {
    const contaBancaria = await prisma.contaBancaria.findUnique({
      where: { id: transacao.contaBancariaId }
    });
    if (!contaBancaria) return;

    const saldoAnterior = contaBancaria.saldo;
    let valorMovimento = 0;
    
    // Reverter: o que foi creditado volta a debitar e vice-versa
    if (transacao.tipo === 'receita') {
      valorMovimento = -transacao.valor; // Débito (reverter receita)
    } else if (transacao.tipo === 'despesa') {
      valorMovimento = transacao.valor; // Crédito (reverter despesa)
    }

    const novoSaldo = await registrarLancamentoExtrato({
      contaBancariaId: transacao.contaBancariaId,
      transacaoId: transacao.id,
      descricao: `[REVERSÃO] ${transacao.descricao}`,
      saldoAnterior,
      valorMovimento,
      tipo: transacao.tipo,
      data: new Date() // Data atual da reversão
    });

    await prisma.contaBancaria.update({
      where: { id: transacao.contaBancariaId },
      data: { saldo: novoSaldo }
    });
  }

  // Transferência entre contas bancárias
  if (transacao.contaBancariaOrigemId && transacao.contaBancariaDestinoId) {
    // Reverter débito da origem (creditar de volta)
    const origem = await prisma.contaBancaria.findUnique({
      where: { id: transacao.contaBancariaOrigemId }
    });
    if (origem) {
      const novoSaldoOrigem = await registrarLancamentoExtrato({
        contaBancariaId: transacao.contaBancariaOrigemId,
        transacaoId: transacao.id,
        descricao: `[REVERSÃO] Transferência para ${transacao.caixinhaId ? 'caixinha' : 'conta'}: ${transacao.descricao}`,
        saldoAnterior: origem.saldo,
        valorMovimento: transacao.valor, // Crédito (reverter débito)
        tipo: 'transferencia_saida',
        data: new Date()
      });

      await prisma.contaBancaria.update({
        where: { id: transacao.contaBancariaOrigemId },
        data: { saldo: novoSaldoOrigem }
      });
    }

    // Reverter crédito no destino (debitar de volta)
    if (!transacao.caixinhaId) {
      const destino = await prisma.contaBancaria.findUnique({
        where: { id: transacao.contaBancariaDestinoId }
      });
      if (destino) {
        const novoSaldoDestino = await registrarLancamentoExtrato({
          contaBancariaId: transacao.contaBancariaDestinoId,
          transacaoId: transacao.id,
          descricao: `[REVERSÃO] Transferência de conta: ${transacao.descricao}`,
          saldoAnterior: destino.saldo,
          valorMovimento: -transacao.valor, // Débito (reverter crédito)
          tipo: 'transferencia_entrada',
          data: new Date()
        });

        await prisma.contaBancaria.update({
          where: { id: transacao.contaBancariaDestinoId },
          data: { saldo: novoSaldoDestino }
        });
      }
    }
  }

  // Caixinha - reverter se necessário
  if (transacao.caixinhaId) {
    const caixinha = await prisma.caixinha.findUnique({
      where: { id: transacao.caixinhaId }
    });
    if (!caixinha) return;

    // Se tem origem, é aporte (reverter: debitar da caixinha)
    if (transacao.contaBancariaOrigemId) {
      const novoSaldoCaixinha = await registrarLancamentoExtrato({
        caixinhaId: transacao.caixinhaId,
        transacaoId: transacao.id,
        descricao: `[REVERSÃO] Aporte: ${transacao.descricao}`,
        saldoAnterior: caixinha.saldo,
        valorMovimento: -transacao.valor, // Débito (reverter aporte)
        tipo: 'aporte',
        data: new Date()
      });

      await prisma.caixinha.update({
        where: { id: transacao.caixinhaId },
        data: { saldo: novoSaldoCaixinha }
      });
    }
    // Se tem destino, é resgate (reverter: creditar na caixinha)
    else if (transacao.contaBancariaDestinoId) {
      const novoSaldoCaixinha = await registrarLancamentoExtrato({
        caixinhaId: transacao.caixinhaId,
        transacaoId: transacao.id,
        descricao: `[REVERSÃO] Resgate: ${transacao.descricao}`,
        saldoAnterior: caixinha.saldo,
        valorMovimento: transacao.valor, // Crédito (reverter resgate)
        tipo: 'resgate',
        data: new Date()
      });

      await prisma.caixinha.update({
        where: { id: transacao.caixinhaId },
        data: { saldo: novoSaldoCaixinha }
      });

      // Reverter crédito na conta de destino (debitar de volta)
      const destino = await prisma.contaBancaria.findUnique({
        where: { id: transacao.contaBancariaDestinoId }
      });
      if (destino) {
        const novoSaldoDestino = await registrarLancamentoExtrato({
          contaBancariaId: transacao.contaBancariaDestinoId,
          transacaoId: transacao.id,
          descricao: `[REVERSÃO] Resgate de caixinha: ${transacao.descricao}`,
          saldoAnterior: destino.saldo,
          valorMovimento: -transacao.valor, // Débito (reverter crédito)
          tipo: 'transferencia_entrada',
          data: new Date()
        });

        await prisma.contaBancaria.update({
          where: { id: transacao.contaBancariaDestinoId },
          data: { saldo: novoSaldoDestino }
        });
      }
    }
  }
}

// Confirmar gasto provisionado (criar transação real)
export async function confirmarGastoProvisionado(
  gastoProvisionadoId: string,
  data: Date,
  valorReal: number,
  caixinhaId?: string
) {
  const gasto = await prisma.gastoProvisionado.findUnique({
    where: { id: gastoProvisionadoId },
    include: { conta: true }
  });

  if (!gasto) throw new Error('Gasto provisionado não encontrado');

  const novaTransacao = await prisma.transacao.create({
    data: {
      data,
      mes: data.getMonth() + 1,
      ano: data.getFullYear(),
      descricao: gasto.conta.nome,
      valor: valorReal,
      tipo: 'despesa',
      contaId: gasto.contaId,
      formaPagamento: gasto.formaPagamento,
      contaBancariaId: gasto.contaBancariaId,
      cartaoId: gasto.cartaoId,
      caixinhaId: caixinhaId || null,
      valorEsperado: gasto.valorEsperado,
      gastoProvisionadoId: gasto.id,
      observacao: gasto.observacao,
      status: 'confirmado'
    }
  });

  // Processar saldos pois foi criada já confirmada
  await processarSaldosConfirmacao(novaTransacao.id);

  revalidatePath('/transacoes');
}

// Criar transferência entre contas bancárias
export async function createTransferencia(formData: FormData) {
  const data = new Date(formData.get('data') as string);
  const valor = parseFloat(formData.get('valor') as string);
  const contaBancariaOrigemId = formData.get('contaBancariaOrigemId') as string;
  const contaBancariaDestinoId = formData.get('contaBancariaDestinoId') as string;
  const observacao = formData.get('observacao') as string || null;

  const origem = await prisma.contaBancaria.findUnique({ where: { id: contaBancariaOrigemId } });
  const destino = await prisma.contaBancaria.findUnique({ where: { id: contaBancariaDestinoId } });

  await prisma.transacao.create({
    data: {
      data,
      mes: data.getMonth() + 1,
      ano: data.getFullYear(),
      descricao: `Transferência ${origem?.nomeConta} → ${destino?.nomeConta}`,
      valor,
      tipo: 'transferencia',
      contaBancariaOrigemId,
      contaBancariaDestinoId,
      observacao,
      status: 'confirmado'
    }
  });

  revalidatePath('/transacoes');
}

// ========== FATURAS DE CARTÃO ==========

// Buscar faturas de um mês específico
export async function getFaturasMes(mes: number, ano: number) {
  // Buscar todos os cartões ativos
  const cartoesAtivos = await prisma.cartao.findMany({
    where: { status: 'Ativo' }
  });

  // Criar faturas para todos os cartões (se não existirem)
  for (const cartao of cartoesAtivos) {
    await getOrCreateFatura(cartao.id, mes, ano);
  }

  // Retornar todas as faturas do mês
  return await prisma.faturaCartao.findMany({
    where: {
      mes,
      ano
    },
    include: {
      cartao: {
        include: {
          contaBancaria: true
        }
      },
      transacoes: {
        include: {
          conta: {
            include: {
              categoria: true
            }
          }
        }
      },
      contaBancariaPagto: true
    },
    orderBy: { dataVencimento: 'asc' }
  });
}

// Criar ou buscar fatura do cartão (criada automaticamente ao lançar despesa no cartão)
export async function getOrCreateFatura(cartaoId: string, mes: number, ano: number) {
  const cartao = await prisma.cartao.findUnique({ where: { id: cartaoId } });
  if (!cartao) throw new Error('Cartão não encontrado');

  // Calcular datas de fechamento e vencimento
  const dataFechamento = new Date(ano, mes - 1, cartao.diaFechamento || 10);
  const dataVencimento = new Date(ano, mes - 1, cartao.diaVencimento || 15);

  let fatura = await prisma.faturaCartao.findUnique({
    where: {
      cartaoId_mes_ano: { cartaoId, mes, ano }
    }
  });

  if (!fatura) {
    fatura = await prisma.faturaCartao.create({
      data: {
        cartaoId,
        mes,
        ano,
        dataFechamento,
        dataVencimento,
        status: 'aberta'
      }
    });
  }

  return fatura;
}

// Pagar fatura de cartão
export async function pagarFatura(faturaId: string, contaBancariaPagtoId: string, dataPagamento: Date) {
  await prisma.faturaCartao.update({
    where: { id: faturaId },
    data: {
      status: 'paga',
      dataPagamento,
      contaBancariaPagtoId
    }
  });

  revalidatePath('/transacoes');
}

// Helpers
export async function getCaixinhasByContaBancaria(contaBancariaId: string) {
  return await prisma.caixinha.findMany({
    where: {
      contaBancariaId,
      status: 'Ativo'
    },
    orderBy: { nome: 'asc' }
  });
}

// ========== OPERAÇÕES DE CAIXINHA ==========

export async function aportarCaixinha(caixinhaId: string, valor: number) {
  const caixinha = await prisma.caixinha.findUnique({
    where: { id: caixinhaId },
    include: { contaBancaria: true }
  });

  if (!caixinha) {
    throw new Error('Caixinha não encontrada');
  }

  // Criar transferência: Conta Bancária -> Caixinha
  const dataAtual = new Date();
  await prisma.transacao.create({
    data: {
      data: dataAtual,
      mes: dataAtual.getMonth() + 1,
      ano: dataAtual.getFullYear(),
      tipo: 'transferencia',
      descricao: `Aporte em ${caixinha.nome}`,
      valor,
      formaPagamento: 'transferencia_pix',
      contaBancariaOrigemId: caixinha.contaBancariaId,
      caixinhaId: caixinhaId,
      status: 'confirmado',
      observacao: 'Aporte em caixinha'
    }
  });

  // Atualizar saldo da caixinha
  await prisma.caixinha.update({
    where: { id: caixinhaId },
    data: {
      saldo: {
        increment: valor
      }
    }
  });

  // Debitar da conta bancária de origem
  const contaBancaria = await prisma.contaBancaria.findUnique({
    where: { id: caixinha.contaBancariaId }
  });
  if (contaBancaria) {
    await prisma.contaBancaria.update({
      where: { id: caixinha.contaBancariaId },
      data: { saldo: contaBancaria.saldo - valor }
    });
  }

  revalidatePath('/transacoes');
  revalidatePath('/cadastros');
}

export async function resgatarCaixinha(caixinhaId: string, valor: number) {
  const caixinha = await prisma.caixinha.findUnique({
    where: { id: caixinhaId },
    include: { contaBancaria: true }
  });

  if (!caixinha) {
    throw new Error('Caixinha não encontrada');
  }  

  // Criar transferência: Caixinha -> Conta Bancária
  const dataAtual = new Date();
  await prisma.transacao.create({
    data: {
      data: dataAtual,
      mes: dataAtual.getMonth() + 1,
      ano: dataAtual.getFullYear(),
      tipo: 'transferencia',
      descricao: `Resgate de ${caixinha.nome}`,
      valor,
      formaPagamento: 'transferencia_pix',
      caixinhaId: caixinhaId,
      contaBancariaDestinoId: caixinha.contaBancariaId,
      status: 'confirmado',
      observacao: 'Resgate de caixinha'
    }
  });

  // Atualizar saldo da caixinha
  await prisma.caixinha.update({
    where: { id: caixinhaId },
    data: {
      saldo: {
        decrement: valor
      }
    }
  });

  // Creditar na conta bancária de destino
  const contaBancaria = await prisma.contaBancaria.findUnique({
    where: { id: caixinha.contaBancariaId }
  });
  if (contaBancaria) {
    await prisma.contaBancaria.update({
      where: { id: caixinha.contaBancariaId },
      data: { saldo: contaBancaria.saldo + valor }
    });
  }

  revalidatePath('/transacoes');
  revalidatePath('/cadastros');
}
