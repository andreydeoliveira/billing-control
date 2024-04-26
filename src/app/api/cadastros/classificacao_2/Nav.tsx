"use client";

import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Table,
  TableContainer,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { MdDeleteForever } from "react-icons/md";

import { Delete, Insert } from '../../../actions/data'

interface NavProps {
  classificacao: Array<{
    id: string;
    name: string;
    observacao: string;
    datacriacao: Date;
  }>;
}

export default function Nav({ classificacao }: NavProps) {

  const { isOpen, onOpen, onClose } = useDisclosure()
  const classifRef = React.useRef(null)
  const observacaoRef = React.useRef(null)

  const [isLoading, setLoading] = useState<string | null>(null);
  const [tableData, setTableData] = useState(classificacao);

  const handleClick = async (id: string) => {
    // Define isLoading como true para iniciar o loading
    setLoading(id);

    await Delete(id)

    setTableData(tableData.filter((item) => item.id !== id));

    setLoading(null);

  }

  const saveData = async () => {

    if (!classifRef.current || !observacaoRef.current) {
      return;
    }

    const nome = classifRef.current;
    const observacao = observacaoRef.current;

    // Insere os novos dados e espera a resposta com os dados atualizados
    const newClassificacoes = await Insert(nome, observacao);
    
    // Atualiza os dados da tabela com os registros retornados
    setTableData(newClassificacoes);
    
    onClose();  
  }

  return (
    <>
      <TableContainer>
        <Table variant="striped" colorScheme="teal">
          <Thead>
            <Tr>
              <Th>Conta</Th>
              <Th>Observação</Th>
              <Th>Data</Th>
              <Th>
                <Button onClick={onOpen}>Inserir</Button>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {tableData.map((valor) => (
              <Tr key={valor.id}>
                <Td>{valor.name}</Td>
                <Td>{valor.observacao}</Td>
                <Td>{valor.datacriacao.toISOString()}</Td>
                <Td width="1%">
                  <Button
                    id={valor.id}
                    leftIcon={<MdDeleteForever />}
                    isLoading={isLoading === valor.id}
                    onClick={() => handleClick(valor.id)} // Passando a função de handleClick para o evento onClick do botão
                    loadingText="Deleting"
                    colorScheme="teal"
                    variant="outline"
                    spinnerPlacement="end"
                  >
                    Apagar
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal
        initialFocusRef={classifRef}
        finalFocusRef={observacaoRef}
        isOpen={isOpen}
        onClose={onClose}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create your account</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>


            <FormControl>
              <FormLabel>Classificação</FormLabel>
              <Input ref={classifRef}  />
            </FormControl>

            <FormControl>
              <FormLabel>Observação</FormLabel>
              <Textarea ref={observacaoRef} />
            </FormControl>

          </ModalBody>

          <ModalFooter>
            <Button colorScheme='blue' mr={3} 
              onClick={() => saveData()}>
              Save
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
