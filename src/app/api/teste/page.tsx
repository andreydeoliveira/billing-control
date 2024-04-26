import { PrismaClient } from "@prisma/client";

export default async function Page() {
    
    const prisma = new PrismaClient();   
    const classificacao = await prisma.classificacao.findMany();

    await prisma.classificacao.create({
        data: {
            name: 'name2',
            observacao: 'obs'
        }
    });

    return (

        <>
        {classificacao.map((valor) => (
            <div>{valor.name}</div>
        ))}
        <div>oi</div>
        <div>{classificacao.length}</div>
        </>

        
        
        


    )
}