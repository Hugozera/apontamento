// Relatorios.js
import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/TemplateLayout';
import '../pages/usuarios/Relatorios.css';
import { collection, getDocs, query, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const ITEMS_POR_PAGINA = 31;

function parseDataHora(horaPonto) {
    if (!horaPonto) return null;
    try {
        if (horaPonto instanceof Timestamp) return horaPonto.toDate();
        if (typeof horaPonto === 'string' && horaPonto.includes('/')) {
            const [datePart, timePart] = horaPonto.split(' ');
            const [day, month, year] = datePart.split('/');
            return new Date(`${year}-${month}-${day}T${timePart}`);
        }
        return new Date(horaPonto);
    } catch {
        return null;
    }
}

function formatarDataSimples(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

// --- Componente genérico de relatório ---
function Relatorio({ titulo, colecao, nomeAba, filtrarStatus = false }) {
    const [dados, setDados] = useState([]);
    const [filtroIdLogin, setFiltroIdLogin] = useState('');
    const [filtroNome, setFiltroNome] = useState('');
    const [filtroDataInicio, setFiltroDataInicio] = useState('');
    const [filtroDataFim, setFiltroDataFim] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [ultimoDoc, setUltimoDoc] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);

    async function carregarDadosPagina(paginaNum) {
        setCarregando(true);
        try {
            const campoOrdenacao = colecao === 'pontosEfetivados' ? 'dataAprovacao' : 'dataStatus';

            let q = query(
                collection(db, colecao),
                orderBy(campoOrdenacao, 'desc'),
                limit(ITEMS_POR_PAGINA)
            );

            if (paginaNum > 1 && ultimoDoc) {
                q = query(
                    collection(db, colecao),
                    orderBy(campoOrdenacao, 'desc'),
                    startAfter(ultimoDoc),
                    limit(ITEMS_POR_PAGINA)
                );
            }

            const snapshot = await getDocs(q);
            const lista = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    idLogin: data.idLogin ? data.idLogin.toString() : '',
                    usuario: data.usuario || 'Desconhecido',
                    status: data.status || 'Pendente',
                    dataAprovacao: data.dataAprovacao || null,
                    aprovadoPor: data.aprovadoPor || data.recusadoPor || data.gestor || '',
                    registradoPor: data.registradoPor || '',
                    horaPonto: data.horaPonto || '',
                    justificativa: data.justificativa || '',
                    pontoId: data.pontoId || '',
                };
            });

            setDados(lista);
            setUltimoDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);

            const snapCount = await getDocs(collection(db, colecao));
            setTotalRegistros(snapCount.size);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        setPagina(1);
        setUltimoDoc(null);
        carregarDadosPagina(1);
    }, [colecao, filtroIdLogin, filtroNome, filtroDataInicio, filtroDataFim, filtroStatus]);

    function aplicarFiltros(lista) {
        return lista.filter(registro => {
            try {
                const dataAprovacao = registro.dataAprovacao ? parseDataHora(registro.dataAprovacao) : null;
                const dataInicio = filtroDataInicio ? new Date(filtroDataInicio) : null;
                const dataFim = filtroDataFim ? new Date(filtroDataFim) : null;

                const dataOk = (!dataInicio || (dataAprovacao && dataAprovacao >= dataInicio)) &&
                    (!dataFim || (dataAprovacao && dataAprovacao <= dataFim));

                const loginOk = filtroIdLogin ? registro.idLogin.includes(filtroIdLogin.toString()) : true;
                const nomeOk = filtroNome ? registro.usuario.toLowerCase().includes(filtroNome.toLowerCase()) : true;
                const statusOk = filtroStatus ? registro.status.toLowerCase() === filtroStatus.toLowerCase() : true;

                return dataOk && loginOk && nomeOk && statusOk;
            } catch {
                return false;
            }
        });
    }

    const dadosFiltrados = aplicarFiltros(dados);

    async function exportarExcel() {
        setCarregando(true);
        try {
            const snapshot = await getDocs(collection(db, colecao));
            const todosDados = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    idLogin: data.idLogin ? data.idLogin.toString() : '',
                    usuario: data.usuario || 'Desconhecido',
                    status: data.status || 'Pendente',
                    dataAprovacao: data.dataAprovacao || null,
                    aprovadoPor: data.aprovadoPor || data.recusadoPor || data.gestor || '',
                    registradoPor: data.registradoPor || '',
                    horaPonto: data.horaPonto || '',
                    justificativa: data.justificativa || '',
                    pontoId: data.pontoId || '',
                };
            });

            const filtrados = aplicarFiltros(todosDados);

            const dadosParaExcel = filtrados.map(registro => ({
                'ID Documento': registro.id,
                'Nome': registro.usuario,
                'ID Login': registro.idLogin,
                'Status': registro.status,
                'Data Aprovação': registro.dataAprovacao ? parseDataHora(registro.dataAprovacao).toLocaleString('pt-BR') : '',
                'Aprovado Por': registro.aprovadoPor,
                'Justificativa': registro.justificativa || '',
                'Ponto ID': registro.pontoId || '',
                'Hora Ponto': registro.horaPonto || '',
                'Registrado Por': registro.registradoPor || '',
            }));

            const planilha = XLSX.utils.json_to_sheet(dadosParaExcel);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, planilha, nomeAba);
            const arquivo = XLSX.write(wb, { type: 'blob', bookType: 'xlsx' });
            saveAs(arquivo, `relatorio_${colecao}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err) {
            console.error('Erro ao exportar Excel:', err);
            alert('Erro ao exportar Excel');
        } finally {
            setCarregando(false);
        }
    }

    return (
        <Layout titulo={`Relatório de ${titulo}`}>
            <div className="relatorio-container">
                <div className="filtros-relatorio">
                    <input
                        type="text"
                        placeholder="Filtrar por ID Login"
                        value={filtroIdLogin}
                        onChange={e => setFiltroIdLogin(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Filtrar por nome"
                        value={filtroNome}
                        onChange={e => setFiltroNome(e.target.value)}
                    />
                    <input
                        type="date"
                        value={filtroDataInicio}
                        onChange={e => setFiltroDataInicio(e.target.value)}
                        placeholder="Data início"
                    />
                    <input
                        type="date"
                        value={filtroDataFim}
                        onChange={e => setFiltroDataFim(e.target.value)}
                        placeholder="Data fim"
                    />
                    {filtrarStatus && (
                        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                            <option value="">Todos</option>
                            <option value="Aprovado">Aprovado</option>
                            <option value="Recusado">Recusado</option>
                            <option value="Abonado">Abonado</option>
                            <option value="Pendente">Pendente</option>
                        </select>
                    )}
                    <button onClick={exportarExcel} className="btn-exportar">Exportar Excel</button>
                </div>

                {carregando ? <p>Carregando dados...</p> : (
                    <>
                        <p>Página {pagina} — Exibindo {dadosFiltrados.length} registros (Total: {totalRegistros})</p>
                        <table className="tabela-relatorio">
                            <thead>
                            <tr>
                                <th>Nome</th>
                                <th>ID Login</th>
                                <th>Hora Ponto</th>
                                <th>Data Aprovação</th>
                                <th>Status</th>
                                <th>Aprovado Por</th>
                                <th>Registrado Por</th>
                            </tr>
                            </thead>
                            <tbody>
                            {dadosFiltrados.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center' }}>Nenhum registro encontrado</td></tr>
                            ) : (
                                dadosFiltrados.map((registro, idx) => (
                                    <tr key={registro.id || idx}>
                                        <td>{registro.usuario}</td>
                                        <td>{registro.idLogin}</td>
                                        <td>{registro.horaPonto || '-'}</td>
                                        <td>{registro.dataAprovacao ? parseDataHora(registro.dataAprovacao).toLocaleString('pt-BR') : '-'}</td>
                                        <td>{registro.status}</td>
                                        <td>{registro.aprovadoPor}</td>
                                        <td>{registro.registradoPor || '-'}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </Layout>
    );
}

// --- Componente Planilha Mensal ---
export function PlanilhaMensal() {
    const [dadosAgrupados, setDadosAgrupados] = useState([]);
    const [carregando, setCarregando] = useState(false);

    async function carregarDados() {
        setCarregando(true);
        try {
            const q = query(collection(db, 'pontosEfetivados'), orderBy('horaPonto', 'asc'));
            const snapshot = await getDocs(q);

            const todosDados = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    usuario: d.usuario || 'Desconhecido',
                    idLogin: d.idLogin ? d.idLogin.toString() : '',
                    horaPonto: d.horaPonto,
                    dataPonto: parseDataHora(d.horaPonto),
                    status: d.status || 'Pendente',
                    aprovadoPor: d.aprovadoPor || d.recusadoPor || d.gestor || '',
                    justificativa: d.justificativa || '',
                    registradoPor: d.registradoPor || '',
                };
            });

            const agrupados = {};
            todosDados.forEach(item => {
                if (!item.dataPonto) return;
                const dataStr = formatarDataSimples(item.dataPonto);
                const chave = `${item.usuario}_${dataStr}`;
                if (!agrupados[chave]) agrupados[chave] = { usuario: item.usuario, idLogin: item.idLogin, data: dataStr, pontos: [] };
                agrupados[chave].pontos.push(item);
            });

            const listaFinal = Object.values(agrupados).map(grupo => {
                const pontosOrdenados = grupo.pontos.sort((a, b) => a.dataPonto - b.dataPonto);
                return {
                    usuario: grupo.usuario,
                    idLogin: grupo.idLogin,
                    data: grupo.data,
                    entrada: pontosOrdenados[0]?.horaPonto || '',
                    saidaAlmoco: pontosOrdenados[1]?.horaPonto || '',
                    voltaAlmoco: pontosOrdenados[2]?.horaPonto || '',
                    saidaFinal: pontosOrdenados[3]?.horaPonto || '',
                };
            });

            setDadosAgrupados(listaFinal);
        } catch (error) {
            console.error('Erro ao carregar Planilha Mensal:', error);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => { carregarDados(); }, []);

    function exportarExcel() {
        const dadosExcel = dadosAgrupados.map(item => ({
            Usuário: item.usuario,
            'ID Login': item.idLogin,
            Data: item.data,
            Entrada: item.entrada,
            'Saída Almoço': item.saidaAlmoco,
            'Volta Almoço': item.voltaAlmoco,
            'Saída Final': item.saidaFinal,
        }));

        const ws = XLSX.utils.json_to_sheet(dadosExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Planilha Mensal');
        const arquivo = XLSX.write(wb, { type: 'blob', bookType: 'xlsx' });
        saveAs(arquivo, `planilha_mensal_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    return (
        <Layout titulo="Planilha Mensal">
            <div className="relatorio-container">
                <button onClick={exportarExcel} disabled={carregando} className="btn-exportar">
                    Exportar Excel
                </button>

                {carregando ? <p>Carregando dados...</p> :
                    dadosAgrupados.length === 0 ? <p>Nenhum dado encontrado.</p> :
                        <table className="tabela-relatorio">
                            <thead>
                            <tr>
                                <th>Usuário</th>
                                <th>ID Login</th>
                                <th>Data</th>
                                <th>Entrada</th>
                                <th>Saída Almoço</th>
                                <th>Volta Almoço</th>
                                <th>Saída Final</th>
                            </tr>
                            </thead>
                            <tbody>
                            {dadosAgrupados.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.usuario}</td>
                                    <td>{item.idLogin}</td>
                                    <td>{item.data}</td>
                                    <td>{item.entrada}</td>
                                    <td>{item.saidaAlmoco}</td>
                                    <td>{item.voltaAlmoco}</td>
                                    <td>{item.saidaFinal}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                }
            </div>
        </Layout>
    );
}

export default Relatorio;
