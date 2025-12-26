// src/components/financeiro/CampoDinamicoModal.js
import React, { useState } from 'react';
import { FiX, FiPlus, FiMinus, FiPercent } from 'react-icons/fi';

const CampoDinamicoModal = ({ onSalvar, onCancelar }) => {
    const [dadosCampo, setDadosCampo] = useState({
        nome: '',
        tipo: 'adicao',
        valorPadrao: '',
        descricao: '',
        aplicacao: 'todos' // todos, especifico
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!dadosCampo.nome) {
            alert('O nome do campo é obrigatório');
            return;
        }

        onSalvar({
            ...dadosCampo,
            valorPadrao: parseFloat(dadosCampo.valorPadrao) || 0
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDadosCampo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="modal-overlay active" onClick={onCancelar}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <FiPlus />
                        Adicionar Campo Dinâmico
                    </h2>
                    <button className="close-modal" onClick={onCancelar}>
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-content">
                    <div className="form-group">
                        <label>Nome do Campo *</label>
                        <input
                            type="text"
                            name="nome"
                            value={dadosCampo.nome}
                            onChange={handleChange}
                            placeholder="Ex: Horas Extras, Vale Alimentação, etc."
                            required
                        />
                        <small>Este nome aparecerá na folha de pagamento</small>
                    </div>

                    <div className="form-group">
                        <label>Tipo de Campo *</label>
                        <select name="tipo" value={dadosCampo.tipo} onChange={handleChange} required>
                            <option value="adicao">
                                <FiPlus /> Adição (Soma ao salário)
                            </option>
                            <option value="desconto">
                                <FiMinus /> Desconto (Subtrai do salário)
                            </option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Valor Padrão (R$)</label>
                        <input
                            type="number"
                            name="valorPadrao"
                            value={dadosCampo.valorPadrao}
                            onChange={handleChange}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                        />
                        <small>Valor que será preenchido automaticamente</small>
                    </div>

                    <div className="form-group">
                        <label>Descrição</label>
                        <textarea
                            name="descricao"
                            value={dadosCampo.descricao}
                            onChange={handleChange}
                            placeholder="Descrição detalhada deste campo..."
                            rows="3"
                        />
                    </div>

                    <div className="form-group">
                        <label>Aplicação</label>
                        <select name="aplicacao" value={dadosCampo.aplicacao} onChange={handleChange}>
                            <option value="todos">Todos os funcionários</option>
                            <option value="especifico">Apenas funcionários específicos</option>
                        </select>
                    </div>

                    <div className="info-box">
                        <FiPercent />
                        <div>
                            <strong>Como funciona:</strong>
                            <br />
                            <small>• Campos de adição aumentam o salário líquido</small>
                            <br />
                            <small>• Campos de desconto diminuem o salário líquido</small>
                            <br />
                            <small>• Os valores podem ser ajustados individualmente por funcionário</small>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="btn btn-primary">
                            <FiPlus /> Criar Campo
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onCancelar}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CampoDinamicoModal;