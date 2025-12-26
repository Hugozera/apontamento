// src/components/financeiro/DashboardFinanceiro.js
import React from 'react';
import { FiUsers, FiDollarSign, FiTrendingUp, FiFileText } from 'react-icons/fi';

const DashboardFinanceiro = ({ usuarios, remuneracoes, folhasGeradas, mes, ano, posto }) => {
    // Cálculos para os cards
    const totalFuncionarios = usuarios.length;
    const totalRemuneracoesAtivas = remuneracoes.filter(r => r.ativo).length;
    const folhasMes = folhasGeradas.filter(f => f.mes === mes && f.ano === ano);
    const totalFolhaMes = folhasMes.reduce((sum, folha) => sum + (folha.totalLiquido || 0), 0);

    const cards = [
        {
            titulo: 'Total Funcionários',
            valor: totalFuncionarios,
            icone: FiUsers,
            cor: 'var(--primary-color)'
        },
        {
            titulo: 'Remunerações Ativas',
            valor: totalRemuneracoesAtivas,
            icone: FiFileText,
            cor: 'var(--secondary-color)'
        },
        {
            titulo: 'Folha do Mês',
            valor: `R$ ${totalFolhaMes.toFixed(2)}`,
            icone: FiDollarSign,
            cor: 'var(--success-color)'
        },
        {
            titulo: 'Crescimento',
            valor: '+12.5%',
            icone: FiTrendingUp,
            cor: 'var(--info-color)'
        }
    ];

    return (
        <div className="dashboard-financeiro">
            <div className="dashboard-cards">
                {cards.map((card, index) => (
                    <div key={index} className="dashboard-card">
                        <div className="card-icon" style={{ backgroundColor: card.cor }}>
                            <card.icone />
                        </div>
                        <div className="card-content">
                            <h3>{card.valor}</h3>
                            <p>{card.titulo}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-item">
                    <h3>Top 5 por Custo</h3>
                    <div className="top-funcionarios">
                        {usuarios.slice(0, 5).map((usuario, index) => (
                            <div key={usuario.id} className="funcionario-item">
                                <span className="posicao">{index + 1}</span>
                                <span className="nome">{usuario.name}</span>
                                <span className="valor">R$ 2.500,00</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dashboard-item">
                    <h3>Folhas Recentes</h3>
                    <div className="folhas-recentes">
                        {folhasGeradas.slice(0, 5).map(folha => (
                            <div key={folha.id} className="folha-item">
                                <span className="periodo">{folha.mes}/{folha.ano}</span>
                                <span className="valor">R$ {(folha.totalLiquido || 0).toFixed(2)}</span>
                                <span className="status">{folha.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardFinanceiro;