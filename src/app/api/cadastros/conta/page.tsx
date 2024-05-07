import { Table, TableContainer } from "@chakra-ui/react";
import TdClient from "./tableClient";
import { getFullConta } from "@/db/dbConta";
import { getFullClassificacao } from "@/db/dbClassificacao";

export default async function Classificacao() {

  const conta = await getFullConta();
  const classificacao = await getFullClassificacao()

  return (

    <TableContainer>
      <Table variant="striped" colorScheme="teal">
        <TdClient conta={conta} classificacao={classificacao} />
      </Table>
    </TableContainer>

  );

}