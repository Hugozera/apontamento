import { TIPOS_REGISTRO } from './constants';
import { parseDataHora, calcularMinutos, formatarMinutosParaHora } from './dateUtils';

/**
 * Função para classificar pontos com validação de horários
 * Remove pontos duplicados e horários inconsistentes
 */
export function classificarPontos(pontos) {
    if (!pontos || pontos.length === 0) return {
        entrada: null,
        saidaAlmoco: null,
        voltaAlmoco: null,
        saidaFinal: null
    };

    // Ordena os pontos por horário (do mais antigo para o mais recente)
    const pontosOrdenados = [...pontos]
        .sort((a, b) => {
            const dataA = parseDataHora(a.horaPonto);
            const dataB = parseDataHora(b.horaPonto);
            return dataA - dataB;
        });

    // Filtra pontos duplicados (com diferença menor que 5 minutos)
    const pontosUnicos = [];
    const horariosProcessados = new Set();

    pontosOrdenados.forEach(ponto => {
        const dataPonto = parseDataHora(ponto.horaPonto);
        if (!dataPonto) return;

        const minutos = calcularMinutos(dataPonto);
        const chaveHorario = Math.floor(minutos / 5) * 5; // Agrupa por intervalos de 5 minutos

        if (!horariosProcessados.has(chaveHorario)) {
            horariosProcessados.add(chaveHorario);
            pontosUnicos.push(ponto);
        }
    });

    // Se não há pontos suficientes após a filtragem
    if (pontosUnicos.length === 0) return {
        entrada: null,
        saidaAlmoco: null,
        voltaAlmoco: null,
        saidaFinal: null
    };

    // Classifica os pontos baseado no horário real (não apenas na ordem)
    let entrada = null;
    let saidaAlmoco = null;
    let voltaAlmoco = null;
    let saidaFinal = null;

    pontosUnicos.forEach(ponto => {
        const dataPonto = parseDataHora(ponto.horaPonto);
        if (!dataPonto) return;

        const minutos = calcularMinutos(dataPonto);

        // REGRAS DE CLASSIFICAÇÃO CORRIGIDAS:

        // ENTRADA: entre 5:00 e 9:30
        if (!entrada && minutos >= 5*60 && minutos <= 9.5*60) {
            entrada = ponto.horaPonto;
        }
        // SAÍDA ALMOÇO: entre 10:00 e 14:00 (apenas se ainda não classificada)
        else if (!saidaAlmoco && minutos >= 10*60 && minutos <= 14*60) {
            saidaAlmoco = ponto.horaPonto;
        }
        // VOLTA ALMOÇO: entre 11:00 and 15:00 (apenas se já tiver saída para almoço)
        else if (saidaAlmoco && !voltaAlmoco && minutos >= 11*60 && minutos <= 15*60) {
            voltaAlmoco = ponto.horaPonto;
        }
        // SAÍDA FINAL: após 16:00 (apenas se já tiver entrada e volta do almoço)
        else if (entrada && voltaAlmoco && !saidaFinal && minutos >= 16*60) {
            saidaFinal = ponto.horaPonto;
        }
    });

    // Se não encontrou pontos pela lógica de horário, usa a ordem cronológica
    if (!entrada && pontosUnicos.length > 0) entrada = pontosUnicos[0].horaPonto;
    if (!saidaAlmoco && pontosUnicos.length > 1) saidaAlmoco = pontosUnicos[1].horaPonto;
    if (!voltaAlmoco && pontosUnicos.length > 2) voltaAlmoco = pontosUnicos[2].horaPonto;
    if (!saidaFinal && pontosUnicos.length > 3) saidaFinal = pontosUnicos[3].horaPonto;

    return {
        entrada,
        saidaAlmoco,
        voltaAlmoco,
        saidaFinal
    };
}

/**
 * Calcula totais do dia considerando abonos e faltas
 */
