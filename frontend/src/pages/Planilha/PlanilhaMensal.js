// src/pages/PlanilhaMensalCompleta.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

import { Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import Layout from '../../components/layout/TemplateLayout';
import FiltrosAvancados from './fragmentos/FiltrosAvancados';
import GraficosAnaliticos from './fragmentos/GraficosAnaliticos';
import Paginacao from './fragmentos/Paginacao';
import UsuarioCard from './fragmentos/UsuarioCard';

import { classificarPontos, calcularTotaisDia } from '../../utils/pontoCalculations';
import { formatarDataSimples, parseDataHora } from '../../utils/dateUtils';
import { JORNADAS } from '../../utils/constants';

import useImprimirRelatorio from './fragmentos/useImprimirRelatorio';

export default function PlanilhaMensalCompleta() {
    const [dadosAgrupados, setDadosAgrupados] = useState([]);
    const [totaisPorUsuario, setTotaisPorUsuario] = useState({});
    const [carregando, setCarregando] = useState(false);
    const [empresa, setEmpresa] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [filtros, setFiltros] = useState({
        dataInicio: null,
        dataFim: null,
        departamento: '',
        jornada: '',
        busca: ''
    });
    const [jornadaAtiva, setJornadaAtiva] = useState('12/36');
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina] = useState(5);
    const [erros, setErros] = useState([]);

    const imprimir = useImprimirRelatorio();

    // Carrega dados iniciais
    useEffect(() => {
        const carregarDadosIniciais = async () => {
            setCarregando(true);
            setErros([]);
            try {
                // Empresa
                const empresaSnapshot = await getDocs(collection(db, 'empresa'));
                setEmpresa(empresaSnapshot.docs[0]?.data() || {
                    razaoSocial: 'Auto Posto Perequete',
                    cnpj: '56.102.541.0001/85',
                    endereco: 'Quadra 712 sul al 01 lt S/N Plano Diretor Sul',
                    gestor: 'Diogo Crêstani'
                });

                // Usuários
                const usuariosSnapshot = await getDocs(collection(db, 'users'));
                const usuariosData = usuariosSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    idLogin: doc.data().idLogin ? doc.data().idLogin.toString() : '',
                    jornada: doc.data().jornada || '12/36'
                }));

                setUsuarios(usuariosData);

                const deptos = [...new Set(usuariosData.map(u => u.departamento).filter(Boolean))];
                setDepartamentos(deptos);

                await carregarDadosPontos(usuariosData);
            } catch (error) {
                console.error('Erro ao carregar dados iniciais:', error);
                setErros(['Erro ao carregar dados: ' + error.message]);
            } finally {
                setCarregando(false);
            }
        };

        carregarDadosIniciais();
    }, []);

    // ---- carregarDadosPontos ----
    async function carregarDadosPontos(usuariosData) {
        try {
            setCarregando(true);
            setErros([]);

            // Filtra usuários
            let usuariosFiltrados = usuariosData.filter(user => {
                const deptoMatch = !filtros.departamento || user.departamento === filtros.departamento;
                const jornadaMatch = !filtros.jornada || user.jornada === filtros.jornada;
                return deptoMatch && jornadaMatch;
            });

            if (usuariosFiltrados.length === 0) {
                setDadosAgrupados([]);
                setTotaisPorUsuario({});
                return;
            }

            function criarDataLocal(str) {
                const [ano, mes, dia] = str.split("-").map(Number);
                return new Date(ano, mes - 1, dia); // sem UTC
            }

            let dataInicioFiltro = null;
            let dataFimFiltro = null;

            if (filtros.dataInicio) {
                dataInicioFiltro = criarDataLocal(filtros.dataInicio);
                dataInicioFiltro.setHours(0, 0, 0, 0);
            }

            if (filtros.dataFim) {
                dataFimFiltro = criarDataLocal(filtros.dataFim);
                dataFimFiltro.setHours(23, 59, 59, 999);
            }

            const [snapshotPontos, snapshotAbonos, snapshotFaltas] = await Promise.all([
                getDocs(query(collection(db, 'pontosEfetivados'), orderBy('horaPonto', 'asc'))),
                getDocs(query(collection(db, 'abonos'), orderBy('data', 'asc'))),
                getDocs(query(collection(db, 'faltas'), orderBy('data', 'asc')))
            ]);

            const idsUsuariosFiltrados = usuariosFiltrados.map(u => u.name);

            // Pontos
            const todosPontos = snapshotPontos.docs
                .map(doc => {
                    const data = doc.data();
                    const horaPontoDate = parseDataHora(data.horaPonto);
                    return {
                        id: doc.id,
                        ...data,
                        horaPontoDate,
                        dataStr: horaPontoDate ? formatarDataSimples(horaPontoDate) : ''
                    };
                })
                .filter(ponto => {
                    if (!idsUsuariosFiltrados.includes(ponto.usuario)) return false;
                    if (!ponto.horaPontoDate) return false;
                    if (dataInicioFiltro && ponto.horaPontoDate < dataInicioFiltro) return false;
                    return !(dataFimFiltro && ponto.horaPontoDate > dataFimFiltro);
                });

            // Abonos
            const todosAbonos = snapshotAbonos.docs
                .map(doc => {
                    const data = doc.data();
                    const dataDate = parseDataHora(data.data);
                    return {
                        id: doc.id,
                        ...data,
                        dataDate,
                        dataStr: dataDate ? formatarDataSimples(dataDate) : ''
                    };
                })
                .filter(abono => idsUsuariosFiltrados.includes(abono.usuario));

            // Faltas
            const todasFaltas = snapshotFaltas.docs
                .map(doc => {
                    const data = doc.data();
                    const dataDate = parseDataHora(data.data);
                    return {
                        id: doc.id,
                        ...data,
                        dataDate,
                        dataStr: dataDate ? formatarDataSimples(dataDate) : ''
                    };
                })
                .filter(falta => idsUsuariosFiltrados.includes(falta.usuario));

            // Agrupamento
            const agrupados = {};
            const totaisUsuario = {};

            usuariosFiltrados.forEach(user => {
                totaisUsuario[user.name] = {
                    horasExtras: 0,
                    atrasos: 0,
                    diasTrabalhados: 0,
                    diasAbonados: 0,
                    faltas: 0,
                    jornada: user.jornada || '12/36',
                    departamento: user.departamento || 'Não informado',
                    idLogin: user.idLogin || ''
                };
            });

            todosPontos.forEach(ponto => {
                const chave = `${ponto.usuario}_${ponto.dataStr}`;
                if (!agrupados[chave]) {
                    const usuario = usuariosData.find(u => u.name === ponto.usuario);
                    agrupados[chave] = {
                        usuario: ponto.usuario,
                        idLogin: ponto.idLogin || '',
                        data: ponto.dataStr,
                        pontos: [],
                        abonos: [],
                        falta: false,
                        jornada: usuario?.jornada || '12/36'
                    };
                }
                agrupados[chave].pontos.push(ponto);
            });

            const listaFinal = Object.values(agrupados).map(item => {
                const jornadaConfig = JORNADAS[item.jornada] || JORNADAS['12/36'];
                const pontosClassificados = classificarPontos(item.pontos);
                const totaisDia = calcularTotaisDia(pontosClassificados, [], false, jornadaConfig);

                if (totaisUsuario[item.usuario]) {
                    if (totaisDia.horasTrabalhadas > 0) {
                        totaisUsuario[item.usuario].horasExtras += totaisDia.horasExtras;
                        totaisUsuario[item.usuario].atrasos += totaisDia.atrasoEntrada + totaisDia.atrasoVoltaAlmoco;
                        totaisUsuario[item.usuario].diasTrabalhados += 1;
                    }
                }

                return {
                    ...item,
                    ...pontosClassificados,
                    totaisDia
                };
            });

            setDadosAgrupados(listaFinal);
            setTotaisPorUsuario(totaisUsuario);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setErros(['Erro ao processar dados: ' + error.message]);
            setDadosAgrupados([]);
            setTotaisPorUsuario({});
        } finally {
            setCarregando(false);
        }
    }

    const usuariosUnicos = [...new Set(dadosAgrupados.map(item => item.usuario))];
    const usuariosFiltrados = filtros.busca
        ? usuariosUnicos.filter(usuario =>
            usuario.toLowerCase().includes(filtros.busca.toLowerCase()) ||
            (totaisPorUsuario[usuario]?.idLogin &&
                totaisPorUsuario[usuario].idLogin.toString().toLowerCase().includes(filtros.busca.toLowerCase()))
        )
        : usuariosUnicos;
    const totalPaginas = Math.ceil(usuariosFiltrados.length / itensPorPagina);
    const usuariosPaginados = usuariosFiltrados.slice(
        (paginaAtual - 1) * itensPorPagina,
        paginaAtual * itensPorPagina
    );

    const dadosPorUsuario = usuariosPaginados.map(usuario => ({
        usuario,
        registros: dadosAgrupados
            .filter(item => item.usuario === usuario)
            .sort((a, b) => new Date(a.data) - new Date(b.data)),
        totais: totaisPorUsuario[usuario] || {}
    }));

    const handleImprimir = (usuario, registros) => {
        const datas = registros.map(item => new Date(item.data));
        if (datas.length === 0) return;
        const dataInicio = new Date(Math.min(...datas));
        const dataFim = new Date(Math.max(...datas));
        const periodo = `${dataInicio.toLocaleDateString("pt-BR")} a ${dataFim.toLocaleDateString("pt-BR")}`;

        const usuarioData = {
            usuario,
            totais: totaisPorUsuario[usuario] || {}
        };

        imprimir(empresa, usuarioData, periodo, registros);
    };
    return (
        <Layout titulo="Relatório de Ponto Avançado">
            <div className="relatorio-container">
                {erros.length > 0 && (
                    <Alert variant="danger" className="mb-3">
                        <ul>
                            {erros.map((erro, index) => (
                                <li key={index}>{erro}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <FiltrosAvancados
                    filtros={filtros}
                    setFiltros={setFiltros}
                    departamentos={departamentos}
                    handleAplicarFiltros={() => {
                        setPaginaAtual(1);
                        carregarDadosPontos(usuarios);
                    }}
                    handleLimparFiltros={() => {
                        setFiltros({
                            dataInicio: null,
                            dataFim: null,
                            departamento: '',
                            jornada: '',
                            busca: ''
                        });
                        setPaginaAtual(1);
                        carregarDadosPontos(usuarios);
                    }}
                />

                <div className="botoes-relatorio mb-4">
                    <Row>
                        <Col md={6}>
                            <Form.Control
                                type="text"
                                placeholder="Buscar por nome ou ID..."
                                value={filtros.busca}
                                onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                            />
                        </Col>
                        <Col md={6} className="d-flex justify-content-end">
                            <Button onClick={() => {}} disabled={carregando} className="me-2">
                                Exportar Excel
                            </Button>
                            <Button
                                variant="info"
                                onClick={() => setJornadaAtiva(jornadaAtiva === '12/36' ? '6/1' : '12/36')}
                            >
                                Jornada: {jornadaAtiva}
                            </Button>
                        </Col>
                    </Row>
                </div>

                {carregando ? (
                    <div className="text-center my-5">
                        <Spinner animation="border" />
                        <p>Carregando dados...</p>
                    </div>
                ) : dadosAgrupados.length === 0 ? (
                    <p className="text-center my-5">Nenhum dado encontrado.</p>
                ) : (
                    <>
                        <GraficosAnaliticos dados={dadosPorUsuario}/>

                        <div className="relatorio-usuarios">
                            {dadosPorUsuario.map((usuarioData, idx) => (
                                <UsuarioCard
                                    key={idx}
                                    usuarioData={usuarioData}
                                    onImprimir={(usuarioData) =>
                                        handleImprimir(usuarioData.usuario, usuarioData.registros)
                                    }
                                />
                            ))}
                        </div>

                        {totalPaginas > 1 && (
                            <Paginacao
                                paginaAtual={paginaAtual}
                                totalPaginas={totalPaginas}
                                mudarPagina={setPaginaAtual}
                            />
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}
