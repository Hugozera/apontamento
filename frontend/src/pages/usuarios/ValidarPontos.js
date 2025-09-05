import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { writeBatch, Timestamp, serverTimestamp } from "firebase/firestore";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, query, orderBy, limit, startAfter, doc, where, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import {
    FiMenu, FiUser, FiFileText, FiClock, FiCheck, FiX,
    FiHome, FiUsers, FiLogOut, FiRefreshCw, FiChevronRight,
    FiEdit, FiTrash2, FiSave, FiXCircle, FiCalendar, FiWatch, FiSearch,
    FiPlus, FiMinus
} from 'react-icons/fi';
import './ValidarPontos.css';

const permissoesMap = {
    1: "Gestor",
    2: "Gerente Geral",
    3: "Gerente de Equipes",
    4: "Frentista",
};

// Tipos de abonos disponíveis
const tiposAbono = [
    { id: 'entrada', label: 'Entrada' },
    { id: 'saida_almoco', label: 'Saída Almoço' },
    { id: 'entrada_almoco', label: 'Volta Almoço' },
    { id: 'saida', label: 'Saída' }
];

// Função universal para formatar datas
const formatarData = (data) => {
    if (!data) return "-";

    let dateObj;

    if (data instanceof Timestamp) {
        dateObj = data.toDate();
    } else if (typeof data === 'string') {
        dateObj = new Date(data);
    } else if (data instanceof Date) {
        dateObj = data;
    } else {
        return "-";
    }

    return dateObj.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Função para formatar apenas a hora
const formatarHora = (data) => {
    if (!data) return "-";

    let dateObj;

    if (data instanceof Timestamp) {
        dateObj = data.toDate();
    } else if (typeof data === 'string') {
        dateObj = new Date(data);
    } else if (data instanceof Date) {
        dateObj = data;
    } else {
        return "-";
    }

    return dateObj.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const ValidarPontos = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Layout
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [submenuOpen, setSubmenuOpen] = useState({ usuarios: false, relatorios: false });

    // Dados
    const [pontos, setPontos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filtros
    const [filtroUsuario, setFiltroUsuario] = useState('');
    const [filtroData, setFiltroData] = useState('');

    // Modais
    const [selectedPonto, setSelectedPonto] = useState(null);
    const [showRegistroModal, setShowRegistroModal] = useState(false);
    const [registroType, setRegistroType] = useState("");
    const [idLoginFalta, setIdLoginFalta] = useState("");
    const [justificativa, setJustificativa] = useState("");
    const [adminSenha, setAdminSenha] = useState("");
    const [senhaAdminModal, setSenhaAdminModal] = useState(false);
    const [pontoParaEditar, setPontoParaEditar] = useState(null);
    const [editData, setEditData] = useState("");
    const [editHora, setEditHora] = useState("");

    // Estados para abono
    const [dataAbono, setDataAbono] = useState("");
    const [abonosSelecionados, setAbonosSelecionados] = useState([]);
    const [horariosAbono, setHorariosAbono] = useState({
        entrada: "",
        saida_almoco: "",
        entrada_almoco: "",
        saida: ""
    });

    // Loading individual
    const [loadingPontos, setLoadingPontos] = useState({});

    // Refs
    const loadMoreRef = useRef(null);
    const observerRef = useRef(null);
    const sidebarRef = useRef(null);

    const { user: usuarioLogado, isAuthenticated, logout } = useContext(AuthContext);

    const setLoadingForPonto = (id, value) => setLoadingPontos(prev => ({ ...prev, [id]: value }));

    // Listar pontos - Buscar pontos sem status OU com status null
    const listarPontosFirestore = useCallback(async (lastDocument = null) => {
        try {
            // Primeiro, buscar pontos que não têm o campo status
            let q1 = query(
                collection(db, "pontos"),
                orderBy("horaPonto", "desc"),
                limit(10)
            );

            if (lastDocument) q1 = query(q1, startAfter(lastDocument));

            const querySnapshot1 = await getDocs(q1);
            const pontosSemStatus = querySnapshot1.docs
                .filter(doc => !doc.data().hasOwnProperty('status'))
                .map(doc => ({ id: doc.id, ...doc.data() }));

            // Depois, buscar pontos com status null
            let q2 = query(
                collection(db, "pontos"),
                where("status", "==", null),
                orderBy("horaPonto", "desc"),
                limit(10)
            );

            if (lastDocument) q2 = query(q2, startAfter(lastDocument));

            const querySnapshot2 = await getDocs(q2);
            const pontosComStatusNull = querySnapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Combinar os resultados
            const todosPontos = [...pontosSemStatus, ...pontosComStatusNull];

            // Remover duplicatas
            const pontosUnicos = todosPontos.filter((ponto, index, self) =>
                index === self.findIndex(p => p.id === ponto.id)
            );

            // Ordenar por horaPonto (mais recente primeiro)
            pontosUnicos.sort((a, b) => {
                const dateA = a.horaPonto instanceof Timestamp ? a.horaPonto.toDate() : new Date(a.horaPonto);
                const dateB = b.horaPonto instanceof Timestamp ? b.horaPonto.toDate() : new Date(b.horaPonto);
                return dateB - dateA;
            });

            setLastDoc(querySnapshot1.docs[querySnapshot1.docs.length - 1] || querySnapshot2.docs[querySnapshot2.docs.length - 1]);
            setHasMore(pontosUnicos.length === 10);

            return pontosUnicos;
        } catch (error) {
            console.error("Erro ao buscar pontos:", error);
            throw error;
        }
    }, []);

    // Listar usuários
    const listarUsuariosFirestore = useCallback(async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const usuariosData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    idLogin: data.idLogin ? data.idLogin.toString() : ""
                };
            });
            return usuariosData;
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
            return [];
        }
    }, []);

    const loadInitialData = useCallback(async () => {
        if (!isAuthenticated) return;
        setDataLoading(true);
        try {
            const [usuariosData, pontosData] = await Promise.all([listarUsuariosFirestore(), listarPontosFirestore()]);
            setUsuarios(usuariosData);
            setPontos(pontosData);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setDataLoading(false);
            setInitialLoad(false);
        }
    }, [isAuthenticated, listarUsuariosFirestore, listarPontosFirestore]);

    const loadMoreData = useCallback(async () => {
        if (!hasMore || dataLoading) return;
        setDataLoading(true);
        try {
            const newPontos = await listarPontosFirestore(lastDoc);
            setPontos(prev => {
                // Evitar duplicação de pontos
                const existingIds = new Set(prev.map(p => p.id));
                const filteredNew = newPontos.filter(p => !existingIds.has(p.id));
                return [...prev, ...filteredNew];
            });
        } catch (error) {
            console.error("Erro ao carregar mais pontos:", error);
        } finally {
            setDataLoading(false);
        }
    }, [hasMore, dataLoading, lastDoc, listarPontosFirestore]);

    const refreshData = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const [usuariosData, pontosData] = await Promise.all([listarUsuariosFirestore(), listarPontosFirestore()]);
            setUsuarios(usuariosData);
            setPontos(pontosData);
            setLastDoc(null);
            setHasMore(true);
        } catch (error) {
            console.error("Erro ao atualizar dados:", error);
        } finally {
            setIsRefreshing(false);
        }
    }, [listarUsuariosFirestore, listarPontosFirestore]);

    useEffect(() => {
        if (!loadMoreRef.current || !hasMore) return;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) loadMoreData();
        }, { threshold: 0.1 });
        observer.observe(loadMoreRef.current);
        observerRef.current = observer;
        return () => observerRef.current?.disconnect();
    }, [hasMore, loadMoreData]);

    useEffect(() => { if (isAuthenticated && initialLoad) loadInitialData(); }, [isAuthenticated, initialLoad, loadInitialData]);

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

    // Buscar usuário por idLogin
    const getUsuarioByIdLogin = useCallback((idLogin) => {
        if (!idLogin || !usuarios.length) return { name: 'Desconhecido', role: 'Desconhecido', permissao: 0 };

        const idLoginStr = idLogin.toString();
        const usuario = usuarios.find(user => user.idLogin === idLoginStr);

        return usuario || { name: 'Desconhecido', role: 'Desconhecido', permissao: 0 };
    }, [usuarios]);

    // Função para verificar permissões
    const temPermissaoParaVer = useCallback((cargoPonto) => {
        const cargoUsuarioLogado = parseInt(usuarioLogado?.permissao) || 0;
        const cargoPontoInt = parseInt(cargoPonto) || 0;

        // Gestor (1) pode ver tudo
        if (cargoUsuarioLogado === 1) return true;

        // Gerente Geral (2) pode ver Gerente de Equipes (3) e Frentista (4)
        if (cargoUsuarioLogado === 2) return cargoPontoInt >= 3;

        // Gerente de Equipes (3) pode ver apenas Frentista (4)
        if (cargoUsuarioLogado === 3) return cargoPontoInt === 4;

        // Frentista (4) não pode ver ninguém
        return false;
    }, [usuarioLogado]);

    // Função para verificar permissões de registro
    const temPermissaoParaRegistrar = useCallback((cargoAlvo) => {
        const cargoUsuarioLogado = parseInt(usuarioLogado?.permissao) || 0;
        const cargoAlvoInt = parseInt(cargoAlvo) || 0;

        // Gestor (1) pode registrar para todos
        if (cargoUsuarioLogado === 1) return true;

        // Gerente Geral (2) pode registrar para Gerente de Equipes (3) e Frentista (4)
        if (cargoUsuarioLogado === 2) return cargoAlvoInt >= 3;

        // Gerente de Equipes (3) pode registrar apenas para Frentista (4)
        if (cargoUsuarioLogado === 3) return cargoAlvoInt === 4;

        // Frentista (4) não pode registrar para ninguém
        return false;
    }, [usuarioLogado]);

    // Abrir modal de registro de falta/abono
    const abrirRegistro = (tipo) => {
        setRegistroType(tipo);
        setShowRegistroModal(true);
        setIdLoginFalta("");
        setJustificativa("");
        setDataAbono("");
        setAbonosSelecionados([]);
        setHorariosAbono({
            entrada: "",
            saida_almoco: "",
            entrada_almoco: "",
            saida: ""
        });
    };

    // Verificar senha de admin
    const verificarSenhaAdmin = () => {
        return adminSenha === "L@ise1301";
    };

    // Abrir modal de edição
    const abrirEdicao = (ponto) => {
        if (!ponto.horaPonto) return;

        const dataHora = ponto.horaPonto.toDate();
        setEditData(dataHora.toISOString().split('T')[0]);
        setEditHora(dataHora.toTimeString().split(' ')[0].substring(0, 5));
        setPontoParaEditar(ponto);
        setSenhaAdminModal(true);
    };

    // Salvar edição do ponto
    const salvarEdicao = async () => {
        if (!verificarSenhaAdmin()) {
            alert("Senha de administrador incorreta!");
            return;
        }

        if (!pontoParaEditar || !editData || !editHora) {
            alert("Preencha data e hora corretamente!");
            return;
        }

        try {
            const novaDataHora = new Date(`${editData}T${editHora}`);
            const pontoRef = doc(db, "pontos", pontoParaEditar.id);

            await updateDoc(pontoRef, {
                horaPonto: Timestamp.fromDate(novaDataHora),
                editadoPor: usuarioLogado.name,
                dataEdicao: Timestamp.now()
            });

            // Atualizar localmente
            setPontos(prev => prev.map(p =>
                p.id === pontoParaEditar.id
                    ? { ...p, horaPonto: Timestamp.fromDate(novaDataHora) }
                    : p
            ));

            setSenhaAdminModal(false);
            setPontoParaEditar(null);
            setAdminSenha("");
            alert("Ponto editado com sucesso!");
        } catch (error) {
            console.error("Erro ao editar ponto:", error);
            alert("Erro ao editar ponto. Tente novamente.");
        }
    };

    // Aprovar ponto
    const handleAprovar = async (ponto) => {
        setLoadingForPonto(ponto.id, true);
        try {
            const currentUser = usuarioLogado?.name || "Administrador";
            const batch = writeBatch(db);

            // 1. Atualizar o ponto na coleção "pontos"
            const pontoRef = doc(db, "pontos", ponto.id);

            const updateData = {
                status: "Aprovado",
                aprovadoPor: currentUser,
                dataAprovacao: Timestamp.now()
            };

            if (!ponto.usuario) {
                const usuario = getUsuarioByIdLogin(ponto.idLogin);
                updateData.usuario = usuario.name || "Desconhecido";
            }

            batch.update(pontoRef, updateData);

            // 2. Criar cópia na coleção "pontosEfetivados"
            const pontosEfetivadosRef = collection(db, "pontosEfetivados");
            batch.set(doc(pontosEfetivadosRef), {
                pontoId: ponto.id,
                status: "Aprovado",
                usuario: ponto.usuario || getUsuarioByIdLogin(ponto.idLogin).name || "Desconhecido",
                idLogin: ponto.idLogin,
                horaPonto: ponto.horaPonto,
                dataAprovacao: Timestamp.now(),
                aprovadoPor: currentUser,
                foto: ponto.foto || null,
                justificativa: ponto.justificativa || null,
                createdAt: ponto.createdAt || Timestamp.now(),
                tipo: ponto.tipo || "Ponto Normal",
                escala: getUsuarioByIdLogin(ponto.idLogin).escala || "Não informada"
            });

            await batch.commit();
            setPontos(prev => prev.filter(p => p.id !== ponto.id));
        } catch (error) {
            console.error("Erro ao aprovar ponto:", error);
            alert("Erro ao aprovar ponto. Tente novamente.");
        } finally {
            setLoadingForPonto(ponto.id, false);
        }
    };

    // Recusar ponto
    const handleRecusar = async (ponto) => {
        setLoadingForPonto(ponto.id, true);
        try {
            const currentUser = usuarioLogado?.name || "Administrador";
            const batch = writeBatch(db);

            // 1. Atualizar o ponto na coleção "pontos"
            const pontoRef = doc(db, "pontos", ponto.id);

            const updateData = {
                status: "Recusado",
                recusadoPor: currentUser,
                dataRecusa: Timestamp.now(),
                justificativaRecusa: "Ponto recusado pelo gestor"
            };

            if (!ponto.usuario) {
                const usuario = getUsuarioByIdLogin(ponto.idLogin);
                updateData.usuario = usuario.name || "Desconhecido";
            }

            batch.update(pontoRef, updateData);

            // 2. Criar cópia na coleção "pontosEfetivados"
            const pontosEfetivadosRef = collection(db, "pontosEfetivados");
            batch.set(doc(pontosEfetivadosRef), {
                pontoId: ponto.id,
                status: "Recusado",
                usuario: ponto.usuario || getUsuarioByIdLogin(ponto.idLogin).name || "Desconhecido",
                idLogin: ponto.idLogin,
                horaPonto: ponto.horaPonto,
                dataRecusa: Timestamp.now(),
                recusadoPor: currentUser,
                foto: ponto.foto || null,
                justificativa: "Ponto recusado pelo gestor",
                createdAt: ponto.createdAt || Timestamp.now(),
                tipo: "Ponto Recusado",
                escala: getUsuarioByIdLogin(ponto.idLogin).escala || "Não informada"
            });

            await batch.commit();
            setPontos(prev => prev.filter(p => p.id !== ponto.id));
        } catch (error) {
            console.error("Erro ao recusar ponto:", error);
            alert("Erro ao recusar ponto. Tente novamente.");
        } finally {
            setLoadingForPonto(ponto.id, false);
        }
    };

    // Toggle para selecionar/deselecionar tipo de abono
    const toggleAbonoSelecionado = (tipo) => {
        if (abonosSelecionados.includes(tipo)) {
            setAbonosSelecionados(abonosSelecionados.filter(t => t !== tipo));
            setHorariosAbono(prev => ({ ...prev, [tipo]: "" }));
        } else {
            setAbonosSelecionados([...abonosSelecionados, tipo]);
        }
    };

    // Atualizar horário de um tipo específico de abono
    const atualizarHorarioAbono = (tipo, horario) => {
        setHorariosAbono(prev => ({ ...prev, [tipo]: horario }));
    };

    // Registrar falta/abono
    // Registrar falta/abono
    const handleRegistrarStatus = async () => {
        if (!idLoginFalta || !justificativa) {
            alert("Preencha todos os campos obrigatórios!");
            return;
        }

        const usuarioAlvo = getUsuarioByIdLogin(idLoginFalta);
        if (!usuarioAlvo || !usuarioAlvo.permissao) {
            alert("Usuário não encontrado!");
            return;
        }

        if (!temPermissaoParaRegistrar(usuarioAlvo.permissao)) {
            alert("Você não tem permissão para registrar para este usuário!");
            return;
        }

        try {
            const currentUser = usuarioLogado?.name || "Administrador";
            const agora = Timestamp.now();

            if (registroType === "Falta") {
                // Registrar 4 faltas para o dia (turnos padrão)
                const turnos = [
                    { hora: "07:00", tipo: "Entrada Manhã" },
                    { hora: "12:00", tipo: "Saída Manhã" },
                    { hora: "13:00", tipo: "Entrada Tarde" },
                    { hora: "18:00", tipo: "Saída Tarde" }
                ];

                for (const turno of turnos) {
                    const [hora, minuto] = turno.hora.split(':');
                    const dataFalta = dataAbono ? new Date(dataAbono) : new Date();

                    // ADICIONAR 1 DIA PARA CORRIGIR O FUSO HORÁRIO
                    dataFalta.setDate(dataFalta.getDate() + 1);
                    dataFalta.setHours(parseInt(hora), parseInt(minuto), 0, 0);

                    await addDoc(collection(db, "pontosEfetivados"), {
                        idLogin: idLoginFalta,
                        usuario: usuarioAlvo.name || "Desconhecido",
                        status: "Falta",
                        horaPonto: Timestamp.fromDate(dataFalta),
                        dataRegistro: agora,
                        registradoPor: currentUser,
                        justificativa: justificativa,
                        tipo: turno.tipo,
                        createdAt: agora,
                        escala: usuarioAlvo.escala || "Não informada"
                    });
                }

                // Também registrar na coleção de abonos para relatórios
                // ADICIONAR 1 DIA NA DATA DO ABONO TAMBÉM
                const dataAbonoCorrigida = dataAbono ? new Date(dataAbono) : new Date();
                dataAbonoCorrigida.setDate(dataAbonoCorrigida.getDate() + 1);
                const dataAbonoFormatada = dataAbonoCorrigida.toISOString().split('T')[0];

                await addDoc(collection(db, "abonos"), {
                    idLogin: idLoginFalta,
                    usuario: usuarioAlvo.name || "Desconhecido",
                    tipo: "Falta",
                    data: dataAbonoFormatada,
                    horarios: turnos.map(t => t.hora),
                    justificativa: justificativa,
                    registradoPor: currentUser,
                    dataRegistro: agora,
                    escala: usuarioAlvo.escala || "Não informada"
                });

                alert("Faltas registradas com sucesso!");

            } else if (registroType === "Abonado") {
                // Validar campos para abono
                if (!dataAbono) {
                    alert("Para abono, preencha a data!");
                    return;
                }

                if (abonosSelecionados.length === 0) {
                    alert("Selecione pelo menos um tipo de abono!");
                    return;
                }

                // Verificar se os abonos selecionados têm horários preenchidos
                for (const tipo of abonosSelecionados) {
                    if (!horariosAbono[tipo]) {
                        alert(`Preencha o horário para ${tiposAbono.find(t => t.id === tipo)?.label}`);
                        return;
                    }
                }

                // Registrar cada abono selecionado
                for (const tipo of abonosSelecionados) {
                    const [hora, minuto] = horariosAbono[tipo].split(':');
                    const dataAbonoObj = new Date(dataAbono);

                    // ADICIONAR 1 DIA PARA CORRIGIR O FUSO HORÁRIO
                    dataAbonoObj.setDate(dataAbonoObj.getDate() + 1);
                    dataAbonoObj.setHours(parseInt(hora), parseInt(minuto), 0, 0);

                    const tipoLabel = tiposAbono.find(t => t.id === tipo)?.label || tipo;

                    await addDoc(collection(db, "pontosEfetivados"), {
                        idLogin: idLoginFalta,
                        usuario: usuarioAlvo.name || "Desconhecido",
                        status: "Abonado",
                        horaPonto: Timestamp.fromDate(dataAbonoObj),
                        dataRegistro: agora,
                        registradoPor: currentUser,
                        justificativa: justificativa,
                        tipo: tipoLabel,
                        createdAt: agora,
                        escala: usuarioAlvo.escala || "Não informada"
                    });
                }

                // Registrar na coleção de abonos para relatórios
                const horariosRegistrados = abonosSelecionados.map(tipo => ({
                    tipo,
                    horario: horariosAbono[tipo]
                }));

                // ADICIONAR 1 DIA NA DATA DO ABONO TAMBÉM
                const dataAbonoCorrigida = new Date(dataAbono);
                dataAbonoCorrigida.setDate(dataAbonoCorrigida.getDate());
                const dataAbonoFormatada = dataAbonoCorrigida.toISOString().split('T')[0];

                await addDoc(collection(db, "abonos"), {
                    idLogin: idLoginFalta,
                    usuario: usuarioAlvo.name || "Desconhecido",
                    tipo: "Abonado",
                    data: dataAbonoFormatada,
                    horarios: horariosRegistrados,
                    justificativa: justificativa,
                    registradoPor: currentUser,
                    dataRegistro: agora,
                    escala: usuarioAlvo.escala || "Não informada"
                });

                alert("Abonos registrados com sucesso!");
            }

            setShowRegistroModal(false);
            setIdLoginFalta("");
            setJustificativa("");
            setRegistroType("");
            setDataAbono("");
            setAbonosSelecionados([]);
            setHorariosAbono({
                entrada: "",
                saida_almoco: "",
                entrada_almoco: "",
                saida: ""
            });
        } catch (error) {
            console.error("Erro ao registrar status:", error);
            alert("Erro ao registrar. Tente novamente.");
        }
    };

    const toggleSubmenu = (menu) => setSubmenuOpen(prev => ({ ...prev, [menu]: !prev[menu] }));

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Filtrar pontos
    const pontosFiltrados = pontos.filter(ponto => {
        const usuario = getUsuarioByIdLogin(ponto.idLogin);
        const nomeUsuario = usuario.name?.toLowerCase() || '';
        const dataPonto = ponto.horaPonto instanceof Timestamp
            ? ponto.horaPonto.toDate().toISOString().split('T')[0]
            : new Date(ponto.horaPonto).toISOString().split('T')[0];

        return (
            nomeUsuario.includes(filtroUsuario.toLowerCase()) &&
            (filtroData === '' || dataPonto === filtroData)
        );
    });

    // Agrupar pontos por usuário
    const groupedPontos = pontosFiltrados.reduce((acc, ponto) => {
        if (!acc[ponto.idLogin]) acc[ponto.idLogin] = [];
        acc[ponto.idLogin].push(ponto);
        return acc;
    }, {});

    if (!isAuthenticated) {
        navigate('/login');
        return null;
    }

    if (initialLoad) {
        return (
            <div className="app-loading">
                <div className="spinner"></div>
                <p>Carregando dados iniciais...</p>
            </div>
        );
    }

    return (
        <div className="app-container">
            {/* Sidebar */}
            <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} ref={sidebarRef}>
                <div className="sidebar-header">
                    <h3 className="logo">Perequeté</h3>
                    <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? "Recolher menu" : "Expandir menu"}>
                        <FiMenu />
                    </button>
                </div>

                <div className="user-profile">
                    <div className="avatar">{usuarioLogado?.name?.charAt(0) || '?'}</div>
                    <div className="user-info">
                        <h5>{usuarioLogado?.name || 'Usuário'}</h5>
                        <span>{permissoesMap[usuarioLogado?.permissao] || 'Cargo'}</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <ul>
                        <li className={location.pathname === '/' ? 'active' : ''}>
                            <Link to="/" className="menu-item">
                                <FiHome className="icon" /><span>Home</span>
                            </Link>
                        </li>

                        <li className="submenu-container">
                            <div className={`menu-item ${submenuOpen.usuarios ? 'open' : ''}`} onClick={() => toggleSubmenu('usuarios')}>
                                <FiUsers className="icon" /><span>Usuários</span>
                                <FiChevronRight className="arrow-icon" />
                            </div>
                            <ul className={`submenu ${submenuOpen.usuarios ? 'open' : ''}`}>
                                <li><Link to="/cadastro-usuarios">Cadastrar Usuário</Link></li>
                                <li><Link to="/lista-usuarios">Listar Usuários</Link></li>
                            </ul>
                        </li>

                        <li className="submenu-container">
                            <div className={`menu-item ${submenuOpen.relatorios ? 'open' : ''}`} onClick={() => toggleSubmenu('relatorios')}>
                                <FiFileText className="icon" /><span>Relatórios</span>
                                <FiChevronRight className="arrow-icon" />
                            </div>
                            <ul className={`submenu ${submenuOpen.relatorios ? 'open' : ''}`}>
                                <li><Link to="/relatorio-faltas">Faltas</Link></li>
                                <li><Link to="/relatorio-abonos">Abonos</Link></li>
                                <li><Link to="/relatorio-pontos">Pontos</Link></li>
                                <li><Link to="/planilha-mensal">Planilha Mensal</Link></li>
                            </ul>
                        </li>
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout} aria-label="Sair do sistema">
                        <FiLogOut className="icon" /><span>Sair</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className={`main-content ${sidebarOpen ? 'open' : ''}`}>
                <header className="main-header">
                    <div className="header-title">
                        <h1>Validar Pontos</h1>
                        <button className="btn-refresh" onClick={refreshData} disabled={isRefreshing}>
                            <FiRefreshCw className={isRefreshing ? 'spinning' : ''} />
                            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
                        </button>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-primary" onClick={() => abrirRegistro("Falta")}>Registrar Falta</button>
                        <button className="btn btn-secondary" onClick={() => abrirRegistro("Abonado")}>Registrar Abono</button>
                    </div>
                </header>

                {/* Filtros */}
                <div className="filtros-container">
                    <div className="filtro-group">
                        <label>Filtrar por usuário:</label>
                        <input
                            type="text"
                            value={filtroUsuario}
                            onChange={(e) => setFiltroUsuario(e.target.value)}
                            placeholder="Digite o nome do usuário"
                        />
                    </div>
                    <div className="filtro-group">
                        <label>Filtrar por data:</label>
                        <input
                            type="date"
                            value={filtroData}
                            onChange={(e) => setFiltroData(e.target.value)}
                        />
                    </div>
                    <button
                        className="btn btn-outline"
                        onClick={() => {
                            setFiltroUsuario('');
                            setFiltroData('');
                        }}
                    >
                        Limpar Filtros
                    </button>
                </div>

                <div className="content-wrapper">
                    {pontosFiltrados.length === 0 ? (
                        <div className="no-points">
                            <p>Não há pontos pendentes para validação</p>
                            <button className="btn" onClick={refreshData} disabled={isRefreshing}>
                                <FiRefreshCw className={isRefreshing ? 'spinning' : ''} />
                                {isRefreshing ? 'Atualizando...' : 'Recarregar'}
                            </button>
                        </div>
                    ) : (
                        <div className="pontos-grid">
                            {Object.keys(groupedPontos).map(idLogin => {
                                const usuarioPonto = getUsuarioByIdLogin(idLogin);
                                if (!temPermissaoParaVer(usuarioPonto.permissao)) return null;

                                return (
                                    <div key={idLogin} className="colaborador-card">
                                        <div className="colaborador-header">
                                            <div className="avatar">{usuarioPonto.name?.charAt(0) || '?'}</div>
                                            <div className="colaborador-info">
                                                <h3>{usuarioPonto.name || 'Usuário Desconhecido'}</h3>
                                                <p>{permissoesMap[usuarioPonto.permissao] || 'Cargo Desconhecido'}</p>
                                                <small>Escala: {usuarioPonto.escala || 'Não informada'}</small>
                                                <small>ID: {idLogin}</small>
                                            </div>
                                        </div>

                                        <div className="pontos-list">
                                            {groupedPontos[idLogin].map(ponto => (
                                                <div key={ponto.id} className="ponto-card">
                                                    <div className="ponto-info">
                                                        <div className="ponto-hora">
                                                            <FiClock /> {formatarData(ponto.horaPonto)}
                                                            <button
                                                                className="btn-edit"
                                                                onClick={() => abrirEdicao(ponto)}
                                                                title="Editar horário"
                                                            >
                                                                <FiEdit size={14} />
                                                            </button>
                                                        </div>
                                                        {ponto.foto && (
                                                            <img
                                                                src={`data:image/png;base64,${ponto.foto}`}
                                                                alt="Foto do Ponto"
                                                                className="ponto-foto"
                                                                onClick={() => setSelectedPonto(ponto)}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="ponto-actions">
                                                        <button className="btn-approve" onClick={() => handleAprovar(ponto)} disabled={loadingPontos[ponto.id]}>
                                                            {loadingPontos[ponto.id] ? "Aprovando..." : <><FiCheck /> Aprovar</>}
                                                        </button>
                                                        <button className="btn-reject" onClick={() => handleRecusar(ponto)} disabled={loadingPontos[ponto.id]}>
                                                            {loadingPontos[ponto.id] ? "Recusando..." : <><FiX /> Recusar</>}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            <div ref={loadMoreRef} className="load-more-trigger">
                                {dataLoading && <div className="loading-more"><div className="small-spinner"></div><p>Carregando mais pontos...</p></div>}
                                {!hasMore && <p className="no-more-data">Todos os pontos foram carregados</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal registro falta/abono */}
            {showRegistroModal && (
                <div className="modal-overlay active">
                    <div className="modal-content large-modal">
                        <div className="modal-header">
                            <h2>Registrar {registroType}</h2>
                            <button className="close-modal" onClick={() => setShowRegistroModal(false)}>&times;</button>
                        </div>

                        <div className="form-group">
                            <label>ID Login:</label>
                            <div className="input-with-button">
                                <input
                                    type="text"
                                    value={idLoginFalta}
                                    onChange={(e) => setIdLoginFalta(e.target.value)}
                                    placeholder="Digite o ID Login"
                                />
                                <button
                                    className="btn-search"
                                    onClick={() => {
                                        const usuario = getUsuarioByIdLogin(idLoginFalta);
                                        if (usuario.name === 'Desconhecido') {
                                            alert("Usuário não encontrado!");
                                        }
                                    }}
                                    title="Verificar usuário"
                                >
                                    <FiSearch />
                                </button>
                            </div>
                        </div>

                        {idLoginFalta && (
                            <div className="user-info-card">
                                <h4>Informações do Usuário:</h4>
                                {(() => {
                                    const usuario = getUsuarioByIdLogin(idLoginFalta);
                                    return (
                                        <div>
                                            <p><strong>Nome:</strong> {usuario.name || 'Não encontrado'}</p>
                                            <p><strong>Cargo:</strong> {permissoesMap[usuario.permissao] || 'Não informado'}</p>
                                            <p><strong>Escala:</strong> {usuario.escala || 'Não informada'}</p>
                                            <p><strong>ID Login:</strong> {idLoginFalta}</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Data:</label>
                            <input
                                type="date"
                                value={dataAbono}
                                onChange={(e) => setDataAbono(e.target.value)}
                                required
                            />
                        </div>

                        {registroType === "Abonado" && (
                            <div className="form-group">
                                <label>Tipos de Abono:</label>
                                <div className="tipos-abono">
                                    {tiposAbono.map(tipo => (
                                        <div key={tipo.id} className="tipo-abono-item">
                                            <label className="checkbox-container">
                                                <input
                                                    type="checkbox"
                                                    checked={abonosSelecionados.includes(tipo.id)}
                                                    onChange={() => toggleAbonoSelecionado(tipo.id)}
                                                />
                                                <span className="checkmark"></span>
                                                {tipo.label}
                                            </label>

                                            {abonosSelecionados.includes(tipo.id) && (
                                                <div className="horario-abono">
                                                    <label>Horário:</label>
                                                    <input
                                                        type="time"
                                                        value={horariosAbono[tipo.id]}
                                                        onChange={(e) => atualizarHorarioAbono(tipo.id, e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Justificativa:</label>
                            <textarea
                                value={justificativa}
                                onChange={(e) => setJustificativa(e.target.value)}
                                placeholder="Digite a justificativa"
                                rows="4"
                                required
                            ></textarea>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowRegistroModal(false)}>
                                <FiXCircle /> Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleRegistrarStatus}>
                                <FiSave /> Registrar {registroType}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal senha admin para edição */}
            {senhaAdminModal && (
                <div className="modal-overlay active">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Editar Ponto - Senha Admin</h2>
                            <button className="close-modal" onClick={() => setSenhaAdminModal(false)}>&times;</button>
                        </div>
                        <div className="form-group">
                            <label>Senha de Administrador:</label>
                            <input
                                type="password"
                                value={adminSenha}
                                onChange={(e) => setAdminSenha(e.target.value)}
                                placeholder="Digite a senha de administrador"
                            />
                        </div>
                        <div className="form-group">
                            <label>Data:</label>
                            <input
                                type="date"
                                value={editData}
                                onChange={(e) => setEditData(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Hora:</label>
                            <input
                                type="time"
                                value={editHora}
                                onChange={(e) => setEditHora(e.target.value)}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setSenhaAdminModal(false)}>
                                <FiXCircle /> Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={salvarEdicao}>
                                <FiSave /> Salvar Edição
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal foto ponto */}
            {selectedPonto && (
                <div className="modal-overlay active" onClick={() => setSelectedPonto(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Foto do Ponto</h2>
                        <img src={`data:image/png;base64,${selectedPonto.foto}`} alt="Foto do Ponto" className="ponto-foto-modal" />
                        <button className="btn" onClick={() => setSelectedPonto(null)}>Fechar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ValidarPontos;