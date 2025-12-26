// src/components/financeiro/GestaoFerias.js
import React, { useState, useEffect } from 'react';
import { FiX, FiCalendar, FiUser, FiClock, FiCheckCircle, FiEdit2 } from 'react-icons/fi';

const GestaoFerias = ({ usuario, usuarios, onFechar, usuarioLogado }) => {
    const [ferias, setFerias] = useState([]);
    const [novaFerias, setNovaFerias] = useState({
        dataInicio: '',
        dataFim: '',
        periodoAquisitivo: '',
        observacoes: ''
    });
    const [usuarioSelecionado, setUsuarioSelecionado] = useState(usuario);

    useEffect(() => {
        if (usuarioSelecionado) {
            carregarFeriasUsuario(usuarioSelecionado.id);
        }
    }, [usuarioSelecionado]);

    const carregarFeriasUsuario = async (usuarioId) => {
        // Simulação - implementar busca no Firestore
        const feriasMock = [
            {
                id: 1,
                dataInicio: '2024-01-01',
                dataFim: '2024-01-30',
                periodoAquisitivo: '2023',
                status: 'gozadas',
                dias: 30
            }
        ];
        setFerias(feriasMock);
    };

    const calcularFeriasDevidas = (dataAdmissao) => {
        if (!dataAdmissao) return { diasDevidos: 0, periodoAquisitivo: '' };

        const admissao = new Date(dataAdmissao);
        const hoje = new Date();
        const diffMeses = (hoje.getFullYear() - admissao.getFullYear()) * 12 +
            (hoje.getMonth() - admissao.getMonth());

        const periodosCompletos = Math.floor(diffMeses / 12);
        const diasPorPeriodo = 30;
        const diasDevidos = periodosCompletos * diasPorPeriodo;

        return {
            diasDevidos,
            periodoAquisitivo: `${admissao.getFullYear()}-${admissao.getFullYear() + 1}`,
            proximoPeriodo: `${admissao.getFullYear() + periodosCompletos + 1}-${admissao.getFullYear() + periodosCompletos + 2}`
        };
    };

    const programarFerias = () => {
        if (!usuarioSelecionado) {
            alert('Selecione um funcionário');
            return;
        }

        if (!novaFerias.dataInicio || !novaFerias.dataFim) {
            alert('Preencha as datas de início e fim');
            return;
        }

        const novasFerias = {
            ...novaFerias,
            id: Date.now(),
            usuarioId: usuarioSelecionado.id,
            usuarioNome: usuarioSelecionado.name,
            status: 'programadas',
            criadoPor: usuarioLogado.name,
            criadoEm: new Date()
        };

        setFerias(prev => [...prev, novasFerias]);
        setNovaFerias({
            dataInicio: '',
            dataFim: '',
            periodoAquisitivo: '',
            observacoes: ''
        });
        alert('Férias programadas com sucesso!');
    };

    const feriasDevidas = usuarioSelecionado ?
        calcularFeriasDevidas(usuarioSelecionado.dataAdmissao) :
        { diasDevidos: 0, periodoAquisitivo: '' };

    return (
        <div className="modal-overlay active" onClick={onFechar}>
            <div className="modal modal-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <FiCalendar />
                        Gestão de Férias
                    </h2>
                    <button className="close-modal" onClick={onFechar}>
                        <FiX />
                    </button>
                </div>

                <div className="modal-content">
                    <div className="selecao-usuario">
                        <div className="form-group">
                            <label>Selecionar Funcionário</label>
                            <select
                                value={usuarioSelecionado?.id || ''}
                                onChange={(e) => {
                                    const usuario = usuarios.find(u => u.id === e.target.value);
                                    setUsuarioSelecionado(usuario);
                                }}
                            >
                                <option value="">Selecione um funcionário</option>
                                {usuarios.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} - {user.dataAdmissao ? `Admitido em ${user.dataAdmissao}` : 'Data não informada'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {usuarioSelecionado && (
                        <>
                            <div className="info-ferias">
                                <div className="info-card">
                                    <FiUser />
                                    <div>
                                        <strong>{usuarioSelecionado.name}</strong>
                                        <br />
                                        <small>Admissão: {usuarioSelecionado.dataAdmissao || 'Não informada'}</small>
                                    </div>
                                </div>
                                <div className="info-card">
                                    <FiClock />
                                    <div>
                                        <strong>{feriasDevidas.diasDevidos} dias</strong>
                                        <br />
                                        <small>Férias devidas</small>
                                    </div>
                                </div>
                                <div className="info-card">
                                    <FiCalendar />
                                    <div>
                                        <strong>{feriasDevidas.periodoAquisitivo}</strong>
                                        <br />
                                        <small>Período aquisitivo</small>
                                    </div>
                                </div>
                            </div>

                            <div className="programar-ferias">
                                <h3>Programar Novas Férias</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Data Início</label>
                                        <input
                                            type="date"
                                            value={novaFerias.dataInicio}
                                            onChange={(e) => setNovaFerias(prev => ({
                                                ...prev,
                                                dataInicio: e.target.value
                                            }))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Data Fim</label>
                                        <input
                                            type="date"
                                            value={novaFerias.dataFim}
                                            onChange={(e) => setNovaFerias(prev => ({
                                                ...prev,
                                                dataFim: e.target.value
                                            }))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Período Aquisitivo</label>
                                        <input
                                            type="text"
                                            value={novaFerias.periodoAquisitivo}
                                            onChange={(e) => setNovaFerias(prev => ({
                                                ...prev,
                                                periodoAquisitivo: e.target.value
                                            }))}
                                            placeholder="Ex: 2023-2024"
                                        />
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Observações</label>
                                        <textarea
                                            value={novaFerias.observacoes}
                                            onChange={(e) => setNovaFerias(prev => ({
                                                ...prev,
                                                observacoes: e.target.value
                                            }))}
                                            rows="2"
                                        />
                                    </div>
                                </div>
                                <button className="btn btn-primary" onClick={programarFerias}>
                                    <FiCheckCircle /> Programar Férias
                                </button>
                            </div>

                            <div className="historico-ferias">
                                <h3>Histórico de Férias</h3>
                                {ferias.length > 0 ? (
                                    <div className="ferias-list">
                                        {ferias.map(feria => (
                                            <div key={feria.id} className="feria-item">
                                                <div className="feria-info">
                                                    <strong>{feria.dataInicio} a {feria.dataFim}</strong>
                                                    <br />
                                                    <small>Período: {feria.periodoAquisitivo} | {feria.dias} dias</small>
                                                    <br />
                                                    <span className={`status ${feria.status}`}>
                                                        {feria.status}
                                                    </span>
                                                </div>
                                                <div className="feria-actions">
                                                    <button className="btn-icon">
                                                        <FiEdit2 />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p>Nenhum registro de férias encontrado.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GestaoFerias;