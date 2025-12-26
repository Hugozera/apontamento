import React, { useState, useEffect, useContext, useRef } from 'react';
import { collection, getDocs, query, orderBy, where, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import { Button, Form, Row, Col, Spinner, Alert, Modal } from 'react-bootstrap';
import FiltrosAvancados from '../Planilha/fragmentos/FiltrosAvancados';
import GraficosAnaliticos from '../Planilha/fragmentos/GraficosAnaliticos';
import Paginacao from '../Planilha/fragmentos/Paginacao';
import UsuarioCard from '../Planilha/fragmentos/UsuarioCard';
import SidebarMenu from '../../pages/fragmentos/SideBarMenu';

import { classificarPontos, calcularTotaisDia } from '../../utils/pontoCalculations';
import { formatarDataSimples, parseDataHora, getPrimeiroDiaMes, getUltimoDiaMes } from '../../utils/dateUtils';
import { JORNADAS } from '../../utils/constants';

import useImprimirRelatorio from '../Planilha/fragmentos/useImprimirRelatorio';

const permissoesMap = {
    1: 'Gestor',
    2: 'Gerente Geral',
    3: 'Gerente de Equipes',
    4: 'Frentista'
};

// Componente Modal de Cadastro de Postos com API CNPJ
const CadastroPostoModal = ({ show, onHide, onSuccess }) => {
    const [formData, setFormData] = useState({
        nome: '',
        codigo: '',
        cnpj: '',
        razaoSocial: '',
        endereco: '',
        telefone: '',
        email: '',
        responsavel: '',
        status: 'ativo'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [buscandoCNPJ, setBuscandoCNPJ] = useState(false);

    const buscarDadosCNPJ = async (cnpj) => {
        try {
            cnpj = cnpj.replace(/\D/g, '');

            if (cnpj.length !== 14) {
                throw new Error('CNPJ inválido');
            }

            // Usar BrasilAPI (gratuita)
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);

            if (!response.ok) {
                throw new Error('CNPJ não encontrado');
            }

            const data = await response.json();

            return {
                razao_social: data.razao_social || '',
                nome_fantasia: data.nome_fantasia || '',
                logradouro: data.logradouro || '',
                numero: data.numero || '',
                complemento: data.complemento || '',
                bairro: data.bairro || '',
                municipio: data.municipio || '',
                uf: data.uf || '',
                cep: data.cep || '',
                telefone: data.telefone || '',
                email: data.email || ''
            };
        } catch (error) {
            console.error('Erro ao buscar CNPJ:', error);
            throw error;
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === 'nome') {
            const codigo = value.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '_')
                .replace(/[^a-z0-9_]/g, '');
            setFormData(prev => ({
                ...prev,
                codigo: codigo || ''
            }));
        }

        if (name === 'cnpj') {
            const cnpjLimpo = value.replace(/\D/g, '');
            let cnpjFormatado = '';

            if (cnpjLimpo.length > 0) cnpjFormatado = cnpjLimpo.substring(0, 2);
            if (cnpjLimpo.length > 2) cnpjFormatado += '.' + cnpjLimpo.substring(2, 5);
            if (cnpjLimpo.length > 5) cnpjFormatado += '.' + cnpjLimpo.substring(5, 8);
            if (cnpjLimpo.length > 8) cnpjFormatado += '/' + cnpjLimpo.substring(8, 12);
            if (cnpjLimpo.length > 12) cnpjFormatado += '-' + cnpjLimpo.substring(12, 14);

            setFormData(prev => ({
                ...prev,
                cnpj: cnpjFormatado
            }));
        }
    };

    const handleBuscarCNPJ = async () => {
        if (!formData.cnpj) {
            setError('Digite um CNPJ para buscar');
            return;
        }

        try {
            setBuscandoCNPJ(true);
            setError('');

            const dadosCNPJ = await buscarDadosCNPJ(formData.cnpj);

            setFormData(prev => ({
                ...prev,
                razaoSocial: dadosCNPJ.razao_social,
                endereco: `${dadosCNPJ.logradouro}, ${dadosCNPJ.numero}${dadosCNPJ.complemento ? ' - ' + dadosCNPJ.complemento : ''} - ${dadosCNPJ.bairro}, ${dadosCNPJ.municipio} - ${dadosCNPJ.uf}`,
                telefone: dadosCNPJ.telefone || '',
                email: dadosCNPJ.email || ''
            }));

        } catch (err) {
            setError('Erro ao buscar CNPJ: ' + err.message + '. Preencha manualmente.');
        } finally {
            setBuscandoCNPJ(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.nome || !formData.codigo || !formData.cnpj || !formData.razaoSocial) {
            setError('Preencha todos os campos obrigatórios (*)');
            return;
        }

        const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
        if (cnpjLimpo.length !== 14) {
            setError('CNPJ inválido (14 dígitos)');
            return;
        }

        try {
            setLoading(true);

            // Verificar se já existe posto com mesmo código
            const postosRef = collection(db, 'postos');
            const q = query(postosRef, where('codigo', '==', formData.codigo));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                setError('Já existe um posto com este código');
                return;
            }

            const postoData = {
                ...formData,
                cnpj: cnpjLimpo,
                dataCadastro: new Date().toISOString(),
                dataAtualizacao: new Date().toISOString()
            };

            await addDoc(postosRef, postoData);

            setFormData({
                nome: '',
                codigo: '',
                cnpj: '',
                razaoSocial: '',
                endereco: '',
                telefone: '',
                email: '',
                responsavel: '',
                status: 'ativo'
            });

            if (onSuccess) {
                onSuccess();
            }

            onHide();

        } catch (err) {
            console.error('Erro ao cadastrar posto:', err);
            setError('Erro ao cadastrar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Cadastrar Novo Posto</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nome do Posto *</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    placeholder="Ex: Perequeté, Colinas"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Código *</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="codigo"
                                    value={formData.codigo}
                                    onChange={handleChange}
                                    placeholder="Ex: perequete, colinas"
                                    required
                                />
                                <Form.Text muted>Código único</Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>CNPJ *</Form.Label>
                        <div className="d-flex">
                            <Form.Control
                                type="text"
                                name="cnpj"
                                value={formData.cnpj}
                                onChange={handleChange}
                                placeholder="00.000.000/0000-00"
                                required
                            />
                            <Button
                                variant="outline-secondary"
                                onClick={handleBuscarCNPJ}
                                disabled={buscandoCNPJ || !formData.cnpj}
                                className="ms-2"
                            >
                                {buscandoCNPJ ? 'Buscando...' : 'Buscar CNPJ'}
                            </Button>
                        </div>
                        <Form.Text muted>Digite CNPJ e clique em Buscar</Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Razão Social *</Form.Label>
                        <Form.Control
                            type="text"
                            name="razaoSocial"
                            value={formData.razaoSocial}
                            onChange={handleChange}
                            placeholder="Razão Social"
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Endereço</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            name="endereco"
                            value={formData.endereco}
                            onChange={handleChange}
                            placeholder="Endereço completo"
                        />
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Telefone</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="telefone"
                                    value={formData.telefone}
                                    onChange={handleChange}
                                    placeholder="(00) 0000-0000"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>E-mail</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="email@empresa.com"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Responsável</Form.Label>
                        <Form.Control
                            type="text"
                            name="responsavel"
                            value={formData.responsavel}
                            onChange={handleChange}
                            placeholder="Gerente responsável"
                        />
                        <Form.Text muted>Assinará relatórios</Form.Text>
                    </Form.Group>

                    <div className="d-flex justify-content-end">
                        <Button variant="secondary" onClick={onHide} className="me-2">
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? 'Cadastrando...' : 'Cadastrar Posto'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

// FUNÇÕES ORIGINAIS (NÃO ALTERADAS)
const getColecaoEfetivados = (posto) => {
    switch (posto) {
        case 'colinas':
            return 'pontosFfetivadosCoLinas';
        case 'colinas25':
            return 'pontosFfetivadosCoLinas25';
        default:
            return 'pontosEfetivados';
    }
};

const getColecaoAbonos = (posto) => {
    switch (posto) {
        case 'colinas':
            return 'abonosCoLinas';
        case 'colinas25':
            return 'abonosCoLinas25';
        default:
            return 'abonos';
    }
};

const getColecaoFaltas = (posto) => {
    switch (posto) {
        case 'colinas':
            return 'faltasCoLinas';
        case 'colinas25':
            return 'faltasCoLinas25';
        default:
            return 'faltas';
    }
};

// Funções auxiliares para buscar dados do posto
const buscarInformacoesPosto = async (postoCodigo) => {
    try {
        if (!postoCodigo) return null;

        const postosRef = collection(db, 'postos');
        const q = query(postosRef, where('codigo', '==', postoCodigo));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const postoData = snapshot.docs[0].data();
            return {
                id: snapshot.docs[0].id,
                ...postoData
            };
        }

        return null;
    } catch (error) {
        console.error('Erro ao buscar posto:', error);
        return null;
    }
};

// NOVA FUNÇÃO: Buscar gerente geral responsável pelo posto
const buscarGerenteGeralResponsavel = async (postoCodigo) => {
    try {
        if (!postoCodigo) return null;

        const usersRef = collection(db, 'users');
        const q = query(
            usersRef,
            where('posto', '==', postoCodigo),
            where('permissao', '==', '2'), // Permissão 2 = Gerente Geral
            where('status', '==', 'ativo') // Adicione campo status se existir
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // Retorna o primeiro gerente geral encontrado
            const gerenteData = snapshot.docs[0].data();
            return {
                id: snapshot.docs[0].id,
                nome: gerenteData.name,
                email: gerenteData.email,
                idLogin: gerenteData.idLogin
            };
        }

        // Se não encontrar gerente geral, buscar qualquer responsável com permissão 2
        const qBackup = query(
            usersRef,
            where('posto', '==', postoCodigo),
            where('permissao', '==', '2')
        );
        const snapshotBackup = await getDocs(qBackup);

        if (!snapshotBackup.empty) {
            const gerenteData = snapshotBackup.docs[0].data();
            return {
                id: snapshotBackup.docs[0].id,
                nome: gerenteData.name,
                email: gerenteData.email,
                idLogin: gerenteData.idLogin
            };
        }

        return null;
    } catch (error) {
        console.error('Erro ao buscar gerente geral:', error);
        return null;
    }
};

// Função para formatar CNPJ
const formatarCNPJ = (cnpj) => {
    if (!cnpj) return '';
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length === 14) {
        return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
};

const buscarTodosPostos = async () => {
    try {
        const postosRef = collection(db, 'postos');
        const snapshot = await getDocs(postosRef);

        if (snapshot.empty) {
            return [
                { value: 'default', label: 'Perequeté', codigo: 'default' },
                { value: 'colinas', label: 'Colinas', codigo: 'colinas' },
                { value: 'colinas25', label: 'Colinas 25', codigo: 'colinas25' }
            ];
        }

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                value: data.codigo,
                label: data.nome || data.codigo,
                codigo: data.codigo,
                ...data
            };
        });
    } catch (error) {
        console.error('Erro ao buscar postos:', error);
        return [];
    }
};

function toDateInputString(value) {
    if (!value) return '';
    if (value instanceof Date) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
            const [d, m, y] = value.split('/');
            return `${y}-${m}-${d}`;
        }
        if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
            return value.slice(0, 10);
        }
        const dt = new Date(value);
        if (!isNaN(dt.getTime())) {
            return toDateInputString(dt);
        }
    }
    if (typeof value === 'object' && value !== null) {
        if (value.seconds) {
            return toDateInputString(new Date(value.seconds * 1000));
        }
        if (typeof value.toDate === 'function') {
            return toDateInputString(value.toDate());
        }
    }
    return '';
}

