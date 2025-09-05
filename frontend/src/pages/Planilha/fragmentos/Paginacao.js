import React from 'react';

const Paginacao = ({ paginaAtual, totalPaginas, mudarPagina }) => {
    const paginasParaMostrar = 5;
    let inicio = Math.max(1, paginaAtual - Math.floor(paginasParaMostrar / 2));
    let fim = Math.min(totalPaginas, inicio + paginasParaMostrar - 1);

    if (fim - inicio + 1 < paginasParaMostrar) {
        inicio = Math.max(1, fim - paginasParaMostrar + 1);
    }

    const paginas = [];
    for (let i = inicio; i <= fim; i++) {
        paginas.push(i);
    }

    return (
        <nav aria-label="Page navigation">
            <ul className="pagination justify-content-center">
                <li className={`page-item ${paginaAtual === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => mudarPagina(1)}>
                        &laquo;
                    </button>
                </li>
                <li className={`page-item ${paginaAtual === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => mudarPagina(paginaAtual - 1)}>
                        &lsaquo;
                    </button>
                </li>

                {inicio > 1 && (
                    <li className="page-item disabled">
                        <span className="page-link">...</span>
                    </li>
                )}

                {paginas.map(num => (
                    <li key={num} className={`page-item ${paginaAtual === num ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => mudarPagina(num)}>
                            {num}
                        </button>
                    </li>
                ))}

                {fim < totalPaginas && (
                    <li className="page-item disabled">
                        <span className="page-link">...</span>
                    </li>
                )}

                <li className={`page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => mudarPagina(paginaAtual + 1)}>
                        &rsaquo;
                    </button>
                </li>
                <li className={`page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => mudarPagina(totalPaginas)}>
                        &raquo;
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default Paginacao;