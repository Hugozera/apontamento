import { TIPOS_REGISTRO } from './constants';
import { parseDataHora, calcularMinutos, formatarMinutosParaHora } from './dateUtils';

/**
 * Função para classificar pontos com validação de horários
 * Remove pontos duplicados e horários inconsistentes
 */
export function classificarPontos(pontos, isNoturno = false) {
    if (!pontos || pontos.length === 0) return {
        entrada: null,
        saidaAlmoco: null,
        voltaAlmoco: null,
        saida: null
    };

    // Filtrar apenas pontos normais (não faltas)
    const pontosNormais = pontos.filter(p => !p.isFalta);

    if (pontosNormais.length === 0) return {
        entrada: null,
        saidaAlmoco: null,
        voltaAlmoco: null,
        saida: null
    };

    const pontosOrdenados = [...pontosNormais]
        .sort((a, b) => {
            const dataA = parseDataHora(a.horaPonto);
            const dataB = parseDataHora(b.horaPonto);
            return dataA - dataB;
        });

    const pontosUnicos = [];
    const horariosProcessados = new Set();

    pontosOrdenados.forEach(ponto => {
        const dataPonto = parseDataHora(ponto.horaPonto);
        if (!dataPonto) return;

        const minutos = calcularMinutos(dataPonto);
        const chaveHorario = Math.floor(minutos / 5) * 5;

        if (!horariosProcessados.has(chaveHorario)) {
            horariosProcessados.add(chaveHorario);
            pontosUnicos.push(ponto);
        }
    });

    if (pontosUnicos.length === 0) return {
        entrada: null,
        saidaAlmoco: null,
        voltaAlmoco: null,
        saida: null
    };

    let entrada = null;
    let saidaAlmoco = null;
    let voltaAlmoco = null;
    let saida = null;

    // LÓGICA PARA NOTURNOS
    if (isNoturno) {
        pontosUnicos.forEach(ponto => {
            const dataPonto = parseDataHora(ponto.horaPonto);
            if (!dataPonto) return;

            const minutos = calcularMinutos(dataPonto);
            const horas = dataPonto.getHours();

            // NOTURNO: Entrada entre 18:00 e 23:59
            if (!entrada && horas >= 18 && horas <= 23) {
                entrada = ponto.horaPonto;
            }
            // NOTURNO: Saída entre 00:00 e 12:00 (do dia seguinte)
            else if (!saida && horas >= 0 && horas <= 12) {
                saida = ponto.horaPonto;
            }
            // Para noturnos, geralmente não têm intervalo de almoço
        });

        // Fallback para noturnos
        if (!entrada && pontosUnicos.length > 0) entrada = pontosUnicos[0].horaPonto;
        if (!saida && pontosUnicos.length > 1) saida = pontosUnicos[pontosUnicos.length - 1].horaPonto;
    }
    // LÓGICA PARA DIURNOS (original)
    else {
        pontosUnicos.forEach(ponto => {
            const dataPonto = parseDataHora(ponto.horaPonto);
            if (!dataPonto) return;

            const minutos = calcularMinutos(dataPonto);

            if (!entrada && minutos >= 5*60 && minutos <= 9.5*60) {
                entrada = ponto.horaPonto;
            }
            else if (!saidaAlmoco && minutos >= 10*60 && minutos <= 14*60) {
                saidaAlmoco = ponto.horaPonto;
            }
            else if (saidaAlmoco && !voltaAlmoco && minutos >= 11*60 && minutos <= 15*60) {
                voltaAlmoco = ponto.horaPonto;
            }
            else if (entrada && voltaAlmoco && !saida && minutos >= 16*60) {
                saida = ponto.horaPonto;
            }
        });

        if (!entrada && pontosUnicos.length > 0) entrada = pontosUnicos[0].horaPonto;
        if (!saidaAlmoco && pontosUnicos.length > 1) saidaAlmoco = pontosUnicos[1].horaPonto;
        if (!voltaAlmoco && pontosUnicos.length > 2) voltaAlmoco = pontosUnicos[2].horaPonto;
        if (!saida && pontosUnicos.length > 3) saida = pontosUnicos[3].horaPonto;
    }

    return {
        entrada,
        saidaAlmoco,
        voltaAlmoco,
        saida
    };
}

/**
 * Processa faltas e retorna informações sobre faltas do dia
 */
