'use client'

import React, { useState, useRef, useEffect, ChangeEvent } from "react";
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
    Select,
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
import {
    Classificacao as ClassificacaoTable
} from "@prisma/client";
import { deleteConta, insertConta, updateConta, ContaWithClassificacao } from "@/db/dbConta";

interface Props {
    conta?: ContaWithClassificacao[],
    classificacao?: ClassificacaoTable[],
}

export default function TdClient({ conta, classificacao }: Props) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [tableDataRef, setTableData] = useState(conta || []);

    const nameRef = useRef<HTMLInputElement>(null);
    const observacaoRef = useRef<HTMLTextAreaElement>(null)

    const [idRef, setIdRef] = useState<string>('');
    const [nameRefInit, setNameRefInit] = useState<string>('');
    const [observacaoRefInit, setObservacaoRefInit] = useState<string>('');
    const [classificacaoIdRefInit, setClassificacaoIdRefInit] = useState<string>('')

    const [isLoading, setIsLoading] = useState<boolean>(false)


    const deleteTableData = (idParam: string) => {
        deleteConta(idParam);
        setTableData((prevData) => prevData.filter((item) => item.id !== idParam));
    };

    const saveData = async () => {
        let newData;
        setIsLoading(true)

        try {
            if (idRef) {
                newData = await updateConta(idRef, nameRef.current?.value, observacaoRef.current?.value, classificacaoIdRefInit);
            } else {
                newData = await insertConta(nameRef.current?.value, observacaoRef.current?.value, classificacaoIdRefInit);
            }

            setTableData(newData);
            handleCloseModal();
        } catch (erro: any) {
            setIsLoading(false)
            throw new Error(erro)
        }
    };

    const editItem = (valor: ContaWithClassificacao) => {

        setNameRefInit(valor.name)
        setObservacaoRefInit(valor.observacao)
        setClassificacaoIdRefInit(valor.classificacao.id)
        setIdRef(valor.id)

        onOpen()

    };

    const handleCloseModal = () => {
        setIdRef('');
        setNameRefInit('')
        setObservacaoRefInit('')
        setClassificacaoIdRefInit('')
        setIsLoading(false)
        onClose();
    };

    const handleClassifRefInit = (e: ChangeEvent<HTMLSelectElement>) => {
        setClassificacaoIdRefInit(e.target.value)
    }


    return (
        <>
            <Thead>
                <Tr>
                    <Th>Conta</Th>
                    <Th>Observação</Th>
                    <Th>Data</Th>
                    <Th>Classificação</Th>
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
                        <Td>{valor.classificacao.name}</Td>
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

            <Modal isOpen={isOpen} onClose={handleCloseModal} initialFocusRef={nameRef}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Editar Item</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        {isLoading ? <div>Salvando<br /><Spinner
                            thickness="4px"
                            speed="0.65s"
                            emptyColor="gray.200"
                            color="blue.500"
                            size="xl"
                        /></div> :

                            <div>
                                <FormControl>
                                    <FormLabel>Conta</FormLabel>
                                    <Input ref={nameRef} defaultValue={nameRefInit} />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>Observação</FormLabel>
                                    <Textarea ref={observacaoRef} defaultValue={observacaoRefInit} />
                                </FormControl>
                                <FormControl isRequired >
                                    <FormLabel>Classificação</FormLabel>
                                    <Select placeholder="Select a value" value={classificacaoIdRefInit} onChange={handleClassifRefInit}>
                                        {classificacao?.map((item, key) => (
                                            <option key={key} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </Select>
                                </FormControl>
                            </div>
                        }
                    </ModalBody>
                    <ModalFooter>
                        <Button isDisabled={classificacaoIdRefInit === ''} colorScheme="blue" mr={3} onClick={saveData}>
                            Salvar
                        </Button>
                        <Button onClick={handleCloseModal}>Cancelar</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}
