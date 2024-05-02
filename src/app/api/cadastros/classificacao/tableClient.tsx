'use client'

import React, { useState, useRef } from "react";
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
    Tbody,
    Td,
    Textarea,
    Th,
    Thead,
    Tr,
    useDisclosure,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { Classificacao as ClassificacaoTable } from "@prisma/client";
import { deleteClassificacao, insertClassificacao, updateClassificacao } from "@/db/dbClassificacao";

interface Props {
    classificacao?: ClassificacaoTable[];
}

export default function TdClient({ classificacao }: Props) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [tableDataRef, setTableData] = useState(classificacao || []);
    const [nameRef, setNameRef] = useState('');
    const [observacaoRef, setObservacaoRef] = useState('')
    const [idRef, setIdRef] = useState('');

    const deleteTableData = (idParam: string) => {
        deleteClassificacao(idParam);
        setTableData((prevData) => prevData.filter((item) => item.id !== idParam));
    };

    const saveData = async () => {
        let newData;

        if (idRef) {
            newData = await updateClassificacao(idRef, nameRef, observacaoRef);
        } else {
            newData = await insertClassificacao(nameRef, observacaoRef);
        }

        setTableData(newData);
        handleCloseModal();
    };

    const editItem = (valor: ClassificacaoTable) => {

        setNameRef(valor.name)
        setObservacaoRef(valor.observacao)
        setIdRef(valor.id)

        onOpen()

    };

    const handleCloseModal = () => {
        setIdRef('');
        onClose();
    };

    return (
        <>
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
                                    <MenuItem onClick={() => editItem(valor)}>Editar</MenuItem>
                                    <MenuItem onClick={() => deleteTableData(valor.id)}>Apagar</MenuItem>
                                </MenuList>
                            </Menu>
                        </Td>
                    </Tr>
                ))}
            </Tbody>

            <Modal isOpen={isOpen} onClose={handleCloseModal}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Editar Item</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <FormControl>
                            <FormLabel>Classificação</FormLabel>
                            <Input value={nameRef} onChange={(e) => setNameRef(e.target.value)} />
                        </FormControl>
                        <FormControl>
                            <FormLabel>Observação</FormLabel>
                            <Textarea value={observacaoRef} onChange={(e) => setObservacaoRef(e.target.value)} />
                        </FormControl>
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="blue" mr={3} onClick={saveData}>
                            Salvar
                        </Button>
                        <Button onClick={handleCloseModal}>Cancelar</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}
