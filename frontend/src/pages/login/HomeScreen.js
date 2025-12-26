import React, { useState, useEffect, useContext } from 'react';
import {
    Button,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Stack,
    DialogActions,
} from "@mui/material";
import * as XLSX from "xlsx";
import { Image, Badge } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiUser, FiLogOut, FiHome, FiUsers, FiFileText, FiCheckCircle, FiPhoneOff, FiCheck } from 'react-icons/fi';
import axios from 'axios';
import '../../components/Sidebar.css';
import '../usuarios/HomeScreen.css';
import AppLayout from '../../components/AppLayout';

const API_BASE_URL = 'http://localhost:8080/api'; // Ajuste para seu backend real

// Map de permissões conforme Firestore (fornecido)
const permissoesMap = {
    1: 'Gestor',
    2: 'Gerente Geral',
    3: 'Gerente de Equipes',
    4: 'Frentista'
};

const HomePage = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);

    const [showColabModal, setShowColabModal] = useState(false);
    const [selectedColab, setSelectedColab] = useState(null);
    const [pontos, setPontos] = useState([]);
    const [agrupadoPorColaborador, setAgrupadoPorColaborador] = useState({});
    const [atrasos, setAtrasos] = useState(0);
    const [horasExtras, setHorasExtras] = useState(0);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('activeMenu');
        if (saved) setActiveMenu(saved);
        const savedCollapsed = localStorage.getItem('sidebarCollapsed');
        if (savedCollapsed) setSidebarCollapsed(savedCollapsed === 'true');
    }, []);

    useEffect(() => {
        fetchPontos();
    }, []);

    useEffect(() => {
        localStorage.setItem('activeMenu', activeMenu);
    }, [activeMenu]);

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    }, [sidebarCollapsed]);

    const fetchPontos = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/pontos`);
            // Ajustar os dados para seu formato esperado
            const pontosData = response.data.map(ponto => ({
                id: ponto.id, // Assumindo que seu backend envia um id
                colaborador: ponto.usuario || "Desconhecido", // Ajuste conforme a estrutura do backend
                data: new Date(ponto.horaPonto || ponto.data), // Data do ponto
                status: ponto.status || null,
            }));
            setPontos(pontosData);
            agruparPorColaborador(pontosData);
            calcularAtrasosEHorasExtras(pontosData);
        } catch (error) {
            console.error("Erro ao buscar pontos:", error);
            alert("Erro ao carregar pontos. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const agruparPorColaborador = (pontos) => {
        const agrupado = {};
        pontos.forEach(p => {
            const nome = p.colaborador || "Desconhecido";
            if (!agrupado[nome]) agrupado[nome] = [];
            agrupado[nome].push(p);
        });
        setAgrupadoPorColaborador(agrupado);
    };

    const calcularAtrasosEHorasExtras = (pontos) => {
        let atrasoTotal = 0;
        let horasExtrasTotal = 0;

        pontos.forEach(ponto => {
            const data = ponto.data || new Date();
            const entradaEsperada = new Date(data);
            entradaEsperada.setHours(18, 0, 0, 0);

            const horarioRegistrado = new Date(data);

            if (horarioRegistrado > entradaEsperada) {
                const atraso = (horarioRegistrado - entradaEsperada) / (1000 * 60);
                atrasoTotal += atraso;
            }

            const saidaEsperada = new Date(entradaEsperada);
            saidaEsperada.setDate(saidaEsperada.getDate() + 1);
            saidaEsperada.setHours(6, 0, 0, 0);

            if (horarioRegistrado > saidaEsperada) {
                const extras = (horarioRegistrado - saidaEsperada) / (1000 * 60 * 60);
                horasExtrasTotal += extras;
            }
        });

        setAtrasos(atrasoTotal);
        setHorasExtras(horasExtrasTotal);
    };

    const exportToExcel = () => {
        const data = [...pontos, { Atrasos: atrasos, "Horas Extras": horasExtras }];
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
        XLSX.writeFile(workbook, "Relatorio_Pontos.xlsx");
    };

    const handleAprovarPonto = async (pontoId) => {
        try {
            await axios.put(`${API_BASE_URL}/pontos/${pontoId}/aprovar`, {
                usuario: user?.displayName || 'Gestor',
            });
            const novosPontos = pontos.map(p =>
                p.id === pontoId ? { ...p, status: "Aprovado" } : p
            );
            setPontos(novosPontos);
            agruparPorColaborador(novosPontos);
        } catch (error) {
            console.error("Erro ao aprovar ponto:", error);
            alert("Erro ao aprovar ponto");
        }
    };

    const handleReprovarPonto = async (pontoId) => {
        try {
            const justificativa = prompt("Informe a justificativa para recusar o ponto:");
            if (!justificativa) return;

            await axios.put(`${API_BASE_URL}/pontos/${pontoId}/recusar`, {
                usuario: user?.displayName || 'Gestor',
                justificativa,
            });
            const novosPontos = pontos.map(p =>
                p.id === pontoId ? { ...p, status: "Recusado" } : p
            );
            setPontos(novosPontos);
            agruparPorColaborador(novosPontos);
        } catch (error) {
            console.error("Erro ao recusar ponto:", error);
            alert("Erro ao recusar ponto");
        }
    };

    const renderColaboradorTable = (pontosColab) => (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell><strong>Data</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Ações</strong></TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {pontosColab.map((ponto) => (
                    <TableRow key={ponto.id}>
                        <TableCell>
                            {new Date(ponto.data).toLocaleString()}
                        </TableCell>
                        <TableCell>
                            <Badge
                                bg={ponto.status === "Aprovado" ? "success" :
                                    ponto.status === "Recusado" ? "danger" : "warning"}
                                className="status-badge"
                            >
                                {ponto.status || "Pendente"}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Stack direction="row" spacing={1}>
                                <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    onClick={() => handleAprovarPonto(ponto.id)}
                                    disabled={ponto.status === "Aprovado"}
                                    startIcon={<FiCheck />}
                                >
                                    Aprovar
                                </Button>
                                <Button
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    onClick={() => handleReprovarPonto(ponto.id)}
                                    disabled={ponto.status === "Recusado"}
                                    startIcon={<FiPhoneOff />}
                                >
                                    Reprovar
                                </Button>
                            </Stack>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // headerActions for AppLayout
    const headerActions = (
        <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="contained" onClick={exportToExcel} disabled={loading}>
                Exportar Excel
            </Button>
        </div>
    );

    return (
        <AppLayout pageTitle={
            activeMenu === 'dashboard' ? 'Dashboard' :
                (activeMenu === 'usuarios' ? 'Cadastro de Usuários' : (activeMenu.startsWith('relatorios') ? 'Relatórios' : ''))
        } headerActions={headerActions}>
            {/* Conteúdo da Home */}
            {loading ? (
                <p>Carregando dados...</p>
            ) : activeMenu === 'dashboard' ? (
                <>
                    <div className="summary-cards">
                        <Card className="summary-card">
                            <CardContent>
                                <h5>Total Colaboradores</h5>
                                <h3>{Object.keys(agrupadoPorColaborador).length}</h3>
                            </CardContent>
                        </Card>
                        <Card className="summary-card">
                            <CardContent>
                                <h5>Pontos Pendentes</h5>
                                <h3>{pontos.filter(p => !p.status).length}</h3>
                            </CardContent>
                        </Card>
                        <Card className="summary-card">
                            <CardContent>
                                <h5>Atrasos (min)</h5>
                                <h3>{atrasos.toFixed(2)}</h3>
                            </CardContent>
                        </Card>
                        <Card className="summary-card">
                            <CardContent>
                                <h5>Horas Extras</h5>
                                <h3>{horasExtras.toFixed(2)}</h3>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="main-card">
                        <CardContent>
                            <div className="card-header">
                                <h4>Colaboradores</h4>
                                <input
                                    type="text"
                                    placeholder="Buscar colaborador..."
                                    className="search-input"
                                />
                            </div>
                            <div className="collaborators-grid">
                                {Object.keys(agrupadoPorColaborador).map(nome => (
                                    <div
                                        key={nome}
                                        className="collaborator-card"
                                        onClick={() => {
                                            setSelectedColab({ nome, pontos: agrupadoPorColaborador[nome] });
                                            setShowColabModal(true);
                                        }}
                                    >
                                        <div className="collaborator-info">
                                            <div className="avatar">{nome.charAt(0)}</div>
                                            <div>
                                                <h5>{nome}</h5>
                                                <p>{agrupadoPorColaborador[nome].length} pontos</p>
                                            </div>
                                        </div>
                                        <div className="status-indicator">
                                            <Badge bg="warning">
                                                {agrupadoPorColaborador[nome].filter(p => !p.status).length} pendentes
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : activeMenu === 'usuarios' ? (
                <p>Ir para cadastro de usuários (rota /cadastro-usuarios)</p>
            ) : activeMenu.startsWith('relatorios') ? (
                <p>Área de Relatórios: {activeMenu.replace('relatorios-', '')}</p>
            ) : (
                <p>Conteúdo não implementado para este menu.</p>
            )}

            {/* Modal do colaborador */}
            <Dialog
                open={showColabModal}
                onClose={() => setShowColabModal(false)}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        overflow: 'hidden',
                        maxHeight: '85vh'
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark, #1a252f) 100%)',
                        color: 'white',
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                >
                    <div className="modal-header">
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                            Pontos de {selectedColab?.nome}
                        </h2>
                        <button
                            className="close-modal"
                            onClick={() => setShowColabModal(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                fontSize: '1.4rem',
                                cursor: 'pointer',
                                padding: '5px'
                            }}
                        >
                            &times;
                        </button>
                    </div>
                </DialogTitle>

                <DialogContent sx={{
                    padding: '20px',
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}>
                    <div className="modal-table-container">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Data</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                    <TableCell><strong>Ações</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedColab?.pontos?.map((ponto) => (
                                    <TableRow key={ponto.id}>
                                        <TableCell>
                                            {new Date(ponto.data).toLocaleString('pt-BR')}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className="status-badge"
                                                style={{
                                                    backgroundColor: ponto.status === "Aprovado" ? 'var(--secondary-color)' :
                                                        ponto.status === "Recusado" ? 'var(--danger-color)' : 'var(--warning-color)',
                                                    color: 'white',
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {ponto.status || "Pendente"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    size="small"
                                                    onClick={() => handleAprovarPonto(ponto.id)}
                                                    disabled={ponto.status === "Aprovado"}
                                                    startIcon={<FiCheckCircle />}
                                                    sx={{
                                                        borderRadius: '8px',
                                                        textTransform: 'none',
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    Aprovar
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="error"
                                                    size="small"
                                                    onClick={() => handleReprovarPonto(ponto.id)}
                                                    disabled={ponto.status === "Recusado"}
                                                    startIcon={<FiPhoneOff />}
                                                    sx={{
                                                        borderRadius: '8px',
                                                        textTransform: 'none',
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    Reprovar
                                                </Button>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>

                <DialogActions sx={{
                    padding: '16px 20px',
                    borderTop: '1px solid var(--light-color)',
                    backgroundColor: '#fafafa'
                }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setShowColabModal(false)}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none'
                        }}
                    >
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>
        </AppLayout>
    );
};

export default HomePage;