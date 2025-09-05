import React, { useMemo } from 'react';
import { Card, Tab, Tabs } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatarMinutosParaHora } from '../../../utils/dateUtils';

const GraficosAnaliticos = ({ dados }) => {
    const dadosGrafico = useMemo(() => {
        return dados.map(usuario => ({
            nome: usuario.usuario,
            horasExtras: usuario.totais.horasExtras / 60,
            atrasos: usuario.totais.atrasos / 60,
            faltas: usuario.totais.faltas
        }));
    }, [dados]);

    return (
        <Card className="mb-4">
            <Card.Header>Análise Gráfica</Card.Header>
            <Card.Body>
                <Tabs defaultActiveKey="horasExtras" className="mb-3">
                    <Tab eventKey="horasExtras" title="Horas Extras">
                        <div style={{ height: '400px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={dadosGrafico}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="nome" angle={-45} textAnchor="end" height={70} />
                                    <YAxis label={{ value: 'Horas', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="horasExtras" name="Horas Extras" fill="#28a745" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Tab>
                    <Tab eventKey="atrasos" title="Atrasos">
                        <div style={{ height: '400px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={dadosGrafico}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="nome" angle={-45} textAnchor="end" height={70} />
                                    <YAxis label={{ value: 'Horas', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="atrasos" name="Atrasos (horas)" fill="#ffc107" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Tab>
                    <Tab eventKey="faltas" title="Faltas">
                        <div style={{ height: '400px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={dadosGrafico}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="nome" angle={-45} textAnchor="end" height={70} />
                                    <YAxis label={{ value: 'Quantidade', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="faltas" name="Faltas" fill="#dc3545" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Tab>
                </Tabs>
            </Card.Body>
        </Card>
    );
};

export default GraficosAnaliticos;