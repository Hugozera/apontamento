import React from 'react';
import Relatorio from './RelatorioBase';

export default function RelatorioPontos() {
    return (
        <Relatorio
            titulo="Pontos Efetivados"
            colecao="pontosEfetivados"
            nomeAba="Efetivados"
            filtrarStatus={true}
            mostrarPontoBatido={true}
        />
    );
}