export function processarFaltasDoDia(faltas) {
    if (!faltas || faltas.length === 0) {
        return {
            temFalta: false,
            faltaCompleta: false,
            faltasParciais: [],
            totalFaltas: 0
        };
    }

    const tiposFalta = {
        entrada: false,
        saidaAlmoco: false,
        voltaAlmoco: false,
        saida: false
    };

    const faltasParciais = [];

    faltas.forEach(falta => {
        const tipo = falta.tipoFalta?.toLowerCase() || '';

        if (tipo.includes('entrada') && tipo.includes('manhã')) {
            tiposFalta.entrada = true;
            faltasParciais.push('Entrada Manhã');
        } else if (tipo.includes('saída') && tipo.includes('manhã')) {
            tiposFalta.saidaAlmoco = true;
            faltasParciais.push('Saída Almoço');
        } else if (tipo.includes('entrada') && tipo.includes('tarde')) {
            tiposFalta.voltaAlmoco = true;
            faltasParciais.push('Volta Almoço');
        } else if (tipo.includes('saída') && tipo.includes('tarde')) {
            tiposFalta.saida = true;
            faltasParciais.push('Saída Tarde');
        } else {
            // Para tipos não identificados, adiciona como falta genérica
            faltasParciais.push(falta.tipoFalta || 'Falta');
        }
    });

    // Considera falta completa se tem pelo menos 3 dos 4 tipos principais
    const faltasPrincipais = [tiposFalta.entrada, tiposFalta.saidaAlmoco, tiposFalta.voltaAlmoco, tiposFalta.saida];
    const totalFaltasPrincipais = faltasPrincipais.filter(Boolean).length;
    const faltaCompleta = totalFaltasPrincipais >= 3;

    return {
        temFalta: true,
        faltaCompleta,
        faltasParciais,
        totalFaltas: faltas.length,
        tiposFalta
    };
}

/**
 * Calcula totais do dia considerando abonos e faltas
 */
