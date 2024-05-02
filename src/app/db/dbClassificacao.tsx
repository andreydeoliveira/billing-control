'use server'

import { Classificacao } from "@prisma/client";
import prisma from "@/db/prisma"

export async function deleteClassificacao(idRef: string) {
    await prisma.classificacao.deleteMany({
        where: {
            id: idRef
        }
    });
}

export async function insertClassificacao(name: any, obs: any) {

    await prisma.classificacao.create({
        data: {
            name: name,
            observacao: obs
        }
    });

    return getFullClassificacao();
}

export async function updateClassificacao(idParam: any, nameParam: any, obsParam: any) {

    await prisma.classificacao.update({
        where: {
            id: idParam
        },
        data: {
            name: nameParam,
            observacao: obsParam,
        }
    });

    return getFullClassificacao();
}

export async function getFullClassificacao(): Promise<Classificacao[]> {
    return await prisma.classificacao.findMany();
}