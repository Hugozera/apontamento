// constants.js
export const TIPOS_REGISTRO = {
    ENTRADA: 'entrada',
    SAIDA_ALMOCO: 'saidaAlmoco',
    VOLTA_ALMOCO: 'voltaAlmoco',
    SAIDA: 'saida',
    DIA_TRABALHO: 'diaTrabalho',
    FALTA: 'falta'
};

export const JORNADAS = {
    '12/36': {
        nome: '12/36',
        entrada: 7 * 60,
        saidaAlmoco: 12 * 60,
        voltaAlmoco: 13 * 60,
        saida: 19 * 60,
        cargaHoraria: 11 * 60
    },
    '6/1': {
        nome: '6/1',
        entrada: 8 * 60,
        saidaAlmoco: 12 * 60,
        voltaAlmoco: 13 * 60,
        saida: 17 * 60,
        cargaHoraria: 8 * 60
    }
};