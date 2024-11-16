'use client';

import { Center, Input } from "@chakra-ui/react";
import { useEffect, useState } from "react";

export default function YearPicker({
    onYearChange,
}: {
    onYearChange: (year: number) => void;
}) {
    const agora = new Date();
    const [enterPressed, setEnterPressed] = useState(false); // Estado para controlar se Enter foi pressionado
    const [year, setYear] = useState(agora.getFullYear()); // Estado para o valor do ano

    const handleBlur = () => {
        if (enterPressed) return; // Se Enter foi pressionado, não faz nada no onBlur
        onYearChangePreValidate(year);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            setEnterPressed(true); // Marca que Enter foi pressionado
            onYearChangePreValidate(year);
        }
    };

    const onYearChangePreValidate = (year: number) => {
        if (year){
            if (year.toString().length === 4) {
                onYearChange(year);
            } else {
                onYearChange(0); // Se o ano não tiver 4 dígitos, limpa o campo
                alert("Ano inválido!"); // Exibe um alerta
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setYear(parseFloat(e.target.value)); // Atualiza o estado do ano
        setEnterPressed(false); // Reseta o estado de "Enter" quando o valor mudar
    };

    return (
        <Center>
            <Input
                type="number"
                min={1900} // Ano mínimo permitido
                max={2099} // Ano máximo permitido
                width="auto" // Largura ajustada ao conteúdo
                maxWidth="200px" // Largura máxima definida
                textAlign="center" // Alinha o texto ao centro
                onBlur={handleBlur} // Evento quando o campo perde o foco
                onKeyDown={handleKeyDown} // Evento ao pressionar uma tecla
                value={year} // Vincula o valor do input ao estado
                onChange={handleChange} // Atualiza o estado quando o valor mudar
                backgroundColor={year.toString().length === 4 ? "white": "red"} // Muda a cor de fundo se o ano tiver 4 dígitos
            />
        </Center>
    );
}