export default function PlanilhaMensalCompleta() {
    const navigate = useNavigate();
    const { user: usuarioLogado, isAuthenticated, logout } = useContext(AuthContext);

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const sidebarRef = useRef(null);
    const [showCadastroPosto, setShowCadastroPosto] = useState(false);

    const [dadosAgrupados, setDadosAgrupados] = useState([]);
    const [totaisPorUsuario, setTotaisPorUsuario] = useState({});
    const [carregando, setCarregando] = useState(false);
    const [postosDisponiveis, setPostosDisponiveis] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);

    const hoje = new Date();
    const primeiroDiaMes = getPrimeiroDiaMes(hoje.getFullYear(), hoje.getMonth() + 1);
    const ultimoDiaMes = getUltimoDiaMes(hoje.getFullYear(), hoje.getMonth() + 1);

    // VOLTANDO À CONFIGURAÇÃO ORIGINAL
    const [filtros, setFiltros] = useState({
        dataInicio: toDateInputString(primeiroDiaMes),
        dataFim: toDateInputString(ultimoDiaMes),
        departamento: '',
        jornada: '',
        busca: '',
        posto: '' // Gestor pode ver todos os postos
    });

    const [jornadaAtiva, setJornadaAtiva] = useState('12/36');
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina] = useState(5);
    const [erros, setErros] = useState([]);

    const imprimir = useImprimirRelatorio();

    // Função para carregar postos disponíveis
    const carregarPostosDisponiveis = async () => {
        try {
            const postos = await buscarTodosPostos();
            setPostosDisponiveis(postos);
        } catch (error) {
            console.error('Erro ao carregar postos:', error);
        }
    };

    // Carrega dados iniciais - MANTENDO LÓGICA ORIGINAL
    useEffect(() => {
        const carregarDadosIniciais = async () => {
            if (!isAuthenticated) return;

            setCarregando(true);
            setErros([]);
            try {
                // Carrega postos disponíveis
                await carregarPostosDisponiveis();

                // LÓGICA ORIGINAL DE BUSCAR USUÁRIOS
                let usuariosQuery = collection(db, 'users');

                // Apenas gestores veem todos os usuários de todos os postos
                if (Number(usuarioLogado?.permissao) !== 1) {
                    // Não-gestores: buscar apenas usuários do mesmo posto
                    usuariosQuery = query(usuariosQuery, where('posto', '==', usuarioLogado?.posto || 'default'));
                }

                const usuariosSnapshot = await getDocs(usuariosQuery);
                const usuariosData = usuariosSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    idLogin: doc.data().idLogin ? doc.data().idLogin.toString() : '',
                    jornada: doc.data().jornada || '12/36',
                    posto: doc.data().posto || 'default',
                    permissao: doc.data().permissao ? Number(doc.data().permissao) : 4
                }));

                // Função original para filtrar usuários permitidos
                const usuariosPermitidos = getUsuariosPermitidos(usuariosData);
                setUsuarios(usuariosPermitidos);

                console.log('Usuários carregados:', usuariosData.length);
                console.log('Usuários permitidos:', usuariosPermitidos.length);
                console.log('Permissão usuário logado:', usuarioLogado?.permissao);
                console.log('Posto usuário logado:', usuarioLogado?.posto);

                const deptos = [...new Set(usuariosPermitidos.map(u => u.departamento).filter(Boolean))];
                setDepartamentos(deptos);

                if (usuariosPermitidos.length > 0) {
                    await carregarDadosPontos(usuariosPermitidos);
                } else {
                    setDadosAgrupados([]);
                    setTotaisPorUsuario({});
                }
            } catch (error) {
                console.error('Erro ao carregar dados iniciais:', error);
                setErros(['Erro ao carregar dados: ' + error.message]);
            } finally {
                setCarregando(false);
            }
        };

        carregarDadosIniciais();
    }, [isAuthenticated, usuarioLogado]);

    // Funções originais de permissão
    const temPermissaoParaVer = (usuarioAlvo) => {
        if (!usuarioLogado || !usuarioAlvo) return false;

        const cargoUsuarioLogado = Number(usuarioLogado?.permissao) || 0;
        const cargoAlvo = Number(usuarioAlvo?.permissao) || 0;
        const postoUsuario = usuarioLogado?.posto || 'default';
        const postoAlvo = usuarioAlvo.posto || 'default';

        if (cargoUsuarioLogado === 1) return true;
        if (postoAlvo !== postoUsuario) return false;
        if (usuarioAlvo.idLogin === usuarioLogado.idLogin) return true;

        if (cargoUsuarioLogado === 2) {
            return cargoAlvo >= 3;
        }

        if (cargoUsuarioLogado === 3) {
            return cargoAlvo === 4;
        }

        return false;
    };

    const getUsuariosPermitidos = (usuariosData) => {
        if (!usuarioLogado) return [];

        const cargoUsuarioLogado = Number(usuarioLogado?.permissao) || 0;
        const postoUsuario = usuarioLogado?.posto || 'default';

        if (cargoUsuarioLogado === 1) {
            return usuariosData;
        }

        const usuariosMesmoPosto = usuariosData.filter(user =>
            user.posto === postoUsuario
        );

        return usuariosMesmoPosto.filter(user => {
            if (user.idLogin === usuarioLogado.idLogin) return true;

            const cargoAlvo = Number(user.permissao) || 0;

            if (cargoUsuarioLogado === 2) {
                return cargoAlvo >= 3;
            }

            if (cargoUsuarioLogado === 3) {
                return cargoAlvo === 4;
            }

            return false;
        });
    };

    // Função de re-fetch
    const reFetch = async () => {
        await carregarDadosPontos(usuarios);
    };

    // ---- FUNÇÃO ORIGINAL carregarDadosPontos - NÃO MODIFICADA ----
    async function carregarDadosPontos(usuariosData) {
        try {
            setCarregando(true);
            setErros([]);

            let usuariosFiltrados = usuariosData.filter(user => {
                const deptoMatch = !filtros.departamento || user.departamento === filtros.departamento;
                const jornadaMatch = !filtros.jornada || user.jornada === filtros.jornada;
                const postoMatch = !filtros.posto || user.posto === filtros.posto;
                return deptoMatch && jornadaMatch && postoMatch;
            });

            if (usuariosFiltrados.length === 0) {
                setDadosAgrupados([]);
                setTotaisPorUsuario({});
                return;
            }

            const criarDataLocal = (str, isFim = false) => {
                if (!str) return null;
                if (str instanceof Date) {
                    const d = new Date(str.getFullYear(), str.getMonth(), str.getDate());
                    if (isFim) d.setHours(23, 59, 59, 999);
                    return d;
                }
                const parts = String(str).split('-').map(Number);
                if (parts.length >= 3) {
                    const d = new Date(parts[0], parts[1] - 1, parts[2]);
                    if (isFim) d.setHours(23, 59, 59, 999);
                    return d;
                }
                return null;
            };

            const dataInicioFiltro = criarDataLocal(filtros.dataInicio, false);
            const dataFimFiltro = criarDataLocal(filtros.dataFim, true);

            console.log('Buscando dados para usuários:', usuariosFiltrados.map(u => u.name));
            console.log('Período:', dataInicioFiltro, 'até', dataFimFiltro);

            let todasColecoesPontos = [];
            let todasColecoesAbonos = [];
            let todasColecoesFaltas = [];

            // LÓGICA ORIGINAL: Gestor busca todos os postos, outros apenas seu posto
            const postosParaBuscar = Number(usuarioLogado?.permissao) === 1
                ? ['default', 'colinas', 'colinas25']
                : [usuarioLogado?.posto || 'default'];

            const idsUsuariosFiltrados = usuariosFiltrados.map(u => u.name);
            const usarInUsuarios = idsUsuariosFiltrados.length > 0 && idsUsuariosFiltrados.length <= 10;

            for (const posto of postosParaBuscar) {
                try {
                    const colecaoPontos = getColecaoEfetivados(posto);
                    const colecaoAbonos = getColecaoAbonos(posto);
                    const colecaoFaltas = getColecaoFaltas(posto);

                    let qPontos = collection(db, colecaoPontos);

                    if (dataInicioFiltro && dataFimFiltro) {
                        try {
                            qPontos = query(qPontos, where('horaPonto', '>=', dataInicioFiltro), where('horaPonto', '<=', dataFimFiltro), orderBy('horaPonto', 'asc'));
                        } catch (e) {
                            qPontos = query(qPontos, orderBy('horaPonto', 'asc'));
                        }
                    } else {
                        qPontos = query(qPontos, orderBy('horaPonto', 'asc'));
                    }

                    if (usarInUsuarios) {
                        try {
                            qPontos = query(qPontos, where('usuario', 'in', idsUsuariosFiltrados));
                        } catch (e) {
                            // ignore
                        }
                    }

                    const [snapshotPontos, snapshotAbonos, snapshotFaltas] = await Promise.all([
                        getDocs(qPontos),
                        (async () => {
                            const qAb = collection(db, colecaoAbonos);
                            const qAbFinal = dataInicioFiltro && dataFimFiltro
                                ? query(qAb, where('data', '>=', dataInicioFiltro), where('data', '<=', dataFimFiltro), orderBy('data', 'asc'))
                                : query(qAb, orderBy('data', 'asc'));
                            return await getDocs(qAbFinal);
                        })(),
                        (async () => {
                            const qF = collection(db, colecaoFaltas);
                            const qFFinal = dataInicioFiltro && dataFimFiltro
                                ? query(qF, where('data', '>=', dataInicioFiltro), where('data', '<=', dataFimFiltro), orderBy('data', 'asc'))
                                : query(qF, orderBy('data', 'asc'));
                            return await getDocs(qFFinal);
                        })()
                    ]);

                    todasColecoesPontos = [
                        ...todasColecoesPontos,
                        ...snapshotPontos.docs.map(d => ({ doc: d, colecao: colecaoPontos }))
                    ];
                    todasColecoesAbonos = [
                        ...todasColecoesAbonos,
                        ...snapshotAbonos.docs.map(d => ({ doc: d, colecao: colecaoAbonos }))
                    ];
                    todasColecoesFaltas = [
                        ...todasColecoesFaltas,
                        ...snapshotFaltas.docs.map(d => ({ doc: d, colecao: colecaoFaltas }))
                    ];
                } catch (error) {
                    console.warn(`Erro ao buscar dados do posto ${posto}:`, error);
                }
            }

            const todosPontos = todasColecoesPontos
                .map(({ doc, colecao }) => {
                    const data = doc.data();
                    const horaPontoDate = parseDataHora(data.horaPonto);
                    return {
                        id: doc.id,
                        colecao,
                        ...data,
                        horaPontoDate,
                        dataStr: horaPontoDate ? formatarDataSimples(horaPontoDate) : '',
                        posto: data.posto || 'default',
                        isFalta: (data.status || '').toLowerCase() === 'falta' || (data.status || '').toLowerCase() === 'faltas',
                        tipoFalta: data.tipo || ''
                    };
                })
                .filter(ponto => {
                    if (!idsUsuariosFiltrados.includes(ponto.usuario)) return false;
                    if (!ponto.horaPontoDate) return false;
                    if (dataInicioFiltro && ponto.horaPontoDate < dataInicioFiltro) return false;
                    if (dataFimFiltro && ponto.horaPontoDate > dataFimFiltro) return false;
                    return true;
                });

            console.log('Pontos filtrados:', todosPontos.length);

            const todosAbonos = todasColecoesAbonos
                .map(({ doc, colecao }) => {
                    const data = doc.data();
                    const dataDate = parseDataHora(data.data);
                    return {
                        id: doc.id,
                        colecao,
                        ...data,
                        dataDate,
                        dataStr: dataDate ? formatarDataSimples(dataDate) : '',
                        posto: data.posto || 'default'
                    };
                })
                .filter(abono => idsUsuariosFiltrados.includes(abono.usuario));

            const todasFaltas = todasColecoesFaltas
                .map(({ doc, colecao }) => {
                    const data = doc.data();
                    const dataDate = parseDataHora(data.data);
                    return {
                        id: doc.id,
                        colecao,
                        ...data,
                        dataDate,
                        dataStr: dataDate ? formatarDataSimples(dataDate) : '',
                        posto: data.posto || 'default'
                    };
                })
                .filter(falta => idsUsuariosFiltrados.includes(falta.usuario));

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
                    idLogin: user.idLogin || '',
                    posto: user.posto || 'default'
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
                        faltas: [],
                        abonos: [],
                        faltaCompleta: false,
                        jornada: usuario?.jornada || '12/36',
                        posto: usuario?.posto || 'default'
                    };
                }
                if (ponto.isFalta) agrupados[chave].faltas.push(ponto);
                else agrupados[chave].pontos.push(ponto);
            });

            todosAbonos.forEach(abono => {
                const chave = `${abono.usuario}_${abono.dataStr}`;
                if (!agrupados[chave]) {
                    agrupados[chave] = {
                        usuario: abono.usuario,
                        idLogin: abono.idLogin || '',
                        data: abono.dataStr,
                        pontos: [],
                        faltas: [],
                        abonos: [],
                        faltaCompleta: false,
                        jornada: '12/36',
                        posto: abono.posto || 'default'
                    };
                }
                agrupados[chave].abonos.push(abono);
            });

            Object.keys(agrupados).forEach(chave => {
                const item = agrupados[chave];
                if (item.faltas.length >= 4) {
                    item.faltaCompleta = true;
                    if (totaisUsuario[item.usuario]) {
                        totaisUsuario[item.usuario].faltas += 1;
                    }
                }
            });

            const listaFinal = Object.values(agrupados).map(item => {
                const usuario = usuariosData.find(u => u.name === item.usuario);
                const isNoturno = usuario?.noturno === true || (item.jornada || '').toLowerCase().includes('noturno');
                const jornadaConfig = JORNADAS[item.jornada] || JORNADAS['12/36'];

                if (item.faltaCompleta) {
                    return {
                        ...item,
                        entrada: null,
                        saidaAlmoco: null,
                        voltaAlmoco: null,
                        saida: null,
                        totaisDia: {
                            horasTrabalhadas: 0,
                            horasExtras: 0,
                            atrasoEntrada: 0,
                            atrasoVoltaAlmoco: 0,
                            observacoes: ['FALTA']
                        },
                        isNoturno,
                        isFaltaCompleta: true,
                        pontos: (item.pontos || []).map(p => ({ ...p, horaPontoDate: p.horaPontoDate || parseDataHora(p.horaPonto) }))
                    };
                }

                const pontosComDate = (item.pontos || []).map(p => {
                    if (p.horaPontoDate) return p;
                    const d = parseDataHora(p.horaPonto);
                    return { ...p, horaPontoDate: d };
                });

                const pontosClassificados = classificarPontos(pontosComDate, isNoturno);

                const converterParaDate = (valor) => {
                    if (!valor) return null;
                    if (valor instanceof Date) return valor;
                    if (typeof valor === 'object' && valor !== null) {
                        if (valor.seconds) return new Date(valor.seconds * 1000);
                        if (valor.toDate && typeof valor.toDate === 'function') return valor.toDate();
                    }
                    const d = parseDataHora(valor);
                    if (d) return d;
                    const dd = new Date(valor);
                    return isNaN(dd.getTime()) ? null : dd;
                };

                const entradaDate = converterParaDate(pontosClassificados.entrada);
                const saidaAlmocoDate = converterParaDate(pontosClassificados.saidaAlmoco);
                const voltaAlmocoDate = converterParaDate(pontosClassificados.voltaAlmoco);
                const saidaDate = converterParaDate(pontosClassificados.saida);

                const totaisDia = calcularTotaisDia(
                    {
                        entrada: entradaDate,
                        saidaAlmoco: saidaAlmocoDate,
                        voltaAlmoco: voltaAlmocoDate,
                        saida: saidaDate
                    },
                    item.abonos || [],
                    null,
                    jornadaConfig,
                    isNoturno
                );

                if (item.faltas.length > 0) {
                    totaisDia.observacoes = totaisDia.observacoes || [];
                    totaisDia.observacoes.push(`Faltas parciais: ${item.faltas.length}`);
                    totaisDia.temFalta = true;
                }

                if (totaisUsuario[item.usuario] && totaisDia.horasTrabalhadas > 0) {
                    totaisUsuario[item.usuario].horasExtras += totaisDia.horasExtras || 0;
                    totaisUsuario[item.usuario].atrasos += (totaisDia.atrasoEntrada || 0) + (totaisDia.atrasoVoltaAlmoco || 0);
                    totaisUsuario[item.usuario].diasTrabalhados += 1;
                } else if (totaisUsuario[item.usuario] && totaisDia.observacoes && totaisDia.observacoes.includes('DIA ABONADO')) {
                    totaisUsuario[item.usuario].diasAbonados += 1;
                } else if (totaisUsuario[item.usuario] && totaisDia.faltaCompleta) {
                    totaisUsuario[item.usuario].faltas += 1;
                }

                return {
                    ...item,
                    pontos: pontosComDate,
                    entrada: entradaDate,
                    saidaAlmoco: saidaAlmocoDate,
                    voltaAlmoco: voltaAlmocoDate,
                    saida: saidaDate,
                    totaisDia,
                    isNoturno,
                    isFaltaCompleta: false
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

    // Cálculos para paginação
    const usuariosUnicos = [...new Set(dadosAgrupados.map(item => item.usuario))];
    const usuariosFiltrados = filtros.busca
        ? usuariosUnicos.filter(usuario =>
            usuario.toLowerCase().includes(filtros.busca.toLowerCase()) ||
            (totaisPorUsuario[usuario]?.idLogin &&
                totaisPorUsuario[usuario].idLogin.toString().toLowerCase().includes(filtros.busca.toLowerCase()))
        )
        : usuariosUnicos;
    const totalPaginas = Math.ceil(usuariosFiltrados.length / itensPorPagina);
    const usuariosPaginados = usuariosFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

    const dadosPorUsuario = usuariosPaginados.map(usuario => ({
        usuario,
        registros: dadosAgrupados
            .filter(item => item.usuario === usuario)
            .sort((a, b) => {
                const [dA, mA, yA] = String(a.data).split('/').map(Number);
                const [dB, mB, yB] = String(b.data).split('/').map(Number);
                return new Date(yA, mA - 1, dA) - new Date(yB, mB - 1, dB);
            }),
        totais: totaisPorUsuario[usuario] || {}
    }));

    // FUNÇÃO ATUALIZADA: Imprimir com dados dinâmicos do posto e responsável
    const handleImprimir = async (usuario, registros) => {
        try {
            // Encontrar o usuário
            const usuarioInfo = usuarios.find(u => u.name === usuario);

            if (!usuarioInfo) {
                console.error('Usuário não encontrado:', usuario);
                setErros(['Usuário não encontrado para impressão']);
                return;
            }

            const postoFuncionario = usuarioInfo.posto || 'default';

            // Buscar informações do posto e gerente geral em paralelo
            const [postoInfo, gerenteResponsavel] = await Promise.all([
                buscarInformacoesPosto(postoFuncionario),
                buscarGerenteGeralResponsavel(postoFuncionario)
            ]);

            console.log('Dados para impressão:', {
                postoFuncionario,
                postoInfo,
                gerenteResponsavel
            });

            // Determinar assinante responsável
            let assinanteResponsavel = '';

            if (gerenteResponsavel) {
                // Usar gerente geral do posto se encontrado
                assinanteResponsavel = gerenteResponsavel.nome;
            } else if (postoInfo?.responsavel) {
                // Usar responsável cadastrado no posto
                assinanteResponsavel = postoInfo.responsavel;
            } else if (Number(usuarioLogado?.permissao) <= 2) {
                // Se não tem responsável cadastrado e usuário logado é gestor/gerente geral
                assinanteResponsavel = usuarioLogado?.name || '';
            }

            const datas = registros.map(item => {
                const [d, m, y] = String(item.data).split('/').map(Number);
                return new Date(y, m - 1, d);
            }).filter(Boolean);

            if (datas.length === 0) {
                setErros(['Nenhuma data válida encontrada para impressão']);
                return;
            }

            const dataInicio = new Date(Math.min(...datas));
            const dataFim = new Date(Math.max(...datas));
            const periodo = `${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')}`;

            const usuarioData = {
                usuario,
                totais: totaisPorUsuario[usuario] || {},
                posto: postoFuncionario,
                idLogin: usuarioInfo.idLogin
            };

            const registrosPreparados = registros.map(registro => {
                const converterParaDate = (valor) => {
                    if (!valor) return null;
                    if (valor instanceof Date) return valor;
                    if (typeof valor === 'object' && valor !== null) {
                        if (valor.seconds) return new Date(valor.seconds * 1000);
                        if (valor.toDate && typeof valor.toDate === 'function') return valor.toDate();
                    }
                    if (typeof valor === 'string') {
                        const date = new Date(valor);
                        if (!isNaN(date.getTime())) return date;
                    }
                    return null;
                };

                return {
                    ...registro,
                    entrada: converterParaDate(registro.entrada),
                    saidaAlmoco: converterParaDate(registro.saidaAlmoco),
                    voltaAlmoco: converterParaDate(registro.voltaAlmoco),
                    saida: converterParaDate(registro.saida)
                };
            });

            // Dados dinâmicos para impressão com fallback para padrão
            const dadosEmpresaParaImpressao = {
                razaoSocial: postoInfo?.razaoSocial ||
                    (postoFuncionario === 'default' ? 'Auto Posto Perequeté LTDA' :
                        postoFuncionario === 'colinas' ? 'Auto Posto Colinas LTDA' :
                            postoFuncionario === 'colinas25' ? 'Auto Posto Colinas 25 LTDA' :
                                'Auto Posto'),

                cnpj: postoInfo?.cnpj ? formatarCNPJ(postoInfo.cnpj) :
                    (postoFuncionario === 'default' ? '56.102.541/0001-85' :
                        postoFuncionario === 'colinas' ? '50.607.790/0001-46' :
                            'CNPJ não cadastrado'),

                endereco: postoInfo?.endereco ||
                    (postoFuncionario === 'default' ? 'Quadra 712 sul al 01 lt S/N Plano Diretor Sul' :
                        postoFuncionario === 'colinas' ? 'PEDRO LUDOVICO TEIXEIRA, 1801 - CENTRO, COLINAS DO TOCANTINS - TO' :
                            'Endereço não cadastrado'),

                gestor: assinanteResponsavel ||
                    (Number(usuarioLogado?.permissao) <= 2 ? usuarioLogado?.name || '' : ''),

                nome: postoInfo?.nome ||
                    (postoFuncionario === 'default' ? 'Posto Perequeté' :
                        postoFuncionario === 'colinas' ? 'Posto Colinas' :
                            postoFuncionario === 'colinas25' ? 'Posto Colinas 25' :
                                postoFuncionario),

                telefone: postoInfo?.telefone || '',
                email: postoInfo?.email || '',
                codigo: postoFuncionario,
                responsavel: postoInfo?.responsavel || ''
            };

            console.log('Enviando dados para impressão:', dadosEmpresaParaImpressao);

            imprimir(dadosEmpresaParaImpressao, usuarioData, periodo, registrosPreparados);

        } catch (error) {
            console.error('Erro ao preparar impressão:', error);
            setErros(['Erro ao preparar impressão: ' + error.message]);
        }
    };

    const definirMesAtual = () => {
        const hojeLocal = new Date();
        setFiltros({
            ...filtros,
            dataInicio: toDateInputString(getPrimeiroDiaMes(hojeLocal.getFullYear(), hojeLocal.getMonth() + 1)),
            dataFim: toDateInputString(getUltimoDiaMes(hojeLocal.getFullYear(), hojeLocal.getMonth() + 1))
        });
    };

    const definirMesAnterior = () => {
        const hojeLocal = new Date();
        const mesAnterior = new Date(hojeLocal.getFullYear(), hojeLocal.getMonth() - 1, 1);
        setFiltros({
            ...filtros,
            dataInicio: toDateInputString(getPrimeiroDiaMes(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1)),
            dataFim: toDateInputString(getUltimoDiaMes(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1))
        });
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handlePostoCadastrado = async () => {
        await carregarPostosDisponiveis();
        setShowCadastroPosto(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target) &&
                !event.target.closest('.toggle-btn') && window.innerWidth <= 768) {
                setSidebarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isAuthenticated) {
        return (
            <div className="app-loading">
                <div className="spinner"></div>
                <p>Redirecionando para login...</p>
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
                        <h1>Relatório de Ponto Avançado</h1>
                    </div>
                    <div className="header-actions">
                        {/* Botão para cadastrar postos (apenas para gestores e gerentes gerais) */}
                        {Number(usuarioLogado?.permissao) <= 2 && (
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => setShowCadastroPosto(true)}
                                className="me-2"
                            >
                                Cadastrar Posto
                            </Button>
                        )}
                    </div>
                </header>

                <div className="content-wrapper">
                    {erros.length > 0 && (
                        <Alert variant="danger" className="mb-3">
                            <ul>
                                {erros.map((erro, index) => <li key={index}>{erro}</li>)}
                            </ul>
                        </Alert>
                    )}

                    {usuarioLogado && (
                        <Alert variant="info" className="mb-3">
                            <strong>Usuário:</strong> {usuarioLogado.name} |
                            <strong> Cargo:</strong> {permissoesMap[Number(usuarioLogado.permissao)]} |
                            <strong> Posto:</strong> {usuarioLogado.posto === 'default' ? 'Perequeté' :
                            usuarioLogado.posto === 'colinas' ? 'Colinas' :
                                usuarioLogado.posto === 'colinas25' ? 'Colinas 25' :
                                    usuarioLogado.posto}
                        </Alert>
                    )}

                    <FiltrosAvancados
                        filtros={filtros}
                        setFiltros={setFiltros}
                        departamentos={departamentos}
                        postosDisponiveis={postosDisponiveis}
                        usuarioLogado={usuarioLogado}
                        handleAplicarFiltros={() => {
                            setPaginaAtual(1);
                            carregarDadosPontos(usuarios);
                        }}
                        handleLimparFiltros={() => {
                            const hojeLocal = new Date();
                            setFiltros({
                                dataInicio: toDateInputString(getPrimeiroDiaMes(hojeLocal.getFullYear(), hojeLocal.getMonth() + 1)),
                                dataFim: toDateInputString(getUltimoDiaMes(hojeLocal.getFullYear(), hojeLocal.getMonth() + 1)),
                                departamento: '',
                                jornada: '',
                                busca: '',
                                posto: '' // Gestor vê todos os postos
                            });
                            setPaginaAtual(1);
                        }}
                        onMesAtual={definirMesAtual}
                        onMesAnterior={definirMesAnterior}
                    />

                    <div className="botoes-relatorio mb-4">
                        <Row>
                            <Col md={6}>
                                <Form.Control
                                    type="text"
                                    placeholder="Buscar por nome ou ID..."
                                    value={filtros.busca}
                                    onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                                />
                            </Col>
                            <Col md={6} className="d-flex justify-content-end">
                                <Button onClick={() => {}} disabled={carregando} className="me-2">
                                    Exportar Excel
                                </Button>
                                <Button variant="info" onClick={() => setJornadaAtiva(jornadaAtiva === '12/36' ? '6/1' : '12/36')}>
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
                        <Alert variant="warning" className="text-center my-5">
                            Nenhum dado encontrado para o período e filtros selecionados.
                        </Alert>
                    ) : (
                        <>
                            <GraficosAnaliticos dados={dadosPorUsuario} />

                            <div className="relatorio-usuarios">
                                {dadosPorUsuario.map((usuarioData, idx) => (
                                    <UsuarioCard
                                        key={idx}
                                        usuarioData={usuarioData}
                                        onImprimir={(usuarioData) => handleImprimir(usuarioData.usuario, usuarioData.registros)}
                                        onRefresh={reFetch}
                                        usuarioLogado={usuarioLogado}
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
            </div>

            {/* Modal de Cadastro de Postos */}
            <CadastroPostoModal
                show={showCadastroPosto}
                onHide={() => setShowCadastroPosto(false)}
                onSuccess={handlePostoCadastrado}
            />
        </div>
    );
}