import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiUsers, FiHome, FiChevronRight, FiLogOut, FiFileText } from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';
import '../../pages/usuarios/ValidarPontos.css';

const permissoesMap = {
    1: "Gestor",
    2: "Gerente Geral",
    3: "Gerente de Equipes",
    4: "Frentista",
};

export default function TemplateLayout({ children, titulo }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [submenuOpen, setSubmenuOpen] = useState({ usuarios: false, relatorios: false });

    const { user, logout } = useContext(AuthContext) || {};
    const location = useLocation();
    const navigate = useNavigate();

    const toggleSubmenu = (menu) => {
        setSubmenuOpen(prev => ({ ...prev, [menu]: !prev[menu] }));
    };

    return (
        <div className="app-container">
            <div className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
                <div className="sidebar-header">
                    <h3 className="logo">Perequeté</h3>
                    <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <FiMenu />
                    </button>
                </div>

                <div className="user-profile">
                    <div className="avatar">{user?.name?.charAt(0) || '?'}</div>
                    <div className="user-info">
                        <h5>{user?.name || 'Usuário'}</h5>
                        <span>{permissoesMap[user?.permissao] || 'Sem permissão'}</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <ul>
                        <li className={location.pathname === '/' ? 'active' : ''}>
                            <Link to="/" className="menu-item">
                                <FiHome className="icon" />
                                <span>Home</span>
                            </Link>
                        </li>

                        <li className="submenu-container">
                            <div className="menu-item" onClick={() => toggleSubmenu('usuarios')}>
                                <FiUsers className="icon" />
                                <span>Usuários</span>
                                <FiChevronRight className={`arrow-icon ${submenuOpen.usuarios ? 'rotated' : ''}`} />
                            </div>
                            <ul className={`submenu ${submenuOpen.usuarios ? 'open' : ''}`}>
                                <li><Link to="/cadastro-usuarios">Cadastrar Usuário</Link></li>
                                <li><Link to="/lista-usuarios">Listar Usuários</Link></li>
                            </ul>
                        </li>

                        <li className="submenu-container">
                            <div className="menu-item" onClick={() => toggleSubmenu('relatorios')}>
                                <FiFileText className="icon" />
                                <span>Relatórios</span>
                                <FiChevronRight className={`arrow-icon ${submenuOpen.relatorios ? 'rotated' : ''}`} />
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
                    <button
                        className="logout-btn"
                        onClick={() => {
                            if (logout) logout();
                            navigate('/login');
                        }}
                    >
                        <FiLogOut className="icon" />
                        <span>Sair</span>
                    </button>
                </div>
            </div>

            <div className={`main-content ${sidebarOpen ? 'open' : 'collapsed'}`}>
                <header className="main-header">
                    <h1>{titulo || ''}</h1>
                </header>
                <div className="content-wrapper">{children}</div>
            </div>
        </div>
    );
}
