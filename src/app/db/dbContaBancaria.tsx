'use server'

import prisma from "./prisma";

export async function getFullContaBancaria() {
    return await prisma.contaBancaria.findMany();
}


export async function deleteContabancaria(idRef: string) {
    await prisma.contaBancaria.deleteMany({
        where: {
            id: idRef
        }
    });
}

export async function insertContaBancaria(nameParam: any) {

    await prisma.contaBancaria.create({
        data: {
            name: nameParam
        }
    });

    return getFullContaBancaria();
}

export async function updateContaBancaria(idParam: any, nameParam: any) {

    await prisma.contaBancaria.update({
        where: {
            id: idParam
        },
        data: {
            name: nameParam
        }
    });

    return getFullContaBancaria();
}
