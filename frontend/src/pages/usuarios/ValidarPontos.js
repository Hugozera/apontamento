import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { writeBatch, Timestamp } from "firebase/firestore";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, query, orderBy, limit, startAfter, doc, where, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import {
    FiRefreshCw, FiChevronRight, FiEdit, FiTrash2, FiSave, FiXCircle,
    FiCalendar, FiWatch, FiSearch, FiPlus, FiMinus, FiEye, FiDollarSign,
    FiCheck, FiX, FiClock, FiUser, FiFileText, FiHome, FiUsers, FiLogOut
} from 'react-icons/fi';
import './ValidarPontos.css';
import '../../components/Sidebar.css';
import SidebarMenu from '../../pages/fragmentos/SideBarMenu';

const permissoesMap = {
    1: "Gestor",
    2: "Gerente Geral",
    3: "Gerente de Equipes",
    4: "Frentista",
};

const postosDisponiveis = [
    { value: 'default', label: 'Perequeté' },
    { value: 'colinas', label: 'Colinas' },
    { value: 'colinas25', label: 'Colinas 25' }
];

const tiposAbono = [
    { id: 'entrada', label: 'Entrada' },
    { id: 'saida_almoco', label: 'Saída Almoço' },
    { id: 'entrada_almoco', label: 'Volta Almoço' },
    { id: 'saida', label: 'Saída' }
];

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
    return dateObj.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

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

const getPostoSeguro = (usuario) => {
    if (!usuario) return 'default';
    const posto = usuario.posto;
    if (!posto || posto === 'null' || posto === 'undefined' || posto === '' || posto === 'default') {
        return 'default';
    }
    return posto;
};

const parsePermissao = (p) => {
    if (p === undefined || p === null) return 99;
    const n = Number(p);
    return Number.isNaN(n) ? 99 : n;
};

