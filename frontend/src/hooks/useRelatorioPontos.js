import { useEffect, useState } from "react";
import { getDocs, query, where } from "firebase/firestore";
import XLSX from "xlsx";
import { formatarDataSimples, formatarDataBR, formatarHora, formatarMinutosParaHora, parseDataHora, classificarPontos, calcularTotaisDia } from "../../pages/utils/formatadores";
import { JORNADAS, TIPOS_REGISTRO } from "../constants";

export function useRelatorioPontos(filtros, usuariosData) {
    const [dadosAgrupados, setDadosAgrupados] = useState([]);
    const [totaisPorUsuario, setTotaisPorUsuario] = useState({});
    const [carregando, setCarregando] = useState(false);

    useEffect(() => {
        carregarDadosPontos();
    }, [filtros, usuariosData]);

    async function carregarDadosPontos() {
        try {
            setCarregando(true);

            let qPontos = filtros.basePontos;
            let qAbonos = filtros.baseAbonos;
            let qFaltas = filtros.baseFaltas;

            if (filtros.dataInicio) {
                const dataInicio = new Date(filtros.dataInicio);
                dataInicio.setHours(0, 0, 0, 0);
                qPontos = query(qPontos, where("data", ">=", dataInicio));
                qAbonos = query(qAbonos, where("data", ">=", dataInicio));
                qFaltas = query(qFaltas, where("data", ">=", dataInicio));
            }
            if (filtros.dataFim) {
                const dataFim = new Date(filtros.dataFim);
                dataFim.setHours(23, 59, 59, 999);
                qPontos = query(qPontos, where("data", "<=", dataFim));
                qAbonos = query(qAbonos, where("data", "<=", dataFim));
                qFaltas = query(qFaltas, where("data", "<=", dataFim));
            }

            const [snapshotPontos, snapshotAbonos, snapshotFaltas] = await Promise.all([
                getDocs(qPontos),
                getDocs(qAbonos),
                getDocs(qFaltas),
            ]);

            const idsUsuarios = usuariosData.map((u) => u.name);

            const todosPontos = snapshotPontos.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((ponto) => idsUsuarios.includes(ponto.usuario));

            const todosAbonos = snapshotAbonos.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((abono) => idsUsuarios.includes(abono.usuario));

            const todasFaltas = snapshotFaltas.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((falta) => idsUsuarios.includes(falta.usuario));

            // --- Agrupamento e totais (mesma lógica do seu código original) ---
            const agrupados = {};
            const totaisUsuario = {};
            const abonosAgrupados = {};
            const faltasAgrupadas = {};

            usuariosData.forEach((user) => {
                if (filtros.jornada && user.jornada !== filtros.jornada) return;
                totaisUsuario[user.name] = {
                    horasExtras: 0,
                    atrasos: 0,
                    diasTrabalhados: 0,
                    diasAbonados: 0,
                    faltas: 0,
                    jornada: user.jornada || "12/36",
                    departamento: user.departamento || "Não informado",
                };
            });

            todosAbonos.forEach((abono) => {
                const dataStr = formatarDataSimples(abono.data);
                const chave = `${abono.usuario}_${dataStr}`;
                if (!abonosAgrupados[chave]) abonosAgrupados[chave] = [];
                abonosAgrupados[chave].push(abono);
            });

            todasFaltas.forEach((falta) => {
                const dataStr = formatarDataSimples(falta.data);
                const chave = `${falta.usuario}_${dataStr}`;
                faltasAgrupadas[chave] = true;
            });

            todosPontos.forEach((ponto) => {
                const dataPonto = parseDataHora(ponto.horaPonto);
                if (!dataPonto) return;

                const dataStr = formatarDataSimples(dataPonto);
                const chave = `${ponto.usuario}_${dataStr}`;

                if (!agrupados[chave]) {
                    const usuario = usuariosData.find((u) => u.name === ponto.usuario);
                    agrupados[chave] = {
                        usuario: ponto.usuario,
                        idLogin: ponto.idLogin || "",
                        data: dataStr,
                        pontos: [],
                        abonos: abonosAgrupados[chave] || [],
                        falta: faltasAgrupadas[chave] || false,
                        jornada: usuario?.jornada || "12/36",
                    };
                }
                agrupados[chave].pontos.push(ponto);
            });

            // Preenche abonos/faltas sem pontos
            Object.keys(abonosAgrupados).forEach((chave) => {
                if (!agrupados[chave]) {
                    const [usuario, data] = chave.split("_");
                    const user = usuariosData.find((u) => u.name === usuario);
                    agrupados[chave] = {
                        usuario,
                        idLogin: abonosAgrupados[chave][0]?.idLogin || "",
                        data,
                        pontos: [],
                        abonos: abonosAgrupados[chave],
                        falta: faltasAgrupadas[chave] || false,
                        jornada: user?.jornada || "12/36",
                    };
                }
            });

            Object.keys(faltasAgrupadas).forEach((chave) => {
                if (!agrupados[chave]) {
                    const [usuario, data] = chave.split("_");
                    const user = usuariosData.find((u) => u.name === usuario);
                    agrupados[chave] = {
                        usuario,
                        idLogin: "",
                        data,
                        pontos: [],
                        abonos: [],
                        falta: true,
                        jornada: user?.jornada || "12/36",
                    };
                }
            });

            const listaFinal = Object.values(agrupados).map((item) => {
                const jornadaConfig = JORNADAS[item.jornada] || JORNADAS["12/36"];
                const pontosClassificados = classificarPontos(item.pontos);
                const totaisDia = calcularTotaisDia(
                    pontosClassificados,
                    item.abonos,
                    item.falta,
                    jornadaConfig
                );

                const usuario = item.usuario;
                if (totaisUsuario[usuario]) {
                    if (totaisDia.isAbono) {
                        totaisUsuario[usuario].diasAbonados += 1;
                    } else if (totaisDia.isFalta) {
                        totaisUsuario[usuario].faltas += 1;
                    } else if (totaisDia.horasTrabalhadas > 0) {
                        totaisUsuario[usuario].horasExtras += totaisDia.horasExtras;
                        totaisUsuario[usuario].atrasos +=
                            totaisDia.atrasoEntrada + totaisDia.atrasoVoltaAlmoco;
                        totaisUsuario[usuario].diasTrabalhados += 1;
                    }
                }

                return { ...item, ...pontosClassificados, totaisDia };
            });

            setDadosAgrupados(listaFinal);
            setTotaisPorUsuario(totaisUsuario);
        } catch (err) {
            console.error("Erro ao carregar pontos:", err);
        } finally {
            setCarregando(false);
        }
    }

    function exportarExcel() {
        try {
            const dadosDetalhados = dadosAgrupados.map((item) => ({
                Usuário: item.usuario,
                "ID Login": item.idLogin,
                Data: formatarDataBR(item.data),
                Jornada: item.jornada,
                Entrada: item.entrada ? formatarHora(item.entrada) : "-",
                "Horas Trabalhadas": formatarMinutosParaHora(
                    item.totaisDia.horasTrabalhadas
                ),
                "Horas Extras": formatarMinutosParaHora(item.totaisDia.horasExtras),
                "Atrasos": formatarMinutosParaHora(
                    item.totaisDia.atrasoEntrada + item.totaisDia.atrasoVoltaAlmoco
                ),
                "Situação": item.totaisDia.observacoes,
            }));

            const dadosConsolidados = Object.keys(totaisPorUsuario).map((usuario) => ({
                Usuário: usuario,
                Jornada: totaisPorUsuario[usuario].jornada,
                Departamento: totaisPorUsuario[usuario].departamento,
                "Total Horas Extras": formatarMinutosParaHora(
                    totaisPorUsuario[usuario].horasExtras
                ),
                "Total Atrasos": formatarMinutosParaHora(
                    totaisPorUsuario[usuario].atrasos
                ),
                "Dias Trabalhados": totaisPorUsuario[usuario].diasTrabalhados,
                "Dias Abonados": totaisPorUsuario[usuario].diasAbonados,
                Faltas: totaisPorUsuario[usuario].faltas,
            }));

            const wb = XLSX.utils.book_new();
            const wsDetalhado = XLSX.utils.json_to_sheet(dadosDetalhados);
            const wsConsolidado = XLSX.utils.json_to_sheet(dadosConsolidados);

            XLSX.utils.book_append_sheet(wb, wsDetalhado, "Detalhado");
            XLSX.utils.book_append_sheet(wb, wsConsolidado, "Consolidado");

            XLSX.writeFile(
                wb,
                `Relatorio_Pontos_${new Date().toISOString().split("T")[0]}.xlsx`
            );
        } catch (e) {
            console.error("Erro ao exportar Excel:", e);
        }
    }

    return { dadosAgrupados, totaisPorUsuario, carregando, exportarExcel };
}
