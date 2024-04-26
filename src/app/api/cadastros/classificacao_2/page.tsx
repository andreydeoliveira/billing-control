import { PrismaClient } from "@prisma/client";
import Nav from './Nav'

const prisma = new PrismaClient();   
 
export default async function Classificacao() {

    
    const classificacao = await prisma.classificacao.findMany();
    //prisma.$disconnect;

    return (
        <Nav classificacao={classificacao}/>
    )

}

export async function Delete(key: string) {

    prisma.classificacao.deleteMany({
        where: { id: key }
    })

}

export async function Insert(nome: string, obs: string) {
    try {
        await prisma.classificacao.createMany({
            data: {
                name: nome,
                observacao: obs
            }
        });


        // Após inserir os dados, recarrega os registros
        return await GetClassificacoes();
    } catch () {
_
    }
}

// Função para obter as classificações atualizadas após uma inserção
export async function GetClassificacoes() {
    return await prisma.classificacao.findMany();
}
