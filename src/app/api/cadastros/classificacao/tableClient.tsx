"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronDownIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { Classificacao as ClassificacaoTable } from "@prisma/client";
import {
  deleteClassificacao,
  insertClassificacao,
  updateClassificacao,
} from "@/db/dbClassificacao";

interface Props {
  classificacao?: ClassificacaoTable[];
}

export default function TdClient({ classificacao }: Props) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [tableDataRef, setTableData] = useState(classificacao || []);

  const nameRef = useRef<HTMLInputElement>(null);
  const observacaoRef = useRef<HTMLTextAreaElement>(null);

  const [idRef, setIdRef] = useState<string>("");
  const [nameRefInit, setNameRefInit] = useState<string>("");
  const [observacaoRefInit, setObservacaoRefInit] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const deleteTableData = (idParam: string) => {
    deleteClassificacao(idParam);
    setTableData((prevData) => prevData.filter((item) => item.id !== idParam));
  };

  const saveData = async () => {
    let newData;
    setIsLoading(true);

    try {
      if (idRef) {
        newData = await updateClassificacao(
          idRef,
          nameRef.current?.value,
          observacaoRef.current?.value
        );
      } else {
        newData = await insertClassificacao(
          nameRef.current?.value,
          observacaoRef.current?.value
        );
      }

      setTableData(newData);
      handleCloseModal();
    } catch (erro: any) {
      setIsLoading(false);
      throw new Error(erro);
    }
  };

  const editItem = (valor: ClassificacaoTable) => {
    setNameRefInit(valor.name);
    setObservacaoRefInit(valor.observacao);
    setIdRef(valor.id);

    onOpen();
  };

  const handleCloseModal = () => {
    setIdRef("");
    setNameRefInit("");
    setObservacaoRefInit("");
    setIsLoading(false);
    onClose();
  };

  return (
    <>
      <Thead>
        <Tr>
          <Th>Classificação</Th>
          <Th>Observação</Th>
          <Th>Data</Th>
          <Th>
            <Button colorScheme='teal' onClick={onOpen}>Inserir</Button>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {tableDataRef.map((valor) => (
          <Tr key={valor.id}>
            <Td>{valor.name}</Td>
            <Td>{valor.observacao}</Td>
            <Td>{valor.datacriacao.toISOString()}</Td>
            <Td width="1%">
              <Menu>
                <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                  Settings
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => editItem(valor)}>
                    <EditIcon />
                    <p>Editar</p>
                  </MenuItem>
                  <MenuItem onClick={() => deleteTableData(valor.id)}>
                    <DeleteIcon />
                    <p>Apagar</p>
                  </MenuItem>
                </MenuList>
              </Menu>
            </Td>
          </Tr>
        ))}
      </Tbody>

      <Modal
        isOpen={isOpen}
        onClose={handleCloseModal}
        initialFocusRef={nameRef}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Editar Item</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {isLoading ? (
              <div>
                Salvando
                <br />
                <Spinner
                  thickness="4px"
                  speed="0.65s"
                  emptyColor="gray.200"
                  color="blue.500"
                  size="xl"
                />
              </div>
            ) : (
              <div>
                <FormControl>
                  <FormLabel>Classificação</FormLabel>
                  <Input ref={nameRef} defaultValue={nameRefInit} />
                </FormControl>
                <FormControl>
                  <FormLabel>Observação</FormLabel>
                  <Textarea
                    ref={observacaoRef}
                    defaultValue={observacaoRefInit}
                  />
                </FormControl>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              isDisabled={nameRefInit === ""}
              colorScheme="blue"
              mr={3}
              onClick={saveData}
            >
              Salvar
            </Button>
            <Button onClick={handleCloseModal}>Cancelar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
