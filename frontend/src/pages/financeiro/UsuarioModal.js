// src/components/financeiro/UsuarioModal.js
import React, { useState } from 'react';
import { FiSearch, FiX, FiUser } from 'react-icons/fi';

const UsuarioModal = ({ usuarios, onSelecionarUsuario, onFechar, usuarioLogado }) => {
    const [termoBusca, setTermoBusca] = useState('');

    const usuariosFiltrados = usuarios.filter(usuario =>
        usuario.name?.toLowerCase().includes(termoBusca.toLowerCase()) ||
        usuario.idLogin?.includes(termoBusca)
    );

    return (
        <div className="modal-overlay active" onClick={onFechar}>
            <div className="modal modal-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Selecionar Usuário</h2>
                    <button className="close-modal" onClick={onFechar}>
                        <FiX />
                    </button>
                </div>

                <div className="modal-content">
                    <div className="search-container">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou ID..."
                            value={termoBusca}
                            onChange={(e) => setTermoBusca(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="usuarios-list">
                        {usuariosFiltrados.map(usuario => (
                            <div
                                key={usuario.id}
                                className="usuario-item"
                                onClick={() => onSelecionarUsuario(usuario)}
                            >
                                <div className="usuario-avatar">
                                    {usuario.foto ? (
                                        <img src={`data:image/png;base64,${usuario.foto}`} alt="Avatar" />
                                    ) : (
                                        <FiUser />
                                    )}
                                </div>
                                <div className="usuario-info">
                                    <h4>{usuario.name}</h4>
                                    <p>ID: {usuario.idLogin} | Cargo: {usuario.role}</p>
                                    <small>Posto: {usuario.posto}</small>
                                </div>
                            </div>
                        ))}
                    </div>

                    {usuariosFiltrados.length === 0 && (
                        <div className="empty-state">
                            <p>Nenhum usuário encontrado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UsuarioModal;