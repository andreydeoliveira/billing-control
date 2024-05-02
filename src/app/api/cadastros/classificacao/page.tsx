import { Table, TableContainer } from "@chakra-ui/react";
import TdClient from "./tableClient";
import { getFullClassificacao } from "@/db/dbClassificacao";


export default async function Classificacao() {

  return (
    <>
      <TableContainer>
        <Table variant="striped" colorScheme="teal">
          <TdClient classificacao={await getFullClassificacao()} />
        </Table>
      </TableContainer>
    </>
  );

}