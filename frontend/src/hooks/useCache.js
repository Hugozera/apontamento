// src/hooks/useCache.js
import { useState, useEffect } from 'react';

const useCache = (chave, dadosExpiracaoMinutos = 60) => {
    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(false);

    const salvar = (dados) => {
        try {
            const itemCache = {
                dados,
                timestamp: new Date().getTime(),
                expiracao: dadosExpiracaoMinutos * 60 * 1000 // Converter para milissegundos
            };
            localStorage.setItem(chave, JSON.stringify(itemCache));
            setDados(dados);
        } catch (error) {
            console.error('Erro ao salvar no cache:', error);
        }
    };

    const carregar = () => {
        try {
            setCarregando(true);
            const itemSalvo = localStorage.getItem(chave);

            if (!itemSalvo) {
                setCarregando(false);
                return null;
            }

            const itemCache = JSON.parse(itemSalvo);
            const agora = new Date().getTime();

            // Verificar se o cache expirou
            if (agora - itemCache.timestamp > itemCache.expiracao) {
                localStorage.removeItem(chave);
                setCarregando(false);
                return null;
            }

            setDados(itemCache.dados);
            setCarregando(false);
            return itemCache.dados;
        } catch (error) {
            console.error('Erro ao carregar do cache:', error);
            setCarregando(false);
            return null;
        }
    };

    const limpar = () => {
        try {
            localStorage.removeItem(chave);
            setDados(null);
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
        }
    };

    const estaExpirado = () => {
        const itemSalvo = localStorage.getItem(chave);
        if (!itemSalvo) return true;

        try {
            const itemCache = JSON.parse(itemSalvo);
            const agora = new Date().getTime();
            return agora - itemCache.timestamp > itemCache.expiracao;
        } catch {
            return true;
        }
    };

    // Carregar dados automaticamente ao inicializar
    useEffect(() => {
        carregar();
    }, [chave]);

    return {
        dados,
        carregando,
        salvar,
        carregar,
        limpar,
        estaExpirado
    };
};

export default useCache;