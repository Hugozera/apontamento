// src/components/financeiro/CalculadoraImpostosModal.js
import React, { useState } from 'react';
import { FiX, FiDollarSign, FiCalendar, FiPieChart } from 'react-icons/fi';

const CalculadoraImpostosModal = ({ onFechar }) => {
    const [salario, setSalario] = useState('');
    const [resultados, setResultados] = useState(null);

    const calcularImpostos = (salarioBase) => {
        const salarioNum = parseFloat(salarioBase);

        // INSS 2024
        let inss = 0;
        if (salarioNum <= 1412.00) {
            inss = salarioNum * 0.075;
        } else if (salarioNum <= 2666.68) {
            inss = (salarioNum * 0.09) - 21.18;
        } else if (salarioNum <= 4000.03) {
            inss = (salarioNum * 0.12) - 101.18;
        } else if (salarioNum <= 7786.02) {
            inss = (salarioNum * 0.14) - 181.18;
        } else {
            inss = 908.85; // Teto
        }

        // IRRF 2024
        const baseIRRF = salarioNum - inss;
        let irrf = 0;
        if (baseIRRF <= 2259.20) {
            irrf = 0;
        } else if (baseIRRF <= 2826.65) {
            irrf = (baseIRRF * 0.075) - 169.44;
        } else if (baseIRRF <= 3751.05) {
            irrf = (baseIRRF * 0.15) - 381.44;
        } else if (baseIRRF <= 4664.68) {
            irrf = (baseIRRF * 0.225) - 662.77;
        } else {
            irrf = (baseIRRF * 0.275) - 896.00;
        }

        // FGTS
        const fgts = salarioNum * 0.08;

        // Férias (1/3 do salário)
        const ferias = salarioNum / 3;

        // Décimo Terceiro
        const decimoTerceiro = salarioNum;

        // Totais anuais
        const salarioAnual = salarioNum * 13; // 12 meses + 13º
        const custoTotalAnual = salarioAnual + ferias + (fgts * 12);

        return {
            inss: Math.max(0, inss),
            irrf: Math.max(0, irrf),
            fgts,
            ferias,
            decimoTerceiro,
            salarioLiquidoMensal: salarioNum - inss - irrf,
            custoTotalMensal: salarioNum + fgts,
            custoTotalAnual,
            salarioAnual
        };
    };

    const handleCalcular = () => {
        if (!salario) {
            alert('Informe o salário base');
            return;
        }

        const calculos = calcularImpostos(salario);
        setResultados(calculos);
    };

    return (
        <div className="modal-overlay active" onClick={onFechar}>
            <div className="modal modal-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <FiPieChart />
                        Calculadora Completa de Impostos e Encargos
                    </h2>
                    <button className="close-modal" onClick={onFechar}>
                        <FiX />
                    </button>
                </div>

                <div className="modal-content">
                    <div className="calculadora-input">
                        <div className="form-group">
                            <label>Salário Base (R$)</label>
                            <input
                                type="number"
                                value={salario}
                                onChange={(e) => setSalario(e.target.value)}
                                placeholder="1518.00"
                                step="0.01"
                                min="0"
                            />
                        </div>
                        <button className="btn btn-primary" onClick={handleCalcular}>
                            <FiDollarSign /> Calcular
                        </button>
                    </div>

                    {resultados && (
                        <div className="resultados-calculadora">
                            <div className="resultados-grid">
                                <div className="resultado-categoria">
                                    <h3>Impostos Mensais</h3>
                                    <div className="resultado-item">
                                        <span>INSS:</span>
                                        <span className="valor-negativo">R$ {resultados.inss.toFixed(2)}</span>
                                    </div>
                                    <div className="resultado-item">
                                        <span>IRRF:</span>
                                        <span className="valor-negativo">R$ {resultados.irrf.toFixed(2)}</span>
                                    </div>
                                    <div className="resultado-item">
                                        <span>Salário Líquido:</span>
                                        <span className="valor-positivo">R$ {resultados.salarioLiquidoMensal.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="resultado-categoria">
                                    <h3>Encargos Trabalhistas</h3>
                                    <div className="resultado-item">
                                        <span>FGTS (8%):</span>
                                        <span className="valor-negativo">R$ {resultados.fgts.toFixed(2)}</span>
                                    </div>
                                    <div className="resultado-item">
                                        <span>Férias (1/3):</span>
                                        <span className="valor-negativo">R$ {resultados.ferias.toFixed(2)}</span>
                                    </div>
                                    <div className="resultado-item">
                                        <span>13º Salário:</span>
                                        <span className="valor-negativo">R$ {resultados.decimoTerceiro.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="resultado-categoria">
                                    <h3>Visão Anual</h3>
                                    <div className="resultado-item">
                                        <span>Salário Bruto Anual:</span>
                                        <span>R$ {resultados.salarioAnual.toFixed(2)}</span>
                                    </div>
                                    <div className="resultado-item">
                                        <span>Custo Total Anual:</span>
                                        <span className="valor-negativo">R$ {resultados.custoTotalAnual.toFixed(2)}</span>
                                    </div>
                                    <div className="resultado-item">
                                        <span>Custo Mensal Empresa:</span>
                                        <span className="valor-negativo">R$ {resultados.custoTotalMensal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="resumo-final">
                                <h3>Resumo do Custo</h3>
                                <div className="resumo-item">
                                    <span>Para o funcionário receber:</span>
                                    <strong>R$ {resultados.salarioLiquidoMensal.toFixed(2)}</strong>
                                </div>
                                <div className="resumo-item">
                                    <span>O custo mensal para a empresa é:</span>
                                    <strong className="custo-total">R$ {resultados.custoTotalMensal.toFixed(2)}</strong>
                                </div>
                                <div className="resumo-item">
                                    <span>Custo anual total:</span>
                                    <strong className="custo-total">R$ {resultados.custoTotalAnual.toFixed(2)}</strong>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalculadoraImpostosModal;