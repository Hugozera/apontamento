// hooks/useCNPJ.js
import { useState } from 'react';

export const useCNPJ = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const buscarCNPJ = async (cnpj) => {
        setLoading(true);
        setError(null);

        try {
            // Limpar CNPJ
            cnpj = cnpj.replace(/\D/g, '');

            if (cnpj.length !== 14) {
                throw new Error('CNPJ inválido');
            }

            // Tentar múltiplas APIs (fallback)
            const apis = [
                `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
                `https://receitaws.com.br/v1/cnpj/${cnpj}`
            ];

            let data = null;

            for (const apiUrl of apis) {
                try {
                    const response = await fetch(apiUrl);
                    if (response.ok) {
                        data = await response.json();
                        break;
                    }
                } catch (apiError) {
                    console.warn(`API ${apiUrl} falhou:`, apiError);
                    continue;
                }
            }

            if (!data) {
                throw new Error('Não foi possível consultar o CNPJ');
            }

            // Formatar dados conforme estrutura esperada
            return {
                razao_social: data.razao_social || data.nome || '',
                nome_fantasia: data.nome_fantasia || data.fantasia || '',
                logradouro: data.logradouro || data.tipo_logradouro + ' ' + data.logradouro || '',
                numero: data.numero || '',
                complemento: data.complemento || '',
                bairro: data.bairro || '',
                municipio: data.municipio || data.cidade || '',
                uf: data.uf || data.estado || '',
                cep: data.cep || '',
                telefone: data.telefone || data.ddd + data.telefone || '',
                email: data.email || '',
                situacao_cadastral: data.situacao_cadastral || data.situacao || '',
                data_situacao_cadastral: data.data_situacao_cadastral || '',
                atividade_principal: data.atividade_principal?.[0]?.text || data.atividade_principal || '',
                data_abertura: data.data_abertura || data.abertura || ''
            };

        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { buscarCNPJ, loading, error };
};