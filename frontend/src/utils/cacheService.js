// src/services/cachePontosService.js
class CachePontosService {
    constructor() {
        this.chaveBase = 'pontos_cache_';
        this.ultimaAtualizacaoKey = 'pontos_ultima_atualizacao';
    }

    // Gerar chave baseada nos filtros atuais
    gerarChave(filtros) {
        return `${this.chaveBase}${JSON.stringify(filtros)}`;
    }

    // Buscar apenas dados novos desde a última atualização
    async buscarDadosIncrementais(filtros, buscarDadosFirebase) {
        const chave = this.gerarChave(filtros);
        const ultimaAtualizacao = this.getUltimaAtualizacao();

        try {
            // Buscar dados do cache primeiro
            const cache = this.carregarDoCache(chave);

            if (cache && !this.estaExpirado(cache)) {
                console.log('📁 Dados carregados do cache');
                return cache.dados;
            }

            console.log('🔄 Buscando dados incrementais...');

            // Buscar apenas dados novos do Firebase
            const dadosNovos = await buscarDadosFirebase(ultimaAtualizacao);

            if (cache && cache.dados) {
                // Combinar dados antigos com novos
                const dadosCombinados = this.combinarDados(cache.dados, dadosNovos);
                this.salvarNoCache(chave, dadosCombinados);
                return dadosCombinados;
            } else {
                // Primeira carga ou cache expirado
                this.salvarNoCache(chave, dadosNovos);
                this.atualizarUltimaAtualizacao();
                return dadosNovos;
            }
        } catch (error) {
            console.error('Erro no cache incremental:', error);
            throw error;
        }
    }

    combinarDados(dadosAntigos, dadosNovos) {
        // Implementar lógica para combinar dados sem duplicatas
        // Baseado nas datas e IDs dos registros
        const todosDados = [...dadosAntigos];

        dadosNovos.forEach(novoItem => {
            const existe = todosDados.some(item =>
                item.id === novoItem.id ||
                (item.usuario === novoItem.usuario && item.dataStr === novoItem.dataStr)
            );

            if (!existe) {
                todosDados.push(novoItem);
            }
        });

        return todosDados;
    }

    salvarNoCache(chave, dados) {
        try {
            const itemCache = {
                dados,
                timestamp: new Date().getTime(),
                expiracao: 30 * 60 * 1000 // 30 minutos
            };
            localStorage.setItem(chave, JSON.stringify(itemCache));
        } catch (error) {
            console.error('Erro ao salvar no cache:', error);
        }
    }

    carregarDoCache(chave) {
        try {
            const itemSalvo = localStorage.getItem(chave);
            return itemSalvo ? JSON.parse(itemSalvo) : null;
        } catch (error) {
            console.error('Erro ao carregar do cache:', error);
            return null;
        }
    }

    estaExpirado(cache) {
        const agora = new Date().getTime();
        return agora - cache.timestamp > cache.expiracao;
    }

    getUltimaAtualizacao() {
        try {
            return localStorage.getItem(this.ultimaAtualizacaoKey) || null;
        } catch {
            return null;
        }
    }

    atualizarUltimaAtualizacao() {
        try {
            localStorage.setItem(this.ultimaAtualizacaoKey, new Date().toISOString());
        } catch (error) {
            console.error('Erro ao atualizar timestamp:', error);
        }
    }

    limparCache() {
        try {
            // Limpar todas as chaves de cache de pontos
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.chaveBase)) {
                    localStorage.removeItem(key);
                }
            });
            localStorage.removeItem(this.ultimaAtualizacaoKey);
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
        }
    }
}

export default new CachePontosService();