// src/pages/financeiro/ControleFinanceiro.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import { collection, getDocs, query, where, orderBy, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    FiDollarSign,
    FiUserPlus,
    FiFileText,
    FiDownload,
    FiPrinter,
    FiRefreshCw,
    FiTrash2,
    FiFilter,
    FiSearch,
    FiEdit2,
    FiPlus,
    FiUser,
    FiCalendar,
    FiAward,
    FiPieChart, FiUsers
} from 'react-icons/fi';
import SidebarMenu from '../fragmentos/SideBarMenu';
import DashboardFinanceiro from './DashboardFinanceiro';
import UsuarioModal from './UsuarioModal';
import RemuneracaoCompletaModal from './RemunerationForm';
import CampoDinamicoModal from './CampoDinamicoModal';
import CalculadoraImpostosModal from './CalculadoraImpostosModal';
import GestaoFerias from './GestaoFerias';
import './ControleFinanceiro.css';

const postosDisponiveis = [
    { value: 'default', label: 'Perequeté' },
    { value: 'colinas', label: 'Colinas' },
    { value: 'colinas25', label: 'Colinas 25' },
    { value: 'posto4', label: 'Posto 4' },
    { value: 'posto5', label: 'Posto 5' },
    { value: 'posto6', label: 'Posto 6' },
    { value: 'posto7', label: 'Posto 7' },
    { value: 'posto8', label: 'Posto 8' },
    { value: 'posto9', label: 'Posto 9' }
];

