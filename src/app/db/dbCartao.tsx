
'use server'

import prisma from "@/db/prisma"

export async function deleteCartao(idRef: string) {
    await prisma.cartao.deleteMany({
        where: {
            id: idRef,
        }
    });
}

export async function insertCartao(name: any) {

    await prisma.cartao.create({
        data: {
            name: name,
        }
    });

    return getFullCartao();
}

export async function updateCartao(idParam: any, nameParam: any) {

    await prisma.cartao.update({
        where: {
            id: idParam
        },
        data: {
            name: nameParam,
        }
    });

    return getFullCartao();
}

export async function getFullCartao() {
    return await prisma.cartao.findMany();
}