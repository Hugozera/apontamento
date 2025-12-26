import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import './Sidebar.css';

/**
 * AppLayout
 * - Uso: envolver páginas: <AppLayout pageTitle="Validar Pontos" headerActions={...}> ...conteúdo... </AppLayout>
 * - Garante um único menu lateral (Sidebar) reutilizável e header consistente.
 */
const AppLayout = ({ children, pageTitle, headerActions }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [activeMenu, setActiveMenu] = useState('dashboard');

    useEffect(() => {
        const saved = localStorage.getItem('activeMenu');
        if (saved) setActiveMenu(saved);
        const savedCollapsed = localStorage.getItem('sidebarCollapsed');
        if (savedCollapsed) setCollapsed(savedCollapsed === 'true');
    }, []);

    useEffect(() => {
        localStorage.setItem('activeMenu', activeMenu);
    }, [activeMenu]);

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(collapsed));
    }, [collapsed]);

    return (
        <div className="app-container">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(prev => !prev)} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

            <main className={`main-content ${collapsed ? 'collapsed' : 'open'}`}>
                <header className="main-header">
                    <div className="header-title">
                        <h1>{pageTitle || ''}</h1>
                    </div>
                    <div className="header-actions">
                        {headerActions}
                    </div>
                </header>

                <div className="content-wrapper">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AppLayout;