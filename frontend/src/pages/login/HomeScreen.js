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
import { Container, Navbar, Nav, Dropdown, Image, Alert, Badge } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiUser, FiLogOut, FiHome, FiUsers, FiFileText, FiClock, FiCheckCircle, FiPhoneOff } from 'react-icons/fi';
import axios from 'axios';
import '../usuarios/HomeScreen.css';

const API_BASE_URL = 'http://localhost:8080/api'; // Ajuste para seu backend real

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
        fetchPontos();
    }, []);

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
                                    startIcon={<FiCheckCircle />}
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

    return (
        <div className="app-container">
            {/* Sidebar */}
            <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    {!sidebarCollapsed && <h3 className="logo">Perequeté</h3>}
                    <button
                        className="toggle-btn"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    >
                        <FiMenu />
                    </button>
                </div>

                <div className="user-profile">
                    <Image
                        src={user?.photoURL || 'https://via.placeholder.com/150'}
                        roundedCircle
                        onClick={() => navigate('/perfil')}
                        className="profile-img"
                    />
                    {!sidebarCollapsed && (
                        <div className="user-info">
                            <h5>{user?.displayName || 'Usuário'}</h5>
                            <span className="text-muted">{user?.role || 'Admin'}</span>
                        </div>
                    )}
                </div>

                <nav className="sidebar-nav">
                    <ul>
                        <li
                            className={activeMenu === 'dashboard' ? 'active' : ''}
                            onClick={() => setActiveMenu('dashboard')}
                        >
                            <FiHome className="icon" />
                            {!sidebarCollapsed && <span>Dashboard</span>}
                        </li>

                        <li
                            className={activeMenu === 'usuarios' ? 'active' : ''}
                            onClick={() => {
                                setActiveMenu('usuarios');
                                navigate('/cadastro-usuarios');
                            }}
                        >
                            <FiUsers className="icon" />
                            {!sidebarCollapsed && <span>Usuários</span>}
                        </li>

                        <li className="has-submenu">
                            <div
                                className={`submenu-header ${activeMenu.startsWith('relatorios') ? 'active' : ''}`}
                                onClick={() => setActiveMenu(activeMenu.startsWith('relatorios') ? 'dashboard' : 'relatorios')}
                            >
                                <FiFileText className="icon" />
                                {!sidebarCollapsed && (
                                    <>
                                        <span>Relatórios</span>
                                        <span className="arrow"></span>
                                    </>
                                )}
                            </div>
                            {(!sidebarCollapsed && activeMenu.startsWith('relatorios')) && (
                                <ul className="submenu">
                                    <li onClick={() => setActiveMenu('relatorios-faltas')}>Faltas</li>
                                    <li onClick={() => setActiveMenu('relatorios-abonos')}>Abonos</li>
                                    <li onClick={() => setActiveMenu('relatorios-pontos')}>Pontos</li>
                                    <li onClick={() => setActiveMenu('relatorios-mensal')}>Planilha Mensal</li>
                                </ul>
                            )}
                        </li>
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                        <FiLogOut className="icon" />
                        {!sidebarCollapsed && <span>Sair</span>}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <header className="main-header">
                    <h2 className="page-title">
                        {activeMenu === 'dashboard' && 'Dashboard'}
                        {activeMenu === 'usuarios' && 'Cadastro de Usuários'}
                        {activeMenu.startsWith('relatorios') && 'Relatórios'}
                    </h2>
                    <div className="header-actions">
                        <Button variant="contained" onClick={exportToExcel} disabled={loading}>
                            Exportar Excel
                        </Button>
                    </div>
                </header>

                <div className="content-wrapper">
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
                                            // Para filtro, você pode implementar um estado e função de filtro
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
                    ) : (
                        <p>Conteúdo não implementado para este menu.</p>
                    )}
                </div>
            </div>

            {/* Modal do colaborador */}
            <Dialog
                open={showColabModal}
                onClose={() => setShowColabModal(false)}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>
                    <div className="modal-header">
                        <h3>Pontos de {selectedColab?.nome}</h3>
                        <button
                            className="close-btn"
                            onClick={() => setShowColabModal(false)}
                        >
                            &times;
                        </button>
                    </div>
                </DialogTitle>
                <DialogContent>
                    <Card variant="outlined">
                        <CardContent>
                            {selectedColab && renderColaboradorTable(selectedColab.pontos)}
                        </CardContent>
                    </Card>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setShowColabModal(false)}
                    >
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default HomePage;
