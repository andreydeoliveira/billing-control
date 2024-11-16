'use client'

import { Button, Grid, GridItem } from "@chakra-ui/react";
import YearPicker from "./yearPicker";
import { useState } from "react";

export default function Movimentacoes() {
    const month = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
    ];

    const [ondeCliquei, setOndeCliquei] = useState('')
    const [ano, setAno] = useState('');

    // Função que é chamada quando o ano muda
    const handleYearChange = (year: string) => {
        setAno(year);
    };

    return (
        <div>
            <Grid
                templateAreas={`"nav header"
                  "nav main"`}
                gridTemplateRows={"50px 1fr"}
                gridTemplateColumns={"90px 1fr"}
            >
                <GridItem pl="2" area={"header"} >
                    <YearPicker onYearChange={handleYearChange}  />
                </GridItem>
                <GridItem pl="2" area={"nav"} >

                    {month.map((m) => {
                        return <Button key={m} width="100%" height="50px" onClick={() => setOndeCliquei(m)}>
                        {m}
                    </Button>
                    })}

                </GridItem>
                <GridItem pl="2" area={"main"}>
                    <div>{ondeCliquei}</div>
                    <div>{ano}</div>
                </GridItem>
            </Grid>
        </div>
    );
}
