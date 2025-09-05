import React from 'react';
import { formatarDataBR, formatarHora, formatarMinutosParaHora } from '../../../utils/dateUtils';
import { TIPOS_REGISTRO } from '../../../utils/constants';

const TabelaRegistros = ({ registros }) => {
    return (
        <div className="table-responsive">
            <table className="table table-striped table-hover tabela-relatorio mb-0">
                <thead className="table-dark">
                <tr>
                    <th>Data</th>
                    <th>Entrada</th>
                    <th>Saída Almoço</th>
                    <th>Volta Almoço</th>
                    <th>Saída Final</th>
                    <th>Horas</th>
                    <th>Extras</th>
                    <th>Atrasos</th>
                    <th>Situação</th>
                </tr>
                </thead>
                <tbody>
                {registros.map((item, idx) => {
                    const classeLinha = item.totaisDia.observacoes.includes('Falta') ? 'table-danger' :
                        item.totaisDia.observacoes.includes('abonado') ? 'table-info' : '';
                    return (
                        <tr key={idx} className={classeLinha}>
                            <td>{formatarDataBR(item.data)}</td>
                            <td>{item.entrada ? formatarHora(item.entrada) :
                                (item.totaisDia.abonos?.some(a => a.tipoAbonado === TIPOS_REGISTRO.ENTRADA) ? 'Abonado' : '-')}</td>
                            <td>{item.saidaAlmoco ? formatarHora(item.saidaAlmoco) :
                                (item.totaisDia.abonos?.some(a => a.tipoAbonado === TIPOS_REGISTRO.SAIDA_ALMOCO) ? 'Abonado' : '-')}</td>
                            <td>{item.voltaAlmoco ? formatarHora(item.voltaAlmoco) :
                                (item.totaisDia.abonos?.some(a => a.tipoAbonado === TIPOS_REGISTRO.VOLTA_ALMOCO) ? 'Abonado' : '-')}</td>
                            <td>{item.saidaFinal ? formatarHora(item.saidaFinal) :
                                (item.totaisDia.abonos?.some(a => a.tipoAbonado === TIPOS_REGISTRO.SAIDA) ? 'Abonado' : '-')}</td>
                            <td>{formatarMinutosParaHora(item.totaisDia.horasTrabalhadas)}</td>
                            <td>{formatarMinutosParaHora(item.totaisDia.horasExtras)}</td>
                            <td>
                                {item.totaisDia.atrasoEntrada > 0 && `E:${formatarMinutosParaHora(item.totaisDia.atrasoEntrada)}`}
                                {item.totaisDia.atrasoVoltaAlmoco > 0 && ` V:${formatarMinutosParaHora(item.totaisDia.atrasoVoltaAlmoco)}`}
                                {(item.totaisDia.atrasoEntrada === 0 && item.totaisDia.atrasoVoltaAlmoco === 0) && '-'}
                            </td>
                            <td>{item.totaisDia.observacoes}</td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
};

export default TabelaRegistros;