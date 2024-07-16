"use client";

import { useState } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { useDayzed } from "dayzed";

const MonthPicker = () => {
    const [selectedMonth, setSelectedMonth] = useState<{
        month: number;
        year: number;
    }>();

    const { calendars, getBackProps, getForwardProps } = useDayzed({
        selected: selectedMonth
            ? new Date(selectedMonth.year, selectedMonth.month)
            : undefined,
        numberOfMonths: 1,
    });

    const handleMonthClick = (month: number, year: number) => {
        setSelectedMonth({ month, year });
    };

    return (
        <Box>
            <Flex justify="space-between" align="center" mb={4}>
                <Button {...getBackProps()}>Anterior</Button>
                <Text fontSize="xl">
                    {selectedMonth
                        ? `${selectedMonth.month + 1} / ${selectedMonth.year}`
                        : "Selecione um mês"}
                </Text>
                <Button {...getForwardProps()}>Próximo</Button>
            </Flex>
            <Flex flexWrap="wrap">
                {calendars.map((calendar) =>
                    calendar.weeks.map((week) =>
                        week.map((day) => (
                            <Box
                                key={`${day.month}-${day.day}`}
                                flexBasis="14.28%"
                                textAlign="center"
                                py={2}
                                cursor="pointer"
                                onClick={() =>
                                    handleMonthClick(day.month, day.year)
                                }
                                _hover={{ bg: "gray.100" }}
                            >
                                {day.day}
                            </Box>
                        ))
                    )
                )}
            </Flex>
        </Box>
    );
};

export default MonthPicker;
