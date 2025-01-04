"use client";

import {
    deleteMovimentacao,
    getFullMovimentacao,
    MovimentacaoComContas,
} from "@/db/dbMovimentacao";
import { ChevronDownIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import {
    Box,
    Button,
    Flex,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    Select,
    Table,
    TableContainer,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import YearPicker from "./yearPicker";

export default function Movimentacoes() {
    const mes = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
    ];

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);

    const [tableDataRef, setTableValue] = useState<MovimentacaoComContas[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const data = await getFullMovimentacao({
                year: currentYear,
                month: currentMonth,
            });
            setTableValue(data);
        };
        fetchData();
    }, [currentYear, currentMonth]);

    // Função que é chamada quando o ano muda
    const handleYearChange = (year: number) => {
        setYear(year);
    };

    const handleMonthChange = (month: number) => {
        setMonth(month);
    };

    const deleteTableData = (idParam: string) => {
        deleteMovimentacao(idParam);
        setTableValue(tableDataRef.filter((item) => item.id !== idParam));
    };

    return (
        <div>
            <Box>
                <Flex minWidth="max-content" alignItems="center" gap="2">
                    <Select
                        placeholder="Select option"
                        onChange={(event) =>
                            handleMonthChange(mes.indexOf(event.target.value))
                        }
                        defaultValue={currentMonth}
                    >
                        {mes.map((m, index) => {
                            return (
                                <option key={index} value={index}>
                                    {m}
                                </option>
                            );
                        })}
                    </Select>
                    <YearPicker onYearChange={handleYearChange} />
                </Flex>
            </Box>

            <Box>
                {year}
                {month}
            </Box>
            <TableContainer>
                <Table variant="striped" colorScheme="teal">
                    <Thead>
                        <Tr>
                            <Th>Origem</Th>
                            <Th>Destino</Th>
                            <Th>Valor</Th>
                            <Th>Data Pgto</Th>
                            <Th>Vencimento</Th>
                            <Th>
                                <Button colorScheme="teal" /*onClick={onOpen}*/>
                                    Inserir
                                </Button>
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {tableDataRef.map((valor) => (
                            <Tr key={valor.contaOrigem?.name}>
                                <Td>{valor.contaDestino?.name}</Td>
                                <Td>{valor.valor}</Td>
                                <Td>{valor.dataPagamento.toString()}</Td>
                                <Td>{valor.dataVencimento.toString()}</Td>
                                <Td width="1%">
                                    <Menu>
                                        <MenuButton
                                            as={Button}
                                            rightIcon={<ChevronDownIcon />}
                                        >
                                            Settings
                                        </MenuButton>
                                        <MenuList>
                                            <MenuItem /*onClick={() => editItem(valor)}*/
                                            >
                                                <EditIcon />
                                                <p>Editar</p>
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() =>
                                                    deleteTableData(valor.id)
                                                }
                                            >
                                                <DeleteIcon />
                                                <p>Apagar</p>
                                            </MenuItem>
                                        </MenuList>
                                    </Menu>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </TableContainer>
        </div>
    );
}
