'use server'

import prisma from "./prisma";

export async function getFullConta() {
    return await prisma.conta.findMany({
        include: {
            classificacao: {
                select: {
                    name: true
                }
            }
        }
    });
}


export async function deleteConta(idRef: string) {
    await prisma.conta.deleteMany({
        where: {
            id: idRef
        }
    });
}

export async function insertConta(nameParam: any, obsParam: any, idClassificacaoParam: any) {

    await prisma.conta.create({
        data: {
            name: nameParam,
            observacao: obsParam,
            classificacaoId: idClassificacaoParam
        }
    });

    return getFullConta();
}

export async function updateConta(idParam: any, nameParam: any, obsParam: any, idClassificacaoParam: any) {

    await prisma.conta.update({
        where: {
            id: idParam
        },
        data: {
            name: nameParam,
            observacao: obsParam,
            classificacaoId: idClassificacaoParam,
        }
    });

    return getFullConta();
}