const ValidarPontos = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user: usuarioLogado, isAuthenticated, logout } = useContext(AuthContext);

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const sidebarRef = useRef(null);

    const [pontos, setPontos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [filtroUsuario, setFiltroUsuario] = useState('');
    const [filtroData, setFiltroData] = useState('');
    const [filtroPosto, setFiltroPosto] = useState('');

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

    const [dataAbono, setDataAbono] = useState("");
    const [abonosSelecionados, setAbonosSelecionados] = useState([]);
    const [horariosAbono, setHorariosAbono] = useState({
        entrada: "",
        saida_almoco: "",
        entrada_almoco: "",
        saida: ""
    });

    const [horasBanco, setHorasBanco] = useState("");
    const [minutosBanco, setMinutosBanco] = useState("");
    const [loadingPontos, setLoadingPontos] = useState({});
    const loadMoreRef = useRef(null);
    const observerRef = useRef(null);

    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        if (isAuthenticated === false && (usuarioLogado === null || usuarioLogado === undefined) && !redirecting) {
            setRedirecting(true);
            navigate('/login');
        }
    }, [isAuthenticated, usuarioLogado, navigate, redirecting]);

    const setLoadingForPonto = (id, value) => setLoadingPontos(prev => ({ ...prev, [id]: value }));

    const getColecaoPontos = (posto) => {
        switch (posto) {
            case 'colinas':
                return 'pontoscolinas';
            case 'colinas25':
                return 'pontoscolinas25';
            default:
                return 'pontos';
        }
    };

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

    const getColecaoBancoHoras = (posto) => {
        switch (posto) {
            case 'colinas':
                return 'bancoHorasCoLinas';
            case 'colinas25':
                return 'bancoHorasCoLinas25';
            default:
                return 'bancoHoras';
        }
    };

    const getUsuarioByIdLogin = useCallback((idLogin) => {
        if (!idLogin) {
            return {
                name: 'Desconhecido',
                role: 'Desconhecido',
                permissao: 4,
                posto: 'default',
                escala: 'Não informada',
                idLogin: 'unknown'
            };
        }
        const idLoginStr = idLogin.toString();
        if (!usuarios.length) {
            return {
                name: 'Desconhecido',
                role: 'Desconhecido',
                permissao: 4,
                posto: 'default',
                escala: 'Não informada',
                idLogin: idLoginStr
            };
        }
        const usuario = usuarios.find(user => user.idLogin === idLoginStr);
        if (!usuario) {
            return {
                name: 'Desconhecido',
                role: 'Desconhecido',
                permissao: 4,
                posto: 'default',
                escala: 'Não informada',
                idLogin: idLoginStr
            };
        }
        return {
            ...usuario,
            name: usuario.name || 'Desconhecido',
            posto: getPostoSeguro(usuario),
            permissao: usuario.permissao ? parsePermissao(usuario.permissao) : 4,
            escala: usuario.escala || 'Não informada',
            role: usuario.role || 'Funcionário',
            idLogin: usuario.idLogin || idLoginStr
        };
    }, [usuarios]);

    const temPermissaoParaVer = useCallback((usuarioAlvo) => {
        if (!usuarioLogado || !usuarioAlvo) return false;
        const cargoUsuarioLogado = parsePermissao(usuarioLogado?.permissao);
        const cargoAlvo = parsePermissao(usuarioAlvo.permissao);
        const postoUsuario = getPostoSeguro(usuarioLogado);
        const postoAlvo = getPostoSeguro(usuarioAlvo);

        if (cargoUsuarioLogado === 1) return true;
        if (postoAlvo !== postoUsuario) return false;
        if (usuarioAlvo.idLogin === usuarioLogado.idLogin) return true;
        if (cargoUsuarioLogado === 2 && cargoAlvo >= 3) return true;
        if (cargoUsuarioLogado === 3 && cargoAlvo === 4) return true;
        return false;
    }, [usuarioLogado]);

    const temPermissaoParaRegistrar = useCallback((usuarioAlvo) => {
        if (!usuarioLogado || !usuarioAlvo) return false;
        const cargoUsuarioLogado = parsePermissao(usuarioLogado?.permissao);
        const cargoAlvo = parsePermissao(usuarioAlvo.permissao);
        const postoUsuario = getPostoSeguro(usuarioLogado);
        const postoAlvo = getPostoSeguro(usuarioAlvo);

        if (cargoUsuarioLogado === 1) return true;
        if (postoAlvo !== postoUsuario) return false;
        if (usuarioAlvo.idLogin === usuarioLogado.idLogin) return false;
        if (cargoUsuarioLogado === 2 && cargoAlvo >= 3) return true;
        if (cargoUsuarioLogado === 3 && cargoAlvo === 4) return true;
        return false;
    }, [usuarioLogado]);

    const listarPontosFirestore = useCallback(async (lastDocument = null) => {
        try {
            let todasColecoes = [];
            const postoUsuario = getPostoSeguro(usuarioLogado);

            if (usuarioLogado?.permissao === '1' || parsePermissao(usuarioLogado?.permissao) === 1) {
                const colecoes = ['pontos', 'pontoscolinas', 'pontoscolinas25'];
                for (const colecao of colecoes) {
                    try {
                        let q = query(
                            collection(db, colecao),
                            orderBy("horaPonto", "desc"),
                            limit(20)
                        );
                        if (lastDocument) q = query(q, startAfter(lastDocument));
                        const querySnapshot = await getDocs(q);
                        const pontosPendentes = querySnapshot.docs
                            .filter(doc => {
                                const data = doc.data();
                                const temStatusNull = data.status === null;
                                const naoTemStatus = !data.hasOwnProperty('status');
                                return temStatusNull || naoTemStatus;
                            })
                            .map(doc => ({
                                id: doc.id,
                                ...doc.data(),
                                colecaoOrigem: colecao,
                                idLogin: doc.data().idLogin || 'unknown'
                            }));
                        todasColecoes = [...todasColecoes, ...pontosPendentes];
                    } catch (error) {
                        console.warn(`Erro ao buscar da coleção ${colecao}:`, error);
                    }
                }
            } else {
                const colecao = getColecaoPontos(postoUsuario);
                try {
                    let q = query(
                        collection(db, colecao),
                        orderBy("horaPonto", "desc"),
                        limit(20)
                    );
                    if (lastDocument) q = query(q, startAfter(lastDocument));
                    const querySnapshot = await getDocs(q);
                    const pontosPendentes = querySnapshot.docs
                        .filter(doc => {
                            const data = doc.data();
                            const temStatusNull = data.status === null;
                            const naoTemStatus = !data.hasOwnProperty('status');
                            return temStatusNull || naoTemStatus;
                        })
                        .map(doc => ({
                            id: doc.id,
                            ...doc.data(),
                            colecaoOrigem: colecao,
                            idLogin: doc.data().idLogin || 'unknown'
                        }));
                    todasColecoes = [...todasColecoes, ...pontosPendentes];
                } catch (error) {
                    console.warn(`Erro ao buscar da coleção ${colecao}:`, error);
                }
            }

            const pontosUnicos = todasColecoes.filter((ponto, index, self) =>
                index === self.findIndex(p => p.id === ponto.id)
            );

            pontosUnicos.sort((a, b) => {
                const dateA = a.horaPonto instanceof Timestamp ? a.horaPonto.toDate() : new Date(a.horaPonto);
                const dateB = b.horaPonto instanceof Timestamp ? b.horaPonto.toDate() : new Date(b.horaPonto);
                return dateB - dateA;
            });

            if (pontosUnicos.length > 0) {
                setLastDoc(pontosUnicos[pontosUnicos.length - 1]);
            }
            setHasMore(pontosUnicos.length === 20);
            return pontosUnicos;
        } catch (error) {
            console.error("Erro ao buscar pontos:", error);
            throw error;
        }
    }, [usuarioLogado]);

    const listarUsuariosFirestore = useCallback(async () => {
        try {
            let queryRef = collection(db, "users");
            const postoUsuario = getPostoSeguro(usuarioLogado);
            if (!(usuarioLogado?.permissao === '1' || parsePermissao(usuarioLogado?.permissao) === 1)) {
                queryRef = query(queryRef, where("posto", "==", postoUsuario));
            }
            const querySnapshot = await getDocs(queryRef);
            const usuariosData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name || 'Sem Nome',
                    idLogin: data.idLogin ? data.idLogin.toString() : '',
                    posto: getPostoSeguro(data),
                    permissao: data.permissao ? data.permissao.toString() : '4',
                    escala: data.escala || 'Não informada',
                    role: data.role || 'Funcionário',
                    ...data
                };
            });
            return usuariosData;
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
            return [];
        }
    }, [usuarioLogado]);

    const loadInitialData = useCallback(async () => {
        if (!isAuthenticated) return;
        setDataLoading(true);
        try {
            const [usuariosData, pontosData] = await Promise.all([
                listarUsuariosFirestore(),
                listarPontosFirestore()
            ]);
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
            const [usuariosData, pontosData] = await Promise.all([
                listarUsuariosFirestore(),
                listarPontosFirestore()
            ]);
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

    useEffect(() => {
        if (isAuthenticated && initialLoad) loadInitialData();
    }, [isAuthenticated, initialLoad, loadInitialData]);

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

    const abrirRegistro = (tipo) => {
        if (!usuarioLogado) {
            alert('Usuário não autenticado');
            return;
        }
        const perm = parsePermissao(usuarioLogado.permissao);
        if (perm > 3) {
            alert('Apenas Gerentes de Equipes, Gerentes Gerais e Gestores podem registrar faltas/abonos/banco de horas');
            return;
        }
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
        setHorasBanco("");
        setMinutosBanco("");
    };

    const verificarSenhaAdmin = () => {
        return adminSenha === "L@ise1301";
    };

    const abrirEdicao = (ponto) => {
        if (!ponto.horaPonto) return;
        const dataHora = ponto.horaPonto instanceof Timestamp ?
            ponto.horaPonto.toDate() : new Date(ponto.horaPonto);
        setEditData(dataHora.toISOString().split('T')[0]);
        setEditHora(dataHora.toTimeString().split(' ')[0].substring(0, 5));
        setPontoParaEditar(ponto);
        setSenhaAdminModal(true);
    };

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
            const pontoRef = doc(db, pontoParaEditar.colecaoOrigem, pontoParaEditar.id);
            await updateDoc(pontoRef, {
                horaPonto: Timestamp.fromDate(novaDataHora),
                editadoPor: usuarioLogado.name,
                dataEdicao: Timestamp.now()
            });
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

    const handleAprovar = async (ponto) => {
        setLoadingForPonto(ponto.id, true);
        try {
            const currentUser = usuarioLogado?.name || "Administrador";
            const batch = writeBatch(db);
            const colecaoOrigem = ponto.colecaoOrigem || getColecaoPontos(getPostoSeguro(usuarioLogado));
            const usuarioAlvo = getUsuarioByIdLogin(ponto.idLogin);
            const usuarioCompleto = usuarios.find(u => u.idLogin === ponto.idLogin) || usuarioAlvo;

            if (!temPermissaoParaVer(usuarioCompleto)) {
                alert("Você não tem permissão para aprovar este ponto!");
                setLoadingForPonto(ponto.id, false);
                return;
            }

            const pontoRef = doc(db, colecaoOrigem, ponto.id);
            const updateData = {
                status: "Aprovado",
                aprovadoPor: currentUser,
                dataAprovacao: Timestamp.now()
            };
            if (!ponto.usuario) {
                updateData.usuario = usuarioAlvo.name || "Desconhecido";
            }
            batch.update(pontoRef, updateData);

            const colecaoEfetivados = getColecaoEfetivados(usuarioAlvo.posto);
            const pontosEfetivadosRef = collection(db, colecaoEfetivados);
            batch.set(doc(pontosEfetivadosRef), {
                pontoId: ponto.id,
                status: "Aprovado",
                usuario: ponto.usuario || usuarioAlvo.name || "Desconhecido",
                idLogin: ponto.idLogin,
                horaPonto: ponto.horaPonto,
                dataAprovacao: Timestamp.now(),
                aprovadoPor: currentUser,
                foto: ponto.foto || null,
                justificativa: ponto.justificativa || null,
                createdAt: ponto.createdAt || Timestamp.now(),
                tipo: ponto.tipo || "Ponto Normal",
                escala: usuarioAlvo.escala || "Não informada",
                posto: usuarioAlvo.posto || "default"
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

    const handleRecusar = async (ponto) => {
        setLoadingForPonto(ponto.id, true);
        try {
            const currentUser = usuarioLogado?.name || "Administrador";
            const batch = writeBatch(db);
            const colecaoOrigem = ponto.colecaoOrigem || getColecaoPontos(getPostoSeguro(usuarioLogado));
            const usuarioAlvo = getUsuarioByIdLogin(ponto.idLogin);
            const usuarioCompleto = usuarios.find(u => u.idLogin === ponto.idLogin) || usuarioAlvo;

            if (!temPermissaoParaVer(usuarioCompleto)) {
                alert("Você não tem permissão para recusar este ponto!");
                setLoadingForPonto(ponto.id, false);
                return;
            }

            const pontoRef = doc(db, colecaoOrigem, ponto.id);
            const updateData = {
                status: "Recusado",
                recusadoPor: currentUser,
                dataRecusa: Timestamp.now(),
                justificativaRecusa: "Ponto recusado pelo gestor"
            };
            if (!ponto.usuario) {
                updateData.usuario = usuarioAlvo.name || "Desconhecido";
            }
            batch.update(pontoRef, updateData);

            const colecaoEfetivados = getColecaoEfetivados(usuarioAlvo.posto);
            const pontosEfetivadosRef = collection(db, colecaoEfetivados);
            batch.set(doc(pontosEfetivadosRef), {
                pontoId: ponto.id,
                status: "Recusado",
                usuario: ponto.usuario || usuarioAlvo.name || "Desconhecido",
                idLogin: ponto.idLogin,
                horaPonto: ponto.horaPonto,
                dataRecusa: Timestamp.now(),
                recusadoPor: currentUser,
                foto: ponto.foto || null,
                justificativa: "Ponto recusado pelo gestor",
                createdAt: ponto.createdAt || Timestamp.now(),
                tipo: "Ponto Recusado",
                escala: usuarioAlvo.escala || "Não informada",
                posto: usuarioAlvo.posto || "default"
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

    const toggleAbonoSelecionado = (tipo) => {
        if (abonosSelecionados.includes(tipo)) {
            setAbonosSelecionados(abonosSelecionados.filter(t => t !== tipo));
            setHorariosAbono(prev => ({ ...prev, [tipo]: "" }));
        } else {
            setAbonosSelecionados([...abonosSelecionados, tipo]);
        }
    };

    const atualizarHorarioAbono = (tipo, horario) => {
        setHorariosAbono(prev => ({ ...prev, [tipo]: horario }));
    };

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
        const usuarioCompleto = usuarios.find(u => u.idLogin === idLoginFalta) || usuarioAlvo;
        if (!temPermissaoParaRegistrar(usuarioCompleto)) {
            alert("Você não tem permissão para registrar para este usuário!");
            return;
        }
        try {
            const currentUser = usuarioLogado?.name || "Administrador";
            const agora = Timestamp.now();
            const colecaoEfetivados = getColecaoEfetivados(usuarioAlvo.posto);
            const colecaoAbonos = getColecaoAbonos(usuarioAlvo.posto);
            const colecaoBancoHoras = getColecaoBancoHoras(usuarioAlvo.posto);

            if (registroType === "Falta") {
                const turnos = [
                    { hora: "07:00", tipo: "Entrada Manhã" },
                    { hora: "12:00", tipo: "Saída Manhã" },
                    { hora: "13:00", tipo: "Entrada Tarde" },
                    { hora: "18:00", tipo: "Saída Tarde" }
                ];
                for (const turno of turnos) {
                    const [hora, minuto] = turno.hora.split(':');
                    const dataFalta = dataAbono ? new Date(dataAbono) : new Date();
                    dataFalta.setDate(dataFalta.getDate() + 1);
                    dataFalta.setHours(parseInt(hora), parseInt(minuto), 0, 0);
                    await addDoc(collection(db, colecaoEfetivados), {
                        idLogin: idLoginFalta,
                        usuario: usuarioAlvo.name || "Desconhecido",
                        status: "Falta",
                        horaPonto: Timestamp.fromDate(dataFalta),
                        dataRegistro: agora,
                        registradoPor: currentUser,
                        justificativa: justificativa,
                        tipo: turno.tipo,
                        createdAt: agora,
                        escala: usuarioAlvo.escala || "Não informada",
                        posto: usuarioAlvo.posto || "default"
                    });
                }
                const dataAbonoCorrigida = dataAbono ? new Date(dataAbono) : new Date();
                dataAbonoCorrigida.setDate(dataAbonoCorrigida.getDate() + 1);
                const dataAbonoFormatada = dataAbonoCorrigida.toISOString().split('T')[0];
                await addDoc(collection(db, colecaoAbonos), {
                    idLogin: idLoginFalta,
                    usuario: usuarioAlvo.name || "Desconhecido",
                    tipo: "Falta",
                    data: dataAbonoFormatada,
                    horarios: turnos.map(t => t.hora),
                    justificativa: justificativa,
                    registradoPor: currentUser,
                    dataRegistro: agora,
                    escala: usuarioAlvo.escala || "Não informada",
                    posto: usuarioAlvo.posto || "default"
                });
                alert("Faltas registradas com sucesso!");
            } else if (registroType === "Abonado") {
                if (!dataAbono) {
                    alert("Para abono, preencha a data!");
                    return;
                }
                if (abonosSelecionados.length === 0) {
                    alert("Selecione pelo menos um tipo de abono!");
                    return;
                }
                for (const tipo of abonosSelecionados) {
                    if (!horariosAbono[tipo]) {
                        alert(`Preencha o horário para ${tiposAbono.find(t => t.id === tipo)?.label}`);
                        return;
                    }
                }
                for (const tipo of abonosSelecionados) {
                    const [hora, minuto] = horariosAbono[tipo].split(':');
                    const dataAbonoObj = new Date(dataAbono);
                    dataAbonoObj.setDate(dataAbonoObj.getDate() + 1);
                    dataAbonoObj.setHours(parseInt(hora), parseInt(minuto), 0, 0);
                    const tipoLabel = tiposAbono.find(t => t.id === tipo)?.label || tipo;
                    await addDoc(collection(db, colecaoEfetivados), {
                        idLogin: idLoginFalta,
                        usuario: usuarioAlvo.name || "Desconhecido",
                        status: "Abonado",
                        horaPonto: Timestamp.fromDate(dataAbonoObj),
                        dataRegistro: agora,
                        registradoPor: currentUser,
                        justificativa: justificativa,
                        tipo: tipoLabel,
                        createdAt: agora,
                        escala: usuarioAlvo.escala || "Não informada",
                        posto: usuarioAlvo.posto || "default"
                    });
                }
                const horariosRegistrados = abonosSelecionados.map(tipo => ({
                    tipo,
                    horario: horariosAbono[tipo]
                }));
                const dataAbonoCorrigida = new Date(dataAbono);
                dataAbonoCorrigida.setDate(dataAbonoCorrigida.getDate());
                const dataAbonoFormatada = dataAbonoCorrigida.toISOString().split('T')[0];
                await addDoc(collection(db, colecaoAbonos), {
                    idLogin: idLoginFalta,
                    usuario: usuarioAlvo.name || "Desconhecido",
                    tipo: "Abonado",
                    data: dataAbonoFormatada,
                    horarios: horariosRegistrados,
                    justificativa: justificativa,
                    registradoPor: currentUser,
                    dataRegistro: agora,
                    escala: usuarioAlvo.escala || "Não informada",
                    posto: usuarioAlvo.posto || "default"
                });
                alert("Abonos registrados com sucesso!");
            } else if (registroType === "Banco de Horas") {
                if (!dataAbono) {
                    alert("Para banco de horas, preencha a data!");
                    return;
                }
                if (!horasBanco || !minutosBanco) {
                    alert("Preencha as horas e minutos do banco de horas!");
                    return;
                }
                const totalMinutos = (parseInt(horasBanco) * 60) + parseInt(minutosBanco);
                if (totalMinutos <= 0) {
                    alert("O banco de horas deve ser maior que zero!");
                    return;
                }
                const dataBancoHoras = new Date(dataAbono);
                dataBancoHoras.setDate(dataBancoHoras.getDate() + 1);
                dataBancoHoras.setHours(8, 0, 0, 0);
                await addDoc(collection(db, colecaoEfetivados), {
                    idLogin: idLoginFalta,
                    usuario: usuarioAlvo.name || "Desconhecido",
                    status: "Banco de Horas",
                    horaPonto: Timestamp.fromDate(dataBancoHoras),
                    dataRegistro: agora,
                    registradoPor: currentUser,
                    justificativa: justificativa,
                    tipo: "Banco de Horas",
                    horasBanco: parseInt(horasBanco),
                    minutosBanco: parseInt(minutosBanco),
                    totalMinutos: totalMinutos,
                    createdAt: agora,
                    escala: usuarioAlvo.escala || "Não informada",
                    posto: usuarioAlvo.posto || "default"
                });
                await addDoc(collection(db, colecaoBancoHoras), {
                    idLogin: idLoginFalta,
                    usuario: usuarioAlvo.name || "Desconhecido",
                    tipo: "Banco de Horas",
                    data: dataAbono,
                    horas: parseInt(horasBanco),
                    minutos: parseInt(minutosBanco),
                    totalMinutos: totalMinutos,
                    justificativa: justificativa,
                    registradoPor: currentUser,
                    dataRegistro: agora,
                    escala: usuarioAlvo.escala || "Não informada",
                    posto: usuarioAlvo.posto || "default"
                });
                alert("Banco de horas registrado com sucesso!");
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
            setHorasBanco("");
            setMinutosBanco("");
        } catch (error) {
            console.error("Erro ao registrar status:", error);
            alert("Erro ao registrar. Tente novamente.");
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const pontosFiltrados = pontos.filter(ponto => {
        const usuario = getUsuarioByIdLogin(ponto.idLogin);
        const nomeUsuario = usuario.name?.toLowerCase() || '';
        const dataPonto = ponto.horaPonto instanceof Timestamp
            ? ponto.horaPonto.toDate().toISOString().split('T')[0]
            : new Date(ponto.horaPonto).toISOString().split('T')[0];
        const passaFiltroUsuario = nomeUsuario.includes(filtroUsuario.toLowerCase());
        const passaFiltroData = filtroData === '' || dataPonto === filtroData;
        const passaFiltroPosto = filtroPosto === '' || usuario.posto === filtroPosto;
        return passaFiltroUsuario && passaFiltroData && passaFiltroPosto;
    });

    const groupedPontos = pontosFiltrados.reduce((acc, ponto) => {
        const usuarioAlvo = getUsuarioByIdLogin(ponto.idLogin);
        const usuarioCompleto = usuarios.find(u => u.idLogin === ponto.idLogin?.toString()) || usuarioAlvo;
        if (!usuarioCompleto || usuarioCompleto.name === 'Desconhecido') {
            if (!acc[ponto.idLogin]) acc[ponto.idLogin] = [];
            acc[ponto.idLogin].push(ponto);
            return acc;
        }
        if (!temPermissaoParaVer(usuarioCompleto)) {
            return acc;
        }
        if (!acc[ponto.idLogin]) acc[ponto.idLogin] = [];
        acc[ponto.idLogin].push(ponto);
        return acc;
    }, {});

    if (!isAuthenticated) {
        return (
            <div className="app-loading">
                <div className="spinner"></div>
                <p>Redirecionando para login...</p>
            </div>
        );
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
            <SidebarMenu
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sidebarRef={sidebarRef}
                onLogout={handleLogout}
            />

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
                        <button className="btn btn-tertiary" onClick={() => abrirRegistro("Banco de Horas")}>
                            <FiDollarSign /> Banco de Horas
                        </button>
                    </div>
                </header>

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
                    {usuarioLogado && (parsePermissao(usuarioLogado.permissao) === 1) && (
                        <div className="filtro-group">
                            <label>Filtrar por posto:</label>
                            <select
                                value={filtroPosto}
                                onChange={(e) => setFiltroPosto(e.target.value)}
                            >
                                <option value="">Todos os postos</option>
                                {postosDisponiveis.map(posto => (
                                    <option key={posto.value} value={posto.value}>
                                        {posto.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button
                        className="btn btn-outline"
                        onClick={() => {
                            setFiltroUsuario('');
                            setFiltroData('');
                            setFiltroPosto('');
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
                                return (
                                    <div key={idLogin} className="colaborador-card">
                                        <div className="colaborador-header">
                                            <div className="avatar">{usuarioPonto.name?.charAt(0) || '?'}</div>
                                            <div className="colaborador-info">
                                                <h3>{usuarioPonto.name || 'Usuário Desconhecido'}</h3>
                                                <p>{permissoesMap[usuarioPonto.permissao] || 'Cargo Desconhecido'}</p>
                                                <small>Posto: {postosDisponiveis.find(p => p.value === usuarioPonto.posto)?.label || usuarioPonto.posto}</small>
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
                                                            <div className="ponto-foto-container">
                                                                <img
                                                                    src={`data:image/png;base64,${ponto.foto}`}
                                                                    alt="Foto do Ponto"
                                                                    className="ponto-foto"
                                                                    onClick={() => setSelectedPonto(ponto)}
                                                                />
                                                                <button
                                                                    className="btn-view-photo"
                                                                    onClick={() => setSelectedPonto(ponto)}
                                                                    title="Ver foto em tamanho maior"
                                                                >
                                                                    <FiEye size={12} />
                                                                </button>
                                                            </div>
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
                                            <p><strong>Posto:</strong> {postosDisponiveis.find(p => p.value === usuario.posto)?.label || usuario.posto}</p>
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

                        {registroType === "Banco de Horas" && (
                            <div className="form-group">
                                <label>Horas de Banco:</label>
                                <div className="horas-banco-container">
                                    <div className="horas-input">
                                        <label>Horas:</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="24"
                                            value={horasBanco}
                                            onChange={(e) => setHorasBanco(e.target.value)}
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                    <div className="minutos-input">
                                        <label>Minutos:</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={minutosBanco}
                                            onChange={(e) => setMinutosBanco(e.target.value)}
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                </div>
                                <small className="text-muted">
                                    Total: {horasBanco || 0}h {(minutosBanco || 0).toString().padStart(2, '0')}min
                                </small>
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

            {selectedPonto && (
                <div className="modal-overlay active" onClick={() => setSelectedPonto(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Foto do Ponto</h2>
                            <button className="close-modal" onClick={() => setSelectedPonto(null)}>&times;</button>
                        </div>
                        <div className="ponto-foto-modal-container">
                            <img
                                src={`data:image/png;base64,${selectedPonto.foto}`}
                                alt="Foto do Ponto"
                                className="ponto-foto-modal"
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn" onClick={() => setSelectedPonto(null)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ValidarPontos;