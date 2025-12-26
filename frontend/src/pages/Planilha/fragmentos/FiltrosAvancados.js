// src/pages/fragmentos/FiltrosAvancados.js
import React from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { JORNADAS } from "../../../utils/constants";

const FiltrosAvancados = ({
                              filtros,
                              setFiltros,
                              departamentos,
                              postosDisponiveis = [],
                              usuarioLogado,
                              handleAplicarFiltros,
                              handleLimparFiltros,
                              onMesAtual,
                              onMesAnterior
                          }) => {
    return (
        <Card className="mb-4">
            <Card.Header>Filtros Avançados</Card.Header>
            <Card.Body>
                <Form>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Período Inicial</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={filtros.dataInicio || ""}
                                    onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Período Final</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={filtros.dataFim || ""}
                                    onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label>Departamento</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={filtros.departamento}
                                    onChange={(e) => setFiltros({...filtros, departamento: e.target.value})}
                                >
                                    <option value="">Todos</option>
                                    {departamentos.map((depto, index) => (
                                        <option key={index} value={depto}>{depto}</option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label>Jornada</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={filtros.jornada}
                                    onChange={(e) => setFiltros({...filtros, jornada: e.target.value})}
                                >
                                    <option value="">Todas</option>
                                    {Object.keys(JORNADAS).map((jornada, index) => (
                                        <option key={index} value={jornada}>{jornada}</option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                        </Col>

                        {/* Filtro de posto - só aparece para gestores */}
                        {usuarioLogado?.permissao === '1' && (
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Posto</Form.Label>
                                    <Form.Control
                                        as="select"
                                        value={filtros.posto}
                                        onChange={(e) => setFiltros({...filtros, posto: e.target.value})}
                                    >
                                        <option value="">Todos</option>
                                        {postosDisponiveis.map(posto => (
                                            <option key={posto.value} value={posto.value}>
                                                {posto.label}
                                            </option>
                                        ))}
                                    </Form.Control>
                                </Form.Group>
                            </Col>
                        )}
                    </Row>

                    {/* Botões de período rápido */}
                    <Row className="mt-3">
                        <Col md={12} className="d-flex justify-content-between">
                            <div>
                                <Button variant="outline-primary" size="sm" onClick={onMesAtual} className="me-2">
                                    Mês Atual
                                </Button>
                                <Button variant="outline-secondary" size="sm" onClick={onMesAnterior}>
                                    Mês Anterior
                                </Button>
                            </div>
                            <div>
                                <Button variant="secondary" onClick={handleLimparFiltros} className="me-2">
                                    Limpar Filtros
                                </Button>
                                <Button variant="primary" onClick={handleAplicarFiltros}>
                                    Aplicar Filtros
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default FiltrosAvancados;