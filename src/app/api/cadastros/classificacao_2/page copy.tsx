
import {
    Table,
    Thead,
    Tbody,
    Tfoot,
    Tr,
    Th,
    Td,
    TableCaption,
    TableContainer,
} from '@chakra-ui/react'

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

export default async function Classificacao() {

    

    const classific = await prisma.classificacao.findMany();

    return (        

        <TableContainer>
            <Table variant='striped' colorScheme='teal'>
                <TableCaption>oi to metric conversion factors</TableCaption>
                <Thead>
                    <Tr>
                        <Td isNumeric>id</Td>
                        <Th>Conta</Th>
                        <Th>Observação</Th>
                        <Th>Criação</Th>                        
                        <Th>Data Alteração</Th>
                    </Tr>
                </Thead>
                <Tbody>



                    {classific.map((valor, index) => {
                       
                        return (
                        <Tr key={index}>
                            <Td>{index+1}</Td>
                            <Td>{valor.name}</Td>
                            <Td>{valor.observacao}</Td>
                            <Td>{new Date(valor.datacriacao).toLocaleDateString()}</Td>
                            <Td>{new Date(valor.dataatualizacao).toLocaleDateString()}</Td>
                        </Tr>

                    )})}




                </Tbody>
               {/* <Tfoot>
                    <Tr>
                        <Th>Conta</Th>
                        <Th>Observação</Th>
                        <Th>Criação</Th>
                        <Th>Data Alteração</Th>
                    </Tr>
                </Tfoot>*/}
            </Table>
        </TableContainer>

    )

}