export function clecalcularTotaisDia(pontosClassificados, abonos = [], falta = false, jornadaConfig) {
    if (falta) {
        return {
            horasTrabalhadas: 0,
            horasExtras: 0,
            atrasoEntrada: 0,
            atrasoVoltaAlmoco: 0,
            saidaAntecipada: 0,
            observacoes: 'Falta registrada',
            abonos
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
            observacoes: 'Dia abonado',
            abonos
        };
    }

    const entradaAbonada = abonos.some(abono => abono.tipoAbonado === TIPOS_REGISTRO.ENTRADA);
    const saidaAlmocoAbonada = abonos.some(abono => abono.tipoAbonado === TIPOS_REGISTRO.SAIDA_ALMOCO);
    const voltaAlmocoAbonada = abonos.some(abono => abono.tipoAbonado === TIPOS_REGISTRO.VOLTA_ALMOCO);
    const saidaAbonada = abonos.some(abono => abono.tipoAbonado === TIPOS_REGISTRO.SAIDA);

    const entradaMin = entradaAbonada ? jornadaConfig.entrada : calcularMinutos(pontosClassificados.entrada);
    const saidaAlmocoMin = saidaAlmocoAbonada ? jornadaConfig.saidaAlmoco : calcularMinutos(pontosClassificados.saidaAlmoco);
    const voltaAlmocoMin = voltaAlmocoAbonada ? jornadaConfig.voltaAlmoco : calcularMinutos(pontosClassificados.voltaAlmoco);
    const saidaMin = saidaAbonada ? jornadaConfig.saida : calcularMinutos(pontosClassificados.saidaFinal);

    // VALIDAÇÃO: Se a saída final for anterior à volta do almoço, ignora os dados
    if (saidaMin > 0 && voltaAlmocoMin > 0 && saidaMin <= voltaAlmocoMin) {
        return {
            horasTrabalhadas: 0,
            horasExtras: 0,
            atrasoEntrada: 0,
            atrasoVoltaAlmoco: 0,
            saidaAntecipada: 0,
            observacoes: 'Dados inconsistentes (saída antes da volta)',
            abonos
        };
    }

    // VALIDAÇÃO: Se a saída for muito cedo (antes das 16h), considera como dados inconsistentes
    if (saidaMin > 0 && saidaMin < 16*60 && !saidaAbonada) {
        return {
            horasTrabalhadas: 0,
            horasExtras: 0,
            atrasoEntrada: 0,
            atrasoVoltaAlmoco: 0,
            saidaAntecipada: 0,
            observacoes: 'Saída muito antecipada',
            abonos
        };
    }

    const pontosSuficientes = entradaMin > 0 && saidaMin > 0;
    if (!pontosSuficientes) {
        return {
            horasTrabalhadas: 0,
            horasExtras: 0,
            atrasoEntrada: 0,
            atrasoVoltaAlmoco: 0,
            saidaAntecipada: 0,
            observacoes: 'Falta registro de ponto',
            abonos
        };
    }

    const manha = saidaAlmocoMin > 0 ? (saidaAlmocoMin - entradaMin) : 0;
    const tarde = voltaAlmocoMin > 0 ? (saidaMin - voltaAlmocoMin) : 0;
    const horasTrabalhadas = manha + tarde;
    const diferenca = horasTrabalhadas - jornadaConfig.cargaHoraria;

    const atrasoEntrada = entradaAbonada ? 0 : Math.max(0, entradaMin - jornadaConfig.entrada);
    const atrasoVoltaAlmoco = voltaAlmocoAbonada ? 0 : (voltaAlmocoMin > 0 ? Math.max(0, voltaAlmocoMin - jornadaConfig.voltaAlmoco) : 0);
    const saidaAntecipada = saidaAbonada ? 0 : Math.max(0, jornadaConfig.saida - saidaMin);

    const observacoesAbonos = [];
    if (entradaAbonada) observacoesAbonos.push('Entrada abonada');
    if (saidaAlmocoAbonada) observacoesAbonos.push('Saída almoço abonada');
    if (voltaAlmocoAbonada) observacoesAbonos.push('Volta almoço abonada');
    if (saidaAbonada) observacoesAbonos.push('Saída abonada');

    return {
        horasTrabalhadas,
        horasExtras: Math.max(0, diferenca),
        atrasoEntrada,
        atrasoVoltaAlmoco,
        saidaAntecipada,
        observacoes: observacoesAbonos.join(', ') || 'Normal',
        abonos
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
        faltas: 0
    };

    registrosUsuario.forEach(registro => {
        if (registro.totaisDia.observacoes.includes('Dia abonado')) {
            totais.diasAbonados += 1;
        } else if (registro.totaisDia.observacoes.includes('Falta')) {
            totais.faltas += 1;
        } else if (registro.totaisDia.horasTrabalhadas > 0) {
            totais.horasTrabalhadas += registro.totaisDia.horasTrabalhadas;
            totais.horasExtras += registro.totaisDia.horasExtras;
            totais.atrasos += registro.totaisDia.atrasoEntrada + registro.totaisDia.atrasoVoltaAlmoco;
            totais.diasTrabalhados += 1;
        }
    });

    return totais;
}

/**
 * Verifica se um registro é válido (não é falta e tem dados consistentes)
 */
export function isRegistroValido(registro) {
    return !registro.totaisDia.observacoes.includes('Falta') &&
        !registro.totaisDia.observacoes.includes('inconsistentes') &&
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

export default {
    classificarPontos,
    calcularTotaisDia,
    calcularTotaisMensais,
    isRegistroValido,
    agruparPorUsuario,
    filtrarPorPeriodo
};