export function calcularTotaisDia(pontosClassificados, abonos = [], infoFaltas = null, jornadaConfig, isNoturno = false) {
    // Se há falta completa, retorna zeros
    if (infoFaltas?.faltaCompleta) {
        return {
            horasTrabalhadas: 0,
            horasExtras: 0,
            atrasoEntrada: 0,
            atrasoVoltaAlmoco: 0,
            saidaAntecipada: 0,
            observacoes: ['FALTA COMPLETA'],
            abonos,
            temFalta: true,
            faltaCompleta: true
        };
    }

    const diaAbonado = abonos.some(abono => abono.tipoAbonado === TIPOS_REGISTRO.DIA_TRABALHO);
    if (diaAbonado) {
        return {
            horasTrabalhadas: jornadaConfig.cargaHoraria,
            horasExtras: 0,
            atrasoEntrada: 0,
            atrasoVoltaAlmoco: 0,
            saidaAntecipada: 0,
            observacoes: ['DIA ABONADO'],
            abonos,
            temFalta: false,
            faltaCompleta: false
        };
    }

    // Se há faltas parciais, adiciona observação
    const observacoes = [];
    if (infoFaltas?.temFalta && !infoFaltas.faltaCompleta) {
        observacoes.push(`FALTAS PARCIAIS: ${infoFaltas.faltasParciais.join(', ')}`);
    }

    // CÁLCULO ESPECIAL PARA NOTURNOS
    if (isNoturno) {
        const entradaMin = calcularMinutos(pontosClassificados.entrada);
        const saidaMin = calcularMinutos(pontosClassificados.saida);

        // Para noturnos, a jornada é das 19h às 7h (12 horas)
        // Se a saída for no dia seguinte, adiciona 24 horas (1440 minutos)
        const saidaAjustada = saidaMin < entradaMin ? saidaMin + 1440 : saidaMin;
        const horasTrabalhadas = saidaAjustada - entradaMin;

        const resultado = {
            horasTrabalhadas,
            horasExtras: Math.max(0, horasTrabalhadas - jornadaConfig.cargaHoraria),
            atrasoEntrada: Math.max(0, entradaMin - jornadaConfig.entrada),
            atrasoVoltaAlmoco: 0, // Noturnos geralmente não têm intervalo
            saidaAntecipada: Math.max(0, jornadaConfig.saida - saidaAjustada),
            observacoes: observacoes.length > 0 ? observacoes : ['TURNO NOTURNO'],
            abonos,
            temFalta: infoFaltas?.temFalta || false,
            faltaCompleta: false
        };

        return resultado;
    }

    const entradaAbonada = abonos.some(abono => abono.tipoAbonado === TIPOS_REGISTRO.ENTRADA);
    const saidaAlmocoAbonada = abonos.some(abono => abono.tipoAbonado === TIPOS_REGISTRO.SAIDA_ALMOCO);
    const voltaAlmocoAbonada = abonos.some(abono => abono.tipoAbonado === TIPOS_REGISTRO.VOLTA_ALMOCO);
    const saidaAbonada = abonos.some(abono => abono.tipoAbonado === TIPOS_REGISTRO.SAIDA);

    const entradaMin = entradaAbonada ? jornadaConfig.entrada : calcularMinutos(pontosClassificados.entrada);
    const saidaAlmocoMin = saidaAlmocoAbonada ? jornadaConfig.saidaAlmoco : calcularMinutos(pontosClassificados.saidaAlmoco);
    const voltaAlmocoMin = voltaAlmocoAbonada ? jornadaConfig.voltaAlmoco : calcularMinutos(pontosClassificados.voltaAlmoco);
    const saidaMin = saidaAbonada ? jornadaConfig.saida : calcularMinutos(pontosClassificados.saida);

    // VALIDAÇÃO: Se a saída final for anterior à volta do almoço, ignora os dados
    if (saidaMin > 0 && voltaAlmocoMin > 0 && saidaMin <= voltaAlmocoMin) {
        observacoes.push('DADOS INCONSISTENTES (SAÍDA ANTES DA VOLTA)');
        return {
            horasTrabalhadas: 0,
            horasExtras: 0,
            atrasoEntrada: 0,
            atrasoVoltaAlmoco: 0,
            saidaAntecipada: 0,
            observacoes,
            abonos,
            temFalta: infoFaltas?.temFalta || false,
            faltaCompleta: false
        };
    }

    // VALIDAÇÃO: Se a saída for muito cedo (antes das 16h), considera como dados inconsistentes
    if (saidaMin > 0 && saidaMin < 16*60 && !saidaAbonada) {
        observacoes.push('SAÍDA MUITO ANTECIPADA');
        return {
            horasTrabalhadas: 0,
            horasExtras: 0,
            atrasoEntrada: 0,
            atrasoVoltaAlmoco: 0,
            saidaAntecipada: 0,
            observacoes,
            abonos,
            temFalta: infoFaltas?.temFalta || false,
            faltaCompleta: false
        };
    }

    const pontosSuficientes = entradaMin > 0 && saidaMin > 0;
    if (!pontosSuficientes) {
        observacoes.push('FALTA REGISTRO DE PONTO');
        return {
            horasTrabalhadas: 0,
            horasExtras: 0,
            atrasoEntrada: 0,
            atrasoVoltaAlmoco: 0,
            saidaAntecipada: 0,
            observacoes,
            abonos,
            temFalta: infoFaltas?.temFalta || false,
            faltaCompleta: false
        };
    }

    const manha = saidaAlmocoMin > 0 ? (saidaAlmocoMin - entradaMin) : 0;
    const tarde = voltaAlmocoMin > 0 ? (saidaMin - voltaAlmocoMin) : 0;
    const horasTrabalhadas = manha + tarde;
    const diferenca = horasTrabalhadas - jornadaConfig.cargaHoraria;

    const atrasoEntrada = entradaAbonada ? 0 : Math.max(0, entradaMin - jornadaConfig.entrada);
    const atrasoVoltaAlmoco = voltaAlmocoAbonada ? 0 : (voltaAlmocoMin > 0 ? Math.max(0, voltaAlmocoMin - jornadaConfig.voltaAlmoco) : 0);
    const saidaAntecipada = saidaAbonada ? 0 : Math.max(0, jornadaConfig.saida - saidaMin);

    // Adiciona observações de abonos
    if (entradaAbonada) observacoes.push('ENTRADA ABONADA');
    if (saidaAlmocoAbonada) observacoes.push('SAÍDA ALMOÇO ABONADA');
    if (voltaAlmocoAbonada) observacoes.push('VOLTA ALMOÇO ABONADA');
    if (saidaAbonada) observacoes.push('SAÍDA ABONADA');

    // Se não há observações específicas, marca como normal
    if (observacoes.length === 0) {
        observacoes.push('NORMAL');
    }

    return {
        horasTrabalhadas,
        horasExtras: Math.max(0, diferenca),
        atrasoEntrada,
        atrasoVoltaAlmoco,
        saidaAntecipada,
        observacoes,
        abonos,
        temFalta: infoFaltas?.temFalta || false,
        faltaCompleta: false
    };
}

