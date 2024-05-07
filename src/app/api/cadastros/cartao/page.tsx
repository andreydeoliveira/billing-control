import { Table, TableContainer } from "@chakra-ui/react";
import TdClient from "./tableClient";
import { getFullCartao } from "@/db/dbCartao";


export default async function Cartao() {

  return (

    <TableContainer>
      <Table variant="striped" colorScheme="teal">
        <TdClient cartao={await getFullCartao()} />
      </Table>
    </TableContainer>

  );

}