import { Timestamp } from 'firebase/firestore';

/**
 * Converte qualquer formato de data/hora para objeto Date
 */
export function parseDataHora(horaPonto) {
    if (!horaPonto) return null;

    // Se for Timestamp do Firestore
    if (horaPonto instanceof Timestamp) {
        return horaPonto.toDate();
    }

    // Se já for um objeto Date válido
    if (horaPonto instanceof Date && !isNaN(horaPonto.getTime())) {
        return horaPonto;
    }

    // Se for um objeto com método toDate
    if (typeof horaPonto === 'object' && horaPonto.toDate instanceof Function) {
        return horaPonto.toDate();
    }

    // Para strings ISO ou outros formatos - corrige problema de fuso horário
    try {
        const date = new Date(horaPonto);

        // Corrige o offset de fuso horário para manter o dia correto
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        const correctedDate = new Date(date.getTime() + timezoneOffset);

        return isNaN(correctedDate.getTime()) ? null : correctedDate;
    } catch (e) {
        console.error('Erro ao converter data:', horaPonto, e);
        return null;
    }
}

/**
 * Data no formato BR (dd/MM/yyyy) com fuso do Brasil
 */
export function formatarDataBR(date) {
    const d = parseDataHora(date);
    if (!d) return '-';
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

/**
 * Hora (HH:mm) com fuso do Brasil
 */
export function formatarHora(date) {
    const d = parseDataHora(date);
    if (!d) return '-';
    return d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
}

/**
 * Data simples (yyyy-MM-dd) SEM usar toISOString()
 */
export function formatarDataSimples(date) {
    const d = parseDataHora(date);
    if (!d) return '';
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

/**
 * Converte hora para minutos desde 00:00 (com fuso Brasil)
 */
export function calcularMinutos(date) {
    const d = parseDataHora(date);
    if (!d) return 0;

    // Usando toLocaleString para garantir o fuso horário correto
    const horaFormatada = d.toLocaleString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Sao_Paulo'
    });

    const [h, m] = horaFormatada.split(':');
    return parseInt(h, 10) * 60 + parseInt(m, 10);
}

/**
 * Formata minutos para HH:mm
 */
export function formatarMinutosParaHora(minutos) {
    if (minutos === 0 || minutos === null || minutos === undefined) return '-';
    const horas = Math.floor(Math.abs(minutos) / 60);
    const mins = Math.abs(minutos) % 60;
    const sinal = minutos < 0 ? '-' : '';
    return `${sinal}${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Obtém apenas a parte da data (sem horas) de um objeto Date
 */
export function obterDataSemHora(date) {
    const d = parseDataHora(date);
    if (!d) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Calcula a diferença em minutos entre duas datas
 */
export function diferencaEmMinutos(data1, data2) {
    const d1 = parseDataHora(data1);
    const d2 = parseDataHora(data2);
    if (!d1 || !d2) return 0;
    return (d2.getTime() - d1.getTime()) / (1000 * 60);
}

/**
 * Verifica se duas datas são do mesmo dia
 */
export function mesmoDia(data1, data2) {
    const d1 = parseDataHora(data1);
    const d2 = parseDataHora(data2);
    if (!d1 || !d2) return false;
    return d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();
}

/**
 * Adiciona dias a uma data
 */
export function adicionarDias(data, dias) {
    const d = parseDataHora(data);
    if (!d) return null;
    const novaData = new Date(d);
    novaData.setDate(novaData.getDate() + dias);
    return novaData;
}

/**
 * Formata data e hora completas
 */
export function formatarDataHoraCompleta(date) {
    const d = parseDataHora(date);
    if (!d) return '-';
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
}
// src/utils/dateUtils.js
export const getPrimeiroDiaMes = (ano, mes) => {
    const data = new Date(ano, mes - 1, 1);
    return data.toISOString().split('T')[0];
};

export const getUltimoDiaMes = (ano, mes) => {
    const data = new Date(ano, mes, 0);
    return data.toISOString().split('T')[0];
};
export default {
    parseDataHora,
    formatarDataBR,
    formatarHora,
    formatarDataSimples,
    calcularMinutos,
    formatarMinutosParaHora,
    obterDataSemHora,
    diferencaEmMinutos,
    mesmoDia,
    adicionarDias,
    formatarDataHoraCompleta
};