import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import HomeScreen from '../pages/login/HomeScreen';
import GerenciarUsuarios from '../pages/usuarios/GerenciarUsuarios';
import ValidarPontos from '../pages/usuarios/ValidarPontos';
import PerfilScreen from './PerfilScreen';

export default function Dashboard() {
    return (
        <Router>
            <div style={styles.navbar}>
                <Link to="/" style={styles.navLink}>Home</Link>
                <Link to="/perfil" style={styles.navLink}>Perfil</Link>
                <Link to="/gerenciar-usuarios" style={styles.navLink}>Gerenciar Usuários</Link>
                <Link to="/validar-pontos" style={styles.navLink}>Validar Pontos</Link>
            </div>

            <Routes>
                <Route path="/" element={<HomeScreen />} />
                <Route path="/perfil" element={<PerfilScreen />} />
                <Route path="/gerenciar-usuarios" element={<GerenciarUsuarios />} />
                <Route path="/validar-pontos" element={<ValidarPontos />} />
            </Routes>
        </Router>
    );
}

const styles = {
    navbar: {
        display: 'flex',
        justifyContent: 'space-around',
        backgroundColor: '#fff',
        padding: '10px',
        borderBottom: '1px solid #ccc',
    },
    navLink: {
        textDecoration: 'none',
        color: 'gray',
        fontSize: '16px',
    },
};