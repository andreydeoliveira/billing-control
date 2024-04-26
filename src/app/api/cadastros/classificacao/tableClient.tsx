'use client'

import { Button, Tbody, Td, Th, Thead, Tr } from "@chakra-ui/react";
import { useState } from "react";
import { MdDeleteForever } from "react-icons/md";

import { Classificacao as ClassificacaoTable } from "@prisma/client";


interface Props {
    classificacao?: ClassificacaoTable[],
    deleteData?: (idRef: string) => void,
    updateData?: () => Promise<ClassificacaoTable[]>;
}

export default function TdClient({
    classificacao: tableData,
    deleteData,
    updateData }: Props) {

    const [isLoading, setLoading] = useState<{ [key: string]: boolean }>({});
    const [tableDataRef, setTableData] = useState(tableData || []);

    const deleteTableData = (id: string) => {

        if (!deleteData || !tableData) {
            return;
        }

        setLoading((prevStats) => {
            prevStats[id] = true
            return prevStats
        });

        setTableData((prevData) => prevData.filter((item) => item.id !== id));

        deleteData(id)

        setLoading((prevStats) => {
            delete prevStats[id]
            return prevStats
        });
    }

    // Função para atualizar os dados da tabela
    const updateTableData = async () => {

        if (!updateData || !tableData) {
            return;
        }

        const newData = await updateData();
        setTableData(newData);
    };

    return (
        <>
            <Thead>
                <Tr>
                    <Th>Conta</Th>
                    <Th>Observação</Th>
                    <Th>Data</Th>
                    <Th>
                        {/*<Button onClick={onOpen}>Inserir</Button>*/}
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
                            <Button
                                id={valor.id}
                                leftIcon={<MdDeleteForever />}
                                isLoading={isLoading[valor.id]}
                                onClick={() => deleteTableData(valor.id)} // Passando a função de handleClick para o evento onClick do botão
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
        </>
    )
}