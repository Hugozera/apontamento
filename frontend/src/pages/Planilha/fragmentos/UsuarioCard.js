import React from "react";
import { Badge } from "react-bootstrap";
import TabelaRegistros from "./TabelaRegistros";
import { formatarMinutosParaHora } from "../../../utils/dateUtils";

const UsuarioCard = ({ usuarioData, onImprimir, onRefresh, usuarioLogado }) => {
    return (
        <div className="usuario-container mb-5 shadow-sm">
            {/* Cabeçalho */}
            <div className="cabecalho-usuario p-3 bg-primary text-white rounded-top">
                <div className="d-flex justify-content-between align-items-center">
                    <h3 className="mb-0">
                        {usuarioData.usuario} (ID: {usuarioData.totais.idLogin || "N/A"})
                    </h3>
                    <div>
                        <button
                            onClick={() => onImprimir(usuarioData)}
                            className="btn btn-light me-2"
                        >
                            Imprimir Relatório
                        </button>
                        <Badge bg="light" text="dark" className="fs-6">
                            {usuarioData.totais.jornada || "12/36"}
                        </Badge>
                    </div>
                </div>
                <div className="info-usuario mt-2">
          <span className="badge bg-light text-dark me-2">
            Departamento: {usuarioData.totais.departamento || "Não informado"}
          </span>
                </div>
            </div>

            {/* Totais */}
            <div className="totais-usuario p-3 bg-light">
                <div className="row">
                    <div className="col-md-2">
                        <div className="card bg-success text-white">
                            <div className="card-body p-2 text-center">
                                <h6 className="card-title mb-0">Horas Extras</h6>
                                <p className="card-text mb-0">
                                    {formatarMinutosParaHora(usuarioData.totais.horasExtras || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card bg-warning text-dark">
                            <div className="card-body p-2 text-center">
                                <h6 className="card-title mb-0">Atrasos</h6>
                                <p className="card-text mb-0">
                                    {formatarMinutosParaHora(usuarioData.totais.atrasos || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card bg-info text-white">
                            <div className="card-body p-2 text-center">
                                <h6 className="card-title mb-0">Dias Trab.</h6>
                                <p className="card-text mb-0">
                                    {usuarioData.totais.diasTrabalhados || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card bg-secondary text-white">
                            <div className="card-body p-2 text-center">
                                <h6 className="card-title mb-0">Dias Abon.</h6>
                                <p className="card-text mb-0">
                                    {usuarioData.totais.diasAbonados || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card bg-danger text-white">
                            <div className="card-body p-2 text-center">
                                <h6 className="card-title mb-0">Faltas</h6>
                                <p className="card-text mb-0">
                                    {usuarioData.totais.faltas || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card bg-primary text-white">
                            <div className="card-body p-2 text-center">
                                <h6 className="card-title mb-0">Total Dias</h6>
                                <p className="card-text mb-0">
                                    {(usuarioData.totais.diasTrabalhados || 0) +
                                        (usuarioData.totais.diasAbonados || 0) +
                                        (usuarioData.totais.faltas || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Registros */}
            <TabelaRegistros registros={usuarioData.registros} onRefresh={onRefresh} usuarioLogado={usuarioLogado} />
        </div>
    );
};

export default UsuarioCard;