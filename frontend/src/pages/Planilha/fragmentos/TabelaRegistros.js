import React, { useState } from 'react';
import { formatarDataBR, formatarHora, formatarMinutosParaHora } from '../../../utils/dateUtils';
import { TIPOS_REGISTRO } from '../../../utils/constants';
import { Modal, Button, Form } from 'react-bootstrap';
import { doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';

/**
 * TabelaRegistros
 *
 * - Exibe registro já preparado (entrada/saida como Date|null e pontos com horaPontoDate)
 * - Mostra botão de edição/exclusão (✎) apenas para usuários com permissão Gestor(1) ou Gerente Geral(2)
 * - Use onRefresh() para re-carregar dados sem dar reload na página
 *
 * Ajuste solicitado: modal será centralizado via CSS customizado (classe `custom-centered-modal-dialog`)
 */

const SIMBOLO_NOTURNO = 'N';

const podeEditar = (usuarioLogado) => {
    if (!usuarioLogado) return false;
    const perm = Number(usuarioLogado.permissao);
    return perm === 1 || perm === 2;
};

const TabelaRegistros = ({ registros = [], onRefresh, usuarioLogado }) => {
    const [showModal, setShowModal] = useState(false);
    const [pontoSelecionado, setPontoSelecionado] = useState(null);
    const [novoHorario, setNovoHorario] = useState('');

    const abrirModal = (ponto) => {
        setPontoSelecionado(ponto);
        const d = ponto.horaPontoDate ? new Date(ponto.horaPontoDate) : (ponto.horaPonto ? new Date(ponto.horaPonto) : null);
        setNovoHorario(d ? d.toISOString().slice(0, 16) : '');
        setShowModal(true);
    };

    const fecharModal = () => {
        setShowModal(false);
        setPontoSelecionado(null);
        setNovoHorario('');
    };

    const salvarEdicao = async () => {
        if (!pontoSelecionado) return;
        try {
            const ref = doc(db, pontoSelecionado.colecao, pontoSelecionado.id);
            if (!novoHorario) throw new Error('Horário inválido');
            const novaData = new Date(novoHorario);
            await updateDoc(ref, {
                horaPonto: Timestamp.fromDate(novaData),
                atualizadoPor: usuarioLogado?.name || 'Sistema',
                atualizadoEm: Timestamp.fromDate(new Date())
            });
            fecharModal();
            if (typeof onRefresh === 'function') onRefresh();
            else window.location.reload();
        } catch (err) {
            console.error('Erro ao salvar ponto:', err);
            alert('Erro ao salvar ponto: ' + err.message);
        }
    };

    const excluirPonto = async () => {
        if (!pontoSelecionado) return;
        if (!window.confirm('Confirma exclusão deste ponto?')) return;
        try {
            const ref = doc(db, pontoSelecionado.colecao, pontoSelecionado.id);
            await deleteDoc(ref);
            fecharModal();
            if (typeof onRefresh === 'function') onRefresh();
            else window.location.reload();
        } catch (err) {
            console.error('Erro ao excluir ponto:', err);
            alert('Erro ao excluir ponto: ' + err.message);
        }
    };

    // Tenta localizar um ponto correspondente ao campo (por proximidade de minutos)
    const findPontoRelacionado = (registro, campoValor, campoName) => {
        if (!registro.pontos || registro.pontos.length === 0) return null;
        if (campoValor instanceof Date) {
            const tv = campoValor.getTime();
            const encontrado = registro.pontos.find((p) => {
                const pd = p.horaPontoDate ? new Date(p.horaPontoDate) : (p.horaPonto ? new Date(p.horaPonto) : null);
                if (!pd) return false;
                return Math.abs(pd.getTime() - tv) < 3 * 60 * 1000; // 3 minutos tolerância
            });
            if (encontrado) return encontrado;
        }
        // fallback heurístico por campo
        if (campoName === 'entrada') return registro.pontos[0];
        if (campoName === 'saida') return registro.pontos[registro.pontos.length - 1];
        // se não souber, devolve primeiro
        return registro.pontos[0];
    };

    const renderHorarioComAcao = (registro, campoName, isNoturno, abonado) => {
        const valor = registro[campoName];
        const pontoRelacionado = findPontoRelacionado(registro, valor, campoName);

        if (abonado) return <span className="text-success">Abonado</span>;

        if (valor) {
            let horaStr = '-';
            try {
                horaStr = formatarHora(valor instanceof Date ? valor : new Date(valor));
            } catch (e) {
                horaStr = '-';
            }
            return (
                <div className="d-flex align-items-center justify-content-between">
                    <span>{horaStr}</span>
                    {pontoRelacionado && podeEditar(usuarioLogado) && (
                        <button
                            className="btn btn-sm btn-outline-secondary ms-2"
                            title="Editar / Excluir ponto"
                            onClick={() => abrirModal(pontoRelacionado)}
                            style={{ padding: '0.15rem 0.35rem', lineHeight: 1 }}
                        >
                            ✎
                        </button>
                    )}
                </div>
            );
        }

        if (isNoturno) {
            if (campoName === 'saidaAlmoco' || campoName === 'voltaAlmoco') return <span>N/A</span>;
            return <span>{SIMBOLO_NOTURNO}</span>;
        }

        return <span>-</span>;
    };

    return (
        <>
            <div className="table-responsive">
                <table className="table table-striped table-hover tabela-relatorio mb-0">
                    <thead className="table-dark">
                    <tr>
                        <th>Data</th>
                        <th>Entrada</th>
                        <th>Saída Almoço</th>
                        <th>Volta Almoço</th>
                        <th>Saída</th>
                        <th>Horas</th>
                        <th>Extras</th>
                        <th>Atrasos</th>
                        <th>Situação</th>
                    </tr>
                    </thead>
                    <tbody>
                    {registros.map((item, idx) => {
                        const isNoturno = !!item.isNoturno || (item.totaisDia?.observacoes || []).some((o) => String(o).toLowerCase().includes('noturno'));
                        const entradaAbonada = item.totaisDia?.abonos?.some((a) => a.tipoAbonado === TIPOS_REGISTRO.ENTRADA);
                        const saidaAlmocoAbonada = item.totaisDia?.abonos?.some((a) => a.tipoAbonado === TIPOS_REGISTRO.SAIDA_ALMOCO);
                        const voltaAlmocoAbonada = item.totaisDia?.abonos?.some((a) => a.tipoAbonado === TIPOS_REGISTRO.VOLTA_ALMOCO);
                        const saidaAbonada = item.totaisDia?.abonos?.some((a) => a.tipoAbonado === TIPOS_REGISTRO.SAIDA);

                        const temBancoHoras =
                            (item.pontos || []).some((p) => (p.status || '').toLowerCase().includes('banco')) ||
                            (item.abonos || []).some((a) => (a.tipo || '').toLowerCase().includes('banco'));
                        const temFalta = item.totaisDia?.faltaCompleta || item.faltas?.length > 0 || (item.totaisDia?.temFalta && !item.totaisDia?.faltaCompleta);
                        const temAbono = (item.totaisDia?.abonos && item.totaisDia.abonos.length > 0) || (item.totaisDia?.observacoes || []).some((o) => String(o).toLowerCase().includes('abon'));

                        return (
                            <tr
                                key={idx}
                                className={
                                    (item.totaisDia?.observacoes || []).some((o) => String(o).toLowerCase().includes('falta'))
                                        ? 'table-danger'
                                        : temAbono
                                            ? 'table-info'
                                            : isNoturno
                                                ? 'table-warning'
                                                : ''
                                }
                            >
                                <td>{formatarDataBR(item.data)}</td>

                                <td>{renderHorarioComAcao(item, 'entrada', isNoturno, entradaAbonada)}</td>
                                <td>{isNoturno ? 'N/A' : renderHorarioComAcao(item, 'saidaAlmoco', isNoturno, saidaAlmocoAbonada)}</td>
                                <td>{isNoturno ? 'N/A' : renderHorarioComAcao(item, 'voltaAlmoco', isNoturno, voltaAlmocoAbonada)}</td>
                                <td>{renderHorarioComAcao(item, 'saida', isNoturno, saidaAbonada)}</td>

                                <td>{formatarMinutosParaHora(item.totaisDia?.horasTrabalhadas || 0)}</td>
                                <td>{formatarMinutosParaHora(item.totaisDia?.horasExtras || 0)}</td>
                                <td>
                                    {(item.totaisDia?.atrasoEntrada > 0 ? `E:${formatarMinutosParaHora(item.totaisDia.atrasoEntrada)}` : '')}
                                    {(item.totaisDia?.atrasoVoltaAlmoco > 0 ? ` V:${formatarMinutosParaHora(item.totaisDia.atrasoVoltaAlmoco)}` : '')}
                                    {(!item.totaisDia?.atrasoEntrada && !item.totaisDia?.atrasoVoltaAlmoco) ? '-' : ''}
                                </td>

                                <td>
                                    {isNoturno && <div><small className="text-warning">Turno Noturno</small></div>}
                                    {temBancoHoras && <div><small className="text-primary">Banco de Horas</small></div>}
                                    {temAbono && <div><small className="text-success">Abono</small></div>}
                                    {temFalta && <div><small className="text-danger">Falta</small></div>}
                                    {(item.totaisDia?.observacoes || []).map((o, i) => (
                                        <div key={i}><small>{o}</small></div>
                                    ))}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>

                <div className="mt-3 small text-muted">
                    <strong>Legenda:</strong>
                    <span className="ms-2">
            <span className="badge bg-danger">Falta</span>
            <span className="badge bg-info ms-1">Abonado</span>
            <span className="badge bg-warning ms-1">Noturno</span>
            <span className="badge bg-primary ms-1">Banco de Horas</span>
          </span>
                </div>
            </div>

            {/* Modal de edição / exclusão de ponto (centralizado via CSS class) */}
            {/* Note: usamos dialogClassName para aplicar nossa regra CSS que centraliza perfeitamente */}
            <Modal show={showModal} onHide={fecharModal} dialogClassName="custom-centered-modal-dialog">
                <Modal.Header closeButton>
                    <Modal.Title>Editar / Excluir ponto</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {pontoSelecionado ? (
                        <>
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Horário</Form.Label>
                                    <Form.Control type="datetime-local" value={novoHorario} onChange={(e) => setNovoHorario(e.target.value)} />
                                </Form.Group>

                                <Form.Group className="mb-2">
                                    <Form.Label>Usuário</Form.Label>
                                    <Form.Control readOnly value={pontoSelecionado.usuario || pontoSelecionado.usuario} />
                                </Form.Group>

                                <div className="small text-muted">
                                    Coleção: {pontoSelecionado.colecao} | ID: {pontoSelecionado.id} | Status: {pontoSelecionado.status || '-'}
                                </div>
                            </Form>
                        </>
                    ) : (
                        <p>Carregando ponto...</p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="danger" onClick={excluirPonto}>Excluir</Button>
                    <Button variant="secondary" onClick={fecharModal}>Cancelar</Button>
                    <Button variant="primary" onClick={salvarEdicao}>Salvar</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default TabelaRegistros;