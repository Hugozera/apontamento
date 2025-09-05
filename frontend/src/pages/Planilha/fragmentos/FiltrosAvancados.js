// FiltrosAvancados.js
import React, { useEffect } from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { JORNADAS } from "../../../utils/constants";

const FiltrosAvancados = ({ filtros, setFiltros, departamentos, handleAplicarFiltros, handleLimparFiltros }) => {

    // Sempre ao carregar, seta o mês atual como padrão
    useEffect(() => {
        const hoje = new Date();
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

        const formatarData = (d) => {
            const ano = d.getFullYear();
            const mes = String(d.getMonth() + 1).padStart(2, "0");
            const dia = String(d.getDate()).padStart(2, "0");
            return `${ano}-${mes}-${dia}`;
        };

        setFiltros({
            ...filtros,
            dataInicio: formatarData(primeiroDia),
            dataFim: formatarData(ultimoDia),
        });
        // Aplica filtro automaticamente ao iniciar
        handleAplicarFiltros();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                        <Col md={3}>
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
                        <Col md={3}>
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
                    </Row>
                    <Row className="mt-3">
                        <Col md={12} className="d-flex justify-content-end">
                            <Button variant="secondary" onClick={handleLimparFiltros} className="me-2">
                                Limpar Filtros
                            </Button>
                            <Button variant="primary" onClick={handleAplicarFiltros}>
                                Aplicar Filtros
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default FiltrosAvancados;
