import { Table, TableContainer } from "@chakra-ui/react";
import prisma from "../../../db/prisma";
import TdClient from "./tableClient";



export default async function Classificacao() {

 
  // Função para atualizar os dados da tabela
  const updateTableData = async () => {
    'use server'
    const newData = await prisma.classificacao.findMany();
    return newData;
  };

  const deleteData = async (idRef :string) => {
    'use server'
    await prisma.classificacao.deleteMany({
      where: {
        id: idRef
      }
    })
  }

   

    return (
        <>
      <TableContainer>
        <Table variant="striped" colorScheme="teal">
          <TdClient classificacao={await prisma.classificacao.findMany()} deleteData={deleteData} updateData={updateTableData} />
        </Table>
      </TableContainer>
    </>
  );
    
}