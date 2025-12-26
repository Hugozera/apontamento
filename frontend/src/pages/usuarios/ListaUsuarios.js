// src/components/ListaUsuarios.jsx
import React, { useEffect, useState, useRef, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
    FiUserPlus, FiEdit2, FiTrash2, FiSearch
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';
import './ValidarPontos.css';
import './ListaUsuarios.css';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc } from "firebase/firestore";
import SidebarMenu from '../../pages/fragmentos/SideBarMenu';

const permissoesMap = {
    1: "Gestor",
    2: "Gerente Geral",
    3: "Gerente de Equipes",
    4: "Frentista",
};

const permissoesHierarquia = {
    1: [1, 2, 3, 4], // Gestor pode criar todos
    2: [3, 4], // Gerente Geral pode criar Gerente de Equipes e Frentista
    3: [4], // Gerente de Equipes pode criar apenas Frentista
    4: [] // Frentista não pode criar ninguém
};

const postosDisponiveis = [
    { value: 'default', label: 'Perequeté' },
    { value: 'colinas', label: 'Colinas' },
    { value: 'colinas25', label: 'Colinas 25' }
];

export default function ListaUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [modalAberto, setModalAberto] = useState(false);
    const [modoEdicao, setModoEdicao] = useState(false);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

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

        // Filtrar usuários baseado na permissão do usuário logado
        const usuariosFiltrados = lista.filter(usuario => {
            // Gestor vê todos os usuários de todos os postos
            if (usuarioLogado?.permissao === '1') return true;

            // Outros usuários só veem usuários do MESMO POSTO e com PERMISSÃO INFERIOR
            const mesmoPosto = usuario.posto === usuarioLogado?.posto;
            const permissaoInferior = parseInt(usuario.permissao) > parseInt(usuarioLogado?.permissao);

            return mesmoPosto && permissaoInferior;
        });

        setUsuarios(usuariosFiltrados);
    };

    const abrirModal = (usuario = null) => {
        // Verificar permissão para cadastrar/editar
        if (!usuario && !podeCriarUsuario()) {
            alert('Você não tem permissão para cadastrar novos usuários');
            return;
        }

        // Se está editando, verificar se tem permissão para editar este usuário
        if (usuario && !podeEditarExcluirUsuario(usuario)) {
            alert('Você não tem permissão para editar este usuário');
            return;
        }

        setModoEdicao(!!usuario);
        setUsuarioSelecionado(usuario || {
            name: '', email: '', permissao: '', role: '',
            idLogin: '', senha: '', senhaPdv: '', ativo: '1',
            escala: '', horarioEntrada: '', horarioSaida: '', foto: '',
            noturno: false, posto: usuarioLogado?.posto || 'default'
        });
        setModalAberto(true);
    };

    const podeCriarUsuario = () => {
        return permissoesHierarquia[usuarioLogado?.permissao]?.length > 0;
    };

    const podeEditarExcluirUsuario = (usuarioAlvo) => {
        // Gestor pode editar/excluir qualquer usuário
        if (usuarioLogado?.permissao === '1') return true;

        // Verificar se o usuário alvo é do mesmo posto
        if (usuarioAlvo.posto !== usuarioLogado?.posto) return false;

        // Verificar hierarquia - só pode editar usuários com permissão maior (número maior = hierarquia inferior)
        const permissaoLogado = parseInt(usuarioLogado?.permissao);
        const permissaoAlvo = parseInt(usuarioAlvo.permissao);

        return permissaoAlvo > permissaoLogado;
    };

    const podeVerUsuario = (usuarioAlvo) => {
        // Gestor pode ver todos os usuários
        if (usuarioLogado?.permissao === '1') return true;

        // Verificar se o usuário alvo é do mesmo posto
        if (usuarioAlvo.posto !== usuarioLogado?.posto) return false;

        // Verificar hierarquia - só pode ver usuários com permissão inferior
        const permissaoLogado = parseInt(usuarioLogado?.permissao);
        const permissaoAlvo = parseInt(usuarioAlvo.permissao);

        return permissaoAlvo > permissaoLogado;
    };

    const getPermissoesDisponiveis = () => {
        return permissoesHierarquia[usuarioLogado?.permissao] || [];
    };

    const getPostosDisponiveis = () => {
        // Gestor pode cadastrar em todos os postos
        if (usuarioLogado?.permissao === '1') return postosDisponiveis;

        // Outros usuários só podem cadastrar no próprio posto
        return postosDisponiveis.filter(posto => posto.value === usuarioLogado?.posto);
    };

    const fecharModal = () => {
        setModalAberto(false);
        setUsuarioSelecionado(null);
    };

    const handleInputChange = e => {
        const { name, value, type, checked } = e.target;
        setUsuarioSelecionado(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
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
        // Validações
        if (!usuarioSelecionado.name || !usuarioSelecionado.email || !usuarioSelecionado.idLogin) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        const auth = getAuth();

        if (modoEdicao) {
            // Atualiza apenas os dados no Firestore
            const { senha, ...dadosAtualizacao } = usuarioSelecionado;
            await updateDoc(doc(db, 'users', usuarioSelecionado.id), dadosAtualizacao);
            alert('Usuário atualizado com sucesso!');
        } else {
            try {
                // 1. Cria usuário no Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    usuarioSelecionado.email,
                    usuarioSelecionado.senha || '123456' // Senha padrão se não informada
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
                    senhaPdv: usuarioSelecionado.senhaPdv || '123456',
                    ativo: usuarioSelecionado.ativo,
                    escala: usuarioSelecionado.escala,
                    horarioEntrada: usuarioSelecionado.horarioEntrada,
                    horarioSaida: usuarioSelecionado.horarioSaida,
                    foto: usuarioSelecionado.foto || '',
                    noturno: usuarioSelecionado.noturno || false,
                    posto: usuarioSelecionado.posto || usuarioLogado?.posto || 'default',
                    createdAt: new Date()
                });

                alert('Usuário cadastrado com sucesso!');
            } catch (error) {
                console.error("Erro ao cadastrar usuário:", error);
                alert(`Erro ao cadastrar: ${error.message}`);
                return;
            }
        }

        fecharModal();
        carregarUsuarios();
    };

    const excluirUsuario = async () => {
        if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;

        await deleteDoc(doc(db, 'users', usuarioSelecionado.id));
        fecharModal();
        carregarUsuarios();
        alert('Usuário excluído com sucesso!');
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
            <SidebarMenu
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sidebarRef={sidebarRef}
                onLogout={handleLogout}
            />

            <div className={`main-content ${sidebarOpen ? 'open' : ''}`}>
                <header className="main-header">
                    <h1>Lista de Usuários</h1>
                    <div className="user-info-header">
                        <span>{permissoesMap[usuarioLogado?.permissao]} - {postosDisponiveis.find(p => p.value === usuarioLogado?.posto)?.label}</span>
                    </div>
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
                            {podeCriarUsuario() && (
                                <button className="btn-add" onClick={() => abrirModal()}>
                                    <FiUserPlus /> Novo Usuário
                                </button>
                            )}
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
                            <th>Permissão</th>
                            <th>Posto</th>
                            <th>Noturno</th>
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
                                <td>{permissoesMap[usuario.permissao]}</td>
                                <td>{postosDisponiveis.find(p => p.value === usuario.posto)?.label || usuario.posto}</td>
                                <td>{usuario.noturno ? 'Sim' : 'Não'}</td>
                                <td>
                                    {podeEditarExcluirUsuario(usuario) && (
                                        <button className="btn-icon edit" onClick={() => abrirModal(usuario)}>
                                            <FiEdit2 />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    {modalAberto && (
                        <div className="modal-overlay active" onClick={fecharModal}>
                            <div className="modal" onClick={e => e.stopPropagation()}>
                                <h2>{modoEdicao ? 'Editar' : 'Cadastrar'} Usuário</h2>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Nome *</label>
                                        <input name="name" placeholder="Nome completo" value={usuarioSelecionado.name} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group">
                                        <label>Email *</label>
                                        <input name="email" type="email" placeholder="Email" value={usuarioSelecionado.email} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group">
                                        <label>ID Login *</label>
                                        <input name="idLogin" placeholder="ID de Login" value={usuarioSelecionado.idLogin} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group">
                                        <label>Permissão *</label>
                                        <select name="permissao" value={usuarioSelecionado.permissao} onChange={handleInputChange}>
                                            <option value="">Selecione a permissão</option>
                                            {getPermissoesDisponiveis().map(permissao => (
                                                <option key={permissao} value={permissao}>
                                                    {permissoesMap[permissao]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Cargo *</label>
                                        <input name="role" placeholder="Cargo/Função" value={usuarioSelecionado.role} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group">
                                        <label>Posto *</label>
                                        <select name="posto" value={usuarioSelecionado.posto} onChange={handleInputChange}>
                                            {getPostosDisponiveis().map(posto => (
                                                <option key={posto.value} value={posto.value}>
                                                    {posto.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {!modoEdicao && (
                                        <div className="form-group">
                                            <label>Senha {!modoEdicao && '*'}</label>
                                            <input name="senha" type="password" placeholder="Senha" value={usuarioSelecionado.senha} onChange={handleInputChange} />
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Senha PDV *</label>
                                        <input name="senhaPdv" type="password" placeholder="Senha PDV" value={usuarioSelecionado.senhaPdv} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group">
                                        <label>Escala</label>
                                        <input name="escala" placeholder="Ex: 12/36" value={usuarioSelecionado.escala} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group">
                                        <label>Horário Entrada</label>
                                        <input name="horarioEntrada" type="time" value={usuarioSelecionado.horarioEntrada} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group">
                                        <label>Horário Saída</label>
                                        <input name="horarioSaida" type="time" value={usuarioSelecionado.horarioSaida} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group full-width">
                                        <label className="checkbox-label">
                                            <input
                                                name="noturno"
                                                type="checkbox"
                                                checked={usuarioSelecionado.noturno || false}
                                                onChange={handleInputChange}
                                            />
                                            <span>Funcionário Noturno</span>
                                        </label>
                                    </div>

                                    <div className="form-group full-width">
                                        <label>Foto</label>
                                        <input type="file" accept="image/*" onChange={handleImagemChange} />
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button className="btn-save" onClick={salvarUsuario}>Salvar</button>
                                    {modoEdicao && podeEditarExcluirUsuario(usuarioSelecionado) && (
                                        <button className="btn-delete" onClick={excluirUsuario}>
                                            <FiTrash2 /> Excluir
                                        </button>
                                    )}
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