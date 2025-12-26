// src/components/financeiro/RemuneracaoCompletaModal.js
import React, { useState, useEffect } from 'react';
import {
    FiX, FiDollarSign, FiInfo, FiTrendingUp,
    FiPlus, FiMinus, FiTrash2, FiHelpCircle,
    FiDivide, FiPercent, FiArrowUp, FiArrowDown, FiUser
} from 'react-icons/fi';

const RemuneracaoCompletaModal = ({
                                      usuario,
                                      remuneracao,
                                      modoEdicao,
                                      onSalvar,
                                      onCancelar,
                                      camposDinamicos
                                  }) => {
    const [dados, setDados] = useState({
        salarioBase: '',
        camposDinamicos: []
    });

    const [calculos, setCalculos] = useState({
        totalAdicoes: 0,
        totalDescontos: 0,
        totalProventos: 0,
        salarioLiquido: 0
    });

    const [novoCampo, setNovoCampo] = useState({
        nome: '',
        tipo: 'adicao',
        operacao: 'soma',
        valor: ''
    });

    useEffect(() => {
        if (modoEdicao && remuneracao) {
            const dadosAtualizados = {
                salarioBase: remuneracao.salarioBase || '',
                camposDinamicos: remuneracao.camposDinamicos || []
            };
            setDados(dadosAtualizados);
            calcularTodos(dadosAtualizados);
        } else {
            setDados({
                salarioBase: '',
                camposDinamicos: []
            });
        }
    }, [modoEdicao, remuneracao]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const novosDados = {
            ...dados,
            [name]: value
        };
        setDados(novosDados);
        calcularTodos(novosDados);
    };

    const handleCampoDinamicoChange = (campoId, field, value) => {
        const novosCampos = dados.camposDinamicos.map(campo =>
            campo.id === campoId ? { ...campo, [field]: value } : campo
        );

        const novosDados = {
            ...dados,
            camposDinamicos: novosCampos
        };

        setDados(novosDados);
        calcularTodos(novosDados);
    };

    const handleNovoCampoChange = (field, value) => {
        setNovoCampo(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const adicionarCampo = () => {
        if (!novoCampo.nome.trim()) {
            alert('Digite um nome para o campo');
            return;
        }

        if (!novoCampo.valor) {
            alert('Digite um valor para o campo');
            return;
        }

        const campo = {
            id: Date.now().toString(),
            nome: novoCampo.nome.trim(),
            tipo: novoCampo.tipo,
            operacao: novoCampo.operacao,
            valor: parseFloat(novoCampo.valor) || 0
        };

        const novosDados = {
            ...dados,
            camposDinamicos: [...dados.camposDinamicos, campo]
        };

        setDados(novosDados);
        calcularTodos(novosDados);

        // Resetar novo campo
        setNovoCampo({
            nome: '',
            tipo: 'adicao',
            operacao: 'soma',
            valor: ''
        });
    };

    const removerCampo = (campoId) => {
        if (!window.confirm('Tem certeza que deseja remover este campo?')) return;

        const novosCampos = dados.camposDinamicos.filter(campo => campo.id !== campoId);
        const novosDados = {
            ...dados,
            camposDinamicos: novosCampos
        };

        setDados(novosDados);
        calcularTodos(novosDados);
    };

    const calcularValorCampo = (campo, salarioBase) => {
        const valor = parseFloat(campo.valor) || 0;
        const salario = parseFloat(salarioBase) || 0;

        switch (campo.operacao) {
            case 'soma':
                return valor;
            case 'multiplicacao':
                return salario * valor;
            case 'divisao':
                return valor !== 0 ? salario / valor : 0;
            case 'subtracao':
                return valor; // Subtração é um valor fixo que será subtraído
            default:
                return valor;
        }
    };

    const calcularTodos = (dadosCalc) => {
        const salarioBase = parseFloat(dadosCalc.salarioBase) || 0;

        let totalAdicoes = 0;
        let totalDescontos = 0;

        dadosCalc.camposDinamicos.forEach(campo => {
            const valorCalculado = calcularValorCampo(campo, salarioBase);

            if (campo.tipo === 'adicao') {
                // Para adições: soma, multiplicação e divisão aumentam o valor
                if (campo.operacao === 'soma' || campo.operacao === 'multiplicacao' || campo.operacao === 'divisao') {
                    totalAdicoes += valorCalculado;
                }
            } else if (campo.tipo === 'desconto') {
                // Para descontos: soma, multiplicação, divisão e subtração diminuem o valor
                totalDescontos += valorCalculado;
            }
        });

        const totalProventos = salarioBase + totalAdicoes;
        const salarioLiquido = totalProventos - totalDescontos;

        setCalculos({
            totalAdicoes,
            totalDescontos,
            totalProventos,
            salarioLiquido
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!dados.salarioBase) {
            alert('O salário base é obrigatório');
            return;
        }

        const dadosEnvio = {
            ...dados,
            salarioBase: parseFloat(dados.salarioBase),
            camposDinamicos: dados.camposDinamicos.map(campo => ({
                ...campo,
                valor: parseFloat(campo.valor) || 0
            }))
        };

        onSalvar(dadosEnvio);
    };

    const getPlaceholderOperacao = (operacao) => {
        switch (operacao) {
            case 'soma': return '0.00';
            case 'multiplicacao': return '0.10';
            case 'divisao': return '2.00';
            case 'subtracao': return '0.00';
            default: return '0.00';
        }
    };

    const getTooltipOperacao = (operacao) => {
        switch (operacao) {
            case 'soma': return 'Valor fixo em R$ que será somado';
            case 'multiplicacao': return 'Multiplica o salário por este valor (ex: 0.10 = 10%)';
            case 'divisao': return 'Divide o salário por este valor (ex: 2 = salário ÷ 2)';
            case 'subtracao': return 'Valor fixo em R$ que será subtraído';
            default: return '';
        }
    };

    const getExemploOperacao = (operacao, salarioBase) => {
        const salario = parseFloat(salarioBase) || 1518;
        const valor = operacao === 'multiplicacao' ? 0.10 : operacao === 'divisao' ? 2 : 100;

        switch (operacao) {
            case 'soma': return `Ex: R$ ${valor} = R$ ${salario} + R$ ${valor}`;
            case 'multiplicacao': return `Ex: ${valor} = R$ ${salario} × ${valor} = R$ ${(salario * valor).toFixed(2)}`;
            case 'divisao': return `Ex: ${valor} = R$ ${salario} ÷ ${valor} = R$ ${(salario / valor).toFixed(2)}`;
            case 'subtracao': return `Ex: R$ ${valor} = R$ ${salario} - R$ ${valor}`;
            default: return '';
        }
    };

    const getIconeOperacao = (operacao) => {
        switch (operacao) {
            case 'soma': return <FiPlus />;
            case 'multiplicacao': return <FiPercent />;
            case 'divisao': return <FiDivide />;
            case 'subtracao': return <FiMinus />;
            default: return <FiPlus />;
        }
    };

    const getLabelOperacao = (operacao) => {
        switch (operacao) {
            case 'soma': return 'Soma Fixa';
            case 'multiplicacao': return 'Multiplicação';
            case 'divisao': return 'Divisão';
            case 'subtracao': return 'Subtração';
            default: return 'Soma Fixa';
        }
    };

    const getInputLabel = (operacao) => {
        switch (operacao) {
            case 'soma': return 'Valor (R$)';
            case 'multiplicacao': return 'Porcentagem';
            case 'divisao': return 'Divisor';
            case 'subtracao': return 'Valor (R$)';
            default: return 'Valor';
        }
    };

    return (
        <div className="modal-overlay active" onClick={onCancelar}>
            <div className="modal modal-extra-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <FiDollarSign />
                        {modoEdicao ? 'Editar' : 'Cadastrar'} Remuneração - {usuario.name}
                    </h2>
                    <button className="close-modal" onClick={onCancelar}>
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-content">
                    <div className="usuario-selecionado">
                        <div className="usuario-info-card">
                            <FiUser />
                            <div>
                                <strong>{usuario.name}</strong>
                                <p>{usuario.role} | Posto: {usuario.posto}</p>
                            </div>
                        </div>
                    </div>

                    <div className="form-grid-duas-colunas">
                        {/* Coluna 1: Dados de Entrada */}
                        <div className="coluna-entrada">
                            {/* Salário Base */}
                            <div className="card-section">
                                <h3>
                                    <FiDollarSign />
                                    Salário Base
                                </h3>
                                <div className="form-group">
                                    <label>Valor do Salário Base (R$) *</label>
                                    <input
                                        type="number"
                                        name="salarioBase"
                                        value={dados.salarioBase}
                                        onChange={handleChange}
                                        placeholder="1518.00"
                                        step="0.01"
                                        min="0"
                                        required
                                    />
                                    <small>Salário mínimo ou base para todos os cálculos</small>
                                </div>
                            </div>

                            {/* Adicionar Novo Campo */}
                            <div className="card-section">
                                <h3>
                                    <FiPlus />
                                    Adicionar Campo Personalizado
                                </h3>

                                <div className="tipo-campo-selecao">
                                    <div className="tipo-option">
                                        <input
                                            type="radio"
                                            id="tipo-adicao"
                                            name="tipo"
                                            value="adicao"
                                            checked={novoCampo.tipo === 'adicao'}
                                            onChange={(e) => handleNovoCampoChange('tipo', e.target.value)}
                                        />
                                        <label htmlFor="tipo-adicao" className="tipo-card adicao">
                                            <FiArrowUp className="icon" />
                                            <div className="tipo-content">
                                                <strong>Adição</strong>
                                                <span>Aumenta o salário</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="tipo-option">
                                        <input
                                            type="radio"
                                            id="tipo-desconto"
                                            name="tipo"
                                            value="desconto"
                                            checked={novoCampo.tipo === 'desconto'}
                                            onChange={(e) => handleNovoCampoChange('tipo', e.target.value)}
                                        />
                                        <label htmlFor="tipo-desconto" className="tipo-card desconto">
                                            <FiArrowDown className="icon" />
                                            <div className="tipo-content">
                                                <strong>Desconto</strong>
                                                <span>Diminui o salário</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="form-grid-tres-colunas">
                                    <div className="form-group">
                                        <label>Nome do Campo *</label>
                                        <input
                                            type="text"
                                            value={novoCampo.nome}
                                            onChange={(e) => handleNovoCampoChange('nome', e.target.value)}
                                            placeholder="Ex: Horas Extras, Vale Alimentação..."
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Tipo de Cálculo</label>
                                        <select
                                            value={novoCampo.operacao}
                                            onChange={(e) => handleNovoCampoChange('operacao', e.target.value)}
                                            className={`select-${novoCampo.operacao}`}
                                        >
                                            <option value="soma">Soma Fixa</option>
                                            <option value="multiplicacao">Multiplicação</option>
                                            <option value="divisao">Divisão</option>
                                            <option value="subtracao">Subtração</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            {getInputLabel(novoCampo.operacao)} *
                                            <div className="info-tooltip">
                                                <FiHelpCircle />
                                                <div className="tooltip-content">
                                                    {getTooltipOperacao(novoCampo.operacao)}
                                                    <br />
                                                    {getExemploOperacao(novoCampo.operacao, dados.salarioBase)}
                                                </div>
                                            </div>
                                        </label>
                                        <div className="input-with-icon">
                                            {getIconeOperacao(novoCampo.operacao)}
                                            <input
                                                type="number"
                                                value={novoCampo.valor}
                                                onChange={(e) => handleNovoCampoChange('valor', e.target.value)}
                                                placeholder={getPlaceholderOperacao(novoCampo.operacao)}
                                                step={novoCampo.operacao === 'soma' || novoCampo.operacao === 'subtracao' ? "0.01" : "0.01"}
                                                min="0"
                                            />
                                        </div>
                                        <small className="exemplo">
                                            {getExemploOperacao(novoCampo.operacao, dados.salarioBase)}
                                        </small>
                                    </div>

                                    <div className="form-group full-width">
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={adicionarCampo}
                                            disabled={!novoCampo.nome.trim() || !novoCampo.valor}
                                        >
                                            <FiPlus /> Adicionar Campo à Remuneração
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Campos Adicionados */}
                            <div className="card-section">
                                <h3>
                                    Campos Adicionados
                                    <span className="badge-count">{dados.camposDinamicos.length}</span>
                                </h3>

                                {dados.camposDinamicos.length === 0 ? (
                                    <div className="empty-state">
                                        <FiInfo size={32} />
                                        <p>Nenhum campo adicionado ainda</p>
                                        <small>Adicione campos personalizados acima para compor a remuneração</small>
                                    </div>
                                ) : (
                                    <div className="campos-lista">
                                        {dados.camposDinamicos.map(campo => {
                                            const salarioBase = parseFloat(dados.salarioBase) || 0;
                                            const valorCalculado = calcularValorCampo(campo, salarioBase);

                                            return (
                                                <div key={campo.id} className={`campo-item ${campo.tipo}`}>
                                                    <div className="campo-header">
                                                        <div className="campo-tipo-icon">
                                                            {campo.tipo === 'adicao' ?
                                                                <FiArrowUp className="icon-adicao" /> :
                                                                <FiArrowDown className="icon-desconto" />
                                                            }
                                                        </div>
                                                        <div className="campo-info">
                                                            <strong>{campo.nome}</strong>
                                                            <div className="campo-detalhes">
                                                                <span className={`badge operacao-${campo.operacao}`}>
                                                                    {getIconeOperacao(campo.operacao)}
                                                                    {getLabelOperacao(campo.operacao)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn-icon delete"
                                                            onClick={() => removerCampo(campo.id)}
                                                            title="Remover campo"
                                                        >
                                                            <FiTrash2 />
                                                        </button>
                                                    </div>

                                                    <div className="campo-inputs">
                                                        <div className="form-group">
                                                            <label>
                                                                {getInputLabel(campo.operacao)}
                                                            </label>
                                                            <div className="input-with-icon">
                                                                {getIconeOperacao(campo.operacao)}
                                                                <input
                                                                    type="number"
                                                                    value={campo.valor || ''}
                                                                    onChange={(e) => handleCampoDinamicoChange(campo.id, 'valor', e.target.value)}
                                                                    placeholder={getPlaceholderOperacao(campo.operacao)}
                                                                    step={campo.operacao === 'soma' || campo.operacao === 'subtracao' ? "0.01" : "0.01"}
                                                                    min="0"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className={`campo-resultado ${campo.tipo}`}>
                                                            <div className="resultado-label">
                                                                Valor {campo.tipo === 'adicao' ? 'adicionado' : 'descontado'}:
                                                            </div>
                                                            <div className={`resultado-valor ${campo.tipo}`}>
                                                                {campo.tipo === 'adicao' ? '+' : '-'} R$ {valorCalculado.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Coluna 2: Cálculos Automáticos */}
                        <div className="coluna-calculos">
                            <div className="calculos-card">
                                <h3>
                                    <FiTrendingUp />
                                    Resumo da Remuneração
                                </h3>

                                <div className="calculos-container">
                                    {/* Salário Base */}
                                    <div className="calculo-item base">
                                        <label>Salário Base:</label>
                                        <span>R$ {(parseFloat(dados.salarioBase) || 0).toFixed(2)}</span>
                                    </div>

                                    {/* Adições */}
                                    {dados.camposDinamicos.filter(c => c.tipo === 'adicao').length > 0 && (
                                        <>
                                            <div className="calculo-separador"></div>
                                            <div className="calculo-categoria">
                                                <FiArrowUp className="icon-adicao" />
                                                <span>Adições</span>
                                            </div>
                                            {dados.camposDinamicos.filter(c => c.tipo === 'adicao').map(campo => {
                                                const valorCalculado = calcularValorCampo(campo, dados.salarioBase);
                                                return (
                                                    <div key={campo.id} className="calculo-item detalhe adicao">
                                                        <label>{campo.nome}:</label>
                                                        <span className="valor-positivo">+ R$ {valorCalculado.toFixed(2)}</span>
                                                    </div>
                                                );
                                            })}
                                            <div className="calculo-item subtotal adicao">
                                                <label>Total de Adições:</label>
                                                <span className="valor-positivo">+ R$ {calculos.totalAdicoes.toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Descontos */}
                                    {dados.camposDinamicos.filter(c => c.tipo === 'desconto').length > 0 && (
                                        <>
                                            <div className="calculo-separador"></div>
                                            <div className="calculo-categoria">
                                                <FiArrowDown className="icon-desconto" />
                                                <span>Descontos</span>
                                            </div>
                                            {dados.camposDinamicos.filter(c => c.tipo === 'desconto').map(campo => {
                                                const valorCalculado = calcularValorCampo(campo, dados.salarioBase);
                                                return (
                                                    <div key={campo.id} className="calculo-item detalhe desconto">
                                                        <label>{campo.nome}:</label>
                                                        <span className="valor-negativo">- R$ {valorCalculado.toFixed(2)}</span>
                                                    </div>
                                                );
                                            })}
                                            <div className="calculo-item subtotal desconto">
                                                <label>Total de Descontos:</label>
                                                <span className="valor-negativo">- R$ {calculos.totalDescontos.toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Resultado Final */}
                                    <div className="calculo-separador grossa"></div>
                                    <div className="calculo-item final">
                                        <label>Salário Líquido:</label>
                                        <span className="salario-liquido">R$ {calculos.salarioLiquido.toFixed(2)}</span>
                                    </div>

                                    <div className="info-box">
                                        <FiInfo />
                                        <div>
                                            <strong>Como funciona:</strong>
                                            <br />
                                            <small>• <strong>Soma Fixa:</strong> Adiciona valor específico</small>
                                            <br />
                                            <small>• <strong>Subtração:</strong> Subtrai valor específico</small>
                                            <br />
                                            <small>• <strong>Multiplicação:</strong> Calcula % do salário base</small>
                                            <br />
                                            <small>• <strong>Divisão:</strong> Divide salário base</small>
                                            <br />
                                            <small>• Adicione quantos campos precisar!</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="btn btn-primary btn-large">
                            {modoEdicao ? 'Atualizar' : 'Cadastrar'} Remuneração
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

export default RemuneracaoCompletaModal;