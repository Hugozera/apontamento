import React, { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
    FiMenu, FiUser, FiFileText, FiHome, FiUsers, FiLogOut,
    FiChevronRight, FiDollarSign
} from 'react-icons/fi';
import '../../components/Sidebar.css';

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

const SidebarMenu = ({
                         sidebarOpen,
                         setSidebarOpen,
                         sidebarRef,
                         onLogout
                     }) => {
    const location = useLocation();
    const { user: usuarioLogado } = useContext(AuthContext);
    const [submenuOpen, setSubmenuOpen] = useState({
        usuarios: false,
        relatorios: false,
        rh: false
    });

    const toggleSubmenu = (menu) => {
        setSubmenuOpen(prev => ({ ...prev, [menu]: !prev[menu] }));
    };

    const getPostoSeguro = (usuario) => {
        if (!usuario) return 'default';
        const posto = usuario.posto;
        if (!posto || posto === 'null' || posto === 'undefined' || posto === '' || posto === 'default') {
            return 'default';
        }
        return posto;
    };

    const podeVerRH = () => {
        if (!usuarioLogado) return false;
        const perm = Number(usuarioLogado.permissao) || 99;
        return perm === 1 || perm === 2;
    };

    return (
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} ref={sidebarRef}>
            <div className="sidebar-header">
                <h3 className="logo">Perequeté</h3>
                <button
                    className="toggle-btn"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label={sidebarOpen ? "Recolher menu" : "Expandir menu"}
                >
                    <FiMenu />
                </button>
            </div>

            <div className="user-profile">
                <div className="avatar">{usuarioLogado?.name?.charAt(0) || '?'}</div>
                <div className="user-info">
                    <h5>{usuarioLogado?.name || 'Usuário'}</h5>
                    <span>
                        {permissoesMap[usuarioLogado?.permissao] || 'Cargo'} - {' '}
                        {postosDisponiveis.find(p => p.value === getPostoSeguro(usuarioLogado))?.label}
                    </span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <ul>
                    <li className={location.pathname === '/' ? 'active' : ''}>
                        <Link to="/validar-pontos" className="menu-item">
                            <FiHome className="icon" /><span>Home</span>
                        </Link>
                    </li>

                    <li className="submenu-container">
                        <div
                            className={`menu-item ${submenuOpen.usuarios ? 'open' : ''}`}
                            onClick={() => toggleSubmenu('usuarios')}
                            role="button"
                            tabIndex={0}
                        >
                            <FiUsers className="icon" /><span>Usuários</span>
                            <FiChevronRight className="arrow-icon" />
                        </div>
                        <ul className={`submenu ${submenuOpen.usuarios ? 'open' : ''}`}>
                            <li><Link to="/cadastro-usuarios">Cadastrar Usuário</Link></li>
                        </ul>
                    </li>

                    <li className="submenu-container">
                        <div
                            className={`menu-item ${submenuOpen.relatorios ? 'open' : ''}`}
                            onClick={() => toggleSubmenu('relatorios')}
                            role="button"
                            tabIndex={0}
                        >
                            <FiFileText className="icon" /><span>Relatórios</span>
                            <FiChevronRight className="arrow-icon" />
                        </div>
                        <ul className={`submenu ${submenuOpen.relatorios ? 'open' : ''}`}>
                            <li><Link to="/relatorio-faltas">Faltas</Link></li>
                            <li><Link to="/relatorio-abonos">Abonos</Link></li>
                            <li><Link to="/planilha-mensal">Apontamento Mensal</Link></li>
                        </ul>
                    </li>

                    {podeVerRH() && (
                        <li className="submenu-container">
                            <div
                                className={`menu-item ${submenuOpen.rh ? 'open' : ''}`}
                                onClick={() => toggleSubmenu('rh')}
                                role="button"
                                tabIndex={0}
                            >
                                <FiDollarSign className="icon" /><span>RH</span>
                                <FiChevronRight className="arrow-icon" />
                            </div>
                            <ul className={`submenu ${submenuOpen.rh ? 'open' : ''}`}>
                                <li><Link to="/controle-financeiro">Controle Financeiro</Link></li>
                            </ul>
                        </li>
                    )}
                </ul>
            </nav>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={onLogout} aria-label="Sair do sistema">
                    <FiLogOut className="icon" /><span>Sair</span>
                </button>
            </div>
        </div>
    );
};

export default SidebarMenu;