/**
 * Calcula totais mensais para um usuário
 */
export function calcularTotaisMensais(registrosUsuario) {
    const totais = {
        horasTrabalhadas: 0,
        horasExtras: 0,
        atrasos: 0,
        diasTrabalhados: 0,
        diasAbonados: 0,
        faltas: 0,
        horasTrabalhadasFormatadas: '00:00',
        horasExtrasFormatadas: '00:00',
        atrasosFormatados: '00:00'
    };

    registrosUsuario.forEach(registro => {
        if (registro.totaisDia.faltaCompleta) {
            totais.faltas += 1;
        } else if (registro.totaisDia.observacoes.includes('DIA ABONADO')) {
            totais.diasAbonados += 1;
        } else if (registro.totaisDia.horasTrabalhadas > 0) {
            totais.horasTrabalhadas += registro.totaisDia.horasTrabalhadas;
            totais.horasExtras += registro.totaisDia.horasExtras;
            totais.atrasos += registro.totaisDia.atrasoEntrada + registro.totaisDia.atrasoVoltaAlmoco;
            totais.diasTrabalhados += 1;
        }

        // Contabiliza faltas parciais
        if (registro.totaisDia.temFalta && !registro.totaisDia.faltaCompleta) {
            totais.faltas += 0.5; // Meia falta para faltas parciais
        }
    });

    // Formata os totais
    totais.horasTrabalhadasFormatadas = formatarMinutosParaHora(totais.horasTrabalhadas);
    totais.horasExtrasFormatadas = formatarMinutosParaHora(totais.horasExtras);
    totais.atrasosFormatados = formatarMinutosParaHora(totais.atrasos);

    return totais;
}

/**
 * Verifica se um registro é válido (não é falta e tem dados consistentes)
 */
export function isRegistroValido(registro) {
    return !registro.totaisDia.faltaCompleta &&
        !registro.totaisDia.observacoes.some(obs =>
            obs.includes('INCONSISTENTES') ||
            obs.includes('ANTECIPADA') ||
            obs.includes('FALTA REGISTRO')
        ) &&
        registro.totaisDia.horasTrabalhadas > 0;
}

/**
 * Agrupa registros por usuário
 */
export function agruparPorUsuario(registros) {
    const agrupados = {};

    registros.forEach(registro => {
        if (!agrupados[registro.usuario]) {
            agrupados[registro.usuario] = [];
        }
        agrupados[registro.usuario].push(registro);
    });

    return agrupados;
}

/**
 * Filtra registros por período
 */
export function filtrarPorPeriodo(registros, dataInicio, dataFim) {
    if (!dataInicio || !dataFim) return registros;

    const inicio = new Date(dataInicio);
    inicio.setHours(0, 0, 0, 0);

    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);

    return registros.filter(registro => {
        const dataRegistro = new Date(registro.data);
        return dataRegistro >= inicio && dataRegistro <= fim;
    });
}

/**
 * Processa todos os dados do dia (pontos, faltas, abonos)
 */
export function processarDiaCompleto(pontos, abonos = [], jornadaConfig, isNoturno = false) {
    // Separar pontos normais de faltas
    const pontosNormais = pontos.filter(p => !p.isFalta);
    const faltas = pontos.filter(p => p.isFalta);

    // Processar informações sobre faltas
    const infoFaltas = processarFaltasDoDia(faltas);

    // Classificar pontos normais
    const pontosClassificados = classificarPontos(pontosNormais, isNoturno);

    // Calcular totais do dia
    const totaisDia = calcularTotaisDia(pontosClassificados, abonos, infoFaltas, jornadaConfig, isNoturno);

    return {
        pontosClassificados,
        totaisDia,
        infoFaltas,
        abonos,
        temPontos: pontosNormais.length > 0,
        temFaltas: faltas.length > 0
    };
}

export default {
    classificarPontos,
    processarFaltasDoDia,
    calcularTotaisDia,
    calcularTotaisMensais,
    isRegistroValido,
    agruparPorUsuario,
    filtrarPorPeriodo,
    processarDiaCompleto
};