import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiUsers, FiFileText, FiMenu, FiChevronRight, FiUser, FiLogOut } from 'react-icons/fi';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Sidebar.css';

const permissoesMap = {
    1: 'Gestor',
    2: 'Gerente Geral',
    3: 'Gerente de Equipes',
    4: 'Frentista'
};

const Sidebar = ({ collapsed, onToggle, activeMenu, setActiveMenu }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);

    const getUserPermissionLevel = () => {
        if (!user) return null;
        if (typeof user?.permissao === 'number') return user.permissao;
        if (typeof user?.permissao === 'string' && !isNaN(Number(user.permissao))) return Number(user.permissao);
        if (typeof user?.roleId === 'number') return user.roleId;
        const roleName = user?.role || user?.perfil || user?.roleName;
        if (roleName) {
            const entry = Object.entries(permissoesMap).find(([, v]) => v.toLowerCase() === String(roleName).toLowerCase());
            if (entry) return Number(entry[0]);
        }
        return null;
    };

    const userPermName = permissoesMap[getUserPermissionLevel()] || (user?.role || 'Sem papel');

    const menuConfig = [
        { key: 'dashboard', label: 'Home', icon: <FiHome />, to: '/' },
        { key: 'usuarios', label: 'Cadastrar Usuários', icon: <FiUsers />, to: '/cadastro-usuarios' },
        {
            key: 'relatorios',
            label: 'Relatórios',
            icon: <FiFileText />,
            submenu: [
                { key: 'relatorios-faltas', label: 'Faltas', to: '/relatorio-faltas' },
                { key: 'relatorios-abonos', label: 'Abonos', to: '/relatorio-abonos' },
                { key: 'relatorios-mensal', label: 'Apontamento Mensal', to: '/relatorio-mensal' }
            ]
        },
        (userPermName === 'Gestor' || userPermName === 'Gerente Geral') ? {
            key: 'rh',
            label: 'RH',
            icon: <FiUser />,
            submenu: [
                { key: 'controle-financeiro', label: 'Controle Financeiro', to: '/controle-financeiro' }
            ]
        } : null
    ].filter(Boolean);

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="brand">
                    <div className="logo-icon">P</div>
                    {!collapsed && <h3 className="logo">Perequeté</h3>}
                </div>
                <button className="toggle-btn" onClick={onToggle} aria-label="Toggle menu">
                    <FiMenu />
                </button>
            </div>

            <div className="user-profile">
                <div className="profile-img" title={user?.displayName || user?.name || 'Usuário'}>
                    { (user?.photoURL) ? <img src={user.photoURL} alt="avatar" /> : (user?.displayName?.charAt(0) || user?.name?.charAt(0) || 'U') }
                </div>
                {!collapsed && (
                    <div className="user-info">
                        <h5>{user?.displayName || user?.name || 'Usuário'}</h5>
                        <span className="text-muted">{userPermName}</span>
                    </div>
                )}
            </div>

            <nav className="sidebar-nav">
                <ul>
                    {menuConfig.map(item => (
                        <li key={item.key} className={`${(activeMenu === item.key || (item.submenu && item.submenu.some(s => s.key === activeMenu))) ? 'active' : ''}`}>
                            <div
                                className="menu-item"
                                onClick={() => {
                                    if (item.to) {
                                        setActiveMenu(item.key);
                                        navigate(item.to);
                                    } else if (item.submenu) {
                                        // toggle submenu locally by setting activeMenu to the parent key
                                        setActiveMenu(activeMenu === item.key ? 'dashboard' : item.key);
                                    }
                                }}
                            >
                                <div className="menu-left">
                                    <span className="icon">{item.icon}</span>
                                    {!collapsed && <span className="menu-label">{item.label}</span>}
                                </div>
                                {!collapsed && item.submenu && <FiChevronRight className="chev" />}
                            </div>

                            {item.submenu && (activeMenu === item.key) && !collapsed && (
                                <ul className="submenu">
                                    {item.submenu.map(sub => (
                                        <li key={sub.key} className={activeMenu === sub.key ? 'active' : ''} onClick={() => { setActiveMenu(sub.key); navigate(sub.to); }}>
                                            {sub.label}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>
                    <FiLogOut className="icon" />
                    {!collapsed && <span>Sair</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;