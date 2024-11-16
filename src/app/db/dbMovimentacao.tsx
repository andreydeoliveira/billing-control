'use server'

import prisma from "./prisma";
import { Movimentacao as PrismaMovimentacao } from '@prisma/client'; // Ajuste conforme sua importação

interface Props {
    year: number;
    month: number;
}

export type MovimentacaoComContas = PrismaMovimentacao & {
    contaOrigem: {name: string} | null;
    contaDestino: {name: string} | null;
};

export async function getFullMovimentacao({ year, month }: Props): Promise<MovimentacaoComContas[]> { 
    return await prisma.movimentacao.findMany({
        include: {
            contaOrigem: {
                select: {
                    name: true
                }
            },
            contaDestino: {
                select: {
                    name: true
                }
            }
        },
        where: {
            diaPagamento: {
                gte: new Date(Date.UTC(year, month - 1, 1)), // Ajustado para garantir UTC
                lt: new Date(Date.UTC(year, month, 1)) // Ajustado para garantir UTC
            }
        }
    });
}
