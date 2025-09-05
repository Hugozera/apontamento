    // src/components/ListaUsuarios.jsx
    import React, { useEffect, useState, useRef, useContext } from 'react';
    import { Link, useNavigate, useLocation } from 'react-router-dom';
    import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
    import { db } from '../../config/firebase';
    import {
        FiUserPlus, FiEdit2, FiTrash2, FiSearch,
        FiMenu, FiUsers, FiLogOut, FiHome, FiChevronRight
    } from 'react-icons/fi';
    import { AuthContext } from '../../context/AuthContext';
    import './ValidarPontos.css'; // Reutiliza o layout do menu lateral
    import './ListaUsuarios.css'; // CSS específico da tabela
    import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
    import { setDoc } from "firebase/firestore";

    const permissoesMap = {
        1: "Gestor",
        2: "Gerente Geral",
        3: "Gerente de Equipes",
        4: "Frentista",
    };

    export default function ListaUsuarios() {
        const [usuarios, setUsuarios] = useState([]);
        const [filtro, setFiltro] = useState('');
        const [modalAberto, setModalAberto] = useState(false);
        const [modoEdicao, setModoEdicao] = useState(false);
        const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
        const [sidebarOpen, setSidebarOpen] = useState(true);
        const [submenuOpen, setSubmenuOpen] = useState({ usuarios: true, relatorios: false });

        const { user: usuarioLogado, logout, isAuthenticated } = useContext(AuthContext);
        const navigate = useNavigate();
        const location = useLocation();
        const sidebarRef = useRef();

        useEffect(() => {
            if (!isAuthenticated) navigate('/login');
            carregarUsuarios();
        }, [isAuthenticated]);

        const carregarUsuarios = async () => {
            const snapshot = await getDocs(collection(db, 'users'));
            const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsuarios(lista);
        };

        const abrirModal = (usuario = null) => {
            setModoEdicao(!!usuario);
            setUsuarioSelecionado(usuario || {
                name: '', email: '', permissao: '', role: '',
                idLogin: '', senha: '', senhaPdv: '', ativo: '1',
                escala: '', horarioEntrada: '', horarioSaida: '', foto: ''
            });
            setModalAberto(true);
        };

        const fecharModal = () => {
            setModalAberto(false);
            setUsuarioSelecionado(null);
        };

        const handleInputChange = e => {
            const { name, value } = e.target;
            setUsuarioSelecionado(prev => ({ ...prev, [name]: value }));
        };

        const handleImagemChange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                setUsuarioSelecionado(prev => ({
                    ...prev,
                    foto: reader.result.split(',')[1]
                }));
            };
            reader.readAsDataURL(file);
        };

        const salvarUsuario = async () => {
            const auth = getAuth();

            if (modoEdicao) {
                // Apenas atualiza os dados no Firestore
                await updateDoc(doc(db, 'users', usuarioSelecionado.id), usuarioSelecionado);
            } else {
                try {
                    // 1. Cria usuário no Firebase Auth
                    const userCredential = await createUserWithEmailAndPassword(
                        auth,
                        usuarioSelecionado.email,
                        usuarioSelecionado.senha
                    );
                    const novoUsuario = userCredential.user;

                    // 2. Salva os dados no Firestore com o uid do Firebase Auth
                    await setDoc(doc(db, 'users', novoUsuario.uid), {
                        uid: novoUsuario.uid,
                        name: usuarioSelecionado.name,
                        email: usuarioSelecionado.email,
                        permissao: usuarioSelecionado.permissao,
                        role: usuarioSelecionado.role,
                        idLogin: usuarioSelecionado.idLogin,
                        senhaPdv: usuarioSelecionado.senhaPdv,
                        ativo: usuarioSelecionado.ativo,
                        escala: usuarioSelecionado.escala,
                        horarioEntrada: usuarioSelecionado.horarioEntrada,
                        horarioSaida: usuarioSelecionado.horarioSaida,
                        foto: usuarioSelecionado.foto || ''
                    });

                    alert('Usuário cadastrado com sucesso!');
                } catch (error) {
                    console.error("Erro ao cadastrar usuário:", error);
                    alert(`Erro ao cadastrar: ${error.message}`);
                }
            }

            fecharModal();
            carregarUsuarios();
        };


        const excluirUsuario = async () => {
            await deleteDoc(doc(db, 'users', usuarioSelecionado.id));
            fecharModal();
            carregarUsuarios();
        };

        const toggleSubmenu = (menu) => {
            setSubmenuOpen(prev => ({ ...prev, [menu]: !prev[menu] }));
        };

        const handleLogout = () => {
            logout();
            navigate('/login');
        };

        const usuariosFiltrados = usuarios.filter(u =>
            u.name?.toLowerCase().includes(filtro.toLowerCase()) ||
            u.idLogin?.includes(filtro)
        );

        return (
            <div className="app-container">
                {/* Sidebar */}
                <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} ref={sidebarRef}>
                    <div className="sidebar-header">
                        <h3 className="logo">Perequeté</h3>
                        <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <FiMenu />
                        </button>
                    </div>

                    <div className="user-profile">
                        <div className="avatar">{usuarioLogado?.name?.charAt(0) || '?'}</div>
                        <div className="user-info">
                            <h5>{usuarioLogado?.name}</h5>
                            <span>{permissoesMap[usuarioLogado?.permissao]}</span>
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
                                <div
                                    className={`menu-item ${submenuOpen.usuarios ? 'open' : ''}`}
                                    onClick={() => toggleSubmenu('usuarios')}
                                >
                                    <FiUsers className="icon" />
                                    <span>Usuários</span>
                                    <FiChevronRight className="arrow-icon" />
                                </div>
                                <ul className={`submenu ${submenuOpen.usuarios ? 'open' : ''}`}>
                                    <li><Link to="/cadastro-usuarios">Cadastrar Usuário</Link></li>
                                    <li><Link to="/lista-usuarios">Listar Usuários</Link></li>
                                </ul>
                            </li>

                            <li className="submenu-container">
                                <div
                                    className={`menu-item ${submenuOpen.relatorios ? 'open' : ''}`}
                                    onClick={() => toggleSubmenu('relatorios')}
                                >
                                    <FiUsers className="icon" />
                                    <span>Relatórios</span>
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
                        <button className="logout-btn" onClick={handleLogout}>
                            <FiLogOut className="icon" />
                            <span>Sair</span>
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className={`main-content ${sidebarOpen ? 'open' : ''}`}>
                    <header className="main-header">
                        <h1>Lista de Usuários</h1>
                    </header>

                    <div className="content-wrapper lista-usuarios-container">
                        <div className="header">
                            <div className="actions">
                                <div className="search-box">
                                    <FiSearch className="search-icon" />
                                    <input
                                        placeholder="Buscar por nome ou ID"
                                        value={filtro}
                                        onChange={e => setFiltro(e.target.value)}
                                    />
                                </div>
                                <button className="btn-add" onClick={() => abrirModal()}>
                                    <FiUserPlus /> Novo Usuário
                                </button>
                            </div>
                        </div>

                        <table className="usuarios-table">
                            <thead>
                            <tr>
                                <th>Foto</th>
                                <th>Nome</th>
                                <th>ID Login</th>
                                <th>Email</th>
                                <th>Cargo</th>
                                <th>Ações</th>
                            </tr>
                            </thead>
                            <tbody>
                            {usuariosFiltrados.map(usuario => (
                                <tr key={usuario.id}>
                                    <td>
                                        <img
                                            className="foto"
                                            src={usuario.foto ? `data:image/png;base64,${usuario.foto}` : '/assets/images/default-image.jpg'}
                                            alt="Foto"
                                        />
                                    </td>
                                    <td>{usuario.name}</td>
                                    <td>{usuario.idLogin}</td>
                                    <td>{usuario.email}</td>
                                    <td>{usuario.role}</td>
                                    <td>
                                        <button className="btn-icon edit" onClick={() => abrirModal(usuario)}>
                                            <FiEdit2 />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        {modalAberto && (
                            <div className="modal-overlay active" onClick={fecharModal}>
                                <div className="modal" onClick={e => e.stopPropagation()}>
                                    <h2>{modoEdicao ? 'Editar' : 'Cadastrar'} Usuário</h2>

                                    <input name="name" placeholder="Nome" value={usuarioSelecionado.name} onChange={handleInputChange} />
                                    <input name="email" placeholder="Email" value={usuarioSelecionado.email} onChange={handleInputChange} />
                                    <input name="permissao" placeholder="Permissão" value={usuarioSelecionado.permissao} onChange={handleInputChange} />
                                    <input name="role" placeholder="Cargo" value={usuarioSelecionado.role} onChange={handleInputChange} />
                                    <input name="idLogin" placeholder="ID Login" value={usuarioSelecionado.idLogin} onChange={handleInputChange} />
                                    <input name="senha" placeholder="Senha" type="password" value={usuarioSelecionado.senha} onChange={handleInputChange} />
                                    <input name="senhaPdv" placeholder="Senha PDV" type="password" value={usuarioSelecionado.senhaPdv} onChange={handleInputChange} />
                                    <input name="escala" placeholder="Escala" value={usuarioSelecionado.escala} onChange={handleInputChange} />
                                    <input name="horarioEntrada" type="time" value={usuarioSelecionado.horarioEntrada} onChange={handleInputChange} />
                                    <input name="horarioSaida" type="time" value={usuarioSelecionado.horarioSaida} onChange={handleInputChange} />
                                    <input type="file" accept="image/*" onChange={handleImagemChange} />

                                    <div className="modal-actions">
                                        <button className="btn-save" onClick={salvarUsuario}>Salvar</button>
                                        {modoEdicao && <button className="btn-delete" onClick={excluirUsuario}><FiTrash2 /> Excluir</button>}
                                        <button className="btn-cancel" onClick={fecharModal}>Cancelar</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
