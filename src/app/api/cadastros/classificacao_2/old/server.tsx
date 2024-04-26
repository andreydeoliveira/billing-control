import { Button, Td, Tr } from "@chakra-ui/react";
import { PrismaClient } from "@prisma/client";
import { MdDeleteForever } from "react-icons/md";

interface ClassificacaoProps {
    isLoading: boolean;
    handleClick: () => void;
}

export default async function Classificacao({ isLoading, handleClick }: ClassificacaoProps) {


    const prisma = await new PrismaClient();
    const classificacao = await prisma.classificacao.findMany();

    return (
        <>
            {classificacao.map((valor) => (
                <Tr>
                <Td>{valor.name}</Td>
                <Td>{valor.observacao}</Td>
                <Td>{valor.datacriacao.toISOString()}</Td>
                <Td width="1%">
                    <Button 
                    leftIcon={<MdDeleteForever />}   
                    isLoading={isLoading}
                    onClick={handleClick} // Passando a função de handleClick para o evento onClick do botão                  
                    loadingText='Loading'
                    colorScheme='teal'
                    variant='outline'
                    spinnerPlacement='end' 
                    >
                    Apagar
                    </Button>
                </Td>
                </Tr>

                ))}
        </>
    );
    
}