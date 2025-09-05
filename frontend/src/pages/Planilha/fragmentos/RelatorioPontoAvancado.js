import { useState } from "react";
import { Row, Col, Button, Form, Modal } from "react-bootstrap";
import Layout from "../components/Layout";
import FiltrosAvancados from "../FiltrosAvancados";
import RelatorioUsuario from "../RelatorioUsuario";
import { useRelatorioPontos } from "../../../hooks/useRelatorioPontos";
import GraficosAnaliticos from "../components/GraficosAnaliticos";
import Paginacao from "../components/Paginacao";
import RelatorioImpressao from "../components/RelatorioImpressao";

export default function RelatorioPontoAvancado({ empresa, usuarios, filtros, setFiltros, departamentos }) {
    const { dadosAgrupados, totaisPorUsuario, carregando, exportarExcel } =
        useRelatorioPontos(filtros, usuarios);

    const [paginaAtual, setPaginaAtual] = useState(1);
    const [showImpressao, setShowImpressao] = useState(false);
    const itensPorPagina = 5;

    const usuariosUnicos = [...new Set(dadosAgrupados.map((item) => item.usuario))];
    const totalPaginas = Math.ceil(usuariosUnicos.length / itensPorPagina);
    const usuariosPaginados = usuariosUnicos.slice(
        (paginaAtual - 1) * itensPorPagina,
        paginaAtual * itensPorPagina
    );

    const dadosPorUsuario = usuariosPaginados.map((usuario) => ({
        usuario,
        registros: dadosAgrupados
            .filter((item) => item.usuario === usuario)
            .sort((a, b) => new Date(a.data) - new Date(b.data)),
        totais: totaisPorUsuario[usuario] || {},
    }));

    return (
        <Layout titulo="Relatório de Ponto Avançado">
            <div className="relatorio-container">
                <FiltrosAvancados filtros={filtros} setFiltros={setFiltros} departamentos={departamentos} />

                <div className="botoes-relatorio mb-4">
                    <Row>
                        <Col md={6}>
                            <Form.Control
                                type="text"
                                placeholder="Buscar por nome ou ID..."
                                value={filtros.busca}
                                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                            />
                        </Col>
                        <Col md={6} className="d-flex justify-content-end">
                            <Button onClick={exportarExcel} disabled={carregando} className="me-2">
                                Exportar Excel
                            </Button>
                        </Col>
                    </Row>
                </div>

                {carregando ? (
                    <p className="text-center my-5">Carregando dados...</p>
                ) : (
                    <>
                        <GraficosAnaliticos dados={dadosAgrupados} totais={totaisPorUsuario} />

                        <div className="relatorios-usuarios mt-4">
                            {dadosPorUsuario.map(({ usuario, registros, totais }) => (
                                <RelatorioUsuario
                                    key={usuario}
                                    usuario={usuarios.find((u) => u.id === usuario)}
                                    registros={registros}
                                    totais={totais}
                                    onImprimir={() => setShowImpressao(usuario)}
                                />
                            ))}
                        </div>

                        <Paginacao
                            paginaAtual={paginaAtual}
                            totalPaginas={totalPaginas}
                            onPageChange={setPaginaAtual}
                        />
                    </>
                )}

                <Modal
                    show={!!showImpressao}
                    onHide={() => setShowImpressao(false)}
                    size="xl"
                    centered
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Relatório Individual</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {showImpressao && (
                            <RelatorioImpressao
                                usuario={usuarios.find((u) => u.id === showImpressao)}
                                registros={dadosAgrupados.filter(
                                    (item) => item.usuario === showImpressao
                                )}
                                totais={totaisPorUsuario[showImpressao] || {}}
                            />
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowImpressao(false)}>
                            Fechar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => window.print()}
                        >
                            Imprimir
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </Layout>
    );
}
