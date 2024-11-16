'use client'

import { deleteContabancaria, insertContaBancaria, updateContaBancaria } from "@/db/dbContaBancaria";
import { ChevronDownIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
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
    Th,
    Thead,
    Tr,
    useDisclosure
} from "@chakra-ui/react";
import { ContaBancaria as ContaBancaria } from "@prisma/client";
import { useRef, useState } from "react";


interface Props {
    contaBancaria?: ContaBancaria[];
}

export default function TdClient({ contaBancaria }: Props) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [tableDataRef, setTableData] = useState(contaBancaria || []);

    const nameRef = useRef<HTMLInputElement>(null);

    const [idRef, setIdRef] = useState<string>('');
    const [nameRefInit, setNameRefInit] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false)


    const deleteTableData = (idParam: string) => {
        deleteContabancaria(idParam);
        setTableData((prevData) => prevData.filter((item) => item.id !== idParam));
    };

    const saveData = async () => {
        let newData;
        setIsLoading(true)

        try {
            if (idRef) {
                newData = await updateContaBancaria(idRef, nameRef.current?.value);
            } else {
                newData = await insertContaBancaria(nameRef.current?.value);
            }

            setTableData(newData);
            handleCloseModal();
        } catch (erro: any) {
            setIsLoading(false)
            throw new Error(erro)
        }
    };

    const editItem = (valor: ContaBancaria) => {

        setNameRefInit(valor.name)
        setIdRef(valor.id)

        onOpen()

    };

    const handleCloseModal = () => {
        setIdRef('');
        setNameRefInit('')
        setIsLoading(false)
        onClose();
    };


    return (
        <>
            <Thead>
                <Tr>
                    <Th>Conta</Th>
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
                        <Td>{valor.dataatualizacao.toISOString()}</Td>
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
                            </div>
                        }
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
