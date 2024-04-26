'use client'

import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  TableCaption,
  TableContainer,
  Button,
} from '@chakra-ui/react'
import { PrismaClient } from '@prisma/client'
import { useState } from 'react';

import ClassificValues from "./server"

export default async function Classificacao() {

  const [isLoading, setLoading] = useState(false);
  
  const handleClick = () => {
    // Define isLoading como true para iniciar o loading
    setLoading(!isLoading);

    // Simula uma ação assíncrona (por exemplo, uma chamada de API)
    setTimeout(() => {
      // Após um certo tempo, define isLoading como false para parar o loading
      setLoading(false);
    }, 2000); // Tempo de espera de 2 segundos (simulação de chamada assíncrona)
  };

  return (

    <TableContainer>
      <Table variant='striped' colorScheme='teal'>
        <Thead>
          <Tr>
            <Th>Conta</Th>
            <Th>Observação</Th>
            <Th>Data</Th>
          </Tr>
        </Thead>
        <Tbody>

          <ClassificValues isLoading={isLoading} handleClick={handleClick}  />

        </Tbody>  
      </Table>
    </TableContainer>
  )

}