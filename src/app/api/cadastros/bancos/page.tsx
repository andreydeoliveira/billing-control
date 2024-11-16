import { Table, TableContainer } from "@chakra-ui/react";
import TdClient from "./tableClient";
import { getFullContaBancaria } from "@/db/dbContaBancaria";


export default async function ContaBancaria() {

  return (

    <TableContainer>
      <Table variant="striped" colorScheme="teal">
        <TdClient contaBancaria={await getFullContaBancaria()} />
      </Table>
    </TableContainer>

  );

}