export default function ControleFinanceiro() {
    const navigate = useNavigate();
    const { user: usuarioLogado, isAuthenticated, logout } = useContext(AuthContext);

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const sidebarRef = useRef(null);

    // Estados principais
    const [usuarios, setUsuarios] = useState([]);
    const [remuneracoes, setRemuneracoes] = useState([]);
    const [folhasGeradas, setFolhasGeradas] = useState([]);
    const [camposDinamicos, setCamposDinamicos] = useState([]);
    const [carregando, setCarregando] = useState(false);

    // Estados de UI
    const [modalUsuarioAberto, setModalUsuarioAberto] = useState(false);
    const [modalRemuneracaoAberto, setModalRemuneracaoAberto] = useState(false);
    const [modalCampoDinamicoAberto, setModalCampoDinamicoAberto] = useState(false);
    const [modalImpostosAberto, setModalImpostosAberto] = useState(false);
    const [modalFeriasAberto, setModalFeriasAberto] = useState(false);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
    const [remuneracaoEditando, setRemuneracaoEditando] = useState(null);
    const [modoEdicao, setModoEdicao] = useState(false);
    const [modalUsuarioMultiploAberto, setModalUsuarioMultiploAberto] = useState(false);
    const [modoMultiplaSelecao, setModoMultiplaSelecao] = useState(false);

    // Filtros
    const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
    const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
    const [filtroPosto, setFiltroPosto] = useState('');
    const [filtroBusca, setFiltroBusca] = useState('');
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

    // Verificar se usuário tem permissão
    const temPermissao = () => {
        if (!usuarioLogado) return false;
        const permissao = Number(usuarioLogado.permissao);
        return permissao === 1 || permissao === 2;
    };

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (!temPermissao()) {
            alert('Acesso restrito a Gestores e Gerentes Gerais');
            navigate('/');
            return;
        }

        carregarDadosIniciais();
    }, [isAuthenticated, usuarioLogado]);

    const carregarDadosIniciais = async () => {
        if (!temPermissao()) return;

        setCarregando(true);
        try {
            await Promise.all([
                carregarUsuarios(),
                carregarRemuneracoes(),
                carregarFolhasGeradas(),
                carregarCamposDinamicos()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setCarregando(false);
        }
    };

    const carregarUsuarios = async () => {
        try {
            let usuariosQuery = collection(db, 'users');

            if (Number(usuarioLogado?.permissao) === 2) {
                usuariosQuery = query(usuariosQuery, where('posto', '==', usuarioLogado?.posto || 'default'));
            }

            const snapshot = await getDocs(usuariosQuery);
            const usuariosData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setUsuarios(usuariosData);
        } catch (error) {
            console.warn('Erro ao carregar usuários:', error);
            setUsuarios([]);
        }
    };
    const abrirModalUsuarioMultiplo = () => {
        setModoMultiplaSelecao(true);
        setModalUsuarioAberto(true);
    };
    // Função carregarRemuneracoes atualizada
    const carregarRemuneracoes = async () => {
        try {
            let remuneracoesQuery = collection(db, 'remuneracoes');

            if (Number(usuarioLogado?.permissao) === 2) {
                remuneracoesQuery = query(remuneracoesQuery, where('posto', '==', usuarioLogado?.posto || 'default'));
            }

            remuneracoesQuery = query(remuneracoesQuery, orderBy('criadoEm', 'desc'));

            const snapshot = await getDocs(remuneracoesQuery);
            const remuneracoesData = snapshot.docs.map(doc => ({
                id: doc.id,
                salarioBase: doc.data().salarioBase || 0,
                camposDinamicos: doc.data().camposDinamicos || [],
                usuarioId: doc.data().usuarioId || '',
                usuarioNome: doc.data().usuarioNome || '',
                posto: doc.data().posto || 'default',
                criadoPor: doc.data().criadoPor || '',
                criadoEm: doc.data().criadoEm || new Date(),
                ativo: doc.data().ativo !== undefined ? doc.data().ativo : true
            }));

            setRemuneracoes(remuneracoesData);
        } catch (error) {
            console.warn('Erro ao carregar remunerações:', error);
            setRemuneracoes([]);
        }
    };

// Função carregarCamposDinamicos atualizada
    const carregarCamposDinamicos = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'camposDinamicos'));
            const camposData = snapshot.docs.map(doc => ({
                id: doc.id,
                nome: doc.data().nome || '',
                tipo: doc.data().tipo || 'adicao',
                operacao: doc.data().operacao || 'soma',
                valorPadrao: doc.data().valorPadrao || 0,
                descricao: doc.data().descricao || '',
                aplicacao: doc.data().aplicacao || 'todos',
                funcionariosSelecionados: doc.data().funcionariosSelecionados || [],
                criadoPor: doc.data().criadoPor || '',
                criadoEm: doc.data().criadoEm || new Date()
            }));
            setCamposDinamicos(camposData);
        } catch (error) {
            console.warn('Erro ao carregar campos dinâmicos:', error);
            setCamposDinamicos([]);
        }
    };

    const carregarFolhasGeradas = async () => {
        try {
            let folhasQuery = collection(db, 'folhasGeradas');
            folhasQuery = query(folhasQuery, orderBy('mes', 'desc'), orderBy('ano', 'desc'));

            const snapshot = await getDocs(folhasQuery);
            const folhasData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setFolhasGeradas(folhasData);
        } catch (error) {
            console.warn('Erro ao carregar folhas:', error);
            setFolhasGeradas([]);
        }
    };

    

    // Calcular remuneração completa do usuário
    const calcularRemuneracaoUsuario = (usuarioId) => {
        const remuneracaoUsuario = remuneracoes.find(r => r.usuarioId === usuarioId);

        if (!remuneracaoUsuario) {
            return {
                salarioBase: 0,
                camposDinamicos: [],
                totalAdicoes: 0,
                totalDescontos: 0,
                totalProventos: 0,
                salarioLiquido: 0,
                baseCalculoImpostos: 0
            };
        }

        const salarioBase = parseFloat(remuneracaoUsuario.salarioBase) || 0;
        const campos = remuneracaoUsuario.camposDinamicos || [];

        // Calcular totais dos campos dinâmicos
        let totalAdicoes = 0;
        let totalDescontos = 0;

        campos.forEach(campo => {
            const valor = parseFloat(campo.valor) || 0;
            if (campo.tipo === 'adicao') {
                totalAdicoes += valor;
            } else if (campo.tipo === 'desconto') {
                totalDescontos += valor;
            }
        });

        const totalProventos = salarioBase + totalAdicoes;
        const salarioLiquido = totalProventos - totalDescontos;

        return {
            salarioBase,
            camposDinamicos: campos,
            totalAdicoes,
            totalDescontos,
            totalProventos,
            salarioLiquido,
            baseCalculoImpostos: salarioBase
        };
    };

    const abrirModalUsuario = () => {
        setModalUsuarioAberto(true);
    };

    const selecionarUsuario = (usuario) => {
        setUsuarioSelecionado(usuario);
        setModalUsuarioAberto(false);

        const remuneracaoExistente = remuneracoes.find(r => r.usuarioId === usuario.id);
        if (remuneracaoExistente) {
            setRemuneracaoEditando(remuneracaoExistente);
            setModoEdicao(true);
        } else {
            setRemuneracaoEditando(null);
            setModoEdicao(false);
        }

        setModalRemuneracaoAberto(true);
    };

    const abrirModalRemuneracao = (usuario = null) => {
        if (usuario) {
            setUsuarioSelecionado(usuario);
            const remuneracaoExistente = remuneracoes.find(r => r.usuarioId === usuario.id);
            if (remuneracaoExistente) {
                setRemuneracaoEditando(remuneracaoExistente);
                setModoEdicao(true);
            } else {
                setRemuneracaoEditando(null);
                setModoEdicao(false);
            }
        }
        setModalRemuneracaoAberto(true);
    };

    const abrirModalCampoDinamico = () => {
        setModalCampoDinamicoAberto(true);
    };

    const abrirModalImpostos = () => {
        setModalImpostosAberto(true);
    };

    const abrirModalFerias = (usuario = null) => {
        if (usuario) {
            setUsuarioSelecionado(usuario);
        }
        setModalFeriasAberto(true);
    };

    // No arquivo ControleFinanceiro.js, atualize a função salvarRemuneracao:

    const salvarRemuneracao = async (dadosRemuneracao) => {
        try {
            // Garantir que todos os campos tenham valores válidos
            const dadosCompletos = {
                salarioBase: parseFloat(dadosRemuneracao.salarioBase) || 0,
                camposDinamicos: (dadosRemuneracao.camposDinamicos || []).map(campo => ({
                    id: campo.id || '',
                    nome: campo.nome || '',
                    tipo: campo.tipo || 'adicao',
                    operacao: campo.operacao || 'soma',
                    valor: parseFloat(campo.valor) || 0,
                    descricao: campo.descricao || ''
                })),
                usuarioId: usuarioSelecionado?.id || '',
                usuarioNome: usuarioSelecionado?.name || 'Nome não informado',
                posto: usuarioSelecionado?.posto || 'default',
                criadoPor: usuarioLogado?.name || 'Sistema',
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                ativo: true
            };

            // Validar dados obrigatórios
            if (!dadosCompletos.usuarioId) {
                alert('Erro: Usuário não selecionado');
                return;
            }

            if (!dadosCompletos.salarioBase || dadosCompletos.salarioBase <= 0) {
                alert('Salário base deve ser maior que zero');
                return;
            }

            if (modoEdicao && remuneracaoEditando) {
                await updateDoc(doc(db, 'remuneracoes', remuneracaoEditando.id), dadosCompletos);
                alert('Remuneração atualizada com sucesso!');
            } else {
                await addDoc(collection(db, 'remuneracoes'), dadosCompletos);
                alert('Remuneração cadastrada com sucesso!');
            }

            fecharModalRemuneracao();
            carregarRemuneracoes();
        } catch (error) {
            console.error('Erro detalhado ao salvar remuneração:', error);
            alert(`Erro ao salvar remuneração: ${error.message}`);
        }
    };

    const salvarCampoDinamico = async (campo) => {
        try {
            const campoCompleto = {
                ...campo,
                criadoPor: usuarioLogado.name,
                criadoEm: new Date()
            };

            await addDoc(collection(db, 'camposDinamicos'), campoCompleto);
            alert('Campo dinâmico criado com sucesso!');
            setModalCampoDinamicoAberto(false);
            carregarCamposDinamicos();
        } catch (error) {
            console.error('Erro ao salvar campo:', error);
            alert('Erro ao salvar campo dinâmico');
        }
    };

    const excluirRemuneracao = async (usuarioId) => {
        const remuneracao = remuneracoes.find(r => r.usuarioId === usuarioId);
        if (!remuneracao) return;

        if (!window.confirm('Tem certeza que deseja excluir a remuneração deste funcionário?')) return;

        try {
            await deleteDoc(doc(db, 'remuneracoes', remuneracao.id));
            alert('Remuneração excluída com sucesso!');
            carregarRemuneracoes();
        } catch (error) {
            console.error('Erro ao excluir remuneração:', error);
            alert('Erro ao excluir remuneração');
        }
    };

    const gerarFolhaPagamento = async () => {
        try {
            const folhaData = {
                mes: filtroMes,
                ano: filtroAno,
                posto: filtroPosto || 'todos',
                totalBruto: calcularTotalFolha(),
                totalLiquido: calcularTotalFolhaLiquido(),
                quantidadeFuncionarios: usuarios.length,
                geradoPor: usuarioLogado.name,
                geradoEm: new Date(),
                status: 'gerada'
            };

            await addDoc(collection(db, 'folhasGeradas'), folhaData);
            alert('Folha de pagamento gerada com sucesso!');
            carregarFolhasGeradas();
        } catch (error) {
            console.error('Erro ao gerar folha:', error);
            alert('Erro ao gerar folha de pagamento');
        }
    };

    const calcularTotalFolha = () => {
        return usuarios.reduce((total, usuario) => {
            const remuneracao = calcularRemuneracaoUsuario(usuario.id);
            return total + remuneracao.totalProventos;
        }, 0);
    };

    const calcularTotalFolhaLiquido = () => {
        return usuarios.reduce((total, usuario) => {
            const remuneracao = calcularRemuneracaoUsuario(usuario.id);
            return total + remuneracao.salarioLiquido;
        }, 0);
    };

    const limparFiltros = () => {
        setFiltroPosto('');
        setFiltroBusca('');
    };

    const exportarCSV = () => {
        const headers = ['Nome', 'Posto', 'Salário Base', 'Total Adições', 'Total Descontos', 'Salário Líquido'];

        const csvData = usuarios.map(usuario => {
            const remuneracao = calcularRemuneracaoUsuario(usuario.id);
            return [
                usuario.name,
                postosDisponiveis.find(p => p.value === usuario.posto)?.label,
                `R$ ${remuneracao.salarioBase.toFixed(2)}`,
                `R$ ${remuneracao.totalAdicoes.toFixed(2)}`,
                `R$ ${remuneracao.totalDescontos.toFixed(2)}`,
                `R$ ${remuneracao.salarioLiquido.toFixed(2)}`
            ];
        });

        const csvContent = [headers, ...csvData]
            .map(row => row.join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `folha_pagamento_${filtroMes}_${filtroAno}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const fecharModalRemuneracao = () => {
        setModalRemuneracaoAberto(false);
        setUsuarioSelecionado(null);
        setRemuneracaoEditando(null);
    };
    const handleSelecionarMultiplosUsuarios = (usuariosSelecionados) => {
        if (usuariosSelecionados.length === 0) {
            alert('Selecione pelo menos um funcionário');
            return;
        }

        // Aqui você pode implementar a lógica para aplicar algo a múltiplos usuários
        console.log('Usuários selecionados:', usuariosSelecionados);
        alert(`${usuariosSelecionados.length} funcionário(s) selecionado(s)`);

        setModalUsuarioAberto(false);
        setModoMultiplaSelecao(false);
    };
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Filtrar usuários
    const usuariosFiltrados = usuarios.filter(usuario => {
        const passaPosto = !filtroPosto || usuario.posto === filtroPosto;
        const passaBusca = !filtroBusca || usuario.name.toLowerCase().includes(filtroBusca.toLowerCase());
        return passaPosto && passaBusca;
    });

    if (!isAuthenticated) {
        return (
            <div className="app-loading">
                <div className="spinner"></div>
                <p>Redirecionando para login...</p>
            </div>
        );
    }

    if (!temPermissao()) {
        return (
            <div className="app-container">
                <div className="acesso-negado">
                    <h2>Acesso Negado</h2>
                    <p>Esta funcionalidade é restrita a Gestores e Gerentes Gerais.</p>
                    <button onClick={() => navigate('/')}>Voltar para Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <SidebarMenu
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sidebarRef={sidebarRef}
                onLogout={handleLogout}
            />

            <div className={`main-content ${sidebarOpen ? 'open' : ''}`}>
                <header className="main-header">
                    <div className="header-title">
                        <h1><FiDollarSign /> Sistema RH Completo - 9 Postos</h1>
                        <div className="filtros-rapidos">
                            <select value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))}>
                                {Array.from({length: 12}, (_, i) => (
                                    <option key={i+1} value={i+1}>
                                        {new Date(2024, i).toLocaleString('pt-BR', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                            <select value={filtroAno} onChange={(e) => setFiltroAno(Number(e.target.value))}>
                                {Array.from({length: 5}, (_, i) => {
                                    const ano = new Date().getFullYear() - 2 + i;
                                    return <option key={ano} value={ano}>{ano}</option>;
                                })}
                            </select>
                            {Number(usuarioLogado?.permissao) === 1 && (
                                <select value={filtroPosto} onChange={(e) => setFiltroPosto(e.target.value)}>
                                    <option value="">Todos os postos</option>
                                    {postosDisponiveis.map(posto => (
                                        <option key={posto.value} value={posto.value}>{posto.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-primary" onClick={abrirModalUsuario}>
                            <FiUserPlus /> Cadastrar Remuneração
                        </button>
                        <button className="btn btn-secondary" onClick={abrirModalCampoDinamico}>
                            <FiPlus /> Adicionar Campo
                        </button>
                        <button className="btn btn-info" onClick={abrirModalImpostos}>
                            <FiPieChart /> Calculadora Impostos
                        </button>
                        <button className="btn btn-warning" onClick={() => abrirModalFerias()}>
                            <FiCalendar /> Gestão de Férias
                        </button>
                        <button className="btn btn-success" onClick={abrirModalUsuarioMultiplo}>
                            <FiUsers /> Seleção Múltipla
                        </button>
                        <button className="btn btn-outline" onClick={carregarDadosIniciais} disabled={carregando}>
                            <FiRefreshCw className={carregando ? 'spinning' : ''} />
                            {carregando ? 'Atualizando...' : 'Atualizar'}
                        </button>
                    </div>
                </header>

                <div className="content-wrapper">
                    <DashboardFinanceiro
                        usuarios={usuarios}
                        remuneracoes={remuneracoes}
                        folhasGeradas={folhasGeradas}
                        mes={filtroMes}
                        ano={filtroAno}
                        posto={filtroPosto}
                        calcularRemuneracaoUsuario={calcularRemuneracaoUsuario}
                    />

                    {/* Filtros Avançados */}
                    <div className="filtros-avancados">
                        <div className="filtros-header" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
                            <FiFilter />
                            <span>Filtros Avançados</span>
                            <FiFilter className={`arrow ${mostrarFiltros ? 'open' : ''}`} />
                        </div>

                        {mostrarFiltros && (
                            <div className="filtros-content">
                                <div className="filtros-grid">
                                    <div className="filtro-group">
                                        <label>Buscar Funcionário:</label>
                                        <div className="search-input-container">
                                            <FiSearch className="search-icon" />
                                            <input
                                                type="text"
                                                placeholder="Nome do funcionário..."
                                                value={filtroBusca}
                                                onChange={(e) => setFiltroBusca(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {Number(usuarioLogado?.permissao) === 1 && (
                                        <div className="filtro-group">
                                            <label>Posto:</label>
                                            <select value={filtroPosto} onChange={(e) => setFiltroPosto(e.target.value)}>
                                                <option value="">Todos os postos</option>
                                                {postosDisponiveis.map(posto => (
                                                    <option key={posto.value} value={posto.value}>{posto.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="filtro-actions">
                                        <button className="btn btn-outline" onClick={limparFiltros}>
                                            Limpar Filtros
                                        </button>
                                        <span className="resultados">
                                            {usuariosFiltrados.length} de {usuarios.length} funcionários
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="remuneracoes-section">
                        <div className="section-header">
                            <h2>Folha de Pagamento - {new Date(2024, filtroMes-1).toLocaleString('pt-BR', { month: 'long' })}/{filtroAno}</h2>
                            <div className="section-actions">
                                <button className="btn btn-success" onClick={gerarFolhaPagamento}>
                                    <FiFileText /> Gerar Folha
                                </button>
                                <button className="btn btn-outline" onClick={exportarCSV}>
                                    <FiDownload /> Exportar CSV
                                </button>
                                <button className="btn btn-outline">
                                    <FiPrinter /> Imprimir Relatório
                                </button>
                            </div>
                        </div>

                        {carregando ? (
                            <div className="loading-container">
                                <div className="spinner"></div>
                                <p>Carregando folha de pagamento...</p>
                            </div>
                        ) : (
                            <div className="folha-pagamento-table">
                                <table>
                                    <thead>
                                    <tr>
                                        <th>Funcionário</th>
                                        <th>Posto</th>
                                        <th>Salário Base</th>
                                        <th>Adições</th>
                                        <th>Descontos</th>
                                        <th>Salário Líquido</th>
                                        <th>Ações</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {usuariosFiltrados.map(usuario => {
                                        const remuneracao = calcularRemuneracaoUsuario(usuario.id);
                                        const temRemuneracao = remuneracoes.find(r => r.usuarioId === usuario.id);

                                        return (
                                            <tr key={usuario.id}>
                                                <td>
                                                    <div className="usuario-info">
                                                        <FiUser className="user-icon" />
                                                        <div>
                                                            <strong>{usuario.name}</strong>
                                                            <br />
                                                            <small>Admissão: {usuario.dataAdmissao || 'Não informada'}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{postosDisponiveis.find(p => p.value === usuario.posto)?.label}</td>
                                                <td>R$ {(remuneracao.salarioBase || 0).toFixed(2)}</td>
                                                <td className="valor-positivo">R$ {(remuneracao.totalAdicoes || 0).toFixed(2)}</td>
                                                <td className="valor-negativo">R$ {(remuneracao.totalDescontos || 0).toFixed(2)}</td>
                                                <td className="salario-liquido">R$ {(remuneracao.salarioLiquido || 0).toFixed(2)}</td>
                                                <td>
                                                    <div className="acao-buttons">
                                                        <button
                                                            className="btn-icon edit"
                                                            onClick={() => abrirModalRemuneracao(usuario)}
                                                            title="Editar Remuneração"
                                                        >
                                                            <FiEdit2 />
                                                        </button>
                                                        <button
                                                            className="btn-icon info"
                                                            onClick={() => abrirModalFerias(usuario)}
                                                            title="Gestão de Férias"
                                                        >
                                                            <FiCalendar />
                                                        </button>
                                                        {temRemuneracao && (
                                                            <button
                                                                className="btn-icon delete"
                                                                onClick={() => excluirRemuneracao(usuario.id)}
                                                                title="Excluir Remuneração"
                                                            >
                                                                <FiTrash2 />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {usuariosFiltrados.length === 0 && !carregando && (
                            <div className="empty-state">
                                <FiUser size={48} />
                                <h3>Nenhum funcionário encontrado</h3>
                                <p>
                                    {usuarios.length === 0
                                        ? 'Nenhum funcionário cadastrado no sistema'
                                        : 'Tente ajustar os filtros ou buscar por outros termos'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Seleção de Usuário */}
            {modalUsuarioAberto && (
                <UsuarioModal
                    usuarios={usuarios}
                    onSelecionarUsuario={selecionarUsuario}
                    onSelecionarMultiplos={handleSelecionarMultiplosUsuarios}
                    onFechar={() => {
                        setModalUsuarioAberto(false);
                        setModoMultiplaSelecao(false);
                    }}
                    usuarioLogado={usuarioLogado}
                    multiplaSelecao={modoMultiplaSelecao}
                    selecionados={[]}
                />
            )}

            {/* Modal de Cadastro/Edição de Remuneração */}
            {modalRemuneracaoAberto && usuarioSelecionado && (
                <RemuneracaoCompletaModal
                    usuario={usuarioSelecionado}
                    remuneracao={remuneracaoEditando}
                    modoEdicao={modoEdicao}
                    onSalvar={salvarRemuneracao}
                    onCancelar={fecharModalRemuneracao}
                    camposDinamicos={camposDinamicos}
                />
            )}

            {/* Modal de Campo Dinâmico */}
            {modalCampoDinamicoAberto && (
                <CampoDinamicoModal
                    onSalvar={salvarCampoDinamico}
                    onCancelar={() => setModalCampoDinamicoAberto(false)}
                />
            )}

            {/* Modal de Calculadora de Impostos */}
            {modalImpostosAberto && (
                <CalculadoraImpostosModal
                    onFechar={() => setModalImpostosAberto(false)}
                />
            )}

            {/* Modal de Gestão de Férias */}
            {modalFeriasAberto && (
                <GestaoFerias
                    usuario={usuarioSelecionado}
                    usuarios={usuarios}
                    onFechar={() => setModalFeriasAberto(false)}
                    usuarioLogado={usuarioLogado}
                />
            )}
        </div>
    );
}